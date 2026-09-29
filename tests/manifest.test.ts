import { describe, expect, it } from "vitest";
import { diffDependencies } from "../src/manifest.js";

describe("diffDependencies", () => {
  it("reports changed, added, and removed declarations", () => {
    const changes = diffDependencies(
      {
        dependencies: {
          fastify: "^4.0.0",
          zod: "^3.0.0",
        },
        devDependencies: {
          vitest: "^2.0.0",
        },
      },
      {
        dependencies: {
          fastify: "^5.0.0",
          undici: "^7.0.0",
        },
        devDependencies: {
          vitest: "^2.0.0",
        },
      },
    );

    expect(changes).toEqual([
      {
        name: "fastify",
        scope: "dependencies",
        kind: "changed",
        before: "^4.0.0",
        after: "^5.0.0",
      },
      {
        name: "undici",
        scope: "dependencies",
        kind: "added",
        before: null,
        after: "^7.0.0",
      },
      {
        name: "zod",
        scope: "dependencies",
        kind: "removed",
        before: "^3.0.0",
        after: null,
      },
    ]);
  });

  it("omits unchanged dependencies", () => {
    expect(
      diffDependencies(
        { dependencies: { zod: "^3.0.0" } },
        { dependencies: { zod: "^3.0.0" } },
      ),
    ).toEqual([]);
  });
});
