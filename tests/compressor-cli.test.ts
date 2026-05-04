import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeJob } from "../src/apps/compressor/cli.js";
import { CreatorStudioError } from "../src/errors.js";

let tmp: string;
let originalBin: string | undefined;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-comp-test-"));
  originalBin = process.env.CREATOR_STUDIO_COMPRESSOR_BIN;
});

afterEach(async () => {
  if (originalBin === undefined) delete process.env.CREATOR_STUDIO_COMPRESSOR_BIN;
  else process.env.CREATOR_STUDIO_COMPRESSOR_BIN = originalBin;
  await rm(tmp, { recursive: true, force: true });
});

describe("encodeJob", () => {
  it("rejects when the Compressor binary does not exist", async () => {
    process.env.CREATOR_STUDIO_COMPRESSOR_BIN = join(tmp, "no-such-binary");
    await expect(
      encodeJob({
        jobPath: join(tmp, "in.mov"),
        settingPath: join(tmp, "preset.compressorsetting"),
        locationPath: join(tmp, "out.m4v"),
      }),
    ).rejects.toMatchObject({
      code: "E_COMPRESSOR_NOT_FOUND",
    } satisfies Partial<CreatorStudioError>);
  });

  it("rejects when the source media path does not exist", async () => {
    const fakeBin = join(tmp, "Compressor");
    await writeFile(fakeBin, "#!/bin/sh\nexit 0", "utf-8");
    process.env.CREATOR_STUDIO_COMPRESSOR_BIN = fakeBin;
    await expect(
      encodeJob({
        jobPath: join(tmp, "missing.mov"),
        settingPath: join(tmp, "preset.compressorsetting"),
        locationPath: join(tmp, "out.m4v"),
      }),
    ).rejects.toMatchObject({ code: "E_JOB_NOT_FOUND" });
  });

  it("rejects when the setting path does not exist", async () => {
    const fakeBin = join(tmp, "Compressor");
    await writeFile(fakeBin, "#!/bin/sh\nexit 0", "utf-8");
    const job = join(tmp, "in.mov");
    await writeFile(job, "x", "utf-8");
    process.env.CREATOR_STUDIO_COMPRESSOR_BIN = fakeBin;
    await expect(
      encodeJob({
        jobPath: job,
        settingPath: join(tmp, "nope.compressorsetting"),
        locationPath: join(tmp, "out.m4v"),
      }),
    ).rejects.toMatchObject({ code: "E_SETTING_NOT_FOUND" });
  });
});
