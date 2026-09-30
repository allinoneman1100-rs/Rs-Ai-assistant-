export type AssistantState =
  | 'disconnected'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'executing_tool'
  | 'paused'
  | 'error';

export type DevicePermissionType =
  | 'microphone'
  | 'notifications'
  | 'contacts'
  | 'phone'
  | 'sms'
  | 'camera'
  | 'storage'
  | 'location'
  | 'app_launch';

export type PermissionStatus = 'prompt' | 'granted' | 'denied';

export interface PermissionRecord {
  id: DevicePermissionType;
  label: string;
  description: string;
  icon: string;
  status: PermissionStatus;
  requiredFor: string;
  isSensitive: boolean;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolExecutionRecord {
  id: string;
  name: string;
  args: Record<string, any>;
  status: 'pending_approval' | 'executing' | 'completed' | 'denied' | 'failed';
  result?: any;
  timestamp: number;
  previewType?: 'phone' | 'sms' | 'whatsapp' | 'music' | 'camera' | 'maps' | 'alarm' | 'reminder' | 'search' | 'youtube' | 'website' | 'contacts' | 'share';
}

export interface ContactItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  favorite?: boolean;
}

export interface AlarmItem {
  id: string;
  time: string;
  label: string;
  active: boolean;
}

export interface ReminderItem {
  id: string;
  title: string;
  dueTime: string;
  completed: boolean;
}

export interface ChromaSettings {
  keyColor: string; // hex
  similarity: number; // 0..1
  smoothness: number; // 0..1
  despill: number; // 0..1
}

export interface AssistantSettings {
  voice: string;
  language: string;
  personalityTone: 'witty' | 'sweet' | 'calm' | 'energetic';
  micSensitivity: number; // 0.005 (ultra-sensitive) to 0.05 (low sensitivity)
  outputVolume: number; // 0.0 to 1.5
  noiseSuppression: boolean;
  echoCancellation: boolean;
  characterZoom: number; // 0.75 to 1.35
  themeColor: 'cyan' | 'pink' | 'purple' | 'emerald';
  showParticles: boolean;
  chroma: ChromaSettings;
}

