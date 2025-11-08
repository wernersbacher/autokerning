import ndarray from "ndarray";
import { Glyph } from "./glyph.js";

let debugCount = 0;

/** Compute pixel overlap (sum of squared values)
 * Positions glyphs: left at x=0, right at x=left.advance+kern
 * Negative kern brings them closer (moves right left)
 */
export function overlap(left: Glyph, right: Glyph, kern: number): number {
  // Position right glyph relative to left glyph's width
  // Negative kern brings glyphs closer (right starts earlier)
  const rightStart = left.width + kern;

  let sum = 0;
  let pixelCount = 0;
  let nonZeroCount = 0;
  let leftNonZero = 0,
    rightNonZero = 0;

  // DEBUG: Check what pixels are actually in each bitmap
  if (false) {
    // Disabled debug output
    console.error(
      `[DEBUG] left: size=${left.width}x${
        left.height
      }, advance=${left.advance.toFixed(2)}`
    );
    console.error(
      `[DEBUG] right: size=${right.width}x${
        right.height
      }, advance=${right.advance.toFixed(2)}`
    );
    // Sample some pixels from left
    let lSample = 0;
    for (let y = 0; y < Math.min(5, left.height); y++) {
      for (let x = 0; x < Math.min(10, left.width); x++) {
        if ((left.bitmap.get(y, x) ?? 0) > 0) lSample++;
      }
    }
    console.error(
      `[DEBUG] left first 5x10 region has ${lSample} nonzero pixels`
    );
  }

  // Iterate through all pixels
  const maxX = Math.ceil(left.width + right.width + Math.abs(kern));
  const maxY = Math.max(left.height, right.height);

  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < maxX; x++) {
      // Get left pixel at x
      let lVal = 0;
      if (x < left.width && y < left.height) {
        const val = left.bitmap.get(y, x);
        lVal = val ?? 0;
        if (lVal > 0) leftNonZero++;
      }

      // Get right pixel at (x - rightStart)
      let rVal = 0;
      const rx = x - rightStart;
      if (rx >= 0 && rx < right.width && y < right.height) {
        const val = right.bitmap.get(y, rx);
        rVal = val ?? 0;
        if (rVal > 0) rightNonZero++;
      }

      // Sum product of squared values
      const product = lVal * lVal * rVal * rVal;
      sum += product;
      pixelCount++;
      if (product > 0) nonZeroCount++;
    }
  }

  if (debugCount < 0 && kern <= 0) {
    // Disabled debug output
    console.error(
      `[OVERLAP] kern=${kern}, rightStart=${rightStart.toFixed(
        2
      )}, pixels=${pixelCount}, leftNonZero=${leftNonZero}, rightNonZero=${rightNonZero}, nonZeroProducts=${nonZeroCount}, sum=${sum.toFixed(
        4
      )}`
    );
    debugCount++;
  }

  return sum;
}
