import { globalFontFace } from '@vanilla-extract/css';
import { fontFamilies } from '@crow/tokens';

globalFontFace(fontFamilies.dinEngschrift, {
  src: `url('../fonts/DINEngschriftStd.woff') format('woff')`,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontDisplay: 'swap',
});

globalFontFace(fontFamilies.dinMittelschrift, {
  src: `url('../fonts/DINMittelschriftStd.woff') format('woff')`,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontDisplay: 'swap',
});
