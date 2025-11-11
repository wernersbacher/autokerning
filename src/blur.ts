import ndarray, { NdArray } from "ndarray";
import config from "./config.js";

/** Gaussian blur using a separable kernel */
export function gaussianBlur(
  input: NdArray<Float32Array>,
  // Use factor from config so it is centrally adjustable
  sigma = config.BLUR_SIGMA_FACTOR * input.shape[1],
  // Optional: override sigma with fixed kernel width (for adaptive calibration)
  kernelWidth?: number
): NdArray<Float32Array> {
  // If kernelWidth is provided, use it to calculate sigma (like Python's adaptive calibration)
  if (kernelWidth !== undefined) {
    sigma = kernelWidth / 4; // Matches Python: c = KERNEL_WIDTH / 4
  }
  const width = input.shape[1];
  const height = input.shape[0];
  const radius = Math.round(sigma);
  // Cache kernel arrays by radius to avoid recomputing for same sigma
  const kernelCache: { [r: number]: Float64Array } =
    (gaussianBlur as any)._kernelCache || {};
  (gaussianBlur as any)._kernelCache = kernelCache;

  let kernel = kernelCache[radius];
  if (!kernel) {
    const klen = radius * 2 + 1;
    const tmp = new Float64Array(klen);
    let s = 0;
    for (let i = 0; i < klen; i++) {
      const x = i - radius;
      const v = Math.exp(-(x * x) / (2 * sigma * sigma));
      tmp[i] = v;
      s += v;
    }
    for (let i = 0; i < klen; i++) tmp[i] /= s;
    kernel = tmp;
    kernelCache[radius] = kernel;
  }

  const inData = (input as any).data as Float32Array | Float64Array;
  const tempData = new Float32Array(width * height);
  const outData = new Float32Array(width * height);

  // horizontal pass (direct indexing)
  for (let y = 0; y < height; y++) {
    const rowOff = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let i = -radius; i <= radius; i++) {
        const xi = Math.min(width - 1, Math.max(0, x + i));
        acc += inData[rowOff + xi] * kernel[i + radius];
      }
      tempData[rowOff + x] = acc;
    }
  }

  // vertical pass
  for (let y = 0; y < height; y++) {
    const rowOff = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let i = -radius; i <= radius; i++) {
        const yi = Math.min(height - 1, Math.max(0, y + i));
        acc += tempData[yi * width + x] * kernel[i + radius];
      }
      outData[rowOff + x] = acc;
    }
  }

  return ndarray(outData, [height, width]);
}
