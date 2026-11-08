"use client";

import React, { useEffect, useRef } from "react";
import { ParticleEffect } from "@/types/studio";

interface ParticlesCanvasProps {
  effect: ParticleEffect;
  accentColor?: string;
  className?: string;
}

export const ParticlesCanvas: React.FC<ParticlesCanvasProps> = ({
  effect,
  accentColor = "#ffffff",
  className = "absolute inset-0 pointer-events-none z-0",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (effect === "None") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle item definitions
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      char?: string;
    }

    const count = effect === "Matrix" ? 40 : 60;
    const particles: Particle[] = [];
    const matrixChars = "0101PIXELGG01アイウエオカキクケコサシスセソ";

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: effect === "Snow" ? (Math.random() - 0.5) * 0.8 : effect === "Rain" ? 0 : (Math.random() - 0.5) * 0.5,
        vy: effect === "Snow" ? Math.random() * 1.5 + 0.5 : effect === "Rain" ? Math.random() * 5 + 4 : effect === "Matrix" ? Math.random() * 3 + 2 : (Math.random() - 0.5) * 0.5,
        size: effect === "Rain" ? Math.random() * 8 + 6 : Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.6 + 0.2,
        char: matrixChars[Math.floor(Math.random() * matrixChars.length)],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Reset off-screen particles
        if (p.y > height) {
          p.y = 0;
          p.x = Math.random() * width;
        } else if (p.y < 0) {
          p.y = height;
        }
        if (p.x > width) p.x = 0;
        else if (p.x < 0) p.x = width;

        if (effect === "Matrix") {
          ctx.fillStyle = accentColor;
          ctx.font = "12px monospace";
          ctx.globalAlpha = p.opacity;
          ctx.fillText(p.char || "1", p.x, p.y);
        } else if (effect === "Rain") {
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1;
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + p.size);
          ctx.stroke();
        } else if (effect === "Stars" || effect === "Fireflies") {
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = Math.abs(Math.sin(Date.now() * 0.002 + i)) * p.opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Snow
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [effect, accentColor]);

  if (effect === "None") return null;

  return <canvas ref={canvasRef} className={className} />;
};
