import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// In-memory cache for Paddle live webhook IP list
let cachedIps: string[] | null = null;
let lastIpsFetch = 0;
const IP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Known fallback Paddle webhook IPs from https://api.paddle.com/ips
const FALLBACK_PADDLE_IPS = [
  "34.237.3.244",
  "34.195.105.136",
  "34.232.58.13",
  "35.155.119.135",
  "34.212.5.7",
  "52.11.166.252",
];

async function getPaddleLiveIps(): Promise<string[]> {
  const now = Date.now();
  if (cachedIps && now - lastIpsFetch < IP_CACHE_TTL_MS) {
    return cachedIps;
  }
  try {
    const res = await fetch("https://api.paddle.com/ips", { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data?.ipv4_cidrs)) {
        cachedIps = data.data.ipv4_cidrs.map((cidr: string) => cidr.split("/")[0]);
        lastIpsFetch = now;
        return cachedIps as string[];
      }
    }
  } catch (err) {
    console.warn("[Paddle Webhook] Failed to fetch live IPs from Paddle, using fallback list:", err);
  }
  return FALLBACK_PADDLE_IPS;
}

/**
 * Verifies the Paddle webhook HMAC signature.
 * Header format: ts=1700000000;h1=hash_in_hex
 */
function verifyPaddleSignature(rawBody: string, signatureHeader: string, secretKey: string): boolean {
  if (!signatureHeader || !secretKey) return false;

  const parts = signatureHeader.split(";").reduce((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {} as Record<string, string>);

  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  // Verify timestamp freshness (allow within 10 minutes to prevent replay attacks)
  const timestampSeconds = parseInt(ts, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > 600) {
    console.warn("[Paddle Webhook] Timestamp outside 10-minute tolerance:", ts);
    return false;
  }

  const payloadToSign = `${ts}:${rawBody}`;
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(payloadToSign, "utf8")
    .digest("hex");

  try {
    const bufComputed = Buffer.from(computedHash, "hex");
    const bufReceived = Buffer.from(h1, "hex");
    if (bufComputed.length !== bufReceived.length) return false;
    return crypto.timingSafeEqual(bufComputed, bufReceived);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature") || "";
  const secretKey =
    process.env.PADDLE_WEBHOOK_SECRET_KEY ||
    process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET ||
    "";

  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Missing signature or body" }, { status: 400 });
  }

  // 1. Webhook IP verification (in production)
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  if (process.env.NODE_ENV === "production" && clientIp) {
    const allowedIps = await getPaddleLiveIps();
    const isAllowed = allowedIps.some((ip) => clientIp.startsWith(ip));
    if (!isAllowed) {
      console.warn(`[Paddle Webhook] Request from unverified IP: ${clientIp}`);
      // Log warning but continue if signature passes (in case of intermediate reverse proxies)
    }
  }

  // 2. Cryptographic signature verification
  const isValid = verifyPaddleSignature(rawBody, signature, secretKey);
  if (!isValid) {
    console.error("[Paddle Webhook] Invalid HMAC signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Process event payload
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventType = event.event_type;
  const eventId = event.event_id;
  const data = event.data;

  console.log(`[Paddle Webhook Received] Type: ${eventType}, ID: ${eventId}`);

  // Handle completed or paid transactions
  if (eventType === "transaction.completed" || eventType === "transaction.paid") {
    const customData = data.custom_data || {};
    const userId = customData.userId || customData.user_id;
    const userEmail = data.customer?.email || customData.email;
    const items = data.items || [];

    const livePricePremium =
      process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM || "pri_01m77937g210r680cc5ctrjt06";
    const livePriceBadge =
      process.env.NEXT_PUBLIC_PADDLE_PRICE_BADGE || "pri_01m77938ah2vr0fd44jngajdzm";

    let itemType: "PREMIUM" | "CUSTOM_BADGE" | null = null;
    for (const it of items) {
      const priceId = it.price?.id || it.price_id;
      if (priceId === livePricePremium) {
        itemType = "PREMIUM";
        break;
      } else if (priceId === livePriceBadge) {
        itemType = "CUSTOM_BADGE";
        break;
      }
    }

    if (!itemType) {
      // Check product name as fallback
      const desc = JSON.stringify(items).toLowerCase();
      if (desc.includes("premium")) itemType = "PREMIUM";
      else if (desc.includes("badge")) itemType = "CUSTOM_BADGE";
    }

    if (itemType && (userId || userEmail)) {
      try {
        const backendUrl =
          process.env.INTERNAL_API_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          "http://localhost:3001";
        const sessionSecret =
          process.env.SESSION_SECRET ||
          "pixelgg-session-secret-production-random-key-2026-auth";

        await fetch(`${backendUrl}/api/platform/fulfill-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": sessionSecret,
          },
          body: JSON.stringify({
            userId,
            userEmail,
            itemType,
            paddleTransactionId: data.id,
            paddleCustomerId: data.customer_id,
          }),
        });
      } catch (fulfillErr) {
        console.error("[Paddle Webhook] Error contacting backend fulfillment:", fulfillErr);
      }
    }
  }

  // Always return 200 within 5s per Paddle delivery contract
  return NextResponse.json({ received: true, eventId }, { status: 200 });
}

