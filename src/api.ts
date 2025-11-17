import { generateKerningTable } from "./generateKerningTable.js";

export { generateKerningTable };

export async function getKerningTable(fontfile: string, pairs?: string[]) {
  const res = await generateKerningTable(fontfile, { pairs, writeFile: false });
  return res.kerningTable;
}
