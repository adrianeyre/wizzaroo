import { useMemo, useRef, useState } from "react";
import type {
  IslandOnMap,
  RegionOnMap,
} from "../../curriculum/island-access.js";
import type { TimeOfDay, Weather } from "../world-map-sky.js";
import { findIslandInView, WorldMapScene } from "../world-map-islands.js";
import { MapVoyage } from "./island-map-voyage.js";
import type { CraftPlacement } from "./island-flight.js";
import type { Transport } from "./island-journey.js";
import type { VoyagePhase } from "./island-voyage.js";

const crossingPhases: readonly VoyagePhase[] = ["crossing"];

export const VoyageCrossingScene = ({
  fromIsland,
  toIsland,
  transport,
  islands,
  regions,
  isEffectsOn,
  timeOfDay,
  weather,
}: {
  fromIsland: IslandOnMap;
  toIsland: IslandOnMap;
  transport: Transport;
  islands: IslandOnMap[];
  regions: RegionOnMap[];
  isEffectsOn: boolean;
  timeOfDay: TimeOfDay;
  weather: Weather;
}) => {
  const from = useMemo(
    () => ({ islandId: fromIsland.id, seaPosition: fromIsland.seaPosition }),
    [fromIsland.id, fromIsland.seaPosition],
  );
  const to = useMemo(
    () => ({ islandId: toIsland.id, seaPosition: toIsland.seaPosition }),
    [toIsland.id, toIsland.seaPosition],
  );
  const islandInViewRef = useRef(fromIsland.id);
  const [shownIslandId, setShownIslandId] = useState(fromIsland.id);
  const shownRegions = useMemo(
    () => regions.filter(({ islandId }) => islandId === shownIslandId),
    [regions, shownIslandId],
  );
  const followShip = (placement: CraftPlacement) => {
    const nearest = findIslandInView(islands, placement)?.id ?? fromIsland.id;
    if (nearest !== islandInViewRef.current) {
      islandInViewRef.current = nearest;
      setShownIslandId(nearest);
    }
  };
  return (
    <>
      <WorldMapScene
        islands={islands}
        islandInViewId={shownIslandId}
        regions={shownRegions}
        selectedRegionId={undefined}
        hoveredRegionId={undefined}
        onRegionChosen={() => undefined}
        onRegionHovered={() => undefined}
        onIslandChosen={() => undefined}
        isEffectsOn={isEffectsOn}
        timeOfDay={timeOfDay}
        weather={weather}
      />
      <MapVoyage
        from={from}
        to={to}
        transport={transport}
        phases={crossingPhases}
        onCraftMoved={followShip}
        onFinished={() => undefined}
      />
    </>
  );
};
