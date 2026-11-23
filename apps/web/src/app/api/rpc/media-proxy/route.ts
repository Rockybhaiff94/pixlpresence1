import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public high-speed media proxy for Discord Rich Presence assets
 * Proxies Discord avatars and external images so Discord's external-asset proxy
 * can safely cache and display them without origin blocks.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url")?.trim();

    if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
      return NextResponse.json({ error: "Valid HTTP or HTTPS URL required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Malformed URL" }, { status: 400 });
    }

    // SSRF Guard
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("172.16.") ||
      host.startsWith("169.254.")
    ) {
      return NextResponse.json({ error: "Prohibited host" }, { status: 403 });
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8000);

    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PixelRPC/1.0",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: abortController.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstream.statusText}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/png";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      return NextResponse.json({ error: "Gateway timeout fetching image" }, { status: 504 });
    }
    return NextResponse.json({ error: `Failed to proxy image: ${err.message}` }, { status: 500 });
  }
}
