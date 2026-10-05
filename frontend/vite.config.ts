import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In production nginx serves the build and maps /api/* to the backend with the
// prefix stripped (nginx.conf). The dev server does the same here.
export default defineConfig({
  plugins: [react()],
  build: {
    // Never inline small assets as data: URLs. The content security policy
    // (nginx-security-headers.conf) allows images from this site only, so an
    // inlined icon would be blocked — the dancer's tab icon would never show.
    assetsInlineLimit: 0,
  },
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
