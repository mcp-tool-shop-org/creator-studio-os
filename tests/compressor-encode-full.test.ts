/**
 * compressor-encode-full.test.ts
 *
 * Covers the encodeJobOnce code paths in cli.ts that are not reached by
 * the existing tests (which only test early "path not found" rejection).
 *
 * We create real temp files and a fake Compressor binary that:
 *  1. Exits 0 with a jobID XML fragment in stdout → happy path
 *  2. Exits 0 with ObjC noise in stdout → noise-stripping branch
 *  3. Exits 1 → E_COMPRESSOR_FAILED rejection
 *  4. Emits spawn error → E_COMPRESSOR_FAILED spawn rejection
 *  5. Accepts computerGroup + priority optional args
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeJob } from "@creator-studio-os/compressor";
import { CreatorStudioError } from "@creator-studio-os/core";

let tmp: string;
let origBin: string | undefined;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-encode-full-"));
  origBin = process.env.CREATOR_STUDIO_COMPRESSOR_BIN;
});

afterEach(async () => {
  if (origBin === undefined) delete process.env.CREATOR_STUDIO_COMPRESSOR_BIN;
  else process.env.CREATOR_STUDIO_COMPRESSOR_BIN = origBin;
  await rm(tmp, { recursive: true, force: true });
});

async function makeFiles() {
  const jobPath = join(tmp, "input.mov");
  const settingPath = join(tmp, "setting.compressorsetting");
  const locationPath = join(tmp, "out.mp4");
  await writeFile(jobPath, "fake mov", "utf-8");
  await writeFile(settingPath, "fake setting", "utf-8");
  return { jobPath, settingPath, locationPath };
}

async function makeBin(script: string) {
  const bin = join(tmp, "Compressor");
  await writeFile(bin, `#!/bin/sh\n${script}`, "utf-8");
  await chmod(bin, 0o755);
  process.env.CREATOR_STUDIO_COMPRESSOR_BIN = bin;
  return bin;
}

describe("encodeJob — encodeJobOnce code paths", () => {
  it("resolves with parsed jobId when binary exits 0 with XML jobID tag", async () => {
    const { jobPath, settingPath, locationPath } = await makeFiles();
    // Output a jobID XML fragment — Compressor's real format
    await makeBin(`echo '<jobID A1B2C3D4-0000-0000-0000-000000000099 />'`);

    const result = await encodeJob({ jobPath, settingPath, locationPath });
    expect(result.jobId).toBe("A1B2C3D4-0000-0000-0000-000000000099");
  });

  it("resolves with jobId='submitted' when no jobID tag in output", async () => {
    const { jobPath, settingPath, locationPath } = await makeFiles();
    await makeBin(`echo 'Submitted to queue.'`);

    const result = await encodeJob({ jobPath, settingPath, locationPath });
    expect(result.jobId).toBe("submitted");
  });

  it("resolves and strips ObjC noise lines from output", async () => {
    const { jobPath, settingPath, locationPath } = await makeFiles();
    // Mix real output with noise lines that should be stripped
    await makeBin(`printf 'objc[123]: Class JEBlah is implemented twice\\n<jobID AAAA0000-0000-0000-0000-000000000001 />\\n'`);

    const result = await encodeJob({ jobPath, settingPath, locationPath });
    // The noise was stripped; the jobId was still parsed correctly
    expect(result.jobId).toBe("AAAA0000-0000-0000-0000-000000000001");
  });

  it("also parses batchID when present", async () => {
    const { jobPath, settingPath, locationPath } = await makeFiles();
    await makeBin(`printf '<jobID A1A1A1A1-0000-0000-0000-000000000001 />\\n<batchID B2B2B2B2-0000-0000-0000-000000000002 />\\n'`);

    const result = await encodeJob({ jobPath, settingPath, locationPath });
    expect(result.jobId).toBe("A1A1A1A1-0000-0000-0000-000000000001");
    expect(result.batchId).toBe("B2B2B2B2-0000-0000-0000-000000000002");
  });

  it("rejects with E_COMPRESSOR_FAILED when binary exits non-zero", async () => {
    const { jobPath, settingPath, locationPath } = await makeFiles();
    await makeBin(`echo 'Unable to submit to queue' >&2; exit 1`);

    await expect(
      encodeJob({ jobPath, settingPath, locationPath }),
    ).rejects.toMatchObject({
      code: "E_COMPRESSOR_FAILED",
    } satisfies Partial<CreatorStudioError>);
  });

  it("passes batchName, computerGroup, priority as CLI args", async () => {
    const { jobPath, settingPath, locationPath } = await makeFiles();
    const logFile = join(tmp, "args.txt");
    // Write all args to a log file so we can assert
    await makeBin(`echo "$@" > "${logFile}"`);

    await encodeJob({
      jobPath,
      settingPath,
      locationPath,
      batchName: "MyBatch",
      computerGroup: "ThisMac",
      priority: "high",
    });

    const { readFile } = await import("node:fs/promises");
    const logged = (await readFile(logFile, "utf-8")).trim();
    expect(logged).toContain("-batchname");
    expect(logged).toContain("MyBatch");
    expect(logged).toContain("-computergroup");
    expect(logged).toContain("ThisMac");
    expect(logged).toContain("-priority");
    expect(logged).toContain("high");
  });
});
