import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as opentype from "opentype.js";
import { renderGlyph } from "../src/glyph.js";
import { kernPair } from "../src/kernPair.js";
import { findS } from "../src/generateKerningTable.js";

/**
 * Integration test: For calibrated mode, verify that recomputing kerning for
 * pairs found in a previously generated JSON (Roboto-Black.json) yields the
 * same percentage kerning values (rounded to 2 decimals) as stored in the file.
 */

const JSON_PATH = "../Roboto-Black.json";
const TTF_PATH = "../Roboto-Black.ttf";

describe.skipIf(!fs.existsSync(JSON_PATH) || !fs.existsSync(TTF_PATH))(
  "Calibrated parity: JSON vs recomputed",
  () => {
    it("recomputes kerning (calibrated) and matches JSON values", async () => {
      const raw = fs.readFileSync(JSON_PATH, "utf8");
      const parsed = JSON.parse(raw);

      expect(parsed).toHaveProperty("kerning");
      const kerningTable: Record<string, number> = parsed.kerning;

      const font = await opentype.load(TTF_PATH);
      const [minS, maxS, kernelWidth] = findS(font);

      for (const [pair, expectedPercent] of Object.entries(kerningTable)) {
        if (pair.length !== 2) continue;
        const [lch, rch] = pair;
        if (!font.hasChar(lch) || !font.hasChar(rch)) continue;

        const left = renderGlyph(font, lch);
        const right = renderGlyph(font, rch);

        const kernPx = kernPair(left, right, minS, maxS, kernelWidth);
        const kernPercent = (kernPx / left.advance) * 100;
        const rounded = Math.round(kernPercent * 100) / 100;

        expect(rounded).toBe(expectedPercent);
      }
    }, 60000);
  }
);
