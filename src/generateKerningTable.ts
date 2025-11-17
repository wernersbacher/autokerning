import * as opentype from "opentype.js";
import { renderGlyph } from "./glyph.js";
import { kernPair } from "./kernPair.js";
import { gaussianBlur } from "./blur.js";
import { overlap } from "./overlap.js";
import config from "./config.js";
import { logger } from "./log.js";
import { COMMON_PAIRS } from "./commonPairs.js";

/**
 * Find overlap calibration thresholds with adaptive kernel width adjustment.
 * Matches Python algorithm: find kernel size where min_s > max_s / 2
 * @returns [minS, maxS, usedKernelWidth]
 */
export function findS(font: opentype.Font): [number, number, number] {
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

    logger.debug(
      `findS iteration ${iteration}: kernelWidth=${kernelWidth}, minS=${minS.toFixed(
        2
      )}, maxS=${maxS.toFixed(2)}, ratio=${ratio.toFixed(3)}`
    );

    // Check calibration condition (matching Python algorithm)
    if (minS > maxS / 2) {
      logger.info(
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
      logger.warn(
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
 * @param pairs Array of pairs to analyze (optional)
 */
export type GenerateKerningOptions = {
  pairs?: string[]; // array of pairs
  outputfile?: string; // filename to write, if undefined no write performed unless writeFile=true
  writeFile?: boolean; // default true for backward compatibility
};

export async function generateKerningTable(
  fontfile: string,
  opts: GenerateKerningOptions | undefined = undefined
): Promise<{ outputPath?: string; kerningTable: Record<string, number> }> {
  let outputfile: string | undefined;
  let pairs: string[] | undefined;
  let writeFile = true;

  if (typeof opts === "object" && opts !== null) {
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
  if (pairs && pairs.length > 0) {
    pairList = pairs.filter((p) => p.length === 2);
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
