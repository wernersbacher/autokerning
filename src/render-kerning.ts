#!/usr/bin/env node
import { Command } from "commander";
import * as opentype from "opentype.js";
import * as fs from "fs";
import { createCanvas, CanvasRenderingContext2D } from "canvas";

const program = new Command();

program
  .name("render-kerning")
  .description("Render before/after comparisons of kerning")
  .argument("<fontfile>", "Path to font file (.ttf/.otf)")
  .argument("<kerningtable>", "Path to kerning JSON file")
  .argument("[outputdir]", "Output directory (default: ./kerning-examples)")
  .parse(process.argv);

const [fontfile, kerningTableFile, outputdir] = program.args;
const outDir = outputdir || "./kerning-examples";

// Create output directory
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const FONT_SIZE = 120;
const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 600;

// Create example sentences using common pairs
const EXAMPLE_SENTENCES: { [key: string]: string } = {
  AV: "AVOCADO VALLEY",
  AW: "AWARDS AWAITING",
  AY: "ANYONE ANYWAY",
  AF: "AFRICA FROZEN",
  AB: "ABSOLUTE BEGINNING",
  AD: "ADVANCED DESIGN",
  AG: "AGILE GARDEN",
  AQ: "AQUATIC QUALITY",
  AR: "ARCHITECTURE RISING",
  AS: "ASSISTANT ASSISTING",
  AX: "AXIS AXLE",
  AZ: "AZURE AZIMUTH",
  VA: "VALID ANSWERS",
  FA: "FANTASTIC ADVENTURES",
  Pa: "Particular PARTY",
  WA: "WAS GEHT AB",
  WO: "WO GEHEN WIR HIN?",
  Wa: "Waffle Wagon",
  Ta: "Tactical Table",
  Ye: "Yellow Yesterday",
  Yp: "Yuppie Young",
  Po: "Powerful Poet",
  Pe: "Perpendicular Peace",
  oo: "Foolish Moonlight",
  oa: "Coastal Roaming",
  oe: "Poet Opening",
};

function renderText(
  ctx: any,
  font: opentype.Font,
  text: string,
  x: number,
  y: number,
  kern: { [pair: string]: number } | null
): number {
  let currentX = x;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const path = font.getPath(char, currentX, y + FONT_SIZE, FONT_SIZE);
    // @ts-ignore
    path.draw(ctx);

    const advanceWidth = font.getAdvanceWidth(char, FONT_SIZE);
    currentX += advanceWidth;

    // Apply kerning between characters
    if (i < text.length - 1 && kern) {
      const pair = char + text[i + 1];
      if (kern[pair] !== undefined) {
        // kern is in percentage, convert to pixels
        const kernPx = (kern[pair] / 100) * advanceWidth;
        currentX += kernPx;
      }
    }
  }

  return currentX - x;
}

(async () => {
  const font = await opentype.load(fontfile);
  const kerningData = JSON.parse(fs.readFileSync(kerningTableFile, "utf-8"));
  const kerningTable = kerningData.kerning;

  console.log("Rendering kerning examples...");

  let exampleCount = 0;

  // Group pairs by first character
  for (const pair of Object.keys(kerningTable)) {
    if (pair.length !== 2) continue;

    // Use example sentence if available, otherwise just render the pair
    const exampleText = EXAMPLE_SENTENCES[pair] || pair;

    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d") as any;

    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Black text and strokes
    ctx.fillStyle = "black";
    ctx.strokeStyle = "black";

    // Render WITHOUT kerning (top)
    ctx.save();
    renderText(ctx, font, exampleText, 50, 80, null);
    ctx.restore();

    // Render WITH kerning (bottom)
    ctx.save();
    renderText(ctx, font, exampleText, 50, 320, kerningTable);
    ctx.restore();

    // Add subtle separators (no text labels)
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.lineTo(CANVAS_WIDTH, 300);
    ctx.stroke();

    // Save to PNG
    const buffer = canvas.toBuffer("image/png");

    // Build a case-unique filename: include code points so 'WA' != 'Wa' on case-insensitive filesystems
    const codePoints = Array.from(pair).map((c) =>
      c.codePointAt(0)?.toString(16).toUpperCase()
    );
    const safeFilename = `${pair.replace(
      /[^A-Za-z0-9_-]/g,
      "_"
    )}_${codePoints.join("-")}.png`;
    const filename = `${outDir}/${safeFilename}`;
    fs.writeFileSync(filename, buffer);

    // Log human-readable pair and saved filename
    console.log(`✓ ${pair}: ${kerningTable[pair].toFixed(2)}% -> ${filename}`);
    exampleCount++;
  }

  // Create summary page
  const summaryCanvas = createCanvas(1200, 600);
  const summaryCtx = summaryCanvas.getContext("2d");

  summaryCtx.fillStyle = "white";
  summaryCtx.fillRect(0, 0, 1200, 600);

  summaryCtx.fillStyle = "black";
  summaryCtx.font = "24px Arial";
  summaryCtx.fillText(`Kerning Table: ${kerningData.font}`, 30, 40);

  summaryCtx.font = "12px monospace";
  let y = 80;
  for (const [pair, kern] of Object.entries(kerningTable)) {
    summaryCtx.fillText(`${pair}: ${(kern as number).toFixed(2)}%`, 30, y);
    y += 20;
    if (y > 550) break;
  }

  const summaryBuffer = summaryCanvas.toBuffer("image/png");
  fs.writeFileSync(`${outDir}/summary.png`, summaryBuffer);

  console.log(`\nRendering complete!`);
  console.log(`Generated ${exampleCount} examples in ${outDir}/`);
  console.log(`Summary page: ${outDir}/summary.png`);
})();
