import { createCanvas, CanvasRenderingContext2D } from "canvas";
import * as opentype from "opentype.js";
import ndarray, { NdArray } from "ndarray";

/** Represents a rendered glyph as a grayscale matrix */
export interface Glyph {
  char: string;
  width: number;
  height: number;
  advance: number;
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
  const canvasWidth = glyphWidth + 2 * PADDING;
  const canvasHeight = glyphHeight + 2 * PADDING;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  // White background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Black glyph
  ctx.fillStyle = "black";
  // Center glyph vertically in canvas, with horizontal padding
  const verticalCenter = glyphHeight / 2 - (bbox.y1 + bbox.y2) / 2;
  ctx.translate(PADDING - bbox.x1, PADDING + verticalCenter);
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
    bitmap: gray,
  };
}
