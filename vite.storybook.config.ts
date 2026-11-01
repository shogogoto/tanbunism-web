import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const envWithVitePrefix = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith("VITE_") || key === "STORYBOOK")
      .map(([key, val]) => [`import.meta.env.${key}`, JSON.stringify(val)]),
  );

  // process.env にも環境変数を定義する
  const processEnv = Object.fromEntries(
    Object.entries(env).map(([key, val]) => [
      `process.env.${key}`,
      JSON.stringify(val),
    ]),
  );

  return {
    resolve: { tsconfigPaths: true },
    plugins: [tailwindcss()],
    define: {
      ...envWithVitePrefix,
      ...processEnv, // process.envの定義を追加
    },
  };
});
