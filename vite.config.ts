import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router"],
          "state-vendor": [
            "@tanstack/react-query",
            "@reduxjs/toolkit",
            "react-redux",
          ],
          "form-vendor": ["react-hook-form", "@hookform/resolvers/zod", "zod"],
        },
      },
    },
  },
});
