#!/usr/bin/env node
import { stat } from "node:fs/promises";
import { join } from "node:path";
import {
  openDocument,
  closeDocument,
  exportDocument,
  resizeDocument,
} from "../dist/apps/pixelmator/document.js";
import { resolveProject } from "../dist/projects/resolve.js";

const proj = await resolveProject("smoke-test");
const input = join(proj.paths.images, "test-pattern.png");
const output = join(proj.paths.out, "test-pattern-1080p.webp");

const inStat = await stat(input);
console.log(`[1/5] Source: ${input}`);
console.log(`      ${inStat.size} bytes (2560x1440 PNG)`);

console.log("[2/5] Opening in Pixelmator Pro (first call may pop Automation prompt)...");
const start = Date.now();
const { name } = await openDocument(input);
console.log(`      doc name: ${name} (opened in ${((Date.now() - start) / 1000).toFixed(1)}s)`);

console.log("[3/5] Resizing to 1920x1080...");
await resizeDocument({ documentName: name, width: 1920, height: 1080 });

console.log(`[4/5] Exporting as WebP to ${output}...`);
await exportDocument({ documentName: name, outputPath: output, format: "WebP" });

console.log("[5/5] Closing document...");
await closeDocument(name);

const outStat = await stat(output);
console.log(`\nSmoke complete. Output: ${output}`);
console.log(`     ${outStat.size} bytes`);
const ratio = ((1 - outStat.size / inStat.size) * 100).toFixed(1);
console.log(`     ${ratio}% smaller than source PNG`);
