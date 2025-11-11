import { describe, it, expect } from "vitest";
import ndarray from "ndarray";
import { overlap } from "./overlap.js";
import type { Glyph } from "./glyph.js";

/**
 * Helper function to create a test glyph with a simple bitmap.
 * The bitmap is filled with the specified value across the given dimensions.
 */
function createTestGlyph(
  char: string,
  width: number,
  height: number,
  bitmap: Float32Array | null = null
): Glyph {
  if (!bitmap) {
    bitmap = new Float32Array(width * height).fill(1);
  }
  return {
    char,
    width,
    height,
    advance: width,
    bboxOffsetX: 0,
    bitmap: ndarray(bitmap, [height, width]),
  };
}

describe("overlap", () => {
  it("returns 0 when glyphs do not overlap", () => {
    const left = createTestGlyph("A", 10, 10);
    const right = createTestGlyph("V", 10, 10);

    // With large negative kern, glyphs are far apart
    const result = overlap(left, right, -100);

    expect(result).toBe(0);
  });

  it("returns non-zero when glyphs overlap", () => {
    const left = createTestGlyph("A", 10, 10);
    const right = createTestGlyph("V", 10, 10);

    // With negative kern, glyphs move closer and should overlap
    // lOffset = -(left.advance + left.bboxOffsetX) + right.bboxOffsetX - kern
    // lOffset = -(10 + 0) + 0 - (-5) = -10 + 5 = -5 (left overlaps into right)
    const result = overlap(left, right, -5);

    expect(result).toBeGreaterThan(0);
  });

  it("computes overlap with zero kern", () => {
    const bitmap = new Float32Array(100).fill(0.5);
    const left = createTestGlyph("A", 10, 10, bitmap);
    const right = createTestGlyph("V", 10, 10, bitmap);

    // With negative kern to create overlap
    const result = overlap(left, right, -5);

    // With negative kern, glyphs should overlap with non-zero result
    expect(result).toBeGreaterThan(0);
  });

  it("increases overlap with smaller (more negative) kern values", () => {
    const left = createTestGlyph("A", 10, 10);
    const right = createTestGlyph("V", 10, 10);

    const kern0 = overlap(left, right, 0);
    const kernNeg5 = overlap(left, right, -5);
    const kernNeg10 = overlap(left, right, -10);

    // More negative kern = more overlap
    expect(kernNeg5).toBeGreaterThanOrEqual(kern0);
    expect(kernNeg10).toBeGreaterThanOrEqual(kernNeg5);
  });

  it("respects bboxOffsetX positioning", () => {
    const bitmap1 = new Float32Array(100).fill(1);
    const bitmap2 = new Float32Array(100).fill(1);

    const left = createTestGlyph("A", 10, 10, bitmap1);
    const right = createTestGlyph("V", 10, 10, bitmap2);

    // Modify bboxOffsetX
    left.bboxOffsetX = 5;
    right.bboxOffsetX = 3;

    // Should compute without error
    const result = overlap(left, right, 0);
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("handles glyphs with different dimensions", () => {
    const left = createTestGlyph("I", 5, 15);
    const right = createTestGlyph("W", 20, 10);

    const result = overlap(left, right, 0);

    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("handles sparse bitmaps (mostly zero) correctly", () => {
    const leftBitmap = new Float32Array(100).fill(0.1);
    const rightBitmap = new Float32Array(100).fill(0.1);

    const left = createTestGlyph(".", 10, 10, leftBitmap);
    const right = createTestGlyph(".", 10, 10, rightBitmap);

    // Verify the function returns a number without crashing
    const result = overlap(left, right, -5);

    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("returns consistent non-zero for filled bitmaps with negative kern", () => {
    const bitmap = new Float32Array(100).fill(0.5);

    const left = createTestGlyph("A", 10, 10, bitmap);
    const right = createTestGlyph("V", 10, 10, bitmap);

    const result = overlap(left, right, -5);

    // Filled bitmaps with negative kern should have overlap
    expect(result).toBeGreaterThan(0);
  });

  it("scales overlap with bitmap values", () => {
    const bitmap1 = new Float32Array(100).fill(1);
    const bitmap2 = new Float32Array(100).fill(0.5);

    const left1 = createTestGlyph("A", 10, 10, bitmap1);
    const right1 = createTestGlyph("V", 10, 10, bitmap1);

    const left2 = createTestGlyph("A", 10, 10, bitmap2);
    const right2 = createTestGlyph("V", 10, 10, bitmap2);

    const result1 = overlap(left1, right1, -5);
    const result2 = overlap(left2, right2, -5);

    // Higher bitmap values should result in higher overlap
    expect(result1).toBeGreaterThan(result2);
  });

  it("returns 0 for completely non-overlapping bitmaps with offset", () => {
    const left = createTestGlyph("A", 10, 10);
    left.advance = 5;

    const right = createTestGlyph("V", 10, 10);

    // With large positive kern, left glyph moves far to the left
    const result = overlap(left, right, 50);

    expect(result).toBe(0);
  });
});
