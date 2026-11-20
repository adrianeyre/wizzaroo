import { LatheGeometry, SphereGeometry, TorusGeometry, Vector2 } from "three";
import {
  addBench,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type PlayRide,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

/*
 * A huge, friendly model heart with a smiling face, standing between
 * a pair of pink lungs. The Character walks right through it along a
 * tunnel past glowing windows into its four chambers, and can ride
 * round the body as a red blood cell: in through the vena cava, out to
 * a lung to collect oxygen, back through the heart and up the aorta.
 */

const muscle = "#c8343f";
const muscleLight = "#e0606a";
const muscleDark = "#9a2430";
const atriumRed = "#b02a3a";
const arteryRed = "#d82a35";
const veinBlue = "#3a5bd0";
const lungPink = "#ec9fae";
const lungDeep = "#d27a8c";
const tunnelPink = "#f3c6cc";
const fat = "#f2d48a";
const paving = "#c7c9d6";
const signColour = "#7a1f3a";
const glowCyan = "#7ff3ff";
const glowViolet = "#b48cff";

const footprint = 9;

/* The heart's body: a rounded cone, its apex leaning a little to +x */
const centreY = 2.9;
const radiusX = 2.6;
const radiusY = 2.4;
const radiusZ = 2.1;
const apexLean = 0.5;

/* The tunnel through the middle, along z */
const tunnelHalf = 0.9;
const tunnelSpring = 1.6;
const tunnelFrom = -2.0;
const tunnelTo = 2.0;

const pinchAt = (up: number) => (up < 0 ? 1 + up * 0.55 : 1);

/** Where a point of a unit sphere lands on the heart's surface. */
const toHeart = (x: number, y: number, z: number): Triple => {
  const pinch = pinchAt(y);
  const lean = y < 0 ? apexLean * y * y : 0;
  return [
    x * radiusX * pinch + lean,
    centreY + y * radiusY * (y < 0 ? 1.25 : 1),
    z * radiusZ * pinch,
  ];
};

/** The front of the heart's surface at a height above `centreY`. */
const findFront = (x: number, y: number): number => {
  const up = (y - centreY) / radiusY;
  const across = x / radiusX;
  return radiusZ * Math.sqrt(Math.max(0, 1 - up * up - across * across));
};

const isInTunnel = (x: number, y: number) =>
  (y < tunnelSpring && Math.abs(x) < tunnelHalf + 0.05) ||
  x * x + (y - tunnelSpring) ** 2 < (tunnelHalf + 0.05) ** 2;

const buildBody = (builder: AttractionBuilder) => {
  const body = new SphereGeometry(
    1,
    builder.segments(36, 16),
    builder.segments(24, 10),
  );
  const positions = body.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    positions.setXYZ(
      index,
      ...toHeart(
        positions.getX(index),
        positions.getY(index),
        positions.getZ(index),
      ),
    );
  }
  builder.painted(
    body,
    (centre) => {
      if (isInTunnel(centre.x, centre.y)) {
        return undefined;
      }
      /* Darker grooves where the coronary vessels run, lighter muscle above */
      const groove = Math.abs(centre.x + 0.35 - (centre.y - centreY) * 0.25);
      if (groove < 0.12 && centre.z > 0) {
        return { colour: muscleDark, finish: "paint" };
      }
      return {
        colour: shade(muscle, 0.92 + 0.05 * (centre.y / radiusY)),
        finish: "paint",
      };
    },
    {},
    "paint",
  );
  /* The two atria, sitting on top towards the back */
  builder.sphere(
    "paint",
    atriumRed,
    1.05,
    [-1.3, 4.65, -0.35],
    [1, 0.85, 1],
    14,
  );
  builder.sphere(
    "paint",
    shade(atriumRed, 0.92),
    0.9,
    [1.25, 4.75, -0.6],
    [1, 0.85, 1],
    14,
  );
  if (builder.isFar) {
    return;
  }
  /* Ear-like flaps on the atria, and a little yellow fat along the groove */
  builder.sphere(
    "paint",
    muscleLight,
    0.42,
    [-2.0, 4.4, 0.45],
    [1, 0.6, 0.8],
    10,
  );
  builder.sphere(
    "paint",
    muscleLight,
    0.36,
    [1.85, 4.55, 0.2],
    [1, 0.6, 0.8],
    10,
  );
  [0.2, 0.55, 0.9].forEach((share, index) => {
    const y = 4.2 - share * 1.4;
    const x = -0.35 + (y - centreY) * 0.25;
    builder.sphere(
      "matte",
      fat,
      0.16 - index * 0.02,
      [x + 0.15, y, findFront(x + 0.15, y) + 0.02],
      [1.3, 0.8, 0.6],
      8,
    );
  });
};

/* The friendly face over the tunnel */

const buildFace = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    const x = side * 0.85;
    const y = 3.55;
    const z = findFront(x, y);
    builder.sphere(
      "paint",
      palette.white,
      0.36,
      [x, y, z - 0.05],
      [1, 1.15, 0.6],
      14,
    );
    builder.sphere(
      "paint",
      "#1c1a2e",
      0.18,
      [x + side * 0.03, y - 0.04, z + 0.13],
      [1, 1.1, 0.6],
      12,
    );
    if (!builder.isFar) {
      builder.sphere(
        "glow",
        palette.white,
        0.06,
        [x - 0.06, y + 0.06, z + 0.22],
        [1, 1, 0.6],
        6,
      );
      /* Rosy cheeks */
      const cheekX = side * 1.55;
      builder.sphere(
        "matte",
        "#f08a9a",
        0.26,
        [cheekX, 2.95, findFront(cheekX, 2.95) - 0.02],
        [1, 0.7, 0.4],
        10,
      );
      /* Eyebrows */
      builder.box(
        "paint",
        muscleDark,
        [0.4, 0.07, 0.08],
        [x, y + 0.5, z - 0.04],
        [0, 0, side * -0.18],
      );
    }
  });
};

/* The tunnel through the septum, lined in pink, with windows into each chamber */

const buildTunnel = (builder: AttractionBuilder) => {
  const length = tunnelTo - tunnelFrom;
  const middle = (tunnelFrom + tunnelTo) / 2;
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      tunnelPink,
      [0.12, tunnelSpring, length],
      [side * (tunnelHalf + 0.06), tunnelSpring / 2, middle],
    );
  });
  const ribs = builder.isFar ? 5 : 11;
  for (let rib = 0; rib < ribs; rib++) {
    const from = (rib / ribs) * Math.PI;
    const to = ((rib + 1) / ribs) * Math.PI;
    const angle = (from + to) / 2;
    const reach = tunnelHalf + 0.06;
    const chord = 2 * reach * Math.sin((to - from) / 2) + 0.02;
    builder.box(
      "paint",
      rib % 2 === 0 ? tunnelPink : shade(tunnelPink, 0.94),
      [chord, 0.12, length],
      [Math.cos(angle) * reach, tunnelSpring + Math.sin(angle) * reach, middle],
      [0, 0, angle - Math.PI / 2],
    );
  }
  /* Red portals round each end of the tunnel */
  [tunnelFrom, tunnelTo].forEach((z) => {
    builder.torus(
      "paint",
      muscleDark,
      tunnelHalf + 0.12,
      0.14,
      [0, tunnelSpring, z],
      "z",
      builder.segments(20, 10),
    );
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        muscleDark,
        [0.28, tunnelSpring, 0.28],
        [side * (tunnelHalf + 0.12), tunnelSpring / 2, z],
      );
    });
  });
  /* The floor: a soft path right through */
  builder.box(
    "matte",
    paving,
    [tunnelHalf * 2 - 0.05, 0.04, 9.4],
    [0, 0.02, 1.2],
  );
  if (builder.isFar) {
    return;
  }
  /* Glowing windows, two a side: right atrium and ventricle, left atrium and ventricle */
  const windows: { x: number; z: number; colour: string }[] = [
    { x: -1, z: 0.9, colour: glowViolet },
    { x: -1, z: -0.9, colour: glowViolet },
    { x: 1, z: 0.9, colour: glowCyan },
    { x: 1, z: -0.9, colour: glowCyan },
  ];
  windows.forEach(({ x, z, colour }) => {
    builder.box("glow", colour, [0.03, 0.6, 0.8], [x * tunnelHalf, 1.0, z]);
    builder.box(
      "paint",
      muscleDark,
      [0.05, 0.08, 0.9],
      [x * tunnelHalf, 1.33, z],
    );
    builder.box(
      "paint",
      muscleDark,
      [0.05, 0.08, 0.9],
      [x * tunnelHalf, 0.67, z],
    );
    /* A little arrow showing which way the blood flows */
    builder.cylinder("paint", x < 0 ? veinBlue : arteryRed, {
      radius: 0.1,
      radiusEnd: 0,
      length: 0.22,
      at: [x * (tunnelHalf - 0.02), 1.6, z],
      segments: 6,
    });
  });
  /* Strings of fairy lights along the ceiling */
  for (let light = 0; light < 7; light++) {
    builder.sphere(
      "glow",
      light % 2 === 0 ? palette.warmLight : glowCyan,
      0.05,
      [0, tunnelSpring + tunnelHalf - 0.04, tunnelFrom + 0.3 + light * 0.57],
      [1, 1, 1],
      6,
    );
  }
};

/* The great blood vessels on top */

const tube = (
  builder: AttractionBuilder,
  colour: string,
  points: readonly Triple[],
  thickness: number,
) => {
  points.slice(1).forEach((to, index) => {
    builder.bar(
      "paint",
      colour,
      points[index],
      to,
      thickness,
      thickness >= 0.3 ? 10 : 6,
    );
    if (index > 0 && thickness >= 0.25) {
      builder.sphere(
        "paint",
        colour,
        thickness / 2,
        points[index],
        [1, 1, 1],
        thickness >= 0.5 ? 10 : 8,
      );
    }
  });
};

const buildVessels = (builder: AttractionBuilder) => {
  /* The aorta arches up and over to the back, then down */
  tube(
    builder,
    arteryRed,
    [
      [0.25, 4.6, 0.2],
      [0.3, 5.7, 0.1],
      [0.35, 6.15, -0.5],
      [0.4, 5.9, -1.2],
      [0.45, 4.9, -1.7],
      [0.5, 3.4, -1.9],
    ],
    0.7,
  );
  /* Three branches off the top of the arch */
  [-0.25, 0.05, 0.35].forEach((dz, index) => {
    builder.bar(
      "paint",
      arteryRed,
      [0.35, 6.0, dz - 0.5],
      [0.35 + (index - 1) * 0.35, 6.9 - index * 0.12, dz - 0.5],
      0.22,
      8,
    );
  });
  /* The pulmonary trunk, carrying blood to the lungs */
  tube(
    builder,
    veinBlue,
    [
      [-0.45, 4.3, 0.75],
      [-0.5, 5.25, 0.7],
    ],
    0.6,
  );
  [-1, 1].forEach((side) => {
    tube(
      builder,
      veinBlue,
      [
        [-0.5, 5.25, 0.7],
        [side * 1.8 - 0.3, 5.0, 0.2],
        [side * 4.1, 3.5, -0.5],
      ],
      0.34,
    );
    /* Pulmonary veins, bringing the blood back full of oxygen */
    tube(
      builder,
      arteryRed,
      [
        [side * 3.85, 3.0, -0.9],
        [side * 2.2, 3.9, -1.2],
        [1.2, 4.4, -1.1],
      ],
      0.26,
    );
  });
  /* The vena cavae, bringing used blood back from the body */
  tube(
    builder,
    veinBlue,
    [
      [-1.5, 4.9, -0.2],
      [-1.55, 6.4, -0.2],
    ],
    0.55,
  );
  tube(
    builder,
    veinBlue,
    [
      [-1.4, 2.6, -1.1],
      [-1.5, 1.4, -1.6],
      [-1.5, 0.0, -1.7],
    ],
    0.55,
  );
  if (builder.isFar) {
    return;
  }
  /* Coronary arteries and veins draped over the muscle */
  const coronary = (colour: string, x: number, from: number, to: number) => {
    const steps = 5;
    const points = Array.from({ length: steps + 1 }, (_, step): Triple => {
      const y = from + ((to - from) * step) / steps;
      const across = x + (y - centreY) * 0.25 + Math.sin(step * 1.7) * 0.12;
      return [across, y, findFront(across, y) + 0.03];
    });
    tube(builder, colour, points, 0.09);
  };
  coronary(arteryRed, -0.35, 4.3, 2.4);
  coronary(veinBlue, -0.18, 4.1, 2.5);
  coronary(arteryRed, 1.6, 4.2, 2.8);
  coronary(arteryRed, -1.75, 4.0, 2.9);
};

/* The lungs either side */

const lungAt = (side: number) => ({ x: side * 4.45, z: -0.7 });

const buildLungs = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    const { x, z } = lungAt(side);
    builder.cylinder("matte", paving, {
      radius: 1.25,
      radiusEnd: 1.35,
      length: 0.24,
      at: [x, 0.12, z],
      segments: builder.segments(18, 10),
    });
    const profile: [number, number][] = [
      [0.001, 0.22],
      [0.85, 0.28],
      [1.12, 0.6],
      [1.2, 1.2],
      [1.12, 1.95],
      [0.92, 2.65],
      [0.62, 3.25],
      [0.32, 3.7],
      [0.001, 3.88],
    ];
    const radiusAt = (y: number) => {
      const above = profile.findIndex(([, height]) => height >= y);
      if (above <= 0) {
        return profile[Math.max(0, above)][0];
      }
      const [lowR, lowY] = profile[above - 1];
      const [highR, highY] = profile[above];
      return lowR + ((highR - lowR) * (y - lowY)) / (highY - lowY);
    };
    builder.add(
      "matte",
      lungPink,
      new LatheGeometry(
        profile.map(([radius, height]) => new Vector2(radius, height)),
        builder.segments(18, 10),
      ),
      { at: [x, 0, z], scale: [1, 1, 0.78] },
    );
    /* The fissure between the lobes */
    builder.add(
      "matte",
      lungDeep,
      new TorusGeometry(1.13, 0.045, 4, builder.segments(20, 10)).rotateX(
        Math.PI / 2,
      ),
      { at: [x, 1.95, z], rotation: [0, 0, side * 0.32], scale: [1, 1, 0.8] },
    );
    if (builder.isFar) {
      return;
    }
    /* The bronchial tree, branching over the front like an upside-down tree */
    const onFront = (dx: number, y: number): Triple => [
      x + dx,
      y,
      z + Math.sqrt(Math.max(0, radiusAt(y) ** 2 - dx * dx)) * 0.78 + 0.02,
    ];
    const branches: [number, number, number, number, number][] = [
      [-side * 0.45, 3.2, -side * 0.15, 2.45, 0.13],
      [-side * 0.15, 2.45, side * 0.45, 1.7, 0.09],
      [-side * 0.15, 2.45, -side * 0.55, 1.6, 0.09],
      [side * 0.45, 1.7, side * 0.75, 1.05, 0.06],
      [side * 0.45, 1.7, side * 0.15, 0.95, 0.06],
      [-side * 0.55, 1.6, -side * 0.85, 0.95, 0.06],
      [-side * 0.55, 1.6, -side * 0.3, 0.85, 0.06],
      [-side * 0.15, 2.45, side * 0.35, 2.95, 0.07],
    ];
    branches.forEach(([fromX, fromY, toX, toY, thickness]) => {
      builder.bar(
        "matte",
        "#fbe0e6",
        onFront(fromX, fromY),
        onFront(toX, toY),
        thickness,
        5,
      );
    });
  });
};

/* The garden round about */

const monitorAt = { x: 2.6, z: 3.4 };

const buildGarden = (builder: AttractionBuilder) => {
  /* Red and blue flower beds either side of the path */
  [-1, 1].forEach((side) => {
    const x = side * 2.4;
    builder.cylinder("matte", palette.soil, {
      radius: 0.9,
      length: 0.12,
      at: [x, 0.06, 5.3],
      segments: builder.segments(14, 8),
    });
    if (builder.isFar) {
      return;
    }
    for (let flower = 0; flower < 9; flower++) {
      const angle = flower * 2.4;
      const reach = 0.25 + (flower % 3) * 0.2;
      const fx = x + Math.sin(angle) * reach;
      const fz = 5.3 + Math.cos(angle) * reach;
      builder.cylinder("matte", palette.leaf, {
        radius: 0.02,
        length: 0.3,
        at: [fx, 0.27, fz],
        segments: 4,
      });
      builder.sphere(
        "matte",
        side < 0
          ? flower % 2 === 0
            ? arteryRed
            : "#ff7a8a"
          : flower % 2 === 0
            ? veinBlue
            : "#8aa8ff",
        0.08,
        [fx, 0.45, fz],
        [1, 0.8, 1],
        6,
      );
    }
  });
  /* The monitor's plinth, from which a heartbeat screen pops up */
  builder.box(
    "paint",
    "#2b2f6b",
    [0.7, 0.4, 0.5],
    [monitorAt.x, 0.2, monitorAt.z],
  );
  builder.box(
    "glow",
    glowCyan,
    [0.5, 0.03, 0.3],
    [monitorAt.x, 0.41, monitorAt.z],
  );
  if (builder.isFar) {
    return;
  }
  addBench(builder, [-3.6, 0, 3.6], Math.PI / 2 + 0.6, "#c8343f");
  addBench(builder, [4.2, 0, -3.8], -Math.PI / 4 - Math.PI / 2, "#3a5bd0");
  /* Lamps with glowing heart-red and cyan globes */
  const lamps: [number, number, string][] = [
    [-1.4, 6.2, arteryRed],
    [1.4, 6.2, glowCyan],
    [-1.4, -3.2, glowCyan],
    [1.4, -3.2, arteryRed],
  ];
  lamps.forEach(([x, z, colour]) => {
    const at: Triple = [x, 0, z];
    builder.cylinder("paint", "#2b2f6b", {
      radius: 0.05,
      length: 2.1,
      at: [at[0], 1.05, at[2]],
      segments: 8,
    });
    builder.cylinder("paint", "#2b2f6b", {
      radius: 0.12,
      length: 0.2,
      at: [at[0], 0.1, at[2]],
      segments: 8,
    });
    builder.sphere("glow", colour, 0.2, [at[0], 2.25, at[2]], [1, 1, 1], 8);
  });
};

/* Moving parts */

const buildCell = (builder: AttractionBuilder, colour: string) => {
  builder.torus(
    "paint",
    colour,
    0.2,
    0.1,
    [0, 0, 0],
    "y",
    builder.isFar ? 8 : 10,
  );
  builder.cylinder("paint", shade(colour, 0.82), {
    radius: 0.2,
    length: 0.08,
    at: [0, 0, 0],
    segments: builder.isFar ? 6 : 12,
  });
};

const buildHighCell = (builder: AttractionBuilder) => {
  buildCell(builder, "#e3343f");
};

const buildLowCell = (builder: AttractionBuilder) => {
  buildCell(builder, "#9a2a52");
};

/** One heart valve: three leaflets hanging from the arch, flapping as you pass. */
const buildValve = (builder: AttractionBuilder) => {
  [-0.45, 0, 0.45].forEach((x, index) => {
    builder.sphere(
      "paint",
      index === 1 ? "#f7e0e3" : "#f0d0d6",
      0.24,
      [x, -0.3, 0],
      [1, 1.35, 0.18],
      8,
    );
  });
  builder.box("paint", muscleDark, [1.5, 0.08, 0.1], [0, 0, 0]);
};

const buildMonitor = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.steel, {
    radius: 0.05,
    length: 0.9,
    at: [0, -0.25, 0],
    segments: 8,
  });
  builder.box("paint", "#2b2f6b", [0.9, 0.6, 0.12], [0, 0.45, 0]);
  builder.box("glow", "#0c1430", [0.78, 0.48, 0.02], [0, 0.45, 0.065]);
  if (builder.isFar) {
    return;
  }
  /* The heartbeat trace: flat, a spike, flat again */
  const trace: [number, number][] = [
    [-0.36, 0.42],
    [-0.12, 0.42],
    [-0.06, 0.62],
    [0.0, 0.28],
    [0.05, 0.5],
    [0.1, 0.42],
    [0.36, 0.42],
  ];
  trace.slice(1).forEach(([x, y], index) => {
    const [fromX, fromY] = trace[index];
    builder.bar(
      "glow",
      "#5dff9a",
      [fromX, fromY, 0.08],
      [x, y, 0.08],
      0.025,
      4,
    );
  });
  builder.sphere("glow", arteryRed, 0.05, [0.3, 0.6, 0.08], [1, 1, 1], 6);
};

/* Wanderers: friendly white blood cells */

const buildWhiteCell = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#f4f1fa", 0.3, [0, 0.3, 0], [1, 0.9, 1], 10);
  if (builder.isFar) {
    return;
  }
  for (let bump = 0; bump < 4; bump++) {
    const angle = ((bump + 0.5) / 4) * Math.PI * 2;
    builder.sphere(
      "matte",
      "#e6e2f2",
      0.12,
      [Math.sin(angle) * 0.26, 0.38, Math.cos(angle) * 0.24 - 0.04],
      [1, 1, 1],
      5,
    );
  }
  [-0.09, 0.09].forEach((x) => {
    builder.sphere("paint", "#1c1a2e", 0.04, [x, 0.4, 0.27], [1, 1, 0.6], 6);
  });
};

/* The blood cell ride */

const followPath = (
  points: readonly (readonly [number, number, number, number?])[],
  progress: number,
): LocalSpot => {
  const legs = points.slice(1).map((to, index) => {
    const from = points[index];
    return {
      from,
      to,
      length:
        Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) +
        (from[3] ?? 0),
    };
  });
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  let left = Math.min(1, Math.max(0, progress)) * total;
  let heading = 0;
  for (const leg of legs) {
    const flat = Math.hypot(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    if (flat > 0.05) {
      heading = Math.atan2(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    }
    if (left <= leg.length || leg === legs[legs.length - 1]) {
      const wait = leg.from[3] ?? 0;
      const share = Math.min(
        1,
        Math.max(0, (left - wait) / Math.max(0.001, leg.length - wait)),
      );
      return {
        x: leg.from[0] + (leg.to[0] - leg.from[0]) * share,
        y: leg.from[1] + (leg.to[1] - leg.from[1]) * share,
        z: leg.from[2] + (leg.to[2] - leg.from[2]) * share,
        heading,
      };
    }
    left -= leg.length;
  }
  return { x: 0, y: 0, z: 0, heading };
};

const bloodStart = { x: -2.6, z: 1.8 };
const bloodFinish = { x: 2.2, z: -3.4 };
const bloodPath: readonly (readonly [number, number, number, number?])[] = [
  [bloodStart.x, 0, bloodStart.z],
  [-1.5, 0.1, -1.7],
  [-1.4, 2.4, -1.0],
  [-1.2, 3.6, -0.2, 1],
  [-0.6, 1.9, 0.4],
  [-0.5, 5.25, 0.7],
  [-1.8, 5.0, 0.2],
  [-4.1, 3.5, -0.5],
  [-4.4, 2.5, -0.5, 1.5],
  [-3.85, 3.0, -0.9],
  [-2.2, 3.9, -1.2],
  [1.2, 4.4, -1.1, 1],
  [0.7, 1.9, -0.3],
  [0.3, 5.7, 0.1],
  [0.35, 6.15, -0.5],
  [0.4, 5.9, -1.2],
  [0.5, 3.4, -1.9],
  [0.9, 0.0, -2.8],
  [bloodFinish.x, 0, bloodFinish.z],
];

const bloodRide: PlayRide = {
  id: "blood-cell",
  name: "the blood cell ride",
  start: bloodStart,
  reach: 0.55,
  seconds: 18,
  finish: bloodFinish,
  follow: (progress) => followPath(bloodPath, progress),
};

export const giantHeartModel: NewLandAttractionModel = {
  kind: "giant-heart",
  islandId: "starfall-isle",
  name: "Giant Heart",
  fact: "Your heart is a strong muscle, about the size of your fist, that pumps blood all round your body through tubes called blood vessels. Blood carries oxygen from your lungs, and goodness from your food, to every part of you, then comes back to be pumped again. A child's heart beats about 100,000 times every day.",
  curriculumLink:
    "Science, Year 6: animals including humans. The main parts of the circulatory system, and the jobs of the heart, blood vessels and blood.",
  footprint,
  setting: "inland",
  signSpot: { x: 3.6, z: 7.6 },
  build: (builder) => {
    buildBody(builder);
    buildFace(builder);
    buildTunnel(builder);
    buildVessels(builder);
    buildLungs(builder);
    buildGarden(builder);
    addSignBoard(builder, [3.75, 0, 6.85], signColour, -0.2);
  },
  moving: [
    {
      name: "oxygen-rich cells",
      pivot: [0, 5.4, 0],
      build: buildHighCell,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 3.3,
        count: 6,
        speed: 0.6,
        isFacingAlong: true,
        bob: 0.25,
      },
    },
    {
      name: "returning cells",
      pivot: [0, 2.2, 0],
      build: buildLowCell,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 3.0,
        count: 3,
        speed: -0.45,
        isFacingAlong: true,
        bob: 0.2,
      },
    },
    {
      name: "front valve",
      pivot: [0, tunnelSpring + tunnelHalf - 0.08, tunnelTo - 0.3],
      build: buildValve,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 3.5,
        amplitude: 0.7,
        period: 0.85,
      },
    },
    {
      name: "back valve",
      pivot: [0, tunnelSpring + tunnelHalf - 0.08, tunnelFrom + 0.3],
      build: buildValve,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 3.5,
        amplitude: 0.7,
        period: 0.85,
        phase: Math.PI,
      },
    },
    {
      name: "heartbeat monitor",
      pivot: [monitorAt.x, -0.9, monitorAt.z],
      build: buildMonitor,
      motion: { kind: "rise", reach: 4, height: 1.6, period: 0.85 },
    },
  ],
  wanderers: [
    {
      name: "white blood cells",
      build: buildWhiteCell,
      count: 3,
      centre: { x: 0, z: 4.6 },
      radius: 2.6,
      speed: 0.5,
      bob: 0.08,
    },
  ],
  rides: [bloodRide],
  play: {
    label: "Feel the heartbeat",
    news: "Lub-dub, lub-dub! The giant heart beat 70 times in a minute, pushing blood out to the lungs and all round the body and back again.",
  },
};
