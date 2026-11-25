import {
  BuilderCanvasSettings,
  BuilderComponentType,
  BuilderNode,
  ProfileBuilderDocument,
} from "./profileBuilderTypes";

export const MAX_NESTING_DEPTH = 4;

export const CONTAINER_COMPONENT_TYPES: ReadonlySet<BuilderComponentType> = new Set([
  "embed",
  "nested-embed",
  "image-gallery",
  "group-section",
]);

export function isContainerType(type: BuilderComponentType): boolean {
  return CONTAINER_COMPONENT_TYPES.has(type);
}

export type RegistryCategoryId = "profile" | "layout" | "advanced";

export interface ComponentRegistryEntry {
  type: BuilderComponentType;
  category: RegistryCategoryId;
  label: string;
  shortDesc: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  canHaveChildren: boolean;
  allowInRoot?: boolean;
  preferEmbedParent?: boolean;
}

export const REGISTRY_CATEGORIES: Array<{
  id: RegistryCategoryId;
  label: string;
}> = [
  { id: "profile", label: "Profile Components" },
  { id: "layout", label: "Layout & Content" },
  { id: "advanced", label: "Advanced" },
];

export const PROFILE_BUILDER_REGISTRY: Record<BuilderComponentType, ComponentRegistryEntry> = {
  "profile-image": {
    type: "profile-image",
    category: "profile",
    label: "Profile Image",
    shortDesc: "Avatar with circle, rounded, or square frame",
    defaultWidth: 88,
    defaultHeight: 88,
    minWidth: 36,
    minHeight: 36,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  "name-text": {
    type: "name-text",
    category: "profile",
    label: "Name Text",
    shortDesc: "Primary display name & verified glyph",
    defaultWidth: 260,
    defaultHeight: 34,
    minWidth: 80,
    minHeight: 24,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  subtitle: {
    type: "subtitle",
    category: "profile",
    label: "Subtitle / Tagline",
    shortDesc: "Handle, pronouns, and active status badge",
    defaultWidth: 320,
    defaultHeight: 24,
    minWidth: 80,
    minHeight: 20,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  description: {
    type: "description",
    category: "profile",
    label: "Description",
    shortDesc: "Multiline profile bio & notes",
    defaultWidth: 420,
    defaultHeight: 50,
    minWidth: 100,
    minHeight: 28,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  "badges-group": {
    type: "badges-group",
    category: "profile",
    label: "Badges",
    shortDesc: "Editable Creator, Premium & Dev badges",
    defaultWidth: 340,
    defaultHeight: 34,
    minWidth: 90,
    minHeight: 26,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  "social-group": {
    type: "social-group",
    category: "profile",
    label: "Social Media",
    shortDesc: "Configurable platform links & handles",
    defaultWidth: 440,
    defaultHeight: 44,
    minWidth: 100,
    minHeight: 32,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  "music-display": {
    type: "music-display",
    category: "profile",
    label: "Music Display",
    shortDesc: "Track card with artwork, artist & progress",
    defaultWidth: 324,
    defaultHeight: 92,
    minWidth: 180,
    minHeight: 68,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  "custom-rpc": {
    type: "custom-rpc",
    category: "profile",
    label: "Custom RPC",
    shortDesc: "Discord Rich Presence activity display",
    defaultWidth: 324,
    defaultHeight: 92,
    minWidth: 180,
    minHeight: 68,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  embed: {
    type: "embed",
    category: "layout",
    label: "Embed (Container)",
    shortDesc: "Independent foreground profile card",
    defaultWidth: 720,
    defaultHeight: 420,
    minWidth: 240,
    minHeight: 160,
    canHaveChildren: true,
    allowInRoot: true,
    preferEmbedParent: false,
  },
  "nested-embed": {
    type: "nested-embed",
    category: "layout",
    label: "Nested Embed",
    shortDesc: "Child container inside another embed",
    defaultWidth: 300,
    defaultHeight: 110,
    minWidth: 140,
    minHeight: 72,
    canHaveChildren: true,
    preferEmbedParent: true,
  },
  "banner-image": {
    type: "banner-image",
    category: "layout",
    label: "Banner Image",
    shortDesc: "Wide header cover inside an embed",
    defaultWidth: 672,
    defaultHeight: 112,
    minWidth: 120,
    minHeight: 48,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  image: {
    type: "image",
    category: "layout",
    label: "Image",
    shortDesc: "Standalone image or gallery tile",
    defaultWidth: 180,
    defaultHeight: 120,
    minWidth: 40,
    minHeight: 40,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  "image-gallery": {
    type: "image-gallery",
    category: "layout",
    label: "Image Gallery",
    shortDesc: "Multi-image responsive gallery container",
    defaultWidth: 672,
    defaultHeight: 96,
    minWidth: 180,
    minHeight: 64,
    canHaveChildren: true,
    preferEmbedParent: true,
  },
  separator: {
    type: "separator",
    category: "layout",
    label: "Separator",
    shortDesc: "Horizontal visual divider rule",
    defaultWidth: 672,
    defaultHeight: 14,
    minWidth: 60,
    minHeight: 8,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  "group-section": {
    type: "group-section",
    category: "layout",
    label: "Group / Section",
    shortDesc: "Structured grouping container",
    defaultWidth: 320,
    defaultHeight: 120,
    minWidth: 100,
    minHeight: 50,
    canHaveChildren: true,
    preferEmbedParent: true,
  },
  background: {
    type: "background",
    category: "advanced",
    label: "Background",
    shortDesc: "Canvas background media layer",
    defaultWidth: 1920,
    defaultHeight: 1080,
    minWidth: 320,
    minHeight: 200,
    canHaveChildren: false,
    allowInRoot: true,
    preferEmbedParent: false,
  },
  "custom-component": {
    type: "custom-component",
    category: "advanced",
    label: "Custom Components",
    shortDesc: "Configurable monochrome status widget",
    defaultWidth: 260,
    defaultHeight: 72,
    minWidth: 120,
    minHeight: 48,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
  shape: {
    type: "shape",
    category: "advanced",
    label: "Shape",
    shortDesc: "Vector geometry overlay",
    defaultWidth: 120,
    defaultHeight: 120,
    minWidth: 24,
    minHeight: 20,
    canHaveChildren: false,
    allowInRoot: true,
    preferEmbedParent: false,
  },
  sticker: {
    type: "sticker",
    category: "advanced",
    label: "Glyph Icon",
    shortDesc: "Monochrome emblem glyph",
    defaultWidth: 56,
    defaultHeight: 56,
    minWidth: 24,
    minHeight: 24,
    canHaveChildren: false,
    preferEmbedParent: true,
  },
};

export const LIBRARY_CATALOG_ORDER: BuilderComponentType[] = [
  "profile-image",
  "name-text",
  "subtitle",
  "description",
  "badges-group",
  "social-group",
  "music-display",
  "custom-rpc",
  "embed",
  "nested-embed",
  "banner-image",
  "image",
  "image-gallery",
  "separator",
  "group-section",
  "background",
  "custom-component",
];

let nodeUidCounter = 0;
export function createBuilderId(prefix: string): string {
  nodeUidCounter = (nodeUidCounter + 1) % 100000;
  return `${prefix}-${Date.now()}-${nodeUidCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function sanitizeExternalUrl(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:text/html") || lower.startsWith("vbscript:")) {
    return "";
  }
  if (lower.startsWith("https://") || lower.startsWith("http://") || lower.startsWith("mailto:") || trimmed.startsWith("/")) {
    return trimmed;
  }
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return "";
}

export function isValidUrlOrEmpty(raw: string | undefined | null): boolean {
  if (!raw || !raw.trim()) return true;
  if (raw.trim() === "#") return true;
  return Boolean(sanitizeExternalUrl(raw));
}

export function getNestingDepth(nodeId: string | null, nodes: BuilderNode[]): number {
  let depth = 0;
  let currentId = nodeId;
  const visited = new Set<string>();
  while (currentId) {
    if (visited.has(currentId)) return MAX_NESTING_DEPTH + 1;
    visited.add(currentId);
    const parent = nodes.find((n) => n.id === currentId);
    if (!parent) break;
    depth += 1;
    currentId = parent.parentId;
  }
  return depth;
}

export function wouldCreateCycle(
  draggedId: string,
  targetParentId: string | null,
  nodes: BuilderNode[]
): boolean {
  if (!targetParentId) return false;
  if (draggedId === targetParentId) return true;
  let cursor: string | null = targetParentId;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === draggedId) return true;
    if (visited.has(cursor)) return true;
    visited.add(cursor);
    const found = nodes.find((n) => n.id === cursor);
    cursor = found ? found.parentId : null;
  }
  return false;
}

export function getAbsoluteNodeRect(
  node: BuilderNode,
  nodes: BuilderNode[]
): { x: number; y: number; width: number; height: number } {
  let x = node.x;
  let y = node.y;
  let cursor = node.parentId;
  const visited = new Set<string>([node.id]);
  while (cursor) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const parent = nodes.find((n) => n.id === cursor);
    if (!parent) break;
    x += parent.x;
    y += parent.y;
    cursor = parent.parentId;
  }
  return { x, y, width: node.width, height: node.height };
}

export function hexToRgbaSafe(hex: string | undefined, alpha = 1): string {
  const safe = (hex || "#0c0c10").trim();
  if (!safe.startsWith("#")) return safe;
  let clean = safe.slice(1);
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (clean.length !== 6) return safe;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return safe;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function createNodeFromRegistry(
  type: BuilderComponentType,
  options: {
    parentId: string | null;
    nodes: BuilderNode[];
    canvas: BuilderCanvasSettings;
    x?: number;
    y?: number;
    seed?: {
      displayName?: string | null;
      username?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
      bannerUrl?: string | null;
      appName?: string | null;
      details?: string | null;
      state?: string | null;
    };
  }
): BuilderNode {
  const meta = PROFILE_BUILDER_REGISTRY[type];
  const { parentId, nodes, canvas, seed } = options;
  const parent = parentId ? nodes.find((n) => n.id === parentId) : null;
  const siblings = nodes.filter((n) => (n.parentId || null) === (parentId || null));
  const nextZ = siblings.reduce((m, s) => Math.max(m, s.zIndex), 0) + 1;

  const containerW = parent ? parent.width : canvas.width;
  const containerH = parent ? parent.height : canvas.height;
  const padding = parent ? parent.style.padding ?? 24 : 40;
  const width = Math.min(meta.defaultWidth, Math.max(meta.minWidth, containerW - padding * 2));
  const height = meta.defaultHeight;

  let x = options.x;
  let y = options.y;
  if (x === undefined || y === undefined) {
    if (!parent && type === "embed") {
      x = Math.round((canvas.width - width) / 2 + (siblings.length % 4) * 28);
      y = Math.round((canvas.height - height) / 2 + (siblings.length % 4) * 28);
    } else if (!parent && type === "background") {
      x = 0;
      y = 0;
    } else if (parent?.type === "image-gallery") {
      const idx = siblings.length;
      const cols = parent.config.galleryColumns ?? 3;
      const gap = parent.config.gallerySpacing ?? 10;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cellW = Math.max(60, Math.floor((parent.width - gap * (cols - 1)) / cols));
      x = col * (cellW + gap);
      y = row * (86 + gap);
    } else {
      const lastSiblingBottom = siblings.reduce((m, s) => Math.max(m, s.y + s.height), padding - 8);
      x = Math.max(padding, 24);
      y = Math.min(Math.max(padding, lastSiblingBottom + 10), Math.max(padding, containerH - height - 16));
    }
  }

  const base: BuilderNode = {
    id: createBuilderId(type),
    type,
    name: siblings.length > 0 && type === "image" ? `Image ${siblings.length + 1}` : meta.label,
    parentId,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(
      parent?.type === "image-gallery" && type === "image"
        ? Math.max(
            60,
            Math.floor(
              (parent.width - (parent.config.gallerySpacing ?? 10) * ((parent.config.galleryColumns ?? 3) - 1)) /
                (parent.config.galleryColumns ?? 3)
            )
          )
        : width
    ),
    height: parent?.type === "image-gallery" && type === "image" ? 84 : height,
    rotation: 0,
    zIndex: nextZ,
    visible: true,
    locked: false,
    aspectRatioLocked: type === "profile-image",
    style: {
      opacity: 1,
      backgroundType: type === "embed" || type === "nested-embed" ? "solid" : "transparent",
      backgroundColor:
        type === "embed"
          ? "#0d0d11"
          : type === "nested-embed"
            ? "#131318"
            : type === "group-section"
              ? "#121216"
              : "transparent",
      backgroundOpacity: type === "embed" ? 0.92 : type === "nested-embed" ? 0.9 : 1,
      borderWidth: type === "embed" || type === "nested-embed" || type === "group-section" ? 1 : 0,
      borderColor: type === "embed" ? "#282830" : "#262630",
      borderStyle: "solid",
      borderRadius: type === "embed" ? 16 : type === "nested-embed" ? 12 : type === "image" ? 10 : 8,
      blur: type === "embed" ? 16 : 0,
      padding: type === "embed" ? 24 : type === "nested-embed" ? 14 : 0,
      gap: type === "embed" ? 16 : 10,
      layoutMode: "absolute",
      alignItems: "start",
      justifyContent: "start",
      overflow: type === "embed" || type === "image-gallery" ? "hidden" : "visible",
    },
    responsive: {
      hiddenOn: [],
      widthMode: "fixed",
      ...(type === "image-gallery" ? { galleryColumns: { desktop: 3, tablet: 2, mobile: 1 } } : {}),
    },
    config: {},
  };

  switch (type) {
    case "banner-image":
      base.config = {
        src:
          seed?.bannerUrl ||
          "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80",
        fit: "cover",
        objectPosition: "center",
      };
      base.style.borderRadius = 12;
      break;
    case "profile-image":
      base.config = {
        src:
          seed?.avatarUrl ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
        fit: "cover",
        avatarShape: "rounded",
        objectPosition: "center",
        showStatusDot: true,
        statusColor: "#22c55e",
      };
      base.style.borderWidth = 2;
      base.style.borderColor = "#3f3f46";
      base.style.borderRadius = 14;
      break;
    case "name-text":
      base.config = {
        text: seed?.displayName || "PIXEL USER",
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: 22,
        fontWeight: 700,
        color: "#ffffff",
        textAlign: "left",
        letterSpacing: 0.4,
        lineHeight: 1.15,
        showVerifiedBadge: true,
      };
      break;
    case "subtitle":
      base.config = {
        text: `@${seed?.username || "pixeluser"} · He/Him`,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 12,
        fontWeight: 500,
        color: "#a1a1aa",
        textAlign: "left",
        letterSpacing: 0.2,
        lineHeight: 1.3,
        statusPillText: "SYS.ACTIVE",
        statusPillActive: true,
      };
      break;
    case "badges-group":
      base.config = {
        badges: [
          {
            id: createBuilderId("bdg"),
            label: "Creator",
            icon: "crown",
            color: "#fca5a5",
            backgroundColor: "#291417",
            borderColor: "#7f1d1d",
            borderRadius: 6,
            tooltip: "Verified Studio Creator",
            visible: true,
          },
          {
            id: createBuilderId("bdg"),
            label: "Premium",
            icon: "premium",
            color: "#e4e4e7",
            backgroundColor: "#18181f",
            borderColor: "#32323d",
            borderRadius: 6,
            tooltip: "Pixel.gg Studio Pro",
            visible: true,
          },
          {
            id: createBuilderId("bdg"),
            label: "Dev",
            icon: "dev",
            color: "#d4d4d8",
            backgroundColor: "#141419",
            borderColor: "#2b2b34",
            borderRadius: 6,
            tooltip: "System Developer",
            visible: true,
          },
        ],
      };
      break;
    case "description":
      base.config = {
        text:
          seed?.bio ||
          "Building digital experiences with Pixel.gg -- Profiles, RPC, and more.",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 12,
        fontWeight: 400,
        color: "#d4d4d8",
        textAlign: "left",
        lineHeight: 1.45,
        overflowBehavior: "wrap",
      };
      break;
    case "separator":
      base.config = {
        separatorThickness: 1,
        separatorColor: "#272730",
        separatorStyle: "solid",
      };
      break;
    case "music-display":
      base.config = {
        musicPlatform: "Spotify",
        trackName: "After Dark",
        artist: "Mr.Kitty",
        artworkUrl:
          "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80",
        progressPercent: 52,
        elapsedText: "2:14",
        durationText: "4:26",
        isPlaying: true,
        useLiveActivity: false,
        musicEmptyText: "No audio currently playing",
        accentColor: "#22c55e",
      };
      base.style.backgroundType = "solid";
      base.style.backgroundColor = "#111116";
      base.style.borderWidth = 1;
      base.style.borderColor = "#24242d";
      base.style.borderRadius = 12;
      break;
    case "custom-rpc":
      base.config = {
        appName: seed?.appName || "Visual Studio Code",
        details: seed?.details || "Editing pixlpresence1-web",
        state: seed?.state || "Workspace · Pixel.gg",
        statusIndicator: "online",
        largeImage:
          "https://pixlpresence1-web.vercel.app/server-icon.png",
        startTimestampText: "01:42 elapsed",
        useLiveRpc: true,
        rpcEmptyText: "No active Discord RPC session",
        accentColor: "#d71920",
      };
      base.style.backgroundType = "solid";
      base.style.backgroundColor = "#111116";
      base.style.borderWidth = 1;
      base.style.borderColor = "#24242d";
      base.style.borderRadius = 12;
      break;
    case "social-group":
      base.config = {
        socialItems: [
          { id: createBuilderId("soc"), platform: "discord", url: "https://discord.gg/pixelgg", label: "Discord", tooltip: "Discord Server", visible: true, style: "pill" },
          { id: createBuilderId("soc"), platform: "youtube", url: "https://youtube.com", label: "YouTube", tooltip: "YouTube Channel", visible: true, style: "pill" },
          { id: createBuilderId("soc"), platform: "github", url: "https://github.com", label: "GitHub", tooltip: "GitHub Repositories", visible: true, style: "pill" },
          { id: createBuilderId("soc"), platform: "x", url: "https://x.com", label: "X", tooltip: "X / Twitter", visible: true, style: "pill" },
          { id: createBuilderId("soc"), platform: "instagram", url: "https://instagram.com", label: "Instagram", tooltip: "Instagram", visible: true, style: "pill" },
        ],
      };
      break;
    case "image-gallery":
      base.config = {
        galleryColumns: 3,
        gallerySpacing: 10,
        galleryImageFit: "cover",
        galleryImageRadius: 8,
        galleryMaxImages: 12,
      };
      break;
    case "image":
      base.config = {
        src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80",
        fit: "cover",
        objectPosition: "center",
      };
      break;
    case "background":
      base.name = "Background (Image)";
      base.config = {
        bgType: "image",
        bgColor: "#060608",
        bgGradientTo: "#18181f",
        bgGradientAngle: 135,
        bgImageUrl:
          "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&q=80",
        bgSize: "cover",
        bgPosition: "center",
        bgOverlayOpacity: 0.35,
      };
      base.style.opacity = 1;
      break;
    case "custom-component":
      base.config = {
        customTitle: "SYSTEM TELEMETRY",
        customSubtitle: "PIXEL.GG ENGINE V2.5",
        customBadge: "LIVE",
        accentColor: "#d71920",
      };
      base.style.backgroundType = "solid";
      base.style.backgroundColor = "#121217";
      base.style.borderWidth = 1;
      base.style.borderColor = "#262630";
      base.style.borderRadius = 10;
      break;
    case "shape":
      base.config = {
        shapeKind: "rounded-rectangle",
        shapeFill: "#1a1a22",
        shapeStroke: "#ffffff",
        shapeStrokeWidth: 1,
      };
      break;
    case "sticker":
      base.config = {
        stickerKey: "sparkles",
        color: "#ffffff",
      };
      break;
    default:
      break;
  }

  return base;
}

export function createDefaultReferenceDocument(seed?: {
  displayName?: string | null;
  username?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}): ProfileBuilderDocument {
  const canvas: BuilderCanvasSettings = {
    width: 1920,
    height: 1080,
    backgroundType: "image",
    backgroundColor: "#060608",
    backgroundGradientTo: "#16161d",
    backgroundGradientAngle: 135,
    backgroundImage:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&q=80",
    backgroundVideo: "",
    backgroundPosition: "center center",
    backgroundSize: "cover",
    backgroundOpacity: 1,
    backgroundBlur: 0,
    overlayColor: "#000000",
    overlayOpacity: 0.35,
    gridEnabled: false,
    gridSize: 16,
    snapEnabled: true,
    snapSensitivity: 6,
    smartGuidesEnabled: true,
  };

  const embedId = "embed-profile-root";
  const galleryId = "gallery-profile-main";

  const nodes: BuilderNode[] = [
    {
      id: "canvas-bg-layer",
      type: "background",
      name: "Background (Image)",
      parentId: null,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      zIndex: 1,
      visible: true,
      locked: false,
      style: { opacity: 1 },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        bgType: "image",
        bgColor: "#060608",
        bgImageUrl: canvas.backgroundImage,
        bgSize: "cover",
        bgPosition: "center",
        bgOverlayOpacity: 0.35,
      },
    },
    {
      id: embedId,
      type: "embed",
      name: "Embed (Profile)",
      parentId: null,
      x: 600,
      y: 230,
      width: 720,
      height: 610,
      rotation: 0,
      zIndex: 2,
      visible: true,
      locked: false,
      aspectRatioLocked: false,
      style: {
        backgroundType: "solid",
        backgroundColor: "#0b0b0e",
        backgroundOpacity: 0.92,
        borderWidth: 1,
        borderColor: "#2c2c35",
        borderStyle: "solid",
        borderRadius: 16,
        blur: 18,
        shadowBlur: 36,
        shadowColor: "rgba(0, 0, 0, 0.72)",
        shadowOffsetX: 0,
        shadowOffsetY: 16,
        opacity: 1,
        padding: 24,
        gap: 16,
        layoutMode: "absolute",
        overflow: "hidden",
      },
      responsive: { hiddenOn: [], widthMode: "fixed", maxWidth: 720 },
      config: {},
    },
    {
      id: "node-banner-1",
      type: "banner-image",
      name: "Banner Image",
      parentId: embedId,
      x: 16,
      y: 16,
      width: 688,
      height: 112,
      zIndex: 1,
      visible: true,
      locked: false,
      style: { opacity: 1, borderRadius: 12, borderWidth: 1, borderColor: "#24242c" },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        src:
          seed?.bannerUrl ||
          "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80",
        fit: "cover",
        objectPosition: "center",
      },
    },
    {
      id: "node-avatar-1",
      type: "profile-image",
      name: "Profile Image",
      parentId: embedId,
      x: 34,
      y: 100,
      width: 96,
      height: 96,
      zIndex: 2,
      visible: true,
      locked: false,
      aspectRatioLocked: true,
      style: {
        opacity: 1,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#52525b",
        shadowBlur: 18,
        shadowColor: "rgba(0,0,0,0.65)",
      },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        src:
          seed?.avatarUrl ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
        fit: "cover",
        avatarShape: "rounded",
        objectPosition: "center",
        showStatusDot: true,
        statusColor: "#22c55e",
      },
    },
    {
      id: "node-name-1",
      type: "name-text",
      name: "Name Text",
      parentId: embedId,
      x: 148,
      y: 138,
      width: 280,
      height: 32,
      zIndex: 3,
      visible: true,
      locked: false,
      style: { opacity: 1 },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        text: seed?.displayName || "PIXEL USER",
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: 22,
        fontWeight: 700,
        color: "#ffffff",
        textAlign: "left",
        letterSpacing: 0.5,
        lineHeight: 1.15,
        showVerifiedBadge: true,
      },
    },
    {
      id: "node-subtitle-1",
      type: "subtitle",
      name: "Subtitle",
      parentId: embedId,
      x: 148,
      y: 170,
      width: 536,
      height: 24,
      zIndex: 4,
      visible: true,
      locked: false,
      style: { opacity: 1 },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        text: `@${seed?.username || "pixeluser"} · He/Him`,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 12,
        fontWeight: 500,
        color: "#a1a1aa",
        textAlign: "left",
        letterSpacing: 0.2,
        lineHeight: 1.3,
        statusPillText: "SYS.ACTIVE",
        statusPillActive: true,
      },
    },
    {
      id: "node-badges-1",
      type: "badges-group",
      name: "Badges (Group)",
      parentId: embedId,
      x: 148,
      y: 202,
      width: 340,
      height: 32,
      zIndex: 5,
      visible: true,
      locked: false,
      style: { opacity: 1 },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        badges: [
          {
            id: "bdg-creator",
            label: "Creator",
            icon: "crown",
            color: "#fca5a5",
            backgroundColor: "#2a1215",
            borderColor: "#7f1d1d",
            borderRadius: 6,
            tooltip: "Verified Studio Creator",
            visible: true,
          },
          {
            id: "bdg-premium",
            label: "Premium",
            icon: "premium",
            color: "#e4e4e7",
            backgroundColor: "#17171d",
            borderColor: "#32323d",
            borderRadius: 6,
            tooltip: "Pixel.gg Pro Member",
            visible: true,
          },
          {
            id: "bdg-dev",
            label: "</> Dev",
            icon: "dev",
            color: "#d4d4d8",
            backgroundColor: "#141418",
            borderColor: "#2a2a33",
            borderRadius: 6,
            tooltip: "Developer",
            visible: true,
          },
        ],
      },
    },
    {
      id: "node-desc-1",
      type: "description",
      name: "Description",
      parentId: embedId,
      x: 148,
      y: 242,
      width: 536,
      height: 44,
      zIndex: 6,
      visible: true,
      locked: false,
      style: { opacity: 1 },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        text:
          seed?.bio ||
          "Building digital experiences with Pixel.gg -- Profiles, RPC, and more.",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 12,
        fontWeight: 400,
        color: "#d4d4d8",
        textAlign: "left",
        lineHeight: 1.45,
        overflowBehavior: "wrap",
      },
    },
    {
      id: "node-sep-1",
      type: "separator",
      name: "Separator",
      parentId: embedId,
      x: 24,
      y: 292,
      width: 672,
      height: 10,
      zIndex: 7,
      visible: true,
      locked: false,
      style: { opacity: 0.8 },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        separatorThickness: 1,
        separatorColor: "#272730",
        separatorStyle: "solid",
      },
    },
    {
      id: "node-music-1",
      type: "music-display",
      name: "Music Display",
      parentId: embedId,
      x: 24,
      y: 310,
      width: 328,
      height: 94,
      zIndex: 8,
      visible: true,
      locked: false,
      style: {
        opacity: 1,
        backgroundType: "solid",
        backgroundColor: "#111116",
        borderWidth: 1,
        borderColor: "#272730",
        borderRadius: 12,
      },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        musicPlatform: "Spotify",
        trackName: "After Dark",
        artist: "Mr.Kitty",
        artworkUrl:
          "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80",
        progressPercent: 52,
        elapsedText: "2:14",
        durationText: "4:26",
        isPlaying: true,
        useLiveActivity: false,
        musicEmptyText: "No audio currently playing",
        accentColor: "#22c55e",
      },
    },
    {
      id: "node-rpc-1",
      type: "custom-rpc",
      name: "Custom RPC",
      parentId: embedId,
      x: 368,
      y: 310,
      width: 328,
      height: 94,
      zIndex: 9,
      visible: true,
      locked: false,
      style: {
        opacity: 1,
        backgroundType: "solid",
        backgroundColor: "#111116",
        borderWidth: 1,
        borderColor: "#272730",
        borderRadius: 12,
      },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        appName: "Visual Studio Code",
        details: "Editing pixlpresence1-web",
        state: "Pixel.gg Studio",
        statusIndicator: "online",
        largeImage: "https://pixlpresence1-web.vercel.app/server-icon.png",
        useLiveRpc: true,
        rpcEmptyText: "No active Discord RPC session",
        accentColor: "#38bdf8",
      },
    },
    {
      id: "node-social-1",
      type: "social-group",
      name: "Social Media (Group)",
      parentId: embedId,
      x: 24,
      y: 416,
      width: 672,
      height: 44,
      zIndex: 10,
      visible: true,
      locked: false,
      style: { opacity: 1 },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        socialItems: [
          { id: "soc-discord", platform: "discord", url: "https://discord.gg/pixelgg", label: "Discord", tooltip: "Discord", visible: true, style: "pill" },
          { id: "soc-youtube", platform: "youtube", url: "https://youtube.com", label: "YouTube", tooltip: "YouTube", visible: true, style: "pill" },
          { id: "soc-github", platform: "github", url: "https://github.com", label: "GitHub", tooltip: "GitHub", visible: true, style: "pill" },
          { id: "soc-x", platform: "x", url: "https://x.com", label: "X", tooltip: "X", visible: true, style: "pill" },
          { id: "soc-ig", platform: "instagram", url: "https://instagram.com", label: "Instagram", tooltip: "Instagram", visible: true, style: "pill" },
        ],
      },
    },
    {
      id: galleryId,
      type: "image-gallery",
      name: "Image Gallery",
      parentId: embedId,
      x: 24,
      y: 470,
      width: 486,
      height: 92,
      zIndex: 11,
      visible: true,
      locked: false,
      style: {
        opacity: 1,
        backgroundType: "solid",
        backgroundColor: "#0e0e12",
        borderWidth: 1,
        borderColor: "#222229",
        borderRadius: 10,
        padding: 6,
        gap: 8,
        overflow: "hidden",
      },
      responsive: {
        hiddenOn: [],
        widthMode: "fixed",
        galleryColumns: { desktop: 3, tablet: 2, mobile: 1 },
      },
      config: {
        galleryColumns: 3,
        gallerySpacing: 8,
        galleryImageFit: "cover",
        galleryImageRadius: 8,
        galleryMaxImages: 9,
      },
    },
    {
      id: "node-gal-img-1",
      type: "image",
      name: "Image 1",
      parentId: galleryId,
      x: 6,
      y: 6,
      width: 152,
      height: 80,
      zIndex: 1,
      visible: true,
      locked: false,
      style: { opacity: 1, borderRadius: 8 },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=80",
        fit: "cover",
      },
    },
    {
      id: "node-gal-img-2",
      type: "image",
      name: "Image 2",
      parentId: galleryId,
      x: 166,
      y: 6,
      width: 152,
      height: 80,
      zIndex: 2,
      visible: true,
      locked: false,
      style: { opacity: 1, borderRadius: 8 },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80",
        fit: "cover",
      },
    },
    {
      id: "node-gal-img-3",
      type: "image",
      name: "Image 3",
      parentId: galleryId,
      x: 326,
      y: 6,
      width: 152,
      height: 80,
      zIndex: 3,
      visible: true,
      locked: false,
      style: { opacity: 1, borderRadius: 8 },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80",
        fit: "cover",
      },
    },
    {
      id: "node-nested-embed-1",
      type: "nested-embed",
      name: "Nested Embed",
      parentId: embedId,
      x: 522,
      y: 470,
      width: 174,
      height: 92,
      zIndex: 12,
      visible: true,
      locked: false,
      style: {
        opacity: 1,
        backgroundType: "solid",
        backgroundColor: "#141419",
        borderWidth: 1,
        borderColor: "#2a2a34",
        borderRadius: 10,
        padding: 12,
        gap: 6,
      },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {},
    },
    {
      id: "node-nested-badge-label",
      type: "custom-component",
      name: "Studio Status",
      parentId: "node-nested-embed-1",
      x: 10,
      y: 12,
      width: 154,
      height: 68,
      zIndex: 1,
      visible: true,
      locked: false,
      style: {
        opacity: 1,
        backgroundType: "solid",
        backgroundColor: "#0e0e13",
        borderWidth: 1,
        borderColor: "#25252e",
        borderRadius: 8,
      },
      responsive: { hiddenOn: [], widthMode: "fixed" },
      config: {
        customTitle: "STUDIO OS",
        customSubtitle: "NESTED MODULE",
        customBadge: "v2.5",
        accentColor: "#d71920",
      },
    },
  ];

  return {
    version: "2.0",
    id: createBuilderId("profile-doc"),
    title: "Profile Builder (Advanced)",
    canvas,
    nodes,
    preferences: {
      showGrid: false,
      snapEnabled: true,
      snapToGrid: true,
      snapToElements: true,
      smartGuides: true,
      defaultInsertTarget: "selected-container",
      showComponentOutlines: true,
      autoSaveEnabled: true,
      autoSaveDelaySec: 2,
    },
    metadata: {
      updatedAt: new Date().toISOString(),
    },
  };
}

export function cloneNodeTree(
  rootId: string,
  nodes: BuilderNode[]
): { nextNodes: BuilderNode[]; clonedRootId: string | null } {
  const root = nodes.find((n) => n.id === rootId);
  if (!root) return { nextNodes: nodes, clonedRootId: null };

  const idMap = new Map<string, string>();
  const collectIds = (parentId: string) => {
    nodes
      .filter((n) => n.parentId === parentId)
      .forEach((child) => {
        idMap.set(child.id, createBuilderId(child.type));
        collectIds(child.id);
      });
  };

  const clonedRootId = createBuilderId(root.type);
  idMap.set(root.id, clonedRootId);
  collectIds(root.id);

  const siblingCount = nodes.filter((n) => (n.parentId || null) === (root.parentId || null)).length;
  const clones: BuilderNode[] = [];

  for (const [origId, newId] of idMap.entries()) {
    const orig = nodes.find((n) => n.id === origId);
    if (!orig) continue;
    const isRoot = origId === rootId;
    clones.push({
      ...JSON.parse(JSON.stringify(orig)),
      id: newId,
      name: isRoot ? `${orig.name} (Copy)` : orig.name,
      parentId: isRoot ? orig.parentId : idMap.get(orig.parentId || "") ?? orig.parentId,
      x: isRoot ? orig.x + (orig.parentId ? 16 : 24) : orig.x,
      y: isRoot ? orig.y + (orig.parentId ? 16 : 24) : orig.y,
      zIndex: isRoot ? siblingCount + 1 : orig.zIndex,
    });
  }

  return {
    nextNodes: [...nodes, ...clones],
    clonedRootId,
  };
}

export function deleteNodeSubtree(rootId: string, nodes: BuilderNode[]): BuilderNode[] {
  const toDelete = new Set<string>([rootId]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const node of nodes) {
      if (node.parentId && toDelete.has(node.parentId) && !toDelete.has(node.id)) {
        toDelete.add(node.id);
        expanded = true;
      }
    }
  }
  return nodes.filter((n) => !toDelete.has(n.id));
}

export function validateProfileBuilderDocument(
  doc: ProfileBuilderDocument
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!doc || !doc.canvas) {
    return { valid: false, errors: ["Document canvas configuration is missing."] };
  }
  if (!Number.isFinite(doc.canvas.width) || doc.canvas.width < 240) {
    errors.push("Canvas width must be at least 240px.");
  }
  if (!Number.isFinite(doc.canvas.height) || doc.canvas.height < 240) {
    errors.push("Canvas height must be at least 240px.");
  }

  const seenIds = new Set<string>();
  const nodeIds = new Set(doc.nodes.map((n) => n.id));

  for (const node of doc.nodes) {
    if (!node.id || seenIds.has(node.id)) {
      errors.push(`Duplicate or empty component ID detected: "${node.id}".`);
    }
    seenIds.add(node.id);

    if (node.width <= 0 || node.height <= 0 || Number.isNaN(node.width) || Number.isNaN(node.height)) {
      errors.push(`Component "${node.name}" has invalid dimensions (${node.width}x${node.height}).`);
    }
    if (node.parentId) {
      if (!nodeIds.has(node.parentId)) {
        errors.push(`Component "${node.name}" references a missing parent (${node.parentId}).`);
      }
      if (wouldCreateCycle(node.id, node.parentId, doc.nodes)) {
        errors.push(`Circular hierarchy detected around "${node.name}".`);
      }
      if (getNestingDepth(node.parentId, doc.nodes) > MAX_NESTING_DEPTH) {
        errors.push(`"${node.name}" exceeds maximum nesting depth of ${MAX_NESTING_DEPTH}.`);
      }
    }
    if (node.type === "social-group" && node.config.socialItems) {
      for (const item of node.config.socialItems) {
        if (!isValidUrlOrEmpty(item.url)) {
          errors.push(`Social link "${item.label || item.platform}" in "${node.name}" has an invalid URL.`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function collectDescendantsCount(parentId: string, nodes: BuilderNode[]): number {
  let count = 0;
  const direct = nodes.filter((n) => n.parentId === parentId);
  count += direct.length;
  for (const child of direct) {
    count += collectDescendantsCount(child.id, nodes);
  }
  return count;
}
