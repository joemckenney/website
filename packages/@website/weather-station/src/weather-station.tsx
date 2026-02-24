import { useCallback, useEffect, useRef, useState } from "react";
import * as styles from "./app.css";
import { FrequencyVisualizer } from "./components/frequency-visualizer";
import { Terminal, type TerminalLine } from "./components/terminal";
import { AudioEvolutionEngine } from "./lib/audio-evolution-engine";
import { AudioSynthesizer } from "./lib/audio-synthesizer";
import {
  type AvailabilityStatus,
  checkGeminiAvailability,
  generateAudioParameters,
  triggerModelDownload,
} from "./lib/gemini";
import { getUserLocation } from "./lib/geolocation";
import { getSetupInstructions, performSystemCheck } from "./lib/system-check";
import { fetchWeatherData } from "./lib/weather";
import type { WeatherData } from "./types/weather";

export function WeatherStation() {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [_isEvolving, setIsEvolving] = useState(false);
  const [_aiStatus, setAiStatus] = useState<AvailabilityStatus | null>(null);
  const synthRef = useRef<AudioSynthesizer | null>(null);
  const evolutionEngineRef = useRef<AudioEvolutionEngine | null>(null);
  const weatherDataRef = useRef<WeatherData | null>(null);
  const coordinatesRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );

  const addLog = useCallback(
    (text: string, type: TerminalLine["type"] = "output") => {
      setTerminalLines((prev) => [
        ...prev,
        { text, type, timestamp: Date.now() },
      ]);
    },
    [],
  );

  const updateLastLog = useCallback(
    (text: string, type: TerminalLine["type"] = "output") => {
      setTerminalLines((prev) => {
        if (prev.length === 0) return prev;
        const newLines = [...prev];
        newLines[newLines.length - 1] = { text, type, timestamp: Date.now() };
        return newLines;
      });
    },
    [],
  );

  const removeLastLog = useCallback(() => {
    setTerminalLines((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const hasLoggedInitial = useRef(false);

  useEffect(() => {
    if (!hasLoggedInitial.current) {
      hasLoggedInitial.current = true;

      const initializeApp = async () => {
        addLog("weather-station v1.0.0", "info");
        addLog("", "output");
        addLog("Running system check...", "info");

        const checkResult = await performSystemCheck();
        const instructions = getSetupInstructions(checkResult);

        for (const instruction of instructions) {
          if (
            instruction.startsWith("\u26A0\uFE0F") ||
            instruction.startsWith("\u2713") ||
            instruction.startsWith("\u2139\uFE0F")
          ) {
            const type = instruction.startsWith("\u2713")
              ? "success"
              : instruction.startsWith("\u2139\uFE0F")
                ? "info"
                : "warning";
            addLog(instruction, type);
          } else if (instruction === "") {
            addLog("", "output");
          } else {
            addLog(instruction, "output");
          }
        }

        addLog("", "output");
        addLog("Initializing audio synthesizer...", "info");

        const synth = new AudioSynthesizer();
        try {
          await synth.initialize();
          addLog("\u2713 Audio synthesizer ready", "success");
        } catch (err) {
          addLog(
            `\u2717 Failed to initialize audio: ${(err as Error).message}`,
            "error",
          );
        }
        synthRef.current = synth;

        addLog("Checking Chrome AI availability...", "info");
        const status = await checkGeminiAvailability((text, type) => {
          if (type) addLog(text, type);
          else addLog(text);
        });
        setAiStatus(status);

        addLog("", "output");
        addLog('Type "help" for available commands', "output");
      };

      initializeApp();
    } else {
      const synth = new AudioSynthesizer();
      synth.initialize().catch(() => {});
      synthRef.current = synth;
    }

    return () => {
      synthRef.current?.destroy();
    };
  }, [addLog]);

  const handleCommand = (command: string) => {
    addLog(command, "prompt");

    const cmd = command.toLowerCase().trim();

    if (cmd === "help") {
      addLog("Available commands:", "info");
      addLog("  start [lat,long] - Begin weather station", "output");
      addLog(
        "                     Optional: Provide coordinates (e.g., start 40.7128,-74.0060)",
        "output",
      );
      addLog("  stop     - Stop weather station", "output");
      addLog("  download - Download Chrome AI model (~1.7GB)", "output");
      addLog("  setup    - Show Chrome AI setup instructions", "output");
      addLog("  clear    - Clear terminal output", "output");
      addLog("  debug    - Show system status and debug information", "output");
      addLog("  help     - Show this help message", "output");
    } else if (cmd === "download") {
      handleDownload();
    } else if (cmd === "setup") {
      handleSetup();
    } else if (cmd.startsWith("start")) {
      if (isPlaying) {
        addLog('Already playing. Use "stop" first.', "warning");
      } else {
        const parts = command.trim().split(/\s+/);
        if (parts.length > 1) {
          const coordStr = parts.slice(1).join("").trim();
          const coordParts = coordStr.split(",");

          if (coordParts.length === 2) {
            const lat = parseFloat(coordParts[0].trim());
            const long = parseFloat(coordParts[1].trim());

            if (
              !Number.isNaN(lat) &&
              !Number.isNaN(long) &&
              lat >= -90 &&
              lat <= 90 &&
              long >= -180 &&
              long <= 180
            ) {
              handleStart({ latitude: lat, longitude: long });
            } else {
              addLog(
                "Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180.",
                "error",
              );
              addLog("Example: start 40.7128,-74.0060", "output");
            }
          } else {
            addLog("Invalid coordinate format. Use: start lat,long", "error");
            addLog("Example: start 40.7128,-74.0060", "output");
          }
        } else {
          handleStart();
        }
      }
    } else if (cmd === "stop") {
      if (!isPlaying) {
        addLog("Nothing is playing.", "warning");
      } else {
        addLog("Stopping audio...", "info");
        handleStop();
        addLog("Audio stopped.", "success");
      }
    } else if (cmd === "clear") {
      setTerminalLines([]);
    } else if (cmd === "debug") {
      handleDebug();
    } else {
      addLog(`Unknown command: ${command}`, "error");
      addLog('Type "help" for available commands.', "output");
    }
  };

  const handleDownload = async () => {
    addLog("Triggering Chrome AI model download...", "info");
    const success = await triggerModelDownload((text, type) => {
      if (type) addLog(text, type);
      else addLog(text);
    });

    if (success) {
      const status = await checkGeminiAvailability((text, type) => {
        if (type) addLog(text, type);
        else addLog(text);
      });
      setAiStatus(status);
    }
  };

  const handleSetup = async () => {
    addLog("Running system check...", "info");
    const checkResult = await performSystemCheck();
    const instructions = getSetupInstructions(checkResult);

    addLog("", "output");
    for (const instruction of instructions) {
      if (
        instruction.startsWith("\u26A0\uFE0F") ||
        instruction.startsWith("\u2713") ||
        instruction.startsWith("\u2139\uFE0F")
      ) {
        const type = instruction.startsWith("\u2713")
          ? "success"
          : instruction.startsWith("\u2139\uFE0F")
            ? "info"
            : "warning";
        addLog(instruction, type);
      } else if (instruction === "") {
        addLog("", "output");
      } else {
        addLog(instruction, "output");
      }
    }
    addLog("", "output");
  };

  const handleDebug = async () => {
    addLog("=== System Debug Information ===", "info");
    addLog("", "output");

    addLog("BROWSER", "info");
    addLog(`  User Agent: ${navigator.userAgent}`, "output");
    addLog(`  Platform: ${navigator.platform}`, "output");
    addLog("", "output");

    addLog("AUDIO SYSTEM", "info");
    const synthInitialized = synthRef.current?.getIsPlaying !== undefined;
    addLog(
      `  Synthesizer: ${synthInitialized ? "\u2713 Initialized" : "\u2717 Not initialized"}`,
      synthInitialized ? "success" : "error",
    );
    addLog(`  Playing: ${isPlaying ? "Yes" : "No"}`, "output");

    // biome-ignore lint/suspicious/noExplicitAny: Accessing internal audioContext property
    if (synthRef.current && (synthRef.current as any).audioContext) {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing internal audioContext property
      const ctx = (synthRef.current as any).audioContext;
      addLog(`  AudioContext State: ${ctx.state}`, "output");
      addLog(`  Sample Rate: ${ctx.sampleRate}Hz`, "output");
    }

    const audioApiSupported =
      typeof AudioContext !== "undefined" ||
      // biome-ignore lint/suspicious/noExplicitAny: Checking for legacy webkit API
      typeof (window as any).webkitAudioContext !== "undefined";
    addLog(
      `  Web Audio API: ${audioApiSupported ? "\u2713 Supported" : "\u2717 Not supported"}`,
      audioApiSupported ? "success" : "error",
    );
    addLog("", "output");

    addLog("CHROME AI (GEMINI NANO)", "info");
    const hasLanguageModel =
      // biome-ignore lint/suspicious/noExplicitAny: Chrome AI experimental API
      typeof (window as any).LanguageModel !== "undefined" ||
      // biome-ignore lint/suspicious/noExplicitAny: Chrome AI experimental API
      typeof (window as any).ai?.languageModel !== "undefined";
    addLog(
      `  API Available: ${hasLanguageModel ? "\u2713 Yes" : "\u2717 No"}`,
      hasLanguageModel ? "success" : "error",
    );

    if (hasLanguageModel) {
      try {
        const languageModel =
          // biome-ignore lint/suspicious/noExplicitAny: Chrome AI experimental API
          (window as any).LanguageModel ||
          // biome-ignore lint/suspicious/noExplicitAny: Chrome AI experimental API
          (window as any).ai?.languageModel;
        if (languageModel) {
          const availability = await languageModel.availability();
          const statusIcon =
            availability === "available"
              ? "\u2713"
              : availability === "downloading"
                ? "\u2139\uFE0F"
                : "\u26A0\uFE0F";
          const statusType =
            availability === "available" ? "success" : "warning";
          addLog(`  Status: ${statusIcon} ${availability}`, statusType);
        }
      } catch (err) {
        addLog(
          `  Status: \u2717 Error - ${err instanceof Error ? err.message : "Unknown"}`,
          "error",
        );
      }
    } else {
      addLog("  Status: Not available (flags not enabled)", "output");
      addLog('  Run "setup" command for instructions', "output");
    }
    addLog("", "output");

    addLog("GEOLOCATION", "info");
    const geoSupported = "geolocation" in navigator;
    addLog(
      `  API Available: ${geoSupported ? "\u2713 Yes" : "\u2717 No"}`,
      geoSupported ? "success" : "error",
    );

    if (navigator.permissions && geoSupported) {
      try {
        const geoPermission = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        const permIcon =
          geoPermission.state === "granted"
            ? "\u2713"
            : geoPermission.state === "denied"
              ? "\u2717"
              : "\u26A0\uFE0F";
        const permType =
          geoPermission.state === "granted"
            ? "success"
            : geoPermission.state === "denied"
              ? "error"
              : "warning";
        addLog(`  Permission: ${permIcon} ${geoPermission.state}`, permType);
      } catch (_err) {
        addLog("  Permission: Error checking", "warning");
      }
    }

    addLog("", "output");
    addLog("=== End Debug Information ===", "info");
  };

  const handleStart = async (providedCoords?: {
    latitude: number;
    longitude: number;
  }) => {
    try {
      let coords: { latitude: number; longitude: number };

      if (providedCoords) {
        coords = providedCoords;
        addLog(
          `Using provided coordinates: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
          "success",
        );
      } else {
        addLog("Getting your location...", "info");
        coords = await getUserLocation();
        addLog(
          `Location: ${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`,
          "success",
        );
      }

      coordinatesRef.current = coords;
      addLog("Fetching weather data...", "info");

      const weatherData = await fetchWeatherData(coords);
      weatherDataRef.current = weatherData;
      addLog(
        `Weather: ${weatherData.temperature}\u00B0F, ${weatherData.conditions}`,
        "success",
      );
      addLog(
        `Wind: ${weatherData.windSpeed}mph, Humidity: ${weatherData.humidity}%, Solar: ${weatherData.solar.shortwaveRadiation.toFixed(0)}W/m\u00B2`,
        "output",
      );
      addLog("Generating initial soundscape...", "info");

      const audioParams = await generateAudioParameters(
        weatherData,
        null,
        undefined,
        (text, type) => {
          if (type) addLog(text, type);
          else addLog(text);
        },
      );

      addLog(
        `Created soundscape: ${audioParams.oscillators.length} oscillators, ${audioParams.lfos?.length || 0} LFOs`,
        "success",
      );
      addLog("Starting audio playback...", "info");

      if (synthRef.current) {
        await synthRef.current.start(audioParams);
        setIsPlaying(true);
        addLog('Audio playing. Use "stop" command to end.', "success");

        addLog("Starting continuous weather-driven evolution...", "info");
        if (!evolutionEngineRef.current) {
          evolutionEngineRef.current = new AudioEvolutionEngine({
            weatherUpdateInterval: 10,
            crossfadeDuration: 8,
          });
        }

        await evolutionEngineRef.current.start(
          coords,
          weatherData,
          audioParams,
          async (newParams, newWeather, _changes) => {
            if (synthRef.current) {
              await synthRef.current.crossfade(newParams, 8);
              weatherDataRef.current = newWeather;
            }
          },
          (text, type) => {
            if (type) addLog(text, type);
            else addLog(text);
          },
          (text, type) => {
            updateLastLog(text, type);
          },
          () => {
            removeLastLog();
          },
        );

        setIsEvolving(true);
        addLog(
          "Soundscape will evolve continuously based on weather updates (every 10s).",
          "success",
        );
        addLog("Detecting changes in weather.", "info");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      addLog(`Error: ${errorMsg}`, "error");
    }
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.stop();
      setIsPlaying(false);
    }
    if (evolutionEngineRef.current) {
      evolutionEngineRef.current.stop();
      setIsEvolving(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <div className={styles.splitContainer}>
          <div className={styles.terminalPane}>
            <Terminal
              lines={terminalLines}
              isActive={true}
              onCommand={handleCommand}
            />
          </div>
          {isPlaying && (
            <div className={styles.visualizerPane}>
              <FrequencyVisualizer synthesizer={synthRef.current} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
