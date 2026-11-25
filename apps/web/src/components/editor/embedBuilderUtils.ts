import {
  ContainerElement,
  EditorElement,
  EmbedComponentKind,
  ImageElement,
  MusicElement,
  RpcElement,
  SocialElement,
  TextElement,
} from "./editorTypes";

export interface EmbedLiveSeed {
  displayName?: string | null;
  username?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  musicUrl?: string | null;
  rpc?: {
    appName?: string | null;
    details?: string | null;
    state?: string | null;
    largeImage?: string | null;
    smallImage?: string | null;
    activityType?: string | null;
  } | null;
}

export interface EmbedComponentCatalogItem {
  kind: EmbedComponentKind;
  label: string;
  shortDesc: string;
  defaultWidth: number;
  defaultHeight: number;
}

export const EMBED_COMPONENT_CATALOG: EmbedComponentCatalogItem[] = [
  {
    kind: "profile-image",
    label: "Profile Image",
    shortDesc: "Avatar / circular or square PFP",
    defaultWidth: 72,
    defaultHeight: 72,
  },
  {
    kind: "name",
    label: "Name",
    shortDesc: "Primary profile display name",
    defaultWidth: 220,
    defaultHeight: 34,
  },
  {
    kind: "subtitle",
    label: "Subtitle",
    shortDesc: "Handle, title, or status line",
    defaultWidth: 200,
    defaultHeight: 24,
  },
  {
    kind: "description",
    label: "Description",
    shortDesc: "Multiline bio & profile notes",
    defaultWidth: 340,
    defaultHeight: 60,
  },
  {
    kind: "rpc",
    label: "Custom RPC",
    shortDesc: "Discord Rich Presence card",
    defaultWidth: 340,
    defaultHeight: 84,
  },
  {
    kind: "music",
    label: "Music Display",
    shortDesc: "Now playing / track info",
    defaultWidth: 300,
    defaultHeight: 68,
  },
  {
    kind: "social",
    label: "Social Media",
    shortDesc: "Platform badge & handle",
    defaultWidth: 168,
    defaultHeight: 34,
  },
  {
    kind: "custom-text",
    label: "Custom Text",
    shortDesc: "Additional label or heading",
    defaultWidth: 200,
    defaultHeight: 28,
  },
];

let uidCounter = 0;
export function createUniqueId(prefix: string): string {
  uidCounter = (uidCounter + 1) % 10000;
  return `${prefix}-${Date.now()}-${uidCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function hexToRgba(hex: string | undefined, alpha = 1): string {
  const safeHex = (hex || "#0e0e13").trim();
  if (!safeHex.startsWith("#")) {
    return safeHex;
  }
  let clean = safeHex.slice(1);
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (clean.length !== 6) return safeHex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return safeHex;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function createProfileEmbedElement(
  canvas: { width: number; height: number },
  existingEmbedCount = 0
): ContainerElement {
  const width = Math.min(420, Math.max(240, canvas.width - 60));
  const height = Math.min(280, Math.max(180, canvas.height - 60));
  const offset = (existingEmbedCount % 4) * 24;
  const x = Math.max(16, Math.round((canvas.width - width) / 2 + offset));
  const y = Math.max(16, Math.round((canvas.height - height) / 2 + offset));

  return {
    id: createUniqueId("embed"),
    name: existingEmbedCount > 0 ? `Profile Embed ${existingEmbedCount + 1}` : "Profile Embed",
    type: "container",
    isProfileEmbed: true,
    parentId: null,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    zIndex: 10 + existingEmbedCount,
    locked: false,
    visible: true,
    backgroundColor: "#0e0e13",
    backgroundOpacity: 0.96,
    borderColor: "#282834",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    glassmorphism: true,
    shadow: {
      color: "rgba(0, 0, 0, 0.55)",
      blur: 28,
      offsetX: 0,
      offsetY: 14,
    },
  };
}

export function createEmbedChildElement(
  kind: EmbedComponentKind,
  parentEmbed: ContainerElement,
  siblingChildren: EditorElement[],
  seed?: EmbedLiveSeed
): EditorElement {
  const padding = parentEmbed.padding ?? 18;
  const usableW = Math.max(120, parentEmbed.width - padding * 2);
  const usableH = Math.max(90, parentEmbed.height - padding * 2);
  const sameKindCount = siblingChildren.filter((c) => c.embedRole === kind).length;
  const nextZ =
    siblingChildren.reduce((max, c) => Math.max(max, c.zIndex), 0) + 1;
  const stagger = (siblingChildren.length % 5) * 14;

  const clampLocal = (rawX: number, rawY: number, w: number, h: number) => ({
    x: Math.max(8, Math.min(Math.max(8, parentEmbed.width - w - 8), Math.round(rawX))),
    y: Math.max(8, Math.min(Math.max(8, parentEmbed.height - h - 8), Math.round(rawY))),
  });

  switch (kind) {
    case "profile-image": {
      const size = Math.min(80, Math.max(48, Math.round(usableH * 0.34)));
      const pos = clampLocal(padding + stagger, padding + stagger, size, size);
      const avatarEl: ImageElement = {
        id: createUniqueId("emb-avatar"),
        name: sameKindCount > 0 ? `Profile Image ${sameKindCount + 1}` : "Profile Image",
        type: "image",
        parentId: parentEmbed.id,
        embedRole: "profile-image",
        src: seed?.avatarUrl || "/logos/pixel-icon.png",
        fit: "cover",
        borderRadius: 9999,
        x: pos.x,
        y: pos.y,
        width: size,
        height: size,
        rotation: 0,
        opacity: 1,
        zIndex: nextZ,
        locked: false,
        visible: true,
      };
      return avatarEl;
    }

    case "name": {
      const w = Math.min(240, Math.max(120, usableW - 96));
      const h = 34;
      const hasAvatar = siblingChildren.some((c) => c.embedRole === "profile-image");
      const pos = clampLocal(hasAvatar ? padding + 92 : padding, padding + 6 + stagger * 0.5, w, h);
      const nameEl: TextElement = {
        id: createUniqueId("emb-name"),
        name: sameKindCount > 0 ? `Name ${sameKindCount + 1}` : "Name",
        type: "text",
        parentId: parentEmbed.id,
        embedRole: "name",
        text: seed?.displayName || seed?.username || "Pixel Creator",
        fontFamily: "Space Grotesk",
        fontSize: 22,
        fontWeight: 700,
        color: "#ffffff",
        textAlign: "left",
        letterSpacing: -0.3,
        lineHeight: 1.2,
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
        zIndex: nextZ,
        locked: false,
        visible: true,
      };
      return nameEl;
    }

    case "subtitle": {
      const w = Math.min(220, Math.max(110, usableW - 96));
      const h = 24;
      const hasAvatar = siblingChildren.some((c) => c.embedRole === "profile-image");
      const handleText = seed?.username ? `@${seed.username}` : "@pixelcreator";
      const pos = clampLocal(
        hasAvatar ? padding + 92 : padding,
        padding + 40 + stagger * 0.5,
        w,
        h
      );
      const subEl: TextElement = {
        id: createUniqueId("emb-sub"),
        name: sameKindCount > 0 ? `Subtitle ${sameKindCount + 1}` : "Subtitle",
        type: "text",
        parentId: parentEmbed.id,
        embedRole: "subtitle",
        text: handleText,
        fontFamily: "JetBrains Mono",
        fontSize: 12,
        fontWeight: 500,
        color: "#a1a1aa",
        textAlign: "left",
        letterSpacing: 0.2,
        lineHeight: 1.3,
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
        zIndex: nextZ,
        locked: false,
        visible: true,
      };
      return subEl;
    }

    case "description": {
      const w = Math.min(360, usableW);
      const h = 58;
      const pos = clampLocal(padding, padding + 88 + stagger * 0.5, w, h);
      const descEl: TextElement = {
        id: createUniqueId("emb-desc"),
        name: sameKindCount > 0 ? `Description ${sameKindCount + 1}` : "Description",
        type: "text",
        parentId: parentEmbed.id,
        embedRole: "description",
        text:
          seed?.bio?.trim() ||
          "Designing minimal interactive Discord profiles & rich presence cards on Pixel.gg.",
        fontFamily: "Inter",
        fontSize: 13,
        fontWeight: 400,
        color: "#d4d4d8",
        textAlign: "left",
        letterSpacing: 0,
        lineHeight: 1.45,
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
        zIndex: nextZ,
        locked: false,
        visible: true,
      };
      return descEl;
    }

    case "rpc": {
      const w = Math.min(360, usableW);
      const h = 84;
      const pos = clampLocal(padding, parentEmbed.height - h - padding - stagger * 0.4, w, h);
      const rawType = (seed?.rpc?.activityType || "playing").toLowerCase();
      const normalizedType =
        rawType === "streaming" ||
        rawType === "listening" ||
        rawType === "watching" ||
        rawType === "competing"
          ? rawType
          : "playing";

      const rpcEl: RpcElement = {
        id: createUniqueId("emb-rpc"),
        name: sameKindCount > 0 ? `Custom RPC ${sameKindCount + 1}` : "Custom RPC",
        type: "rpc",
        parentId: parentEmbed.id,
        embedRole: "rpc",
        cardStyle: "card",
        accentColor: "#d71920",
        backgroundColor: "#14141b",
        textColor: "#ffffff",
        borderRadius: 12,
        activityType: normalizedType,
        appName: seed?.rpc?.appName || "Pixel.gg Studio",
        details: seed?.rpc?.details || "Editing Custom Profile Embed",
        state: seed?.rpc?.state || "Rich Presence Active",
        largeImage: seed?.rpc?.largeImage || "/logos/pixel-icon.png",
        smallImage: seed?.rpc?.smallImage || "",
        useLiveRpc: true,
        showLargeImage: true,
        showSmallImage: true,
        showDetails: true,
        showState: true,
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
        zIndex: nextZ,
        locked: false,
        visible: true,
      };
      return rpcEl;
    }

    case "music": {
      const w = Math.min(340, usableW);
      const h = 68;
      const pos = clampLocal(padding, Math.round(parentEmbed.height * 0.56) + stagger * 0.4, w, h);
      const musicEl: MusicElement = {
        id: createUniqueId("emb-music"),
        name: sameKindCount > 0 ? `Music Display ${sameKindCount + 1}` : "Music Display",
        type: "music",
        parentId: parentEmbed.id,
        embedRole: "music",
        title: seed?.musicUrl ? "Connected Track" : "Midnight Telemetry",
        artist: seed?.musicUrl ? "Profile Audio" : "Pixel FM",
        albumArt: "",
        statusText: "Playing",
        isPlaying: true,
        progressPercent: 62,
        elapsedText: "2:08",
        durationText: "3:26",
        accentColor: "#1db954",
        backgroundColor: "#14141b",
        textColor: "#ffffff",
        borderRadius: 12,
        showProgress: true,
        showArtwork: true,
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
        zIndex: nextZ,
        locked: false,
        visible: true,
      };
      return musicEl;
    }

    case "social": {
      const presets = [
        { id: "discord", name: "Discord", handle: seed?.username ? `@${seed.username}` : "@pixeluser", color: "#5865F2" },
        { id: "github", name: "GitHub", handle: seed?.username || "pixeldev", color: "#ffffff" },
        { id: "x", name: "X", handle: seed?.username ? `@${seed.username}` : "@pixelgg", color: "#ffffff" },
        { id: "youtube", name: "YouTube", handle: seed?.username ? `@${seed.username}` : "@pixelstudio", color: "#FF0000" },
      ];
      const chosen = presets[sameKindCount % presets.length];
      const w = 164;
      const h = 34;
      const colOffset = (sameKindCount % 2) * 174;
      const rowOffset = Math.floor(sameKindCount / 2) * 42;
      const pos = clampLocal(padding + colOffset, parentEmbed.height - h - padding - rowOffset, w, h);

      const socialEl: SocialElement = {
        id: createUniqueId("emb-social"),
        name: sameKindCount > 0 ? `${chosen.name} Social` : "Social Media",
        type: "social",
        parentId: parentEmbed.id,
        embedRole: "social",
        platformId: chosen.id,
        platformName: chosen.name,
        handle: chosen.handle,
        url: "",
        showHandle: true,
        showPlatformName: false,
        iconSize: 16,
        textColor: "#f4f4f5",
        backgroundColor: "#181820",
        borderRadius: 10,
        variant: "pill",
        iconColorMode: "original",
        iconColor: chosen.color,
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
        zIndex: nextZ,
        locked: false,
        visible: true,
      };
      return socialEl;
    }

    case "custom-text":
    default: {
      const w = Math.min(220, usableW);
      const h = 30;
      const pos = clampLocal(padding + stagger, padding + 60 + stagger, w, h);
      const txtEl: TextElement = {
        id: createUniqueId("emb-text"),
        name: sameKindCount > 0 ? `Custom Text ${sameKindCount + 1}` : "Custom Text",
        type: "text",
        parentId: parentEmbed.id,
        embedRole: "custom-text",
        text: "Custom Label",
        fontFamily: "JetBrains Mono",
        fontSize: 13,
        fontWeight: 600,
        color: "#e4e4e7",
        textAlign: "left",
        letterSpacing: 0.3,
        lineHeight: 1.3,
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
        zIndex: nextZ,
        locked: false,
        visible: true,
      };
      return txtEl;
    }
  }
}

export function getElementAbsoluteRect(
  elem: EditorElement,
  elements: EditorElement[]
): { x: number; y: number; width: number; height: number } {
  if (!elem.parentId) {
    return { x: elem.x, y: elem.y, width: elem.width, height: elem.height };
  }
  const parent = elements.find((e) => e.id === elem.parentId);
  if (!parent) {
    return { x: elem.x, y: elem.y, width: elem.width, height: elem.height };
  }
  return {
    x: parent.x + elem.x,
    y: parent.y + elem.y,
    width: elem.width,
    height: elem.height,
  };
}

export function cloneElementOrEmbedHierarchy(
  targetId: string,
  elements: EditorElement[]
): { nextElements: EditorElement[]; clonedRootId: string | null } {
  const orig = elements.find((el) => el.id === targetId);
  if (!orig) return { nextElements: elements, clonedRootId: null };

  const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
  const newRootId = createUniqueId(orig.type === "container" ? "embed" : orig.type);
  const clonedRoot: EditorElement = {
    ...JSON.parse(JSON.stringify(orig)),
    id: newRootId,
    name: `${orig.name} (Copy)`,
    x: orig.x + (orig.parentId ? 16 : 24),
    y: orig.y + (orig.parentId ? 16 : 24),
    zIndex: orig.parentId
      ? elements.filter((e) => e.parentId === orig.parentId).length + 1
      : maxZ + 1,
  };

  if (orig.type !== "container") {
    return {
      nextElements: [...elements, clonedRoot],
      clonedRootId: newRootId,
    };
  }

  const childClones: EditorElement[] = elements
    .filter((el) => el.parentId === orig.id)
    .map((child, idx) => ({
      ...JSON.parse(JSON.stringify(child)),
      id: createUniqueId(child.type),
      parentId: newRootId,
      zIndex: child.zIndex || idx + 1,
    }));

  return {
    nextElements: [...elements, clonedRoot, ...childClones],
    clonedRootId: newRootId,
  };
}

export function deleteElementAndChildren(
  targetId: string,
  elements: EditorElement[]
): EditorElement[] {
  return elements.filter((el) => el.id !== targetId && el.parentId !== targetId);
}
