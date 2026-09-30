import React, { useRef, useState } from 'react';
import {
  X,
  Volume2,
  Mic,
  Sliders,
  Upload,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Video,
  Globe,
  Smile,
  Palette,
  Check,
} from 'lucide-react';
import { AssistantSettings, PermissionRecord } from '../types/assistant';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
  onChangeSettings: (newSettings: AssistantSettings) => void;
  onUploadCustomVideo: (file: File) => void;
  onResetVideo: () => void;
  hasCustomVideo: boolean;
  permissions: PermissionRecord[];
  onOpenPermissions: () => void;
  liveAudioLevel?: number; // for visual mic sensitivity preview
}

const VOICES = [
  { id: 'Aoede', name: 'Aoede', desc: 'Youthful, bright, cheerful & witty (Recommended)' },
  { id: 'Kore', name: 'Kore', desc: 'Calm, soothing, elegant female tone' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Crisp, articulate, contemporary conversational tone' },
  { id: 'Puck', name: 'Puck', desc: 'Energetic, mischievous & playful' },
  { id: 'Charon', name: 'Charon', desc: 'Deep, steady, authoritative' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Warm, resonant, casual tone' },
];

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
  { code: 'ja-JP', label: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'es-ES', label: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr-FR', label: 'French (Français)', flag: '🇫🇷' },
  { code: 'hi-IN', label: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { code: 'ko-KR', label: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'de-DE', label: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'zh-CN', label: 'Chinese (中文)', flag: '🇨🇳' },
];

const TONES = [
  { id: 'witty', label: 'Witty & Teasing', desc: 'Playful, clever banter, charmingly confident' },
  { id: 'sweet', label: 'Sweet & Caring', desc: 'Warm, affectionate, supportive companion' },
  { id: 'calm', label: 'Calm & Serene', desc: 'Relaxing, soothing, peaceful composure' },
  { id: 'energetic', label: 'High Energy', desc: 'Spirited, bubbly, animated & enthusiastic' },
];

const THEMES = [
  { id: 'cyan', name: 'Neon Cyan', color: '#06b6d4', ring: 'ring-cyan-400' },
  { id: 'pink', name: 'Cyber Sakura', color: '#ec4899', ring: 'ring-pink-400' },
  { id: 'purple', name: 'Electric Violet', color: '#a855f7', ring: 'ring-purple-400' },
  { id: 'emerald', name: 'Matrix Emerald', color: '#10b981', ring: 'ring-emerald-400' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
  onUploadCustomVideo,
  onResetVideo,
  hasCustomVideo,
  permissions,
  onOpenPermissions,
  liveAudioLevel = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'voice' | 'avatar' | 'permissions'>('audio');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCustomVideo(file);
    }
  };

  const handleResetChroma = () => {
    onChangeSettings({
      ...settings,
      chroma: {
        keyColor: '#00ff00',
        similarity: 0.38,
        smoothness: 0.12,
        despill: 0.85,
      },
    });
  };

  const grantedCount = permissions.filter((p) => p.status === 'granted').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl border border-cyan-500/40 bg-slate-950/95 shadow-2xl backdrop-blur-2xl text-slate-100 overflow-hidden relative neon-border-cyan">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 via-slate-900 to-purple-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-orbitron tracking-wide text-white">
                Assistant Settings
              </h2>
              <div className="text-[10px] text-cyan-400 font-mono">RS AI Assistant Control Hub</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 bg-slate-900/60 p-1 gap-1">
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'audio'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Audio & Mic</span>
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'voice'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Voice & Lang</span>
          </button>
          <button
            onClick={() => setActiveTab('avatar')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'avatar'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Avatar & FX</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'permissions'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Access</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* TAB 1: AUDIO & MIC */}
          {activeTab === 'audio' && (
            <div className="space-y-4 animate-fade-in">
              {/* Mic Sensitivity Slider with Live Meter */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-cyan-400" />
                    Microphone Sensitivity (VAD)
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {settings.micSensitivity <= 0.008
                      ? 'High Sensitivity'
                      : settings.micSensitivity <= 0.02
                      ? 'Balanced'
                      : 'Low Sensitivity'}
                  </span>
                </div>

                <div className="space-y-1">
                  <input
                    type="range"
                    min="0.004"
                    max="0.04"
                    step="0.002"
                    value={settings.micSensitivity}
                    onChange={(e) =>
                      onChangeSettings({
                        ...settings,
                        micSensitivity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>High (Whispers)</span>
                    <span>Standard</span>
                    <span>Low (Loud Rooms)</span>
                  </div>
                </div>

                {/* Live Mic Level Preview Meter */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Live Mic Energy</span>
                    <span className="font-mono text-cyan-300">{Math.round(liveAudioLevel * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 border border-white/10 overflow-hidden relative">
                    <div
                      className={`h-full transition-all duration-75 ${
                        liveAudioLevel > settings.micSensitivity
                          ? 'bg-gradient-to-r from-cyan-400 to-pink-500'
                          : 'bg-cyan-500/40'
                      }`}
                      style={{ width: `${Math.min(100, liveAudioLevel * 200)}%` }}
                    />
                    {/* Marker for threshold */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-400"
                      style={{ left: `${Math.min(100, settings.micSensitivity * 200)}%` }}
                      title="Speech threshold trigger"
                    />
                  </div>
                </div>
              </div>

              {/* Output Volume Slider */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-purple-400" />
                    Assistant Voice Volume
                  </span>
                  <span className="text-[10px] font-mono text-purple-400">
                    {Math.round(settings.outputVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={settings.outputVolume}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      outputVolume: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Echo Cancellation & Noise Suppression Toggles */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Acoustic Echo Cancellation</div>
                    <div className="text-[10px] text-slate-400">Prevents assistant speech from looping</div>
                  </div>
                  <button
                    onClick={() =>
                      onChangeSettings({
                        ...settings,
                        echoCancellation: !settings.echoCancellation,
                      })
                    }
                    className={`w-11 h-6 rounded-full transition-all relative p-0.5 ${
                      settings.echoCancellation ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-all shadow-md ${
                        settings.echoCancellation ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Hardware Noise Suppression</div>
                    <div className="text-[10px] text-slate-400">Filters ambient room fans and background noise</div>
                  </div>
                  <button
                    onClick={() =>
                      onChangeSettings({
                        ...settings,
                        noiseSuppression: !settings.noiseSuppression,
                      })
                    }
                    className={`w-11 h-6 rounded-full transition-all relative p-0.5 ${
                      settings.noiseSuppression ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-all shadow-md ${
                        settings.noiseSuppression ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VOICE & LANGUAGE */}
          {activeTab === 'voice' && (
            <div className="space-y-4 animate-fade-in">
              {/* Spoken Language Selector */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-bold">
                  <Globe className="w-3.5 h-3.5" />
                  Primary Spoken Language
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map((lang) => {
                    const isSelected = settings.language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => onChangeSettings({ ...settings, language: lang.code })}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                            : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-base">{lang.flag}</div>
                        <div className="text-[10px] font-semibold truncate mt-0.5">{lang.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voice Persona Selector */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-xs font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1.5 font-bold">
                  <Volume2 className="w-3.5 h-3.5" />
                  Gemini Voice Persona
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {VOICES.map((v) => {
                    const isSelected = settings.voice === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => onChangeSettings({ ...settings, voice: v.id })}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-400 text-white shadow-md shadow-purple-500/20'
                            : 'bg-black/40 border-white/5 text-slate-300 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="text-xs font-bold font-orbitron flex items-center justify-between">
                          {v.name}
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                          {v.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personality Tone Selector */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-xs font-mono uppercase tracking-wider text-pink-400 flex items-center gap-1.5 font-bold">
                  <Smile className="w-3.5 h-3.5" />
                  Personality & Tone
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map((t) => {
                    const isSelected = settings.personalityTone === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() =>
                          onChangeSettings({
                            ...settings,
                            personalityTone: t.id as any,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-pink-500/20 border-pink-400 text-white shadow-md shadow-pink-500/20'
                            : 'bg-black/40 border-white/5 text-slate-300 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          {t.label}
                          {isSelected && <Check className="w-3.5 h-3.5 text-pink-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                          {t.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AVATAR & FX */}
          {activeTab === 'avatar' && (
            <div className="space-y-4 animate-fade-in">
              {/* Character Zoom Slider */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span>Character Scale & Zoom</span>
                  <span className="font-mono text-[10px] text-pink-400">
                    {Math.round(settings.characterZoom * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.35"
                  step="0.05"
                  value={settings.characterZoom}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      characterZoom: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-pink-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Theme Color Selector */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-bold">
                  <Palette className="w-3.5 h-3.5" />
                  Holographic Theme Accent
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {THEMES.map((th) => {
                    const isSelected = settings.themeColor === th.id;
                    return (
                      <button
                        key={th.id}
                        onClick={() => onChangeSettings({ ...settings, themeColor: th.id as any })}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-white/10 border-white/40 ring-1 ' + th.ring
                            : 'bg-black/40 border-white/5 hover:bg-slate-900'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-full shadow-md"
                          style={{ backgroundColor: th.color }}
                        />
                        <span className="text-[10px] text-slate-300 font-semibold truncate w-full text-center">
                          {th.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Video Upload */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      {hasCustomVideo ? 'Custom Video Active' : 'Custom Green Screen Video'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {hasCustomVideo ? 'Real-time keying enabled' : 'Upload MP4 or WebM video'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasCustomVideo && (
                    <button
                      onClick={onResetVideo}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md shadow-pink-600/20 flex items-center gap-1.5 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {hasCustomVideo ? 'Change' : 'Upload'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Chroma Key Fine-Tuning */}
              <div className="space-y-2.5 bg-black/40 p-3.5 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Chroma Key Fine-Tuning</span>
                  <button
                    onClick={handleResetChroma}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>

                {/* Key Color Picker */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Key Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.chroma.keyColor}
                      onChange={(e) =>
                        onChangeSettings({
                          ...settings,
                          chroma: { ...settings.chroma, keyColor: e.target.value },
                        })
                      }
                      className="w-7 h-7 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-400">
                      {settings.chroma.keyColor}
                    </span>
                  </div>
                </div>

                {/* Threshold Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Threshold Similarity</span>
                    <span className="font-mono text-[10px] text-cyan-400">
                      {Math.round(settings.chroma.similarity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.02"
                    value={settings.chroma.similarity}
                    onChange={(e) =>
                      onChangeSettings({
                        ...settings,
                        chroma: { ...settings.chroma, similarity: parseFloat(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Green Despill */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Green Fringe Despill</span>
                    <span className="font-mono text-[10px] text-pink-400">
                      {Math.round(settings.chroma.despill * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={settings.chroma.despill}
                    onChange={(e) =>
                      onChangeSettings({
                        ...settings,
                        chroma: { ...settings.chroma, despill: parseFloat(e.target.value) },
                      })
                    }
                    className="w-full accent-pink-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Mobile Device Permissions
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {grantedCount} / {permissions.length} Active
                </span>
              </div>

              <div className="space-y-2">
                {permissions.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{p.label}</div>
                      <div className="text-[10px] text-slate-400">{p.requiredFor}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        p.status === 'granted'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {p.status === 'granted' ? 'Allowed' : 'Prompt'}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenPermissions();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all text-center"
              >
                Open Full Permission Manager
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
