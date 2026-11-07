"use client";

import React from "react";
import { Users, Eye, Zap, Shield } from "lucide-react";
import { motion, type Variants } from "framer-motion";

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

export const StatsSection: React.FC = () => {
  const stats = [
    {
      metric: "1,420,000+",
      label: "PROFILES CREATED",
      spec: "SPEC: DISTRIBUTED BIO GRAPH",
      icon: Users,
    },
    {
      metric: "84,000,000+",
      label: "TOTAL PROFILE VIEWS",
      spec: "STREAM: EDGE TELEMETRY",
      icon: Eye,
    },
    {
      metric: "< 12 MS",
      label: "RPC LATENCY",
      spec: "PROTOCOL: NATIVE VENCORD",
      icon: Zap,
    },
    {
      metric: "99.99%",
      label: "SYSTEM AVAILABILITY",
      spec: "SLA: ZERO DOWNTIME CLUSTER",
      icon: Shield,
    },
  ];

  return (
    <section className="w-full bg-[#070707] border-b border-[#1a1a1a] py-14 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between text-xs font-mono text-neutral-500">
          <span className="flex items-center gap-1.5 text-neutral-400">
            [ 01 // TELEMETRY DATA ]
          </span>
          <span>GLOBAL PLATFORM READOUT</span>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((s, idx) => (
            <motion.div
              key={s.label}
              variants={cardVariants}
              whileHover={{ y: -4, borderColor: "#4f4f4f", transition: { duration: 0.2 } }}
              className="bg-[#0f0f0f] border border-[#222222] rounded-xl p-5 space-y-3 relative nt-crosshair cursor-default group"
            >
              <div className="flex items-center justify-between text-neutral-500">
                <span className="font-mono text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors">
                  {`FIG. 0${idx + 1}`}
                </span>
                <s.icon size={16} className="text-neutral-400 group-hover:text-white transition-colors" />
              </div>

              <div className="text-3xl font-bold font-mono tracking-tight text-white">
                {s.metric}
              </div>

              <div className="space-y-0.5">
                <p className="text-xs font-mono font-semibold text-neutral-300 tracking-wider">
                  {s.label}
                </p>
                <p className="text-[10px] font-mono text-neutral-600 group-hover:text-neutral-500 transition-colors">
                  {s.spec}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
