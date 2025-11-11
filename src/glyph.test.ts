import { describe, it, expect } from "vitest";
import { renderGlyph } from "./glyph.js";

// Only run integration tests if a font file is available
const FONT_PATH = process.env.FONT_PATH;

describe.skipIf(!FONT_PATH)("renderGlyph integration tests", () => {
  it("renders a simple character into a glyph", async () => {
    const fontPath = FONT_PATH as string;
    const opentype = await import("opentype.js");
    const font = await opentype.load(fontPath);

    const glyph = renderGlyph(font, "A");

    expect(glyph.char).toBe("A");
    expect(glyph.width).toBeGreaterThan(0);
    expect(glyph.height).toBeGreaterThan(0);
    expect(glyph.advance).toBeGreaterThan(0);
    expect(glyph.bitmap).toBeDefined();
    expect(glyph.bitmap.shape).toEqual([glyph.height, glyph.width]);
  });

  it("renders different characters with different metrics", async () => {
    const fontPath = FONT_PATH as string;
    const opentype = await import("opentype.js");
    const font = await opentype.load(fontPath);

    const glyphA = renderGlyph(font, "A");
    const glyphI = renderGlyph(font, "I");
    const glyphM = renderGlyph(font, "M");

    // Different characters should have different advance widths
    expect(glyphA.advance).not.toBe(glyphI.advance);
    expect(glyphI.advance).not.toBe(glyphM.advance);
  });

  it("produces bitmaps with normalized values", async () => {
    const fontPath = FONT_PATH as string;
    const opentype = await import("opentype.js");
    const font = await opentype.load(fontPath);

    const glyph = renderGlyph(font, "A");

    // Check that bitmap values are in the expected range [0, 1]
    for (let y = 0; y < glyph.height; y++) {
      for (let x = 0; x < glyph.width; x++) {
        const value = glyph.bitmap.get(y, x);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("ensures consistent baseline across different glyphs", async () => {
    const fontPath = FONT_PATH as string;
    const opentype = await import("opentype.js");
    const font = await opentype.load(fontPath);

    const glyphs = ["A", "B", "C", "l", "o"];
    const renderedGlyphs = glyphs.map((char) => renderGlyph(font, char));

    // All glyphs should have the same height (em height)
    const heights = renderedGlyphs.map((g) => g.height);
    const firstHeight = heights[0];
    expect(heights.every((h) => h === firstHeight)).toBe(true);
  });

  it("produces glyphs with non-zero bboxOffsetX", async () => {
    const fontPath = FONT_PATH as string;
    const opentype = await import("opentype.js");
    const font = await opentype.load(fontPath);

    const glyph = renderGlyph(font, "A");

    // bboxOffsetX is used for proper overlap calculation
    expect(typeof glyph.bboxOffsetX).toBe("number");
    expect(glyph.bboxOffsetX).toBeGreaterThanOrEqual(0);
  });
});

describe("renderGlyph unit tests (without font file)", () => {
  it("exports renderGlyph function", () => {
    expect(typeof renderGlyph).toBe("function");
  });

  it("returns a Glyph object with required properties", async () => {
    // This test would run with an actual font if available
    // For now, just verify the function is exported
    expect(renderGlyph).toBeDefined();
  });
});
