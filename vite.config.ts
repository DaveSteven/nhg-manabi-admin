import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react-swc";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
  ],
  server: {
    /** 5173 clashes with nhg-manabi-web's dev server; use 5180. */
    port: 5180,
    /**
     * Same-origin `/api` proxy to the real backend (nhg-manabi-api) in dev.
     * Avoids CORS entirely and keeps `API_BASE_URL` empty; MSW still
     * intercepts matching paths when mocking is enabled.
     */
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes("node_modules/antd")) {
            return "vendor-antd";
          }
          if (id.includes("@tanstack/react-router") || id.includes("@tanstack/react-query")) {
            return "vendor-tanstack";
          }
          if (id.includes("lucide-react")) {
            return "vendor-ui";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1024,
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
});
