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

    // Stop any existing audio
    this.stop();

    const ctx = this.audioContext;
    this.isPlaying = true;

    // Create effects chain
    let effectsInput: AudioNode = this.masterGain;

    // Create delay effect if specified
    if (params.effects.delay) {
      this.delayNode = ctx.createDelay(2);
      this.delayNode.delayTime.value = params.effects.delay.time;

      this.delayFeedback = ctx.createGain();
      this.delayFeedback.gain.value = params.effects.delay.feedback;

      this.delayMix = ctx.createGain();
      this.delayMix.gain.value = params.effects.delay.mix;

      // Delay feedback loop
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.delayMix);
      this.delayMix.connect(this.masterGain);

      effectsInput = this.delayNode;
    }

    // Create reverb effect if specified
    if (params.effects.reverb) {
      const impulse = this.createReverbImpulse(params.effects.reverb.decay);
      this.reverbNode = ctx.createConvolver();
      this.reverbNode.buffer = impulse;

      this.reverbMix = ctx.createGain();
      this.reverbMix.gain.value = params.effects.reverb.mix;

      this.reverbNode.connect(this.reverbMix);
      this.reverbMix.connect(effectsInput);
    }

    // Create dry signal path
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - (params.effects.reverb?.mix || 0);
    dryGain.connect(effectsInput);

    // Create filter chain
    let filterChain: AudioNode = dryGain;
    for (const filterParam of params.filters) {
      const filter = ctx.createBiquadFilter();
      filter.type = filterParam.type;
      filter.frequency.value = filterParam.frequency;
      filter.Q.value = filterParam.q;
      if (filterParam.gain !== undefined) {
        filter.gain.value = filterParam.gain;
      }

      this.filterNodes.push(filter);
      filterChain.connect(filter);
      filterChain = filter;
    }

    // Connect filters to effects
    if (this.reverbNode) {
      filterChain.connect(this.reverbNode);
    }
    filterChain.connect(dryGain);

    // Create oscillators
    for (const oscParam of params.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = oscParam.type;
      osc.frequency.value = oscParam.frequency;
      if (oscParam.detune) {
        osc.detune.value = oscParam.detune;
      }

      const gain = ctx.createGain();
      gain.gain.value = oscParam.gain;

      osc.connect(gain);
      gain.connect(dryGain);

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
    }

    // Fade in
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2);
    }
  }

  stop(): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;

    // Fade out
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
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
        gain.disconnect();
      }

      for (const filter of this.filterNodes) {
        filter.disconnect();
      }

      if (this.delayNode) this.delayNode.disconnect();
      if (this.delayFeedback) this.delayFeedback.disconnect();
      if (this.delayMix) this.delayMix.disconnect();
      if (this.reverbNode) this.reverbNode.disconnect();
      if (this.reverbMix) this.reverbMix.disconnect();

      this.oscillators = [];
      this.gainNodes = [];
      this.filterNodes = [];
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
