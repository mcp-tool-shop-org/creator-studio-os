/**
 * csos_app_status — unit tests (dry-run mode, CI-safe).
 *
 * All tests run with dryRun: true so no real apps are required.
 * Shape validation covers: required fields, type correctness, valid AppName values.
 */
import { describe, it, expect } from "vitest";
import {
  getAppStatus,
  getAllAppStatus,
  ALL_APP_NAMES,
  type AppName,
  type AppStatus,
} from "../src/apps/status.js";

function assertShape(s: AppStatus, app: AppName) {
  expect(s.app).toBe(app);
  expect(typeof s.running).toBe("boolean");
  expect(typeof s.healthy).toBe("boolean");
  if (s.version !== undefined) expect(typeof s.version).toBe("string");
  if (s.frontDocument !== undefined) expect(typeof s.frontDocument).toBe("string");
  if (s.queueDepth !== undefined) expect(typeof s.queueDepth).toBe("number");
  if (s.inFlightJobs !== undefined) expect(typeof s.inFlightJobs).toBe("number");
  if (s.lastError !== undefined) expect(typeof s.lastError).toBe("string");
}

describe("getAppStatus (dry-run)", () => {
  for (const app of ALL_APP_NAMES) {
    it(`returns valid AppStatus shape for ${app}`, async () => {
      const s = await getAppStatus(app, { dryRun: true });
      assertShape(s, app);
    });
  }

  it("returns app: fcp for fcp", async () => {
    const s = await getAppStatus("fcp", { dryRun: true });
    expect(s.app).toBe("fcp");
  });

  it("returns app: compressor with optional queue fields present or absent", async () => {
    const s = await getAppStatus("compressor", { dryRun: true });
    expect(s.app).toBe("compressor");
    // queueDepth and inFlightJobs are optional — if present must be numbers
    if (s.queueDepth !== undefined) expect(typeof s.queueDepth).toBe("number");
    if (s.inFlightJobs !== undefined) expect(typeof s.inFlightJobs).toBe("number");
  });
});

describe("getAllAppStatus (dry-run)", () => {
  it("returns exactly 8 statuses", async () => {
    const statuses = await getAllAppStatus({ dryRun: true });
    expect(statuses).toHaveLength(8);
  });

  it("covers all AppName values", async () => {
    const statuses = await getAllAppStatus({ dryRun: true });
    const apps = statuses.map((s) => s.app).sort();
    expect(apps).toEqual([...ALL_APP_NAMES].sort());
  });

  it("all shapes are valid", async () => {
    const statuses = await getAllAppStatus({ dryRun: true });
    for (const s of statuses) {
      assertShape(s, s.app);
    }
  });
});

describe("AppStatus shape invariants", () => {
  it("unhealthy status never has frontDocument from dry-run fixture", async () => {
    // All dry-run fixtures represent not-running state (CI has no apps);
    // a not-running app should never report a frontDocument
    const statuses = await getAllAppStatus({ dryRun: true });
    for (const s of statuses) {
      if (!s.running) {
        expect(s.frontDocument).toBeUndefined();
      }
    }
  });
});
