import { describe, expect, it } from "vitest";
import { runCommand } from "../src/process.js";

describe("runCommand", () => {
  it("records timed out commands separately from ordinary failures", async () => {
    const result = await runCommand(
      [
        process.execPath,
        "-e",
        "setTimeout(() => {}, 1000)",
      ],
      process.cwd(),
      20,
    );

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
  });
});
