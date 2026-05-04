#!/usr/bin/env node
import { verify, formatVerify } from "./verify.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HELP = `creator-studio-os — MCP control plane for Apple Creator Studio apps

Usage:
  creator-studio-os <command>

Commands:
  verify           Run preflight checks (platform, osascript, xmllint, FCP, DTD, data dir, FCPXML round-trip)
  serve            Start the MCP server on stdio (same as the default 'creator-studio-os' bin)
  version          Print version
  help             Show this message

Environment:
  CREATOR_STUDIO_DATA_DIR    Override data directory (default: /Volumes/T9-Shared/AI/creator-studio)
  CREATOR_STUDIO_FCP_PATH    Override Final Cut Pro app path
  CREATOR_STUDIO_FCP_DTD     Override FCPXML 1.13 DTD path

Threat model:
  Runs AppleScript on the user's machine and writes files to CREATOR_STUDIO_DATA_DIR.
  Reads bundled DTDs from the FCP app for offline validation. No network calls.
  See SECURITY.md for the full model.
`;

function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function main() {
  const cmd = process.argv[2] ?? "help";

  switch (cmd) {
    case "verify": {
      const result = await verify();
      console.log(formatVerify(result));
      process.exit(result.ok ? 0 : 1);
    }
    case "serve": {
      await import("./server.js");
      return;
    }
    case "version":
    case "--version":
    case "-v": {
      console.log(readVersion());
      return;
    }
    case "help":
    case "--help":
    case "-h": {
      console.log(HELP);
      return;
    }
    default: {
      console.error(`Unknown command: ${cmd}\n`);
      console.error(HELP);
      process.exit(2);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
