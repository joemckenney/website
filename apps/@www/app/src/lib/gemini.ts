import type { WeatherData, AudioParameters } from '../types/weather';

// Chrome Prompt API types based on official documentation
// https://developer.chrome.com/docs/ai/prompt-api

type AIAvailability = 'unavailable' | 'downloading' | 'available';

interface AIDownloadProgressEvent {
  loaded: number;
  total: number;
}

interface AIDownloadMonitor {
  addEventListener(
    type: 'downloadprogress',
    listener: (event: AIDownloadProgressEvent) => void
  ): void;
}

interface AILanguageModelCreateOptions {
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  monitor?: (monitor: AIDownloadMonitor) => void;
  // Output language code (required for proper output quality and safety)
  language?: string;
}

interface AILanguageModel {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  promptStreaming(
    input: string,
    options?: { signal?: AbortSignal }
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
  log?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void
): Promise<AvailabilityStatus> {
  // Check new API first, then fall back to legacy window.ai
  const languageModel = window.LanguageModel || window.ai?.languageModel;

  if (!languageModel) {
    log?.('Chrome AI not available in this browser', 'warning');
    return {
      available: false,
      status: 'unavailable',
      downloading: false,
    };
  }

  try {
    const status = await languageModel.availability();

    if (status === 'available') {
      log?.('Chrome AI is ready', 'success');
    } else if (status === 'downloading') {
      log?.('Chrome AI model is downloading (this may take a few minutes)', 'warning');
      log?.('The first request will use rule-based generation', 'info');
    } else {
      log?.(`Chrome AI status: ${status}`, 'warning');
    }

    return {
      available: status === 'available',
      status,
      downloading: status === 'downloading',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log?.(`Failed to check AI availability: ${errorMsg}`, 'error');
    return {
      available: false,
      status: 'unavailable',
      downloading: false,
    };
  }
}

export async function generateAudioParameters(
  weather: WeatherData,
  onProgress?: (progress: number) => void,
  log?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void
): Promise<AudioParameters> {
  // Check new API first, then fall back to legacy window.ai
  const languageModel = window.LanguageModel || window.ai?.languageModel;

  if (!languageModel) {
    log?.('Chrome Prompt API not available, using rule-based generation', 'warning');
    return getFallbackParameters(weather);
  }

  // Check availability before creating session
  log?.('Checking AI model availability...', 'info');
  const availability = await languageModel.availability();

  if (availability === 'unavailable') {
    log?.('AI model unavailable, using rule-based generation', 'warning');
    return getFallbackParameters(weather);
  }

  if (availability === 'downloading') {
    log?.('AI model is still downloading, cannot create session yet', 'warning');
    log?.('Using rule-based generation instead', 'info');
    return getFallbackParameters(weather);
  }

  if (availability !== 'available') {
    log?.(`AI model status: ${availability}, using rule-based generation`, 'warning');
    return getFallbackParameters(weather);
  }

  log?.('AI model is ready, creating session...', 'success');

  const systemPrompt = `You are a creative sound designer. You respond ONLY with valid JSON matching the requested format. Never add markdown formatting, explanations, or any text outside the JSON structure.`;

  const userPrompt = `Current weather: ${weather.temperature}°F, ${weather.conditions}, wind ${weather.windSpeed}mph, humidity ${weather.humidity}%, pressure ${weather.pressure}hPa

Design an ambient Web Audio soundscape representing this weather. Create a mood and atmosphere that matches the conditions.

Return ONLY valid JSON in this exact format:
{
  "oscillators": [
    {"type": "sine", "frequency": 220, "gain": 0.3, "detune": 0}
  ],
  "filters": [
    {"type": "lowpass", "frequency": 1000, "q": 1}
  ],
  "effects": {
    "reverb": {"decay": 2, "mix": 0.3},
    "delay": {"time": 0.5, "feedback": 0.3, "mix": 0.2}
  }
}

Valid oscillator types: sine, square, sawtooth, triangle
Valid filter types: lowpass, highpass, bandpass, notch
Frequency range: 20-20000 Hz
Gain range: 0-1
Q range: 0.0001-1000`;

  try {
    // Create session with system prompt and download monitor
    // Note: Must specify BOTH temperature and topK, or NEITHER
    const session = await languageModel.create({
      temperature: 0.8, // Higher temperature for more creative variations
      topK: 40, // Limit token selection pool for more focused output
      language: 'en', // Required: output language for quality and safety
      initialPrompts: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
      monitor: (m) => {
        m.addEventListener('downloadprogress', (e) => {
          const progress = (e.loaded / e.total) * 100;
          log?.(`AI model download: ${progress.toFixed(1)}%`, 'info');
          onProgress?.(progress);
        });
      },
    });

    log?.('Sending weather data to AI for interpretation...', 'info');

    // Send prompt
    const response = await session.prompt(userPrompt);

    log?.('AI response received, generating soundscape...', 'success');

    // Clean up session
    session.destroy();

    // Try to extract JSON from response (in case AI adds markdown or text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;

    const params = JSON.parse(jsonStr) as AudioParameters;

    // Validate and sanitize the response
    return sanitizeAudioParameters(params);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log?.(`AI generation failed: ${errorMsg}`, 'error');

    // Provide helpful error messages
    if (error instanceof DOMException) {
      if (error.name === 'NotSupportedError') {
        log?.('Unsupported AI input/output combination', 'error');
      }
    }

    log?.('Falling back to rule-based generation', 'warning');
    // Return fallback parameters on any error
    return getFallbackParameters(weather);
  }
}

function sanitizeAudioParameters(params: AudioParameters): AudioParameters {
  const validOscTypes: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];
  const validFilterTypes: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass', 'notch'];

  return {
    oscillators: (params.oscillators || []).map((osc) => ({
      type: validOscTypes.includes(osc.type as OscillatorType) ? osc.type : 'sine',
      frequency: Math.max(20, Math.min(20000, osc.frequency || 220)),
      gain: Math.max(0, Math.min(1, osc.gain || 0.3)),
      detune: osc.detune || 0,
    })),
    filters: (params.filters || []).map((filt) => ({
      type: validFilterTypes.includes(filt.type as BiquadFilterType)
        ? filt.type
        : 'lowpass',
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
            feedback: Math.max(0, Math.min(0.95, params.effects.delay.feedback)),
            mix: Math.max(0, Math.min(1, params.effects.delay.mix)),
          }
        : undefined,
    },
  };
}

function getFallbackParameters(weather: WeatherData): AudioParameters {
  // Simple rule-based fallback based on weather
  const tempNorm = (weather.temperature - 32) / 68; // normalize 32-100°F to 0-1
  const windNorm = weather.windSpeed / 30; // normalize 0-30mph to 0-1

  return {
    oscillators: [
      {
        type: 'sine',
        frequency: 220 + tempNorm * 440,
        gain: 0.3,
        detune: 0,
      },
      {
        type: 'triangle',
        frequency: 110,
        gain: 0.2,
        detune: windNorm * 50,
      },
    ],
    filters: [
      {
        type: 'lowpass',
        frequency: 1000 + tempNorm * 2000,
        q: 1,
      },
    ],
    effects: {
      reverb: {
        decay: 2 + weather.humidity / 50,
        mix: 0.3,
      },
      delay: {
        time: 0.3 + windNorm * 0.4,
        feedback: 0.3,
        mix: 0.2,
      },
    },
  };
}
