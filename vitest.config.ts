import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

// Unit tests for the pure layers (dsl.ts + render.ts) run in Node — no browser.
// We load .env so the gated eval (`npm run eval`) can read ANTHROPIC_API_KEY;
// the regular unit tests don't need it.
export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
