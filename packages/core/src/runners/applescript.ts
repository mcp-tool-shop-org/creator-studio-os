import { spawn } from "node:child_process";
import { CreatorStudioError } from "../errors.js";

export interface AppleScriptOptions {
  timeoutMs?: number;
}

export async function runAppleScript(
  script: string,
  opts: AppleScriptOptions = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 30_000;

  return new Promise((resolve, reject) => {
    const child = spawn("osascript", ["-e", script], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(
        new CreatorStudioError(
          "E_OSASCRIPT_FAILED",
          `osascript timed out after ${timeoutMs}ms`,
          "Increase timeout, or check whether FCP is hung / waiting on a dialog.",
        ),
      );
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new CreatorStudioError(
          "E_OSASCRIPT_FAILED",
          `osascript failed to start: ${err.message}`,
          "Is osascript on PATH? It ships with macOS at /usr/bin/osascript.",
        ),
      );
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      const combined = stderr || stdout;
      const denied =
        /not authorized|not allowed assistive access|Application isn.t running/i.test(
          combined,
        );

      reject(
        new CreatorStudioError(
          denied ? "E_AUTOMATION_DENIED" : "E_OSASCRIPT_FAILED",
          `osascript exit ${code}: ${combined.trim() || "no output"}`,
          denied
            ? "Grant Automation permission: System Settings → Privacy & Security → Automation → enable Final Cut Pro for your terminal/Claude."
            : "Inspect the AppleScript snippet; tell-block syntax differs slightly between FCP versions.",
        ),
      );
    });
  });
}

export function escapeAppleScriptString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
