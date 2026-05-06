import { runAppleScript } from "@creator-studio-os/core";
import { spawn } from "node:child_process";
import { CreatorStudioError } from "@creator-studio-os/core";
import { loadConfig } from "@creator-studio-os/core";

export async function isMotionRunning(): Promise<boolean> {
  const cfg = loadConfig();
  const script = `tell application "System Events"
  return (exists (process 1 where bundle identifier = "${cfg.motionBundleId}"))
end tell`;
  const raw = await runAppleScript(script);
  return raw.trim() === "true";
}

export async function openMotion(): Promise<void> {
  const cfg = loadConfig();
  await new Promise<void>((resolve, reject) => {
    const p = spawn("open", ["-b", cfg.motionBundleId], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", (err) =>
      reject(
        new CreatorStudioError(
          "E_MOTION_NOT_FOUND",
          `'open -b ${cfg.motionBundleId}' failed: ${err.message}`,
        ),
      ),
    );
    p.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new CreatorStudioError(
            "E_MOTION_NOT_FOUND",
            `'open' exit ${code}: ${stderr.trim() || "no output"}`,
          ),
        );
    });
  });
}

export async function openMotionTemplate(path: string): Promise<void> {
  const cfg = loadConfig();
  await new Promise<void>((resolve, reject) => {
    const p = spawn("open", ["-b", cfg.motionBundleId, path], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", (err) =>
      reject(
        new CreatorStudioError(
          "E_MOTION_NOT_FOUND",
          `Failed to open ${path}: ${err.message}`,
        ),
      ),
    );
    p.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new CreatorStudioError(
            "E_MOTION_NOT_FOUND",
            `'open' exit ${code}: ${stderr.trim() || "no output"}`,
          ),
        );
    });
  });
}
