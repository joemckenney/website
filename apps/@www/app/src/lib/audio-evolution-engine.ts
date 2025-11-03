import type { AudioParameters, WeatherData } from '../types/weather';

interface AILanguageModel {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}

export interface EvolutionConfig {
  intervalSeconds: number; // How often to evolve (30-120 seconds recommended)
  crossfadeDuration: number; // Crossfade duration in seconds (5-10 recommended)
  enableEvolution: boolean; // Master switch
}

export class AudioEvolutionEngine {
  private aiSession: AILanguageModel | null = null;
  private weather: WeatherData | null = null;
  private currentParams: AudioParameters | null = null;
  private evolutionTimer: number | null = null;
  private isRunning = false;
  private config: EvolutionConfig;
  private generationCount = 0;

  constructor(config: EvolutionConfig) {
    this.config = config;
  }

  /**
   * Start the evolution loop with an AI session
   */
  async start(
    aiSession: AILanguageModel,
    weather: WeatherData,
    initialParams: AudioParameters,
    onEvolution: (params: AudioParameters) => Promise<void>,
    log?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void,
  ): Promise<void> {
    if (this.isRunning) {
      log?.('Evolution already running', 'warning');
      return;
    }

    this.aiSession = aiSession;
    this.weather = weather;
    this.currentParams = initialParams;
    this.isRunning = true;
    this.generationCount = 0;

    log?.(`Evolution engine started (interval: ${this.config.intervalSeconds}s)`, 'info');

    // Schedule first evolution
    this.scheduleNextEvolution(onEvolution, log);
  }

  /**
   * Stop the evolution loop
   */
  stop(): void {
    if (this.evolutionTimer !== null) {
      clearTimeout(this.evolutionTimer);
      this.evolutionTimer = null;
    }
    this.isRunning = false;
    this.aiSession = null;
  }

  /**
   * Manually trigger an evolution (useful for testing)
   */
  async evolveNow(
    onEvolution: (params: AudioParameters) => Promise<void>,
    log?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void,
  ): Promise<void> {
    if (!this.isRunning || !this.aiSession || !this.weather || !this.currentParams) {
      log?.('Evolution engine not ready', 'error');
      return;
    }

    await this.generateEvolution(onEvolution, log);
  }

  private scheduleNextEvolution(
    onEvolution: (params: AudioParameters) => Promise<void>,
    log?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void,
  ): void {
    if (!this.config.enableEvolution || !this.isRunning) return;

    this.evolutionTimer = window.setTimeout(async () => {
      await this.generateEvolution(onEvolution, log);
      this.scheduleNextEvolution(onEvolution, log);
    }, this.config.intervalSeconds * 1000);
  }

  private async generateEvolution(
    onEvolution: (params: AudioParameters) => Promise<void>,
    log?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void,
  ): Promise<void> {
    if (!this.aiSession || !this.weather || !this.currentParams) return;

    this.generationCount++;
    log?.(`Evolving soundscape (generation ${this.generationCount})...`, 'info');

    try {
      const evolutionPrompt = this.buildEvolutionPrompt(this.weather, this.currentParams);
      const response = await this.aiSession.prompt(evolutionPrompt);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      const newParams = JSON.parse(jsonStr) as AudioParameters;

      // Sanitize parameters
      const sanitized = this.sanitizeParameters(newParams);

      // Update current state
      this.currentParams = sanitized;

      // Trigger crossfade
      await onEvolution(sanitized);

      log?.(`Evolution ${this.generationCount} complete`, 'success');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log?.(`Evolution failed: ${errorMsg}`, 'error');
    }
  }

  private buildEvolutionPrompt(weather: WeatherData, current: AudioParameters): string {
    const currentCount = current.oscillators.length;
    const currentOscs = current.oscillators
      .map((o) => `${o.type} @ ${o.frequency.toFixed(0)}Hz`)
      .join(', ');

    return `Current weather: ${weather.temperature}°F, ${weather.conditions}, wind ${weather.windSpeed}mph

Current soundscape: ${currentCount} oscillators - ${currentOscs}

Evolve this ambient soundscape organically while staying weather-influenced. You can make both subtle AND structural changes:

Variation options (choose a mix):
- Add 1-2 new oscillators for more density and complexity
- Remove 1-2 oscillators for a sparser, more minimal sound
- Shift 2-4 oscillator frequencies (±20-150 Hz)
- Change 1-3 oscillator types for timbral evolution
- Adjust gains (±0.05-0.15)
- Modify detune values for organic movement

Guidelines:
- You can have anywhere from 4-10 oscillators (vary it!)
- Sometimes evolve toward complexity (add layers)
- Sometimes evolve toward minimalism (strip down)
- Keep the weather mood but explore different textures
- Think: clouds gathering/dispersing, light shifting, wind changing

Return ONLY valid JSON in this exact format:
{
  "oscillators": [
    {"type": "sine", "frequency": 110, "gain": 0.2, "detune": 0},
    {"type": "sine", "frequency": 220, "gain": 0.25, "detune": 5},
    {"type": "triangle", "frequency": 165, "gain": 0.15, "detune": -3},
    {"type": "sine", "frequency": 440, "gain": 0.2, "detune": 7},
    {"type": "sawtooth", "frequency": 55, "gain": 0.1, "detune": 0},
    {"type": "sine", "frequency": 880, "gain": 0.15, "detune": -5}
  ],
  "filters": [
    {"type": "lowpass", "frequency": 2000, "q": 1}
  ],
  "effects": {
    "reverb": {"decay": 3, "mix": 0.4},
    "delay": {"time": 0.5, "feedback": 0.3, "mix": 0.2}
  }
}`;
  }

  private sanitizeParameters(params: AudioParameters): AudioParameters {
    const validOscTypes: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];
    const validFilterTypes: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass', 'notch'];

    return {
      oscillators: (params.oscillators || []).map((osc) => ({
        type: validOscTypes.includes(osc.type as OscillatorType) ? osc.type : 'sine',
        frequency: Math.max(20, Math.min(20000, osc.frequency || 220)),
        gain: Math.max(0, Math.min(1, osc.gain || 0.3)),
        detune: osc.detune || 0,
      })),
      filters: (params.filters || []).map((filt) => ({
        type: validFilterTypes.includes(filt.type as BiquadFilterType) ? filt.type : 'lowpass',
        frequency: Math.max(20, Math.min(20000, filt.frequency || 1000)),
        q: Math.max(0.0001, Math.min(1000, filt.q || 1)),
        gain: filt.gain,
      })),
      effects: {
        reverb: params.effects?.reverb
          ? {
              decay: Math.max(0, Math.min(10, params.effects.reverb.decay)),
              mix: Math.max(0, Math.min(1, params.effects.reverb.mix)),
            }
          : undefined,
        delay: params.effects?.delay
          ? {
              time: Math.max(0, Math.min(2, params.effects.delay.time)),
              feedback: Math.max(0, Math.min(0.95, params.effects.delay.feedback)),
              mix: Math.max(0, Math.min(1, params.effects.delay.mix)),
            }
          : undefined,
      },
    };
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getGenerationCount(): number {
    return this.generationCount;
  }

  updateConfig(config: Partial<EvolutionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
