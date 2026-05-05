/**
 * Recovery profile stub — no known daemon-state issues for this app.
 * Add a badStatePattern + recover() when smoke surfaces a recoverable error.
 */
import type { RecoveryProfile } from "../../runners/withDaemonRecovery.js";

export const recovery: RecoveryProfile = {
  app: "motion",
  badStatePattern: null,
  async recover() {
    // No recovery action defined yet.
  },
};
