import { readFile } from "node:fs/promises";
import type {
  DependencyChange,
  DependencyScope,
} from "./types.js";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export async function readPackageJson(path: string): Promise<PackageJson> {
  const raw = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("package.json must contain a JSON object");
  }

  return parsed as PackageJson;
}

export function diffDependencies(
  baseline: PackageJson,
  candidate: PackageJson,
): DependencyChange[] {
  return [
    ...diffScope(
      "dependencies",
      baseline.dependencies ?? {},
      candidate.dependencies ?? {},
    ),
    ...diffScope(
      "devDependencies",
      baseline.devDependencies ?? {},
      candidate.devDependencies ?? {},
    ),
  ].sort((left, right) => {
    const scopeCompare = left.scope.localeCompare(right.scope);
    return scopeCompare || left.name.localeCompare(right.name);
  });
}

function diffScope(
  scope: DependencyScope,
  before: Record<string, string>,
  after: Record<string, string>,
): DependencyChange[] {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: DependencyChange[] = [];

  for (const name of names) {
    const oldVersion = before[name] ?? null;
    const newVersion = after[name] ?? null;

    if (oldVersion === newVersion) {
      continue;
    }

    let kind: DependencyChange["kind"];
    if (oldVersion === null) {
      kind = "added";
    } else if (newVersion === null) {
      kind = "removed";
    } else {
      kind = "changed";
    }

    changes.push({
      name,
      scope,
      kind,
      before: oldVersion,
      after: newVersion,
    });
  }

  return changes;
}
