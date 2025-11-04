import { useEffect, useRef } from "react";
import * as styles from "./frequency-visualizer.css";
import type { AudioSynthesizer } from "../lib/audio-synthesizer";

interface FrequencyVisualizerProps {
  synthesizer: AudioSynthesizer | null;
}

export function FrequencyVisualizer({ synthesizer }: FrequencyVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !synthesizer) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    const draw = () => {
      const frequencyData = synthesizer.getFrequencyData();
      if (!frequencyData) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Clear canvas
      ctx.fillStyle = "#1d2021"; // Gruvbox dark background
      ctx.fillRect(0, 0, width, height);

      // Draw all frequency bins with emphasis on active ones
      const numBars = frequencyData.length;
      const barWidth = width / numBars;
      const barSpacing = Math.max(0.5, barWidth * 0.1);
      const minBarHeight = 2; // Minimum visible height for any activity

      for (let i = 0; i < numBars; i++) {
        const value = frequencyData[i];

        // Skip completely silent bins
        if (value === 0) continue;

        // Normalize to 0-1 range with boosted sensitivity for low values
        const normalized = value / 255;
        const boosted = Math.pow(normalized, 0.7); // Power curve for better visibility

        // Calculate bar height with minimum threshold
        const barHeight = Math.max(minBarHeight, boosted * height * 0.95);

        // Color gradient based on frequency position (low=green, mid=yellow, high=red)
        let color: string;
        const position = i / numBars;
        if (position < 0.33) {
          color = "#b8bb26"; // Gruvbox green
        } else if (position < 0.66) {
          color = "#fabd2f"; // Gruvbox yellow
        } else {
          color = "#fb4934"; // Gruvbox red
        }

        // Add brightness based on amplitude
        const alpha = 0.3 + normalized * 0.7; // Vary opacity with amplitude

        // Draw bar from bottom
        const x = i * barWidth + barSpacing / 2;
        const y = height - barHeight;
        const actualWidth = Math.max(1, barWidth - barSpacing);

        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, y, actualWidth, barHeight);
        ctx.globalAlpha = 1.0;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [synthesizer]);

  return (
    <div className={styles.visualizer}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
