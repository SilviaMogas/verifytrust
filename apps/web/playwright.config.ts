import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  use: { baseURL: "http://127.0.0.1:3000", headless: true },
});
