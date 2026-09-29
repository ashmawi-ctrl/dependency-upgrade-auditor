export type DependencyScope = "dependencies" | "devDependencies";
export type DependencyChangeKind = "added" | "removed" | "changed";

export interface DependencyChange {
  name: string;
  scope: DependencyScope;
  kind: DependencyChangeKind;
  before: string | null;
  after: string | null;
}

export interface CommandResult {
  command: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface RevisionResult {
  commit: string;
  checks: CommandResult[];
  passed: boolean;
}

export type AuditVerdict =
  | "candidate-pass"
  | "regression"
  | "baseline-failed";

export interface AuditResult {
  baseCommit: string;
  candidateCommit: string;
  dependencyChanges: DependencyChange[];
  baseline: RevisionResult;
  candidate: RevisionResult | null;
  verdict: AuditVerdict;
}
