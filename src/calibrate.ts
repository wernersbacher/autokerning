import { renderGlyph } from "./glyph.js";
import { gaussianBlur } from "./blur.js";
import { kernPair } from "./kernPair.js";
import * as opentype from "opentype.js";

const TUNING_CHARS = "lno";
let KERNEL_WIDTH = 20; // 0.2 * FONT_SIZE (100)

/** Calibrate the kernel width and find overlap thresholds */
export function findS(font: opentype.Font): [number, number] {
  let kernelWidth = KERNEL_WIDTH;

  while (true) {
    const ss: number[] = [];

    for (const char of TUNING_CHARS) {
      const glyph = renderGlyph(font, char);
      const blurred = { ...glyph, bitmap: gaussianBlur(glyph.bitmap) };
      // Self-kerning: how much does a character overlap with itself?
      const kern = kernPair(blurred, blurred, 0, 1e10);
      const s = overlap(blurred, blurred, kern);
      ss.push(s);
    }

    const minS = Math.min(...ss);
    const maxS = Math.max(...ss);

    // If the self-overlap is balanced (min > max/2), we're good
    if (minS > maxS / 2) {
      return [minS, maxS];
    }

    // Otherwise, increase kernel width and try again
    kernelWidth += 2;
    if (kernelWidth > 200) {
      throw new Error("Failed to find reasonable kernel size.");
    }
  }
}

/** Compute pixel overlap (sum of squared products) */
function overlap(left: any, right: any, kern: number): number {
  const height = Math.max(left.height, right.height);
  const rightX = left.advance - kern;
  let sum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < left.width + right.width; x++) {
      const lx = x;
      const rx = x - rightX;

      const lVal =
        lx >= 0 && lx < left.width && y < left.height
          ? left.bitmap.get(y, lx)
          : 0;
      const rVal =
        rx >= 0 && rx < right.width && y < right.height
          ? right.bitmap.get(y, rx)
          : 0;

      sum += lVal * rVal;
    }
  }

  return sum;
}
