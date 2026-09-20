import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": { target: "http://localhost:3010", changeOrigin: true },
      "/ws": { target: "ws://localhost:3010", ws: true },
    },
  },
  build: { outDir: "dist", sourcemap: false },
});
