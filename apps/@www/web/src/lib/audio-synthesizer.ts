import type { AudioParameters } from "../types/weather";

export class AudioSynthesizer {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];
  private filterNodes: BiquadFilterNode[] = [];
  private lfoNodes: OscillatorNode[] = [];
  private lfoGainNodes: GainNode[] = [];
  private masterGain: GainNode | null = null;
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
    this.analyserNode.fftSize = 256; // 128 frequency bins
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Connect: masterGain -> analyser -> destination
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
  }

  async start(params: AudioParameters): Promise<void> {
    if (!this.audioContext || !this.masterGain) {
      throw new Error("AudioSynthesizer not initialized");
    }

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    // Stop any existing audio
    this.stop();

    const ctx = this.audioContext;
    this.isPlaying = true;
    this.currentParams = params;

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

      // Connect LFO based on target
      switch (lfoConfig.target) {
        case "frequency": {
          const targetIndex = lfoConfig.targetIndex ?? 0;
          if (targetIndex < oscillators.length) {
            // Modulate frequency (depth controls range in Hz)
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
            // Modulate detune (depth controls range in cents)
            lfoGain.gain.value = lfoConfig.depth * 50; // Up to 50 cents
            lfo.connect(lfoGain);
            lfoGain.connect(oscillators[targetIndex].detune);
          }
          break;
        }
        case "gain": {
          const targetIndex = lfoConfig.targetIndex ?? 0;
          if (targetIndex < gainNodes.length) {
            // Modulate gain (depth controls amplitude)
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
            // Modulate filter frequency
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
   * Crossfade to new audio parameters over a specified duration
   */
  async crossfade(
    newParams: AudioParameters,
    duration: number = 8,
  ): Promise<void> {
    if (!this.audioContext || !this.masterGain || !this.isPlaying) {
      // If not playing, just start normally
      return this.start(newParams);
    }

    const ctx = this.audioContext;

    // Store old nodes
    const oldOscillators = this.oscillators;
    const oldGainNodes = this.gainNodes;
    const oldLfoNodes = this.lfoNodes;
    const oldLfoGainNodes = this.lfoGainNodes;

    // Create new oscillators/nodes
    const newOscillators: OscillatorNode[] = [];
    const newGainNodes: GainNode[] = [];

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

      newOscillators.push(osc);
      newGainNodes.push(gain);

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

    // Update state immediately
    this.oscillators = newOscillators;
    this.gainNodes = newGainNodes;
    this.lfoNodes = [];
    this.lfoGainNodes = [];
    this.currentParams = newParams;

    // Apply new LFOs
    this.applyLFOs(newParams, newOscillators, newGainNodes, this.filterNodes);

    // Clean up old nodes after crossfade completes
    setTimeout(
      () => {
        for (const osc of oldOscillators) {
          try {
            osc.stop();
            osc.disconnect();
          } catch (_e) {
            // Ignore
          }
        }
        for (const gain of oldGainNodes) {
          try {
            gain.disconnect();
          } catch (_e) {
            // Ignore
          }
        }
        for (const lfo of oldLfoNodes) {
          try {
            lfo.stop();
            lfo.disconnect();
          } catch (_e) {
            // Ignore
          }
        }
        for (const lfoGain of oldLfoGainNodes) {
          try {
            lfoGain.disconnect();
          } catch (_e) {
            // Ignore
          }
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
        try {
          osc.stop();
          osc.disconnect();
        } catch (_e) {
          // Ignore if already stopped
        }
      }

      for (const gain of this.gainNodes) {
        try {
          gain.disconnect();
        } catch (_e) {
          // Ignore if already disconnected
        }
      }

      for (const filter of this.filterNodes) {
        try {
          filter.disconnect();
        } catch (_e) {
          // Ignore if already disconnected
        }
      }

      if (this.delayNode) {
        try {
          this.delayNode.disconnect();
        } catch (_e) {
          // Ignore
        }
      }
      if (this.delayFeedback) {
        try {
          this.delayFeedback.disconnect();
        } catch (_e) {
          // Ignore
        }
      }
      if (this.delayMix) {
        try {
          this.delayMix.disconnect();
        } catch (_e) {
          // Ignore
        }
      }
      if (this.reverbNode) {
        try {
          this.reverbNode.disconnect();
        } catch (_e) {
          // Ignore
        }
      }
      if (this.reverbMix) {
        try {
          this.reverbMix.disconnect();
        } catch (_e) {
          // Ignore
        }
      }

      // Clean up LFO nodes
      for (const lfo of this.lfoNodes) {
        try {
          lfo.stop();
          lfo.disconnect();
        } catch (_e) {
          // Ignore
        }
      }
      for (const lfoGain of this.lfoGainNodes) {
        try {
          lfoGain.disconnect();
        } catch (_e) {
          // Ignore
        }
      }

      this.oscillators = [];
      this.gainNodes = [];
      this.filterNodes = [];
      this.lfoNodes = [];
      this.lfoGainNodes = [];
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
}
