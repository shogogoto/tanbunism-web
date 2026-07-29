import { defineConfig } from "orval";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const openApiUrl = env.OPENAPI_URL ?? "http://127.0.0.1:8000/openapi.json";
const apiBaseUrl = env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export default defineConfig({
  api: {
    output: {
      mode: "tags-split",
      target: "./app/shared/generated",
      baseUrl: apiBaseUrl,
      client: "swr",
      httpClient: "fetch",
      mock: {
        generators: [
          {
            type: "msw",
            delay: 200,
            useExamples: true,
          },
        ],
      },
    },
    input: {
      target: openApiUrl,
    },
    hooks: {
      afterAllFilesWrite: "npm run lint:fix",
    },
  },
  apiZod: {
    input: {
      target: openApiUrl,
    },
    output: {
      mode: "tags-split",
      client: "zod",
      target: "./app/shared/generated",
      fileExtension: ".zod.ts",
    },
    hooks: {
      afterAllFilesWrite: "npm run lint:fix",
    },
  },
  quiz: {
    input: {
      target: openApiUrl,
      filters: {
        tags: ["quiz", "quiz-learning", "entry"],
      },
    },
    output: {
      mode: "single",
      target: "./app/features/quiz/generated/api.ts",
      schemas: "./app/features/quiz/generated/models",
      baseUrl: apiBaseUrl,
      client: "fetch",
      httpClient: "fetch",
    },
    hooks: {
      afterAllFilesWrite: {
        command:
          "./node_modules/.bin/biome check --write --unsafe app/features/quiz/generated",
        injectGeneratedDirsAndFiles: false,
      },
    },
  },
});
