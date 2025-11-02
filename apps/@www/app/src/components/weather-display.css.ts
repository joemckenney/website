import { style } from '@vanilla-extract/css';
import { vars } from '../styles/tokens.css';

export const container = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
});

export const card = style({
  border: `${vars.borderWidth.thick} solid ${vars.color.black}`,
  padding: vars.spacing['8'],
  backgroundColor: vars.color.white,
  minWidth: '350px',
  maxWidth: '500px',

  '@media': {
    '(max-width: 768px)': {
      padding: vars.spacing['6'],
      minWidth: 'auto',
    },
  },
});

export const title = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize['2xl'],
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  marginBottom: vars.spacing['6'],
  paddingBottom: vars.spacing['3'],
  borderBottom: `${vars.borderWidth.thin} solid ${vars.color.border}`,
});

export const mainInfo = style({
  textAlign: 'center',
  marginBottom: vars.spacing['8'],
  paddingBottom: vars.spacing['8'],
  borderBottom: `${vars.borderWidth.thin} solid ${vars.color.border}`,
});

export const temperature = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize['6xl'],
  lineHeight: vars.lineHeight.tight,
  marginBottom: vars.spacing['2'],
  color: vars.color.black,
});

export const conditions = style({
  fontFamily: vars.font.body,
  fontSize: vars.fontSize.xl,
  color: vars.color.textSecondary,
});

export const details = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: vars.spacing['6'],
  marginBottom: vars.spacing['6'],

  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: vars.spacing['4'],
    },
  },
});

export const detailItem = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.spacing['1'],

  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  },
});

export const label = style({
  fontFamily: vars.font.body,
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
});

export const value = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.xl,
  color: vars.color.black,
});

export const location = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  paddingTop: vars.spacing['6'],
  borderTop: `${vars.borderWidth.thin} solid ${vars.color.border}`,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

export const locationIcon = style({
  fontSize: vars.fontSize.base,
});

export const loading = style({
  fontFamily: vars.font.body,
  fontSize: vars.fontSize.lg,
  textAlign: 'center',
  color: vars.color.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});
