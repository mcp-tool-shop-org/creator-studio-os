#!/usr/bin/env node
import { stat, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runAppleScript } from "../dist/runners/applescript.js";
import { resolveProject } from "../dist/projects/resolve.js";
import { loadConfig } from "../dist/config.js";

const cfg = loadConfig();
const proj = await resolveProject("smoke-test");
await mkdir(proj.paths.out, { recursive: true });

async function smokeApp(label, bundleId, formatLiteral, ext) {
  const out = join(proj.paths.out, `iwork-${label.toLowerCase()}.${ext}`);
  if (existsSync(out)) await rm(out);

  console.log(`\n=== ${label} (${bundleId}) ===`);
  console.log(`[1/4] Creating new ${label} document...`);
  await runAppleScript(
    `tell application id "${bundleId}"
  activate
  make new document
  delay 2
end tell`,
    { timeoutMs: 45_000 },
  );

  console.log(`[2/4] Exporting front document to ${out} as ${formatLiteral}...`);
  const start = Date.now();
  await runAppleScript(
    `tell application id "${bundleId}"
  tell front document to export to (POSIX file "${out}") as ${formatLiteral}
end tell`,
    { timeoutMs: 60_000 },
  );
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`      done in ${elapsed}s`);

  console.log("[3/4] Closing document (no save)...");
  await runAppleScript(
    `tell application id "${bundleId}" to close front document saving no`,
  );

  console.log("[4/4] Verifying output...");
  const s = await stat(out);
  console.log(`      ${out}`);
  console.log(`      ${s.size} bytes`);
  return { app: label, output: out, size: s.size };
}

const results = [];
results.push(await smokeApp("Keynote", cfg.keynoteBundleId, "PDF", "pdf"));
results.push(await smokeApp("Pages", cfg.pagesBundleId, "PDF", "pdf"));
results.push(await smokeApp("Numbers", cfg.numbersBundleId, "PDF", "pdf"));

console.log("\n=== Summary ===");
for (const r of results) {
  console.log(`${r.app.padEnd(8)} → ${r.size.toString().padStart(8)} bytes  ${r.output}`);
}
