import React from "react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";

export default function PrivacyPage() {
  const sections = [
    {
      num: "01",
      title: "ZERO-COOKIE ANALYTICS PRINCIPLE",
      content:
        "Pixel.gg rejects the surveillance advertising model. We do not set third-party tracking cookies, fingerprinting pixels, or ad tracking beacons. Your visitor view analytics are calculated strictly at edge boundaries with complete privacy respect.",
    },
    {
      num: "02",
      title: "COLLECTED DATA",
      content:
        "We collect only the minimum telemetry necessary to deliver the service: your chosen username, email address, password hash, and the customization properties (biography, links, colors, theme presets) you explicitly submit to your bio.",
    },
    {
      num: "03",
      title: "DATA STORAGE & RESIDENCY",
      content:
        "Data is stored in high-availability encrypted PostgreSQL clusters powered by Supabase with Row Level Security (RLS) actively enabled across all public database tables. All transmissions utilize TLS 1.3 encryption.",
    },
    {
      num: "04",
      title: "YOUR RIGHTS (GDPR & CCPA)",
      content:
        "You retain absolute rights to request a complete archive of your stored data, to rectify incorrect records, or to trigger permanent deletion of your profile and identity credentials directly from your dashboard.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-3 border-b border-[#1c1c1c] pb-8">
            <span className="text-xs text-neutral-500 uppercase tracking-widest">
              [ PRIVACY // TELEMETRY DECLARATION ]
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              PRIVACY POLICY.
            </h1>
            <p className="text-xs text-neutral-400">
              DOCUMENT ID: NOT-PRIVACY-2026 // ZERO SURVEILLANCE STANDARDS
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((sec) => (
              <div key={sec.num} className="bg-[#0b0b0b] border border-[#202020] rounded-xl p-6 space-y-2">
                <span className="text-xs text-neutral-500 font-bold">[ {sec.num} // {sec.title} ]</span>
                <p className="text-xs text-neutral-300 font-sans leading-relaxed">{sec.content}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

