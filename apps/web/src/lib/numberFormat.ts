/**
 * Format view counts using YouTube-style compact notation while preserving exact DB integers.
 * Examples: 0 -> "0", 999 -> "999", 1000 -> "1K", 1250 -> "1.25K", 999999 -> "999.9K", 1500000 -> "1.5M".
 */
export function formatCompactViews(rawCount: number | null | undefined): string {
  const n = typeof rawCount === "number" && Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 0;
  if (n < 1000) return String(n);

  const units = [
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "K" },
  ];

  for (const { threshold, suffix } of units) {
    if (n >= threshold) {
      const scaled = n / threshold;
      // Truncate (floor) so e.g. 999,999 displays as 999.9K instead of rounding to 1000K
      const formatted =
        scaled < 10
          ? String(Math.floor(scaled * 100) / 100)
          : String(Math.floor(scaled * 10) / 10);
      return `${formatted}${suffix}`;
    }
  }

  return String(n);
}
