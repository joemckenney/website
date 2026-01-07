import { borderStyles, borderWidths, radii } from "./border";
import { breakpoints } from "./breakpoints";
import { colors } from "./color";
import { opacity } from "./opacity";
import { shadows } from "./shadow";
import { space } from "./space";
import {
  fontFamilies,
  fontSizes,
  fonts,
  fontWeights,
  letterSpacing,
} from "./typography";
import { zIndexes } from "./zindex";

export const tokens = {
  borderStyles,
  borderWidths,
  breakpoints,
  colors,
  fonts,
  fontFamilies,
  fontSizes,
  fontWeights,
  letterSpacing,
  opacity,
  radii,
  shadows,
  space,
  zIndexes,
};

export type { Breakpoint } from "./breakpoints";
export { breakpointNames } from "./breakpoints";
export type { Color, Mode } from "./color";
export { fontFamilies } from "./typography";
export type Tokens = typeof tokens;
