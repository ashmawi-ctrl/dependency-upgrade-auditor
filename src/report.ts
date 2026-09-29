import type { AuditResult, CommandResult } from "./types.js";

export function renderJson(result: AuditResult): string {
  return JSON.stringify(result, null, 2);
}

export function renderText(result: AuditResult): string {
  const lines = [
    `verdict: ${result.verdict}`,
    `base: ${result.baseCommit}`,
    `candidate: ${result.candidateCommit}`,
    "",
    "dependency changes:",
  ];

  if (result.dependencyChanges.length === 0) {
    lines.push("- none");
  } else {
    for (const change of result.dependencyChanges) {
      lines.push(
        `- [${change.scope}] ${change.name}: ${displayVersion(change.before)} -> ${displayVersion(change.after)} (${change.kind})`,
      );
    }
  }

  lines.push("", "baseline checks:");
  appendChecks(lines, result.baseline.checks);

  if (result.candidate === null) {
    lines.push("", "candidate checks: skipped because baseline failed");
  } else {
    lines.push("", "candidate checks:");
    appendChecks(lines, result.candidate.checks);
  }

  return lines.join("\n");
}

function appendChecks(
  lines: string[],
  checks: CommandResult[],
): void {
  for (const check of checks) {
    const state = check.timedOut
      ? "timeout"
      : check.exitCode === 0
        ? "pass"
        : "fail";

    lines.push(
      `- ${state} exit=${check.exitCode ?? "none"} duration=${check.durationMs.toFixed(1)}ms command=${JSON.stringify(check.command)}`,
    );
  }
}

function displayVersion(value: string | null): string {
  return value ?? "<missing>";
}
