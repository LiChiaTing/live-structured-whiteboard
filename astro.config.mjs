// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // React Islands — Excalidraw is rendered client-side only (client:only="react").
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
