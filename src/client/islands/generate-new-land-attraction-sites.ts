import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { findExploreAdventure } from "./island-adventures.js";
import { findNewLandAttractionSites } from "./island-new-land-attraction-placing.js";
import type { NewLandAttractionSite } from "./island-new-land-attraction-sites.js";
import { newLandAttractionIslandIds } from "./new-land-attractions/new-land-attraction-kit.js";

const sitesFile = fileURLToPath(
  new URL("./island-new-land-attraction-sites.ts", import.meta.url),
);

const round = (value: number, places: number): number =>
  Math.round(value * 10 ** places) / 10 ** places;

const describeSite = (site: NewLandAttractionSite): string =>
  `    { kind: "${site.kind}", footprint: ${String(site.footprint)}, centre: { x: ${String(round(site.centre.x, 2))}, z: ${String(round(site.centre.z, 2))} }, ground: ${String(round(site.ground, 4))}, padDepth: ${String(round(site.padDepth, 3))}, turn: ${String(round(site.turn, 5))}, padColour: "${site.padColour}" },`;

/**
 * Writes where every new land's Attraction stands. It runs last, in its
 * own process, after the Attractions, Curiosities and Quest are written,
 * so it keeps clear of them and none of them move.
 */
const writeSites = async (): Promise<void> => {
  const islands = newLandAttractionIslandIds.map((islandId) => {
    const sites = findNewLandAttractionSites(findExploreAdventure(islandId));
    return `  "${islandId}": [\n${sites.map(describeSite).join("\n")}\n  ],`;
  });
  await writeFile(
    sitesFile,
    `import type { NewLandAttractionKind } from "./new-land-attractions/new-land-attraction-kit.js";
import type { MapPoint } from "../world-map-terrain.js";

export interface NewLandAttractionSite {
  kind: NewLandAttractionKind;
  footprint: number;
  centre: MapPoint;
  ground: number;
  /** How far the terrace's bank reaches down below \`ground\`. */
  padDepth: number;
  turn: number;
  padColour: string;
}

// Written by \`pnpm run generate:attraction-sites\`, from what
// \`findNewLandAttractionSites\` in \`island-new-land-attraction-placing.ts\`
// finds.
export const newLandAttractionSites: Readonly<
  Record<string, readonly NewLandAttractionSite[]>
> = {
${islands.join("\n")}
};
`,
  );
};

await writeSites();
