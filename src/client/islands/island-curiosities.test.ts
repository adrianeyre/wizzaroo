import { describe, expect, it } from "vitest";
import {
  AttractionBuilder,
  addGroundPad,
  countMotionCopies,
  findMotionPose,
  isReactingMotion,
  type AttractionDetail,
} from "./attractions/attraction-kit.js";
import {
  curiosityFarTriangles,
  curiosityIslandIds,
  curiosityKinds,
  curiosityKindsByIsland,
  curiosityLargestFootprint,
  curiosityMovingCopyLimit,
  curiosityMovingPartLimit,
  curiosityNearTriangles,
  curiositySmallestFootprint,
  type CuriosityModel,
} from "./curiosities/curiosity-kit.js";
import { curiosityModels } from "./curiosities/curiosity-models.js";
import { attractionKinds } from "./attractions/attraction-kit.js";
import { findExploreAdventure, findWalkSurface } from "./island-adventures.js";
import { buildAttractionCard } from "./island-attraction-visits.js";
import {
  curiosityAttractionGap,
  checkCuriositySite,
  findCuriositySites,
  listIslandCuriosityKinds,
} from "./island-curiosity-placing.js";
import { curiositySites } from "./island-curiosity-sites.js";
import {
  findAttractionDetail,
  curiosityFarReach,
  curiosityNearReach,
} from "./island-attractions-models.js";
import {
  listAttractionBlockers,
  listAttractionInteractions,
  listAttractionRides,
  listPlacedAttractions,
  toIslandPoint,
  type PlacedAttraction,
} from "./island-attractions.js";
import { buildExploreWorld } from "./island-transport.js";
import { wonderFootprints } from "./island-wonders.js";

type PlacedCuriosity = Extract<PlacedAttraction, { isCuriosity: true }>;

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

const countStillTriangles = (
  model: CuriosityModel,
  detail: AttractionDetail,
): number =>
  measure((builder) => {
    if (model.hasGroundPad !== false) {
      addGroundPad(builder, model.footprint);
    }
    model.build(builder);
  }, detail);

/** Everything drawn up close: the model, its moving parts and wanderers. */
const countNearTriangles = (model: CuriosityModel): number =>
  countStillTriangles(model, "near") +
  (model.moving ?? []).reduce(
    (sum, part) =>
      sum + measure(part.build, "near", countMotionCopies(part.motion)),
    0,
  ) +
  (model.wanderers ?? []).reduce(
    (sum, wanderers) => sum + measure(wanderers.build, "near", wanderers.count),
    0,
  );

const isInteractive = (model: CuriosityModel): boolean =>
  (model.rides ?? []).length > 0 ||
  (model.tune ?? []).length > 0 ||
  (model.decks ?? []).length > 0 ||
  (model.moving ?? []).some(({ motion }) => isReactingMotion(motion));

describe("the Curiosities", () => {
  it("gives every Island twenty of its own", () => {
    curiosityIslandIds.forEach((islandId) => {
      expect(curiosityKindsByIsland[islandId], islandId).toHaveLength(20);
    });
    expect(curiosityKinds).toHaveLength(120);
  });

  it("are all different, from each other, the Attractions and the Wonders (but for the owner's windmill)", () => {
    expect(new Set(curiosityKinds).size).toBe(curiosityKinds.length);
    const attractions = new Set<string>(attractionKinds);
    curiosityKinds.forEach((kind) => {
      expect(attractions.has(kind), kind).toBe(false);
    });
    const wonders = new Set(Object.keys(wonderFootprints));
    curiosityKinds
      .filter((kind) => kind !== "windmill")
      .forEach((kind) => {
        expect(wonders.has(kind), kind).toBe(false);
      });
    const names = curiosityKinds.map((kind) => curiosityModels[kind].name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("include the windmill and the water mill on Meadow Isle, as the owner asked", () => {
    expect(listIslandCuriosityKinds("meadow-isle")).toEqual(
      expect.arrayContaining(["windmill", "water-mill"]),
    );
  });

  it("are drawn in full only up close, and not at all a long way off", () => {
    expect(findAttractionDetail(curiosityNearReach, true)).toBe("near");
    expect(findAttractionDetail(curiosityNearReach + 1, true)).toBe("far");
    expect(findAttractionDetail(curiosityFarReach + 1, true)).toBe("hidden");
    expect(findAttractionDetail(curiosityFarReach + 1)).toBe("far");
  });
});

describe.each(curiosityKinds.map((kind) => [kind] as const))(
  "the %s Curiosity",
  (kind) => {
    const model = curiosityModels[kind];

    it("says what it is and teaches something from the National Curriculum", () => {
      expect(model.kind).toBe(kind);
      expect(curiosityKindsByIsland[model.islandId]).toContain(kind);
      expect(model.name.length).toBeGreaterThan(2);
      expect(model.fact.length).toBeGreaterThan(80);
      expect(model.curriculumLink).toMatch(
        /^[A-Z][A-Za-z ]+, (Year [1-6]|Key Stage [12]|Years? [1-6]( and [1-6])?)/,
      );
    });

    it("has something to play with, as well as a button on its card", () => {
      expect(isInteractive(model)).toBe(true);
      expect(model.play.label.length).toBeGreaterThan(3);
      expect(model.play.label.length).toBeLessThanOrEqual(32);
      expect(model.play.news.length).toBeGreaterThan(20);
    });

    it("fits inside its footprint, sign and all", () => {
      expect(model.footprint).toBeGreaterThanOrEqual(
        curiositySmallestFootprint,
      );
      expect(model.footprint).toBeLessThanOrEqual(curiosityLargestFootprint);
      expect(
        Math.hypot(model.signSpot.x, model.signSpot.z),
      ).toBeLessThanOrEqual(model.footprint + 0.01);
    });

    it("stays within its triangle budget, near and far", () => {
      const near = countNearTriangles(model);
      const far = countStillTriangles(model, "far");
      expect(near).toBeLessThanOrEqual(curiosityNearTriangles);
      expect(far).toBeLessThanOrEqual(curiosityFarTriangles);
      expect(far).toBeLessThan(near);
    });

    it("keeps its moving parts few, so it adds few meshes", () => {
      const moving = model.moving ?? [];
      expect(moving.length).toBeLessThanOrEqual(curiosityMovingPartLimit);
      expect(
        moving.reduce((sum, part) => sum + countMotionCopies(part.motion), 0),
      ).toBeLessThanOrEqual(curiosityMovingCopyLimit);
      expect((model.wanderers ?? []).length).toBeLessThanOrEqual(2);
      expect((model.smoke ?? []).length).toBeLessThanOrEqual(1);
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

describe.each(curiosityIslandIds.map((islandId) => [islandId] as const))(
  "the Curiosities on %s",
  (islandId) => {
    const adventure = findExploreAdventure(islandId);
    const sites = curiositySites[islandId] ?? [];
    const placed = listPlacedAttractions(islandId).filter(
      (attraction): attraction is PlacedCuriosity => attraction.isCuriosity,
    );

    it("keeps a site for every one of the Island's Curiosities", () => {
      expect(sites.map(({ kind }) => kind).toSorted()).toEqual(
        [...listIslandCuriosityKinds(islandId)].toSorted(),
      );
    });

    it("keeps sites that still fit, clear of everything and on level ground", () => {
      sites.forEach((site) => {
        const others = sites.filter((other) => other !== site);
        expect(checkCuriositySite(adventure, site, others)).toBeUndefined();
      });
    });

    it("keeps the sites the placer finds today", () => {
      const found = findCuriositySites(adventure);
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
    }, 60_000);

    it("spreads them out over the whole Island, on its old lands and its new", () => {
      const xs = placed.map(({ centre }) => centre.x);
      expect(Math.min(...xs)).toBeLessThan(-200);
      expect(Math.max(...xs)).toBeGreaterThan(200);
      expect(xs.filter((x) => Math.abs(x) < 210).length).toBeGreaterThan(3);
    });

    it("keeps each one well away from the Attractions, so only one is drawn in full at a time", () => {
      // The first thirty; the new lands' own keep their own gap (ADR 0068).
      const attractions = listPlacedAttractions(islandId).filter(
        ({ family }) => family === "attraction",
      );
      placed.forEach((curiosity) => {
        attractions.forEach((attraction) => {
          expect(
            Math.hypot(
              curiosity.centre.x - attraction.centre.x,
              curiosity.centre.z - attraction.centre.z,
            ),
            `${curiosity.kind} and ${attraction.kind}`,
          ).toBeGreaterThan(
            curiosity.model.footprint +
              attraction.model.footprint +
              curiosityAttractionGap -
              0.01,
          );
        });
      });
    });

    it("lets the Character walk up to each one's sign", () => {
      const world = buildExploreWorld(adventure);
      listAttractionInteractions(adventure)
        .filter(({ id }) => placed.some((curiosity) => curiosity.id === id))
        .forEach(({ position, name }) => {
          const surface = findWalkSurface(world, position, Infinity);
          expect(["ground", "trail", "bridge"], name).toContain(surface.kind);
        });
    });

    it("keeps each ride's start and finish open, outside every blocker", () => {
      const blockers = listAttractionBlockers(adventure);
      listAttractionRides(adventure)
        .filter(({ attraction }) => attraction.isCuriosity)
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

    it("offers each one's button on its card, with no parcels for it", () => {
      placed.forEach((curiosity) => {
        const card = buildAttractionCard(
          islandId,
          curiosity.id,
          [],
          0,
          undefined,
        );
        expect(card?.title).toBe(`The ${curiosity.model.name}`);
        expect(card?.actions).toEqual([
          {
            kind: "play",
            label: curiosity.model.play.label,
            news: curiosity.model.play.news,
            tune: curiosity.model.play.tune,
          },
        ]);
      });
    });
  },
);
