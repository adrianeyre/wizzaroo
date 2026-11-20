import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BufferGeometry } from "three";
import { islands as curriculumIslands } from "../../curriculum/islands.js";
import { listIslandRegions } from "../../curriculum/world-map.js";
import {
  listMeadowScatters,
  meadowScatterSinks,
} from "../world-map-islands.js";
import {
  buildBroadleafGeometry,
  buildBushGeometry,
  buildCottageGeometry,
  buildLighthouseGeometry,
  buildPineGeometry,
  buildRockGeometry,
  buildStoneBridgeGeometry,
} from "../world-map-models.js";
import {
  bridgeCrossing,
  bridgeDeckHeight,
  bridgeSpan,
  bridgeTurn,
  landmarkScale,
  lighthouseScale,
  mapLandmarkBuilders,
  placeOnGround,
} from "../world-map-scene.js";
import {
  lighthousePosition,
  type ScatteredThing,
} from "../world-map-terrain.js";
import {
  AttractionBuilder,
  attractionFinishes,
  type Motion,
  type MovingPart,
} from "./attractions/attraction-kit.js";
import {
  exploreScale,
  findWalkSurface,
  type AdventureWorld,
} from "./island-adventures.js";
import { buildAirfieldGeometry } from "./island-airfield-design.js";
import {
  listPlacedAttractions,
  toIslandPoint,
  type PlacedAttraction,
} from "./island-attractions.js";
import { buildIslandFlagpoleGeometry } from "./island-flagpole.js";
import { buildHoverSlipwayGeometry } from "./island-hover-slipway.js";
import {
  buildPlacer,
  cacheSurface,
  listChunkedSources,
  listPlacedModelSources,
  listTrianglePositions,
  type ClearSpot,
  type Placement,
  type SolidSource,
} from "./island-obstacle-field.js";
import {
  markTriangles,
  obstacleBodyRadius,
  type SurfaceFinder,
} from "./island-obstacles.js";
import {
  buildRailwayStructuresGeometry,
  findRailwayLook,
} from "./island-railway-design.js";
import { listOverheadLineGeometries } from "./island-overhead-line.js";
import { findRailway, hasRailway } from "./island-railway.js";
import {
  buildIslandLandmarkGeometry,
  findIslandDesign,
  listIslandScatters,
} from "./island-scene.js";
import { buildDockGeometry } from "./island-ship-models.js";
import {
  buildCaveGlowGeometry,
  buildWondersGeometry,
  findCave,
  findWonderTheme,
  groveBuilders,
  groveSink,
  scatterGrove,
} from "./island-wonders.js";

/**
 * Every solid thing on an Island that the Character bumps into when
 * exploring on foot (ADR 0061): the Attractions and Curiosities, the
 * trees, bushes, rocks and houses, the sights, the dock and airfield,
 * the Stations, the Wonders and each Region's landmark. Whatever
 * explore mode draws on its own (signs, dens, lamps, watchtowers) it
 * adds with `listPlacedModelSources`.
 */

const waterFinish = attractionFinishes.indexOf("water");

/** Moving parts that stay put enough to bump into; jets, flames and hiding things don't. */
const solidMotions: ReadonlySet<Motion["kind"]> = new Set([
  "spin",
  "swing",
  "bob",
  "nod",
  "whirl",
  "launch",
]);

export const isSolidMovingPart = ({ motion, look }: MovingPart): boolean =>
  (look ?? "finished") === "finished" &&
  solidMotions.has(motion.kind) &&
  !(motion.kind === "launch" && motion.role === "engine");

const buildTriangles = (
  build: (builder: AttractionBuilder) => void,
): Float32Array => {
  const builder = new AttractionBuilder("near");
  build(builder);
  const geometry = builder.build();
  const triangles = listTrianglePositions(geometry, [waterFinish]);
  geometry.dispose();
  return triangles;
};

const listAttractionSources = (
  attractions: readonly PlacedAttraction[],
  findSurface: ReturnType<typeof cacheSurface>,
): SolidSource[] =>
  attractions.map((attraction) => ({
    name: attraction.id,
    centre: attraction.centre,
    reach: attraction.model.footprint + 1,
    mark: (grid) => {
      const place = buildPlacer({
        x: attraction.centre.x,
        y: attraction.ground,
        z: attraction.centre.z,
        turn: attraction.turn,
        scale: 1,
      });
      markTriangles(
        grid,
        buildTriangles((builder) => {
          attraction.model.build(builder);
        }),
        place,
        findSurface,
      );
      for (const part of (attraction.model.moving ?? []).filter(
        isSolidMovingPart,
      )) {
        const [pivotX, pivotY, pivotZ] = part.pivot;
        markTriangles(
          grid,
          buildTriangles(part.build),
          (x, y, z) => place(x + pivotX, y + pivotY, z + pivotZ),
          findSurface,
        );
      }
    },
  }));

/** Where rides start and finish, kept clear so every ride can still be had. */
export const listAttractionClearSpots = (
  attractions: readonly PlacedAttraction[],
): ClearSpot[] =>
  attractions.flatMap((attraction) =>
    (attraction.model.rides ?? []).flatMap((ride) => [
      {
        centre: toIslandPoint(attraction, ride.start),
        radius: Math.min(ride.reach, 1) + obstacleBodyRadius,
      },
      {
        centre: toIslandPoint(attraction, ride.finish),
        radius: 0.5,
      },
    ]),
  );

/** A thing scattered on the map, placed as the World Map's land group (scaled up) draws it. */
const placeScattered = (thing: ScatteredThing, sink: number): Placement => ({
  x: thing.x * exploreScale,
  y: (thing.height - sink) * exploreScale,
  z: thing.z * exploreScale,
  turn: thing.turn,
  scale: thing.scale * exploreScale,
});

const listScatterSources = (
  name: string,
  buildGeometry: () => BufferGeometry,
  things: readonly ScatteredThing[],
  sink: number,
  findSurface: SurfaceFinder,
): SolidSource[] =>
  listPlacedModelSources(
    name,
    () => {
      const geometry = buildGeometry();
      const triangles = listTrianglePositions(geometry);
      geometry.dispose();
      return triangles;
    },
    things.map((thing) => placeScattered(thing, sink)),
    () => findSurface,
  );

const listMeadowSources = (
  findSurface: ReturnType<typeof cacheSurface>,
): SolidSource[] => {
  const scatters = listMeadowScatters(
    listIslandRegions("meadow-isle").map(({ mapPosition }) => mapPosition),
  );
  return [
    ...listScatterSources(
      "pine",
      buildPineGeometry,
      scatters.pines,
      meadowScatterSinks.pines,
      findSurface,
    ),
    ...listScatterSources(
      "broadleaf",
      buildBroadleafGeometry,
      scatters.broadleaves,
      meadowScatterSinks.broadleaves,
      findSurface,
    ),
    ...listScatterSources(
      "bush",
      buildBushGeometry,
      scatters.bushes,
      meadowScatterSinks.bushes,
      findSurface,
    ),
    ...listScatterSources(
      "rock",
      buildRockGeometry,
      scatters.rocks,
      meadowScatterSinks.rocks,
      findSurface,
    ),
    ...listScatterSources(
      "cottage",
      buildCottageGeometry,
      scatters.houses,
      meadowScatterSinks.houses,
      findSurface,
    ),
    ...listPlacedModelSources(
      "lighthouse",
      () => toTriangles(buildLighthouseGeometry),
      [
        {
          x: lighthousePosition.x * exploreScale,
          y: placeOnGround(lighthousePosition)[1] * exploreScale,
          z: lighthousePosition.z * exploreScale,
          turn: 0,
          scale: lighthouseScale * exploreScale,
        },
      ],
      () => findSurface,
    ),
    ...listPlacedModelSources(
      "bridge",
      () =>
        listTrianglePositions(
          buildStoneBridgeGeometry(bridgeSpan, bridgeDeckHeight),
        ),
      [
        {
          x: bridgeCrossing.x * exploreScale,
          y: 0,
          z: bridgeCrossing.z * exploreScale,
          turn: bridgeTurn,
          scale: exploreScale,
        },
      ],
      () => findSurface,
    ),
  ];
};

const listDrawnIslandSources = (
  islandId: string,
  findSurface: ReturnType<typeof cacheSurface>,
): SolidSource[] => {
  const island = curriculumIslands.find(({ id }) => id === islandId);
  if (island === undefined) {
    return [];
  }
  const { landform } = findIslandDesign(islandId);
  return [
    ...listIslandScatters(island).flatMap((scatter) =>
      listScatterSources(
        scatter.name,
        scatter.buildGeometry,
        scatter.things,
        scatter.sink,
        findSurface,
      ),
    ),
    ...landform.features.flatMap((feature) => {
      const [x, y, z] = placeOnGround(
        feature.position,
        feature.lift,
        landform.findHeight,
      );
      return listPlacedModelSources(
        feature.name,
        () => {
          const geometry = feature.buildGeometry();
          const triangles = listTrianglePositions(geometry);
          geometry.dispose();
          return triangles;
        },
        [
          {
            x: x * exploreScale,
            y: y * exploreScale,
            z: z * exploreScale,
            turn: feature.turn ?? 0,
            scale: (feature.scale ?? 1) * exploreScale,
          },
        ],
        () => findSurface,
      );
    }),
  ];
};

const isMeadowIsle = (islandId: string): boolean => islandId === "meadow-isle";

const toTriangles = (build: () => BufferGeometry): Float32Array => {
  const geometry = build();
  const triangles = listTrianglePositions(geometry);
  geometry.dispose();
  return triangles;
};

/** Each Region's landmark, drawn on the Island's land group, scaled up. */
const listRegionSources = (
  world: AdventureWorld,
  findSurface: SurfaceFinder,
): SolidSource[] => {
  const { islandId, findHeight } = world.adventure;
  const island = curriculumIslands.find(({ id }) => id === islandId);
  const landmarks =
    island === undefined
      ? listIslandRegions(islandId).map(({ id, mapPosition, landmark }) => ({
          id,
          mapPosition,
          build: mapLandmarkBuilders[landmark],
        }))
      : island.regions.map(({ id, mapPosition, landmark }) => ({
          id,
          mapPosition,
          build: () => buildIslandLandmarkGeometry(landmark),
        }));
  return landmarks.flatMap(({ id, mapPosition, build }) => {
    const centre = {
      x: mapPosition.x * exploreScale,
      z: mapPosition.z * exploreScale,
    };
    return listPlacedModelSources(
      `region-${id}`,
      () => toTriangles(build),
      [
        {
          ...centre,
          y: Math.max(0, findHeight(centre)),
          turn: 0,
          scale: landmarkScale * exploreScale,
        },
      ],
      () => findSurface,
    );
  });
};

/** The Wonders explore mode draws: their buildings, and the grove of trees round them. */
const listWonderSources = (
  world: AdventureWorld,
  findSurface: SurfaceFinder,
): SolidSource[] => {
  const { adventure } = world;
  const cave = findCave(adventure);
  return [
    ...listChunkedSources(
      "wonders",
      () => toTriangles(() => buildWondersGeometry(adventure)),
      findSurface,
    ),
    ...(cave === undefined
      ? []
      : listChunkedSources(
          "cave-crystals",
          () => toTriangles(() => buildCaveGlowGeometry(cave)),
          findSurface,
        )),
    ...listPlacedModelSources(
      "wonder-grove",
      () =>
        toTriangles(groveBuilders[findWonderTheme(adventure.islandId).grove]),
      scatterGrove(adventure).map(({ x, z, height, turn, scale }) => ({
        x,
        y: height - groveSink,
        z,
        turn,
        scale,
      })),
      () => findSurface,
    ),
  ];
};

/** The surface the Character stands on anywhere on the Island, cached. */
export const buildWorldSurface = (world: AdventureWorld) =>
  cacheSurface(
    (x, z, fromHeight) => findWalkSurface(world, { x, z }, fromHeight).height,
  );

/**
 * Every solid thing on an Island, and the spots kept clear among them.
 * The Island's own drawing is in map units on a land group scaled up by
 * `exploreScale`; Attractions, the dock and the Stations are in explore
 * units already.
 */
export const listIslandSolids = (
  world: AdventureWorld,
): { sources: SolidSource[]; clearSpots: ClearSpot[] } => {
  const { adventure } = world;
  const islandId = adventure.islandId;
  const findSurface = buildWorldSurface(world);
  const attractions = listPlacedAttractions(islandId);
  const harbour = (): Float32Array => {
    const geometry = mergeGeometries([
      buildDockGeometry(adventure),
      buildAirfieldGeometry(adventure),
      buildHoverSlipwayGeometry(adventure),
      buildIslandFlagpoleGeometry(adventure),
    ]);
    const triangles = listTrianglePositions(geometry);
    geometry.dispose();
    return triangles;
  };
  const stations = (): Float32Array => {
    const railway = findRailway(islandId);
    const overheadLine = listOverheadLineGeometries(railway, "explore");
    const geometry = mergeGeometries([
      buildRailwayStructuresGeometry(
        railway,
        findRailwayLook(islandId),
        adventure,
      ),
      ...overheadLine,
    ]);
    const triangles = listTrianglePositions(geometry);
    geometry.dispose();
    overheadLine.forEach((line) => {
      line.dispose();
    });
    return triangles;
  };
  return {
    sources: [
      ...listAttractionSources(attractions, findSurface),
      ...(isMeadowIsle(islandId)
        ? listMeadowSources(findSurface)
        : listDrawnIslandSources(islandId, findSurface)),
      ...listRegionSources(world, findSurface),
      ...listWonderSources(world, findSurface),
      ...listChunkedSources("harbour", harbour, findSurface),
      ...(hasRailway(islandId)
        ? listChunkedSources("stations", stations, findSurface)
        : []),
    ],
    clearSpots: listAttractionClearSpots(attractions),
  };
};
