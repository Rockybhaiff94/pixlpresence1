export interface FontItem {
  name: string;
  category: "Modern" | "Minimal" | "Futuristic" | "Gaming" | "Editorial" | "Monospace" | "Elegant";
  weights: number[];
  googleFontFamily?: string;
}

export const CURATED_FONTS: FontItem[] = [
  // Modern
  { name: "Inter", category: "Modern", weights: [400, 600, 700], googleFontFamily: "Inter" },
  { name: "Plus Jakarta Sans", category: "Modern", weights: [400, 600, 700, 800], googleFontFamily: "Plus+Jakarta+Sans" },
  { name: "Outfit", category: "Modern", weights: [400, 600, 700], googleFontFamily: "Outfit" },

  // Minimal
  { name: "Geist", category: "Minimal", weights: [400, 500, 700], googleFontFamily: "Geist" },
  { name: "DM Sans", category: "Minimal", weights: [400, 500, 700], googleFontFamily: "DM+Sans" },

  // Futuristic
  { name: "Space Grotesk", category: "Futuristic", weights: [400, 600, 700], googleFontFamily: "Space+Grotesk" },
  { name: "Orbitron", category: "Futuristic", weights: [500, 700, 900], googleFontFamily: "Orbitron" },
  { name: "Syne", category: "Futuristic", weights: [600, 700, 800], googleFontFamily: "Syne" },

  // Gaming
  { name: "Russo One", category: "Gaming", weights: [400], googleFontFamily: "Russo+One" },
  { name: "Chakra Petch", category: "Gaming", weights: [400, 600, 700], googleFontFamily: "Chakra+Petch" },
  { name: "Press Start 2P", category: "Gaming", weights: [400], googleFontFamily: "Press+Start+2P" },

  // Editorial
  { name: "Cinzel", category: "Editorial", weights: [400, 600, 700], googleFontFamily: "Cinzel" },
  { name: "Playfair Display", category: "Editorial", weights: [400, 600, 700], googleFontFamily: "Playfair+Display" },

  // Monospace
  { name: "JetBrains Mono", category: "Monospace", weights: [400, 500, 700], googleFontFamily: "JetBrains+Mono" },
  { name: "Space Mono", category: "Monospace", weights: [400, 700], googleFontFamily: "Space+Mono" },
  { name: "Fira Code", category: "Monospace", weights: [400, 600], googleFontFamily: "Fira+Code" },

  // Elegant
  { name: "Cormorant Garamond", category: "Elegant", weights: [400, 600, 700], googleFontFamily: "Cormorant+Garamond" },
];

/**
 * Injects a Google Font link stylesheet dynamically into document.head if not present
 */
export function ensureFontLoaded(fontFamily: string) {
  if (typeof document === "undefined" || !fontFamily) return;

  const fontDef = CURATED_FONTS.find(
    (f) => f.name.toLowerCase() === fontFamily.toLowerCase()
  );

  const googleFamily = fontDef?.googleFontFamily || fontFamily.replace(/\s+/g, "+");
  const linkId = `gfont-${googleFamily.toLowerCase()}`;

  if (document.getElementById(linkId)) return;

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${googleFamily}:wght@400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}
