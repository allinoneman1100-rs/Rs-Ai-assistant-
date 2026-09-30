/**
 * AudioStreamer manages:
 * 1. 16kHz PCM16 Microphone capture with echo cancellation, noise suppression, and VAD.
 * 2. 24kHz PCM16 Web Audio API streaming playback with precise gapless scheduling and instant interruption.
 * 3. AnalyserNode telemetry for real-time lip synchronization, viseme generation, and waveform visualizers.
 */

export interface AudioStreamerConfig {
  sampleRateInput?: number; // 16000
  sampleRateOutput?: number; // 24000
  onInputChunk?: (base64PCM16: string) => void;
  onVADLevel?: (level: number, isSpeaking: boolean) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export class AudioStreamer {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private inputProcessor: ScriptProcessorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;

  private outputAnalyser: AnalyserNode | null = null;
  private outputGainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  private isRecording: boolean = false;
  private isMuted: boolean = false;
  private isPaused: boolean = false;
  private vadThreshold: number = 0.015;
  private volumeLevel: number = 1.0;
  private config: AudioStreamerConfig;

  // Analyser buffers for visualization & lip-sync
  private outputFreqData: Uint8Array<ArrayBuffer> | null = null;
  private inputFreqData: Uint8Array<ArrayBuffer> | null = null;

  constructor(config: AudioStreamerConfig = {}) {
    this.config = {
      sampleRateInput: 16000,
      sampleRateOutput: 24000,
      ...config,
    };
  }

  /**
   * Adjusts VAD (Voice Activity Detection) sensitivity threshold.
   * Lower value = more sensitive; Higher value = louder speech required.
   */
  public setSensitivity(threshold: number): void {
    this.vadThreshold = Math.max(0.002, Math.min(0.08, threshold));
  }

  public getSensitivity(): number {
    return this.vadThreshold;
  }

  /**
   * Adjusts model response audio volume (0.0 to 1.5)
   */
  public setOutputVolume(volume: number): void {
    this.volumeLevel = Math.max(0, Math.min(1.5, volume));
    if (this.outputGainNode && this.outputAudioCtx) {
      this.outputGainNode.gain.setValueAtTime(this.volumeLevel, this.outputAudioCtx.currentTime);
    }
  }

  public getOutputVolume(): number {
    return this.volumeLevel;
  }

  /**
   * Mutes or unmutes microphone transmission
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Pauses the session audio processing & playback
   */
  public pause(): void {
    this.isPaused = true;
    this.stopPlayback();
  }

  /**
   * Resumes session audio processing & playback
   */
  public resume(): void {
    this.isPaused = false;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Initializes or unlocks audio contexts upon user interaction
   */
  public async initAudio(): Promise<void> {
    if (!this.outputAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioCtx = new AudioCtxClass({
        sampleRate: this.config.sampleRateOutput,
      });

      this.outputGainNode = this.outputAudioCtx.createGain();
      this.outputGainNode.gain.value = this.volumeLevel;

      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.2;
      this.outputFreqData = new Uint8Array(this.outputAnalyser.frequencyBinCount);

      this.outputGainNode.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.outputAudioCtx.destination);
    }

    if (this.outputAudioCtx.state === 'suspended') {
      await this.outputAudioCtx.resume();
    }
  }

  /**
   * Starts capturing microphone audio at 16kHz PCM16
   */
  public async startRecording(options?: { echoCancellation?: boolean; noiseSuppression?: boolean }): Promise<void> {
    if (this.isRecording) return;
    await this.initAudio();

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioCtx = new AudioCtxClass({
      sampleRate: this.config.sampleRateInput,
    });

    if (this.inputAudioCtx.state === 'suspended') {
      await this.inputAudioCtx.resume();
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: this.config.sampleRateInput,
        echoCancellation: options?.echoCancellation ?? true,
        noiseSuppression: options?.noiseSuppression ?? true,
        autoGainControl: true,
      },
    });

    this.inputSource = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
    this.inputAnalyser = this.inputAudioCtx.createAnalyser();
    this.inputAnalyser.fftSize = 256;
    this.inputFreqData = new Uint8Array(this.inputAnalyser.frequencyBinCount);

    // Buffer size of 2048 gives ~128ms chunks at 16kHz
    const bufferSize = 2048;
    this.inputProcessor = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1);

    this.inputProcessor.onaudioprocess = (e) => {
      if (!this.isRecording || this.isPaused) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // 1. Calculate RMS energy for VAD (Voice Activity Detection)
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      const isSpeaking = rms > this.vadThreshold;
      if (this.config.onVADLevel) {
        this.config.onVADLevel(rms, isSpeaking && !this.isMuted);
      }

      // If muted, do not send audio chunks to server
      if (this.isMuted) return;

      // 2. Convert Float32 (-1.0 to 1.0) to PCM16 Int16 Array
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // 3. Convert to base64 and emit
      const base64 = this.arrayBufferToBase64(pcm16.buffer);
      if (this.config.onInputChunk) {
        this.config.onInputChunk(base64);
      }
    };

    this.inputSource.connect(this.inputAnalyser);
    this.inputAnalyser.connect(this.inputProcessor);
    // Connect to a mute node or destination to ensure processor fires
    const muteGain = this.inputAudioCtx.createGain();
    muteGain.gain.value = 0;
    this.inputProcessor.connect(muteGain);
    muteGain.connect(this.inputAudioCtx.destination);

    this.isRecording = true;
  }

  /**
   * Stops microphone capture
   */
  public stopRecording(): void {
    this.isRecording = false;

    if (this.inputProcessor) {
      this.inputProcessor.disconnect();
      this.inputProcessor = null;
    }
    if (this.inputAnalyser) {
      this.inputAnalyser.disconnect();
      this.inputAnalyser = null;
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.inputAudioCtx) {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }
  }

  /**
   * Plays incoming 24kHz PCM16 audio chunk with seamless queued scheduling
   */
  public async playChunk(base64PCM16: string): Promise<void> {
    await this.initAudio();
    if (!this.outputAudioCtx || !this.outputGainNode) return;

    const arrayBuffer = this.base64ToArrayBuffer(base64PCM16);
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
    }

    const audioBuffer = this.outputAudioCtx.createBuffer(
      1,
      float32Array.length,
      this.config.sampleRateOutput || 24000
    );
    audioBuffer.copyToChannel(float32Array, 0);

    const source = this.outputAudioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputGainNode);

    const now = this.outputAudioCtx.currentTime;
    // Schedule seamlessly
    if (this.nextStartTime < now) {
      this.nextStartTime = now + 0.015;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;

    this.activeSources.add(source);
    if (this.config.onPlaybackStateChange) {
      this.config.onPlaybackStateChange(true);
    }

    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0 && this.config.onPlaybackStateChange) {
        this.config.onPlaybackStateChange(false);
      }
    };
  }

  /**
   * Interruption handling: stops all queued and playing audio instantly
   */
  public stopPlayback(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    });
    this.activeSources.clear();

    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
    if (this.config.onPlaybackStateChange) {
      this.config.onPlaybackStateChange(false);
    }
  }

  /**
   * Gets current output audio energy level (0.0 to 1.0) and frequency spectrum
   * Used for character lip movement and audio waveforms.
   */
  public getOutputTelemetry(): { amplitude: number; frequencies: Uint8Array<ArrayBuffer> | null } {
    if (!this.outputAnalyser || !this.outputFreqData || this.activeSources.size === 0) {
      return { amplitude: 0, frequencies: null };
    }

    this.outputAnalyser.getByteFrequencyData(this.outputFreqData);

    let sum = 0;
    for (let i = 0; i < this.outputFreqData.length; i++) {
      sum += this.outputFreqData[i];
    }
    const avg = sum / this.outputFreqData.length;
    const amplitude = Math.min(1.0, avg / 128);

    return { amplitude, frequencies: this.outputFreqData };
  }

  /**
   * Gets current input audio level (for mic waveform)
   */
  public getInputTelemetry(): { amplitude: number; frequencies: Uint8Array<ArrayBuffer> | null } {
    if (!this.inputAnalyser || !this.inputFreqData || !this.isRecording) {
      return { amplitude: 0, frequencies: null };
    }

    this.inputAnalyser.getByteFrequencyData(this.inputFreqData);
    let sum = 0;
    for (let i = 0; i < this.inputFreqData.length; i++) {
      sum += this.inputFreqData[i];
    }
    const avg = sum / this.inputFreqData.length;
    return { amplitude: Math.min(1.0, avg / 128), frequencies: this.inputFreqData };
  }

  public getIsPlaying(): boolean {
    return this.activeSources.size > 0;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
