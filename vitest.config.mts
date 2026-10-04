import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]$/, "");

export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: `${root}/` }] },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,mjs}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
