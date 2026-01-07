import { build } from 'esbuild';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';

await build({
  entryPoints: ['src/index.ts', 'src/reset.ts'],
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  plugins: [vanillaExtractPlugin({ identifiers: 'debug' })],
});
