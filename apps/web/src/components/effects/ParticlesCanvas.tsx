"use client";

import { useEffect, useRef } from 'react';

type ParticleType = 'Snow' | 'Stars' | 'Fireflies' | 'None';

export function ParticlesCanvas({ type, color }: { type: string, color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (type === 'None') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particlesArray: any[] = [];
    let animationFrameId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    const init = () => {
      particlesArray = [];
      const numberOfParticles = type === 'Stars' ? 150 : (type === 'Snow' ? 100 : 50);
      
      for (let i = 0; i < numberOfParticles; i++) {
        let size = Math.random() * (type === 'Snow' ? 3 : 2) + 1;
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        let speedX = type === 'Fireflies' ? (Math.random() * 1 - 0.5) : (type === 'Snow' ? (Math.random() * 1 - 0.5) : 0);
        let speedY = type === 'Fireflies' ? (Math.random() * 1 - 0.5) : (type === 'Snow' ? (Math.random() * 1 + 0.5) : 0);
        let opacity = Math.random() * 0.5 + 0.1;
        let pulseSpeed = type === 'Stars' ? (Math.random() * 0.02 + 0.01) : 0;
        let pColor = type === 'Fireflies' ? (color || '#eab308') : '#ffffff';
        
        particlesArray.push({ x, y, size, speedX, speedY, opacity, pulseSpeed, pColor, pulseDir: 1 });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particlesArray.length; i++) {
        const p = particlesArray[i];
        
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.pColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Update positions
        p.x += p.speedX;
        p.y += p.speedY;

        // Pulse (Stars)
        if (type === 'Stars') {
          p.opacity += p.pulseSpeed * p.pulseDir;
          if (p.opacity <= 0.1) p.pulseDir = 1;
          if (p.opacity >= 0.8) p.pulseDir = -1;
        }

        // Loop around edges
        if (p.y > canvas.height) p.y = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [type, color]);

  if (type === 'None') return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
