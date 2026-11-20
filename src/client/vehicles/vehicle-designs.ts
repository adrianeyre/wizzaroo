import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
  type ColorRepresentation,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { vehicleModels } from "../../curriculum/catalogue.js";
import { buildPaintedLoft } from "../islands/island-lofts.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { smoothStep } from "../world-map-terrain.js";

export type VehicleModel = (typeof vehicleModels)[number];
export type RiderPose = "seated" | "standing" | "hidden";

export interface VehicleDesign {
  model: VehicleModel;
  buildGeometry: (colour: string) => BufferGeometry;
  length: number;
  width: number;
  height: number;
  rider: { position: Triple; pose: RiderPose };
  topSpeed: number;
  acceleration: number;
  turnRate: number;
}

interface Spot {
  x: number;
  y: number;
  z: number;
}

const ground = 0.004;

const shades = {
  tyre: "#2a2a2e",
  sidewall: "#3e3e46",
  rim: "#cfd4da",
  chrome: "#eef2f6",
  glass: "#9ad4f0",
  headlight: "#fff6c2",
  tailLight: "#e53935",
  indicator: "#ffa726",
  seat: "#3c3c44",
  interior: "#2d2d33",
  grille: "#3a404c",
  frame: "#4a4f58",
  white: "#fbfbfb",
  black: "#25252a",
  plate: "#ffe082",
  plateWhite: "#f4f4f4",
  wood: "#b07a48",
  darkWood: "#7a5232",
  arch: "#26262b",
  blueLight: "#2979ff",
  redLight: "#ff1744",
  yellow: "#fdd835",
} as const;

const upwards = new Vector3(0, 1, 0);

const tube = (
  from: Triple,
  to: Triple,
  radius: number,
  colour: ColorRepresentation,
  segments = 8,
): ModelPart => {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const direction = end.clone().sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(upwards, direction.clone().normalize()),
  );
  const middle = start.add(end).multiplyScalar(0.5);
  return {
    geometry: new CylinderGeometry(
      radius,
      radius,
      direction.length(),
      segments,
    ),
    colour,
    position: [middle.x, middle.y, middle.z],
    rotation: [turn.x, turn.y, turn.z],
  };
};

const bentTube = (
  points: readonly Triple[],
  radius: number,
  colour: ColorRepresentation,
  segments = 8,
): ModelPart[] => [
  ...points
    .slice(1)
    .map((point, index) =>
      tube(points[index], point, radius, colour, segments),
    ),
  ...points.slice(1, -1).map((point): ModelPart => ({
    geometry: new SphereGeometry(radius, segments, 4),
    colour,
    position: point,
  })),
];

const block = (
  size: Triple,
  colour: ColorRepresentation,
  position: Triple,
  rotation: Triple = [0, 0, 0],
): ModelPart => ({
  geometry: new BoxGeometry(...size),
  colour,
  position,
  rotation,
});

const ball = (
  radius: number,
  colour: ColorRepresentation,
  position: Triple,
  scale: Triple | number = 1,
  rotation: Triple = [0, 0, 0],
  detail: readonly [number, number] = [12, 8],
): ModelPart => ({
  geometry: new SphereGeometry(radius, detail[0], detail[1]),
  colour,
  position,
  scale,
  rotation,
});

const axle = (
  radius: number,
  width: number,
  colour: ColorRepresentation,
  position: Triple,
  segments = 16,
): ModelPart => ({
  geometry: new CylinderGeometry(radius, radius, width, segments),
  colour,
  position,
  rotation: [0, 0, Math.PI / 2],
});

const lens = (
  radius: number,
  depth: number,
  colour: ColorRepresentation,
  position: Triple,
  segments = 14,
): ModelPart => ({
  geometry: new CylinderGeometry(radius, radius, depth, segments),
  colour,
  position,
  rotation: [Math.PI / 2, 0, 0],
});

const post = (
  radius: number,
  height: number,
  colour: ColorRepresentation,
  position: Triple,
  segments = 12,
): ModelPart => ({
  geometry: new CylinderGeometry(radius, radius, height, segments),
  colour,
  position,
});

const bothSides = (build: (side: number) => ModelPart[]): ModelPart[] =>
  [1, -1].flatMap(build);

const lighten = (colour: ColorRepresentation, amount: number): Color =>
  new Color(colour).lerp(new Color("#ffffff"), amount);

const darken = (colour: ColorRepresentation, amount: number): Color =>
  new Color(colour).multiplyScalar(1 - amount);

interface WheelSpec {
  radius: number;
  width: number;
  x: number;
  z: number;
  rim?: ColorRepresentation;
  hubcap?: ColorRepresentation;
  lugs?: number;
}

const findWheelHeight = ({ radius, lugs = 0 }: WheelSpec): number =>
  (lugs > 0 ? radius * 1.05 : radius) + ground;

const buildRoadWheel = (wheel: WheelSpec): ModelPart[] => {
  const {
    radius,
    width,
    x,
    z,
    rim = shades.rim,
    hubcap = shades.chrome,
    lugs = 0,
  } = wheel;
  const y = findWheelHeight(wheel);
  const outward = x < 0 ? -1 : 1;
  const face = x + outward * (width / 2 + 0.012);
  return [
    axle(radius, width, shades.tyre, [x, y, z]),
    axle(radius * 0.88, width + 0.012, shades.sidewall, [x, y, z]),
    axle(radius * 0.62, width + 0.02, rim, [x, y, z]),
    axle(radius * 0.24, width + 0.04, hubcap, [x, y, z], 10),
    ...Array.from({ length: 5 }, (_, index) => {
      const angle = (index / 5) * Math.PI * 2;
      return axle(
        radius * 0.05,
        0.014,
        shades.frame,
        [
          face,
          y + Math.cos(angle) * radius * 0.4,
          z + Math.sin(angle) * radius * 0.4,
        ],
        5,
      );
    }),
    ...Array.from({ length: lugs }, (_, index) => {
      const angle = (index / lugs) * Math.PI * 2;
      return block(
        [width * 0.94, radius * 0.1, radius * 0.24],
        shades.tyre,
        [x, y + Math.cos(angle) * radius, z + Math.sin(angle) * radius],
        [angle, 0, 0],
      );
    }),
  ];
};

const buildRoadWheels = (wheels: readonly WheelSpec[]): ModelPart[] =>
  wheels.flatMap(buildRoadWheel);

const fourWheels = (
  spec: Omit<WheelSpec, "x" | "z">,
  track: number,
  front: number,
  back: number,
): WheelSpec[] =>
  [front, back].flatMap((z) => [track, -track].map((x) => ({ ...spec, x, z })));

interface SpokedWheelSpec {
  radius: number;
  z: number;
  x?: number;
  thickness?: number;
  spokes?: number;
  hubWidth?: number;
  tyre?: ColorRepresentation;
  rim?: ColorRepresentation;
  spoke?: ColorRepresentation;
  hub?: ColorRepresentation;
}

const buildSpokedWheel = ({
  radius,
  z,
  x = 0,
  thickness = 0.022,
  spokes = 8,
  hubWidth = 0.07,
  tyre = shades.tyre,
  rim = shades.rim,
  spoke = shades.chrome,
  hub = shades.chrome,
}: SpokedWheelSpec): ModelPart[] => {
  const y = radius + ground;
  const reach = radius - thickness * 2;
  return [
    {
      geometry: new TorusGeometry(radius - thickness, thickness, 6, 24),
      colour: tyre,
      position: [x, y, z],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      geometry: new TorusGeometry(
        radius - thickness * 2.1,
        thickness * 0.5,
        4,
        24,
      ),
      colour: rim,
      position: [x, y, z],
      rotation: [0, Math.PI / 2, 0],
    },
    axle(thickness * 1.6, hubWidth, hub, [x, y, z], 10),
    ...Array.from({ length: spokes }, (_, index) => {
      const angle = (index / spokes) * Math.PI;
      const up = Math.cos(angle) * reach;
      const along = Math.sin(angle) * reach;
      const lean = (index % 2 === 0 ? 1 : -1) * hubWidth * 0.3;
      return tube(
        [x + lean, y + up, z + along],
        [x - lean, y - up, z - along],
        Math.max(0.004, thickness * 0.2),
        spoke,
        3,
      );
    }),
  ];
};

const buildSpareWheel = (
  radius: number,
  centre: Triple,
  rim: ColorRepresentation,
): ModelPart[] => [
  {
    geometry: new TorusGeometry(radius - 0.035, 0.035, 6, 20),
    colour: shades.tyre,
    position: centre,
  },
  {
    geometry: new TorusGeometry(radius - 0.075, 0.012, 4, 20),
    colour: rim,
    position: centre,
  },
  lens(0.03, 0.06, shades.chrome, centre, 10),
  ...Array.from({ length: 5 }, (_, index) => {
    const angle = (index / 5) * Math.PI;
    const reach = radius - 0.07;
    return tube(
      [
        centre[0] + Math.cos(angle) * reach,
        centre[1] + Math.sin(angle) * reach,
        centre[2],
      ],
      [
        centre[0] - Math.cos(angle) * reach,
        centre[1] - Math.sin(angle) * reach,
        centre[2],
      ],
      0.008,
      rim,
      3,
    );
  }),
];

const buildMudguard = (
  radius: number,
  width: number,
  centre: Triple,
  colour: ColorRepresentation,
  from: number,
  arc: number,
): ModelPart => ({
  geometry: new TorusGeometry(radius, 0.014, 4, 16, arc),
  colour,
  position: centre,
  rotation: [0, Math.PI / 2, from],
  scale: [1, 1, width / 0.028],
});

const buildPedals = (crank: Triple, reach: number): ModelPart[] =>
  bothSides((side) => {
    const pedal: Triple = [
      crank[0] + side * 0.065,
      crank[1] - side * reach * 0.8,
      crank[2] + side * reach * 0.6,
    ];
    return [
      tube(
        [crank[0] + side * 0.045, crank[1], crank[2]],
        pedal,
        0.009,
        shades.chrome,
        5,
      ),
      block([0.055, 0.014, 0.035], shades.black, [
        pedal[0] + side * 0.025,
        pedal[1],
        pedal[2],
      ]),
    ];
  });

const buildHandlebar = (
  [x, y, z]: Triple,
  halfWidth: number,
  grip: ColorRepresentation,
  bar: ColorRepresentation = shades.chrome,
): ModelPart[] =>
  bothSides((side) => [
    tube([x, y, z], [x + side * halfWidth * 0.6, y + 0.01, z], 0.012, bar, 6),
    tube(
      [x + side * halfWidth * 0.6, y + 0.01, z],
      [x + side * halfWidth, y + 0.01, z - 0.05],
      0.012,
      bar,
      6,
    ),
    tube(
      [x + side * halfWidth * 0.72, y + 0.01, z - 0.018],
      [x + side * halfWidth * 1.03, y + 0.01, z - 0.054],
      0.019,
      grip,
      8,
    ),
    ball(
      0.013,
      bar,
      [x + side * halfWidth * 0.6, y + 0.01, z],
      1,
      [0, 0, 0],
      [6, 4],
    ),
  ]);

const buildMirror = (
  from: Triple,
  to: Triple,
  colour: ColorRepresentation = shades.chrome,
): ModelPart[] => [
  tube(from, to, 0.007, shades.frame, 4),
  lens(0.03, 0.012, colour, to, 10),
];

interface BodySection {
  z: number;
  halfWidth: number;
  bottom: number;
  top: number;
  isStraight?: boolean;
}

interface BodySpec {
  keys: readonly BodySection[];
  stations: number;
  around?: number;
  squareness?: number;
  paint: (spot: Spot, section: BodySection) => Color;
}

const blendSections = (
  keys: readonly BodySection[],
  z: number,
): BodySection => {
  const later = keys.find((key) => key.z >= z) ?? keys[keys.length - 1];
  const earlier = keys.findLast((key) => key.z <= z) ?? keys[0];
  const span = later.z - earlier.z;
  const progress = span > 0 ? (z - earlier.z) / span : 0;
  const share =
    later.isStraight === true ? progress : smoothStep(0, 1, progress);
  const mix = (from: number, to: number) => from + (to - from) * share;
  return {
    z,
    halfWidth: mix(earlier.halfWidth, later.halfWidth),
    bottom: mix(earlier.bottom, later.bottom),
    top: mix(earlier.top, later.top),
  };
};

const buildBodyRing = (
  { z, halfWidth, bottom, top }: BodySection,
  around: number,
  squareness: number,
): Triple[] =>
  Array.from({ length: around }, (_, point): Triple => {
    const angle = (point / around) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const across = Math.sign(cosine) * Math.abs(cosine) ** (2 / squareness);
    const up = Math.sign(sine) * Math.abs(sine) ** (2 / squareness);
    return [
      across * halfWidth,
      (bottom + top) / 2 + (up * (top - bottom)) / 2,
      z,
    ];
  });

const buildBody = ({
  keys,
  stations,
  around = 32,
  squareness = 3,
  paint,
}: BodySpec): BufferGeometry => {
  const back = keys[0].z;
  const front = keys[keys.length - 1].z;
  const rings = Array.from({ length: stations }, (_, station) =>
    buildBodyRing(
      blendSections(keys, back + ((front - back) * station) / (stations - 1)),
      around,
      squareness,
    ),
  );
  return buildPaintedLoft(rings, (centre) =>
    paint(centre, blendSections(keys, centre.z)),
  );
};

const findUpness = ({ y }: Spot, { bottom, top }: BodySection): number =>
  (y - (bottom + top) / 2) / Math.max(0.01, (top - bottom) / 2);

const findAcross = ({ x }: Spot, { halfWidth }: BodySection): number =>
  Math.abs(x) / Math.max(0.01, halfWidth);

interface Opening {
  from: number;
  to: number;
  halfWidth: number;
  colour?: ColorRepresentation;
}

interface CarPaintSpec {
  body: ColorRepresentation;
  openings?: readonly Opening[];
  wheels?: readonly WheelSpec[];
  livery?: (spot: Spot, section: BodySection) => Color | undefined;
}

const paintCarBody = ({
  body,
  openings = [],
  wheels = [],
  livery,
}: CarPaintSpec): ((spot: Spot, section: BodySection) => Color) => {
  const bodyColour = new Color(body);
  const underside = darken(body, 0.35);
  const arch = new Color(shades.arch);
  const openingColours = openings.map(
    ({ colour = shades.interior }) => new Color(colour),
  );
  return (spot, section) => {
    const upness = findUpness(spot, section);
    const opening = openings.findIndex(
      ({ from, to, halfWidth }) =>
        spot.z > from &&
        spot.z < to &&
        Math.abs(spot.x) < halfWidth &&
        upness > 0.4,
    );
    if (opening >= 0) {
      return openingColours[opening];
    }
    const isArch = wheels.some(
      (wheel) =>
        findAcross(spot, section) > 0.6 &&
        Math.hypot(spot.y - findWheelHeight(wheel), spot.z - wheel.z) <
          wheel.radius + 0.04,
    );
    if (isArch) {
      return arch;
    }
    return livery?.(spot, section) ?? (upness < -0.8 ? underside : bodyColour);
  };
};

const buildDriverSeat = (
  [x, y, z]: Triple,
  colour: ColorRepresentation,
  width = 0.3,
): ModelPart[] => {
  const seatTop = y + 0.25;
  return [
    block([width, 0.08, 0.28], colour, [x, seatTop - 0.04, z - 0.01]),
    block(
      [width, 0.24, 0.07],
      colour,
      [x, seatTop + 0.1, z - 0.19],
      [-0.18, 0, 0],
    ),
    block([width + 0.02, 0.03, 0.08], lighten(colour, 0.2), [
      x,
      seatTop + 0.2,
      z - 0.21,
    ]),
  ];
};

const buildSteeringWheel = (
  [x, y, z]: Triple,
  reach = 0.27,
  height = 0.36,
  radius = 0.08,
): ModelPart[] => {
  const centre: Triple = [x, y + height, z + reach];
  return [
    {
      geometry: new TorusGeometry(radius, 0.013, 6, 18),
      colour: shades.black,
      position: centre,
      rotation: [-0.55, 0, 0],
    },
    tube(
      [x - radius, centre[1], centre[2]],
      [x + radius, centre[1], centre[2]],
      0.009,
      shades.frame,
      5,
    ),
    tube(
      centre,
      [x, y + height - 0.1, z + reach + 0.17],
      0.014,
      shades.frame,
      6,
    ),
    ball(0.026, shades.frame, centre, 1, [0, 0, 0], [8, 6]),
  ];
};

interface WindscreenSpec {
  z: number;
  bottom: number;
  top: number;
  halfWidth: number;
  lean: number;
  frame?: ColorRepresentation;
}

const buildWindscreen = ({
  z,
  bottom,
  top,
  halfWidth,
  lean,
  frame = shades.chrome,
}: WindscreenSpec): ModelPart[] => {
  const rise = top - bottom;
  const shift = (Math.tan(lean) * rise) / 2;
  const lower = (side: number): Triple => [side * halfWidth, bottom, z + shift];
  const upper = (side: number): Triple => [side * halfWidth, top, z - shift];
  return [
    block(
      [halfWidth * 2, rise / Math.cos(lean), 0.012],
      shades.glass,
      [0, (bottom + top) / 2, z],
      [-lean, 0, 0],
    ),
    tube(lower(1), upper(1), 0.016, frame, 6),
    tube(lower(-1), upper(-1), 0.016, frame, 6),
    tube(upper(-1), upper(1), 0.016, frame, 6),
  ];
};

const buildLamps = (
  positions: readonly Triple[],
  radius: number,
  colour: ColorRepresentation,
  facing: number,
): ModelPart[] =>
  positions.flatMap(([x, y, z]) => [
    lens(radius * 1.25, 0.03, shades.chrome, [x, y, z - facing * 0.01]),
    lens(radius, 0.04, colour, [x, y, z]),
  ]);

const buildPlate = (
  z: number,
  y: number,
  colour: ColorRepresentation,
): ModelPart[] => [
  block([0.2, 0.06, 0.012], colour, [0, y, z]),
  block([0.14, 0.012, 0.014], shades.black, [0, y, z]),
];

interface ChequerSpec {
  halfWidth: number;
  from: number;
  to: number;
  bottom: number;
  columns: number;
  rows: number;
  size: number;
  colours: readonly [ColorRepresentation, ColorRepresentation];
}

const buildChequers = ({
  halfWidth,
  from,
  to,
  bottom,
  columns,
  rows,
  size,
  colours,
}: ChequerSpec): ModelPart[] => {
  const step = (to - from) / columns;
  return bothSides((side) =>
    Array.from({ length: columns * rows }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return block([0.012, size, step], colours[(column + row) % 2], [
        side * halfWidth,
        bottom + size * (row + 0.5),
        from + step * (column + 0.5),
      ]);
    }),
  );
};

interface Pane {
  from: number;
  to: number;
  bottom: number;
  top: number;
}

const buildSideWindows = (
  halfWidth: number,
  panes: readonly Pane[],
  frame: ColorRepresentation = shades.frame,
): ModelPart[] =>
  bothSides((side) =>
    panes.flatMap(({ from, to, bottom, top }) => [
      block([0.012, top - bottom + 0.03, to - from + 0.03], frame, [
        side * halfWidth,
        (bottom + top) / 2,
        (from + to) / 2,
      ]),
      block([0.014, top - bottom, to - from], shades.glass, [
        side * (halfWidth + 0.003),
        (bottom + top) / 2,
        (from + to) / 2,
      ]),
    ]),
  );

const buildEndWindows = (
  z: number,
  facing: number,
  panes: readonly {
    x: number;
    halfWidth: number;
    bottom: number;
    top: number;
  }[],
): ModelPart[] =>
  panes.flatMap(({ x, halfWidth, bottom, top }) => [
    block([halfWidth * 2 + 0.03, top - bottom + 0.03, 0.012], shades.frame, [
      x,
      (bottom + top) / 2,
      z,
    ]),
    block([halfWidth * 2, top - bottom, 0.014], shades.glass, [
      x,
      (bottom + top) / 2,
      z + facing * 0.003,
    ]),
  ]);

const assemble = (
  geometries: readonly BufferGeometry[],
  parts: ModelPart[],
): BufferGeometry =>
  mergeGeometries([...geometries, buildModelGeometry(parts)]);

const buildBicycle = (colour: string): BufferGeometry => {
  const radius = 0.18;
  const axleHeight = radius + ground;
  const crank: Triple = [0, axleHeight + 0.01, -0.03];
  const seatJoint: Triple = [0, 0.44, -0.1];
  const headTop: Triple = [0, 0.52, 0.18];
  const headBottom: Triple = [0, 0.4, 0.215];
  return buildModelGeometry([
    ...buildSpokedWheel({ radius, z: -0.27 }),
    ...buildSpokedWheel({ radius, z: 0.27 }),
    tube(crank, seatJoint, 0.017, colour),
    tube(crank, headBottom, 0.02, colour),
    tube(seatJoint, headTop, 0.017, colour),
    tube(headTop, headBottom, 0.024, colour),
    ...bothSides((side) => [
      tube(
        [side * 0.035, axleHeight, -0.27],
        [side * 0.02, crank[1], crank[2]],
        0.011,
        colour,
        6,
      ),
      tube(
        [side * 0.035, axleHeight, -0.27],
        [side * 0.012, seatJoint[1], seatJoint[2]],
        0.011,
        colour,
        6,
      ),
      tube(
        [side * 0.03, axleHeight, 0.27],
        [side * 0.015, headBottom[1], headBottom[2]],
        0.013,
        colour,
        6,
      ),
    ]),
    tube(seatJoint, [0, 0.47, -0.105], 0.01, shades.chrome, 6),
    ball(1, shades.black, [0, 0.477, -0.1], [0.055, 0.024, 0.1]),
    tube(headTop, [0, 0.59, 0.17], 0.013, shades.chrome, 6),
    ...buildHandlebar([0, 0.59, 0.17], 0.17, shades.black),
    ball(0.02, shades.yellow, [0.09, 0.615, 0.17]),
    {
      geometry: new TorusGeometry(0.05, 0.008, 4, 18),
      colour: shades.chrome,
      position: [0.04, crank[1], crank[2]],
      rotation: [0, Math.PI / 2, 0],
    },
    tube(
      [0.045, crank[1] + 0.05, crank[2]],
      [0.045, axleHeight + 0.02, -0.27],
      0.005,
      shades.frame,
      3,
    ),
    tube(
      [0.045, crank[1] - 0.05, crank[2]],
      [0.045, axleHeight - 0.02, -0.27],
      0.005,
      shades.frame,
      3,
    ),
    ...buildPedals(crank, 0.075),
    buildMudguard(radius + 0.02, 0.05, [0, axleHeight, -0.27], colour, 0.1, 2),
    buildMudguard(radius + 0.02, 0.05, [0, axleHeight, 0.27], colour, 1.2, 1.7),
    lens(0.022, 0.03, shades.headlight, [0, 0.47, 0.245]),
    block([0.03, 0.025, 0.01], shades.tailLight, [0, 0.42, -0.12]),
    block([0.2, 0.1, 0.14], "#d7a86e", [0, 0.53, 0.33]),
    block([0.21, 0.015, 0.15], "#a8743f", [0, 0.585, 0.33]),
    tube([0, 0.48, 0.3], [0, axleHeight, 0.27], 0.006, shades.chrome, 4),
    ball(0.03, "#ff80ab", [-0.05, 0.6, 0.33]),
    ball(0.03, "#fff176", [0.04, 0.6, 0.35]),
    ball(0.025, "#81d4fa", [0.01, 0.61, 0.3]),
  ]);
};

const buildTandemBicycle = (colour: string): BufferGeometry => {
  const radius = 0.18;
  const axleHeight = radius + ground;
  const frontCrank: Triple = [0, axleHeight + 0.01, 0.1];
  const backCrank: Triple = [0, axleHeight + 0.01, -0.25];
  const frontSeat: Triple = [0, 0.44, 0.03];
  const backSeat: Triple = [0, 0.44, -0.33];
  const headTop: Triple = [0, 0.52, 0.4];
  const headBottom: Triple = [0, 0.4, 0.435];
  return buildModelGeometry([
    ...buildSpokedWheel({ radius, z: -0.5 }),
    ...buildSpokedWheel({ radius, z: 0.5 }),
    tube(frontCrank, frontSeat, 0.017, colour),
    tube(backCrank, backSeat, 0.017, colour),
    tube(frontCrank, headBottom, 0.02, colour),
    tube(backCrank, frontCrank, 0.02, colour),
    tube(backSeat, frontSeat, 0.017, colour),
    tube(frontSeat, headTop, 0.017, colour),
    tube(backCrank, frontSeat, 0.016, colour),
    tube(headTop, headBottom, 0.024, colour),
    ...bothSides((side) => [
      tube(
        [side * 0.035, axleHeight, -0.5],
        [side * 0.02, backCrank[1], backCrank[2]],
        0.011,
        colour,
        6,
      ),
      tube(
        [side * 0.035, axleHeight, -0.5],
        [side * 0.012, backSeat[1], backSeat[2]],
        0.011,
        colour,
        6,
      ),
      tube(
        [side * 0.03, axleHeight, 0.5],
        [side * 0.015, headBottom[1], headBottom[2]],
        0.013,
        colour,
        6,
      ),
    ]),
    ...[frontSeat, backSeat].flatMap((seat): ModelPart[] => [
      tube(seat, [0, 0.47, seat[2] - 0.005], 0.01, shades.chrome, 6),
      ball(1, shades.black, [0, 0.477, seat[2]], [0.055, 0.024, 0.1]),
    ]),
    tube(headTop, [0, 0.59, 0.39], 0.013, shades.chrome, 6),
    ...buildHandlebar([0, 0.59, 0.39], 0.17, shades.black),
    tube([0, 0.47, 0.025], [0, 0.56, -0.02], 0.011, shades.chrome, 6),
    ...buildHandlebar([0, 0.56, -0.02], 0.13, "#ffb300"),
    ball(0.02, shades.yellow, [0.09, 0.615, 0.39]),
    ...[frontCrank, backCrank].flatMap((crank): ModelPart[] => [
      {
        geometry: new TorusGeometry(0.05, 0.008, 4, 18),
        colour: shades.chrome,
        position: [0.04, crank[1], crank[2]],
        rotation: [0, Math.PI / 2, 0],
      },
      ...buildPedals(crank, 0.075),
    ]),
    tube(
      [0.045, backCrank[1] + 0.05, backCrank[2]],
      [0.045, axleHeight + 0.02, -0.5],
      0.005,
      shades.frame,
      3,
    ),
    tube(
      [0.045, backCrank[1] - 0.05, backCrank[2]],
      [0.045, axleHeight - 0.02, -0.5],
      0.005,
      shades.frame,
      3,
    ),
    tube(
      [-0.045, frontCrank[1] + 0.05, frontCrank[2]],
      [-0.045, backCrank[1] + 0.05, backCrank[2]],
      0.005,
      shades.frame,
      3,
    ),
    buildMudguard(radius + 0.02, 0.05, [0, axleHeight, -0.5], colour, 0.1, 2),
    buildMudguard(radius + 0.02, 0.05, [0, axleHeight, 0.5], colour, 1.2, 1.7),
    lens(0.022, 0.03, shades.headlight, [0, 0.47, 0.465]),
    block([0.03, 0.025, 0.01], shades.tailLight, [0, 0.42, -0.35]),
    block([0.16, 0.012, 0.16], shades.chrome, [0, 0.4, -0.55]),
    tube([0, 0.4, -0.48], [0, axleHeight, -0.5], 0.006, shades.chrome, 4),
    block([0.16, 0.1, 0.14], "#ef5350", [0, 0.455, -0.55]),
  ]);
};

const buildPennyFarthing = (colour: string): BufferGeometry => {
  const bigRadius = 0.42;
  const smallRadius = 0.12;
  const bigHub: Triple = [0, bigRadius + ground, 0.16];
  const smallHub: Triple = [0, smallRadius + ground, -0.46];
  const head: Triple = [0, 0.9, 0.12];
  const brass = "#d4a73a";
  const backbone = Array.from({ length: 7 }, (_, step): Triple => {
    const share = step / 6;
    const control: Triple = [0, 0.95, -0.38];
    const end: Triple = [0, smallHub[1] + 0.06, smallHub[2] + 0.02];
    const mix = (index: 0 | 1 | 2) =>
      (1 - share) ** 2 * head[index] +
      2 * (1 - share) * share * control[index] +
      share ** 2 * end[index];
    return [mix(0), mix(1), mix(2)];
  });
  return buildModelGeometry([
    ...buildSpokedWheel({
      radius: bigRadius,
      z: bigHub[2],
      thickness: 0.026,
      spokes: 14,
      hubWidth: 0.12,
      tyre: "#f3ead7",
      rim: colour,
      hub: brass,
    }),
    ...buildSpokedWheel({
      radius: smallRadius,
      z: smallHub[2],
      thickness: 0.018,
      spokes: 5,
      tyre: "#f3ead7",
      rim: colour,
      hub: brass,
    }),
    ...bentTube(backbone, 0.02, colour),
    ...bothSides((side) => [
      tube(
        [side * 0.06, bigHub[1], bigHub[2]],
        [side * 0.035, head[1], head[2]],
        0.016,
        colour,
        6,
      ),
      tube(
        [side * 0.03, smallHub[1], smallHub[2]],
        [0, smallHub[1] + 0.08, smallHub[2] + 0.04],
        0.01,
        colour,
        6,
      ),
      tube(
        [side * 0.065, bigHub[1], bigHub[2]],
        [side * 0.07, bigHub[1] - side * 0.08, bigHub[2] + side * 0.05],
        0.01,
        brass,
        5,
      ),
      block([0.05, 0.015, 0.035], shades.black, [
        side * 0.1,
        bigHub[1] - side * 0.08,
        bigHub[2] + side * 0.05,
      ]),
    ]),
    tube([-0.04, head[1], head[2]], [0.04, head[1], head[2]], 0.025, colour),
    tube(head, [0, 0.98, 0.15], 0.014, colour, 6),
    ...bentTube(
      [
        [-0.22, 0.94, 0.08],
        [-0.1, 0.975, 0.14],
        [0.1, 0.975, 0.14],
        [0.22, 0.94, 0.08],
      ],
      0.011,
      shades.chrome,
      6,
    ),
    ...bothSides((side) => [
      tube(
        [side * 0.18, 0.95, 0.09],
        [side * 0.25, 0.93, 0.065],
        0.02,
        shades.darkWood,
        8,
      ),
    ]),
    ball(1, shades.darkWood, [0, 0.925, -0.04], [0.06, 0.026, 0.11]),
    tube([0, 0.9, -0.08], [0, 0.88, -0.12], 0.008, brass, 4),
    ball(0.02, brass, [0.06, 0.96, 0.13]),
    lens(0.035, 0.04, brass, [0, 0.82, 0.2]),
    lens(0.026, 0.045, shades.headlight, [0, 0.82, 0.205]),
    block([0.05, 0.012, 0.04], shades.black, [0, 0.3, -0.38]),
  ]);
};

const buildTricycle = (colour: string): BufferGeometry => {
  const frontRadius = 0.19;
  const backRadius = 0.13;
  const frontHub: Triple = [0, frontRadius + ground, 0.25];
  const backHeight = backRadius + ground;
  const head: Triple = [0, 0.5, 0.2];
  return buildModelGeometry([
    ...buildRoadWheel({
      radius: frontRadius,
      width: 0.06,
      x: 0,
      z: frontHub[2],
      rim: shades.white,
      hubcap: colour,
    }),
    ...buildRoadWheels(
      [0.24, -0.24].map((x) => ({
        radius: backRadius,
        width: 0.05,
        x,
        z: -0.3,
        rim: shades.white,
        hubcap: colour,
      })),
    ),
    tube([-0.24, backHeight, -0.3], [0.24, backHeight, -0.3], 0.014, colour),
    ...bentTube(
      [[0, backHeight + 0.02, -0.3], [0, 0.3, -0.1], [0, 0.38, 0.1], head],
      0.024,
      colour,
    ),
    ...bothSides((side) => [
      tube(
        [side * 0.045, frontHub[1], frontHub[2]],
        [side * 0.02, head[1] - 0.02, head[2]],
        0.015,
        colour,
        6,
      ),
    ]),
    tube([0, 0.3, -0.08], [0, 0.4, -0.06], 0.014, shades.chrome, 6),
    ball(1, shades.black, [0, 0.4, -0.06], [0.08, 0.03, 0.09]),
    tube(head, [0, 0.56, 0.19], 0.014, shades.chrome, 6),
    ...buildHandlebar([0, 0.56, 0.19], 0.16, "#ec407a"),
    ...bothSides((side) =>
      [0, 1, 2].map((streamer) =>
        tube(
          [side * 0.17, 0.57, 0.135],
          [side * (0.2 + streamer * 0.02), 0.5 - streamer * 0.02, 0.07],
          0.005,
          ["#ff4081", "#ffeb3b", "#40c4ff"][streamer],
          3,
        ),
      ),
    ),
    ...bothSides((side) => [
      tube(
        [side * 0.07, frontHub[1], frontHub[2]],
        [side * 0.08, frontHub[1] - side * 0.06, frontHub[2] + side * 0.04],
        0.009,
        shades.chrome,
        5,
      ),
      block([0.05, 0.014, 0.035], shades.black, [
        side * 0.1,
        frontHub[1] - side * 0.06,
        frontHub[2] + side * 0.04,
      ]),
    ]),
    block([0.34, 0.025, 0.16], colour, [0, 0.22, -0.32]),
    block([0.3, 0.08, 0.13], "#ffca28", [0, 0.27, -0.32]),
    block([0.31, 0.015, 0.14], darken("#ffca28", 0.2), [0, 0.312, -0.32]),
    buildMudguard(frontRadius + 0.02, 0.07, frontHub, colour, 1.1, 1.8),
    ball(0.022, shades.yellow, [0.08, 0.585, 0.19]),
  ]);
};

const buildKickScooter = (colour: string): BufferGeometry => {
  const wheelRadius = 0.065;
  const wheelHeight = wheelRadius + ground;
  const deck = buildBody({
    keys: [
      { z: -0.33, halfWidth: 0.055, bottom: 0.07, top: 0.095 },
      { z: -0.3, halfWidth: 0.075, bottom: 0.06, top: 0.1 },
      { z: 0.24, halfWidth: 0.075, bottom: 0.06, top: 0.1 },
      { z: 0.29, halfWidth: 0.05, bottom: 0.07, top: 0.11 },
    ],
    stations: 12,
    around: 20,
    squareness: 4,
    paint: (spot, section) =>
      findUpness(spot, section) > 0.6 && Math.abs(spot.x) < 0.065
        ? new Color(shades.black)
        : new Color(colour),
  });
  return assemble(
    [deck],
    [
      ...buildRoadWheel({
        radius: wheelRadius,
        width: 0.035,
        x: 0,
        z: -0.37,
        rim: shades.white,
        hubcap: colour,
      }),
      ...buildRoadWheel({
        radius: wheelRadius,
        width: 0.035,
        x: 0,
        z: 0.37,
        rim: shades.white,
        hubcap: colour,
      }),
      ...bothSides((side) => [
        tube(
          [side * 0.03, wheelHeight, -0.37],
          [side * 0.03, 0.085, -0.3],
          0.008,
          shades.frame,
          5,
        ),
        tube(
          [side * 0.03, wheelHeight, 0.37],
          [side * 0.02, 0.17, 0.355],
          0.01,
          shades.chrome,
          6,
        ),
      ]),
      buildMudguard(
        wheelRadius + 0.012,
        0.045,
        [0, wheelHeight, -0.37],
        colour,
        0.4,
        1.6,
      ),
      block([0.06, 0.02, 0.06], shades.frame, [0, 0.1, 0.3]),
      tube([0, 0.1, 0.3], [0, 0.17, 0.355], 0.018, shades.frame, 8),
      tube([0, 0.17, 0.355], [0, 0.78, 0.31], 0.017, shades.chrome, 10),
      post(0.024, 0.05, colour, [0, 0.42, 0.333]),
      tube([0, 0.42, 0.333], [0.035, 0.43, 0.36], 0.006, colour, 4),
      ...buildHandlebar([0, 0.78, 0.31], 0.18, colour),
      ball(0.018, shades.yellow, [0.07, 0.8, 0.31]),
      lens(0.02, 0.025, shades.headlight, [0, 0.66, 0.33]),
      block([0.03, 0.015, 0.01], shades.tailLight, [0, 0.1, -0.335]),
      tube([0.06, 0.07, -0.05], [0.1, 0.02, -0.1], 0.006, shades.frame, 4),
    ],
  );
};

const buildSkateboard = (colour: string): BufferGeometry => {
  const bolt = new Color(shades.yellow);
  const maple = new Color("#e8c9a0");
  const deckColour = new Color(colour);
  const underside = lighten(colour, 0.35);
  const deck = buildBody({
    keys: [
      { z: -0.4, halfWidth: 0.07, bottom: 0.13, top: 0.145 },
      { z: -0.36, halfWidth: 0.1, bottom: 0.115, top: 0.13 },
      { z: -0.28, halfWidth: 0.11, bottom: 0.09, top: 0.105 },
      { z: 0.28, halfWidth: 0.11, bottom: 0.09, top: 0.105 },
      { z: 0.36, halfWidth: 0.1, bottom: 0.115, top: 0.13 },
      { z: 0.4, halfWidth: 0.07, bottom: 0.13, top: 0.145 },
    ],
    stations: 26,
    around: 20,
    squareness: 5,
    paint: (spot, section) => {
      const upness = findUpness(spot, section);
      if (findAcross(spot, section) > 0.93 && Math.abs(upness) < 0.6) {
        return maple;
      }
      if (upness < 0) {
        return Math.floor((spot.z + 0.4) / 0.1) % 2 === 0
          ? underside
          : deckColour;
      }
      const zigzag = 0.04 * Math.sin(spot.z * 22);
      return Math.abs(spot.x - zigzag) < 0.022 && Math.abs(spot.z) < 0.3
        ? bolt
        : deckColour;
    },
  });
  const wheelRadius = 0.035;
  const wheelHeight = wheelRadius + ground;
  return assemble(
    [deck],
    [-0.22, 0.22].flatMap((z): ModelPart[] => [
      block([0.075, 0.012, 0.08], shades.frame, [0, 0.084, z]),
      ball(0.02, shades.rim, [0, 0.068, z], [1.6, 0.8, 1.2], [0, 0, 0], [8, 6]),
      tube(
        [-0.09, wheelHeight + 0.01, z],
        [0.09, wheelHeight + 0.01, z],
        0.016,
        shades.rim,
        8,
      ),
      tube(
        [-0.125, wheelHeight, z],
        [0.125, wheelHeight, z],
        0.006,
        shades.chrome,
        6,
      ),
      ...[0.1, -0.1].flatMap((x) => [
        axle(wheelRadius, 0.035, "#ffee58", [x, wheelHeight, z]),
        axle(0.014, 0.038, shades.frame, [x, wheelHeight, z], 8),
      ]),
    ]),
  );
};

const buildMotorcycle = (colour: string): BufferGeometry => {
  const radius = 0.21;
  const axleHeight = radius + ground;
  const accent = "#ef5350";
  const wheel = (z: number): ModelPart[] => [
    {
      geometry: new TorusGeometry(radius - 0.048, 0.048, 8, 24),
      colour: shades.tyre,
      position: [0, axleHeight, z],
      rotation: [0, Math.PI / 2, 0],
      scale: [1, 1, 0.9],
    },
    ...buildSpokedWheel({
      radius: radius - 0.085,
      z,
      thickness: 0.012,
      spokes: 8,
      hubWidth: 0.09,
    }).map((part) => ({
      ...part,
      position: [0, axleHeight, z] satisfies Triple,
    })),
    axle(0.075, 0.012, shades.rim, [0.05, axleHeight, z]),
  ];
  return buildModelGeometry([
    ...wheel(-0.4),
    ...wheel(0.4),
    ball(1, colour, [0, 0.6, 0.08], [0.12, 0.085, 0.2]),
    ball(1, accent, [0, 0.6, 0.08], [0.125, 0.03, 0.16]),
    ball(1, shades.black, [0, 0.51, -0.17], [0.11, 0.035, 0.2]),
    ball(1, colour, [0, 0.5, -0.38], [0.1, 0.05, 0.12]),
    block([0.2, 0.18, 0.24], shades.frame, [0, 0.35, 0.0]),
    ...[-0.06, 0.06].flatMap((z) =>
      [0, 1, 2, 3].map((fin) =>
        block(
          [0.16, 0.012, 0.09],
          shades.rim,
          [0, 0.46 + fin * 0.03, z],
          [z * 3, 0, 0],
        ),
      ),
    ),
    axle(0.06, 0.06, shades.rim, [-0.11, 0.32, 0.02]),
    ...bentTube(
      [
        [0.08, 0.3, 0.12],
        [0.13, 0.22, 0.0],
        [0.14, 0.22, -0.3],
      ],
      0.022,
      shades.chrome,
    ),
    tube([0.14, 0.24, -0.25], [0.14, 0.28, -0.52], 0.04, shades.chrome, 12),
    ...bothSides((side) => [
      tube(
        [side * 0.05, axleHeight, 0.4],
        [side * 0.05, 0.64, 0.29],
        0.018,
        shades.chrome,
        8,
      ),
      tube(
        [side * 0.05, axleHeight, -0.4],
        [side * 0.07, 0.34, -0.08],
        0.016,
        shades.black,
        6,
      ),
      tube(
        [side * 0.07, axleHeight + 0.02, -0.38],
        [side * 0.08, 0.5, -0.28],
        0.022,
        accent,
        8,
      ),
      block([0.06, 0.012, 0.03], shades.frame, [side * 0.12, 0.26, -0.05]),
    ]),
    ...bentTube(
      [
        [0, 0.64, 0.29],
        [0, 0.6, 0.12],
        [0, 0.52, -0.05],
        [0, 0.48, -0.3],
      ],
      0.018,
      shades.black,
    ),
    buildMudguard(radius + 0.02, 0.1, [0, axleHeight, 0.4], colour, 1.3, 1.6),
    buildMudguard(
      radius + 0.02,
      0.11,
      [0, axleHeight, -0.4],
      colour,
      0.25,
      1.4,
    ),
    tube([0, 0.64, 0.29], [0, 0.7, 0.27], 0.02, shades.chrome, 8),
    ...buildHandlebar([0, 0.7, 0.27], 0.25, shades.black),
    ...buildLamps([[0, 0.6, 0.355]], 0.055, shades.headlight, 1),
    ...bothSides((side) => [
      ...buildMirror([side * 0.15, 0.71, 0.27], [side * 0.2, 0.82, 0.25]),
      ball(0.018, shades.indicator, [side * 0.09, 0.56, 0.35]),
      ball(0.016, shades.indicator, [side * 0.08, 0.47, -0.48]),
    ]),
    block([0.08, 0.04, 0.02], shades.tailLight, [0, 0.52, -0.5]),
    block([0.14, 0.07, 0.01], shades.plate, [0, 0.43, -0.5], [0.3, 0, 0]),
    ball(1, "#111111", [0, 0.67, 0.31], [0.07, 0.04, 0.03]),
  ]);
};

const buildMoped = (colour: string): BufferGeometry => {
  const radius = 0.14;
  const frontZ = 0.38;
  const backZ = -0.36;
  const axleHeight = radius + ground;
  const cream = "#fff8e1";
  const shell = buildBody({
    keys: [
      { z: -0.52, halfWidth: 0.09, bottom: 0.26, top: 0.38 },
      { z: -0.46, halfWidth: 0.17, bottom: 0.2, top: 0.43 },
      { z: -0.2, halfWidth: 0.19, bottom: 0.18, top: 0.44 },
      { z: -0.04, halfWidth: 0.13, bottom: 0.2, top: 0.38 },
    ],
    stations: 16,
    around: 24,
    squareness: 2.4,
    paint: paintCarBody({
      body: colour,
      wheels: [{ radius, width: 0.08, x: 0, z: backZ }],
      livery: ({ y }) => (y < 0.25 ? new Color(cream) : undefined),
    }),
  });
  return assemble(
    [shell],
    [
      ...[frontZ, backZ].flatMap((z) =>
        buildRoadWheel({ radius, width: 0.08, x: 0, z, rim: cream }),
      ),
      block([0.24, 0.04, 0.36], shades.black, [0, 0.2, 0.08]),
      block([0.26, 0.03, 0.38], colour, [0, 0.175, 0.08]),
      block([0.34, 0.46, 0.04], colour, [0, 0.42, 0.26], [-0.22, 0, 0]),
      block([0.3, 0.04, 0.03], cream, [0, 0.62, 0.22], [-0.22, 0, 0]),
      ball(1, colour, [0, axleHeight + 0.12, frontZ], [0.06, 0.06, 0.15]),
      ...bothSides((side) => [
        tube(
          [side * 0.05, axleHeight, frontZ],
          [side * 0.02, 0.48, 0.3],
          0.013,
          shades.frame,
          6,
        ),
      ]),
      tube([0, 0.45, 0.3], [0, 0.69, 0.27], 0.02, shades.frame, 8),
      ball(1, colour, [0, 0.72, 0.28], [0.12, 0.05, 0.07]),
      ...buildHandlebar([0, 0.72, 0.27], 0.23, shades.black, colour),
      ...buildLamps([[0, 0.72, 0.35]], 0.04, shades.headlight, 1),
      ...bothSides((side) => [
        ...buildMirror([side * 0.12, 0.74, 0.27], [side * 0.17, 0.86, 0.26]),
        ball(0.015, shades.indicator, [side * 0.12, 0.7, 0.33]),
      ]),
      ball(1, "#795548", [0, 0.46, -0.24], [0.13, 0.04, 0.2]),
      block([0.26, 0.015, 0.16], shades.chrome, [0, 0.45, -0.46]),
      block([0.24, 0.16, 0.16], cream, [0, 0.545, -0.46]),
      block([0.25, 0.02, 0.17], colour, [0, 0.63, -0.46]),
      block([0.08, 0.03, 0.02], shades.tailLight, [0, 0.4, -0.52]),
      block([0.12, 0.06, 0.01], shades.plate, [0, 0.32, -0.525]),
      tube([0.1, 0.18, -0.2], [0.12, 0.17, -0.45], 0.025, shades.chrome, 10),
    ],
  );
};

const buildQuadBike = (colour: string): BufferGeometry => {
  const wheels = fourWheels(
    { radius: 0.17, width: 0.15, lugs: 12, rim: shades.black },
    0.33,
    0.36,
    -0.36,
  );
  const body = buildBody({
    keys: [
      { z: -0.5, halfWidth: 0.18, bottom: 0.26, top: 0.44 },
      { z: -0.42, halfWidth: 0.22, bottom: 0.22, top: 0.48 },
      { z: -0.05, halfWidth: 0.2, bottom: 0.22, top: 0.46 },
      { z: 0.36, halfWidth: 0.22, bottom: 0.24, top: 0.5 },
      { z: 0.5, halfWidth: 0.17, bottom: 0.28, top: 0.44 },
    ],
    stations: 20,
    around: 24,
    squareness: 3,
    paint: paintCarBody({ body: colour }),
  });
  return assemble(
    [body],
    [
      ...buildRoadWheels(wheels),
      ...wheels.map((wheel) =>
        ball(
          1,
          colour,
          [wheel.x, findWheelHeight(wheel) + 0.17, wheel.z],
          [0.1, 0.035, 0.2],
        ),
      ),
      ...[0.36, -0.36].map((z) =>
        tube([-0.33, 0.19, z], [0.33, 0.19, z], 0.02, shades.frame),
      ),
      ball(1, shades.black, [0, 0.52, -0.1], [0.14, 0.045, 0.24]),
      ...bothSides((side) => [
        block([0.12, 0.02, 0.24], shades.frame, [side * 0.26, 0.24, 0]),
        tube(
          [side * 0.2, 0.52, 0.45],
          [side * 0.2, 0.52, 0.25],
          0.012,
          shades.black,
          6,
        ),
        tube(
          [side * 0.2, 0.52, -0.5],
          [side * 0.2, 0.52, -0.28],
          0.012,
          shades.black,
          6,
        ),
      ]),
      ...[0.45, 0.35, 0.25].map((z) =>
        tube([-0.2, 0.52, z], [0.2, 0.52, z], 0.01, shades.black, 5),
      ),
      ...[-0.5, -0.4, -0.3].map((z) =>
        tube([-0.2, 0.52, z], [0.2, 0.52, z], 0.01, shades.black, 5),
      ),
      tube([0, 0.46, 0.2], [0, 0.66, 0.2], 0.02, shades.frame, 8),
      ...buildHandlebar([0, 0.66, 0.2], 0.28, shades.black, shades.frame),
      ...buildLamps(
        [
          [0.1, 0.4, 0.5],
          [-0.1, 0.4, 0.5],
        ],
        0.035,
        shades.headlight,
        1,
      ),
      block([0.16, 0.04, 0.03], shades.tailLight, [0, 0.38, -0.5]),
      tube([0.12, 0.28, -0.3], [0.14, 0.3, -0.56], 0.025, shades.chrome, 10),
    ],
  );
};

const buildHorseAndCart = (colour: string): BufferGeometry => {
  const coat = "#a0522d";
  const mane = "#fff3d6";
  const hoof = "#3e2723";
  const harness = "#c62828";
  const plank = lighten(colour, 0.15);
  const wheelRadius = 0.32;
  const wheelHeight = wheelRadius + ground;
  const cartZ = -0.65;
  const horse: ModelPart[] = [
    ball(1, coat, [0, 0.64, 0.46], [0.17, 0.19, 0.36]),
    ...bothSides((side) =>
      [0.24, -0.24].flatMap((offset): ModelPart[] => [
        tube(
          [side * 0.09, 0.6, 0.46 + offset],
          [side * 0.09, 0.07, 0.46 + offset],
          0.042,
          coat,
          8,
        ),
        ball(
          0.048,
          coat,
          [side * 0.09, 0.3, 0.46 + offset],
          1,
          [0, 0, 0],
          [8, 6],
        ),
        post(0.05, 0.07, hoof, [side * 0.09, 0.039, 0.47 + offset]),
        post(0.055, 0.03, mane, [side * 0.09, 0.09, 0.47 + offset]),
      ]),
    ),
    tube([0, 0.72, 0.68], [0, 1.0, 0.88], 0.09, coat, 10),
    ball(0.09, coat, [0, 1.0, 0.88]),
    ball(1, coat, [0, 1.02, 0.98], [0.075, 0.085, 0.16], [0.6, 0, 0]),
    ball(1, darken(coat, 0.2), [0, 0.95, 1.08], [0.07, 0.065, 0.07]),
    ...bothSides((side) => [
      {
        geometry: new ConeGeometry(0.025, 0.07, 6),
        colour: coat,
        position: [side * 0.04, 1.13, 0.9] satisfies Triple,
      },
      ball(
        0.022,
        shades.white,
        [side * 0.068, 1.05, 0.98],
        1,
        [0, 0, 0],
        [8, 6],
      ),
      ball(
        0.014,
        shades.black,
        [side * 0.082, 1.055, 0.99],
        1,
        [0, 0, 0],
        [6, 4],
      ),
      block([0.012, 0.04, 0.04], shades.black, [side * 0.085, 1.06, 0.95]),
      ball(
        0.01,
        shades.black,
        [side * 0.035, 0.94, 1.14],
        1,
        [0, 0, 0],
        [6, 4],
      ),
      tube(
        [side * 0.07, 0.98, 1.02],
        [side * 0.12, 0.7, -0.25],
        0.006,
        shades.darkWood,
        3,
      ),
    ]),
    ...[0, 1, 2, 3, 4, 5].map((tuft) =>
      block(
        [0.04, 0.07, 0.07],
        mane,
        [0, 0.82 + tuft * 0.045, 0.64 + tuft * 0.04],
        [0.75, 0, 0],
      ),
    ),
    block([0.07, 0.05, 0.06], mane, [0, 1.11, 0.96]),
    tube([0, 0.74, 0.12], [0, 0.42, 0.04], 0.04, mane, 8),
    ball(0.045, mane, [0, 0.42, 0.04]),
    {
      geometry: new TorusGeometry(0.11, 0.025, 6, 16),
      colour: harness,
      position: [0, 0.78, 0.72] satisfies Triple,
      rotation: [0.75, 0, 0] satisfies Triple,
    },
    block([0.36, 0.03, 0.2], harness, [0, 0.82, 0.42]),
    block([0.37, 0.012, 0.21], shades.yellow, [0, 0.8, 0.42]),
    {
      geometry: new TorusGeometry(0.08, 0.008, 4, 14),
      colour: harness,
      position: [0, 1.0, 1.02] satisfies Triple,
      rotation: [0.9, 0, 0] satisfies Triple,
    },
  ];
  const cart: ModelPart[] = [
    ...[0.47, -0.47].flatMap((x) =>
      buildSpokedWheel({
        radius: wheelRadius,
        z: cartZ,
        x,
        thickness: 0.03,
        spokes: 6,
        hubWidth: 0.1,
        tyre: shades.frame,
        rim: "#d84315",
        spoke: "#d84315",
        hub: shades.darkWood,
      }),
    ),
    tube(
      [-0.5, wheelHeight, cartZ],
      [0.5, wheelHeight, cartZ],
      0.025,
      shades.darkWood,
    ),
    block([0.82, 0.05, 0.9], colour, [0, 0.5, cartZ]),
    ...bothSides((side) => [
      block([0.04, 0.08, 0.9], plank, [side * 0.39, 0.57, cartZ]),
      block([0.04, 0.08, 0.9], colour, [side * 0.39, 0.66, cartZ]),
      tube(
        [side * 0.33, 0.5, -0.2],
        [side * 0.3, 0.64, 0.78],
        0.022,
        shades.wood,
        6,
      ),
    ]),
    block([0.82, 0.16, 0.04], plank, [0, 0.6, -1.08]),
    block([0.82, 0.16, 0.04], plank, [0, 0.6, -0.22]),
    block([0.64, 0.06, 0.18], shades.wood, [0, 0.63, -0.33]),
    block([0.66, 0.02, 0.19], "#43a047", [0, 0.665, -0.33]),
    block([0.3, 0.16, 0.24], "#f2c94c", [-0.15, 0.6, -0.85]),
    block([0.3, 0.16, 0.24], "#e9bd3c", [0.17, 0.6, -0.88]),
    block([0.3, 0.14, 0.24], "#f2c94c", [0, 0.75, -0.86]),
    post(0.08, 0.2, "#cfd8dc", [0.2, 0.62, -0.58]),
    post(0.05, 0.04, "#cfd8dc", [0.2, 0.74, -0.58]),
    block([0.22, 0.08, 0.14], shades.darkWood, [-0.17, 0.57, -0.58]),
    ...[-0.24, -0.17, -0.1].map((x, index) =>
      ball(0.03, ["#e53935", "#7cb342", "#e53935"][index], [x, 0.63, -0.58]),
    ),
  ];
  return buildModelGeometry([...horse, ...cart]);
};

interface OpenCarSpec {
  colour: string;
  keys: readonly BodySection[];
  stations: number;
  around?: number;
  squareness?: number;
  wheels: readonly WheelSpec[];
  openings: readonly Opening[];
  livery?: (spot: Spot, section: BodySection) => Color | undefined;
  parts: ModelPart[];
  geometries?: readonly BufferGeometry[];
}

const buildOpenCar = ({
  colour,
  keys,
  stations,
  around = 32,
  squareness = 3,
  wheels,
  openings,
  livery,
  parts,
  geometries = [],
}: OpenCarSpec): BufferGeometry =>
  assemble(
    [
      buildBody({
        keys,
        stations,
        around,
        squareness,
        paint: paintCarBody({ body: colour, openings, wheels, livery }),
      }),
      ...geometries,
    ],
    [...buildRoadWheels(wheels), ...parts],
  );

const familyCarRider: Triple = [0, 0.1, -0.12];

const buildFamilyCar = (colour: string): BufferGeometry => {
  const wheels = fourWheels({ radius: 0.17, width: 0.12 }, 0.37, 0.56, -0.56);
  const trim = lighten(colour, 0.45);
  return buildOpenCar({
    colour,
    keys: [
      { z: -0.85, halfWidth: 0.37, bottom: 0.17, top: 0.42 },
      { z: -0.79, halfWidth: 0.41, bottom: 0.13, top: 0.48 },
      { z: -0.35, halfWidth: 0.42, bottom: 0.12, top: 0.49 },
      { z: 0.25, halfWidth: 0.42, bottom: 0.12, top: 0.47 },
      { z: 0.78, halfWidth: 0.4, bottom: 0.13, top: 0.43 },
      { z: 0.85, halfWidth: 0.35, bottom: 0.16, top: 0.38 },
    ],
    stations: 30,
    wheels,
    openings: [{ from: -0.66, to: 0.2, halfWidth: 0.33 }],
    livery: (spot, section) => {
      const across = findAcross(spot, section);
      if (across > 0.9 && spot.y > 0.3 && spot.y < 0.33) {
        return trim;
      }
      if (across > 0.9 && Math.abs(spot.z + 0.2) < 0.012 && spot.y > 0.16) {
        return darken(colour, 0.3);
      }
      return undefined;
    },
    parts: [
      ...buildDriverSeat(familyCarRider, "#efebe9"),
      ...buildSteeringWheel(familyCarRider),
      ...buildWindscreen({
        z: 0.3,
        bottom: 0.47,
        top: 0.66,
        halfWidth: 0.36,
        lean: 0.45,
      }),
      block([0.66, 0.1, 0.22], "#efebe9", [0, 0.4, -0.52]),
      block([0.66, 0.22, 0.07], "#efebe9", [0, 0.52, -0.62], [-0.15, 0, 0]),
      ...[-0.18, 0.18].map((x) =>
        block([0.14, 0.07, 0.05], "#d7ccc8", [x, 0.66, -0.64]),
      ),
      tube([-0.36, 0.5, -0.75], [0.36, 0.5, -0.75], 0.05, shades.grille, 12),
      block([0.78, 0.06, 0.05], shades.chrome, [0, 0.18, 0.86]),
      block([0.78, 0.06, 0.05], shades.chrome, [0, 0.19, -0.86]),
      block([0.32, 0.08, 0.02], shades.grille, [0, 0.27, 0.855]),
      ...buildLamps(
        [
          [0.26, 0.31, 0.85],
          [-0.26, 0.31, 0.85],
        ],
        0.05,
        shades.headlight,
        1,
      ),
      ...bothSides((side) => [
        block([0.1, 0.05, 0.02], shades.tailLight, [side * 0.27, 0.37, -0.85]),
        block([0.05, 0.03, 0.02], shades.indicator, [side * 0.36, 0.25, 0.83]),
        ...buildMirror(
          [side * 0.41, 0.48, 0.2],
          [side * 0.45, 0.53, 0.18],
          colour,
        ),
        block([0.012, 0.02, 0.06], shades.chrome, [side * 0.425, 0.4, -0.1]),
      ]),
      ...buildPlate(0.87, 0.27, shades.plateWhite),
      ...buildPlate(-0.87, 0.27, shades.plate),
    ],
  });
};

const sportsCarRider: Triple = [0, 0.03, -0.18];

const buildSportsCar = (colour: string): BufferGeometry => {
  const wheels = fourWheels(
    { radius: 0.165, width: 0.15, rim: "#263238", hubcap: shades.yellow },
    0.37,
    0.58,
    -0.56,
  );
  const stripe = new Color(shades.white);
  const vent = new Color(shades.black);
  return buildOpenCar({
    colour,
    keys: [
      { z: -0.9, halfWidth: 0.36, bottom: 0.14, top: 0.36 },
      { z: -0.84, halfWidth: 0.42, bottom: 0.11, top: 0.42 },
      { z: -0.45, halfWidth: 0.43, bottom: 0.1, top: 0.43 },
      { z: -0.05, halfWidth: 0.43, bottom: 0.1, top: 0.4 },
      { z: 0.45, halfWidth: 0.42, bottom: 0.1, top: 0.31 },
      { z: 0.84, halfWidth: 0.38, bottom: 0.11, top: 0.24 },
      { z: 0.9, halfWidth: 0.3, bottom: 0.13, top: 0.2 },
    ],
    stations: 32,
    wheels,
    openings: [{ from: -0.44, to: 0.08, halfWidth: 0.3 }],
    livery: (spot, section) => {
      const upness = findUpness(spot, section);
      if (upness > 0.55 && Math.abs(Math.abs(spot.x) - 0.08) < 0.035) {
        return stripe;
      }
      if (
        findAcross(spot, section) > 0.85 &&
        spot.z > -0.36 &&
        spot.z < -0.2 &&
        spot.y > 0.2 &&
        spot.y < 0.32
      ) {
        return vent;
      }
      return undefined;
    },
    parts: [
      ...buildDriverSeat(sportsCarRider, shades.black, 0.28),
      ...buildSteeringWheel(sportsCarRider, 0.27, 0.34, 0.075),
      ...buildWindscreen({
        z: 0.18,
        bottom: 0.38,
        top: 0.54,
        halfWidth: 0.34,
        lean: 0.75,
        frame: shades.black,
      }),
      block([0.84, 0.025, 0.13], shades.black, [0, 0.56, -0.8]),
      ...bothSides((side) => [
        block([0.02, 0.1, 0.17], shades.black, [side * 0.42, 0.53, -0.8]),
        tube(
          [side * 0.22, 0.4, -0.78],
          [side * 0.22, 0.55, -0.8],
          0.014,
          shades.black,
          6,
        ),
        ball(
          1,
          shades.headlight,
          [side * 0.27, 0.215, 0.845],
          [0.08, 0.025, 0.05],
          [0.4, 0, 0],
        ),
        block([0.12, 0.035, 0.02], shades.tailLight, [
          side * 0.25,
          0.33,
          -0.895,
        ]),
        lens(0.03, 0.06, shades.chrome, [side * 0.1, 0.16, -0.9]),
        ...buildMirror(
          [side * 0.4, 0.38, 0.1],
          [side * 0.46, 0.42, 0.08],
          colour,
        ),
      ]),
      block([0.36, 0.05, 0.02], shades.black, [0, 0.17, 0.9]),
      ...buildPlate(-0.905, 0.22, shades.plate),
      ...bentTube(
        [
          [-0.15, 0.4, -0.43],
          [-0.12, 0.52, -0.43],
          [0.12, 0.52, -0.43],
          [0.15, 0.4, -0.43],
        ],
        0.016,
        shades.chrome,
        6,
      ),
    ],
  });
};

const saloonRider: Triple = [0, 0.1, -0.1];

const saloonKeys: readonly BodySection[] = [
  { z: -0.85, halfWidth: 0.37, bottom: 0.17, top: 0.43 },
  { z: -0.79, halfWidth: 0.42, bottom: 0.13, top: 0.49 },
  { z: -0.6, halfWidth: 0.43, bottom: 0.12, top: 0.49 },
  { z: 0.6, halfWidth: 0.43, bottom: 0.12, top: 0.47 },
  { z: 0.79, halfWidth: 0.41, bottom: 0.13, top: 0.43 },
  { z: 0.85, halfWidth: 0.36, bottom: 0.16, top: 0.38 },
];

const buildSaloon = (
  colour: string,
  livery: ModelPart[],
  paint?: (spot: Spot, section: BodySection) => Color | undefined,
): BufferGeometry => {
  const wheels = fourWheels({ radius: 0.17, width: 0.12 }, 0.38, 0.56, -0.56);
  return buildOpenCar({
    colour,
    keys: saloonKeys,
    stations: 30,
    squareness: 3.4,
    wheels,
    openings: [{ from: -0.62, to: 0.2, halfWidth: 0.34 }],
    livery: paint,
    parts: [
      ...buildDriverSeat(saloonRider, shades.seat),
      ...buildSteeringWheel(saloonRider),
      ...buildWindscreen({
        z: 0.3,
        bottom: 0.47,
        top: 0.66,
        halfWidth: 0.37,
        lean: 0.45,
        frame: shades.black,
      }),
      block([0.66, 0.1, 0.2], shades.seat, [0, 0.4, -0.5]),
      block([0.66, 0.2, 0.07], shades.seat, [0, 0.52, -0.59], [-0.15, 0, 0]),
      block([0.82, 0.06, 0.05], shades.black, [0, 0.18, 0.86]),
      block([0.82, 0.06, 0.05], shades.black, [0, 0.19, -0.86]),
      block([0.32, 0.08, 0.02], shades.grille, [0, 0.27, 0.855]),
      ...buildLamps(
        [
          [0.27, 0.31, 0.85],
          [-0.27, 0.31, 0.85],
        ],
        0.05,
        shades.headlight,
        1,
      ),
      ...bothSides((side) => [
        block([0.1, 0.05, 0.02], shades.tailLight, [side * 0.27, 0.37, -0.85]),
        block([0.05, 0.03, 0.02], shades.indicator, [side * 0.37, 0.25, 0.83]),
        ...buildMirror(
          [side * 0.42, 0.48, 0.2],
          [side * 0.49, 0.53, 0.18],
          colour,
        ),
      ]),
      ...buildPlate(-0.87, 0.27, shades.plate),
      ...livery,
    ],
  });
};

const buildRearHoop = (z: number, top: number, colour: ColorRepresentation) =>
  bentTube(
    [
      [-0.36, 0.45, z],
      [-0.36, top - 0.05, z],
      [-0.31, top, z],
      [0.31, top, z],
      [0.36, top - 0.05, z],
      [0.36, 0.45, z],
    ],
    0.022,
    colour,
  );

const buildTaxi = (colour: string): BufferGeometry =>
  buildSaloon(colour, [
    ...buildChequers({
      halfWidth: 0.433,
      from: -0.55,
      to: 0.55,
      bottom: 0.29,
      columns: 18,
      rows: 2,
      size: 0.03,
      colours: [shades.black, shades.white],
    }),
    ...buildRearHoop(-0.42, 0.8, shades.black),
    block([0.34, 0.1, 0.12], "#fff59d", [0, 0.86, -0.42]),
    block([0.36, 0.02, 0.13], shades.black, [0, 0.8, -0.42]),
    block([0.3, 0.04, 0.125], shades.black, [0, 0.87, -0.42]),
    ...buildPlate(0.87, 0.27, shades.plateWhite),
    ball(1, "#43a047", [0, 0.48, 0.65], [0.04, 0.012, 0.04]),
  ]);

const buildPoliceCar = (colour: string): BufferGeometry =>
  buildSaloon(
    colour,
    [
      ...buildChequers({
        halfWidth: 0.433,
        from: -0.6,
        to: 0.6,
        bottom: 0.24,
        columns: 12,
        rows: 2,
        size: 0.06,
        colours: [shades.yellow, "#1e88e5"],
      }),
      ...buildRearHoop(-0.42, 0.78, shades.white),
      block([0.6, 0.05, 0.12], shades.white, [0, 0.82, -0.42]),
      ...[-0.2, -0.07].map((x) =>
        block([0.12, 0.06, 0.11], shades.blueLight, [x, 0.86, -0.42]),
      ),
      ...[0.07, 0.2].map((x) =>
        block([0.12, 0.06, 0.11], shades.redLight, [x, 0.86, -0.42]),
      ),
      ...bentTube(
        [
          [-0.25, 0.14, 0.87],
          [-0.25, 0.36, 0.9],
          [0.25, 0.36, 0.9],
          [0.25, 0.14, 0.87],
        ],
        0.018,
        shades.black,
        6,
      ),
      tube([0, 0.3, 0.9], [0, 0.3, 0.86], 0.018, shades.black, 6),
      ...buildPlate(0.87, 0.27, shades.plateWhite),
      tube([0.3, 0.49, -0.75], [0.3, 0.9, -0.78], 0.005, shades.black, 4),
    ],
    (spot, section) =>
      findUpness(spot, section) > 0.6 && spot.z > 0.3 && Math.abs(spot.x) < 0.2
        ? new Color(shades.white)
        : undefined,
  );

const jeepRider: Triple = [0, 0.19, -0.12];

const buildJeep = (colour: string): BufferGeometry => {
  const wheels = fourWheels(
    { radius: 0.19, width: 0.15, lugs: 14, rim: darken(colour, 0.3) },
    0.37,
    0.5,
    -0.5,
  );
  const sand = new Color("#d7c49e");
  return buildOpenCar({
    colour,
    keys: [
      { z: -0.8, halfWidth: 0.4, bottom: 0.25, top: 0.54 },
      { z: -0.76, halfWidth: 0.42, bottom: 0.23, top: 0.56 },
      { z: 0.72, halfWidth: 0.42, bottom: 0.23, top: 0.56 },
      { z: 0.8, halfWidth: 0.4, bottom: 0.25, top: 0.54 },
    ],
    stations: 26,
    squareness: 4.5,
    wheels,
    openings: [{ from: -0.7, to: 0.24, halfWidth: 0.35 }],
    livery: (spot, section) =>
      findAcross(spot, section) > 0.9 && spot.y > 0.44 && spot.y < 0.48
        ? sand
        : undefined,
    parts: [
      ...buildDriverSeat(jeepRider, "#5d4037"),
      ...buildSteeringWheel(jeepRider),
      block([0.66, 0.1, 0.2], "#5d4037", [0, 0.48, -0.55]),
      ...buildWindscreen({
        z: 0.33,
        bottom: 0.56,
        top: 0.8,
        halfWidth: 0.37,
        lean: 0.15,
        frame: darken(colour, 0.25),
      }),
      ...buildRearHoop(-0.44, 0.94, shades.black),
      ...bothSides((side) => [
        tube(
          [side * 0.36, 0.92, -0.44],
          [side * 0.37, 0.8, 0.31],
          0.018,
          shades.black,
          6,
        ),
        tube(
          [side * 0.36, 0.45, -0.44],
          [side * 0.36, 0.56, -0.7],
          0.018,
          shades.black,
          6,
        ),
        ...buildLamps([[side * 0.26, 0.45, 0.81]], 0.05, shades.headlight, 1),
        block([0.05, 0.03, 0.02], shades.indicator, [side * 0.15, 0.33, 0.805]),
        block([0.06, 0.08, 0.02], shades.tailLight, [
          side * 0.32,
          0.45,
          -0.805,
        ]),
        ball(0.03, "#fff59d", [side * 0.12, 0.98, -0.44]),
      ]),
      ...[-0.12, -0.06, 0, 0.06, 0.12].map((x) =>
        block([0.03, 0.14, 0.02], shades.grille, [x, 0.42, 0.805]),
      ),
      block([0.86, 0.07, 0.07], shades.black, [0, 0.24, 0.86]),
      block([0.86, 0.07, 0.07], shades.black, [0, 0.25, -0.84]),
      lens(0.17, 0.12, shades.tyre, [0, 0.5, -0.85], 16),
      lens(0.1, 0.13, darken(colour, 0.3), [0, 0.5, -0.85]),
      block([0.12, 0.18, 0.08], darken(colour, 0.2), [-0.42, 0.45, -0.55]),
      tube([0.45, 0.4, 0.62], [0.45, 0.82, 0.55], 0.025, shades.black, 8),
      ...buildPlate(-0.85, 0.32, shades.plate),
    ],
  });
};

const pickupRider: Triple = [0, 0.22, -0.02];

const buildPickupTruck = (colour: string): BufferGeometry => {
  const wheels = fourWheels({ radius: 0.18, width: 0.14 }, 0.38, 0.6, -0.58);
  return buildOpenCar({
    colour,
    keys: [
      { z: -0.95, halfWidth: 0.4, bottom: 0.18, top: 0.53 },
      { z: -0.9, halfWidth: 0.44, bottom: 0.16, top: 0.56 },
      { z: 0.5, halfWidth: 0.44, bottom: 0.16, top: 0.55 },
      { z: 0.9, halfWidth: 0.43, bottom: 0.17, top: 0.49 },
      { z: 0.95, halfWidth: 0.39, bottom: 0.19, top: 0.45 },
    ],
    stations: 32,
    squareness: 3.8,
    wheels,
    openings: [
      { from: -0.26, to: 0.24, halfWidth: 0.36 },
      { from: -0.88, to: -0.34, halfWidth: 0.38, colour: "#5d6470" },
    ],
    livery: (spot, section) =>
      findAcross(spot, section) > 0.9 && spot.y > 0.32 && spot.y < 0.36
        ? new Color(shades.white)
        : undefined,
    parts: [
      ...buildDriverSeat(pickupRider, shades.seat, 0.32),
      ...buildSteeringWheel(pickupRider),
      ...buildWindscreen({
        z: 0.34,
        bottom: 0.55,
        top: 0.8,
        halfWidth: 0.39,
        lean: 0.4,
        frame: shades.black,
      }),
      ...buildRearHoop(-0.3, 0.88, shades.black),
      ...[-0.18, 0, 0.18].map((x) => ball(0.035, "#fff59d", [x, 0.92, -0.3])),
      block([0.3, 0.18, 0.24], "#a1887f", [-0.1, 0.62, -0.6]),
      block([0.24, 0.14, 0.2], "#8d6e63", [0.18, 0.6, -0.75]),
      block([0.28, 0.12, 0.2], "#a1887f", [-0.08, 0.77, -0.6]),
      block([0.2, 0.14, 0.04], shades.chrome, [0, 0.38, 0.955]),
      ...[0.34, 0.4, 0.46].map((y) =>
        block([0.4, 0.02, 0.02], shades.chrome, [0, y, 0.955]),
      ),
      block([0.9, 0.07, 0.06], shades.chrome, [0, 0.2, 0.96]),
      block([0.9, 0.07, 0.06], shades.chrome, [0, 0.21, -0.96]),
      ...bothSides((side) => [
        ...buildLamps([[side * 0.3, 0.4, 0.955]], 0.045, shades.headlight, 1),
        block([0.06, 0.1, 0.02], shades.tailLight, [side * 0.33, 0.42, -0.955]),
        ...buildMirror(
          [side * 0.43, 0.56, 0.24],
          [side * 0.5, 0.62, 0.22],
          colour,
        ),
      ]),
      ...buildPlate(-0.97, 0.31, shades.plate),
    ],
  });
};

const vintageRider: Triple = [0, 0.17, -0.2];

const buildVintageCar = (colour: string): BufferGeometry => {
  const radius = 0.2;
  const wheelHeight = radius + ground;
  const cream = "#f5e6c8";
  const wheelZs = [0.56, -0.56];
  const coachline = new Color(cream);
  return buildOpenCar({
    colour,
    keys: [
      { z: -0.8, halfWidth: 0.28, bottom: 0.24, top: 0.48 },
      { z: -0.74, halfWidth: 0.31, bottom: 0.22, top: 0.54 },
      { z: 0.0, halfWidth: 0.31, bottom: 0.22, top: 0.53 },
      { z: 0.18, halfWidth: 0.26, bottom: 0.24, top: 0.52 },
      { z: 0.68, halfWidth: 0.23, bottom: 0.26, top: 0.5 },
      { z: 0.72, halfWidth: 0.21, bottom: 0.28, top: 0.48 },
    ],
    stations: 22,
    around: 28,
    wheels: [],
    openings: [{ from: -0.6, to: 0.05, halfWidth: 0.25 }],
    livery: (spot, section) => {
      const across = findAcross(spot, section);
      if (across > 0.88 && spot.y > 0.43 && spot.y < 0.46) {
        return coachline;
      }
      if (
        spot.z > 0.25 &&
        spot.z < 0.6 &&
        across > 0.85 &&
        spot.y > 0.33 &&
        spot.y < 0.45 &&
        Math.floor(spot.z / 0.05) % 2 === 0
      ) {
        return darken(colour, 0.45);
      }
      return undefined;
    },
    parts: [
      ...[0.36, -0.36].flatMap((x) =>
        wheelZs.flatMap((z) =>
          buildSpokedWheel({
            radius,
            z,
            x,
            thickness: 0.04,
            spokes: 6,
            hubWidth: 0.1,
            rim: cream,
            spoke: cream,
            hub: shades.chrome,
          }),
        ),
      ),
      ...bothSides((side) => [
        ...wheelZs.map((z) =>
          buildMudguard(
            radius + 0.03,
            0.13,
            [side * 0.36, wheelHeight, z],
            shades.black,
            0.25,
            2.6,
          ),
        ),
        block([0.14, 0.025, 0.66], shades.black, [side * 0.37, 0.26, 0]),
        tube(
          [side * 0.33, 0.26, 0.3],
          [side * 0.25, 0.5, 0.7],
          0.012,
          shades.chrome,
          5,
        ),
        lens(0.07, 0.08, shades.chrome, [side * 0.25, 0.52, 0.74]),
        lens(0.058, 0.085, shades.headlight, [side * 0.25, 0.52, 0.745]),
        block([0.05, 0.03, 0.02], shades.tailLight, [side * 0.22, 0.4, -0.81]),
      ]),
      block([0.32, 0.3, 0.05], shades.chrome, [0, 0.42, 0.73]),
      ...[-0.1, -0.05, 0, 0.05, 0.1].map((x) =>
        block([0.025, 0.24, 0.02], shades.grille, [x, 0.42, 0.757]),
      ),
      ball(0.025, shades.chrome, [0, 0.6, 0.73]),
      block([0.5, 0.04, 0.05], shades.chrome, [0, 0.22, 0.9]),
      ...bothSides((side) => [
        tube(
          [side * 0.2, 0.22, 0.88],
          [side * 0.2, 0.26, 0.62],
          0.01,
          shades.chrome,
          4,
        ),
      ]),
      ...buildDriverSeat(vintageRider, "#8d2a1a", 0.38),
      ...buildSteeringWheel(vintageRider, 0.26, 0.37, 0.1),
      ...buildWindscreen({
        z: 0.2,
        bottom: 0.52,
        top: 0.8,
        halfWidth: 0.27,
        lean: 0.05,
      }),
      block([0.4, 0.22, 0.14], shades.black, [0, 0.42, -0.86]),
      ...buildSpareWheel(0.16, [0, 0.5, -0.94], cream),
      ball(0.035, shades.black, [0.3, 0.6, 0.15]),
      tube([0.3, 0.6, 0.15], [0.3, 0.6, 0.25], 0.01, shades.chrome, 5),
    ],
  });
};

const racingRider: Triple = [0, -0.02, -0.15];

const buildRacingCar = (colour: string): BufferGeometry => {
  const front = { radius: 0.15, width: 0.15, rim: shades.black };
  const back = { radius: 0.17, width: 0.2, rim: shades.black };
  const wheels: WheelSpec[] = [
    { ...front, x: 0.39, z: 0.55 },
    { ...front, x: -0.39, z: 0.55 },
    { ...back, x: 0.38, z: -0.6 },
    { ...back, x: -0.38, z: -0.6 },
  ];
  const nose = new Color(shades.white);
  const sidepod = buildBody({
    keys: [
      { z: -0.62, halfWidth: 0.08, bottom: 0.1, top: 0.2 },
      { z: -0.45, halfWidth: 0.12, bottom: 0.08, top: 0.26 },
      { z: -0.05, halfWidth: 0.13, bottom: 0.08, top: 0.27 },
      { z: 0.08, halfWidth: 0.1, bottom: 0.09, top: 0.24 },
    ],
    stations: 12,
    around: 20,
    squareness: 3,
    paint: () => new Color(colour),
  });
  return buildOpenCar({
    colour,
    keys: [
      { z: -0.85, halfWidth: 0.1, bottom: 0.1, top: 0.28 },
      { z: -0.6, halfWidth: 0.18, bottom: 0.07, top: 0.36 },
      { z: -0.2, halfWidth: 0.2, bottom: 0.06, top: 0.33 },
      { z: 0.15, halfWidth: 0.15, bottom: 0.07, top: 0.29 },
      { z: 0.88, halfWidth: 0.05, bottom: 0.1, top: 0.16 },
    ],
    stations: 30,
    around: 24,
    wheels,
    openings: [{ from: -0.32, to: 0.06, halfWidth: 0.15 }],
    livery: (spot) => (spot.z > 0.55 ? nose : undefined),
    geometries: [
      sidepod.clone().translate(0.22, 0, 0),
      sidepod.translate(-0.22, 0, 0),
    ],
    parts: [
      ...buildDriverSeat(racingRider, shades.black, 0.22),
      ...buildSteeringWheel(racingRider, 0.25, 0.34, 0.06),
      ball(1, colour, [0, 0.36, -0.55], [0.08, 0.13, 0.2]),
      lens(0.04, 0.03, shades.black, [0, 0.44, -0.4]),
      block([0.95, 0.018, 0.14], colour, [0, 0.06, 0.88]),
      block([0.95, 0.012, 0.08], shades.white, [0, 0.085, 0.86], [0.2, 0, 0]),
      block([0.68, 0.025, 0.16], colour, [0, 0.58, -0.86]),
      block([0.68, 0.015, 0.08], shades.white, [0, 0.62, -0.83], [0.3, 0, 0]),
      block([0.03, 0.4, 0.04], shades.black, [0, 0.4, -0.8]),
      ...bothSides((side) => [
        block([0.015, 0.1, 0.18], shades.black, [side * 0.475, 0.1, 0.87]),
        block([0.015, 0.2, 0.2], shades.black, [side * 0.345, 0.55, -0.86]),
        tube(
          [side * 0.12, 0.2, 0.5],
          [side * 0.33, 0.17, 0.55],
          0.01,
          shades.black,
          4,
        ),
        tube(
          [side * 0.12, 0.12, 0.6],
          [side * 0.33, 0.14, 0.55],
          0.01,
          shades.black,
          4,
        ),
        tube(
          [side * 0.15, 0.22, -0.6],
          [side * 0.3, 0.2, -0.6],
          0.012,
          shades.black,
          4,
        ),
        ...buildMirror(
          [side * 0.14, 0.3, 0.05],
          [side * 0.22, 0.34, 0.05],
          shades.black,
        ),
      ]),
      lens(0.06, 0.012, shades.white, [0, 0.24, 0.33]),
      block([0.03, 0.08, 0.02], shades.tailLight, [0, 0.2, -0.86]),
    ],
  });
};

const goKartRider: Triple = [0, 0.02, -0.15];

const buildGoKart = (colour: string): BufferGeometry => {
  const wheels: WheelSpec[] = [
    ...[0.32, -0.32].map((x) => ({
      radius: 0.1,
      width: 0.12,
      x,
      z: 0.36,
      rim: shades.white,
    })),
    ...[0.32, -0.32].map((x) => ({
      radius: 0.11,
      width: 0.16,
      x,
      z: -0.38,
      rim: shades.white,
    })),
  ];
  return buildOpenCar({
    colour,
    keys: [
      { z: -0.36, halfWidth: 0.14, bottom: 0.06, top: 0.24 },
      { z: -0.3, halfWidth: 0.2, bottom: 0.05, top: 0.3 },
      { z: 0.0, halfWidth: 0.22, bottom: 0.05, top: 0.3 },
      { z: 0.38, halfWidth: 0.2, bottom: 0.05, top: 0.26 },
      { z: 0.5, halfWidth: 0.16, bottom: 0.06, top: 0.18 },
    ],
    stations: 22,
    around: 28,
    squareness: 3,
    wheels: [],
    openings: [{ from: -0.31, to: 0.02, halfWidth: 0.17 }],
    livery: ({ y }) => (y < 0.09 ? new Color(shades.black) : undefined),
    parts: [
      ...buildRoadWheels(wheels),
      ...buildDriverSeat(goKartRider, shades.black, 0.26),
      ...buildSteeringWheel(goKartRider, 0.27, 0.36, 0.07),
      ...bothSides((side) => [
        ball(1, colour, [side * 0.27, 0.1, 0], [0.06, 0.05, 0.22]),
        tube(
          [side * 0.2, 0.07, 0.36],
          [side * 0.27, 0.07, 0.36],
          0.012,
          shades.chrome,
          6,
        ),
        tube(
          [side * 0.2, 0.07, -0.38],
          [side * 0.25, 0.07, -0.38],
          0.012,
          shades.chrome,
          6,
        ),
      ]),
      ...bentTube(
        [
          [-0.2, 0.07, 0.5],
          [-0.12, 0.08, 0.56],
          [0.12, 0.08, 0.56],
          [0.2, 0.07, 0.5],
        ],
        0.016,
        shades.chrome,
        6,
      ),
      ...bentTube(
        [
          [-0.4, 0.1, -0.52],
          [-0.4, 0.1, -0.48],
          [0.4, 0.1, -0.48],
          [0.4, 0.1, -0.52],
        ],
        0.018,
        shades.black,
        6,
      ),
      {
        geometry: new CylinderGeometry(0.09, 0.09, 0.012, 16),
        colour: shades.white,
        position: [0, 0.22, 0.43] satisfies Triple,
        rotation: [0.9, 0, 0] satisfies Triple,
      },
      block([0.03, 0.08, 0.014], shades.black, [0, 0.22, 0.44], [0.9, 0, 0]),
      block([0.16, 0.14, 0.14], shades.frame, [0.12, 0.3, -0.42]),
      axle(0.05, 0.06, shades.rim, [0.12, 0.3, -0.42]),
      tube([0.16, 0.28, -0.46], [0.2, 0.22, -0.56], 0.018, shades.chrome, 8),
      ...[0, 1, 2].map((fin) =>
        block([0.18, 0.01, 0.15], shades.rim, [
          0.12,
          0.39 + fin * 0.025,
          -0.42,
        ]),
      ),
    ],
  });
};

const duneBuggyRider: Triple = [0, 0.12, -0.1];

const buildDuneBuggy = (colour: string): BufferGeometry => {
  const wheels: WheelSpec[] = [
    ...[0.34, -0.34].map((x) => ({
      radius: 0.16,
      width: 0.12,
      x,
      z: 0.48,
      rim: shades.white,
    })),
    ...[0.36, -0.36].map((x) => ({
      radius: 0.21,
      width: 0.2,
      x,
      z: -0.45,
      rim: shades.white,
      lugs: 14,
    })),
  ];
  return buildOpenCar({
    colour,
    keys: [
      { z: -0.6, halfWidth: 0.27, bottom: 0.24, top: 0.42 },
      { z: -0.5, halfWidth: 0.32, bottom: 0.2, top: 0.46 },
      { z: -0.2, halfWidth: 0.34, bottom: 0.18, top: 0.46 },
      { z: 0.25, halfWidth: 0.32, bottom: 0.19, top: 0.42 },
      { z: 0.6, halfWidth: 0.25, bottom: 0.22, top: 0.36 },
      { z: 0.68, halfWidth: 0.16, bottom: 0.25, top: 0.32 },
    ],
    stations: 24,
    squareness: 2.6,
    wheels,
    openings: [{ from: -0.42, to: 0.12, halfWidth: 0.27 }],
    parts: [
      ...buildDriverSeat(duneBuggyRider, shades.black),
      ...buildSteeringWheel(duneBuggyRider),
      ...buildWindscreen({
        z: 0.24,
        bottom: 0.42,
        top: 0.58,
        halfWidth: 0.28,
        lean: 0.5,
        frame: shades.black,
      }),
      ...buildRearHoop(-0.42, 0.95, shades.chrome),
      ...[-0.15, 0.15].flatMap((x) => [
        lens(0.05, 0.06, shades.black, [x, 0.97, -0.41]),
        lens(0.04, 0.065, shades.headlight, [x, 0.97, -0.405]),
      ]),
      block([0.26, 0.16, 0.18], shades.frame, [0, 0.4, -0.6]),
      axle(0.08, 0.1, shades.chrome, [0, 0.52, -0.6]),
      ...bentTube(
        [
          [-0.2, 0.22, 0.66],
          [-0.2, 0.3, 0.72],
          [0.2, 0.3, 0.72],
          [0.2, 0.22, 0.66],
        ],
        0.018,
        shades.black,
        6,
      ),
      ...bothSides((side) => [
        ...bentTube(
          [
            [side * 0.1, 0.36, -0.68],
            [side * 0.12, 0.34, -0.72],
            [side * 0.12, 0.42, -0.74],
          ],
          0.018,
          shades.chrome,
          6,
        ),
        ...buildLamps([[side * 0.18, 0.37, 0.64]], 0.04, shades.headlight, 1),
        axle(0.07, 0.01, shades.white, [side * 0.338, 0.32, -0.05]),
        block([0.012, 0.07, 0.02], shades.black, [side * 0.345, 0.32, -0.05]),
      ]),
      {
        geometry: new CylinderGeometry(0.13, 0.13, 0.08, 16),
        colour: shades.tyre,
        position: [0, 0.42, 0.42] satisfies Triple,
        rotation: [0.25, 0, 0] satisfies Triple,
      },
      {
        geometry: new CylinderGeometry(0.08, 0.08, 0.09, 12),
        colour: shades.white,
        position: [0, 0.42, 0.42] satisfies Triple,
        rotation: [0.25, 0, 0] satisfies Triple,
      },
    ],
  });
};

const golfBuggyRider: Triple = [0, 0.23, -0.32];

const buildGolfBuggy = (colour: string): BufferGeometry => {
  const wheels = fourWheels(
    { radius: 0.12, width: 0.09, rim: shades.white },
    0.3,
    0.42,
    -0.42,
  );
  const green = new Color("#2e7d32");
  return buildOpenCar({
    colour,
    keys: [
      { z: -0.65, halfWidth: 0.32, bottom: 0.14, top: 0.4 },
      { z: -0.6, halfWidth: 0.35, bottom: 0.12, top: 0.44 },
      { z: -0.2, halfWidth: 0.35, bottom: 0.12, top: 0.44 },
      { z: 0.02, halfWidth: 0.33, bottom: 0.12, top: 0.28 },
      { z: 0.25, halfWidth: 0.33, bottom: 0.12, top: 0.3 },
      { z: 0.45, halfWidth: 0.33, bottom: 0.12, top: 0.46 },
      { z: 0.6, halfWidth: 0.3, bottom: 0.13, top: 0.42 },
      { z: 0.65, halfWidth: 0.24, bottom: 0.16, top: 0.36 },
    ],
    stations: 32,
    squareness: 3.2,
    wheels,
    openings: [
      { from: -0.04, to: 0.28, halfWidth: 0.28, colour: shades.grille },
    ],
    livery: (spot, section) =>
      findAcross(spot, section) > 0.88 && spot.y > 0.2 && spot.y < 0.25
        ? green
        : undefined,
    parts: [
      block([0.6, 0.06, 0.3], "#1b5e20", [0, 0.455, -0.36]),
      block([0.6, 0.24, 0.06], "#1b5e20", [0, 0.6, -0.53], [-0.15, 0, 0]),
      ...buildSteeringWheel(golfBuggyRider, 0.27, 0.36, 0.08),
      tube([0, 0.47, 0.4], [0, 0.52, 0.12], 0.016, shades.frame, 6),
      ...buildLamps(
        [
          [0.18, 0.36, 0.65],
          [-0.18, 0.36, 0.65],
        ],
        0.035,
        shades.headlight,
        1,
      ),
      post(0.09, 0.4, "#c62828", [0.14, 0.6, -0.62]),
      post(0.095, 0.03, shades.white, [0.14, 0.78, -0.62]),
      ...[-0.04, 0, 0.04].map((offset, index) =>
        ball(0.025, ["#cfd8dc", "#8d6e63", "#cfd8dc"][index], [
          0.14 + offset * 1.5,
          0.91,
          -0.62 + offset,
        ]),
      ),
      ...[-0.04, 0, 0.04].map((offset) =>
        tube(
          [0.14 + offset, 0.75, -0.62],
          [0.14 + offset * 1.5, 0.9, -0.62 + offset],
          0.008,
          shades.chrome,
          4,
        ),
      ),
      tube([-0.25, 0.42, -0.6], [-0.25, 1.05, -0.62], 0.008, shades.white, 4),
      block([0.004, 0.1, 0.14], shades.redLight, [-0.25, 1.0, -0.69]),
      block([0.66, 0.05, 0.05], shades.frame, [0, 0.16, 0.67]),
      block([0.66, 0.05, 0.05], shades.frame, [0, 0.17, -0.66]),
      ...bothSides((side) => [
        block([0.04, 0.04, 0.02], shades.tailLight, [
          side * 0.22,
          0.34,
          -0.655,
        ]),
      ]),
    ],
  });
};

const monsterRider: Triple = [0, 0.78, -0.05];

const buildMonsterTruck = (colour: string): BufferGeometry => {
  const wheels = fourWheels(
    { radius: 0.42, width: 0.34, lugs: 14, rim: shades.chrome, hubcap: colour },
    0.55,
    0.62,
    -0.62,
  );
  const flameOuter = new Color("#ff6d00");
  const flameInner = new Color("#ffd600");
  const wheelHeight = findWheelHeight(wheels[0]);
  return buildOpenCar({
    colour,
    keys: [
      { z: -0.95, halfWidth: 0.44, bottom: 0.8, top: 1.08 },
      { z: -0.9, halfWidth: 0.48, bottom: 0.78, top: 1.12 },
      { z: 0.55, halfWidth: 0.48, bottom: 0.78, top: 1.11 },
      { z: 0.9, halfWidth: 0.46, bottom: 0.8, top: 1.04 },
      { z: 0.95, halfWidth: 0.42, bottom: 0.82, top: 1.0 },
    ],
    stations: 24,
    squareness: 3.6,
    wheels: [],
    openings: [
      { from: -0.36, to: 0.22, halfWidth: 0.4 },
      { from: -0.88, to: -0.42, halfWidth: 0.42, colour: "#4a148c" },
    ],
    livery: (spot, section) => {
      if (findAcross(spot, section) < 0.8 || spot.z < -0.2) {
        return undefined;
      }
      const reach = (spot.z + 0.2) / 1.15;
      const lick = 0.06 + 0.2 * reach + 0.05 * Math.sin(spot.z * 30);
      const height = spot.y - section.bottom;
      if (height < lick * 0.55) {
        return flameInner;
      }
      return height < lick ? flameOuter : undefined;
    },
    parts: [
      ...buildRoadWheels(wheels),
      ...bothSides((side) => [
        block([0.08, 0.1, 1.9], shades.black, [side * 0.3, 0.7, 0]),
        ...[0.62, -0.62].flatMap((z) => [
          tube(
            [side * 0.36, wheelHeight, z],
            [side * 0.36, 0.8, z + 0.12],
            0.035,
            shades.yellow,
            10,
          ),
          tube(
            [side * 0.36, wheelHeight, z],
            [side * 0.36, 0.8, z - 0.12],
            0.02,
            shades.chrome,
            8,
          ),
        ]),
        ...buildLamps([[side * 0.3, 0.92, 0.955]], 0.05, shades.headlight, 1),
        block([0.08, 0.1, 0.02], shades.tailLight, [side * 0.34, 0.95, -0.955]),
        ...buildMirror(
          [side * 0.47, 1.1, 0.28],
          [side * 0.55, 1.16, 0.26],
          colour,
        ),
      ]),
      ...[0.62, -0.62].map((z) =>
        tube(
          [-0.55, wheelHeight, z],
          [0.55, wheelHeight, z],
          0.05,
          shades.frame,
          10,
        ),
      ),
      tube(
        [0, wheelHeight, 0.62],
        [0, wheelHeight, -0.62],
        0.035,
        shades.frame,
        8,
      ),
      ...buildDriverSeat(monsterRider, shades.black),
      ...buildSteeringWheel(monsterRider),
      ...buildWindscreen({
        z: 0.36,
        bottom: 1.1,
        top: 1.32,
        halfWidth: 0.42,
        lean: 0.4,
        frame: shades.black,
      }),
      ...bentTube(
        [
          [-0.42, 1.0, -0.4],
          [-0.42, 1.42, -0.4],
          [0.42, 1.42, -0.4],
          [0.42, 1.0, -0.4],
        ],
        0.03,
        shades.chrome,
      ),
      ...[-0.3, -0.1, 0.1, 0.3].flatMap((x) => [
        lens(0.05, 0.06, shades.black, [x, 1.47, -0.39]),
        lens(0.04, 0.065, shades.headlight, [x, 1.47, -0.385]),
      ]),
      block([0.3, 0.1, 0.03], shades.chrome, [0, 0.95, 0.96]),
      block([1.0, 0.08, 0.08], shades.black, [0, 0.8, 0.98]),
      block([1.0, 0.08, 0.08], shades.black, [0, 0.8, -0.98]),
    ],
  });
};

const tractorRider: Triple = [0, 0.43, -0.36];

const buildTractor = (colour: string): BufferGeometry => {
  const rims = "#fbc02d";
  const bigRadius = 0.32;
  const bigWheels: WheelSpec[] = [0.42, -0.42].map((x) => ({
    radius: bigRadius,
    width: 0.2,
    x,
    z: -0.32,
    rim: rims,
    hubcap: rims,
    lugs: 16,
  }));
  const smallWheels: WheelSpec[] = [0.31, -0.31].map((x) => ({
    radius: 0.17,
    width: 0.11,
    x,
    z: 0.48,
    rim: rims,
    hubcap: rims,
    lugs: 10,
  }));
  const bigHeight = findWheelHeight(bigWheels[0]);
  const bonnet = buildBody({
    keys: [
      { z: -0.15, halfWidth: 0.2, bottom: 0.3, top: 0.62 },
      { z: 0.6, halfWidth: 0.19, bottom: 0.3, top: 0.6 },
      { z: 0.72, halfWidth: 0.17, bottom: 0.32, top: 0.56 },
    ],
    stations: 16,
    around: 24,
    squareness: 3.4,
    paint: (spot, section) =>
      findAcross(spot, section) > 0.85 &&
      spot.y > 0.46 &&
      spot.y < 0.56 &&
      spot.z > 0.2 &&
      spot.z < 0.55 &&
      Math.floor(spot.z / 0.05) % 2 === 0
        ? new Color(shades.grille)
        : new Color(colour),
  });
  return assemble(
    [bonnet],
    [
      ...buildRoadWheels([...bigWheels, ...smallWheels]),
      block([0.3, 0.14, 1.1], shades.frame, [0, 0.3, 0.1]),
      tube(
        [-0.42, bigHeight, -0.32],
        [0.42, bigHeight, -0.32],
        0.05,
        shades.frame,
      ),
      tube([-0.31, 0.18, 0.48], [0.31, 0.18, 0.48], 0.035, shades.frame),
      ...bothSides((side) => [
        buildMudguard(
          bigRadius + 0.06,
          0.24,
          [side * 0.42, bigHeight, -0.32],
          colour,
          0.2,
          2.2,
        ),
        block([0.18, 0.02, 0.3], shades.frame, [side * 0.22, 0.34, -0.05]),
        ...buildLamps([[side * 0.1, 0.5, 0.73]], 0.03, shades.headlight, 1),
        block([0.04, 0.04, 0.02], shades.tailLight, [side * 0.48, 0.72, -0.2]),
      ]),
      block([0.26, 0.2, 0.03], shades.grille, [0, 0.42, 0.73]),
      block([0.42, 0.04, 0.4], colour, [0, 0.42, -0.36]),
      ...buildDriverSeat(tractorRider, shades.black, 0.28),
      ...buildSteeringWheel(tractorRider, 0.26, 0.38, 0.09),
      tube(
        [0, 0.6, -0.02],
        [0, tractorRider[1] + 0.3, -0.1],
        0.016,
        shades.frame,
        6,
      ),
      tube([0.12, 0.6, 0.45], [0.12, 1.05, 0.45], 0.025, shades.black, 10),
      post(0.032, 0.05, shades.chrome, [0.12, 1.06, 0.45]),
      post(0.045, 0.1, shades.chrome, [-0.1, 0.72, 0.35]),
      block([0.12, 0.06, 0.12], shades.frame, [0, 0.3, -0.72]),
      tube([0, 0.3, -0.72], [0, 0.3, -0.8], 0.02, shades.frame, 6),
    ],
  );
};

const tukTukRider: Triple = [0, 0.25, 0.05];

const buildTukTuk = (colour: string): BufferGeometry => {
  const canopy = "#ffd600";
  const tub = buildBody({
    keys: [
      { z: -0.72, halfWidth: 0.36, bottom: 0.18, top: 0.55 },
      { z: -0.68, halfWidth: 0.39, bottom: 0.16, top: 0.58 },
      { z: -0.22, halfWidth: 0.39, bottom: 0.16, top: 0.56 },
      { z: -0.14, halfWidth: 0.36, bottom: 0.17, top: 0.52 },
    ],
    stations: 14,
    around: 28,
    squareness: 3.6,
    paint: paintCarBody({
      body: colour,
      openings: [{ from: -0.62, to: -0.13, halfWidth: 0.32 }],
      livery: ({ y }) => (y > 0.47 && y < 0.5 ? new Color(canopy) : undefined),
    }),
  });
  const cowl = buildBody({
    keys: [
      { z: 0.22, halfWidth: 0.2, bottom: 0.2, top: 0.48 },
      { z: 0.45, halfWidth: 0.17, bottom: 0.2, top: 0.66 },
      { z: 0.58, halfWidth: 0.1, bottom: 0.3, top: 0.62 },
    ],
    stations: 12,
    around: 24,
    squareness: 2.6,
    paint: () => new Color(colour),
  });
  const backWheels: WheelSpec[] = [0.33, -0.33].map((x) => ({
    radius: 0.14,
    width: 0.1,
    x,
    z: -0.38,
  }));
  return assemble(
    [tub, cowl],
    [
      ...buildRoadWheels(backWheels),
      ...buildRoadWheel({ radius: 0.13, width: 0.08, x: 0, z: 0.56 }),
      buildMudguard(0.16, 0.1, [0, 0.134, 0.56], colour, 1.0, 2.0),
      tube([0, 0.134, 0.56], [0, 0.5, 0.48], 0.018, shades.chrome, 6),
      block([0.5, 0.04, 0.5], shades.black, [0, 0.19, 0.08]),
      block([0.52, 0.03, 0.52], colour, [0, 0.165, 0.08]),
      post(0.06, 0.18, shades.frame, [0, 0.29, 0.05]),
      ball(1, "#d84315", [0, 0.46, 0.04], [0.15, 0.045, 0.14]),
      ...buildHandlebar([0, 0.7, 0.33], 0.24, shades.black),
      tube([0, 0.62, 0.42], [0, 0.7, 0.33], 0.016, shades.chrome, 6),
      ...buildLamps([[0, 0.55, 0.585]], 0.04, shades.headlight, 1),
      ...bothSides((side) => [
        ball(0.018, shades.indicator, [side * 0.11, 0.5, 0.56]),
        ...buildMirror([side * 0.18, 0.71, 0.31], [side * 0.24, 0.84, 0.3]),
        tube(
          [side * 0.36, 0.56, -0.7],
          [side * 0.36, 1.12, -0.7],
          0.016,
          shades.frame,
          6,
        ),
        tube(
          [side * 0.36, 0.56, -0.22],
          [side * 0.36, 1.12, -0.24],
          0.016,
          shades.frame,
          6,
        ),
        block([0.06, 0.04, 0.02], shades.tailLight, [side * 0.3, 0.42, -0.72]),
        ...[0, 1, 2, 3].map((tassel) =>
          ball(
            0.02,
            "#ff4081",
            [side * 0.42, 1.09, -0.68 + tassel * 0.14],
            1,
            [0, 0, 0],
            [6, 4],
          ),
        ),
      ]),
      ball(1, canopy, [0, 1.15, -0.47], [0.43, 0.05, 0.3]),
      block([0.86, 0.04, 0.56], canopy, [0, 1.13, -0.47]),
      block([0.87, 0.02, 0.57], colour, [0, 1.11, -0.47]),
      block([0.6, 0.08, 0.2], "#d84315", [0, 0.46, -0.5]),
      block([0.6, 0.2, 0.05], "#d84315", [0, 0.6, -0.62], [-0.12, 0, 0]),
      ...buildPlate(-0.735, 0.3, shades.plate),
    ],
  );
};

interface VanSpec {
  colour: string;
  keys: readonly BodySection[];
  stations?: number;
  windscreen: { from: number; to: number };
  doorWindows: { from: number; to: number; bottom: number };
  wheels: readonly WheelSpec[];
  livery?: (spot: Spot, section: BodySection) => Color | undefined;
  parts: ModelPart[];
  geometries?: readonly BufferGeometry[];
}

const buildVan = ({
  colour,
  keys,
  stations = 28,
  windscreen,
  doorWindows,
  wheels,
  livery,
  parts,
  geometries = [],
}: VanSpec): BufferGeometry => {
  const glass = new Color(shades.glass);
  const frontEnd = keys[keys.length - 1].z;
  const backEnd = keys[0].z;
  const bumperHeight = keys[0].bottom + 0.05;
  return assemble(
    [
      buildBody({
        keys,
        stations,
        around: 32,
        squareness: 4,
        paint: paintCarBody({
          body: colour,
          wheels,
          livery: (spot, section) => {
            const upness = findUpness(spot, section);
            const across = findAcross(spot, section);
            if (
              spot.z > windscreen.from &&
              spot.z < windscreen.to &&
              upness > 0.45 &&
              across < 0.82
            ) {
              return glass;
            }
            if (
              across > 0.9 &&
              spot.z > doorWindows.from &&
              spot.z < doorWindows.to &&
              spot.y > doorWindows.bottom &&
              spot.y < section.top - 0.08
            ) {
              return glass;
            }
            return livery?.(spot, section);
          },
        }),
      }),
      ...geometries,
    ],
    [
      ...buildRoadWheels(wheels),
      block([0.96, 0.08, 0.06], shades.frame, [
        0,
        bumperHeight,
        frontEnd + 0.01,
      ]),
      block([0.96, 0.08, 0.06], shades.frame, [
        0,
        bumperHeight,
        backEnd - 0.01,
      ]),
      block([0.34, 0.1, 0.02], shades.grille, [
        0,
        bumperHeight + 0.13,
        frontEnd,
      ]),
      ...bothSides((side) => [
        ...buildLamps(
          [[side * 0.3, bumperHeight + 0.15, frontEnd - 0.005]],
          0.05,
          shades.headlight,
          1,
        ),
        block([0.08, 0.16, 0.02], shades.tailLight, [
          side * 0.36,
          bumperHeight + 0.2,
          backEnd - 0.005,
        ]),
        block([0.05, 0.03, 0.02], shades.indicator, [
          side * 0.38,
          bumperHeight + 0.08,
          frontEnd - 0.01,
        ]),
        ...buildMirror(
          [side * 0.46, doorWindows.bottom, doorWindows.to + 0.02],
          [side * 0.55, doorWindows.bottom + 0.05, doorWindows.to],
          shades.black,
        ),
      ]),
      ...buildPlate(frontEnd + 0.045, bumperHeight, shades.plateWhite),
      ...buildPlate(backEnd - 0.045, bumperHeight, shades.plate),
      ...parts,
    ],
  );
};

const vanKeys = (top: number): BodySection[] => [
  { z: -1.05, halfWidth: 0.43, bottom: 0.17, top: top - 0.04 },
  { z: -1.0, halfWidth: 0.46, bottom: 0.14, top },
  { z: 0.42, halfWidth: 0.46, bottom: 0.14, top },
  { z: 0.48, halfWidth: 0.46, bottom: 0.14, top: top - 0.02 },
  { z: 0.78, halfWidth: 0.46, bottom: 0.14, top: 0.64, isStraight: true },
  { z: 1.0, halfWidth: 0.45, bottom: 0.15, top: 0.58 },
  { z: 1.05, halfWidth: 0.41, bottom: 0.18, top: 0.53 },
];

const vanWheels = fourWheels({ radius: 0.17, width: 0.12 }, 0.4, 0.66, -0.66);

const buildDeliveryVan = (colour: string): BufferGeometry => {
  const stripe = new Color("#1e88e5");
  const parcel = new Color("#d7a86e");
  const tape = new Color("#8d6e63");
  return buildVan({
    colour,
    keys: vanKeys(1.02),
    windscreen: { from: 0.5, to: 0.76 },
    doorWindows: { from: 0.18, to: 0.6, bottom: 0.62 },
    wheels: vanWheels,
    livery: (spot, section) => {
      const across = findAcross(spot, section);
      if (across < 0.9) {
        return undefined;
      }
      if (spot.y > 0.4 && spot.y < 0.48) {
        return stripe;
      }
      if (spot.z > -0.7 && spot.z < -0.15 && spot.y > 0.56 && spot.y < 0.9) {
        return Math.abs(spot.z + 0.425) < 0.035 ||
          Math.abs(spot.y - 0.73) < 0.03
          ? tape
          : parcel;
      }
      if (Math.abs(spot.z - 0.1) < 0.012 && spot.y > 0.18) {
        return darken(colour, 0.25);
      }
      return undefined;
    },
    parts: [
      block([0.012, 0.8, 0.02], shades.frame, [0, 0.58, -1.052]),
      ...[0.06, -0.06].map((x) =>
        block([0.02, 0.06, 0.02], shades.chrome, [x, 0.55, -1.06]),
      ),
      ...buildEndWindows(-1.05, -1, [
        { x: 0.17, halfWidth: 0.11, bottom: 0.66, top: 0.86 },
        { x: -0.17, halfWidth: 0.11, bottom: 0.66, top: 0.86 },
      ]),
      ...[-0.6, -0.2, 0.2].map((z) =>
        tube([-0.3, 1.06, z], [0.3, 1.06, z], 0.012, shades.frame, 5),
      ),
      ...bothSides((side) => [
        tube(
          [side * 0.3, 1.02, -0.7],
          [side * 0.3, 1.06, -0.7],
          0.012,
          shades.frame,
          5,
        ),
        tube(
          [side * 0.3, 1.02, 0.3],
          [side * 0.3, 1.06, 0.3],
          0.012,
          shades.frame,
          5,
        ),
        tube(
          [side * 0.3, 1.06, -0.7],
          [side * 0.3, 1.06, 0.3],
          0.012,
          shades.frame,
          5,
        ),
      ]),
    ],
  });
};

const buildAmbulance = (colour: string): BufferGeometry =>
  buildVan({
    colour,
    keys: vanKeys(1.08),
    windscreen: { from: 0.5, to: 0.76 },
    doorWindows: { from: 0.18, to: 0.6, bottom: 0.64 },
    wheels: vanWheels,
    livery: ({ y }, section) =>
      findUpness({ x: 0, y, z: 0 }, section) < -0.6
        ? new Color("#43a047")
        : undefined,
    parts: [
      ...buildChequers({
        halfWidth: 0.462,
        from: -0.95,
        to: 0.15,
        bottom: 0.3,
        columns: 14,
        rows: 2,
        size: 0.075,
        colours: [shades.yellow, "#2e7d32"],
      }),
      ...bothSides((side) => [
        block([0.012, 0.2, 0.06], "#2e7d32", [side * 0.465, 0.8, -0.5]),
        block([0.012, 0.06, 0.2], "#2e7d32", [side * 0.465, 0.8, -0.5]),
        ball(0.05, shades.blueLight, [side * 0.36, 1.08, -0.95], [1, 0.8, 1]),
        ball(0.05, shades.blueLight, [side * 0.36, 1.08, 0.38], [1, 0.8, 1]),
      ]),
      block([0.6, 0.06, 0.1], shades.blueLight, [0, 1.1, 0.4]),
      block([0.62, 0.02, 0.11], shades.white, [0, 1.075, 0.4]),
      block([0.012, 0.8, 0.02], shades.frame, [0, 0.6, -1.052]),
      ...buildEndWindows(-1.05, -1, [
        { x: 0.17, halfWidth: 0.11, bottom: 0.68, top: 0.9 },
        { x: -0.17, halfWidth: 0.11, bottom: 0.68, top: 0.9 },
      ]),
      block([0.5, 0.06, 0.012], "#2e7d32", [0, 0.5, -1.056]),
    ],
  });

const buildIceCreamVan = (colour: string): BufferGeometry => {
  const bunting = ["#ff80ab", "#80d8ff", "#ffff8d", "#b9f6ca"].map(
    (shade) => new Color(shade),
  );
  return buildVan({
    colour,
    keys: vanKeys(1.04),
    windscreen: { from: 0.5, to: 0.76 },
    doorWindows: { from: 0.18, to: 0.6, bottom: 0.62 },
    wheels: vanWheels,
    livery: (spot, section) =>
      findAcross(spot, section) > 0.9 && spot.y > 0.3 && spot.y < 0.42
        ? bunting[Math.floor((spot.z + 1.2) / 0.12) % bunting.length]
        : undefined,
    parts: [
      block([0.012, 0.32, 0.66], "#4e342e", [0.462, 0.72, -0.4]),
      block([0.08, 0.03, 0.7], shades.white, [0.5, 0.56, -0.4]),
      ...Array.from({ length: 6 }, (_, stripe) =>
        block(
          [0.18, 0.012, 0.115],
          stripe % 2 === 0 ? "#e53935" : shades.white,
          [0.53, 0.94, -0.69 + stripe * 0.115],
          [0, 0, -0.35],
        ),
      ),
      ...[-0.6, -0.4, -0.2].map((z, index) =>
        ball(0.035, ["#ff80ab", "#fff59d", "#8d6e63"][index], [0.48, 0.62, z]),
      ),
      {
        geometry: new ConeGeometry(0.12, 0.3, 14),
        colour: "#e0a96d",
        position: [0, 1.2, -0.35] satisfies Triple,
        rotation: [Math.PI, 0, 0] satisfies Triple,
      },
      ball(0.13, "#ff80ab", [0, 1.38, -0.35]),
      ball(0.11, shades.white, [0, 1.5, -0.35]),
      ball(0.035, "#e53935", [0, 1.62, -0.35]),
      block([0.03, 0.16, 0.03], "#6d4c41", [0.05, 1.56, -0.32], [0, 0, -0.4]),
      {
        geometry: new ConeGeometry(0.06, 0.12, 10),
        colour: shades.chrome,
        position: [0, 1.08, 0.32] satisfies Triple,
        rotation: [-Math.PI / 2, 0, 0] satisfies Triple,
      },
      block([0.012, 0.8, 0.02], shades.frame, [0, 0.58, -1.052]),
      ...buildEndWindows(-1.05, -1, [
        { x: 0.17, halfWidth: 0.11, bottom: 0.66, top: 0.86 },
        { x: -0.17, halfWidth: 0.11, bottom: 0.66, top: 0.86 },
      ]),
    ],
  });
};

const buildCamperVan = (colour: string): BufferGeometry => {
  const white = new Color(shades.white);
  const curtain = new Color("#ff8a65");
  const glass = new Color(shades.glass);
  const wheels = fourWheels(
    { radius: 0.17, width: 0.12, rim: shades.white, hubcap: shades.white },
    0.4,
    0.66,
    -0.66,
  );
  return assemble(
    [
      buildBody({
        keys: [
          { z: -1.05, halfWidth: 0.42, bottom: 0.2, top: 0.95 },
          { z: -0.98, halfWidth: 0.46, bottom: 0.15, top: 1.0 },
          { z: 0.92, halfWidth: 0.46, bottom: 0.15, top: 1.0 },
          { z: 1.05, halfWidth: 0.42, bottom: 0.2, top: 0.94 },
        ],
        stations: 34,
        around: 36,
        squareness: 3.4,
        paint: paintCarBody({
          body: colour,
          wheels,
          livery: (spot, section) => {
            const across = findAcross(spot, section);
            if (
              across > 0.88 &&
              spot.y > 0.66 &&
              spot.y < 0.88 &&
              spot.z > -0.9 &&
              spot.z < 0.8
            ) {
              const pane = (spot.z + 0.9) / 0.425;
              const within = pane - Math.floor(pane);
              if (within < 0.08) {
                return white;
              }
              return within < 0.22 || within > 0.86 ? curtain : glass;
            }
            return spot.y > 0.6 ? white : undefined;
          },
        }),
      }),
    ],
    [
      ...buildRoadWheels(wheels),
      ...buildEndWindows(1.05, 1, [
        { x: 0.19, halfWidth: 0.16, bottom: 0.66, top: 0.86 },
        { x: -0.19, halfWidth: 0.16, bottom: 0.66, top: 0.86 },
      ]),
      ...bothSides((side) => [
        block(
          [0.3, 0.06, 0.015],
          shades.white,
          [side * 0.12, 0.48, 1.055],
          [0, 0, side * 0.7],
        ),
        ...buildLamps([[side * 0.3, 0.42, 1.04]], 0.06, shades.headlight, 1),
        block([0.05, 0.03, 0.02], shades.indicator, [side * 0.3, 0.32, 1.04]),
        block([0.06, 0.1, 0.02], shades.tailLight, [side * 0.34, 0.42, -1.04]),
        ...buildMirror(
          [side * 0.46, 0.66, 0.85],
          [side * 0.55, 0.7, 0.83],
          shades.chrome,
        ),
      ]),
      lens(0.07, 0.02, shades.chrome, [0, 0.55, 1.055]),
      lens(0.05, 0.025, colour, [0, 0.55, 1.058]),
      block([0.94, 0.06, 0.06], shades.chrome, [0, 0.2, 1.07]),
      block([0.94, 0.06, 0.06], shades.chrome, [0, 0.21, -1.07]),
      ...buildPlate(1.105, 0.2, shades.plateWhite),
      ...buildPlate(-1.105, 0.3, shades.plate),
      ...buildEndWindows(-1.05, -1, [
        { x: 0, halfWidth: 0.25, bottom: 0.68, top: 0.86 },
      ]),
      block([0.7, 0.08, 1.2], shades.white, [0, 1.04, -0.15]),
      ...bothSides((side) => [
        tube(
          [side * 0.3, 1.13, -0.85],
          [side * 0.3, 1.13, 0.55],
          0.012,
          shades.frame,
          5,
        ),
      ]),
      ball(1, "#ffca28", [0, 1.17, -0.15], [0.13, 0.025, 0.62]),
      ball(1, "#ff7043", [0, 1.18, -0.15], [0.03, 0.022, 0.6]),
    ],
  );
};

const buildFireEngine = (colour: string): BufferGeometry => {
  const stripe = new Color(shades.yellow);
  const white = new Color(shades.white);
  const glass = new Color(shades.glass);
  const wheels: WheelSpec[] = [0.95, -0.8].flatMap((z) =>
    [0.42, -0.42].map((x) => ({ radius: 0.2, width: 0.14, x, z })),
  );
  const livery = (spot: Spot, section: BodySection): Color | undefined => {
    if (findAcross(spot, section) < 0.85) {
      return undefined;
    }
    if (spot.y > 0.26 && spot.y < 0.31) {
      return stripe;
    }
    return spot.y > 0.31 && spot.y < 0.34 ? white : undefined;
  };
  const cab = buildBody({
    keys: [
      { z: 0.48, halfWidth: 0.48, bottom: 0.2, top: 1.08 },
      { z: 1.3, halfWidth: 0.48, bottom: 0.2, top: 1.08 },
      { z: 1.4, halfWidth: 0.44, bottom: 0.24, top: 1.02 },
    ],
    stations: 10,
    around: 28,
    squareness: 4.4,
    paint: paintCarBody({
      body: colour,
      wheels,
      livery: (spot, section) =>
        findAcross(spot, section) > 0.9 &&
        spot.y > 0.66 &&
        spot.y < 0.98 &&
        ((spot.z > 0.95 && spot.z < 1.3) || (spot.z > 0.55 && spot.z < 0.85))
          ? glass
          : livery(spot, section),
    }),
  });
  const body = buildBody({
    keys: [
      { z: -1.4, halfWidth: 0.45, bottom: 0.22, top: 0.94 },
      { z: -1.35, halfWidth: 0.48, bottom: 0.2, top: 0.98 },
      { z: 0.5, halfWidth: 0.48, bottom: 0.2, top: 0.98 },
    ],
    stations: 14,
    around: 28,
    squareness: 4.4,
    paint: paintCarBody({ body: colour, wheels, livery }),
  });
  const shutters = [
    { from: -1.25, to: -0.75 },
    { from: -0.35, to: 0.05 },
    { from: 0.12, to: 0.45 },
  ];
  return assemble(
    [cab, body],
    [
      ...buildRoadWheels(wheels),
      ...bothSides((side) =>
        shutters.flatMap(({ from, to }) => [
          block([0.012, 0.5, to - from], "#cfd8dc", [
            side * 0.482,
            0.62,
            (from + to) / 2,
          ]),
          ...[0, 1, 2, 3].map((slat) =>
            block([0.014, 0.012, to - from], "#90a4ae", [
              side * 0.483,
              0.44 + slat * 0.12,
              (from + to) / 2,
            ]),
          ),
          block([0.016, 0.03, 0.08], shades.chrome, [
            side * 0.484,
            0.4,
            (from + to) / 2,
          ]),
        ]),
      ),
      ...buildEndWindows(1.4, 1, [
        { x: 0.18, halfWidth: 0.17, bottom: 0.66, top: 0.94 },
        { x: -0.18, halfWidth: 0.17, bottom: 0.66, top: 0.94 },
      ]),
      ...bothSides((side) => [
        ...buildLamps([[side * 0.3, 0.42, 1.405]], 0.055, shades.headlight, 1),
        block([0.05, 0.03, 0.02], shades.indicator, [side * 0.38, 0.32, 1.395]),
        ball(0.06, shades.blueLight, [side * 0.3, 1.1, 1.2], [1, 0.8, 1]),
        ball(0.05, shades.blueLight, [side * 0.38, 1.0, -1.32], [1, 0.8, 1]),
        block([0.06, 0.14, 0.02], shades.tailLight, [
          side * 0.38,
          0.45,
          -1.405,
        ]),
        ...buildMirror(
          [side * 0.48, 0.8, 1.32],
          [side * 0.58, 0.85, 1.3],
          shades.black,
        ),
        tube(
          [side * 0.22, 1.05, -1.38],
          [side * 0.22, 1.11, 0.62],
          0.02,
          "#b0bec5",
          6,
        ),
        post(0.03, 0.08, shades.frame, [side * 0.22, 1.01, -1.1]),
        post(0.03, 0.08, shades.frame, [side * 0.22, 1.03, 0.4]),
      ]),
      ...Array.from({ length: 13 }, (_, rung) => {
        const z = -1.32 + rung * 0.155;
        const y = 1.05 + ((z + 1.38) / 2) * 0.06;
        return tube([-0.22, y, z], [0.22, y, z], 0.012, "#b0bec5", 5);
      }),
      block([0.6, 0.06, 0.12], shades.blueLight, [0, 1.11, 1.2]),
      block([0.36, 0.14, 0.02], shades.grille, [0, 0.42, 1.405]),
      block([1.0, 0.1, 0.1], shades.chrome, [0, 0.26, 1.45]),
      block([1.0, 0.08, 0.06], shades.frame, [0, 0.26, -1.42]),
      ...buildPlate(1.506, 0.26, shades.plateWhite),
      {
        geometry: new CylinderGeometry(0.13, 0.13, 0.4, 16),
        colour: shades.frame,
        position: [0, 0.62, -1.43] satisfies Triple,
        rotation: [0, 0, Math.PI / 2] satisfies Triple,
      },
      ...[-0.14, -0.07, 0, 0.07, 0.14].map((x): ModelPart => ({
        geometry: new TorusGeometry(0.13, 0.025, 6, 16),
        colour: shades.yellow,
        position: [x, 0.62, -1.43],
        rotation: [0, Math.PI / 2, 0],
      })),
    ],
  );
};

const buildDoubleDeckerBus = (colour: string): BufferGeometry => {
  const cream = new Color("#fff3d6");
  const wheels: WheelSpec[] = [1.05, -0.95].flatMap((z) =>
    [0.43, -0.43].map((x) => ({ radius: 0.2, width: 0.14, x, z })),
  );
  const lowerPanes = [-1.3, -0.75, -0.2, 0.35].map((from): Pane => ({
    from,
    to: from + 0.47,
    bottom: 0.55,
    top: 0.85,
  }));
  const upperPanes = [-1.4, -0.85, -0.3, 0.25, 0.8].map((from): Pane => ({
    from,
    to: from + 0.47,
    bottom: 1.12,
    top: 1.42,
  }));
  return assemble(
    [
      buildBody({
        keys: [
          { z: -1.6, halfWidth: 0.46, bottom: 0.2, top: 1.56 },
          { z: -1.55, halfWidth: 0.5, bottom: 0.16, top: 1.6 },
          { z: 1.55, halfWidth: 0.5, bottom: 0.16, top: 1.6 },
          { z: 1.6, halfWidth: 0.46, bottom: 0.2, top: 1.56 },
        ],
        stations: 30,
        around: 40,
        squareness: 5,
        paint: paintCarBody({
          body: colour,
          wheels,
          livery: ({ y }) => (y > 0.95 && y < 1.04 ? cream : undefined),
        }),
      }),
    ],
    [
      ...buildRoadWheels(wheels),
      ...buildSideWindows(0.5, [...lowerPanes, ...upperPanes]),
      block([0.014, 0.62, 0.3], shades.frame, [0.5, 0.52, 1.25]),
      block([0.016, 0.56, 0.12], shades.glass, [0.505, 0.54, 1.18]),
      block([0.016, 0.56, 0.12], shades.glass, [0.505, 0.54, 1.32]),
      ...buildEndWindows(1.6, 1, [
        { x: 0, halfWidth: 0.38, bottom: 0.5, top: 0.88 },
        { x: 0.2, halfWidth: 0.17, bottom: 1.12, top: 1.42 },
        { x: -0.2, halfWidth: 0.17, bottom: 1.12, top: 1.42 },
      ]),
      ...buildEndWindows(-1.6, -1, [
        { x: 0, halfWidth: 0.3, bottom: 1.12, top: 1.42 },
        { x: 0, halfWidth: 0.2, bottom: 0.6, top: 0.85 },
      ]),
      block([0.5, 0.08, 0.016], shades.black, [0, 0.99, 1.605]),
      block([0.44, 0.04, 0.018], shades.yellow, [0, 0.99, 1.606]),
      block([0.36, 0.14, 0.02], shades.grille, [0, 0.33, 1.605]),
      block([1.02, 0.08, 0.06], shades.black, [0, 0.22, 1.62]),
      block([1.02, 0.08, 0.06], shades.black, [0, 0.22, -1.62]),
      ...buildPlate(1.655, 0.22, shades.plateWhite),
      ...buildPlate(-1.655, 0.35, shades.plate),
      ...bothSides((side) => [
        ...buildLamps([[side * 0.34, 0.38, 1.605]], 0.055, shades.headlight, 1),
        block([0.05, 0.03, 0.02], shades.indicator, [side * 0.4, 0.28, 1.6]),
        block([0.06, 0.14, 0.02], shades.tailLight, [side * 0.4, 0.4, -1.605]),
        ...buildMirror(
          [side * 0.5, 0.95, 1.5],
          [side * 0.62, 0.88, 1.56],
          shades.black,
        ),
      ]),
    ],
  );
};

const design = (
  model: VehicleModel,
  buildGeometry: (colour: string) => BufferGeometry,
  [length, width, height]: Triple,
  position: Triple,
  pose: RiderPose,
  [topSpeed, acceleration, turnRate]: Triple,
): VehicleDesign => ({
  model,
  buildGeometry,
  length,
  width,
  height,
  rider: { position, pose },
  topSpeed,
  acceleration,
  turnRate,
});

export const vehicleDesigns: Record<VehicleModel, VehicleDesign> = {
  bicycle: design(
    "bicycle",
    buildBicycle,
    [0.96, 0.37, 0.63],
    [0, 0.25, -0.1],
    "seated",
    [7, 5, 2.8],
  ),
  "tandem-bicycle": design(
    "tandem-bicycle",
    buildTandemBicycle,
    [1.42, 0.37, 0.63],
    [0, 0.25, 0.03],
    "seated",
    [7.5, 4.5, 2.3],
  ),
  "penny-farthing": design(
    "penny-farthing",
    buildPennyFarthing,
    [1.16, 0.52, 0.99],
    [0, 0.68, -0.04],
    "seated",
    [6, 3.5, 2.2],
  ),
  tricycle: design(
    "tricycle",
    buildTricycle,
    [0.9, 0.57, 0.61],
    [0, 0.17, -0.06],
    "seated",
    [6, 5, 2.9],
  ),
  "kick-scooter": design(
    "kick-scooter",
    buildKickScooter,
    [0.89, 0.39, 0.82],
    [0, 0.1, -0.05],
    "standing",
    [6.5, 5.5, 3],
  ),
  skateboard: design(
    "skateboard",
    buildSkateboard,
    [0.8, 0.25, 0.14],
    [0, 0.105, 0],
    "standing",
    [7, 5, 3.2],
  ),
  motorcycle: design(
    "motorcycle",
    buildMotorcycle,
    [1.27, 0.53, 0.85],
    [0, 0.29, -0.17],
    "seated",
    [16, 10, 2.4],
  ),
  moped: design(
    "moped",
    buildMoped,
    [1.07, 0.49, 0.89],
    [0, 0.25, -0.24],
    "seated",
    [10, 6, 2.6],
  ),
  "quad-bike": design(
    "quad-bike",
    buildQuadBike,
    [1.12, 0.86, 0.69],
    [0, 0.31, -0.1],
    "seated",
    [12, 8, 2.4],
  ),
  "horse-and-cart": design(
    "horse-and-cart",
    buildHorseAndCart,
    [2.25, 1.04, 1.16],
    [0, 0.41, -0.33],
    "seated",
    [6.5, 3.5, 1.8],
  ),
  "family-car": design(
    "family-car",
    buildFamilyCar,
    [1.77, 0.96, 0.69],
    familyCarRider,
    "seated",
    [12, 7, 2.1],
  ),
  "sports-car": design(
    "sports-car",
    buildSportsCar,
    [1.84, 0.98, 0.58],
    sportsCarRider,
    "seated",
    [19, 11, 2.3],
  ),
  van: design(
    "van",
    buildDeliveryVan,
    [2.2, 1.16, 1.07],
    [0, 0.25, 0.4],
    "hidden",
    [11, 6, 1.8],
  ),
  "pickup-truck": design(
    "pickup-truck",
    buildPickupTruck,
    [1.98, 1.06, 0.95],
    pickupRider,
    "seated",
    [12.5, 7, 1.9],
  ),
  jeep: design(
    "jeep",
    buildJeep,
    [1.81, 0.95, 1.01],
    jeepRider,
    "seated",
    [12, 7.5, 2.1],
  ),
  taxi: design(
    "taxi",
    buildTaxi,
    [1.77, 1.04, 0.91],
    saloonRider,
    "seated",
    [12, 7, 2.2],
  ),
  "police-car": design(
    "police-car",
    buildPoliceCar,
    [1.8, 1.04, 0.9],
    saloonRider,
    "seated",
    [15, 9, 2.2],
  ),
  "fire-engine": design(
    "fire-engine",
    buildFireEngine,
    [3.1, 1.22, 1.15],
    [0, 0.4, 1.0],
    "hidden",
    [11, 5, 1.7],
  ),
  ambulance: design(
    "ambulance",
    buildAmbulance,
    [2.2, 1.16, 1.13],
    [0, 0.25, 0.4],
    "hidden",
    [13, 7, 1.9],
  ),
  "double-decker-bus": design(
    "double-decker-bus",
    buildDoubleDeckerBus,
    [3.32, 1.3, 1.6],
    [0, 0.35, 1.3],
    "hidden",
    [10, 4, 1.6],
  ),
  "ice-cream-van": design(
    "ice-cream-van",
    buildIceCreamVan,
    [2.2, 1.2, 1.65],
    [0, 0.25, 0.4],
    "hidden",
    [9, 5, 1.8],
  ),
  tractor: design(
    "tractor",
    buildTractor,
    [1.55, 1.08, 1.09],
    tractorRider,
    "seated",
    [6, 4, 1.9],
  ),
  "golf-buggy": design(
    "golf-buggy",
    buildGolfBuggy,
    [1.45, 0.73, 1.05],
    golfBuggyRider,
    "seated",
    [8, 5, 2.6],
  ),
  "go-kart": design(
    "go-kart",
    buildGoKart,
    [1.15, 0.84, 0.49],
    goKartRider,
    "seated",
    [13, 10, 3],
  ),
  "monster-truck": design(
    "monster-truck",
    buildMonsterTruck,
    [2.12, 1.48, 1.52],
    monsterRider,
    "seated",
    [13, 8, 1.8],
  ),
  "camper-van": design(
    "camper-van",
    buildCamperVan,
    [2.22, 1.16, 1.2],
    [0, 0.3, 0.6],
    "hidden",
    [10, 5, 1.8],
  ),
  "racing-car": design(
    "racing-car",
    buildRacingCar,
    [1.92, 1, 0.65],
    racingRider,
    "seated",
    [20, 12, 2.5],
  ),
  "vintage-car": design(
    "vintage-car",
    buildVintageCar,
    [1.9, 0.88, 0.81],
    vintageRider,
    "seated",
    [10, 5, 2],
  ),
  "dune-buggy": design(
    "dune-buggy",
    buildDuneBuggy,
    [1.5, 0.96, 1.02],
    duneBuggyRider,
    "seated",
    [14, 9, 2.5],
  ),
  "tuk-tuk": design(
    "tuk-tuk",
    buildTukTuk,
    [1.5, 0.88, 1.2],
    tukTukRider,
    "seated",
    [9, 6, 2.6],
  ),
};

const isVehicleModel = (model: string): model is VehicleModel =>
  vehicleModels.some((each) => each === model);

export const findVehicleDesign = (model: string): VehicleDesign | undefined =>
  isVehicleModel(model) ? vehicleDesigns[model] : undefined;
