/**
 * withDaemonRecovery — unit tests.
 */
import { describe, it, expect, vi } from "vitest";
import { withDaemonRecovery, type RecoveryProfile } from "@creator-studio-os/core";

function makeProfile(opts?: Partial<RecoveryProfile>): RecoveryProfile & { recoverCalled: boolean } {
  let recoverCalled = false;
  const profile: RecoveryProfile & { recoverCalled: boolean } = {
    app: "test-app",
    badStatePattern: /bad state/i,
    async recover() { recoverCalled = true; },
    get recoverCalled() { return recoverCalled; },
    set recoverCalled(v) { recoverCalled = v; },
    ...opts,
  };
  return profile;
}

describe("withDaemonRecovery", () => {
  it("returns fn() result on first-call success", async () => {
    const profile = makeProfile();
    const result = await withDaemonRecovery(profile, async () => "ok");
    expect(result).toBe("ok");
    expect(profile.recoverCalled).toBe(false);
  });

  it("retries after matching error and returns retry result", async () => {
    const profile = makeProfile();
    let calls = 0;
    const result = await withDaemonRecovery(profile, async () => {
      calls++;
      if (calls === 1) throw new Error("bad state detected");
      return "recovered";
    });
    expect(result).toBe("recovered");
    expect(profile.recoverCalled).toBe(true);
    expect(calls).toBe(2);
  });

  it("re-throws immediately when error does not match pattern", async () => {
    const profile = makeProfile();
    await expect(
      withDaemonRecovery(profile, async () => { throw new Error("unrelated error"); }),
    ).rejects.toThrow("unrelated error");
    expect(profile.recoverCalled).toBe(false);
  });

  it("re-throws immediately when badStatePattern is null", async () => {
    const profile = makeProfile({ badStatePattern: null });
    await expect(
      withDaemonRecovery(profile, async () => { throw new Error("bad state"); }),
    ).rejects.toThrow("bad state");
    expect(profile.recoverCalled).toBe(false);
  });

  it("re-throws retry error if recovery does not fix the problem", async () => {
    const profile = makeProfile();
    await expect(
      withDaemonRecovery(profile, async () => { throw new Error("bad state persists"); }),
    ).rejects.toThrow("bad state persists");
    expect(profile.recoverCalled).toBe(true);
  });

  it("does not retry more than once", async () => {
    const profile = makeProfile();
    let calls = 0;
    await expect(
      withDaemonRecovery(profile, async () => {
        calls++;
        throw new Error("bad state forever");
      }),
    ).rejects.toThrow();
    expect(calls).toBe(2); // first call + one retry
  });
});
