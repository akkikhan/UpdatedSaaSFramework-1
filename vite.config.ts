import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// ❌ REMOVED: Replit plugins causing local development issues
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    // ❌ REMOVED: runtimeErrorOverlay() - Replit-specific plugin
    // ❌ REMOVED: Replit cartographer plugin - cloud environment only
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      "@saas-framework/auth-client": path.resolve(
        import.meta.dirname,
        "packages",
        "auth-client",
        "dist",
        "index.js"
      ),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1", // ✅ LOCAL: Bind to localhost for local development
    port: 3000, // ✅ LOCAL: Fixed port for Vite dev server
    strictPort: false, // ✅ LOCAL: Allow port fallback if busy
    fs: {
      strict: false, // ✅ LOCAL: Less restrictive for local development
      allow: [".."], // ✅ LOCAL: Allow parent directory access
    },
  },
});
