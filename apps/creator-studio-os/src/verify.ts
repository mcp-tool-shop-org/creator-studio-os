import { access, mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { loadConfig } from "@creator-studio-os/core";
import { buildProjectFcpxml } from "@creator-studio-os/fcp";
import { validateFcpxmlAgainstDtd } from "@creator-studio-os/fcp";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function which(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const p = spawn("which", [cmd], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.on("close", (code) => resolve(code === 0 ? out.trim() : null));
    p.on("error", () => resolve(null));
  });
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function verify(): Promise<{
  ok: boolean;
  checks: CheckResult[];
}> {
  const cfg = loadConfig();
  const checks: CheckResult[] = [];

  checks.push({
    name: "platform",
    ok: process.platform === "darwin",
    detail: `process.platform = ${process.platform}`,
  });

  const osa = await which("osascript");
  checks.push({
    name: "osascript",
    ok: osa !== null,
    detail: osa ?? "not on PATH",
  });

  const xmllint = await which("xmllint");
  checks.push({
    name: "xmllint",
    ok: xmllint !== null,
    detail:
      xmllint ??
      "not installed (DTD validation will be skipped — install via 'brew install libxml2')",
  });

  const fcpInstalled = await exists(cfg.fcpAppPath);
  checks.push({
    name: "final-cut-pro",
    ok: fcpInstalled,
    detail: fcpInstalled ? cfg.fcpAppPath : `missing: ${cfg.fcpAppPath}`,
  });

  const dtd = await exists(cfg.fcpDtdPath);
  checks.push({
    name: "fcpxml-dtd",
    ok: dtd,
    detail: dtd ? cfg.fcpDtdPath : `missing: ${cfg.fcpDtdPath}`,
  });

  const compressorInstalled = await exists(cfg.compressorAppPath);
  checks.push({
    name: "compressor",
    ok: compressorInstalled,
    detail: compressorInstalled
      ? cfg.compressorAppPath
      : `missing: ${cfg.compressorAppPath} (Compressor wing won't function)`,
  });

  const compressorBin = await exists(cfg.compressorBinaryPath);
  checks.push({
    name: "compressor-binary",
    ok: compressorBin,
    detail: compressorBin ? cfg.compressorBinaryPath : "binary not found",
  });

  const pixelmatorInstalled = await exists(cfg.pixelmatorAppPath);
  checks.push({
    name: "pixelmator-pro",
    ok: pixelmatorInstalled,
    detail: pixelmatorInstalled
      ? cfg.pixelmatorAppPath
      : `missing: ${cfg.pixelmatorAppPath} (Pixelmator wing won't function)`,
  });

  const logicInstalled = await exists(cfg.logicAppPath);
  checks.push({
    name: "logic-pro",
    ok: logicInstalled,
    detail: logicInstalled
      ? cfg.logicAppPath
      : `missing: ${cfg.logicAppPath} (Logic wing won't function)`,
  });

  const motionInstalled = await exists(cfg.motionAppPath);
  checks.push({
    name: "motion",
    ok: motionInstalled,
    detail: motionInstalled
      ? cfg.motionAppPath
      : `missing: ${cfg.motionAppPath} (Motion wing won't function)`,
  });

  const keynoteInstalled = await exists(cfg.keynoteAppPath);
  checks.push({
    name: "keynote",
    ok: keynoteInstalled,
    detail: keynoteInstalled
      ? cfg.keynoteAppPath
      : `missing: ${cfg.keynoteAppPath} (Keynote wing won't function)`,
  });

  const pagesInstalled = await exists(cfg.pagesAppPath);
  checks.push({
    name: "pages",
    ok: pagesInstalled,
    detail: pagesInstalled
      ? cfg.pagesAppPath
      : `missing: ${cfg.pagesAppPath} (Pages wing won't function)`,
  });

  const numbersInstalled = await exists(cfg.numbersAppPath);
  checks.push({
    name: "numbers",
    ok: numbersInstalled,
    detail: numbersInstalled
      ? cfg.numbersAppPath
      : `missing: ${cfg.numbersAppPath} (Numbers wing won't function)`,
  });

  const dataDir = await exists(cfg.dataDir);
  if (!dataDir) {
    await mkdir(join(cfg.dataDir, "projects"), { recursive: true });
    await mkdir(join(cfg.dataDir, "shared", "brand"), { recursive: true });
    await mkdir(join(cfg.dataDir, "shared", "presets"), { recursive: true });
  }
  checks.push({
    name: "data-dir",
    ok: true,
    detail: `${cfg.dataDir} (${dataDir ? "existed" : "created"})`,
  });

  if (fcpInstalled && dtd) {
    try {
      const built = buildProjectFcpxml({
        fcpxmlVersion: "1.14",
        eventName: "Verify Event",
        projectName: "Verify Project",
        format: {
          id: "r1",
          name: "FFVideoFormat1080p2997",
          frameRate: "29.97",
          resolution: { width: 1920, height: 1080 },
          colorSpace: "1-1-1 (Rec. 709)",
        },
        assets: [],
        spine: [],
        markers: [],
      });
      const v = await validateFcpxmlAgainstDtd(built.xml, cfg.fcpDtdPath);
      checks.push({
        name: "fcpxml-roundtrip",
        ok: v.valid,
        detail: v.output,
      });
    } catch (e) {
      checks.push({
        name: "fcpxml-roundtrip",
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const ok = checks.every((c) => c.ok);
  return { ok, checks };
}

export function formatVerify(result: {
  ok: boolean;
  checks: CheckResult[];
}): string {
  const lines: string[] = [];
  for (const c of result.checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    lines.push(`[${mark}] ${c.name.padEnd(22)} ${c.detail}`);
  }
  lines.push("");
  lines.push(result.ok ? "All checks passed." : "Some checks FAILED.");
  return lines.join("\n");
}
