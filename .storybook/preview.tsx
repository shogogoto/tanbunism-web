import type { Preview, ReactRenderer } from "@storybook/react-vite";
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from "react"; // これを追加
import "../app/app.css";
import "github-markdown-css/github-markdown.css";

import { withThemeByClassName } from "@storybook/addon-themes";
import { mswLoader } from "msw-storybook-addon/csf3";
import { setupWorker } from "msw/browser";
import { MINIMAL_VIEWPORTS } from "storybook/viewport";
import { ThemeProvider } from "../app/shared/components/theme/ThemeProvider";
import { withRouter } from "./RouterDecorator";

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
    withRouter,
    withThemeByClassName<ReactRenderer>({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
  ],
  parameters: {
    // actions: { argTypesRegex: "^on[A-Z].*" },
    layout: "fullscreen",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    reactRouter: {},
    viewport: {
      options: MINIMAL_VIEWPORTS,
    },
  },
  loaders: [
    mswLoader(async () => {
      const worker = setupWorker();
      await worker.start({ onUnhandledRequest: "bypass" });
      return worker;
    }),
  ],
};

export default preview;
