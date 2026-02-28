import type { AudioParameters } from "../types/weather";

export class AudioSynthesizer {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];
  private filterNodes: BiquadFilterNode[] = [];
  private lfoNodes: OscillatorNode[] = [];
  private lfoGainNodes: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayMix: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbMix: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isPlaying = false;

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;

    // Create analyser node for frequency visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Effects chain: masterGain → delay → reverb → analyser → destination
    // Also: masterGain → dryGain → analyser (dry signal path)
    this.setupEffectsChain();
  }

  private setupEffectsChain(): void {
    if (!this.audioContext || !this.masterGain || !this.analyserNode) return;

    const ctx = this.audioContext;

    // Dry path gain
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.7; // dry level

    // Delay effect
    this.delayNode = ctx.createDelay(2);
    this.delayNode.delayTime.value = 0.35;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.25;
    this.delayMix = ctx.createGain();
    this.delayMix.gain.value = 0.15;

    // Delay feedback loop
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayMix);

    // Reverb effect (convolver with generated impulse response)
    this.reverbNode = ctx.createConvolver();
    this.reverbMix = ctx.createGain();
    this.reverbMix.gain.value = 0.3;

    // Generate a default impulse response
    this.updateReverbImpulse(3, 0);

    this.reverbNode.connect(this.reverbMix);

    // Wire the chain:
    // masterGain → dryGain → analyser
    // masterGain → delayNode → delayMix → analyser
    // masterGain → reverbNode → reverbMix → analyser
    this.masterGain.connect(this.dryGain);
    this.masterGain.connect(this.delayNode);
    this.masterGain.connect(this.reverbNode);

    this.dryGain.connect(this.analyserNode);
    this.delayMix.connect(this.analyserNode);
    this.reverbMix.connect(this.analyserNode);

    this.analyserNode.connect(ctx.destination);
  }

  /**
   * Generate a synthetic reverb impulse response from a seed for determinism.
   */
  private updateReverbImpulse(decay: number, seed: number): void {
    if (!this.audioContext || !this.reverbNode) return;

    const ctx = this.audioContext;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * Math.min(decay, 6));
    const impulse = ctx.createBuffer(2, length, sampleRate);

    // Use seed for deterministic noise
    let state = (seed || 42) | 0;
    const seededRand = () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay envelope with seeded white noise
        data[i] =
          (seededRand() * 2 - 1) * Math.exp((-3 * i) / (sampleRate * decay));
      }
    }

    this.reverbNode.buffer = impulse;
  }

  async start(params: AudioParameters): Promise<void> {
    if (!this.audioContext || !this.masterGain) {
      throw new Error("AudioSynthesizer not initialized");
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    // Stop any existing audio
    this.stop();

    const ctx = this.audioContext;
    this.isPlaying = true;

    // Apply effects parameters
    this.applyEffects(params);

    // Create filters
    for (const filterParam of params.filters) {
      const filter = ctx.createBiquadFilter();
      filter.type = filterParam.type;
      filter.frequency.value = filterParam.frequency;
      filter.Q.value = filterParam.q;
      if (filterParam.gain !== undefined) {
        filter.gain.value = filterParam.gain;
      }
      this.filterNodes.push(filter);
    }

    // Create oscillators
    for (const oscParam of params.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = oscParam.type;
      osc.frequency.value = oscParam.frequency;
      if (oscParam.detune) {
        osc.detune.value = oscParam.detune;
      }

      const gain = ctx.createGain();
      gain.gain.value = oscParam.gain * 0.3;

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();

      this.oscillators.push(osc);
      this.gainNodes.push(gain);
    }

    // Create and apply LFOs
    this.applyLFOs(params, this.oscillators, this.gainNodes, this.filterNodes);

    // Fade in
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);
  }

  private applyEffects(params: AudioParameters): void {
    if (params.effects.reverb && this.reverbMix) {
      this.reverbMix.gain.value = params.effects.reverb.mix;
      this.updateReverbImpulse(params.effects.reverb.decay, 0);
    }
    if (params.effects.delay) {
      if (this.delayNode) {
        this.delayNode.delayTime.value = params.effects.delay.time;
      }
      if (this.delayFeedback) {
        this.delayFeedback.gain.value = params.effects.delay.feedback;
      }
      if (this.delayMix) {
        this.delayMix.gain.value = params.effects.delay.mix;
      }
    }
    // Adjust dry level to complement wet signals
    if (this.dryGain) {
      const reverbMix = params.effects.reverb?.mix ?? 0;
      const delayMix = params.effects.delay?.mix ?? 0;
      this.dryGain.gain.value = Math.max(0.4, 1 - reverbMix - delayMix);
    }
  }

  private applyLFOs(
    params: AudioParameters,
    oscillators: OscillatorNode[],
    gainNodes: GainNode[],
    filterNodes: BiquadFilterNode[],
  ): void {
    if (!this.audioContext || !params.lfos || params.lfos.length === 0) {
      return;
    }

    const ctx = this.audioContext;

    for (const lfoConfig of params.lfos) {
      const lfo = ctx.createOscillator();
      lfo.type = lfoConfig.waveform;
      lfo.frequency.value = lfoConfig.rate;

      const lfoGain = ctx.createGain();

      switch (lfoConfig.target) {
        case "frequency": {
          const targetIndex = lfoConfig.targetIndex ?? 0;
          if (targetIndex < oscillators.length) {
            lfoGain.gain.value =
              oscillators[targetIndex].frequency.value * lfoConfig.depth * 0.1;
            lfo.connect(lfoGain);
            lfoGain.connect(oscillators[targetIndex].frequency);
          }
          break;
        }
        case "detune": {
          const targetIndex = lfoConfig.targetIndex ?? 0;
          if (targetIndex < oscillators.length) {
            lfoGain.gain.value = lfoConfig.depth * 50;
            lfo.connect(lfoGain);
            lfoGain.connect(oscillators[targetIndex].detune);
          }
          break;
        }
        case "gain": {
          const targetIndex = lfoConfig.targetIndex ?? 0;
          if (targetIndex < gainNodes.length) {
            lfoGain.gain.value =
              gainNodes[targetIndex].gain.value * lfoConfig.depth * 0.5;
            lfo.connect(lfoGain);
            lfoGain.connect(gainNodes[targetIndex].gain);
          }
          break;
        }
        case "filter": {
          const targetIndex = lfoConfig.targetIndex ?? 0;
          if (targetIndex < filterNodes.length) {
            lfoGain.gain.value =
              filterNodes[targetIndex].frequency.value * lfoConfig.depth * 0.3;
            lfo.connect(lfoGain);
            lfoGain.connect(filterNodes[targetIndex].frequency);
          }
          break;
        }
      }

      lfo.start();
      this.lfoNodes.push(lfo);
      this.lfoGainNodes.push(lfoGain);
    }
  }

  /**
   * Smooth in-place parameter update without oscillator teardown.
   * Ramps each oscillator's frequency, gain, detune and each LFO's rate/depth
   * using Web Audio's linearRampToValueAtTime.
   */
  updateParameters(params: AudioParameters, rampDuration: number = 10): void {
    if (!this.audioContext || !this.isPlaying) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const rampEnd = now + rampDuration;

    // Ramp oscillator parameters
    for (let i = 0; i < params.oscillators.length && i < this.oscillators.length; i++) {
      const osc = this.oscillators[i];
      const gain = this.gainNodes[i];
      const target = params.oscillators[i];

      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(osc.frequency.value, now);
      osc.frequency.linearRampToValueAtTime(target.frequency, rampEnd);

      osc.detune.cancelScheduledValues(now);
      osc.detune.setValueAtTime(osc.detune.value, now);
      osc.detune.linearRampToValueAtTime(target.detune ?? 0, rampEnd);

      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(target.gain * 0.3, rampEnd);
    }

    // Ramp LFO parameters
    const lfos = params.lfos ?? [];
    for (let i = 0; i < lfos.length && i < this.lfoNodes.length; i++) {
      const lfo = this.lfoNodes[i];
      const lfoGain = this.lfoGainNodes[i];
      const target = lfos[i];

      lfo.frequency.cancelScheduledValues(now);
      lfo.frequency.setValueAtTime(lfo.frequency.value, now);
      lfo.frequency.linearRampToValueAtTime(target.rate, rampEnd);

      // Update LFO depth via its gain node
      const depthValue = this.computeLfoGainValue(target, i);
      if (depthValue !== null) {
        lfoGain.gain.cancelScheduledValues(now);
        lfoGain.gain.setValueAtTime(lfoGain.gain.value, now);
        lfoGain.gain.linearRampToValueAtTime(depthValue, rampEnd);
      }
    }

    // Ramp filter parameters
    for (let i = 0; i < params.filters.length && i < this.filterNodes.length; i++) {
      const filter = this.filterNodes[i];
      const target = params.filters[i];

      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(filter.frequency.value, now);
      filter.frequency.linearRampToValueAtTime(target.frequency, rampEnd);

      filter.Q.cancelScheduledValues(now);
      filter.Q.setValueAtTime(filter.Q.value, now);
      filter.Q.linearRampToValueAtTime(target.q, rampEnd);
    }

    // Ramp effects
    if (params.effects.delay && this.delayNode && this.delayFeedback && this.delayMix) {
      this.delayNode.delayTime.cancelScheduledValues(now);
      this.delayNode.delayTime.setValueAtTime(this.delayNode.delayTime.value, now);
      this.delayNode.delayTime.linearRampToValueAtTime(params.effects.delay.time, rampEnd);

      this.delayFeedback.gain.cancelScheduledValues(now);
      this.delayFeedback.gain.setValueAtTime(this.delayFeedback.gain.value, now);
      this.delayFeedback.gain.linearRampToValueAtTime(params.effects.delay.feedback, rampEnd);

      this.delayMix.gain.cancelScheduledValues(now);
      this.delayMix.gain.setValueAtTime(this.delayMix.gain.value, now);
      this.delayMix.gain.linearRampToValueAtTime(params.effects.delay.mix, rampEnd);
    }

    if (params.effects.reverb && this.reverbMix) {
      this.reverbMix.gain.cancelScheduledValues(now);
      this.reverbMix.gain.setValueAtTime(this.reverbMix.gain.value, now);
      this.reverbMix.gain.linearRampToValueAtTime(params.effects.reverb.mix, rampEnd);
    }
  }

  /**
   * Compute the gain value for an LFO based on its target and the current oscillator state.
   */
  private computeLfoGainValue(
    lfo: NonNullable<AudioParameters["lfos"]>[number],
    index: number,
  ): number | null {
    switch (lfo.target) {
      case "frequency": {
        const ti = lfo.targetIndex ?? 0;
        if (ti < this.oscillators.length) {
          return this.oscillators[ti].frequency.value * lfo.depth * 0.1;
        }
        break;
      }
      case "detune":
        return lfo.depth * 50;
      case "gain": {
        const ti = lfo.targetIndex ?? 0;
        if (ti < this.gainNodes.length) {
          return this.gainNodes[ti].gain.value * lfo.depth * 0.5;
        }
        break;
      }
      case "filter": {
        const ti = lfo.targetIndex ?? 0;
        if (ti < this.filterNodes.length) {
          return this.filterNodes[ti].frequency.value * lfo.depth * 0.3;
        }
        break;
      }
    }
    return null;
  }

  /**
   * Crossfade to new audio parameters over a specified duration
   */
  async crossfade(
    newParams: AudioParameters,
    duration: number = 8,
  ): Promise<void> {
    if (!this.audioContext || !this.masterGain || !this.isPlaying) {
      return this.start(newParams);
    }

    const ctx = this.audioContext;

    // Store old nodes
    const oldOscillators = this.oscillators;
    const oldGainNodes = this.gainNodes;
    const oldFilterNodes = this.filterNodes;
    const oldLfoNodes = this.lfoNodes;
    const oldLfoGainNodes = this.lfoGainNodes;

    // Reset arrays for new nodes
    this.oscillators = [];
    this.gainNodes = [];
    this.filterNodes = [];
    this.lfoNodes = [];
    this.lfoGainNodes = [];

    // Apply new effects
    this.applyEffects(newParams);

    // Create new filters
    for (const filterParam of newParams.filters) {
      const filter = ctx.createBiquadFilter();
      filter.type = filterParam.type;
      filter.frequency.value = filterParam.frequency;
      filter.Q.value = filterParam.q;
      if (filterParam.gain !== undefined) {
        filter.gain.value = filterParam.gain;
      }
      this.filterNodes.push(filter);
    }

    // Create new oscillators
    for (const oscParam of newParams.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = oscParam.type;
      osc.frequency.value = oscParam.frequency;
      if (oscParam.detune) {
        osc.detune.value = oscParam.detune;
      }

      const gain = ctx.createGain();
      gain.gain.value = 0; // Start at 0 for crossfade
      const targetGain = oscParam.gain * 0.3;

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();

      this.oscillators.push(osc);
      this.gainNodes.push(gain);

      // Fade in new oscillator
      gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + duration);
    }

    // Fade out old oscillators
    for (const gain of oldGainNodes) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      } catch (_e) {
        // Ignore
      }
    }

    // Apply new LFOs
    this.applyLFOs(newParams, this.oscillators, this.gainNodes, this.filterNodes);

    // Clean up old nodes after crossfade completes
    setTimeout(
      () => {
        for (const osc of oldOscillators) {
          try { osc.stop(); osc.disconnect(); } catch (_e) { /* */ }
        }
        for (const gain of oldGainNodes) {
          try { gain.disconnect(); } catch (_e) { /* */ }
        }
        for (const filter of oldFilterNodes) {
          try { filter.disconnect(); } catch (_e) { /* */ }
        }
        for (const lfo of oldLfoNodes) {
          try { lfo.stop(); lfo.disconnect(); } catch (_e) { /* */ }
        }
        for (const lfoGain of oldLfoGainNodes) {
          try { lfoGain.disconnect(); } catch (_e) { /* */ }
        }
      },
      duration * 1000 + 100,
    );
  }

  stop(): void {
    if (!this.audioContext || !this.isPlaying) return;

    const ctx = this.audioContext;

    // Fade out
    if (this.masterGain) {
      try {
        this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
        this.masterGain.gain.setValueAtTime(
          this.masterGain.gain.value,
          ctx.currentTime,
        );
        this.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      } catch (_e) {
        // Ignore if already stopped
      }
    }

    // Stop all oscillators after fade out
    setTimeout(() => {
      for (const osc of this.oscillators) {
        try { osc.stop(); osc.disconnect(); } catch (_e) { /* */ }
      }
      for (const gain of this.gainNodes) {
        try { gain.disconnect(); } catch (_e) { /* */ }
      }
      for (const filter of this.filterNodes) {
        try { filter.disconnect(); } catch (_e) { /* */ }
      }
      for (const lfo of this.lfoNodes) {
        try { lfo.stop(); lfo.disconnect(); } catch (_e) { /* */ }
      }
      for (const lfoGain of this.lfoGainNodes) {
        try { lfoGain.disconnect(); } catch (_e) { /* */ }
      }

      this.oscillators = [];
      this.gainNodes = [];
      this.filterNodes = [];
      this.lfoNodes = [];
      this.lfoGainNodes = [];
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

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyserNode || !this.isPlaying) {
      return null;
    }
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getOscillatorCount(): number {
    return this.oscillators.length;
  }

  getLfoCount(): number {
    return this.lfoNodes.length;
  }
}
