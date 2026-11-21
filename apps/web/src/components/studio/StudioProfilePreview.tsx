"use client";

import React, { useEffect } from "react";
import {
  Activity,
  Play,
  ExternalLink,
  Volume2,
  Share2,
  Eye,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { ProfileDesignConfig } from "@/types/studio";
import { ensureFontLoaded } from "./fonts";
import { scopeAndSanitizeCss, computeBaseBackgroundStyle } from "./cssUtils";
import { ParticlesCanvas } from "./ParticlesCanvas";
import { PlatformIcon } from "@/components/links/PlatformIcons";
import { DiscordRpcCard } from "./DiscordRpcCard";
import { CanvasObjectRenderer } from "./CanvasObjectRenderer";
import { createDefaultCanvasState } from "@/types/studio";

export interface PreviewData {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  musicUrl?: string | null;
  musicTitle?: string | null;
  musicArtist?: string | null;
  views?: number;
  likes?: number;
  buttons?: Array<{
    id: string;
    title: string;
    subtitle?: string | null;
    url: string;
    openInNewTab?: boolean;
    gradient?: string | null;
  }>;
  links?: Array<{
    id: string;
    label: string;
    url: string;
    visibility: boolean;
    icon?: string | null;
    color?: string | null;
    order?: number;
  }>;
  discordPresence?: any | null;
  isPremium?: boolean;
}

interface StudioProfilePreviewProps {
  config: ProfileDesignConfig;
  data: PreviewData;
  isInteractiveEditor?: boolean;
  isPremium?: boolean;
  activeElementId?: string | null;
  inlineEditingId?: string | null;
  onSelectElement?: (elementId: string | null) => void;
  onSetInlineEditingId?: (id: string | null) => void;
  onUpdateElementProps?: (id: string, props: Record<string, any>) => void;
  scopeId?: string;
  footerSlot?: React.ReactNode;
  zoom?: number;
  onUpdateCanvas?: (updater: (prev: any) => any) => void;
  onResizeEmbed?: (
    embedId: string,
    width: number,
    height: number,
    x?: number,
    y?: number,
    scaleOptions?: {
      scaleFactor?: number;
      isCornerScaling?: boolean;
      isEdgeResizing?: boolean;
      isSymmetric?: boolean;
      gap?: number;
      padding?: number;
      avatarSize?: number;
      titleSize?: number;
      bioSize?: number;
      borderRadius?: number;
      socialIconSize?: number;
    }
  ) => void;
  onResizeElement?: (elementId: string, width: number, height: number, x?: number, y?: number) => void;
  onDuplicateEmbed?: (embedId: string) => void;
  onDeleteEmbed?: (embedId: string) => void;
  onToggleLockEmbed?: (embedId: string) => void;
  onChangeZIndexEmbed?: (embedId: string, delta: number) => void;
  updateConfig?: (updater: (prev: ProfileDesignConfig) => ProfileDesignConfig) => void;
}

export const StudioProfilePreview: React.FC<StudioProfilePreviewProps> = ({
  config,
  data,
  isInteractiveEditor = false,
  isPremium = false,
  activeElementId,
  inlineEditingId,
  onSelectElement,
  onSetInlineEditingId,
  onUpdateElementProps,
  scopeId = "profile-preview-root",
  footerSlot,
  zoom = 100,
  onUpdateCanvas,
  onResizeEmbed,
  onResizeElement,
  onDuplicateEmbed,
  onDeleteEmbed,
  onToggleLockEmbed,
  onChangeZIndexEmbed,
  updateConfig,
}) => {
  const isPremiumUser = Boolean(isPremium || data.isPremium);
  const {
    layout,
    identity,
    avatar,
    background,
    typography,
    discordRpc,
    buttons: buttonConfig,
    socials,
    effects,
    customCss,
    layers,
  } = config;

  const handleResizeEmbed = (
    embedId: string,
    width: number,
    height: number,
    x?: number,
    y?: number,
    scaleOptions?: {
      scaleFactor?: number;
      isCornerScaling?: boolean;
      isEdgeResizing?: boolean;
      isSymmetric?: boolean;
      gap?: number;
      padding?: number;
      avatarSize?: number;
      titleSize?: number;
      bioSize?: number;
      borderRadius?: number;
      socialIconSize?: number;
    }
  ) => {
    if (onResizeEmbed) {
      onResizeEmbed(embedId, width, height, x, y, scaleOptions);
      return;
    }
    const isPrimary = embedId === "embed_primary";
    const isEdgeResizing = Boolean(scaleOptions?.isEdgeResizing);

    if (updateConfig) {
      updateConfig((prev) => {
        const currentCanvas = prev.canvas ? { ...prev.canvas } : createDefaultCanvasState(prev);
        const updatedEmbeds = currentCanvas.embeds.map((em) =>
          em.id === embedId
            ? {
                ...em,
                transform: {
                  ...em.transform,
                  width,
                  height,
                  ...(x !== undefined ? { x } : {}),
                  ...(y !== undefined ? { y } : {}),
                },
              }
            : em
        );

        if (isEdgeResizing) {
          // OPERATION B & C: ONLY OUTER CONTAINER DIMENSIONS CHANGE
          // Internal content, typography, avatar, gap, and padding are 100% UNTOUCHED!
          return {
            ...prev,
            ...(isPrimary
              ? {
                  layout: {
                    ...prev.layout,
                    maxWidth: width,
                    height,
                    autoHeight: false,
                  },
                }
              : {}),
            canvas: {
              ...currentCanvas,
              embeds: updatedEmbeds,
            },
          };
        }

        // OPERATION A: CORNER SCALING — Scale outer embed and all nested elements proportionally
        const scaleFactor = scaleOptions?.scaleFactor ?? (width / (prev.layout?.maxWidth || 580));
        const updatedElements =
          scaleFactor && scaleFactor !== 1
            ? currentCanvas.elements.map((el) => {
                if (el.parentEmbedId !== embedId) return el;
                return {
                  ...el,
                  transform: {
                    ...el.transform,
                    width: Math.round(el.transform.width * scaleFactor),
                    height: Math.round(el.transform.height * scaleFactor),
                  },
                  ...(el.style?.fontSize
                    ? {
                        style: {
                          ...el.style,
                          fontSize: Math.max(7, Math.round(el.style.fontSize * scaleFactor)),
                        },
                      }
                    : {}),
                };
              })
            : currentCanvas.elements;

        return {
          ...prev,
          ...(isPrimary
            ? {
                layout: {
                  ...prev.layout,
                  maxWidth: width,
                  height,
                  autoHeight: false,
                  ...(scaleOptions?.gap !== undefined ? { gap: scaleOptions.gap } : {}),
                  ...(scaleOptions?.padding !== undefined ? { padding: scaleOptions.padding } : {}),
                },
                ...(scaleOptions?.avatarSize ? { avatar: { ...prev.avatar, size: scaleOptions.avatarSize } } : {}),
                identity: {
                  ...prev.identity,
                  ...(scaleOptions?.titleSize ? { titleSize: scaleOptions.titleSize } : {}),
                  ...(scaleOptions?.bioSize ? { bioSize: scaleOptions.bioSize } : {}),
                },
                ...(scaleOptions?.borderRadius ? { discordRpc: { ...prev.discordRpc, borderRadius: scaleOptions.borderRadius } } : {}),
                ...(scaleOptions?.socialIconSize ? { socials: { ...prev.socials, iconSize: scaleOptions.socialIconSize } } : {}),
              }
            : {}),
          canvas: {
            ...currentCanvas,
            embeds: updatedEmbeds,
            elements: updatedElements,
          },
        };
      });
    } else if (onUpdateCanvas) {
      onUpdateCanvas((prev: any) => {
        const updatedEmbeds = prev.embeds?.map((em: any) =>
          em.id === embedId
            ? {
                ...em,
                transform: {
                  ...em.transform,
                  width,
                  height,
                  ...(x !== undefined ? { x } : {}),
                  ...(y !== undefined ? { y } : {}),
                },
              }
            : em
        );
        return {
          ...prev,
          embeds: updatedEmbeds,
        };
      });
    }
  };

  const handleResizeElement = (elementId: string, width: number, height: number, x?: number, y?: number) => {
    if (onResizeElement) {
      onResizeElement(elementId, width, height, x, y);
      return;
    }
    if (onUpdateCanvas) {
      onUpdateCanvas((prev: any) => ({
        ...prev,
        elements: prev.elements?.map((el: any) =>
          el.id === elementId
            ? {
                ...el,
                transform: {
                  ...el.transform,
                  width,
                  height,
                  ...(x !== undefined ? { x } : {}),
                  ...(y !== undefined ? { y } : {}),
                },
              }
            : el
        ),
      }));
    }
    if (updateConfig) {
      updateConfig((prev) => {
        const updatedElements = prev.canvas?.elements?.map((el) =>
          el.id === elementId
            ? {
                ...el,
                transform: {
                  ...el.transform,
                  width,
                  height,
                  ...(x !== undefined ? { x } : {}),
                  ...(y !== undefined ? { y } : {}),
                },
              }
            : el
        );
        const targetEl = prev.canvas?.elements?.find((el) => el.id === elementId);
        const isAvatar = targetEl?.type === "avatar" || elementId === "avatar_1";
        return {
          ...prev,
          ...(isAvatar ? { avatar: { ...prev.avatar, size: width } } : {}),
          ...(updatedElements ? { canvas: { ...prev.canvas!, elements: updatedElements } } : {}),
        };
      });
    }
  };

  const handleDuplicateEmbed = (embedId: string) => {
    if (onDuplicateEmbed) {
      onDuplicateEmbed(embedId);
      return;
    }
    if (onUpdateCanvas) {
      onUpdateCanvas((prev: any) => {
        const target = prev.embeds?.find((em: any) => em.id === embedId);
        if (!target) return prev;
        const newEmbedId = `embed_${Date.now()}`;
        const newChildren: any[] = [];
        prev.elements?.filter((el: any) => el.parentEmbedId === embedId).forEach((child: any) => {
          newChildren.push({
            ...child,
            id: `${child.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            parentEmbedId: newEmbedId,
            transform: { ...child.transform, x: (child.transform.x || 0) + 20, y: (child.transform.y || 0) + 20 },
          });
        });
        const clonedEmbed = {
          ...target,
          id: newEmbedId,
          title: `${target.title} (Copy)`,
          transform: {
            ...target.transform,
            x: (target.transform.x || 0) + 24,
            y: (target.transform.y || 0) + 24,
          },
          childrenIds: newChildren.map((c: any) => c.id),
        };
        return {
          ...prev,
          embeds: [...prev.embeds, clonedEmbed],
          elements: [...prev.elements, ...newChildren],
          selectedId: newEmbedId,
        };
      });
    }
    if (updateConfig) {
      updateConfig((prev) => {
        const target = prev.canvas?.embeds?.find((em) => em.id === embedId);
        if (!target) return prev;
        const newEmbedId = `embed_${Date.now()}`;
        const newChildren: any[] = [];
        prev.canvas?.elements?.filter((el) => el.parentEmbedId === embedId).forEach((child) => {
          newChildren.push({
            ...child,
            id: `${child.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            parentEmbedId: newEmbedId,
            transform: { ...child.transform, x: (child.transform.x || 0) + 20, y: (child.transform.y || 0) + 20 },
          });
        });
        const clonedEmbed = {
          ...target,
          id: newEmbedId,
          title: `${target.title} (Copy)`,
          transform: {
            ...target.transform,
            x: (target.transform.x || 0) + 24,
            y: (target.transform.y || 0) + 24,
          },
          childrenIds: newChildren.map((c) => c.id),
        };
        return {
          ...prev,
          canvas: {
            ...prev.canvas!,
            embeds: [...(prev.canvas?.embeds || []), clonedEmbed],
            elements: [...(prev.canvas?.elements || []), ...newChildren],
          },
        };
      });
    }
  };

  const handleDeleteEmbed = (embedId: string) => {
    if (onDeleteEmbed) {
      onDeleteEmbed(embedId);
      return;
    }
    if (onUpdateCanvas) {
      onUpdateCanvas((prev: any) => ({
        ...prev,
        embeds: prev.embeds?.filter((em: any) => em.id !== embedId),
        elements: prev.elements?.filter((el: any) => el.parentEmbedId !== embedId),
        selectedId: null,
      }));
    }
    if (updateConfig) {
      updateConfig((prev) => ({
        ...prev,
        canvas: {
          ...prev.canvas!,
          embeds: prev.canvas?.embeds?.filter((em) => em.id !== embedId) || [],
          elements: prev.canvas?.elements?.filter((el) => el.parentEmbedId !== embedId) || [],
        },
      }));
    }
    onSelectElement?.(null);
  };

  const handleDeleteElement = (elementId: string) => {
    if (onUpdateCanvas) {
      onUpdateCanvas((prev: any) => ({
        ...prev,
        elements: prev.elements?.filter((el: any) => el.id !== elementId),
        embeds: prev.embeds?.map((em: any) => ({
          ...em,
          childrenIds: em.childrenIds?.filter((cid: string) => cid !== elementId),
        })),
        selectedId: null,
      }));
    }
    if (updateConfig) {
      updateConfig((prev) => ({
        ...prev,
        canvas: {
          ...prev.canvas!,
          elements: prev.canvas?.elements?.filter((el) => el.id !== elementId) || [],
          embeds: prev.canvas?.embeds?.map((em) => ({
            ...em,
            childrenIds: em.childrenIds?.filter((cid) => cid !== elementId),
          })) || [],
        },
      }));
    }
    onSelectElement?.(null);
  };

  const handleToggleLockEmbed = (embedId: string) => {
    if (onToggleLockEmbed) {
      onToggleLockEmbed(embedId);
      return;
    }
    if (onUpdateCanvas) {
      onUpdateCanvas((prev: any) => ({
        ...prev,
        embeds: prev.embeds?.map((em: any) =>
          em.id === embedId ? { ...em, isLocked: !em.isLocked, transform: { ...em.transform, isLocked: !em.isLocked } } : em
        ),
      }));
    }
    if (updateConfig) {
      updateConfig((prev) => ({
        ...prev,
        canvas: {
          ...prev.canvas!,
          embeds: prev.canvas?.embeds?.map((em) =>
            em.id === embedId ? { ...em, isLocked: !em.isLocked, transform: { ...em.transform, isLocked: !em.isLocked } } : em
          ) || [],
        },
      }));
    }
  };

  const handleChangeZIndexEmbed = (embedId: string, delta: number) => {
    if (onChangeZIndexEmbed) {
      onChangeZIndexEmbed(embedId, delta);
      return;
    }
    if (onUpdateCanvas) {
      onUpdateCanvas((prev: any) => ({
        ...prev,
        embeds: prev.embeds?.map((em: any) =>
          em.id === embedId ? { ...em, transform: { ...em.transform, zIndex: Math.max(1, (em.transform.zIndex || 1) + delta) } } : em
        ),
      }));
    }
    if (updateConfig) {
      updateConfig((prev) => ({
        ...prev,
        canvas: {
          ...prev.canvas!,
          embeds: prev.canvas?.embeds?.map((em) =>
            em.id === embedId ? { ...em, transform: { ...em.transform, zIndex: Math.max(1, (em.transform.zIndex || 1) + delta) } } : em
          ) || [],
        },
      }));
    }
  };

  const handleToggleHideEmbed = (embedId: string) => {
    if (onUpdateCanvas) {
      onUpdateCanvas((prev: any) => ({
        ...prev,
        embeds: prev.embeds?.map((em: any) =>
          em.id === embedId ? { ...em, isVisible: em.isVisible === false ? true : false } : em
        ),
      }));
    }
    if (updateConfig) {
      updateConfig((prev) => ({
        ...prev,
        canvas: {
          ...prev.canvas!,
          embeds: prev.canvas?.embeds?.map((em) =>
            em.id === embedId ? { ...em, isVisible: em.isVisible === false ? true : false } : em
          ) || [],
        },
      }));
    }
  };

  const handleInsertElement = (embedId: string, type: any) => {
    const newId = `${type}_${Date.now()}`;
    const newEl = {
      id: newId,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Block`,
      parentEmbedId: embedId,
      transform: {
        x: 0,
        y: 0,
        width: 480,
        height: type === "divider" ? 2 : type === "bio" ? 64 : 40,
        rotation: 0,
        zIndex: 2,
      },
      props: {
        text: type === "bio" ? "Biography text content..." : `${type} content`,
        url: type === "button" ? "https://pixel.gg" : "",
      },
      isVisible: true,
      isLocked: false,
    };

    if (onUpdateCanvas) {
      onUpdateCanvas((prev: any) => ({
        ...prev,
        elements: [...(prev.elements || []), newEl],
        embeds: prev.embeds?.map((em: any) =>
          em.id === embedId ? { ...em, childrenIds: [...(em.childrenIds || []), newId] } : em
        ),
      }));
    }
    if (updateConfig) {
      updateConfig((prev) => ({
        ...prev,
        canvas: {
          ...prev.canvas!,
          elements: [...(prev.canvas?.elements || []), newEl],
          embeds: prev.canvas?.embeds?.map((em) =>
            em.id === embedId ? { ...em, childrenIds: [...(em.childrenIds || []), newId] } : em
          ) || [],
        },
      }));
    }
    onSelectElement?.(newId);
  };

  const handleContextualSave = (target: any, updatedData: any) => {
    if (!updateConfig) return;
    if (target.type === "rpc") {
      updateConfig((prev) => ({
        ...prev,
        discordRpc: {
          ...prev.discordRpc,
          ...(updatedData.appName ? { appName: updatedData.appName } : {}),
          ...(updatedData.details !== undefined ? { details: updatedData.details } : {}),
          ...(updatedData.state !== undefined ? { state: updatedData.state } : {}),
          ...(updatedData.largeImage !== undefined ? { largeImage: updatedData.largeImage } : {}),
          ...(updatedData.smallImage !== undefined ? { smallImage: updatedData.smallImage } : {}),
          ...(updatedData.partySize !== undefined ? { partySize: updatedData.partySize } : {}),
          ...(updatedData.partyMax !== undefined ? { partyMax: updatedData.partyMax } : {}),
          ...(updatedData.buttons !== undefined ? { buttons: updatedData.buttons } : {}),
          ...(updatedData.isStandalone !== undefined
            ? {
                customLayout: updatedData.isStandalone
                  ? (prev.discordRpc?.customLayout || { enabled: true, elements: [] })
                  : undefined,
              }
            : {}),
          ...(updatedData.showProfileRpc !== undefined ? { showProfileRpc: updatedData.showProfileRpc } : {}),
        },
      }));
    } else if (target.type === "info") {
      updateConfig((prev) => {
        const titleColor = updatedData.accentColor ?? prev.identity?.titleColor;
        const updatedElements = prev.canvas?.elements?.map((el) => {
          if (el.type === "displayName" || el.id === "username_1") {
            return {
              ...el,
              props: { ...el.props, text: updatedData.displayName || el.props?.text },
            };
          }
          return el;
        });
        return {
          ...prev,
          identity: {
            ...prev.identity,
            titleColor,
          },
          ...(updatedElements ? { canvas: { ...prev.canvas!, elements: updatedElements } } : {}),
        };
      });
    } else if (target.type === "bio") {
      updateConfig((prev) => {
        const updatedElements = prev.canvas?.elements?.map((el) => {
          if (el.type === "bio") {
            return {
              ...el,
              props: { ...el.props, text: updatedData.bio || el.props?.text },
            };
          }
          return el;
        });
        return {
          ...prev,
          ...(updatedElements ? { canvas: { ...prev.canvas!, elements: updatedElements } } : {}),
        };
      });
    } else if (target.type === "banner") {
      updateConfig((prev) => ({
        ...prev,
        background: {
          ...prev.background,
          imageUrl: updatedData.bannerUrl ?? prev.background?.imageUrl,
        },
      }));
    } else if (target.type === "image" || target.type === "text") {
      if (target.elementId && onUpdateElementProps) {
        onUpdateElementProps(target.elementId, updatedData);
      }
    }
  };

  // Dynamically load selected fonts
  useEffect(() => {
    if (typography.headingFont) ensureFontLoaded(typography.headingFont);
    if (typography.bodyFont) ensureFontLoaded(typography.bodyFont);
    if (identity.titleFont) ensureFontLoaded(identity.titleFont);
    if (identity.bioFont) ensureFontLoaded(identity.bioFont);
  }, [typography, identity]);

  const isLayerVisible = (id: string) => {
    const layer = layers?.find((l) => l.id === id);
    return layer ? layer.visible : true;
  };

  const getElementSelectProps = (elementId: string, extraClassName: string = "") => {
    if (!isInteractiveEditor) return { className: extraClassName };
    const isSelected = activeElementId === elementId || (elementId === "avatar" && (activeElementId === "avatar" || activeElementId === "avatar_1"));
    return {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectElement?.(elementId);
      },
      className: `relative transition-all cursor-pointer rounded-xl ${
        isSelected
          ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-black"
          : "hover:ring-1 hover:ring-white/40"
      } ${extraClassName}`.trim(),
    };
  };

  // Avatar border-radius computation based on shape
  const getAvatarRadius = () => {
    switch (avatar.shape) {
      case "circle":
        return "9999px";
      case "square":
        return "0px";
      case "squircle":
        return "32%";
      case "rounded":
      default:
        return "20px";
    }
  };

  // Compute base background styling (solid, gradient, mesh, custom CSS gradient)
  const getBaseBackgroundStyle = (): React.CSSProperties => {
    return computeBaseBackgroundStyle(background, identity.titleColor, effects.glowColor);
  };

  const scopedCssCode = customCss ? scopeAndSanitizeCss(customCss, `.${scopeId}`) : "";

  return (
    <div
      id={scopeId}
      className={`${scopeId} relative ${
        isInteractiveEditor ? "min-h-full" : "min-h-screen"
      } w-full flex-1 flex flex-col items-center justify-between p-4 sm:p-8 ${
        isInteractiveEditor ? "overflow-hidden" : "overflow-x-hidden"
      } select-none transition-colors duration-300`}
      style={{
        backgroundColor: background.color || "#050505",
        fontFamily: typography.bodyFont ? `"${typography.bodyFont}", sans-serif` : "inherit",
      }}
      onClick={() => onSelectElement?.("background")}
    >
      {/* Dynamic Scoped CSS */}
      {scopedCssCode && <style dangerouslySetInnerHTML={{ __html: scopedCssCode }} />}

      {/* Layer 0: Full-Viewport Background Engine Layer (100% edge-to-edge coverage, no aspect-ratio or rectangle bounds) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
        {/* Base Color / Gradient / Mesh / Custom CSS Gradient */}
        <div
          className="absolute inset-0 w-full h-full"
          style={getBaseBackgroundStyle()}
        />

        {/* MP4 / WebM Video Background */}
        {background.type === "video" && background.videoUrl && (
          <div
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{
              filter: background.blur > 0 ? `blur(${background.blur}px)` : undefined,
              opacity: (background.opacity ?? 100) / 100,
            }}
          >
            <video
              src={background.videoUrl}
              poster={background.videoPoster}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full select-none"
              style={{
                transformOrigin: `${background.focalPoint?.x ?? 50}% ${background.focalPoint?.y ?? 50}%`,
                transform: `translate(${background.offsetX ?? 0}px, ${background.offsetY ?? 0}px) scale(${(background.zoom ?? 100) / 100}) rotate(${background.rotation ?? 0}deg)`,
                objectFit: (background.fitMode as any) || (background.size === "contain" ? "contain" : "cover"),
                objectPosition: `${background.focalPoint?.x ?? 50}% ${background.focalPoint?.y ?? 50}%`,
              }}
            />
          </div>
        )}

        {/* Transformable Image / Animated GIF Layer */}
        {(background.type === "image" || background.type === "gif") && background.imageUrl && (
          <div
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{
              filter: background.blur > 0 ? `blur(${background.blur}px)` : undefined,
              opacity: (background.opacity ?? 100) / 100,
            }}
          >
            <img
              src={background.imageUrl}
              alt="Profile Background"
              className="w-full h-full select-none"
              style={{
                transformOrigin: `${background.focalPoint?.x ?? 50}% ${background.focalPoint?.y ?? 50}%`,
                transform: `translate(${background.offsetX ?? 0}px, ${background.offsetY ?? 0}px) scale(${(background.zoom ?? 100) / 100}) rotate(${background.rotation ?? 0}deg)`,
                objectFit: (background.fitMode as any) || (background.size === "contain" ? "contain" : "cover"),
                objectPosition: `${background.focalPoint?.x ?? 50}% ${background.focalPoint?.y ?? 50}%`,
                ...(background.crop
                  ? {
                      clipPath: `inset(${background.crop.y}% ${100 - (background.crop.x + background.crop.width)}% ${100 - (background.crop.y + background.crop.height)}% ${background.crop.x}%)`,
                    }
                  : {}),
              }}
            />
          </div>
        )}

        {/* Layer 1: Background Effects & Overlays */}
        {/* Background Pattern Overlays */}
        {background.pattern === "dots" && (
          <div className="absolute inset-0 nt-dot-grid opacity-60 pointer-events-none z-[1]" />
        )}
        {background.pattern === "grid" && (
          <div
            className="absolute inset-0 pointer-events-none z-[1] opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        )}
        {background.pattern === "scanlines" && (
          <div
            className="absolute inset-0 pointer-events-none z-[1] opacity-15"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 50%, transparent 50%)",
              backgroundSize: "100% 4px",
            }}
          />
        )}
        {background.pattern === "matrix" && (
          <div
            className="absolute inset-0 pointer-events-none z-[1] opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(34, 197, 94, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.15) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
        )}

        {/* Ambient Glow & Lighting Effects */}
        {effects.ambientGlow && (
          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background: `radial-gradient(circle at 50% 30%, ${effects.glowColor || "#22d3ee"}22 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Particle Effects Canvas */}
        {effects.particles !== "None" && (
          <div className="absolute inset-0 pointer-events-none z-[2]">
            <ParticlesCanvas effect={effects.particles} accentColor={effects.glowColor || "#ffffff"} />
          </div>
        )}

        {/* Noise overlay */}
        {effects.noise && (
          <div className="absolute inset-0 pointer-events-none z-[2] opacity-10 bg-repeat" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }} />
        )}

        {/* Background Dim / Overlay */}
        {background.overlayOpacity > 0 && (
          <div
            className="absolute inset-0 pointer-events-none z-[3]"
            style={{
              backgroundColor: background.overlayColor || "#000000",
              opacity: background.overlayOpacity,
            }}
          />
        )}
      </div>

      {/* Dynamic Profile Rendering: Multi-Embed Canvas Mode vs Structured Mode */}
      {isInteractiveEditor || (config.canvas && config.canvas.embeds && config.canvas.embeds.length > 0) ? (() => {
        const activeCanvas = (config.canvas && config.canvas.embeds && config.canvas.embeds.length > 0)
          ? config.canvas
          : createDefaultCanvasState(config);

        return (
          <CanvasObjectRenderer
            embeds={activeCanvas.embeds}
            elements={activeCanvas.elements}
            config={config}
            data={data}
            isInteractive={isInteractiveEditor}
            isPremium={isPremiumUser}
            selectedId={activeElementId}
            inlineEditingId={inlineEditingId}
            onSelectElement={onSelectElement}
            onSetInlineEditingId={onSetInlineEditingId}
            onUpdateElementProps={onUpdateElementProps}
            zoom={zoom}
            onResizeEmbed={handleResizeEmbed}
            onResizeElement={handleResizeElement}
            onDuplicateEmbed={handleDuplicateEmbed}
            onDeleteEmbed={handleDeleteEmbed}
            onDeleteElement={handleDeleteElement}
            onToggleLockEmbed={handleToggleLockEmbed}
            onToggleHideEmbed={handleToggleHideEmbed}
            onChangeZIndexEmbed={handleChangeZIndexEmbed}
            onInsertElement={handleInsertElement}
            onContextualSave={handleContextualSave}
          />
        );
      })() : (
        /* Main Container Card Fallback */
        <motion.div
          layout
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={(e) => {
            if (!isInteractiveEditor) return;
            e.stopPropagation();
            onSelectElement?.("layout");
          }}
          className={`profile-container w-full relative z-10 transition-all border shadow-2xl box-border ${
            isInteractiveEditor && (activeElementId === "layout" || activeElementId === "embed_primary" || activeElementId === "container")
              ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-black"
              : isInteractiveEditor
                ? "hover:ring-1 hover:ring-white/30 cursor-pointer"
                : ""
          }`}
          style={{
            width: "100%",
            maxWidth: `${layout.maxWidth || 580}px`,
            minHeight: layout.autoHeight === false && layout.height ? `${layout.height}px` : undefined,
            padding: `${layout.padding || 32}px`,
            gap: `${layout.gap || 24}px`,
            borderRadius: `${discordRpc.borderRadius + 8}px`,
            backgroundColor: effects.glassmorphism
              ? `rgba(12, 12, 16, ${Math.round(((effects.opacity ?? 70) / 100) * 0.65 * 1000) / 1000})`
              : `rgba(12, 12, 16, ${Math.round(((effects.opacity ?? 85) / 100) * 1000) / 1000})`,
            backdropFilter: (effects.blur ?? 16) > 0 ? `blur(${effects.blur || 16}px) saturate(180%)` : undefined,
            borderColor: effects.ambientGlow ? effects.glowColor : "rgba(255, 255, 255, 0.1)",
            boxShadow: effects.ambientGlow
              ? `0 0 35px ${effects.glowColor}25, 0 20px 40px rgba(0,0,0,0.8)`
              : "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          }}
        >
        {/* Top Minimalist Header */}
        <div className="flex items-center justify-between text-[11px] pb-4 mb-4 border-b border-white/10 text-neutral-400 font-mono">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: effects.glowColor || "#ffffff" }}
            />
            <span className="text-white font-semibold tracking-wider">
              PIXEL.GG // {(data.username || "USER").toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-neutral-400">
              <Eye size={12} />
              <span>{(data.views || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-neutral-400">
              <Heart size={12} className={data.likes ? "text-rose-500 fill-rose-500" : "text-neutral-500"} />
              <span>{(data.likes || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-neutral-500 hover:text-white transition-colors cursor-pointer">
              <Share2 size={12} />
            </div>
          </div>
        </div>

        {/* Dynamic Element Ordering */}
        <div
          className={`flex flex-col ${
            layout.alignment === "left"
              ? "items-start text-left"
              : layout.alignment === "right"
              ? "items-end text-right"
              : "items-center text-center"
          }`}
          style={{ gap: `${layout.gap || 22}px` }}
        >
          {layout.elementOrder?.map((elementId) => {
            if (!isLayerVisible(elementId)) return null;

            // 1. Avatar
            if (elementId === "avatar") {
              const alignClass =
                avatar.alignment === "left"
                  ? "self-start"
                  : avatar.alignment === "right"
                  ? "self-end"
                  : "self-center";

              const animClass =
                avatar.hoverAnimation === "scale"
                  ? "hover:scale-105"
                  : avatar.hoverAnimation === "rotate"
                  ? "hover:rotate-6"
                  : avatar.hoverAnimation === "pulse"
                  ? "animate-pulse"
                  : "";

              return (
                <div
                  key="avatar"
                  {...getElementSelectProps("avatar", `shrink-0 ${alignClass}`)}
                  style={{
                    transform: avatar.offsetY ? `translateY(${avatar.offsetY}px)` : undefined,
                  }}
                >
                  <div
                    className={`profile-avatar relative overflow-hidden flex items-center justify-center font-bold text-white shadow-xl transition-all duration-300 ${animClass}`}
                    style={{
                      width: `${avatar.size}px`,
                      height: `${avatar.size}px`,
                      borderRadius: getAvatarRadius(),
                      borderWidth: `${avatar.borderWidth}px`,
                      borderStyle: "solid",
                      borderColor: avatar.borderColor || "#ffffff",
                      backgroundColor: "#18181b",
                      boxShadow: avatar.glow
                        ? `0 0 24px ${avatar.glowColor || "#ffffff"}80`
                        : undefined,
                    }}
                  >
                    {data.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={data.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full"
                        style={{ objectFit: avatar.objectFit || "cover" }}
                      />
                    ) : (
                      <span className="text-2xl">
                        {(data.displayName || data.username || "P").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // 2. Identity (Name, Badges & Bio)
            if (elementId === "identity") {
              return (
                <div
                  key="identity"
                  {...getElementSelectProps(
                    "identity",
                    `profile-identity w-full space-y-1.5 flex flex-col ${
                      layout.alignment === "left"
                        ? "items-start text-left"
                        : layout.alignment === "right"
                        ? "items-end text-right"
                        : "items-center text-center"
                    }`
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h1
                      className="profile-username tracking-tight truncate"
                      style={{
                        fontFamily: identity.titleFont ? `"${identity.titleFont}", sans-serif` : "inherit",
                        fontSize: `${identity.titleSize}px`,
                        fontWeight: identity.titleWeight,
                        color: identity.titleColor || "#ffffff",
                        letterSpacing: `${typography.letterSpacing}px`,
                      }}
                    >
                      {data.displayName || data.username || "Pixel Identity"}
                    </h1>

                    {/* Badge variants */}
                    {identity.badgeStyle === "pill" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-black font-bold uppercase tracking-wider">
                        VERIFIED ✓
                      </span>
                    )}
                    {identity.badgeStyle === "glyph" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/60 text-white font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> (01)
                      </span>
                    )}
                    {identity.badgeStyle === "neon" && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                        style={{
                          backgroundColor: `${effects.glowColor}25`,
                          color: effects.glowColor || "#22d3ee",
                          border: `1px solid ${effects.glowColor}`,
                          boxShadow: `0 0 10px ${effects.glowColor}40`,
                        }}
                      >
                        PRO &bull; LIVE
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-500 font-mono">@{data.username}</p>

                  {data.bio && (
                    <p
                      className="profile-bio text-xs leading-relaxed max-w-md pt-1"
                      style={{
                        fontFamily: identity.bioFont ? `"${identity.bioFont}", sans-serif` : "inherit",
                        color: identity.bioColor || "#a3a3a3",
                        lineHeight: typography.lineHeight || 1.5,
                      }}
                    >
                      {data.bio}
                    </p>
                  )}
                </div>
              );
            }

            // 3. Discord Rich Presence Tile
            if (elementId === "rpc") {
              // Website Profile RPC visibility check:
              // If disabled or layer hidden, do not display and do NOT reserve space
              if (discordRpc.showProfileRpc === false || !isLayerVisible("rpc")) {
                return null;
              }

              return (
                <div key="rpc" {...getElementSelectProps("rpc", "w-full")}>
                  <DiscordRpcCard
                    config={discordRpc}
                    data={data.discordPresence}
                    isInteractiveEditor={isInteractiveEditor}
                    isPremium={isPremiumUser}
                  />
                </div>
              );
            }

            // 4. Music Player Dock
            if (elementId === "music") {
              return (
                <div key="music" {...getElementSelectProps("music", "w-full")}>
                  <div className="bg-[#111111] border border-[#242424] rounded-2xl p-3.5 space-y-2.5 font-mono text-xs w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                          <Play size={12} className="ml-0.5" />
                        </div>
                        <div className="truncate">
                          <p className="text-white font-medium text-xs truncate">
                            {data.musicTitle || "Nothing Soundscape (01)"}
                          </p>
                          <p className="text-neutral-500 text-[10px] truncate">
                            {data.musicArtist || "Ambient Audio Engine"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                        <Volume2 size={13} />
                        <div className="w-14 h-1 bg-white/20 rounded-full overflow-hidden">
                          <div className="w-2/3 h-full bg-white rounded-full" />
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              );
            }

            // 5. Action Buttons
            if (elementId === "buttons") {
              const buttonsList = data.buttons || [
                { id: "b1", title: "DISCORD COMMUNITY", subtitle: "Join the verified network", url: "#" },
                { id: "b2", title: "GITHUB REPOSITORY", subtitle: "Inspect source code", url: "#" },
              ];

              return (
                <div key="buttons" {...getElementSelectProps("buttons", "w-full space-y-2")}>
                  {buttonsList.map((btn) => (
                    <div
                      key={btn.id}
                      className="profile-button w-full py-3 px-4 font-mono text-xs font-semibold flex items-center justify-between transition-all"
                      style={{
                        borderRadius: `${buttonConfig.borderRadius}px`,
                        backgroundColor:
                          buttonConfig.variant === "solid-white"
                            ? "#ffffff"
                            : buttonConfig.variant === "glass"
                            ? "rgba(255, 255, 255, 0.08)"
                            : buttonConfig.variant === "neon"
                            ? `${effects.glowColor}15`
                            : "transparent",
                        color:
                          buttonConfig.variant === "solid-white"
                            ? "#000000"
                            : buttonConfig.variant === "neon"
                            ? effects.glowColor || "#22d3ee"
                            : "#ffffff",
                        border:
                          buttonConfig.variant === "outline"
                            ? "1px solid rgba(255, 255, 255, 0.4)"
                            : buttonConfig.variant === "neon"
                            ? `1px solid ${effects.glowColor || "#22d3ee"}`
                            : "1px solid rgba(255, 255, 255, 0.15)",
                        boxShadow:
                          buttonConfig.variant === "neon"
                            ? `0 0 12px ${effects.glowColor}30`
                            : undefined,
                      }}
                    >
                      <div className="text-left truncate">
                        <p className="truncate">{btn.title}</p>
                        {btn.subtitle && (
                          <p className="text-[10px] opacity-70 font-sans font-normal truncate">
                            {btn.subtitle}
                          </p>
                        )}
                      </div>
                      <ExternalLink size={13} className="shrink-0 opacity-70" />
                    </div>
                  ))}
                </div>
              );
            }

            // 6. Social Links Row
            if (elementId === "socials") {
              const linksList = data.links || [
                { id: "l1", label: "Discord", url: "#", visibility: true },
                { id: "l2", label: "GitHub", url: "#", visibility: true },
                { id: "l3", label: "X / Twitter", url: "#", visibility: true },
              ];

              return (
                <div
                  key="socials"
                  {...getElementSelectProps(
                    "socials",
                    `profile-socials flex flex-wrap gap-2 pt-1 ${
                      socials.alignment === "left"
                        ? "justify-start"
                        : socials.alignment === "right"
                        ? "justify-end"
                        : "justify-center"
                    }`
                  )}
                >
                  {linksList
                    .filter((l) => l.visibility)
                    .map((link) => (
                      <div
                        key={link.id}
                        className="px-3 py-1.5 border text-xs font-mono flex items-center gap-2 transition-all"
                        style={{
                          borderRadius:
                            socials.style === "circle" || socials.style === "pill"
                              ? "9999px"
                              : "8px",
                          borderColor:
                            socials.style === "neon"
                              ? effects.glowColor
                              : "rgba(255, 255, 255, 0.15)",
                          backgroundColor:
                            socials.style === "glass"
                              ? "rgba(255, 255, 255, 0.05)"
                              : socials.style === "neon"
                              ? `${effects.glowColor}15`
                              : "#141414",
                          color:
                            socials.style === "neon"
                              ? effects.glowColor || "#ffffff"
                              : "#d4d4d8",
                        }}
                      >
                        <PlatformIcon
                          id={(link as any).icon || link.label}
                          className="w-4 h-4 shrink-0"
                        />
                        <span style={{ fontSize: `${socials.iconSize}px` }}>{link.label}</span>
                        <ExternalLink size={11} className="opacity-60" />
                      </div>
                    ))}
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* Branding Footer */}
        <div className="pt-4 mt-2 border-t border-white/10 text-center text-[10px] text-neutral-500 font-mono">
          POWERED BY <span className="text-neutral-300 font-bold">PIXEL.GG STUDIO (01)</span> &bull; NOTHING OS
        </div>
      </motion.div>
      )}

      {/* Optional Integrated Floating Footer Slot */}
      {footerSlot && (
        <div className="w-full relative z-20 mt-auto pt-6 flex justify-center">
          {footerSlot}
        </div>
      )}
    </div>
  );
};
