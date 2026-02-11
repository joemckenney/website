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
