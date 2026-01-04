import { style } from "@vanilla-extract/css";

export const visualizer = style({
  width: "100%",
  height: "100%",
  backgroundColor: "#1d2021", // Gruvbox dark background
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderTop: "1px solid #504945", // Gruvbox border
});

export const canvas = style({
  width: "100%",
  height: "100%",
  display: "block",
});
