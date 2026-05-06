#!/usr/bin/env node
import { verify, formatVerify } from "./verify.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HELP = `creator-studio-os — MCP control plane for Apple Creator Studio apps

Usage:
  creator-studio-os <command>

Commands:
  verify              Run preflight checks (platform, osascript, xmllint, FCP, DTD, data dir, FCPXML round-trip)
  smoke               Run the v1.7.0 integration smoke matrix (8 phases, real apps required)
  doctor              One-shot diagnostic dump — app versions, queue state, tool-compass, data dir
  ledger <project>    Read a project's operation ledger (--since 1h, --tool <name>, --errors, --tail N, --json)
  protocol <subcommand>
    protocol list     List all registered cross-app protocols
    protocol describe <name>
                      Describe a protocol's steps and purpose
    protocol run <name> --project <path> [--dry-run] [--resume <taskId>]
                      Run a protocol end-to-end (synchronous; use csos_protocol_run MCP tool for async)
  serve               Start the MCP server on stdio (same as the default 'creator-studio-os' bin)
  version             Print version
  help                Show this message

Smoke flags:
  --ci             Skip human-eye prompts; run only auto-verifiable phases
  --dry-run        Mock all external calls; verify harness shape without real apps

Doctor / ledger flags:
  --json           Emit JSON instead of human-readable output

Protocol flags:
  --project <path>  Absolute path to a project.json v2 file
  --dry-run         Mock all external calls (AppleScript, Compressor, FCP)
  --resume <taskId> Skip steps already completed in a previous run

Environment:
  CREATOR_STUDIO_DATA_DIR    Override data directory (default: /Volumes/T9-Shared/AI/creator-studio)
  CREATOR_STUDIO_FCP_PATH    Override Final Cut Pro app path
  CREATOR_STUDIO_FCP_DTD     Override FCPXML DTD path (default: 1.14, falls back to 1.13)

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
    case "smoke": {
      const { runSmoke } = await import("./smoke/index.js");
      await runSmoke(process.argv.slice(3));
      return;
    }
    case "doctor": {
      const { runDoctor, formatDoctor } = await import("./doctor.js");
      const report = await runDoctor();
      if (process.argv.includes("--json")) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatDoctor(report));
      }
      process.exit(report.ok ? 0 : 1);
    }
    case "ledger": {
      const projectName = process.argv[3];
      if (!projectName || projectName.startsWith("-")) {
        console.error("Usage: creator-studio-os ledger <projectName> [--since 1h] [--tool <name>] [--errors] [--tail N] [--json]");
        process.exit(2);
      }
      const { readLedger, parseSince, formatLedger } = await import("@creator-studio-os/core");
      const args = process.argv.slice(4);
      const jsonMode = args.includes("--json");
      const errorsOnly = args.includes("--errors");
      const sinceArg = args[args.indexOf("--since") + 1];
      const toolArg = args[args.indexOf("--tool") + 1];
      const tailArg = args[args.indexOf("--tail") + 1];
      const result = await readLedger({
        projectName,
        since: sinceArg ? parseSince(sinceArg) : undefined,
        tool: toolArg && !toolArg.startsWith("-") ? toolArg : undefined,
        errorsOnly,
        tail: tailArg && !tailArg.startsWith("-") ? Number(tailArg) : undefined,
      });
      if (jsonMode) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatLedger(result));
      }
      return;
    }
    case "protocol": {
      const sub = process.argv[3];
      if (!sub || sub === "list") {
        const { listProtocols } = await import("@creator-studio-os/protocols");
        const protocols = listProtocols();
        for (const p of protocols) {
          console.log(`${p.name} (${p.stepCount} steps)`);
          console.log(`  ${p.description}\n`);
        }
        return;
      }
      if (sub === "describe") {
        const protoName = process.argv[4];
        if (!protoName) {
          console.error("Usage: creator-studio-os protocol describe <name>");
          process.exit(2);
        }
        const { describeProtocol } = await import("@creator-studio-os/protocols");
        try {
          const info = describeProtocol(protoName);
          console.log(`Protocol: ${info.name}`);
          console.log(`Description: ${info.description}`);
          console.log(`Steps (${info.stepNames.length}):`);
          info.stepNames.forEach((s: string, i: number) => console.log(`  ${i + 1}. ${s}`));
        } catch (err) {
          console.error(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
        return;
      }
      if (sub === "run") {
        const protoName = process.argv[4];
        if (!protoName) {
          console.error("Usage: creator-studio-os protocol run <name> --project <path> [--dry-run] [--resume <taskId>]");
          process.exit(2);
        }
        const cliArgs = process.argv.slice(5);
        const projectPath = cliArgs[cliArgs.indexOf("--project") + 1];
        if (!projectPath || projectPath.startsWith("-")) {
          console.error("--project <path> is required");
          process.exit(2);
        }
        const dryRun = cliArgs.includes("--dry-run");
        const resumeIdx = cliArgs.indexOf("--resume");
        const resume = resumeIdx >= 0 ? cliArgs[resumeIdx + 1] : undefined;
        const { runProtocol } = await import("@creator-studio-os/protocols");
        let stepCount = 0;
        let failCount = 0;
        const startTime = Date.now();
        try {
          for await (const step of runProtocol({ name: protoName, projectPath, dryRun, resume })) {
            stepCount++;
            const icon = step.status === "completed" ? "✓" : step.status === "skipped" ? "↩" : step.status === "failed" ? "✗" : "…";
            console.log(`  ${icon} [${stepCount.toString().padStart(2, "0")}] ${step.stepName} (${step.durationMs}ms)`);
            if (step.detail) console.log(`       ${step.detail}`);
            if (step.status === "failed") failCount++;
          }
        } catch (err) {
          console.error(`\nProtocol error: ${err instanceof Error ? err.message : String(err)}`);
          process.exit(1);
        }
        const elapsed = Date.now() - startTime;
        console.log(`\n${failCount === 0 ? "✓" : "✗"} ${stepCount} step(s) in ${elapsed}ms — ${failCount === 0 ? "SUCCESS" : `${failCount} FAILED`}`);
        process.exit(failCount === 0 ? 0 : 1);
      }
      console.error(`Unknown protocol subcommand: ${sub}\n`);
      console.error(HELP);
      process.exit(2);
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
