"use client";

import React, { useState, useEffect } from "react";
import { Users, Eye, Zap, Shield } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { apiFetch } from "@/lib/api";

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
  const [platformStats, setPlatformStats] = useState<{
    totalProfiles: number;
    totalViews: number;
    totalUsers: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch("/api/platform/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setPlatformStats({
            totalProfiles: data.totalProfiles || 0,
            totalViews: data.totalViews || 0,
            totalUsers: data.totalUsers || 0,
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const stats = [
    {
      metric: platformStats ? `${platformStats.totalProfiles.toLocaleString()}` : "...",
      label: "PROFILES CREATED",
      spec: "SPEC: DISTRIBUTED BIO GRAPH",
      icon: Users,
    },
    {
      metric: platformStats ? `${platformStats.totalViews.toLocaleString()}` : "...",
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
          <span>[ METRICS // PLATFORM TELEMETRY ]</span>
          <span>SYS_METRICS: ACTIVE</span>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                variants={cardVariants}
                whileHover={{ y: -4, borderColor: "#333333" }}
                className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col justify-between transition-colors shadow-lg"
              >
                <div className="flex items-center justify-between text-neutral-500 mb-4">
                  <span className="text-[10px] font-mono tracking-wider">{stat.spec}</span>
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-center text-neutral-300">
                    <Icon size={16} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
                    {stat.metric}
                  </div>
                  <div className="text-xs font-mono text-neutral-400 font-semibold tracking-wide">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
