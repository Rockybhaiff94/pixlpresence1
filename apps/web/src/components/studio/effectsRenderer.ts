import { CanvasElementStyle } from "@/types/studio";

export interface ComputedEffects {
  boxShadow?: string;
  filter?: string;
  background?: string;
  backdropFilter?: string;
  animation?: string;
  transition?: string;
  resolvedIconColor?: string;
}

/**
 * Computes CSS styles and visual effects for an element from its CanvasElementStyle.
 * Handles both Free (basic glow/shadow/borders) and Premium (animated glow, multi-layer lighting, floating, aurora).
 */
export function computeElementEffects(
  style?: CanvasElementStyle,
  themeAccentColor: string = "#ffffff"
): ComputedEffects {
  if (!style) return {};

  const shadows: string[] = [];

  // 1. Glow Shadows (Free basic vs Premium multi/animated)
  if (style.glowEnabled) {
    const color = style.glowColor || "#38bdf8";
    const blur = style.glowBlur ?? 16;
    const radius = style.glowRadius ?? 0;
    const intensity = Math.min(100, Math.max(10, style.glowIntensity ?? 60)) / 100;

    if (style.glowType === "multi") {
      // Premium multi-layer glow
      shadows.push(`0 0 ${Math.round(blur * 0.4)}px ${Math.round(radius * 0.5)}px ${color}`);
      shadows.push(`0 0 ${blur}px ${radius}px ${color}80`);
      shadows.push(`0 0 ${Math.round(blur * 1.8)}px ${Math.round(radius * 1.5)}px ${color}40`);
    } else {
      // Basic free glow
      const alphaHex = Math.round(intensity * 255)
        .toString(16)
        .padStart(2, "0");
      shadows.push(`0 0 ${blur}px ${radius}px ${color.startsWith("#") ? color + alphaHex : color}`);
    }
  }

  // 2. Drop Shadows (Free basic vs Premium depth/ambient)
  if (style.shadowEnabled) {
    const sColor = style.shadowColor || "rgba(0,0,0,0.6)";
    const sBlur = style.shadowBlur ?? 16;
    const sDist = style.shadowDistance ?? 8;

    if (style.lightingMode === "depth") {
      // Premium 3D depth layered elevation
      shadows.push(`0 ${Math.round(sDist * 0.3)}px ${Math.round(sBlur * 0.3)}px rgba(0,0,0,0.4)`);
      shadows.push(`0 ${sDist}px ${sBlur}px ${sColor}`);
      shadows.push(`0 ${Math.round(sDist * 1.8)}px ${Math.round(sBlur * 1.6)}px rgba(0,0,0,0.5)`);
    } else if (style.lightingMode === "ambient") {
      // Premium ambient directional lighting
      shadows.push(`0 ${sDist}px ${sBlur}px ${sColor}`);
      shadows.push(`0 -2px ${Math.round(sBlur * 0.5)}px rgba(255,255,255,0.06)`);
    } else {
      // Basic free shadow
      shadows.push(`0 ${sDist}px ${sBlur}px ${sColor}`);
    }
  }

  // 3. Fallback shadowBlur property if shadowEnabled not explicitly set
  if (!style.shadowEnabled && style.shadowBlur && style.shadowBlur > 0) {
    shadows.push(`0 8px ${style.shadowBlur}px ${style.shadowColor || "rgba(0,0,0,0.5)"}`);
  }

  // 4. Background (Solid vs Gradients)
  let background: string | undefined = style.backgroundColor;
  if (style.gradientEnabled && style.gradientStops && style.gradientStops.length >= 2) {
    const stops = style.gradientStops.map((s) => `${s.color} ${s.offset}%`).join(", ");
    const angle = style.gradientAngle ?? 135;
    background =
      style.gradientType === "radial"
        ? `radial-gradient(circle at center, ${stops})`
        : `linear-gradient(${angle}deg, ${stops})`;
  }

  // 5. CSS Animation Presets (Premium)
  let animation: string | undefined;
  if (style.animationPreset && style.animationPreset !== "none") {
    switch (style.animationPreset) {
      case "soft-neon":
      case "pulse-glow":
        animation = "studioPulseGlow 3s ease-in-out infinite";
        break;
      case "floating":
        animation = "studioFloat 4s ease-in-out infinite";
        break;
      case "gradient-flow":
        animation = "studioGradientFlow 6s linear infinite";
        break;
      case "subtle-shine":
        animation = "studioShineSweep 5s ease-in-out infinite";
        break;
      case "ambient-glow":
        animation = "studioAmbientBreathe 4s ease-in-out infinite";
        break;
    }
  } else if (style.glowType === "animated" || style.glowType === "pulsating") {
    animation = `studioPulseGlow ${style.glowSpeed || 2.5}s ease-in-out infinite`;
  }

  // 6. Resolved Icon Color (Free & Premium)
  let resolvedIconColor: string | undefined;
  if (style.iconColorMode === "custom" && style.iconColor) {
    resolvedIconColor = style.iconColor;
  } else if (style.iconColorMode === "theme") {
    resolvedIconColor = themeAccentColor;
  }
  // Otherwise remains undefined -> Platform's default brand color renders naturally

  return {
    boxShadow: shadows.length > 0 ? shadows.join(", ") : undefined,
    background,
    backdropFilter: style.backdropBlur ? `blur(${style.backdropBlur}px)` : undefined,
    animation,
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    resolvedIconColor,
  };
}

