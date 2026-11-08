/**
 * Sanitizes and safely scopes user-written custom CSS so it cannot leak
 * out to the surrounding website UI or execute harmful scripts.
 */
export function scopeAndSanitizeCss(rawCss: string, scopeSelector: string): string {
  if (!rawCss || typeof rawCss !== "string") return "";

  // 1. Strip HTML tags, expressions, behaviors, javascript: URIs, and external @import
  const cleaned = rawCss
    .replace(/<\/?script[^>]*>/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/behavior\s*:[^;}]*/gi, "")
    .replace(/javascript\s*:[^;}]*/gi, "")
    .replace(/@import\s+[^;]+;/gi, "")
    .trim();

  if (!cleaned) return "";

  // 2. Wrap the rules in a CSS nesting block scoped to the target container
  // Modern browsers support native CSS nesting:
  // e.g. .profile-page-root { ...rules... }
  return `
/* --- Scoped Pixel.gg Custom Studio CSS --- */
${scopeSelector} {
${cleaned}
}
`.trim();
}

/**
 * Basic CSS validation checking for unclosed curly braces and dangerous tokens.
 */
export function validateCss(css: string): { valid: boolean; error?: string } {
  if (!css.trim()) return { valid: true };

  let openBraces = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") openBraces++;
    if (css[i] === "}") openBraces--;
    if (openBraces < 0) {
      return { valid: false, error: "Unexpected closing brace '}' before opening brace." };
    }
  }

  if (openBraces !== 0) {
    return { valid: false, error: `Unclosed brace: missing ${openBraces} closing '}' brace(s).` };
  }

  if (/javascript\s*:/i.test(css) || /expression\s*\(/i.test(css)) {
    return { valid: false, error: "Dangerous JavaScript expressions or URI protocols are not permitted in CSS." };
  }

  return { valid: true };
}
