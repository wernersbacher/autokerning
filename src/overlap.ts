import ndarray from "ndarray";
import { Glyph } from "./glyph.js";
import { createCanvas } from "canvas";
import { logger } from "./log.js";

let debugCount = 0;

/**
 * Compute pixel overlap using composition logic from Python version
 *
 * Intersection rectangle layout:
 * - Right glyph at x ∈ [0, right.width)
 * - Left glyph at x ∈ [lOffset, lOffset + left.width)
 * - Only pixels in both ranges contribute to overlap
 */
export function overlap(left: Glyph, right: Glyph, kern: number): number {
  const height = left.height;

  // Calculate offset where left glyph is positioned relative to right
  const lOffset = -(left.advance + left.bboxOffsetX) + right.bboxOffsetX - kern;

  // Find intersection range in x-dimension
  const xStart = Math.max(0, lOffset);
  const xEnd = Math.min(right.width, lOffset + left.width);
  const width = Math.max(0, xEnd - xStart);

  if (debugCount < 3 && width > 0) {
    logger.debug(
      `[OVERLAP] pair=${left.char}${right.char}, kern=${kern
        .toString()
        .padStart(4)}, lOffset=${lOffset
        .toFixed(2)
        .padStart(8)}, [${xStart.toFixed(0)}, ${xEnd.toFixed(0)}) width=${width
        .toFixed(0)
        .padStart(4)}`
    );
  }

  if (width <= 0) {
    return 0;
  }

  // Compute intersection by multiplying pixel values
  let sum = 0;

  // Use direct typed-array access to avoid ndarray.get overhead inside tight loops
  const rData = (right.bitmap as any).data as Float32Array | Float64Array;
  const lData = (left.bitmap as any).data as Float32Array | Float64Array;
  const rW = right.width;
  const lW = left.width;
  const rH = right.height;
  const lH = left.height;

  for (let y = 0; y < height; y++) {
    const rRowOff = y * rW;
    const lRowOff = y * lW;
    for (let x = xStart; x < xEnd; x++) {
      // Right glyph pixel at (x, y)
      let rVal = 0;
      if (x >= 0 && x < rW && y < rH) {
        rVal = rData[rRowOff + x] ?? 0;
      }

      // Left glyph pixel at (x - lOffset, y)
      let lVal = 0;
      const lx = x - lOffset;
      const li = Math.floor(lx);
      if (li >= 0 && li < lW && y < lH) {
        lVal = lData[lRowOff + li] ?? 0;
      }

      // Sum product of squared values
      sum += lVal * lVal * rVal * rVal;
    }
  }

  if (debugCount < 3 && width > 0) {
    logger.error(`         -> overlap=${sum.toFixed(2).padStart(8)}`);
    debugCount++;
  }

  return sum;
}

// Export function to set bbox offset (needed during glyph creation)
export function setGlyphBboxOffset(glyph: Glyph, offsetX: number): void {
  (glyph as any).bboxOffsetX = offsetX;
}
