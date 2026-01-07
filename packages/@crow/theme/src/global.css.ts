import { globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css';

globalStyle(':root', {
  fontFamily: vars.fonts.sansText,
  ...vars.fontSizes.root,
  color: vars.colors.midnight500,
  WebkitFontSmoothing: 'antialiased',
});
