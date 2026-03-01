import type {
  GestureAnalysis,
  GestureFeatures,
  Mood,
  PitchCenter,
  Space,
  SynthAudioParameters,
  Texture,
} from "../types";

const PITCH_MAP: Record<PitchCenter, number> = {
  low: 110,
  mid_low: 185,
  mid: 330,
  mid_high: 520,
  high: 880,
};

const TEXTURE_OSC_TYPES: Record<Texture, [OscillatorType, OscillatorType, OscillatorType]> = {
  smooth: ["sine", "sine", "triangle"],
  rough: ["sawtooth", "square", "sawtooth"],
  pulsing: ["square", "triangle", "square"],
  shimmering: ["sine", "triangle", "sine"],
  gritty: ["sawtooth", "sawtooth", "square"],
};

const SPACE_REVERB: Record<Space, { delayTime: number; feedback: number; mix: number }> = {
  tight: { delayTime: 0.05, feedback: 0.1, mix: 0.1 },
  medium: { delayTime: 0.2, feedback: 0.3, mix: 0.25 },
  wide: { delayTime: 0.4, feedback: 0.4, mix: 0.4 },
  vast: { delayTime: 0.7, feedback: 0.55, mix: 0.55 },
};

const MOOD_FILTER_Q: Record<Mood, number> = {
  aggressive: 8,
  tentative: 1,
  rhythmic: 5,
  flowing: 2,
  chaotic: 10,
  calm: 1,
  sharp: 12,
  dreamy: 1.5,
};

export function mapAnalysisToAudio(
  analysis: GestureAnalysis,
): SynthAudioParameters {
  const baseFreq = PITCH_MAP[analysis.pitch_center];
  const oscTypes = TEXTURE_OSC_TYPES[analysis.texture];
  const space = SPACE_REVERB[analysis.space];
  const filterQ = MOOD_FILTER_Q[analysis.mood];

  // Filter cutoff: intensity drives brightness
  const filterFreq = 300 + analysis.intensity * 5000;

  // Master gain: intensity drives volume (keep reasonable)
  const masterGain = 0.05 + analysis.intensity * 0.2;

  // LFO from movement
  const lfoRate = 0.1 + analysis.movement * 8;
  const lfoDepth = 50 + analysis.movement * 400;

  return {
    osc0Freq: baseFreq,
    osc0Type: oscTypes[0],
    osc1Freq: baseFreq * 1.5, // fifth above
    osc1Type: oscTypes[1],
    osc2Freq: baseFreq * 0.5, // octave below
    osc2Type: oscTypes[2],
    filterFreq,
    filterQ,
    masterGain,
    lfoRate,
    lfoDepth,
    delayTime: space.delayTime,
    delayFeedback: space.feedback,
    reverbMix: space.mix,
  };
}

/** Deterministic fallback: map raw gesture features directly to audio params (no AI). */
export function mapGestureDirectToAudio(
  features: GestureFeatures,
): SynthAudioParameters {
  // Velocity → pitch & brightness
  const normalizedVelocity = Math.min(features.avgVelocity / 2, 1);
  const baseFreq = 110 + normalizedVelocity * 660;

  // Curvature → texture roughness
  const isCurvy = features.avgCurvature > 0.01;
  const oscTypes: [OscillatorType, OscillatorType, OscillatorType] = isCurvy
    ? ["sawtooth", "triangle", "sawtooth"]
    : ["sine", "sine", "triangle"];

  // Density → space
  const normalizedDensity = Math.min(features.density / 10, 1);
  const delayTime = 0.05 + normalizedDensity * 0.6;
  const delayFeedback = 0.1 + normalizedDensity * 0.4;
  const reverbMix = 0.1 + normalizedDensity * 0.4;

  // Pressure → volume
  const masterGain = 0.05 + features.avgPressure * 0.2;

  // Directionality → LFO movement
  const lfoRate = 0.5 + (1 - features.directionality) * 6;
  const lfoDepth = 50 + (1 - features.directionality) * 300;

  // Filter
  const filterFreq = 300 + normalizedVelocity * 5000;
  const filterQ = 1 + features.avgCurvature * 500;

  return {
    osc0Freq: baseFreq,
    osc0Type: oscTypes[0],
    osc1Freq: baseFreq * 1.5,
    osc1Type: oscTypes[1],
    osc2Freq: baseFreq * 0.5,
    osc2Type: oscTypes[2],
    filterFreq: Math.min(filterFreq, 8000),
    filterQ: Math.min(filterQ, 12),
    masterGain,
    lfoRate,
    lfoDepth,
    delayTime,
    delayFeedback,
    reverbMix,
  };
}
