import React from "react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";

export default function TermsPage() {
  const sections = [
    {
      num: "01",
      title: "ACCEPTANCE OF TERMS",
      content:
        "By creating an account, reserving a handle, or accessing Pixel.gg services, you agree to enter into a legally binding agreement under these Terms of Service. If you do not agree, do not access or utilize the platform.",
    },
    {
      num: "02",
      title: "HANDLE RESERVATION & OWNERSHIP",
      content:
        "Handles are granted on a non-exclusive license. Impersonation of trademarks, registered brands, or public entities without authorization may result in handle revocation without refund. Squatting handles with zero activity is strictly prohibited.",
    },
    {
      num: "03",
      title: "PROHIBITED CONDUCT & SECURITY",
      content:
        "You agree not to utilize Pixel.gg for distributing malware, phishing links, illegal media, hate speech, or malicious exploits. Violating these prohibitions will trigger immediate permanent termination and referral to relevant cyber incident responders.",
    },
    {
      num: "04",
      title: "LIFETIME PURCHASES & REFUND POLICY",
      content:
        "Premium and Custom Badge tiers are billed as single one-time payments for lifetime platform availability. Digital products are delivered instantaneously upon payment authorization. Refund requests are evaluated case-by-case within 14 days of original transaction date.",
    },
    {
      num: "05",
      title: "DISCORD RICH PRESENCE INTEGRATION",
      content:
        "The PixelsRPC plugin communicates exclusively with your local Discord client. Pixel.gg does not store or process your personal Discord authentication password or private chat logs.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-3 border-b border-[#1c1c1c] pb-8">
            <span className="text-xs text-neutral-500 uppercase tracking-widest">
              [ LEGAL // GOVERNANCE DOCUMENTATION ]
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              TERMS OF SERVICE.
            </h1>
            <p className="text-xs text-neutral-400">
              DOCUMENT ID: NOT-TOS-2026 // EFFECTIVE DATE: NOVEMBER 2026
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

