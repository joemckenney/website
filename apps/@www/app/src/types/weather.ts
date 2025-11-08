export interface WeatherData {
  temperature: number;
  conditions: string;
  windSpeed: number;
  humidity: number;
  pressure: number;
  location: {
    latitude: number;
    longitude: number;
    city?: string;
  };
  hourly: {
    temperature: number[];
    precipitationProbability: number[];
    windSpeed: number[];
    cloudCover: number[];
  };
  solar: {
    shortwaveRadiation: number;
  };
}

export interface LFOConfig {
  rate: number; // Hz (0.01 - 20)
  depth: number; // 0-1
  target: 'frequency' | 'gain' | 'detune' | 'filter';
  waveform: 'sine' | 'square' | 'triangle' | 'sawtooth';
  targetIndex?: number; // Which oscillator/filter to modulate
}

export interface AudioParameters {
  oscillators: Array<{
    type: OscillatorType;
    frequency: number;
    gain: number;
    detune?: number;
  }>;
  filters: Array<{
    type: BiquadFilterType;
    frequency: number;
    q: number;
    gain?: number;
  }>;
  effects: {
    reverb?: {
      decay: number;
      mix: number;
    };
    delay?: {
      time: number;
      feedback: number;
      mix: number;
    };
  };
  lfos?: LFOConfig[];
}
