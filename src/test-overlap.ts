#!/usr/bin/env node
import * as opentype from "opentype.js";
import { renderGlyph } from "./glyph.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";

(async () => {
  const font = await opentype.load("./Roboto-Black.ttf");

  const t = renderGlyph(font, "T");
  const tBlurredBitmap = gaussianBlur(t.bitmap);
  const tBlurred = {
    char: t.char,
    width: t.width,
    height: t.height,
    advance: t.advance,
    bitmap: tBlurredBitmap,
  };

  // Sanity check: can we read values from tBlurred?
  let count = 0,
    sum = 0;
  for (let y = 10; y < 40 && y < tBlurred.height; y++) {
    for (let x = 10; x < 40 && x < tBlurred.width; x++) {
      const val = tBlurred.bitmap.get(y, x);
      if (val > 0) {
        count++;
        sum += val;
      }
    }
  }
  console.log(
    `Sanity check: ${count} pixels with value > 0 in region [10-40, 10-40], avg=${(
      sum / count
    ).toFixed(4)}`
  );

  console.log(`Testing T + T:`);
  console.log(`  T advance: ${t.advance.toFixed(2)}, width: ${t.width}`);

  for (let kern of [-100, -80, -70, -60, -50, -40, -30, -20, -16, -10, 0]) {
    const ov = overlap(tBlurred, tBlurred, kern);
    console.log(
      `  kern=${kern.toString().padStart(4)}: overlap=${ov.toFixed(2)}`
    );
  }

  console.log(`\nTesting T + a:`);
  const a = renderGlyph(font, "a");
  const aBlurred = { ...a, bitmap: gaussianBlur(a.bitmap) };

  for (let kern of [-50, -40, -30, -20, -10, 0, 10, 20]) {
    const ov = overlap(tBlurred, aBlurred, kern);
    console.log(
      `  kern=${kern.toString().padStart(3)}: overlap=${ov.toFixed(2)}`
    );
  }
})();
