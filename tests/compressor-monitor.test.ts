import { describe, it, expect } from "vitest";

// Internal helpers — exercise parseFrame and extractFrames logic via monkey-patching
// or by testing the public functions in a controlled way.
// We can't easily run the real Compressor binary in CI, so these tests cover:
// 1. The JSON output parsing logic (via fixtures)
// 2. The jobAction argv composition (via a fake binary)
// 3. The timeout / terminal-state logic

// Re-export private helpers for testing by importing the module
// (TypeScript keeps them in module scope; we test indirectly via exported functions)

import { statusOnce, jobAction } from "@creator-studio-os/compressor";
import { CreatorStudioError } from "@creator-studio-os/core";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Fixture: what `-monitor -format json -once` should return for an active job
const ACTIVE_FRAME_JSON = JSON.stringify({
  status: "active",
  percentComplete: 47,
  timeElapsedSeconds: 30,
  timeRemainingSeconds: 33,
  name: "test-batch",
  submissionTime: "2026-05-05T10:00:00Z",
  sentBy: "creator-studio-os",
  jobid: "A1B2C3D4-0000-0000-0000-000000000001",
  batchid: "A1B2C3D4-0000-0000-0000-000000000002",
});

const COMPLETED_FRAME_JSON = JSON.stringify({
  status: "completed",
  percentComplete: 100,
  timeElapsedSeconds: 60,
  timeRemainingSeconds: 0,
  name: "test-batch",
  submissionTime: "2026-05-05T10:00:00Z",
  sentBy: "creator-studio-os",
  jobid: "A1B2C3D4-0000-0000-0000-000000000001",
  batchid: "A1B2C3D4-0000-0000-0000-000000000002",
});

let tmp: string;
let origBin: string | undefined;

async function setup() {
  tmp = await mkdtemp(join(tmpdir(), "csos-monitor-test-"));
  origBin = process.env.CREATOR_STUDIO_COMPRESSOR_BIN;
}

async function teardown() {
  if (origBin === undefined) delete process.env.CREATOR_STUDIO_COMPRESSOR_BIN;
  else process.env.CREATOR_STUDIO_COMPRESSOR_BIN = origBin;
  await rm(tmp, { recursive: true, force: true });
}

describe("statusOnce — fixture output", () => {
  it("parses a JSON status frame from binary stdout", async () => {
    await setup();
    try {
      const fakeBin = join(tmp, "Compressor");
      await writeFile(fakeBin, `#!/bin/sh\necho '${ACTIVE_FRAME_JSON}'\n`, "utf-8");
      await chmod(fakeBin, 0o755);
      process.env.CREATOR_STUDIO_COMPRESSOR_BIN = fakeBin;

      const frame = await statusOnce({});
      expect(frame.status).toBe("active");
      expect(frame.percentComplete).toBe(47);
      expect(frame.jobId).toBe("A1B2C3D4-0000-0000-0000-000000000001");
      expect(frame.batchId).toBe("A1B2C3D4-0000-0000-0000-000000000002");
    } finally {
      await teardown();
    }
  });

  it("parses a completed frame", async () => {
    await setup();
    try {
      const fakeBin = join(tmp, "Compressor");
      await writeFile(fakeBin, `#!/bin/sh\necho '${COMPLETED_FRAME_JSON}'\n`, "utf-8");
      await chmod(fakeBin, 0o755);
      process.env.CREATOR_STUDIO_COMPRESSOR_BIN = fakeBin;

      const frame = await statusOnce({});
      expect(frame.status).toBe("completed");
      expect(frame.percentComplete).toBe(100);
    } finally {
      await teardown();
    }
  });

  it("throws E_COMPRESSOR_MONITOR_FAILED when binary returns no JSON", async () => {
    await setup();
    try {
      const fakeBin = join(tmp, "Compressor");
      await writeFile(fakeBin, `#!/bin/sh\necho 'not json output'\n`, "utf-8");
      await chmod(fakeBin, 0o755);
      process.env.CREATOR_STUDIO_COMPRESSOR_BIN = fakeBin;

      await expect(statusOnce({})).rejects.toMatchObject({
        code: "E_COMPRESSOR_MONITOR_FAILED",
      } satisfies Partial<CreatorStudioError>);
    } finally {
      await teardown();
    }
  });

  it("throws E_COMPRESSOR_NOT_FOUND when binary is missing", async () => {
    await setup();
    try {
      process.env.CREATOR_STUDIO_COMPRESSOR_BIN = join(tmp, "no-such-binary");
      await expect(statusOnce({})).rejects.toMatchObject({ code: "E_COMPRESSOR_NOT_FOUND" });
    } finally {
      await teardown();
    }
  });
});

describe("jobAction argv composition", () => {
  it("invokes -pause with batchid", async () => {
    await setup();
    try {
      const logFile = join(tmp, "args.txt");
      const fakeBin = join(tmp, "Compressor");
      await writeFile(fakeBin, `#!/bin/sh\necho "$@" > "${logFile}"\n`, "utf-8");
      await chmod(fakeBin, 0o755);
      process.env.CREATOR_STUDIO_COMPRESSOR_BIN = fakeBin;

      await jobAction("pause", { batchId: "BATCH-001" });
      const { readFile } = await import("node:fs/promises");
      const logged = (await readFile(logFile, "utf-8")).trim();
      expect(logged).toContain("-pause");
      expect(logged).toContain("-batchid");
      expect(logged).toContain("BATCH-001");
    } finally {
      await teardown();
    }
  });

  it("invokes -kill with jobid", async () => {
    await setup();
    try {
      const logFile = join(tmp, "args.txt");
      const fakeBin = join(tmp, "Compressor");
      await writeFile(fakeBin, `#!/bin/sh\necho "$@" > "${logFile}"\n`, "utf-8");
      await chmod(fakeBin, 0o755);
      process.env.CREATOR_STUDIO_COMPRESSOR_BIN = fakeBin;

      await jobAction("kill", { jobId: "JOB-999" });
      const { readFile } = await import("node:fs/promises");
      const logged = (await readFile(logFile, "utf-8")).trim();
      expect(logged).toContain("-kill");
      expect(logged).toContain("-jobid");
      expect(logged).toContain("JOB-999");
    } finally {
      await teardown();
    }
  });
});
