import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { curiosityIslandIds } from "./curiosities/curiosity-kit.js";
import { findExploreAdventure } from "./island-adventures.js";
import { findCuriositySites } from "./island-curiosity-placing.js";
import type { CuriositySite } from "./island-curiosity-sites.js";

const sitesFile = fileURLToPath(
  new URL("./island-curiosity-sites.ts", import.meta.url),
);

const round = (value: number, places: number): number =>
  Math.round(value * 10 ** places) / 10 ** places;

const describeSite = (site: CuriositySite): string =>
  `    { kind: "${site.kind}", footprint: ${String(site.footprint)}, centre: { x: ${String(round(site.centre.x, 2))}, z: ${String(round(site.centre.z, 2))} }, ground: ${String(round(site.ground, 4))}, padDepth: ${String(round(site.padDepth, 3))}, turn: ${String(round(site.turn, 5))}, padColour: "${site.padColour}" },`;

/**
 * Writes where every Curiosity stands. It runs after
 * `generate-attraction-sites.ts`, in its own process, so the
 * Curiosities keep clear of the Attraction sites just written.
 */
const writeSites = async (): Promise<void> => {
  const islands = curiosityIslandIds.map((islandId) => {
    const sites = findCuriositySites(findExploreAdventure(islandId));
    return `  "${islandId}": [\n${sites.map(describeSite).join("\n")}\n  ],`;
  });
  await writeFile(
    sitesFile,
    `import type { CuriosityKind } from "./curiosities/curiosity-kit.js";
import type { MapPoint } from "../world-map-terrain.js";

export interface CuriositySite {
  kind: CuriosityKind;
  footprint: number;
  centre: MapPoint;
  ground: number;
  /** How far the terrace's bank reaches down below \`ground\`. */
  padDepth: number;
  turn: number;
  padColour: string;
}

// Written by \`pnpm run generate:attraction-sites\`, from what
// \`findCuriositySites\` in \`island-curiosity-placing.ts\` finds.
export const curiositySites: Readonly<
  Record<string, readonly CuriositySite[]>
> = {
${islands.join("\n")}
};
`,
  );
};

await writeSites();
