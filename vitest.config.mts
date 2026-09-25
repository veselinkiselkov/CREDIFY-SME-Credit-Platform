import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Test configuration.
 *
 * Vitest is a DEV dependency only: it never appears in the production build and cannot
 * reach the client bundle. It is used rather than Node's built-in runner so that test files
 * can import through the same "@/..." alias the application uses, which keeps the engine's
 * own imports idiomatic.
 *
 * Only the credit engine and its sample data are covered. That is deliberate: the value of
 * a test here is that it pins down a number an analyst will rely on.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
