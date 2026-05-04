#!/usr/bin/env node
import { access } from "node:fs/promises";
import {
  isLogicRunning,
  openLogicProject,
} from "../dist/apps/logic/app.js";
import {
  isMotionRunning,
  openMotionTemplate,
} from "../dist/apps/motion/app.js";

const LOGIC_DEMO =
  "/Applications/Logic Pro Creator Studio.app/Contents/Resources/Demo Projects/Artist Songs/Artist Song 1.logicx";
const MOTION_DEMO =
  "/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/Compositions.localized/Snap.localized/Snap-Lower Third.localized/Snap-Lower Third.motn";

async function pollUntilRunning(label, isRunning, timeoutMs = 60_000, intervalMs = 1_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isRunning()) return ((Date.now() - start) / 1000).toFixed(1);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`${label} did not report running within ${timeoutMs}ms`);
}

console.log("=== Motion (Snap-Lower Third.motn) ===");
await access(MOTION_DEMO);
console.log(`[1/3] Demo exists at: ${MOTION_DEMO}`);
console.log("[2/3] Already running?  " + (await isMotionRunning()));
console.log("[3/3] Opening template via 'open -b com.apple.motionappApp'...");
await openMotionTemplate(MOTION_DEMO);
const motionElapsed = await pollUntilRunning("Motion", isMotionRunning);
console.log(`      Motion is running (detected after ${motionElapsed}s)`);

console.log("\n=== Logic Pro (Artist Song 1.logicx) ===");
await access(LOGIC_DEMO);
console.log(`[1/3] Demo exists at: ${LOGIC_DEMO}`);
console.log("[2/3] Already running?  " + (await isLogicRunning()));
console.log("[3/3] Opening project via 'open -b com.apple.mobilelogic' (Logic loads ~10-30s)...");
await openLogicProject(LOGIC_DEMO);
const logicElapsed = await pollUntilRunning("Logic Pro", isLogicRunning, 90_000);
console.log(`      Logic is running (detected after ${logicElapsed}s)`);

console.log("\n=== Smoke complete ===");
console.log("Both apps launched and accepted the file-open handoff.");
console.log("(File-handoff is the entire automation surface for these wings — neither app");
console.log(" exposes an AppleScript dictionary, so no further programmatic verification.)");
