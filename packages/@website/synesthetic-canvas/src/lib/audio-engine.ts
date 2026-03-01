import type { SynthAudioParameters, VisualFeedback } from "../types";

const RAMP_TIME = 2;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private osc0: OscillatorNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private started = false;

  async start(): Promise<void> {
    if (this.started) return;

    this.ctx = new AudioContext();
    const ctx = this.ctx;

    // Create oscillators
    this.osc0 = ctx.createOscillator();
    this.osc0.type = "sine";
    this.osc0.frequency.value = 220;

    this.osc1 = ctx.createOscillator();
    this.osc1.type = "triangle";
    this.osc1.frequency.value = 330;

    this.osc2 = ctx.createOscillator();
    this.osc2.type = "sawtooth";
    this.osc2.frequency.value = 110;

    // Mix gain (oscillators → filter)
    const mixGain = ctx.createGain();
    mixGain.gain.value = 0.3;

    this.osc0.connect(mixGain);
    this.osc1.connect(mixGain);
    this.osc2.connect(mixGain);

    // Filter
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 800;
    this.filter.Q.value = 2;
    mixGain.connect(this.filter);

    // Master gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.15;
    this.filter.connect(this.masterGain);

    // Dry path
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.7;
    this.masterGain.connect(this.dryGain);

    // Delay path
    this.delayNode = ctx.createDelay(2);
    this.delayNode.delayTime.value = 0.3;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.3;
    this.masterGain.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);

    // Wet gain (delay output)
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.3;
    this.delayNode.connect(this.wetGain);

    // Analyser
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    this.dryGain.connect(this.analyser);
    this.wetGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // LFO → filter frequency
    this.lfo = ctx.createOscillator();
    this.lfo.type = "sine";
    this.lfo.frequency.value = 0.5;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 200;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);

    // Start everything
    this.osc0.start();
    this.osc1.start();
    this.osc2.start();
    this.lfo.start();
    this.started = true;
  }

  stop(): void {
    if (!this.started || !this.ctx) return;

    this.osc0?.stop();
    this.osc1?.stop();
    this.osc2?.stop();
    this.lfo?.stop();
    this.ctx.close();
    this.ctx = null;
    this.started = false;
  }

  isStarted(): boolean {
    return this.started;
  }

  applyParameters(params: SynthAudioParameters): void {
    if (!this.ctx || !this.started) return;
    const t = this.ctx.currentTime;
    const end = t + RAMP_TIME;

    this.osc0?.frequency.linearRampToValueAtTime(params.osc0Freq, end);
    if (this.osc0 && this.osc0.type !== params.osc0Type)
      this.osc0.type = params.osc0Type;

    this.osc1?.frequency.linearRampToValueAtTime(params.osc1Freq, end);
    if (this.osc1 && this.osc1.type !== params.osc1Type)
      this.osc1.type = params.osc1Type;

    this.osc2?.frequency.linearRampToValueAtTime(params.osc2Freq, end);
    if (this.osc2 && this.osc2.type !== params.osc2Type)
      this.osc2.type = params.osc2Type;

    this.filter?.frequency.linearRampToValueAtTime(params.filterFreq, end);
    this.filter?.Q.linearRampToValueAtTime(params.filterQ, end);
    this.masterGain?.gain.linearRampToValueAtTime(params.masterGain, end);
    this.lfo?.frequency.linearRampToValueAtTime(params.lfoRate, end);
    this.lfoGain?.gain.linearRampToValueAtTime(params.lfoDepth, end);
    this.delayNode?.delayTime.linearRampToValueAtTime(params.delayTime, end);
    this.delayFeedback?.gain.linearRampToValueAtTime(
      params.delayFeedback,
      end,
    );
    this.wetGain?.gain.linearRampToValueAtTime(params.reverbMix, end);
    this.dryGain?.gain.linearRampToValueAtTime(1 - params.reverbMix, end);
  }

  /** Nudge audio immediately based on raw gesture (pre-AI feedback) */
  nudge(velocity: number, pressure: number, isDrawing: boolean): void {
    if (!this.ctx || !this.started) return;
    const t = this.ctx.currentTime;
    const quick = t + 0.1;

    // Velocity → filter cutoff (fast = bright)
    const cutoff = 400 + velocity * 4000;
    this.filter?.frequency.linearRampToValueAtTime(
      Math.min(cutoff, 8000),
      quick,
    );

    // Pressure → gain
    const gain = 0.05 + pressure * 0.2;
    this.masterGain?.gain.linearRampToValueAtTime(gain, quick);

    // Drawing boost
    if (isDrawing) {
      this.masterGain?.gain.linearRampToValueAtTime(gain + 0.05, quick);
    }
  }

  getVisualFeedback(): VisualFeedback {
    if (!this.analyser || !this.frequencyData) {
      return {
        amplitude: 0,
        bassEnergy: 0,
        midEnergy: 0,
        highEnergy: 0,
        spectralCentroid: 0.5,
        isPeak: false,
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    const bins = this.frequencyData;
    const len = bins.length;

    // Overall amplitude
    let sum = 0;
    for (let i = 0; i < len; i++) sum += bins[i];
    const amplitude = sum / (len * 255);

    // Band energies (bass: 0-15%, mid: 15-50%, high: 50-100%)
    const bassEnd = Math.floor(len * 0.15);
    const midEnd = Math.floor(len * 0.5);

    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += bins[i];
    const bassEnergy = bassEnd > 0 ? bassSum / (bassEnd * 255) : 0;

    let midSum = 0;
    for (let i = bassEnd; i < midEnd; i++) midSum += bins[i];
    const midEnergy =
      midEnd - bassEnd > 0 ? midSum / ((midEnd - bassEnd) * 255) : 0;

    let highSum = 0;
    for (let i = midEnd; i < len; i++) highSum += bins[i];
    const highEnergy =
      len - midEnd > 0 ? highSum / ((len - midEnd) * 255) : 0;

    // Spectral centroid (normalized 0-1)
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < len; i++) {
      weightedSum += i * bins[i];
      totalWeight += bins[i];
    }
    const spectralCentroid =
      totalWeight > 0 ? weightedSum / (totalWeight * len) : 0.5;

    // Simple peak detection
    const isPeak = amplitude > 0.6;

    return {
      amplitude,
      bassEnergy,
      midEnergy,
      highEnergy,
      spectralCentroid,
      isPeak,
    };
  }
}
