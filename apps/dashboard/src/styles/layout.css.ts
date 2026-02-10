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

export const container = style({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: "100vh",
  background: vars.colors.stone50,
  fontFamily: vars.fonts.mono,
  color: vars.colors.stone900,
});

// Horizontal top nav
export const topNav = style({
  display: "flex",
  alignItems: "center",
  height: "36px",
  padding: "0 12px",
  background: vars.colors.stone100,
  borderBottom: `1px solid ${vars.colors.stone300}`,
  flexShrink: 0,
});

export const navLeft = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
});

export const navRight = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginLeft: "auto",
});

export const navLink = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 8px",
  fontSize: "12px",
  color: vars.colors.stone700,
  textDecoration: "none",
  borderRadius: "3px",
  transition: "all 0.1s ease",
  ":hover": {
    color: vars.colors.stone900,
    background: vars.colors.stone200,
  },
});

export const navLinkActive = style({
  color: vars.colors.stone900,
  background: vars.colors.stone200,
});

export const navBreadcrumb = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "12px",
  color: vars.colors.stone500,
});

export const navBreadcrumbSeparator = style({
  color: vars.colors.stone400,
});

export const navBreadcrumbCurrent = style({
  color: vars.colors.stone900,
  fontWeight: "500",
});

export const userButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  fontSize: "10px",
  fontWeight: "500",
  background: vars.colors.stone800,
  color: vars.colors.stone50,
  borderRadius: "3px",
  cursor: "pointer",
  border: "none",
  letterSpacing: "0.5px",
});

export const userMenu = style({
  position: "absolute",
  top: "32px",
  right: "8px",
  background: "white",
  border: `1px solid ${vars.colors.stone300}`,
  borderRadius: "4px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  zIndex: 1000,
  minWidth: "160px",
  padding: "4px",
});

export const userMenuItem = style({
  display: "block",
  width: "100%",
  padding: "6px 8px",
  fontSize: "12px",
  color: vars.colors.stone700,
  background: "none",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  borderRadius: "3px",
  fontFamily: vars.fonts.mono,
  ":hover": {
    background: vars.colors.stone100,
    color: vars.colors.stone900,
  },
});

export const userMenuEmail = style({
  padding: "6px 8px",
  fontSize: "11px",
  color: vars.colors.stone500,
  borderBottom: `1px solid ${vars.colors.stone200}`,
  marginBottom: "4px",
});

// Main content area
export const main = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

export const loadingContainer = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  width: "100%",
  fontFamily: vars.fonts.mono,
  fontSize: "12px",
  color: vars.colors.stone500,
});

// Base detail layout - chat on left, content on right
export const baseLayout = style({
  display: "flex",
  flex: 1,
  overflow: "hidden",
});

export const chatPane = style({
  width: "360px",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  borderRight: `1px solid ${vars.colors.stone300}`,
  background: vars.colors.stone50,
});

export const contentPane = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minWidth: 0,
});
