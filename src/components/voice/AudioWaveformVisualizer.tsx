'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioWaveformVisualizerProps {
  analyser?: AnalyserNode | null;
  isRecording: boolean;
  mode?: 'bars' | 'wave' | 'compact-bars';
  barCount?: number;
  className?: string;
  color?: 'sun' | 'gradient' | 'white';
}

export default function AudioWaveformVisualizer({
  analyser,
  isRecording,
  mode = 'bars',
  barCount = 7,
  className = '',
  color = 'gradient',
}: AudioWaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [barLevels, setBarLevels] = useState<number[]>(() =>
    new Array(barCount).fill(0.2)
  );
  const animFrameId = useRef<number | null>(null);

  // Frequency data loop
  useEffect(() => {
    if (!isRecording) {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      setBarLevels(new Array(barCount).fill(0.15));
      return;
    }

    let bufferLength = 32;
    let dataArray: Uint8Array<ArrayBuffer> | null = null;

    if (analyser) {
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
    }

    let simTick = 0;

    const render = () => {
      simTick += 0.08;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);

        if (mode === 'wave' && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            // Draw glowing reactive waveform
            ctx.beginPath();
            ctx.lineWidth = 2.5;

            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#ffc400');
            gradient.addColorStop(0.5, '#f43f5e');
            gradient.addColorStop(1, '#ffc400');
            ctx.strokeStyle = gradient;

            const sliceWidth = width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              const v = dataArray[i] / 255.0; // 0 to 1
              const y = (height / 2) + (v - 0.5) * height * 0.9;

              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);

              x += sliceWidth;
            }
            ctx.lineTo(width, height / 2);
            ctx.stroke();
          }
        } else {
          // Bin average for discrete bar heights
          const step = Math.max(1, Math.floor(bufferLength / barCount));
          const nextBars: number[] = [];

          for (let b = 0; b < barCount; b++) {
            let sum = 0;
            const count = Math.min(step, bufferLength - b * step);
            for (let j = 0; j < count; j++) {
              sum += dataArray[b * step + j];
            }
            const avg = count > 0 ? sum / count / 255 : 0;
            // Apply organic scaling with minimum baseline
            const scaled = Math.min(1, Math.max(0.15, avg * 1.5));
            nextBars.push(scaled);
          }
          setBarLevels(nextBars);
        }
      } else {
        // Fallback simulation when analyser is not available
        if (mode === 'wave' && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffc400';
            for (let x = 0; x < width; x += 3) {
              const y = height / 2 + Math.sin(x * 0.05 + simTick) * (height * 0.25);
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        } else {
          const nextBars = Array.from({ length: barCount }, (_, i) => {
            const base = Math.sin(simTick + i * 0.7) * 0.35 + 0.5;
            return Math.max(0.15, Math.min(0.95, base));
          });
          setBarLevels(nextBars);
        }
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };
  }, [analyser, isRecording, barCount, mode]);

  // Wave mode uses HTML5 canvas
  if (mode === 'wave') {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
        <canvas
          ref={canvasRef}
          width={180}
          height={32}
          className="h-8 w-44 rounded-full"
          aria-hidden="true"
        />
      </div>
    );
  }

  // Bars mode (discrete dynamic frequency bars)
  const isCompact = mode === 'compact-bars';

  return (
    <div
      aria-hidden="true"
      className={`inline-flex items-center justify-center gap-[3px] ${className}`}
    >
      {barLevels.map((level, idx) => {
        const heightPercent = Math.round(level * 100);

        let bgClass = 'bg-sun';
        if (color === 'white') {
          bgClass = 'bg-white';
        } else if (color === 'gradient') {
          bgClass = idx % 2 === 0 ? 'bg-gradient-to-t from-amber-400 to-sun' : 'bg-gradient-to-t from-rose-500 to-amber-300';
        }

        return (
          <span
            key={idx}
            className={`block rounded-full transition-all duration-75 ease-out ${bgClass} ${
              isCompact ? 'w-1' : 'w-1.5'
            }`}
            style={{
              height: `${Math.max(isCompact ? 4 : 6, (isCompact ? 22 : 32) * (heightPercent / 100))}px`,
              opacity: Math.max(0.4, level),
            }}
          />
        );
      })}
    </div>
  );
}

