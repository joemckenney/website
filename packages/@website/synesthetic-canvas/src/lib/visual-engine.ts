import type {
  Branch,
  LivePoint,
  LiveStroke,
  Mood,
  Particle,
  Point,
  Stroke,
  VisualFeedback,
} from "../types";
import { MOOD_PALETTES } from "../types";

const MAX_BRANCH_DEPTH = 3;
const MAX_BRANCHES_PER_STROKE = 12;
const MAX_LIVE_STROKES = 80;

export class VisualEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private liveStrokes: LiveStroke[] = [];
  private backgroundHue = 240;
  private currentMood: Mood = "calm";
  private peakFlash = 0;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  setMood(mood: Mood): void {
    this.currentMood = mood;
  }

  /** Internalize a completed stroke as a LiveStroke that decays and grows. */
  addStroke(stroke: Stroke): void {
    const palette = MOOD_PALETTES[this.currentMood];
    const color = palette[1 + Math.floor(Math.random() * 3)];

    const livePoints: LivePoint[] = stroke.points.map((p) => ({
      x: p.x,
      y: p.y,
      ox: p.x,
      oy: p.y,
      opacity: 1,
    }));

    this.liveStrokes.push({
      points: livePoints,
      life: 1,
      color,
      lineWidth: 2,
      branches: [],
    });

    // Cap total live strokes
    if (this.liveStrokes.length > MAX_LIVE_STROKES) {
      this.liveStrokes.splice(0, this.liveStrokes.length - MAX_LIVE_STROKES);
    }
  }

  render(currentStroke: Point[], feedback: VisualFeedback): void {
    const { ctx } = this;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const palette = MOOD_PALETTES[this.currentMood];

    // Background
    this.backgroundHue += (feedback.bassEnergy - 0.3) * 2;
    if (this.backgroundHue > 360) this.backgroundHue -= 360;
    if (this.backgroundHue < 0) this.backgroundHue += 360;

    ctx.fillStyle = `hsl(${this.backgroundHue}, 15%, ${4 + feedback.amplitude * 6}%)`;
    ctx.fillRect(0, 0, w, h);

    // Peak flash
    if (feedback.isPeak) this.peakFlash = 0.4;
    if (this.peakFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.peakFlash})`;
      ctx.fillRect(0, 0, w, h);
      this.peakFlash *= 0.85;
      if (this.peakFlash < 0.01) this.peakFlash = 0;
    }

    // Update and draw live strokes (decay + grow)
    this.updateLiveStrokes(feedback, w, h, palette);
    this.drawLiveStrokes(feedback);

    // Draw current in-progress stroke
    if (currentStroke.length > 1) {
      const glowRadius = 4 + feedback.midEnergy * 20;
      ctx.shadowColor = palette[0];
      ctx.shadowBlur = glowRadius;
      ctx.beginPath();
      ctx.strokeStyle = palette[0];
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Particles (spawn from dissolving strokes + ambient)
    const spawnRate = Math.floor(feedback.amplitude * 4);
    for (let i = 0; i < spawnRate; i++) {
      this.spawnParticle(w, h, palette, feedback);
    }
    this.updateParticles(feedback);
    this.drawParticles();
  }

  private updateLiveStrokes(
    feedback: VisualFeedback,
    w: number,
    h: number,
    palette: [string, string, string, string],
  ): void {
    // Decay rate: higher intensity = faster decay
    const decayRate = 0.002 + feedback.amplitude * 0.008;

    for (let si = this.liveStrokes.length - 1; si >= 0; si--) {
      const ls = this.liveStrokes[si];
      ls.life -= decayRate;

      // --- Stroke Decay ---
      if (ls.life < 0.7) {
        // Points drift away from their original position
        const drift = (0.7 - ls.life) * 3;
        for (const p of ls.points) {
          // Each point drifts in a consistent random-ish direction seeded by position
          const angle =
            Math.sin(p.ox * 13.7 + p.oy * 7.3) * Math.PI * 2;
          p.x = p.ox + Math.cos(angle) * drift * (1 + feedback.highEnergy * 2);
          p.y = p.oy + Math.sin(angle) * drift * (1 + feedback.highEnergy * 2);
          p.opacity = Math.max(0, ls.life / 0.7);
        }
      }

      // Shed particles as strokes dissolve
      if (ls.life < 0.4 && ls.life > 0.05 && Math.random() < 0.3) {
        const rp = ls.points[Math.floor(Math.random() * ls.points.length)];
        this.particles.push({
          x: rp.x,
          y: rp.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          maxLife: 40 + Math.random() * 40,
          size: 1.5 + Math.random() * 2,
          color: ls.color,
        });
      }

      // --- Generative Growth ---
      if (
        ls.life > 0.3 &&
        ls.points.length >= 2 &&
        ls.branches.length < MAX_BRANCHES_PER_STROKE
      ) {
        // Probability of branching scales with mid energy
        const branchChance = feedback.midEnergy * 0.08;
        if (Math.random() < branchChance) {
          this.spawnBranch(ls, palette, 0);
        }
      }

      // Update existing branches
      this.updateBranches(ls.branches, feedback, palette, w, h);

      // Remove dead strokes
      if (ls.life <= 0 && ls.branches.every((b) => b.life <= 0)) {
        this.liveStrokes.splice(si, 1);
      }
    }
  }

  private spawnBranch(
    ls: LiveStroke,
    palette: [string, string, string, string],
    depth: number,
  ): void {
    if (depth >= MAX_BRANCH_DEPTH) return;

    // Pick a random point on the stroke
    const idx = Math.floor(Math.random() * ls.points.length);
    const p = ls.points[idx];

    // Compute tangent at this point
    let tangent = 0;
    if (idx > 0 && idx < ls.points.length - 1) {
      const prev = ls.points[idx - 1];
      const next = ls.points[idx + 1];
      tangent = Math.atan2(next.y - prev.y, next.x - prev.x);
    } else if (idx > 0) {
      const prev = ls.points[idx - 1];
      tangent = Math.atan2(p.y - prev.y, p.x - prev.x);
    }

    // Branch perpendicular with noise
    const perpendicular =
      tangent + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const angle = perpendicular + (Math.random() - 0.5) * 0.8;

    const color = palette[Math.floor(Math.random() * palette.length)];
    const startPoint: LivePoint = {
      x: p.x,
      y: p.y,
      ox: p.x,
      oy: p.y,
      opacity: 0.7,
    };

    ls.branches.push({
      points: [startPoint],
      life: 1,
      growing: true,
      growAngle: angle,
      color,
      depth,
      maxLength: 15 + Math.random() * 40,
    });
  }

  private updateBranches(
    branches: Branch[],
    feedback: VisualFeedback,
    palette: [string, string, string, string],
    _w: number,
    _h: number,
  ): void {
    for (let bi = branches.length - 1; bi >= 0; bi--) {
      const branch = branches[bi];

      // Grow: extend branch tip
      if (branch.growing && branch.points.length > 0) {
        const tip = branch.points[branch.points.length - 1];
        const growSpeed = 1 + feedback.midEnergy * 3;

        // Angle wanders slightly each frame
        branch.growAngle += (Math.random() - 0.5) * 0.3;

        const nx = tip.x + Math.cos(branch.growAngle) * growSpeed;
        const ny = tip.y + Math.sin(branch.growAngle) * growSpeed;

        branch.points.push({
          x: nx,
          y: ny,
          ox: nx,
          oy: ny,
          opacity: 0.6 * branch.life,
        });

        // Stop growing when max length reached
        if (branch.points.length >= branch.maxLength) {
          branch.growing = false;
        }
      }

      // Decay
      if (!branch.growing) {
        branch.life -= 0.008 + feedback.amplitude * 0.012;
      } else {
        // Slow decay even while growing
        branch.life -= 0.002;
      }

      // Update point opacity
      for (const p of branch.points) {
        p.opacity = Math.max(0, 0.6 * branch.life);
      }

      // Sub-branching: growing branches can spawn children
      if (
        branch.growing &&
        branch.depth < MAX_BRANCH_DEPTH - 1 &&
        branch.points.length > 5 &&
        Math.random() < feedback.midEnergy * 0.03
      ) {
        // Create a sub-branch from this branch's points
        const subIdx = Math.floor(Math.random() * branch.points.length);
        const sp = branch.points[subIdx];
        const subAngle =
          branch.growAngle +
          (Math.random() > 0.5 ? Math.PI / 3 : -Math.PI / 3) +
          (Math.random() - 0.5) * 0.5;

        const color = palette[Math.floor(Math.random() * palette.length)];
        branches.push({
          points: [
            { x: sp.x, y: sp.y, ox: sp.x, oy: sp.y, opacity: 0.5 },
          ],
          life: 0.8,
          growing: true,
          growAngle: subAngle,
          color,
          depth: branch.depth + 1,
          maxLength: 8 + Math.random() * 20,
        });
      }

      // Remove dead branches
      if (branch.life <= 0) {
        branches.splice(bi, 1);
      }
    }
  }

  private drawLiveStrokes(feedback: VisualFeedback): void {
    const { ctx } = this;
    const glowRadius = 2 + feedback.midEnergy * 15;

    for (const ls of this.liveStrokes) {
      // Draw main stroke
      if (ls.points.length >= 2) {
        ctx.shadowColor = ls.color;
        ctx.shadowBlur = glowRadius * ls.life;
        ctx.lineWidth = ls.lineWidth * (0.5 + ls.life * 0.5);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(ls.points[0].x, ls.points[0].y);
        for (let i = 1; i < ls.points.length; i++) {
          ctx.lineTo(ls.points[i].x, ls.points[i].y);
        }
        ctx.globalAlpha = ls.points[0].opacity;
        ctx.strokeStyle = ls.color;
        ctx.stroke();
      }

      // Draw branches
      for (const branch of ls.branches) {
        if (branch.points.length < 2) continue;

        ctx.shadowColor = branch.color;
        ctx.shadowBlur = glowRadius * branch.life * 0.5;
        ctx.lineWidth = Math.max(0.5, 1.5 - branch.depth * 0.3);
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(branch.points[0].x, branch.points[0].y);
        for (let i = 1; i < branch.points.length; i++) {
          ctx.lineTo(branch.points[i].x, branch.points[i].y);
        }
        ctx.globalAlpha = branch.points[0].opacity;
        ctx.strokeStyle = branch.color;
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private spawnParticle(
    w: number,
    h: number,
    palette: [string, string, string, string],
    feedback: VisualFeedback,
  ): void {
    const color = palette[Math.floor(Math.random() * palette.length)];
    const speed = 0.5 + feedback.highEnergy * 3;
    const angle = Math.random() * Math.PI * 2;

    this.particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 60 + Math.random() * 60,
      size: 1 + Math.random() * 3,
      color,
    });

    if (this.particles.length > 400) {
      this.particles.splice(0, this.particles.length - 400);
    }
  }

  private updateParticles(feedback: VisualFeedback): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1 / p.maxLife;
      p.vx *= 1 + feedback.highEnergy * 0.02;
      p.vy *= 1 + feedback.highEnergy * 0.02;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private drawParticles(): void {
    const { ctx } = this;
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
