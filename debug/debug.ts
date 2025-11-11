import { NdArray } from "ndarray";
import { createCanvas } from "canvas";
import * as fs from "fs";
import * as path from "path";

/** Save a bitmap as PNG for debugging */
export function saveBitmapAsPNG(
  bitmap: NdArray<Float32Array>,
  filename: string
): void {
  const height = bitmap.shape[0];
  const width = bitmap.shape[1];

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const imgData = ctx.createImageData(width, height);

  // Get min/max values for normalization
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = bitmap.get(y, x) ?? 0;
      minVal = Math.min(minVal, val);
      maxVal = Math.max(maxVal, val);
    }
  }

  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = bitmap.get(y, x) ?? 0;
      const normalized = ((val - minVal) / range) * 255;
      const idx = (y * width + x) * 4;
      imgData.data[idx] = normalized; // R
      imgData.data[idx + 1] = normalized; // G
      imgData.data[idx + 2] = normalized; // B
      imgData.data[idx + 3] = 255; // A
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filename, buffer);
  console.error(
    `[DEBUG] Saved bitmap to ${filename} (${width}x${height}, min=${minVal.toFixed(
      2
    )}, max=${maxVal.toFixed(2)}, range=${range.toFixed(2)})`
  );
}

/** Log statistics about a bitmap */
export function logBitmapStats(
  bitmap: NdArray<Float32Array>,
  label: string
): void {
  const height = bitmap.shape[0];
  const width = bitmap.shape[1];

  let minVal = Infinity;
  let maxVal = -Infinity;
  let sum = 0;
  let nonZeroCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = bitmap.get(y, x) ?? 0;
      minVal = Math.min(minVal, val);
      maxVal = Math.max(maxVal, val);
      sum += val;
      if (val > 0.001) nonZeroCount++;
    }
  }

  const avg = sum / (width * height);
  console.error(
    `[DEBUG] ${label}: size=${width}x${height}, min=${minVal.toFixed(
      4
    )}, max=${maxVal.toFixed(4)}, avg=${avg.toFixed(
      4
    )}, nonZero=${nonZeroCount}`
  );
}
