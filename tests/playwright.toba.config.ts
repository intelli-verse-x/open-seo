import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "toba-presentation.spec.ts",
  outputDir: "../test-results/toba",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  use: {
    actionTimeout: 30_000,
    baseURL: "http://127.0.0.1:3101",
    channel: "chrome",
    viewport: { width: 1440, height: 1180 },
  },
});
