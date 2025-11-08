#!/usr/bin/env node
import * as opentype from "opentype.js";
import { renderGlyph } from "./glyph.js";
import { gaussianBlur } from "./blur.js";

(async () => {
  const font = await opentype.load("./Roboto-Black.ttf");

  const glyph = renderGlyph(font, "T");
  console.log(`Glyph T:`);
  console.log(`  Width: ${glyph.width}, Height: ${glyph.height}`);
  console.log(`  Advance: ${glyph.advance}`);
  console.log(`  Bitmap stats:`);

  let min = Infinity,
    max = -Infinity,
    sum = 0,
    nonZero = 0;
  for (let y = 0; y < glyph.height; y++) {
    for (let x = 0; x < glyph.width; x++) {
      const val = glyph.bitmap.get(y, x) ?? 0;
      min = Math.min(min, val);
      max = Math.max(max, val);
      sum += val;
      if (val > 0.001) nonZero++;
    }
  }
  console.log(
    `    Min: ${min}, Max: ${max}, Avg: ${(
      sum /
      (glyph.width * glyph.height)
    ).toFixed(4)}, NonZero: ${nonZero}`
  );

  // Print a few pixel values
  console.log(`  Sample pixels around middle:`);
  const startX = Math.floor(glyph.width / 2) - 5;
  const startY = Math.floor(glyph.height / 2) - 5;
  for (let y = startY; y < Math.min(startY + 10, glyph.height); y++) {
    for (let x = startX; x < Math.min(startX + 10, glyph.width); x++) {
      const val = glyph.bitmap.get(y, x);
      process.stdout.write((val ?? 0).toFixed(2).padStart(5) + " ");
    }
    console.log();
  }

  console.log(`\n  Blurred:`);
  const blurred = { ...glyph, bitmap: gaussianBlur(glyph.bitmap) };
  console.log(`  Blurred bitmap stats:`);

  min = Infinity;
  max = -Infinity;
  sum = 0;
  nonZero = 0;
  for (let y = 0; y < blurred.height; y++) {
    for (let x = 0; x < blurred.width; x++) {
      const val = blurred.bitmap.get(y, x) ?? 0;
      min = Math.min(min, val);
      max = Math.max(max, val);
      sum += val;
      if (val > 0.001) nonZero++;
    }
  }
  console.log(
    `    Min: ${min}, Max: ${max}, Avg: ${(
      sum /
      (blurred.width * blurred.height)
    ).toFixed(4)}, NonZero: ${nonZero}`
  );

  // Print a few pixel values around middle
  console.log(`  Sample blurred pixels around middle:`);
  for (let y = startY; y < Math.min(startY + 10, blurred.height); y++) {
    for (let x = startX; x < Math.min(startX + 10, blurred.width); x++) {
      const val = blurred.bitmap.get(y, x);
      process.stdout.write((val ?? 0).toFixed(2).padStart(5) + " ");
    }
    console.log();
  }
})();
