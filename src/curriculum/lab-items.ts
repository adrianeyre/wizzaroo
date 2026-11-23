/**
 * The things a lab game's question can show on the turntable in place of
 * the Game's prop, so a question about a jellyfish shows a jellyfish. Each
 * has its own 3D model in `src/client/lab-items/`.
 */
export const labItems = [
  "snowy-owl",
  "camel",
  "shark",
  "squirrel",
  "arctic-fox",
  "fennec-fox",
  "jellyfish",
  "badger",
] as const;

export type LabItem = (typeof labItems)[number];

export const isLabItem = (value: unknown): value is LabItem =>
  labItems.some((item) => item === value);
