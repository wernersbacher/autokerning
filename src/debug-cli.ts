#!/usr/bin/env node
import * as opentype from "opentype.js";
import { renderGlyph } from "./glyph.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";
import { saveBitmapAsPNG, logBitmapStats } from "./debug.js";

(async () => {
  const fontfile = "./Roboto-Black.ttf";
  const chars = ["T", "a", "l", "n", "o"];

  const font = await opentype.load(fontfile);
  console.log("Font loaded successfully");

  for (const char of chars) {
    console.error(`\n=== Processing character: ${char} ===`);

    const glyph = renderGlyph(font, char);
    logBitmapStats(glyph.bitmap, `Original glyph '${char}'`);
    saveBitmapAsPNG(glyph.bitmap, `debug_glyph_${char}.png`);

    const blurred = { ...glyph, bitmap: gaussianBlur(glyph.bitmap) };
    logBitmapStats(blurred.bitmap, `Blurred glyph '${char}'`);
    saveBitmapAsPNG(blurred.bitmap, `debug_blurred_${char}.png`);

    // Simple self-test: same glyph at kern=0 should fully overlap
    console.error(`\n  Testing same glyph twice:`);
    const ovT_T = overlap(blurred, blurred, 0);
    console.error(`    T + T at kern=0: ${ovT_T.toFixed(2)}`);
    const ovT_T_neg5 = overlap(blurred, blurred, -5);
    console.error(`    T + T at kern=-5: ${ovT_T_neg5.toFixed(2)}`);

    for (let k = -5; k <= 5; k++) {
      const ov = overlap(blurred, blurred, k);
      console.error(`  kern=${k}: overlap=${ov.toFixed(2)}`);
    }
  }

  // Test pairs
  console.error(`\n=== Testing pairs ===`);
  const pairs = [
    ["T", "a"],
    ["T", "T"],
    ["A", "V"],
  ];

  for (const [l, r] of pairs) {
    console.error(`\nPair: ${l}${r}`);
    const leftGlyph = renderGlyph(font, l);
    const rightGlyph = renderGlyph(font, r);

    const blurredLeft = {
      ...leftGlyph,
      bitmap: gaussianBlur(leftGlyph.bitmap),
    };
    const blurredRight = {
      ...rightGlyph,
      bitmap: gaussianBlur(rightGlyph.bitmap),
    };

    for (let k = -20; k <= 20; k += 5) {
      const ov = overlap(blurredLeft, blurredRight, k);
      console.error(`  kern=${k}: overlap=${ov.toFixed(2)}`);
    }
  }
})();
