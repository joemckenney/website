import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const backLink = style({
  display: "inline-flex",
  alignItems: "baseline",
  gap: "0.35em",
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  textDecoration: "none",
  ":hover": {
    color: vars.color.textSecondary,
  },
});

export const icon = style({
  display: "inline-flex",
  flexShrink: 0,
  position: "relative",
  top: "1px",
});
