import { spawn } from "node:child_process";
import {
  runAppleScript,
  escapeAppleScriptString,
} from "../runners/applescript.js";
import { CreatorStudioError, type ErrorCode } from "../errors.js";

export interface IWorkAppConfig {
  bundleId: string;
  appPath: string;
  notFoundCode: ErrorCode;
}

export async function isAppRunning(bundleId: string): Promise<boolean> {
  const script = `tell application "System Events"
  return (exists (process 1 where bundle identifier = "${bundleId}"))
end tell`;
  const raw = await runAppleScript(script);
  return raw.trim() === "true";
}

export async function activateApp(bundleId: string): Promise<void> {
  await runAppleScript(`tell application id "${bundleId}" to activate`);
}

export async function openDocumentInApp(
  bundleId: string,
  path: string,
): Promise<{ name: string }> {
  const escaped = escapeAppleScriptString(path);
  const script = `tell application id "${bundleId}"
  activate
  open POSIX file "${escaped}"
  delay 1.5
  return name of front document
end tell`;
  const name = await runAppleScript(script, { timeoutMs: 60_000 });
  return { name: name.trim() };
}

export async function closeDocumentInApp(
  bundleId: string,
  name: string,
  saving: "yes" | "no" | "ask" = "no",
): Promise<void> {
  const escaped = escapeAppleScriptString(name);
  const script = `tell application id "${bundleId}" to close document "${escaped}" saving ${saving}`;
  await runAppleScript(script);
}

export interface ExportArgs {
  bundleId: string;
  documentName: string;
  outputPath: string;
  formatLiteral: string; // exact AppleScript enumerator, e.g. "PDF" or "slide images"
  withPropertiesRecord?: string; // e.g. '{image format:PNG}' — optional record body
}

export async function exportDocumentInApp(args: ExportArgs): Promise<void> {
  const docName = escapeAppleScriptString(args.documentName);
  const out = escapeAppleScriptString(args.outputPath);
  const props = args.withPropertiesRecord
    ? ` with properties ${args.withPropertiesRecord}`
    : "";
  const script = `tell application id "${args.bundleId}"
  tell document "${docName}" to export to (POSIX file "${out}") as ${args.formatLiteral}${props}
end tell`;
  await runAppleScript(script, { timeoutMs: 120_000 });
}

export async function appInstalled(
  bundleId: string,
  notFoundCode: ErrorCode,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(
      "osascript",
      [
        "-e",
        `try
  tell application "Finder" to set _ to (application file id "${bundleId}") as alias
  return "ok"
on error
  return "missing"
end try`,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    let out = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.on("close", () => {
      if (out.trim() === "ok") resolve();
      else
        reject(
          new CreatorStudioError(
            notFoundCode,
            `App with bundle id ${bundleId} not installed`,
          ),
        );
    });
    p.on("error", () =>
      reject(
        new CreatorStudioError(
          notFoundCode,
          `Failed to query bundle id ${bundleId}`,
        ),
      ),
    );
  });
}
