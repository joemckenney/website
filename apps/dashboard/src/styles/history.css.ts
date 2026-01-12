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

export const newButton = style({
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone50,
  background: vars.colors.stone900,
  padding: `${vars.space[2]} ${vars.space[4]}`,
  textDecoration: "none",
  letterSpacing: vars.letterSpacing.wide,
  transition: "opacity 0.15s ease",
  ":hover": {
    opacity: 0.85,
  },
});

export const container = style({
  flex: 1,
  overflowY: "auto",
  padding: vars.space[6],
});

export const loading = style({
  textAlign: "center",
  color: vars.colors.stone600,
  fontSize: vars.fontSizes.sm.fontSize,
  padding: vars.space[8],
});

export const error = style({
  textAlign: "center",
  color: "#991b1b",
  fontSize: vars.fontSizes.sm.fontSize,
  padding: vars.space[8],
});

export const empty = style({
  textAlign: "center",
  color: vars.colors.stone600,
  fontSize: vars.fontSizes.sm.fontSize,
  padding: vars.space[8],
});

export const emptyLink = style({
  display: "inline-block",
  marginTop: vars.space[4],
  color: vars.colors.stone900,
  textDecoration: "underline",
  ":hover": {
    textDecoration: "none",
  },
});

export const list = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  maxWidth: "680px",
  marginLeft: "auto",
  marginRight: "auto",
});

export const item = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${vars.space[4]} ${vars.space[5]}`,
  borderBottom: `1px solid ${vars.colors.stone300}`,
  textDecoration: "none",
  color: vars.colors.stone900,
  transition: "background 0.15s ease",
  ":hover": {
    background: vars.colors.stone100,
  },
});

export const itemTitle = style({
  fontSize: vars.fontSizes.base.fontSize,
  fontWeight: "400",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  marginRight: vars.space[4],
});

export const itemDate = style({
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone600,
  letterSpacing: vars.letterSpacing.wide,
  flexShrink: 0,
});
