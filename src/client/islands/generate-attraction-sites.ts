import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { findExploreAdventure } from "./island-adventures.js";
import {
  attractionIslandIds,
  findAttractionSites,
} from "./island-attraction-placing.js";
import type { AttractionSite } from "./island-attraction-sites.js";

const sitesFile = fileURLToPath(
  new URL("./island-attraction-sites.ts", import.meta.url),
);

const round = (value: number, places: number): number =>
  Math.round(value * 10 ** places) / 10 ** places;

const describeSite = (site: AttractionSite): string =>
  `    { kind: "${site.kind}", footprint: ${String(site.footprint)}, centre: { x: ${String(round(site.centre.x, 2))}, z: ${String(round(site.centre.z, 2))} }, ground: ${String(round(site.ground, 4))}, padDepth: ${String(round(site.padDepth, 3))}, turn: ${String(round(site.turn, 5))}, padColour: "${site.padColour}" },`;

const writeSites = async (): Promise<void> => {
  const islands = attractionIslandIds.map((islandId) => {
    const sites = findAttractionSites(findExploreAdventure(islandId));
    return `  "${islandId}": [\n${sites.map(describeSite).join("\n")}\n  ],`;
  });
  await writeFile(
    sitesFile,
    `import type { AttractionKind } from "./attractions/attraction-kit.js";
import type { MapPoint } from "../world-map-terrain.js";

export interface AttractionSite {
  kind: AttractionKind;
  footprint: number;
  centre: MapPoint;
  ground: number;
  /** How far the terrace's bank reaches down below \`ground\`. */
  padDepth: number;
  turn: number;
  padColour: string;
}

// Written by \`pnpm run generate:attraction-sites\`, from what
// \`findAttractionSites\` in \`island-attraction-placing.ts\` finds.
export const attractionSites: Readonly<
  Record<string, readonly AttractionSite[]>
> = {
${islands.join("\n")}
};
`,
  );
};

await writeSites();
