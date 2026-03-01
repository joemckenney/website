import { keyframes, style } from "@vanilla-extract/css";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

export const container = style({
  position: "relative",
  width: "100%",
  height: "100vh",
  background: "#0a0a0f",
  overflow: "hidden",
  animation: `${fadeIn} 0.3s ease-in`,
});

export const canvas = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  cursor: "crosshair",
  touchAction: "none",
});

export const overlay = style({
  position: "absolute",
  top: 16,
  left: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  zIndex: 10,
  pointerEvents: "none",
});

export const startButton = style({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  padding: "16px 32px",
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  borderRadius: 4,
  color: "rgba(255, 255, 255, 0.8)",
  fontSize: 16,
  fontFamily: "inherit",
  cursor: "pointer",
  zIndex: 10,
  transition: "background 0.2s, border-color 0.2s",
  ":hover": {
    background: "rgba(255, 255, 255, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
});

export const statusText = style({
  color: "rgba(255, 255, 255, 0.4)",
  fontSize: 12,
  fontFamily: "monospace",
  pointerEvents: "auto",
});

export const moodBadge = style({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 3,
  fontSize: 11,
  fontFamily: "monospace",
  color: "rgba(255, 255, 255, 0.7)",
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
});
