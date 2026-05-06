import { runAppleScript } from "@creator-studio-os/core";
import { spawn } from "node:child_process";
import { CreatorStudioError } from "@creator-studio-os/core";
import { loadConfig } from "@creator-studio-os/core";

export async function isPixelmatorRunning(): Promise<boolean> {
  const cfg = loadConfig();
  const script = `tell application "System Events"
  return (exists (process 1 where bundle identifier = "${cfg.pixelmatorBundleId}"))
end tell`;
  const raw = await runAppleScript(script);
  return raw.trim() === "true";
}

export async function openPixelmator(): Promise<void> {
  const cfg = loadConfig();
  const script = `tell application id "${cfg.pixelmatorBundleId}" to activate`;
  await runAppleScript(script);
}

export async function pixelmatorInstalled(): Promise<boolean> {
  const cfg = loadConfig();
  return new Promise((resolve) => {
    const p = spawn(
      "osascript",
      [
        "-e",
        `try
  tell application "Finder" to set _ to (application file id "${cfg.pixelmatorBundleId}") as alias
  return "ok"
on error
  return "missing"
end try`,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    let out = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.on("close", () => resolve(out.trim() === "ok"));
    p.on("error", () => resolve(false));
  });
}
