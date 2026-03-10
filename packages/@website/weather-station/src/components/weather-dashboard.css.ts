import { style } from "@vanilla-extract/css";
import { vars } from "../styles/tokens.css";

export const dashboard = style({
  width: "100%",
  maxWidth: "900px",
  display: "flex",
  flexDirection: "column",
  border: `${vars.borderWidth.base} solid ${vars.color.border}`,
  backgroundColor: vars.color.white,
  fontFamily: vars.font.body,
});

export const stationHeader = style({
  padding: `${vars.spacing["4"]} ${vars.spacing["6"]}`,
  borderBottom: `${vars.borderWidth.thin} solid ${vars.color.border}`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: vars.spacing["2"],
});

export const stationName = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.lg,
  fontWeight: vars.fontWeight.bold,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: vars.color.text,
});

export const stationMeta = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
});

export const readingsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "0",
  borderBottom: `${vars.borderWidth.thin} solid ${vars.color.border}`,

  "@media": {
    "(max-width: 768px)": {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },
});

export const readingCell = style({
  padding: `${vars.spacing["4"]} ${vars.spacing["4"]}`,
  textAlign: "center",
  borderRight: `${vars.borderWidth.thin} solid ${vars.color.border}`,
  borderBottom: `${vars.borderWidth.thin} solid ${vars.color.border}`,

  selectors: {
    "&:nth-child(4n)": {
      borderRight: "none",
    },
  },

  "@media": {
    "(max-width: 768px)": {
      selectors: {
        "&:nth-child(4n)": {
          borderRight: `${vars.borderWidth.thin} solid ${vars.color.border}`,
        },
        "&:nth-child(2n)": {
          borderRight: "none",
        },
      },
    },
  },
});

export const readingValue = style({
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize["2xl"],
  fontWeight: vars.fontWeight.bold,
  color: vars.color.text,
  lineHeight: "1.1",

  "@media": {
    "(max-width: 768px)": {
      fontSize: vars.fontSize.xl,
    },
  },
});

export const readingUnit = style({
  fontSize: vars.fontSize.sm,
  fontWeight: vars.fontWeight.normal,
  color: vars.color.textMuted,
});

export const readingLabel = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginTop: vars.spacing["1"],
});

export const visualizerSection = style({
  height: "180px",
  borderBottom: `${vars.borderWidth.thin} solid ${vars.color.border}`,

  "@media": {
    "(max-width: 768px)": {
      height: "140px",
    },
  },
});

export const timelineSection = style({
  padding: `${vars.spacing["3"]} ${vars.spacing["6"]}`,
  display: "flex",
  alignItems: "center",
  gap: vars.spacing["3"],
  flexWrap: "wrap",
});

export const timelineControls = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing["2"],
  flexShrink: 0,
});

export const timelineButton = style({
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize.sm,
  padding: `${vars.spacing["1"]} ${vars.spacing["2"]}`,
  border: `${vars.borderWidth.thin} solid ${vars.color.border}`,
  backgroundColor: "transparent",
  color: vars.color.text,
  cursor: "pointer",
  lineHeight: "1",

  ":hover": {
    backgroundColor: vars.color.backgroundSubtle,
  },

  selectors: {
    "&[data-active='true']": {
      backgroundColor: vars.color.black,
      color: vars.color.white,
      borderColor: vars.color.black,
    },
  },
});

export const scrubber = style({
  flex: 1,
  height: "4px",
  appearance: "none",
  backgroundColor: vars.color.border,
  outline: "none",
  cursor: "pointer",
  minWidth: "100px",

  "::-webkit-slider-thumb": {
    appearance: "none",
    width: "12px",
    height: "12px",
    backgroundColor: vars.color.black,
    borderRadius: "50%",
    cursor: "pointer",
  },

  "::-moz-range-thumb": {
    width: "12px",
    height: "12px",
    backgroundColor: vars.color.black,
    borderRadius: "50%",
    cursor: "pointer",
    border: "none",
  },
});

export const timeLabel = style({
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  flexShrink: 0,
  minWidth: "32px",
  textAlign: "right",
});

export const statusBar = style({
  padding: `${vars.spacing["2"]} ${vars.spacing["6"]}`,
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  borderTop: `${vars.borderWidth.thin} solid ${vars.color.border}`,
  display: "flex",
  justifyContent: "space-between",
  gap: vars.spacing["4"],
});

export const connectionDot = style({
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  marginRight: vars.spacing["1"],
  verticalAlign: "middle",
});
