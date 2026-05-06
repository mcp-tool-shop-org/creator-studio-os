/**
 * FCPXML round-trip diff engine.
 *
 * Compares two ParsedTimeline snapshots (before and after FCP round-trip) and
 * returns a structured list of the 12 known transformation types FCP applies.
 * Each DiffItem names exactly what changed so automation can decide whether to
 * re-import or raise an alert.
 */
import type {
  ParsedTimeline,
  ParsedClip,
  ParsedTitle,
  ParsedTransition,
  ParsedAsset,
  ParsedFormat,
} from "./parser.js";

// ─── Diff kinds ───────────────────────────────────────────────────────────────

export type DiffKind =
  // Spine clip changes
  | "clip-inserted"
  | "clip-deleted"
  | "clip-offset-changed"
  | "clip-duration-changed"
  | "clip-role-changed"
  | "clip-volume-changed"
  // Title changes
  | "title-inserted"
  | "title-deleted"
  | "title-text-changed"
  | "title-param-changed"
  | "title-lane-changed"
  // Structural changes
  | "transition-inserted"
  | "transition-deleted"
  | "asset-replaced"
  | "format-changed"
  | "marker-added"
  | "marker-removed";

export interface DiffItem {
  kind: DiffKind;
  itemName: string;
  before?: unknown;
  after?: unknown;
}

export interface RoundTripDiff {
  before: { eventName: string; projectName: string };
  after: { eventName: string; projectName: string };
  diffs: DiffItem[];
  summary: string;
}

// ─── Time tolerance ───────────────────────────────────────────────────────────

const TIME_TOLERANCE = 0.001; // 1ms — sub-frame even at 60fps

function timesEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= TIME_TOLERANCE;
}

// ─── Match helpers ────────────────────────────────────────────────────────────

function clipKey(c: ParsedClip): string {
  return `${c.name}::${c.ref}`;
}

function titleKey(t: ParsedTitle): string {
  return `${t.name}::${t.ref}::${t.lane}`;
}

function transitionKey(t: ParsedTransition): string {
  return `${t.name}::${t.offsetSeconds.toFixed(4)}`;
}

function assetKey(a: ParsedAsset): string {
  return a.name;
}

// ─── Per-item diffing ─────────────────────────────────────────────────────────

function diffClip(before: ParsedClip, after: ParsedClip, diffs: DiffItem[]): void {
  const n = before.name;

  if (!timesEqual(before.offsetSeconds, after.offsetSeconds)) {
    diffs.push({
      kind: "clip-offset-changed",
      itemName: n,
      before: before.offsetSeconds,
      after: after.offsetSeconds,
    });
  }
  if (!timesEqual(before.durationSeconds, after.durationSeconds)) {
    diffs.push({
      kind: "clip-duration-changed",
      itemName: n,
      before: before.durationSeconds,
      after: after.durationSeconds,
    });
  }
  if (before.videoRole !== after.videoRole || before.audioRole !== after.audioRole) {
    diffs.push({
      kind: "clip-role-changed",
      itemName: n,
      before: { videoRole: before.videoRole, audioRole: before.audioRole },
      after: { videoRole: after.videoRole, audioRole: after.audioRole },
    });
  }
  if ((before.volumeDb ?? 0) !== (after.volumeDb ?? 0)) {
    diffs.push({
      kind: "clip-volume-changed",
      itemName: n,
      before: before.volumeDb ?? 0,
      after: after.volumeDb ?? 0,
    });
  }

  // Diff connected titles
  diffTitleList(
    before.connectedTitles,
    after.connectedTitles,
    diffs,
    `(connected to "${n}")`,
  );
}

function diffTitle(before: ParsedTitle, after: ParsedTitle, diffs: DiffItem[]): void {
  const n = before.name;

  if (before.text !== after.text) {
    diffs.push({ kind: "title-text-changed", itemName: n, before: before.text, after: after.text });
  }
  if (before.lane !== after.lane) {
    diffs.push({ kind: "title-lane-changed", itemName: n, before: before.lane, after: after.lane });
  }

  // Diff params by name
  const beforeParams = new Map(before.params.map((p) => [p.name, p]));
  const afterParams = new Map(after.params.map((p) => [p.name, p]));

  for (const [pName, bp] of beforeParams) {
    const ap = afterParams.get(pName);
    if (!ap) {
      diffs.push({ kind: "title-param-changed", itemName: n, before: bp, after: null });
    } else if (bp.value !== ap.value || bp.key !== ap.key) {
      diffs.push({ kind: "title-param-changed", itemName: n, before: bp, after: ap });
    }
  }
  for (const [pName, ap] of afterParams) {
    if (!beforeParams.has(pName)) {
      diffs.push({ kind: "title-param-changed", itemName: n, before: null, after: ap });
    }
  }
}

function diffTitleList(
  before: ParsedTitle[],
  after: ParsedTitle[],
  diffs: DiffItem[],
  context: string,
): void {
  const beforeMap = new Map(before.map((t) => [titleKey(t), t]));
  const afterMap = new Map(after.map((t) => [titleKey(t), t]));

  for (const [key, bt] of beforeMap) {
    const at = afterMap.get(key);
    if (!at) {
      diffs.push({ kind: "title-deleted", itemName: `${bt.name} ${context}` });
    } else {
      diffTitle(bt, at, diffs);
    }
  }
  for (const [key, at] of afterMap) {
    if (!beforeMap.has(key)) {
      diffs.push({ kind: "title-inserted", itemName: `${at.name} ${context}` });
    }
  }
}

// ─── Main diff ────────────────────────────────────────────────────────────────

export function diffTimelines(before: ParsedTimeline, after: ParsedTimeline): RoundTripDiff {
  const diffs: DiffItem[] = [];

  // Format
  const fmtChanged =
    before.format.width !== after.format.width ||
    before.format.height !== after.format.height ||
    before.format.frameDuration !== after.format.frameDuration ||
    before.format.colorSpace !== after.format.colorSpace;
  if (fmtChanged) {
    diffs.push({
      kind: "format-changed",
      itemName: "format",
      before: before.format,
      after: after.format,
    });
  }

  // Assets
  const beforeAssets = new Map(before.assets.map((a) => [assetKey(a), a]));
  const afterAssets = new Map(after.assets.map((a) => [assetKey(a), a]));
  for (const [key, ba] of beforeAssets) {
    const aa = afterAssets.get(key);
    if (!aa) {
      diffs.push({ kind: "asset-replaced", itemName: key, before: ba, after: null });
    } else if (ba.src !== aa.src) {
      diffs.push({ kind: "asset-replaced", itemName: key, before: ba.src, after: aa.src });
    }
  }
  for (const [key, aa] of afterAssets) {
    if (!beforeAssets.has(key)) {
      diffs.push({ kind: "asset-replaced", itemName: key, before: null, after: aa });
    }
  }

  // Spine: clips
  const beforeClips = before.spine.filter((s): s is ParsedClip => s.kind === "clip");
  const afterClips = after.spine.filter((s): s is ParsedClip => s.kind === "clip");
  const beforeClipMap = new Map(beforeClips.map((c) => [clipKey(c), c]));
  const afterClipMap = new Map(afterClips.map((c) => [clipKey(c), c]));

  for (const [key, bc] of beforeClipMap) {
    const ac = afterClipMap.get(key);
    if (!ac) {
      diffs.push({ kind: "clip-deleted", itemName: bc.name });
    } else {
      diffClip(bc, ac, diffs);
    }
  }
  for (const [key, ac] of afterClipMap) {
    if (!beforeClipMap.has(key)) {
      diffs.push({ kind: "clip-inserted", itemName: ac.name });
    }
  }

  // Spine: standalone titles
  const beforeTitles = before.spine.filter((s): s is ParsedTitle => s.kind === "title");
  const afterTitles = after.spine.filter((s): s is ParsedTitle => s.kind === "title");
  diffTitleList(beforeTitles, afterTitles, diffs, "(standalone)");

  // Spine: transitions
  const beforeTrans = before.spine.filter((s): s is ParsedTransition => s.kind === "transition");
  const afterTrans = after.spine.filter((s): s is ParsedTransition => s.kind === "transition");
  const beforeTransMap = new Map(beforeTrans.map((t) => [transitionKey(t), t]));
  const afterTransMap = new Map(afterTrans.map((t) => [transitionKey(t), t]));

  for (const [key, bt] of beforeTransMap) {
    if (!afterTransMap.has(key)) {
      diffs.push({ kind: "transition-deleted", itemName: bt.name });
    }
  }
  for (const [key, at] of afterTransMap) {
    if (!beforeTransMap.has(key)) {
      diffs.push({ kind: "transition-inserted", itemName: at.name });
    }
  }

  const n = diffs.length;
  const summary =
    n === 0
      ? "No differences detected — perfect round-trip."
      : `${n} difference${n === 1 ? "" : "s"} detected: ${[...new Set(diffs.map((d) => d.kind))].join(", ")}.`;

  return {
    before: { eventName: before.eventName, projectName: before.projectName },
    after: { eventName: after.eventName, projectName: after.projectName },
    diffs,
    summary,
  };
}
