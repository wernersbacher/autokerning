import { Glyph } from "./glyph.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";

const FONT_SIZE = 100;
const KERNEL_WIDTH = Math.round(0.5 * FONT_SIZE) | 1; // Doubled from 0.2 to 0.5

/** Estimate kerning between two glyphs based on overlap */
export function kernPair(
  left: Glyph,
  right: Glyph,
  minOverlap: number,
  maxOverlap: number
): number {
  const blurredLeft: Glyph = { ...left, bitmap: gaussianBlur(left.bitmap) };
  const blurredRight: Glyph = { ...right, bitmap: gaussianBlur(right.bitmap) };

  // For calibration (minOverlap=0, maxOverlap=1e10), find maximum overlap
  // This occurs when glyphs are most overlapped (most negative kern)
  if (minOverlap === 0 && maxOverlap === 1e10) {
    let bestKern = 0;
    let bestOverlap = 0;
    // Search for maximum overlap
    for (let k = -KERNEL_WIDTH * 2; k <= KERNEL_WIDTH * 2; k++) {
      const s = overlap(blurredLeft, blurredRight, k);
      if (s > bestOverlap) {
        bestOverlap = s;
        bestKern = k;
      }
    }
    return bestKern;
  }

  // Normal kerning: find kern value where overlap is between minOverlap and maxOverlap
  let kern = 0;
  let s = overlap(blurredLeft, blurredRight, kern);

  if (s < minOverlap) {
    // Move glyphs closer (more negative kern)
    for (kern = -1; kern > -KERNEL_WIDTH * 2; kern--) {
      s = overlap(blurredLeft, blurredRight, kern);
      if (s >= minOverlap) break;
    }
    if (s < minOverlap) kern = 0; // Failed to reach threshold
  } else if (s > maxOverlap) {
    // Move glyphs apart (positive kern)
    for (kern = 1; kern < KERNEL_WIDTH * 2; kern++) {
      s = overlap(blurredLeft, blurredRight, kern);
      if (s <= maxOverlap) break;
    }
    if (s > maxOverlap) kern = 0; // Failed to reach threshold
  }

  return kern;
}
