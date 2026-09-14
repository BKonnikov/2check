import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      // NodeNext output needs ".js" specifiers; tests resolve them back to sources.
      { find: /^(\.{1,2}\/.*)\.js$/, replacement: "$1" },
      {
        find: "@2check/contracts",
        replacement: fileURLToPath(new URL("../contracts/src/index.ts", import.meta.url)),
      },
    ],
  },
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
