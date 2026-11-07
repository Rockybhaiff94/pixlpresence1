import React from "react";
import { Navbar } from "@/components/nothing/Navbar";
import { HeroSection } from "@/components/nothing/HeroSection";
import { StatsSection } from "@/components/nothing/StatsSection";
import { ShowcaseSection } from "@/components/nothing/ShowcaseSection";
import { FeaturesEditorial } from "@/components/nothing/FeaturesEditorial";
import { PricingSection } from "@/components/nothing/PricingSection";
import { FaqSection } from "@/components/nothing/FaqSection";
import { FooterCta } from "@/components/nothing/FooterCta";
import { Footer } from "@/components/nothing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-sans selection:bg-white selection:text-black">
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
