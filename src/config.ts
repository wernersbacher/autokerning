// Central configuration for kerning algorithm. Values may be overridden via
// environment variables: BLUR_SIGMA_FACTOR, MAX_KERN, KERN_STEP, DEBUG_STEP
export const FONT_SIZE = parseInt(process.env.FONT_SIZE || "100", 10);
export const BLUR_SIGMA_FACTOR = parseFloat(
  process.env.BLUR_SIGMA_FACTOR || "0.15"
);
export const MAX_KERN = parseInt(process.env.MAX_KERN || "30", 10);
export const KERN_STEP = parseInt(process.env.KERN_STEP || "1", 10);
export const DEBUG_STEP = parseInt(process.env.DEBUG_STEP || "5", 10);
export const SELECTION_STRATEGY =
  process.env.SELECTION_STRATEGY || "calibrated";
// Epsilon for 'no-overlap' strategy (treat overlap <= EPS as acceptable/no visible overlap)
export const NO_OVERLAP_EPS = parseFloat(process.env.NO_OVERLAP_EPS || "1");

// Derived: kernel width fallback (unused directly but kept for compatibility)
export const KERNEL_WIDTH = Math.max(1, Math.round(0.5 * FONT_SIZE));

export default {
  FONT_SIZE,
  BLUR_SIGMA_FACTOR,
  MAX_KERN,
  KERN_STEP,
  DEBUG_STEP,
  KERNEL_WIDTH,
  SELECTION_STRATEGY,
  NO_OVERLAP_EPS,
};
