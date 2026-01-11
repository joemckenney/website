import { vars } from "@crow/theme";
import { keyframes, style } from "@vanilla-extract/css";

export const debugToggle = style({
  position: "fixed",
  bottom: vars.space[4],
  right: vars.space[4],
  width: "36px",
  height: "36px",
  background: vars.colors.stone800,
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.colors.stone400,
  zIndex: 1000,
  transition: "all 0.15s ease",
  ":hover": {
    background: vars.colors.stone700,
    color: vars.colors.stone200,
  },
});

export const debugToggleActive = style({
  background: vars.colors.sage600,
  color: vars.colors.stone50,
  ":hover": {
    background: vars.colors.sage500,
    color: vars.colors.stone50,
  },
});

const slideIn = keyframes({
  from: {
    transform: "translateX(100%)",
    opacity: 0,
  },
  to: {
    transform: "translateX(0)",
    opacity: 1,
  },
});

export const debugPanel = style({
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  width: "400px",
  maxWidth: "100vw",
  background: vars.colors.stone900,
  color: vars.colors.stone200,
  borderLeft: `1px solid ${vars.colors.stone700}`,
  display: "flex",
  flexDirection: "column",
  zIndex: 999,
  animation: `${slideIn} 0.2s ease`,
  fontFamily: vars.fonts.mono,
  fontSize: vars.fontSizes.xs.fontSize,
});

export const debugHeader = style({
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderBottom: `1px solid ${vars.colors.stone700}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const debugTitle = style({
  fontSize: vars.fontSizes.xs.fontSize,
  letterSpacing: vars.letterSpacing.wider,
  textTransform: "uppercase",
  color: vars.colors.stone400,
});

export const closeButton = style({
  background: "transparent",
  border: "none",
  color: vars.colors.stone400,
  cursor: "pointer",
  padding: vars.space[1],
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  ":hover": {
    color: vars.colors.stone200,
  },
});

export const debugContent = style({
  flex: 1,
  overflowY: "auto",
  padding: vars.space[4],
  "::-webkit-scrollbar": {
    width: "4px",
  },
  "::-webkit-scrollbar-track": {
    background: "transparent",
  },
  "::-webkit-scrollbar-thumb": {
    background: vars.colors.stone700,
  },
});

export const section = style({
  marginBottom: vars.space[5],
});

export const sectionTitle = style({
  fontSize: "9px",
  letterSpacing: vars.letterSpacing.widest,
  textTransform: "uppercase",
  color: vars.colors.stone500,
  marginBottom: vars.space[2],
});

export const statusGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: vars.space[2],
});

export const statusItem = style({
  background: vars.colors.stone800,
  padding: vars.space[2],
  borderRadius: "2px",
});

export const statusLabel = style({
  fontSize: "9px",
  color: vars.colors.stone500,
  textTransform: "uppercase",
  letterSpacing: vars.letterSpacing.wider,
  marginBottom: vars.space[1],
});

export const statusValue = style({
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone200,
  wordBreak: "break-all",
});

export const statusValueActive = style({
  color: vars.colors.sage400,
});

export const statusValueError = style({
  color: "#f87171",
});

export const toolCallList = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space[2],
});

export const toolCallItem = style({
  background: vars.colors.stone800,
  borderRadius: "2px",
  overflow: "hidden",
});

export const toolCallHeader = style({
  padding: vars.space[2],
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  ":hover": {
    background: vars.colors.stone700,
  },
});

export const toolCallName = style({
  fontWeight: "500",
  color: vars.colors.stone200,
});

export const toolCallStatus = style({
  fontSize: "9px",
  padding: `${vars.space[1]} ${vars.space[2]}`,
  borderRadius: "2px",
  textTransform: "uppercase",
  letterSpacing: vars.letterSpacing.wider,
});

export const toolCallStatusPending = style({
  background: vars.colors.stone700,
  color: vars.colors.stone400,
});

export const toolCallStatusComplete = style({
  background: "rgba(34, 197, 94, 0.15)",
  color: "#4ade80",
});

export const toolCallDetails = style({
  padding: vars.space[2],
  borderTop: `1px solid ${vars.colors.stone700}`,
});

export const codeBlock = style({
  background: vars.colors.black,
  padding: vars.space[2],
  borderRadius: "2px",
  overflow: "auto",
  maxHeight: "200px",
  "::-webkit-scrollbar": {
    height: "4px",
    width: "4px",
  },
  "::-webkit-scrollbar-track": {
    background: "transparent",
  },
  "::-webkit-scrollbar-thumb": {
    background: vars.colors.stone700,
  },
});

export const codeLabel = style({
  fontSize: "9px",
  color: vars.colors.stone500,
  textTransform: "uppercase",
  letterSpacing: vars.letterSpacing.wider,
  marginBottom: vars.space[1],
  marginTop: vars.space[2],
  selectors: {
    "&:first-child": {
      marginTop: 0,
    },
  },
});

export const code = style({
  fontSize: "10px",
  lineHeight: "1.5",
  color: vars.colors.stone300,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

export const emptyState = style({
  color: vars.colors.stone600,
  fontStyle: "italic",
  padding: vars.space[2],
});

export const badge = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space[1],
  fontSize: "9px",
  padding: `${vars.space[1]} ${vars.space[2]}`,
  borderRadius: "2px",
  textTransform: "uppercase",
  letterSpacing: vars.letterSpacing.wider,
});

export const badgeStreaming = style({
  background: "rgba(59, 130, 246, 0.15)",
  color: "#60a5fa",
});

export const badgeIdle = style({
  background: vars.colors.stone800,
  color: vars.colors.stone500,
});
