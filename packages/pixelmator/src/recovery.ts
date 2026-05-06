/**
 * Recovery profile stub — no known daemon-state issues for this app.
 * Add a badStatePattern + recover() when smoke surfaces a recoverable error.
 */
import type { RecoveryProfile } from "@creator-studio-os/core";

export const recovery: RecoveryProfile = {
  app: "pixelmator",
  badStatePattern: null,
  async recover() {
    // No recovery action defined yet.
  },
};
