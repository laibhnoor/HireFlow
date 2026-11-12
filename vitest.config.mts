import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // These tests never open a database connection, but the modules under test
    // import the validated env module. Keep them deterministic and offline.
    env: {
      DATABASE_URL: "postgresql://hireflow:hireflow@localhost:5433/hireflow",
      AUTH_SECRET: "vitest-secret-not-used-000000",
      OPENAI_API_KEY: "",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
