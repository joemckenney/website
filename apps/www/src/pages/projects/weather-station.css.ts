import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const backLinkWrapper = style({
  padding: `${vars.spacing["6"]} ${vars.spacing["6"]}`,
  maxWidth: vars.maxWidth.container,
  margin: "0 auto",
  width: "100%",
  boxSizing: "border-box",

  "@media": {
    "(max-width: 768px)": {
      padding: `${vars.spacing["4"]} ${vars.spacing["4"]}`,
    },
  },
});
