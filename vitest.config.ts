import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@creator-studio-os/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@creator-studio-os/fcp": fileURLToPath(new URL("./packages/fcp/src/index.ts", import.meta.url)),
      "@creator-studio-os/compressor": fileURLToPath(new URL("./packages/compressor/src/index.ts", import.meta.url)),
      "@creator-studio-os/motion": fileURLToPath(new URL("./packages/motion/src/index.ts", import.meta.url)),
      "@creator-studio-os/pixelmator": fileURLToPath(new URL("./packages/pixelmator/src/index.ts", import.meta.url)),
      "@creator-studio-os/logic": fileURLToPath(new URL("./packages/logic/src/index.ts", import.meta.url)),
      "@creator-studio-os/keynote": fileURLToPath(new URL("./packages/keynote/src/index.ts", import.meta.url)),
      "@creator-studio-os/iwork-docs": fileURLToPath(new URL("./packages/iwork-docs/src/index.ts", import.meta.url)),
      "@creator-studio-os/protocols": fileURLToPath(new URL("./packages/protocols/src/index.ts", import.meta.url)),
    },
  },
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"],
    exclude: ["**/._*", "**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json"],
      include: ["packages/*/src/**/*.ts", "apps/*/src/**/*.ts"],
    },
  },
});
