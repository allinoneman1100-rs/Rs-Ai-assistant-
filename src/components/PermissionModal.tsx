import React from 'react';
import {
  Mic,
  Bell,
  Users,
  PhoneCall,
  MessageSquare,
  Camera,
  HardDrive,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { DevicePermissionType, PermissionRecord, ToolExecutionRecord } from '../types/assistant';

interface PermissionModalProps {
  // First launch onboarding mode
  isOnboarding?: boolean;
  permissions?: PermissionRecord[];
  onRequestPermission?: (id: DevicePermissionType) => void;
  onGrantAll?: () => void;
  onFinishOnboarding?: () => void;

  // Sensitive tool action approval mode
  pendingTool?: ToolExecutionRecord | null;
  onApproveTool?: () => void;
  onDenyTool?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Mic,
  Bell,
  Users,
  PhoneCall,
  MessageSquare,
  Camera,
  HardDrive,
  MapPin,
  ExternalLink,
};

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOnboarding,
  permissions = [],
  onRequestPermission,
  onGrantAll,
  onFinishOnboarding,
  pendingTool,
  onApproveTool,
  onDenyTool,
}) => {
  // 1. Sensitive Tool Action Prompt
  if (pendingTool && pendingTool.status === 'pending_approval') {
    const formatToolDescription = () => {
      switch (pendingTool.name) {
        case 'makePhoneCall':
          return {
            title: 'Place Outgoing Phone Call',
            subtitle: `Dial ${pendingTool.args.contactName || 'Phone'}: ${pendingTool.args.phoneNumber}`,
            icon: PhoneCall,
            color: 'text-emerald-400',
            borderColor: 'border-emerald-500/40',
            bgGlow: 'bg-emerald-500/10',
          };
        case 'sendSMS':
          return {
            title: 'Send Cellular SMS',
            subtitle: `To: ${pendingTool.args.phoneNumber}`,
            detail: `"${pendingTool.args.message}"`,
            icon: MessageSquare,
            color: 'text-cyan-400',
            borderColor: 'border-cyan-500/40',
            bgGlow: 'bg-cyan-500/10',
          };
        case 'sendWhatsAppMessage':
          return {
            title: 'Send WhatsApp Message',
            subtitle: `To: ${pendingTool.args.phoneNumber}`,
            detail: `"${pendingTool.args.message}"`,
            icon: MessageSquare,
            color: 'text-green-400',
            borderColor: 'border-green-500/40',
            bgGlow: 'bg-green-500/10',
          };
        case 'openCamera':
          return {
            title: 'Activate Device Camera',
            subtitle: `Mode: ${pendingTool.args.mode || 'Photo Viewfinder'}`,
            icon: Camera,
            color: 'text-pink-400',
            borderColor: 'border-pink-500/40',
            bgGlow: 'bg-pink-500/10',
          };
        case 'openApp':
          return {
            title: 'Launch External Application',
            subtitle: `Target App: ${pendingTool.args.appName}`,
            icon: ExternalLink,
            color: 'text-purple-400',
            borderColor: 'border-purple-500/40',
            bgGlow: 'bg-purple-500/10',
          };
        default:
          return {
            title: `Execute ${pendingTool.name}`,
            subtitle: JSON.stringify(pendingTool.args),
            icon: ShieldAlert,
            color: 'text-amber-400',
            borderColor: 'border-amber-500/40',
            bgGlow: 'bg-amber-500/10',
          };
      }
    };

    const details = formatToolDescription();
    const IconComponent = details.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div
          className={`w-full max-w-sm rounded-3xl border ${details.borderColor} bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl ${details.bgGlow} text-slate-100 flex flex-col gap-4 relative overflow-hidden`}
        >
          {/* Top Hologram Header */}
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${details.color}`}>
              <IconComponent className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] tracking-widest font-mono uppercase text-cyan-400/80 font-bold">
                Security Approval Required
              </div>
              <h3 className="text-lg font-bold font-orbitron tracking-wide text-white">
                {details.title}
              </h3>
            </div>
          </div>

          {/* Action Details Card */}
          <div className="p-3.5 rounded-2xl bg-black/50 border border-white/5 flex flex-col gap-2">
            <div className="text-sm font-medium text-slate-200">{details.subtitle}</div>
            {details.detail && (
              <div className="text-xs font-mono text-cyan-300/90 bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-800/40">
                {details.detail}
              </div>
            )}
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              RS AI Assistant will execute this action only upon your explicit approval.
            </div>
          </div>

          {/* Action Decision Buttons */}
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={onDenyTool}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 transition-all text-slate-300 font-semibold text-sm border border-slate-700/50 flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              Deny
            </button>
            <button
              onClick={onApproveTool}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition-all text-white font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 border border-cyan-400/50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Onboarding Mobile Permissions Modal
  if (isOnboarding) {
    const grantedCount = permissions.filter((p) => p.status === 'granted').length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
        <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border border-cyan-500/30 bg-slate-950/95 shadow-2xl backdrop-blur-2xl text-slate-100 overflow-hidden relative">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-white/5 bg-gradient-to-b from-cyan-950/30 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                Mobile Device Permissions
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {grantedCount} / {permissions.length} Ready
              </span>
            </div>
            <h2 className="text-xl font-bold font-orbitron tracking-wide text-white">
              Grant Mobile Access
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              To operate as your full-featured voice assistant, RS AI requires device permissions for seamless mobile voice interaction.
            </p>
          </div>

          {/* Permissions Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-white/5">
            {permissions.map((perm) => {
              const IconComp = ICON_MAP[perm.icon] || ShieldCheck;
              const isGranted = perm.status === 'granted';

              return (
                <div
                  key={perm.id}
                  className="pt-2.5 first:pt-0 flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl border mt-0.5 ${
                        isGranted
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-800/80 border-white/10 text-slate-400'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">{perm.label}</span>
                        {perm.isSensitive && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono border border-amber-500/30">
                            Strict
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        {perm.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onRequestPermission?.(perm.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      isGranted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                        : 'bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                    }`}
                  >
                    {isGranted ? 'Allowed' : 'Grant'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-white/5 bg-slate-900/60 flex items-center gap-3">
            <button
              onClick={onGrantAll}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-all flex-1"
            >
              Grant All
            </button>
            <button
              onClick={onFinishOnboarding}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all flex-1"
            >
              Start Assistant
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
