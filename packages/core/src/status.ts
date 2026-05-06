/**
 * csos_app_status — unified app health surface for all 8 Creator Studio apps.
 *
 * Each app implements the AppStatusProvider interface. A single `getAppStatus(app)`
 * call dispatches to the right provider. Dry-run mode returns fixture shapes safe for
 * CI without live apps present.
 *
 * Adding a new app: add its AppName variant, implement a provider, register it in
 * PROVIDERS, add a fixture at tests/fixtures/app-status/<app>.json.
 */

import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runAppleScript } from "./runners/applescript.js";
import { loadConfig } from "./config.js";

const execFile = promisify(_execFile);

// ── Public types ──────────────────────────────────────────────────────────────

export type AppName =
  | "fcp"
  | "compressor"
  | "motion"
  | "logic"
  | "pixelmator"
  | "keynote"
  | "pages"
  | "numbers";

export const ALL_APP_NAMES: AppName[] = [
  "fcp", "compressor", "motion", "logic",
  "pixelmator", "keynote", "pages", "numbers",
];

export interface AppStatus {
  app: AppName;
  /** Whether the OS process is currently running */
  running: boolean;
  /** Running and responded to health probe within 3 s */
  healthy: boolean;
  /** CFBundleShortVersionString from Info.plist; undefined if app not installed */
  version?: string;
  /** Name of front document (where AppleScript supports it) */
  frontDocument?: string;
  /** Compressor-only: number of non-terminal jobs visible in the queue */
  queueDepth?: number;
  /** Compressor-only: number of currently-active (encoding) jobs */
  inFlightJobs?: number;
  /** Set when healthy=false and a specific error message is available */
  lastError?: string;
}

export interface AppStatusProvider {
  name: AppName;
  appPath: string;
  bundleId: string;
  getStatus(): Promise<AppStatus>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readAppVersion(appPath: string): Promise<string | undefined> {
  try {
    const plistPath = `${appPath}/Contents/Info.plist`;
    const { stdout } = await execFile(
      "/usr/libexec/PlistBuddy",
      ["-c", "Print CFBundleShortVersionString", plistPath],
      { timeout: 3000 },
    );
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function isProcessRunning(bundleId: string): Promise<boolean> {
  try {
    const script = `tell application "System Events"
  return (exists (process 1 where bundle identifier = "${bundleId}"))
end tell`;
    const raw = await runAppleScript(script, { timeoutMs: 3000 });
    return raw.trim() === "true";
  } catch {
    return false;
  }
}

async function getFrontDocumentName(bundleId: string): Promise<string | undefined> {
  try {
    const script = `tell application id "${bundleId}"
  try
    return name of front document
  on error
    return ""
  end try
end tell`;
    const raw = await runAppleScript(script, { timeoutMs: 3000 });
    const name = raw.trim();
    return name || undefined;
  } catch {
    return undefined;
  }
}

// ── Per-app providers ─────────────────────────────────────────────────────────

async function fcpStatus(): Promise<AppStatus> {
  const cfg = loadConfig();
  const app: AppName = "fcp";
  const version = await readAppVersion(cfg.fcpAppPath);
  const running = await isProcessRunning(cfg.fcpBundleId);
  if (!running) return { app, running: false, healthy: false, version };

  try {
    const frontDocument = await getFrontDocumentName(cfg.fcpBundleId);
    return { app, running: true, healthy: true, version, frontDocument };
  } catch (e) {
    return { app, running: true, healthy: false, version, lastError: String(e) };
  }
}

async function compressorStatus(): Promise<AppStatus> {
  const cfg = loadConfig();
  const app: AppName = "compressor";
  const version = await readAppVersion(cfg.compressorAppPath);
  const running = await isProcessRunning(cfg.compressorBundleId);
  if (!running) return { app, running: false, healthy: false, version };

  // Quick monitor snapshot: spawn with 2s hard timeout, collect any frames
  try {
    const result = await new Promise<{ queueDepth: number; inFlightJobs: number }>(
      (resolve) => {
        const child = _execFile(
          cfg.compressorBinaryPath,
          ["-monitor", "-format", "json"],
          { timeout: 2500 },
          (_err, stdout) => {
            let queueDepth = 0;
            let inFlightJobs = 0;
            const lines = stdout.split("\n");
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("{")) continue;
              try {
                const obj = JSON.parse(t) as Record<string, unknown>;
                const status = String(obj.status ?? "").toLowerCase();
                queueDepth++;
                if (status === "active" || status === "encoding" || status === "transcoding") {
                  inFlightJobs++;
                }
              } catch { /* malformed line */ }
            }
            resolve({ queueDepth, inFlightJobs });
          },
        );
        // Ensure the child is killed after 2.5s regardless
        setTimeout(() => { try { child.kill(); } catch { /* already done */ } }, 2500);
      },
    );
    return { app, running: true, healthy: true, version, ...result };
  } catch (e) {
    return {
      app, running: true, healthy: false, version,
      lastError: e instanceof Error ? e.message : String(e),
    };
  }
}

async function motionStatus(): Promise<AppStatus> {
  const cfg = loadConfig();
  const app: AppName = "motion";
  const version = await readAppVersion(cfg.motionAppPath);
  const running = await isProcessRunning(cfg.motionBundleId);
  // Motion has no meaningful AppleScript health probe — process existence is sufficient
  return { app, running, healthy: running, version };
}

async function logicStatus(): Promise<AppStatus> {
  const cfg = loadConfig();
  const app: AppName = "logic";
  const version = await readAppVersion(cfg.logicAppPath);
  const running = await isProcessRunning(cfg.logicBundleId);
  // Logic has no sdef automation surface — process existence is sufficient
  return { app, running, healthy: running, version };
}

async function pixelmatorStatus(): Promise<AppStatus> {
  const cfg = loadConfig();
  const app: AppName = "pixelmator";
  const version = await readAppVersion(cfg.pixelmatorAppPath);
  const running = await isProcessRunning(cfg.pixelmatorBundleId);
  if (!running) return { app, running: false, healthy: false, version };

  try {
    const frontDocument = await getFrontDocumentName(cfg.pixelmatorBundleId);
    return { app, running: true, healthy: true, version, frontDocument };
  } catch (e) {
    return { app, running: true, healthy: false, version, lastError: String(e) };
  }
}

async function iworkStatus(
  app: AppName,
  appPath: string,
  bundleId: string,
): Promise<AppStatus> {
  const version = await readAppVersion(appPath);
  const running = await isProcessRunning(bundleId);
  if (!running) return { app, running: false, healthy: false, version };

  try {
    const frontDocument = await getFrontDocumentName(bundleId);
    return { app, running: true, healthy: true, version, frontDocument };
  } catch (e) {
    return { app, running: true, healthy: false, version, lastError: String(e) };
  }
}

// ── Dry-run fixture loader ────────────────────────────────────────────────────

function fixtureDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/apps/ → ../../tests/fixtures/app-status/
  return join(here, "..", "..", "tests", "fixtures", "app-status");
}

async function loadFixture(app: AppName): Promise<AppStatus> {
  try {
    const raw = await readFile(join(fixtureDir(), `${app}.json`), "utf-8");
    return JSON.parse(raw) as AppStatus;
  } catch {
    // Fallback synthetic fixture if file is missing
    return { app, running: false, healthy: false };
  }
}

// ── Public dispatcher ─────────────────────────────────────────────────────────

/**
 * Return the current status of one Creator Studio app.
 *
 * @param app  One of the 8 AppName values
 * @param opts `dryRun: true` returns a fixture shape without calling any real apps — safe for CI
 */
export async function getAppStatus(
  app: AppName,
  opts: { dryRun?: boolean } = {},
): Promise<AppStatus> {
  if (opts.dryRun) return loadFixture(app);

  const cfg = loadConfig();
  switch (app) {
    case "fcp":        return fcpStatus();
    case "compressor": return compressorStatus();
    case "motion":     return motionStatus();
    case "logic":      return logicStatus();
    case "pixelmator": return pixelmatorStatus();
    case "keynote":    return iworkStatus("keynote", cfg.keynoteAppPath, cfg.keynoteBundleId);
    case "pages":      return iworkStatus("pages", cfg.pagesAppPath, cfg.pagesBundleId);
    case "numbers":    return iworkStatus("numbers", cfg.numbersAppPath, cfg.numbersBundleId);
  }
}

/**
 * Return status for all 8 apps in parallel.
 * In dry-run mode all 8 fixtures are loaded; otherwise all 8 probes run concurrently.
 */
export async function getAllAppStatus(
  opts: { dryRun?: boolean } = {},
): Promise<AppStatus[]> {
  return Promise.all(ALL_APP_NAMES.map((a) => getAppStatus(a, opts)));
}
