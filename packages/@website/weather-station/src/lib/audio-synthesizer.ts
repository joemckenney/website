import type { AudioParameters } from "../types/weather";

export class AudioSynthesizer {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];
  private panNodes: StereoPannerNode[] = [];
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

  // Rain noise nodes
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseLfo: OscillatorNode | null = null;
  private noiseLfoGain: GainNode | null = null;

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;

    // Create analyser node for frequency visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Effects chain
    this.setupEffectsChain();
  }

  private setupEffectsChain(): void {
    if (!this.audioContext || !this.masterGain || !this.analyserNode) return;

    const ctx = this.audioContext;

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.7;

    this.delayNode = ctx.createDelay(2);
    this.delayNode.delayTime.value = 0.35;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.25;
    this.delayMix = ctx.createGain();
    this.delayMix.gain.value = 0.15;

    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayMix);

    this.reverbNode = ctx.createConvolver();
    this.reverbMix = ctx.createGain();
    this.reverbMix.gain.value = 0.3;

    this.updateReverbImpulse(3);
    this.reverbNode.connect(this.reverbMix);

    this.masterGain.connect(this.dryGain);
    this.masterGain.connect(this.delayNode);
    this.masterGain.connect(this.reverbNode);

    this.dryGain.connect(this.analyserNode);
    this.delayMix.connect(this.analyserNode);
    this.reverbMix.connect(this.analyserNode);

    this.analyserNode.connect(ctx.destination);
  }

  private updateReverbImpulse(decay: number): void {
    if (!this.audioContext || !this.reverbNode) return;

    const ctx = this.audioContext;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * Math.min(decay, 6));
    const impulse = ctx.createBuffer(2, length, sampleRate);

    let state = 42;
    const seededRand = () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
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

    this.stop();

    const ctx = this.audioContext;
    this.isPlaying = true;

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

    // Create oscillators with panning
    for (const oscParam of params.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = oscParam.type;
      osc.frequency.value = oscParam.frequency;
      if (oscParam.detune) {
        osc.detune.value = oscParam.detune;
      }

      const gain = ctx.createGain();
      gain.gain.value = oscParam.gain * 0.3;

      const panner = ctx.createStereoPanner();
      panner.pan.value = oscParam.pan ?? 0;

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);

      osc.start();

      this.oscillators.push(osc);
      this.gainNodes.push(gain);
      this.panNodes.push(panner);
    }

    // Create and apply LFOs
    this.applyLFOs(params, this.oscillators, this.gainNodes, this.filterNodes);

    // Create noise generator for rain
    if (params.noise) {
      this.createNoiseGenerator(params);
    }

    // Fade in
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);
  }

  private createNoiseGenerator(params: AudioParameters): void {
    if (!this.audioContext || !this.masterGain || !params.noise) return;

    const ctx = this.audioContext;
    const noise = params.noise;

    // Create white noise buffer
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    // Bandpass filter for rain-like frequencies
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noiseFilter.frequency.value = noise.frequency ?? 4000;
    this.noiseFilter.Q.value = noise.q ?? 1.5;

    // Gain for volume control
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = noise.gain * 0.3;

    // LFO for rhythmic patter (amplitude modulation)
    if (noise.rate) {
      this.noiseLfo = ctx.createOscillator();
      this.noiseLfo.type = "square"; // sharp on/off for raindrop bursts
      this.noiseLfo.frequency.value = noise.rate;

      this.noiseLfoGain = ctx.createGain();
      this.noiseLfoGain.gain.value = noise.gain * 0.15;

      this.noiseLfo.connect(this.noiseLfoGain);
      this.noiseLfoGain.connect(this.noiseGain.gain);
      this.noiseLfo.start();
    }

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    this.noiseSource.start();
  }

  private stopNoiseGenerator(): void {
    try { this.noiseSource?.stop(); this.noiseSource?.disconnect(); } catch { /* */ }
    try { this.noiseGain?.disconnect(); } catch { /* */ }
    try { this.noiseFilter?.disconnect(); } catch { /* */ }
    try { this.noiseLfo?.stop(); this.noiseLfo?.disconnect(); } catch { /* */ }
    try { this.noiseLfoGain?.disconnect(); } catch { /* */ }
    this.noiseSource = null;
    this.noiseGain = null;
    this.noiseFilter = null;
    this.noiseLfo = null;
    this.noiseLfoGain = null;
  }

  private applyEffects(params: AudioParameters): void {
    if (params.effects.reverb && this.reverbMix) {
      this.reverbMix.gain.value = params.effects.reverb.mix;
      this.updateReverbImpulse(params.effects.reverb.decay);
    }
    if (params.effects.delay) {
      if (this.delayNode) this.delayNode.delayTime.value = params.effects.delay.time;
      if (this.delayFeedback) this.delayFeedback.gain.value = params.effects.delay.feedback;
      if (this.delayMix) this.delayMix.gain.value = params.effects.delay.mix;
    }
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
    if (!this.audioContext || !params.lfos || params.lfos.length === 0) return;

    const ctx = this.audioContext;

    for (const lfoConfig of params.lfos) {
      const lfo = ctx.createOscillator();
      lfo.type = lfoConfig.waveform;
      lfo.frequency.value = lfoConfig.rate;

      const lfoGain = ctx.createGain();

      switch (lfoConfig.target) {
        case "frequency": {
          const ti = lfoConfig.targetIndex ?? 0;
          if (ti < oscillators.length) {
            lfoGain.gain.value = oscillators[ti].frequency.value * lfoConfig.depth * 0.1;
            lfo.connect(lfoGain);
            lfoGain.connect(oscillators[ti].frequency);
          }
          break;
        }
        case "detune": {
          const ti = lfoConfig.targetIndex ?? 0;
          if (ti < oscillators.length) {
            lfoGain.gain.value = lfoConfig.depth * 50;
            lfo.connect(lfoGain);
            lfoGain.connect(oscillators[ti].detune);
          }
          break;
        }
        case "gain": {
          const ti = lfoConfig.targetIndex ?? 0;
          if (ti < gainNodes.length) {
            lfoGain.gain.value = gainNodes[ti].gain.value * lfoConfig.depth * 0.5;
            lfo.connect(lfoGain);
            lfoGain.connect(gainNodes[ti].gain);
          }
          break;
        }
        case "filter": {
          const ti = lfoConfig.targetIndex ?? 0;
          if (ti < filterNodes.length) {
            lfoGain.gain.value = filterNodes[ti].frequency.value * lfoConfig.depth * 0.3;
            lfo.connect(lfoGain);
            lfoGain.connect(filterNodes[ti].frequency);
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
   */
  updateParameters(params: AudioParameters, rampDuration = 10): void {
    if (!this.audioContext || !this.isPlaying) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const rampEnd = now + rampDuration;

    // Ramp oscillator parameters
    for (let i = 0; i < params.oscillators.length && i < this.oscillators.length; i++) {
      const osc = this.oscillators[i];
      const gain = this.gainNodes[i];
      const panner = this.panNodes[i];
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

      if (panner && target.pan !== undefined) {
        panner.pan.cancelScheduledValues(now);
        panner.pan.setValueAtTime(panner.pan.value, now);
        panner.pan.linearRampToValueAtTime(target.pan, rampEnd);
      }
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

    // Update noise generator
    if (params.noise) {
      if (this.noiseGain) {
        this.noiseGain.gain.cancelScheduledValues(now);
        this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
        this.noiseGain.gain.linearRampToValueAtTime(params.noise.gain * 0.3, rampEnd);
      }
      if (this.noiseFilter && params.noise.frequency) {
        this.noiseFilter.frequency.cancelScheduledValues(now);
        this.noiseFilter.frequency.setValueAtTime(this.noiseFilter.frequency.value, now);
        this.noiseFilter.frequency.linearRampToValueAtTime(params.noise.frequency, rampEnd);
      }
      if (this.noiseLfo && params.noise.rate) {
        this.noiseLfo.frequency.cancelScheduledValues(now);
        this.noiseLfo.frequency.setValueAtTime(this.noiseLfo.frequency.value, now);
        this.noiseLfo.frequency.linearRampToValueAtTime(params.noise.rate, rampEnd);
      }
      if (!this.noiseSource) {
        this.createNoiseGenerator(params);
      }
    } else if (this.noiseSource) {
      // Rain stopped — fade out noise
      if (this.noiseGain) {
        this.noiseGain.gain.cancelScheduledValues(now);
        this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
        this.noiseGain.gain.linearRampToValueAtTime(0, rampEnd);
      }
      setTimeout(() => this.stopNoiseGenerator(), rampDuration * 1000 + 100);
    }
  }

  private computeLfoGainValue(
    lfo: NonNullable<AudioParameters["lfos"]>[number],
    _index: number,
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
   * Crossfade to new audio parameters
   */
  async crossfade(newParams: AudioParameters, duration = 8): Promise<void> {
    if (!this.audioContext || !this.masterGain || !this.isPlaying) {
      return this.start(newParams);
    }

    const ctx = this.audioContext;

    // Store old nodes
    const oldOscillators = this.oscillators;
    const oldGainNodes = this.gainNodes;
    const oldPanNodes = this.panNodes;
    const oldFilterNodes = this.filterNodes;
    const oldLfoNodes = this.lfoNodes;
    const oldLfoGainNodes = this.lfoGainNodes;

    this.oscillators = [];
    this.gainNodes = [];
    this.panNodes = [];
    this.filterNodes = [];
    this.lfoNodes = [];
    this.lfoGainNodes = [];

    this.applyEffects(newParams);

    // Create new filters
    for (const filterParam of newParams.filters) {
      const filter = ctx.createBiquadFilter();
      filter.type = filterParam.type;
      filter.frequency.value = filterParam.frequency;
      filter.Q.value = filterParam.q;
      if (filterParam.gain !== undefined) filter.gain.value = filterParam.gain;
      this.filterNodes.push(filter);
    }

    // Create new oscillators
    for (const oscParam of newParams.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = oscParam.type;
      osc.frequency.value = oscParam.frequency;
      if (oscParam.detune) osc.detune.value = oscParam.detune;

      const gain = ctx.createGain();
      gain.gain.value = 0;
      const targetGain = oscParam.gain * 0.3;

      const panner = ctx.createStereoPanner();
      panner.pan.value = oscParam.pan ?? 0;

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);

      osc.start();

      this.oscillators.push(osc);
      this.gainNodes.push(gain);
      this.panNodes.push(panner);

      gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + duration);
    }

    // Fade out old oscillators
    for (const gain of oldGainNodes) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      } catch { /* */ }
    }

    this.applyLFOs(newParams, this.oscillators, this.gainNodes, this.filterNodes);

    // Update noise
    this.stopNoiseGenerator();
    if (newParams.noise) {
      this.createNoiseGenerator(newParams);
    }

    // Clean up old nodes after crossfade
    setTimeout(
      () => {
        for (const osc of oldOscillators) {
          try { osc.stop(); osc.disconnect(); } catch { /* */ }
        }
        for (const gain of oldGainNodes) {
          try { gain.disconnect(); } catch { /* */ }
        }
        for (const pan of oldPanNodes) {
          try { pan.disconnect(); } catch { /* */ }
        }
        for (const filter of oldFilterNodes) {
          try { filter.disconnect(); } catch { /* */ }
        }
        for (const lfo of oldLfoNodes) {
          try { lfo.stop(); lfo.disconnect(); } catch { /* */ }
        }
        for (const lfoGain of oldLfoGainNodes) {
          try { lfoGain.disconnect(); } catch { /* */ }
        }
      },
      duration * 1000 + 100,
    );
  }

  stop(): void {
    if (!this.audioContext || !this.isPlaying) return;

    const ctx = this.audioContext;

    if (this.masterGain) {
      try {
        this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      } catch { /* */ }
    }

    setTimeout(() => {
      for (const osc of this.oscillators) {
        try { osc.stop(); osc.disconnect(); } catch { /* */ }
      }
      for (const gain of this.gainNodes) {
        try { gain.disconnect(); } catch { /* */ }
      }
      for (const pan of this.panNodes) {
        try { pan.disconnect(); } catch { /* */ }
      }
      for (const filter of this.filterNodes) {
        try { filter.disconnect(); } catch { /* */ }
      }
      for (const lfo of this.lfoNodes) {
        try { lfo.stop(); lfo.disconnect(); } catch { /* */ }
      }
      for (const lfoGain of this.lfoGainNodes) {
        try { lfoGain.disconnect(); } catch { /* */ }
      }
      this.stopNoiseGenerator();

      this.oscillators = [];
      this.gainNodes = [];
      this.panNodes = [];
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

  async suspend(): Promise<void> {
    if (this.audioContext && this.audioContext.state === "running") {
      await this.audioContext.suspend();
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyserNode || !this.isPlaying) return null;
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
