#!/usr/bin/env node
import { listCompressorSettings } from "../dist/apps/compressor/settings.js";
import { encodeJob } from "../dist/apps/compressor/cli.js";
import { isCompressorRunning } from "../dist/apps/compressor/app.js";
import { resolveProject } from "../dist/projects/resolve.js";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

console.log("[1/5] Compressor running?");
console.log("      " + (await isCompressorRunning()));

console.log("[2/5] Listing bundled settings...");
const all = await listCompressorSettings({ includeBundled: true });
const bundled = all.filter((s) => s.source === "bundled");
console.log(`      ${bundled.length} bundled presets`);

const candidate =
  bundled.find((s) => s.name === "BroadbandHDHEVCNameKey") ??
  bundled.find((s) => s.name.includes("HEVC")) ??
  bundled[0];

if (!candidate) {
  console.error("No bundled setting found.");
  process.exit(1);
}
console.log(`      Using: ${candidate.name}`);
console.log(`      Path: ${candidate.path}`);

console.log("[3/5] Resolving smoke-test project...");
const proj = await resolveProject("smoke-test");
const source = join(proj.paths.footage, "black-5s.mov");
const output = join(proj.paths.out, "black-5s-encoded.mov");
await mkdir(proj.paths.out, { recursive: true });
console.log(`      source: ${source}`);
console.log(`      output: ${output}`);

console.log("[4/5] Submitting encode job to Compressor (async — accepts then runs)...");
const start = Date.now();
const result = await encodeJob({
  jobPath: source,
  settingPath: candidate.path,
  locationPath: output,
  batchName: "creator-studio-os smoke",
  priority: "high",
});
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`      accepted in ${elapsed}s`);
console.log(`      job id: ${result.jobId}`);
console.log(`      output:`);
result.rawOutput.split("\n").forEach((l) => console.log(`        ${l}`));

console.log("\n[5/5] Smoke complete. Compressor's queue runs the actual encode async.");
console.log(`      Watch ${output} appear (may take 5-30s for a 5s clip).`);
