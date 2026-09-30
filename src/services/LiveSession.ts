import { AssistantState } from '../types/assistant';
import { AudioStreamer } from './AudioStreamer';
import { toolManager } from './ToolManager';

export interface LiveSessionConfig {
  voice?: string;
  language?: string;
  personalityTone?: string;
  micSensitivity?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  onStateChange?: (state: AssistantState) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private audioStreamer: AudioStreamer;
  private state: AssistantState = 'disconnected';
  private config: LiveSessionConfig;
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;

  constructor(config: LiveSessionConfig = {}) {
    this.config = config;

    this.audioStreamer = new AudioStreamer({
      sampleRateInput: 16000,
      sampleRateOutput: 24000,
      onInputChunk: (chunk) => this.handleMicChunk(chunk),
      onVADLevel: (rms, isSpeaking) => this.handleVAD(rms, isSpeaking),
      onPlaybackStateChange: (isPlaying) => this.handlePlaybackChange(isPlaying),
    });

    if (config.micSensitivity !== undefined) {
      this.audioStreamer.setSensitivity(config.micSensitivity);
    }
  }

  public getState(): AssistantState {
    return this.state;
  }

  public getAudioStreamer(): AudioStreamer {
    return this.audioStreamer;
  }

  public pause(): void {
    if (this.state === 'disconnected' || this.state === 'error') return;
    this.audioStreamer.pause();
    this.setState('paused');
  }

  public resume(): void {
    if (this.state !== 'paused') return;
    this.audioStreamer.resume();
    this.setState('listening');
  }

  public togglePause(): void {
    if (this.state === 'paused') {
      this.resume();
    } else if (this.state === 'listening' || this.state === 'speaking' || this.state === 'thinking') {
      this.pause();
    }
  }

  public updateConfig(newConfig: Partial<LiveSessionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.micSensitivity !== undefined) {
      this.audioStreamer.setSensitivity(newConfig.micSensitivity);
    }
  }

  public async connect(): Promise<void> {
    if (this.state !== 'disconnected' && this.state !== 'error') return;
    this.setState('connecting');
    this.isConnecting = true;

    try {
      await this.audioStreamer.initAudio();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        this.isConnecting = false;
        // Send initial session setup message with language & tone
        this.ws?.send(
          JSON.stringify({
            type: 'init',
            voice: this.config.voice || 'Aoede',
            language: this.config.language || 'en-US',
            personalityTone: this.config.personalityTone || 'witty',
          })
        );

        // Start capturing microphone
        try {
          await this.audioStreamer.startRecording({
            echoCancellation: this.config.echoCancellation ?? true,
            noiseSuppression: this.config.noiseSuppression ?? true,
          });
          this.setState('listening');
        } catch (err: any) {
          this.setState('error');
          if (this.config.onError) {
            this.config.onError('Microphone permission required for voice conversation.');
          }
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await this.handleServerMessage(msg);
        } catch (e) {
          console.error('[LiveSession] Message parsing error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[LiveSession] WebSocket error:', err);
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.audioStreamer.stopRecording();
        this.audioStreamer.stopPlayback();
        if (this.state !== 'disconnected') {
          this.setState('disconnected');
        }
      };
    } catch (err: any) {
      this.isConnecting = false;
      this.setState('error');
      if (this.config.onError) {
        this.config.onError(err.message || 'Connection failed');
      }
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.audioStreamer.stopRecording();
    this.audioStreamer.stopPlayback();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }

  private handleMicChunk(base64Chunk: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          audio: base64Chunk,
        })
      );
    }
  }

  private handleVAD(rms: number, isSpeaking: boolean): void {
    if (this.config.onAudioLevel) {
      this.config.onAudioLevel(rms);
    }

    // User interrupted the assistant!
    if (isSpeaking && this.state === 'speaking') {
      this.audioStreamer.stopPlayback();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'interrupt' }));
      }
      this.setState('listening');
    }
  }

  private handlePlaybackChange(isPlaying: boolean): void {
    if (isPlaying) {
      if (this.state !== 'executing_tool') {
        this.setState('speaking');
      }
    } else {
      if (this.state === 'speaking') {
        this.setState('listening');
      }
    }
  }

  private async handleServerMessage(msg: any): Promise<void> {
    switch (msg.type) {
      case 'audio': {
        if (msg.audio) {
          if (this.state !== 'speaking' && this.state !== 'executing_tool') {
            this.setState('speaking');
          }
          await this.audioStreamer.playChunk(msg.audio);
        }
        break;
      }

      case 'interrupted': {
        this.audioStreamer.stopPlayback();
        this.setState('listening');
        break;
      }

      case 'turnComplete': {
        // Model finished turn; if no audio playing, transition back to listening
        if (!this.audioStreamer.getIsPlaying() && this.state !== 'executing_tool') {
          this.setState('listening');
        }
        break;
      }

      case 'toolCall': {
        this.setState('executing_tool');
        const calls = msg.calls || [];
        for (const call of calls) {
          const { id, name, args } = call;
          try {
            const result = await toolManager.handleToolCall(id, name, args);
            // Send back function result to model
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(
                JSON.stringify({
                  type: 'toolResponse',
                  id,
                  name,
                  response: result,
                })
              );
            }
          } catch (err: any) {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(
                JSON.stringify({
                  type: 'toolResponse',
                  id,
                  name,
                  response: { error: err.message },
                })
              );
            }
          }
        }
        this.setState('listening');
        break;
      }

      case 'error': {
        console.error('[LiveSession] Server reported error:', msg.message);
        if (this.config.onError) {
          this.config.onError(msg.message || 'Live session error');
        }
        break;
      }
    }
  }

  private setState(newState: AssistantState): void {
    if (this.state === newState) return;
    this.state = newState;
    if (this.config.onStateChange) {
      this.config.onStateChange(newState);
    }
  }
}
