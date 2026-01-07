import { type Mode, tokens } from "@crow/tokens";

import {
  createGlobalTheme,
  createGlobalThemeContract,
} from "@vanilla-extract/css";
import merge from "deepmerge";

import type { Theme } from "./types";

const getVarName = (_value: string | null, path: string[]) =>
  path.join("-").replace(".", "_").replace("/", "__");

const baseTokens: Omit<Theme, "colors"> = tokens;
const baseVars = createGlobalThemeContract(baseTokens, getVarName);
createGlobalTheme(":root", baseVars, baseTokens);

const makeColorScheme = (mode: Mode = "light") => {
  const colors = tokens.colors[mode];
  return {
    colors: {
      ...tokens.colors.base,
      ...colors,
    },
  };
};
const colorModeTokens = makeColorScheme("light");
const colorModeVars = createGlobalThemeContract(colorModeTokens, getVarName);
createGlobalTheme('[data-theme="light"]', colorModeVars, colorModeTokens);
createGlobalTheme(
  '[data-theme="dark"]',
  colorModeVars,
  makeColorScheme("dark"),
);
type ColorVars = typeof colorModeVars;
const colorVars = colorModeVars as ColorVars;

type ThemeVars = typeof baseVars & typeof colorVars;
export const vars = merge(baseVars, colorVars) as ThemeVars;
