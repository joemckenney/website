import { style } from '@vanilla-extract/css';
import { vars } from './styles/tokens.css';

export const page = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: `${vars.spacing['16']} ${vars.spacing['6']}`,

  '@media': {
    '(max-width: 768px)': {
      padding: `${vars.spacing['8']} ${vars.spacing['4']}`,
    },
  },
});

export const masthead = style({
  borderBottom: `${vars.borderWidth.thick} solid ${vars.color.black}`,
  paddingBottom: vars.spacing['6'],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const title = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize['5xl'],
  letterSpacing: '-0.03em',
  textTransform: 'uppercase',
  color: vars.color.black,

  '@media': {
    '(max-width: 768px)': {
      fontSize: vars.fontSize['4xl'],
    },
  },
});

export const subtitle = style({
  fontFamily: vars.font.body,
  fontSize: vars.fontSize.lg,
  lineHeight: vars.lineHeight.normal,
  color: vars.color.textSecondary,
  maxWidth: vars.maxWidth.prose,
});

export const section = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.spacing['8'],
  width: '100%',
  maxWidth: '900px',
});

export const controls = style({
  display: 'flex',
  gap: vars.spacing['4'],
  flexWrap: 'wrap',
  alignItems: 'center',
});

export const button = style({
  fontFamily: vars.font.body,
  fontSize: vars.fontSize.base,
  padding: `${vars.spacing['3']} ${vars.spacing['6']}`,
  border: `${vars.borderWidth.base} solid ${vars.color.black}`,
  backgroundColor: vars.color.white,
  color: vars.color.black,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',

  ':hover': {
    backgroundColor: vars.color.black,
    color: vars.color.white,
  },

  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const primaryButton = style([
  button,
  {
    backgroundColor: vars.color.black,
    color: vars.color.white,

    ':hover': {
      backgroundColor: vars.color.gray800,
    },
  },
]);

export const secondaryButton = style([
  button,
  {
    ':hover': {
      backgroundColor: vars.color.gray100,
      color: vars.color.black,
    },
  },
]);

export const status = style({
  fontFamily: vars.font.body,
  fontSize: vars.fontSize.sm,
  padding: vars.spacing['4'],
  backgroundColor: vars.color.backgroundSubtle,
  border: `${vars.borderWidth.thin} solid ${vars.color.border}`,
  color: vars.color.textSecondary,
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

export const error = style({
  fontFamily: vars.font.body,
  fontSize: vars.fontSize.sm,
  padding: vars.spacing['4'],
  backgroundColor: vars.color.white,
  border: `${vars.borderWidth.base} solid ${vars.color.black}`,
  color: vars.color.black,
  textAlign: 'center',
});
