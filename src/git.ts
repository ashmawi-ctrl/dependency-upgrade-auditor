import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function ensureGitRepository(repo: string): Promise<string> {
  const resolved = resolve(repo);
  const { stdout } = await git(resolved, [
    "rev-parse",
    "--show-toplevel",
  ]);
  return resolve(stdout.trim());
}

export async function resolveCommit(
  repo: string,
  ref: string,
): Promise<string> {
  const { stdout } = await git(repo, [
    "rev-parse",
    "--verify",
    `${ref}^{commit}`,
  ]);
  return stdout.trim();
}

export async function readFileAtCommit(
  repo: string,
  commit: string,
  path: string,
): Promise<string> {
  const { stdout } = await git(repo, [
    "show",
    `${commit}:${path}`,
  ]);
  return stdout;
}

export async function withDetachedWorktree<T>(
  repo: string,
  commit: string,
  callback: (worktree: string) => Promise<T>,
): Promise<T> {
  const tempRoot = await mkdtemp(join(tmpdir(), "dependency-audit-"));
  const worktree = join(tempRoot, "repo");

  await git(repo, [
    "worktree",
    "add",
    "--detach",
    worktree,
    commit,
  ]);

  try {
    return await callback(worktree);
  } finally {
    try {
      await git(repo, [
        "worktree",
        "remove",
        "--force",
        worktree,
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }
}

async function git(
  repo: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync("git", ["-C", repo, ...args], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "stderr" in error
    ) {
      const stderr = String(error.stderr).trim();
      throw new Error(stderr || "git command failed");
    }
    throw error;
  }
}
