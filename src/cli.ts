#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { auditUpgrade } from "./audit.js";
import { renderJson, renderText } from "./report.js";

export async function main(argv = process.argv.slice(2)): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        base: { type: "string" },
        candidate: { type: "string" },
        check: { type: "string", multiple: true },
        timeout: { type: "string", default: "60000" },
        format: { type: "string", default: "text" },
        output: { type: "string" },
      },
    });
  } catch (error) {
    console.error(`argument error: ${message(error)}`);
    return 2;
  }

  const repo = parsed.positionals[0];
  const base = parsed.values.base;
  const candidate = parsed.values.candidate;
  const rawChecks = parsed.values.check ?? [];
  const format = parsed.values.format;

  if (!repo || !base || !candidate) {
    console.error(
      "usage: dependency-upgrade-auditor <repo> --base REF --candidate REF --check '[\"npm\",\"test\"]'",
    );
    return 2;
  }

  if (format !== "text" && format !== "json") {
    console.error("format must be 'text' or 'json'");
    return 2;
  }

  let checks: string[][];
  try {
    checks = rawChecks.map(parseCommand);
  } catch (error) {
    console.error(`check error: ${message(error)}`);
    return 2;
  }

  const timeoutMs = Number(parsed.values.timeout);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    console.error("timeout must be a positive number of milliseconds");
    return 2;
  }

  try {
    const result = await auditUpgrade({
      repo,
      baseRef: base,
      candidateRef: candidate,
      checks,
      timeoutMs,
    });
    const rendered = format === "json"
      ? renderJson(result)
      : renderText(result);

    if (parsed.values.output) {
      await mkdir(dirname(parsed.values.output), { recursive: true });
      await writeFile(parsed.values.output, rendered + "\n", "utf8");
    }

    console.log(rendered);
    return result.verdict === "candidate-pass" ? 0 : 1;
  } catch (error) {
    console.error(`audit error: ${message(error)}`);
    return 2;
  }
}

function parseCommand(raw: string): string[] {
  const value: unknown = JSON.parse(raw);

  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((part) => typeof part !== "string" || part.length === 0)
  ) {
    throw new Error(
      "each --check must be a JSON array of non-empty strings",
    );
  }

  return value as string[];
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}
