#!/usr/bin/env node
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { buildProjectFcpxml } from "../dist/fcpxml/builder.js";
import { validateFcpxmlAgainstDtd } from "../dist/fcpxml/validate.js";
import { resolveProject } from "../dist/projects/resolve.js";
import { openWithApp } from "../dist/runners/openApp.js";
import { loadConfig } from "../dist/config.js";

const cfg = loadConfig();
const proj = await resolveProject("smoke-test");
const black = join(proj.paths.footage, "black-5s.mov");
const bars = join(proj.paths.footage, "bars-5s.mov");

// Use an explicit library location so FCP doesn't ask "import to which library?".
// Remove any prior bundle so we start fresh.
const libraryPath = join(proj.paths.fcp, "SmokeFull.fcpbundle");
if (existsSync(libraryPath)) {
  await rm(libraryPath, { recursive: true, force: true });
}

const spec = {
  fcpxmlVersion: "1.14",
  libraryLocation: libraryPath,
  eventName: "creator-studio-os v1.2 full",
  projectName: "Cuts + Transitions",
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
      src: black,
      durationSeconds: 5,
      hasVideo: true,
      hasAudio: true,
      format: "r1",
    },
    {
      id: "a2",
      name: "Bars 5s",
      src: bars,
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
      name: "Black",
      offsetSeconds: 0,
      durationSeconds: 5,
      volumeDb: -3,
      videoRole: "Video.global",
      audioRole: "Music.music",
    },
    {
      kind: "title",
      name: "Opening Title",
      text: "v1.2 — Titles & Transitions",
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
    {
      kind: "transition",
      name: "Cross Dissolve",
      offsetSeconds: 4,
      durationSeconds: 2,
    },
    {
      kind: "asset-clip",
      ref: "a2",
      name: "Bars",
      offsetSeconds: 5,
      durationSeconds: 5,
      videoRole: "Video.global",
      audioRole: "Effects.effects",
    },
  ],
  markers: [
    {
      startSeconds: 2.5,
      durationSeconds: 1,
      value: "Mid black",
      isChapter: true,
    },
    {
      startSeconds: 7.5,
      durationSeconds: 1,
      value: "Mid bars",
      isChapter: false,
    },
  ],
};

console.log("[1/4] Building FCPXML 1.14 — 2 clips, title, Cross Dissolve, library location...");
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
const out = join(proj.paths.fcp, "smoke-v12-full.fcpxml");
await writeFile(out, xml, "utf-8");
console.log(`      ${out}`);

console.log("[4/4] Opening in FCP (will create SmokeFull.fcpbundle automatically — no dialog)...");
await openWithApp(out, { appBundleId: cfg.fcpBundleId });
console.log("      handed off");

console.log("\nv1.2 full smoke complete. Check FCP for:");
console.log("  - New library 'SmokeFull' (auto-created at the libraryLocation path, no dialog)");
console.log("  - Event 'creator-studio-os v1.2 full' / Project 'Cuts + Transitions'");
console.log("  - 10s sequence: black 0-5s, bars 5-10s, Cross Dissolve at 4-6s");
console.log("  - 'v1.2 — Titles & Transitions' connected on lane 1 (0-3s)");
console.log("  - Chapter marker at 2.5s ('Mid black'), regular marker at 7.5s ('Mid bars')");
console.log("  - Audio: -3dB on black, default on bars; roles Music + Effects");
