import { style } from "@vanilla-extract/css";

// Retro newspaper aesthetic
const colors = {
  black: "#000000",
  white: "#ffffff",
  gray100: "#e6e6e6",
  gray300: "#b3b3b3",
  gray700: "#4d4d4d",
  gray800: "#333333",
};

const font = {
  mono: '"Courier New", Courier, monospace',
  sans: '-apple-system, system-ui, sans-serif',
};

export const page = style({
  minHeight: "100vh",
  backgroundColor: colors.white,
  color: colors.black,
  fontFamily: font.mono,
  padding: "2rem",
  display: "flex",
  flexDirection: "column",
  gap: "2rem",
});

export const header = style({
  borderBottom: `3px solid ${colors.black}`,
  paddingBottom: "1rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
});

export const title = style({
  fontFamily: font.mono,
  fontSize: "2rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "-0.02em",
  margin: 0,
});

export const subtitle = style({
  fontFamily: font.mono,
  fontSize: "0.875rem",
  color: colors.gray700,
  margin: "0.25rem 0 0 0",
});

export const button = style({
  fontFamily: font.mono,
  fontSize: "0.875rem",
  padding: "0.5rem 1rem",
  border: `2px solid ${colors.black}`,
  backgroundColor: colors.white,
  color: colors.black,
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  transition: "all 0.1s",

  ":hover": {
    backgroundColor: colors.black,
    color: colors.white,
  },

  ":disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
});

export const primaryButton = style([
  button,
  {
    backgroundColor: colors.black,
    color: colors.white,

    ":hover": {
      backgroundColor: colors.gray800,
    },
  },
]);

export const section = style({
  border: `2px solid ${colors.black}`,
  padding: "1.5rem",
  backgroundColor: colors.white,
});

export const sectionTitle = style({
  fontFamily: font.mono,
  fontSize: "1rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginTop: 0,
  marginBottom: "1rem",
  borderBottom: `1px solid ${colors.gray300}`,
  paddingBottom: "0.5rem",
});

export const subsectionTitle = style({
  fontFamily: font.mono,
  fontSize: "0.875rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginTop: 0,
  marginBottom: "0.75rem",
  color: colors.gray700,
});

export const debugGrid = style({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: "0.5rem 1rem",
  fontSize: "0.875rem",
  fontFamily: font.mono,
});

export const debugLabel = style({
  color: colors.gray700,
  fontWeight: "bold",
});

export const debugValue = style({
  fontFamily: font.mono,
  wordBreak: "break-all",
});

export const input = style({
  fontFamily: font.mono,
  fontSize: "1rem",
  padding: "0.5rem",
  border: `2px solid ${colors.black}`,
  backgroundColor: colors.white,
  width: "200px",

  ":focus": {
    outline: "none",
    backgroundColor: colors.gray100,
  },
});

export const form = style({
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
  flexWrap: "wrap",
});

export const result = style({
  fontFamily: font.mono,
  fontSize: "1.25rem",
  fontWeight: "bold",
  marginTop: "1rem",
  padding: "1rem",
  border: `2px solid ${colors.black}`,
  backgroundColor: colors.gray100,
});

export const endpointsGrid = style({
  display: "flex",
  gap: "1.5rem",

  "@media": {
    "(max-width: 900px)": {
      flexDirection: "column",
    },
  },
});

export const endpointBox = style({
  flex: 1,
  minWidth: 0, // Allow flex items to shrink below content size
});

export const unauthPage = style({
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.white,
  fontFamily: font.mono,
});

export const unauthBox = style({
  border: `3px solid ${colors.black}`,
  padding: "3rem",
  textAlign: "center",
  maxWidth: "400px",
});

export const unauthTitle = style({
  fontFamily: font.mono,
  fontSize: "1.5rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  marginBottom: "1rem",
});

export const unauthText = style({
  fontFamily: font.mono,
  fontSize: "0.875rem",
  color: colors.gray700,
  marginBottom: "1.5rem",
});

export const requestResponse = style({
  marginTop: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});

export const requestBox = style({
  border: `1px solid ${colors.gray300}`,
  padding: "1rem",
  backgroundColor: colors.gray100,
});

export const responseBox = style({
  border: `1px solid ${colors.gray300}`,
  padding: "1rem",
  backgroundColor: colors.gray100,
});

export const boxTitle = style({
  fontFamily: font.mono,
  fontSize: "0.75rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "0.5rem",
  color: colors.gray700,
});

export const codeBlock = style({
  fontFamily: font.mono,
  fontSize: "0.75rem",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  lineHeight: "1.5",
});

export const timing = style({
  fontFamily: font.mono,
  fontSize: "0.75rem",
  color: colors.gray700,
  marginTop: "0.5rem",
  fontWeight: "bold",
});
