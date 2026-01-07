export type Mode = 'light' | 'dark';

export type Color = keyof (typeof colors)['light'];

// Warm stone neutrals - editorial/newspaper aesthetic
const stone = {
  stone50: '#faf9f7',   // background
  stone100: '#f3f1ed',  // background alt
  stone200: '#e8e6e1',
  stone300: '#d4d0c8',  // border
  stone400: '#b5b0a5',
  stone500: '#8a8479',
  stone600: '#6b6b6b',  // muted text
  stone700: '#524e47',
  stone800: '#3a3733',
  stone900: '#1a1a1a',  // primary text
};

// Pure ink blacks for high contrast elements
const ink = {
  ink50: '#f5f5f5',
  ink100: '#e5e5e5',
  ink200: '#cccccc',
  ink300: '#a3a3a3',
  ink400: '#737373',
  ink500: '#525252',
  ink600: '#404040',
  ink700: '#2e2e2e',
  ink800: '#1a1a1a',
  ink900: '#0a0a0a',
};

// Subtle warm accent - terracotta/rust
const terracotta = {
  terracotta50: '#fdf6f4',
  terracotta100: '#fae8e4',
  terracotta200: '#f5d0c7',
  terracotta300: '#e9a899',
  terracotta400: '#db7f6b',
  terracotta500: '#c45a42',
  terracotta600: '#a34835',
  terracotta700: '#7d3828',
  terracotta800: '#5a291d',
  terracotta900: '#3d1c14',
};

// Success/valid states - sage green
const sage = {
  sage50: '#f6f9f6',
  sage100: '#e8f0e8',
  sage200: '#d1e0d1',
  sage300: '#a8c5a8',
  sage400: '#7fa97f',
  sage500: '#5a8a5a',
  sage600: '#476e47',
  sage700: '#365336',
  sage800: '#263b26',
  sage900: '#1a291a',
};

// Warning states - warm amber
const amber = {
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber300: '#fcd34d',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  amber800: '#92400e',
  amber900: '#78350f',
};

// Error states - muted red
const rust = {
  rust50: '#fef2f2',
  rust100: '#fee2e2',
  rust200: '#fecaca',
  rust300: '#fca5a5',
  rust400: '#f87171',
  rust500: '#dc2626',
  rust600: '#b91c1c',
  rust700: '#991b1b',
  rust800: '#7f1d1d',
  rust900: '#450a0a',
};

export const colors = {
  base: {
    black: '#000',
    white: '#fff',
    transparent: 'transparent',
    inherit: 'inherit',
  },
  light: {
    ...stone,
    ...ink,
    ...terracotta,
    ...sage,
    ...amber,
    ...rust,
  },
  dark: {
    // Inverted for dark mode
    stone50: '#1a1a1a',
    stone100: '#252422',
    stone200: '#3a3733',
    stone300: '#524e47',
    stone400: '#6b6b6b',
    stone500: '#8a8479',
    stone600: '#b5b0a5',
    stone700: '#d4d0c8',
    stone800: '#e8e6e1',
    stone900: '#faf9f7',
    ...ink,
    ...terracotta,
    ...sage,
    ...amber,
    ...rust,
  },
};
