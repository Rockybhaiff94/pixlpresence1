"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

export interface PaddleInitOptions {
  customerId?: string;
  customerEmail?: string;
}

/**
 * Initializes and returns the singleton Paddle instance for client-side checkout.
 * Always targets Live (production) by default unless NEXT_PUBLIC_PADDLE_ENVIRONMENT is explicitly sandbox.
 */
export function getPaddle(options?: PaddleInitOptions): Promise<Paddle | undefined> {
  if (typeof window === "undefined") {
    return Promise.resolve(undefined);
  }

  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!clientToken) {
    console.warn("[Paddle] Missing NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
    return Promise.resolve(undefined);
  }

  const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "sandbox" ? "sandbox" : "production";

  if (!paddlePromise) {
    const initParams: Parameters<typeof initializePaddle>[0] = {
      token: clientToken,
      environment: environment === "sandbox" ? "sandbox" : "production",
      eventCallback: (event) => {
        if (event.name === "checkout.completed") {
          console.log("[Paddle] Checkout completed successfully", event.data);
          // Refresh user context or redirect
          window.location.href = "/account?checkout=success";
        }
      },
    };

    // If Paddle Customer ID is available for logged-in user, attach pwCustomer for Paddle Retain
    if (options?.customerId) {
      initParams.pwCustomer = { id: options.customerId };
    }

    paddlePromise = initializePaddle(initParams);
  }

  return paddlePromise;
}

/**
 * Opens a Paddle Checkout overlay for a given price ID.
 */
export async function openPaddleCheckout({
  priceId,
  userEmail,
  userId,
  customData,
}: {
  priceId: string;
  userEmail?: string | null;
  userId?: string | null;
  customData?: Record<string, any>;
}) {
  const paddle = await getPaddle();
  if (!paddle) {
    alert("Payment checkout is currently initializing. Please try again in a moment.");
    return;
  }

  paddle.Checkout.open({
    settings: {
      displayMode: "overlay",
      theme: "dark",
      locale: "en",
      successUrl: `${window.location.origin}/account?checkout=success`,
    },
    items: [
      {
        priceId,
        quantity: 1,
      },
    ],
    customer: userEmail ? { email: userEmail } : undefined,
    customData: {
      userId: userId || "",
      ...customData,
    },
  });
}

