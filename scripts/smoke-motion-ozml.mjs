#!/usr/bin/env node
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import {
  inspectTemplate,
  setParam,
  cloneTemplate,
} from "../dist/apps/motion/ozml.js";
import { resolveProject } from "../dist/projects/resolve.js";

const SOURCE =
  "/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/Compositions.localized/Snap.localized/Snap-Lower Third.localized/Snap-Lower Third.motn";

const proj = await resolveProject("smoke-test");
await mkdir(proj.paths.refs, { recursive: true });
const cloned = join(proj.paths.refs, "Snap-Lower-Third-clone.motn");

console.log("[1/5] Cloning Apple's bundled Snap-Lower Third template (never mutate the original)...");
const clone = await cloneTemplate(SOURCE, cloned);
console.log(`      ${clone.bytes} bytes copied`);
console.log(`      ${cloned}`);

console.log("\n[2/5] Inspecting OZML structure...");
const inspectBefore = await inspectTemplate(cloned);
console.log(`      OZML version: ${inspectBefore.ozmlVersion}`);
console.log(`      Factory count: ${inspectBefore.factories.length}`);
console.log(`      Parameter count: ${inspectBefore.parameterCount}`);

const sizeParams = inspectBefore.parameters.filter(
  (p) => p.name === "Size" && p.id === "3",
);
console.log(`      'Size' (id=3) instances: ${sizeParams.length}`);
const firstSize = sizeParams[0];
console.log(`      First Size value: ${firstSize.value} (default: ${firstSize.defaultValue})`);

console.log("\n[3/5] Mutating Size (id=3, matchIndex=0): change to 120...");
const result = await setParam(cloned, "Size", "3", "120", { matchIndex: 0 });
console.log(`      old: ${result.oldValue}  →  new: ${result.newValue}`);

console.log("\n[4/5] Re-inspecting to verify the mutation landed...");
const inspectAfter = await inspectTemplate(cloned);
const updated = inspectAfter.parameters.filter(
  (p) => p.name === "Size" && p.id === "3",
)[0];
console.log(`      First Size value now: ${updated.value}`);

const otherSizesUnchanged = inspectAfter.parameters
  .filter((p) => p.name === "Size" && p.id === "3")
  .slice(1)
  .every((p, i) => p.value === sizeParams[i + 1].value);
console.log(`      Other Size instances preserved: ${otherSizesUnchanged}`);

console.log(`\n[5/5] File size: before=${inspectBefore.byteSize}, after=${inspectAfter.byteSize}`);
console.log(`      Delta: ${inspectAfter.byteSize - inspectBefore.byteSize} bytes (positive expected — '120' is one char longer than '74')`);

console.log("\nSmoke complete. Open the cloned template in Motion to verify the file still loads:");
console.log(`  open -b com.apple.motionappApp "${cloned}"`);
