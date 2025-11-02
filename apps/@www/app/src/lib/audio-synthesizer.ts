import type { AudioParameters } from '../types/weather';

export class AudioSynthesizer {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];
  private filterNodes: BiquadFilterNode[] = [];
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayMix: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbMix: GainNode | null = null;
  private isPlaying = false;

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.audioContext.destination);
  }

  async start(params: AudioParameters): Promise<void> {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('AudioSynthesizer not initialized');
    }

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Stop any existing audio
    this.stop();

    const ctx = this.audioContext;
    this.isPlaying = true;

    // Simple, clean audio graph:
    // oscillators -> oscillator gains -> master gain -> destination

    // Create oscillators
    for (const oscParam of params.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = oscParam.type;
      osc.frequency.value = oscParam.frequency;
      if (oscParam.detune) {
        osc.detune.value = oscParam.detune;
      }

      const gain = ctx.createGain();
      gain.gain.value = oscParam.gain * 0.3; // Reduce volume per oscillator

      osc.connect(gain);
      gain.connect(this.masterGain);

      // Add subtle LFO for movement
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1 + Math.random() * 0.3;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);

      osc.start();
      lfo.start();

      this.oscillators.push(osc);
      this.oscillators.push(lfo);
      this.gainNodes.push(gain);
      this.gainNodes.push(lfoGain);
    }

    // Fade in
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);
  }

  stop(): void {
    if (!this.audioContext || !this.isPlaying) return;

    const ctx = this.audioContext;

    // Fade out
    if (this.masterGain) {
      try {
        this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      } catch (e) {
        // Ignore if already stopped
      }
    }

    // Stop all oscillators after fade out
    setTimeout(() => {
      for (const osc of this.oscillators) {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {
          // Ignore if already stopped
        }
      }

      for (const gain of this.gainNodes) {
        try {
          gain.disconnect();
        } catch (e) {
          // Ignore if already disconnected
        }
      }

      for (const filter of this.filterNodes) {
        try {
          filter.disconnect();
        } catch (e) {
          // Ignore if already disconnected
        }
      }

      if (this.delayNode) {
        try {
          this.delayNode.disconnect();
        } catch (e) {
          // Ignore
        }
      }
      if (this.delayFeedback) {
        try {
          this.delayFeedback.disconnect();
        } catch (e) {
          // Ignore
        }
      }
      if (this.delayMix) {
        try {
          this.delayMix.disconnect();
        } catch (e) {
          // Ignore
        }
      }
      if (this.reverbNode) {
        try {
          this.reverbNode.disconnect();
        } catch (e) {
          // Ignore
        }
      }
      if (this.reverbMix) {
        try {
          this.reverbMix.disconnect();
        } catch (e) {
          // Ignore
        }
      }

      this.oscillators = [];
      this.gainNodes = [];
      this.filterNodes = [];
      this.delayNode = null;
      this.delayFeedback = null;
      this.delayMix = null;
      this.reverbNode = null;
      this.reverbMix = null;
      this.isPlaying = false;
    }, 1100);
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private createReverbImpulse(decay: number): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const ctx = this.audioContext;
    const length = ctx.sampleRate * decay;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.exp((-3 * i) / length);
      }
    }

    return impulse;
  }
}
