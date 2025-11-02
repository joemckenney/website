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
}
