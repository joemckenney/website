export interface WeatherReading {
  id: string;
  timestamp: string;
  tempf: number;
  humidity: number;
  windspeedmph: number;
  windgustmph: number;
  maxdailygust: number;
  winddir: number;
  winddir_avg10m: number;
  uv: number;
  solarradiation: number;
  hourlyrainin: number;
  dailyrainin: number;
  baromrelin: number;
  baromabsin: number;
  tempinf: number;
  humidityin: number;
  feelsLike: number;
  dewPoint: number;
}

export interface LFOConfig {
  rate: number; // Hz (0.01 - 20)
  depth: number; // 0-1
  target: "frequency" | "gain" | "detune" | "filter";
  waveform: "sine" | "square" | "triangle" | "sawtooth";
  targetIndex?: number; // Which oscillator/filter to modulate
}

export interface AudioParameters {
  oscillators: Array<{
    type: OscillatorType;
    frequency: number;
    gain: number;
    detune?: number;
    pan?: number; // -1 (left) to 1 (right)
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
  noise?: {
    type: "white" | "bandpass";
    frequency?: number; // center frequency for bandpass
    q?: number;
    gain: number;
    rate?: number; // bursts per second for rain
  };
  lfos?: LFOConfig[];
}

export interface PlaybackState {
  mode: "live" | "historical";
  speed: number; // 1x, 10x, 60x, 360x
  cursor: Date;
  isPlaying: boolean;
}
