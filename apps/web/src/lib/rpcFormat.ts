export interface CustomStreak {
  id: string;
  enabled: boolean;
  name: string;        // e.g. "Win Streak", "Daily Grind", "Day Streak"
  value: number;       // e.g. 5, 12, 25, 100
  prefix?: string;     // e.g. "🔥", "⚡", ""
  suffix?: string;     // e.g. "x", "Days", "Wins", "Streak"
  displayText?: string;// custom override text or auto-computed
  targetField: "details" | "state"; // whether to append to Details or State
  mode?: "manual" | "dynamic";      // manual value or dynamic
}

export interface CustomStatistic {
  id: string;
  enabled: boolean;
  label: string;       // e.g. "Wins", "Kills", "Level", "Rank", "Score", "Hours"
  value: string | number; // e.g. "120", "450", "25", "Diamond", "9,500"
  prefix?: string;     // e.g. "🏆", "⚔️", "⭐", ""
  suffix?: string;     // e.g. "W", "K", "h", "pts", ""
  targetField: "details" | "state"; // whether to append to Details or State
  mode?: "manual" | "dynamic";
}

export interface CustomStatusLabel {
  id: string;
  enabled: boolean;
  label: string;       // e.g. "MVP", "Competitive", "Trending", "Legendary", "Online"
  emoji?: string;      // e.g. "👑", "🔥", "🟢", "⚔️"
  targetField: "details" | "state";
}

export interface RpcCustomConfig {
  detailsUrl?: string | null;
  stateUrl?: string | null;
  detailsEnabled?: boolean | null;
  stateEnabled?: boolean | null;
  largeImageUrl?: string | null;
  smallImageUrl?: string | null;
  timestampMode?: "none" | "now" | "time" | "custom" | null;
  streaks?: CustomStreak[] | null;
  statistics?: CustomStatistic[] | null;
  statusLabels?: CustomStatusLabel[] | null;
}

/**
 * Compiles a rich presence field (either 'details' or 'state') by combining:
 * 1. Base text (if enabled and present)
 * 2. Active custom status labels for this field
 * 3. Active custom streaks for this field
 * 4. Active custom statistics for this field
 * Clamped strictly to Discord's 128 character limit.
 */
export function formatRichPresenceField(
  baseText: string | null | undefined,
  fieldEnabled: boolean | null | undefined,
  targetField: "details" | "state",
  statusLabels?: CustomStatusLabel[] | null,
  streaks?: CustomStreak[] | null,
  statistics?: CustomStatistic[] | null
): string {
  const parts: string[] = [];

  // 1. Base text if enabled (default true)
  if (fieldEnabled !== false && baseText && baseText.trim()) {
    parts.push(baseText.trim());
  }

  // 2. Custom Status Labels targeted to this field
  if (Array.isArray(statusLabels)) {
    for (const item of statusLabels) {
      if (item && item.enabled && item.targetField === targetField && item.label && item.label.trim()) {
        const text = item.emoji ? `${item.emoji} ${item.label.trim()}` : item.label.trim();
        parts.push(text);
      }
    }
  }

  // 3. Custom Streaks targeted to this field
  if (Array.isArray(streaks)) {
    for (const streak of streaks) {
      if (streak && streak.enabled && streak.targetField === targetField) {
        if (streak.displayText && streak.displayText.trim()) {
          parts.push(streak.displayText.trim());
        } else {
          const prefix = streak.prefix ? `${streak.prefix} ` : "";
          const suffix = streak.suffix ? ` ${streak.suffix}` : "";
          const val = typeof streak.value === "number" ? streak.value : 0;
          const name = streak.name ? ` ${streak.name}` : " Streak";
          parts.push(`${prefix}${val}${suffix}${name}`.trim());
        }
      }
    }
  }

  // 4. Custom Statistics targeted to this field
  if (Array.isArray(statistics)) {
    for (const stat of statistics) {
      if (stat && stat.enabled && stat.targetField === targetField && stat.label && stat.label.trim()) {
        const prefix = stat.prefix ? `${stat.prefix} ` : "";
        const suffix = stat.suffix ? ` ${stat.suffix}` : "";
        const val = stat.value !== undefined && stat.value !== null ? String(stat.value).trim() : "";
        if (val) {
          parts.push(`${prefix}${stat.label.trim()}: ${val}${suffix}`.trim());
        }
      }
    }
  }

  if (parts.length === 0) return "";

  // Delimit combined items with " | "
  const combined = parts.join(" | ");

  // Discord strict 128 character limit
  return combined.slice(0, 128);
}
