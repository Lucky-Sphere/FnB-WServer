import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "terminal-label",
      configureServer() { console.log("\n\x1b[44m\x1b[30m  FNB CASHIER  \x1b[0m\n"); },
    },
  ],
  server: { port: 5175, proxy: { "/api": "http://localhost:20080" } },
});
