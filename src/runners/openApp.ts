import { spawn } from "node:child_process";
import { CreatorStudioError } from "../errors.js";

export interface OpenOptions {
  appBundleId?: string;
  appPath?: string;
  background?: boolean;
  freshInstance?: boolean;
}

export async function openWithApp(
  filePath: string,
  opts: OpenOptions = {},
): Promise<void> {
  const args: string[] = [];

  if (opts.background) args.push("-g");
  if (opts.freshInstance) args.push("-n");

  if (opts.appBundleId) {
    args.push("-b", opts.appBundleId);
  } else if (opts.appPath) {
    args.push("-a", opts.appPath);
  }

  args.push(filePath);

  return new Promise((resolve, reject) => {
    const child = spawn("open", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      reject(
        new CreatorStudioError(
          "E_FCP_NOT_FOUND",
          `'open' failed: ${err.message}`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new CreatorStudioError(
          "E_FCP_NOT_FOUND",
          `'open' exit ${code}: ${stderr.trim() || "no output"}`,
          "Confirm the target app is installed and the file path exists.",
        ),
      );
    });
  });
}
