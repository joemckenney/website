import { vars } from "@crow/theme";
import { globalStyle, style } from "@vanilla-extract/css";

// Ensure full height chain
globalStyle("html, body", {
  height: "100%",
  margin: 0,
  padding: 0,
});

globalStyle("#root", {
  height: "100%",
});

export const headerWidth = "48px";
export const headerOpenWidth = "280px";

export const container = style({
  display: "flex",
  height: "100%",
  minHeight: "100vh",
  background: vars.colors.stone50,
  fontFamily: vars.fonts.mono,
  color: vars.colors.stone900,
});

export const headerTray = style({
  position: "fixed",
  left: 0,
  top: 0,
  height: "100vh",
  width: headerWidth,
  background: vars.colors.stone100,
  borderRight: `1px solid ${vars.colors.stone300}`,
  display: "flex",
  flexDirection: "column",
  transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  zIndex: 100,
  overflow: "hidden",
});

export const headerTrayOpen = style({
  width: headerOpenWidth,
});

export const headerToggle = style({
  width: "48px",
  height: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  cursor: "pointer",
  borderBottom: `1px solid ${vars.colors.stone300}`,
  flexShrink: 0,
});

export const headerToggleIcon = style({
  width: "18px",
  height: "18px",
  color: vars.colors.stone900,
  transition: "transform 0.25s ease",
});

export const headerToggleIconOpen = style({
  transform: "rotate(180deg)",
});

export const headerBrand = style({
  padding: "20px 16px",
  borderBottom: `1px solid ${vars.colors.stone300}`,
  opacity: 0,
  transition: "opacity 0.15s ease",
  whiteSpace: "nowrap",
});

export const headerBrandVisible = style({
  opacity: 1,
  transitionDelay: "0.1s",
});

export const brandTitle = style({
  fontFamily: vars.fonts.display,
  fontSize: "24px",
  fontWeight: "400",
  letterSpacing: vars.letterSpacing.widest,
  textTransform: "uppercase",
  marginBottom: "4px",
});

export const brandVersion = style({
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone600,
  letterSpacing: vars.letterSpacing.wider,
  textTransform: "uppercase",
});

export const headerNav = style({
  flex: 1,
  padding: vars.space[4],
  opacity: 0,
  transition: "opacity 0.15s ease",
});

export const headerNavVisible = style({
  opacity: 1,
  transitionDelay: "0.15s",
});

export const navSection = style({
  marginBottom: vars.space[6],
});

export const navSectionTitle = style({
  fontSize: "9px",
  letterSpacing: vars.letterSpacing.widest,
  textTransform: "uppercase",
  color: vars.colors.stone600,
  marginBottom: vars.space[3],
  paddingBottom: vars.space[2],
  borderBottom: `1px solid ${vars.colors.stone300}`,
});

export const navItem = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[2],
  padding: `${vars.space[2]} 0`,
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone900,
  cursor: "pointer",
  transition: "color 0.15s ease",
  textDecoration: "none",
  ":hover": {
    color: vars.colors.stone600,
  },
});

export const navItemIcon = style({
  width: "14px",
  height: "14px",
  stroke: "currentColor",
  flexShrink: 0,
});

export const headerUser = style({
  padding: vars.space[4],
  borderTop: `1px solid ${vars.colors.stone300}`,
  opacity: 0,
  transition: "opacity 0.15s ease",
});

export const headerUserVisible = style({
  opacity: 1,
  transitionDelay: "0.2s",
});

export const userInfo = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[2],
});

export const userAvatar = style({
  width: "32px",
  height: "32px",
  background: vars.colors.stone900,
  color: vars.colors.stone50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  fontWeight: "500",
  letterSpacing: vars.letterSpacing.wide,
  flexShrink: 0,
});

export const userDetails = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space[1],
  minWidth: 0,
  flex: 1,
});

export const userName = style({
  fontSize: vars.fontSizes.sm.fontSize,
});

export const logoutButton = style({
  background: "none",
  border: "none",
  padding: 0,
  fontFamily: vars.fonts.mono,
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone600,
  cursor: "pointer",
  textAlign: "left",
  letterSpacing: vars.letterSpacing.wide,
  ":hover": {
    color: vars.colors.stone900,
  },
});

export const loadingContainer = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  width: "100%",
  fontFamily: vars.fonts.mono,
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone600,
  letterSpacing: vars.letterSpacing.wide,
});

export const main = style({
  flex: 1,
  marginLeft: headerWidth,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
});

export const mainExpanded = style({
  marginLeft: headerOpenWidth,
});

// Expandable base list styles
export const baseItem = style({
  display: "flex",
  flexDirection: "column",
});

export const baseHeader = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[1],
  padding: `${vars.space[2]} 0`,
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone900,
  cursor: "pointer",
  transition: "color 0.15s ease",
  textDecoration: "none",
  ":hover": {
    color: vars.colors.stone600,
  },
});

export const baseExpandIcon = style({
  width: "12px",
  height: "12px",
  stroke: "currentColor",
  flexShrink: 0,
  transition: "transform 0.15s ease",
});

export const baseExpandIconOpen = style({
  transform: "rotate(90deg)",
});

export const baseName = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const baseTableList = style({
  paddingLeft: vars.space[5],
  overflow: "hidden",
  maxHeight: 0,
  transition: "max-height 0.2s ease",
});

export const baseTableListOpen = style({
  maxHeight: "500px",
});

export const baseTableItem = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[2],
  padding: `${vars.space[1]} 0`,
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone700,
  textDecoration: "none",
  transition: "color 0.15s ease",
  ":hover": {
    color: vars.colors.stone900,
  },
});

export const newBaseButton = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[2],
  padding: `${vars.space[2]} 0`,
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone600,
  cursor: "pointer",
  transition: "color 0.15s ease",
  background: "none",
  border: "none",
  fontFamily: vars.fonts.mono,
  textAlign: "left",
  width: "100%",
  ":hover": {
    color: vars.colors.stone900,
  },
});
