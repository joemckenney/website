import { vanillaExtractPlugin } from "@vanilla-extract/esbuild-plugin";
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts", "src/reset.ts"],
  bundle: true,
  format: "esm",
  outdir: "dist",
  packages: "external",
  loader: {
    ".woff": "file",
    ".woff2": "file",
  },
  assetNames: "fonts/[name]",
  plugins: [vanillaExtractPlugin({ identifiers: "debug" })],
});
