/**
 * FCP safety pre-flights — structural checks that run against a ProjectSpec
 * BEFORE the builder produces FCPXML.
 *
 * These catch classes of FCP import bugs that don't surface as DTD validation
 * errors but cause silent corruption or undefined behavior in the importer:
 *   - Overlapping spine clips → FCP inserts implicit compound clips
 *   - Caption/subtitle roles with missing subroles → silent role drop
 *   - Connected-clip (title) anchor collisions → two clips compete for the same attach point
 */
import { CreatorStudioError } from "../../errors.js";
import type { ProjectSpec, CaptionSpec } from "../../fcpxml/types.js";

// ─── Compound safety ─────────────────────────────────────────────────────────

export interface CompoundViolation {
  clipA: string;
  clipB: string;
  overlapSeconds: number;
}

export interface CompoundSafetyResult {
  safe: boolean;
  violations: CompoundViolation[];
  /** Set when two ref-clips share the same mediaId (propagation-on-save trap) */
  propagationWarning?: string;
}

/**
 * Detect primary-spine asset-clips whose time ranges overlap.
 * FCP resolves overlaps by creating implicit compound clips — a silent
 * structural change that breaks downstream automation.
 *
 * Also detects ref-clips sharing the same mediaId — the propagation-on-save
 * trap where two ref-clips sharing one <media> compound propagate edits
 * between them when FCP saves.
 */
export function validateCompoundSafety(spec: ProjectSpec): CompoundSafetyResult {
  // ── Primary-spine overlap check ───────────────────────────────────────────
  const clips = spec.spine
    .filter((s) => s.kind === "asset-clip" && (s.lane ?? 0) === 0)
    .map((s) => ({
      name: s.name,
      start: s.offsetSeconds,
      end: s.offsetSeconds + s.durationSeconds,
    }))
    .sort((a, b) => a.start - b.start);

  // ── ref-clip same-media propagation trap ──────────────────────────────────
  const refClips = spec.spine.filter((s) => s.kind === "ref-clip");
  const mediaIdCounts = new Map<string, string[]>();
  for (const rc of refClips) {
    const existing = mediaIdCounts.get(rc.mediaId) ?? [];
    existing.push(rc.name);
    mediaIdCounts.set(rc.mediaId, existing);
  }
  for (const [mediaId, names] of mediaIdCounts) {
    if (names.length > 1) {
      // Emit a violation for the second ref-clip (the first is fine)
      return {
        safe: false,
        violations: [
          {
            clipA: names[0],
            clipB: names[1],
            overlapSeconds: 0,
          },
        ],
        propagationWarning: `ref-clips "${names.join('", "')}" share mediaId="${mediaId}" — edits propagate between them on FCP save. Use distinct mediaId values.`,
      };
    }
  }

  const violations: CompoundViolation[] = [];

  for (let i = 0; i < clips.length - 1; i++) {
    const a = clips[i];
    const b = clips[i + 1];
    if (a.end > b.start) {
      violations.push({
        clipA: a.name,
        clipB: b.name,
        overlapSeconds: +(a.end - b.start).toFixed(6),
      });
    }
  }

  return { safe: violations.length === 0, violations };
}

// ─── Caption lint ─────────────────────────────────────────────────────────────

export interface CaptionIssue {
  clipName: string;
  role: string;
  reason: string;
}

export interface CaptionLintResult {
  ok: boolean;
  issues: CaptionIssue[];
}

const CAPTION_NAME_RE = /caption|subtitle/i;
// FCP roles must be "RoleName.SubroleName" — a bare role string breaks caption assignment
const ROLE_FORMAT_RE = /^[^.]+\.[^.]+/;
// FCP-recognised caption role prefixes
const VALID_CAPTION_ROLE_PREFIXES = ["iTT.", "CEA-608.", "SRT."];

/**
 * Lint caption and subtitle role assignments in a ProjectSpec.
 *
 * Checks:
 * - CaptionSpec items must have a role in "Role.Subrole" format with a
 *   recognised FCP prefix (iTT., CEA-608., SRT.) — caught at builder time,
 *   before FCP's importer can silently drop the caption.
 * - asset-clip audio/video roles that look like captions must use correct format.
 * - title items named like captions must not be on lane 0.
 */
export function lintCaptions(spec: ProjectSpec): CaptionLintResult {
  const issues: CaptionIssue[] = [];

  for (const item of spec.spine) {
    const name = item.name;

    // ── CaptionSpec: validate role at builder time ─────────────────────────
    if (item.kind === "caption") {
      const role = item.role;
      if (!ROLE_FORMAT_RE.test(role)) {
        issues.push({
          clipName: name,
          role,
          reason: `Caption role "${role}" is missing a subrole — FCP silently drops captions without "Role.Subrole" format`,
        });
      } else if (!VALID_CAPTION_ROLE_PREFIXES.some((pfx) => role.startsWith(pfx))) {
        issues.push({
          clipName: name,
          role,
          reason: `Caption role "${role}" uses an unrecognised prefix — FCP caption roles must start with "iTT.", "CEA-608.", or "SRT."`,
        });
      }
      continue;
    }

    if (item.kind === "asset-clip") {
      const { audioRole, videoRole } = item;

      for (const [field, role] of [
        ["audioRole", audioRole],
        ["videoRole", videoRole],
      ] as const) {
        if (!role) continue;
        if (!ROLE_FORMAT_RE.test(role)) {
          issues.push({
            clipName: name,
            role,
            reason: `${field} "${role}" is missing a subrole (expected "Role.Subrole" format — FCP will silently drop it)`,
          });
        }
        // If the role looks like a caption attempt but doesn't match FCP's caption role pattern
        if (CAPTION_NAME_RE.test(role) && !role.includes("iTT") && !role.includes("SRT")) {
          issues.push({
            clipName: name,
            role,
            reason: `${field} "${role}" appears to be a caption role but uses neither "iTT" nor "SRT" — FCP caption roles must follow the "iTT Role.iTT Subrole" convention`,
          });
        }
      }
    }

    if (item.kind === "title" && CAPTION_NAME_RE.test(name) && item.lane === 0) {
      issues.push({
        clipName: name,
        role: "(placement)",
        reason: `Title "${name}" looks like a caption but is on lane 0 (primary spine). Caption titles must be on lane >= 1.`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

// ─── Anchor safety ────────────────────────────────────────────────────────────

export interface AnchorCollision {
  titleA: string;
  titleB: string;
  lane: number;
  overlapSeconds: number;
}

export interface AnchorSafetyResult {
  safe: boolean;
  collisions: AnchorCollision[];
}

/**
 * Detect connected-clip anchor collisions (titles AND anchored asset-clips).
 *
 * Two anchored items on the same lane with overlapping time ranges compete for
 * the same attachment point on the spine. FCP's importer resolves this
 * non-deterministically and the output differs between FCP versions.
 *
 * Catches:
 * - title vs title on same lane
 * - anchored asset-clip vs anchored asset-clip on same lane
 * - title vs anchored asset-clip on same lane (cross-type collision)
 */
export function checkAnchorSafety(spec: ProjectSpec): AnchorSafetyResult {
  // Collect ALL anchored items (lane !== 0): titles + anchored asset-clips
  const anchored: Array<{ name: string; lane: number; start: number; end: number }> = [];

  for (const s of spec.spine) {
    if (s.kind === "title" && s.lane !== 0) {
      anchored.push({
        name: s.name,
        lane: s.lane,
        start: s.offsetSeconds,
        end: s.offsetSeconds + s.durationSeconds,
      });
    } else if (s.kind === "asset-clip" && (s.lane ?? 0) !== 0) {
      anchored.push({
        name: s.name,
        lane: s.lane ?? 1,
        start: s.offsetSeconds,
        end: s.offsetSeconds + s.durationSeconds,
      });
    }
  }

  anchored.sort((a, b) => a.lane - b.lane || a.start - b.start);

  const collisions: AnchorCollision[] = [];

  for (let i = 0; i < anchored.length - 1; i++) {
    const a = anchored[i];
    const b = anchored[i + 1];
    if (a.lane === b.lane && a.end > b.start) {
      collisions.push({
        titleA: a.name,
        titleB: b.name,
        lane: a.lane,
        overlapSeconds: +(a.end - b.start).toFixed(6),
      });
    }
  }

  return { safe: collisions.length === 0, collisions };
}

// ─── Combined runner ──────────────────────────────────────────────────────────

export interface PreflightResult {
  compound: CompoundSafetyResult;
  captions: CaptionLintResult;
  anchors: AnchorSafetyResult;
  allClear: boolean;
}

/**
 * Run all three safety checks. Throws the first blocking error unless
 * `allowUnsafe` is true.
 */
export function runSafetyPreflights(
  spec: ProjectSpec,
  opts?: { allowUnsafe?: boolean },
): PreflightResult {
  const compound = validateCompoundSafety(spec);
  const captions = lintCaptions(spec);
  const anchors = checkAnchorSafety(spec);
  const allClear = compound.safe && captions.ok && anchors.safe;

  if (!opts?.allowUnsafe) {
    if (!compound.safe) {
      const v = compound.violations[0];
      throw new CreatorStudioError(
        "E_COMPOUND_UNSAFE",
        `Spine clips "${v.clipA}" and "${v.clipB}" overlap by ${v.overlapSeconds}s — FCP will insert implicit compound clips.`,
        "Fix clip offsets so they don't overlap, or pass allowUnsafe=true to suppress this check.",
      );
    }
    if (!captions.ok) {
      const issue = captions.issues[0];
      throw new CreatorStudioError(
        "E_CAPTION_ROLE_MISSING",
        `Caption role issue on "${issue.clipName}": ${issue.reason}`,
        "Use the FCP role format 'Role.Subrole' (e.g. 'Dialogue.dialogue'). Caption roles require 'iTT Role.iTT Subrole'.",
      );
    }
    if (!anchors.safe) {
      const c = anchors.collisions[0];
      throw new CreatorStudioError(
        "E_ANCHOR_COLLISION",
        `Titles "${c.titleA}" and "${c.titleB}" on lane ${c.lane} overlap by ${c.overlapSeconds}s.`,
        "Stagger title offsets or use different lanes to avoid anchor collisions.",
      );
    }
  }

  return { compound, captions, anchors, allClear };
}
