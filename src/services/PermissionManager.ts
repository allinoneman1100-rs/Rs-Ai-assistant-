import { DevicePermissionType, PermissionRecord, PermissionStatus } from '../types/assistant';

const PERMISSION_STORAGE_KEY = 'rs_ai_assistant_permissions';

export const DEFAULT_PERMISSIONS: PermissionRecord[] = [
  {
    id: 'microphone',
    label: 'Microphone & Audio',
    description: 'Enables continuous voice-to-voice conversation with echo cancellation',
    icon: 'Mic',
    status: 'prompt',
    requiredFor: 'Real-time live voice streaming',
    isSensitive: true,
  },
  {
    id: 'notifications',
    label: 'Notifications & Alerts',
    description: 'Enables timely alerts for alarms, reminders, and proactive updates',
    icon: 'Bell',
    status: 'prompt',
    requiredFor: 'Alarms & scheduled reminders',
    isSensitive: false,
  },
  {
    id: 'contacts',
    label: 'Contacts Directory',
    description: 'Allows assistant to find contacts to call or message upon request',
    icon: 'Users',
    status: 'prompt',
    requiredFor: 'Contact search and dialing',
    isSensitive: true,
  },
  {
    id: 'phone',
    label: 'Phone Calls & Dialer',
    description: 'Enables placing phone calls after explicit confirmation',
    icon: 'PhoneCall',
    status: 'prompt',
    requiredFor: 'Direct phone dialing',
    isSensitive: true,
  },
  {
    id: 'sms',
    label: 'SMS Text Messaging',
    description: 'Enables sending SMS text messages after user approval',
    icon: 'MessageSquare',
    status: 'prompt',
    requiredFor: 'Sending SMS and text chats',
    isSensitive: true,
  },
  {
    id: 'camera',
    label: 'Camera Viewfinder',
    description: 'Allows taking photos and launching camera viewfinder on request',
    icon: 'Camera',
    status: 'prompt',
    requiredFor: 'Visual viewfinder & photo capture',
    isSensitive: true,
  },
  {
    id: 'storage',
    label: 'Media & Gallery Storage',
    description: 'Allows browsing photos, videos, and media files',
    icon: 'HardDrive',
    status: 'prompt',
    requiredFor: 'Opening gallery and files',
    isSensitive: false,
  },
  {
    id: 'location',
    label: 'Location & GPS',
    description: 'Provides nearby places, navigation directions, and weather accuracy',
    icon: 'MapPin',
    status: 'prompt',
    requiredFor: 'Google Maps navigation',
    isSensitive: true,
  },
  {
    id: 'app_launch',
    label: 'App Launching & Deep Links',
    description: 'Opens installed apps like WhatsApp, YouTube, Spotify, and Maps',
    icon: 'ExternalLink',
    status: 'prompt',
    requiredFor: 'Launching external applications',
    isSensitive: false,
  },
];

export class PermissionManager {
  private permissions: Map<DevicePermissionType, PermissionRecord> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    DEFAULT_PERMISSIONS.forEach((p) => this.permissions.set(p.id, { ...p }));

    try {
      const stored = localStorage.getItem(PERMISSION_STORAGE_KEY);
      if (stored) {
        const parsed: Record<DevicePermissionType, PermissionStatus> = JSON.parse(stored);
        Object.entries(parsed).forEach(([id, status]) => {
          const rec = this.permissions.get(id as DevicePermissionType);
          if (rec) {
            rec.status = status;
          }
        });
      }
    } catch (_) {}
  }

  private saveToStorage() {
    try {
      const data: Record<string, PermissionStatus> = {};
      this.permissions.forEach((rec, key) => {
        data[key] = rec.status;
      });
      localStorage.setItem(PERMISSION_STORAGE_KEY, JSON.stringify(data));
      this.notify();
    } catch (_) {}
  }

  public getAll(): PermissionRecord[] {
    return Array.from(this.permissions.values());
  }

  public get(id: DevicePermissionType): PermissionRecord | undefined {
    return this.permissions.get(id);
  }

  public hasPermission(id: DevicePermissionType): boolean {
    const rec = this.permissions.get(id);
    return rec?.status === 'granted';
  }

  public setPermission(id: DevicePermissionType, status: PermissionStatus) {
    const rec = this.permissions.get(id);
    if (rec) {
      rec.status = status;
      this.saveToStorage();
    }
  }

  public async requestPermission(id: DevicePermissionType): Promise<PermissionStatus> {
    const rec = this.permissions.get(id);
    if (!rec) return 'denied';

    // Hardware/browser API requests where supported
    if (id === 'microphone') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        rec.status = 'granted';
      } catch (err) {
        rec.status = 'denied';
      }
    } else if (id === 'camera') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        rec.status = 'granted';
      } catch (err) {
        rec.status = 'denied';
      }
    } else if (id === 'notifications') {
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        rec.status = res === 'granted' ? 'granted' : 'denied';
      } else {
        rec.status = 'granted';
      }
    } else if (id === 'location') {
      if ('geolocation' in navigator) {
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          rec.status = 'granted';
        } catch (_) {
          rec.status = 'granted'; // Default to user-confirmed granted for simulated assistant
        }
      } else {
        rec.status = 'granted';
      }
    } else {
      // Android / OS simulated permissions (Contacts, Phone, SMS, Storage, App Launch)
      rec.status = 'granted';
    }

    this.saveToStorage();
    return rec.status;
  }

  public async grantAll(): Promise<void> {
    for (const rec of this.permissions.values()) {
      rec.status = 'granted';
    }
    this.saveToStorage();
  }

  public resetAll(): void {
    DEFAULT_PERMISSIONS.forEach((p) => this.permissions.set(p.id, { ...p }));
    localStorage.removeItem(PERMISSION_STORAGE_KEY);
    this.notify();
  }

  public isInitialLaunch(): boolean {
    return localStorage.getItem('rs_ai_has_onboarded') !== 'true';
  }

  public setOnboarded(): void {
    localStorage.setItem('rs_ai_has_onboarded', 'true');
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const permissionManager = new PermissionManager();
