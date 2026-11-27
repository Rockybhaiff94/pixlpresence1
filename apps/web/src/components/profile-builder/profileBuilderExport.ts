import { ProfileBuilderDocument } from "./profileBuilderTypes";
import { hexToRgbaSafe } from "./componentRegistry";
import { resolveEffectiveBackground } from "./ProfileBuilderRenderer";
import {
  drawGradientLayersOnCanvas,
  getGradientDirectionPoints,
  normalizeGradientLayers,
} from "./gradientUtils";

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function exportProfileBuilderJson(
  doc: ProfileBuilderDocument,
  mode: "design" | "template" = "design"
): string {
  const payload =
    mode === "template"
      ? {
          kind: "pixelgg-profile-template",
          version: doc.version,
          title: doc.title,
          exportedAt: new Date().toISOString(),
          canvas: doc.canvas,
          nodes: doc.nodes,
        }
      : doc;

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  triggerDownload(
    url,
    mode === "template"
      ? `${doc.title.toLowerCase().replace(/\s+/g, "-")}-template.json`
      : `${doc.title.toLowerCase().replace(/\s+/g, "-")}-design.json`
  );
  URL.revokeObjectURL(url);
  return json;
}

export async function exportProfileBuilderPng(
  doc: ProfileBuilderDocument,
  pixelRatio = 1
): Promise<string> {
  const { canvas, nodes } = doc;
  const width = canvas.width;
  const height = canvas.height;

  const el = document.createElement("canvas");
  el.width = width * pixelRatio;
  el.height = height * pixelRatio;
  const ctx = el.getContext("2d");
  if (!ctx) throw new Error("Unable to initialize 2D export context");
  ctx.scale(pixelRatio, pixelRatio);

  const bg = resolveEffectiveBackground(canvas, nodes);
  if (bg.type === "gradient") {
    ctx.fillStyle = bg.color || "#060608";
    ctx.fillRect(0, 0, width, height);
    drawGradientLayersOnCanvas(ctx, bg.gradients, 0, 0, width, height, {
      colorA: bg.color,
      colorB: bg.gradientTo,
      angle: bg.gradientAngle,
      opacity: 1,
    });
  } else {
    ctx.fillStyle = bg.color || "#060608";
    ctx.fillRect(0, 0, width, height);
  }

  if (bg.type === "image" && bg.imageUrl) {
    await drawImageUrl(ctx, bg.imageUrl, 0, 0, width, height, 0, bg.opacity);
  }

  if (bg.overlayOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = bg.overlayOpacity;
    ctx.fillStyle = bg.overlayColor || "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  const drawSubtree = async (parentId: string | null, ox: number, oy: number) => {
    const list = nodes
      .filter((n) => (n.parentId || null) === parentId && n.type !== "background" && n.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const node of list) {
      const ax = ox + node.x;
      const ay = oy + node.y;
      ctx.save();
      ctx.globalAlpha = node.style.opacity ?? 1;

      if (
        node.type === "embed" ||
        node.type === "nested-embed" ||
        node.type === "image-gallery" ||
        node.type === "group-section" ||
        node.type === "custom-rpc" ||
        node.type === "custom-rpc-embed"
      ) {
        const radius = node.style.borderRadius ?? 16;
        ctx.beginPath();
        ctx.roundRect(ax, ay, node.width, node.height, radius);
        ctx.save();
        ctx.clip();
        if (node.style.backgroundType === "gradient") {
          drawGradientLayersOnCanvas(
            ctx,
            node.style.backgroundGradients,
            ax,
            ay,
            node.width,
            node.height,
            {
              colorA: node.style.backgroundColor || "#0d0d12",
              colorB: node.style.backgroundGradientTo || "#1a1a28",
              angle: node.style.backgroundGradientAngle ?? 135,
              opacity: node.style.backgroundOpacity ?? 0.92,
            },
            node.style.backgroundOpacity ?? 0.92
          );
        } else if (node.style.backgroundType !== "transparent") {
          ctx.fillStyle = hexToRgbaSafe(
            node.style.backgroundColor || "#0b0b0e",
            node.style.backgroundOpacity ?? 0.92
          );
          ctx.fillRect(ax, ay, node.width, node.height);
        }
        ctx.restore();
        if ((node.style.borderWidth ?? 1) > 0) {
          ctx.strokeStyle = node.style.borderColor || "#2c2c35";
          ctx.lineWidth = node.style.borderWidth ?? 1;
          ctx.stroke();
        }
        ctx.clip();
        await drawSubtree(node.id, ax, ay);
      } else if (
        node.type === "banner-image" ||
        node.type === "profile-image" ||
        node.type === "image" ||
        node.type === "rpc-icon"
      ) {
        const isSmallRpc = node.type === "rpc-icon" && node.config.rpcFieldBinding === "smallImage";
        const imgUrl = isSmallRpc
          ? node.config.appIcon || node.config.src || ""
          : node.config.src || node.config.largeImage || "";
        const isCircleShape =
          (node.type === "profile-image" && node.config.avatarShape === "circle") ||
          (node.type === "rpc-icon" && node.config.rpcImageShape === "circle");
        const drawW = isCircleShape ? Math.min(node.width, node.height) : node.width;
        const drawH = isCircleShape ? Math.min(node.width, node.height) : node.height;
        const drawX = isCircleShape ? ax + (node.width - drawW) / 2 : ax;
        const drawY = isCircleShape ? ay + (node.height - drawH) / 2 : ay;
        const drawRadius = isCircleShape
          ? drawW / 2
          : node.type === "profile-image" && node.config.avatarShape === "square"
            ? 0
            : node.style.borderRadius ?? (node.type === "rpc-icon" ? 12 : 10);

        if (imgUrl) {
          await drawImageUrl(
            ctx,
            imgUrl,
            drawX,
            drawY,
            drawW,
            drawH,
            drawRadius,
            node.style.opacity ?? 1
          );
        }
        if (node.config.imageOverlayEnabled && node.config.imageOverlayGradients?.length) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(drawX, drawY, drawW, drawH, drawRadius);
          ctx.clip();
          drawGradientLayersOnCanvas(ctx, node.config.imageOverlayGradients, drawX, drawY, drawW, drawH);
          ctx.restore();
        }
      } else if (
        node.type === "name-text" ||
        node.type === "subtitle" ||
        node.type === "description" ||
        node.type === "rpc-title" ||
        node.type === "rpc-details" ||
        node.type === "rpc-state" ||
        node.type === "rpc-status" ||
        node.type === "rpc-timestamp"
      ) {
        ctx.font = `${node.config.fontWeight || 600} ${node.config.fontSize || 14}px sans-serif`;
        ctx.textBaseline = "top";
        ctx.textAlign = node.config.textAlign || "left";
        if (node.config.textFillType === "gradient" && node.config.textGradients?.length) {
          const layers = normalizeGradientLayers(node.config.textGradients);
          const topLayer = [...layers].reverse().find((l) => l.visible !== false) || layers[0];
          const pts = getGradientDirectionPoints(topLayer);
          const textGrad = ctx.createLinearGradient(
            ax + pts.startX * node.width,
            ay + pts.startY * node.height,
            ax + pts.endX * node.width,
            ay + pts.endY * node.height
          );
          for (const stop of topLayer.stops) {
            textGrad.addColorStop(
              Math.max(0, Math.min(1, stop.position / 100)),
              hexToRgbaSafe(stop.color, topLayer.opacity ?? 1)
            );
          }
          ctx.fillStyle = textGrad;
        } else {
          ctx.fillStyle = node.config.color || "#ffffff";
        }
        const tx =
          node.config.textAlign === "center"
            ? ax + node.width / 2
            : node.config.textAlign === "right"
              ? ax + node.width
              : ax;
        const txt =
          node.config.text ||
          node.config.appName ||
          node.config.details ||
          node.config.state ||
          node.config.startTimestampText ||
          node.config.rpcCustomLabel ||
          "";
        ctx.fillText(txt, tx, ay);
      } else if (node.type === "separator") {
        ctx.beginPath();
        ctx.strokeStyle = node.config.separatorColor || "#272730";
        ctx.lineWidth = node.config.separatorThickness ?? 1;
        ctx.moveTo(ax, ay + node.height / 2);
        ctx.lineTo(ax + node.width, ay + node.height / 2);
        ctx.stroke();
      } else if (node.type === "music-display" || node.type === "custom-component") {
        ctx.beginPath();
        ctx.roundRect(ax, ay, node.width, node.height, node.style.borderRadius ?? 12);
        ctx.fillStyle = node.style.backgroundColor || "#111116";
        ctx.fill();
        ctx.strokeStyle = node.style.borderColor || "#272730";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText(
          node.type === "music-display"
            ? node.config.trackName || "Music Display"
            : node.config.customTitle || node.name,
          ax + 12,
          ay + 12
        );
      }

      ctx.restore();
    }
  };

  await drawSubtree(null, 0, 0);
  const dataUrl = el.toDataURL("image/png");
  triggerDownload(dataUrl, `${doc.title.toLowerCase().replace(/\s+/g, "-")}.png`);
  return dataUrl;
}

function drawImageUrl(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  opacity: number
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.save();
      ctx.globalAlpha = opacity;
      if (radius > 0) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.clip();
      }
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}
