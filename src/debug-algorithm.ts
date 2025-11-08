#!/usr/bin/env node
import { createCanvas, CanvasRenderingContext2D } from "canvas";
import * as opentype from "opentype.js";
import ndarray, { NdArray } from "ndarray";

/** Debug version to understand the kerning algorithm */

const FONT_SIZE = 100;

interface Glyph {
  char: string;
  advance: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

async function main() {
  const font = await opentype.load("./Roboto-Black.ttf");

  const pairs = ["Po", "AV", "Ta"];

  for (const pair of pairs) {
    console.log(`\n=== Analyzing pair: ${pair} ===`);

    const [lch, rch] = pair;

    // Get glyph info
    const lPath = font.getPath(lch, 0, FONT_SIZE, FONT_SIZE);
    const rPath = font.getPath(rch, 0, FONT_SIZE, FONT_SIZE);

    const lBbox = lPath.getBoundingBox();
    const rBbox = rPath.getBoundingBox();

    const lAdvance = font.getAdvanceWidth(lch, FONT_SIZE);
    const rAdvance = font.getAdvanceWidth(rch, FONT_SIZE);

    console.log(
      `${lch}: advance=${lAdvance.toFixed(2)}, bbox=[${lBbox.x1.toFixed(
        1
      )}, ${lBbox.y1.toFixed(1)}, ${lBbox.x2.toFixed(1)}, ${lBbox.y2.toFixed(
        1
      )}]`
    );
    console.log(
      `${rch}: advance=${rAdvance.toFixed(2)}, bbox=[${rBbox.x1.toFixed(
        1
      )}, ${rBbox.y1.toFixed(1)}, ${rBbox.x2.toFixed(1)}, ${rBbox.y2.toFixed(
        1
      )}]`
    );

    // Python's logic:
    // l_offset = -(l.advance + l.origin[0]) + r.origin[0] - kern
    // where origin[0] is -(bbox.x1) based on the code
    // So: l_offset = -(l.advance - l.bbox.x1) + (r.bbox.x1) - kern
    //     l_offset = -l.advance + l.bbox.x1 + r.bbox.x1 - kern

    const PADDING = 10;
    const lOriginX = -lBbox.x1 + PADDING;
    const rOriginX = -rBbox.x1 + PADDING;

    console.log(
      `${lch} origin X: ${lOriginX.toFixed(
        2
      )} (based on bbox.x1=${lBbox.x1.toFixed(1)})`
    );
    console.log(
      `${rch} origin X: ${rOriginX.toFixed(
        2
      )} (based on bbox.x1=${rBbox.x1.toFixed(1)})`
    );

    // Test different kern values
    for (let kern of [0, -5, -10, -20, -50]) {
      const lOffset = -(lAdvance + lOriginX) + rOriginX - kern;
      console.log(
        `  kern=${kern.toString().padStart(3)}: l_offset=${lOffset.toFixed(2)}`
      );
    }
  }
}

main().catch(console.error);
