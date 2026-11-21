import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  Matrix4,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import {
  rocketBodyRadius,
  rocketHatch,
  rocketLegReach,
  rocketStairRun,
} from "./island-flight.js";
import { buildAirfoilLoft, paintFaces } from "./island-lofts.js";
import { buildLiveryGeometry, type LiveryDecal } from "./island-livery.js";

// A crewed passenger rocket that lands upright on its four legs, like a
// reusable booster, on the Helipad. The Character climbs a fold-down stair to
// the hatch low on its side. It is white with Wizzaroo purple and gold: a
// lathed body and ogive nose, a crew band of round windows, swept fins, and
// three engine bells whose flame glows while it burns.

const radius = rocketBodyRadius;
export const rocketEngineExit = 0.9;
export const rocketBodyBottom = 1.5;
const skirtTop = 2.05;
const crewBandBottom = 9.2;
const crewBandTop = 11.4;
const shoulder = 12.4;
export const rocketNoseTip = 16.6;

const paint = {
  white: new Color("#f8fafc"),
  shade: new Color("#e2e8f0"),
  purple: new Color("#4c1d95"),
  violet: new Color("#6d28d9"),
  night: new Color("#1e1b4b"),
  gold: new Color("#f5c542"),
  steel: new Color("#94a3b8"),
  dark: new Color("#1f2937"),
  glass: new Color("#0f2a4a"),
  hatch: new Color("#cbd5e1"),
};

const findOgive = (height: number): number => {
  const along = (height - shoulder) / (rocketNoseTip - shoulder);
  return radius * Math.sqrt(Math.max(0, 1 - along ** 1.7));
};

const bandHeights = [4.6, 7.4, crewBandBottom, crewBandTop];

const listBodyProfile = (): Vector2[] => {
  const tube = [
    new Vector2(0.001, rocketBodyBottom),
    new Vector2(radius * 0.82, rocketBodyBottom),
    new Vector2(radius * 0.98, rocketBodyBottom + 0.25),
    new Vector2(radius, skirtTop),
  ];
  const stations = 30;
  const heights = [
    ...Array.from(
      { length: stations },
      (_, station) =>
        skirtTop + ((shoulder - skirtTop) * (station + 1)) / stations,
    ),
    ...bandHeights,
  ]
    .toSorted((first, second) => first - second)
    .filter(
      (height, index, sorted) =>
        index === 0 || height - sorted[index - 1] > 0.05,
    );
  const body = heights.map((height) => new Vector2(radius, height));
  const noseStations = 22;
  const nose = Array.from({ length: noseStations }, (_, station) => {
    const height =
      shoulder + ((rocketNoseTip - shoulder) * (station + 1)) / noseStations;
    return new Vector2(Math.max(0.001, findOgive(height)), height);
  });
  return [...tube, ...body, ...nose];
};

const hatchHalfWidth = 0.42;
const hatchTop = rocketHatch.y + 1.55;
const windowRow = 10.3;
const windowCount = 10;

const paintBody = ({ x, y, z }: { x: number; y: number; z: number }): Color => {
  const angle = Math.atan2(z, x);
  const around = (((angle / (Math.PI * 2)) % 1) + 1) % 1;
  if (y < skirtTop) {
    return paint.dark;
  }
  if (y > rocketNoseTip - 0.9) {
    return paint.gold;
  }
  if (y > shoulder) {
    return Math.floor(around * 16) % 2 === 0 ? paint.purple : paint.violet;
  }
  if (y > crewBandBottom && y < crewBandTop) {
    return paint.night;
  }
  const isHatch =
    Math.abs(angle) * radius < hatchHalfWidth &&
    y > rocketHatch.y - 0.05 &&
    y < hatchTop;
  if (isHatch) {
    return paint.dark;
  }
  if (y > 4.6 && y < 7.4 && Math.floor(around * 8) % 2 === 1) {
    return paint.shade;
  }
  return paint.white;
};

const buildBodyGeometry = (): BufferGeometry =>
  paintFaces(new LatheGeometry(listBodyProfile(), 64), paintBody);

const enginePlaces: Triple[] = [0, 1, 2].map((engine): Triple => {
  const angle = (engine / 3) * Math.PI * 2 + Math.PI / 2;
  return [Math.cos(angle) * 0.48, 0, Math.sin(angle) * 0.48];
});

const buildEngineGeometry = (): BufferGeometry => {
  const bell = [
    new Vector2(0.14, rocketBodyBottom + 0.05),
    new Vector2(0.2, rocketBodyBottom - 0.1),
    new Vector2(0.24, rocketBodyBottom - 0.2),
    new Vector2(0.33, rocketBodyBottom - 0.38),
    new Vector2(0.4, rocketEngineExit),
    new Vector2(0.37, rocketEngineExit),
    new Vector2(0.2, rocketBodyBottom - 0.2),
  ];
  return mergeGeometries(
    enginePlaces.map(([x, , z]) =>
      paintFaces(new LatheGeometry(bell, 28).translate(x, 0, z), ({ y }) =>
        y < rocketEngineExit + 0.1
          ? new Color("#f59e0b")
          : new Color("#475569"),
      ),
    ),
  );
};

const finAngles = [0, 1, 2, 3].map(
  (fin) => (fin / 4) * Math.PI * 2 + Math.PI / 4,
);
const finFootHeight = 0.42;

// The four swept fins reach down to the ground and stand the rocket on
// padded feet, so they are its landing legs as well.
const buildFinGeometry = (): BufferGeometry =>
  paintFaces(
    mergeGeometries(
      finAngles.map((angle) =>
        buildAirfoilLoft([
          {
            leadingEdge: [radius - 0.12, 6.4, 0],
            chord: [0, -4.1, 0],
            thicknessAxis: [0, 0, 1],
            thickness: 0.1,
          },
          {
            leadingEdge: [rocketLegReach, finFootHeight + 1.2, 0],
            chord: [0, -1.2, 0],
            thicknessAxis: [0, 0, 1],
            thickness: 0.12,
          },
        ])
          .rotateY(-angle)
          .toNonIndexed(),
      ),
    ),
    ({ x, z, y }) => {
      if (Math.hypot(x, z) > rocketLegReach - 0.45) {
        return paint.gold;
      }
      return y < 2.6 ? paint.purple : paint.violet;
    },
  );

const buildFootParts = (): ModelPart[] =>
  finAngles.flatMap((angle): ModelPart[] => {
    const x = Math.cos(angle) * rocketLegReach;
    const z = -Math.sin(angle) * rocketLegReach;
    return [
      {
        geometry: new CylinderGeometry(0.1, 0.12, finFootHeight + 0.1, 10),
        colour: "#475569",
        position: [x, (finFootHeight + 0.1) / 2, z],
      },
      {
        geometry: new CylinderGeometry(0.4, 0.5, 0.14, 20),
        colour: "#334155",
        position: [x, 0.07, z],
      },
      {
        geometry: new TorusGeometry(0.45, 0.04, 6, 20),
        colour: "#f5c542",
        position: [x, 0.14, z],
        rotation: [Math.PI / 2, 0, 0],
      },
    ];
  });

const buildDetailParts = (): ModelPart[] => {
  const rings: ModelPart[] = [
    ...[4.6, 7.4].map((height): ModelPart => ({
      geometry: new TorusGeometry(radius + 0.01, 0.07, 6, 48),
      colour: "#f5c542",
      position: [0, height, 0],
      rotation: [Math.PI / 2, 0, 0],
    })),
    {
      geometry: new TorusGeometry(radius + 0.01, 0.05, 6, 48),
      colour: "#f5c542",
      position: [0, crewBandBottom, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new TorusGeometry(radius + 0.01, 0.05, 6, 48),
      colour: "#f5c542",
      position: [0, crewBandTop, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new TorusGeometry(radius * 0.85, 0.08, 6, 36),
      colour: "#475569",
      position: [0, rocketBodyBottom + 0.02, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
  ];
  const windowFrames = Array.from(
    { length: windowCount },
    (_, pane) => ((pane + 0.5) / windowCount) * Math.PI * 2,
  ).flatMap((angle): ModelPart[] => {
    const at = (out: number): Triple => [
      Math.cos(angle) * (radius + out),
      windowRow,
      Math.sin(angle) * (radius + out),
    ];
    return [
      {
        geometry: new CylinderGeometry(0.27, 0.27, 0.06, 18),
        colour: "#38bdf8",
        position: at(0),
        rotation: [0, -angle, Math.PI / 2],
      },
      {
        geometry: new TorusGeometry(0.3, 0.05, 6, 18),
        colour: "#cbd5e1",
        position: at(0.02),
        rotation: [0, Math.PI / 2 - angle, 0],
      },
    ];
  });
  const antenna: ModelPart[] = [
    {
      geometry: new CylinderGeometry(0.03, 0.05, 1.2, 6),
      colour: "#cbd5e1",
      position: [0, rocketNoseTip + 0.5, 0],
    },
    {
      geometry: new SphereGeometry(0.1, 10, 6),
      colour: "#ef4444",
      position: [0, rocketNoseTip + 1.1, 0],
    },
  ];
  const hatchFrame: ModelPart[] = [
    {
      geometry: new BoxGeometry(0.08, 0.1, hatchHalfWidth * 2 + 0.2),
      colour: "#f5c542",
      position: [radius + 0.03, hatchTop + 0.04, 0],
    },
    {
      geometry: new BoxGeometry(0.08, 0.1, hatchHalfWidth * 2 + 0.2),
      colour: "#f5c542",
      position: [radius + 0.03, rocketHatch.y - 0.06, 0],
    },
    {
      geometry: new BoxGeometry(0.4, 0.05, hatchHalfWidth * 2),
      colour: "#64748b",
      position: [radius - 0.1, rocketHatch.y - 0.02, 0],
    },
  ];
  const thrusters = [0, 1, 2, 3].map((quad): ModelPart => {
    const angle = (quad / 4) * Math.PI * 2;
    return {
      geometry: new BoxGeometry(0.22, 0.3, 0.22),
      colour: "#334155",
      position: [
        Math.cos(angle) * (radius + 0.08),
        shoulder - 0.4,
        Math.sin(angle) * (radius + 0.08),
      ],
      rotation: [0, -angle, 0],
    };
  });
  return [...rings, ...windowFrames, ...antenna, ...hatchFrame, ...thrusters];
};

export const buildRocketGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildBodyGeometry(),
    buildEngineGeometry(),
    buildFinGeometry(),
    buildModelGeometry([...buildFootParts(), ...buildDetailParts()]),
  ]);

const liveryFacings: Triple[] = [
  [0, 0, 1],
  [0, 0, -1],
  [-1, 0, 0],
];

const listRocketDecals = (): LiveryDecal[] =>
  liveryFacings.flatMap((outward): LiveryDecal[] => {
    const centre = (height: number): Triple => [
      outward[0] * radius,
      height,
      outward[2] * radius,
    ];
    return [
      {
        face: "name",
        centre: centre(6),
        outward,
        up: [0, 1, 0],
        width: 1.7,
        height: 0.42,
      },
      {
        face: "flag",
        centre: centre(8.4),
        outward,
        up: [0, 1, 0],
        width: 1.4,
        height: 0.7,
      },
    ];
  });

export const buildRocketLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    { surface: buildBodyGeometry(), decals: listRocketDecals() },
  ]);

const hatchHinge: Triple = [radius + 0.02, rocketHatch.y, 0];
const hatchThickness = 0.07;

export const buildRocketHatchGeometry = (): BufferGeometry => {
  const door = new BoxGeometry(
    hatchThickness,
    hatchTop - rocketHatch.y - 0.04,
    hatchHalfWidth * 2 - 0.04,
    1,
    6,
    4,
  ).translate(
    radius + hatchThickness / 2,
    rocketHatch.y + (hatchTop - rocketHatch.y) / 2,
    0,
  );
  return paintFaces(door, ({ y }) =>
    Math.abs(y - (rocketHatch.y + hatchTop) / 2) < 0.18
      ? paint.gold
      : paint.hatch,
  );
};

export const placeRocketHatch = (opening: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(hatchHinge[0], hatchHinge[1], -hatchHalfWidth)
    .multiply(new Matrix4().makeRotationY(1.9 * opening))
    .multiply(
      new Matrix4().makeTranslation(
        -hatchHinge[0],
        -hatchHinge[1],
        hatchHalfWidth,
      ),
    );

const stairSteps = 7;
const stairHalfWidth = 0.4;

export const buildRocketStairGeometry = (): BufferGeometry => {
  const run = rocketStairRun;
  const rise = rocketHatch.y;
  const length = Math.hypot(run, rise);
  const slope = Math.atan2(rise, run);
  const treads = Array.from({ length: stairSteps }, (_, step): ModelPart => {
    const share = (step + 0.5) / stairSteps;
    return {
      geometry: new BoxGeometry(
        run / stairSteps + 0.06,
        0.06,
        stairHalfWidth * 2,
      ),
      colour: step % 2 === 0 ? "#cbd5e1" : "#94a3b8",
      position: [run * (1 - share), rise * share - 0.03, 0],
    };
  });
  const stringers = [-1, 1].map((side): ModelPart => ({
    geometry: new BoxGeometry(length, 0.16, 0.06),
    colour: "#4c1d95",
    position: [run / 2, rise / 2, side * stairHalfWidth],
    rotation: [0, 0, -slope],
  }));
  const rails = [-1, 1].map((side): ModelPart => ({
    geometry: new CylinderGeometry(0.03, 0.03, length, 6),
    colour: "#f5c542",
    position: [run / 2, rise / 2 + 0.85, side * stairHalfWidth],
    rotation: [0, 0, Math.PI / 2 - slope],
  }));
  const posts = [-1, 1].flatMap((side) =>
    [0.1, 0.5, 0.9].map((share): ModelPart => ({
      geometry: new CylinderGeometry(0.025, 0.025, 0.85, 5),
      colour: "#e2e8f0",
      position: [run * (1 - share), rise * share + 0.42, side * stairHalfWidth],
    })),
  );
  return buildModelGeometry([...treads, ...stringers, ...rails, ...posts]);
};

const stairStowed = Math.PI / 2 + Math.atan2(rocketHatch.y, rocketStairRun);

export const placeRocketStair = (opening: number): Matrix4 =>
  new Matrix4().makeTranslation(radius + 0.02, 0, 0).multiply(
    new Matrix4()
      .makeTranslation(0, rocketHatch.y, 0)
      .multiply(new Matrix4().makeRotationZ(stairStowed * (1 - opening)))
      .multiply(new Matrix4().makeTranslation(0, -rocketHatch.y, 0)),
  );

const flameLength = 4.2;

const paintFlame = ({ y }: { y: number }): Color => {
  const down = (rocketEngineExit - y) / flameLength;
  if (down < 0.06) {
    return new Color("#bfdbfe");
  }
  return new Color("#fff7cc").lerp(
    new Color("#f97316"),
    Math.min(1, down * 1.6),
  );
};

export const buildRocketFlameGeometry = (): BufferGeometry =>
  mergeGeometries(
    enginePlaces.flatMap(([x, , z]) => {
      const plume = new ConeGeometry(0.36, flameLength, 18, 5, true)
        .rotateX(Math.PI)
        .translate(x, rocketEngineExit - flameLength / 2, z);
      const core = new ConeGeometry(0.2, flameLength * 0.5, 12, 3, true)
        .rotateX(Math.PI)
        .translate(x, rocketEngineExit - flameLength * 0.25, z);
      return [plume, core].map((cone) => {
        const painted = paintFaces(cone, paintFlame);
        painted.computeVertexNormals();
        return painted;
      });
    }),
  );

export const placeRocketFlame = (burn: number, turn: number): Matrix4 => {
  const flicker = 0.88 + 0.12 * Math.sin(turn * 2.1) * Math.sin(turn * 0.77);
  const length = Math.max(0.001, burn * flicker);
  const width = Math.max(0.001, 0.6 + 0.4 * burn);
  return new Matrix4()
    .makeTranslation(0, rocketEngineExit, 0)
    .multiply(new Matrix4().makeScale(width, length, width))
    .multiply(new Matrix4().makeTranslation(0, -rocketEngineExit, 0));
};

export const rocketHatchway = {
  halfWidth: hatchHalfWidth,
  top: hatchTop,
} as const;
