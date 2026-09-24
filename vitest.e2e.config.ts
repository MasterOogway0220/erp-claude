import { defineConfig } from "vitest/config";
import path from "node:path";

// End-to-end checks that drive a real `next dev` server over HTTP. Separate
// from the unit suite: they need a disposable local MariaDB (E2E_DATABASE_URL)
// and take minutes. See e2e/sandbox.e2e.ts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["e2e/**/*.e2e.ts"],
    testTimeout: 180_000,
    hookTimeout: 400_000,
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
