import { keyframes, style } from "@vanilla-extract/css";
import { gruvbox } from "../styles/terminal-tokens.css";
import { vars } from "../styles/tokens.css";

export const terminal = style({
  width: "100%",
  height: "100%",
  backgroundColor: gruvbox.bg0,
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize.sm,
  color: gruvbox.fg1,
  display: "flex",
  flexDirection: "column",

  "@media": {
    "(max-width: 768px)": {
      fontSize: vars.fontSize.xs,
    },
  },
});

export const body = style({
  padding: vars.spacing["4"],
  flex: 1,
  overflowY: "auto",
  lineHeight: "1.6",

  "@media": {
    "(max-width: 768px)": {
      padding: vars.spacing["3"],
    },
  },

  selectors: {
    "&::-webkit-scrollbar": {
      width: "8px",
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: gruvbox.bg0,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: gruvbox.bg3,
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: gruvbox.bg4,
    },
  },
});

export const line = style({
  marginBottom: vars.spacing["1"],
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  display: "flex",
  alignItems: "center",
});

export const prompt = style({
  color: gruvbox.green,
  fontWeight: "bold",
  marginRight: vars.spacing["2"],
});

const blink = keyframes({
  "0%, 49%": { opacity: 1 },
  "50%, 100%": { opacity: 0 },
});

export const inputWrapper = style({
  display: "flex",
  flex: 1,
  position: "relative",
});

export const input = style({
  backgroundColor: "transparent",
  border: "none",
  outline: "none",
  color: gruvbox.fg1,
  fontFamily: vars.font.mono,
  fontSize: "inherit",
  flex: 1,
  caretColor: "transparent", // Hide default caret

  ":disabled": {
    opacity: 0.5,
  },

  selectors: {
    "&::selection": {
      backgroundColor: gruvbox.bg3,
    },
  },
});

export const cursor = style({
  position: "absolute",
  top: "0",
  left: "0",
  width: "0.6em",
  height: "1.2em",
  backgroundColor: gruvbox.fg1,
  animation: `${blink} 1s step-end infinite`,
  pointerEvents: "none",
});

// Type-based styling
export const info = style({
  color: gruvbox.blue,
});

export const success = style({
  color: gruvbox.green,
});

export const warning = style({
  color: gruvbox.yellow,
});

export const error = style({
  color: gruvbox.red,
});

export const output = style({
  color: gruvbox.fg2,
});

export const promptText = style({
  color: gruvbox.fg1,
});

// Export individual type classes instead of function
// Use in component: styles[line.type || 'output']
