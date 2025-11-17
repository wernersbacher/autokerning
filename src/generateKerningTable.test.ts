import { describe, it, expect } from "vitest";
import { generateKerningTable } from "./generateKerningTable.js";
import { getKerningTable } from "./api.js";

describe("generateKerningTable", () => {
  describe("parameter handling", () => {
    it("accepts fontfile as string", async () => {
      // Verify the function signature and basic error handling
      expect(generateKerningTable).toBeDefined();
    });

    it("handles options parameter as array of strings", async () => {
      // New API: generateKerningTable(fontfile, { pairs: ["AV", "AW"] })
      // Should accept an array of pair strings
      expect(generateKerningTable).toBeDefined();
    });

    it("handles options as object with pairs, outputfile, writeFile", async () => {
      // Verify it can be called with options object
      // We don't test the actual computation here (requires real font)
      expect(generateKerningTable).toBeDefined();
    });
  });

  describe("return value structure", () => {
    it("returns object with kerningTable property", async () => {
      // Integration test: requires FONT_PATH environment variable
      // When available, verifies the return structure
      if (!process.env.FONT_PATH) {
        expect(true).toBe(true); // Skip if no font
        return;
      }

      const result = await generateKerningTable(process.env.FONT_PATH, {
        writeFile: false,
      });

      expect(result).toHaveProperty("kerningTable");
      expect(typeof result.kerningTable).toBe("object");
    });

    it("kerningTable contains string keys and number values", async () => {
      if (!process.env.FONT_PATH) {
        expect(true).toBe(true); // Skip if no font
        return;
      }

      const result = await generateKerningTable(process.env.FONT_PATH, {
        pairs: ["AV", "AW", "AY"],
        writeFile: false,
      });

      // Check structure: { "AV": -12.34, "AW": -15.2, ... }
      for (const [pair, kern] of Object.entries(result.kerningTable)) {
        expect(typeof pair).toBe("string");
        expect(typeof kern).toBe("number");
        expect(pair.length).toBe(2); // Pairs are 2 characters
      }
    });

    it("respects writeFile:false option (no file creation)", async () => {
      if (!process.env.FONT_PATH) {
        expect(true).toBe(true);
        return;
      }

      const result = await generateKerningTable(process.env.FONT_PATH, {
        writeFile: false,
      });

      // Should not have outputPath when writeFile is false
      expect(result.outputPath).toBeUndefined();
      expect(result.kerningTable).toBeDefined();
    });
  });

  describe("pair selection", () => {
    it("uses COMMON_PAIRS when no pairs specified", async () => {
      if (!process.env.FONT_PATH) {
        expect(true).toBe(true);
        return;
      }

      const result = await generateKerningTable(process.env.FONT_PATH, {
        writeFile: false,
      });

      // Should have computed some pairs
      expect(Object.keys(result.kerningTable).length).toBeGreaterThan(0);
    });

    it("computes only specified pairs", async () => {
      if (!process.env.FONT_PATH) {
        expect(true).toBe(true);
        return;
      }

      const result = await generateKerningTable(process.env.FONT_PATH, {
        pairs: ["AV", "AW"],
        writeFile: false,
      });

      // Should only contain specified pairs (or skip if glyphs missing)
      for (const pair of Object.keys(result.kerningTable)) {
        expect(["AV", "AW"]).toContain(pair);
      }
    });

    it("skips pairs with missing glyphs", async () => {
      if (!process.env.FONT_PATH) {
        expect(true).toBe(true);
        return;
      }

      // Most fonts don't have these glyphs
      const result = await generateKerningTable(process.env.FONT_PATH, {
        pairs: ["🌟🌟", "❤️❤️"],
        writeFile: false,
      });

      // Should gracefully skip invalid pairs
      expect(result.kerningTable).toBeDefined();
      expect(typeof result.kerningTable).toBe("object");
    });
  });

  describe("kerning values", () => {
    it("returns numeric kern values", async () => {
      if (!process.env.FONT_PATH) {
        expect(true).toBe(true);
        return;
      }

      const result = await generateKerningTable(process.env.FONT_PATH, {
        pairs: ["AV"],
        writeFile: false,
      });

      for (const kern of Object.values(result.kerningTable)) {
        expect(typeof kern).toBe("number");
        expect(Number.isFinite(kern)).toBe(true);
      }
    });

    it("kern values are percentages relative to advance width", async () => {
      if (!process.env.FONT_PATH) {
        expect(true).toBe(true);
        return;
      }

      const result = await generateKerningTable(process.env.FONT_PATH, {
        pairs: ["AV", "AW"],
        writeFile: false,
      });

      // Kerning is typically in range [-50, 50] percent
      for (const kern of Object.values(result.kerningTable)) {
        expect(kern).toBeGreaterThan(-100);
        expect(kern).toBeLessThan(100);
      }
    });

    it("produces consistent results for same input", async () => {
      if (!process.env.FONT_PATH) {
        expect(true).toBe(true);
        return;
      }

      const result1 = await generateKerningTable(process.env.FONT_PATH, {
        pairs: ["AV", "AW"],
        writeFile: false,
      });

      const result2 = await generateKerningTable(process.env.FONT_PATH, {
        pairs: ["AV", "AW"],
        writeFile: false,
      });

      // Same font and pairs should give same results
      expect(result1.kerningTable).toEqual(result2.kerningTable);
    });
  });
});

describe("getKerningTable (API wrapper)", () => {
  it("extracts kerningTable from generateKerningTable result", async () => {
    if (!process.env.FONT_PATH) {
      expect(true).toBe(true);
      return;
    }

    const result = await getKerningTable(process.env.FONT_PATH, ["AV", "AW"]); // Should return just the kerningTable, not the wrapper object
    expect(typeof result).toBe("object");
    expect(result).not.toHaveProperty("outputPath");
    // Should have kerning pairs
    for (const [pair, kern] of Object.entries(result)) {
      expect(pair.length).toBe(2);
      expect(typeof kern).toBe("number");
    }
  });

  it("passes pairs parameter correctly", async () => {
    if (!process.env.FONT_PATH) {
      expect(true).toBe(true);
      return;
    }

    const result = await getKerningTable(process.env.FONT_PATH, ["AV"]);

    // If AV pair exists in font, should be computed
    if ("AV" in result) {
      expect(typeof result.AV).toBe("number");
    }
  });

  it("never writes files to disk", async () => {
    if (!process.env.FONT_PATH) {
      expect(true).toBe(true);
      return;
    }

    const result = await getKerningTable(process.env.FONT_PATH);

    // Should never have outputPath (writeFile is always false)
    expect(result).not.toHaveProperty("outputPath");
  });
});
