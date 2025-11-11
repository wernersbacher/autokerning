import { Glyph } from "./glyph.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";
import config from "./config.js";
import { logger } from "./log.js";

const MAX_KERN = config.MAX_KERN; // positive number, we use negative range for overlap
const KERN_STEP = Math.max(1, config.KERN_STEP);

/** Estimate kerning between two glyphs based on overlap
 * @param left - Left glyph
 * @param right - Right glyph
 * @param minOverlap - Minimum overlap threshold (for calibrated mode)
 * @param maxOverlap - Maximum overlap threshold (for calibrated mode)
 * @param kernelWidth - Optional: kernel width for adaptive blur (used in calibrated mode)
 */
export function kernPair(
  left: Glyph,
  right: Glyph,
  minOverlap: number,
  maxOverlap: number,
  kernelWidth?: number
): number {
  const blurredLeft: Glyph = {
    ...left,
    bitmap: gaussianBlur(left.bitmap, undefined, kernelWidth),
  };
  const blurredRight: Glyph = {
    ...right,
    bitmap: gaussianBlur(right.bitmap, undefined, kernelWidth),
  };

  // For calibration
  if (minOverlap === 0 && maxOverlap === 1e10) {
    let bestKern = 0;
    let bestOverlap = 0;
    // Search for maximum overlap within configured max kern range
    for (let k = -MAX_KERN; k <= 0; k += KERN_STEP) {
      const s = overlap(blurredLeft, blurredRight, k);
      if (s > bestOverlap) {
        bestOverlap = s;
        bestKern = k;
      }
    }
    return bestKern;
  }

  // Normal kerning: multiple strategies supported
  const strategy = config.SELECTION_STRATEGY || "conservative";
  const EPS = config.NO_OVERLAP_EPS || 1;

  logger.debug(`KernPair strategy: ${strategy}, EPS=${EPS}`);

  // Precompute overlap values across the search range for deterministic selection
  const samples: Array<{ kernel: number; sumPixel: number }> = [];
  for (let k = -MAX_KERN; k <= MAX_KERN; k += KERN_STEP) {
    samples.push({
      kernel: k,
      sumPixel: overlap(blurredLeft, blurredRight, k),
    });
  }

  if (strategy === "midpoint") {
    const target = (minOverlap + maxOverlap) / 2;
    let best = samples[0];
    let bestDist = Math.abs(best.sumPixel - target);
    for (const p of samples) {
      const d = Math.abs(p.sumPixel - target);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best.kernel;
  }

  if (strategy === "conservative") {
    // Iterate kernels starting from the largest (most positive) towards the
    // smallest (most negative). We want to find the first kernel where the
    // overlap exceeds EPS and return the previous kernel (which will have
    // sumPixel <= EPS). This handles the case where samples start with
    // zeros on the positive side and begin to grow when moving negative.
    //
    // Sort samples by kernel descending (positive -> negative)
    const sorted = samples.slice().sort((a, b) => b.kernel - a.kernel);

    // Track the last kernel seen that was <= EPS. Initialize to null.
    let lastGoodKernel: number | null = null;

    for (const p of sorted) {
      if (p.sumPixel <= EPS) {
        lastGoodKernel = p.kernel;
        continue;
      }
      // p.sumPixel > EPS: return the previously-seen kernel (closest to
      // positive side) that was <= EPS. If none exists, fall back to 0.
      return lastGoodKernel !== null ? lastGoodKernel : 0;
    }

    // If we finished the loop, all samples had sumPixel <= EPS. Choose the
    // most negative kernel among them (conservative: most negative allowed).
    if (lastGoodKernel !== null) {
      // sorted is descending; the last element is the most negative kernel
      return Math.min(...samples.map((p) => p.kernel));
    }

    return 0;
  }

  // default: 'calibrated' (original behaviour) using samples
  // if s(0) within [minOverlap,maxOverlap] => 0
  const s0 = samples.find((p) => p.kernel === 0)!.sumPixel;
  if (s0 >= minOverlap && s0 <= maxOverlap) return 0;

  if (s0 < minOverlap) {
    // return first negative k where s >= minOverlap
    for (let kern = -KERN_STEP; kern >= -MAX_KERN; kern -= KERN_STEP) {
      const p = samples.find((x) => x.kernel === kern)!;
      if (p.sumPixel >= minOverlap) return kern;
    }
    return 0;
  }

  if (s0 > maxOverlap) {
    // return first positive k where s <= maxOverlap
    for (let k = KERN_STEP; k <= MAX_KERN; k += KERN_STEP) {
      const p = samples.find((x) => x.kernel === k)!;
      if (p.sumPixel <= maxOverlap) return k;
    }
    return 0;
  }

  return 0;
}
