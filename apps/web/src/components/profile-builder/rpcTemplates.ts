import {
  BuilderComponentType,
  BuilderNode,
  BuilderResponsiveRule,
  BuilderStyle,
} from "./profileBuilderTypes";

export const RPC_CHILD_COMPONENT_TYPES: readonly BuilderComponentType[] = [
  "rpc-status",
  "rpc-icon",
  "rpc-title",
  "rpc-details",
  "rpc-state",
  "rpc-timestamp",
  "rpc-achievement",
  "rpc-buttons",
] as const;

export const FREE_PERMITTED_RPC_TEMPLATE_IDS = new Set([
  "rpc-tpl-default",
  "rpc-tpl-minimal",
  "rpc-tpl-compact",
]);

export function getDefaultResponsiveForRpcChild(
  type: BuilderComponentType,
  childX: number,
  childWidth: number,
  parentWidth: number
): Partial<BuilderResponsiveRule> {
  switch (type) {
    case "rpc-icon":
      return { scaleMode: "fixed", anchors: { left: true, top: true } };
    case "rpc-status":
      return { scaleMode: "anchor", anchors: { left: true, top: true } };
    case "rpc-timestamp":
      return { scaleMode: "anchor", anchors: { right: true, top: true } };
    case "rpc-title":
    case "rpc-details":
    case "rpc-state":
      return { scaleMode: "anchor", anchors: { left: true, right: true, top: true } };
    case "rpc-achievement":
      return {
        scaleMode: "anchor",
        anchors:
          childWidth >= Math.max(200, parentWidth - childX - 48)
            ? { left: true, right: true, bottom: true }
            : { left: true, bottom: true },
      };
    case "rpc-buttons":
      return { scaleMode: "anchor", anchors: { right: true, bottom: true } };
    default:
      return { scaleMode: "fixed" };
  }
}

export interface RpcTemplateChildBlueprint {
  type: BuilderComponentType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  style?: BuilderStyle;
  responsive?: Partial<BuilderResponsiveRule>;
  config?: BuilderNode["config"];
}

export interface RpcVisualTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  isGlobal: boolean;
  isOfficial?: boolean;
  isPremiumRequired: boolean;
  userId?: string | null;
  previewImage?: string;
  accentColor?: string;
  parentWidth: number;
  parentHeight: number;
  parentStyle: BuilderStyle;
  parentConfig?: Partial<BuilderNode["config"]>;
  children: RpcTemplateChildBlueprint[];
}

export const BUILTIN_RPC_TEMPLATES: RpcVisualTemplate[] = [
  {
    id: "rpc-tpl-default",
    name: "Default Rich Presence",
    category: "Standard",
    description: "Official structured Discord Rich Presence container (Free & Premium).",
    version: "1.0.0",
    isGlobal: true,
    isOfficial: true,
    isPremiumRequired: false,
    accentColor: "#ffffff",
    parentWidth: 380,
    parentHeight: 168,
    parentStyle: {
      opacity: 1,
      backgroundType: "solid",
      backgroundColor: "#111116",
      backgroundOpacity: 0.94,
      borderWidth: 1,
      borderColor: "#272730",
      borderStyle: "solid",
      borderRadius: 14,
      blur: 14,
      padding: 0,
      gap: 0,
      layoutMode: "absolute",
      overflow: "hidden",
    },
    parentConfig: {
      useLiveRpc: true,
      rpcEmptyText: "Discord is currently offline or idle",
      rpcOfflineText: "Offline · No active session",
      rpcSkinPreset: "default",
      rpcCategory: "Standard",
      accentColor: "#ffffff",
    },
    children: [
      {
        type: "rpc-status",
        name: "RPC Status",
        x: 16,
        y: 12,
        width: 220,
        height: 20,
        zIndex: 2,
        config: {
          rpcFieldBinding: "status",
          rpcDataSource: "live",
          useLiveRpc: true,
          statusIndicator: "online",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          fontWeight: 700,
          color: "#a1a1aa",
          accentColor: "#22c55e",
        },
      },
      {
        type: "rpc-timestamp",
        name: "RPC Timer",
        x: 244,
        y: 12,
        width: 120,
        height: 20,
        zIndex: 2,
        config: {
          rpcFieldBinding: "timestamp",
          rpcDataSource: "live",
          useLiveRpc: true,
          startTimestampText: "00:00 elapsed",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          fontWeight: 600,
          color: "#a1a1aa",
          textAlign: "right",
        },
      },
      {
        type: "rpc-icon",
        name: "RPC Game Icon",
        x: 16,
        y: 40,
        width: 72,
        height: 72,
        zIndex: 3,
        style: {
          opacity: 1,
          borderWidth: 1,
          borderColor: "#2a2a35",
          borderStyle: "solid",
          borderRadius: 12,
          backgroundType: "solid",
          backgroundColor: "#17171f",
        },
        config: {
          rpcFieldBinding: "largeImage",
          rpcDataSource: "live",
          useLiveRpc: true,
          rpcShowSecondaryBadge: true,
          fit: "cover",
        },
      },
      {
        type: "rpc-title",
        name: "RPC Game Title",
        x: 100,
        y: 42,
        width: 264,
        height: 24,
        zIndex: 3,
        config: {
          rpcFieldBinding: "appName",
          rpcDataSource: "live",
          useLiveRpc: true,
          appName: "Active Application",
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 15,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "left",
        },
      },
      {
        type: "rpc-details",
        name: "RPC Details",
        x: 100,
        y: 68,
        width: 264,
        height: 20,
        zIndex: 3,
        config: {
          rpcFieldBinding: "details",
          rpcDataSource: "live",
          useLiveRpc: true,
          details: "Waiting for Discord activity",
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          fontWeight: 500,
          color: "#d4d4d8",
          textAlign: "left",
        },
      },
      {
        type: "rpc-state",
        name: "RPC State & Party",
        x: 100,
        y: 90,
        width: 264,
        height: 20,
        zIndex: 3,
        config: {
          rpcFieldBinding: "state",
          rpcDataSource: "live",
          useLiveRpc: true,
          state: "Connected to Pixel.gg",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          fontWeight: 500,
          color: "#a1a1aa",
          textAlign: "left",
        },
      },
      {
        type: "rpc-achievement",
        name: "RPC Achievement / Streak",
        x: 16,
        y: 124,
        width: 164,
        height: 28,
        zIndex: 3,
        style: {
          opacity: 1,
          backgroundType: "solid",
          backgroundColor: "#17171f",
          borderWidth: 1,
          borderColor: "#292934",
          borderRadius: 8,
        },
        config: {
          rpcFieldBinding: "streak",
          rpcDataSource: "live",
          useLiveRpc: true,
          rpcIsDecorative: false,
          rpcAchievementLabel: "Synced Telemetry",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          fontWeight: 600,
          color: "#e4e4e7",
        },
      },
      {
        type: "rpc-buttons",
        name: "RPC Action Buttons",
        x: 188,
        y: 124,
        width: 176,
        height: 28,
        zIndex: 3,
        config: {
          rpcDataSource: "live",
          useLiveRpc: true,
          rpcButtons: [
            { id: "rpc-btn-1", label: "View Activity", url: "/", variant: "primary" },
          ],
        },
      },
    ],
  },
  {
    id: "rpc-tpl-minimal",
    name: "Minimal Compact",
    category: "Minimal",
    description: "Clean single-row presence card (Free & Premium).",
    version: "1.0.0",
    isGlobal: true,
    isOfficial: true,
    isPremiumRequired: false,
    accentColor: "#e4e4e7",
    parentWidth: 340,
    parentHeight: 110,
    parentStyle: {
      opacity: 1,
      backgroundType: "solid",
      backgroundColor: "#0e0e13",
      backgroundOpacity: 0.92,
      borderWidth: 1,
      borderColor: "#24242d",
      borderStyle: "solid",
      borderRadius: 12,
      blur: 10,
      padding: 0,
      gap: 0,
      layoutMode: "absolute",
      overflow: "hidden",
    },
    parentConfig: {
      useLiveRpc: true,
      rpcEmptyText: "Offline",
      rpcOfflineText: "Offline",
      rpcSkinPreset: "minimal",
      rpcCategory: "Minimal",
      accentColor: "#e4e4e7",
    },
    children: [
      {
        type: "rpc-icon",
        name: "RPC Game Icon",
        x: 14,
        y: 18,
        width: 64,
        height: 64,
        zIndex: 3,
        style: {
          opacity: 1,
          borderWidth: 1,
          borderColor: "#2a2a35",
          borderRadius: 10,
          backgroundType: "solid",
          backgroundColor: "#17171f",
        },
        config: {
          rpcFieldBinding: "largeImage",
          rpcDataSource: "live",
          useLiveRpc: true,
          rpcShowSecondaryBadge: false,
          fit: "cover",
        },
      },
      {
        type: "rpc-status",
        name: "RPC Status",
        x: 90,
        y: 14,
        width: 136,
        height: 18,
        zIndex: 2,
        config: {
          rpcFieldBinding: "status",
          rpcDataSource: "live",
          useLiveRpc: true,
          fontSize: 9,
          fontWeight: 700,
          color: "#a1a1aa",
        },
      },
      {
        type: "rpc-timestamp",
        name: "RPC Timer",
        x: 230,
        y: 14,
        width: 96,
        height: 18,
        zIndex: 2,
        config: {
          rpcFieldBinding: "timestamp",
          rpcDataSource: "live",
          useLiveRpc: true,
          fontSize: 9,
          color: "#a1a1aa",
          textAlign: "right",
        },
      },
      {
        type: "rpc-title",
        name: "RPC Game Title",
        x: 90,
        y: 34,
        width: 236,
        height: 22,
        zIndex: 3,
        config: {
          rpcFieldBinding: "appName",
          rpcDataSource: "live",
          useLiveRpc: true,
          fontSize: 14,
          fontWeight: 700,
          color: "#ffffff",
        },
      },
      {
        type: "rpc-details",
        name: "RPC Details",
        x: 90,
        y: 58,
        width: 236,
        height: 18,
        zIndex: 3,
        config: {
          rpcFieldBinding: "details",
          rpcDataSource: "live",
          useLiveRpc: true,
          fontSize: 11,
          color: "#d4d4d8",
        },
      },
      {
        type: "rpc-state",
        name: "RPC State",
        x: 90,
        y: 78,
        width: 236,
        height: 18,
        zIndex: 3,
        config: {
          rpcFieldBinding: "state",
          rpcDataSource: "live",
          useLiveRpc: true,
          fontSize: 10,
          color: "#a1a1aa",
        },
      },
    ],
  },
  {
    id: "rpc-tpl-valorant",
    name: "VALORANT Tactical Skin",
    category: "VALORANT",
    description: "Official competitive crimson HUD preset for FPS live presence (Premium).",
    version: "1.0.0",
    isGlobal: true,
    isOfficial: true,
    isPremiumRequired: true,
    accentColor: "#ff4655",
    parentWidth: 420,
    parentHeight: 184,
    parentStyle: {
      opacity: 1,
      backgroundType: "gradient",
      backgroundColor: "#1a0b10",
      backgroundGradientTo: "#0c0d13",
      backgroundGradientAngle: 135,
      backgroundOpacity: 0.96,
      borderWidth: 1,
      borderColor: "#ff4655",
      borderStyle: "solid",
      borderRadius: 12,
      blur: 16,
      shadowBlur: 24,
      shadowColor: "rgba(255, 70, 85, 0.25)",
      padding: 0,
      gap: 0,
      layoutMode: "absolute",
      overflow: "hidden",
    },
    parentConfig: {
      useLiveRpc: true,
      rpcEmptyText: "Agent offline · Not in match",
      rpcOfflineText: "Agent Offline",
      rpcSkinPreset: "valorant",
      rpcCategory: "VALORANT",
      accentColor: "#ff4655",
    },
    children: [
      {
        type: "rpc-status",
        name: "Match Status",
        x: 16,
        y: 14,
        width: 230,
        height: 20,
        zIndex: 2,
        config: {
          rpcFieldBinding: "status",
          rpcDataSource: "live",
          useLiveRpc: true,
          fontSize: 10,
          fontWeight: 700,
          color: "#fda4af",
          accentColor: "#ff4655",
        },
      },
      {
        type: "rpc-timestamp",
        name: "Match Timer",
        x: 264,
        y: 14,
        width: 140,
        height: 20,
        zIndex: 2,
        config: {
          rpcFieldBinding: "timestamp",
          rpcDataSource: "live",
          useLiveRpc: true,
          fontSize: 10,
          fontWeight: 700,
          color: "#fecdd3",
          textAlign: "right",
        },
      },
      {
        type: "rpc-icon",
        name: "Game Artwork",
        x: 16,
        y: 44,
        width: 78,
        height: 78,
        zIndex: 3,
        style: {
          opacity: 1,
          borderWidth: 1,
          borderColor: "#ff4655",
          borderRadius: 10,
          backgroundType: "solid",
          backgroundColor: "#140b0e",
        },
        config: {
          rpcFieldBinding: "largeImage",
          rpcDataSource: "live",
          useLiveRpc: true,
          rpcShowSecondaryBadge: true,
          fit: "cover",
        },
      },
      {
        type: "rpc-title",
        name: "Game Title",
        x: 108,
        y: 44,
        width: 296,
        height: 24,
        zIndex: 3,
        config: {
          rpcFieldBinding: "appName",
          rpcDataSource: "live",
          useLiveRpc: true,
          appName: "VALORANT",
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: "#ffffff",
        },
      },
      {
        type: "rpc-details",
        name: "Queue / Map Details",
        x: 108,
        y: 72,
        width: 296,
        height: 20,
        zIndex: 3,
        config: {
          rpcFieldBinding: "details",
          rpcDataSource: "live",
          useLiveRpc: true,
          details: "Competitive Queue",
          fontSize: 12,
          color: "#f4f4f5",
        },
      },
      {
        type: "rpc-state",
        name: "Party Info",
        x: 108,
        y: 96,
        width: 296,
        height: 20,
        zIndex: 3,
        config: {
          rpcFieldBinding: "state",
          rpcDataSource: "live",
          useLiveRpc: true,
          state: "In Lobby",
          fontSize: 11,
          color: "#fca5a5",
        },
      },
      {
        type: "rpc-achievement",
        name: "Synced Streak / Badge",
        x: 16,
        y: 138,
        width: 196,
        height: 30,
        zIndex: 3,
        style: {
          opacity: 1,
          backgroundType: "solid",
          backgroundColor: "#240e14",
          borderWidth: 1,
          borderColor: "#ff4655",
          borderRadius: 8,
        },
        config: {
          rpcFieldBinding: "streak",
          rpcDataSource: "live",
          useLiveRpc: true,
          rpcIsDecorative: false,
          rpcAchievementLabel: "Live Session",
          fontSize: 10,
          color: "#fecdd3",
        },
      },
      {
        type: "rpc-buttons",
        name: "Squad Actions",
        x: 222,
        y: 138,
        width: 182,
        height: 30,
        zIndex: 3,
        config: {
          rpcDataSource: "live",
          useLiveRpc: true,
          rpcButtons: [
            { id: "val-btn-1", label: "Match Profile", url: "/", variant: "primary" },
          ],
        },
      },
    ],
  },
  {
    id: "rpc-tpl-minecraft",
    name: "Minecraft Emerald Frame",
    category: "Minecraft",
    description: "Official emerald blocky world card for sandbox presence (Premium).",
    version: "1.0.0",
    isGlobal: true,
    isOfficial: true,
    isPremiumRequired: true,
    accentColor: "#22c55e",
    parentWidth: 400,
    parentHeight: 176,
    parentStyle: {
      opacity: 1,
      backgroundType: "gradient",
      backgroundColor: "#0a1710",
      backgroundGradientTo: "#0c1116",
      backgroundGradientAngle: 150,
      backgroundOpacity: 0.96,
      borderWidth: 1,
      borderColor: "#22c55e",
      borderStyle: "solid",
      borderRadius: 10,
      blur: 14,
      padding: 0,
      gap: 0,
      layoutMode: "absolute",
      overflow: "hidden",
    },
    parentConfig: {
      useLiveRpc: true,
      rpcEmptyText: "Offline · Realm Idle",
      rpcOfflineText: "Realm Offline",
      rpcSkinPreset: "minecraft",
      rpcCategory: "Minecraft",
      accentColor: "#22c55e",
    },
    children: [
      {
        type: "rpc-status",
        name: "World Status",
        x: 16,
        y: 12,
        width: 220,
        height: 20,
        zIndex: 2,
        config: {
          rpcFieldBinding: "status",
          rpcDataSource: "live",
          useLiveRpc: true,
          fontSize: 10,
          fontWeight: 700,
          color: "#86efac",
          accentColor: "#22c55e",
        },
      },
      {
        type: "rpc-timestamp",
        name: "Session Uptime",
        x: 244,
        y: 12,
        width: 140,
        height: 20,
        zIndex: 2,
        config: {
          rpcFieldBinding: "timestamp",
          rpcDataSource: "live",
          useLiveRpc: true,
          fontSize: 10,
          color: "#bbf7d0",
          textAlign: "right",
        },
      },
      {
        type: "rpc-icon",
        name: "Realm Artwork",
        x: 16,
        y: 42,
        width: 74,
        height: 74,
        zIndex: 3,
        style: {
          opacity: 1,
          borderWidth: 1,
          borderColor: "#22c55e",
          borderRadius: 8,
          backgroundType: "solid",
          backgroundColor: "#0e1d14",
        },
        config: {
          rpcFieldBinding: "largeImage",
          rpcDataSource: "live",
          useLiveRpc: true,
          rpcShowSecondaryBadge: true,
          fit: "cover",
        },
      },
      {
        type: "rpc-title",
        name: "Server / Game Title",
        x: 104,
        y: 42,
        width: 280,
        height: 24,
        zIndex: 3,
        config: {
          rpcFieldBinding: "appName",
          rpcDataSource: "live",
          useLiveRpc: true,
          appName: "Minecraft",
          fontSize: 15,
          fontWeight: 700,
          color: "#ffffff",
        },
      },
      {
        type: "rpc-details",
        name: "Biome / Mode",
        x: 104,
        y: 70,
        width: 280,
        height: 20,
        zIndex: 3,
        config: {
          rpcFieldBinding: "details",
          rpcDataSource: "live",
          useLiveRpc: true,
          details: "Survival Multiplayer",
          fontSize: 12,
          color: "#dcfce7",
        },
      },
      {
        type: "rpc-state",
        name: "Dimension / Party",
        x: 104,
        y: 94,
        width: 280,
        height: 20,
        zIndex: 3,
        config: {
          rpcFieldBinding: "state",
          rpcDataSource: "live",
          useLiveRpc: true,
          state: "Overworld",
          fontSize: 11,
          color: "#86efac",
        },
      },
      {
        type: "rpc-achievement",
        name: "Advancement Telemetry",
        x: 16,
        y: 132,
        width: 368,
        height: 28,
        zIndex: 3,
        style: {
          opacity: 1,
          backgroundType: "solid",
          backgroundColor: "#0d1f15",
          borderWidth: 1,
          borderColor: "#166534",
          borderRadius: 8,
        },
        config: {
          rpcFieldBinding: "streak",
          rpcDataSource: "live",
          useLiveRpc: true,
          rpcIsDecorative: false,
          rpcAchievementLabel: "Synced Playtime",
          fontSize: 10,
          color: "#bbf7d0",
        },
      },
    ],
  },
  {
    id: "rpc-tpl-compact",
    name: "Compact Inline Card",
    category: "Minimal",
    description: "Compact Discord presence container sized for nested profile cards (Free & Premium).",
    version: "1.0.0",
    isGlobal: true,
    isOfficial: true,
    isPremiumRequired: false,
    accentColor: "#38bdf8",
    parentWidth: 328,
    parentHeight: 94,
    parentStyle: {
      opacity: 1,
      backgroundType: "solid",
      backgroundColor: "#111116",
      backgroundOpacity: 0.94,
      borderWidth: 1,
      borderColor: "#272730",
      borderStyle: "solid",
      borderRadius: 12,
      blur: 10,
      padding: 0,
      gap: 0,
      layoutMode: "absolute",
      overflow: "hidden",
    },
    parentConfig: {
      useLiveRpc: true,
      rpcEmptyText: "No active Discord RPC session",
      rpcOfflineText: "Offline · No active session",
      rpcSkinPreset: "minimal",
      rpcCategory: "Minimal",
      accentColor: "#38bdf8",
    },
    children: [
      {
        type: "rpc-status",
        name: "RPC Status",
        x: 12,
        y: 8,
        width: 190,
        height: 16,
        zIndex: 2,
        config: {
          rpcFieldBinding: "status",
          rpcDataSource: "live",
          useLiveRpc: true,
          statusIndicator: "online",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          fontWeight: 700,
          color: "#a1a1aa",
          accentColor: "#22c55e",
        },
      },
      {
        type: "rpc-timestamp",
        name: "RPC Timer",
        x: 210,
        y: 8,
        width: 106,
        height: 16,
        zIndex: 2,
        config: {
          rpcFieldBinding: "timestamp",
          rpcDataSource: "live",
          useLiveRpc: true,
          startTimestampText: "00:00 elapsed",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          fontWeight: 600,
          color: "#a1a1aa",
          textAlign: "right",
        },
      },
      {
        type: "rpc-icon",
        name: "RPC Game Icon",
        x: 12,
        y: 30,
        width: 52,
        height: 52,
        zIndex: 3,
        style: {
          opacity: 1,
          borderWidth: 1,
          borderColor: "#2a2a35",
          borderStyle: "solid",
          borderRadius: 10,
          backgroundType: "solid",
          backgroundColor: "#181820",
        },
        config: {
          rpcFieldBinding: "largeImage",
          rpcDataSource: "live",
          useLiveRpc: true,
          rpcShowSecondaryBadge: true,
          fit: "cover",
        },
      },
      {
        type: "rpc-title",
        name: "RPC Game Title",
        x: 74,
        y: 30,
        width: 242,
        height: 18,
        zIndex: 3,
        config: {
          rpcFieldBinding: "appName",
          rpcDataSource: "live",
          useLiveRpc: true,
          appName: "Visual Studio Code",
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 12,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "left",
        },
      },
      {
        type: "rpc-details",
        name: "RPC Details",
        x: 74,
        y: 49,
        width: 242,
        height: 16,
        zIndex: 3,
        config: {
          rpcFieldBinding: "details",
          rpcDataSource: "live",
          useLiveRpc: true,
          details: "Editing pixlpresence1-web",
          fontFamily: "Inter, sans-serif",
          fontSize: 10,
          fontWeight: 500,
          color: "#d4d4d8",
          textAlign: "left",
        },
      },
      {
        type: "rpc-state",
        name: "RPC State & Party",
        x: 74,
        y: 67,
        width: 242,
        height: 16,
        zIndex: 3,
        config: {
          rpcFieldBinding: "state",
          rpcDataSource: "live",
          useLiveRpc: true,
          state: "Pixel.gg Studio",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          fontWeight: 500,
          color: "#a1a1aa",
          textAlign: "left",
        },
      },
    ],
  },
];

let uidCounter = 0;
function nextRpcUid(prefix: string): string {
  uidCounter = (uidCounter + 1) % 100000;
  return `${prefix}-${Date.now()}-${uidCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function isRpcChildType(type: BuilderComponentType): boolean {
  return type.startsWith("rpc-");
}

export function getRpcTemplateById(
  id: string | undefined,
  extraTemplates: RpcVisualTemplate[] = []
): RpcVisualTemplate {
  const found =
    extraTemplates.find((t) => t.id === id) ||
    BUILTIN_RPC_TEMPLATES.find((t) => t.id === id);
  return found || BUILTIN_RPC_TEMPLATES[0];
}

export function buildRpcEmbedSubtree(options: {
  parentId: string | null;
  x: number;
  y: number;
  zIndex: number;
  template?: RpcVisualTemplate;
  fixedParentId?: string;
  seed?: {
    appName?: string | null;
    details?: string | null;
    state?: string | null;
  };
}): { parentNode: BuilderNode; childNodes: BuilderNode[] } {
  const tpl = options.template || BUILTIN_RPC_TEMPLATES[0];
  const embedId = options.fixedParentId || nextRpcUid("node-rpc");

  const parentNode: BuilderNode = {
    id: embedId,
    type: "custom-rpc",
    name: tpl.name ? `Custom RPC (${tpl.name})` : "Custom RPC",
    parentId: options.parentId,
    x: Math.round(options.x),
    y: Math.round(options.y),
    width: tpl.parentWidth,
    height: tpl.parentHeight,
    rotation: 0,
    zIndex: options.zIndex,
    visible: true,
    locked: false,
    aspectRatioLocked: false,
    style: {
      ...JSON.parse(JSON.stringify(tpl.parentStyle)),
      layoutMode: "absolute",
      overflow: tpl.parentStyle.overflow || "hidden",
    },
    responsive: {
      hiddenOn: [],
      widthMode: "fixed",
      scaleMode: "fixed",
    },
    config: {
      ...(tpl.parentConfig ? JSON.parse(JSON.stringify(tpl.parentConfig)) : {}),
      rpcTemplateId: tpl.id,
      rpcTemplateName: tpl.name,
      rpcTemplateVersion: tpl.version,
      rpcCategory: tpl.category,
      useLiveRpc: true,
      appName: options.seed?.appName || undefined,
      details: options.seed?.details || undefined,
      state: options.seed?.state || undefined,
    },
  };

  const childNodes: BuilderNode[] = tpl.children.map((child) => ({
    id: nextRpcUid(`node-${child.type}`),
    type: child.type,
    name: child.name,
    parentId: embedId,
    x: Math.round(child.x),
    y: Math.round(child.y),
    width: Math.round(child.width),
    height: Math.round(child.height),
    rotation: 0,
    zIndex: child.zIndex,
    visible: true,
    locked: false,
    aspectRatioLocked: child.type === "rpc-icon",
    style: child.style ? JSON.parse(JSON.stringify(child.style)) : { opacity: 1 },
    responsive: {
      hiddenOn: [],
      widthMode: "fixed",
      ...getDefaultResponsiveForRpcChild(child.type, child.x, child.width, tpl.parentWidth),
      ...(child.responsive ? JSON.parse(JSON.stringify(child.responsive)) : {}),
    },
    config: child.config ? JSON.parse(JSON.stringify(child.config)) : {},
  }));

  return { parentNode, childNodes };
}

export function applyRpcTemplateToEmbedNodes(options: {
  nodes: BuilderNode[];
  embedId: string;
  template: RpcVisualTemplate;
  isPremiumOrAdmin: boolean;
}): { ok: boolean; error?: string; nextNodes?: BuilderNode[] } {
  const { nodes, embedId, template, isPremiumOrAdmin } = options;
  if (!isPremiumOrAdmin && template.isPremiumRequired) {
    return {
      ok: false,
      error: "This Rich Presence template requires Premium. Upgrade to unlock premium RPC themes.",
    };
  }

  const target = nodes.find(
    (n) => n.id === embedId && (n.type === "custom-rpc" || n.type === "custom-rpc-embed")
  );
  if (!target) {
    return { ok: false, error: "Custom RPC container not found." };
  }

  // Delete direct and nested children inside target embedId cleanly before inserting independent cloned copy
  const toRemove = new Set<string>();
  const collectDescendants = (pid: string) => {
    for (const n of nodes) {
      if (n.parentId === pid && !toRemove.has(n.id)) {
        toRemove.add(n.id);
        collectDescendants(n.id);
      }
    }
  };
  collectDescendants(embedId);

  const built = buildRpcEmbedSubtree({
    parentId: target.parentId,
    x: target.x,
    y: target.y,
    zIndex: target.zIndex,
    template,
  });

  // Preserve target node ID & container hierarchy, cloning style/size/config & creating fresh child IDs
  const outerParent = target.parentId ? nodes.find((n) => n.id === target.parentId) : null;
  let clampedParentX = target.x;
  let clampedParentY = target.y;
  let clampedParentW = built.parentNode.width;
  let clampedParentH = built.parentNode.height;
  if (outerParent) {
    clampedParentW = Math.min(clampedParentW, Math.max(120, outerParent.width));
    clampedParentH = Math.min(clampedParentH, Math.max(72, outerParent.height));
    clampedParentX = Math.max(0, Math.min(outerParent.width - clampedParentW, target.x));
    clampedParentY = Math.max(0, Math.min(outerParent.height - clampedParentH, target.y));
  }

  const updatedParent: BuilderNode = {
    ...target,
    type: "custom-rpc",
    name: template.name ? `Custom RPC (${template.name})` : target.name,
    x: Math.round(clampedParentX),
    y: Math.round(clampedParentY),
    width: Math.round(clampedParentW),
    height: Math.round(clampedParentH),
    style: built.parentNode.style,
    config: {
      ...built.parentNode.config,
      rpcTemplateId: template.id,
      rpcTemplateName: template.name,
      rpcTemplateVersion: template.version,
      rpcCategory: template.category,
    },
  };

  const reParentedChildren = built.childNodes.map((ch) => {
    const cw = Math.min(ch.width, updatedParent.width);
    const chH = Math.min(ch.height, updatedParent.height);
    const cx = Math.max(0, Math.min(updatedParent.width - cw, ch.x));
    const cy = Math.max(0, Math.min(updatedParent.height - chH, ch.y));
    return {
      ...ch,
      x: Math.round(cx),
      y: Math.round(cy),
      width: Math.round(cw),
      height: Math.round(chH),
      parentId: target.id,
    };
  });

  const retainedNodes = nodes
    .filter((n) => !toRemove.has(n.id))
    .map((n) => (n.id === embedId ? updatedParent : n));

  return {
    ok: true,
    nextNodes: [...retainedNodes, ...reParentedChildren],
  };
}

export function serializeRpcEmbedAsTemplate(options: {
  embedNode: BuilderNode;
  nodes: BuilderNode[];
  name: string;
  category: string;
  description?: string;
  isGlobal?: boolean;
  isPremiumRequired?: boolean;
}): RpcVisualTemplate {
  const { embedNode, nodes, name, category, description, isGlobal = false, isPremiumRequired = true } = options;
  const children = nodes
    .filter((n) => n.parentId === embedNode.id && n.visible !== false)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((child) => ({
      type: child.type,
      name: child.name,
      x: Math.round(child.x),
      y: Math.round(child.y),
      width: Math.round(child.width),
      height: Math.round(child.height),
      zIndex: child.zIndex,
      style: JSON.parse(JSON.stringify(child.style || {})),
      responsive: child.responsive ? JSON.parse(JSON.stringify(child.responsive)) : undefined,
      config: JSON.parse(JSON.stringify(child.config || {})),
    }));

  return {
    id: nextRpcUid("rpc-tpl"),
    name: name.trim() || "Custom RPC Theme",
    category: category.trim() || "Custom",
    description: (description || "").trim() || "Saved Custom Rich Presence Embed theme.",
    version: "1.0.0",
    isGlobal,
    isOfficial: isGlobal,
    isPremiumRequired,
    accentColor: embedNode.config.accentColor || "#ffffff",
    parentWidth: Math.round(embedNode.width),
    parentHeight: Math.round(embedNode.height),
    parentStyle: JSON.parse(JSON.stringify(embedNode.style || {})),
    parentConfig: JSON.parse(JSON.stringify(embedNode.config || {})),
    children,
  };
}

export function isNodeRestrictedRpcForFree(
  node: BuilderNode,
  nodes: BuilderNode[],
  isPremiumOrAdmin: boolean
): boolean {
  if (isPremiumOrAdmin) return false;
  if (isRpcChildType(node.type)) return true;
  let cursor = node.parentId;
  const visited = new Set<string>([node.id]);
  while (cursor) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const parent = nodes.find((n) => n.id === cursor);
    if (!parent) break;
    if (parent.type === "custom-rpc" || parent.type === "custom-rpc-embed") return true;
    cursor = parent.parentId;
  }
  return false;
}
