import {useState, useEffect, useRef, useCallback} from "react";
import "./styles/global.css";
import * as styles from "./app.css";
import {LoginButton} from "./components/login-button";
import {Terminal, type TerminalLine} from "./components/terminal";
import {FrequencyVisualizer} from "./components/frequency-visualizer";
import {getUserLocation} from "./lib/geolocation";
import {fetchWeatherData} from "./lib/weather";
import {
  checkGeminiAvailability,
  generateAudioParameters,
  type AvailabilityStatus,
} from "./lib/gemini";
import {AudioSynthesizer} from "./lib/audio-synthesizer";
import {AudioEvolutionEngine} from "./lib/audio-evolution-engine";
import {performSystemCheck, getSetupInstructions} from "./lib/system-check";
import type {WeatherData} from "./types/weather";

function App() {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEvolving, setIsEvolving] = useState(false);
  const [aiStatus, setAiStatus] = useState<AvailabilityStatus | null>(null);
  const synthRef = useRef<AudioSynthesizer | null>(null);
  const evolutionEngineRef = useRef<AudioEvolutionEngine | null>(null);
  const weatherDataRef = useRef<WeatherData | null>(null);
  const coordinatesRef = useRef<{latitude: number; longitude: number} | null>(null);

  const addLog = useCallback(
    (text: string, type: TerminalLine["type"] = "output") => {
      setTerminalLines((prev) => [
        ...prev,
        {text, type, timestamp: Date.now()},
      ]);
    },
    [],
  );

  const hasLoggedInitial = useRef(false);

  useEffect(() => {
    // Only log initial messages once (prevents double logging in StrictMode)
    if (!hasLoggedInitial.current) {
      hasLoggedInitial.current = true;

      // Sequential initialization to ensure proper order
      const initializeApp = async () => {
        addLog("weather-station v1.0.0", "info");
        addLog("", "output");
        addLog("Running system check...", "info");

        // Run system check
        const checkResult = await performSystemCheck();
        const instructions = getSetupInstructions(checkResult);

        // Log all instructions
        for (const instruction of instructions) {
          if (
            instruction.startsWith("⚠️") ||
            instruction.startsWith("✓") ||
            instruction.startsWith("ℹ️")
          ) {
            const type = instruction.startsWith("✓")
              ? "success"
              : instruction.startsWith("ℹ️")
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

        // Initialize synthesizer
        const synth = new AudioSynthesizer();
        try {
          await synth.initialize();
          addLog("✓ Audio synthesizer ready", "success");
        } catch (err) {
          addLog(
            `✗ Failed to initialize audio: ${(err as Error).message}`,
            "error",
          );
        }
        synthRef.current = synth;

        // Check Chrome AI availability
        addLog("Checking Chrome AI availability...", "info");
        const status = await checkGeminiAvailability((text, type) => {
          if (type) addLog(text, type);
          else addLog(text);
        });
        setAiStatus(status);

        // Final message
        addLog("", "output");
        addLog('Type "help" for available commands', "output");
      };

      initializeApp();
    } else {
      // Still need to initialize synth for StrictMode re-mount
      const synth = new AudioSynthesizer();
      synth.initialize().catch(() => {});
      synthRef.current = synth;
    }

    return () => {
      synthRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommand = (command: string) => {
    addLog(command, "prompt");

    const cmd = command.toLowerCase().trim();

    if (cmd === "help") {
      addLog("Available commands:", "info");
      addLog("  start - Begin weather station", "output");
      addLog("  stop  - Stop weather station", "output");
      addLog("  setup - Show Chrome AI setup instructions", "output");
      addLog("  clear - Clear terminal output", "output");
      addLog("  debug - Show system status and debug information", "output");
      addLog("  help  - Show this help message", "output");
    } else if (cmd === "setup") {
      handleSetup();
    } else if (cmd === "start") {
      if (isPlaying) {
        addLog('Already playing. Use "stop" first.', "warning");
      } else {
        handleStart();
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

  const handleSetup = async () => {
    addLog("Running system check...", "info");
    const checkResult = await performSystemCheck();
    const instructions = getSetupInstructions(checkResult);

    addLog("", "output");
    for (const instruction of instructions) {
      if (
        instruction.startsWith("⚠️") ||
        instruction.startsWith("✓") ||
        instruction.startsWith("ℹ️")
      ) {
        const type = instruction.startsWith("✓")
          ? "success"
          : instruction.startsWith("ℹ️")
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

    // Browser Section
    addLog("BROWSER", "info");
    addLog(`  User Agent: ${navigator.userAgent}`, "output");
    addLog(`  Platform: ${navigator.platform}`, "output");
    addLog("", "output");

    // Audio Section
    addLog("AUDIO SYSTEM", "info");
    const synthInitialized = synthRef.current?.getIsPlaying !== undefined;
    addLog(
      `  Synthesizer: ${synthInitialized ? "✓ Initialized" : "✗ Not initialized"}`,
      synthInitialized ? "success" : "error",
    );
    addLog(`  Playing: ${isPlaying ? "Yes" : "No"}`, "output");

    if (synthRef.current && (synthRef.current as any).audioContext) {
      const ctx = (synthRef.current as any).audioContext;
      addLog(`  AudioContext State: ${ctx.state}`, "output");
      addLog(`  Sample Rate: ${ctx.sampleRate}Hz`, "output");
    }

    const audioApiSupported =
      typeof AudioContext !== "undefined" ||
      typeof (window as any).webkitAudioContext !== "undefined";
    addLog(
      `  Web Audio API: ${audioApiSupported ? "✓ Supported" : "✗ Not supported"}`,
      audioApiSupported ? "success" : "error",
    );
    addLog("", "output");

    // Chrome AI Section
    addLog("CHROME AI (GEMINI NANO)", "info");
    const hasLanguageModel =
      typeof (window as any).LanguageModel !== "undefined" ||
      typeof (window as any).ai?.languageModel !== "undefined";
    addLog(
      `  API Available: ${hasLanguageModel ? "✓ Yes" : "✗ No"}`,
      hasLanguageModel ? "success" : "error",
    );

    if (hasLanguageModel) {
      try {
        const languageModel =
          (window as any).LanguageModel || (window as any).ai?.languageModel;
        if (languageModel) {
          const availability = await languageModel.availability();
          const statusIcon =
            availability === "available"
              ? "✓"
              : availability === "downloading"
                ? "ℹ️"
                : "⚠️";
          const statusType =
            availability === "available" ? "success" : "warning";
          addLog(`  Status: ${statusIcon} ${availability}`, statusType);
        }
      } catch (err) {
        addLog(
          `  Status: ✗ Error - ${err instanceof Error ? err.message : "Unknown"}`,
          "error",
        );
      }
    } else {
      addLog("  Status: Not available (flags not enabled)", "output");
      addLog('  Run "setup" command for instructions', "output");
    }
    addLog("", "output");

    // Geolocation Section
    addLog("GEOLOCATION", "info");
    const geoSupported = "geolocation" in navigator;
    addLog(
      `  API Available: ${geoSupported ? "✓ Yes" : "✗ No"}`,
      geoSupported ? "success" : "error",
    );

    if (navigator.permissions && geoSupported) {
      try {
        const geoPermission = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        const permIcon =
          geoPermission.state === "granted"
            ? "✓"
            : geoPermission.state === "denied"
              ? "✗"
              : "⚠️";
        const permType =
          geoPermission.state === "granted"
            ? "success"
            : geoPermission.state === "denied"
              ? "error"
              : "warning";
        addLog(`  Permission: ${permIcon} ${geoPermission.state}`, permType);
      } catch (err) {
        addLog(`  Permission: Error checking`, "warning");
      }
    }

    addLog("", "output");
    addLog("=== End Debug Information ===", "info");
  };

  const handleStart = async () => {
    addLog("Getting your location...", "info");

    try {
      // Get user location
      const coords = await getUserLocation();
      coordinatesRef.current = coords;
      addLog(
        `Location: ${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`,
        "success",
      );
      addLog("Fetching weather data...", "info");

      // Fetch weather
      const weatherData = await fetchWeatherData(coords);
      weatherDataRef.current = weatherData;
      addLog(
        `Weather: ${weatherData.temperature}°F, ${weatherData.conditions}`,
        "success",
      );
      addLog(
        `Wind: ${weatherData.windSpeed}mph, Humidity: ${weatherData.humidity}%, Solar: ${weatherData.solar.shortwaveRadiation.toFixed(0)}W/m²`,
        "output",
      );
      addLog("Generating initial soundscape...", "info");

      // Generate audio parameters with Chrome AI
      const audioParams = await generateAudioParameters(
        weatherData,
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

      // Start audio synthesis
      if (synthRef.current) {
        await synthRef.current.start(audioParams);
        setIsPlaying(true);
        addLog('Audio playing. Use "stop" command to end.', "success");

        // Initialize and start continuous weather-driven evolution
        addLog("Starting continuous weather-driven evolution...", "info");
        if (!evolutionEngineRef.current) {
          evolutionEngineRef.current = new AudioEvolutionEngine({
            weatherUpdateInterval: 60, // Fetch new weather every 60 seconds
            crossfadeDuration: 8, // 8 second crossfade
          });
        }

        // Start evolution loop
        await evolutionEngineRef.current.start(
          coords,
          weatherData,
          audioParams,
          async (newParams, newWeather) => {
            // Crossfade callback with updated weather
            if (synthRef.current) {
              await synthRef.current.crossfade(newParams, 8);
              weatherDataRef.current = newWeather;
              addLog(
                `Weather updated: ${newWeather.temperature}°F, ${newWeather.conditions}`,
                "info",
              );
            }
          },
          (text, type) => {
            if (type) addLog(text, type);
            else addLog(text);
          },
        );

        setIsEvolving(true);
        addLog(
          "Soundscape will evolve continuously based on weather updates (every 60s).",
          "success",
        );
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
    <>
      <LoginButton />
      <div className={styles.page}>
        <section className={styles.section}>
          {isPlaying ? (
            <div className={styles.splitContainer}>
              <div className={styles.terminalPane}>
                <Terminal
                  lines={terminalLines}
                  isActive={true}
                  onCommand={handleCommand}
                />
              </div>
              <div className={styles.visualizerPane}>
                <FrequencyVisualizer synthesizer={synthRef.current} />
              </div>
            </div>
          ) : (
            <div className={styles.splitContainer}>
              <div className={styles.terminalPane}>
                <Terminal
                  lines={terminalLines}
                  isActive={true}
                  onCommand={handleCommand}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default App;
