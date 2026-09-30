import React, { useEffect, useRef, useState } from 'react';
import {
  Power,
  Mic,
  MicOff,
  Pause,
  Play,
  Sliders,
  Shield,
  Radio,
  Sparkles,
  AlertCircle,
  HelpCircle,
  LayoutGrid,
  Volume2,
  Wand2,
  Smartphone,
} from 'lucide-react';
import {
  AssistantSettings,
  AssistantState,
  PermissionRecord,
  ToolExecutionRecord,
} from '../types/assistant';
import { LiveSession } from '../services/LiveSession';
import { permissionManager } from '../services/PermissionManager';
import { toolManager } from '../services/ToolManager';
import { CharacterRenderer } from './CharacterRenderer';
import { AnimationController } from './AnimationController';
import { AudioWaveform } from './AudioWaveform';
import { PermissionModal } from './PermissionModal';
import { ActionHUD } from './ActionHUD';
import { SettingsModal } from './SettingsModal';
import { APKModal } from './APKModal';

export const AppController: React.FC = () => {
  // Assistant connection & operational state
  const [state, setState] = useState<AssistantState>('disconnected');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [frequencies, setFrequencies] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);

  // Comprehensive Assistant Settings
  const [settings, setSettings] = useState<AssistantSettings>({
    voice: 'Aoede',
    language: 'en-US',
    personalityTone: 'witty',
    micSensitivity: 0.015,
    outputVolume: 1.0,
    noiseSuppression: true,
    echoCancellation: true,
    characterZoom: 1.0,
    themeColor: 'cyan',
    showParticles: true,
    chroma: {
      keyColor: '#00ff00',
      similarity: 0.38,
      smoothness: 0.12,
      despill: 0.85,
    },
  });

  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);

  // Modals & Popups (all centered over the model)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isToolsHUDOpen, setIsToolsHUDOpen] = useState(false);
  const [isAPKModalOpen, setIsAPKModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Permissions & Tools
  const [permissions, setPermissions] = useState<PermissionRecord[]>(permissionManager.getAll());
  const [pendingTool, setPendingTool] = useState<ToolExecutionRecord | null>(null);
  const [lastExecutedTool, setLastExecutedTool] = useState<ToolExecutionRecord | null>(null);

  // Live session ref
  const liveSessionRef = useRef<LiveSession | null>(null);
  const animTelemetryRef = useRef<number>(0);

  // Listen for native Android PWA / WebAPK install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallDirect = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsAPKModalOpen(false);
      }
    } else {
      // In browsers where the event already passed or running inside frame
      alert("On Android: tap the 3 dots (⋮) menu in Chrome, then select 'Install app' or 'Add to Home screen' to generate the WebAPK!");
    }
  };

  // Initialize LiveSession
  useEffect(() => {
    const session = new LiveSession({
      voice: settings.voice,
      language: settings.language,
      personalityTone: settings.personalityTone,
      micSensitivity: settings.micSensitivity,
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      onStateChange: (newState) => {
        setState(newState);
        if (newState !== 'error') setErrorMessage(null);
      },
      onError: (err) => {
        setErrorMessage(err);
      },
    });

    liveSessionRef.current = session;

    // Check first launch onboarding
    if (permissionManager.isInitialLaunch()) {
      setIsOnboardingOpen(true);
    }

    // Subscribe to PermissionManager
    const unsubPerms = permissionManager.subscribe(() => {
      setPermissions(permissionManager.getAll());
    });

    // Subscribe to ToolManager
    const unsubTools = toolManager.subscribe(() => {
      setPendingTool(toolManager.getPendingTool());
      const history = toolManager.getHistory();
      if (history.length > 0) {
        setLastExecutedTool(history[0]);
      }
    });

    return () => {
      session.disconnect();
      unsubPerms();
      unsubTools();
      if (animTelemetryRef.current) {
        cancelAnimationFrame(animTelemetryRef.current);
      }
    };
  }, []);

  // Update session parameters when settings change
  const handleSettingsChange = (newSettings: AssistantSettings) => {
    const prevVoice = settings.voice;
    const prevLang = settings.language;
    const prevTone = settings.personalityTone;

    setSettings(newSettings);

    const session = liveSessionRef.current;
    if (session) {
      session.updateConfig({
        voice: newSettings.voice,
        language: newSettings.language,
        personalityTone: newSettings.personalityTone,
        micSensitivity: newSettings.micSensitivity,
        echoCancellation: newSettings.echoCancellation,
        noiseSuppression: newSettings.noiseSuppression,
      });

      const streamer = session.getAudioStreamer();
      streamer.setOutputVolume(newSettings.outputVolume);
      streamer.setSensitivity(newSettings.micSensitivity);

      // If voice, language or tone changed while connected, reconnect session
      if (
        state !== 'disconnected' &&
        state !== 'error' &&
        (prevVoice !== newSettings.voice ||
          prevLang !== newSettings.language ||
          prevTone !== newSettings.personalityTone)
      ) {
        session.disconnect();
        setTimeout(() => {
          session.connect();
        }, 300);
      }
    }
  };

  // 60 FPS Telemetry Loop (Telemetry feeds lip-sync & visualizers)
  useEffect(() => {
    const pollTelemetry = () => {
      const streamer = liveSessionRef.current?.getAudioStreamer();
      if (streamer) {
        if (state === 'speaking') {
          const out = streamer.getOutputTelemetry();
          setAudioLevel(out.amplitude);
          setFrequencies(out.frequencies);
        } else if (state === 'listening') {
          const inp = streamer.getInputTelemetry();
          setAudioLevel(inp.amplitude);
          setFrequencies(inp.frequencies);
        } else {
          setAudioLevel(0);
          setFrequencies(null);
        }
      }
      animTelemetryRef.current = requestAnimationFrame(pollTelemetry);
    };

    animTelemetryRef.current = requestAnimationFrame(pollTelemetry);
    return () => {
      if (animTelemetryRef.current) {
        cancelAnimationFrame(animTelemetryRef.current);
      }
    };
  }, [state]);

  // Main Connect / Disconnect Power toggle
  const togglePower = async () => {
    const session = liveSessionRef.current;
    if (!session) return;

    if (state === 'disconnected' || state === 'error') {
      if (!permissionManager.hasPermission('microphone')) {
        const res = await permissionManager.requestPermission('microphone');
        if (res !== 'granted') {
          setErrorMessage('Microphone access is required for real-time live voice.');
          return;
        }
      }
      setErrorMessage(null);
      await session.connect();
    } else {
      session.disconnect();
    }
  };

  // Pause / Resume Toggle
  const togglePause = () => {
    const session = liveSessionRef.current;
    if (!session) return;

    if (state === 'paused') {
      session.resume();
    } else if (state === 'listening' || state === 'speaking' || state === 'thinking') {
      session.pause();
    }
  };

  // Mute / Unmute Microphone Toggle
  const toggleMute = () => {
    const session = liveSessionRef.current;
    if (!session) return;
    const streamer = session.getAudioStreamer();
    const newMuted = !isMicMuted;
    streamer.setMuted(newMuted);
    setIsMicMuted(newMuted);
  };

  // Tap on Central Microphone
  const handleMicTap = () => {
    const session = liveSessionRef.current;
    if (!session) return;

    if (state === 'disconnected' || state === 'error') {
      togglePower();
    } else if (state === 'paused') {
      session.resume();
    } else if (state === 'speaking') {
      // User tapped to interrupt speaking assistant
      session.getAudioStreamer().stopPlayback();
    }
  };

  // Upload custom green screen video
  const handleUploadCustomVideo = (file: File) => {
    const url = URL.createObjectURL(file);
    setCustomVideoUrl(url);
  };

  const handleResetVideo = () => {
    if (customVideoUrl) {
      URL.revokeObjectURL(customVideoUrl);
      setCustomVideoUrl(null);
    }
  };

  // Formatted status text and badge colors
  const getStatusBadge = () => {
    switch (state) {
      case 'listening':
        return {
          text: isMicMuted ? 'MIC MUTED' : 'LISTENING',
          color: isMicMuted ? 'text-amber-400' : 'text-pink-400',
          dot: isMicMuted ? 'bg-amber-500' : 'bg-pink-500 animate-ping',
          border: isMicMuted ? 'border-amber-500/40' : 'border-pink-500/40',
          bg: isMicMuted ? 'bg-amber-500/10' : 'bg-pink-500/10',
        };
      case 'speaking':
        return {
          text: 'SPEAKING',
          color: 'text-cyan-400',
          dot: 'bg-cyan-500 animate-pulse',
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-500/10',
        };
      case 'paused':
        return {
          text: 'SESSION PAUSED',
          color: 'text-amber-400',
          dot: 'bg-amber-500 animate-pulse',
          border: 'border-amber-500/50',
          bg: 'bg-amber-500/15',
        };
      case 'thinking':
        return {
          text: 'THINKING',
          color: 'text-purple-400',
          dot: 'bg-purple-500 animate-bounce',
          border: 'border-purple-500/40',
          bg: 'bg-purple-500/10',
        };
      case 'executing_tool':
        return {
          text: 'EXECUTING TOOL',
          color: 'text-amber-400',
          dot: 'bg-amber-500 animate-pulse',
          border: 'border-amber-500/40',
          bg: 'bg-amber-500/10',
        };
      case 'connecting':
        return {
          text: 'CONNECTING...',
          color: 'text-blue-400',
          dot: 'bg-blue-500 animate-ping',
          border: 'border-blue-500/40',
          bg: 'bg-blue-500/10',
        };
      case 'error':
        return {
          text: 'SESSION ERROR',
          color: 'text-rose-400',
          dot: 'bg-rose-500',
          border: 'border-rose-500/40',
          bg: 'bg-rose-500/10',
        };
      case 'disconnected':
      default:
        return {
          text: 'STANDBY',
          color: 'text-slate-400',
          dot: 'bg-slate-600',
          border: 'border-slate-700/40',
          bg: 'bg-slate-800/20',
        };
    }
  };

  const status = getStatusBadge();
  const isOnline = state !== 'disconnected' && state !== 'error';
  const isPaused = state === 'paused';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05060b] flex flex-col justify-between select-none">
      {/* 60 FPS Particle Canvas and Neon Ambience */}
      {settings.showParticles && <AnimationController state={state} audioLevel={audioLevel} />}

      {/* Holographic Scanline Overlay */}
      <div className="absolute inset-0 hologram-scan pointer-events-none z-10 opacity-30" />

      {/* TOP HUD BAR */}
      <header className="relative z-30 w-full px-4 sm:px-6 pt-3 sm:pt-4 pb-2 flex items-center justify-between">
        {/* Assistant Identity & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 shadow-lg shadow-cyan-500/20">
            <Radio
              className={`w-4 h-4 ${
                isOnline && !isPaused ? 'text-cyan-400 animate-pulse' : 'text-slate-400'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black font-orbitron tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-400">
                RS AI ASSISTANT
              </h1>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                LIVE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span>{settings.language.split('-')[0].toUpperCase()}</span>
              <span>•</span>
              <span>{settings.voice}</span>
              <span>•</span>
              <span className="text-pink-400 capitalize">{settings.personalityTone}</span>
            </div>
          </div>
        </div>

        {/* Top Header Control Buttons */}
        <div className="flex items-center gap-2">
          {/* Android APK & Install Hub Button */}
          <button
            onClick={() => setIsAPKModalOpen(true)}
            className="p-2 px-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-1.5 transition-all backdrop-blur-md active:scale-95 shadow-md shadow-emerald-500/10"
            title="Download Android APK / Install WebAPK"
          >
            <Smartphone className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold text-[11px] tracking-wide">APK</span>
          </button>

          {/* Quick Voice Guide */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-cyan-300 transition-all backdrop-blur-md active:scale-95"
            title="Voice Commands Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Device Permissions Shortcut */}
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-emerald-300 transition-all backdrop-blur-md relative active:scale-95"
            title="Device Permissions"
          >
            <Shield className="w-4 h-4" />
            {permissions.some((p) => p.status !== 'granted') && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
            )}
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-pink-300 transition-all backdrop-blur-md active:scale-95"
            title="Assistant Settings (Audio, Voice, Language, Avatar)"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Quick Avatar/Chroma Customizer button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 transition-all backdrop-blur-md active:scale-95"
            title="Customize Avatar & Chroma"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* STATUS PILL BADGE */}
      <div className="relative z-30 flex justify-center mt-1">
        <div
          className={`flex items-center gap-2 px-3.5 py-1 rounded-full border backdrop-blur-xl transition-all duration-300 ${status.bg} ${status.border}`}
        >
          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          <span className={`text-[11px] font-mono font-bold tracking-widest ${status.color}`}>
            {status.text}
          </span>
          {isOnline && (
            <span className="text-[10px] text-slate-400 font-mono">
              • Sens: {Math.round(settings.micSensitivity * 1000) / 10}
            </span>
          )}
        </div>
      </div>

      {/* ERROR BANNER IF APPLICABLE */}
      {errorMessage && (
        <div className="relative z-30 mx-4 mt-2 p-2.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 backdrop-blur-xl animate-fade-in max-w-md mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold underline hover:text-white px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* CENTER: ANIME AVATAR CHARACTER (GREEN SCREEN REMOVED) */}
      <main className="relative flex-1 w-full max-w-lg mx-auto flex items-center justify-center overflow-hidden z-20">
        <CharacterRenderer
          state={state}
          audioLevel={audioLevel}
          chromaSettings={settings.chroma}
          customVideoUrl={customVideoUrl}
          zoomScale={settings.characterZoom}
          themeColor={settings.themeColor}
        />
      </main>

      {/* BOTTOM CONTROLS CLUSTER: PROPER BUTTONS INCLUDING PAUSE & MUTE */}
      <footer className="relative z-30 w-full max-w-md mx-auto px-4 sm:px-6 pb-5 pt-1 flex flex-col items-center gap-3">
        {/* Real-time Dynamic Waveform Bar Visualizer */}
        <AudioWaveform
          state={state}
          audioLevel={audioLevel}
          frequencies={frequencies}
        />

        {/* FUTURISTIC MOBILE GLASS CONTROL DOCK */}
        <div className="w-full bg-slate-950/80 border border-white/10 rounded-full px-4 py-2.5 shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-2 sm:gap-3 neon-border-cyan">
          {/* 1. Mute / Unmute Mic Button */}
          <button
            onClick={toggleMute}
            disabled={!isOnline}
            className={`p-3 rounded-full border transition-all active:scale-95 ${
              !isOnline
                ? 'opacity-40 cursor-not-allowed border-white/5 text-slate-500 bg-white/5'
                : isMicMuted
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-400 shadow-md shadow-rose-500/20'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* 2. Pause / Resume Button (PROPER PAUSE BUTTON) */}
          <button
            onClick={togglePause}
            disabled={!isOnline}
            className={`p-3 rounded-full border transition-all active:scale-95 ${
              !isOnline
                ? 'opacity-40 cursor-not-allowed border-white/5 text-slate-500 bg-white/5'
                : isPaused
                ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/25 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-amber-300'
            }`}
            title={isPaused ? 'Resume Assistant' : 'Pause Assistant'}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>

          {/* 3. Central Glowing Microphone Button */}
          <div className="relative flex items-center justify-center">
            {/* Animated pulsating outer rings */}
            {isOnline && !isPaused && (
              <>
                <div
                  className={`absolute w-20 h-20 rounded-full pointer-events-none transition-all duration-500 animate-pulse-ring ${
                    state === 'speaking'
                      ? 'bg-cyan-500/25 border border-cyan-400/40'
                      : state === 'listening'
                      ? 'bg-pink-500/25 border border-pink-400/40'
                      : 'bg-purple-500/20 border border-purple-400/30'
                  }`}
                />
                <div
                  className="absolute rounded-full pointer-events-none transition-all duration-150"
                  style={{
                    width: `${76 + audioLevel * 44}px`,
                    height: `${76 + audioLevel * 44}px`,
                    backgroundColor:
                      state === 'speaking'
                        ? 'rgba(6, 182, 212, 0.25)'
                        : 'rgba(236, 72, 153, 0.25)',
                    filter: 'blur(8px)',
                  }}
                />
              </>
            )}

            {/* Central Mic Button Orb */}
            <button
              onClick={handleMicTap}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-2xl cursor-pointer ${
                state === 'speaking'
                  ? 'bg-gradient-to-tr from-cyan-500 to-blue-500 text-white neon-glow-cyan border-2 border-cyan-300'
                  : state === 'listening' && !isMicMuted
                  ? 'bg-gradient-to-tr from-pink-500 to-purple-600 text-white neon-glow-magenta border-2 border-pink-300 animate-pulse'
                  : state === 'paused'
                  ? 'bg-amber-500 text-slate-950 border-2 border-amber-300 shadow-amber-500/40'
                  : state === 'thinking' || state === 'executing_tool'
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white neon-glow-purple border-2 border-purple-300'
                  : state === 'connecting'
                  ? 'bg-blue-600 text-white border-2 border-blue-400 animate-pulse'
                  : 'bg-slate-900 text-slate-400 border border-slate-700/60 hover:border-cyan-400/50 hover:text-white hover:bg-slate-800'
              }`}
              title={
                state === 'speaking'
                  ? 'Tap to Interrupt'
                  : state === 'paused'
                  ? 'Tap to Resume'
                  : 'Microphone'
              }
            >
              {isOnline ? (
                <Mic className="w-7 h-7 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
              ) : (
                <MicOff className="w-7 h-7" />
              )}
            </button>
          </div>

          {/* 4. Active Tools HUD Button */}
          <button
            onClick={() => {
              if (lastExecutedTool) {
                // re-open last tool
                setIsToolsHUDOpen(true);
              } else {
                setIsToolsHUDOpen(true);
              }
            }}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-300 transition-all active:scale-95"
            title="Tools & Active Actions"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>

          {/* 5. AI Power / Disconnect Button */}
          <button
            onClick={togglePower}
            className={`p-3 rounded-full border transition-all active:scale-95 shadow-md ${
              isOnline
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30 shadow-rose-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400/50 text-white hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30'
            }`}
            title={isOnline ? 'Disconnect Assistant' : 'Power On Assistant'}
          >
            <Power className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Helper Hint */}
        <div className="text-center">
          <p className="text-[11px] font-mono text-slate-400 tracking-wider">
            {state === 'disconnected'
              ? 'Tap microphone or Power to start voice session'
              : state === 'paused'
              ? 'Assistant paused • Tap Pause or Mic to resume'
              : state === 'listening'
              ? isMicMuted
                ? 'Microphone muted • Tap mute button to unmute'
                : 'Listening continuously • Speak to your assistant'
              : state === 'speaking'
              ? 'Speaking • Tap mic or speak to interrupt'
              : state === 'thinking'
              ? 'Processing speech...'
              : state === 'executing_tool'
              ? 'Automating mobile task...'
              : 'Standby'}
          </p>
        </div>
      </footer>

      {/* POP-UP 1: ACTION HUD IN CENTER OF MODEL */}
      {(lastExecutedTool || isToolsHUDOpen) && (
        <ActionHUD
          lastExecution={
            lastExecutedTool || {
              id: 'demo',
              name: 'playMusic',
              args: { songTitle: 'Synthwave Dreams', artist: 'RS Audio Lab' },
              status: 'completed',
              timestamp: Date.now(),
              previewType: 'music',
            }
          }
          alarms={toolManager.getAlarms()}
          reminders={toolManager.getReminders()}
          contacts={toolManager.getContacts()}
          onClose={() => {
            setLastExecutedTool(null);
            setIsToolsHUDOpen(false);
          }}
        />
      )}

      {/* POP-UP 2: PERMISSION MODAL IN CENTER OF MODEL */}
      <PermissionModal
        isOnboarding={isOnboardingOpen}
        permissions={permissions}
        onRequestPermission={(id) => permissionManager.requestPermission(id)}
        onGrantAll={() => permissionManager.grantAll()}
        onFinishOnboarding={() => {
          permissionManager.setOnboarded();
          setIsOnboardingOpen(false);
          if (state === 'disconnected') {
            togglePower();
          }
        }}
        pendingTool={pendingTool}
        onApproveTool={() => toolManager.approvePendingTool()}
        onDenyTool={() => toolManager.denyPendingTool()}
      />

      {/* POP-UP 3: SETTINGS MODAL IN CENTER OF MODEL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onChangeSettings={handleSettingsChange}
        onUploadCustomVideo={handleUploadCustomVideo}
        onResetVideo={handleResetVideo}
        hasCustomVideo={!!customVideoUrl}
        permissions={permissions}
        onOpenPermissions={() => {
          setIsSettingsOpen(false);
          setIsOnboardingOpen(true);
        }}
        liveAudioLevel={audioLevel}
      />

      {/* POP-UP 4: VOICE COMMANDS GUIDE IN CENTER OF MODEL */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in pointer-events-auto">
          <div className="w-full max-w-sm rounded-3xl border border-cyan-500/40 bg-slate-950/95 shadow-2xl backdrop-blur-2xl p-5 text-slate-100 flex flex-col gap-3 relative overflow-hidden neon-border-cyan">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Supported Voice Commands
              </span>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Talk to RS AI Assistant naturally through your microphone! Try saying:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-cyan-200/90">
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 truncate">
                🗣️ "Call Sarah Chen"
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 truncate">
                🗣️ "Text Alex I'm on my way"
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 truncate">
                🗣️ "Play some chill music"
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 truncate">
                🗣️ "Open the camera"
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 truncate">
                🗣️ "Set an alarm for 7:30 AM"
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 truncate">
                🗣️ "Navigate to Central Park"
              </div>
            </div>
            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setIsGuideOpen(false)}
                className="py-1.5 px-4 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP 5: APK & ANDROID INSTALLATION HUB IN CENTER OF MODEL */}
      <APKModal
        isOpen={isAPKModalOpen}
        onClose={() => setIsAPKModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallDirect={handleInstallDirect}
      />
    </div>
  );
};
