import { defineConfig } from "vitest/config";

// Unit tests for the pure render layer (dsl.ts + render.ts) run in Node —
// no browser, no Excalidraw runtime.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
