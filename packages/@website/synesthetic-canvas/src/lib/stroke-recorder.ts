import type { Point, Stroke } from "../types";

export class StrokeRecorder {
  private currentStroke: Point[] = [];
  private strokes: Stroke[] = [];
  private strokeStartTime = 0;

  beginStroke(x: number, y: number, pressure: number): void {
    this.strokeStartTime = performance.now();
    this.currentStroke = [{ x, y, pressure, timestamp: this.strokeStartTime }];
  }

  addPoint(x: number, y: number, pressure: number): void {
    if (this.currentStroke.length === 0) return;
    this.currentStroke.push({
      x,
      y,
      pressure,
      timestamp: performance.now(),
    });
  }

  endStroke(): Stroke | null {
    if (this.currentStroke.length < 2) {
      this.currentStroke = [];
      return null;
    }

    const stroke: Stroke = {
      points: [...this.currentStroke],
      startTime: this.strokeStartTime,
      endTime: performance.now(),
    };

    this.strokes.push(stroke);
    this.currentStroke = [];
    return stroke;
  }

  getStrokes(): Stroke[] {
    return this.strokes;
  }

  getRecentStrokes(windowMs: number): Stroke[] {
    const cutoff = performance.now() - windowMs;
    return this.strokes.filter((s) => s.endTime >= cutoff);
  }

  getCurrentStroke(): Point[] {
    return this.currentStroke;
  }

  isDrawing(): boolean {
    return this.currentStroke.length > 0;
  }

  clear(): void {
    this.strokes = [];
    this.currentStroke = [];
  }
}
