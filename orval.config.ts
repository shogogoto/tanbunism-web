import { defineConfig } from "orval";

export default defineConfig({
  petstore: {
    output: {
      mode: "tags-split",
      target: "./app/shared/generated",
      baseUrl: "https://knowde.onrender.com",
      // baseUrl: "http://0.0.0.0:8000",
      // baseUrl: "https://toucan-renewing-jackal.ngrok-free.app",
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
      target: "http://0.0.0.0:8000/openapi.json",
    },
    hooks: {
      afterAllFilesWrite: "npm run lint:fix",
    },
  },
  petstoreZod: {
    input: {
      target: "http://0.0.0.0:8000/openapi.json",
    },
    output: {
      mode: "tags-split",
      client: "zod",
      target: "./app/shared/generated",
      fileExtension: ".zod.ts",
      formatter: "biome",
    },
  },
});
