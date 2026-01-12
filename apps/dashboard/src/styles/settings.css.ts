import { vars } from "@crow/theme";
import { style } from "@vanilla-extract/css";

export const header = style({
  padding: `${vars.space[4]} ${vars.space[6]}`,
  borderBottom: `1px solid ${vars.colors.stone300}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const title = style({
  fontFamily: vars.fonts.display,
  fontSize: vars.fontSizes.base.fontSize,
  fontWeight: "400",
  letterSpacing: vars.letterSpacing.wider,
  textTransform: "uppercase",
});

export const container = style({
  flex: 1,
  overflowY: "auto",
  padding: vars.space[6],
  maxWidth: "680px",
  marginLeft: "auto",
  marginRight: "auto",
});

export const section = style({
  marginBottom: vars.space[8],
});

export const sectionTitle = style({
  fontFamily: vars.fonts.display,
  fontSize: vars.fontSizes.sm.fontSize,
  fontWeight: "500",
  letterSpacing: vars.letterSpacing.wide,
  textTransform: "uppercase",
  color: vars.colors.stone600,
  marginBottom: vars.space[4],
});

export const card = style({
  padding: vars.space[5],
  border: `1px solid ${vars.colors.stone300}`,
  background: vars.colors.stone50,
});

export const connectionRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space[4],
});

export const connectionInfo = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[3],
});

export const connectionIcon = style({
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#FC4C02", // Strava orange
  borderRadius: "4px",
  color: "white",
  flexShrink: 0,
});

export const connectionDetails = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space[1],
});

export const connectionName = style({
  fontSize: vars.fontSizes.base.fontSize,
  fontWeight: "500",
  color: vars.colors.stone900,
});

export const connectionStatus = style({
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone600,
});

export const statusConnected = style({
  color: "#16a34a", // green
});

export const statusDisconnected = style({
  color: vars.colors.stone600,
});

export const connectButton = style({
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone50,
  background: "#FC4C02", // Strava orange
  padding: `${vars.space[2]} ${vars.space[4]}`,
  border: "none",
  cursor: "pointer",
  letterSpacing: vars.letterSpacing.wide,
  transition: "opacity 0.15s ease",
  ":hover": {
    opacity: 0.85,
  },
});

export const disconnectButton = style({
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone900,
  background: "transparent",
  padding: `${vars.space[2]} ${vars.space[4]}`,
  border: `1px solid ${vars.colors.stone400}`,
  cursor: "pointer",
  letterSpacing: vars.letterSpacing.wide,
  transition: "all 0.15s ease",
  ":hover": {
    background: vars.colors.stone200,
  },
});

export const loading = style({
  textAlign: "center",
  color: vars.colors.stone600,
  fontSize: vars.fontSizes.sm.fontSize,
  padding: vars.space[4],
});
