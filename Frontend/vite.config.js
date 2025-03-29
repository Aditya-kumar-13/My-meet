import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills"; // Named import

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  define: {
    global: "window",
  },
  resolve: {
    alias: {
      util: "rollup-plugin-node-polyfills/polyfills/util",
      events: "rollup-plugin-node-polyfills/polyfills/events",
    },
  },
});
