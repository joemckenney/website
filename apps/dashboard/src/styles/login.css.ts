import { vars } from "@crow/theme";
import { style } from "@vanilla-extract/css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: vars.colors.stone50,
  fontFamily: vars.fonts.mono,
  padding: vars.space[6],
});

export const card = style({
  width: "100%",
  maxWidth: "400px",
  background: vars.colors.stone100,
  border: `1px solid ${vars.colors.stone300}`,
  padding: vars.space[8],
});

export const header = style({
  marginBottom: vars.space[8],
  textAlign: "center",
});

export const title = style({
  fontFamily: vars.fonts.display,
  fontSize: "32px",
  fontWeight: "400",
  letterSpacing: vars.letterSpacing.widest,
  textTransform: "uppercase",
  marginBottom: vars.space[2],
  color: vars.colors.stone900,
});

export const subtitle = style({
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone600,
  letterSpacing: vars.letterSpacing.wide,
});

export const divider = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[4],
  marginBottom: vars.space[6],
});

export const dividerLine = style({
  flex: 1,
  height: "1px",
  background: vars.colors.stone300,
});

export const dividerText = style({
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone600,
  letterSpacing: vars.letterSpacing.wider,
  textTransform: "uppercase",
});

export const googleButton = style({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space[3],
  padding: `${vars.space[4]} ${vars.space[6]}`,
  background: vars.colors.stone900,
  color: vars.colors.stone50,
  border: "none",
  cursor: "pointer",
  fontFamily: vars.fonts.mono,
  fontSize: vars.fontSizes.sm.fontSize,
  letterSpacing: vars.letterSpacing.wide,
  transition: "opacity 0.15s ease",
  textDecoration: "none",
  ":hover": {
    opacity: 0.85,
  },
});

export const googleIcon = style({
  width: "18px",
  height: "18px",
});

export const errorMessage = style({
  marginBottom: vars.space[6],
  padding: vars.space[4],
  background: vars.colors.stone200,
  border: `1px solid ${vars.colors.stone400}`,
  color: vars.colors.stone900,
  fontSize: vars.fontSizes.sm.fontSize,
  textAlign: "center",
});

export const footer = style({
  marginTop: vars.space[8],
  textAlign: "center",
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone600,
  letterSpacing: vars.letterSpacing.wide,
});
