import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * In development the API is served by the Cloudflare Worker on :8787 and
 * proxied here under /api. The browser therefore only ever talks to a single
 * origin, which keeps cookies, CORS and the hosted preview simple.
 */
const API_TARGET = process.env.VITE_API_TARGET ?? "http://127.0.0.1:8787";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // The hosted preview is served from a generated *.e2b.app domain, so the
    // dev server must accept that Host header.
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/health": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    // The app shipped as a single ~1.2 MB chunk. Splitting the heavy,
    // rarely-changing charting and animation libraries into their own chunks
    // lets the browser cache them separately and keeps the initial route
    // download smaller — which matters on mobile data.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          motion: ["framer-motion"],
          data: ["@tanstack/react-query", "date-fns", "zod"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));
