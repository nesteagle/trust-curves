import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/trust-curves/",
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 250,
    },
    hmr: {
      host: "localhost",
      clientPort: 5173,
      port: 5173,
    },
    host: "0.0.0.0",
    strictPort: true,
  },
});
