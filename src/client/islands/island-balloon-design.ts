import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import {
  balloonBasketFloor,
  balloonBasketHalfWidth,
  balloonBasketRim,
  balloonDoor,
} from "./island-flight.js";
import { buildLiveryGeometry, type LiveryDecal } from "./island-livery.js";
import { buildPaintedLoft, paintFaces } from "./island-lofts.js";
import type { LiveryFace } from "./wizzaroo-flag.js";

export const envelopeMouthHeight = 3.7;
export const envelopeMouthRadius = 1.25;
export const envelopeEquatorHeight = 10.4;
export const envelopeRadius = 4.7;
const envelopeCrownRise = 4.8;
const crownVentAngle = Math.PI / 2 - 0.05;
export const goreCount = 16;
const pointsPerGore = 6;
const lowerRings = 22;
const upperRings = 22;
const goreBulge = 0.035;
const tapeShare = 0.07;

export const burnerHeight = 2.55;
const burnerSpacing = 0.25;
const loadFrameHalfWidth = 0.55;

const decalBandHalfHeight = 1.6;
const stripeHeight = 0.3;
const crownBandStart = 13.8;
const scoopBandHeight = 0.6;
const harlequinRowHeight = 1.4;

const doorHalfWidth = 0.38;
const doorTop = balloonBasketRim + 0.08;
const wallThickness = 0.12;

const paint = {
  night: new Color("#21105e"),
  purple: new Color("#3b1d9a"),
  violet: new Color("#6d3fe0"),
  gold: new Color("#f5c542"),
  paleGold: new Color("#ffe9a8"),
  scoop: new Color("#1e1145"),
  vent: new Color("#7c5a12"),
  mouth: new Color("#0b0618"),
  wickerLight: new Color("#c8955a"),
  wickerDark: new Color("#a8743e"),
  wickerInner: new Color("#8f6236"),
  leather: new Color("#4a2c17"),
  floor: new Color("#9a6b3c"),
};

const findEnvelopeProfile = (): { radius: number; height: number }[] => {
  const lower = Array.from({ length: lowerRings }, (_, ring) => {
    const towardsMouth = 1 - ring / lowerRings;
    return {
      radius:
        envelopeMouthRadius +
        (envelopeRadius - envelopeMouthRadius) *
          Math.cos((towardsMouth * Math.PI) / 2) ** 0.85,
      height:
        envelopeEquatorHeight -
        (envelopeEquatorHeight - envelopeMouthHeight) * towardsMouth,
    };
  });
  const upper = Array.from({ length: upperRings + 1 }, (_, ring) => {
    const angle = (ring / upperRings) * crownVentAngle;
    return {
      radius: envelopeRadius * Math.cos(angle),
      height: envelopeEquatorHeight + envelopeCrownRise * Math.sin(angle),
    };
  });
  return [...lower, ...upper];
};

const aroundCount = goreCount * pointsPerGore;

const buildEnvelopeRing = ({
  radius,
  height,
}: {
  radius: number;
  height: number;
}): Triple[] => {
  const fullness = radius / envelopeRadius;
  return Array.from({ length: aroundCount }, (_, point): Triple => {
    const angle = (point / aroundCount) * Math.PI * 2;
    const withinGore = (point % pointsPerGore) / pointsPerGore;
    const swell =
      1 - goreBulge * fullness * (1 - Math.sin(Math.PI * withinGore));
    return [
      Math.cos(angle) * radius * swell,
      height,
      Math.sin(angle) * radius * swell,
    ];
  });
};

const envelopeRings = (): Triple[][] =>
  findEnvelopeProfile().map(buildEnvelopeRing);

const findGore = ({ x, z }: { x: number; z: number }) => {
  const turn = (Math.atan2(z, x) / (Math.PI * 2) + 1) % 1;
  const along = turn * goreCount;
  return { index: Math.floor(along), within: along - Math.floor(along) };
};

const paintEnvelopeBody = (centre: {
  x: number;
  y: number;
  z: number;
}): Color => {
  const { y } = centre;
  const reach = Math.hypot(centre.x, centre.z);
  if (y < envelopeMouthHeight + 0.02 && reach < envelopeMouthRadius * 0.95) {
    return paint.mouth;
  }
  if (y > envelopeEquatorHeight + envelopeCrownRise * 0.985) {
    return paint.vent;
  }
  const gore = findGore(centre);
  const isOdd = gore.index % 2 === 1;
  const fromEquator = y - envelopeEquatorHeight;
  const base = (() => {
    if (y > crownBandStart) {
      return paint.gold;
    }
    if (Math.abs(fromEquator) < decalBandHalfHeight) {
      return paint.night;
    }
    if (Math.abs(fromEquator) < decalBandHalfHeight + stripeHeight) {
      return paint.paleGold;
    }
    if (fromEquator > 0) {
      return isOdd ? paint.violet : paint.purple;
    }
    if (y < envelopeMouthHeight + scoopBandHeight) {
      return paint.scoop;
    }
    const row = Math.floor(
      (envelopeEquatorHeight - decalBandHalfHeight - stripeHeight - y) /
        harlequinRowHeight,
    );
    return (gore.index + row) % 2 === 0 ? paint.gold : paint.purple;
  })();
  const isTape = gore.within < tapeShare || gore.within > 1 - tapeShare;
  return isTape ? base.clone().multiplyScalar(0.7) : base;
};

export const buildEnvelopeGeometry = (): BufferGeometry =>
  buildPaintedLoft(envelopeRings(), paintEnvelopeBody);

const buildDecalBandGeometry = (): BufferGeometry =>
  buildPaintedLoft(
    envelopeRings().filter(
      ([[, height]]) =>
        Math.abs(height - envelopeEquatorHeight) < decalBandHalfHeight + 1.2,
    ),
    () => paint.night,
  );

const buildLathe = (
  profile: readonly [number, number][],
  segments: number,
  painter: (centre: { x: number; y: number; z: number }) => Color,
): BufferGeometry => {
  const lathe = new LatheGeometry(
    profile.map(([radius, height]) => new Vector2(radius, height)),
    segments,
  );
  return paintFaces(lathe, painter);
};

const buildSkirtGeometry = (): BufferGeometry => {
  const top = envelopeMouthHeight + 0.05;
  const hem = envelopeMouthHeight - 0.62;
  return buildLathe(
    [
      [envelopeMouthRadius - 0.03, top],
      [envelopeMouthRadius + 0.13, hem],
      [envelopeMouthRadius + 0.09, hem - 0.02],
      [envelopeMouthRadius - 0.06, top],
    ],
    goreCount * 3,
    ({ y }) => (y < hem + 0.16 ? paint.gold : paint.scoop),
  );
};

const findWickerColour = ({ x, y, z }: { x: number; y: number; z: number }) => {
  const along = Math.abs(x) > Math.abs(z) ? z : x;
  const column = Math.floor((along + 2) / 0.14);
  const row = Math.floor(y / 0.09);
  const isDark = (column + row) % 2 === 0;
  const shade = 0.94 + 0.06 * Math.sin(row * 2.3 + column * 0.7);
  return (isDark ? paint.wickerDark : paint.wickerLight)
    .clone()
    .multiplyScalar(shade);
};

const squareness = 7;
const basketAround = 72;

const buildRoundedSquare = (halfWidth: number, height: number): Triple[] =>
  Array.from({ length: basketAround }, (_, point): Triple => {
    const angle = (point / basketAround) * Math.PI * 2 + Math.PI / basketAround;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return [
      Math.sign(cosine) * Math.abs(cosine) ** (2 / squareness) * halfWidth,
      height,
      Math.sign(sine) * Math.abs(sine) ** (2 / squareness) * halfWidth,
    ];
  });

const rimLift = balloonBasketRim - 0.12;
const innerHalfWidth = balloonBasketHalfWidth - wallThickness;

const basketProfile: [number, number][] = [
  [balloonBasketHalfWidth - 0.05, 0],
  [balloonBasketHalfWidth - 0.01, 0.05],
  ...Array.from({ length: 11 }, (_, step): [number, number] => [
    balloonBasketHalfWidth,
    0.09 + (step * (rimLift - 0.09)) / 10,
  ]),
  [balloonBasketHalfWidth + 0.06, rimLift + 0.03],
  [balloonBasketHalfWidth + 0.08, rimLift + 0.08],
  [balloonBasketHalfWidth + 0.06, balloonBasketRim - 0.01],
  [balloonBasketHalfWidth, balloonBasketRim + 0.02],
  [innerHalfWidth - 0.02, balloonBasketRim],
  [innerHalfWidth - 0.04, rimLift],
  [innerHalfWidth - 0.04, (rimLift + balloonBasketFloor) / 2],
  [innerHalfWidth - 0.04, balloonBasketFloor],
];

const paintBasket = (centre: { x: number; y: number; z: number }): Color => {
  const reach = Math.max(Math.abs(centre.x), Math.abs(centre.z));
  if (centre.y > rimLift - 0.005) {
    return paint.leather;
  }
  if (reach < innerHalfWidth - 0.03) {
    return centre.y < balloonBasketFloor + 0.02 && centre.y > 0.02
      ? paint.floor
      : paint.wickerInner;
  }
  return centre.y < 0.02 ? paint.leather : findWickerColour(centre);
};

const isInDoorway = ({ x, y, z }: { x: number; y: number; z: number }) =>
  x > innerHalfWidth - 0.1 &&
  Math.abs(z) < doorHalfWidth &&
  y > balloonBasketFloor - 0.02 &&
  y < doorTop;

const keepTriangles = (
  geometry: BufferGeometry,
  isKept: (centre: { x: number; y: number; z: number }) => boolean,
): BufferGeometry => {
  const positions = geometry.getAttribute("position");
  const kept = Array.from(
    { length: positions.count / 3 },
    (_, triangle) => triangle,
  ).filter((triangle) => {
    const first = triangle * 3;
    return isKept({
      x:
        (positions.getX(first) +
          positions.getX(first + 1) +
          positions.getX(first + 2)) /
        3,
      y:
        (positions.getY(first) +
          positions.getY(first + 1) +
          positions.getY(first + 2)) /
        3,
      z:
        (positions.getZ(first) +
          positions.getZ(first + 1) +
          positions.getZ(first + 2)) /
        3,
    });
  });
  const trimmed = new BufferGeometry();
  ["position", "normal", "color"].forEach((name) => {
    const source = geometry.getAttribute(name);
    const size = source.itemSize;
    const values = new Float32Array(kept.length * 3 * size);
    kept.forEach((triangle, keptIndex) => {
      for (let corner = 0; corner < 3; corner++) {
        for (let part = 0; part < size; part++) {
          values[(keptIndex * 3 + corner) * size + part] =
            source.array[(triangle * 3 + corner) * size + part];
        }
      }
    });
    trimmed.setAttribute(name, new BufferAttribute(values, size));
  });
  geometry.dispose();
  return trimmed;
};

const buildWickerBasketGeometry = (): BufferGeometry =>
  keepTriangles(
    buildPaintedLoft(
      basketProfile.map(([halfWidth, height]) =>
        buildRoundedSquare(halfWidth, height),
      ),
      paintBasket,
    ),
    (centre) => !isInDoorway(centre),
  );

const strut = (
  from: Triple,
  to: Triple,
  radius: number,
  colour: string,
  sides = 6,
): ModelPart => {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const length = start.distanceTo(end);
  const middle = start.clone().add(end).multiplyScalar(0.5);
  const turn = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    end.clone().sub(start).normalize(),
  );
  const geometry = new CylinderGeometry(radius, radius, length, sides);
  geometry.applyQuaternion(turn);
  return {
    geometry,
    colour,
    position: [middle.x, middle.y, middle.z],
  };
};

const listFrameCorners = (height: number): Triple[] =>
  [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ].map(([x, z]): Triple => [
    x * loadFrameHalfWidth,
    height,
    z * loadFrameHalfWidth,
  ]);

const rimCorner = balloonBasketHalfWidth - 0.14;

const buildFrameParts = (): ModelPart[] => {
  const corners = listFrameCorners(burnerHeight);
  const rodFeet = [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ].map(([x, z]): Triple => [x * rimCorner, balloonBasketRim, z * rimCorner]);
  const mouthPoints = Array.from({ length: goreCount }, (_, gore): Triple => {
    const angle = (gore / goreCount) * Math.PI * 2;
    return [
      Math.cos(angle) * (envelopeMouthRadius - 0.08),
      envelopeMouthHeight + 0.04,
      Math.sin(angle) * (envelopeMouthRadius - 0.08),
    ];
  });
  const findNearestCorner = ([x, , z]: Triple): Triple =>
    corners.reduce((nearest, corner) =>
      Math.hypot(corner[0] - x, corner[2] - z) <
      Math.hypot(nearest[0] - x, nearest[2] - z)
        ? corner
        : nearest,
    );
  return [
    ...corners.map((corner, index) =>
      strut(corner, corners[(index + 1) % 4], 0.035, "#e2e8f0", 8),
    ),
    ...rodFeet.map((foot, index) =>
      strut(foot, corners[index], 0.045, "#1e1b4b", 10),
    ),
    ...mouthPoints.map((point) =>
      strut(findNearestCorner(point), point, 0.014, "#334155", 5),
    ),
  ];
};

const buildBurnerParts = (): ModelPart[] =>
  [-1, 1].flatMap((side): ModelPart[] => {
    const x = side * burnerSpacing;
    return [
      {
        geometry: new CylinderGeometry(0.2, 0.17, 0.46, 24),
        colour: "#cbd5e1",
        position: [x, burnerHeight + 0.05, 0],
      },
      ...[0, 1, 2, 3].map((coil): ModelPart => ({
        geometry: new TorusGeometry(0.205, 0.03, 6, 24),
        colour: "#94a3b8",
        position: [x, burnerHeight - 0.1 + coil * 0.1, 0],
        rotation: [Math.PI / 2, 0, 0],
      })),
      {
        geometry: new CylinderGeometry(0.12, 0.16, 0.08, 20),
        colour: "#334155",
        position: [x, burnerHeight + 0.32, 0],
      },
      {
        geometry: new CylinderGeometry(0.06, 0.06, 0.2, 12),
        colour: "#475569",
        position: [x, burnerHeight - 0.27, 0],
      },
      {
        geometry: new BoxGeometry(0.06, 0.05, 0.22),
        colour: "#dc2626",
        position: [x, burnerHeight - 0.32, 0.12],
      },
      strut(
        [x, burnerHeight - 0.35, 0],
        [-0.62, balloonBasketFloor + 1.15, side * 0.62],
        0.025,
        "#111827",
        6,
      ),
    ];
  });

const buildFuelTankParts = (): ModelPart[] =>
  [-1, 1].flatMap((side): ModelPart[] => [
    {
      geometry: new CylinderGeometry(0.17, 0.17, 0.9, 20),
      colour: "#4c1d95",
      position: [-0.62, balloonBasketFloor + 0.45, side * 0.62],
    },
    {
      geometry: new SphereGeometry(0.17, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: "#e2e8f0",
      position: [-0.62, balloonBasketFloor + 0.9, side * 0.62],
    },
    {
      geometry: new CylinderGeometry(0.05, 0.05, 0.1, 10),
      colour: "#94a3b8",
      position: [-0.62, balloonBasketFloor + 1.1, side * 0.62],
    },
  ]);

const buildSandbagParts = (): ModelPart[] =>
  [
    { x: -balloonBasketHalfWidth - 0.13, z: 0.45 },
    { x: -balloonBasketHalfWidth - 0.13, z: -0.45 },
    { x: 0.5, z: balloonBasketHalfWidth + 0.13 },
    { x: -0.5, z: -balloonBasketHalfWidth - 0.13 },
  ].flatMap(({ x, z }): ModelPart[] => [
    {
      geometry: new SphereGeometry(1, 14, 10),
      colour: "#c9a66b",
      position: [x, 0.62, z],
      scale: [0.13, 0.17, 0.13],
      isSmooth: true,
    },
    {
      geometry: new CylinderGeometry(0.05, 0.07, 0.06, 10),
      colour: "#7c5a3a",
      position: [x, 0.79, z],
    },
    strut(
      [x, 0.8, z],
      [x * 0.93, rimLift + 0.02, z * 0.93],
      0.012,
      "#7c5a3a",
      4,
    ),
  ]);

const buildDoorFrameParts = (): ModelPart[] => [
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new BoxGeometry(wallThickness + 0.1, doorTop, 0.07),
    colour: "#4a2c17",
    position: [
      balloonBasketHalfWidth - wallThickness / 2 + 0.02,
      doorTop / 2,
      side * (doorHalfWidth + 0.035),
    ],
  })),
  {
    geometry: new BoxGeometry(wallThickness + 0.04, balloonBasketFloor, 0.76),
    colour: "#4a2c17",
    position: [
      balloonBasketHalfWidth - wallThickness / 2,
      balloonBasketFloor / 2,
      0,
    ],
  },
];

const buildBasketGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildWickerBasketGeometry(),
    buildModelGeometry([
      ...buildFrameParts(),
      ...buildBurnerParts(),
      ...buildFuelTankParts(),
      ...buildSandbagParts(),
      ...buildDoorFrameParts(),
    ]),
  ]);

export const buildBalloonGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildEnvelopeGeometry(),
    buildSkirtGeometry(),
    buildBasketGeometry(),
  ]);

const envelopeSides: { outward: Triple; face: LiveryFace }[] = [
  { outward: [0, 0, 1], face: "flag" },
  { outward: [0, 0, -1], face: "flag" },
  { outward: [1, 0, 0], face: "name" },
  { outward: [-1, 0, 0], face: "name" },
];

const envelopeLiveryDecals: LiveryDecal[] = envelopeSides.map(
  ({ outward, face }): LiveryDecal => ({
    face,
    centre: [
      outward[0] * envelopeRadius,
      envelopeEquatorHeight,
      outward[2] * envelopeRadius,
    ],
    outward,
    up: [0, 1, 0],
    width: face === "flag" ? 4.8 : 5.6,
    height: face === "flag" ? 2.4 : 1.4,
  }),
);

export const buildBalloonLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    { surface: buildDecalBandGeometry(), decals: envelopeLiveryDecals },
  ]);

const doorThickness = 0.08;
const doorHeight = doorTop - balloonBasketFloor - 0.04;
const doorWidth = doorHalfWidth * 2 - 0.04;
const doorHinge = new Vector3(
  balloonBasketHalfWidth - doorThickness / 2,
  0,
  -doorHalfWidth,
);
const doorSwing = 1.75;

export const buildBalloonDoorGeometry = (): BufferGeometry => {
  const panel = new BoxGeometry(doorThickness, doorHeight, doorWidth, 1, 10, 6);
  panel.translate(
    balloonBasketHalfWidth - doorThickness / 2,
    balloonBasketFloor + 0.02 + doorHeight / 2,
    0,
  );
  const painted = paintFaces(panel, (centre) =>
    centre.y > doorTop - 0.12 || centre.y < balloonBasketFloor + 0.1
      ? paint.leather
      : findWickerColour(centre),
  );
  painted.computeVertexNormals();
  return painted;
};

export const placeBalloonDoor = (opening: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(doorHinge.x, doorHinge.y, doorHinge.z)
    .multiply(new Matrix4().makeRotationY(doorSwing * opening))
    .multiply(
      new Matrix4().makeTranslation(-doorHinge.x, -doorHinge.y, -doorHinge.z),
    );

const flameBase = burnerHeight + 0.36;
const flameLength = 1.25;

const paintFlame = ({ y }: { y: number }): Color => {
  const up = (y - flameBase) / flameLength;
  if (up < 0.12) {
    return new Color("#93c5fd");
  }
  return new Color("#fff7cc").lerp(new Color("#f97316"), Math.min(1, up * 1.3));
};

export const buildBurnerFlameGeometry = (): BufferGeometry =>
  mergeGeometries(
    [-1, 1].flatMap((side) => {
      const outer = new ConeGeometry(0.15, flameLength, 16, 4, true);
      outer.translate(side * burnerSpacing, flameBase + flameLength / 2, 0);
      const core = new ConeGeometry(0.08, flameLength * 0.55, 12, 2, true);
      core.translate(
        side * burnerSpacing,
        flameBase + (flameLength * 0.55) / 2,
        0,
      );
      return [outer, core].map((cone) => {
        const painted = paintFaces(cone, paintFlame);
        painted.computeVertexNormals();
        return painted;
      });
    }),
  );

export const placeBurnerFlame = (burn: number, turn: number): Matrix4 => {
  const flicker = 0.85 + 0.15 * Math.sin(turn * 1.7) * Math.sin(turn * 0.63);
  const height = Math.max(0.001, burn * flicker);
  return new Matrix4()
    .makeTranslation(0, flameBase, 0)
    .multiply(new Matrix4().makeScale(1, height, 1))
    .multiply(new Matrix4().makeTranslation(0, -flameBase, 0));
};

export const balloonDoorway = {
  x: balloonDoor.x,
  halfWidth: doorHalfWidth,
  top: doorTop,
} as const;
