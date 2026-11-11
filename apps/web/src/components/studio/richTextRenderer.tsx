"use client";

import React, { useState } from "react";

interface RichTextRendererProps {
  content: string;
  style?: React.CSSProperties;
  className?: string;
  themeAccentColor?: string;
  allowBlockFormatting?: boolean;
}

/**
 * Sanitizes a URL to ensure it only uses safe protocols (http, https, mailto).
 * Rejects javascript:, data:, vbscript:, etc.
 */
function sanitizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("/") ||
    lower.startsWith("#")
  ) {
    return trimmed;
  }
  return null;
}

/**
 * Interactive Discord-Style Spoiler component that reveals on click.
 */
function DiscordSpoiler({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((prev) => !prev);
      }}
      className={`inline-block px-1.5 py-0.5 rounded cursor-pointer transition-all duration-150 select-none ${
        revealed
          ? "bg-neutral-800 text-neutral-100"
          : "bg-neutral-800 text-transparent hover:bg-neutral-700"
      }`}
      title={revealed ? "Click to hide spoiler" : "Click to reveal spoiler"}
      style={{
        filter: revealed ? "none" : "blur(4px)",
      }}
    >
      {text}
    </span>
  );
}

/**
 * Parses inline rich-text tokens (bold, italic, underline, strikethrough, inline code, spoiler, color tags, links).
 */
export function parseInlineTokens(
  text: string,
  themeAccentColor?: string
): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  // Regex patterns for inline Discord formatting
  // 1. Spoilers: ||spoiler||
  // 2. Bold + Italic: ***text***
  // 3. Bold: **text**
  // 4. Underline: __text__
  // 5. Italic: *text* or _text_
  // 6. Strikethrough: ~~text~~
  // 7. Inline code: `code`
  // 8. Custom color tag: {color:#hex}text{/color} or {color:accent}text{/color}
  // 9. Markdown link: [label](url)

  const inlineRegex =
    /(\|\|[\s\S]+?\|\|)|(\*\*\*[\s\S]+?\*\*\*)|(\*\*[\s\S]+?\*\*)|(__[\s\S]+?__)|(~~[\s\S]+?~~)|(`[^`\n]+`)|(\{color:([#a-zA-Z0-9_-]+)\}([\s\S]+?)\{\/color\})|(\[([^\]]+)\]\(([^)]+)\))|(\*[^\*\n]+\*)|(_[^_\n]+_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add raw text preceding this token
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];

    if (matchedStr.startsWith("||") && matchedStr.endsWith("||")) {
      const inner = matchedStr.slice(2, -2);
      nodes.push(<DiscordSpoiler key={`spoiler-${keyIndex++}`} text={inner} />);
    } else if (matchedStr.startsWith("***") && matchedStr.endsWith("***")) {
      const inner = matchedStr.slice(3, -3);
      nodes.push(
        <strong key={`bi-${keyIndex++}`} className="font-bold italic">
          {parseInlineTokens(inner, themeAccentColor)}
        </strong>
      );
    } else if (matchedStr.startsWith("**") && matchedStr.endsWith("**")) {
      const inner = matchedStr.slice(2, -2);
      nodes.push(
        <strong key={`b-${keyIndex++}`} className="font-bold">
          {parseInlineTokens(inner, themeAccentColor)}
        </strong>
      );
    } else if (matchedStr.startsWith("__") && matchedStr.endsWith("__")) {
      const inner = matchedStr.slice(2, -2);
      nodes.push(
        <u key={`u-${keyIndex++}`} className="underline underline-offset-2">
          {parseInlineTokens(inner, themeAccentColor)}
        </u>
      );
    } else if (matchedStr.startsWith("~~") && matchedStr.endsWith("~~")) {
      const inner = matchedStr.slice(2, -2);
      nodes.push(
        <s key={`s-${keyIndex++}`} className="line-through opacity-75">
          {parseInlineTokens(inner, themeAccentColor)}
        </s>
      );
    } else if (matchedStr.startsWith("`") && matchedStr.endsWith("`")) {
      const inner = matchedStr.slice(1, -1);
      nodes.push(
        <code
          key={`code-${keyIndex++}`}
          className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700/80 text-sky-300 font-mono text-[0.88em] select-text"
        >
          {inner}
        </code>
      );
    } else if (matchedStr.startsWith("{color:")) {
      const colorVal = match[8];
      const inner = match[9];
      const resolvedColor =
        colorVal === "accent" && themeAccentColor
          ? themeAccentColor
          : colorVal?.startsWith("#")
          ? colorVal
          : `#${colorVal}`;

      nodes.push(
        <span key={`col-${keyIndex++}`} style={{ color: resolvedColor }}>
          {parseInlineTokens(inner, themeAccentColor)}
        </span>
      );
    } else if (matchedStr.startsWith("[") && matchedStr.includes("](") && matchedStr.endsWith(")")) {
      const label = match[11];
      const rawUrl = match[12];
      const safeUrl = sanitizeUrl(rawUrl);

      if (safeUrl) {
        nodes.push(
          <a
            key={`a-${keyIndex++}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            {label}
          </a>
        );
      } else {
        nodes.push(label);
      }
    } else if (
      (matchedStr.startsWith("*") && matchedStr.endsWith("*")) ||
      (matchedStr.startsWith("_") && matchedStr.endsWith("_"))
    ) {
      const inner = matchedStr.slice(1, -1);
      nodes.push(
        <em key={`em-${keyIndex++}`} className="italic">
          {parseInlineTokens(inner, themeAccentColor)}
        </em>
      );
    } else {
      nodes.push(matchedStr);
    }

    lastIndex = inlineRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}

/**
 * Main rich-text renderer supporting multi-line Discord / Markdown syntax.
 */
export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  style,
  className = "",
  themeAccentColor,
  allowBlockFormatting = true,
}) => {
  if (!content) return null;

  // Single line / inline only
  if (!allowBlockFormatting || !content.includes("\n")) {
    return (
      <span style={style} className={className}>
        {parseInlineTokens(content, themeAccentColor)}
      </span>
    );
  }

  // Multi-line block processing (headings, quotes, lists, codeblocks)
  const lines = content.split("\n");
  const blockElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockBuffer: string[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block detection ```
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        blockElements.push(
          <pre
            key={`cb-${key++}`}
            className="my-1.5 p-2.5 rounded-lg bg-[#0d0d11] border border-neutral-800 text-neutral-200 font-mono text-[11px] overflow-x-auto text-left"
          >
            <code>{codeBlockBuffer.join("\n")}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Headings #, ##, ###
    if (line.startsWith("### ")) {
      blockElements.push(
        <h4 key={`h3-${key++}`} className="font-bold text-sm tracking-tight text-white mt-2 mb-0.5">
          {parseInlineTokens(line.slice(4), themeAccentColor)}
        </h4>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      blockElements.push(
        <h3 key={`h2-${key++}`} className="font-bold text-base tracking-tight text-white mt-2 mb-0.5">
          {parseInlineTokens(line.slice(3), themeAccentColor)}
        </h3>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      blockElements.push(
        <h2 key={`h1-${key++}`} className="font-bold text-lg tracking-tight text-white mt-2 mb-1">
          {parseInlineTokens(line.slice(2), themeAccentColor)}
        </h2>
      );
      continue;
    }

    // Block quote >
    if (line.startsWith("> ")) {
      blockElements.push(
        <blockquote
          key={`bq-${key++}`}
          className="border-l-2 border-neutral-600 pl-2.5 my-1 text-neutral-400 italic text-[0.95em]"
        >
          {parseInlineTokens(line.slice(2), themeAccentColor)}
        </blockquote>
      );
      continue;
    }

    // Bullet list - or *
    if (line.startsWith("- ") || line.startsWith("* ")) {
      blockElements.push(
        <div key={`li-${key++}`} className="flex items-start gap-1.5 ml-1 my-0.5">
          <span className="text-neutral-500 font-bold select-none">•</span>
          <span>{parseInlineTokens(line.slice(2), themeAccentColor)}</span>
        </div>
      );
      continue;
    }

    // Standard paragraph line
    blockElements.push(
      <p key={`p-${key++}`} className="min-h-[1.2em]">
        {parseInlineTokens(line, themeAccentColor)}
      </p>
    );
  }

  // Handle unclosed code block safely
  if (inCodeBlock && codeBlockBuffer.length > 0) {
    blockElements.push(
      <pre
        key={`cb-${key++}`}
        className="my-1.5 p-2 rounded-lg bg-[#0d0d11] border border-neutral-800 text-neutral-200 font-mono text-[11px] overflow-x-auto text-left"
      >
        <code>{codeBlockBuffer.join("\n")}</code>
      </pre>
    );
  }

  return (
    <div style={style} className={`space-y-0.5 ${className}`}>
      {blockElements}
    </div>
  );
};
