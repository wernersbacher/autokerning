import * as opentype from "opentype.js";
import { renderGlyph } from "./glyph.js";
import { kernPair } from "./kernPair.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";
import config from "./config.js";

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

/**
 * Find overlap calibration thresholds with adaptive kernel width adjustment.
 * Matches Python algorithm: find kernel size where min_s > max_s / 2
 * @returns [minS, maxS, usedKernelWidth]
 */
function findS(font: opentype.Font): [number, number, number] {
  const TUNING_CHARS = "lno";
  const FONT_SIZE = config.FONT_SIZE;
  let kernelWidth = Math.round(0.2 * FONT_SIZE);
  if (kernelWidth % 2 === 0) kernelWidth += 1; // Make it odd

  let iteration = 0;
  const MAX_ITERATIONS = 100; // Safety limit

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    const ss: number[] = [];

    // Compute overlap for each tuning character
    for (const char of TUNING_CHARS) {
      const glyph = renderGlyph(font, char);
      // Blur with current kernel width
      const blurred = {
        ...glyph,
        bitmap: gaussianBlur(glyph.bitmap, undefined, kernelWidth),
      };
      // Glyph with itself (kern=0)
      const s = overlap(blurred, blurred, 0);
      ss.push(s);
    }

    const minS = Math.min(...ss);
    const maxS = Math.max(...ss);
    const ratio = minS / maxS;

    console.debug(
      `findS iteration ${iteration}: kernelWidth=${kernelWidth}, minS=${minS.toFixed(
        2
      )}, maxS=${maxS.toFixed(2)}, ratio=${ratio.toFixed(3)}`
    );

    // Check calibration condition (matching Python algorithm)
    if (minS > maxS / 2) {
      console.info(
        `✓ Calibration converged: kernelWidth=${kernelWidth}, minS=${minS.toFixed(
          2
        )}, maxS=${maxS.toFixed(2)}`
      );
      return [minS, maxS, kernelWidth];
    }

    // Kernel too small, increase it
    kernelWidth += 2;

    // Safety check
    if (kernelWidth > 2 * FONT_SIZE) {
      console.warn(
        `⚠️ Failed to find reasonable kernel size (exceeded ${
          2 * FONT_SIZE
        }). Using kernelWidth=${kernelWidth - 2}`
      );
      return [minS, maxS, kernelWidth - 2];
    }
  }

  throw new Error("findS: Max iterations exceeded");
}

/**
 * Generate kerning table for a font file.
 * @param fontfile Path to font file
 * @param outputfile Output file path (optional)
 * @param pairs Comma-separated string of pairs to analyze (optional)
 */
export type GenerateKerningOptions = {
  pairs?: string; // comma-separated pairs
  outputfile?: string; // filename to write, if undefined no write performed unless writeFile=true
  writeFile?: boolean; // default true for backward compatibility
};

export async function generateKerningTable(
  fontfile: string,
  opts: GenerateKerningOptions | string | undefined = undefined
): Promise<{ outputPath?: string; kerningTable: Record<string, number> }> {
  // Backwards-compatible call signatures: (fontfile, outputfile, pairs)
  let outputfile: string | undefined;
  let pairs: string | undefined;
  let writeFile = true;

  if (typeof opts === "string") {
    // old 2nd arg was pairs
    pairs = opts;
  } else if (typeof opts === "object" && opts !== null) {
    outputfile = (opts as GenerateKerningOptions).outputfile;
    pairs = (opts as GenerateKerningOptions).pairs;
    writeFile = (opts as GenerateKerningOptions).writeFile ?? true;
  }

  const font = await opentype.load(fontfile);
  const [minS, maxS, kernelWidth] = findS(font);

  // Get font name for output file
  const fontName =
    outputfile ||
    (fontfile
      .split("/")
      .pop()
      ?.replace(/\.(ttf|otf)$/i, "") || "font") + ".json";

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
    process.stdout.write(`Calculating pair ${pair}\r`);
    const left = renderGlyph(font, lch);
    const right = renderGlyph(font, rch);
    // Pass kernelWidth to kernPair for calibrated blur
    const kernPx = kernPair(left, right, minS, maxS, kernelWidth);
    const kernPercent = (kernPx / left.advance) * 100;
    kerningTable[pair] = Math.round(kernPercent * 100) / 100;
  }

  if (writeFile) {
    const output = {
      font: fontName.replace(".json", ""),
      fontSize: 100,
      kerning: kerningTable,
    };
    const fs = await import("fs");
    fs.writeFileSync(fontName, JSON.stringify(output, null, 2));
    return { outputPath: fontName, kerningTable };
  }

  return { kerningTable };
}
