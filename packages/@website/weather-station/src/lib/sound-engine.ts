import type { AudioParameters, LFOConfig, WeatherReading } from "../types/weather";

// --- Musical foundation ---
// Temperature selects a root note from a pentatonic scale

function interpolateRootFrequency(tempf: number): number {
  // Calibrated for Mendocino: typical range 38-75°F
  // Spread the full pitch range across the actual temperature range
  if (tempf <= 35) return 82.4; // E2 — cold night
  if (tempf >= 80) return 220; // A3 — rare warm day

  const buckets = [
    { lo: 35, hi: 45, freqLo: 82.4, freqHi: 110 }, // E2 → A2 (cold nights)
    { lo: 45, hi: 52, freqLo: 110, freqHi: 131 }, // A2 → C3 (cool morning)
    { lo: 52, hi: 58, freqLo: 131, freqHi: 147 }, // C3 → D3 (typical)
    { lo: 58, hi: 65, freqLo: 147, freqHi: 165 }, // D3 → E3 (mild afternoon)
    { lo: 65, hi: 80, freqLo: 165, freqHi: 220 }, // E3 → A3 (warm day)
  ];

  for (const b of buckets) {
    if (tempf <= b.hi) {
      const t = (tempf - b.lo) / (b.hi - b.lo);
      return b.freqLo + t * (b.freqHi - b.freqLo);
    }
  }
  return 220;
}

// --- Normalization helpers ---

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function norm(value: number, min: number, max: number): number {
  return clamp((value - min) / (max - min), 0, 1);
}

/**
 * Map wind direction (0-360 degrees) to stereo pan (-1 to 1).
 * North (0°) = center, East (90°) = right, South (180°) = center, West (270°) = left.
 */
function windDirToPan(winddir: number): number {
  // Convert to radians, offset so 0° = center
  const rad = (winddir * Math.PI) / 180;
  return Math.sin(rad);
}

/**
 * Generate audio parameters from a single AWN weather reading.
 * Pure math — deterministic mapping from weather to sound.
 */
export function generateAudioParameters(
  reading: WeatherReading,
): AudioParameters {
  const root = interpolateRootFrequency(reading.tempf);

  // Normalized weather values — calibrated for Mendocino coastal climate
  // Mendocino: very humid (avg 93%), light wind (p95: 2.7mph), mild temps
  const humidityN = norm(reading.humidity, 50, 100);
  const windN = norm(reading.windspeedmph, 0, 8);
  const gustN = norm(reading.windgustmph, 0, 12);
  const uvN = norm(reading.uv, 0, 7);
  const solarN = norm(reading.solarradiation, 0, 400);
  const rainN = norm(reading.hourlyrainin, 0, 0.1);
  const dewPointN = norm(reading.dewPoint, 35, 65);
  const pan = windDirToPan(reading.winddir);

  // Barometric pressure deviation from standard (29.92 inHg)
  const baromDev = (reading.baromrelin - 29.92) * 10; // amplify for audibility

  // Indoor/outdoor temperature difference → dissonance
  // Indoor stays 53-62°F, outdoor 38-75°F, so diff is typically 0-20
  const tempDiff = Math.abs(reading.tempinf - reading.tempf);
  const tempDiffN = norm(tempDiff, 0, 15);

  // Feels-like deviation → vibrato
  // In mild Mendocino, feels-like is usually close to actual temp
  const feelsLikeDev = Math.abs(reading.feelsLike - reading.tempf);
  const feelsLikeN = norm(feelsLikeDev, 0, 8);

  // Is it nighttime? (solar radiation < 10 W/m2)
  const isNight = reading.solarradiation < 10;

  // --- 8 oscillators, each mapped to a weather dimension ---

  const oscillators: AudioParameters["oscillators"] = [
    // 0: Sub-bass drone — barometric pressure
    {
      type: "sine",
      frequency: root * 0.5 + baromDev * 0.5,
      gain: 0.12 + Math.abs(baromDev) * 0.002,
      detune: baromDev * 2,
      pan: 0, // center
    },
    // 1: Root fundamental — temperature
    {
      type: "sine",
      frequency: root,
      gain: 0.15,
      detune: windN * 5,
      pan,
    },
    // 2: Perfect fifth — wind speed drives detune
    {
      type: "triangle",
      frequency: root * 1.5,
      gain: 0.12 + windN * 0.05,
      detune: windN * 15 - 3,
      pan,
    },
    // 3: Octave — humidity drives detune spread
    {
      type: "sine",
      frequency: root * 2,
      gain: 0.1,
      detune: humidityN * 15 - 5,
      pan: 0,
    },
    // 4: Indoor/outdoor dissonance — detuned from root by temp difference
    {
      type: "sine",
      frequency: root * (1 + tempDiffN * 0.02), // slight frequency offset
      gain: tempDiffN * 0.08, // only audible when there's a difference
      detune: tempDiffN * 20,
      pan: 0,
    },
    // 5: High shimmer — solar radiation + UV
    {
      type: "sine",
      frequency: root * 6,
      gain: isNight ? 0.01 : 0.04 + (uvN + solarN) * 0.04,
      detune: solarN * 8,
      pan: 0,
    },
    // 6: Texture — wind gusts (gain surges)
    {
      type: "sawtooth",
      frequency: root * 0.75,
      gain: 0.04 + gustN * 0.1,
      detune: gustN * 12,
      pan,
    },
    // 7: Dew point resonance — higher octave, presence scales with dew point
    {
      type: "sine",
      frequency: root * 4,
      gain: 0.03 + dewPointN * 0.05,
      detune: dewPointN * 6,
      pan: 0,
    },
  ];

  // --- 5 LFOs with weather-driven rates ---

  const lfos: LFOConfig[] = [
    // 0: Shimmer — detune on solar osc
    {
      rate: (isNight ? 0.03 : 0.1) + solarN * 0.3,
      depth: isNight ? 0.1 : 0.3 + solarN * 0.3,
      target: "detune",
      waveform: "sine",
      targetIndex: 5,
    },
    // 1: Wind pulsing — gain on wind osc
    {
      rate: 0.05 + windN * 0.3,
      depth: 0.1 + windN * 0.3,
      target: "gain",
      waveform: "triangle",
      targetIndex: 2,
    },
    // 2: Gust surges — gain on texture osc
    {
      rate: 0.08 + gustN * 0.4,
      depth: 0.2 + gustN * 0.5,
      target: "gain",
      waveform: "sine",
      targetIndex: 6,
    },
    // 3: Vibrato — feels-like deviation drives detune wobble on root
    {
      rate: 0.1 + feelsLikeN * 0.4,
      depth: feelsLikeN * 0.4,
      target: "detune",
      waveform: "sine",
      targetIndex: 1,
    },
    // 4: Filter sweep — humidity + dew point
    {
      rate: 0.04 + humidityN * 0.1,
      depth: 0.3 + humidityN * 0.2 + dewPointN * 0.1,
      target: "filter",
      waveform: "sine",
      targetIndex: 0,
    },
  ];

  // --- Filter — dew point drives resonance ---

  const filters: AudioParameters["filters"] = [
    {
      type: "lowpass",
      frequency: 1200 + solarN * 1500 + (isNight ? 0 : 500),
      q: 0.8 + dewPointN * 1.5, // higher dew point = more resonant
    },
  ];

  // --- Effects ---

  // Reverb: humidity → lush/wet
  // Delay: wind speed → spacious
  const effects: AudioParameters["effects"] = {
    reverb: {
      decay: 2 + humidityN * 3, // 2-5s
      mix: 0.2 + humidityN * 0.3, // 0.2-0.5
    },
    delay: {
      time: 0.2 + windN * 0.4, // 0.2-0.6s
      feedback: 0.25,
      mix: 0.12 + windN * 0.08,
    },
  };

  // --- Rain synthesis ---

  const noise: AudioParameters["noise"] =
    reading.hourlyrainin > 0
      ? {
          type: "bandpass",
          frequency: 4000 + rainN * 2000, // 4-6kHz center
          q: 1.5 - rainN * 0.5, // wider band for heavier rain
          gain: 0.05 + rainN * 0.2, // louder with more rain
          rate: 4 + rainN * 16, // 4-20 bursts per second
        }
      : undefined;

  return { oscillators, filters, effects, noise, lfos };
}

/**
 * Evolve existing audio parameters based on the difference between two readings.
 * Returns a new AudioParameters object — does not mutate the input.
 */
export function evolveParameters(
  current: AudioParameters,
  prev: WeatherReading,
  next: WeatherReading,
): AudioParameters {
  // Compute deltas
  const dTemp = next.tempf - prev.tempf;
  const dWind = next.windspeedmph - prev.windspeedmph;
  const dGust = next.windgustmph - prev.windgustmph;
  const dHumidity = next.humidity - prev.humidity;
  const dBarom = (next.baromrelin - prev.baromrelin) * 10;
  const dSolar = (next.solarradiation - prev.solarradiation) / 1000;
  const dUV = next.uv - prev.uv;
  const dRain = next.hourlyrainin - prev.hourlyrainin;
  const dDewPoint = next.dewPoint - prev.dewPoint;
  const newPan = windDirToPan(next.winddir);

  // Evolve oscillators
  const oscillators = current.oscillators.map((osc, i) => {
    let freq = osc.frequency;
    let gain = osc.gain;
    let detune = osc.detune ?? 0;
    let pan = osc.pan ?? 0;

    switch (i) {
      case 0: // Sub-bass
        freq += dBarom * 0.5;
        break;
      case 1: // Root
        freq += dTemp * 0.5;
        pan = newPan;
        break;
      case 2: // Fifth
        detune += dWind * 0.5;
        gain += dWind * 0.002;
        pan = newPan;
        break;
      case 3: // Octave
        detune += dHumidity * 0.15;
        break;
      case 4: // Dissonance
        gain += Math.abs(next.tempinf - next.tempf) > 5 ? 0.001 : -0.001;
        break;
      case 5: // Shimmer
        gain += (dSolar + dUV * 0.01) * 0.02;
        break;
      case 6: // Texture
        gain += dGust * 0.003;
        pan = newPan;
        break;
      case 7: // Dew point
        gain += dDewPoint * 0.001;
        detune += dDewPoint * 0.3;
        break;
    }

    return {
      type: osc.type,
      frequency: clamp(freq, 20, 20000),
      gain: clamp(gain, 0, 0.3),
      detune,
      pan,
    };
  });

  // Evolve LFOs
  const lfos: LFOConfig[] = (current.lfos ?? []).map((lfo, i) => {
    let rate = lfo.rate;
    let depth = lfo.depth;

    switch (i) {
      case 0: // Shimmer
        rate += dSolar * 0.1;
        break;
      case 1: // Wind pulsing
        rate += dWind * 0.01;
        depth += dWind * 0.01;
        break;
      case 2: // Gust surges
        rate += dGust * 0.01;
        depth += dGust * 0.01;
        break;
      case 3: // Vibrato
        break;
      case 4: // Filter sweep
        depth += dHumidity * 0.002;
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
    frequency: clamp(f.frequency + dSolar * 500, 200, 8000),
    q: clamp(f.q + dDewPoint * 0.05, 0.5, 4),
  }));

  // Evolve effects
  const effects: AudioParameters["effects"] = {
    reverb: current.effects.reverb
      ? {
          decay: clamp(current.effects.reverb.decay + dHumidity * 0.02, 1, 8),
          mix: clamp(current.effects.reverb.mix + dHumidity * 0.002, 0.1, 0.6),
        }
      : undefined,
    delay: current.effects.delay
      ? {
          ...current.effects.delay,
          time: clamp(current.effects.delay.time + dWind * 0.005, 0.1, 1.5),
        }
      : undefined,
  };

  // Evolve rain noise — Mendocino rain is light (max ~0.09 in/hr)
  const rainN = norm(next.hourlyrainin, 0, 0.1);
  const noise: AudioParameters["noise"] =
    next.hourlyrainin > 0
      ? {
          type: "bandpass",
          frequency: 4000 + rainN * 2000,
          q: 1.5 - rainN * 0.5,
          gain: 0.05 + rainN * 0.2,
          rate: 4 + rainN * 16,
        }
      : undefined;

  return { oscillators, filters, effects, noise, lfos };
}
