import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["src/**/*.test.js", "server/tests/rules.test.js"] },
});
