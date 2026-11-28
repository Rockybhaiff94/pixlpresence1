import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/nothing/Navbar";
import { HeroSection } from "@/components/nothing/HeroSection";
import { StatsSection } from "@/components/nothing/StatsSection";
import { ShowcaseSection } from "@/components/nothing/ShowcaseSection";
import { FeaturesEditorial } from "@/components/nothing/FeaturesEditorial";
import { PricingSection } from "@/components/nothing/PricingSection";
import { FaqSection } from "@/components/nothing/FaqSection";
import { FooterCta } from "@/components/nothing/FooterCta";
import { Footer } from "@/components/nothing/Footer";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: DEFAULT_TITLE,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  const siteUrl = getSiteUrl();
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Pixel.gg",
      url: siteUrl,
      description: DEFAULT_DESCRIPTION,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/{username}`,
        "query-input": "required name=username",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Pixel.gg & PixelsRPC",
      applicationCategory: "SocialNetworkingApplication",
      operatingSystem: "Windows, macOS, Linux, Web",
      url: siteUrl,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Pixel.gg?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pixel.gg is a minimalist, monochromatic digital identity and bio link platform inspired by Nothing OS industrial design, combining custom link showcase pages with the native PixelsRPC Discord Rich Presence engine.",
          },
        },
        {
          "@type": "Question",
          name: "How does PixelsRPC work without standalone desktop apps?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "PixelsRPC runs as a native Vencord plugin inside Discord, fetching your cloud profile settings and dispatching local activity updates with zero background Electron daemons.",
          },
        },
        {
          "@type": "Question",
          name: "Is the Premium plan truly lifetime?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Premium is a single one-time payment of 7.99 EUR with no recurring monthly or annual fees.",
          },
        },
        {
          "@type": "Question",
          name: "How are profile views measured?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Profile views are measured using an edge-based zero-cookie telemetry tracker without invasive tracking cookies or advertising SDKs.",
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-sans selection:bg-white selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <ShowcaseSection />
        <FeaturesEditorial />
        <PricingSection />
        <FaqSection />
        <FooterCta />
      </main>
      <Footer />
    </div>
  );
}
