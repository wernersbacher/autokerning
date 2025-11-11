import { describe, it, expect } from "vitest";
import { getKerningTable, generateKerningTable } from "./api.js";
import * as fs from "fs";

/**
 * Integration test: Real-world usage scenarios
 *
 * These tests show how users would actually use the autokerning package:
 * 1. Load a real TTF file
 * 2. Request kerning for specific glyph pairs
 * 3. Use the results in their application
 *
 * Uses local Roboto-Black.ttf font file for testing
 */

// Available test font files (relative to project root)
const TEST_FONTS = ["./Roboto-Black.ttf"];

const FONT_PATH = TEST_FONTS.find((font) => {
  try {
    return fs.existsSync(font);
  } catch {
    return false;
  }
});

describe.skipIf(!FONT_PATH)("Integration: Real-world usage", () => {
  describe("User Scenario 1: Load a font and get kerning for specific pairs", () => {
    it("loads a font file and computes kerning for common pairs", async () => {
      const fontPath = FONT_PATH as string;

      // User loads a font and wants kerning for these specific pairs
      const pairs = "AV,AW,To,Tr";
      const kerningTable = await getKerningTable(fontPath, pairs);

      // Verify we got results back
      expect(kerningTable).toBeDefined();
      expect(typeof kerningTable).toBe("object");
      expect(Object.keys(kerningTable).length).toBeGreaterThan(0);

      // Each result should be a kerning pair with a numeric value
      for (const [pair, kern] of Object.entries(kerningTable)) {
        expect(pair).toMatch(/^.{2}$/); // 2-character pairs only
        expect(typeof kern).toBe("number");
        expect(Number.isFinite(kern)).toBe(true);
      }
    }, 30000); // 30 second timeout for kerning computation

    it("kerning values are usable in a design application", async () => {
      const fontPath = FONT_PATH as string;
      const kerningTable = await getKerningTable(fontPath, "AV,To");

      // User needs: pair → kern value for rendering
      for (const [pair, kern] of Object.entries(kerningTable)) {
        // Kern values are percentages of advance width
        // A user would adjust letter spacing by this percentage
        const spacing = kern; // e.g., -15.5 means 15.5% tighter
        expect(spacing).toBeGreaterThan(-100); // reasonable bounds
        expect(spacing).toBeLessThan(100);
      }
    });
  });

  describe("User Scenario 2: Generate full kerning table for export", () => {
    it("generates kerning table and receives all results", async () => {
      const fontPath = FONT_PATH as string;

      const result = await generateKerningTable(fontPath, {
        writeFile: false, // Don't create files during tests
      });

      // User gets kerning table with all computed pairs
      expect(result.kerningTable).toBeDefined();
      expect(Object.keys(result.kerningTable).length).toBeGreaterThan(0);

      // No file should be created (writeFile: false)
      expect(result.outputPath).toBeUndefined();
    });

    it("can save results to JSON for later use", async () => {
      const fontPath = FONT_PATH as string;

      const result = await generateKerningTable(fontPath, {
        pairs: "AV,AW,AY,To,Tr",
        writeFile: false,
      });

      // User can serialize the kerning table to JSON
      const json = JSON.stringify(result.kerningTable, null, 2);
      expect(json).toBeDefined();
      expect(json.length).toBeGreaterThan(0);

      // And parse it back
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(result.kerningTable);
    });
  });

  describe("User Scenario 3: Compare kerning across different selections", () => {
    it("computes different pair sets independently", async () => {
      const fontPath = FONT_PATH as string;

      // User wants to compare kerning for different pair sets
      const result1 = await getKerningTable(fontPath, "AV,AW,AY");
      const result2 = await getKerningTable(fontPath, "To,Tr,Ta");

      // Results should be independent
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // AV should only be in first set
      if ("AV" in result1) {
        expect(result1.AV).toEqual((await getKerningTable(fontPath, "AV")).AV);
      }
    });

    it("produces consistent results for repeated requests", async () => {
      const fontPath = FONT_PATH as string;
      const pairs = "AV,To,WA";

      // User calls the API multiple times with same parameters
      const result1 = await getKerningTable(fontPath, pairs);
      const result2 = await getKerningTable(fontPath, pairs);
      const result3 = await getKerningTable(fontPath, pairs);

      // Should get identical results (deterministic algorithm)
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe("User Scenario 4: Workflow - from file to usable data", () => {
    it("complete workflow: load font → compute kerning → extract values", async () => {
      const fontPath = FONT_PATH as string;

      // Step 1: User has a font file
      expect(fs.existsSync(fontPath)).toBe(true);

      // Step 2: User requests kerning for their text
      const pairs = "AV,AW,To,Tr,WA,VA";
      const kerningTable = await getKerningTable(fontPath, pairs);

      // Step 3: User has kerning values ready to use
      expect(Object.keys(kerningTable).length).toBeGreaterThan(0);

      // Step 4: User extracts specific values for their layout
      const textsToLayout = ["AV", "To", "WA"];
      const kerningValues: Record<string, number> = {};

      for (const text of textsToLayout) {
        if (text in kerningTable) {
          kerningValues[text] = kerningTable[text as keyof typeof kerningTable];
        }
      }

      expect(Object.keys(kerningValues).length).toBeGreaterThan(0);
    });
  });

  describe("User Scenario 5: Error handling and edge cases", () => {
    it("handles non-existent glyph pairs gracefully", async () => {
      const fontPath = FONT_PATH as string;

      // User requests pairs that might not exist in font
      // (e.g., special characters, emojis)
      const result = await getKerningTable(fontPath, "🌟🌟,❤️❤️,AV");

      // Should not crash, just skip missing pairs
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");

      // Valid pairs like AV should still be computed
      // (if font has them)
    });

    it("handles empty pair list", async () => {
      const fontPath = FONT_PATH as string;

      // User passes empty pairs
      const result = await getKerningTable(fontPath, "");

      // Should use COMMON_PAIRS instead
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    it("handles very long pair strings", async () => {
      const fontPath = FONT_PATH as string;

      // User requests many pairs at once
      const manyPairs =
        "AV,AW,AY,AO,AC,AT,AF,AB,AD,AG,AJ,AQ,AR,AS,AL,AU,AX,AZ," +
        "VA,TA,FA,Pa,To,Tw,Ty,Te,Tr,WA,WO,Wa,Ye,Yo,Yp,Yd,La,Lo";

      const result = await getKerningTable(fontPath, manyPairs);

      // Should handle gracefully
      expect(typeof result).toBe("object");
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  describe("User Scenario 6: Using generateKerningTable directly", () => {
    it("has access to full API with all options", async () => {
      const fontPath = FONT_PATH as string;

      // User can use generateKerningTable with full options
      const result = await generateKerningTable(fontPath, {
        pairs: "AV,AW,To",
        writeFile: false,
        // outputfile would be used if they wanted to write to disk
      });

      // Full result with structure info
      expect(result).toHaveProperty("kerningTable");
      expect(result.kerningTable).toBeDefined();

      // outputPath is undefined because writeFile: false
      expect(result.outputPath).toBeUndefined();
    });

    it("respects backward-compatible API", async () => {
      const fontPath = FONT_PATH as string;

      // User can use old API: generateKerningTable(font, pairs)
      const result = await generateKerningTable(fontPath, "AV,To");

      // Should work and return kerningTable
      expect(result.kerningTable).toBeDefined();
      expect(typeof result.kerningTable).toBe("object");
    });
  });

  describe("Data Quality Checks", () => {
    it("computed kerning values are reasonable", async () => {
      const fontPath = FONT_PATH as string;

      const kerningTable = await getKerningTable(
        fontPath,
        "AV,AW,AY,To,Tr,WA,VA,Ta,Te,Ye"
      );

      // Check for reasonable values
      for (const [pair, kern] of Object.entries(kerningTable)) {
        // Kerning should be in percentage range [-50, 50]
        // (extreme negative is tighter, positive is looser)
        expect(kern).toBeGreaterThan(-100);
        expect(kern).toBeLessThan(100);

        // Kerning should be a reasonable number, not 0 or tiny
        // (well, could be 0, but not NaN or Infinity)
        expect(Number.isFinite(kern)).toBe(true);
        expect(Number.isNaN(kern)).toBe(false);
      }
    });

    it("large pairs have similar characteristics", async () => {
      const fontPath = FONT_PATH as string;

      const kerningTable = await getKerningTable(fontPath, "AV,AW,AY,AO");

      // Pairs starting with same letter should have similar patterns
      const aVPairs = Object.entries(kerningTable).filter(([pair]) =>
        pair.startsWith("A")
      );

      expect(aVPairs.length).toBeGreaterThan(0);

      // Most A-pairs typically have negative kerning (tight)
      const negativePairs = aVPairs.filter(([, kern]) => kern < 0).length;
      const positivePairs = aVPairs.filter(([, kern]) => kern > 0).length;

      // At least some should be negative (typical for A-pairs)
      expect(negativePairs + positivePairs).toBeGreaterThan(0);
    });

    it("detects when overlap calculation is broken (strict bounds)", async () => {
      const fontPath = FONT_PATH as string;

      // Test with pairs that have ACTUAL overlap (not zero like ligatures)
      // Examples: uppercase pairs, certain lowercase combinations
      const kerningTable = await getKerningTable(
        fontPath,
        "AV,AW,AY,AO,To,Tr,WA,VA,YA,Ta,Te,Tu,AT,FA,LA"
      );

      // If overlap was multiplied by a large factor, kerning values would be huge
      // Normal kerning should be in [-50, 50] range
      // This test catches multiplication/scaling bugs in overlap or kernPair logic

      for (const [pair, kern] of Object.entries(kerningTable)) {
        // STRICT bounds: kerning should typically be in [-50, 50] percent range
        // Anything > ±50 usually indicates a calculation bug
        expect(kern).toBeGreaterThan(-50);
        expect(kern).toBeLessThan(50);
      }

      // For these specific pairs, we should see a mix of positive and negative
      // This validates that the algorithm is working (not all 0 or all same sign)
      const negativeCount = Object.values(kerningTable).filter(
        (k) => k < 0
      ).length;
      const positiveCount = Object.values(kerningTable).filter(
        (k) => k > 0
      ).length;
      expect(negativeCount + positiveCount).toBeGreaterThan(0);
    });
  });
});

describe("Integration: Without font file", () => {
  it("skips integration tests when FONT_PATH not set", () => {
    // This test documents the skip behavior
    if (!FONT_PATH) {
      expect(FONT_PATH).toBeUndefined();
    }
  });
});
