import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  ExternalLink,
  QrCode,
  CheckCircle,
  Copy,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  Layers,
} from 'lucide-react';

interface APKModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallDirect: () => void;
}

export const APKModal: React.FC<APKModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallDirect,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'builder' | 'qr'>('direct');
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`;

  const handleDownloadConfig = () => {
    const configData = {
      app_name: 'RS AI Assistant',
      package_id: 'com.rsai.assistant',
      version: '1.0.0',
      web_url: appUrl,
      manifest_url: `${appUrl}/manifest.json`,
      icon_url: `${appUrl}/pwa-512x512.png`,
      theme_color: '#05060c',
      background_color: '#05060c',
      display_mode: 'standalone',
      architecture: 'TWA / WebAPK / PWA',
      bubblewrap_command: `npx @bubblewrap/cli init --manifest=${appUrl}/manifest.json && npx @bubblewrap/cli build`,
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rs-ai-assistant-android-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl border border-cyan-500/40 bg-slate-950/95 shadow-2xl backdrop-blur-2xl text-slate-100 overflow-hidden relative neon-border-cyan">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 via-slate-900 to-purple-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest font-bold">
                Android Package & Installation
              </div>
              <h2 className="text-base font-bold font-orbitron tracking-wide text-white">
                RS AI Assistant APK Hub
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/5 bg-slate-900/60 p-1 gap-1">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'direct'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>1-Tap Install</span>
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'builder'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Build .APK File</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'qr'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan on Phone</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: 1-TAP WEBAPK INSTALLATION */}
          {activeTab === 'direct' && (
            <div className="space-y-4 animate-fade-in">
              {/* App Badge Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/30 flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="RS AI Icon"
                  className="w-14 h-14 rounded-2xl shadow-lg border border-cyan-400/40 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold font-orbitron text-white">RS AI Assistant</div>
                  <div className="text-[11px] text-cyan-300 font-mono">v1.0.0 • Official WebAPK</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    Native Android Standalone Experience
                  </div>
                </div>
              </div>

              {/* Install Button */}
              <button
                onClick={onInstallDirect}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 active:scale-98 transition-all text-white font-bold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 border border-cyan-300/40"
              >
                <Smartphone className="w-5 h-5" />
                <span>Install RS AI on Android Device</span>
              </button>

              {/* How Android WebAPK works */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Direct Android WebAPK Benefits
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>
                    <strong className="text-white">Real Android App:</strong> Android automatically generates and signs a real native APK directly onto your phone.
                  </li>
                  <li>
                    <strong className="text-white">Zero Untrusted Warning:</strong> Installs securely without toggling "Unknown Sources".
                  </li>
                  <li>
                    <strong className="text-white">Standalone Window:</strong> Opens in dedicated fullscreen without Chrome browser tabs or URL bars.
                  </li>
                  <li>
                    <strong className="text-white">Full Hardware Access:</strong> Continuous microphone streaming, camera access, and device notifications.
                  </li>
                </ul>
              </div>

              {/* Manual Add to Home Screen Instructions */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1 text-xs text-slate-400">
                <div className="font-semibold text-slate-200">Alternative Manual Install:</div>
                <div>
                  Tap <strong className="text-cyan-300">⋮ (Three dots)</strong> in your Android Chrome / Edge browser, then tap <strong className="text-cyan-300">"Install app"</strong> or <strong className="text-cyan-300">"Add to Home screen"</strong>.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STANDALONE .APK BUILDER */}
          {activeTab === 'builder' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-xs text-slate-300 leading-relaxed">
                Want a raw <span className="font-mono text-cyan-300">.apk</span> or <span className="font-mono text-cyan-300">.aab</span> installer file to sideload or distribute? You can build one in seconds using official packaging tools:
              </div>

              {/* PWABuilder 1-Click Generator */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    PWABuilder Android APK Packager
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Microsoft's official open-source tool packages this PWA into an installable Android APK and Google Play Store package.
                </p>
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/25 transition-all"
                >
                  <span>Generate APK on PWABuilder</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Bubblewrap CLI & TWA Config */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Google Bubblewrap CLI Package
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Developer</span>
                </div>
                <p className="text-xs text-slate-400">
                  Run Google's official Bubblewrap CLI tool to compile a signed Android APK locally with Android SDK:
                </p>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 font-mono text-[11px] text-cyan-300 overflow-x-auto select-all">
                  npx @bubblewrap/cli init --manifest={appUrl}/manifest.json<br />
                  npx @bubblewrap/cli build
                </div>
                <button
                  onClick={handleDownloadConfig}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-white/10 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Android TWA Configuration JSON</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SCAN ON PHONE */}
          {activeTab === 'qr' && (
            <div className="space-y-4 animate-fade-in flex flex-col items-center text-center">
              <div className="text-xs text-slate-300">
                Scan this QR code with your Android phone's Camera or Google Lens to open and install RS AI Assistant instantly:
              </div>

              {/* QR Code Container */}
              <div className="p-4 rounded-3xl bg-white shadow-2xl flex items-center justify-center border-4 border-cyan-400">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    appUrl
                  )}`}
                  alt="RS AI QR Code"
                  className="w-48 h-48 object-contain"
                />
              </div>

              {/* Copy URL Pill */}
              <div className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-xs font-mono text-cyan-300 truncate max-w-[240px]">
                  {appUrl}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="p-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 shrink-0 transition-all"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                Once opened, tap "Install" in Chrome to generate the Android WebAPK.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-900/60 flex items-center justify-between">
          <div className="text-[10px] text-slate-400 font-mono">
            Package: com.rsai.assistant
          </div>
          <button
            onClick={onClose}
            className="py-2 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
          >
            Close Hub
          </button>
        </div>
      </div>
    </div>
  );
};
