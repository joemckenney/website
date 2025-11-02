import { style } from '@vanilla-extract/css';

export const container = style({
  padding: '2rem',
  fontFamily: 'system-ui, sans-serif',
  maxWidth: '1200px',
  margin: '0 auto',
});

export const title = style({
  color: '#333',
  fontSize: '2.5rem',
  marginBottom: '1rem',
});
