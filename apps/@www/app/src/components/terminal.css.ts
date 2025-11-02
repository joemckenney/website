import { style, keyframes } from '@vanilla-extract/css';
import { gruvbox } from '../styles/terminal-tokens.css';
import { vars } from '../styles/tokens.css';

export const terminal = style({
  width: '100%',
  maxWidth: '900px',
  backgroundColor: gruvbox.bg0,
  border: `${vars.borderWidth.base} solid ${gruvbox.bg4}`,
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize.sm,
  color: gruvbox.fg1,
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',

  '@media': {
    '(max-width: 768px)': {
      fontSize: vars.fontSize.xs,
    },
  },
});

export const body = style({
  padding: vars.spacing['4'],
  minHeight: '400px',
  maxHeight: '600px',
  overflowY: 'auto',
  lineHeight: '1.6',

  '@media': {
    '(max-width: 768px)': {
      padding: vars.spacing['3'],
      minHeight: '300px',
      maxHeight: '500px',
    },
  },

  selectors: {
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: gruvbox.bg0,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: gruvbox.bg3,
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: gruvbox.bg4,
    },
  },
});

export const line = style({
  marginBottom: vars.spacing['1'],
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

export const prompt = style({
  color: gruvbox.green,
  fontWeight: 'bold',
  marginRight: vars.spacing['2'],
});

export const input = style({
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  color: gruvbox.fg1,
  fontFamily: vars.font.mono,
  fontSize: 'inherit',
  flex: 1,
  caretColor: gruvbox.fg1,
  caretShape: 'block',

  ':disabled': {
    opacity: 0.5,
  },

  selectors: {
    '&::selection': {
      backgroundColor: gruvbox.bg3,
    },
  },
});

// Type-based styling
export const info = style({
  color: gruvbox.blue,
});

export const success = style({
  color: gruvbox.green,
});

export const warning = style({
  color: gruvbox.yellow,
});

export const error = style({
  color: gruvbox.red,
});

export const output = style({
  color: gruvbox.fg2,
});

export const promptText = style({
  color: gruvbox.fg1,
});

// Export individual type classes instead of function
// Use in component: styles[line.type || 'output']
