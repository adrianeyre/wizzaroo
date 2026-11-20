export const shapes3d = [
  "cube",
  "cuboid",
  "pyramid",
  "sphere",
  "cylinder",
  "cone",
] as const;

export type Shape3d = (typeof shapes3d)[number];

export const isShape3d = (value: unknown): value is Shape3d =>
  shapes3d.some((shape) => shape === value);
