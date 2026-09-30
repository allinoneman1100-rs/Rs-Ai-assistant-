import React, { useEffect, useRef, useState } from 'react';
import { AssistantState, ChromaSettings } from '../types/assistant';

// Import sprite assets
import idleSrc from '../assets/character/idle.jpg';
import speakSrc from '../assets/character/speak.jpg';
import blinkSrc from '../assets/character/blink.jpg';

interface CharacterRendererProps {
  state: AssistantState;
  audioLevel: number; // 0..1
  chromaSettings?: ChromaSettings;
  customVideoUrl?: string | null;
  zoomScale?: number; // 0.75 .. 1.35
  themeColor?: 'cyan' | 'pink' | 'purple' | 'emerald';
  onUploadVideo?: (file: File) => void;
}

const DEFAULT_CHROMA: ChromaSettings = {
  keyColor: '#00ff00',
  similarity: 0.38,
  smoothness: 0.12,
  despill: 0.85,
};

export const CharacterRenderer: React.FC<CharacterRendererProps> = ({
  state,
  audioLevel,
  chromaSettings = DEFAULT_CHROMA,
  customVideoUrl,
  zoomScale = 1.0,
  themeColor = 'cyan',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Cached pre-keyed canvas frames for lightning-fast 60 FPS mobile performance
  const keyedIdleRef = useRef<HTMLCanvasElement | null>(null);
  const keyedSpeakRef = useRef<HTMLCanvasElement | null>(null);
  const keyedBlinkRef = useRef<HTMLCanvasElement | null>(null);

  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [useVideo, setUseVideo] = useState(false);

  // Animation states
  const blinkTimerRef = useRef<number>(0);
  const isBlinkingRef = useRef<boolean>(false);
  const blinkDurationRef = useRef<number>(160);
  const animFrameRef = useRef<number>(0);

  // Chroma keying function that processes an image/canvas and returns a transparent canvas
  const processChromaKey = (
    img: HTMLImageElement | HTMLVideoElement,
    settings: ChromaSettings
  ): HTMLCanvasElement => {
    const width = img instanceof HTMLVideoElement ? img.videoWidth || 720 : img.naturalWidth || 720;
    const height = img instanceof HTMLVideoElement ? img.videoHeight || 1280 : img.naturalHeight || 1280;

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return offscreen;

    ctx.drawImage(img, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Parse target key color (e.g. #00ff00)
    const hex = settings.keyColor.replace('#', '');
    const keyR = parseInt(hex.substring(0, 2), 16) || 0;
    const keyG = parseInt(hex.substring(2, 4), 16) || 255;
    const keyB = parseInt(hex.substring(4, 6), 16) || 0;

    const threshold = settings.similarity * 255;
    const smoothRange = settings.smoothness * 255;
    const despillStrength = settings.despill;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Green screen detector: green channel dominance over red and blue
      const maxRB = Math.max(r, b);
      const greenDiff = g - maxRB;

      // Also Euclidean distance to target key color
      const dist = Math.sqrt((r - keyR) ** 2 + (g - keyG) ** 2 + (b - keyB) ** 2);

      let alpha = 255;

      if (greenDiff > 25 && dist < threshold + smoothRange) {
        if (dist <= threshold) {
          alpha = 0;
        } else {
          // Smooth edge falloff
          const edgeFraction = (dist - threshold) / smoothRange;
          alpha = Math.max(0, Math.min(255, Math.floor(edgeFraction * 255)));
        }
      }

      // Despill green fringe around hair and edges
      if (alpha > 0 && g > maxRB) {
        const despilledG = Math.floor(g * (1 - despillStrength) + maxRB * despillStrength);
        data[i + 1] = despilledG;
      }

      data[i + 3] = alpha;
    }

    ctx.putImageData(imgData, 0, 0);
    return offscreen;
  };

  // Load and pre-key sprite assets
  useEffect(() => {
    let isCancelled = false;

    const loadSprites = async () => {
      try {
        const loadImage = (src: string): Promise<HTMLImageElement> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        };

        const [idleImg, speakImg, blinkImg] = await Promise.all([
          loadImage(idleSrc),
          loadImage(speakSrc),
          loadImage(blinkSrc),
        ]);

        if (isCancelled) return;

        // Pre-key all three sprites once
        keyedIdleRef.current = processChromaKey(idleImg, chromaSettings);
        keyedSpeakRef.current = processChromaKey(speakImg, chromaSettings);
        keyedBlinkRef.current = processChromaKey(blinkImg, chromaSettings);

        setAssetsLoaded(true);
      } catch (err) {
        console.error('[CharacterRenderer] Failed to load sprite assets:', err);
      }
    };

    loadSprites();

    return () => {
      isCancelled = true;
    };
  }, [chromaSettings]);

  // Handle custom video if provided
  useEffect(() => {
    if (customVideoUrl && videoRef.current) {
      videoRef.current.src = customVideoUrl;
      videoRef.current.play().catch(() => {});
      setUseVideo(true);
    } else {
      setUseVideo(false);
    }
  }, [customVideoUrl]);

  // Main 60 FPS Render Loop
  useEffect(() => {
    if (!assetsLoaded && !useVideo) return;

    let startTime = performance.now();
    let nextBlinkTime = startTime + 3000 + Math.random() * 2500;

    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Responsive canvas sizing
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.clearRect(0, 0, targetW, targetH);

      // Handle Blinking Timer
      if (time >= nextBlinkTime && !isBlinkingRef.current) {
        isBlinkingRef.current = true;
        blinkTimerRef.current = time;
        nextBlinkTime = time + 3200 + Math.random() * 3000;
      }

      if (isBlinkingRef.current && time - blinkTimerRef.current > blinkDurationRef.current) {
        isBlinkingRef.current = false;
      }

      // Compute dynamic transform offsets:
      // 1. Idle breathing: smooth sinusoidal float & subtle chest scale
      const elapsed = (time - startTime) / 1000;
      const breathPhase = Math.sin(elapsed * 1.8);
      const swayPhase = Math.cos(elapsed * 1.2);

      let offsetY = breathPhase * (4 * dpr);
      let offsetX = swayPhase * (2 * dpr);
      let scale = 1.0 + breathPhase * 0.006;
      let rotation = (swayPhase * 0.4 * Math.PI) / 180;

      // 2. Extra speaking / listening gestures
      if (state === 'speaking') {
        const speakBounce = Math.sin(elapsed * 6.0) * (audioLevel * 6 * dpr);
        offsetY += speakBounce;
        scale += audioLevel * 0.02;
        rotation += (Math.sin(elapsed * 4.0) * 0.8 * Math.PI) / 180;
      } else if (state === 'listening') {
        // Attentive slight head tilt
        rotation += (1.2 * Math.PI) / 180;
        offsetY += 2 * dpr;
      } else if (state === 'thinking') {
        // Thoughtful upward glance tilt
        rotation -= (1.0 * Math.PI) / 180;
        offsetY -= 3 * dpr;
      }

      // Choose which frame to display:
      let activeSourceCanvas: HTMLCanvasElement | null = null;

      if (useVideo && videoRef.current && !videoRef.current.paused) {
        // Real-time video chroma keying
        activeSourceCanvas = processChromaKey(videoRef.current, chromaSettings);
      } else {
        // Sprite based rendering with lip-sync and blinking
        const isBlink = isBlinkingRef.current;
        const isMouthOpen = state === 'speaking' && audioLevel > 0.06;

        if (isBlink) {
          activeSourceCanvas = keyedBlinkRef.current || keyedIdleRef.current;
        } else if (isMouthOpen) {
          activeSourceCanvas = keyedSpeakRef.current || keyedIdleRef.current;
        } else {
          activeSourceCanvas = keyedIdleRef.current;
        }
      }

      if (activeSourceCanvas && activeSourceCanvas.width > 0 && activeSourceCanvas.height > 0) {
        ctx.save();

        // Center point for scale and rotation
        const centerX = targetW / 2 + offsetX;
        const centerY = targetH * 0.52 + offsetY;

        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        ctx.scale(scale * zoomScale, scale * zoomScale);

        // Aspect ratio calculations: fit within mobile screen bounds while preserving character
        const srcW = activeSourceCanvas.width;
        const srcH = activeSourceCanvas.height;
        const srcRatio = srcW / srcH;
        const canvasRatio = targetW / targetH;

        let drawW: number;
        let drawH: number;

        if (canvasRatio > srcRatio) {
          // Screen is wider: fit by height
          drawH = targetH * 0.94;
          drawW = drawH * srcRatio;
        } else {
          // Screen is taller: fit by width
          drawW = targetW * 0.96;
          drawH = drawW / srcRatio;
        }

        // Draw centered
        ctx.drawImage(
          activeSourceCanvas,
          -drawW / 2,
          -drawH / 2,
          drawW,
          drawH
        );

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [assetsLoaded, useVideo, state, audioLevel, chromaSettings, zoomScale]);

  const getAuraColor = () => {
    if (state === 'speaking') {
      return themeColor === 'pink' ? 'bg-pink-500/35' : themeColor === 'purple' ? 'bg-purple-500/35' : themeColor === 'emerald' ? 'bg-emerald-500/35' : 'bg-cyan-500/35';
    }
    if (state === 'listening') {
      return 'bg-pink-500/25';
    }
    if (state === 'paused') {
      return 'bg-amber-500/20';
    }
    if (state === 'thinking') {
      return 'bg-purple-500/30';
    }
    return 'bg-indigo-500/15';
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none select-none overflow-hidden">
      {/* Hidden video element for custom video chroma-key playback */}
      <video
        ref={videoRef}
        playsInline
        muted
        loop
        className="hidden"
      />

      {/* Main High-Performance Character Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
      />

      {/* Futuristic Holographic Aura Ring */}
      <div
        className={`absolute inset-x-0 bottom-4 mx-auto w-64 h-8 rounded-full blur-xl pointer-events-none transition-all duration-700 ${getAuraColor()} ${
          state === 'speaking'
            ? 'scale-125'
            : state === 'listening'
            ? 'scale-100'
            : 'scale-90'
        }`}
      />
    </div>
  );
};
