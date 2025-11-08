#!/usr/bin/env node
import { Command } from "commander";
import * as opentype from "opentype.js";
import * as fs from "fs";
import { renderGlyph } from "./glyph.js";
import { kernPair } from "./kernPair.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";

const program = new Command();

program
  .name("generate-kerning")
  .description("Generate kerning table for a font and save as JSON")
  .argument("<fontfile>", "Path to font file (.ttf/.otf)")
  .argument("[outputfile]", "Output file (default: FontName.json)")
  .parse(process.argv);

const [fontfile, outputfile] = program.args;

// Common kerning pairs in typography
const COMMON_PAIRS = [
  "AV",
  "AW",
  "AY",
  "AO",
  "AC",
  "AT",
  "AF",
  "AB",
  "AD",
  "AG",
  "AJ",
  "AQ",
  "AR",
  "AS",
  "AL",
  "AU",
  "AX",
  "AZ",
  "VA",
  "TA",
  "FA",
  "Pa",
  "To",
  "Tw",
  "Ty",
  "Te",
  "Tr",
  "WA",
  "WO",
  "Wa",
  "Ye",
  "Yo",
  "Yp",
  "Yd",
  "La",
  "Lo",
  "LC",
  "LD",
  "LT",
  "Po",
  "Pa",
  "Pe",
  "Pr",
  "rn",
  "rm",
  "Th",
  "Tn",
  "Co",
  "on",
  "ox",
  "or",
  "oo",
  "oa",
  "oe",
  "To",
  "Tr",
  "Ta",
  "Te",
  "Ti",
  "Tu",
  "Ty",
  "Tw",
  "Th",
  "The",
  "That",
  "Then",
];

/** Find overlap calibration thresholds */
function findS(font: opentype.Font): [number, number] {
  const TUNING_CHARS = "lno";
  let ss: number[] = [];

  for (const char of TUNING_CHARS) {
    const glyph = renderGlyph(font, char);
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
  const font = await opentype.load(fontfile);
  const [minS, maxS] = findS(font);

  // Get font name for output file
  const fontName =
    outputfile ||
    fontfile
      .split("/")
      .pop()
      ?.replace(/\.(ttf|otf)$/i, "") + ".json";

  const kerningTable: { [key: string]: number } = {};

  console.log("Generating kerning pairs...");

  for (const pair of COMMON_PAIRS) {
    if (pair.length !== 2) continue;

    const [lch, rch] = pair;

    // Skip pairs that don't exist in font
    if (!font.hasChar(lch) || !font.hasChar(rch)) {
      continue;
    }

    const left = renderGlyph(font, lch);
    const right = renderGlyph(font, rch);

    // Get kern value in pixels
    const kernPx = kernPair(left, right, minS, maxS);

    // Convert to percentage of left glyph advance width
    const kernPercent = (kernPx / left.advance) * 100;

    kerningTable[pair] = Math.round(kernPercent * 100) / 100; // Round to 2 decimals

    console.log(
      `${pair}: ${kernPx.toFixed(1)} px (${kerningTable[pair].toFixed(2)}%)`
    );
  }

  // Save to file
  const output = {
    font: fontName.replace(".json", ""),
    fontSize: 100,
    kerning: kerningTable,
  };

  fs.writeFileSync(fontName, JSON.stringify(output, null, 2));
  console.log(`\nKerning table saved to: ${fontName}`);
  console.log(`Total pairs: ${Object.keys(kerningTable).length}`);
})();
