export const fontFamilies = {
  dinEngschrift: "DIN 1451 Engschrift",
  dinMittelschrift: "DIN 1451 Mittelschrift",
  dmMono: "DM Mono",
};

const displayFontStack = `${fontFamilies.dinEngschrift}, 'Bebas Neue', 'Oswald', 'Barlow Condensed', sans-serif`;
const textFontStack = `${fontFamilies.dinMittelschrift}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
const monoFontStack = `${fontFamilies.dmMono}, 'IBM Plex Mono', Menlo, Consolas, monospace`;

export const fonts = {
  display: displayFontStack,
  sans: textFontStack,
  sansDisplay: displayFontStack,
  sansText: textFontStack,
  mono: monoFontStack,
};

export const fontSizes = {
  /** 14px / 22px - body text */
  root: {
    fontSize: "14px",
    lineHeight: "1.6",
  },
  /** 14px / 22px */
  base: {
    fontSize: "0.875rem",
    lineHeight: "1.6",
  },
  /** 10px / 14px - tiny labels */
  xs: {
    fontSize: "0.625rem",
    lineHeight: "1.4",
  },
  /** 12px / 18px - small text */
  sm: {
    fontSize: "0.75rem",
    lineHeight: "1.5",
  },
  /** 16px / 24px */
  md: {
    fontSize: "1rem",
    lineHeight: "1.5",
  },
  /** 20px / 28px */
  lg: {
    fontSize: "1.25rem",
    lineHeight: "1.4",
  },
  /** 24px / 32px */
  xl: {
    fontSize: "1.5rem",
    lineHeight: "1.33",
  },
  /** 32px / 40px */
  "2xl": {
    fontSize: "2rem",
    lineHeight: "1.25",
  },
  /** 48px / 56px */
  "3xl": {
    fontSize: "3rem",
    lineHeight: "1.17",
  },
};

export const fontWeights = {
  thin: "100",
  extraLight: "200",
  light: "300",
  regular: "400",
  medium: "500",
  semiBold: "600",
  bold: "700",
  extraBold: "800",
  black: "900",
  extraBlack: "950",
};

export const letterSpacing = {
  tight: "-0.02em",
  normal: "0",
  wide: "0.05em",
  wider: "0.1em",
  widest: "0.15em",
};
