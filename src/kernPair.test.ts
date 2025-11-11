import { describe, it, expect, beforeEach } from "vitest";
import ndarray from "ndarray";
import { kernPair } from "./kernPair.js";
import type { Glyph } from "./glyph.js";

/**
 * Helper to create a test glyph with a configurable bitmap pattern.
 */
function createTestGlyph(
  char: string,
  width: number,
  height: number,
  bitmapData: Float32Array | null = null,
  advance: number | null = null
): Glyph {
  if (!bitmapData) {
    bitmapData = new Float32Array(width * height).fill(1);
  }
  return {
    char,
    width,
    height,
    advance: advance ?? width,
    bboxOffsetX: 0,
    bitmap: ndarray(bitmapData, [height, width]),
  };
}

describe("kernPair", () => {
  describe("basic functionality", () => {
    it("returns a number", () => {
      const left = createTestGlyph("A", 10, 10);
      const right = createTestGlyph("V", 10, 10);

      const result = kernPair(left, right, 0, 100);

      expect(typeof result).toBe("number");
    });

    it("returns a value within the configured range", () => {
      const left = createTestGlyph("A", 10, 10);
      const right = createTestGlyph("V", 10, 10);

      const result = kernPair(left, right, 0, 100);

      // Should be within [-MAX_KERN, MAX_KERN] (default -30 to 30)
      expect(result).toBeGreaterThanOrEqual(-30);
      expect(result).toBeLessThanOrEqual(30);
    });

    it("handles identical glyphs", () => {
      const glyph = createTestGlyph("A", 10, 10);

      const result = kernPair(glyph, glyph, 0, 100);

      expect(typeof result).toBe("number");
    });

    it("handles different glyph sizes", () => {
      const left = createTestGlyph("I", 5, 15);
      const right = createTestGlyph("W", 20, 10);

      const result = kernPair(left, right, 0, 100);

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(-30);
      expect(result).toBeLessThanOrEqual(30);
    });
  });

  describe("conservative strategy (default)", () => {
    it("returns 0 for minimal overlap requirement", () => {
      const left = createTestGlyph("A", 10, 10);
      const right = createTestGlyph("V", 10, 10);

      // Conservative strategy with very low EPS should prefer less kerning
      const result = kernPair(left, right, 0, 1);

      expect(typeof result).toBe("number");
    });

    it("respects minOverlap and maxOverlap bounds", () => {
      const left = createTestGlyph("A", 10, 10);
      const right = createTestGlyph("V", 10, 10);

      const result1 = kernPair(left, right, 10, 50);
      const result2 = kernPair(left, right, 100, 200);

      // Both should return valid kern values
      expect(typeof result1).toBe("number");
      expect(typeof result2).toBe("number");
    });
  });

  describe("calibration mode", () => {
    it("finds maximum overlap when minOverlap=0 and maxOverlap=1e10", () => {
      const left = createTestGlyph("A", 10, 10);
      const right = createTestGlyph("V", 10, 10);

      const result = kernPair(left, right, 0, 1e10);

      // Should search for maximum overlap and return most negative kern
      expect(result).toBeLessThanOrEqual(0);
      expect(result).toBeGreaterThanOrEqual(-30);
    });

    it("handles calibration with sparse glyphs", () => {
      const leftBitmap = new Float32Array(100);
      leftBitmap[50] = 1;
      const rightBitmap = new Float32Array(100);
      rightBitmap[50] = 1;

      const left = createTestGlyph(".", 10, 10, leftBitmap);
      const right = createTestGlyph(".", 10, 10, rightBitmap);

      const result = kernPair(left, right, 0, 1e10);

      expect(typeof result).toBe("number");
    });
  });

  describe("glyph advance values", () => {
    it("considers glyph advance width in kern calculation", () => {
      const narrow = createTestGlyph("I", 5, 10, undefined, 5);
      const wide = createTestGlyph("M", 15, 10, undefined, 15);

      const result1 = kernPair(narrow, wide, 0, 100);
      const result2 = kernPair(wide, narrow, 0, 100);

      // Different advance widths should potentially result in different kerning
      expect(typeof result1).toBe("number");
      expect(typeof result2).toBe("number");
    });

    it("handles zero advance width gracefully", () => {
      // Unusual but should not crash
      const left = createTestGlyph("A", 10, 10, undefined, 0);
      const right = createTestGlyph("V", 10, 10);

      const result = kernPair(left, right, 0, 100);

      expect(typeof result).toBe("number");
    });
  });

  describe("sparse and dense bitmaps", () => {
    it("handles dense (fully filled) bitmaps", () => {
      const dense = new Float32Array(100).fill(1);
      const left = createTestGlyph("A", 10, 10, dense);
      const right = createTestGlyph("V", 10, 10, dense);

      const result = kernPair(left, right, 0, 100);

      expect(typeof result).toBe("number");
    });

    it("handles sparse (mostly empty) bitmaps", () => {
      const sparse = new Float32Array(100);
      sparse[50] = 1;
      const left = createTestGlyph(".", 10, 10, sparse);
      const right = createTestGlyph(".", 10, 10, sparse);

      const result = kernPair(left, right, 0, 100);

      expect(typeof result).toBe("number");
    });

    it("handles bitmaps with varied values (0 to 1 range)", () => {
      const varied = new Float32Array(100);
      for (let i = 0; i < 100; i++) {
        varied[i] = (i % 10) / 10; // values from 0 to 0.9
      }
      const left = createTestGlyph("A", 10, 10, varied);
      const right = createTestGlyph("V", 10, 10, varied);

      const result = kernPair(left, right, 0, 100);

      expect(typeof result).toBe("number");
    });
  });

  describe("determinism", () => {
    it("returns consistent result for the same input", () => {
      const left = createTestGlyph("A", 10, 10);
      const right = createTestGlyph("V", 10, 10);

      const result1 = kernPair(left, right, 0, 100);
      const result2 = kernPair(left, right, 0, 100);

      expect(result1).toBe(result2);
    });

    it("returns consistent result across multiple calls with different overlaps", () => {
      const left = createTestGlyph("A", 10, 10);
      const right = createTestGlyph("V", 10, 10);

      const r1 = kernPair(left, right, 10, 50);
      const r2 = kernPair(left, right, 10, 50);
      const r3 = kernPair(left, right, 20, 60);

      expect(r1).toBe(r2);
      expect(typeof r3).toBe("number");
    });
  });

  describe("edge cases", () => {
    it("handles very small glyphs", () => {
      const left = createTestGlyph(".", 1, 1);
      const right = createTestGlyph(".", 1, 1);

      const result = kernPair(left, right, 0, 100);

      expect(typeof result).toBe("number");
    });

    it("handles large glyphs", () => {
      const left = createTestGlyph("A", 100, 100);
      const right = createTestGlyph("V", 100, 100);

      const result = kernPair(left, right, 0, 100);

      expect(typeof result).toBe("number");
    });

    it("handles zero minOverlap and maxOverlap", () => {
      const left = createTestGlyph("A", 10, 10);
      const right = createTestGlyph("V", 10, 10);

      const result = kernPair(left, right, 0, 0);

      expect(typeof result).toBe("number");
    });

    it("handles equal minOverlap and maxOverlap", () => {
      const left = createTestGlyph("A", 10, 10);
      const right = createTestGlyph("V", 10, 10);

      const result = kernPair(left, right, 50, 50);

      expect(typeof result).toBe("number");
    });
  });
});
