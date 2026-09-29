import {
  ensureGitRepository,
  readFileAtCommit,
  resolveCommit,
  withDetachedWorktree,
} from "./git.js";
import { diffDependencies } from "./manifest.js";
import { runCommand } from "./process.js";
import type {
  AuditResult,
  CommandResult,
  RevisionResult,
} from "./types.js";

export interface AuditOptions {
  repo: string;
  baseRef: string;
  candidateRef: string;
  checks: string[][];
  timeoutMs?: number;
}

export async function auditUpgrade(
  options: AuditOptions,
): Promise<AuditResult> {
  if (options.checks.length === 0) {
    throw new Error("at least one verification command is required");
  }

  const timeoutMs = options.timeoutMs ?? 60_000;
  if (timeoutMs <= 0) {
    throw new Error("timeout must be greater than zero");
  }

  const repo = await ensureGitRepository(options.repo);
  const baseCommit = await resolveCommit(repo, options.baseRef);
  const candidateCommit = await resolveCommit(repo, options.candidateRef);

  if (baseCommit === candidateCommit) {
    throw new Error("base and candidate resolve to the same commit");
  }

  const baselineManifest = parsePackageJson(
    await readFileAtCommit(repo, baseCommit, "package.json"),
  );
  const candidateManifest = parsePackageJson(
    await readFileAtCommit(repo, candidateCommit, "package.json"),
  );
  const dependencyChanges = diffDependencies(
    baselineManifest,
    candidateManifest,
  );

  const baseline = await runRevision(
    repo,
    baseCommit,
    options.checks,
    timeoutMs,
  );

  if (!baseline.passed) {
    return {
      baseCommit,
      candidateCommit,
      dependencyChanges,
      baseline,
      candidate: null,
      verdict: "baseline-failed",
    };
  }

  const candidate = await runRevision(
    repo,
    candidateCommit,
    options.checks,
    timeoutMs,
  );

  return {
    baseCommit,
    candidateCommit,
    dependencyChanges,
    baseline,
    candidate,
    verdict: candidate.passed ? "candidate-pass" : "regression",
  };
}

async function runRevision(
  repo: string,
  commit: string,
  checks: string[][],
  timeoutMs: number,
): Promise<RevisionResult> {
  return await withDetachedWorktree(repo, commit, async (worktree) => {
    const results: CommandResult[] = [];

    for (const command of checks) {
      results.push(await runCommand(command, worktree, timeoutMs));
    }

    return {
      commit,
      checks: results,
      passed: results.every(
        (result) => !result.timedOut && result.exitCode === 0,
      ),
    };
  });
}

function parsePackageJson(raw: string): object {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("package.json must contain a JSON object");
  }
  return value;
}
