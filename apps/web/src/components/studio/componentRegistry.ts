import React from "react";
import {
  User,
  Type,
  Heading as HeadingIcon,
  AlignLeft,
  UserCheck,
  Award,
  Clock,
  KeyRound,
  FileText,
  Tag,
  Gamepad2,
  Image as ImageIcon,
  Flame,
  Users,
  Timer,
  Film,
  Music,
  Share2,
  Globe,
  Layers,
  Box,
  SplitSquareVertical,
  Minus,
  Rows,
  Columns,
  ExternalLink,
  Sliders,
  ListFilter,
  CheckCircle,
} from "lucide-react";
import {
  CanvasElement,
  CanvasElementType,
  CanvasTransform,
  CanvasElementStyle,
} from "@/types/studio";

export type ComponentCategory =
  | "profile"
  | "text"
  | "discord"
  | "media"
  | "social"
  | "layout"
  | "interactive";

export interface ComponentDefinition {
  type: CanvasElementType;
  category: ComponentCategory;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  defaultTransform: Partial<CanvasTransform>;
  defaultStyle?: CanvasElementStyle;
  defaultProps?: Record<string, any>;
  createInstance: (parentEmbedId?: string | null, customProps?: Record<string, any>) => CanvasElement;
}

export const COMPONENT_CATEGORIES: Array<{
  id: ComponentCategory | "all";
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}> = [
  { id: "all", label: "All Components", icon: Box, description: "Explore the complete modular library" },
  { id: "profile", label: "Profile", icon: User, description: "Avatars, usernames, bio & badges" },
  { id: "text", label: "Text", icon: Type, description: "Headings, labels, fields & timestamps" },
  { id: "discord", label: "Discord", icon: Gamepad2, description: "Live Rich Presence & activities" },
  { id: "media", label: "Media", icon: ImageIcon, description: "Images, music player & galleries" },
  { id: "social", label: "Social", icon: Share2, description: "Linked accounts & social icons" },
  { id: "layout", label: "Layout", icon: Layers, description: "Containers, sections & dividers" },
  { id: "interactive", label: "Interactive", icon: ExternalLink, description: "Buttons, action rows & links" },
];

export const COMPONENT_REGISTRY: Record<CanvasElementType, ComponentDefinition> = {
  // ==========================================
  // A. PROFILE COMPONENTS
  // ==========================================
  avatar: {
    type: "avatar",
    category: "profile",
    name: "Profile Avatar",
    description: "User avatar with customizable shape, size, border & glow",
    icon: User,
    defaultTransform: { width: 96, height: 96, rotation: 0, zIndex: 3 },
    defaultStyle: { borderRadius: 24, borderWidth: 2, borderColor: "#ffffff" },
    createInstance: (parentEmbedId) => ({
      id: `avatar_${Date.now()}`,
      type: "avatar",
      name: "Profile Avatar",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 96, height: 96, rotation: 0, zIndex: 3 },
      style: { borderRadius: 24, borderWidth: 2, borderColor: "#ffffff" },
      isVisible: true,
      isLocked: false,
    }),
  },

  displayName: {
    type: "displayName",
    category: "profile",
    name: "Display Name",
    description: "Primary user display name with gradient & typography controls",
    icon: Type,
    defaultTransform: { width: 380, height: 36, rotation: 0, zIndex: 3 },
    defaultStyle: { fontSize: 26, fontWeight: 700, color: "#ffffff", textAlign: "center" },
    createInstance: (parentEmbedId, props) => ({
      id: `displayName_${Date.now()}`,
      type: "displayName",
      name: "Display Name",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 380, height: 36, rotation: 0, zIndex: 3 },
      style: { fontSize: 26, fontWeight: 700, color: "#ffffff", textAlign: "center" },
      props: { text: props?.text || "" },
      isVisible: true,
      isLocked: false,
    }),
  },

  username: {
    type: "username",
    category: "profile",
    name: "Username Handle",
    description: "Monospace user identifier (@username)",
    icon: UserCheck,
    defaultTransform: { width: 280, height: 26, rotation: 0, zIndex: 3 },
    defaultStyle: { fontSize: 13, fontWeight: 500, color: "#a1a1aa", textAlign: "center" },
    createInstance: (parentEmbedId, props) => ({
      id: `username_${Date.now()}`,
      type: "username",
      name: "Username Handle",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 280, height: 26, rotation: 0, zIndex: 3 },
      style: { fontSize: 13, fontWeight: 500, color: "#a1a1aa", textAlign: "center" },
      props: { text: props?.text || "" },
      isVisible: true,
      isLocked: false,
    }),
  },

  bio: {
    type: "bio",
    category: "profile",
    name: "Biography / Description",
    description: "Multiline profile biography with responsive text styling",
    icon: AlignLeft,
    defaultTransform: { width: 440, height: 52, rotation: 0, zIndex: 3 },
    defaultStyle: { fontSize: 13, fontWeight: 400, color: "#d4d4d8", textAlign: "center" },
    createInstance: (parentEmbedId, props) => ({
      id: `bio_${Date.now()}`,
      type: "bio",
      name: "User Biography",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 52, rotation: 0, zIndex: 3 },
      style: { fontSize: 13, fontWeight: 400, color: "#d4d4d8", textAlign: "center" },
      props: { text: props?.text || "" },
      isVisible: true,
      isLocked: false,
    }),
  },

  title: {
    type: "title",
    category: "profile",
    name: "Profile Title",
    description: "Custom headline title (e.g. Software Architect // Creator)",
    icon: Type,
    defaultTransform: { width: 340, height: 28, rotation: 0, zIndex: 3 },
    defaultStyle: { fontSize: 15, fontWeight: 600, color: "#ffffff", textAlign: "center" },
    createInstance: (parentEmbedId) => ({
      id: `title_${Date.now()}`,
      type: "title",
      name: "Profile Title",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 340, height: 28, rotation: 0, zIndex: 3 },
      style: { fontSize: 15, fontWeight: 600, color: "#ffffff", textAlign: "center" },
      props: { text: "CREATIVE DEVELOPER" },
      isVisible: true,
      isLocked: false,
    }),
  },

  subtitle: {
    type: "subtitle",
    category: "profile",
    name: "Profile Subtitle",
    description: "Secondary status or location caption",
    icon: Tag,
    defaultTransform: { width: 300, height: 22, rotation: 0, zIndex: 3 },
    defaultStyle: { fontSize: 11, fontWeight: 400, color: "#71717a", textAlign: "center" },
    createInstance: (parentEmbedId) => ({
      id: `subtitle_${Date.now()}`,
      type: "subtitle",
      name: "Profile Subtitle",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 300, height: 22, rotation: 0, zIndex: 3 },
      style: { fontSize: 11, fontWeight: 400, color: "#71717a", textAlign: "center" },
      props: { text: "Digital Identity Architecture // Pixel.gg" },
      isVisible: true,
      isLocked: false,
    }),
  },

  verificationBadge: {
    type: "verificationBadge",
    category: "profile",
    name: "Verification Badge",
    description: "Official verified badge pill or emblem",
    icon: CheckCircle,
    defaultTransform: { width: 110, height: 26, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `badge_verif_${Date.now()}`,
      type: "verificationBadge",
      name: "Verification Badge",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 110, height: 26, rotation: 0, zIndex: 3 },
      style: { color: "#38bdf8", backgroundColor: "rgba(56, 189, 248, 0.1)", borderRadius: 8 },
      props: { label: "VERIFIED" },
      isVisible: true,
      isLocked: false,
    }),
  },

  customBadges: {
    type: "customBadges",
    category: "profile",
    name: "Custom Badges Row",
    description: "Display Founder, VIP, Developer or custom achievement tags",
    icon: Award,
    defaultTransform: { width: 340, height: 32, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `badges_${Date.now()}`,
      type: "customBadges",
      name: "Custom Badges",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 340, height: 32, rotation: 0, zIndex: 3 },
      props: {
        badges: [
          { id: "b1", label: "FOUNDER", color: "#f59e0b" },
          { id: "b2", label: "VIP", color: "#ec4899" },
        ],
      },
      isVisible: true,
      isLocked: false,
    }),
  },

  // ==========================================
  // B. TEXT COMPONENTS
  // ==========================================
  text: {
    type: "text",
    category: "text",
    name: "Plain Text Block",
    description: "Standard body text block with paragraph wrapping",
    icon: Type,
    defaultTransform: { width: 440, height: 40, rotation: 0, zIndex: 2 },
    defaultStyle: { fontSize: 13, fontWeight: 400, color: "#e4e4e7" },
    createInstance: (parentEmbedId) => ({
      id: `text_${Date.now()}`,
      type: "text",
      name: "Plain Text Block",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 40, rotation: 0, zIndex: 2 },
      style: { fontSize: 13, fontWeight: 400, color: "#e4e4e7", textAlign: "left" },
      props: { content: "Modular embed content paragraph. Fully editable text block." },
      isVisible: true,
      isLocked: false,
    }),
  },

  heading: {
    type: "heading",
    category: "text",
    name: "Heading Text",
    description: "Prominent section header (H1, H2, H3)",
    icon: HeadingIcon,
    defaultTransform: { width: 440, height: 34, rotation: 0, zIndex: 2 },
    defaultStyle: { fontSize: 20, fontWeight: 700, color: "#ffffff" },
    createInstance: (parentEmbedId) => ({
      id: `heading_${Date.now()}`,
      type: "heading",
      name: "Heading Text",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 34, rotation: 0, zIndex: 2 },
      style: { fontSize: 20, fontWeight: 700, color: "#ffffff", textAlign: "left" },
      props: { text: "SECTION HEADING" },
      isVisible: true,
      isLocked: false,
    }),
  },

  description: {
    type: "description",
    category: "text",
    name: "Description Block",
    description: "Subordinate description or helper copy in muted tones",
    icon: FileText,
    defaultTransform: { width: 440, height: 32, rotation: 0, zIndex: 2 },
    defaultStyle: { fontSize: 12, fontWeight: 400, color: "#a1a1aa" },
    createInstance: (parentEmbedId) => ({
      id: `desc_${Date.now()}`,
      type: "description",
      name: "Description Block",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 32, rotation: 0, zIndex: 2 },
      style: { fontSize: 12, fontWeight: 400, color: "#a1a1aa" },
      props: { text: "Descriptive annotation or secondary information." },
      isVisible: true,
      isLocked: false,
    }),
  },

  authorText: {
    type: "authorText",
    category: "text",
    name: "Author Text",
    description: "Embed author header with mini avatar or author icon",
    icon: User,
    defaultTransform: { width: 360, height: 26, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `author_${Date.now()}`,
      type: "authorText",
      name: "Author Text",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 360, height: 26, rotation: 0, zIndex: 2 },
      style: { fontSize: 12, fontWeight: 600, color: "#ffffff" },
      props: { authorName: "Crafted by Pixel.gg", authorIcon: "" },
      isVisible: true,
      isLocked: false,
    }),
  },

  footerText: {
    type: "footerText",
    category: "text",
    name: "Footer Text",
    description: "Subtle timestamped footer with copyright or quote",
    icon: Minus,
    defaultTransform: { width: 440, height: 24, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `footer_${Date.now()}`,
      type: "footerText",
      name: "Footer Text",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 24, rotation: 0, zIndex: 2 },
      style: { fontSize: 10, fontWeight: 400, color: "#71717a" },
      props: { text: "PIXEL.GG STUDIO // MODULAR ARCHITECTURE" },
      isVisible: true,
      isLocked: false,
    }),
  },

  timestamp: {
    type: "timestamp",
    category: "text",
    name: "Timestamp / Clock",
    description: "Real-time clock indicator or UTC timestamp badge",
    icon: Clock,
    defaultTransform: { width: 180, height: 24, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `timestamp_${Date.now()}`,
      type: "timestamp",
      name: "Timestamp Indicator",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 180, height: 24, rotation: 0, zIndex: 2 },
      style: { fontSize: 10, color: "#71717a" },
      props: { format: "live" },
      isVisible: true,
      isLocked: false,
    }),
  },

  fieldName: {
    type: "fieldName",
    category: "text",
    name: "Embed Field Name",
    description: "Discord-style field key title",
    icon: KeyRound,
    defaultTransform: { width: 200, height: 22, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `fname_${Date.now()}`,
      type: "fieldName",
      name: "Field Name",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 200, height: 22, rotation: 0, zIndex: 2 },
      style: { fontSize: 11, fontWeight: 700, color: "#a1a1aa" },
      props: { text: "PRIMARY STACK" },
      isVisible: true,
      isLocked: false,
    }),
  },

  fieldValue: {
    type: "fieldValue",
    category: "text",
    name: "Embed Field Value",
    description: "Discord-style field value content",
    icon: FileText,
    defaultTransform: { width: 200, height: 24, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `fval_${Date.now()}`,
      type: "fieldValue",
      name: "Field Value",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 200, height: 24, rotation: 0, zIndex: 2 },
      style: { fontSize: 12, fontWeight: 500, color: "#ffffff" },
      props: { text: "TypeScript • React • Tailwind" },
      isVisible: true,
      isLocked: false,
    }),
  },

  customLabels: {
    type: "customLabels",
    category: "text",
    name: "Custom Label Tag",
    description: "Pill badge tag (e.g. 'NEW', 'LIVE', 'VIP')",
    icon: Tag,
    defaultTransform: { width: 80, height: 24, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `label_${Date.now()}`,
      type: "customLabels",
      name: "Custom Label",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 80, height: 24, rotation: 0, zIndex: 2 },
      style: { backgroundColor: "#ffffff", color: "#000000", borderRadius: 6, fontSize: 10, fontWeight: 700 },
      props: { text: "PRO" },
      isVisible: true,
      isLocked: false,
    }),
  },

  // ==========================================
  // C. DISCORD COMPONENTS
  // ==========================================
  rpc: {
    type: "rpc",
    category: "discord",
    name: "Discord Rich Presence Card",
    description: "Full real-time live Discord Rich Presence display",
    icon: Gamepad2,
    defaultTransform: { width: 480, height: 110, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `rpc_${Date.now()}`,
      type: "rpc",
      name: "Discord Rich Presence",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 480, height: 110, rotation: 0, zIndex: 3 },
      isVisible: true,
      isLocked: false,
    }),
  },

  discordArtwork: {
    type: "discordArtwork",
    category: "discord",
    name: "Discord Activity Artwork",
    description: "Large and small activity application icon / banner",
    icon: Flame,
    defaultTransform: { width: 80, height: 80, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `discordArt_${Date.now()}`,
      type: "discordArtwork",
      name: "Activity Artwork",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 80, height: 80, rotation: 0, zIndex: 3 },
      style: { borderRadius: 16 },
      isVisible: true,
      isLocked: false,
    }),
  },

  discordActivity: {
    type: "discordActivity",
    category: "discord",
    name: "Activity Details & State",
    description: "Live activity title, details string and status",
    icon: Gamepad2,
    defaultTransform: { width: 340, height: 50, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `discordAct_${Date.now()}`,
      type: "discordActivity",
      name: "Activity Info",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 340, height: 50, rotation: 0, zIndex: 3 },
      isVisible: true,
      isLocked: false,
    }),
  },

  discordGameTitle: {
    type: "discordGameTitle",
    category: "discord",
    name: "Game Title",
    description: "Discord activity application name heading",
    icon: Gamepad2,
    defaultTransform: { width: 280, height: 24, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `gameTitle_${Date.now()}`,
      type: "discordGameTitle",
      name: "Game Title",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 280, height: 24, rotation: 0, zIndex: 3 },
      style: { fontSize: 14, fontWeight: 700, color: "#ffffff" },
      isVisible: true,
      isLocked: false,
    }),
  },

  discordActivityDesc: {
    type: "discordActivityDesc",
    category: "discord",
    name: "Activity Description",
    description: "Discord activity details & state description lines",
    icon: FileText,
    defaultTransform: { width: 280, height: 36, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `actDesc_${Date.now()}`,
      type: "discordActivityDesc",
      name: "Activity Description",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 280, height: 36, rotation: 0, zIndex: 3 },
      style: { fontSize: 12, fontWeight: 400, color: "#a1a1aa" },
      isVisible: true,
      isLocked: false,
    }),
  },

  discordParty: {
    type: "discordParty",
    category: "discord",
    name: "Party / Player Info",
    description: "Party size counter (e.g. In a party (3 of 5))",
    icon: Users,
    defaultTransform: { width: 220, height: 24, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `party_${Date.now()}`,
      type: "discordParty",
      name: "Player / Party Info",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 220, height: 24, rotation: 0, zIndex: 3 },
      style: { fontSize: 11, color: "#a1a1aa" },
      isVisible: true,
      isLocked: false,
    }),
  },

  discordTimestamps: {
    type: "discordTimestamps",
    category: "discord",
    name: "Activity Elapsed Time",
    description: "Live elapsed timer (e.g. 01:42:15 elapsed)",
    icon: Timer,
    defaultTransform: { width: 160, height: 22, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `actTime_${Date.now()}`,
      type: "discordTimestamps",
      name: "Activity Timer",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 160, height: 22, rotation: 0, zIndex: 3 },
      style: { fontSize: 11, color: "#4ade80" },
      isVisible: true,
      isLocked: false,
    }),
  },

  // ==========================================
  // D. MEDIA COMPONENTS
  // ==========================================
  image: {
    type: "image",
    category: "media",
    name: "Image / Media",
    description: "Embed graphic image, artwork, or screenshot",
    icon: ImageIcon,
    defaultTransform: { width: 440, height: 160, rotation: 0, zIndex: 2 },
    defaultStyle: { borderRadius: 16 },
    createInstance: (parentEmbedId) => ({
      id: `img_${Date.now()}`,
      type: "image",
      name: "Custom Image",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 160, rotation: 0, zIndex: 2 },
      style: { borderRadius: 16 },
      props: { imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800" },
      isVisible: true,
      isLocked: false,
    }),
  },

  thumbnail: {
    type: "thumbnail",
    category: "media",
    name: "Thumbnail Image",
    description: "Compact media thumbnail for top-right embed layout",
    icon: ImageIcon,
    defaultTransform: { width: 64, height: 64, rotation: 0, zIndex: 2 },
    defaultStyle: { borderRadius: 12 },
    createInstance: (parentEmbedId) => ({
      id: `thumb_${Date.now()}`,
      type: "thumbnail",
      name: "Embed Thumbnail",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 64, height: 64, rotation: 0, zIndex: 2 },
      style: { borderRadius: 12 },
      props: { imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200" },
      isVisible: true,
      isLocked: false,
    }),
  },

  mediaGallery: {
    type: "mediaGallery",
    category: "media",
    name: "Media Gallery Grid",
    description: "Multi-item photo or screenshot gallery grid",
    icon: Film,
    defaultTransform: { width: 440, height: 120, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `gallery_${Date.now()}`,
      type: "mediaGallery",
      name: "Media Gallery",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 120, rotation: 0, zIndex: 2 },
      props: {
        images: [
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400",
          "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400",
        ],
      },
      isVisible: true,
      isLocked: false,
    }),
  },

  music: {
    type: "music",
    category: "media",
    name: "Music / Audio Player",
    description: "Interactive audio soundscape player with visualizer bar",
    icon: Music,
    defaultTransform: { width: 440, height: 60, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `music_${Date.now()}`,
      type: "music",
      name: "Music Player",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 60, rotation: 0, zIndex: 3 },
      props: { title: "Nothing Ambient Engine", artist: "Audio Synthesizer" },
      isVisible: true,
      isLocked: false,
    }),
  },

  videoBackground: {
    type: "videoBackground",
    category: "media",
    name: "Video / Animated Canvas",
    description: "Animated loop or video media container",
    icon: Film,
    defaultTransform: { width: 440, height: 140, rotation: 0, zIndex: 1 },
    createInstance: (parentEmbedId) => ({
      id: `vid_${Date.now()}`,
      type: "videoBackground",
      name: "Video Canvas",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 140, rotation: 0, zIndex: 1 },
      style: { borderRadius: 16 },
      props: { videoUrl: "" },
      isVisible: true,
      isLocked: false,
    }),
  },

  // ==========================================
  // E. SOCIAL COMPONENTS
  // ==========================================
  socials: {
    type: "socials",
    category: "social",
    name: "Social Media Group",
    description: "All linked social accounts rendered in a unified row",
    icon: Share2,
    defaultTransform: { width: 440, height: 44, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `socials_${Date.now()}`,
      type: "socials",
      name: "Social Media Group",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 44, rotation: 0, zIndex: 3 },
      isVisible: true,
      isLocked: false,
    }),
  },

  socialIcon: {
    type: "socialIcon",
    category: "social",
    name: "Single Social Icon",
    description: "Standalone interactive button for a specific social platform",
    icon: Globe,
    defaultTransform: { width: 40, height: 40, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `socialIcon_${Date.now()}`,
      type: "socialIcon",
      name: "Social Icon Button",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 40, height: 40, rotation: 0, zIndex: 3 },
      props: { platform: "discord", url: "https://discord.gg" },
      isVisible: true,
      isLocked: false,
    }),
  },

  linkedAccount: {
    type: "linkedAccount",
    category: "social",
    name: "Linked Account Pill",
    description: "Displays connected platform account handle & status",
    icon: UserCheck,
    defaultTransform: { width: 220, height: 36, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `linked_${Date.now()}`,
      type: "linkedAccount",
      name: "Linked Account",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 220, height: 36, rotation: 0, zIndex: 3 },
      props: { platform: "github", handle: "@rockybhaiff94" },
      isVisible: true,
      isLocked: false,
    }),
  },

  // ==========================================
  // F. LAYOUT COMPONENTS
  // ==========================================
  container: {
    type: "container",
    category: "layout",
    name: "Nested Card Container",
    description: "Sub-container with custom background, border & padding",
    icon: Box,
    defaultTransform: { width: 440, height: 100, rotation: 0, zIndex: 2 },
    defaultStyle: { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "#26262b", borderWidth: 1, borderRadius: 16, padding: 16 },
    createInstance: (parentEmbedId) => ({
      id: `container_${Date.now()}`,
      type: "container",
      name: "Nested Container",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 100, rotation: 0, zIndex: 2 },
      style: { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "#26262b", borderWidth: 1, borderRadius: 16, padding: 16 },
      isVisible: true,
      isLocked: false,
    }),
  },

  section: {
    type: "section",
    category: "layout",
    name: "Section Box",
    description: "Organized section area with title divider bar",
    icon: Layers,
    defaultTransform: { width: 440, height: 80, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `section_${Date.now()}`,
      type: "section",
      name: "Section Box",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 80, rotation: 0, zIndex: 2 },
      props: { title: "CUSTOM SECTION" },
      isVisible: true,
      isLocked: false,
    }),
  },

  divider: {
    type: "divider",
    category: "layout",
    name: "Separator Divider",
    description: "Horizontal divider line with customizable color & style",
    icon: Minus,
    defaultTransform: { width: 440, height: 12, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `divider_${Date.now()}`,
      type: "divider",
      name: "Separator Divider",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 12, rotation: 0, zIndex: 2 },
      style: { borderColor: "#26262b", borderWidth: 1 },
      isVisible: true,
      isLocked: false,
    }),
  },

  column: {
    type: "column",
    category: "layout",
    name: "2-Column Split",
    description: "Dual column container for side-by-side components",
    icon: Columns,
    defaultTransform: { width: 440, height: 90, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `col_${Date.now()}`,
      type: "column",
      name: "2-Column Layout",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 90, rotation: 0, zIndex: 2 },
      isVisible: true,
      isLocked: false,
    }),
  },

  row: {
    type: "row",
    category: "layout",
    name: "Horizontal Flex Row",
    description: "Row container that stacks child items horizontally",
    icon: Rows,
    defaultTransform: { width: 440, height: 50, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `row_${Date.now()}`,
      type: "row",
      name: "Flex Row",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 50, rotation: 0, zIndex: 2 },
      isVisible: true,
      isLocked: false,
    }),
  },

  // ==========================================
  // G. INTERACTIVE COMPONENTS
  // ==========================================
  button: {
    type: "button",
    category: "interactive",
    name: "Action Button",
    description: "Interactive button linking to website, store or Discord",
    icon: ExternalLink,
    defaultTransform: { width: 440, height: 48, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `btn_${Date.now()}`,
      type: "button",
      name: "Action Button",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 48, rotation: 0, zIndex: 3 },
      props: { title: "VISIT WEBSITE", subtitle: "pixel.gg", url: "https://pixel.gg" },
      isVisible: true,
      isLocked: false,
    }),
  },

  actionRow: {
    type: "actionRow",
    category: "interactive",
    name: "Action Row (Multiple Buttons)",
    description: "Discord-style action row holding multiple buttons side-by-side",
    icon: Sliders,
    defaultTransform: { width: 440, height: 48, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `actRow_${Date.now()}`,
      type: "actionRow",
      name: "Action Row",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 48, rotation: 0, zIndex: 3 },
      props: {
        buttons: [
          { id: "b1", title: "PORTFOLIO", url: "https://pixel.gg" },
          { id: "b2", title: "CONTACT", url: "mailto:hello@pixel.gg" },
        ],
      },
      isVisible: true,
      isLocked: false,
    }),
  },

  selectMenu: {
    type: "selectMenu",
    category: "interactive",
    name: "Select Menu / Dropdown",
    description: "Interactive dropdown selector with options",
    icon: ListFilter,
    defaultTransform: { width: 440, height: 44, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `select_${Date.now()}`,
      type: "selectMenu",
      name: "Select Menu",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 440, height: 44, rotation: 0, zIndex: 3 },
      props: {
        placeholder: "Select an option...",
        options: ["Featured Project 1", "Featured Project 2", "GitHub Repositories"],
      },
      isVisible: true,
      isLocked: false,
    }),
  },

  interactiveLink: {
    type: "interactiveLink",
    category: "interactive",
    name: "Interactive Text Link",
    description: "Underlined hyperlink with external arrow icon and hover shine",
    icon: ExternalLink,
    defaultTransform: { width: 260, height: 26, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `link_${Date.now()}`,
      type: "interactiveLink",
      name: "Interactive Link",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 260, height: 26, rotation: 0, zIndex: 3 },
      props: { text: "Read Documentation →", url: "https://pixel.gg" },
      isVisible: true,
      isLocked: false,
    }),
  },

  // Legacy fallback types
  embed: {
    type: "embed",
    category: "layout",
    name: "Embed Container",
    description: "Main profile embed frame",
    icon: Box,
    defaultTransform: { width: 580, height: 320, rotation: 0, zIndex: 1 },
    createInstance: () => ({
      id: `embed_${Date.now()}`,
      type: "embed",
      name: "Embed Frame",
      transform: { x: 0, y: 0, width: 580, height: 320, rotation: 0, zIndex: 1 },
      isVisible: true,
      isLocked: false,
    }),
  },

  tagline: {
    type: "tagline",
    category: "profile",
    name: "Tagline",
    description: "Subtitle badge",
    icon: Tag,
    defaultTransform: { width: 280, height: 24, rotation: 0, zIndex: 2 },
    createInstance: (parentEmbedId) => ({
      id: `tagline_${Date.now()}`,
      type: "tagline",
      name: "Tagline",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 280, height: 24, rotation: 0, zIndex: 2 },
      props: { text: "Digital Identity // Nothing OS" },
      isVisible: true,
      isLocked: false,
    }),
  },

  shape: {
    type: "shape",
    category: "layout",
    name: "Geometric Shape",
    description: "Rectangular or rounded canvas accent",
    icon: Box,
    defaultTransform: { width: 100, height: 100, rotation: 0, zIndex: 1 },
    createInstance: (parentEmbedId) => ({
      id: `shape_${Date.now()}`,
      type: "shape",
      name: "Shape",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 1 },
      style: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12 },
      isVisible: true,
      isLocked: false,
    }),
  },

  bottomIcon: {
    type: "bottomIcon",
    category: "profile",
    name: "Status Glyph",
    description: "Circular bottom status icon",
    icon: Flame,
    defaultTransform: { width: 32, height: 32, rotation: 0, zIndex: 3 },
    createInstance: (parentEmbedId) => ({
      id: `botIcon_${Date.now()}`,
      type: "bottomIcon",
      name: "Status Glyph",
      parentEmbedId: parentEmbedId || null,
      transform: { x: 0, y: 0, width: 32, height: 32, rotation: 0, zIndex: 3 },
      isVisible: true,
      isLocked: false,
    }),
  },
};

