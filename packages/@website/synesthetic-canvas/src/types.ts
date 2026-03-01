export interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  points: Point[];
  startTime: number;
  endTime: number;
}

export interface GestureFeatures {
  strokeCount: number;
  avgVelocity: number;
  maxVelocity: number;
  avgCurvature: number;
  totalLength: number;
  avgPressure: number;
  density: number;
  directionality: number;
  canvasRegion: string;
  timeDelta: number;
}

export type Mood =
  | "aggressive"
  | "tentative"
  | "rhythmic"
  | "flowing"
  | "chaotic"
  | "calm"
  | "sharp"
  | "dreamy";

export type PitchCenter = "low" | "mid_low" | "mid" | "mid_high" | "high";
export type Texture = "smooth" | "rough" | "pulsing" | "shimmering" | "gritty";
export type Space = "tight" | "medium" | "wide" | "vast";

export interface GestureAnalysis {
  mood: Mood;
  intensity: number;
  pitch_center: PitchCenter;
  texture: Texture;
  space: Space;
  movement: number;
}

export interface SynthAudioParameters {
  osc0Freq: number;
  osc0Type: OscillatorType;
  osc1Freq: number;
  osc1Type: OscillatorType;
  osc2Freq: number;
  osc2Type: OscillatorType;
  filterFreq: number;
  filterQ: number;
  masterGain: number;
  lfoRate: number;
  lfoDepth: number;
  delayTime: number;
  delayFeedback: number;
  reverbMix: number;
}

export interface VisualFeedback {
  amplitude: number;
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  spectralCentroid: number;
  isPeak: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface LivePoint {
  x: number;
  y: number;
  ox: number; // original x
  oy: number; // original y
  opacity: number;
}

export interface Branch {
  points: LivePoint[];
  life: number;
  growing: boolean;
  growAngle: number;
  color: string;
  depth: number;
  maxLength: number;
}

export interface LiveStroke {
  points: LivePoint[];
  life: number;
  color: string;
  lineWidth: number;
  branches: Branch[];
}

export const MOOD_PALETTES: Record<Mood, [string, string, string, string]> = {
  aggressive: ["#ff2222", "#ff6600", "#ffaa00", "#ffffff"],
  tentative: ["#667788", "#889999", "#aabbbb", "#ccdddd"],
  rhythmic: ["#ff4488", "#ff66aa", "#ff88cc", "#ffaaee"],
  flowing: ["#2266ff", "#4488ff", "#66aaff", "#88ccff"],
  chaotic: ["#ff2222", "#22ff22", "#2222ff", "#ffff22"],
  calm: ["#336699", "#558899", "#77aaaa", "#99ccbb"],
  sharp: ["#ffffff", "#cccccc", "#ff4444", "#ff8800"],
  dreamy: ["#aa88ff", "#cc99ff", "#ddbbff", "#eeddff"],
};
