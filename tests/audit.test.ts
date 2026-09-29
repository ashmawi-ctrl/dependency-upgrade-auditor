import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { auditUpgrade } from "../src/audit.js";

const tempRoots: string[] = [];

afterEach(async () => {
  for (const root of tempRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("auditUpgrade", () => {
  it("detects a candidate regression without moving caller HEAD", async () => {
    const repo = await createFixtureRepository();
    const baseCommit = git(repo, "rev-parse", "HEAD");

    await writeFile(
      join(repo, "package.json"),
      JSON.stringify({
        name: "fixture",
        version: "1.0.0",
        dependencies: { "demo-lib": "2.0.0" },
      }),
      "utf8",
    );
    await writeFile(join(repo, "state.txt"), "bad\n", "utf8");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "upgrade demo-lib");
    const candidateCommit = git(repo, "rev-parse", "HEAD");
    const originalHead = candidateCommit;

    const result = await auditUpgrade({
      repo,
      baseRef: baseCommit,
      candidateRef: candidateCommit,
      checks: [[process.execPath, "check.mjs"]],
      timeoutMs: 5_000,
    });

    expect(result.verdict).toBe("regression");
    expect(result.baseline.passed).toBe(true);
    expect(result.candidate?.passed).toBe(false);
    expect(result.dependencyChanges).toEqual([
      {
        name: "demo-lib",
        scope: "dependencies",
        kind: "changed",
        before: "1.0.0",
        after: "2.0.0",
      },
    ]);
    expect(git(repo, "rev-parse", "HEAD")).toBe(originalHead);
    expect(
      await readFile(join(repo, "state.txt"), "utf8"),
    ).toBe("bad\n");
  });

  it("stops candidate checks when the baseline is already failing", async () => {
    const repo = await createFixtureRepository("bad\n");
    const baseCommit = git(repo, "rev-parse", "HEAD");

    await writeFile(
      join(repo, "package.json"),
      JSON.stringify({
        name: "fixture",
        version: "1.0.0",
        dependencies: { "demo-lib": "2.0.0" },
      }),
      "utf8",
    );
    git(repo, "add", "package.json");
    git(repo, "commit", "-m", "upgrade dependency");
    const candidateCommit = git(repo, "rev-parse", "HEAD");

    const result = await auditUpgrade({
      repo,
      baseRef: baseCommit,
      candidateRef: candidateCommit,
      checks: [[process.execPath, "check.mjs"]],
      timeoutMs: 5_000,
    });

    expect(result.verdict).toBe("baseline-failed");
    expect(result.candidate).toBeNull();
  });
});

async function createFixtureRepository(
  state = "good\n",
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "upgrade-auditor-test-"));
  tempRoots.push(root);

  git(root, "init");
  git(root, "config", "user.name", "Upgrade Fixture");
  git(root, "config", "user.email", "fixture@example.com");

  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "fixture",
      version: "1.0.0",
      dependencies: { "demo-lib": "1.0.0" },
    }),
    "utf8",
  );
  await writeFile(join(root, "state.txt"), state, "utf8");
  await writeFile(
    join(root, "check.mjs"),
    [
      'import { readFile } from "node:fs/promises";',
      'const state = await readFile("state.txt", "utf8");',
      'process.exit(state.trim() === "good" ? 0 : 1);',
      "",
    ].join("\n"),
    "utf8",
  );
  git(root, "add", ".");
  git(root, "commit", "-m", "baseline");

  return root;
}

function git(repo: string, ...args: string[]): string {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
  }).trim();
}
