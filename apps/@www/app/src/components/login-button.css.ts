import { style } from "@vanilla-extract/css";
import { vars } from "../styles/tokens.css";

export const loginButton = style({
  position: "fixed",
  top: vars.spacing["4"],
  right: vars.spacing["4"],
  fontFamily: vars.font.body,
  fontSize: vars.fontSize.sm,
  padding: `${vars.spacing["2"]} ${vars.spacing["4"]}`,
  backgroundColor: vars.color.white,
  color: vars.color.white,
  border: `${vars.borderWidth.base} solid ${vars.color.white}`,
  cursor: "pointer",
  transition: "all 0.15s ease",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  zIndex: 1000,

  ":hover": {
    backgroundColor: vars.color.white,
    color: vars.color.white,
  },

  "@media": {
    "(max-width: 768px)": {
      top: vars.spacing["3"],
      right: vars.spacing["3"],
      fontSize: vars.fontSize.xs,
      padding: `${vars.spacing["2"]} ${vars.spacing["3"]}`,
    },
  },
});
