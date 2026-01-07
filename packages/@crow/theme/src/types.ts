import type { Color, Tokens } from "@crow/tokens";

type BaseColors = Tokens["colors"]["base"] & {
  [key in Color]: string;
};

type ThemeColors = BaseColors & {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  foreground: string;
  foregroundSecondary: string;
  foregroundSecondaryHover: string;
  foregroundTertiary: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
};

export type Theme = {
  borderStyles: Tokens["borderStyles"];
  borderWidths: Tokens["borderWidths"];
  colors: ThemeColors;
  fonts: Tokens["fonts"];
  fontFamilies: Tokens["fontFamilies"];
  fontSizes: Tokens["fontSizes"];
  fontWeights: Tokens["fontWeights"];
  letterSpacing: Tokens["letterSpacing"];
  opacity: Tokens["opacity"];
  radii: Tokens["radii"];
  shadows: Tokens["shadows"];
  space: Tokens["space"];
  zIndexes: Tokens["zIndexes"];
};
