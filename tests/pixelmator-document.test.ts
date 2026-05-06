import { describe, it, expect } from "vitest";
import { EXPORT_FORMAT_LIST } from "@creator-studio-os/pixelmator";

describe("Pixelmator export formats", () => {
  it("exposes the verified format list from the sdef", () => {
    expect(EXPORT_FORMAT_LIST).toEqual([
      "PNG",
      "JPEG",
      "TIFF",
      "HEIC",
      "GIF",
      "JPEG2000",
      "BMP",
      "WebP",
      "SVG",
      "PDF",
    ]);
  });
});
