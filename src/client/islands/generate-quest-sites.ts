import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { islandQuests } from "../../curriculum/island-quests.js";
import { findExploreAdventure } from "./island-adventures.js";
import { findQuestSites } from "./island-quest-placing.js";
import type { QuestSite } from "./island-quest-sites.js";

const sitesFile = fileURLToPath(
  new URL("./island-quest-sites.ts", import.meta.url),
);

const round = (value: number, places: number): number =>
  Math.round(value * 10 ** places) / 10 ** places;

const describeSite = (site: QuestSite): string =>
  `    { id: "${site.id}", kind: "${site.kind}", centre: { x: ${String(round(site.centre.x, 2))}, z: ${String(round(site.centre.z, 2))} }, ground: ${String(round(site.ground, 4))}, turn: ${String(round(site.turn, 5))} },`;

/**
 * Writes where every Quest thing, Islander and lying Find stands. It
 * runs after the Attraction and Curiosity sites are written, in its own
 * process, so the Quest keeps clear of them.
 */
const writeSites = async (): Promise<void> => {
  const islands = islandQuests.map((quest) => {
    const sites = findQuestSites(findExploreAdventure(quest.islandId), quest);
    const wanted =
      quest.things.length + quest.islanders.length + quest.lyingFindIds.length;
    if (sites.length !== wanted) {
      throw new Error(
        `Only ${String(sites.length)} of ${String(wanted)} Quest spots fit on ${quest.islandId}`,
      );
    }
    return `  "${quest.islandId}": [\n${sites.map(describeSite).join("\n")}\n  ],`;
  });
  await writeFile(
    sitesFile,
    `import type { MapPoint } from "../world-map-terrain.js";

export type QuestSiteKind = "thing" | "islander" | "find";

export interface QuestSite {
  id: string;
  kind: QuestSiteKind;
  centre: MapPoint;
  ground: number;
  turn: number;
}

// Written by \`pnpm run generate:attraction-sites\`, from what
// \`findQuestSites\` in \`island-quest-placing.ts\` finds.
export const questSites: Readonly<Record<string, readonly QuestSite[]>> = {
${islands.join("\n")}
};
`,
  );
};

await writeSites();
