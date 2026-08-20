import { defineConfig } from "vitest/config";

/**
 * The tests in this repository are data tests, not DOM tests. They read the
 * three translation bundles and the data layer and assert the things that break
 * silently: a key added to one language and not the others, an empty string, a
 * list whose length drifted, a project id that exists on one side of a map and
 * not the other.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: false,
  },
});
