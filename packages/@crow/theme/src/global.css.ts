import { globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css';

globalStyle(':root', {
  fontFamily: vars.fonts.sansText,
  ...vars.fontSizes.root,
  color: vars.colors.stone900,
  backgroundColor: vars.colors.stone50,
  WebkitFontSmoothing: 'antialiased',
});
