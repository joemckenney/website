import mdx from "@mdx-js/rollup";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
    }),
    vanillaExtractPlugin(),
  ],
  build: {
    ssr: true,
    outDir: "dist/server",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        prerender: "./src/prerender.ts",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
