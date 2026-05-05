/**
 * Pixelmator Pro — brand-card composer.
 *
 * Reads brand tokens from a project's brand/ directory (or a project.json
 * draft — extended in 2.4.1 when ProjectV2 schema ships), opens a template
 * .pxd file, populates text/image layer slots, and exports at each requested
 * size.
 *
 * This is the first protocol primitive — step [2/12] of steam_trailer_minimal:
 *   "Composing key art … Pixelmator → 1920×1080 + 2560×1440 + 1024×1024 (HDR)"
 *
 * Protocol contract:
 *  - Template .pxd lives at shared/brand/card-template.pxd in the data dir
 *  - Text layers named {{HEADLINE}}, {{SUBHEAD}}, {{TAGLINE}} get populated
 *  - Image layer named {{LOGO}} gets replaced with the brand logo
 *  - Each size is exported as PNG (or HDR PNG when hdr=true)
 *
 * Reference: docs/research/2026-05-05-deepswarm/03-pixelmator-depth.md §15-A
 */
import { join } from "node:path";
import { access, mkdir } from "node:fs/promises";
import { loadConfig } from "../../config.js";
import { openDocument, closeDocument, exportHdr, exportDocument } from "./document.js";
import { resizeDocument } from "./document.js";
import { replaceText, replaceLayerImage } from "./detect.js";

export interface BrandTokens {
  logoPath?: string;
  headline?: string;
  subhead?: string;
  tagline?: string;
  /** Primary color [r, g, b] 0-255 */
  primaryColor?: [number, number, number];
  /** Secondary color [r, g, b] 0-255 */
  secondaryColor?: [number, number, number];
  headlineFont?: string;
  bodyFont?: string;
}

export interface SizeSpec {
  width: number;
  height: number;
  /** Output file suffix e.g. "1080p", "social" */
  label?: string;
}

export interface ComposeBrandCardOpts {
  /** Source template path — a .pxd file. Defaults to shared/brand/card-template.pxd */
  templatePath?: string;
  /** Brand tokens to inject */
  brand: BrandTokens;
  /** List of output sizes */
  sizes: SizeSpec[];
  /** Output directory for exported files */
  outputDir: string;
  /** Base filename stem (size label is appended) */
  stem?: string;
  /** Export as HDR PNG instead of standard PNG */
  hdr?: boolean;
}

export interface ComposeBrandCardResult {
  outputs: Array<{ path: string; width: number; height: number; label?: string }>;
}

export async function composeBrandCard(opts: ComposeBrandCardOpts): Promise<ComposeBrandCardResult> {
  const cfg = loadConfig();
  const {
    templatePath: customTemplate,
    brand, sizes, outputDir,
    stem = "brand-card",
    hdr = false,
  } = opts;

  // Resolve template
  const templatePath = customTemplate ?? join(cfg.dataDir, "shared", "brand", "card-template.pxd");

  // Ensure template exists (early error rather than silently failing in Pixelmator)
  try {
    await access(templatePath);
  } catch {
    throw new Error(
      `Brand card template not found at ${templatePath}. ` +
      `Place a .pxd file at shared/brand/card-template.pxd in the data directory, ` +
      `or supply an explicit templatePath.`,
    );
  }

  await mkdir(outputDir, { recursive: true });

  // Open template (Pixelmator returns the doc name)
  const { name: docName } = await openDocument(templatePath);

  try {
    // Populate text layers via replace text (replaces {{HEADLINE}} etc across all text layers)
    if (brand.headline) {
      await replaceText({ documentName: docName, findText: "{{HEADLINE}}", replaceWith: brand.headline });
    }
    if (brand.subhead) {
      await replaceText({ documentName: docName, findText: "{{SUBHEAD}}", replaceWith: brand.subhead });
    }
    if (brand.tagline) {
      await replaceText({ documentName: docName, findText: "{{TAGLINE}}", replaceWith: brand.tagline });
    }

    // Replace logo image layer if logo provided
    if (brand.logoPath) {
      // Check logo exists — surface a clean error if not
      try { await access(brand.logoPath); } catch {
        throw new Error(`Brand logo not found: ${brand.logoPath}`);
      }
      // Try to replace the {{LOGO}} image layer — if it doesn't exist, replaceLayerImage
      // will throw and we catch below to skip gracefully
      try {
        await replaceLayerImage({
          documentName: docName,
          layerName: "{{LOGO}}",
          newImagePath: brand.logoPath,
          scaleMode: "scale to fit",
        });
      } catch {
        // Template may not have a {{LOGO}} image layer — not fatal
      }
    }

    // Export at each requested size
    const outputs: ComposeBrandCardResult["outputs"] = [];
    for (const size of sizes) {
      // Resize in-memory for this export pass
      await resizeDocument({ documentName: docName, width: size.width, height: size.height });

      const label = size.label ?? `${size.width}x${size.height}`;
      const filename = `${stem}-${label}${hdr ? "-hdr" : ""}.png`;
      const outPath = join(outputDir, filename);

      if (hdr) {
        await exportHdr({ documentName: docName, outputPath: outPath, format: "HDR PNG" });
      } else {
        await exportDocument({ documentName: docName, outputPath: outPath, format: "PNG" });
      }

      outputs.push({ path: outPath, width: size.width, height: size.height, label: size.label });
    }

    return { outputs };
  } finally {
    // Always close the document — don't leave Pixelmator with a dirty open doc
    await closeDocument(docName).catch(() => {}); // ignore close errors
  }
}
