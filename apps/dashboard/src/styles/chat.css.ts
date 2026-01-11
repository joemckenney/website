import { vars } from "@crow/theme";
import { keyframes, style } from "@vanilla-extract/css";

export const chatHeader = style({
  padding: `${vars.space[4]} ${vars.space[6]}`,
  borderBottom: `1px solid ${vars.colors.stone300}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const chatTitle = style({
  fontFamily: vars.fonts.display,
  fontSize: vars.fontSizes.base.fontSize,
  fontWeight: "400",
  letterSpacing: vars.letterSpacing.wider,
  textTransform: "uppercase",
});

export const chatStatus = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[1],
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone600,
  letterSpacing: vars.letterSpacing.wider,
  textTransform: "uppercase",
});

export const statusDot = style({
  width: "6px",
  height: "6px",
  background: vars.colors.sage500,
  borderRadius: "50%",
});

export const errorBanner = style({
  padding: `${vars.space[3]} ${vars.space[6]}`,
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: vars.fontSizes.sm.fontSize,
  borderBottom: "1px solid #fecaca",
});

export const messagesContainer = style({
  flex: 1,
  overflowY: "auto",
  padding: `${vars.space[8]} ${vars.space[6]}`,
  "::-webkit-scrollbar": {
    width: "4px",
  },
  "::-webkit-scrollbar-track": {
    background: "transparent",
  },
  "::-webkit-scrollbar-thumb": {
    background: vars.colors.stone300,
  },
});

const fadeIn = keyframes({
  from: {
    opacity: 0,
    transform: "translateY(8px)",
  },
  to: {
    opacity: 1,
    transform: "translateY(0)",
  },
});

export const message = style({
  maxWidth: "680px",
  margin: `0 auto ${vars.space[6]}`,
  animation: `${fadeIn} 0.3s ease`,
});

export const messageHeader = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[2],
  marginBottom: vars.space[2],
});

export const messageRole = style({
  fontSize: "9px",
  letterSpacing: vars.letterSpacing.widest,
  textTransform: "uppercase",
  color: vars.colors.stone600,
});

export const messageTime = style({
  fontSize: "9px",
  color: vars.colors.stone600,
  opacity: 0.6,
});

export const messageContent = style({
  fontSize: vars.fontSizes.base.fontSize,
  lineHeight: "1.7",
  letterSpacing: "0.01em",
});

export const messageContentUser = style({
  background: vars.colors.stone900,
  color: vars.colors.stone50,
  padding: `${vars.space[4]} ${vars.space[5]}`,
});

export const messageContentAssistant = style({
  padding: `${vars.space[4]} 0`,
  borderBottom: `1px solid ${vars.colors.stone300}`,
});

const pulse = keyframes({
  "0%, 100%": {
    opacity: 0.3,
    transform: "scale(1)",
  },
  "50%": {
    opacity: 1,
    transform: "scale(1.2)",
  },
});

export const thinking = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: `${vars.space[4]} 0`,
  maxWidth: "680px",
  margin: "0 auto",
});

export const thinkingDot = style({
  width: "4px",
  height: "4px",
  background: vars.colors.stone600,
  borderRadius: "50%",
  animation: `${pulse} 1.2s ease-in-out infinite`,
  selectors: {
    "&:nth-child(2)": {
      animationDelay: "0.2s",
    },
    "&:nth-child(3)": {
      animationDelay: "0.4s",
    },
  },
});

export const inputArea = style({
  padding: vars.space[6],
  borderTop: `1px solid ${vars.colors.stone300}`,
  background: vars.colors.stone50,
});

export const inputWrapper = style({
  maxWidth: "680px",
  margin: "0 auto",
});

export const inputForm = style({
  display: "flex",
  gap: vars.space[3],
  alignItems: "flex-end",
});

export const inputField = style({
  flex: 1,
  fontFamily: vars.fonts.mono,
  fontSize: vars.fontSizes.base.fontSize,
  padding: `${vars.space[3]} ${vars.space[4]}`,
  border: `1px solid ${vars.colors.stone300}`,
  background: vars.colors.stone50,
  color: vars.colors.stone900,
  resize: "none",
  outline: "none",
  transition: "border-color 0.15s ease",
  minHeight: "48px",
  maxHeight: "200px",
  ":focus": {
    borderColor: vars.colors.stone900,
  },
  "::placeholder": {
    color: vars.colors.stone600,
  },
});

export const submitBtn = style({
  width: "48px",
  height: "48px",
  background: vars.colors.stone900,
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "opacity 0.15s ease",
  ":hover": {
    opacity: 0.85,
  },
  ":disabled": {
    opacity: 0.4,
    cursor: "not-allowed",
  },
});

export const submitBtnIcon = style({
  width: "18px",
  height: "18px",
  color: vars.colors.stone50,
});

export const inputHint = style({
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone600,
  marginTop: vars.space[2],
  letterSpacing: vars.letterSpacing.wide,
});
