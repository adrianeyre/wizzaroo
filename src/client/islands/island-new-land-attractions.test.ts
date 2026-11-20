import { describe, expect, it } from "vitest";
import {
  exploreScale,
  findExploreAdventure,
  findWalkSurface,
} from "./island-adventures.js";
import {
  AttractionBuilder,
  addGroundPad,
  attractionKinds,
  countMotionCopies,
  findMotionPose,
  isReactingMotion,
  type AttractionDetail,
} from "./attractions/attraction-kit.js";
import { curiosityKinds } from "./curiosities/curiosity-kit.js";
import { buildAttractionCard } from "./island-attraction-visits.js";
import {
  listAttractionBlockers,
  listAttractionInteractions,
  listAttractionRides,
  listPlacedAttractions,
  toIslandPoint,
  type PlacedAttraction,
} from "./island-attractions.js";
import {
  checkNewLandAttractionSite,
  findNewLandAttractionSites,
  findNewLandSide,
  listIslandNewLandAttractionKinds,
  newLandAttractionGap,
  newLandCuriosityGap,
} from "./island-new-land-attraction-placing.js";
import { newLandAttractionSites } from "./island-new-land-attraction-sites.js";
import { buildExploreWorld } from "./island-transport.js";
import { wonderFootprints } from "./island-wonders.js";
import {
  newLandAttractionFarTriangles,
  newLandAttractionIslandIds,
  newLandAttractionKinds,
  newLandAttractionKindsByIsland,
  newLandAttractionLargestFootprint,
  newLandAttractionMovingCopyLimit,
  newLandAttractionMovingPartLimit,
  newLandAttractionNearTriangles,
  newLandAttractionSmallestFootprint,
  type NewLandAttractionModel,
} from "./new-land-attractions/new-land-attraction-kit.js";
import { newLandAttractionModels } from "./new-land-attractions/new-land-attraction-models.js";
import { findNewLandShare, newLandFarReaches } from "../world-map-terrain.js";

type PlacedNewLandAttraction = Extract<
  PlacedAttraction,
  { family: "new-land-attraction" }
>;

/** As detailed as the first thirty Attractions: none is a quick sketch. */
const fewestNearTriangles = 5_000;

const countTriangles = (geometry: {
  getAttribute: (name: string) => { count: number };
}) => geometry.getAttribute("position").count / 3;

const measure = (
  build: (builder: AttractionBuilder) => void,
  detail: AttractionDetail,
  copies = 1,
): number => {
  const builder = new AttractionBuilder(detail);
  build(builder);
  const geometry = builder.build();
  const triangles = countTriangles(geometry) * copies;
  geometry.dispose();
  return triangles;
};

/** Everything drawn at a detail: the model, its moving parts and wanderers. */
const countModelTriangles = (
  model: NewLandAttractionModel,
  detail: AttractionDetail,
): number =>
  measure((builder) => {
    if (model.hasGroundPad !== false) {
      addGroundPad(builder, model.footprint);
    }
    model.build(builder);
  }, detail) +
  (model.moving ?? []).reduce(
    (sum, part) =>
      sum + measure(part.build, detail, countMotionCopies(part.motion)),
    0,
  ) +
  (model.wanderers ?? []).reduce(
    (sum, wanderers) => sum + measure(wanderers.build, detail, wanderers.count),
    0,
  );

describe("the new lands' Attractions", () => {
  it("gives every Island fifteen of its own", () => {
    newLandAttractionIslandIds.forEach((islandId) => {
      expect(newLandAttractionKindsByIsland[islandId], islandId).toHaveLength(
        15,
      );
    });
    expect(newLandAttractionKinds).toHaveLength(90);
  });

  it("are all different, from each other, the first Attractions, the Curiosities and the Wonders", () => {
    expect(new Set(newLandAttractionKinds).size).toBe(
      newLandAttractionKinds.length,
    );
    const others = new Set<string>([
      ...attractionKinds,
      ...curiosityKinds,
      ...Object.keys(wonderFootprints),
    ]);
    newLandAttractionKinds.forEach((kind) => {
      expect(others.has(kind), kind).toBe(false);
    });
    const names = newLandAttractionKinds.map(
      (kind) => newLandAttractionModels[kind].name,
    );
    expect(new Set(names).size).toBe(names.length);
  });
});

describe.each(newLandAttractionKinds.map((kind) => [kind] as const))(
  "the %s",
  (kind) => {
    const model = newLandAttractionModels[kind];

    it("says what it is and teaches something from the National Curriculum", () => {
      expect(model.kind).toBe(kind);
      expect(newLandAttractionKindsByIsland[model.islandId]).toContain(kind);
      expect(model.name.length).toBeGreaterThan(2);
      expect(model.fact.length).toBeGreaterThan(80);
      expect(model.fact).not.toMatch(/placeholder/i);
      expect(model.curriculumLink).toMatch(
        /^[A-Z][A-Za-z ]+, (Year [1-6]|Key Stage [12]|Years? [1-6]( and [1-6])?)/,
      );
      expect(model.setting).toBe("inland");
    });

    it("is fun to explore: it reacts to the Character, has a go, a deck or a tune, and a button on its card", () => {
      expect(
        (model.moving ?? []).some(({ motion }) => isReactingMotion(motion)),
      ).toBe(true);
      expect(
        (model.rides ?? []).length +
          (model.decks ?? []).length +
          (model.tune ?? []).length,
      ).toBeGreaterThan(0);
      expect(model.play.label.length).toBeGreaterThan(3);
      expect(model.play.label.length).toBeLessThanOrEqual(32);
      expect(model.play.news.length).toBeGreaterThan(20);
    });

    it("fits inside its footprint, sign and all", () => {
      expect(model.footprint).toBeGreaterThanOrEqual(
        newLandAttractionSmallestFootprint,
      );
      expect(model.footprint).toBeLessThanOrEqual(
        newLandAttractionLargestFootprint,
      );
      expect(
        Math.hypot(model.signSpot.x, model.signSpot.z),
      ).toBeLessThanOrEqual(model.footprint + 0.01);
    });

    it("is drawn in as much detail as the first Attractions, within their budget near and far", () => {
      const near = countModelTriangles(model, "near");
      const far = countModelTriangles(model, "far");
      expect(near).toBeGreaterThanOrEqual(fewestNearTriangles);
      expect(near).toBeLessThanOrEqual(newLandAttractionNearTriangles);
      expect(far).toBeLessThanOrEqual(newLandAttractionFarTriangles);
      expect(far).toBeLessThan(near);
    });

    it("keeps its moving parts within the first Attractions' limits", () => {
      const moving = model.moving ?? [];
      expect(moving.length).toBeLessThanOrEqual(
        newLandAttractionMovingPartLimit,
      );
      expect(
        moving.reduce((sum, part) => sum + countMotionCopies(part.motion), 0),
      ).toBeLessThanOrEqual(newLandAttractionMovingCopyLimit);
      expect((model.wanderers ?? []).length).toBeLessThanOrEqual(2);
      expect((model.smoke ?? []).length).toBeLessThanOrEqual(2);
    });

    it("keeps its moving parts' motions finite at every moment", () => {
      (model.moving ?? []).forEach((part) => {
        [0, 0.5, 1].forEach((nearness) => {
          const pose = findMotionPose(part.motion, 12.3, {
            nearness,
            spun: 4,
          });
          [...pose.position, ...pose.rotation, ...pose.scale].forEach(
            (value) => {
              expect(Number.isFinite(value), part.name).toBe(true);
            },
          );
        });
      });
    });

    it("starts and ends each ride where its path does, inside its footprint", () => {
      (model.rides ?? []).forEach((ride) => {
        const first = ride.follow(0, 0);
        const last = ride.follow(1, 0);
        expect(
          Math.hypot(first.x - ride.start.x, first.z - ride.start.z),
          ride.id,
        ).toBeLessThan(ride.reach + 1);
        expect(
          Math.hypot(last.x - ride.finish.x, last.z - ride.finish.z),
          ride.id,
        ).toBeLessThan(2);
        expect(
          Math.hypot(
            ride.finish.x - ride.start.x,
            ride.finish.z - ride.start.z,
          ),
          ride.id,
        ).toBeGreaterThan(ride.reach);
        [ride.start, ride.finish].forEach((point) => {
          expect(Math.hypot(point.x, point.z), ride.id).toBeLessThanOrEqual(
            model.footprint + 1,
          );
        });
        [0.25, 0.5, 0.75].forEach((progress) => {
          const spot = ride.follow(progress, 3.7);
          [spot.x, spot.y, spot.z, spot.heading].forEach((value) => {
            expect(Number.isFinite(value), ride.id).toBe(true);
          });
        });
      });
    });

    it("keeps each ride's start and finish outside its own blockers", () => {
      (model.rides ?? []).forEach((ride) => {
        [ride.start, ride.finish].forEach((point) => {
          (model.blockers ?? []).forEach(({ x, z, radius }) => {
            expect(
              Math.hypot(point.x - x, point.z - z),
              ride.id,
            ).toBeGreaterThanOrEqual(radius - 0.01);
          });
        });
      });
    });
  },
);

describe.each(
  newLandAttractionIslandIds.map((islandId) => [islandId] as const),
)("the new lands' Attractions on %s", (islandId) => {
  const adventure = findExploreAdventure(islandId);
  const sites = newLandAttractionSites[islandId] ?? [];
  const placed = listPlacedAttractions(islandId).filter(
    (attraction): attraction is PlacedNewLandAttraction =>
      attraction.family === "new-land-attraction",
  );

  it("keeps a site for every one of the Island's fifteen", () => {
    expect(sites.map(({ kind }) => kind).toSorted()).toEqual(
      [...listIslandNewLandAttractionKinds(islandId)].toSorted(),
    );
  });

  it("keeps sites that still fit, clear of everything and on level ground", () => {
    sites.forEach((site) => {
      const others = sites.filter((other) => other !== site);
      expect(
        checkNewLandAttractionSite(adventure, site, others),
      ).toBeUndefined();
    });
  });

  it("keeps the sites the placer finds today", () => {
    const found = findNewLandAttractionSites(adventure);
    expect(found.map(({ kind }) => kind)).toEqual(
      sites.map(({ kind }) => kind),
    );
    found.forEach(({ kind, centre }, index) => {
      const kept = sites[index].centre;
      expect(
        Math.hypot(centre.x - kept.x, centre.z - kept.z),
        kind,
      ).toBeLessThan(0.02);
    });
  }, 120_000);

  it("stands them on the new lands, seven or eight on each, out on their far reaches", () => {
    const west = placed.filter(({ centre }) => centre.x < 0);
    const east = placed.filter(({ centre }) => centre.x > 0);
    expect(west).toHaveLength(8);
    expect(east).toHaveLength(7);
    placed.forEach((attraction) => {
      expect(Math.sign(attraction.centre.x), attraction.kind).toBe(
        findNewLandSide(islandId, attraction.kind),
      );
      expect(
        findNewLandShare(
          {
            x: attraction.centre.x / exploreScale,
            z: attraction.centre.z / exploreScale,
          },
          newLandFarReaches,
        ),
        attraction.kind,
      ).toBeGreaterThan(0);
    });
  });

  it("keeps each one clear of the first Attractions and the Curiosities", () => {
    const others = listPlacedAttractions(islandId).filter(
      ({ family }) => family !== "new-land-attraction",
    );
    placed.forEach((attraction) => {
      others.forEach((other) => {
        const gap =
          other.family === "curiosity"
            ? newLandCuriosityGap
            : newLandAttractionGap;
        expect(
          Math.hypot(
            attraction.centre.x - other.centre.x,
            attraction.centre.z - other.centre.z,
          ),
          `${attraction.kind} and ${other.kind}`,
        ).toBeGreaterThan(
          attraction.model.footprint + other.model.footprint + gap - 0.01,
        );
      });
    });
  });

  it("lets the Character walk up to each one's sign", () => {
    const world = buildExploreWorld(adventure);
    listAttractionInteractions(adventure)
      .filter(({ id }) => placed.some((attraction) => attraction.id === id))
      .forEach(({ position, name }) => {
        const surface = findWalkSurface(world, position, Infinity);
        expect(["ground", "trail", "bridge"], name).toContain(surface.kind);
      });
  });

  it("keeps each ride's start and finish open, outside every blocker", () => {
    const blockers = listAttractionBlockers(adventure);
    listAttractionRides(adventure)
      .filter(({ attraction }) => attraction.family === "new-land-attraction")
      .forEach(({ attraction, ride }) => {
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

  it("offers each one's button on its card", () => {
    placed.forEach((attraction) => {
      const card = buildAttractionCard(
        islandId,
        attraction.id,
        [],
        0,
        undefined,
      );
      expect(card?.title).toBe(`The ${attraction.model.name}`);
      expect(card?.text).toBe(attraction.model.fact);
      expect(card?.actions).toEqual([
        {
          kind: "play",
          label: attraction.model.play.label,
          news: attraction.model.play.news,
          tune: attraction.model.play.tune,
        },
      ]);
    });
  });
});
