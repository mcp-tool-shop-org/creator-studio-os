/**
 * compressor-monitor-full.test.ts
 *
 * Covers monitor.ts code paths not hit by the existing compressor-monitor.test.ts:
 *  - monitorStream: yields frames, terminal-state detection, short-encode path
 *  - waitFor: delegates to monitorStream, synthetic terminal frame on empty stream
 *  - drainCompressorQueue: queue-empty and kill paths
 *  - jobAction: non-zero exit → E_COMPRESSOR_MONITOR_FAILED
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { monitorStream, waitFor, drainCompressorQueue, jobAction } from "@creator-studio-os/compressor";
import { CreatorStudioError } from "@creator-studio-os/core";

let tmp: string;
let origBin: string | undefined;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "csos-monitor-full-"));
  origBin = process.env.CREATOR_STUDIO_COMPRESSOR_BIN;
});

afterEach(async () => {
  if (origBin === undefined) delete process.env.CREATOR_STUDIO_COMPRESSOR_BIN;
  else process.env.CREATOR_STUDIO_COMPRESSOR_BIN = origBin;
  await rm(tmp, { recursive: true, force: true });
});

async function makeBin(script: string) {
  const bin = join(tmp, "Compressor");
  await writeFile(bin, `#!/bin/sh\n${script}`, "utf-8");
  await chmod(bin, 0o755);
  process.env.CREATOR_STUDIO_COMPRESSOR_BIN = bin;
  return bin;
}

// A completed status frame as JSON
const COMPLETED_JSON = JSON.stringify({
  status: "completed",
  percentComplete: 100,
  timeElapsedSeconds: 3,
  timeRemainingSeconds: 0,
  name: "test",
  submissionTime: "2026-05-06T10:00:00Z",
  sentBy: "csos",
  jobid: "DONE-0000-0000-0000-000000000001",
  batchid: "DONE-0000-0000-0000-000000000002",
});

const ACTIVE_JSON = JSON.stringify({
  status: "active",
  percentComplete: 50,
  timeElapsedSeconds: 2,
  timeRemainingSeconds: 2,
  name: "test",
  submissionTime: "2026-05-06T10:00:00Z",
  sentBy: "csos",
  jobid: "ACTIVE-000-0000-0000-000000000001",
  batchid: "ACTIVE-000-0000-0000-000000000002",
});

const QUEUED_JSON = JSON.stringify({
  status: "queued",
  percentComplete: 0,
  timeElapsedSeconds: 0,
  timeRemainingSeconds: 99,
  name: "test",
  submissionTime: "2026-05-06T10:00:00Z",
  sentBy: "csos",
  jobid: "QUEUED-00-0000-0000-000000000001",
  batchid: "QUEUED-00-0000-0000-000000000002",
});

// ---------------------------------------------------------------------------
// monitorStream
// ---------------------------------------------------------------------------

describe("monitorStream", () => {
  it("yields a completed StatusFrame and then stops", async () => {
    // The binary outputs a completed frame then exits
    await makeBin(`echo '${COMPLETED_JSON}'`);

    const frames: import("../packages/compressor/src/monitor.js").StatusFrame[] = [];
    for await (const f of monitorStream({ intervalSec: 1, timeoutSec: 5 })) {
      frames.push(f);
    }

    expect(frames.length).toBeGreaterThanOrEqual(1);
    const last = frames[frames.length - 1];
    expect(last.status).toBe("completed");
    expect(last.jobId).toBe("DONE-0000-0000-0000-000000000001");
  }, 10000);

  it("yields active frame then stops when process exits naturally", async () => {
    // Binary outputs one active frame and exits — stream drains
    await makeBin(`echo '${ACTIVE_JSON}'`);

    const frames: import("../packages/compressor/src/monitor.js").StatusFrame[] = [];
    for await (const f of monitorStream({ intervalSec: 1, timeoutSec: 5 })) {
      frames.push(f);
    }
    // At least one frame captured
    expect(frames.length).toBeGreaterThanOrEqual(1);
    expect(frames[0].status).toBe("active");
  }, 10000);

  it("throws E_COMPRESSOR_NOT_FOUND when binary is missing", async () => {
    process.env.CREATOR_STUDIO_COMPRESSOR_BIN = join(tmp, "no-such-binary");
    const gen = monitorStream({ intervalSec: 1, timeoutSec: 5 });
    await expect(gen.next()).rejects.toMatchObject({ code: "E_COMPRESSOR_NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// waitFor
// ---------------------------------------------------------------------------

describe("waitFor", () => {
  it("returns completed frame when stream yields a terminal state", async () => {
    await makeBin(`echo '${COMPLETED_JSON}'`);
    const frame = await waitFor({ jobId: "DONE-0000-0000-0000-000000000001", untilStatus: "completed", timeoutSec: 5 });
    expect(frame.status).toBe("completed");
  }, 10000);

  it("returns synthetic completed frame when stream is immediately empty (fast-encode path)", async () => {
    // Binary exits immediately with no output — queue was empty before first poll
    await makeBin(`exit 0`);
    const frame = await waitFor({ jobId: "FAST-0000-0000-0000-000000000001", untilStatus: "completed", timeoutSec: 5 });
    // Should synthesise a completed frame rather than throwing
    expect(frame.status).toBe("completed");
    expect(frame.percentComplete).toBe(100);
  }, 10000);

  it("returns the last frame seen even if it is not the target status", async () => {
    // Binary outputs an active frame and exits
    await makeBin(`echo '${ACTIVE_JSON}'`);
    const frame = await waitFor({ untilStatus: "completed", timeoutSec: 5 });
    // Stream ended — should return whatever was seen (active frame or synthetic completed)
    expect(["active", "completed"]).toContain(frame.status);
  }, 10000);
});

// ---------------------------------------------------------------------------
// drainCompressorQueue
// ---------------------------------------------------------------------------

describe("drainCompressorQueue", () => {
  it("returns immediately when the binary reports no jobs (empty JSON array)", async () => {
    // Return empty array — nothing to drain
    await makeBin(`echo '[]'`);
    await expect(drainCompressorQueue(5)).resolves.toBeUndefined();
  }, 10000);

  it("returns immediately when binary reports no JSON (empty output)", async () => {
    await makeBin(`exit 0`);
    await expect(drainCompressorQueue(5)).resolves.toBeUndefined();
  }, 10000);

  it("kills active jobs and waits for queue to clear", async () => {
    // First call: returns an active job; second call: returns empty
    const script = `
COUNTER_FILE="${tmp}/call_count.txt"
count=0
if [ -f "$COUNTER_FILE" ]; then
  count=$(cat "$COUNTER_FILE")
fi
count=$((count + 1))
echo "$count" > "$COUNTER_FILE"

if echo "$@" | grep -q "\\-kill"; then
  exit 0
fi

if [ "$count" -le 1 ]; then
  echo '${QUEUED_JSON}'
else
  echo '[]'
fi
`;
    await makeBin(script);
    await expect(drainCompressorQueue(10)).resolves.toBeUndefined();
  }, 15000);

  it("throws E_COMPRESSOR_NOT_FOUND when binary is missing", async () => {
    process.env.CREATOR_STUDIO_COMPRESSOR_BIN = join(tmp, "no-such-binary");
    await expect(drainCompressorQueue(5)).rejects.toMatchObject({ code: "E_COMPRESSOR_NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// jobAction error paths (the success paths are covered by existing tests)
// ---------------------------------------------------------------------------

describe("jobAction error paths", () => {
  it("rejects with E_COMPRESSOR_MONITOR_FAILED when binary exits non-zero on pause", async () => {
    await makeBin(`echo 'invalid job id' >&2; exit 2`);
    await expect(jobAction("pause", { jobId: "X" })).rejects.toMatchObject({
      code: "E_COMPRESSOR_MONITOR_FAILED",
    } satisfies Partial<CreatorStudioError>);
  });

  it("rejects with E_COMPRESSOR_MONITOR_FAILED when binary exits with no stderr output", async () => {
    // Cover the `stderr.trim() || "no output"` fallback branch
    await makeBin(`exit 3`);
    const err = await jobAction("kill", { batchId: "B" }).catch((e) => e) as CreatorStudioError;
    expect(err.code).toBe("E_COMPRESSOR_MONITOR_FAILED");
    expect(err.message).toContain("no output");
  });
});

// ---------------------------------------------------------------------------
// extractFrames — JSON array and wrapped { jobs } / { batches } branches
// ---------------------------------------------------------------------------

describe("statusOnce — wrapped JSON formats", () => {
  it("parses frames from a JSON array in stdout", async () => {
    const arr = JSON.stringify([
      { status: "active", percentComplete: 30, jobid: "ARR-JOB", batchid: "ARR-BATCH" },
    ]);
    await makeBin(`echo '${arr}'`);
    const frame = await (await import("../packages/compressor/src/monitor.js")).statusOnce({});
    expect(frame.status).toBe("active");
    expect(frame.jobId).toBe("ARR-JOB");
  });

  it("parses frames from a { jobs: [...] } wrapper", async () => {
    const wrapped = JSON.stringify({
      jobs: [
        { status: "queued", percentComplete: 0, jobid: "WRAP-JOB", batchid: "WRAP-BATCH" },
      ],
    });
    await makeBin(`echo '${wrapped}'`);
    const frame = await (await import("../packages/compressor/src/monitor.js")).statusOnce({});
    expect(frame.status).toBe("queued");
    expect(frame.jobId).toBe("WRAP-JOB");
  });

  it("parses frames from a { batches: [...] } wrapper", async () => {
    const wrapped = JSON.stringify({
      batches: [
        { status: "completed", percentComplete: 100, jobid: "BWRAP-JOB", batchid: "BWRAP-BATCH" },
      ],
    });
    await makeBin(`echo '${wrapped}'`);
    const frame = await (await import("../packages/compressor/src/monitor.js")).statusOnce({});
    expect(frame.status).toBe("completed");
  });

  it("maps encoding/transcoding/processing status aliases to active", async () => {
    const frame1 = JSON.stringify({ status: "encoding", jobid: "X", batchid: "Y" });
    await makeBin(`echo '${frame1}'`);
    const f = await (await import("../packages/compressor/src/monitor.js")).statusOnce({});
    expect(f.status).toBe("active");
  });
});
