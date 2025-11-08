import { Glyph } from "./glyph.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";
import config from "./config.js";

const KERNEL_WIDTH = config.KERNEL_WIDTH;
const MAX_KERN = config.MAX_KERN; // positive number, we use negative range for overlap
const KERN_STEP = Math.max(1, config.KERN_STEP);

/** Estimate kerning between two glyphs based on overlap */
export function kernPair(
  left: Glyph,
  right: Glyph,
  minOverlap: number,
  maxOverlap: number
): number {
  const blurredLeft: Glyph = { ...left, bitmap: gaussianBlur(left.bitmap) };
  const blurredRight: Glyph = { ...right, bitmap: gaussianBlur(right.bitmap) };

  // Normal kerning: multiple strategies supported
  const strategy = config.SELECTION_STRATEGY || "conservative";
  const EPS = config.NO_OVERLAP_EPS || 1;

  console.info(`KernPair strategy: ${strategy}, EPS=${EPS}`);

  if (strategy === "calibrated") {
    // For calibration (minOverlap=0, maxOverlap=1e10), find maximum overlap
    // This occurs when glyphs are most overlapped (most negative kern)
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
  }

  // Precompute overlap values across the search range for deterministic selection
  const samples: Array<{ k: number; s: number }> = [];
  for (let k = -MAX_KERN; k <= MAX_KERN; k += KERN_STEP) {
    samples.push({ k, s: overlap(blurredLeft, blurredRight, k) });
  }

  if (strategy === "argmax") {
    let best = samples[0];
    for (const p of samples) if (p.s > best.s) best = p;
    return best.k;
  }

  if (strategy === "midpoint") {
    const target = (minOverlap + maxOverlap) / 2;
    let best = samples[0];
    let bestDist = Math.abs(best.s - target);
    for (const p of samples) {
      const d = Math.abs(p.s - target);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best.k;
  }

  if (strategy === "no-overlap") {
    // Choose first kern (closest to 0) where overlap <= EPS
    // scan from 0 outward (negative first)
    if (Math.abs(samples.find((p) => p.k === 0)!.s) <= EPS) return 0;
    // negative direction
    for (let k = -KERN_STEP; k >= -MAX_KERN; k -= KERN_STEP) {
      const p = samples.find((x) => x.k === k)!;
      if (p && p.s <= EPS) return k;
    }
    // positive direction
    for (let k = KERN_STEP; k <= MAX_KERN; k += KERN_STEP) {
      const p = samples.find((x) => x.k === k)!;
      if (p && p.s <= EPS) return k;
    }
    return 0; // fallback
  }

  if (strategy === "conservative") {
    // Choose the most negative kern (smallest k) among all samples where s <= EPS.
    const good = samples.filter((p) => p.s <= EPS).map((p) => p.k);
    if (good.length > 0) {
      return Math.min(...good);
    }
    return 0;
  }

  // default: 'calibrated' (original behaviour) using samples
  // if s(0) within [minOverlap,maxOverlap] => 0
  const s0 = samples.find((p) => p.k === 0)!.s;
  if (s0 >= minOverlap && s0 <= maxOverlap) return 0;

  if (s0 < minOverlap) {
    // return first negative k where s >= minOverlap
    for (let k = -KERN_STEP; k >= -MAX_KERN; k -= KERN_STEP) {
      const p = samples.find((x) => x.k === k)!;
      if (p.s >= minOverlap) return k;
    }
    return 0;
  }

  if (s0 > maxOverlap) {
    // return first positive k where s <= maxOverlap
    for (let k = KERN_STEP; k <= MAX_KERN; k += KERN_STEP) {
      const p = samples.find((x) => x.k === k)!;
      if (p.s <= maxOverlap) return k;
    }
    return 0;
  }

  return 0;
}
