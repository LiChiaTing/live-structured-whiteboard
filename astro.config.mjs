// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // React Islands — Excalidraw is rendered client-side only (client:only="react").
  integrations: [react()],
  // Node adapter so the /api/generate server endpoint can run (it holds the API
  // key server-side). Pages stay static; only the endpoint renders on demand.
  adapter: node({ mode: "standalone" }),
  vite: {
    plugins: [tailwindcss()],
  },
});
