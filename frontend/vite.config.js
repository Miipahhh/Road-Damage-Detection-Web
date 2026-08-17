import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    https: false,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/storage": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/yolo": {
        target: "https://ryumarz-road-damage-api.hf.space",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yolo/, ""),
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "leaflet",
      "react-leaflet",
      "chart.js",
      "react-chartjs-2",
      "lucide-react",
      "date-fns",
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "leaflet-vendor": ["leaflet", "react-leaflet"],
          "chart-vendor": ["chart.js", "react-chartjs-2"],
          "ui-vendor": ["lucide-react", "axios", "date-fns"],
        },
      },
    },
  },
});

