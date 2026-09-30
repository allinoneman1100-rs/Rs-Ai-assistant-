import React, { useEffect, useRef, useState } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  X,
  Play,
  Pause,
  Camera,
  MapPin,
  Clock,
  CheckCircle,
  ExternalLink,
  Search,
  MessageCircle,
  Music,
} from 'lucide-react';
import { AlarmItem, ContactItem, ReminderItem, ToolExecutionRecord } from '../types/assistant';

interface ActionHUDProps {
  lastExecution: ToolExecutionRecord | null;
  alarms: AlarmItem[];
  reminders: ReminderItem[];
  contacts: ContactItem[];
  onClose: () => void;
}

export const ActionHUD: React.FC<ActionHUDProps> = ({
  lastExecution,
  alarms,
  reminders,
  contacts,
  onClose,
}) => {
  const [callActive, setCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(true);

  // Camera video ref for real camera preview
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStreamActive, setCameraStreamActive] = useState(false);

  // Track phone call duration
  useEffect(() => {
    let interval: any = null;
    if (lastExecution?.previewType === 'phone') {
      setCallActive(true);
      setCallSeconds(0);
      interval = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    } else {
      setCallActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lastExecution]);

  // Handle camera preview if camera action opened
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (lastExecution?.previewType === 'camera') {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'user' } })
        .then((s) => {
          stream = s;
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = s;
            cameraVideoRef.current.play().catch(() => {});
            setCameraStreamActive(true);
          }
        })
        .catch(() => {
          setCameraStreamActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setCameraStreamActive(false);
    };
  }, [lastExecution]);

  if (!lastExecution) return null;

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl border border-cyan-500/50 bg-slate-950/95 shadow-2xl shadow-cyan-950/50 backdrop-blur-2xl p-5 text-slate-100 relative overflow-hidden neon-border-cyan">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Phone Call HUD */}
        {lastExecution.previewType === 'phone' && (
          <div className="flex flex-col items-center gap-3 py-1">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-pulse">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <div className="text-base font-bold font-orbitron tracking-wide text-white">
                {lastExecution.args.contactName || lastExecution.args.phoneNumber}
              </div>
              <div className="text-xs text-cyan-300 font-mono mt-0.5">
                {callActive ? `Active Call • ${formatCallTime(callSeconds)}` : 'Call Ended'}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-full border transition-all ${
                  isMuted ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setCallActive(false)}
                className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-full bg-white/5 border border-white/10 text-slate-300">
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 2. SMS / WhatsApp Card */}
        {(lastExecution.previewType === 'sms' || lastExecution.previewType === 'whatsapp') && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <MessageCircle className="w-4 h-4" />
              <span>
                {lastExecution.previewType === 'whatsapp' ? 'WhatsApp Dispatched' : 'SMS Sent'}
              </span>
            </div>
            <div className="bg-black/40 rounded-2xl p-3 border border-white/5 flex flex-col gap-1.5">
              <div className="text-xs text-slate-400">To: {lastExecution.args.phoneNumber}</div>
              <div className="text-sm font-medium text-slate-100 bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-800/30">
                "{lastExecution.args.message}"
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Delivered to messaging queue
                </span>
                <span className="font-mono text-[10px]">Just now</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Music Player HUD */}
        {lastExecution.previewType === 'music' && (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
              <Music className="w-6 h-6 text-white animate-spin-slow" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-pink-400 uppercase tracking-wider">
                Now Playing
              </div>
              <div className="text-sm font-bold text-white truncate">
                {lastExecution.args.songTitle || 'Synthwave Track'}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {lastExecution.args.artist || 'RS Audio Synthesizer'}
              </div>
            </div>
            <button
              onClick={() => setIsPlayingMusic(!isPlayingMusic)}
              className="p-2.5 rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-95 transition-all shadow-md shadow-cyan-500/25 shrink-0"
            >
              {isPlayingMusic ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>
        )}

        {/* 4. Camera HUD */}
        {lastExecution.previewType === 'camera' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-pink-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4" /> Device Viewfinder Active
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300">
                {lastExecution.args.mode || 'Standard'}
              </span>
            </div>
            <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-black/60 border border-pink-500/30 flex items-center justify-center">
              <video
                ref={cameraVideoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${cameraStreamActive ? 'block' : 'hidden'}`}
              />
              {!cameraStreamActive && (
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                  <Camera className="w-8 h-8 text-pink-400/60" />
                  <span className="text-xs">Camera initialized</span>
                </div>
              )}
              {/* Cyber viewfinder reticle */}
              <div className="absolute inset-4 border border-cyan-400/40 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-cyan-400 rounded-full opacity-60" />
              </div>
            </div>
          </div>
        )}

        {/* 5. Alarms & Reminders Card */}
        {(lastExecution.previewType === 'alarm' || lastExecution.previewType === 'reminder') && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Clock className="w-4 h-4" />
              <span>
                {lastExecution.previewType === 'alarm' ? 'Alarm Scheduled' : 'Reminder Saved'}
              </span>
            </div>
            <div className="bg-black/40 rounded-2xl p-3 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">
                  {lastExecution.args.label || lastExecution.args.title}
                </div>
                <div className="text-xs text-cyan-300 font-mono mt-0.5">
                  {lastExecution.args.time || lastExecution.args.dueTime}
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                Active
              </div>
            </div>
          </div>
        )}

        {/* 6. Maps & Search & Web & YouTube */}
        {(lastExecution.previewType === 'maps' ||
          lastExecution.previewType === 'search' ||
          lastExecution.previewType === 'youtube' ||
          lastExecution.previewType === 'website') && (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                {lastExecution.previewType === 'maps'
                  ? 'Navigation'
                  : lastExecution.previewType === 'youtube'
                  ? 'YouTube'
                  : 'Web Task'}
              </div>
              <div className="text-sm font-bold text-white truncate">
                {lastExecution.args.destination ||
                  lastExecution.args.searchQuery ||
                  lastExecution.args.query ||
                  lastExecution.args.url}
              </div>
            </div>
            {lastExecution.result?.url && (
              <a
                href={lastExecution.result.url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-md shadow-cyan-500/20"
              >
                <span>View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
