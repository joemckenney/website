import type { GestureFeatures, Point, Stroke } from "../types";

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function velocity(a: Point, b: Point): number {
  const dt = b.timestamp - a.timestamp;
  if (dt === 0) return 0;
  return distance(a, b) / dt;
}

function curvature(a: Point, b: Point, c: Point): number {
  // Approximate curvature via angle change between segments
  const dx1 = b.x - a.x;
  const dy1 = b.y - a.y;
  const dx2 = c.x - b.x;
  const dy2 = c.y - b.y;

  const angle1 = Math.atan2(dy1, dx1);
  const angle2 = Math.atan2(dy2, dx2);

  let diff = Math.abs(angle2 - angle1);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;

  const segLen = distance(a, b) + distance(b, c);
  return segLen > 0 ? diff / segLen : 0;
}

export function analyzeGestures(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
): GestureFeatures {
  if (strokes.length === 0) {
    return {
      strokeCount: 0,
      avgVelocity: 0,
      maxVelocity: 0,
      avgCurvature: 0,
      totalLength: 0,
      avgPressure: 0.5,
      density: 0,
      directionality: 0,
      canvasRegion: "center",
      timeDelta: 0,
    };
  }

  let totalVelocity = 0;
  let maxVelocity = 0;
  let velocityCount = 0;
  let totalCurvature = 0;
  let curvatureCount = 0;
  let totalLength = 0;
  let totalPressure = 0;
  let pressureCount = 0;
  let totalDx = 0;
  let totalDy = 0;
  let totalPoints = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (const stroke of strokes) {
    const { points } = stroke;

    for (let i = 1; i < points.length; i++) {
      const d = distance(points[i - 1], points[i]);
      totalLength += d;

      const v = velocity(points[i - 1], points[i]);
      totalVelocity += v;
      if (v > maxVelocity) maxVelocity = v;
      velocityCount++;

      totalDx += points[i].x - points[i - 1].x;
      totalDy += points[i].y - points[i - 1].y;
    }

    for (let i = 2; i < points.length; i++) {
      totalCurvature += curvature(points[i - 2], points[i - 1], points[i]);
      curvatureCount++;
    }

    for (const p of points) {
      totalPressure += p.pressure;
      pressureCount++;
      centroidX += p.x;
      centroidY += p.y;
      totalPoints++;
    }
  }

  const avgVelocity = velocityCount > 0 ? totalVelocity / velocityCount : 0;
  const avgCurvature =
    curvatureCount > 0 ? totalCurvature / curvatureCount : 0;
  const avgPressure = pressureCount > 0 ? totalPressure / pressureCount : 0.5;

  // Density: total stroke length relative to canvas area
  const canvasArea = canvasWidth * canvasHeight;
  const density = canvasArea > 0 ? totalLength / Math.sqrt(canvasArea) : 0;

  // Directionality: net displacement / total length (0 = random, 1 = straight line)
  const netDisplacement = Math.sqrt(totalDx ** 2 + totalDy ** 2);
  const directionality = totalLength > 0 ? netDisplacement / totalLength : 0;

  // Canvas region based on centroid
  centroidX = totalPoints > 0 ? centroidX / totalPoints : canvasWidth / 2;
  centroidY = totalPoints > 0 ? centroidY / totalPoints : canvasHeight / 2;
  const rx = centroidX / canvasWidth;
  const ry = centroidY / canvasHeight;
  let canvasRegion = "center";
  if (rx < 0.33) canvasRegion = ry < 0.33 ? "top-left" : ry > 0.66 ? "bottom-left" : "left";
  else if (rx > 0.66) canvasRegion = ry < 0.33 ? "top-right" : ry > 0.66 ? "bottom-right" : "right";
  else canvasRegion = ry < 0.33 ? "top" : ry > 0.66 ? "bottom" : "center";

  // Time delta: total time span of all strokes
  const earliest = Math.min(...strokes.map((s) => s.startTime));
  const latest = Math.max(...strokes.map((s) => s.endTime));
  const timeDelta = latest - earliest;

  return {
    strokeCount: strokes.length,
    avgVelocity: Math.round(avgVelocity * 1000) / 1000,
    maxVelocity: Math.round(maxVelocity * 1000) / 1000,
    avgCurvature: Math.round(avgCurvature * 10000) / 10000,
    totalLength: Math.round(totalLength),
    avgPressure: Math.round(avgPressure * 1000) / 1000,
    density: Math.round(density * 1000) / 1000,
    directionality: Math.round(directionality * 1000) / 1000,
    canvasRegion,
    timeDelta: Math.round(timeDelta),
  };
}
