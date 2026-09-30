import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types/assistant';

interface AnimationControllerProps {
  state: AssistantState;
  audioLevel: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  type: 'spark' | 'petal' | 'ring';
  angle: number;
  spin: number;
}

export const AnimationController: React.FC<AnimationControllerProps> = ({ state, audioLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle pool
    const particleCount = 45;
    const particles: Particle[] = [];
    const colors = [
      'rgba(6, 182, 212, ', // Cyan
      'rgba(168, 85, 247, ', // Purple
      'rgba(236, 72, 153, ', // Pink / Sakura
      'rgba(244, 114, 182, ', // Light Sakura
      'rgba(59, 130, 246, ', // Neon Blue
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.4 - Math.random() * 0.8,
        size: 1.5 + Math.random() * 3.5,
        alpha: 0.15 + Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: Math.random() > 0.4 ? 'petal' : 'spark',
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.04,
      });
    }

    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.016;

      // Dynamic reactive intensity
      const boost = state === 'speaking' ? 1.0 + audioLevel * 2.5 : 1.0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * boost + Math.sin(t + i) * 0.3;
        p.y += p.vy * boost;
        p.angle += p.spin;

        // Wrap around
        if (p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        if (p.type === 'petal') {
          // Delicate stylized sakura petal shape
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.6);
          ctx.bezierCurveTo(p.size, -p.size, p.size * 1.2, p.size, 0, p.size * 1.4);
          ctx.bezierCurveTo(-p.size * 1.2, p.size, -p.size, -p.size, 0, -p.size * 1.6);
          ctx.fillStyle = `${p.color}${p.alpha})`;
          ctx.fill();
        } else {
          // Cyber glowing dust spark
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${p.alpha})`;
          ctx.shadowColor = `${p.color}0.8)`;
          ctx.shadowBlur = 8;
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [state, audioLevel]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Background radial ambient glow reactive to audio */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          state === 'speaking'
            ? 'opacity-80'
            : state === 'listening'
            ? 'opacity-60'
            : 'opacity-40'
        }`}
        style={{
          background: `
            radial-gradient(circle at 50% 40%, rgba(147, 51, 234, ${0.12 + audioLevel * 0.15}) 0%, transparent 60%),
            radial-gradient(circle at 50% 80%, rgba(6, 182, 212, ${0.1 + audioLevel * 0.2}) 0%, transparent 65%)
          `,
        }}
      />

      {/* Cyber Grid Subtle Lines in Floor Perspective */}
      <div
        className="absolute inset-x-0 bottom-0 h-48 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.15) 1px, transparent 1px),
            linear-gradient(to top, rgba(6, 182, 212, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
          transform: 'perspective(300px) rotateX(60deg) translateY(20px)',
          transformOrigin: 'bottom center',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1), transparent)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1), transparent)',
        }}
      />

      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
