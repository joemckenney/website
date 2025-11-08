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
  // New atmospheric parameters
  apparentTemperature: number;
  dewPoint: number;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  visibility: number;
  windDirection: number;
  windGusts: number;
  uvIndex: number;
  isDay: number; // 0 or 1
  cape: number; // Convective available potential energy
  hourly: {
    temperature: number[];
    precipitationProbability: number[];
    windSpeed: number[];
    cloudCover: number[];
    uvIndex: number[];
    windDirection: number[];
    dewPoint: number[];
    cape: number[];
  };
  solar: {
    shortwaveRadiation: number;
    uvIndex: number;
    uvIndexClearSky: number;
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
