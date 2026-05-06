/**
 * Shared types for the csos cross-app protocol system.
 *
 * Protocols are async generators that yield ProtocolStep events.  The
 * orchestrator in index.ts reads from the generator, writes replay manifest
 * entries, and updates the MCP task store between yields.
 */
import type { ProjectV2 } from "../projects/types.js";

// ---------------------------------------------------------------------------
// Step status
// ---------------------------------------------------------------------------

export type StepStatus = "pending" | "running" | "completed" | "skipped" | "failed";

// ---------------------------------------------------------------------------
// Replay manifest — persisted at <outDir>/.csos/replay-<taskId>.json
// ---------------------------------------------------------------------------

export interface ReplayEntry {
  /** Unique step name within this protocol */
  stepName: string;
  status: StepStatus;
  /** sha256(protocolName|idempotencyKey|stepName) */
  inputHash: string;
  /** sha256 of the step's primary output artifact(s) — set on completion */
  outputHash?: string;
  completedAt: string;
  durationMs: number;
  detail?: string;
}

export interface ReplayManifest {
  taskId: string;
  protocolName: string;
  projectSlug: string;
  /** sha256(protocolName|canonicalProjectJSON) */
  idempotencyKey: string;
  steps: ReplayEntry[];
  startedAt: string;
  /** Populated when all steps finish (including failures) */
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Step event yielded by protocol generators
// ---------------------------------------------------------------------------

export interface ProtocolStep {
  stepName: string;
  status: StepStatus;
  detail?: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Options passed into protocol run() generators
// ---------------------------------------------------------------------------

export interface RunProtocolOpts {
  /** Unique task ID from the MCP task store (or "cli-<timestamp>" from CLI) */
  taskId: string;
  dryRun: boolean;
  /** If resuming, the caller pre-loads this from the replay manifest */
  resumeManifest?: ReplayManifest;
  /**
   * Absolute path to the output directory for this run.
   * Protocol steps write: out/.csos/, out/fcp/, out/<deliverables>
   */
  projectOutDir: string;
  /**
   * Registry name for this protocol invocation — written to the replay manifest.
   * Defaults to the protocol's own name; set by the orchestrator so aliases
   * (e.g. steam-trailer-minimal → brand-deck-minimal) record the caller's name.
   */
  protocolName?: string;
}

// ---------------------------------------------------------------------------
// Protocol definition
// ---------------------------------------------------------------------------

export interface ProtocolDef {
  /** Machine-readable name used in CLI and tool calls */
  name: string;
  description: string;
  /** Ordered list of step names — used for dry-run shape assertions */
  stepNames: readonly string[];
  run(project: ProjectV2, opts: RunProtocolOpts): AsyncGenerator<ProtocolStep>;
}
