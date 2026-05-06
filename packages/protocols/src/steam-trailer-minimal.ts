/**
 * steam-trailer-minimal — legacy alias for brand-deck-minimal (v1.7.7+).
 *
 * The per-scene Motion render + ffmpeg concat path originally prototyped here
 * has been folded into brand-deck-minimal, which is now the canonical 13-step
 * protocol. This file re-exports everything from there under the old name so
 * existing registry keys, tests, and CLI invocations continue to work without
 * change.
 */
export { STEP_NAMES, type StepName } from "./brand-deck-minimal.js";

import type { ProtocolDef } from "./types.js";
import { brandDeckMinimal } from "./brand-deck-minimal.js";

export const steamTrailerMinimal: ProtocolDef = {
  ...brandDeckMinimal,
  name: "steam-trailer-minimal",
};
