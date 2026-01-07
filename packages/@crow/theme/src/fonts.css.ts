import { fontFamilies } from "@crow/tokens";
import { globalFontFace } from "@vanilla-extract/css";

globalFontFace(fontFamilies.dinEngschrift, {
  src: `url('../fonts/DINEngschriftStd.woff') format('woff')`,
  fontWeight: "normal",
  fontStyle: "normal",
  fontDisplay: "swap",
});

globalFontFace(fontFamilies.dinMittelschrift, {
  src: `url('../fonts/DINMittelschriftStd.woff') format('woff')`,
  fontWeight: "normal",
  fontStyle: "normal",
  fontDisplay: "swap",
});
