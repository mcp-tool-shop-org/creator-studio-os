import { runAppleScript } from "@creator-studio-os/core";
import { spawn } from "node:child_process";
import { CreatorStudioError } from "@creator-studio-os/core";
import { loadConfig } from "@creator-studio-os/core";

const COMPRESSOR_BUNDLE_ID = "com.apple.CompressorApp";

export async function isCompressorRunning(): Promise<boolean> {
  const script = `tell application "System Events"
  return (exists (process 1 where bundle identifier = "${COMPRESSOR_BUNDLE_ID}"))
end tell`;
  const raw = await runAppleScript(script);
  return raw.trim() === "true";
}

export async function openCompressor(): Promise<void> {
  const cfg = loadConfig();
  await new Promise<void>((resolve, reject) => {
    const p = spawn("open", ["-b", cfg.compressorBundleId], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", (err) =>
      reject(
        new CreatorStudioError(
          "E_COMPRESSOR_NOT_FOUND",
          `'open -b ${cfg.compressorBundleId}' failed: ${err.message}`,
        ),
      ),
    );
    p.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new CreatorStudioError(
            "E_COMPRESSOR_NOT_FOUND",
            `'open' exit ${code}: ${stderr.trim() || "no output"}`,
            "Confirm Compressor is installed; default path is /Applications/Compressor Creator Studio.app",
          ),
        );
    });
  });
}
