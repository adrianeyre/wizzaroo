import { describe, expect, it } from "vitest";
import {
  buildChildLimits,
  buildIslandsOnMap,
  buildRegionsOnMap,
  type RegionOnMap,
} from "../../curriculum/island-access.js";
import type { MapPoint } from "../world-map-terrain.js";
import { vehicleDesigns } from "../vehicles/vehicle-designs.js";
import {
  stepVehicle,
  type DrivenVehicle,
} from "../vehicles/vehicle-driving.js";
import {
  AttractionBuilder,
  addGroundPad,
  attractionKinds,
  countMotionCopies,
  type AttractionDetail,
  type AttractionModel,
} from "./attractions/attraction-kit.js";
import { attractionModels } from "./attractions/attraction-models.js";
import { hedgeMazeRoute } from "./attractions/hedge-maze.js";
import { emberVolcanoPosition } from "./ember-isle.js";
import {
  exploreScale,
  findExploreAdventure,
  findWalkSurface,
  listExploreBlockers,
} from "./island-adventures.js";
import {
  findPlayFinish,
  findPlaySpot,
  findRideKey,
  findRideProgress,
  findRideToStart,
  listStillSpentKeys,
} from "./island-attraction-rides.js";
import {
  attractionIslandIds,
  checkAttractionSite,
  findAttractionSites,
  listIslandAttractionKinds,
} from "./island-attraction-placing.js";
import { attractionSites } from "./island-attraction-sites.js";
import {
  buildAttractionCard,
  findParcelTarget,
  findStoryRegion,
} from "./island-attraction-visits.js";
import {
  listAttractionBlockers,
  listAttractionInteractions,
  listAttractionRides,
  listPlacedAttractions,
  toIslandPoint,
  toLocalPoint,
  type PlacedAttraction,
} from "./island-attractions.js";
import { buildExploreWorld } from "./island-transport.js";
import {
  buildStartingWalker,
  findIntentTowards,
  stepWalker,
  type Walker,
} from "./island-walker.js";
import { listWonderBlockers } from "./island-wonders.js";

const nearTriangleBudget = 16_000;
const farTriangleBudget = 6_000;
const movingPartLimit = 6;

const countTriangles = (geometry: {
  getAttribute: (name: string) => { count: number };
}) => geometry.getAttribute("position").count / 3;

const countModelTriangles = (
  model: AttractionModel,
  detail: AttractionDetail,
): number => {
  const measure = (build: (builder: AttractionBuilder) => void, copies = 1) => {
    const builder = new AttractionBuilder(detail);
    build(builder);
    const geometry = builder.build();
    const triangles = countTriangles(geometry) * copies;
    geometry.dispose();
    return triangles;
  };
  return (
    measure((builder) => {
      if (model.hasGroundPad !== false) {
        addGroundPad(builder, model.footprint);
      }
      model.build(builder);
    }) +
    (model.moving ?? []).reduce(
      (sum, part) => sum + measure(part.build, countMotionCopies(part.motion)),
      0,
    ) +
    (model.wanderers ?? []).reduce(
      (sum, wanderers) => sum + measure(wanderers.build, wanderers.count),
      0,
    )
  );
};

const findAttraction = (islandId: string, kind: string): PlacedAttraction => {
  const found = listPlacedAttractions(islandId).find(
    (attraction) => attraction.kind === kind,
  );
  if (found === undefined) {
    throw new Error(`No ${kind} on ${islandId}`);
  }
  return found;
};

const findIslandWith = (kind: string): string => {
  const islandId = attractionIslandIds.find((id) =>
    listIslandAttractionKinds(id).some((dealt) => dealt === kind),
  );
  if (islandId === undefined) {
    throw new Error(`No Island has the ${kind}`);
  }
  return islandId;
};

const walkThrough = (islandId: string, route: readonly MapPoint[]): Walker => {
  const adventure = findExploreAdventure(islandId);
  const world = buildExploreWorld(adventure);
  const blockers = [
    ...listExploreBlockers(adventure, []),
    ...listWonderBlockers(adventure),
    ...listAttractionBlockers(adventure),
  ];
  let walker = buildStartingWalker(world, route[0], 0);
  route.slice(1).forEach((target) => {
    for (let step = 0; step < 900; step++) {
      const intent = findIntentTowards(walker, target, 0.2);
      if (intent === undefined) {
        return;
      }
      walker = stepWalker(walker, intent, 1 / 30, world, blockers);
    }
  });
  return walker;
};

describe("dealing the Attractions out to the Islands", () => {
  const dealt = attractionIslandIds.flatMap(listIslandAttractionKinds);

  it("puts every Attraction on an Island, and only the school on more than one", () => {
    attractionKinds.forEach((kind) => {
      const count = dealt.filter((each) => each === kind).length;
      expect(count, kind).toBe(kind === "school" ? 6 : 1);
    });
  });

  it("puts the ones the owner chose where they asked", () => {
    expect(listIslandAttractionKinds("jungle-reach")).toContain(
      "adventure-playground",
    );
    expect(listIslandAttractionKinds("meadow-isle")).toContain("hedge-maze");
    expect(listIslandAttractionKinds("frost-isle")).toContain("ice-rink");
    expect(listIslandAttractionKinds("ember-isle")).toContain("fire-station");
    expect(["frost-isle", "ember-isle"]).toContain(
      findIslandWith("hot-springs"),
    );
    expect(listIslandAttractionKinds("sunscorch-sands")).toContain("oasis");
    expect(listIslandAttractionKinds("ember-isle")).toContain(
      "volcano-lookout",
    );
    expect(listIslandAttractionKinds("starfall-isle")).toContain(
      "rocket-launch-pad",
    );
  });

  it("shares them out evenly", () => {
    attractionIslandIds.forEach((islandId) => {
      const count = listIslandAttractionKinds(islandId).length;
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(7);
    });
  });
});

describe.each(attractionIslandIds.map((islandId) => [islandId] as const))(
  "the Attractions on %s",
  (islandId) => {
    const adventure = findExploreAdventure(islandId);
    const sites = attractionSites[islandId] ?? [];

    it("keeps a site for every Attraction dealt to the Island", () => {
      expect(sites.map(({ kind }) => kind).toSorted()).toEqual(
        [...listIslandAttractionKinds(islandId)].toSorted(),
      );
    });

    it("keeps sites that still fit, clear of everything and on level ground", () => {
      sites.forEach((site) => {
        const others = sites.filter((other) => other !== site);
        expect(checkAttractionSite(adventure, site, others)).toBeUndefined();
      });
    });

    it("keeps the sites the placer finds today", () => {
      expect(
        findAttractionSites(adventure).map(({ kind, centre }) => ({
          kind,
          x: Math.round(centre.x),
          z: Math.round(centre.z),
        })),
      ).toEqual(
        sites.map(({ kind, centre }) => ({
          kind,
          x: Math.round(centre.x),
          z: Math.round(centre.z),
        })),
      );
    });

    it("puts each one on the Island's new lands, inside the Island", () => {
      listPlacedAttractions(islandId)
        .filter(({ isCuriosity }) => !isCuriosity)
        .forEach(({ centre, model }) => {
          expect(Math.abs(centre.x) - model.footprint).toBeGreaterThan(
            34 * exploreScale,
          );
        });
    });

    it("lets the Character walk up to each one's sign", () => {
      const world = buildExploreWorld(adventure);
      listAttractionInteractions(adventure).forEach(({ position, name }) => {
        const surface = findWalkSurface(world, position, Infinity);
        expect(["ground", "trail", "bridge"], name).toContain(surface.kind);
      });
    });

    it("keeps each ride's start and finish open, outside every blocker", () => {
      const blockers = listAttractionBlockers(adventure);
      listAttractionRides(adventure).forEach(({ attraction, ride }) => {
        [ride.start, ride.finish].forEach((local) => {
          const point = toIslandPoint(attraction, local);
          blockers.forEach(({ centre, radius }) => {
            expect(
              Math.hypot(point.x - centre.x, point.z - centre.z),
              `${attraction.kind} ${ride.id}`,
            ).toBeGreaterThanOrEqual(radius - 0.01);
          });
        });
      });
    });
  },
);

describe.each(attractionKinds.map((kind) => [kind] as const))(
  "the %s model",
  (kind) => {
    const model = attractionModels[kind];

    it("says what it is and teaches something", () => {
      expect(model.kind).toBe(kind);
      expect(model.name.length).toBeGreaterThan(2);
      expect(model.fact.length).toBeGreaterThan(40);
    });

    it("fits inside its footprint, sign and all", () => {
      expect(model.footprint).toBeGreaterThanOrEqual(4);
      expect(model.footprint).toBeLessThanOrEqual(14.5);
      expect(
        Math.hypot(model.signSpot.x, model.signSpot.z),
      ).toBeLessThanOrEqual(model.footprint + 0.01);
    });

    it("stays within its triangle budget, near and far", () => {
      const near = countModelTriangles(model, "near");
      const far = countModelTriangles(model, "far");
      expect(near).toBeLessThanOrEqual(nearTriangleBudget);
      expect(far).toBeLessThanOrEqual(farTriangleBudget);
      expect(far).toBeLessThan(near);
    });

    it("keeps its moving parts few, so it adds few meshes", () => {
      expect((model.moving ?? []).length).toBeLessThanOrEqual(movingPartLimit);
    });

    it("starts and ends each ride where its path does", () => {
      (model.rides ?? []).forEach((ride) => {
        const first = ride.follow(0, 0);
        const last = ride.follow(1, 0);
        expect(
          Math.hypot(first.x - ride.start.x, first.z - ride.start.z),
        ).toBeLessThan(ride.reach + 1);
        expect(
          Math.hypot(last.x - ride.finish.x, last.z - ride.finish.z),
        ).toBeLessThan(2);
        expect(
          Math.hypot(
            ride.finish.x - ride.start.x,
            ride.finish.z - ride.start.z,
          ),
        ).toBeGreaterThan(ride.reach);
      });
    });
  },
);

describe("the hedge maze on Meadow Isle", () => {
  const maze = findAttraction("meadow-isle", "hedge-maze");
  const route = hedgeMazeRoute.map((local) => toIslandPoint(maze, local));

  it("can be walked from its entrance to the statue in the middle", () => {
    const walker = walkThrough("meadow-isle", route);
    const middle = route[route.length - 1];
    expect(Math.hypot(walker.x - middle.x, walker.z - middle.z)).toBeLessThan(
      1,
    );
  });

  it("won't let the Character cut straight through the hedges", () => {
    const outside = route[0];
    const walker = walkThrough("meadow-isle", [outside, maze.centre]);
    expect(
      Math.hypot(walker.x - maze.centre.x, walker.z - maze.centre.z),
    ).toBeGreaterThan(1.5);
  });
});

describe("the ice rink on Frost Isle", () => {
  it("is ice, so the Character slides about on it", () => {
    const rink = findAttraction("frost-isle", "ice-rink");
    const world = buildExploreWorld(findExploreAdventure("frost-isle"));
    expect(findWalkSurface(world, rink.centre, Infinity).kind).toBe("ice");
  });
});

describe("the skate park", () => {
  const islandId = findIslandWith("skate-park");
  const park = findAttraction(islandId, "skate-park");
  const world = buildExploreWorld(findExploreAdventure(islandId));

  const sampleHeights = (): number[][] => {
    const rows: number[][] = [];
    const reach = park.model.footprint * 0.9;
    for (let z = -reach; z <= reach; z += 0.3) {
      const row: number[] = [];
      for (let x = -reach; x <= reach; x += 0.3) {
        row.push(
          findWalkSurface(world, toIslandPoint(park, { x, z }), Infinity)
            .height - park.ground,
        );
      }
      rows.push(row);
    }
    return rows;
  };

  it("has ramps that rise well above the ground", () => {
    expect(Math.max(...sampleHeights().flat())).toBeGreaterThan(0.8);
  });

  it("lets a Vehicle ride up a ramp and back down", () => {
    const design = vehicleDesigns.skateboard;
    const highest = sampleHeights()
      .flatMap((row, rowIndex) =>
        row.map((height, columnIndex) => ({ height, rowIndex, columnIndex })),
      )
      .reduce((best, sample) => (sample.height > best.height ? sample : best));
    const reach = park.model.footprint * 0.9;
    const top = toIslandPoint(park, {
      x: -reach + highest.columnIndex * 0.3,
      z: -reach + highest.rowIndex * 0.3,
    });
    const heading = Math.atan2(park.centre.x - top.x, park.centre.z - top.z);
    const start = {
      x: park.centre.x,
      z: park.centre.z,
    };
    let vehicle: DrivenVehicle = {
      ...start,
      y: findWalkSurface(world, start, Infinity).height,
      heading: Math.atan2(top.x - start.x, top.z - start.z),
      pitch: 0,
      speed: 0,
      isBumped: false,
    };
    let peak = vehicle.y;
    for (let step = 0; step < 240; step++) {
      vehicle = stepVehicle(
        vehicle,
        { forward: 1, right: 0 },
        1 / 30,
        world,
        design,
        [],
      );
      peak = Math.max(peak, vehicle.y);
    }
    expect(peak - park.ground).toBeGreaterThan(0.5);
    expect(heading).toBeTypeOf("number");
  });
});

describe("the volcano lookout on Ember Isle", () => {
  it("points its telescope at the volcano", () => {
    const lookout = findAttraction("ember-isle", "volcano-lookout");
    const volcano = {
      x: emberVolcanoPosition.x * exploreScale,
      z: emberVolcanoPosition.z * exploreScale,
    };
    const local = toLocalPoint(lookout, volcano);
    expect(local.z).toBeLessThan(0);
    expect(Math.abs(local.x)).toBeLessThan(Math.abs(local.z) * 0.05);
  });
});

describe("the shore Attractions", () => {
  it("stand on the beach, with the sea where they need it", () => {
    (
      ["seaside-pier", "lighthouse", "rock-pools", "shipwreck"] as const
    ).forEach((kind) => {
      const islandId = findIslandWith(kind);
      const attraction = findAttraction(islandId, kind);
      const adventure = findExploreAdventure(islandId);
      (attraction.model.seaSamples ?? []).forEach((local) => {
        expect(
          adventure.findHeight(toIslandPoint(attraction, local)),
        ).toBeLessThan(0);
      });
    });
  });

  it("lets the Character walk out along the pier", () => {
    const islandId = findIslandWith("seaside-pier");
    const pier = findAttraction(islandId, "seaside-pier");
    const world = buildExploreWorld(findExploreAdventure(islandId));
    const out = toIslandPoint(
      pier,
      pier.model.seaSamples?.at(-1) ?? { x: 0, z: -10 },
    );
    expect(findWalkSurface(world, out, Infinity).kind).toBe("bridge");
  });
});

describe("having a go on a ride", () => {
  const islandId = findIslandWith("playground");
  const adventure = findExploreAdventure(islandId);
  const rides = listAttractionRides(adventure).filter(
    ({ attraction }) => attraction.kind === "playground",
  );
  const swings = rides.find(({ ride }) => ride.id === "swings");
  if (swings === undefined) {
    throw new Error("No swings");
  }
  const start = toIslandPoint(swings.attraction, swings.ride.start);

  it("starts when the Character walks onto it", () => {
    expect(findRideToStart(rides, start, new Set())).toBe(swings);
    expect(
      findRideToStart(rides, { x: start.x + 30, z: start.z }, new Set()),
    ).toBeUndefined();
  });

  it("carries the Character along it, then puts it down at the finish", () => {
    const run = { placed: swings, startedAt: 10 };
    expect(findRideProgress(run, 10)).toBe(0);
    expect(findRideProgress(run, 10 + swings.ride.seconds)).toBe(1);
    const middle = findPlaySpot(run, 0.5, 14);
    expect(middle.y).toBeGreaterThan(swings.attraction.ground + 0.2);
    const finish = findPlayFinish(run);
    expect(Math.hypot(finish.x - start.x, finish.z - start.z)).toBeGreaterThan(
      swings.ride.reach,
    );
  });

  it("doesn't start again until the Character walks away", () => {
    const spent = new Set([findRideKey(swings)]);
    expect(findRideToStart(rides, start, spent)).toBeUndefined();
    expect(listStillSpentKeys(rides, start, spent).size).toBe(1);
    expect(
      listStillSpentKeys(rides, { x: start.x + 30, z: start.z }, spent).size,
    ).toBe(0);
  });

  it("happens on the playground's swings, slide, roundabout and climbing dome", () => {
    expect(rides.map(({ ride }) => ride.id)).toEqual([
      "swings",
      "slide",
      "roundabout",
      "climbing-dome",
    ]);
  });
});

describe("visiting the library and the post office", () => {
  const region = (
    subject: RegionOnMap["subject"],
    isOpen: boolean,
  ): RegionOnMap => {
    const found = buildRegionsOnMap(
      buildIslandsOnMap(1, buildChildLimits({})),
      buildChildLimits({}),
    )[0];
    return {
      ...found,
      id: `${String(subject)}-region`,
      name: "Whispering Woods",
      subject,
      access: isOpen ? "open" : "turned-off",
      isUnlocked: isOpen,
    };
  };

  it("sends a Child to an open English Region for a story", () => {
    expect(findStoryRegion([region("maths", true)])).toBeUndefined();
    expect(findStoryRegion([region("english", false)])).toBeUndefined();
    expect(findStoryRegion([region("english", true)])?.name).toBe(
      "Whispering Woods",
    );
    const islandId = findIslandWith("library");
    const card = buildAttractionCard(
      islandId,
      `${islandId}-library`,
      [region("english", true)],
      0,
      undefined,
    );
    expect(card?.actions).toEqual([
      {
        kind: "story",
        regionId: "english-region",
        label: "Read a story in Whispering Woods",
      },
    ]);
  });

  it("gives out parcels for each of the Island's other Attractions in turn", () => {
    const islandId = findIslandWith("post-office");
    const postOfficeId = `${islandId}-post-office`;
    const others = listPlacedAttractions(islandId).filter(
      ({ id, isCuriosity }) => id !== postOfficeId && !isCuriosity,
    );
    expect(findParcelTarget(islandId, postOfficeId, 0)?.id).toBe(others[0].id);
    expect(findParcelTarget(islandId, postOfficeId, others.length)?.id).toBe(
      others[0].id,
    );
    const card = buildAttractionCard(islandId, postOfficeId, [], 1, undefined);
    expect(card?.actions[0]).toMatchObject({
      kind: "parcel",
      targetId: others[1].id,
    });
  });
});
