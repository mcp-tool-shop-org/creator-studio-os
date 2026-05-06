/**
 * withDaemonRecovery — generalized daemon-state recovery wrapper.
 *
 * Motivation (from v1.6 smoke): Compressor's daemon can land in a bad state
 * where it refuses new submissions with "Unable to submit to queue." The fix is
 * to kill the process, wait for it to fully exit, and retry the operation once —
 * the daemon respawns on the next CLI invocation.
 *
 * Each app registers a RecoveryProfile in `src/apps/<app>/recovery.ts`.
 * Most apps have no known daemon-state issues (badStatePattern: null).
 * Future smokes add profiles when they surface new bad-state patterns.
 *
 * Usage:
 *   import { withDaemonRecovery } from "../../runners/withDaemonRecovery.js";
 *   import { compressorRecovery } from "./recovery.js";
 *
 *   const result = await withDaemonRecovery(compressorRecovery, () => encodeJobOnce(job));
 */

export interface RecoveryProfile {
  /** App name for logging */
  app: string;
  /**
   * Pattern matched against the thrown error's .message.
   * If null, no recovery is attempted (pass-through behaviour).
   */
  badStatePattern: RegExp | null;
  /**
   * Recovery action run once when badStatePattern matches.
   * Should be idempotent: kill process, signal service, etc.
   */
  recover(): Promise<void>;
}

/**
 * Wrap `fn` with a single-retry recovery cycle.
 *
 * 1. Call `fn()`. If it succeeds, return the result.
 * 2. If it throws and `profile.badStatePattern` matches the error message,
 *    run `profile.recover()` then retry `fn()` once.
 * 3. If `badStatePattern` is null or the error doesn't match, re-throw immediately.
 * 4. If the retry also fails, re-throw the retry error.
 */
export async function withDaemonRecovery<T>(
  profile: RecoveryProfile,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (firstErr) {
    if (
      profile.badStatePattern !== null &&
      firstErr instanceof Error &&
      profile.badStatePattern.test(firstErr.message)
    ) {
      await profile.recover();
      return fn();
    }
    throw firstErr;
  }
}
