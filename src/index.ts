import { generateKerningTable } from "./generateKerningTable.js";
export { kernPair } from "./kernPair.js";
export { renderGlyph } from "./glyph.js";
export { generateKerningTable };

// Re-export types if any
export type { GenerateKerningOptions } from "./generateKerningTable.js";

// Convenience wrapper: retrieve kerning table without writing file
export async function getKerningTable(fontfile: string, pairs?: string) {
  const res = await generateKerningTable(fontfile, { pairs, writeFile: false });
  return res.kerningTable;
}
