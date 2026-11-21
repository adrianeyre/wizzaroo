import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { smoothStep } from "../world-map-terrain.js";
import { buildPaintedLoft, paintFaces } from "./island-lofts.js";
import { buildLiveryGeometry, onBothSides } from "./island-livery.js";
import {
  jetskiBeam,
  jetskiFootwell,
  jetskiLength,
  jetskiRiderZ,
} from "./island-sea-craft.js";

// A sit-down personal watercraft in the Wizzaroo purple and gold. The
// Character steps down from the pier onto the flat footwell deck just behind
// the handlebars and rides it standing, in view, with the padded saddle
// behind them. A rooster tail of spray kicks up from the jet nozzle while it
// is under way.

export const jetskiStern = -jetskiLength / 2;
export const jetskiBow = jetskiLength / 2;
const halfBeam = jetskiBeam / 2;
const keelDepth = -0.24;
const gunwale = 0.4;
const deckFrontZ = jetskiRiderZ + 0.38;
export const jetskiSaddleFront = jetskiRiderZ - 0.42;
const saddleBack = jetskiStern + 0.38;
const saddleTop = jetskiFootwell + 0.44;

const paint = {
  hull: new Color("#f8fafc"),
  hullShade: new Color("#e2e8f0"),
  bottom: new Color("#334155"),
  purple: new Color("#4c1d95"),
  violet: new Color("#6d28d9"),
  gold: new Color("#f5c542"),
  deck: new Color("#1f2937"),
  grip: new Color("#374151"),
  seat: new Color("#111827"),
  seatTrim: new Color("#7c3aed"),
};

const findHalfWidth = (z: number): number => {
  if (z > 0.1) {
    const towardsBow = Math.min(1, (z - 0.1) / (jetskiBow - 0.1));
    return Math.max(0.02, halfBeam * (1 - towardsBow ** 1.5) ** 0.85);
  }
  return halfBeam * (0.9 + 0.1 * smoothStep(jetskiStern, -0.6, z));
};

const findKeel = (z: number): number =>
  keelDepth +
  (jetskiFootwell + 0.05 - keelDepth) *
    smoothStep(0.2, jetskiBow + 0.05, z) ** 1.7;

const findDeck = (z: number): number =>
  jetskiFootwell + 0.1 * smoothStep(0.9, jetskiBow, z);

const hullRingPoints = 34;

const buildHullRing = (z: number): Triple[] => {
  const width = findHalfWidth(z);
  const keel = findKeel(z);
  const deck = findDeck(z);
  const chine = Math.max(keel + 0.02, Math.min(keel + 0.2, 0.06));
  const side: [number, number][] = [
    [0.04, keel],
    [width * 0.45, keel + (chine - keel) * 0.4],
    [width * 0.82, keel + (chine - keel) * 0.85],
    [width * 0.9, chine],
    [width * 0.97, Math.max(chine + 0.02, 0.1)],
    [width * 0.99, Math.max(chine + 0.04, 0.2)],
    [width, Math.max(chine + 0.06, 0.3)],
    [width, Math.max(chine + 0.08, 0.36)],
    [width * 0.995, Math.max(chine + 0.1, 0.42)],
    [width * 0.98, gunwale],
    [width * 0.93, deck],
  ];
  const across = Array.from(
    { length: hullRingPoints / 2 - side.length - 1 },
    (_, point, list = hullRingPoints / 2 - side.length - 1) =>
      width * 0.93 * (1 - (2 * (point + 1)) / (list + 1)),
  );
  const clamped = side.map(([x, y], index): [number, number] => [
    x,
    Math.min(y, deck - 0.01 * (side.length - 1 - index)),
  ]);
  const starboard = clamped.map(([x, y]): Triple => [x, y, z]);
  const port = clamped.toReversed().map(([x, y]): Triple => [-x, y, z]);
  return [
    [0, keel - 0.02, z],
    ...starboard,
    ...across.map((x): Triple => [x, deck, z]),
    ...port,
  ];
};

const hullStations = Array.from({ length: 44 }, (_, station) => {
  const share = station / 43;
  return jetskiStern + (jetskiBow - jetskiStern) * share;
});

const paintHull = ({ x, y, z }: { x: number; y: number; z: number }) => {
  const width = findHalfWidth(z);
  const deck = findDeck(z);
  if (y > deck - 0.02 && Math.abs(x) < width * 0.9) {
    const isGrip = Math.floor((x + 2) / 0.09) % 2 === 0;
    return isGrip ? paint.deck : paint.grip;
  }
  if (y < 0.02) {
    return paint.bottom;
  }
  if (y > 0.2 && y < 0.3) {
    return paint.purple;
  }
  if (y > 0.3 && y < 0.36) {
    return paint.gold;
  }
  return y > gunwale - 0.04 ? paint.hullShade : paint.hull;
};

const buildHullGeometry = (): BufferGeometry =>
  buildPaintedLoft(hullStations.map(buildHullRing), paintHull);

const cowlBack = deckFrontZ;
const cowlFront = jetskiBow - 0.18;
const cowlRingPoints = 28;

const findCowl = (z: number) => {
  const share = (z - cowlBack) / (cowlFront - cowlBack);
  const rise = Math.sin(Math.PI * Math.min(1, share * 1.35 + 0.08));
  return {
    halfWidth: findHalfWidth(z) * 0.9,
    bottom: findDeck(z) - 0.02,
    top: findDeck(z) + 0.08 + 0.55 * Math.max(0, rise) * (1 - share * 0.6),
  };
};

const buildCowlRing = (z: number): Triple[] => {
  const { halfWidth, bottom, top } = findCowl(z);
  return Array.from({ length: cowlRingPoints }, (_, point): Triple => {
    const angle = (point / cowlRingPoints) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const across = Math.sign(cosine) * Math.abs(cosine) ** 0.55 * halfWidth;
    const up =
      sine >= 0
        ? bottom + (top - bottom) * Math.abs(sine) ** 0.6
        : bottom - 0.02 * Math.abs(sine);
    return [across, up, z];
  });
};

const cowlStations = Array.from({ length: 22 }, (_, station) => {
  const share = station / 21;
  return cowlBack + (cowlFront - cowlBack) * share;
});

const paintCowl = ({ x, y, z }: { x: number; y: number; z: number }) => {
  const { halfWidth, top } = findCowl(z);
  if (y > top - 0.07 && Math.abs(x) < halfWidth * 0.55) {
    return z > cowlBack + 0.25 ? paint.violet : paint.purple;
  }
  if (Math.abs(x) > halfWidth * 0.86 && y > top - 0.2) {
    return paint.gold;
  }
  return y > findDeck(z) + 0.18 ? paint.purple : paint.hull;
};

const buildCowlGeometry = (): BufferGeometry =>
  buildPaintedLoft(cowlStations.map(buildCowlRing), paintCowl);

const findSaddle = (z: number) => {
  const share = (z - saddleBack) / (jetskiSaddleFront - saddleBack);
  const rounded = Math.sin(Math.PI * Math.min(1, Math.max(0, share))) ** 0.25;
  return {
    halfWidth: 0.27 * (0.75 + 0.25 * rounded),
    top: jetskiFootwell + 0.06 + (saddleTop - jetskiFootwell - 0.06) * rounded,
  };
};

const buildSaddleRing = (z: number): Triple[] => {
  const { halfWidth, top } = findSaddle(z);
  return Array.from({ length: 22 }, (_, point): Triple => {
    const angle = (point / 22) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const across = Math.sign(cosine) * Math.abs(cosine) ** 0.45 * halfWidth;
    const up =
      jetskiFootwell -
      0.02 +
      (top - jetskiFootwell + 0.02) *
        (0.5 + 0.5 * Math.sign(sine) * Math.abs(sine) ** 0.4);
    return [across, up, z];
  });
};

const saddleStations = Array.from({ length: 16 }, (_, station) => {
  const share = station / 15;
  return saddleBack + (jetskiSaddleFront - saddleBack) * share;
});

const buildSaddleGeometry = (): BufferGeometry =>
  buildPaintedLoft(saddleStations.map(buildSaddleRing), ({ x, y, z }) => {
    const { halfWidth, top } = findSaddle(z);
    if (Math.abs(x) > halfWidth * 0.82 && y > top - 0.12) {
      return paint.seatTrim;
    }
    return paint.seat;
  });

const handlebarZ = jetskiRiderZ + 0.58;
const handlebarY = 1.22;

const buildSteeringParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.05, 0.07, 0.48, 10),
    colour: "#1f2937",
    position: [0, handlebarY - 0.22, handlebarZ + 0.08],
    rotation: [-0.35, 0, 0],
  },
  {
    geometry: new CylinderGeometry(0.03, 0.03, 0.78, 10),
    colour: "#cbd5e1",
    position: [0, handlebarY, handlebarZ],
    rotation: [0, 0, Math.PI / 2],
  },
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new CylinderGeometry(0.045, 0.045, 0.2, 10),
    colour: "#111827",
    position: [side * 0.34, handlebarY, handlebarZ],
    rotation: [0, 0, Math.PI / 2],
  })),
  {
    geometry: new BoxGeometry(0.3, 0.14, 0.12),
    colour: "#111827",
    position: [0, handlebarY + 0.02, handlebarZ + 0.05],
  },
  {
    geometry: new BoxGeometry(0.2, 0.08, 0.02),
    colour: "#38bdf8",
    position: [0, handlebarY + 0.06, handlebarZ - 0.02],
    rotation: [-0.3, 0, 0],
  },
];

const buildFittingParts = (): ModelPart[] => {
  const screen: ModelPart[] = [
    {
      geometry: new BoxGeometry(0.62, 0.3, 0.02),
      colour: "#1e293b",
      position: [0, findCowl(handlebarZ + 0.3).top + 0.1, handlebarZ + 0.3],
      rotation: [-0.85, 0, 0],
    },
  ];
  const mirrors = [-1, 1].flatMap((side): ModelPart[] => [
    {
      geometry: new CylinderGeometry(0.015, 0.015, 0.18, 5),
      colour: "#1f2937",
      position: [
        side * 0.3,
        findCowl(handlebarZ + 0.25).top + 0.06,
        handlebarZ + 0.25,
      ],
      rotation: [0, 0, side * 0.6],
    },
    {
      geometry: new BoxGeometry(0.14, 0.08, 0.03),
      colour: "#94a3b8",
      position: [
        side * 0.38,
        findCowl(handlebarZ + 0.25).top + 0.13,
        handlebarZ + 0.25,
      ],
    },
  ]);
  const stern: ModelPart[] = [
    {
      geometry: new CylinderGeometry(0.09, 0.11, 0.26, 12),
      colour: "#475569",
      position: [0, 0.02, jetskiStern - 0.08],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new TorusGeometry(0.1, 0.02, 6, 14),
      colour: "#f5c542",
      position: [0, 0.02, jetskiStern - 0.21],
    },
    {
      geometry: new BoxGeometry(halfBeam * 1.6, 0.05, 0.34),
      colour: "#1f2937",
      position: [0, 0.32, jetskiStern + 0.05],
    },
    {
      geometry: new TorusGeometry(0.14, 0.025, 6, 14, Math.PI),
      colour: "#cbd5e1",
      position: [0, saddleTop - 0.02, saddleBack + 0.02],
      rotation: [0, Math.PI / 2, 0],
    },
  ];
  const lights: ModelPart[] = [-1, 1].map((side) => ({
    geometry: new SphereGeometry(0.06, 10, 6),
    colour: "#fef9c3",
    position: [
      side * 0.16,
      findCowl(cowlFront - 0.2).top - 0.04,
      cowlFront - 0.2,
    ],
    scale: [1.4, 0.6, 1],
  }));
  return [...screen, ...mirrors, ...stern, ...lights];
};

export const buildJetskiHandlebarGeometry = (): BufferGeometry =>
  buildModelGeometry(buildSteeringParts());

const steeringPivot: Triple = [0, handlebarY - 0.45, handlebarZ + 0.2];
const steeringTilt = 0.35;

export const placeJetskiHandlebar = (steer: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(...steeringPivot)
    .multiply(new Matrix4().makeRotationX(-steeringTilt))
    .multiply(new Matrix4().makeRotationY(Math.max(-0.5, Math.min(0.5, steer))))
    .multiply(new Matrix4().makeRotationX(steeringTilt))
    .multiply(
      new Matrix4().makeTranslation(
        -steeringPivot[0],
        -steeringPivot[1],
        -steeringPivot[2],
      ),
    );

export const buildJetskiGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildHullGeometry(),
    buildCowlGeometry(),
    buildSaddleGeometry(),
    buildModelGeometry(buildFittingParts()),
  ]);

export const buildJetskiLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    {
      surface: buildHullGeometry(),
      decals: onBothSides({
        face: "name",
        centre: [halfBeam, 0.3, -0.45],
        outward: [1, 0, 0],
        up: [0, 1, 0],
        width: 1.3,
        height: 0.32,
      }),
    },
    {
      surface: buildCowlGeometry(),
      decals: [
        ...onBothSides({
          face: "flag",
          centre: [findHalfWidth(1.15) * 0.85, findDeck(1.15) + 0.2, 1.15],
          outward: [1, 0.4, 0],
          up: [0, 1, 0],
          width: 0.46,
          height: 0.23,
        }),
      ],
    },
  ]);

const sprayBase: Triple = [0, 0.02, jetskiStern - 0.15];

const paintSpray = ({ y, z }: { y: number; z: number }): Color => {
  const reach = Math.min(1, (sprayBase[2] - z) / 3);
  return new Color("#ffffff").lerp(
    new Color("#7dd3fc"),
    reach * 0.8 + y * 0.05,
  );
};

const buildSprayCone = (
  radius: number,
  height: number,
  direction: Triple,
  at: Triple,
): BufferGeometry => {
  const turn = new Quaternion().setFromUnitVectors(
    new Vector3(0, -1, 0),
    new Vector3(...direction).normalize(),
  );
  return new ConeGeometry(radius, height, 16, 4, true)
    .translate(0, -height / 2, 0)
    .applyQuaternion(turn)
    .translate(...at);
};

export const buildJetskiSprayGeometry = (): BufferGeometry =>
  mergeGeometries(
    [
      buildSprayCone(0.7, 3.4, [0, 0.42, -1], sprayBase),
      buildSprayCone(0.3, 2.4, [0, 0.55, -1], sprayBase),
    ].map((cone) => {
      const painted = paintFaces(cone, paintSpray);
      painted.computeVertexNormals();
      return painted;
    }),
  );

export const placeJetskiSpray = (spray: number, turn: number): Matrix4 => {
  const flicker = 0.9 + 0.1 * Math.sin(turn * 2.3) * Math.sin(turn * 0.71);
  const size = Math.max(0.001, spray * flicker);
  return new Matrix4()
    .makeTranslation(...sprayBase)
    .multiply(new Matrix4().makeScale(size, size, size))
    .multiply(
      new Matrix4().makeTranslation(
        -sprayBase[0],
        -sprayBase[1],
        -sprayBase[2],
      ),
    );
};

export const jetskiHandlebar = { y: handlebarY, z: handlebarZ } as const;
