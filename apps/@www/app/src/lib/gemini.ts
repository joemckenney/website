import type { AudioParameters, WeatherData } from "../types/weather";

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
    } else if (status === "downloading" || status === "unavailable") {
      // Both "downloading" and "unavailable" may mean the model needs to be downloaded
      // Chrome returns "downloading" when flags are enabled but download hasn't started
      // Calling create() is what actually triggers/continues the download
      log?.("ℹ️  Chrome AI model not ready, initiating download (~1.7GB)...", "info");

      try {
        const session = await languageModel.create({
          monitor: (m) => {
            m.addEventListener("downloadprogress", (e) => {
              const progress = (e.loaded / e.total) * 100;
              log?.(`   Download progress: ${progress.toFixed(1)}%`, "info");
            });
          },
        });

        // Clean up the session immediately
        session.destroy();

        log?.("✓ Download initiated successfully", "success");
        log?.("   Model will download in background (~1.7GB)", "info");
        log?.("   Check progress at chrome://components/", "info");
      } catch (downloadError) {
        const errorMsg =
          downloadError instanceof Error
            ? downloadError.message
            : "Unknown error";
        log?.(`Failed to initiate download: ${errorMsg}`, "error");
        log?.("   Check chrome://flags settings and try again", "warning");
      }
    } else {
      // Unknown status
      log?.(`Chrome AI status: ${status}`, "warning");
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
  previousParams?: AudioParameters | null,
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
    return getFallbackParameters(weather, previousParams);
  }

  // Check availability before creating session
  log?.("Checking AI model availability...", "info");
  const availability = await languageModel.availability();

  if (availability === "unavailable") {
    log?.("AI model unavailable, using rule-based generation", "warning");
    return getFallbackParameters(weather, previousParams);
  }

  if (availability === "downloading") {
    log?.(
      "AI model is still downloading, cannot create session yet",
      "warning",
    );
    log?.("Using rule-based generation instead", "info");
    return getFallbackParameters(weather, previousParams);
  }

  if (availability !== "available") {
    log?.(
      `AI model status: ${availability}, using rule-based generation`,
      "warning",
    );
    return getFallbackParameters(weather, previousParams);
  }

  log?.("AI model is ready, creating session...", "success");

  const systemPrompt = `You are a creative sound designer. You respond ONLY with valid JSON matching the requested format. Never add markdown formatting, explanations, or any text outside the JSON structure.`;

  // Calculate temperature trend from hourly data
  const tempTrend =
    weather.hourly.temperature.length > 1
      ? weather.hourly.temperature[11] - weather.hourly.temperature[0]
      : 0;
  const avgPrecipProb =
    weather.hourly.precipitationProbability.reduce((a, b) => a + b, 0) /
    weather.hourly.precipitationProbability.length;
  const avgCloudCover =
    weather.hourly.cloudCover.reduce((a, b) => a + b, 0) /
    weather.hourly.cloudCover.length;

  // Build current state description if we have previous params
  let currentStateDesc = "";
  if (previousParams) {
    const oscList = previousParams.oscillators
      .map(
        (o) =>
          `${o.type} @ ${o.frequency.toFixed(0)}Hz (gain: ${o.gain.toFixed(2)})`,
      )
      .join(", ");
    currentStateDesc = `\nCurrent soundscape: ${previousParams.oscillators.length} oscillators - ${oscList}\n\nEvolve this soundscape GRADUALLY based on the new weather. Make subtle changes:\n- Shift 2-4 oscillator frequencies by ±10-50 Hz\n- Adjust 2-3 gains by ±0.02-0.08\n- Optionally add or remove 1-2 oscillators\n- Keep the same general harmonic structure\n- Preserve most oscillator types\n- Adjust LFOs subtly based on weather changes\n\n`;
  }

  const userPrompt = `Current weather conditions:
- Temperature: ${weather.temperature}°F (feels like ${weather.apparentTemperature}°F)
- Conditions: ${weather.conditions}
- Wind: ${weather.windSpeed}mph (gusts ${weather.windGusts}mph) from ${weather.windDirection}°
- Humidity: ${weather.humidity}% | Dew point: ${weather.dewPoint}°F
- Pressure: ${weather.pressure}hPa
- Cloud cover: ${weather.cloudCover}% (low: ${weather.cloudCoverLow}%, mid: ${weather.cloudCoverMid}%, high: ${weather.cloudCoverHigh}%)
- Visibility: ${weather.visibility}m
- UV Index: ${weather.uvIndex} | Solar radiation: ${weather.solar.shortwaveRadiation}W/m²
- Day/Night: ${weather.isDay ? "Day" : "Night"}
- CAPE: ${weather.cape}J/kg (atmospheric instability)

12-hour forecast: temp ${tempTrend > 0 ? "rising" : tempTrend < 0 ? "falling" : "stable"} (${tempTrend.toFixed(1)}°F), avg precipitation probability ${avgPrecipProb.toFixed(0)}%, avg cloud cover ${avgCloudCover.toFixed(0)}%
${currentStateDesc}
${previousParams ? "Evolve the soundscape gradually to reflect the new weather conditions." : "Design a rich, layered ambient Web Audio soundscape representing this weather. Create 8-12 oscillators for additive synthesis, plus 2-4 LFOs to add organic movement. Think Brian Eno, Stars of the Lid, or Alva Noto - sparse but harmonically rich with slow evolution."}

Oscillator Guidelines:
- Use 8-12 oscillators for depth and complexity
- Spread frequencies across the spectrum (both low drones and high shimmer)
- Vary oscillator types (sine for purity, triangle for warmth, sawtooth for texture)
- Keep individual gains low (0.08-0.25) since we're layering many sounds
- Use subtle detune values (-10 to +10) for organic movement
- Choose frequencies that create interesting harmonic relationships

LFO Guidelines - Map weather to modulation:
- Create 2-4 LFOs to modulate different parameters
- Wind gusts → faster LFO rates and higher depth (turbulent movement)
- Wind direction → choose which oscillators to modulate (directional character)
- Solar radiation/UV → brightness via 'detune' LFOs (shimmer and sparkle)
- Cloud layers (low/mid/high) → different frequency bands to modulate
- Visibility → depth of modulation (low visibility = deeper, more obscured sound)
- CAPE (atmospheric instability) → aggressive modulation rates (stormy = faster)
- Dew point → moisture-influenced gain modulation (humid = pulsing dynamics)
- Day/Night → overall LFO rate (night = slower, more meditative)
- Temperature difference (actual vs feels-like) → detune spread
- Precipitation probability → gain modulation intensity
- LFO rate: 0.05-2 Hz (slower = more meditative, faster = more active)
- LFO depth: 0.1-0.8 (controls modulation intensity)
- LFO targets: 'frequency', 'detune', 'gain', or 'filter'
- LFO waveforms: 'sine' (smooth), 'triangle' (linear), 'sawtooth' (ramping), 'square' (stepping)

Return ONLY valid JSON in this exact format:
{
  "oscillators": [
    {"type": "sine", "frequency": 110, "gain": 0.15, "detune": 0},
    {"type": "sine", "frequency": 220, "gain": 0.18, "detune": 5},
    {"type": "triangle", "frequency": 165, "gain": 0.12, "detune": -3},
    {"type": "sine", "frequency": 440, "gain": 0.15, "detune": 7},
    {"type": "sawtooth", "frequency": 55, "gain": 0.10, "detune": 0},
    {"type": "sine", "frequency": 880, "gain": 0.12, "detune": -5},
    {"type": "sine", "frequency": 330, "gain": 0.14, "detune": 3},
    {"type": "triangle", "frequency": 660, "gain": 0.11, "detune": -2}
  ],
  "filters": [
    {"type": "lowpass", "frequency": 2000, "q": 1}
  ],
  "effects": {
    "reverb": {"decay": 3, "mix": 0.4},
    "delay": {"time": 0.5, "feedback": 0.3, "mix": 0.2}
  },
  "lfos": [
    {"rate": 0.15, "depth": 0.4, "target": "detune", "waveform": "sine", "targetIndex": 0},
    {"rate": 0.3, "depth": 0.5, "target": "gain", "waveform": "triangle", "targetIndex": 2},
    {"rate": 0.08, "depth": 0.6, "target": "frequency", "waveform": "sine", "targetIndex": 5}
  ]
}

Valid oscillator types: sine, square, sawtooth, triangle
Valid filter types: lowpass, highpass, bandpass, notch
Valid LFO targets: frequency, detune, gain, filter
Valid LFO waveforms: sine, triangle, sawtooth, square
Frequency range: 20-20000 Hz (try 55Hz, 110Hz, 220Hz, 440Hz, 880Hz, 1760Hz for harmonic relationships)
Gain range: 0-1 (use 0.08-0.25 for layered sounds)
Detune range: -100 to +100 cents (use -10 to +10 for subtle movement)
Q range: 0.0001-1000
LFO rate range: 0.01-20 Hz (use 0.05-2 for organic movement)
LFO depth range: 0-1 (controls modulation intensity)`;

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
    return getFallbackParameters(weather, previousParams);
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
  const validLFOTargets = ["frequency", "detune", "gain", "filter"];
  const validLFOWaveforms = ["sine", "triangle", "sawtooth", "square"];

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
    lfos: (params.lfos || []).map((lfo) => ({
      rate: Math.max(0.01, Math.min(20, lfo.rate || 0.1)),
      depth: Math.max(0, Math.min(1, lfo.depth || 0.5)),
      target: validLFOTargets.includes(lfo.target)
        ? (lfo.target as any)
        : "detune",
      waveform: validLFOWaveforms.includes(lfo.waveform)
        ? (lfo.waveform as any)
        : "sine",
      targetIndex: lfo.targetIndex,
    })),
  };
}

/**
 * Evolve audio parameters gradually from previous state based on weather changes
 */
function evolveFromPrevious(
  weather: WeatherData,
  previous: AudioParameters,
): AudioParameters {
  const tempNorm = (weather.temperature - 32) / 68;
  const _windNorm = weather.windSpeed / 30;
  const windGustNorm = weather.windGusts / 40;
  const solarNorm = weather.solar.shortwaveRadiation / 1000;
  const cloudNorm = weather.cloudCover / 100;
  const visibilityNorm = Math.min(weather.visibility / 10000, 1);
  const capeNorm = Math.min(weather.cape / 2000, 1);
  const uvNorm = weather.uvIndex / 11;

  // Evolve oscillators: keep most, but adjust frequencies/gains slightly
  const evolvedOscillators = previous.oscillators.map((osc, _idx) => {
    // Frequency shifts influenced by temperature and CAPE (instability)
    const freqShift =
      (Math.random() - 0.5) * 40 + tempNorm * 20 + capeNorm * 15;

    // Gain adjustments based on solar radiation, UV, and cloud cover
    const gainShift =
      (Math.random() - 0.5) * 0.06 +
      (solarNorm + uvNorm) * 0.02 -
      cloudNorm * 0.03;

    // Detune adjustments based on wind gusts and visibility
    const detuneShift =
      (Math.random() - 0.5) * 4 + windGustNorm * 5 - visibilityNorm * 2;

    return {
      type: osc.type,
      frequency: Math.max(20, Math.min(20000, osc.frequency + freqShift)),
      gain: Math.max(0.05, Math.min(0.3, osc.gain + gainShift)),
      detune: (osc.detune || 0) + detuneShift,
    };
  });

  // Evolve LFOs with weather-influenced changes
  const evolvedLFOs = (previous.lfos || []).map((lfo) => {
    // LFO rate influenced by wind gusts and CAPE (atmospheric turbulence)
    const rateShift =
      (Math.random() - 0.5) * 0.1 + (windGustNorm + capeNorm) * 0.05;

    // LFO depth influenced by cloud cover and visibility
    const depthShift =
      (Math.random() - 0.5) * 0.15 + cloudNorm * 0.1 - visibilityNorm * 0.05;

    return {
      ...lfo,
      rate: Math.max(0.01, Math.min(20, lfo.rate + rateShift)),
      depth: Math.max(0.1, Math.min(0.8, lfo.depth + depthShift)),
    };
  });

  return {
    oscillators: evolvedOscillators,
    filters: previous.filters, // Keep filters mostly the same
    effects: previous.effects, // Keep effects the same
    lfos: evolvedLFOs,
  };
}

function getFallbackParameters(
  weather: WeatherData,
  previousParams?: AudioParameters | null,
): AudioParameters {
  // If we have previous params, evolve from them gradually
  if (previousParams && previousParams.oscillators.length > 0) {
    return evolveFromPrevious(weather, previousParams);
  }

  // Rich rule-based fallback with multiple oscillators and LFOs (initial generation)
  const tempNorm = (weather.temperature - 32) / 68; // normalize 32-100°F to 0-1
  const windNorm = weather.windSpeed / 30; // normalize 0-30mph to 0-1
  const windGustNorm = weather.windGusts / 40;
  const humidityNorm = weather.humidity / 100;
  const solarNorm = weather.solar.shortwaveRadiation / 1000; // normalize solar radiation
  const cloudNorm = weather.cloudCover / 100;
  const _cloudLowNorm = weather.cloudCoverLow / 100;
  const cloudMidNorm = weather.cloudCoverMid / 100;
  const cloudHighNorm = weather.cloudCoverHigh / 100;
  const visibilityNorm = Math.min(weather.visibility / 10000, 1);
  const uvNorm = weather.uvIndex / 11;
  const capeNorm = Math.min(weather.cape / 2000, 1); // Atmospheric instability
  const dewPointNorm = (weather.dewPoint - 32) / 68;
  const isNight = weather.isDay === 0;

  // Calculate trends from hourly data
  const _tempTrend =
    weather.hourly.temperature.length > 1
      ? (weather.hourly.temperature[11] - weather.hourly.temperature[0]) / 68
      : 0;
  const avgPrecipProb =
    weather.hourly.precipitationProbability.reduce((a, b) => a + b, 0) /
    weather.hourly.precipitationProbability.length /
    100;
  const _avgUV =
    weather.hourly.uvIndex.reduce((a, b) => a + b, 0) /
    weather.hourly.uvIndex.length /
    11;
  const avgCAPE =
    weather.hourly.cape.reduce((a, b) => a + b, 0) /
    weather.hourly.cape.length /
    2000;

  // Base frequency depends on temperature (warmer = higher)
  const baseFreq = 110 + tempNorm * 110; // 110-220 Hz

  return {
    oscillators: [
      // Deep bass drone
      {
        type: "sine",
        frequency: baseFreq * 0.5, // Sub-bass
        gain: 0.12,
        detune: 0,
      },
      // Fundamental
      {
        type: "sine",
        frequency: baseFreq,
        gain: 0.15,
        detune: windNorm * 8,
      },
      // Fifth harmonic
      {
        type: "triangle",
        frequency: baseFreq * 1.5,
        gain: 0.14,
        detune: -windNorm * 6,
      },
      // Octave
      {
        type: "sine",
        frequency: baseFreq * 2,
        gain: 0.12,
        detune: humidityNorm * 10,
      },
      // High shimmer (depends on UV and solar radiation)
      {
        type: "sine",
        frequency: 880 + (solarNorm + uvNorm) * 440,
        gain: 0.1 + (solarNorm + uvNorm) * 0.05,
        detune: -humidityNorm * 7 + visibilityNorm * 3,
      },
      // Textural layer (more prominent in gusty conditions)
      {
        type: "sawtooth",
        frequency: baseFreq * 0.75,
        gain: 0.08 + windGustNorm * 0.1,
        detune: windGustNorm * 15 - cloudNorm * 5,
      },
      // Atmospheric high (influenced by cloud layers)
      {
        type: "sine",
        frequency: 1320 + cloudHighNorm * 440,
        gain: 0.09 + visibilityNorm * 0.04,
        detune: cloudMidNorm * 8 - 5,
      },
      // Mid-range harmonic
      {
        type: "triangle",
        frequency: baseFreq * 3,
        gain: 0.1,
        detune: tempNorm * 8,
      },
      // Upper harmonic
      {
        type: "sine",
        frequency: baseFreq * 4,
        gain: 0.08,
        detune: -tempNorm * 5,
      },
    ],
    filters: [
      {
        type: "lowpass",
        frequency: 1500 + tempNorm * 1500 + solarNorm * 500,
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
    lfos: [
      // LFO 1: Detune modulation based on UV/solar (creates shimmer/brightness)
      {
        rate: (isNight ? 0.05 : 0.1) + (uvNorm + solarNorm) * 0.3,
        depth: 0.3 + (uvNorm + solarNorm) * 0.3 - cloudNorm * 0.2, // Less shimmer when cloudy
        target: "detune" as const,
        waveform: "sine" as const,
        targetIndex: 4, // Modulate the high shimmer oscillator
      },
      // LFO 2: Gain modulation based on dew point/moisture (pulsing)
      {
        rate: 0.12 + dewPointNorm * 0.25 + avgPrecipProb * 0.15,
        depth: 0.2 + avgPrecipProb * 0.4 + dewPointNorm * 0.2, // More pulsing when humid/rainy
        target: "gain" as const,
        waveform: "triangle" as const,
        targetIndex: 1, // Modulate fundamental
      },
      // LFO 3: Frequency modulation based on CAPE (atmospheric instability)
      {
        rate: 0.08 + capeNorm * 0.5 + avgCAPE * 0.3, // Faster when unstable
        depth: 0.4 + capeNorm * 0.3,
        target: "frequency" as const,
        waveform:
          windGustNorm > 0.5 ? ("sawtooth" as const) : ("sine" as const), // More aggressive in gusty conditions
        targetIndex: 6, // Modulate atmospheric high
      },
      // LFO 4: Filter modulation based on visibility and wind gusts
      {
        rate: 0.05 + (windGustNorm + capeNorm) * 0.2 - visibilityNorm * 0.1, // Slower in clear conditions
        depth: 0.5 + cloudNorm * 0.2 - visibilityNorm * 0.2, // Deeper when obscured
        target: "filter" as const,
        waveform: "sine" as const,
        targetIndex: 0, // Modulate the lowpass filter
      },
    ],
  };
}
