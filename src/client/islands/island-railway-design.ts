import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Matrix4,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import type { IslandAdventure } from "./island-adventures.js";
import { findLandColour } from "./island-ground-colour.js";
import {
  findRailHeading,
  findRailPoint,
  findRightOf,
  findStationPlatformSpot,
  platformHalfWidth,
  platformLength,
  railHalfGauge,
  railSampleSpacing,
  railTopLift,
  tunnelPortalSetback,
  wrapDistance,
  type RailBridge,
  type RailBridgeStyle,
  type Railway,
  type Station,
} from "./island-railway.js";
import { mapTrainScale } from "./island-train-design.js";
import { findStationBuildingSpot } from "./island-transport.js";

export interface RailwayLook {
  ballast: string;
  sleeper: string;
  rail: string;
  stone: string;
  steel: string;
  timber: string;
  cable: string;
  roof: string;
  wall: string;
  sign: string;
}

export const railwayLooks: Readonly<Record<string, RailwayLook>> = {
  "meadow-isle": {
    ballast: "#8d8578",
    sleeper: "#6b4a2f",
    rail: "#9aa3ad",
    stone: "#b9ab92",
    steel: "#7f1d1d",
    timber: "#8b6440",
    cable: "#334155",
    roof: "#b45309",
    wall: "#f5e6c8",
    sign: "#166534",
  },
  "frost-isle": {
    ballast: "#a6adb5",
    sleeper: "#5b4636",
    rail: "#cbd5e1",
    stone: "#c7d2dc",
    steel: "#1d4ed8",
    timber: "#7c5a3c",
    cable: "#1e293b",
    roof: "#b91c1c",
    wall: "#f1f5f9",
    sign: "#0369a1",
  },
  "sunscorch-sands": {
    ballast: "#b08d62",
    sleeper: "#5c3d24",
    rail: "#a8a29e",
    stone: "#d6b98a",
    steel: "#9a3412",
    timber: "#a16207",
    cable: "#44403c",
    roof: "#c2410c",
    wall: "#fde7c0",
    sign: "#b45309",
  },
  "jungle-reach": {
    ballast: "#7c7466",
    sleeper: "#4a3424",
    rail: "#9ca3af",
    stone: "#9c9a7c",
    steel: "#047857",
    timber: "#78552e",
    cable: "#3f3f46",
    roof: "#15803d",
    wall: "#ecfccb",
    sign: "#0f766e",
  },
  "ember-isle": {
    ballast: "#4b4342",
    sleeper: "#2b2220",
    rail: "#a1a1aa",
    stone: "#5b5250",
    steel: "#27272a",
    timber: "#57391f",
    cable: "#ea580c",
    roof: "#7c2d12",
    wall: "#e7d4c4",
    sign: "#c2410c",
  },
  "starfall-isle": {
    ballast: "#6b6f86",
    sleeper: "#3f3b5c",
    rail: "#e2e8f0",
    stone: "#c4c6dc",
    steel: "#6d28d9",
    timber: "#6b5a7a",
    cable: "#22d3ee",
    roof: "#4c1d95",
    wall: "#f5f3ff",
    sign: "#7c3aed",
  },
};

const ballastTopLift = 0.18;
const ballastTopHalfWidth = 1.05;
const ballastFootHalfWidth = 1.9;
const ballastFootDrop = 1.6;
const sleeperTopLift = 0.25;
const sleeperHalfLength = 0.85;
const sleeperHalfWidth = 0.14;
const railHalfWidth = 0.05;
const deckHalfWidth = 1.35;
const deckThickness = 0.7;
const seaFloorReach = -6;

export const findRailwayLook = (islandId: string): RailwayLook =>
  railwayLooks[islandId] ?? railwayLooks["meadow-isle"];

const shadeFor = (normalY: number): number =>
  0.72 + 0.28 * (normalY * 0.5 + 0.5);

export const buildPaintedTriangles = (
  triangles: readonly PaintedTriangle[],
): BufferGeometry => {
  const positions = new Float32Array(triangles.length * 9);
  const colours = new Float32Array(triangles.length * 9);
  const edgeOne = new Vector3();
  const edgeTwo = new Vector3();
  triangles.forEach(({ corners, colour }, triangle) => {
    edgeOne.set(
      corners[1][0] - corners[0][0],
      corners[1][1] - corners[0][1],
      corners[1][2] - corners[0][2],
    );
    edgeTwo.set(
      corners[2][0] - corners[0][0],
      corners[2][1] - corners[0][1],
      corners[2][2] - corners[0][2],
    );
    const upness = edgeOne.cross(edgeTwo).normalize().y;
    const shaded = colour.clone().multiplyScalar(shadeFor(upness));
    corners.forEach((corner, cornerIndex) => {
      positions.set(corner, triangle * 9 + cornerIndex * 3);
      shaded.toArray(colours, triangle * 9 + cornerIndex * 3);
    });
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
};

export interface PaintedQuad {
  corners: [Triple, Triple, Triple, Triple];
  colour: Color;
}

export interface PaintedTriangle {
  corners: [Triple, Triple, Triple];
  colour: Color;
}

export const splitQuads = (quads: readonly PaintedQuad[]): PaintedTriangle[] =>
  quads.flatMap(
    ({
      corners: [first, second, third, fourth],
      colour,
    }): PaintedTriangle[] => [
      { corners: [first, second, third], colour },
      { corners: [first, third, fourth], colour },
    ],
  );

const findCrossPoint = (
  railway: Railway,
  index: number,
  across: number,
  lift: number,
): Triple => {
  const point = railway.points[index];
  const heading = findRailHeading(railway, point.distance);
  const right = findRightOf(heading);
  return [
    point.x + right.x * across,
    point.y + lift,
    point.z + right.z * across,
  ];
};

const mapTrackStep = 2;
const mapBallastHalfWidth = 2.4;
const mapRailHalfWidth = 1.1;

export const buildMapTrackGeometry = (
  railway: Railway,
  look: RailwayLook,
): BufferGeometry => {
  const ballast = new Color(look.ballast);
  const rail = new Color(look.sleeper).lerp(new Color(look.rail), 0.35);
  const count = railway.points.length;
  const quads: PaintedQuad[] = [];
  for (let index = 0; index < count; index += mapTrackStep) {
    const next = (index + mapTrackStep) % count;
    if (railway.points[index].isInTunnel && railway.points[next].isInTunnel) {
      continue;
    }
    const strip = (halfWidth: number, lift: number, colour: Color) => {
      quads.push({
        corners: [
          findCrossPoint(railway, index, -halfWidth, lift),
          findCrossPoint(railway, next, -halfWidth, lift),
          findCrossPoint(railway, next, halfWidth, lift),
          findCrossPoint(railway, index, halfWidth, lift),
        ],
        colour,
      });
    };
    strip(mapBallastHalfWidth, ballastTopLift + 0.1, ballast);
    strip(mapRailHalfWidth, railTopLift + 0.1, rail);
  }
  return buildPaintedTriangles(splitQuads(quads));
};

export const buildTrackGeometry = (
  railway: Railway,
  look: RailwayLook,
): BufferGeometry => {
  const ballast = new Color(look.ballast);
  const ballastSide = new Color(look.ballast).multiplyScalar(0.85);
  const sleeper = new Color(look.sleeper);
  const rail = new Color(look.rail);
  const count = railway.points.length;
  const quads: PaintedQuad[] = [];
  railway.points.forEach((point, index) => {
    const next = (index + 1) % count;
    const nextPoint = railway.points[next];
    if (point.isInTunnel && nextPoint.isInTunnel) {
      return;
    }
    const strip = (
      fromAcross: number,
      fromLift: number,
      toAcross: number,
      toLift: number,
      colour: Color,
    ) => {
      quads.push({
        corners: [
          findCrossPoint(railway, index, fromAcross, fromLift),
          findCrossPoint(railway, next, fromAcross, fromLift),
          findCrossPoint(railway, next, toAcross, toLift),
          findCrossPoint(railway, index, toAcross, toLift),
        ],
        colour,
      });
    };
    if (!point.isOnBridge) {
      strip(
        -ballastTopHalfWidth,
        ballastTopLift,
        ballastTopHalfWidth,
        ballastTopLift,
        ballast,
      );
      strip(
        ballastTopHalfWidth,
        ballastTopLift,
        ballastFootHalfWidth,
        ballastTopLift - ballastFootDrop,
        ballastSide,
      );
      strip(
        -ballastFootHalfWidth,
        ballastTopLift - ballastFootDrop,
        -ballastTopHalfWidth,
        ballastTopLift,
        ballastSide,
      );
    }
    [-railHalfGauge, railHalfGauge].forEach((gauge) => {
      strip(
        gauge - railHalfWidth,
        railTopLift,
        gauge + railHalfWidth,
        railTopLift,
        rail,
      );
      strip(
        gauge + railHalfWidth,
        railTopLift,
        gauge + railHalfWidth,
        sleeperTopLift,
        rail,
      );
    });
    const heading = findRailHeading(railway, point.distance);
    const right = findRightOf(heading);
    const forward = { x: Math.sin(heading), z: Math.cos(heading) };
    const corner = (across: number, along: number): Triple => [
      point.x + right.x * across + forward.x * along,
      point.y + sleeperTopLift,
      point.z + right.z * across + forward.z * along,
    ];
    quads.push({
      corners: [
        corner(-sleeperHalfLength, -sleeperHalfWidth),
        corner(-sleeperHalfLength, sleeperHalfWidth),
        corner(sleeperHalfLength, sleeperHalfWidth),
        corner(sleeperHalfLength, -sleeperHalfWidth),
      ],
      colour: sleeper,
    });
  });
  return buildPaintedTriangles(splitQuads(quads));
};

const orient = (geometry: BufferGeometry, from: Triple, to: Triple) => {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const forward = end.clone().sub(start);
  const length = forward.length();
  forward.normalize();
  const worldUp =
    Math.abs(forward.y) > 0.98 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(worldUp, forward).normalize();
  const up = new Vector3().crossVectors(forward, right).normalize();
  const middle = start.add(end).multiplyScalar(0.5);
  geometry.applyMatrix4(
    new Matrix4().makeBasis(right, up, forward).setPosition(middle),
  );
  return length;
};

export const buildBeam = (
  from: Triple,
  to: Triple,
  width: number,
  depth: number,
  colour: string,
): ModelPart => {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const geometry = new BoxGeometry(width, depth, Math.max(0.01, length));
  orient(geometry, from, to);
  return { geometry, colour };
};

const buildPost = (
  foot: Triple,
  top: number,
  radius: number,
  colour: string,
): ModelPart => {
  const height = Math.max(0.05, top - foot[1]);
  return {
    geometry: new CylinderGeometry(radius * 0.85, radius, height, 6),
    colour,
    position: [foot[0], foot[1] + height / 2, foot[2]],
  };
};

interface DeckSpot {
  x: number;
  y: number;
  z: number;
  heading: number;
  ground: number;
}

const findDeckSpot = (railway: Railway, distance: number): DeckSpot => {
  const point = findRailPoint(railway, distance);
  const index =
    Math.round(wrapDistance(railway, distance) / railSampleSpacing) %
    railway.points.length;
  return {
    ...point,
    heading: findRailHeading(railway, distance),
    ground: Math.max(seaFloorReach, railway.points[index].ground),
  };
};

const sideOf = (spot: DeckSpot, across: number, lift: number): Triple => {
  const right = findRightOf(spot.heading);
  return [spot.x + right.x * across, spot.y + lift, spot.z + right.z * across];
};

const listSpots = (
  railway: Railway,
  bridge: RailBridge,
  spacing: number,
): DeckSpot[] => {
  const length = bridge.toDistance - bridge.fromDistance;
  const count = Math.max(1, Math.round(length / spacing));
  return Array.from({ length: count + 1 }, (_, step) =>
    findDeckSpot(railway, bridge.fromDistance + (length * step) / count),
  );
};

const listDeckParts = (
  railway: Railway,
  bridge: RailBridge,
  colour: string,
): ModelPart[] => {
  const spots = listSpots(railway, bridge, 3);
  return spots
    .slice(1)
    .map((spot, index) =>
      buildBeam(
        sideOf(spots[index], 0, ballastTopLift - deckThickness / 2),
        sideOf(spot, 0, ballastTopLift - deckThickness / 2),
        deckHalfWidth * 2,
        deckThickness,
        colour,
      ),
    );
};

const listParapetParts = (
  spots: readonly DeckSpot[],
  lift: number,
  colour: string,
): ModelPart[] =>
  spots
    .slice(1)
    .flatMap((spot, index) =>
      [-1, 1].map((side) =>
        buildBeam(
          sideOf(spots[index], side * (deckHalfWidth - 0.08), lift),
          sideOf(spot, side * (deckHalfWidth - 0.08), lift),
          0.12,
          0.1,
          colour,
        ),
      ),
    );

const buildPier = (spot: DeckSpot, colour: string, width = 1.4): ModelPart => {
  const top = spot.y + ballastTopLift - deckThickness;
  const height = Math.max(0.1, top - spot.ground);
  const geometry = new BoxGeometry(width * 1.4, height, width * 0.7);
  geometry.rotateY(spot.heading + Math.PI / 2);
  geometry.translate(spot.x, spot.ground + height / 2, spot.z);
  return { geometry, colour };
};

const listStoneViaduct = (
  railway: Railway,
  bridge: RailBridge,
  look: RailwayLook,
): ModelPart[] => {
  const piers = listSpots(railway, bridge, 9);
  const arches = piers.slice(1).flatMap((spot, index) => {
    const start = piers[index];
    const segments = 6;
    return Array.from({ length: segments }, (_, segment) => {
      const angleFrom = (Math.PI * segment) / segments;
      const angleTo = (Math.PI * (segment + 1)) / segments;
      const pointAt = (angle: number): Triple => {
        const along = (1 - Math.cos(angle)) / 2;
        const rise = Math.sin(angle) * 2.6;
        const top = start.y + (spot.y - start.y) * along;
        return [
          start.x + (spot.x - start.x) * along,
          top + ballastTopLift - deckThickness - 2.6 + rise,
          start.z + (spot.z - start.z) * along,
        ];
      };
      return buildBeam(
        pointAt(angleFrom),
        pointAt(angleTo),
        2.2,
        0.6,
        look.stone,
      );
    });
  });
  return [
    ...listDeckParts(railway, bridge, look.stone),
    ...piers.map((spot) => buildPier(spot, look.stone, 1.6)),
    ...arches,
    ...listParapetParts(listSpots(railway, bridge, 4.5), 0.55, look.stone),
  ];
};

const listGirder = (
  railway: Railway,
  bridge: RailBridge,
  look: RailwayLook,
): ModelPart[] => {
  const spots = listSpots(railway, bridge, 4);
  return [
    ...listDeckParts(railway, bridge, look.stone),
    ...listSpots(railway, bridge, 14).map((spot) =>
      buildPier(spot, look.stone, 1.3),
    ),
    ...spots
      .slice(1)
      .flatMap((spot, index) =>
        [-1, 1].map((side) =>
          buildBeam(
            sideOf(spots[index], side * deckHalfWidth, 0.1),
            sideOf(spot, side * deckHalfWidth, 0.1),
            0.16,
            1.2,
            look.steel,
          ),
        ),
      ),
  ];
};

const listTimberTrestle = (
  railway: Railway,
  bridge: RailBridge,
  look: RailwayLook,
): ModelPart[] => {
  const bents = listSpots(railway, bridge, 4.5);
  return [
    ...listDeckParts(railway, bridge, look.timber),
    ...bents.flatMap((spot) => {
      const top = spot.y + ballastTopLift - deckThickness;
      const foot = (side: number): Triple => {
        const point = sideOf(spot, side * 1.6, 0);
        return [point[0], spot.ground, point[2]];
      };
      const head = (side: number): Triple =>
        sideOf(spot, side * 0.9, top - spot.y);
      return [
        buildBeam(foot(-1), head(-1), 0.22, 0.22, look.timber),
        buildBeam(foot(1), head(1), 0.22, 0.22, look.timber),
        buildBeam(foot(-1), head(1), 0.12, 0.12, look.timber),
        buildBeam(foot(1), head(-1), 0.12, 0.12, look.timber),
      ];
    }),
    ...listParapetParts(listSpots(railway, bridge, 4.5), 0.75, look.timber),
  ];
};

const listSteelTruss = (
  railway: Railway,
  bridge: RailBridge,
  look: RailwayLook,
): ModelPart[] => {
  const panels = listSpots(railway, bridge, 3.2);
  const height = 2.6;
  return [
    ...listDeckParts(railway, bridge, look.stone),
    ...listSpots(railway, bridge, 20).map((spot) =>
      buildPier(spot, look.stone, 1.5),
    ),
    ...panels.slice(1).flatMap((spot, index) => {
      const start = panels[index];
      return [-1, 1].flatMap((side) => {
        const across = side * deckHalfWidth;
        return [
          buildBeam(
            sideOf(start, across, 0),
            sideOf(spot, across, 0),
            0.18,
            0.18,
            look.steel,
          ),
          buildBeam(
            sideOf(start, across, height),
            sideOf(spot, across, height),
            0.18,
            0.18,
            look.steel,
          ),
          buildBeam(
            sideOf(start, across, 0),
            sideOf(start, across, height),
            0.14,
            0.14,
            look.steel,
          ),
          buildBeam(
            sideOf(index % 2 === 0 ? start : spot, across, 0),
            sideOf(index % 2 === 0 ? spot : start, across, height),
            0.12,
            0.12,
            look.steel,
          ),
        ];
      });
    }),
    ...panels
      .filter((_, index) => index % 2 === 0)
      .map((spot) =>
        buildBeam(
          sideOf(spot, -deckHalfWidth, height),
          sideOf(spot, deckHalfWidth, height),
          0.12,
          0.12,
          look.steel,
        ),
      ),
  ];
};

const listSuspension = (
  railway: Railway,
  bridge: RailBridge,
  look: RailwayLook,
): ModelPart[] => {
  const towers = listSpots(railway, bridge, 48);
  const towerHeight = 9;
  const hangerSpacing = 3;
  const cables = towers.slice(1).flatMap((tower, index) => {
    const start = towers[index];
    const length = Math.hypot(tower.x - start.x, tower.z - start.z);
    const hangerCount = Math.max(2, Math.round(length / hangerSpacing));
    const fromDistance =
      bridge.fromDistance +
      ((bridge.toDistance - bridge.fromDistance) * index) / (towers.length - 1);
    const toDistance =
      bridge.fromDistance +
      ((bridge.toDistance - bridge.fromDistance) * (index + 1)) /
        (towers.length - 1);
    const cableAt = (step: number, side: number): Triple => {
      const share = step / hangerCount;
      const spot = findDeckSpot(
        railway,
        fromDistance + (toDistance - fromDistance) * share,
      );
      const sag = 1 - 4 * share * (1 - share);
      return sideOf(
        spot,
        side * (deckHalfWidth + 0.1),
        0.6 + (towerHeight - 0.6) * sag,
      );
    };
    return Array.from({ length: hangerCount }, (_, step) =>
      [-1, 1].flatMap((side) => {
        const share = step / hangerCount;
        const spot = findDeckSpot(
          railway,
          fromDistance + (toDistance - fromDistance) * share,
        );
        return [
          buildBeam(
            cableAt(step, side),
            cableAt(step + 1, side),
            0.14,
            0.14,
            look.cable,
          ),
          buildBeam(
            sideOf(spot, side * (deckHalfWidth + 0.1), 0.1),
            cableAt(step, side),
            0.05,
            0.05,
            look.cable,
          ),
        ];
      }),
    ).flat();
  });
  return [
    ...listDeckParts(railway, bridge, look.stone),
    ...listSpots(railway, bridge, 16).map((spot) =>
      buildPier(spot, look.stone, 1.1),
    ),
    ...towers.flatMap((tower) => [
      buildPier(tower, look.stone, 1.8),
      ...[-1, 1].map((side) => {
        const foot = sideOf(tower, side * (deckHalfWidth + 0.2), -0.4);
        return buildBeam(
          foot,
          sideOf(tower, side * (deckHalfWidth + 0.2), towerHeight + 0.6),
          0.4,
          0.5,
          look.steel,
        );
      }),
      buildBeam(
        sideOf(tower, -deckHalfWidth - 0.2, towerHeight),
        sideOf(tower, deckHalfWidth + 0.2, towerHeight),
        0.4,
        0.4,
        look.steel,
      ),
      buildBeam(
        sideOf(tower, -deckHalfWidth - 0.2, 3.6),
        sideOf(tower, deckHalfWidth + 0.2, 3.6),
        0.3,
        0.3,
        look.steel,
      ),
    ]),
    ...cables,
  ];
};

const listBowstringArch = (
  railway: Railway,
  bridge: RailBridge,
  look: RailwayLook,
): ModelPart[] => {
  const piers = listSpots(railway, bridge, 30);
  const archRise = 4.8;
  const arches = piers.slice(1).flatMap((_, index) => {
    const length = bridge.toDistance - bridge.fromDistance;
    const fromDistance =
      bridge.fromDistance + (length * index) / (piers.length - 1);
    const toDistance =
      bridge.fromDistance + (length * (index + 1)) / (piers.length - 1);
    const segments = 10;
    const archAt = (step: number, side: number): Triple => {
      const share = step / segments;
      const spot = findDeckSpot(
        railway,
        fromDistance + (toDistance - fromDistance) * share,
      );
      return sideOf(
        spot,
        side * (deckHalfWidth + 0.05),
        0.2 + archRise * 4 * share * (1 - share),
      );
    };
    return Array.from({ length: segments }, (_, step) =>
      [-1, 1].flatMap((side) => {
        const spot = findDeckSpot(
          railway,
          fromDistance + ((toDistance - fromDistance) * step) / segments,
        );
        return [
          buildBeam(
            archAt(step, side),
            archAt(step + 1, side),
            0.26,
            0.3,
            look.steel,
          ),
          buildBeam(
            sideOf(spot, side * (deckHalfWidth + 0.05), 0.1),
            archAt(step, side),
            0.06,
            0.06,
            look.cable,
          ),
        ];
      }),
    ).flat();
  });
  return [
    ...listDeckParts(railway, bridge, look.stone),
    ...piers.map((spot) => buildPier(spot, look.stone, 1.5)),
    ...arches,
  ];
};

const bridgeBuilders: Record<
  RailBridgeStyle,
  (railway: Railway, bridge: RailBridge, look: RailwayLook) => ModelPart[]
> = {
  "stone-viaduct": listStoneViaduct,
  girder: listGirder,
  "timber-trestle": listTimberTrestle,
  "steel-truss": listSteelTruss,
  suspension: listSuspension,
  "bowstring-arch": listBowstringArch,
};

export const listRailBridgeParts = (
  railway: Railway,
  bridge: RailBridge,
  look: RailwayLook,
): ModelPart[] => bridgeBuilders[bridge.style](railway, bridge, look);

/**
 * The dark opening of a tunnel's portal, above the deck, sized so the
 * tallest Train (Frost Isle's raised pantograph, 2.56 above the rail) and
 * the widest (1.5 across) go in with room to spare. The World Map draws
 * its portals at the Train's map size.
 */
export const tunnelOpening = { halfWidth: 1.7, top: 3.9 };

const tunnelOpeningFloor = -0.2;
const tunnelPierWidth = 1.2;
const tunnelLintelHeight = 1.3;

export const listTunnelMouthParts = (
  railway: Railway,
  distance: number,
  facing: number,
  look: RailwayLook,
  size = 1,
): ModelPart[] => {
  const spot = findDeckSpot(railway, distance);
  const heading = spot.heading + (facing < 0 ? Math.PI : 0);
  const face = (
    across: number,
    lift: number,
    width: number,
    height: number,
    colour: string,
    depth = 0.9,
  ): ModelPart => {
    const geometry = new BoxGeometry(width * size, height * size, depth * size);
    const right = findRightOf(spot.heading);
    geometry.rotateY(heading);
    geometry.translate(
      spot.x + right.x * across * size,
      spot.y + (lift + height / 2) * size,
      spot.z + right.z * across * size,
    );
    return { geometry, colour };
  };
  const { halfWidth, top } = tunnelOpening;
  const pierFoot = tunnelOpeningFloor - 0.2;
  const pierAcross = halfWidth + tunnelPierWidth / 2;
  return [
    face(-pierAcross, pierFoot, tunnelPierWidth, top - pierFoot, look.stone),
    face(pierAcross, pierFoot, tunnelPierWidth, top - pierFoot, look.stone),
    face(
      0,
      top,
      (halfWidth + tunnelPierWidth) * 2,
      tunnelLintelHeight,
      look.stone,
    ),
    face(
      0,
      tunnelOpeningFloor,
      halfWidth * 2,
      top - tunnelOpeningFloor,
      "#0b0b0f",
      0.3,
    ),
  ];
};

/**
 * The land over a portal, at `size`: a mound that stands on the portal's
 * stonework, from inside it, a little above its top, and reaches back
 * into the hill, its sides and back rounding over and sloping down into
 * the ground. So the land meets the top of every portal, with no gap
 * between them, and stands over it even where the hill behind is low or
 * falls away. It is painted as the land would be in its shape.
 */
export const tunnelMound = {
  top: tunnelOpening.top + tunnelLintelHeight + 0.3,
  halfWidth: tunnelOpening.halfWidth + tunnelPierWidth + 0.6,
  depth: 4.5,
  slope: 1.5,
  shoulder: 1.5,
  foot: tunnelOpeningFloor - 0.8,
};
const moundAcrossSteps = 18;
const moundInwardSteps = 10;

/** How far the mound has fallen `beyond` its top, rounding over its shoulder. */
const findMoundFall = (beyond: number): number => {
  const { slope, shoulder } = tunnelMound;
  if (beyond <= 0) {
    return 0;
  }
  return beyond < shoulder
    ? (slope * beyond * beyond) / (2 * shoulder)
    : slope * (beyond - shoulder / 2);
};

const findMoundHeight = (across: number, along: number): number =>
  Math.max(
    tunnelMound.foot,
    tunnelMound.top -
      findMoundFall(Math.abs(across) - tunnelMound.halfWidth) -
      findMoundFall(along - tunnelMound.depth),
  );

export const buildTunnelMoundGeometry = (
  railway: Railway,
  distance: number,
  facing: number,
  size = 1,
): BufferGeometry => {
  const spot = findDeckSpot(railway, distance);
  const right = findRightOf(spot.heading);
  const inward = {
    x: -Math.sin(spot.heading) * facing,
    z: -Math.cos(spot.heading) * facing,
  };
  const fall =
    (tunnelMound.top - tunnelMound.foot) / tunnelMound.slope +
    tunnelMound.shoulder / 2;
  const reachAcross = tunnelMound.halfWidth + fall;
  const reachInward = tunnelMound.depth + fall;
  const positions: number[] = [];
  const addPoint = (across: number, along: number, lift: number): number => {
    positions.push(
      spot.x + (right.x * across + inward.x * along) * size,
      spot.y + lift * size,
      spot.z + (right.z * across + inward.z * along) * size,
    );
    return positions.length / 3 - 1;
  };
  const columns = moundAcrossSteps + 1;
  const acrossAt = (column: number) =>
    -reachAcross + (2 * reachAcross * column) / moundAcrossSteps;
  for (let row = 0; row <= moundInwardSteps; row++) {
    const along = (reachInward * row) / moundInwardSteps;
    for (let column = 0; column < columns; column++) {
      addPoint(
        acrossAt(column),
        along,
        findMoundHeight(acrossAt(column), along),
      );
    }
  }
  // Its front, inside the portal's stonework, goes down to the mound's foot.
  const feet = Array.from({ length: columns }, (_, column) =>
    addPoint(acrossAt(column), 0, tunnelMound.foot),
  );
  const point = (index: number) =>
    new Vector3(
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2],
    );
  const indices: number[] = [];
  const addQuad = (corners: readonly number[], facingOut: Vector3) => {
    const [first, second, third] = corners.map(point);
    const isFacingOut =
      second.sub(first).cross(third.sub(first)).dot(facingOut) >= 0;
    const [a, b, c, d] = isFacingOut ? corners : [...corners].reverse();
    indices.push(a, b, c, a, c, d);
  };
  const up = new Vector3(0, 1, 0);
  for (let row = 0; row < moundInwardSteps; row++) {
    for (let column = 0; column < moundAcrossSteps; column++) {
      const corner = row * columns + column;
      addQuad([corner, corner + 1, corner + columns + 1, corner + columns], up);
    }
  }
  const out = new Vector3(-inward.x, 0, -inward.z);
  for (let column = 0; column < moundAcrossSteps; column++) {
    addQuad([column, column + 1, feet[column + 1], feet[column]], out);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute("normal");
  const colours = new Float32Array(positions.length);
  for (let index = 0; index < positions.length / 3; index++) {
    findLandColour(
      railway.islandId,
      { x: positions[index * 3], z: positions[index * 3 + 2] },
      positions[index * 3 + 1],
      normals.getY(index),
    ).toArray(colours, index * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colours, 3));
  const painted = geometry.toNonIndexed();
  geometry.dispose();
  return painted;
};

const listTunnelEnds = (railway: Railway) =>
  railway.tunnels.flatMap(
    (tunnel) =>
      [
        [tunnel.fromDistance - tunnelPortalSetback, -1],
        [tunnel.toDistance + tunnelPortalSetback, 1],
      ] as const,
  );

export const listTunnelParts = (
  railway: Railway,
  look: RailwayLook,
  size = 1,
): ModelPart[] =>
  listTunnelEnds(railway).flatMap(([distance, facing]) =>
    listTunnelMouthParts(railway, distance, facing, look, size),
  );

const buildTunnelMoundsGeometry = (
  railway: Railway,
  size: number,
): BufferGeometry[] =>
  listTunnelEnds(railway).map(([distance, facing]) =>
    buildTunnelMoundGeometry(railway, distance, facing, size),
  );

const listStationParts = (
  railway: Railway,
  station: Station,
  stationIndex: number,
  look: RailwayLook,
  adventure: IslandAdventure,
): ModelPart[] => {
  const pieces = 6;
  const spots = Array.from({ length: pieces + 1 }, (_, piece) =>
    findStationPlatformSpot(
      railway,
      station,
      -platformLength / 2 + (platformLength * piece) / pieces,
    ),
  );
  const platform = spots.slice(1).flatMap((spot, index) => {
    const start = spots[index];
    const top = spot.y;
    return [
      buildBeam(
        [start.x, top - 0.6, start.z],
        [spot.x, top - 0.6, spot.z],
        platformHalfWidth * 2,
        1.2,
        look.stone,
      ),
      buildBeam(
        [
          start.x -
            Math.cos(start.heading) * station.side * (platformHalfWidth - 0.1),
          top + 0.01,
          start.z +
            Math.sin(start.heading) * station.side * (platformHalfWidth - 0.1),
        ],
        [
          spot.x -
            Math.cos(spot.heading) * station.side * (platformHalfWidth - 0.1),
          top + 0.01,
          spot.z +
            Math.sin(spot.heading) * station.side * (platformHalfWidth - 0.1),
        ],
        0.18,
        0.04,
        "#facc15",
      ),
    ];
  });
  const middle = spots[Math.floor(pieces / 2)];
  const canopyHeight = 2.4;
  const posts = [1, 2, 4, 5].map((index) =>
    buildPost(
      [spots[index].x, spots[index].y, spots[index].z],
      spots[index].y + canopyHeight,
      0.07,
      look.steel,
    ),
  );
  const canopy = buildBeam(
    [spots[1].x, middle.y + canopyHeight + 0.1, spots[1].z],
    [spots[5].x, middle.y + canopyHeight + 0.1, spots[5].z],
    platformHalfWidth * 2 + 0.4,
    0.16,
    look.roof,
  );
  const building = findStationBuildingSpot(railway, stationIndex);
  const ground = Math.max(0, adventure.findHeight(building));
  const house: ModelPart[] = [
    {
      geometry: new BoxGeometry(6, 3, 3.6),
      colour: look.wall,
      position: [building.x, ground + 1.5, building.z],
      rotation: [0, building.heading, 0],
    },
    {
      geometry: new ConeGeometry(4.2, 1.8, 4),
      colour: look.roof,
      position: [building.x, ground + 3.9, building.z],
      rotation: [0, building.heading + Math.PI / 4, 0],
      scale: [1, 1, 0.75],
    },
    {
      geometry: new BoxGeometry(1.1, 1.9, 0.1),
      colour: "#5b3a22",
      position: [
        building.x - Math.cos(building.heading) * station.side * 1.82,
        ground + 0.95,
        building.z + Math.sin(building.heading) * station.side * 1.82,
      ],
      rotation: [0, building.heading + Math.PI / 2, 0],
    },
    {
      geometry: new BoxGeometry(3, 0.7, 0.12),
      colour: look.sign,
      position: [
        building.x - Math.cos(building.heading) * station.side * 1.86,
        ground + 2.45,
        building.z + Math.sin(building.heading) * station.side * 1.86,
      ],
      rotation: [0, building.heading + Math.PI / 2, 0],
    },
  ];
  const signs = [spots[0], spots[pieces]].flatMap((spot) => [
    buildPost([spot.x, spot.y, spot.z], spot.y + 1.6, 0.05, look.steel),
    {
      geometry: new BoxGeometry(1.6, 0.5, 0.08),
      colour: look.sign,
      position: [spot.x, spot.y + 1.75, spot.z] satisfies Triple,
      rotation: [0, spot.heading + Math.PI / 2, 0] satisfies Triple,
    },
  ]);
  return [...platform, ...posts, canopy, ...house, ...signs];
};

export const buildRailwayStructuresGeometry = (
  railway: Railway,
  look: RailwayLook,
  adventure: IslandAdventure,
  portalSize = 1,
): BufferGeometry => {
  const parts = [
    ...railway.bridges.flatMap((bridge) =>
      listRailBridgeParts(railway, bridge, look),
    ),
    ...listTunnelParts(railway, look, portalSize),
    ...railway.stations.flatMap((station, index) =>
      listStationParts(railway, station, index, look, adventure),
    ),
  ];
  return mergeGeometries([
    ...chunk(parts, 400).map((group) => buildModelGeometry(group)),
    ...buildTunnelMoundsGeometry(railway, portalSize),
  ]);
};

const chunk = <Item>(items: readonly Item[], size: number): Item[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );

export const buildMapRailwayGeometry = (
  railway: Railway,
  adventure: IslandAdventure,
): BufferGeometry => {
  const look = findRailwayLook(railway.islandId);
  return mergeGeometries([
    buildMapTrackGeometry(railway, look),
    buildRailwayStructuresGeometry(railway, look, adventure, mapTrainScale),
  ]);
};
