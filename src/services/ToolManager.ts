import { AlarmItem, ContactItem, DevicePermissionType, ReminderItem, ToolExecutionRecord } from '../types/assistant';
import { permissionManager } from './PermissionManager';

export const INITIAL_CONTACTS: ContactItem[] = [
  { id: '1', name: 'Alex Rivera', phone: '+1 (555) 234-5678', email: 'alex@example.com', favorite: true },
  { id: '2', name: 'Sarah Chen', phone: '+1 (555) 876-5432', email: 'sarah.c@example.com', favorite: true },
  { id: '3', name: 'Marcus Johnson', phone: '+1 (555) 456-7890', email: 'marcus@example.com' },
  { id: '4', name: 'Emily Taylor', phone: '+1 (555) 789-0123', email: 'emily.t@example.com' },
  { id: '5', name: 'David Kim', phone: '+1 (555) 321-6540', email: 'david.kim@example.com' },
];

export class ToolManager {
  private activePendingTool: ToolExecutionRecord | null = null;
  private pendingResolver: ((result: any) => void) | null = null;
  private executionHistory: ToolExecutionRecord[] = [];
  private listeners: Set<() => void> = new Set();

  private alarms: AlarmItem[] = [
    { id: '1', time: '07:00 AM', label: 'Morning Workout', active: true },
    { id: '2', time: '08:30 AM', label: 'Standup Meeting', active: false },
  ];

  private reminders: ReminderItem[] = [
    { id: '1', title: 'Review quarterly presentation slides', dueTime: '2:00 PM Today', completed: false },
    { id: '2', title: 'Buy Japanese green tea and matcha', dueTime: '6:30 PM Today', completed: false },
  ];

  private contacts: ContactItem[] = [...INITIAL_CONTACTS];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const storedAlarms = localStorage.getItem('rs_alarms');
      if (storedAlarms) this.alarms = JSON.parse(storedAlarms);
      const storedReminders = localStorage.getItem('rs_reminders');
      if (storedReminders) this.reminders = JSON.parse(storedReminders);
      const storedContacts = localStorage.getItem('rs_contacts');
      if (storedContacts) this.contacts = JSON.parse(storedContacts);
    } catch (_) {}
  }

  private saveState() {
    try {
      localStorage.setItem('rs_alarms', JSON.stringify(this.alarms));
      localStorage.setItem('rs_reminders', JSON.stringify(this.reminders));
      localStorage.setItem('rs_contacts', JSON.stringify(this.contacts));
    } catch (_) {}
  }

  public getPendingTool(): ToolExecutionRecord | null {
    return this.activePendingTool;
  }

  public getHistory(): ToolExecutionRecord[] {
    return [...this.executionHistory];
  }

  public getAlarms(): AlarmItem[] {
    return this.alarms;
  }

  public getReminders(): ReminderItem[] {
    return this.reminders;
  }

  public getContacts(): ContactItem[] {
    return this.contacts;
  }

  /**
   * Evaluates if a tool requires explicit confirmation from user
   */
  public isToolSensitive(name: string): { isSensitive: boolean; requiredPermission?: DevicePermissionType; reason: string } {
    switch (name) {
      case 'makePhoneCall':
        return { isSensitive: true, requiredPermission: 'phone', reason: 'Calling phone numbers initiates live voice calls and may incur carrier charges.' };
      case 'sendSMS':
        return { isSensitive: true, requiredPermission: 'sms', reason: 'Sending SMS transmits cellular text messages.' };
      case 'sendWhatsAppMessage':
        return { isSensitive: true, requiredPermission: 'app_launch', reason: 'Transmits messages via WhatsApp.' };
      case 'openCamera':
        return { isSensitive: true, requiredPermission: 'camera', reason: 'Accesses real-time camera viewfinder.' };
      case 'openApp':
        return { isSensitive: true, requiredPermission: 'app_launch', reason: 'Launches an external application.' };
      case 'setAlarm':
        return { isSensitive: false, requiredPermission: 'notifications', reason: 'Sets device alarm.' };
      case 'createReminder':
        return { isSensitive: false, requiredPermission: 'notifications', reason: 'Creates a reminder item.' };
      case 'openMaps':
        return { isSensitive: false, requiredPermission: 'location', reason: 'Accesses location and navigation.' };
      case 'openContacts':
        return { isSensitive: false, requiredPermission: 'contacts', reason: 'Browses contacts directory.' };
      case 'openGallery':
        return { isSensitive: false, requiredPermission: 'storage', reason: 'Opens device gallery.' };
      case 'shareContent':
        return { isSensitive: false, requiredPermission: 'app_launch', reason: 'Opens system share sheet.' };
      case 'openWebsite':
      case 'googleSearch':
      case 'openYouTube':
      case 'playMusic':
      default:
        return { isSensitive: false, reason: 'Safe standard action.' };
    }
  }

  /**
   * Main entry point when Gemini requests a function call
   */
  public async handleToolCall(id: string, name: string, args: Record<string, any>): Promise<any> {
    const sensitivity = this.isToolSensitive(name);
    const hasPerm = sensitivity.requiredPermission ? permissionManager.hasPermission(sensitivity.requiredPermission) : true;

    const record: ToolExecutionRecord = {
      id,
      name,
      args,
      status: sensitivity.isSensitive || !hasPerm ? 'pending_approval' : 'executing',
      timestamp: Date.now(),
      previewType: this.determinePreviewType(name),
    };

    this.executionHistory.unshift(record);

    // If sensitive or missing permission, hold execution until approved
    if (sensitivity.isSensitive || !hasPerm) {
      this.activePendingTool = record;
      this.notify();

      const approval = await new Promise<boolean>((resolve) => {
        this.pendingResolver = resolve;
      });

      this.activePendingTool = null;
      this.notify();

      if (!approval) {
        record.status = 'denied';
        record.result = { error: 'Permission denied by user' };
        this.notify();
        return { status: 'denied', message: `User denied permission to execute ${name}.` };
      }

      if (sensitivity.requiredPermission) {
        permissionManager.setPermission(sensitivity.requiredPermission, 'granted');
      }
    }

    record.status = 'executing';
    this.notify();

    try {
      const result = await this.executeAction(name, args, record);
      record.status = 'completed';
      record.result = result;
      this.notify();
      return result;
    } catch (err: any) {
      record.status = 'failed';
      record.result = { error: err.message || 'Execution failed' };
      this.notify();
      return { status: 'error', message: err.message || 'Failed to execute tool' };
    }
  }

  public approvePendingTool(): void {
    if (this.pendingResolver) {
      this.pendingResolver(true);
      this.pendingResolver = null;
    }
  }

  public denyPendingTool(): void {
    if (this.pendingResolver) {
      this.pendingResolver(false);
      this.pendingResolver = null;
    }
  }

  private determinePreviewType(name: string): ToolExecutionRecord['previewType'] {
    switch (name) {
      case 'makePhoneCall': return 'phone';
      case 'sendSMS': return 'sms';
      case 'sendWhatsAppMessage': return 'whatsapp';
      case 'playMusic': return 'music';
      case 'openCamera': return 'camera';
      case 'openMaps': return 'maps';
      case 'setAlarm': return 'alarm';
      case 'createReminder': return 'reminder';
      case 'googleSearch': return 'search';
      case 'openYouTube': return 'youtube';
      case 'openWebsite': return 'website';
      case 'openContacts': return 'contacts';
      case 'shareContent': return 'share';
      default: return undefined;
    }
  }

  private async executeAction(name: string, args: Record<string, any>, record: ToolExecutionRecord): Promise<any> {
    switch (name) {
      case 'openWebsite': {
        let url = args.url || '';
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
        return { status: 'success', openedUrl: url, message: `Opened website ${url}` };
      }

      case 'googleSearch': {
        const query = args.query || '';
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
        return { status: 'success', query, url: searchUrl, message: `Searched Google for "${query}"` };
      }

      case 'openYouTube': {
        const query = args.searchQuery || '';
        const videoId = args.videoId;
        const ytUrl = videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        window.open(ytUrl, '_blank', 'noopener,noreferrer');
        return { status: 'success', query, url: ytUrl, message: `Opened YouTube for "${query}"` };
      }

      case 'playMusic': {
        const song = args.songTitle || 'Synthwave Dreams';
        const artist = args.artist || 'RS Audio Lab';
        // Open Spotify search or simulate music playback
        const musicUrl = `https://open.spotify.com/search/${encodeURIComponent(`${song} ${artist}`)}`;
        return {
          status: 'success',
          song,
          artist,
          musicUrl,
          message: `Now playing "${song}" by ${artist}`,
        };
      }

      case 'openApp': {
        const app = args.appName || '';
        return { status: 'success', app, message: `Launched ${app}` };
      }

      case 'sendWhatsAppMessage': {
        const phone = (args.phoneNumber || '').replace(/[^0-9]/g, '');
        const msg = encodeURIComponent(args.message || '');
        const waUrl = `https://wa.me/${phone}?text=${msg}`;
        window.open(waUrl, '_blank');
        return { status: 'success', phone: args.phoneNumber, messageText: args.message, message: `WhatsApp message dispatched to ${args.phoneNumber}` };
      }

      case 'makePhoneCall': {
        const phone = args.phoneNumber || '';
        const contact = args.contactName || phone;
        window.location.href = `tel:${phone}`;
        return { status: 'success', phone, contact, message: `Calling ${contact} at ${phone}` };
      }

      case 'sendSMS': {
        const phone = args.phoneNumber || '';
        const msg = encodeURIComponent(args.message || '');
        window.location.href = `sms:${phone}?body=${msg}`;
        return { status: 'success', phone, text: args.message, message: `Sent SMS to ${phone}` };
      }

      case 'openCamera': {
        return { status: 'success', mode: args.mode || 'photo', message: 'Camera viewfinder active' };
      }

      case 'openGallery': {
        return { status: 'success', message: 'Gallery viewer opened' };
      }

      case 'openMaps': {
        const dest = args.destination || args.query || 'current location';
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`;
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        return { status: 'success', destination: dest, url: mapsUrl, message: `Opened Google Maps for ${dest}` };
      }

      case 'setAlarm': {
        const newAlarm: AlarmItem = {
          id: Date.now().toString(),
          time: args.time || '07:00 AM',
          label: args.label || 'Alarm',
          active: true,
        };
        this.alarms.push(newAlarm);
        this.saveState();
        return { status: 'success', alarm: newAlarm, message: `Alarm set for ${newAlarm.time} (${newAlarm.label})` };
      }

      case 'createReminder': {
        const newReminder: ReminderItem = {
          id: Date.now().toString(),
          title: args.title || 'New Reminder',
          dueTime: args.dueTime || 'Today',
          completed: false,
        };
        this.reminders.push(newReminder);
        this.saveState();
        return { status: 'success', reminder: newReminder, message: `Reminder created: "${newReminder.title}" for ${newReminder.dueTime}` };
      }

      case 'openContacts': {
        const q = (args.query || '').toLowerCase();
        const matches = q
          ? this.contacts.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
          : this.contacts;
        return { status: 'success', contacts: matches, message: `Found ${matches.length} contacts matching "${args.query || ''}"` };
      }

      case 'shareContent': {
        if (navigator.share) {
          try {
            await navigator.share({
              title: args.title || 'RS AI Assistant',
              text: args.text,
              url: args.url,
            });
          } catch (_) {}
        }
        return { status: 'success', shared: { title: args.title, text: args.text, url: args.url }, message: 'Content shared successfully' };
      }

      default:
        return { status: 'unknown_tool', message: `Executed ${name}` };
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const toolManager = new ToolManager();
