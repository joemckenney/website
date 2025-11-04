import { globalStyle, globalFontFace } from "@vanilla-extract/css";
import { vars } from "./tokens.css";

// Font faces
globalFontFace("DIN 1451 Std Engschrift", {
  fontStyle: "normal",
  fontWeight: "normal",
  src: 'url("/font/din-1451/DINEngschriftStd.woff") format("woff")',
});

globalFontFace("DIN 1451 Std Mittelschrift", {
  fontStyle: "normal",
  fontWeight: "normal",
  src: 'url("/font/din-1451/DINMittelschriftStd.woff") format("woff")',
});

// CSS Reset - minimal, opinionated
globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
});

globalStyle("*", {
  margin: 0,
  padding: 0,
});

globalStyle("html", {
  fontSize: "16px",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

globalStyle("body", {
  fontFamily: vars.font.body,
  color: vars.color.text,
  backgroundColor: vars.color.background,
  lineHeight: vars.lineHeight.normal,
  minHeight: "100vh",
});

// Typography - newspaper inspired
globalStyle("h1, h2, h3, h4, h5, h6", {
  fontFamily: vars.font.heading,
  fontWeight: "normal",
  lineHeight: vars.lineHeight.tight,
  letterSpacing: "-0.02em",
});

globalStyle("h1", {
  fontSize: vars.fontSize["5xl"],
});

globalStyle("h2", {
  fontSize: vars.fontSize["4xl"],
});

globalStyle("h3", {
  fontSize: vars.fontSize["3xl"],
});

globalStyle("h4", {
  fontSize: vars.fontSize["2xl"],
});

globalStyle("h5", {
  fontSize: vars.fontSize.xl,
});

globalStyle("h6", {
  fontSize: vars.fontSize.lg,
});

globalStyle("p", {
  fontSize: vars.fontSize.base,
  lineHeight: vars.lineHeight.normal,
  maxWidth: vars.maxWidth.prose,
});

globalStyle("a", {
  color: "inherit",
  textDecoration: "none",
  transition: "opacity 0.15s ease",
});

globalStyle("a:hover", {
  opacity: 0.6,
});

// Remove list styles
globalStyle("ul, ol", {
  listStyle: "none",
});

// Ensure images and media are responsive
globalStyle("img, picture, video, canvas, svg", {
  display: "block",
  maxWidth: "100%",
});

// Inherit fonts for form elements
globalStyle("input, button, textarea, select", {
  font: "inherit",
});
