import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSynesthesia } from "./lib/api-client";
import { AudioEngine } from "./lib/audio-engine";
import { analyzeGestures } from "./lib/gesture-analyzer";
import {
  mapAnalysisToAudio,
  mapGestureDirectToAudio,
} from "./lib/parameter-mapper";
import { StrokeRecorder } from "./lib/stroke-recorder";
import { VisualEngine } from "./lib/visual-engine";
import * as styles from "./synesthetic-canvas.css";
import type { GestureAnalysis, Mood } from "./types";

interface Props {
  apiUrl: string;
}

export function SynestheticCanvas({ apiUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const visualRef = useRef<VisualEngine | null>(null);
  const recorderRef = useRef(new StrokeRecorder());
  const animFrameRef = useRef<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [started, setStarted] = useState(false);
  const [mood, setMood] = useState<Mood | null>(null);
  const [status, setStatus] = useState("");

  const handleStart = useCallback(async () => {
    const audio = new AudioEngine();
    await audio.start();
    audioRef.current = audio;

    if (canvasRef.current) {
      const visual = new VisualEngine(canvasRef.current);
      visual.resize();
      visualRef.current = visual;
    }

    setStarted(true);
    setStatus("draw to begin");
  }, []);

  // Animation loop
  useEffect(() => {
    if (!started) return;

    const loop = () => {
      const audio = audioRef.current;
      const visual = visualRef.current;
      const recorder = recorderRef.current;

      if (audio && visual) {
        const feedback = audio.getVisualFeedback();
        visual.render(recorder.getCurrentStroke(), feedback);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [started]);

  // Resize handler
  useEffect(() => {
    if (!started) return;

    const handleResize = () => visualRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [started]);

  // Debounced AI request
  const requestAI = useCallback(
    (canvasWidth: number, canvasHeight: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        const recorder = recorderRef.current;
        const strokes = recorder.getRecentStrokes(10000);
        if (strokes.length === 0) return;

        const features = analyzeGestures(strokes, canvasWidth, canvasHeight);
        setStatus("analyzing...");

        const analysis: GestureAnalysis | null = await fetchSynesthesia(
          apiUrl,
          features,
        );

        if (analysis) {
          setMood(analysis.mood);
          setStatus(`mood: ${analysis.mood}`);
          visualRef.current?.setMood(analysis.mood);
          const params = mapAnalysisToAudio(analysis);
          audioRef.current?.applyParameters(params);
        } else {
          // Fallback: direct mapping
          setStatus("fallback mode");
          const params = mapGestureDirectToAudio(features);
          audioRef.current?.applyParameters(params);
        }
      }, 1500);
    },
    [apiUrl],
  );

  // Pointer events
  const getCoords = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 0.5,
      };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!started) return;
      const { x, y, pressure } = getCoords(e);
      recorderRef.current.beginStroke(x, y, pressure);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [started, getCoords],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!started || !recorderRef.current.isDrawing()) return;
      const { x, y, pressure } = getCoords(e);
      recorderRef.current.addPoint(x, y, pressure);

      // Immediate audio nudge
      const recorder = recorderRef.current;
      const current = recorder.getCurrentStroke();
      if (current.length >= 2) {
        const prev = current[current.length - 2];
        const cur = current[current.length - 1];
        const dt = cur.timestamp - prev.timestamp;
        const dist = Math.sqrt(
          (cur.x - prev.x) ** 2 + (cur.y - prev.y) ** 2,
        );
        const velocity = dt > 0 ? dist / dt : 0;
        audioRef.current?.nudge(velocity, pressure, true);
      }
    },
    [started, getCoords],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!started) return;
      const stroke = recorderRef.current.endStroke();
      if (stroke) {
        visualRef.current?.addStroke(stroke);
      }
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      // Trigger debounced AI request
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        requestAI(rect.width, rect.height);
      }
    },
    [started, requestAI],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      audioRef.current?.stop();
      cancelAnimationFrame(animFrameRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {!started && (
        <button type="button" className={styles.startButton} onClick={handleStart}>
          Start
        </button>
      )}

      {started && (
        <div className={styles.overlay}>
          {status && <span className={styles.statusText}>{status}</span>}
          {mood && <span className={styles.moodBadge}>{mood}</span>}
        </div>
      )}
    </div>
  );
}
