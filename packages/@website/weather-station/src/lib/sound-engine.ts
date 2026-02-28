import type { AudioParameters, LFOConfig, WeatherData } from "../types/weather";
import { createSeededRandom } from "./weather-fingerprint";

// --- Musical foundation ---
// Temperature selects a root note from a pentatonic scale

const PENTATONIC_ROOTS: Array<{ maxTemp: number; freq: number }> = [
  { maxTemp: 40, freq: 110 }, // A2 — cold, low
  { maxTemp: 55, freq: 131 }, // C3
  { maxTemp: 70, freq: 147 }, // D3
  { maxTemp: 85, freq: 165 }, // E3
  { maxTemp: Infinity, freq: 196 }, // G3 — hot, bright
];

function getRootFrequency(temperature: number): number {
  for (const { maxTemp, freq } of PENTATONIC_ROOTS) {
    if (temperature <= maxTemp) return freq;
  }
  return 196;
}

/**
 * Interpolate root frequency within its bucket for smooth temperature response.
 * Maps exact temperature to a position between two pentatonic root frequencies.
 */
function interpolateRootFrequency(temperature: number): number {
  if (temperature <= 40) return 110;
  if (temperature >= 86) return 196;

  const buckets = [
    { lo: 40, hi: 55, freqLo: 110, freqHi: 131 },
    { lo: 55, hi: 70, freqLo: 131, freqHi: 147 },
    { lo: 70, hi: 85, freqLo: 147, freqHi: 165 },
    { lo: 85, hi: 100, freqLo: 165, freqHi: 196 },
  ];

  for (const b of buckets) {
    if (temperature <= b.hi) {
      const t = (temperature - b.lo) / (b.hi - b.lo);
      return b.freqLo + t * (b.freqHi - b.freqLo);
    }
  }
  return 196;
}

// --- Normalization helpers ---

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function norm(value: number, min: number, max: number): number {
  return clamp((value - min) / (max - min), 0, 1);
}

/**
 * Generate a complete set of audio parameters from weather data and a deterministic seed.
 * Pure math — no network calls, no AI.
 */
export function generateAudioParameters(
  weather: WeatherData,
  seed: number,
): AudioParameters {
  const rand = createSeededRandom(seed);
  const root = interpolateRootFrequency(weather.temperature);

  // Normalized weather values
  const humidityN = norm(weather.humidity, 0, 100);
  const windSpeedN = norm(weather.windSpeed, 0, 30);
  const windGustsN = norm(weather.windGusts, 0, 40);
  const cloudN = norm(weather.cloudCover, 0, 100);
  const uvN = norm(weather.uvIndex, 0, 11);
  const solarN = norm(weather.solar.shortwaveRadiation, 0, 1000);
  const visibilityN = norm(weather.visibility, 0, 50000);
  const capeN = norm(weather.cape, 0, 2000);
  const pressureDev = (weather.pressure - 1013) / 50; // deviation from standard
  const dewPointN = norm(weather.dewPoint, 20, 80);
  const isNight = weather.isDay === 0;

  const avgPrecipProb =
    weather.hourly.precipitationProbability.length > 0
      ? weather.hourly.precipitationProbability.reduce((a, b) => a + b, 0) /
        weather.hourly.precipitationProbability.length /
        100
      : 0;

  // Small seeded variations for organic feel (±small amounts)
  const sv = () => (rand() - 0.5) * 0.02;

  // --- 9 oscillators, each with a purpose ---

  const oscillators: AudioParameters["oscillators"] = [
    // 0: Sub-bass drone — pressure deviation from 1013hPa
    {
      type: "sine",
      frequency: root * 0.5 + pressureDev * 2,
      gain: 0.12 + Math.abs(pressureDev) * 0.003 + sv(),
      detune: pressureDev * 3,
    },
    // 1: Root fundamental — temperature (exact freq interpolated)
    {
      type: "sine",
      frequency: root,
      gain: 0.15 + sv(),
      detune: windSpeedN * 5,
    },
    // 2: Perfect fifth — wind speed (detune)
    {
      type: "triangle",
      frequency: root * 1.5,
      gain: 0.13 + windSpeedN * 0.04 + sv(),
      detune: windSpeedN * 12 - 3,
    },
    // 3: Octave — humidity (detune spread)
    {
      type: "sine",
      frequency: root * 2,
      gain: 0.11 + sv(),
      detune: humidityN * 15 - 5,
    },
    // 4: Third harmonic — cloud cover (gain scales with coverage)
    {
      type: "triangle",
      frequency: root * 3,
      gain: 0.06 + cloudN * 0.08 + sv(),
      detune: cloudN * 5,
    },
    // 5: High shimmer — UV + solar radiation (gain + detune LFO)
    {
      type: "sine",
      frequency: root * 6,
      gain: 0.04 + (uvN + solarN) * 0.04 + sv(),
      detune: solarN * 8 - 3,
    },
    // 6: Texture — wind gusts (gain + filter)
    {
      type: "sawtooth",
      frequency: root * 0.75,
      gain: 0.05 + windGustsN * 0.08 + sv(),
      detune: windGustsN * 10,
    },
    // 7: Atmosphere — visibility (gain inversely proportional)
    {
      type: "sine",
      frequency: root * 4,
      gain: 0.03 + (1 - visibilityN) * 0.06 + sv(),
      detune: (1 - visibilityN) * 8,
    },
    // 8: Storm tension — CAPE (only audible when CAPE > 500)
    {
      type: "sawtooth",
      frequency: root * 5,
      gain: weather.cape > 500 ? 0.03 + capeN * 0.06 + sv() : 0,
      detune: capeN * 15,
    },
  ];

  // --- 4 LFOs with weather-driven rates ---

  const lfos: LFOConfig[] = [
    // 0: Shimmer — detune on high shimmer osc
    {
      rate: (isNight ? 0.05 : 0.1) + (uvN + solarN) * 0.3,
      depth: 0.3 + (1 - cloudN) * 0.3,
      target: "detune",
      waveform: "sine",
      targetIndex: 5,
    },
    // 1: Pulse — gain on root fundamental
    {
      rate: 0.08 + dewPointN * 0.2 + avgPrecipProb * 0.15,
      depth: 0.15 + humidityN * 0.25,
      target: "gain",
      waveform: "triangle",
      targetIndex: 1,
    },
    // 2: Turbulence — frequency on atmosphere osc
    {
      rate: 0.06 + capeN * 0.4 + windGustsN * 0.2,
      depth: 0.2 + capeN * 0.4,
      target: "frequency",
      waveform: windGustsN > 0.5 ? "sawtooth" : "sine",
      targetIndex: 7,
    },
    // 3: Filter sweep — filter cutoff
    {
      rate: 0.04 + windGustsN * 0.15 + (1 - visibilityN) * 0.1,
      depth: 0.3 + cloudN * 0.2 + (1 - visibilityN) * 0.2,
      target: "filter",
      waveform: "sine",
      targetIndex: 0,
    },
  ];

  // --- Filter ---

  const filters: AudioParameters["filters"] = [
    {
      type: "lowpass",
      frequency: 1200 + (1 - cloudN) * 1500 + solarN * 500,
      q: 0.8 + windSpeedN * 0.4,
    },
  ];

  // --- Effects ---

  // Reverb: decay and mix influenced by humidity
  // Delay: time influenced by wind speed
  const effects: AudioParameters["effects"] = {
    reverb: {
      decay: 2 + humidityN * 0.03 * 100, // 2 + humidity * 0.03s → 2–5s
      mix: 0.25 + humidityN * 0.002 * 100, // 0.25 + humidity * 0.002 → 0.25–0.45
    },
    delay: {
      time: 0.2 + windSpeedN * 0.015 * 30, // 0.2 + windSpeed * 0.015 → 0.2–0.65s
      feedback: 0.25,
      mix: 0.15,
    },
  };

  return { oscillators, filters, effects, lfos };
}

// --- Deterministic evolution coefficients ---
// Fixed ratios: same delta = same change. Intentionally small — a 1mph wind
// change is below conscious perception, but 10mph over an hour transforms the soundscape.

interface EvolutionCoefficients {
  tempFreqShift: number; // ±0.5 Hz per °F
  windTextureLfoRate: number; // ±0.02 Hz per mph
  windGustLfoDepth: number; // ±0.015 per mph
  humidityReverbDecay: number; // ±0.02s per %
  cloudFilterCutoff: number; // ∓8 Hz per %
  visibilityDetune: number; // ∓0.01 cents per 100m
  uvShimmerGain: number; // ±0.005 per UV index
  capeTurbulenceRate: number; // ±0.02 Hz per 100 J/kg
  pressureSubBassFreq: number; // ±0.05 Hz per hPa
}

const COEFFICIENTS: EvolutionCoefficients = {
  tempFreqShift: 0.5,
  windTextureLfoRate: 0.02,
  windGustLfoDepth: 0.015,
  humidityReverbDecay: 0.02,
  cloudFilterCutoff: -8,
  visibilityDetune: -0.01,
  uvShimmerGain: 0.005,
  capeTurbulenceRate: 0.02,
  pressureSubBassFreq: 0.05,
};

/**
 * Evolve existing audio parameters based on weather deltas.
 * Uses fixed coefficients for deterministic, continuous evolution.
 * Returns a new AudioParameters object — does not mutate the input.
 */
export function evolveParameters(
  current: AudioParameters,
  prevWeather: WeatherData,
  newWeather: WeatherData,
): AudioParameters {
  const c = COEFFICIENTS;

  // Compute weather deltas
  const dTemp = newWeather.temperature - prevWeather.temperature;
  const dWind = newWeather.windSpeed - prevWeather.windSpeed;
  const dGusts = newWeather.windGusts - prevWeather.windGusts;
  const dHumidity = newWeather.humidity - prevWeather.humidity;
  const dCloud = newWeather.cloudCover - prevWeather.cloudCover;
  const dVisibility = (newWeather.visibility - prevWeather.visibility) / 100;
  const dUV = newWeather.uvIndex - prevWeather.uvIndex;
  const dCAPE = (newWeather.cape - prevWeather.cape) / 100;
  const dPressure = newWeather.pressure - prevWeather.pressure;

  // Evolve oscillators
  const oscillators = current.oscillators.map((osc, i) => {
    let freq = osc.frequency;
    let gain = osc.gain;
    let detune = osc.detune ?? 0;

    switch (i) {
      case 0: // Sub-bass drone
        freq += dPressure * c.pressureSubBassFreq;
        break;
      case 1: // Root fundamental
        freq += dTemp * c.tempFreqShift;
        break;
      case 2: // Perfect fifth
        detune += dWind * 0.4;
        break;
      case 3: // Octave
        detune += dHumidity * 0.15;
        break;
      case 4: // Third harmonic
        gain += dCloud * 0.0008;
        break;
      case 5: // High shimmer
        gain += dUV * c.uvShimmerGain;
        break;
      case 6: // Texture
        gain += dGusts * 0.002;
        break;
      case 7: // Atmosphere
        detune += dVisibility * c.visibilityDetune;
        break;
      case 8: // Storm tension
        gain =
          newWeather.cape > 500
            ? clamp(gain + dCAPE * 0.0006, 0, 0.12)
            : 0;
        break;
    }

    return {
      type: osc.type,
      frequency: clamp(freq, 20, 20000),
      gain: clamp(gain, 0, 0.3),
      detune,
    };
  });

  // Evolve LFOs
  const lfos: LFOConfig[] = (current.lfos ?? []).map((lfo, i) => {
    let rate = lfo.rate;
    let depth = lfo.depth;

    switch (i) {
      case 0: // Shimmer
        rate += dUV * 0.03;
        depth += dCloud * -0.003;
        break;
      case 1: // Pulse
        rate += dHumidity * 0.002;
        break;
      case 2: // Turbulence
        rate += dCAPE * c.capeTurbulenceRate;
        depth += dCAPE * 0.004;
        break;
      case 3: // Filter sweep
        rate += dGusts * 0.005;
        depth += dCloud * 0.002;
        break;
    }

    return {
      ...lfo,
      rate: clamp(rate, 0.01, 2),
      depth: clamp(depth, 0.05, 0.9),
    };
  });

  // Evolve filter
  const filters = current.filters.map((f) => ({
    ...f,
    frequency: clamp(f.frequency + dCloud * c.cloudFilterCutoff, 200, 8000),
  }));

  // Evolve effects
  const effects: AudioParameters["effects"] = {
    reverb: current.effects.reverb
      ? {
          decay: clamp(
            current.effects.reverb.decay + dHumidity * c.humidityReverbDecay,
            1,
            8,
          ),
          mix: clamp(current.effects.reverb.mix + dHumidity * 0.001, 0.1, 0.6),
        }
      : undefined,
    delay: current.effects.delay
      ? {
          ...current.effects.delay,
          time: clamp(
            current.effects.delay.time + dWind * 0.005,
            0.1,
            1.5,
          ),
        }
      : undefined,
  };

  return { oscillators, filters, effects, lfos };
}
