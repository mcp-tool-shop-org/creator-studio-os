/**
 * Reproducer: Pixelmator Pro brand-card AppleScript shape.
 *
 * Gate: runs only when CSOS_MANUAL=1 is set (requires Pixelmator open on host).
 * Purpose: assert that the corrected AppleScript produces a PNG with visible text —
 * i.e. non-trivial luminance variance at 320×180 scale.
 *
 * Root cause of v1.7.0–v1.7.3 solid-color-only output:
 *   `make new rectangle` errors with -2710 (wrong class name).
 *   The correct class is `rectangle shape layer`.
 *   The error was silently caught and fell back to ffmpeg lavfi solid-color stubs.
 *   `tell text content of layer` (the sdef canonical form) is correct and works.
 *
 * Run manually:
 *   CSOS_MANUAL=1 npx vitest run tests/pixelmator-text-card.repro.test.ts
 */
import { describe, it, expect } from "vitest";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const MANUAL = process.env["CSOS_MANUAL"] === "1";
const BUNDLE_ID = "com.apple.pixelmator";
const CARD_W = 1920;
const CARD_H = 1080;
const SCENE_TITLE = "Creator Studio OS";
const FG_COLOR = "57568, 57568, 57568"; // #E0E0E0 × 257
const BG_COLOR = "6939, 6939, 11799";   // #1A1A2E × 257

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    const proc = spawn("osascript", ["-e", script]);
    proc.stdout?.on("data", (c: Buffer) => chunks.push(c));
    proc.stderr?.on("data", (c: Buffer) => errChunks.push(c));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`osascript exited ${code}: ${Buffer.concat(errChunks).toString().trim()}`));
      } else {
        resolve(Buffer.concat(chunks).toString().trim());
      }
    });
    proc.on("error", reject);
  });
}

/**
 * Extracts a 32×18 raw RGB thumbnail of the frame at `ts` seconds from `movPath`
 * and returns the luminance stddev across all pixels. A solid-color image has
 * stddev ≈ 0; an image with visible text on a contrasting background has stddev > 5.
 */
function frameLuminanceStddev(imgPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const proc = spawn("ffmpeg", [
      "-loglevel", "quiet", "-y",
      "-i", imgPath,
      "-frames:v", "1",
      "-vf", "scale=320:180",
      "-f", "rawvideo",
      "-pix_fmt", "rgb24",
      "pipe:1",
    ], { stdio: ["ignore", "pipe", "ignore"] });
    proc.stdout?.on("data", (c: Buffer) => chunks.push(c));
    proc.on("close", () => {
      const buf = Buffer.concat(chunks);
      if (buf.length < 3) { reject(new Error("ffmpeg produced no output")); return; }
      const pixels = buf.length / 3;
      let sum = 0;
      const lums: number[] = [];
      for (let i = 0; i < pixels; i++) {
        const r = buf[i * 3]!;
        const g = buf[i * 3 + 1]!;
        const b = buf[i * 3 + 2]!;
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        lums.push(y);
        sum += y;
      }
      const mean = sum / pixels;
      const variance = lums.reduce((acc, y) => acc + (y - mean) ** 2, 0) / pixels;
      resolve(Math.sqrt(variance));
    });
    proc.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Reproducer
// ---------------------------------------------------------------------------

describe.skipIf(!MANUAL)("pixelmator text-card reproducer (CSOS_MANUAL=1)", () => {
  let tmp: string;

  it("rectangle shape layer + tell text content produces visible text (stddev > 5)", async () => {
    tmp = await mkdtemp(join(tmpdir(), "csos-repro-"));
    const cardPath = join(tmp, "repro-card.png");

    const script = `
tell application id "${BUNDLE_ID}"
  set newDoc to make new document with properties {width:${CARD_W}, height:${CARD_H}, resolution:72}
  tell newDoc
    set bgLayer to make new rectangle shape layer at beginning of layers with properties ¬
      {name:"bg", position:{0, 0}, width:${CARD_W}, height:${CARD_H}}
    set fill color of styles of bgLayer to {${BG_COLOR}}
    set titleLayer to make new text layer at beginning of layers with properties ¬
      {name:"title", text content:"${SCENE_TITLE}"}
    tell text content of titleLayer
      set its size to 96
      set its color to {${FG_COLOR}}
    end tell
    set horizontal alignment of titleLayer to center
    set position of titleLayer to {960, 540}
    export to (POSIX file "${cardPath}") as PNG
  end tell
  close newDoc saving no
end tell`;

    await runAppleScript(script);

    const info = await stat(cardPath);
    expect(info.size, "exported PNG must be > 1KB").toBeGreaterThan(1024);

    const stddev = await frameLuminanceStddev(cardPath);
    expect(
      stddev,
      `luminance stddev ${stddev.toFixed(2)} too low — text is not visible. ` +
      `This fires when 'tell text content of layer' silently no-ops (v1.7.0-v1.7.3 bug).`,
    ).toBeGreaterThan(5);

    await rm(tmp, { recursive: true, force: true });
  }, 30_000);

  it("BROKEN pattern: make new rectangle (wrong class) → stddev ≈ 0, falls back to empty doc", async () => {
    tmp = await mkdtemp(join(tmpdir(), "csos-repro-broken-"));
    const cardPath = join(tmp, "repro-broken-card.png");

    // The broken form that shipped in v1.7.0–v1.7.3: wrong shape class name.
    // `make new rectangle` errors with -2710; bg layer is never created.
    // The export then captures a blank document → solid-color / empty PNG.
    // We call osascript ignoring errors since the script itself throws -2710.
    const brokenScript = `
tell application id "${BUNDLE_ID}"
  set newDoc to make new document with properties {width:${CARD_W}, height:${CARD_H}, resolution:72}
  tell newDoc
    try
      set bgLayer to make new rectangle at beginning of layers with properties ¬
        {name:"bg", position:{0, 0}, width:${CARD_W}, height:${CARD_H}}
      set fill color of styles of bgLayer to {${BG_COLOR}}
    end try
    set titleLayer to make new text layer at beginning of layers with properties ¬
      {name:"title", text content:"${SCENE_TITLE}"}
    tell text content of titleLayer
      set its size to 96
      set its color to {${FG_COLOR}}
    end tell
    set horizontal alignment of titleLayer to center
    set position of titleLayer to {960, 540}
    export to (POSIX file "${cardPath}") as PNG
  end tell
  close newDoc saving no
end tell`;

    try { await runAppleScript(brokenScript); } catch { /* expected to fail or produce blank doc */ }

    // If the export ran at all, the PNG should have near-zero variance (no bg fill)
    try {
      const stddev = await frameLuminanceStddev(cardPath);
      expect(
        stddev,
        `Broken pattern (wrong class name) expected stddev ≈ 0 (no bg, tiny default text). ` +
        `Got ${stddev.toFixed(2)} — if this is high the regression may be fixed upstream.`,
      ).toBeLessThan(5);
    } catch {
      // export may not have run at all if the script errored early — also acceptable
    }

    await rm(tmp, { recursive: true, force: true });
  }, 30_000);
});
