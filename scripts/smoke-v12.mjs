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
  fcpxmlVersion: "1.14",
  eventName: "creator-studio-os v1.2 smoke",
  projectName: "Titles & Transitions",
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
      name: "Establishing",
      offsetSeconds: 0,
      durationSeconds: 5,
      volumeDb: -3,
      videoRole: "Video.global",
      audioRole: "Music.music",
    },
    {
      kind: "title",
      name: "Opening Title",
      text: "creator-studio-os v1.2",
      offsetSeconds: 0,
      durationSeconds: 3,
      lane: 1,
      textStyle: {
        font: "Helvetica",
        fontSize: 96,
        fontColor: "1 1 1 1",
        alignment: "center",
        bold: true,
        italic: false,
      },
    },
  ],
  markers: [
    {
      startSeconds: 2.5,
      durationSeconds: 1,
      value: "Mid beat",
      isChapter: true,
    },
  ],
};

console.log("[1/4] Building FCPXML 1.14 with title + audio level + roles...");
const { xml } = buildProjectFcpxml(spec);
console.log(`      ${xml.length} bytes`);

console.log("[2/4] Validating against bundled DTD...");
const v = await validateFcpxmlAgainstDtd(xml, cfg.fcpDtdPath);
console.log(`      valid=${v.valid}  ${v.output}`);
if (!v.valid) {
  console.error("DTD validation failed:");
  console.error(xml);
  process.exit(1);
}

console.log("[3/4] Writing FCPXML...");
await mkdir(proj.paths.fcp, { recursive: true });
const out = join(proj.paths.fcp, "smoke-v12.fcpxml");
await writeFile(out, xml, "utf-8");
console.log(`      ${out}`);

console.log("[4/4] Opening in FCP...");
await openWithApp(out, { appBundleId: cfg.fcpBundleId });
console.log("      handed off");

console.log("\nv1.2 smoke complete. Check FCP for:");
console.log("  - Event 'creator-studio-os v1.2 smoke'");
console.log("  - Project 'Titles & Transitions'");
console.log("  - Clip on primary spine (-3dB, Music role)");
console.log("  - 'creator-studio-os v1.2' title connected at lane 1");
console.log("  - Chapter marker at 2.5s ('Mid beat')");
