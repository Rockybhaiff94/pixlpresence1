import { EditorElement, CanvasBackground, ShapeElement, TextElement, ImageElement, StickerElement } from "./editorTypes";

export interface CanvasExportOptions {
  width: number;
  height: number;
  background: CanvasBackground;
  elements: EditorElement[];
  pixelRatio?: number;
  filename?: string;
}

export async function exportToPng(options: CanvasExportOptions): Promise<string> {
  const { width, height, background, elements, pixelRatio = 2, filename = "pixel-design.png" } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D canvas rendering context");

  ctx.scale(pixelRatio, pixelRatio);

  // 1. Draw Background
  if (background.type === "gradient" && background.gradientTo) {
    const angleRad = ((background.gradientAngle || 90) * Math.PI) / 180;
    const x2 = width * Math.cos(angleRad);
    const y2 = height * Math.sin(angleRad);
    const grad = ctx.createLinearGradient(0, 0, x2, y2);
    grad.addColorStop(0, background.color);
    grad.addColorStop(1, background.gradientTo);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = background.color || "#050505";
  }
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Background Pattern
  if (background.pattern && background.pattern !== "none") {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${background.patternOpacity || 0.08})`;

    if (background.pattern === "dot-matrix") {
      const spacing = 20;
      const radius = 1.2;
      for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (background.pattern === "grid") {
      const step = 24;
      ctx.strokeStyle = `rgba(255, 255, 255, ${background.patternOpacity || 0.06})`;
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 3. Sort Elements by zIndex
  const sorted = [...elements].filter((e) => e.visible).sort((a, b) => a.zIndex - b.zIndex);

  // 4. Draw Elements
  for (const el of sorted) {
    ctx.save();

    // Transform
    ctx.globalAlpha = el.opacity;
    const centerX = el.x + el.width / 2;
    const centerY = el.y + el.height / 2;
    ctx.translate(centerX, centerY);
    if (el.rotation) {
      ctx.rotate((el.rotation * Math.PI) / 180);
    }
    ctx.translate(-centerX, -centerY);

    // Glow or Shadow
    if (el.glow && el.glow.intensity > 0) {
      ctx.shadowColor = el.glow.color;
      ctx.shadowBlur = el.glow.intensity;
    } else if (el.shadow && el.shadow.blur > 0) {
      ctx.shadowColor = el.shadow.color;
      ctx.shadowBlur = el.shadow.blur;
      ctx.shadowOffsetX = el.shadow.offsetX;
      ctx.shadowOffsetY = el.shadow.offsetY;
    }

    if (el.type === "shape") {
      drawShape(ctx, el as ShapeElement);
    } else if (el.type === "text") {
      drawText(ctx, el as TextElement);
    } else if (el.type === "image") {
      await drawImage(ctx, el as ImageElement);
    } else if (el.type === "sticker") {
      drawSticker(ctx, el as StickerElement);
    }

    ctx.restore();
  }

  const dataUrl = canvas.toDataURL("image/png");
  downloadDataUrl(dataUrl, filename);
  return dataUrl;
}

function drawShape(ctx: CanvasRenderingContext2D, el: ShapeElement) {
  ctx.beginPath();
  const { x, y, width, height, shapeKind, fill, stroke, strokeWidth, cornerRadius = 0 } = el;

  if (shapeKind === "rectangle") {
    ctx.rect(x, y, width, height);
  } else if (shapeKind === "rounded-rectangle") {
    const r = Math.min(cornerRadius, width / 2, height / 2);
    ctx.roundRect(x, y, width, height, r);
  } else if (shapeKind === "circle" || shapeKind === "ellipse") {
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else if (shapeKind === "triangle") {
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  } else if (shapeKind === "star") {
    const points = el.points || 5;
    const outerRadius = Math.min(width, height) / 2;
    const innerRadius = outerRadius * 0.45;
    const cx = x + width / 2;
    const cy = y + height / 2;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shapeKind === "line") {
    ctx.moveTo(x, y + height / 2);
    ctx.lineTo(x + width, y + height / 2);
  } else if (shapeKind === "arrow") {
    const cy = y + height / 2;
    const arrowHead = Math.min(20, width * 0.25);
    ctx.moveTo(x, cy);
    ctx.lineTo(x + width - arrowHead, cy);
    ctx.moveTo(x + width - arrowHead, cy - arrowHead / 2);
    ctx.lineTo(x + width, cy);
    ctx.lineTo(x + width - arrowHead, cy + arrowHead / 2);
  }

  if (fill && fill !== "transparent") {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && stroke !== "transparent" && strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement) {
  const { x, y, width, text, fontFamily, fontSize, fontWeight, fontStyle = "normal", color, textAlign } = el;
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";

  let renderText = text;
  if (el.textTransform === "uppercase") renderText = text.toUpperCase();
  else if (el.textTransform === "lowercase") renderText = text.toLowerCase();

  let startX = x;
  if (textAlign === "center") {
    startX = x + width / 2;
    ctx.textAlign = "center";
  } else if (textAlign === "right") {
    startX = x + width;
    ctx.textAlign = "right";
  } else {
    ctx.textAlign = "left";
  }

  ctx.fillText(renderText, startX, y);

  if (el.underline) {
    const metrics = ctx.measureText(renderText);
    const textWidth = metrics.width;
    let lineX = x;
    if (textAlign === "center") lineX = x + (width - textWidth) / 2;
    else if (textAlign === "right") lineX = x + width - textWidth;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, fontSize / 14);
    ctx.moveTo(lineX, y + fontSize + 2);
    ctx.lineTo(lineX + textWidth, y + fontSize + 2);
    ctx.stroke();
  }
}

function drawImage(ctx: CanvasRenderingContext2D, el: ImageElement): Promise<void> {
  return new Promise((resolve) => {
    if (!el.src) {
      resolve();
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const { x, y, width, height, borderRadius = 0 } = el;
      if (borderRadius > 0) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, borderRadius);
        ctx.clip();
      }
      ctx.drawImage(img, x, y, width, height);
      resolve();
    };
    img.onerror = () => {
      resolve();
    };
    img.src = el.src;
  });
}

function drawSticker(ctx: CanvasRenderingContext2D, el: StickerElement) {
  const { x, y, width, height, key, color } = el;
  ctx.fillStyle = el.backgroundColor || "#141414";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();

  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color || "#ffffff";
  ctx.font = `bold ${Math.round(height * 0.45)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(key.toUpperCase().slice(0, 3), x + width / 2, y + height / 2);
}

export function exportToSvg(options: CanvasExportOptions): string {
  const { width, height, background, elements, filename = "pixel-design.svg" } = options;
  const sorted = [...elements].filter((e) => e.visible).sort((a, b) => a.zIndex - b.zIndex);

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svgContent += `  <rect width="100%" height="100%" fill="${background.color || "#050505"}" />\n`;

  for (const el of sorted) {
    const transform = `transform="translate(${el.x}, ${el.y}) rotate(${el.rotation || 0} ${el.width / 2} ${el.height / 2})"`;
    const opacity = `opacity="${el.opacity}"`;

    if (el.type === "shape") {
      const shape = el as ShapeElement;
      if (shape.shapeKind === "rectangle") {
        svgContent += `  <rect x="0" y="0" width="${shape.width}" height="${shape.height}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" ${transform} ${opacity} />\n`;
      } else if (shape.shapeKind === "rounded-rectangle") {
        svgContent += `  <rect x="0" y="0" width="${shape.width}" height="${shape.height}" rx="${shape.cornerRadius || 0}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" ${transform} ${opacity} />\n`;
      } else if (shape.shapeKind === "circle" || shape.shapeKind === "ellipse") {
        svgContent += `  <ellipse cx="${shape.width / 2}" cy="${shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" ${transform} ${opacity} />\n`;
      }
    } else if (el.type === "text") {
      const text = el as TextElement;
      svgContent += `  <text x="${text.textAlign === "center" ? text.width / 2 : text.textAlign === "right" ? text.width : 0}" y="${text.fontSize}" fill="${text.color}" font-family="${text.fontFamily}" font-size="${text.fontSize}" font-weight="${text.fontWeight}" text-anchor="${text.textAlign === "center" ? "middle" : text.textAlign === "right" ? "end" : "start"}" ${transform} ${opacity}>${escapeXml(text.text)}</text>\n`;
    }
  }

  svgContent += `</svg>`;

  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
  return svgContent;
}

export function exportToJson(options: CanvasExportOptions): string {
  const { width, height, background, elements, filename = "pixel-design.json" } = options;
  const project = {
    version: "1.0",
    name: "Pixel Design Project",
    created: new Date().toISOString(),
    canvas: { width, height, background },
    elements,
  };
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
  return jsonStr;
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

function downloadDataUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
