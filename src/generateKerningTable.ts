import * as opentype from "opentype.js";
import { renderGlyph } from "./glyph.js";
import { kernPair } from "./kernPair.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";

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
  "he",
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

/**
 * Generate kerning table for a font file.
 * @param fontfile Path to font file
 * @param outputfile Output file path (optional)
 * @param pairs Comma-separated string of pairs to analyze (optional)
 */
export async function generateKerningTable(
  fontfile: string,
  outputfile?: string,
  pairs?: string
): Promise<{ outputPath: string; kerningTable: Record<string, number> }> {
  const font = await opentype.load(fontfile);
  const [minS, maxS] = findS(font);
  // Get font name for output file
  const fontName =
    outputfile ||
    fontfile
      .split("/")
      .pop()
      ?.replace(/\.(ttf|otf)$/i, "") + ".json";

  // Determine pairs to analyze
  let pairList: string[];
  if (pairs && pairs.trim().length > 0) {
    pairList = pairs
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length === 2);
  } else {
    pairList = COMMON_PAIRS.filter((p) => p.length === 2);
  }

  const kerningTable: { [key: string]: number } = {};
  for (const pair of pairList) {
    const [lch, rch] = pair;
    if (!font.hasChar(lch) || !font.hasChar(rch)) {
      continue;
    }
    const left = renderGlyph(font, lch);
    const right = renderGlyph(font, rch);
    const kernPx = kernPair(left, right, minS, maxS);
    const kernPercent = (kernPx / left.advance) * 100;
    kerningTable[pair] = Math.round(kernPercent * 100) / 100;
  }
  const output = {
    font: fontName.replace(".json", ""),
    fontSize: 100,
    kerning: kerningTable,
  };
  const fs = await import("fs");
  fs.writeFileSync(fontName, JSON.stringify(output, null, 2));
  return { outputPath: fontName, kerningTable };
}
