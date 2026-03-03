import { defineConfig } from "vite";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ["src/**/*.ts", "src/**/*.vue"],
      outDir: "dist",
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        vue: resolve(__dirname, "src/vue.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      external: ["vue", "vue-router", "axios"],
      output: {
        globals: {
          vue: "Vue",
          "vue-router": "VueRouter",
          axios: "axios",
        },
      },
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
