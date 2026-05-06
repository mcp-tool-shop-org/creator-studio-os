import { runAppleScript } from "@creator-studio-os/core";
import { spawn } from "node:child_process";
import { CreatorStudioError } from "@creator-studio-os/core";
import { loadConfig } from "@creator-studio-os/core";

export async function isLogicRunning(): Promise<boolean> {
  const cfg = loadConfig();
  const script = `tell application "System Events"
  return (exists (process 1 where bundle identifier = "${cfg.logicBundleId}"))
end tell`;
  const raw = await runAppleScript(script);
  return raw.trim() === "true";
}

export async function openLogic(): Promise<void> {
  const cfg = loadConfig();
  await new Promise<void>((resolve, reject) => {
    const p = spawn("open", ["-b", cfg.logicBundleId], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", (err) =>
      reject(
        new CreatorStudioError(
          "E_LOGIC_NOT_FOUND",
          `'open -b ${cfg.logicBundleId}' failed: ${err.message}`,
        ),
      ),
    );
    p.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new CreatorStudioError(
            "E_LOGIC_NOT_FOUND",
            `'open' exit ${code}: ${stderr.trim() || "no output"}`,
            "Confirm Logic Pro is installed; default path is /Applications/Logic Pro Creator Studio.app",
          ),
        );
    });
  });
}

export async function openLogicProject(path: string): Promise<void> {
  const cfg = loadConfig();
  await new Promise<void>((resolve, reject) => {
    const p = spawn("open", ["-b", cfg.logicBundleId, path], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", (err) =>
      reject(
        new CreatorStudioError(
          "E_LOGIC_NOT_FOUND",
          `Failed to open ${path}: ${err.message}`,
        ),
      ),
    );
    p.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new CreatorStudioError(
            "E_LOGIC_NOT_FOUND",
            `'open' exit ${code}: ${stderr.trim() || "no output"}`,
          ),
        );
    });
  });
}
