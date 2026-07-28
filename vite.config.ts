import path from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import netlifyReactRouter from "@netlify/vite-plugin-react-router";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import reactVitest from "@vitejs/plugin-react";
import remarkGfm from "remark-gfm";
import mkcert from "vite-plugin-mkcert";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
//
const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    process.env.NODE_ENV === "development" && mkcert(),
    tailwindcss(),
    process.env.VITEST ? reactVitest() : reactRouter(), // storybookのテスト解消
    tsconfigPaths(),
    netlifyReactRouter(),
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkGfm],
        // rehypePlugins: [
        //   [
        //     rehypeMermaid,
        //     {
        //       strategy: "img-svg",
        //       mermaid: { theme: "default" },
        //       // dark: { theme: "dark" },
        //       background: "transparent",
        //       className: "mermaid-diagram",
        //     },
        //   ],
        // ],
      }),
    },
  ],
  test: {
    globals: true, // `describe`, `it`, `expect` テスト関数のインポート省略
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts", "fake-indexeddb/auto"],
    reporters: ["verbose"],
    // projects: [
    //   "vite.config.ts",
    //   {
    //     extends: "vite.config.ts",
    //     plugins: [
    //       // The plugin will run tests for the stories defined in your Storybook config
    //       // See options at: https://storybook.js.org/docs/writing-tests/test-addon#storybooktest
    //       // storybookTest({ configDir: path.join(dirname, ".storybook") }),
    //     ],
    //     test: {
    //       name: "storybook",
    //       browser: {
    //         enabled: true,
    //         headless: true,
    //         provider: "playwright",
    //         instances: [{ browser: "chromium" }],
    //       },
    //       setupFiles: [".storybook/vitest.setup.ts"],
    //     },
    //   },
    // ],
  },
});
