import type { BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import {
  rocketBodyRadius,
  rocketHatch,
  rocketLegReach,
  rocketStairRun,
} from "./island-flight.js";
import {
  buildJetskiGeometry,
  buildJetskiHandlebarGeometry,
  buildJetskiLiveryGeometry,
  buildJetskiSprayGeometry,
  jetskiHandlebar,
  jetskiSaddleFront,
  placeJetskiSpray,
} from "./island-jetski-design.js";
import {
  buildPirateShipGeometry,
  buildPirateShipLiveryGeometry,
  findPirateDeckHeight,
  findPirateHalfBeam,
  findPirateSheer,
  jollyRogerHoists,
  pirateEntryPort,
  pirateFlagHoists,
} from "./island-pirate-ship-design.js";
import {
  buildPortalGeometry,
  buildPortalGlowGeometry,
  buildPortalLiveryGeometry,
  placePortalGlow,
} from "./island-portal-design.js";
import {
  portalDaisHeight,
  portalRingCentre,
  portalRingRadius,
} from "./island-portal.js";
import {
  buildRocketFlameGeometry,
  buildRocketGeometry,
  buildRocketLiveryGeometry,
  buildRocketStairGeometry,
  placeRocketFlame,
  placeRocketStair,
  rocketEngineExit,
  rocketNoseTip,
} from "./island-rocket-design.js";
import { jetskiFootwell, jetskiRiderZ } from "./island-sea-craft.js";
import { shipBeam, shipDeckHeight } from "./island-voyage.js";

const listCorners = (geometry: BufferGeometry) => {
  const positions = geometry.getAttribute("position");
  return Array.from({ length: positions.count }, (_, index) => ({
    x: positions.getX(index),
    y: positions.getY(index),
    z: positions.getZ(index),
  }));
};

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const isEveryFacePainted = (geometry: BufferGeometry): boolean => {
  const colours = geometry.getAttribute("color");
  return Array.from({ length: colours.count }, (_, index) =>
    Math.max(colours.getX(index), colours.getY(index), colours.getZ(index)),
  ).every((brightest) => brightest > 0);
};

const findLowest = (geometry: BufferGeometry): number =>
  Math.min(...listCorners(geometry).map(({ y }) => y));

const findHighest = (geometry: BufferGeometry): number =>
  Math.max(...listCorners(geometry).map(({ y }) => y));

describe("the pirate ship", () => {
  const body = buildPirateShipGeometry();

  it("is detailed but stays within its share of the scene's triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(12_000);
    expect(countTriangles(body)).toBeLessThan(30_000);
  });

  it("has its waist deck where the Character stands and its side where the gangplank meets it", () => {
    const gangway = (pirateEntryPort.from + pirateEntryPort.to) / 2;
    expect(findPirateDeckHeight(gangway)).toBeCloseTo(shipDeckHeight);
    expect(findPirateHalfBeam(gangway)).toBeCloseTo(shipBeam / 2);
    expect(findPirateSheer(gangway)).toBeCloseTo(shipDeckHeight);
  });

  it("raises a forecastle at the bow and a quarterdeck and poop deck at the stern", () => {
    expect(findPirateDeckHeight(6.5)).toBeGreaterThan(shipDeckHeight + 0.8);
    expect(findPirateDeckHeight(-5)).toBeGreaterThan(shipDeckHeight + 0.8);
    expect(findPirateDeckHeight(-7.5)).toBeGreaterThan(
      findPirateDeckHeight(-5),
    );
    expect(findPirateSheer(0)).toBeGreaterThan(shipDeckHeight + 0.6);
  });

  it("leaves the boarding way clear, from the entry port in its bulwark to the open deck", () => {
    const inTheWay = listCorners(body).filter(
      ({ x, y, z }) =>
        Math.abs(x) < shipBeam / 2 - 0.4 &&
        y > shipDeckHeight + 0.1 &&
        y < shipDeckHeight + 1.65 &&
        z > pirateEntryPort.from &&
        z < pirateEntryPort.to,
    );
    expect(inTheWay).toStrictEqual([]);
  });

  it("flies the Jolly Roger from its mainmast and its stern, and Wizzaroo flags from its other masts", () => {
    expect(jollyRogerHoists).toHaveLength(2);
    expect(pirateFlagHoists).toHaveLength(2);
    const highestJollyRoger = Math.max(
      ...jollyRogerHoists.map(({ top }) => top[1]),
    );
    pirateFlagHoists.forEach(({ top }) => {
      expect(top[1]).toBeLessThan(highestJollyRoger);
    });
  });

  it("carries the Wizzaroo name on both sides of its hull and the crest on its mainsail and stern", () => {
    const decals = listCorners(buildPirateShipLiveryGeometry());
    expect(decals.some(({ x }) => x > shipBeam / 2 - 0.3)).toBe(true);
    expect(decals.some(({ x }) => x < -(shipBeam / 2 - 0.3))).toBe(true);
    expect(decals.some(({ y }) => y > 4.5)).toBe(true);
    expect(decals.some(({ z }) => z < -8.2)).toBe(true);
  });

  it("paints every face", () => {
    expect(isEveryFacePainted(body)).toBe(true);
  });
});

describe("the jetski", () => {
  const body = buildJetskiGeometry();

  it("is detailed but stays within its share of the scene's triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(3000);
    expect(countTriangles(body)).toBeLessThan(12_000);
  });

  it("floats with its hull just under the water and its handlebars at the Character's hands", () => {
    expect(findLowest(body)).toBeLessThan(0);
    expect(findLowest(body)).toBeGreaterThan(-0.4);
    expect(jetskiHandlebar.y - jetskiFootwell).toBeGreaterThan(0.6);
    expect(jetskiHandlebar.z).toBeGreaterThan(jetskiRiderZ);
    expect(findHighest(buildJetskiHandlebarGeometry())).toBeCloseTo(
      jetskiHandlebar.y + 0.11,
      1,
    );
  });

  it("leaves the footwell clear where the Character stands, between the saddle and the handlebars", () => {
    const inTheWay = listCorners(body).filter(
      ({ x, y, z }) =>
        Math.abs(x) < 0.25 &&
        y > jetskiFootwell + 0.05 &&
        y < jetskiFootwell + 1.4 &&
        Math.abs(z - jetskiRiderZ) < 0.2,
    );
    expect(inTheWay).toStrictEqual([]);
    expect(jetskiSaddleFront).toBeLessThan(jetskiRiderZ - 0.2);
  });

  it("carries the Wizzaroo name and crest on both sides", () => {
    const decals = listCorners(buildJetskiLiveryGeometry());
    expect(decals.some(({ x }) => x > 0.4)).toBe(true);
    expect(decals.some(({ x }) => x < -0.4)).toBe(true);
  });

  it("kicks up a rooster tail of spray only while under way", () => {
    const spray = buildJetskiSprayGeometry();
    const findReach = (amount: number) =>
      Math.min(
        ...listCorners(
          spray.clone().applyMatrix4(placeJetskiSpray(amount, 0)),
        ).map(({ z }) => z),
      );
    expect(findReach(1)).toBeLessThan(-4);
    expect(findReach(0)).toBeGreaterThan(-2.1);
  });

  it("paints every face", () => {
    expect(isEveryFacePainted(body)).toBe(true);
  });
});

describe("the rocket", () => {
  const body = buildRocketGeometry();

  it("is detailed but stays within its share of the scene's triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(5000);
    expect(countTriangles(body)).toBeLessThan(18_000);
  });

  it("stands on the feet of its fins on the Helipad, its engines clear of the ground", () => {
    expect(findLowest(body)).toBeGreaterThan(-0.05);
    expect(findLowest(body)).toBeLessThan(0.05);
    expect(rocketEngineExit).toBeGreaterThan(0.5);
    const feet = listCorners(body).filter(({ y }) => y < 0.2);
    feet.forEach(({ x, z }) => {
      expect(Math.hypot(x, z)).toBeGreaterThan(rocketLegReach - 0.6);
    });
    expect(findHighest(body)).toBeGreaterThan(rocketNoseTip);
  });

  it("folds its stair down from the hatch to the ground, and up against its side to fly", () => {
    const down = buildRocketStairGeometry().applyMatrix4(placeRocketStair(1));
    expect(findLowest(down)).toBeLessThan(0.05);
    const reach = Math.max(...listCorners(down).map(({ x }) => x));
    expect(reach).toBeGreaterThan(rocketBodyRadius + rocketStairRun - 0.2);
    const up = buildRocketStairGeometry().applyMatrix4(placeRocketStair(0));
    expect(findLowest(up)).toBeGreaterThan(rocketHatch.y - 0.6);
    expect(Math.max(...listCorners(up).map(({ x }) => x))).toBeLessThan(
      rocketBodyRadius + 1.2,
    );
  });

  it("carries the Wizzaroo name and crest round its body", () => {
    const decals = listCorners(buildRocketLiveryGeometry());
    expect(decals.some(({ z }) => z > rocketBodyRadius * 0.9)).toBe(true);
    expect(decals.some(({ z }) => z < -rocketBodyRadius * 0.9)).toBe(true);
    expect(decals.some(({ x }) => x < -rocketBodyRadius * 0.9)).toBe(true);
  });

  it("lights its engine flame only while it burns", () => {
    const flame = buildRocketFlameGeometry();
    const findBottom = (burn: number) =>
      Math.min(
        ...listCorners(
          flame.clone().applyMatrix4(placeRocketFlame(burn, 0)),
        ).map(({ y }) => y),
      );
    expect(findBottom(1)).toBeLessThan(rocketEngineExit - 3);
    expect(findBottom(0)).toBeGreaterThan(rocketEngineExit - 0.1);
  });

  it("paints every face", () => {
    expect(isEveryFacePainted(body)).toBe(true);
  });
});

describe("the portal", () => {
  const body = buildPortalGeometry();

  it("is detailed but stays within its share of the scene's triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(2000);
    expect(countTriangles(body)).toBeLessThan(10_000);
  });

  it("stands its ring on a dais, tall enough for the Character to walk through", () => {
    expect(findLowest(body)).toBeLessThan(0.01);
    const inTheWay = listCorners(body).filter(
      ({ x, y, z }) =>
        Math.abs(x) < 0.3 &&
        y > portalDaisHeight + 0.05 &&
        y < portalDaisHeight + 1.5 &&
        Math.abs(z) < 0.35,
    );
    expect(inTheWay).toStrictEqual([]);
    expect(portalRingCentre - portalRingRadius).toBeLessThan(
      portalDaisHeight + 0.7,
    );
    expect(portalRingCentre + portalRingRadius).toBeGreaterThan(
      portalDaisHeight + 1.8,
    );
  });

  it("carries the Wizzaroo crest on its keystone and the name at its foot", () => {
    const decals = listCorners(buildPortalLiveryGeometry());
    expect(
      decals.some(({ y }) => y > portalRingCentre + portalRingRadius),
    ).toBe(true);
    expect(decals.some(({ y }) => y < portalDaisHeight + 0.5)).toBe(true);
  });

  it("fills the ring with a swirl of light", () => {
    const glow = buildPortalGlowGeometry().applyMatrix4(placePortalGlow(1, 0));
    const corners = listCorners(glow);
    expect(Math.max(...corners.map(({ y }) => y))).toBeLessThan(
      portalRingCentre + portalRingRadius,
    );
    expect(Math.min(...corners.map(({ y }) => y))).toBeGreaterThan(
      portalRingCentre - portalRingRadius,
    );
  });

  it("paints every face", () => {
    expect(isEveryFacePainted(body)).toBe(true);
    expect(isEveryFacePainted(buildPortalGlowGeometry())).toBe(true);
  });
});
