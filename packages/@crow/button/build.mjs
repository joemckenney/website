import { build } from 'esbuild';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';

await build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  jsx: 'automatic',
  plugins: [vanillaExtractPlugin({ identifiers: 'debug' })],
});
