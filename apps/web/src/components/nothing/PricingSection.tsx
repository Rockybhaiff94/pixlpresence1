"use client";

import React from "react";
import Link from "next/link";
import { Check, Sparkles, Shield, Gift, ArrowRight } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Button } from "./Button";
import { useAuth } from "@/context/AuthContext";
import { openPaddleCheckout } from "@/lib/paddle";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut",
    },
  },
};

export const PricingSection: React.FC = () => {
  const { user } = useAuth();

  const handleCheckout = (tierName: string) => {
    if (tierName === "PREMIUM") {
      openPaddleCheckout({
        priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM || "pri_01m77937g210r680cc5ctrjt06",
        userId: user?.id,
        userEmail: user?.email,
      });
    } else if (tierName === "CUSTOM BADGE") {
      openPaddleCheckout({
        priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_BADGE || "pri_01m77938ah2vr0fd44jngajdzm",
        userId: user?.id,
        userEmail: user?.email,
      });
    }
  };

  const tiers = [
    {
      name: "FREE",
      price: "0€",
      period: "/ LIFETIME",
      tagline: "For beginners. Clean bio link with essential telemetry.",
      buttonText: "GET STARTED",
      buttonVariant: "outline" as const,
      href: "/register?ref=pricing_free",
      popular: false,
      features: [
        "Basic Profile Customization",
        "Profile Analytics & View Counter",
        "Social Links & Action Buttons",
        "Discord RPC Plugin Access",
        "Basic Background Patterns",
        "Standard Subdomain (pixel.gg/user)",
      ],
    },
    {
      name: "PREMIUM",
      price: "7,99€",
      period: "/ LIFETIME",
      tagline: "Pay once. Keep it forever. Unlock full industrial creative control.",
      buttonText: "PURCHASE LIFETIME",
      buttonVariant: "solid-white" as const,
      href: "/login?returnUri=/pricing",
      popular: true,
      features: [
        "Exclusive Verified Profile Badge",
        "All Industrial Nothing OS Layouts",
        "Custom Monospaced & Dot-Matrix Fonts",
        "Interactive Audio Player & Scrubbing",
        "Typewriter Bio Description Animations",
        "Special Glow & Matrix Particle FX",
        "Discord Rich Presence Priority Sync",
        "Metadata & Custom SEO Previews",
        "Multiple Profile Aliases & Redirects",
      ],
    },
    {
      name: "CUSTOM BADGE",
      price: "8,99€",
      period: "/ LIFETIME",
      tagline: "Create your own custom verified badge with custom icon & name.",
      buttonText: "CLAIM BADGE",
      buttonVariant: "surface" as const,
      href: "/login?returnUri=/pricing",
      popular: false,
      features: [
        "Custom Badge Icon & Text Label",
        "Exclusive Profile Accent Illumination",
        "Editable Any Time via Studio",
        "Compatible with Free & Premium",
        "One-Time Payment & No Expiration",
        "Direct Discord Verification",
      ],
    },
  ];

  return (
    <section id="pricing" className="w-full bg-[#050505] py-24 px-4 sm:px-6 border-b border-[#1a1a1a]">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-3 text-left">
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
            [ 04 // MONOCHROMATIC TIERS & UPGRADES ]
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-mono">
            PAY ONCE. KEEP FOREVER.
          </h2>
          <p className="text-sm text-neutral-400 font-mono max-w-xl">
            No recurring subscriptions. No deceptive trial tricks. Premium digital identity engineered for permanent ownership.
          </p>
        </div>

        {/* Tiers Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {tiers.map((t) => (
            <motion.div
              key={t.name}
              variants={cardVariants}
              whileHover={{ y: -6, transition: { duration: 0.25, ease: "easeOut" } }}
              className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 relative border transition-all ${
                t.popular
                  ? "bg-[#111111] border-white shadow-2xl shadow-white/5"
                  : "bg-[#090909] border-[#222222] hover:border-[#383838]"
              }`}
            >
              {t.popular && (
                <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-white text-black text-[10px] font-mono font-bold tracking-wider uppercase">
                  RECOMMENDED
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 tracking-widest">{t.name}</span>
                    {t.popular && <span className="w-2 h-2 rounded-full bg-[#d71920] animate-pulse" />}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white tracking-tight">{t.price}</span>
                    <span className="text-xs text-neutral-500">{t.period}</span>
                  </div>
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed pt-1">
                    {t.tagline}
                  </p>
                </div>

                <div className="border-t border-[#1f1f1f] pt-4 space-y-2.5 font-mono text-xs">
                  {t.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-neutral-300">
                      <span className="text-white mt-0.5 font-bold">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                {t.name === "FREE" ? (
                  <Button
                    variant={t.buttonVariant}
                    href={t.href}
                    className="w-full text-xs font-mono justify-center"
                  >
                    {t.buttonText}
                  </Button>
                ) : (
                  <Button
                    variant={t.buttonVariant}
                    onClick={() => handleCheckout(t.name)}
                    className="w-full text-xs font-mono justify-center cursor-pointer"
                  >
                    {t.buttonText}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Comparison Footnote */}
        <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-white" />
            <span>Looking for full feature matrices or gifting a friend?</span>
          </div>
          <Link
            href="/compare"
            className="text-white hover:underline flex items-center gap-1 font-semibold"
          >
            COMPARE VS GUNS.LOL & LINKTREE <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
};
