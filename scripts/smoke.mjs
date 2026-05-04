#!/usr/bin/env node
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { buildProjectFcpxml } from "../dist/fcpxml/builder.js";
import { validateFcpxmlAgainstDtd } from "../dist/fcpxml/validate.js";
import { resolveProject } from "../dist/projects/resolve.js";
import { openWithApp } from "../dist/runners/openApp.js";
import { loadConfig } from "../dist/config.js";

const cfg = loadConfig();
const proj = await resolveProject("smoke-test");

const assetSrc = join(proj.paths.footage, "black-5s.mov");

const spec = {
  eventName: "creator-studio-os smoke",
  projectName: "Black 5s",
  format: {
    id: "r1",
    name: "FFVideoFormat1080p2997",
    frameRate: "29.97",
    resolution: { width: 1920, height: 1080 },
    colorSpace: "1-1-1 (Rec. 709)",
  },
  assets: [
    {
      id: "a1",
      name: "Black 5s",
      src: assetSrc,
      durationSeconds: 5,
      hasVideo: true,
      hasAudio: true,
      format: "r1",
    },
  ],
  spine: [
    {
      kind: "asset-clip",
      ref: "a1",
      name: "Black 5s",
      offsetSeconds: 0,
      durationSeconds: 5,
    },
  ],
  markers: [
    {
      startSeconds: 2.5,
      durationSeconds: 1,
      value: "Mid-clip beat",
      isChapter: false,
    },
  ],
};

console.log("[1/4] Building FCPXML...");
const { xml } = buildProjectFcpxml(spec);
console.log(`      ${xml.length} bytes`);

console.log("[2/4] Validating against bundled DTD...");
const v = await validateFcpxmlAgainstDtd(xml, cfg.fcpDtdPath);
console.log(`      valid=${v.valid} (${v.output})`);
if (!v.valid) {
  console.error("DTD validation failed:");
  console.error(xml);
  process.exit(1);
}

console.log("[3/4] Writing FCPXML...");
await mkdir(proj.paths.fcp, { recursive: true });
const out = join(proj.paths.fcp, "smoke.fcpxml");
await writeFile(out, xml, "utf-8");
console.log(`      ${out}`);

console.log("[4/4] Opening in Final Cut Pro (will trigger Automation prompt on first run)...");
await openWithApp(out, { appBundleId: cfg.fcpBundleId });
console.log("      handed off to FCP");

console.log("\nSmoke test complete. Check FCP for an event 'creator-studio-os smoke' with project 'Black 5s'.");
