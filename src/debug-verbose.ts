#!/usr/bin/env node
import * as fs from "fs";
import { Command } from "commander";
import * as opentype from "opentype.js";
import { renderGlyph, Glyph as RenderedGlyph } from "./glyph.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";
import { kernPair } from "./kernPair.js";
import { saveBitmapAsPNG, logBitmapStats } from "./debug.js";
import ndarray from "ndarray";
import { createCanvas } from "canvas";
import config from "./config.js";

const program = new Command();
program
  .name("debug-verbose")
  .description("Produce debug images for kerning algorithm steps")
  .argument("<fontfile>", "Path to font file (.ttf/.otf)")
  .argument("<pairs...>", "Pairs to debug, e.g. Po AV")
  .option("-o, --out <dir>", "Output directory", "debug-output")
  .parse(process.argv);

const [fontfile, ...pairs] = program.args as string[];
const outDir = program.opts().out;

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function toNdArrayImage(bitmap: any) {
  // bitmap: NdArray<Float32Array>
  return bitmap;
}

function saveCompositeColor(
  leftBitmap: any,
  rightBitmap: any,
  lDrawX: number,
  rDrawX: number,
  filename: string
) {
  const height = Math.max(leftBitmap.shape[0], rightBitmap.shape[0]);
  const minX = Math.min(lDrawX, rDrawX);
  const maxX = Math.max(
    lDrawX + leftBitmap.shape[1],
    rDrawX + rightBitmap.shape[1]
  );
  const width = Math.ceil(maxX - minX);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const lx = x - (lDrawX - minX);
      const rx = x - (rDrawX - minX);
      const lVal =
        lx >= 0 && lx < leftBitmap.shape[1] && y < leftBitmap.shape[0]
          ? leftBitmap.get(y, lx) ?? 0
          : 0;
      const rVal =
        rx >= 0 && rx < rightBitmap.shape[1] && y < rightBitmap.shape[0]
          ? rightBitmap.get(y, rx) ?? 0
          : 0;
      const idx = (y * width + x) * 4;
      // left in red channel, right in blue channel
      img.data[idx] = Math.round(Math.min(1, lVal) * 255); // R
      img.data[idx + 1] = 0; // G
      img.data[idx + 2] = Math.round(Math.min(1, rVal) * 255); // B
      // alpha if either present
      img.data[idx + 3] = Math.round(Math.max(lVal, rVal) * 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  fs.writeFileSync(filename, canvas.toBuffer("image/png"));
}

function computeIntersectionBitmap(left: any, right: any, kern: number) {
  // left/right are RenderedGlyph-like shapes with bitmap NdArray and bboxOffsetX
  const lOffset = -(left.advance + left.bboxOffsetX) + right.bboxOffsetX - kern;
  const xStart = Math.max(0, lOffset);
  const xEnd = Math.min(right.width, lOffset + left.width);
  const width = Math.max(0, Math.floor(xEnd - xStart));
  const height = Math.max(left.height, right.height);

  const arr = new Float32Array(height * Math.max(1, width));
  const out = ndarray(arr, [height, Math.max(1, width)]);

  let sum = 0;
  let count = 0;

  if (width <= 0) return { bitmap: out, sum: 0, count: 0, lOffset };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rx = x + xStart; // right coordinate
      const lx = rx - lOffset; // left coordinate
      const rVal =
        rx >= 0 && rx < right.width && y < right.height
          ? right.bitmap.get(y, rx) ?? 0
          : 0;
      const lVal =
        lx >= 0 && lx < left.width && y < left.height
          ? left.bitmap.get(y, Math.floor(lx)) ?? 0
          : 0;
      const product = lVal * lVal * rVal * rVal; // follow algorithm
      out.set(y, x, product);
      if (product > 0) {
        sum += product;
        count++;
      }
    }
  }

  return { bitmap: out, sum, count, lOffset, xStart, xEnd };
}

(async () => {
  const font = await opentype.load(fontfile);

  // compute calibration thresholds (minS, maxS) the same way as generate-kerning
  function findS(font: opentype.Font): [number, number] {
    const TUNING_CHARS = "lno";
    const ss: number[] = [];
    for (const char of TUNING_CHARS) {
      const glyph = renderGlyph(font, char);
      const kern = kernPair(glyph, glyph, 0, 1e10);
      const blurred = { ...glyph, bitmap: gaussianBlur(glyph.bitmap) } as any;
      const s = overlap(blurred, blurred, kern);
      ss.push(s);
    }
    return [Math.min(...ss), Math.max(...ss)];
  }

  const [minS, maxS] = findS(font);
  console.error(
    `[DEBUG] Calibration minS=${minS.toFixed(2)}, maxS=${maxS.toFixed(2)}`
  );

  for (const pair of pairs) {
    if (pair.length !== 2) continue;
    const [lch, rch] = pair;

    console.error(`\n--- Debugging pair: ${pair} ---`);

    const left = renderGlyph(font, lch) as any;
    const right = renderGlyph(font, rch) as any;

    // Save raw rendered bitmaps
    saveBitmapAsPNG(left.bitmap, `${outDir}/${pair}_left_render.png`);
    saveBitmapAsPNG(right.bitmap, `${outDir}/${pair}_right_render.png`);
    logBitmapStats(left.bitmap, `${pair} left render`);
    logBitmapStats(right.bitmap, `${pair} right render`);

    // Save blurred envelopes
    const leftBlur = gaussianBlur(left.bitmap);
    const rightBlur = gaussianBlur(right.bitmap);
    saveBitmapAsPNG(leftBlur, `${outDir}/${pair}_left_blur.png`);
    saveBitmapAsPNG(rightBlur, `${outDir}/${pair}_right_blur.png`);
    logBitmapStats(leftBlur, `${pair} left blurred`);
    logBitmapStats(rightBlur, `${pair} right blurred`);

    // Save composite (no kern) visualization where right at 0, left at lOffset (kern=0)
    const lOffset0 = -(left.advance + left.bboxOffsetX) + right.bboxOffsetX - 0;
    // compute minX for placement
    const minX0 = Math.min(0, lOffset0);
    const leftDrawX0 = Math.round(lOffset0 - minX0);
    const rightDrawX0 = Math.round(0 - minX0);
    saveCompositeColor(
      leftBlur,
      rightBlur,
      leftDrawX0,
      rightDrawX0,
      `${outDir}/${pair}_composite_kern0.png`
    );

    // For a range of kerns produce intersection masks and composite
    const kernRange = [];
    // Build range from config: -MAX_KERN .. 0 with DEBUG_STEP
    for (let k = -config.MAX_KERN; k <= 0; k += config.DEBUG_STEP)
      kernRange.push(k);

    const report: any = {
      pair,
      left: { advance: left.advance, width: left.width },
      right: { advance: right.advance, width: right.width },
      calibration: { minS, maxS },
      entries: [],
    };

    // compute recommended kern using same function as generate-kerning
    const recommendedKernPx = kernPair(left, right, minS, maxS);
    const recommendedKernPercent =
      Math.round((recommendedKernPx / left.advance) * 10000) / 100;
    report.recommended = {
      px: recommendedKernPx,
      percent: recommendedKernPercent,
    };
    console.error(
      `[DEBUG] ${pair} recommended kern: ${recommendedKernPx}px (${recommendedKernPercent}%)`
    );

    for (const k of kernRange) {
      const { bitmap, sum, count, lOffset, xStart, xEnd } =
        computeIntersectionBitmap(
          { ...left, bitmap: leftBlur },
          { ...right, bitmap: rightBlur },
          k
        );
      const fileBase = `${outDir}/${pair}_kern_${k}`;
      saveBitmapAsPNG(bitmap, `${fileBase}_intersection.png`);

      // Save composite placement for this kern
      const minX = Math.min(0, lOffset);
      const leftDrawX = Math.round(lOffset - minX);
      const rightDrawX = Math.round(0 - minX);
      saveCompositeColor(
        leftBlur,
        rightBlur,
        leftDrawX,
        rightDrawX,
        `${fileBase}_composite.png`
      );

      report.entries.push({ kern: k, lOffset, xStart, xEnd, sum, count });
    }

    fs.writeFileSync(
      `${outDir}/${pair}_report.json`,
      JSON.stringify(report, null, 2)
    );
    console.error(`[DEBUG] Wrote report: ${outDir}/${pair}_report.json`);
  }
})();
