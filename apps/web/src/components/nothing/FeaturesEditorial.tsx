"use client";

import React from "react";
import { Cpu, Palette, Radio, Shield, Music, Layers } from "lucide-react";
import { motion, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut",
    },
  },
};

export const FeaturesEditorial: React.FC = () => {
  const features = [
    {
      num: "01",
      title: "NATIVE VENCORD INTEGRATION",
      subtitle: "DISCORD RICH PRESENCE ENGINE",
      description:
        "No bulky background executables or battery-draining desktop apps. Our native PixelsRPC Vencord plugin streams your web profile's game title, details, state, and assets directly to Discord.",
      icon: Radio,
      spec: "PROTOCOL: LOCAL_ACTIVITY_UPDATE // ZERO-EVAL",
    },
    {
      num: "02",
      title: "VARIABLE THEME ARCHITECTURE",
      subtitle: "MONOCHROMATIC & DYNAMIC DEPTH",
      description:
        "Engineered with CSS custom properties. Configure card blur, opacity, corner radii, borders, and dot-matrix backgrounds with instant real-time live preview.",
      icon: Palette,
      spec: "STYLE: INDUSTRIAL NOT-PHONE OS DESIGN",
    },
    {
      num: "03",
      title: "HARDWARE-INSPIRED AUDIO ENGINE",
      subtitle: "INTERACTIVE SCRUBBING & AUTOPLAY",
      description:
        "Equipped with an interactive vinyl/disc player, volume slider, progress scrubbing, and an introductory click barrier that conforms strictly with browser autoplay standards.",
      icon: Music,
      spec: "AUDIO: HTML5 STREAMING // SOUND ENGINE",
    },
    {
      num: "04",
      title: "EDGE TELEMETRY & PRIVACY",
      subtitle: "ZERO-COOKIE ANALYTICS TRACKER",
      description:
        "High-performance profile view tracking executed at the edge with zero third-party tracking cookies or invasive scripts. Completely private, fast, and GDPR-compliant.",
      icon: Shield,
      spec: "METRICS: VIEW DEDUPLICATION ENGINE",
    },
    {
      num: "05",
      title: "MULTI-LAYERED BUTTON SYSTEM",
      subtitle: "ACTION CARDS & SOCIAL LINKS",
      description:
        "Add custom action buttons, external links, social icons, and gradient pills with custom subtitle annotations and open-in-new-tab flags.",
      icon: Layers,
      spec: "LINKS: SORTABLE ORDER // EXTENSIBLE",
    },
    {
      num: "06",
      title: "HARDWARE PERFORMANCE CORE",
      subtitle: "NEXT.JS 16 TURBOPACK & SUPABASE",
      description:
        "Powered by Next.js App Router, Prisma ORM, and Supabase Postgres. Delivers sub-15ms page loads and instantaneous state hydration across all devices.",
      icon: Cpu,
      spec: "INFRASTRUCTURE: SERVERLESS EDGE CACHING",
    },
  ];

  return (
    <section id="features" className="w-full bg-[#070707] py-24 px-4 sm:px-6 border-b border-[#1a1a1a]">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-3 text-left">
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
            [ 03 // ARCHITECTURAL SYSTEM CAPABILITIES ]
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-mono">
            NOTHING SUPERFLUOUS.
          </h2>
          <p className="text-sm text-neutral-400 font-mono max-w-xl">
            Every feature is intentionally calibrated for technical performance, speed, and strict aesthetic coherence.
          </p>
        </div>

        {/* Feature Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f) => (
            <motion.div
              key={f.num}
              variants={cardVariants}
              whileHover={{ y: -4, borderColor: "#454545", transition: { duration: 0.2 } }}
              className="bg-[#0c0c0c] border border-[#202020] rounded-2xl p-6 flex flex-col justify-between space-y-6 relative nt-crosshair group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-neutral-500 font-mono text-xs">
                  <span className="text-neutral-400 group-hover:text-white transition-colors">{`SYS.${f.num}`}</span>
                  <f.icon size={18} className="text-neutral-400 group-hover:text-white transition-colors" />
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-mono text-neutral-500 tracking-wider">
                    {f.subtitle}
                  </p>
                  <h3 className="text-lg font-bold font-mono text-white tracking-tight">
                    {f.title}
                  </h3>
                </div>

                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  {f.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#1a1a1a] flex items-center justify-between text-[10px] font-mono text-neutral-600 group-hover:text-neutral-500 transition-colors">
                <span>{f.spec}</span>
                <span>STATUS: OPERATIONAL</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
