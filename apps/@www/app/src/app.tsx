import { useState, useEffect, useRef, useCallback } from 'react';
import './styles/global.css';
import * as styles from './app.css';
import { LoginButton } from './components/login-button';
import { Terminal, type TerminalLine } from './components/terminal';
import { FrequencyVisualizer } from './components/frequency-visualizer';
import { getUserLocation } from './lib/geolocation';
import { fetchWeatherData } from './lib/weather';
import {
  checkGeminiAvailability,
  generateAudioParameters,
  type AvailabilityStatus,
} from './lib/gemini';
import { AudioSynthesizer } from './lib/audio-synthesizer';
import type { WeatherData } from './types/weather';

function App() {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiStatus, setAiStatus] = useState<AvailabilityStatus | null>(null);
  const synthRef = useRef<AudioSynthesizer | null>(null);

  const addLog = useCallback((text: string, type: TerminalLine['type'] = 'output') => {
    setTerminalLines((prev) => [...prev, { text, type, timestamp: Date.now() }]);
  }, []);

  const hasLoggedInitial = useRef(false);

  useEffect(() => {
    // Only log initial messages once (prevents double logging in StrictMode)
    if (!hasLoggedInitial.current) {
      hasLoggedInitial.current = true;
      addLog('weather-sonification v1.0.0', 'info');
      addLog('Initializing audio synthesizer...', 'info');
    }

    // Always initialize synthesizer (needed for StrictMode cleanup/re-init)
    const synth = new AudioSynthesizer();
    synth
      .initialize()
      .then(() => {
        // Only log success message once
        if (terminalLines.length <= 2) {
          addLog('Audio synthesizer ready', 'success');
        }
      })
      .catch((err) => {
        addLog(`Failed to initialize audio: ${err.message}`, 'error');
      });
    synthRef.current = synth;

    // Check if Chrome AI is available (only on first mount)
    if (terminalLines.length <= 2) {
      addLog('Checking Chrome AI availability...', 'info');
      checkGeminiAvailability((text, type) => {
        if (type) addLog(text, type);
        else addLog(text);
      }).then((status) => {
        setAiStatus(status);
      });

      addLog('Ready. Type "help" for available commands.', 'output');
    }

    return () => {
      synth.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommand = (command: string) => {
    addLog(command, 'prompt');

    const cmd = command.toLowerCase().trim();

    if (cmd === 'help') {
      addLog('Available commands:', 'info');
      addLog('  start - Begin weather sonification experience', 'output');
      addLog('  stop  - Stop audio playback', 'output');
      addLog('  clear - Clear terminal output', 'output');
      addLog('  debug - Show system status and debug information', 'output');
      addLog('  help  - Show this help message', 'output');
    } else if (cmd === 'start') {
      if (isPlaying) {
        addLog('Already playing. Use "stop" first.', 'warning');
      } else {
        handleStart();
      }
    } else if (cmd === 'stop') {
      if (!isPlaying) {
        addLog('Nothing is playing.', 'warning');
      } else {
        addLog('Stopping audio...', 'info');
        handleStop();
        addLog('Audio stopped.', 'success');
      }
    } else if (cmd === 'clear') {
      setTerminalLines([]);
    } else if (cmd === 'debug') {
      handleDebug();
    } else {
      addLog(`Unknown command: ${command}`, 'error');
      addLog('Type "help" for available commands.', 'output');
    }
  };

  const handleDebug = async () => {
    addLog('=== System Debug Information ===', 'info');

    // Browser info
    addLog(`Browser: ${navigator.userAgent}`, 'output');
    addLog(`Platform: ${navigator.platform}`, 'output');

    // Audio synthesizer status
    const synthInitialized = synthRef.current?.getIsPlaying !== undefined;
    addLog(`Audio Synthesizer: ${synthInitialized ? 'Initialized' : 'Not initialized'}`, synthInitialized ? 'success' : 'error');
    addLog(`Audio Playing: ${isPlaying ? 'Yes' : 'No'}`, 'output');

    // Check AudioContext state
    if (synthRef.current && (synthRef.current as any).audioContext) {
      const ctx = (synthRef.current as any).audioContext;
      addLog(`AudioContext State: ${ctx.state}`, ctx.state === 'running' ? 'success' : 'warning');
      addLog(`AudioContext Sample Rate: ${ctx.sampleRate}Hz`, 'output');
    }

    // Web Audio API support
    const audioApiSupported = typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
    addLog(`Web Audio API: ${audioApiSupported ? 'Supported' : 'Not supported'}`, audioApiSupported ? 'success' : 'error');

    // Chrome AI status
    const hasLanguageModel = typeof (window as any).LanguageModel !== 'undefined' || typeof (window as any).ai?.languageModel !== 'undefined';
    addLog(`Chrome AI API: ${hasLanguageModel ? 'Available' : 'Not available'}`, hasLanguageModel ? 'success' : 'warning');

    if (hasLanguageModel) {
      if (aiStatus) {
        addLog(`Chrome AI Available: ${aiStatus.available ? 'Yes' : 'No'}`, aiStatus.available ? 'success' : 'warning');
        addLog(`Chrome AI Status: ${aiStatus.status}`, aiStatus.status === 'available' ? 'success' : 'warning');
        addLog(`Chrome AI Downloading: ${aiStatus.downloading ? 'Yes' : 'No'}`, 'output');
      } else {
        addLog(`Chrome AI Status: Checking...`, 'warning');
      }

      // Check current availability
      try {
        const languageModel = (window as any).LanguageModel || (window as any).ai?.languageModel;
        if (languageModel) {
          const availability = await languageModel.availability();
          addLog(`Current AI Availability: ${availability}`, availability === 'available' ? 'success' : 'warning');
        }
      } catch (err) {
        addLog(`AI Availability Check Error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
      }
    }

    // Geolocation support
    const geoSupported = 'geolocation' in navigator;
    addLog(`Geolocation API: ${geoSupported ? 'Supported' : 'Not supported'}`, geoSupported ? 'success' : 'error');

    // Check permissions
    if (navigator.permissions) {
      try {
        const geoPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        addLog(`Geolocation Permission: ${geoPermission.state}`, geoPermission.state === 'granted' ? 'success' : 'warning');
      } catch (err) {
        addLog(`Permission Check Error: ${err instanceof Error ? err.message : 'Unknown'}`, 'warning');
      }
    }

    addLog('=== End Debug Information ===', 'info');
  };

  const handleStart = async () => {
    addLog('Getting your location...', 'info');

    try {
      // Get user location
      const coords = await getUserLocation();
      addLog(`Location: ${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`, 'success');
      addLog('Fetching weather data...', 'info');

      // Fetch weather
      const weatherData = await fetchWeatherData(coords);
      addLog(`Weather: ${weatherData.temperature}°F, ${weatherData.conditions}`, 'success');
      addLog(`Wind: ${weatherData.windSpeed}mph, Humidity: ${weatherData.humidity}%`, 'output');
      addLog('Generating soundscape...', 'info');

      // Generate audio parameters with Chrome AI
      const audioParams = await generateAudioParameters(
        weatherData,
        undefined,
        (text, type) => {
          if (type) addLog(text, type);
          else addLog(text);
        }
      );

      addLog(
        `Created soundscape: ${audioParams.oscillators.length} oscillators, ${audioParams.filters.length} filters`,
        'success'
      );
      addLog('Starting audio playback...', 'info');

      // Start audio synthesis
      if (synthRef.current) {
        await synthRef.current.start(audioParams);
        setIsPlaying(true);
        addLog('Audio playing. Use "stop" command to end.', 'success');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      addLog(`Error: ${errorMsg}`, 'error');
    }
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.stop();
      setIsPlaying(false);
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
                <Terminal lines={terminalLines} isActive={true} onCommand={handleCommand} />
              </div>
              <div className={styles.visualizerPane}>
                <FrequencyVisualizer synthesizer={synthRef.current} />
              </div>
            </div>
          ) : (
            <div className={styles.splitContainer}>
              <div className={styles.terminalPane}>
                <Terminal lines={terminalLines} isActive={true} onCommand={handleCommand} />
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default App;
