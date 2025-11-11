#!/usr/bin/env node
import { Command } from "commander";
import * as opentype from "opentype.js";
import { renderGlyph } from "./glyph.js";
import { kernPair } from "./kernPair.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";
import { generateKerningTable } from "./generateKerningTable.js";

const program = new Command();

program
  .name("autokern-ts")
  .description(
    "Auto-compute kerning values for glyph pairs or generate kerning JSON table"
  )
  .argument("<fontfile>", "Path to font file (.ttf/.otf)")
  .argument("[pairs...]")
  .option("-s, --size <n>", "Font size (default 100)", "100")
  .option(
    "-o, --output <file>",
    "Generate kerning JSON file like generate-kerning"
  )
  .option(
    "--pairs <list>",
    "Comma-separated list of pairs to analyze for JSON output"
  )
  .parse(process.argv);

const fontfile = program.args[0];
const pairs = program.args.slice(1);
const outputFile = program.opts().output;
const pairsList = program.opts().pairs;

/** Find overlap calibration thresholds */
function findS(font: opentype.Font): [number, number] {
  const TUNING_CHARS = "lno";
  let ss: number[] = [];

  for (const char of TUNING_CHARS) {
    const glyph = renderGlyph(font, char);
    // Don't blur here - kernPair will blur internally
    const kern = kernPair(glyph, glyph, 0, 1e10);
    const blurred = { ...glyph, bitmap: gaussianBlur(glyph.bitmap) };
    const s = overlap(blurred, blurred, kern);
    ss.push(s);
  }

  const minS = Math.min(...ss);
  const maxS = Math.max(...ss);
  return [minS, maxS];
}

(async () => {
  if (outputFile) {
    // Generate kerning JSON file for font, optionally with user pairs
    const { outputPath, kerningTable } = await generateKerningTable(
      fontfile,
      outputFile,
      pairsList
    );
    console.log(`Kerning table saved to: ${outputPath}`);
    console.log(`Total pairs: ${Object.keys(kerningTable).length}`);
    return;
  }

  if (!pairs.length) {
    console.error(
      "No pairs provided. Use --output to generate kerning JSON or specify pairs."
    );
    process.exit(1);
  }

  const font = await opentype.load(fontfile);
  // Calibrate overlap thresholds
  const [minS, maxS] = findS(font);
  for (const pair of pairs) {
    if (pair.length !== 2) continue;
    const [lch, rch] = pair;
    const left = renderGlyph(font, lch);
    const right = renderGlyph(font, rch);
    const kern = kernPair(left, right, minS, maxS);
    console.log(`${pair}: suggested kerning ${kern.toFixed(2)} (px)`);
  }
})();
