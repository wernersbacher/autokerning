#!/usr/bin/env node
import * as opentype from "opentype.js";
import { renderGlyph } from "./glyph.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";

(async () => {
  const font = await opentype.load("./Roboto-Black.ttf");

  const pairs = ["Po", "AV"];

  for (const pair of pairs) {
    console.log(`\n=== Pair: ${pair} ===`);

    const [lch, rch] = pair;
    const left = renderGlyph(font, lch);
    const right = renderGlyph(font, rch);

    const lBlurred = { ...left, bitmap: gaussianBlur(left.bitmap) };
    const rBlurred = { ...right, bitmap: gaussianBlur(right.bitmap) };

    console.log(
      `${lch}: advance=${left.advance.toFixed(2)}, width=${
        left.width
      }, bboxOffsetX=${left.bboxOffsetX.toFixed(2)}`
    );
    console.log(
      `${rch}: advance=${right.advance.toFixed(2)}, width=${
        right.width
      }, bboxOffsetX=${right.bboxOffsetX.toFixed(2)}`
    );

    // Test overlaps at different kern values
    for (let kern of [-60, -50, -40, -30, -20, -10, 0]) {
      const ov = overlap(lBlurred, rBlurred, kern);
      console.log(
        `  kern=${kern.toString().padStart(3)}: overlap=${ov.toFixed(2)}`
      );
    }
  }
})();
