import { createCanvas, CanvasRenderingContext2D } from "canvas";
import * as opentype from "opentype.js";
import ndarray, { NdArray } from "ndarray";

/** Represents a rendered glyph as a grayscale matrix */
export interface Glyph {
  char: string;
  width: number;
  height: number;
  advance: number;
  bboxOffsetX: number; // x-bearing offset used for overlap calculation
  bitmap: NdArray<Float32Array>;
}

const FONT_SIZE = 100;

/** Render a single glyph from the font into a grayscale bitmap with proper bounds */
export function renderGlyph(font: opentype.Font, char: string): Glyph {
  const path = font.getPath(char, 0, FONT_SIZE, FONT_SIZE);
  const bbox = path.getBoundingBox();

  // Get glyph width and height from bounding box
  let glyphWidth = Math.ceil(bbox.x2 - bbox.x1);
  let glyphHeight = Math.ceil(bbox.y2 - bbox.y1);

  if (glyphWidth <= 0) glyphWidth = 1;
  if (glyphHeight <= 0) glyphHeight = 1;

  // Create canvas with some padding for blur/antialiasing
  const PADDING = 10;

  // Use font metrics (ascender/descender) to produce a consistent baseline
  const scale = FONT_SIZE / (font.unitsPerEm || 1000);
  const ascenderPx = (font.ascender ?? 800) * scale;
  const descenderPx = (font.descender ?? -200) * scale;
  const emHeight = Math.ceil(ascenderPx - descenderPx);

  const canvasWidth = glyphWidth + 2 * PADDING;
  // allocate canvas to cover full em box so baseline is same for all glyphs
  const canvasHeight = emHeight + 2 * PADDING;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  // White background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Black glyph
  ctx.fillStyle = "black";
  // Translate so that the font baseline maps to a consistent y in the canvas
  // Path was generated at y=FONT_SIZE; we want that baseline at PADDING + ascenderPx
  const baselineCanvasY = PADDING + ascenderPx;
  const translateY = baselineCanvasY - FONT_SIZE;
  ctx.translate(PADDING - bbox.x1, translateY);
  // @ts-ignore
  path.draw(ctx);
  ctx.fill();

  // Extract bitmap: invert so black (glyph) = high values
  const img = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const gray = ndarray(new Float32Array(canvasWidth * canvasHeight), [
    canvasHeight,
    canvasWidth,
  ]);

  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const idx = (y * canvasWidth + x) * 4;
      const red = img.data[idx];
      // Invert: white (255) -> 0, black (0) -> 1
      gray.set(y, x, (255 - red) / 255.0);
    }
  }

  const advance = font.getAdvanceWidth(char, FONT_SIZE);

  return {
    char,
    width: canvasWidth,
    height: canvasHeight,
    advance: advance,
    bboxOffsetX: -bbox.x1 + PADDING, // Store the x-bearing offset for overlap calc
    bitmap: gray,
  };
}
