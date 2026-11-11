import { CanvasElementStyle } from "@/types/studio";

export interface EffectPresetDef {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  style: Partial<CanvasElementStyle>;
}

export const EFFECT_PRESETS: EffectPresetDef[] = [
  // --- FREE PRESETS ---
  {
    id: "soft-glow",
    name: "Soft Glow",
    description: "Subtle cyan ambient glow around edges",
    isPremium: false,
    style: {
      glowEnabled: true,
      glowColor: "#38bdf8",
      glowIntensity: 40,
      glowBlur: 14,
      glowRadius: 2,
      glowType: "basic",
    },
  },
  {
    id: "simple-shadow",
    name: "Simple Shadow",
    description: "Natural drop shadow with subtle depth",
    isPremium: false,
    style: {
      shadowEnabled: true,
      shadowColor: "rgba(0,0,0,0.6)",
      shadowBlur: 16,
      shadowDistance: 6,
      opacity: 100,
    },
  },
  {
    id: "subtle-highlight",
    name: "Subtle Highlight",
    description: "Delicate top border and low opacity background",
    isPremium: false,
    style: {
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
      backgroundColor: "rgba(255,255,255,0.03)",
      backdropBlur: 8,
    },
  },
  {
    id: "clean-border",
    name: "Clean Border",
    description: "Crisp Nothing OS monochrome border",
    isPremium: false,
    style: {
      borderWidth: 1,
      borderColor: "#26262b",
      borderRadius: 14,
      backgroundColor: "rgba(14,14,18,0.85)",
    },
  },
  {
    id: "basic-hover",
    name: "Basic Hover",
    description: "Smooth 1.03x scale and subtle opacity lift",
    isPremium: false,
    style: {
      hoverEffect: "scale",
      hoverScale: 1.03,
    },
  },

  // --- PREMIUM PRESETS ---
  {
    id: "neon-glow",
    name: "Neon Glow",
    description: "Vibrant pulsating multi-color neon aura",
    isPremium: true,
    style: {
      glowEnabled: true,
      glowColor: "#00f0ff",
      glowIntensity: 85,
      glowBlur: 28,
      glowRadius: 8,
      glowType: "animated",
      glowSpeed: 2.5,
      animationPreset: "soft-neon",
    },
  },
  {
    id: "animated-aurora",
    name: "Animated Aurora",
    description: "Flowing dynamic northern lights gradient glow",
    isPremium: true,
    style: {
      glowEnabled: true,
      glowColor: "#a855f7",
      glowIntensity: 75,
      glowBlur: 32,
      glowType: "gradient",
      gradientEnabled: true,
      gradientAnimated: true,
      animationPreset: "gradient-flow",
    },
  },
  {
    id: "gradient-pulse",
    name: "Gradient Pulse",
    description: "Rhythmic breathing luminescence with multi-color core",
    isPremium: true,
    style: {
      glowEnabled: true,
      glowColor: "#ec4899",
      glowIntensity: 80,
      glowBlur: 24,
      glowType: "pulsating",
      glowSpeed: 2,
      animationPreset: "pulse-glow",
    },
  },
  {
    id: "ambient-lighting",
    name: "Ambient Lighting",
    description: "Multi-layered realistic depth shadow & directional lighting",
    isPremium: true,
    style: {
      shadowEnabled: true,
      shadowColor: "rgba(0,0,0,0.8)",
      shadowBlur: 36,
      shadowDistance: 12,
      lightingMode: "ambient",
      backdropBlur: 20,
    },
  },
  {
    id: "floating-neon",
    name: "Floating Neon",
    description: "Zero-gravity floating animation with cyan underglow",
    isPremium: true,
    style: {
      glowEnabled: true,
      glowColor: "#38bdf8",
      glowIntensity: 70,
      glowBlur: 20,
      animationPreset: "floating",
      hoverEffect: "neon",
    },
  },
  {
    id: "multi-layer-shadow",
    name: "Multi-Layer Shadow",
    description: "Ultra-deep 3D layered elevation shadows",
    isPremium: true,
    style: {
      shadowEnabled: true,
      shadowColor: "rgba(0,0,0,0.7)",
      shadowBlur: 40,
      shadowDistance: 18,
      lightingMode: "depth",
    },
  },
  {
    id: "premium-shine",
    name: "Subtle Shine",
    description: "Periodic metallic sheen reflection sweep",
    isPremium: true,
    style: {
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
      animationPreset: "subtle-shine",
      hoverEffect: "glow",
    },
  },
];
