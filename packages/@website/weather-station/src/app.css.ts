import { style } from "@vanilla-extract/css";
import { vars } from "./styles/tokens.css";

export const page = style({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: `${vars.spacing["16"]} ${vars.spacing["6"]}`,

  "@media": {
    "(max-width: 768px)": {
      padding: `${vars.spacing["8"]} ${vars.spacing["4"]}`,
    },
  },
});

export const section = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.spacing["8"],
  width: "100%",
  maxWidth: "900px",
});
