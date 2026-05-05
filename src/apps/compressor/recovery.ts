/**
 * Compressor daemon-state recovery profile.
 *
 * Surfaced by v1.6 smoke on macOS 26 / Compressor 5.2 (M5 Max):
 * After a Phase 1 encode, the Compressor daemon can refuse new submissions
 * with exit code 3 and "Unable to submit to queue" in stderr.
 *
 * Recovery: kill the Compressor process (it respawns on next CLI call), wait 2s.
 * One retry is sufficient; the daemon picks up cleanly on next invocation.
 */
import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RecoveryProfile } from "../../runners/withDaemonRecovery.js";

const execFile = promisify(_execFile);

export const compressorRecovery: RecoveryProfile = {
  app: "compressor",
  badStatePattern: /Unable to submit to queue/i,
  async recover() {
    await execFile("killall", ["Compressor"]).catch(() => {
      // Ignore ESRCH — process may have already exited
    });
    await new Promise((r) => setTimeout(r, 2000));
  },
};
