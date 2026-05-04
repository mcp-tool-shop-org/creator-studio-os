#!/usr/bin/env node
import {
  listLibraries,
  listEvents,
  listProjects,
  readProjectMetadata,
} from "../dist/apps/fcp/library.js";
import { isFcpRunning } from "../dist/apps/fcp/app.js";

console.log("[1/5] Is FCP running?");
const running = await isFcpRunning();
console.log(`      ${running}`);
if (!running) {
  console.error("FCP must be running. Open the smoke project from the previous test first.");
  process.exit(1);
}

console.log("[2/5] Listing libraries (first call may pop the Automation permission dialog)...");
const libs = await listLibraries();
console.log(`      ${JSON.stringify(libs)}`);

if (libs.length === 0) {
  console.error("No libraries open in FCP.");
  process.exit(1);
}

const lib = libs[0].name;
console.log(`[3/5] Listing events in '${lib}'...`);
const events = await listEvents(lib);
console.log(`      ${JSON.stringify(events)}`);

const targetEvent =
  events.find((e) => e.name === "creator-studio-os smoke")?.name ??
  events[0]?.name;

if (!targetEvent) {
  console.error("No events found.");
  process.exit(1);
}

console.log(`[4/5] Listing projects in event '${targetEvent}'...`);
const projects = await listProjects(lib, targetEvent);
console.log(`      ${JSON.stringify(projects)}`);

const targetProject =
  projects.find((p) => p.name === "Black 5s")?.name ?? projects[0]?.name;

if (!targetProject) {
  console.log("\nNo project found in target event. AppleScript surface confirmed working — read smoke test passed at the library/event level.");
  process.exit(0);
}

console.log(`[5/5] Reading metadata for '${targetProject}'...`);
const meta = await readProjectMetadata(lib, targetEvent, targetProject);
console.log(`      ${JSON.stringify(meta, null, 2)}`);

console.log("\nRead-path smoke test complete.");
