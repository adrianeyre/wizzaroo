import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describeTunnelHills } from "./island-tunnel-hill-placing.js";

const sitesFile = fileURLToPath(
  new URL("./island-tunnel-hill-sites.ts", import.meta.url),
);

const islandIds = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

/**
 * Writes the hill over every tunnel, from each Island's Railway as it is
 * laid on the ground without them.
 */
const writeSites = async (): Promise<void> => {
  const islands = islandIds.map(
    (islandId) =>
      `  "${islandId}": ${JSON.stringify(describeTunnelHills(islandId))},`,
  );
  await writeFile(
    sitesFile,
    `import type { MapPoint } from "../world-map-terrain.js";

export interface TunnelHillSite {
  tunnelId: string;
  /** The track through the tunnel, portal to portal, with its height. */
  bore: readonly (MapPoint & { y: number })[];
  /** Each portal's face, the track's height there and the way out. */
  portals: readonly (MapPoint & { y: number; outX: number; outZ: number })[];
  /** The open track near the hill, which its sides keep off. */
  openTrack: readonly MapPoint[];
  /**
   * What stands near the hill, and the edges of the water and airfield
   * round it, which its sides keep off, rising no steeper than \`slope\`.
   */
  keepClear: readonly (MapPoint & { reach: number; slope?: number })[];
}

// Written by \`pnpm run generate:tunnel-hills\`, from each Island's Railway
// as it is laid without these hills (\`generate-tunnel-hills.ts\`).
export const tunnelHillSites: Readonly<
  Record<string, readonly TunnelHillSite[]>
> = {
${islands.join("\n")}
};
`,
  );
};

await writeSites();
