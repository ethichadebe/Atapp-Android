import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In production nginx serves the build and maps /api/* to the backend with the
// prefix stripped (nginx.conf). The dev server does the same here.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
