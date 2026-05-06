import { describe, it, expect } from "vitest";
import {
  frameDurationAttr,
  secondsToTime,
  frameDurationSeconds,
} from "@creator-studio-os/fcp";

describe("frameDurationAttr", () => {
  it("emits the standard frame durations FCP expects", () => {
    expect(frameDurationAttr("23.98")).toBe("1001/24000s");
    expect(frameDurationAttr("24")).toBe("100/2400s");
    expect(frameDurationAttr("25")).toBe("100/2500s");
    expect(frameDurationAttr("29.97")).toBe("1001/30000s");
    expect(frameDurationAttr("30")).toBe("100/3000s");
    expect(frameDurationAttr("59.94")).toBe("1001/60000s");
    expect(frameDurationAttr("60")).toBe("100/6000s");
  });
});

describe("secondsToTime", () => {
  it("returns 0s for zero", () => {
    expect(secondsToTime(0, "29.97")).toBe("0s");
  });

  it("snaps to integer frames at 29.97", () => {
    expect(secondsToTime(1, "29.97")).toBe(`${30 * 1001}/30000s`);
    expect(secondsToTime(5, "29.97")).toBe(`${150 * 1001}/30000s`);
  });

  it("snaps to integer frames at 24", () => {
    expect(secondsToTime(1, "24")).toBe(`${24 * 100}/2400s`);
    expect(secondsToTime(2.5, "24")).toBe(`${60 * 100}/2400s`);
  });

  it("rounds sub-frame times", () => {
    const t = secondsToTime(0.05, "30");
    expect(t).toMatch(/^\d+\/3000s$/);
  });
});

describe("frameDurationSeconds", () => {
  it("returns the per-frame duration in seconds", () => {
    expect(frameDurationSeconds("30")).toBeCloseTo(1 / 30, 6);
    expect(frameDurationSeconds("29.97")).toBeCloseTo(1001 / 30000, 6);
  });
});
