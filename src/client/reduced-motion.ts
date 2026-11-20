export const isMotionReduced = (): boolean =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export const getMotionScale = (): number => (isMotionReduced() ? 0 : 1);
