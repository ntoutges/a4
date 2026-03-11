import { defineConfig } from "vite";

export default defineConfig({
    root: "./example",
    build: {
        outDir: "../dist",
        emptyOutDir: true,
    },
});
