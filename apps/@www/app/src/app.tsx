import { useState, useEffect, useRef, useCallback } from 'react';
import './styles/global.css';
import * as styles from './app.css';
import { LoginButton } from './components/login-button';
import { Terminal, type TerminalLine } from './components/terminal';
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

  useEffect(() => {
    addLog('weather-sonification v1.0.0', 'info');
    addLog('Initializing audio synthesizer...', 'info');

    // Initialize synthesizer
    const synth = new AudioSynthesizer();
    synth
      .initialize()
      .then(() => {
        addLog('Audio synthesizer ready', 'success');
      })
      .catch((err) => {
        addLog(`Failed to initialize audio: ${err.message}`, 'error');
      });
    synthRef.current = synth;

    // Check if Chrome AI is available
    addLog('Checking Chrome AI availability...', 'info');
    checkGeminiAvailability((text, type) => {
      if (type) addLog(text, type);
      else addLog(text);
    }).then((status) => {
      setAiStatus(status);
    });

    addLog('Ready. Type "start" to begin.', 'prompt');

    return () => {
      synth.destroy();
    };
  }, [addLog]);

  const handleStart = async () => {
    addLog('start', 'prompt');
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
        addLog('Audio playing. Type "stop" to end.', 'success');
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
          <Terminal lines={terminalLines} isActive={!isPlaying} />

          <div className={styles.controls}>
            <button className={styles.primaryButton} onClick={handleStart}>
              Start
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

export default App;
