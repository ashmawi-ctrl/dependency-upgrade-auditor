import { spawn } from "node:child_process";
import type { CommandResult } from "./types.js";

export async function runCommand(
  command: string[],
  cwd: string,
  timeoutMs: number,
): Promise<CommandResult> {
  if (command.length === 0 || command.some((part) => part.length === 0)) {
    throw new Error("verification command must contain non-empty arguments");
  }
  if (timeoutMs <= 0) {
    throw new Error("timeout must be greater than zero");
  }

  const started = process.hrtime.bigint();

  return await new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      resolve({
        command,
        exitCode: timedOut ? null : code,
        stdout,
        stderr,
        durationMs,
        timedOut,
      });
    });
  });
}
