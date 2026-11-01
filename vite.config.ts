import mdx from "@mdx-js/rollup";
import netlifyReactRouter from "@netlify/vite-plugin-react-router";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import reactVitest from "@vitejs/plugin-react";
import remarkGfm from "remark-gfm";
import mkcert from "vite-plugin-mkcert";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    process.env.NODE_ENV === "development" &&
      process.env.VITE_HTTPS !== "false" &&
      mkcert(),
    tailwindcss(),
    process.env.VITEST ? reactVitest() : reactRouter(), // storybookのテスト解消
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
    // Multi-screen jsdom integrations can exceed 5s under CI worker contention.
    testTimeout: 10_000,
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
