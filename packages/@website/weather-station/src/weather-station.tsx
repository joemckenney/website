import { useCallback, useEffect, useRef, useState } from "react";
import * as styles from "./app.css";
import { FrequencyVisualizer } from "./components/frequency-visualizer";
import { Terminal, type TerminalLine } from "./components/terminal";
import { AudioEvolutionEngine } from "./lib/audio-evolution-engine";
import { AudioSynthesizer } from "./lib/audio-synthesizer";
import { getUserLocation } from "./lib/geolocation";
import { generateAudioParameters } from "./lib/sound-engine";
import { getSetupInstructions, performSystemCheck } from "./lib/system-check";
import { fetchWeatherData } from "./lib/weather";
import {
  computeFingerprint,
  fingerprintToSeed,
} from "./lib/weather-fingerprint";
import type { WeatherData } from "./types/weather";

export function WeatherStation() {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [_isEvolving, setIsEvolving] = useState(false);
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
        addLog("weather-station v2.0.0", "info");
        addLog("deterministic weather sonification", "output");
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
      addLog("  start [lat,long] - Begin weather sonification", "output");
      addLog(
        "                     Optional: Provide coordinates (e.g., start 40.7128,-74.0060)",
        "output",
      );
      addLog("  stop     - Stop weather station", "output");
      addLog("  status   - Show current fingerprint and evolution stats", "output");
      addLog("  clear    - Clear terminal output", "output");
      addLog("  debug    - Show system status and debug information", "output");
      addLog("  help     - Show this help message", "output");
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
    } else if (cmd === "status") {
      handleStatus();
    } else if (cmd === "clear") {
      setTerminalLines([]);
    } else if (cmd === "debug") {
      handleDebug();
    } else {
      addLog(`Unknown command: ${command}`, "error");
      addLog('Type "help" for available commands.', "output");
    }
  };

  const handleStatus = () => {
    addLog("=== Weather Station Status ===", "info");
    addLog("", "output");

    if (!isPlaying || !evolutionEngineRef.current) {
      addLog("Not currently playing.", "output");
      addLog('Type "start" to begin.', "output");
      return;
    }

    const engine = evolutionEngineRef.current;
    const fp = engine.getFingerprint();

    if (fp) {
      addLog("FINGERPRINT", "info");
      addLog(`  Temperature bucket: ${fp.tempBucket}\u00B0F`, "output");
      addLog(`  Wind bucket: ${fp.windBucket} mph`, "output");
      addLog(`  Cloud bucket: ${fp.cloudBucket}%`, "output");
      addLog(`  Condition: ${fp.condition}`, "output");
      addLog(`  Day/Night: ${fp.isDay ? "Day" : "Night"}`, "output");
      addLog(`  Pressure bucket: ${fp.pressureBucket} hPa`, "output");
    }

    addLog("", "output");
    addLog("AUDIO", "info");
    if (synthRef.current) {
      addLog(`  Oscillators: ${synthRef.current.getOscillatorCount()}`, "output");
      addLog(`  LFOs: ${synthRef.current.getLfoCount()}`, "output");
    }
    addLog(`  Evolutions: ${engine.getEvolutionCount()}`, "output");
    addLog(`  Weather checks: ${engine.getGenerationCount()}`, "output");

    if (weatherDataRef.current) {
      const w = weatherDataRef.current;
      addLog("", "output");
      addLog("CURRENT WEATHER", "info");
      addLog(`  ${w.temperature}\u00B0F, ${w.conditions}`, "output");
      addLog(`  Wind: ${w.windSpeed} mph (gusts ${w.windGusts} mph)`, "output");
      addLog(`  Humidity: ${w.humidity}%, Cloud cover: ${w.cloudCover}%`, "output");
      addLog(`  CAPE: ${w.cape} J/kg`, "output");
    }

    addLog("", "output");
    addLog("=== End Status ===", "info");
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

      // Compute deterministic fingerprint and seed
      const fingerprint = computeFingerprint(weatherData);
      const seed = fingerprintToSeed(fingerprint);
      addLog(
        `Fingerprint: ${fingerprint.condition}, ${fingerprint.tempBucket}\u00B0F, ${fingerprint.isDay ? "day" : "night"} (seed: ${seed})`,
        "output",
      );

      addLog("Generating soundscape...", "info");

      const audioParams = generateAudioParameters(weatherData, seed);

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
            weatherUpdateInterval: 60,
            crossfadeDuration: 12,
          });
        }

        await evolutionEngineRef.current.start(
          coords,
          weatherData,
          audioParams,
          synthRef.current,
          async (newParams, newWeather, _changes) => {
            if (synthRef.current) {
              await synthRef.current.crossfade(newParams, 12);
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
          "Soundscape will evolve continuously based on weather updates (every 60s).",
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
