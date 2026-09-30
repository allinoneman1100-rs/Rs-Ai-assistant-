import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types/assistant';

interface AudioWaveformProps {
  state: AssistantState;
  audioLevel: number;
  frequencies?: Uint8Array<ArrayBuffer> | null;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ state, audioLevel, frequencies }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 36;
      const barWidth = Math.floor(width / barCount) - 2;

      // Draw futuristic equalizer bars centered vertically
      for (let i = 0; i < barCount; i++) {
        let value = 0;

        if (frequencies && frequencies.length > 0) {
          // Map to frequency index
          const freqIndex = Math.floor((i / barCount) * Math.min(frequencies.length, 64));
          value = frequencies[freqIndex] / 255;
        } else if (state === 'speaking' || state === 'listening') {
          // Generative wave if exact telemetry not populated yet
          const freq = (i / barCount) * Math.PI * 4;
          const time = Date.now() / 150;
          value = (Math.sin(freq + time) * 0.5 + 0.5) * audioLevel;
        } else {
          // Idle low ambient flicker
          value = 0.04 + Math.sin(Date.now() / 400 + i * 0.4) * 0.03;
        }

        const barHeight = Math.max(4, value * (height * 0.85));
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        // Gradient based on state
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (state === 'speaking') {
          gradient.addColorStop(0, '#06b6d4'); // Cyan
          gradient.addColorStop(0.5, '#3b82f6'); // Blue
          gradient.addColorStop(1, '#a855f7'); // Purple
        } else if (state === 'listening') {
          gradient.addColorStop(0, '#ec4899'); // Pink
          gradient.addColorStop(0.5, '#f43f5e'); // Rose
          gradient.addColorStop(1, '#8b5cf6'); // Violet
        } else if (state === 'thinking') {
          gradient.addColorStop(0, '#a855f7');
          gradient.addColorStop(1, '#6366f1');
        } else {
          gradient.addColorStop(0, '#475569');
          gradient.addColorStop(1, '#1e293b');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        // Pill-shaped bars
        const radius = Math.min(barWidth / 2, barHeight / 2);
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, audioLevel, frequencies]);

  return (
    <div className="w-full flex items-center justify-center py-1">
      <canvas
        ref={canvasRef}
        width={260}
        height={48}
        className="max-w-full drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]"
      />
    </div>
  );
};
