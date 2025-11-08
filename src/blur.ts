import ndarray, { NdArray } from "ndarray";
import config from "./config.js";

/** Gaussian blur using a separable kernel */
export function gaussianBlur(
  input: NdArray<Float32Array>,
  // Use factor from config so it is centrally adjustable
  sigma = config.BLUR_SIGMA_FACTOR * input.shape[1]
): NdArray<Float32Array> {
  const width = input.shape[1];
  const height = input.shape[0];
  const radius = Math.round(sigma);
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => {
    const x = i - radius;
    return Math.exp(-(x * x) / (2 * sigma * sigma));
  });
  const sum = kernel.reduce((a, b) => a + b, 0);
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  const temp = ndarray(new Float32Array(width * height), [height, width]);
  const out = ndarray(new Float32Array(width * height), [height, width]);

  // horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let i = -radius; i <= radius; i++) {
        const xi = Math.min(width - 1, Math.max(0, x + i));
        acc += input.get(y, xi) * kernel[i + radius];
      }
      temp.set(y, x, acc);
    }
  }

  // vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let i = -radius; i <= radius; i++) {
        const yi = Math.min(height - 1, Math.max(0, y + i));
        acc += temp.get(yi, x) * kernel[i + radius];
      }
      out.set(y, x, acc);
    }
  }

  return out;
}
