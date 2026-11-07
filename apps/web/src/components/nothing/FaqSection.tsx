"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const FaqSection: React.FC = () => {
  const faqs = [
    {
      q: "WHAT IS PIXEL.GG?",
      a: "Pixel.gg is a minimalist, monochromatic digital identity and bio link platform inspired by Nothing Phone and Nothing OS industrial design. It combines custom link showcase pages with a native Discord Rich Presence engine (PixelsRPC).",
    },
    {
      q: "HOW DOES PIXELSRPC WORK WITHOUT STANDALONE DESKTOP APPS?",
      a: "Unlike legacy RPC software that requires running bulky background Electron or Tauri daemons, PixelsRPC runs as a native plugin directly inside Vencord. It fetches your cloud profile settings and dispatches local activity updates straight to Discord's internal event dispatcher with zero battery drain.",
    },
    {
      q: "IS THE PREMIUM PLAN TRULY LIFETIME?",
      a: "Yes. Premium is a single one-time payment of 7,99€. There are no monthly subscriptions, no annual renewal fees, and no recurring charges. You own the unlocked creative features permanently.",
    },
    {
      q: "CAN I UPLOAD CUSTOM AUDIO AND MUSIC TRACKS?",
      a: "Yes. You can stream any audio file directly on your profile with our hardware-style disc player. It includes interactive progress scrubbing, custom track title and artist annotations, and a click-to-enter intro barrier that strictly complies with modern browser autoplay policies.",
    },
    {
      q: "HOW ARE PROFILE VIEWS MEASURED?",
      a: "Profile views are measured using our edge-based zero-cookie telemetry tracker. We count unique visitor sessions without using invasive tracking cookies, surveillance scripts, or advertising SDKs.",
    },
    {
      q: "CAN I CHANGE MY HANDLE OR REDIRECT ALIASES LATER?",
      a: "Yes. You can manage multiple username aliases from your dashboard. Premium users receive additional alias redirect slots that seamlessly forward visitors to their primary profile.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="w-full bg-[#080808] py-24 px-4 sm:px-6 border-b border-[#1a1a1a]">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-3 text-left">
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
            [ 05 // SYSTEM DOCUMENTATION & INQUIRIES ]
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
            FREQUENTLY ASKED QUESTIONS.
          </h2>
        </div>

        {/* Accordion List */}
        <div className="space-y-3 font-mono">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className="bg-[#0e0e0e] border border-[#222222] rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-[#141414] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-500 text-xs font-semibold">
                      [ Q.0{idx + 1} ]
                    </span>
                    <span className="text-sm font-semibold text-white tracking-wide">
                      {faq.q}
                    </span>
                  </div>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-neutral-400 shrink-0"
                  >
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-xs text-neutral-400 font-sans leading-relaxed border-t border-[#1a1a1a]">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
