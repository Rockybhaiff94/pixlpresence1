"use client";

import React from "react";
import { findBadgeMeta, renderBadgeGlyph } from "./badgeCatalog";
import type { UnifiedBadgeConfig } from "./unifiedBadge";

function hexToRgba(hex: string | undefined, opacity: number): string {
  const safeOpacity = Math.max(0, Math.min(1, Number.isFinite(opacity) ? opacity : 1));
  const raw = (hex || "#111116").trim();
  if (!raw.startsWith("#")) return raw;
  const clean = raw.slice(1);
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.slice(0, 6);
  if (full.length !== 6) return raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return raw;
  return `rgba(${r}, ${g}, ${b}, ${safeOpacity})`;
}

export interface UnifiedBadgeProps {
  config: UnifiedBadgeConfig;
  fillContainer?: boolean;
  className?: string;
  dataTestId?: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const ALIGN_MAP = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
} as const;

export const UnifiedBadge: React.FC<UnifiedBadgeProps> = ({
  config,
  fillContainer = false,
  className = "",
  dataTestId,
  title,
  onClick,
}) => {
  const meta = findBadgeMeta(config.id);
  const displayName = config.name || meta?.name || "Badge";
  const effectiveIconColor =
    config.icon.colorMode === "original"
      ? config.defaultColor || meta?.defaultColor || "#ffffff"
      : config.icon.color || "#ffffff";

  const iconWidth = config.icon.width || config.icon.size || 20;
  const iconHeight = config.icon.height || config.icon.size || 20;
  const iconOpacity = Math.max(0, Math.min(1, config.icon.opacity ?? 1));
  const overallOpacity = Math.max(0, Math.min(1, config.effects.opacity ?? 1));

  const glowColor = config.effects.glowColor || effectiveIconColor;
  const glowIntensity = Math.max(2, Math.min(36, config.effects.glowIntensity ?? 12));

  const hoverClass =
    config.effects.hoverEffect === "lift"
      ? "transition-transform duration-150 hover:-translate-y-0.5"
      : config.effects.hoverEffect === "scale"
        ? "transition-transform duration-150 hover:scale-105"
        : config.effects.hoverEffect === "glow"
          ? "transition-all duration-150 hover:brightness-125"
          : "";

  const animClass =
    config.effects.animation === "pulse"
      ? "animate-pulse"
      : config.effects.animation === "float"
        ? "animate-bounce"
        : "";

  const iconFilterParts: string[] = [];
  if (config.effects.glow) {
    iconFilterParts.push(
      `drop-shadow(0 0 ${Math.round(glowIntensity * 0.6)}px ${hexToRgba(glowColor, 0.75)})`
    );
  }
  if (config.effects.shadow && config.displayStyle === "icon-only") {
    iconFilterParts.push(
      `drop-shadow(0 2px ${Math.max(2, Math.round(config.effects.shadowBlur * 0.5))}px ${hexToRgba(
        config.effects.shadowColor || "#000000",
        0.65
      )})`
    );
  }

  const iconTransform =
    config.icon.horizontalPosition || config.icon.verticalPosition
      ? `translate(${config.icon.horizontalPosition || 0}px, ${config.icon.verticalPosition || 0}px)`
      : undefined;

  const iconElement = config.icon.enabled ? (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        opacity: iconOpacity,
        transform: iconTransform,
        marginRight:
          config.displayStyle === "icon-only" && config.icon.spacing
            ? `${config.icon.spacing}px`
            : undefined,
        filter: iconFilterParts.length > 0 ? iconFilterParts.join(" ") : undefined,
        alignSelf: ALIGN_MAP[config.icon.alignment || "center"],
      }}
    >
      {config.iconUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={config.iconUrl}
          alt={displayName}
          style={{
            width: `${iconWidth}px`,
            height: `${iconHeight}px`,
            objectFit: "contain",
          }}
          className="block select-none pointer-events-none"
        />
      ) : (
        renderBadgeGlyph(
          config.glyphIcon || meta?.icon || "Award",
          Math.max(iconWidth, iconHeight),
          effectiveIconColor
        )
      )}
    </span>
  ) : null;

  // STYLE 1: ICON ONLY — strictly NO background, NO border, NO square/card wrapper, NO padding
  if (config.displayStyle === "icon-only") {
    return (
      <span
        title={title ?? displayName}
        onClick={onClick}
        data-testid={dataTestId}
        data-badge-id={config.id}
        data-badge-source={config.source}
        data-badge-mode="icon-only"
        className={`inline-flex items-center justify-center shrink-0 select-none bg-transparent border-0 p-0 ${
          fillContainer ? "w-full h-full" : ""
        } ${hoverClass} ${animClass} ${className}`}
        style={{
          opacity: overallOpacity,
          margin: config.layout.margin ? `${config.layout.margin}px` : undefined,
        }}
      >
        {iconElement}
      </span>
    );
  }

  // Shared container styles for ICON + SQUARE and ICON + NAME
  const bgEnabled = config.background.enabled !== false;
  const bgOpacity = Math.max(0, Math.min(1, config.background.opacity ?? 0.85));
  const bgColor = bgEnabled ? hexToRgba(config.background.color || "#111116", bgOpacity) : "transparent";
  const bgImage =
    bgEnabled && config.background.type === "gradient"
      ? `linear-gradient(${config.background.gradientAngle ?? 135}deg, ${hexToRgba(
          config.background.color || "#111116",
          bgOpacity
        )}, ${hexToRgba(config.background.gradientTo || "#262634", bgOpacity)})`
      : undefined;

  const borderEnabled = config.border.enabled !== false && (config.border.width ?? 1) > 0;
  const borderWidth = borderEnabled ? config.border.width ?? 1 : 0;
  const borderColor = borderEnabled
    ? hexToRgba(config.border.color || "#2a2a34", config.border.opacity ?? 1)
    : "transparent";

  const boxShadows: string[] = [];
  if (config.effects.shadow) {
    boxShadows.push(
      `0 4px ${Math.max(2, config.effects.shadowBlur ?? 12)}px ${hexToRgba(
        config.effects.shadowColor || "#000000",
        0.55
      )}`
    );
  }
  if (config.effects.glow) {
    boxShadows.push(`0 0 ${glowIntensity}px ${hexToRgba(glowColor, 0.5)}`);
  }

  // STYLE 2: ICON WITH SQUARE
  if (config.displayStyle === "icon-square") {
    const squareSize = config.layout.width || config.layout.height;
    return (
      <div
        title={title ?? displayName}
        onClick={onClick}
        data-testid={dataTestId}
        data-badge-id={config.id}
        data-badge-source={config.source}
        data-badge-mode="icon-square"
        className={`inline-flex items-center justify-center shrink-0 select-none overflow-hidden ${
          bgEnabled ? "backdrop-blur-md" : ""
        } ${fillContainer ? "w-full h-full" : ""} ${hoverClass} ${animClass} ${className}`}
        style={{
          width: !fillContainer && squareSize ? `${squareSize}px` : undefined,
          height: !fillContainer && squareSize ? `${squareSize}px` : undefined,
          padding: `${config.layout.padding ?? 6}px`,
          margin: config.layout.margin ? `${config.layout.margin}px` : undefined,
          opacity: overallOpacity,
          backgroundColor: bgColor,
          backgroundImage: bgImage,
          borderWidth: `${borderWidth}px`,
          borderStyle: borderEnabled ? "solid" : "none",
          borderColor,
          borderRadius: `${config.border.radius ?? 10}px`,
          boxShadow: boxShadows.length > 0 ? boxShadows.join(", ") : undefined,
          justifyContent: ALIGN_MAP[config.layout.horizontalAlign || "center"],
          alignItems: ALIGN_MAP[config.layout.verticalAlign || "center"],
        }}
      >
        {iconElement}
      </div>
    );
  }

  // STYLE 3: ICON WITH NAME
  const textTransform =
    config.text.horizontalPosition || config.text.verticalPosition
      ? `translate(${config.text.horizontalPosition || 0}px, ${config.text.verticalPosition || 0}px)`
      : undefined;

  return (
    <div
      title={title ?? displayName}
      onClick={onClick}
      data-testid={dataTestId}
      data-badge-id={config.id}
      data-badge-source={config.source}
      data-badge-mode="icon-name"
      className={`inline-flex items-center min-w-0 max-w-full select-none overflow-hidden ${
        bgEnabled ? "backdrop-blur-md" : ""
      } ${fillContainer ? "w-full h-full" : ""} ${hoverClass} ${animClass} ${className}`}
      style={{
        width: !fillContainer && config.layout.width ? `${config.layout.width}px` : undefined,
        height: !fillContainer && config.layout.height ? `${config.layout.height}px` : undefined,
        padding: `${config.layout.padding ?? 6}px`,
        margin: config.layout.margin ? `${config.layout.margin}px` : undefined,
        gap: `${config.layout.gap ?? 6}px`,
        opacity: overallOpacity,
        backgroundColor: bgColor,
        backgroundImage: bgImage,
        borderWidth: `${borderWidth}px`,
        borderStyle: borderEnabled ? "solid" : "none",
        borderColor,
        borderRadius: `${config.border.radius ?? 10}px`,
        boxShadow: boxShadows.length > 0 ? boxShadows.join(", ") : undefined,
        justifyContent: ALIGN_MAP[config.layout.horizontalAlign || "center"],
        alignItems: ALIGN_MAP[config.layout.verticalAlign || "center"],
      }}
    >
      {iconElement}
      {config.text.enabled !== false && (
        <span
          className="truncate min-w-0"
          style={{
            color: config.text.color || effectiveIconColor,
            fontSize: `${config.text.fontSize ?? 12}px`,
            fontWeight: config.text.fontWeight ?? 600,
            fontFamily: config.text.fontFamily || "JetBrains Mono, monospace",
            textAlign: config.text.align || "left",
            letterSpacing: `${config.text.letterSpacing ?? 0}px`,
            transform: textTransform,
            lineHeight: 1.2,
          }}
        >
          {displayName}
        </span>
      )}
    </div>
  );
};
