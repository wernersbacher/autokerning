import { describe, it, expect } from "vitest";
import ndarray from "ndarray";
import { gaussianBlur } from "./blur.js";

describe("gaussianBlur", () => {
  it("blurs a simple bitmap", () => {
    // Create a small 3x3 bitmap with a peak in the center
    const data = new Float32Array([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    const input = ndarray(data, [3, 3]);

    const result = gaussianBlur(input, 1);

    expect(result.shape).toEqual([3, 3]);
    // After blur, center should still be highest value
    expect(result.get(1, 1)).toBeGreaterThan(0);
  });

  it("preserves bitmap dimensions", () => {
    const input = ndarray(new Float32Array(25), [5, 5]);
    const result = gaussianBlur(input, 1);

    expect(result.shape[0]).toBe(5);
    expect(result.shape[1]).toBe(5);
  });

  it("handles all-zero input", () => {
    const input = ndarray(new Float32Array(9), [3, 3]);
    const result = gaussianBlur(input);

    // All zeros should remain all zeros
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(result.get(y, x)).toBe(0);
      }
    }
  });

  it("handles all-ones input", () => {
    const input = ndarray(new Float32Array(9).fill(1), [3, 3]);
    const result = gaussianBlur(input);

    // All ones should remain all ones after blur
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(result.get(y, x)).toBeCloseTo(1, 5);
      }
    }
  });

  it("reduces peak values with larger sigma", () => {
    // Create a 7x7 bitmap with a peak at center
    const data = new Float32Array(49);
    data[24] = 1; // center at (3, 3)
    const input = ndarray(data, [7, 7]);

    const blurSmall = gaussianBlur(input, 0.5);
    const blurLarge = gaussianBlur(input, 2);

    // Larger sigma should spread the peak more, reducing center value
    const centerSmall = blurSmall.get(3, 3);
    const centerLarge = blurLarge.get(3, 3);

    expect(centerLarge).toBeLessThan(centerSmall);
  });

  it("distributes values to neighboring pixels", () => {
    // Create a 5x5 with peak at center
    const data = new Float32Array(25);
    data[12] = 1; // center at (2, 2)
    const input = ndarray(data, [5, 5]);

    const result = gaussianBlur(input, 1);

    // Values should spread to neighbors
    expect(result.get(2, 2)).toBeGreaterThan(0);
    expect(result.get(2, 1)).toBeGreaterThan(0);
    expect(result.get(2, 3)).toBeGreaterThan(0);
    expect(result.get(1, 2)).toBeGreaterThan(0);
    expect(result.get(3, 2)).toBeGreaterThan(0);
  });

  it("respects edge boundaries (clamping)", () => {
    // Create a 3x3 bitmap with peak at corner
    const data = new Float32Array([1, 0, 0, 0, 0, 0, 0, 0, 0]);
    const input = ndarray(data, [3, 3]);

    const result = gaussianBlur(input, 1);

    // Result should be valid (not NaN or Infinity)
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(Number.isFinite(result.get(y, x))).toBe(true);
        expect(result.get(y, x)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
