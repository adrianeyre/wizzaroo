import {
  buildIslandsOnMap,
  buildRegionsOnMap,
  findRegionTurnOff,
  listGamesOnMap,
  type ChildLimits,
  type RegionAccess,
} from "../../curriculum/island-access.js";
import type { RegionProgress } from "../../curriculum/rewards.js";
import type { YearGroup } from "../../curriculum/year-groups.js";

interface IslandsAndGamesProps {
  child: {
    nickname: string;
    yearGroup: YearGroup | null;
    limits: ChildLimits;
    regionProgress: readonly RegionProgress[];
  };
}

// A Game's own title lives with its mission; its id reads well enough here, such as "popping-bubbles".
const describeGameId = (gameId: string): string => {
  const words = gameId.replaceAll("-", " ");
  return words.charAt(0).toLocaleUpperCase("en-GB") + words.slice(1);
};

const describeRegionAccess = (
  access: Exclude<RegionAccess, "open">,
  isTurnedOffByTeacher: boolean,
): string => {
  if (access === "island-locked") {
    return "Island locked";
  }
  return isTurnedOffByTeacher
    ? "turned off by their Teacher"
    : "turned off by their Parents";
};

/** Which Islands and Games a Child can play, worked out exactly as their World Map does, for reading only. */
export const IslandsAndGames = ({ child }: IslandsAndGamesProps) => {
  const islands = buildIslandsOnMap(child.yearGroup, child.limits);
  const regions = buildRegionsOnMap(islands, child.limits);
  return (
    <section aria-label={`${child.nickname}'s Islands and Games`}>
      <h3>Islands and Games</h3>
      <ul className="islands-and-games">
        {islands.map((island) => (
          <li key={island.id}>
            <details>
              <summary>
                {island.name}, Year {island.yearGroup}:{" "}
                {island.isUnlocked ? "open" : "locked"}
                {island.isHome ? " (their Home Island)" : ""}
              </summary>
              <ul>
                {regions
                  .filter(({ islandId }) => islandId === island.id)
                  .map((region) => {
                    if (region.access !== "open") {
                      return (
                        <li key={region.id}>
                          {region.name}:{" "}
                          {describeRegionAccess(
                            region.access,
                            findRegionTurnOff(child.limits, region) ===
                              "teacher",
                          )}
                        </li>
                      );
                    }
                    const games = listGamesOnMap(
                      region,
                      child.regionProgress,
                      child.limits,
                    );
                    const unlockedGames = games.filter(
                      ({ isUnlocked }) => isUnlocked,
                    );
                    return (
                      <li key={region.id}>
                        {region.name}: {unlockedGames.length} of {games.length}{" "}
                        Games unlocked (
                        {unlockedGames
                          .map(({ id }) => describeGameId(id))
                          .join(", ")}
                        )
                      </li>
                    );
                  })}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
};
