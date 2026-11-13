'use client';

import { useEffect, useRef } from 'react';

interface DialectNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  sub: string;
  color: string;
  phase: number;
  phaseSpeed: number;
}

const REGIONAL_DIALECTS = [
  { code: 'Lug', name: 'Luganda', color: '#ffc400' },
  { code: 'Swa', name: 'Swahili', color: '#38bdf8' },
  { code: 'Ach', name: 'Acholi', color: '#34d399' },
  { code: 'Teo', name: 'Ateso', color: '#fb923c' },
  { code: 'Nyn', name: 'Runyankole', color: '#a78bfa' },
  { code: 'Eng', name: 'English', color: '#94a3b8' },
  { code: 'Luo', name: 'Dholuo', color: '#2dd4bf' },
  { code: 'Kik', name: 'Kikuyu', color: '#f472b6' },
  { code: 'Kin', name: 'Kinyarwanda', color: '#facc15' },
  { code: 'Aka', name: 'Akan', color: '#818cf8' },
  { code: 'Yor', name: 'Yorùbá', color: '#fb7185' },
  { code: 'Hau', name: 'Hausa', color: '#4ade80' },
  { code: 'Som', name: 'Somali', color: '#67e8f9' },
  { code: 'Amh', name: 'Amharic', color: '#e879f9' },
  { code: 'Olg', name: 'Oluganda', color: '#fcd34d' },
  { code: 'Ksw', name: 'Kiswahili', color: '#60a5fa' },
];

export default function AmbientLanguageCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let mouseX = -9999;
    let mouseY = -9999;
    let targetMouseX = -9999;
    let targetMouseY = -9999;
    let isVisible = true;
    let isReducedMotion = false;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    const nodes: DialectNode[] = [];

    function resize(): void {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.scale(dpr, dpr);

      // Populate nodes based on viewport size
      const count = width < 640 ? 11 : width < 1024 ? 16 : 22;
      if (nodes.length === 0) {
        for (let i = 0; i < count; i++) {
          const item = REGIONAL_DIALECTS[i % REGIONAL_DIALECTS.length];
          nodes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            radius: Math.random() * 8 + 14,
            label: item.code,
            sub: item.name,
            color: item.color,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: Math.random() * 0.015 + 0.008,
          });
        }
      } else {
        // Adjust bounds
        nodes.forEach((node) => {
          if (node.x > width) node.x = width - 20;
          if (node.y > height) node.y = height - 20;
        });
      }
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const handlePointerMove = (e: MouseEvent | TouchEvent): void => {
      if ('touches' in e && e.touches.length > 0) {
        targetMouseX = e.touches[0].clientX;
        targetMouseY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        targetMouseX = e.clientX;
        targetMouseY = e.clientY;
      }
    };

    const handlePointerLeave = (): void => {
      targetMouseX = -9999;
      targetMouseY = -9999;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave, { passive: true });
    window.addEventListener('touchend', handlePointerLeave, { passive: true });

    const handleVisibility = (): void => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let lastTime = performance.now();

    function render(currentTime: number): void {
      if (!ctx || !isVisible) return;

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.12;
      mouseY += (targetMouseY - mouseY) * 0.12;

      ctx.clearRect(0, 0, width, height);

      // Check dark mode
      const isDarkMode = document.documentElement.getAttribute('data-color-mode') === 'dark';
      const maxConnectDist = width < 640 ? 100 : 145;

      // 1. Draw constellation lines between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const alpha = (1 - dist / maxConnectDist) * (isDarkMode ? 0.12 : 0.08);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = isDarkMode ? `rgba(255, 196, 0, ${alpha})` : `rgba(0, 23, 49, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // 2. Update and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!isReducedMotion) {
          // Bobbing phase
          node.phase += node.phaseSpeed;
          const bobX = Math.sin(node.phase) * 0.25;
          const bobY = Math.cos(node.phase) * 0.35;

          node.x += node.vx + bobX;
          node.y += node.vy + bobY;

          // Mouse spring push (gentle antigravity repulsion)
          const mdx = node.x - mouseX;
          const mdy = node.y - mouseY;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          const pushRadius = 140;

          if (mdist < pushRadius && mdist > 1) {
            const force = (1 - mdist / pushRadius) * 1.5;
            node.x += (mdx / mdist) * force;
            node.y += (mdy / mdist) * force;
          }

          // Screen boundaries wrap smoothly
          const pad = node.radius + 15;
          if (node.x < -pad) node.x = width + pad;
          if (node.x > width + pad) node.x = -pad;
          if (node.y < -pad) node.y = height + pad;
          if (node.y > height + pad) node.y = -pad;
        }

        // Draw soft ambient outer glow
        const glowGrad = ctx.createRadialGradient(
          node.x,
          node.y,
          node.radius * 0.3,
          node.x,
          node.y,
          node.radius * 2.2,
        );
        glowGrad.addColorStop(0, `${node.color}${isDarkMode ? '25' : '18'}`);
        glowGrad.addColorStop(1, `${node.color}00`);

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Draw node body
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDarkMode ? 'rgba(15, 23, 34, 0.75)' : 'rgba(255, 255, 255, 0.85)';
        ctx.fill();

        // Node subtle border
        ctx.strokeStyle = `${node.color}${isDarkMode ? '60' : '45'}`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node center dialect text
        ctx.font = `600 ${Math.max(9, Math.floor(node.radius * 0.65))}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDarkMode ? '#f1f5f9' : '#0f172a';
        ctx.fillText(node.label, node.x, node.y);
      }

      if (!isReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('touchend', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none transition-opacity duration-700 ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full opacity-65 dark:opacity-75"
      />
    </div>
  );
}

