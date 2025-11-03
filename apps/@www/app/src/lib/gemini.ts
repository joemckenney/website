import type { WeatherData, AudioParameters } from "../types/weather";

// Chrome Prompt API types based on official documentation
// https://developer.chrome.com/docs/ai/prompt-api

type AIAvailability = "unavailable" | "downloading" | "available";

interface AIDownloadProgressEvent {
  loaded: number;
  total: number;
}

interface AIDownloadMonitor {
  addEventListener(
    type: "downloadprogress",
    listener: (event: AIDownloadProgressEvent) => void,
  ): void;
}

interface AILanguageModelCreateOptions {
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  initialPrompts?: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  monitor?: (monitor: AIDownloadMonitor) => void;
  // Output language code (required for proper output quality and safety)
  language?: string;
}

interface AILanguageModel {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  promptStreaming(
    input: string,
    options?: { signal?: AbortSignal },
  ): AsyncIterable<string>;
  destroy(): void;
  inputUsage: number;
  inputQuota: number;
}

interface LanguageModel {
  availability(): Promise<AIAvailability>;
  create(options?: AILanguageModelCreateOptions): Promise<AILanguageModel>;
}

declare global {
  interface Window {
    // New Chrome AI API
    LanguageModel?: LanguageModel;
    // Legacy window.ai API (deprecated)
    ai?: {
      languageModel: LanguageModel;
    };
  }
}

export type AvailabilityStatus = {
  available: boolean;
  status: AIAvailability;
  downloading: boolean;
};

export async function checkGeminiAvailability(
  log?: (text: string, type?: "info" | "success" | "warning" | "error") => void,
): Promise<AvailabilityStatus> {
  // Check new API first, then fall back to legacy window.ai
  const languageModel = window.LanguageModel || window.ai?.languageModel;

  if (!languageModel) {
    log?.("Chrome AI not available in this browser", "warning");
    return {
      available: false,
      status: "unavailable",
      downloading: false,
    };
  }

  try {
    const status = await languageModel.availability();

    if (status === "available") {
      log?.("✓ Chrome AI is ready", "success");
    } else if (status === "downloading") {
      log?.(
        "ℹ️  Chrome AI model downloading (this may take a few minutes)",
        "warning",
      );
      log?.("   First request will use rule-based generation", "info");
    } else {
      log?.(`⚠️  Chrome AI status: ${status}`, "warning");
    }

    return {
      available: status === "available",
      status,
      downloading: status === "downloading",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    log?.(`Failed to check AI availability: ${errorMsg}`, "error");
    return {
      available: false,
      status: "unavailable",
      downloading: false,
    };
  }
}

/**
 * Create a persistent AI session for evolution
 */
export async function createAISession(
  log?: (text: string, type?: "info" | "success" | "warning" | "error") => void,
  onProgress?: (progress: number) => void,
): Promise<AILanguageModel | null> {
  const languageModel = window.LanguageModel || window.ai?.languageModel;

  if (!languageModel) {
    log?.("Chrome Prompt API not available", "warning");
    return null;
  }

  const availability = await languageModel.availability();
  if (availability !== "available") {
    log?.(`AI model status: ${availability}`, "warning");
    return null;
  }

  const systemPrompt = `You are a creative sound designer. You respond ONLY with valid JSON matching the requested format. Never add markdown formatting, explanations, or any text outside the JSON structure.`;

  try {
    const session = await languageModel.create({
      temperature: 0.8,
      topK: 40,
      initialPrompts: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      monitor: (m) => {
        m.addEventListener("downloadprogress", (e) => {
          const progress = (e.loaded / e.total) * 100;
          log?.(`AI model download: ${progress.toFixed(1)}%`, "info");
          onProgress?.(progress);
        });
      },
    });

    return session;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    log?.(`Failed to create AI session: ${errorMsg}`, "error");
    return null;
  }
}

export async function generateAudioParameters(
  weather: WeatherData,
  onProgress?: (progress: number) => void,
  log?: (text: string, type?: "info" | "success" | "warning" | "error") => void,
): Promise<AudioParameters> {
  // Check new API first, then fall back to legacy window.ai
  const languageModel = window.LanguageModel || window.ai?.languageModel;

  if (!languageModel) {
    log?.(
      "Chrome Prompt API not available, using rule-based generation",
      "warning",
    );
    return getFallbackParameters(weather);
  }

  // Check availability before creating session
  log?.("Checking AI model availability...", "info");
  const availability = await languageModel.availability();

  if (availability === "unavailable") {
    log?.("AI model unavailable, using rule-based generation", "warning");
    return getFallbackParameters(weather);
  }

  if (availability === "downloading") {
    log?.(
      "AI model is still downloading, cannot create session yet",
      "warning",
    );
    log?.("Using rule-based generation instead", "info");
    return getFallbackParameters(weather);
  }

  if (availability !== "available") {
    log?.(
      `AI model status: ${availability}, using rule-based generation`,
      "warning",
    );
    return getFallbackParameters(weather);
  }

  log?.("AI model is ready, creating session...", "success");

  const systemPrompt = `You are a creative sound designer. You respond ONLY with valid JSON matching the requested format. Never add markdown formatting, explanations, or any text outside the JSON structure.`;

  const userPrompt = `Current weather: ${weather.temperature}°F, ${weather.conditions}, wind ${weather.windSpeed}mph, humidity ${weather.humidity}%, pressure ${weather.pressure}hPa

Design a rich, layered ambient Web Audio soundscape representing this weather. Create 5-8 oscillators at different frequencies to build a complex, evolving drone with distinct tonal layers. Think Brian Eno, Stars of the Lid, or Alva Noto - sparse but harmonically rich.

Guidelines:
- Use 5-8 oscillators for depth and complexity
- Spread frequencies across the spectrum (both low drones and high shimmer)
- Vary oscillator types (sine for purity, triangle for warmth, sawtooth for texture)
- Keep individual gains low (0.1-0.3) since we're layering many sounds
- Use subtle detune values (-10 to +10) for organic movement
- Choose frequencies that create interesting harmonic relationships

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
}

Valid oscillator types: sine, square, sawtooth, triangle
Valid filter types: lowpass, highpass, bandpass, notch
Frequency range: 20-20000 Hz (try 55Hz, 110Hz, 220Hz, 440Hz, 880Hz, 1760Hz for harmonic relationships)
Gain range: 0-1 (use 0.1-0.3 for layered sounds)
Detune range: -100 to +100 cents (use -10 to +10 for subtle movement)
Q range: 0.0001-1000`;

  try {
    // Create session with system prompt and download monitor
    // Note: Must specify BOTH temperature and topK, or NEITHER

    const session = await languageModel.create({
      temperature: 0.8, // Higher temperature for more creative variations
      topK: 40, // Limit token selection pool for more focused output
      initialPrompts: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      monitor: (m) => {
        m.addEventListener("downloadprogress", (e) => {
          const progress = (e.loaded / e.total) * 100;
          log?.(`AI model download: ${progress.toFixed(1)}%`, "info");
          onProgress?.(progress);
        });
      },
    });

    log?.("Sending weather data to AI for interpretation...", "info");

    // Send prompt
    const response = await session.prompt(userPrompt);

    log?.("AI response received, generating soundscape...", "success");

    // Clean up session
    session.destroy();

    // Try to extract JSON from response (in case AI adds markdown or text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;

    const params = JSON.parse(jsonStr) as AudioParameters;

    // Validate and sanitize the response
    return sanitizeAudioParameters(params);
  } catch (error) {
    debugger;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    log?.(`AI generation failed: ${errorMsg}`, "error");

    // Provide helpful error messages
    if (error instanceof DOMException) {
      if (error.name === "NotSupportedError") {
        log?.("Unsupported AI input/output combination", "error");
      }
    }

    log?.("Falling back to rule-based generation", "warning");
    // Return fallback parameters on any error
    return getFallbackParameters(weather);
  }
}

function sanitizeAudioParameters(params: AudioParameters): AudioParameters {
  const validOscTypes: OscillatorType[] = [
    "sine",
    "square",
    "sawtooth",
    "triangle",
  ];
  const validFilterTypes: BiquadFilterType[] = [
    "lowpass",
    "highpass",
    "bandpass",
    "notch",
  ];

  return {
    oscillators: (params.oscillators || []).map((osc) => ({
      type: validOscTypes.includes(osc.type as OscillatorType)
        ? osc.type
        : "sine",
      frequency: Math.max(20, Math.min(20000, osc.frequency || 220)),
      gain: Math.max(0, Math.min(1, osc.gain || 0.3)),
      detune: osc.detune || 0,
    })),
    filters: (params.filters || []).map((filt) => ({
      type: validFilterTypes.includes(filt.type as BiquadFilterType)
        ? filt.type
        : "lowpass",
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
            feedback: Math.max(
              0,
              Math.min(0.95, params.effects.delay.feedback),
            ),
            mix: Math.max(0, Math.min(1, params.effects.delay.mix)),
          }
        : undefined,
    },
  };
}

function getFallbackParameters(weather: WeatherData): AudioParameters {
  // Rich rule-based fallback with multiple oscillators
  const tempNorm = (weather.temperature - 32) / 68; // normalize 32-100°F to 0-1
  const windNorm = weather.windSpeed / 30; // normalize 0-30mph to 0-1
  const humidityNorm = weather.humidity / 100;

  // Base frequency depends on temperature (warmer = higher)
  const baseFreq = 110 + tempNorm * 110; // 110-220 Hz

  return {
    oscillators: [
      // Deep bass drone
      {
        type: "sine",
        frequency: baseFreq * 0.5, // Sub-bass
        gain: 0.15,
        detune: 0,
      },
      // Fundamental
      {
        type: "sine",
        frequency: baseFreq,
        gain: 0.2,
        detune: windNorm * 8,
      },
      // Fifth harmonic
      {
        type: "triangle",
        frequency: baseFreq * 1.5,
        gain: 0.18,
        detune: -windNorm * 6,
      },
      // Octave
      {
        type: "sine",
        frequency: baseFreq * 2,
        gain: 0.15,
        detune: humidityNorm * 10,
      },
      // High shimmer (depends on conditions)
      {
        type: "sine",
        frequency: 880 + tempNorm * 440,
        gain: 0.12,
        detune: -humidityNorm * 7,
      },
      // Textural layer (more prominent in windy conditions)
      {
        type: "sawtooth",
        frequency: baseFreq * 0.75,
        gain: 0.08 + windNorm * 0.1,
        detune: windNorm * 12,
      },
      // Atmospheric high
      {
        type: "sine",
        frequency: 1320 + humidityNorm * 440,
        gain: 0.1,
        detune: -5,
      },
    ],
    filters: [
      {
        type: "lowpass",
        frequency: 1500 + tempNorm * 1500,
        q: 1 + windNorm * 0.5,
      },
    ],
    effects: {
      reverb: {
        decay: 2 + humidityNorm * 2,
        mix: 0.3 + humidityNorm * 0.2,
      },
      delay: {
        time: 0.3 + windNorm * 0.4,
        feedback: 0.3,
        mix: 0.2,
      },
    },
  };
}
