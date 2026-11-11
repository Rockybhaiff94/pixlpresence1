/**
 * Pixel.gg Studio: Premium Discord Rich Presence Presets & Helper Functions
 * Supports 5 curated starting layouts, independent element coordinates,
 * and data binding that seamlessly updates activity content while preserving layout.
 */

import {
  RpcCustomLayout,
  RpcLayoutElement,
  RpcPresetId,
  RpcInternalElementType,
} from "@/types/studio";
import { DiscordRpcData } from "./DiscordRpcCard";

export const DEFAULT_RPC_ELEMENTS: RpcLayoutElement[] = [
  {
    id: "rpc_el_header",
    type: "headerStatus",
    name: "Activity Type Header",
    x: 16,
    y: 14,
    width: 260,
    height: 20,
    zIndex: 2,
    visible: true,
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#ffffff",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  },
  {
    id: "rpc_el_telemetry",
    type: "telemetryBadge",
    name: "Telemetry Badge",
    x: 370,
    y: 14,
    width: 120,
    height: 20,
    zIndex: 2,
    visible: true,
    style: {
      fontSize: 9,
      fontWeight: 600,
      color: "#d4d4d8",
      backgroundColor: "#18181b",
      borderRadius: 6,
    },
  },
  {
    id: "rpc_el_artwork_large",
    type: "artworkLarge",
    name: "Game Artwork (Large)",
    x: 16,
    y: 44,
    width: 68,
    height: 68,
    zIndex: 3,
    visible: true,
    style: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#27272a",
      backgroundColor: "#18181b",
      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      imageFit: "cover",
    },
  },
  {
    id: "rpc_el_artwork_small",
    type: "artworkSmall",
    name: "Secondary Badge (Small)",
    x: 64,
    y: 92,
    width: 22,
    height: 22,
    zIndex: 4,
    visible: true,
    style: {
      borderRadius: 9999,
      borderWidth: 2,
      borderColor: "#111111",
      backgroundColor: "#18181b",
    },
  },
  {
    id: "rpc_el_title",
    type: "gameTitle",
    name: "Game / App Name",
    x: 96,
    y: 44,
    width: 380,
    height: 22,
    zIndex: 3,
    visible: true,
    style: {
      fontFamily: "Space Grotesk",
      fontSize: 14,
      fontWeight: 700,
      color: "#ffffff",
      textAlign: "left",
      letterSpacing: -0.2,
    },
  },
  {
    id: "rpc_el_details",
    type: "activityDetails",
    name: "Activity Details",
    x: 96,
    y: 68,
    width: 380,
    height: 18,
    zIndex: 3,
    visible: true,
    style: {
      fontFamily: "Inter",
      fontSize: 12,
      fontWeight: 500,
      color: "#a1a1aa",
      textAlign: "left",
    },
  },
  {
    id: "rpc_el_state",
    type: "activityState",
    name: "Activity State",
    x: 96,
    y: 88,
    width: 380,
    height: 18,
    zIndex: 3,
    visible: true,
    style: {
      fontFamily: "Inter",
      fontSize: 11,
      fontWeight: 400,
      color: "#71717a",
      textAlign: "left",
    },
  },
  {
    id: "rpc_el_party",
    type: "partyInfo",
    name: "Party / Player Info",
    x: 96,
    y: 108,
    width: 220,
    height: 16,
    zIndex: 3,
    visible: true,
    style: {
      fontFamily: "Inter",
      fontSize: 10,
      fontWeight: 500,
      color: "#71717a",
      textAlign: "left",
    },
  },
  {
    id: "rpc_el_time",
    type: "timestamps",
    name: "Elapsed Timer",
    x: 96,
    y: 126,
    width: 180,
    height: 16,
    zIndex: 3,
    visible: true,
    style: {
      fontFamily: "JetBrains Mono",
      fontSize: 11,
      fontWeight: 500,
      color: "#4ade80",
      textAlign: "left",
    },
  },
  {
    id: "rpc_el_buttons",
    type: "actionButtons",
    name: "Activity Action Buttons",
    x: 16,
    y: 148,
    width: 480,
    height: 32,
    zIndex: 3,
    visible: true,
    style: {
      borderRadius: 10,
      backgroundColor: "#18181b",
      color: "#ffffff",
    },
  },
];

export const RPC_PRESETS: Record<
  RpcPresetId,
  {
    id: RpcPresetId;
    name: string;
    description: string;
    elements: (base: RpcLayoutElement[]) => RpcLayoutElement[];
    cardStyle?: RpcCustomLayout["cardStyle"];
  }
> = {
  classic: {
    id: "classic",
    name: "Classic",
    description: "Standard Discord layout with left artwork and right-side metadata hierarchy",
    elements: (base) =>
      base.map((el) => {
        switch (el.type) {
          case "headerStatus":
            return { ...el, x: 16, y: 14, width: 260, height: 20 };
          case "telemetryBadge":
            return { ...el, x: 370, y: 14, width: 120, height: 20 };
          case "artworkLarge":
            return { ...el, x: 16, y: 44, width: 68, height: 68, style: { ...el.style, borderRadius: 14 } };
          case "artworkSmall":
            return { ...el, x: 64, y: 92, width: 22, height: 22 };
          case "gameTitle":
            return { ...el, x: 96, y: 44, width: 380, height: 22, style: { ...el.style, fontSize: 14, textAlign: "left" } };
          case "activityDetails":
            return { ...el, x: 96, y: 68, width: 380, height: 18, style: { ...el.style, fontSize: 12, textAlign: "left" } };
          case "activityState":
            return { ...el, x: 96, y: 88, width: 380, height: 18, style: { ...el.style, fontSize: 11, textAlign: "left" } };
          case "partyInfo":
            return { ...el, x: 96, y: 108, width: 220, height: 16, style: { ...el.style, fontSize: 10, textAlign: "left" } };
          case "timestamps":
            return { ...el, x: 96, y: 126, width: 180, height: 16, style: { ...el.style, fontSize: 11, textAlign: "left" } };
          case "actionButtons":
            return { ...el, x: 16, y: 148, width: 480, height: 32 };
          default:
            return el;
        }
      }),
    cardStyle: {
      borderRadius: 16,
      borderColor: "#27272a",
      backgroundColor: "rgba(17, 17, 17, 0.85)",
      backdropBlur: 14,
      padding: 16,
    },
  },

  "artwork-focus": {
    id: "artwork-focus",
    name: "Artwork Focus",
    description: "Prominent centered artwork tile with hero game title and centered status indicators",
    elements: (base) =>
      base.map((el) => {
        switch (el.type) {
          case "headerStatus":
            return { ...el, x: 20, y: 14, width: 480, height: 20, style: { ...el.style, textAlign: "center" } };
          case "telemetryBadge":
            return { ...el, x: 380, y: 14, width: 110, height: 18 };
          case "artworkLarge":
            return { ...el, x: 205, y: 42, width: 100, height: 100, style: { ...el.style, borderRadius: 20 } };
          case "artworkSmall":
            return { ...el, x: 280, y: 118, width: 26, height: 26 };
          case "gameTitle":
            return { ...el, x: 20, y: 152, width: 480, height: 24, style: { ...el.style, fontSize: 16, fontWeight: 800, textAlign: "center" } };
          case "activityDetails":
            return { ...el, x: 20, y: 178, width: 480, height: 18, style: { ...el.style, fontSize: 12, textAlign: "center" } };
          case "activityState":
            return { ...el, x: 20, y: 198, width: 480, height: 16, style: { ...el.style, fontSize: 11, textAlign: "center" } };
          case "partyInfo":
            return { ...el, x: 20, y: 216, width: 480, height: 16, style: { ...el.style, fontSize: 10, textAlign: "center" } };
          case "timestamps":
            return { ...el, x: 20, y: 234, width: 480, height: 18, style: { ...el.style, fontSize: 11, textAlign: "center", color: "#38bdf8" } };
          case "actionButtons":
            return { ...el, x: 50, y: 260, width: 420, height: 32 };
          default:
            return el;
        }
      }),
    cardStyle: {
      borderRadius: 20,
      borderColor: "#3f3f46",
      backgroundColor: "rgba(12, 12, 16, 0.9)",
      backdropBlur: 16,
      padding: 16,
    },
  },

  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Compact stream-ready pill layout with horizontal inline telemetry",
    elements: (base) =>
      base.map((el) => {
        switch (el.type) {
          case "headerStatus":
            return { ...el, x: 12, y: 10, width: 200, height: 16, style: { ...el.style, fontSize: 9 } };
          case "telemetryBadge":
            return { ...el, x: 400, y: 10, width: 90, height: 16, visible: false };
          case "artworkLarge":
            return { ...el, x: 12, y: 32, width: 48, height: 48, style: { ...el.style, borderRadius: 10 } };
          case "artworkSmall":
            return { ...el, x: 44, y: 64, width: 16, height: 16 };
          case "gameTitle":
            return { ...el, x: 68, y: 32, width: 330, height: 18, style: { ...el.style, fontSize: 13, fontWeight: 700 } };
          case "activityDetails":
            return { ...el, x: 68, y: 52, width: 330, height: 16, style: { ...el.style, fontSize: 11 } };
          case "activityState":
            return { ...el, x: 68, y: 70, width: 330, height: 14, style: { ...el.style, fontSize: 10 } };
          case "partyInfo":
            return { ...el, x: 68, y: 86, width: 200, height: 14, style: { ...el.style, fontSize: 9 } };
          case "timestamps":
            return { ...el, x: 390, y: 32, width: 110, height: 16, style: { ...el.style, fontSize: 10, textAlign: "right" } };
          case "actionButtons":
            return { ...el, x: 12, y: 104, width: 488, height: 28 };
          default:
            return el;
        }
      }),
    cardStyle: {
      borderRadius: 12,
      borderColor: "#26262b",
      backgroundColor: "#0d0d10",
      padding: 12,
    },
  },

  editorial: {
    id: "editorial",
    name: "Editorial",
    description: "Magazine typography header with right-anchored artwork and metadata column",
    elements: (base) =>
      base.map((el) => {
        switch (el.type) {
          case "headerStatus":
            return { ...el, x: 16, y: 16, width: 240, height: 18, style: { ...el.style, color: "#ec4899", fontSize: 10 } };
          case "telemetryBadge":
            return { ...el, x: 260, y: 16, width: 110, height: 18 };
          case "gameTitle":
            return { ...el, x: 16, y: 38, width: 350, height: 32, style: { ...el.style, fontSize: 20, fontWeight: 900, letterSpacing: -0.5 } };
          case "activityDetails":
            return { ...el, x: 16, y: 74, width: 350, height: 20, style: { ...el.style, fontSize: 12, color: "#e4e4e7" } };
          case "activityState":
            return { ...el, x: 16, y: 96, width: 350, height: 18, style: { ...el.style, fontSize: 11, color: "#a1a1aa" } };
          case "timestamps":
            return { ...el, x: 16, y: 118, width: 180, height: 18, style: { ...el.style, fontSize: 11, color: "#38bdf8" } };
          case "partyInfo":
            return { ...el, x: 200, y: 118, width: 160, height: 18, style: { ...el.style, fontSize: 10 } };
          case "artworkLarge":
            return { ...el, x: 380, y: 24, width: 110, height: 110, style: { ...el.style, borderRadius: 16 } };
          case "artworkSmall":
            return { ...el, x: 466, y: 110, width: 24, height: 24 };
          case "actionButtons":
            return { ...el, x: 16, y: 148, width: 480, height: 32 };
          default:
            return el;
        }
      }),
    cardStyle: {
      borderRadius: 18,
      borderColor: "#3f3f46",
      backgroundColor: "rgba(15, 15, 20, 0.95)",
      padding: 16,
    },
  },

  "cyber-neon": {
    id: "cyber-neon",
    name: "Cyber Neon",
    description: "Futuristic neon glowing borders, monospace typography, and cyan/magenta telemetry",
    elements: (base) =>
      base.map((el) => {
        switch (el.type) {
          case "headerStatus":
            return { ...el, x: 16, y: 14, width: 260, height: 18, style: { ...el.style, color: "#22d3ee", fontFamily: "JetBrains Mono" } };
          case "telemetryBadge":
            return { ...el, x: 370, y: 14, width: 120, height: 18, style: { ...el.style, color: "#f43f5e", backgroundColor: "rgba(244, 63, 94, 0.1)" } };
          case "artworkLarge":
            return {
              ...el,
              x: 16,
              y: 40,
              width: 72,
              height: 72,
              style: {
                ...el.style,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: "#22d3ee",
                boxShadow: "0 0 16px rgba(34, 211, 238, 0.45)",
              },
            };
          case "artworkSmall":
            return { ...el, x: 68, y: 92, width: 22, height: 22, style: { ...el.style, borderWidth: 1, borderColor: "#f43f5e" } };
          case "gameTitle":
            return { ...el, x: 102, y: 40, width: 380, height: 24, style: { ...el.style, fontSize: 14, fontWeight: 800, color: "#ffffff", fontFamily: "JetBrains Mono" } };
          case "activityDetails":
            return { ...el, x: 102, y: 66, width: 380, height: 18, style: { ...el.style, fontSize: 11, color: "#22d3ee", fontFamily: "JetBrains Mono" } };
          case "activityState":
            return { ...el, x: 102, y: 86, width: 380, height: 18, style: { ...el.style, fontSize: 10, color: "#a1a1aa", fontFamily: "JetBrains Mono" } };
          case "partyInfo":
            return { ...el, x: 102, y: 106, width: 180, height: 16, style: { ...el.style, fontSize: 9, color: "#71717a", fontFamily: "JetBrains Mono" } };
          case "timestamps":
            return { ...el, x: 102, y: 124, width: 180, height: 16, style: { ...el.style, fontSize: 10, color: "#4ade80", fontFamily: "JetBrains Mono" } };
          case "actionButtons":
            return { ...el, x: 16, y: 148, width: 480, height: 32 };
          default:
            return el;
        }
      }),
    cardStyle: {
      borderRadius: 14,
      borderColor: "#22d3ee",
      borderWidth: 1,
      backgroundColor: "rgba(9, 6, 16, 0.95)",
      boxShadow: "0 0 20px rgba(34, 211, 238, 0.25)",
      padding: 16,
    },
  },

  custom: {
    id: "custom",
    name: "Custom",
    description: "Fully user-defined layout with unrestricted manual positioning and sizing",
    elements: (base) => base,
  },
};

export function createDefaultRpcLayout(): RpcCustomLayout {
  return {
    enabled: true,
    preset: "classic",
    cardStyle: {
      borderRadius: 16,
      borderColor: "#27272a",
      backgroundColor: "rgba(17, 17, 17, 0.85)",
      padding: 16,
    },
    elements: DEFAULT_RPC_ELEMENTS.map((el) => ({ ...el })),
  };
}

export function applyRpcPreset(
  presetId: RpcPresetId,
  current?: RpcCustomLayout | null
): RpcCustomLayout {
  const base = current?.elements && current.elements.length > 0 ? current.elements : DEFAULT_RPC_ELEMENTS;
  const presetDef = RPC_PRESETS[presetId] || RPC_PRESETS.classic;
  const transformed = presetDef.elements(base);

  return {
    enabled: true,
    preset: presetId,
    cardStyle: {
      ...(current?.cardStyle || {}),
      ...(presetDef.cardStyle || {}),
    },
    elements: transformed,
  };
}

/**
 * Resolves element display text, taking presentation overrides into account
 * while keeping live Discord data cleanly bound.
 */
export function resolveRpcElementText(
  el: RpcLayoutElement,
  data?: DiscordRpcData | null
): string {
  // If user has defined a presentation override, use it!
  if (el.props?.presentationOverride && el.props.presentationOverride.trim()) {
    return el.props.presentationOverride.trim();
  }

  // Fallback to live Discord activity data
  switch (el.type) {
    case "gameTitle":
      return data?.appName || data?.name || "Active Discord Application";
    case "activityDetails":
      return data?.details || "Designing Nothing OS Presence";
    case "activityState":
      return data?.state || "Pixel.gg Studio Engine";
    case "partyInfo":
      if (data?.party?.size) {
        return `Party (${data.party.size[0]} of ${data.party.size[1]})`;
      }
      if (data?.partySize && data?.partyMax) {
        return `Party (${data.partySize} of ${data.partyMax})`;
      }
      return "";
    case "headerStatus": {
      const rawType = data?.type ?? data?.activityType ?? 0;
      const numType =
        typeof rawType === "number"
          ? rawType
          : rawType === "streaming"
          ? 1
          : rawType === "listening"
          ? 2
          : rawType === "watching"
          ? 3
          : rawType === "competing"
          ? 5
          : 0;
      return numType === 1
        ? "STREAMING LIVE"
        : numType === 2
        ? "LISTENING TO SPOTIFY"
        : numType === 3
        ? "WATCHING"
        : numType === 5
        ? "COMPETING"
        : "PLAYING A GAME";
    }
    default:
      return "";
  }
}

/**
 * Checks whether an element has valid source data or presentation override,
 * handling missing fields gracefully without displaying fake data.
 */
export function isRpcElementDataAvailable(
  el: RpcLayoutElement,
  data?: DiscordRpcData | null
): boolean {
  if (el.visible === false) return false;
  if (el.props?.presentationOverride) return true;

  switch (el.type) {
    case "partyInfo":
      return Boolean(data?.party?.size || (data?.partySize && data?.partyMax));
    case "activityDetails":
      return Boolean(data?.details);
    case "activityState":
      return Boolean(data?.state);
    case "artworkSmall":
      return Boolean(data?.smallImage);
    case "artworkLarge":
      return true; // Always renders either image or fallback badge
    default:
      return true;
  }
}

