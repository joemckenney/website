import { vars } from "@crow/theme";
import { style } from "@vanilla-extract/css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  height: "100%",
  background: vars.colors.stone50,
});

export const header = style({
  display: "flex",
  alignItems: "center",
  padding: "8px 12px",
  borderBottom: `1px solid ${vars.colors.stone300}`,
  background: vars.colors.stone100,
  flexShrink: 0,
});

export const modelSelect = style({
  fontFamily: vars.fonts.mono,
  fontSize: "12px",
  padding: "4px 8px",
  background: "white",
  color: vars.colors.stone900,
  border: `1px solid ${vars.colors.stone300}`,
  borderRadius: "3px",
  cursor: "pointer",
  minWidth: "240px",
});

export const messages = style({
  flex: 1,
  overflowY: "auto",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

const messageBase = style({
  maxWidth: "720px",
  padding: "8px 12px",
  borderRadius: "4px",
  fontSize: "13px",
  lineHeight: "1.5",
  fontFamily: vars.fonts.mono,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

export const messageUser = style([
  messageBase,
  {
    alignSelf: "flex-end",
    background: vars.colors.stone800,
    color: vars.colors.stone50,
  },
]);

export const messageAssistant = style([
  messageBase,
  {
    alignSelf: "flex-start",
    background: "white",
    color: vars.colors.stone900,
    border: `1px solid ${vars.colors.stone300}`,
  },
]);

export const messageRole = style({
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  opacity: 0.6,
  marginBottom: "4px",
});

export const messageBody = style({
  display: "block",
});

export const error = style({
  alignSelf: "center",
  padding: "8px 12px",
  fontSize: "12px",
  fontFamily: vars.fonts.mono,
  color: "#b91c1c",
  background: "#fef2f2",
  border: "1px solid #fca5a5",
  borderRadius: "4px",
});

export const inputRow = style({
  display: "flex",
  gap: "8px",
  padding: "12px",
  borderTop: `1px solid ${vars.colors.stone300}`,
  background: vars.colors.stone100,
  flexShrink: 0,
});

export const textarea = style({
  flex: 1,
  fontFamily: vars.fonts.mono,
  fontSize: "13px",
  padding: "8px 10px",
  resize: "none",
  border: `1px solid ${vars.colors.stone300}`,
  borderRadius: "3px",
  background: "white",
  color: vars.colors.stone900,
  ":focus": {
    outline: "none",
    borderColor: vars.colors.stone500,
  },
});

export const sendButton = style({
  fontFamily: vars.fonts.mono,
  fontSize: "12px",
  padding: "0 16px",
  background: vars.colors.stone800,
  color: vars.colors.stone50,
  border: "none",
  borderRadius: "3px",
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      background: vars.colors.stone400,
      cursor: "not-allowed",
    },
  },
});
