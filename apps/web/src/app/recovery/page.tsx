"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/nothing/Navbar";
import { Footer } from "@/components/nothing/Footer";
import { Button } from "@/components/nothing/Button";
import { apiFetch } from "@/lib/api";

interface RecoveryOption {
  id: string;
  title: string;
  desc: string;
}

const options: RecoveryOption[] = [
  {
    id: "password",
    title: "01 // FORGOT PASSWORD",
    desc: "Send an instant one-time cryptographic reset link to your registered email address.",
  },
  {
    id: "email",
    title: "02 // LOST EMAIL ACCESS",
    desc: "Verify identity via connected Discord OAuth or backup recovery key.",
  },
  {
    id: "2fa",
    title: "03 // LOST TWO-FACTOR AUTH (2FA)",
    desc: "Reset your authenticator device using your 16-character emergency recovery secret.",
  },
  {
    id: "security",
    title: "04 // ACCOUNT SECURITY & HIJACK",
    desc: "Freeze account sessions and initiate security audit verification.",
  },
];

export default function RecoveryPage() {
  const [selectedId, setSelectedId] = useState("password");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [serverMessage, setServerMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email }),
      });
      const data = await res.json();
      setServerMessage(data.message || "Recovery instructions dispatched.");
      setSubmitted(true);
    } catch {
      setServerMessage("We have received your recovery request. If an account matches, instructions will be delivered.");
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-mono selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 nt-dot-grid">
        <div className="w-full max-w-xl bg-[#0d0d0d] border border-[#242424] rounded-2xl p-8 space-y-8 shadow-2xl nt-crosshair">
          {/* Header */}
          <div className="space-y-1.5 text-center">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
              [ ACCESS RECOVERY // TELEMETRY PROTOCOL ]
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              ACCOUNT RECOVERY.
            </h1>
            <p className="text-xs text-neutral-400 font-sans">
              Select your issue and initiate automated account restoration.
            </p>
          </div>

          {submitted ? (
            <div className="bg-[#121212] border border-[#2c2c2c] rounded-xl p-8 text-center space-y-4">
              <CheckCircle2 size={40} className="text-white mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-white">RESTORATION INITIATED</h3>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  {serverMessage || `We have dispatched recovery instructions to ${email}. Please check your inbox and spam folder.`}
                </p>
              </div>
              <Button variant="solid-white" href="/login" className="text-xs">
                RETURN TO SIGN IN
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Option Selector */}
              <div className="space-y-2">
                <label className="text-[11px] text-neutral-400 font-semibold block">
                  IDENTIFY YOUR RECOVERY SCENARIO:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {options.map((opt) => {
                    const isSelected = selectedId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedId(opt.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#181818] border-white text-white shadow"
                            : "bg-[#101010] border-[#222222] text-neutral-400 hover:text-white hover:border-[#383838]"
                        }`}
                      >
                        <p className="font-semibold text-xs mb-1">{opt.title}</p>
                        <p className="text-[10px] text-neutral-500 leading-relaxed font-sans">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recovery Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] text-neutral-400 font-semibold">
                    REGISTERED EMAIL OR HANDLE
                  </label>
                  <div className="flex items-center bg-[#121212] border border-[#242424] focus-within:border-white rounded-lg px-3 py-2 transition-colors">
                    <Mail size={14} className="text-neutral-500 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="account@domain.com or username"
                      className="bg-transparent flex-1 text-white text-xs placeholder:text-neutral-600 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <Button
                  variant="solid-white"
                  type="submit"
                  loading={loading}
                  className="w-full justify-center text-xs py-3"
                >
                  DISPATCH RECOVERY PROTOCOL <ArrowRight size={13} />
                </Button>
              </form>
            </div>
          )}

          <div className="text-center pt-2 text-xs text-neutral-500 border-t border-[#1a1a1a]">
            Remember your credentials?{" "}
            <Link href="/login" className="text-white hover:underline font-bold">
              Sign In
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

