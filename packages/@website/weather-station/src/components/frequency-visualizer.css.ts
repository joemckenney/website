import { style } from "@vanilla-extract/css";

export const visualizer = style({
  width: "100%",
  height: "100%",
  backgroundColor: "#1a1a1a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const canvas = style({
  width: "100%",
  height: "100%",
  display: "block",
});
