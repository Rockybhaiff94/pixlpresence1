import {
  CanvasElement,
  CanvasEmbed,
  ProfileDesignConfig,
} from "@/types/studio";
import {
  EditorElement,
  CanvasBackground,
  ShapeElement,
  TextElement,
  ImageElement,
  StickerElement,
  ContainerElement,
  SocialElement,
  RpcElement,
} from "@/components/editor/editorTypes";

/**
 * Maps a CanvasElement (or CanvasEmbed / Background) to the EditorElement model
 * used by the Design Studio's EditorPropertiesPanel.
 */
export function canvasElementToEditorElement(
  el: CanvasElement,
  config: ProfileDesignConfig,
  data?: { displayName?: string; bio?: string; avatarUrl?: string }
): EditorElement {
  const isText = [
    "displayName",
    "username",
    "bio",
    "tagline",
    "subtitle",
    "heading",
    "title",
    "text",
    "customText",
    "authorText",
    "footerText",
    "fieldName",
    "fieldValue",
  ].includes(el.type);

  const styleAny = (el.style || {}) as any;

  const base = {
    id: el.id,
    name: el.name,
    x: el.transform?.x || 0,
    y: el.transform?.y || 0,
    width: el.transform?.width || 120,
    height: el.transform?.height || 40,
    rotation: el.transform?.rotation || 0,
    opacity: el.style?.opacity !== undefined ? el.style.opacity / 100 : 1,
    zIndex: el.transform?.zIndex || 2,
    locked: Boolean(el.isLocked),
    visible: el.isVisible !== false,
    glow: styleAny.glow
      ? { color: styleAny.glow.color || "#38bdf8", intensity: styleAny.glow.intensity || 20 }
      : styleAny.glowColor
      ? { color: styleAny.glowColor, intensity: styleAny.glowIntensity || 20 }
      : undefined,
  };

  if (isText) {
    const textVal =
      el.props?.text ||
      el.props?.content ||
      (el.type === "displayName"
        ? data?.displayName || "Display Name"
        : el.type === "bio"
        ? data?.bio || "Bio description..."
        : el.name);

    const textEl: TextElement = {
      ...base,
      type: "text",
      text: textVal,
      fontFamily: el.style?.fontFamily || (config.typography as any)?.fontFamily || "Space Grotesk, sans-serif",
      fontSize: el.style?.fontSize || 16,
      fontWeight: el.style?.fontWeight || 600,
      color: el.style?.color || "#ffffff",
      textAlign: (el.style?.textAlign as "left" | "center" | "right") || "center",
      letterSpacing: el.style?.letterSpacing || 0,
      lineHeight: el.style?.lineHeight || 1.2,
    };
    return textEl;
  }

  if (el.type === "shape") {
    const shapeEl: ShapeElement = {
      ...base,
      type: "shape",
      shapeKind: (el.style?.shapeKind || el.props?.shapeKind || "rounded-rectangle") as any,
      fill: el.style?.fill || el.style?.backgroundColor || "#18181b",
      stroke: el.style?.strokeColor || el.style?.borderColor || "transparent",
      strokeWidth: el.style?.strokeWidth ?? 1,
      cornerRadius: el.style?.borderRadius ?? 16,
    };
    return shapeEl;
  }

  if (el.type === "image" || el.type === "avatar" || el.type === "thumbnail" || el.type === "banner") {
    const src =
      el.props?.imageUrl ||
      (el.type === "avatar" ? data?.avatarUrl || (config.avatar as any)?.imageUrl || "" : "");

    const imgEl: ImageElement = {
      ...base,
      type: "image",
      src,
      fit: (el.style?.objectFit as "cover" | "contain" | "fill") || config.avatar?.objectFit || "cover",
      borderRadius:
        el.style?.borderRadius ??
        (el.type === "avatar"
          ? config.avatar?.shape === "circle"
            ? 999
            : config.avatar?.shape === "squircle"
            ? 28
            : 16
          : 12),
      filters: el.style?.imageFilters || (config.avatar as any)?.imageFilters || {
        brightness: 100,
        contrast: 100,
        blur: 0,
        grayscale: 0,
      },
    };
    return imgEl;
  }

  if (el.type === "sticker" || el.type === "verificationBadge") {
    const stickerEl: StickerElement = {
      ...base,
      type: "sticker",
      stickerType: (el.style?.stickerType as any) || "badge",
      key: el.style?.stickerKey || el.props?.stickerKey || (el.type === "verificationBadge" ? "verified" : "sparkle"),
      color: el.style?.color || "#38bdf8",
      backgroundColor: el.style?.backgroundColor || "transparent",
    };
    return stickerEl;
  }

  if (el.type === "socials" || el.type === "socialIcon" || el.type === "linkedAccount") {
    const socialEl: SocialElement = {
      ...base,
      type: "social",
      variant: el.style?.iconVariant as any,
      iconColorMode: el.style?.iconColorMode as any,
      iconColor: el.style?.iconColor,
    };
    return socialEl;
  }

  if (el.type === "rpc" || (el.type as any) === "discordRpc") {
    const rpcEl: RpcElement = {
      ...base,
      type: "rpc",
      cardStyle: ((config.discordRpc as any)?.cardStyle || config.discordRpc?.style || "glass") as any,
    };
    return rpcEl;
  }

  // Fallback as general container
  const containerEl: ContainerElement = {
    ...base,
    type: "container",
    backgroundColor: el.style?.backgroundColor || "#121216",
    borderColor: el.style?.borderColor,
    borderWidth: el.style?.borderWidth,
    borderRadius: el.style?.borderRadius,
  };
  return containerEl;
}

/**
 * Maps a CanvasEmbed to an EditorElement (ContainerElement)
 */
export function canvasEmbedToEditorElement(
  embed: CanvasEmbed,
  config: ProfileDesignConfig
): ContainerElement {
  const isPrimary = embed.id === "embed_primary";
  const currentW = isPrimary
    ? config.layout?.maxWidth || embed.transform.width || 580
    : embed.transform.width || 580;
  const currentH = embed.transform.height || 540;

  return {
    id: embed.id,
    name: (embed as any).name || (isPrimary ? "Primary Profile Embed" : "Custom Embed"),
    type: "container",
    x: embed.transform.x || 0,
    y: embed.transform.y || 0,
    width: currentW,
    height: currentH,
    rotation: embed.transform.rotation || 0,
    opacity: 1,
    zIndex: embed.transform.zIndex || 1,
    locked: Boolean(embed.isLocked),
    visible: embed.isVisible !== false,
    backgroundColor: embed.style?.backgroundColor || (isPrimary ? "rgba(10, 10, 14, 0.85)" : "#0c0c0e"),
    borderColor: embed.style?.borderColor,
    borderWidth: embed.style?.borderWidth,
    borderRadius: embed.style?.borderRadius ?? (isPrimary ? (config.layout as any)?.borderRadius ?? 28 : 24),
    padding: embed.style?.padding ?? (isPrimary ? config.layout?.padding ?? 24 : 20),
    gap: (embed.style as any)?.gap ?? (isPrimary ? config.layout?.gap ?? 16 : 16),
    glassmorphism: config.effects?.glassmorphism !== false,
  };
}

/**
 * Extracts canvas artboard parameters from ProfileDesignConfig
 */
export function profileConfigToCanvasState(config: ProfileDesignConfig): {
  width: number;
  height: number;
  background: CanvasBackground;
} {
  const bg = config.background || { type: "solid", color: "#080808" };
  const patternVal =
    bg.pattern === "dot-matrix" || bg.pattern === "grid" || bg.pattern === "crosshair"
      ? (bg.pattern as any)
      : "none";

  return {
    width: config.layout?.maxWidth || 580,
    height: config.layout?.height || 640,
    background: {
      type: bg.type === "gradient" ? "gradient" : "solid",
      color: bg.color || "#080808",
      gradientTo: bg.gradient?.stops?.[1]?.color || bg.gradient?.stops?.[0]?.color || "#1a0b2e",
      gradientAngle: bg.gradient?.angle || 135,
      pattern: patternVal,
      patternOpacity: (bg as any).patternOpacity ?? bg.overlayOpacity ?? 0.1,
    },
  };
}

/**
 * Applies updates from EditorPropertiesPanel to ProfileDesignConfig and Canvas
 */
export function applyEditorUpdates(
  prevConfig: ProfileDesignConfig,
  targetId: string,
  updates: Partial<EditorElement>,
  onProfileFieldUpdate?: (field: "displayName" | "bio", val: string) => void
): ProfileDesignConfig {
  const currentCanvas = prevConfig.canvas;
  if (!currentCanvas) return prevConfig;

  // 1. If target is an Embed Container
  const isEmbed = targetId.startsWith("embed_") || targetId === "embed";
  const embedId = targetId === "embed" ? "embed_primary" : targetId;
  const targetEmbed = isEmbed
    ? currentCanvas.embeds.find((em) => em.id === embedId) || (targetId === "embed" ? currentCanvas.embeds[0] : undefined)
    : undefined;

  if (targetEmbed) {
    const isPrimary = targetEmbed.id === "embed_primary";
    const updatedEmbeds = currentCanvas.embeds.map((em) => {
      if (em.id !== targetEmbed.id) return em;
      return {
        ...em,
        ...((updates as any).name ? { name: (updates as any).name } : {}),
        transform: {
          ...em.transform,
          x: updates.x !== undefined ? updates.x : em.transform.x,
          y: updates.y !== undefined ? updates.y : em.transform.y,
          width: updates.width !== undefined ? updates.width : em.transform.width,
          height: updates.height !== undefined ? updates.height : em.transform.height,
          rotation: updates.rotation !== undefined ? updates.rotation : em.transform.rotation,
          zIndex: updates.zIndex !== undefined ? updates.zIndex : em.transform.zIndex,
        },
        style: {
          ...em.style,
          backgroundColor: (updates as ContainerElement).backgroundColor ?? em.style?.backgroundColor,
          borderColor: (updates as ContainerElement).borderColor ?? em.style?.borderColor,
          borderWidth: (updates as ContainerElement).borderWidth ?? em.style?.borderWidth,
          borderRadius: (updates as ContainerElement).borderRadius ?? em.style?.borderRadius,
          padding: (updates as ContainerElement).padding ?? em.style?.padding,
        },
        isLocked: updates.locked !== undefined ? updates.locked : em.isLocked,
        isVisible: updates.visible !== undefined ? updates.visible : em.isVisible,
      };
    });

    const nextConfig: ProfileDesignConfig = {
      ...prevConfig,
      canvas: {
        ...currentCanvas,
        embeds: updatedEmbeds,
      },
    };

    if (isPrimary) {
      if (updates.width !== undefined) {
        nextConfig.layout = { ...nextConfig.layout, maxWidth: updates.width };
      }
      if ((updates as ContainerElement).borderRadius !== undefined) {
        (nextConfig.layout as any).borderRadius = (updates as ContainerElement).borderRadius;
      }
      if ((updates as ContainerElement).padding !== undefined) {
        nextConfig.layout = { ...nextConfig.layout, padding: (updates as ContainerElement).padding! };
      }
      if ((updates as ContainerElement).backgroundColor !== undefined) {
        nextConfig.background = {
          ...nextConfig.background,
          color: (updates as ContainerElement).backgroundColor,
        };
      }
    }

    return nextConfig;
  }

  // 2. If target is a Canvas Element (Text, Shape, Image, Avatar, Sticker, Social, RPC)
  const aliasMap: Record<string, string> = {
    avatar: "avatar_1",
    username: "username_1",
    displayName: "username_1",
    bio: "bio_1",
    tagline: "tagline_1",
    rpc: "rpc_1",
    discordRpc: "rpc_1",
    socials: "socials_1",
    buttons: "buttons_1",
  };
  const resolvedTargetId = aliasMap[targetId] || targetId;
  const targetElement = currentCanvas.elements.find((el) => el.id === resolvedTargetId || el.id === targetId);
  if (!targetElement) return prevConfig;

  let nextConfig: ProfileDesignConfig = {
    ...prevConfig,
    avatar: { ...prevConfig.avatar },
    identity: { ...prevConfig.identity },
  };

  const isText = [
    "displayName",
    "username",
    "bio",
    "tagline",
    "subtitle",
    "heading",
    "title",
    "text",
    "customText",
  ].includes(targetElement.type);

  const updatedElements = currentCanvas.elements.map((el) => {
    if (el.id !== targetElement.id) return el;

    const nextStyle: any = { ...el.style };
    const nextProps: any = { ...el.props };

    // Text updates
    if (isText && "text" in updates) {
      const textVal = (updates as TextElement).text;
      nextProps.text = textVal;
      nextProps.content = textVal;

      if ((el.type === "displayName" || el.type === "username") && onProfileFieldUpdate && textVal) {
        onProfileFieldUpdate("displayName", textVal);
      } else if (el.type === "bio" && onProfileFieldUpdate && textVal) {
        onProfileFieldUpdate("bio", textVal);
      }
    }
    if ("fontFamily" in updates && (updates as TextElement).fontFamily) {
      nextStyle.fontFamily = (updates as TextElement).fontFamily;
      if (el.type === "username" || el.type === "displayName") {
        nextConfig.identity = { ...nextConfig.identity, titleFont: (updates as TextElement).fontFamily };
      } else if (el.type === "bio") {
        nextConfig.identity = { ...nextConfig.identity, bioFont: (updates as TextElement).fontFamily };
      }
    }
    if ("fontSize" in updates && (updates as TextElement).fontSize !== undefined) {
      nextStyle.fontSize = (updates as TextElement).fontSize;
      if (el.type === "username" || el.type === "displayName") {
        nextConfig.identity = { ...nextConfig.identity, titleSize: (updates as TextElement).fontSize };
      } else if (el.type === "bio") {
        nextConfig.identity = { ...nextConfig.identity, bioSize: (updates as TextElement).fontSize };
      }
    }
    if ("color" in updates && (updates as TextElement).color) {
      nextStyle.color = (updates as TextElement).color;
      if (el.type === "username" || el.type === "displayName") {
        nextConfig.identity = { ...nextConfig.identity, titleColor: (updates as TextElement).color };
      }
    }
    if ("textAlign" in updates && (updates as TextElement).textAlign) {
      nextStyle.textAlign = (updates as TextElement).textAlign;
    }
    if ("letterSpacing" in updates && (updates as TextElement).letterSpacing !== undefined) {
      nextStyle.letterSpacing = (updates as TextElement).letterSpacing;
    }
    if ("lineHeight" in updates && (updates as TextElement).lineHeight !== undefined) {
      nextStyle.lineHeight = (updates as TextElement).lineHeight;
    }

    // Shape updates
    if (el.type === "shape") {
      const shapeUp = updates as ShapeElement;
      if (shapeUp.shapeKind) {
        nextStyle.shapeKind = shapeUp.shapeKind;
        nextProps.shapeKind = shapeUp.shapeKind;
      }
      if (shapeUp.fill !== undefined) {
        nextStyle.fill = shapeUp.fill;
        nextStyle.backgroundColor = shapeUp.fill;
      }
      if (shapeUp.stroke !== undefined) {
        nextStyle.strokeColor = shapeUp.stroke;
        nextStyle.borderColor = shapeUp.stroke;
      }
      if (shapeUp.strokeWidth !== undefined) {
        nextStyle.strokeWidth = shapeUp.strokeWidth;
        nextStyle.borderWidth = shapeUp.strokeWidth;
      }
      if (shapeUp.cornerRadius !== undefined) {
        nextStyle.borderRadius = shapeUp.cornerRadius;
      }
    }

    // Image / Avatar updates
    if (el.type === "image" || el.type === "avatar" || el.type === "thumbnail") {
      const imgUp = updates as ImageElement;
      if (imgUp.src) {
        nextProps.imageUrl = imgUp.src;
        if (el.type === "avatar") {
          (nextConfig.avatar as any).imageUrl = imgUp.src;
        }
      }
      if (imgUp.fit) nextStyle.objectFit = imgUp.fit;
      if (imgUp.borderRadius !== undefined) {
        nextStyle.borderRadius = imgUp.borderRadius;
        if (el.type === "avatar") {
          nextConfig.avatar = {
            ...nextConfig.avatar,
            shape: imgUp.borderRadius > 100 ? "circle" : imgUp.borderRadius > 20 ? "squircle" : "square",
          };
        }
      }
      if (imgUp.filters) {
        nextStyle.imageFilters = imgUp.filters;
        if (el.type === "avatar") {
          (nextConfig.avatar as any).imageFilters = imgUp.filters;
        }
      }
    }

    // Sticker updates
    if (el.type === "sticker" || el.type === "verificationBadge") {
      const stkUp = updates as StickerElement;
      if (stkUp.key) {
        nextStyle.stickerKey = stkUp.key;
        nextProps.stickerKey = stkUp.key;
      }
      if (stkUp.stickerType) nextStyle.stickerType = stkUp.stickerType;
      if (stkUp.color) nextStyle.color = stkUp.color;
      if (stkUp.backgroundColor) nextStyle.backgroundColor = stkUp.backgroundColor;
    }

    // Socials updates
    if (el.type === "socials" || el.type === "socialIcon") {
      const socUp = updates as SocialElement;
      if (socUp.variant) nextStyle.iconVariant = socUp.variant;
      if (socUp.iconColorMode) nextStyle.iconColorMode = socUp.iconColorMode;
      if (socUp.iconColor) nextStyle.iconColor = socUp.iconColor;
    }

    // RPC updates
    if (el.type === "rpc" || (el.type as any) === "discordRpc") {
      const rpcUp = updates as RpcElement;
      if (rpcUp.cardStyle) nextStyle.cardStyle = rpcUp.cardStyle;
    }

    // Opacity
    if (updates.opacity !== undefined) {
      nextStyle.opacity = Math.round(updates.opacity * 100);
    }

    // Glow
    if (updates.glow) {
      nextStyle.glowColor = updates.glow.color;
      nextStyle.glowIntensity = updates.glow.intensity;
    }

    return {
      ...el,
      transform: {
        ...el.transform,
        x: updates.x !== undefined ? updates.x : el.transform.x,
        y: updates.y !== undefined ? updates.y : el.transform.y,
        width: updates.width !== undefined ? updates.width : el.transform.width,
        height: updates.height !== undefined ? updates.height : el.transform.height,
        rotation: updates.rotation !== undefined ? updates.rotation : el.transform.rotation,
        zIndex: updates.zIndex !== undefined ? updates.zIndex : el.transform.zIndex,
      },
      style: nextStyle,
      props: nextProps,
      isLocked: updates.locked !== undefined ? updates.locked : el.isLocked,
      isVisible: updates.visible !== undefined ? updates.visible : el.isVisible,
    };
  });

  nextConfig = {
    ...nextConfig,
    canvas: {
      ...currentCanvas,
      elements: updatedElements,
    },
  };

  // Sync back to top-level profile config if editing Avatar or Typography or DiscordRpc
  if (targetElement.type === "avatar") {
    const imgUp = updates as ImageElement;
    if (imgUp.borderRadius !== undefined) {
      nextConfig.avatar = {
        ...nextConfig.avatar,
        shape: imgUp.borderRadius > 100 ? "circle" : imgUp.borderRadius > 20 ? "squircle" : "square",
      };
    }
  }

  return nextConfig;
}
