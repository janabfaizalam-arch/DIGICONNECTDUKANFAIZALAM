import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    /*
      Two suites, one command.

      The desktop Print Station is plain ESM rather than TypeScript — it runs
      on a shop's counter PC with nothing installed — but its decisions about
      whose job to print and when to give up are exactly the kind that must
      not rot, so they are tested alongside everything else.
    */
    include: ["src/**/*.test.ts", "print-station/**/*.test.mjs"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/stubs/server-only.ts"),
    },
  },
});
