import { runAppleScript } from "@creator-studio-os/core";
import { spawn } from "node:child_process";

const FCP = `application id "com.apple.FinalCutApp"`;

export async function isFcpRunning(): Promise<boolean> {
  const script = `tell application "System Events"
  return (exists (process 1 where bundle identifier = "com.apple.FinalCutApp"))
end tell`;
  const raw = await runAppleScript(script);
  return raw.trim() === "true";
}

export async function openFcp(): Promise<void> {
  await runAppleScript(`tell ${FCP} to activate`);
}

export async function activateFcp(): Promise<void> {
  await runAppleScript(`tell ${FCP} to activate`);
}

export async function fcpInstalled(bundleId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn(
      "osascript",
      [
        "-e",
        `try
  tell application "Finder" to set p to (application file id "${bundleId}") as alias
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
