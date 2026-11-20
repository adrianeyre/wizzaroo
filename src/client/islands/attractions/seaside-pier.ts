import {
  BoxGeometry,
  Euler,
  Quaternion,
  Vector3,
  ConeGeometry,
  CylinderGeometry,
  Shape,
  TorusGeometry,
} from "three";
import {
  addBench,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "./attraction-kit.js";
import {
  addBeachHut,
  addBulb,
  addDeckchair,
  addKiosk,
  addPierLamp,
  addPunchBooth,
  addRailing,
  buildGull,
  buildPunch,
  buildSweep,
  copperGreen,
  gold,
  ironwork,
  navy,
  stripeCream,
  stripeRed,
  type SweepRing,
} from "./seaside-pier-parts.js";

/* Layout: the land (+z) has the promenade; the pier runs out to sea (-z). */

const deckY = 1.2;
const deckThickness = 0.14;
const deckHalf = 1.6;
const seaWallZ = 3.8;
const rampFoot = 7.4;
const promenadeY = 0.06;
const entrance = { minX: -3.3, maxX: 3.3, minZ: 0.4, maxZ: seaWallZ };
const neck = { minX: -deckHalf, maxX: deckHalf, minZ: -8.5, maxZ: 0.4 };
const head = { minX: -3.4, maxX: 3.4, minZ: -12.8, maxZ: -8.5 };

interface Area {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const isInside = ({ x, z }: LocalPoint, area: Area, margin = 0): boolean =>
  x >= area.minX - margin &&
  x <= area.maxX + margin &&
  z >= area.minZ - margin &&
  z <= area.maxZ + margin;

const plankShades = ["#a8794d", "#9a6c43", "#b28657", "#a07247"];

const addDeckSlab = (builder: AttractionBuilder, area: Area) => {
  const length = area.maxZ - area.minZ;
  const planks = builder.isFar ? 1 : Math.round(length / 0.26);
  const step = length / planks;
  builder.painted(
    new BoxGeometry(area.maxX - area.minX, deckThickness, length, 1, 1, planks),
    (centre, normal) => {
      if (normal.y < 0.5) {
        return "#5a3e28";
      }
      if (builder.isFar) {
        return plankShades[0];
      }
      const plank = Math.floor((centre.z - area.minZ) / step);
      return plankShades[
        (plank * 7 + Math.round(area.minX)) % plankShades.length
      ];
    },
    {
      at: [
        (area.minX + area.maxX) / 2,
        deckY - deckThickness / 2,
        (area.minZ + area.maxZ) / 2,
      ],
    },
    "matte",
    undefined,
  );
};

/* The ironwork under the deck */

const legStations: { z: number; xs: number[] }[] = [
  { z: 3.3, xs: [-3.1, -1.45, 1.45, 3.1] },
  { z: 0.7, xs: [-3.1, -1.45, 1.45, 3.1] },
  { z: -1.9, xs: [-1.45, 1.45] },
  { z: -4.5, xs: [-1.45, 1.45] },
  { z: -7.1, xs: [-1.45, 1.45] },
  { z: -8.8, xs: [-3.2, -1.45, 1.45, 3.2] },
  { z: -10.7, xs: [-3.2, -1.45, 1.45, 3.2] },
  { z: -12.55, xs: [-3.2, -1.45, 1.45, 3.2] },
];
const legFoot = -2.6;
const chordLow = 0.62;
const chordHigh = deckY - deckThickness - 0.05;

const addGirder = (
  builder: AttractionBuilder,
  x: number,
  fromZ: number,
  toZ: number,
) => {
  const length = toZ - fromZ;
  [chordLow, chordHigh].forEach((y) => {
    builder.box(
      "paint",
      ironwork,
      [0.1, 0.09, length],
      [x, y, (fromZ + toZ) / 2],
    );
  });
  if (builder.isFar) {
    return;
  }
  const bays = Math.round(length / 0.7);
  const bay = length / bays;
  const rise = chordHigh - chordLow;
  const tilt = Math.atan2(bay, rise);
  for (let index = 0; index < bays; index++) {
    builder.box(
      "paint",
      ironwork,
      [0.04, Math.hypot(bay, rise), 0.04],
      [x, (chordLow + chordHigh) / 2, fromZ + bay * (index + 0.5)],
      [index % 2 === 0 ? tilt : -tilt, 0, 0],
    );
  }
};

const addBrace = (builder: AttractionBuilder, from: Triple, to: Triple) => {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.clone().normalize(),
    ),
  );
  const middle = start.add(direction.clone().multiplyScalar(0.5));
  builder.add(
    "paint",
    ironwork,
    new CylinderGeometry(0.025, 0.025, direction.length(), 4, 1, true),
    {
      at: [middle.x, middle.y, middle.z],
      rotation: [turn.x, turn.y, turn.z],
    },
    undefined,
  );
};

const addCrossGirder = (
  builder: AttractionBuilder,
  z: number,
  fromX: number,
  toX: number,
) => {
  builder.box(
    "paint",
    ironwork,
    [toX - fromX, 0.12, 0.1],
    [(fromX + toX) / 2, chordHigh, z],
  );
  builder.box(
    "paint",
    ironwork,
    [toX - fromX, 0.06, 0.08],
    [(fromX + toX) / 2, chordLow, z],
  );
};

const addSubstructure = (builder: AttractionBuilder) => {
  legStations.forEach(({ z, xs }, station) => {
    xs.forEach((x) => {
      builder.cylinder("paint", ironwork, {
        radius: 0.11,
        radiusEnd: 0.08,
        length: chordHigh - legFoot,
        at: [x, (chordHigh + legFoot) / 2, z],
        segments: 8,
        isOpen: true,
      });
      if (builder.isFar) {
        return;
      }
      builder.cylinder("paint", shade(ironwork, 0.8), {
        radius: 0.16,
        radiusEnd: 0.12,
        length: 0.3,
        at: [x, -0.55, z],
        segments: 6,
        isOpen: true,
      });
      builder.box(
        "paint",
        ironwork,
        [0.22, 0.12, 0.22],
        [x, chordHigh - 0.02, z],
      );
    });
    addCrossGirder(builder, z, xs[0], xs[xs.length - 1]);
    xs.slice(0, -1).forEach((x, index) => {
      const next = xs[index + 1];
      addBrace(builder, [x, -0.45, z], [next, chordLow, z]);
      addBrace(builder, [next, -0.45, z], [x, chordLow, z]);
    });
    if (station === legStations.length - 1) {
      return;
    }
    const ahead = legStations[station + 1];
    if (builder.isFar) {
      return;
    }
    [-1.45, 1.45].forEach((x) => {
      addBrace(builder, [x, -0.45, z], [x, chordLow, ahead.z]);
      addBrace(builder, [x, -0.45, ahead.z], [x, chordLow, z]);
    });
  });
  [-1.45, 1.45].forEach((x) => {
    addGirder(builder, x, head.minZ + 0.15, seaWallZ);
  });
  [-3.1, 3.1].forEach((x) => {
    addGirder(builder, x, entrance.minZ + 0.15, seaWallZ - 0.3);
  });
  [-3.2, 3.2].forEach((x) => {
    addGirder(builder, x, head.minZ + 0.15, head.maxZ - 0.1);
  });
};

/* The decks, ramp and railings */

const rampHeight = (z: number): number =>
  Math.max(0, Math.min(1, (rampFoot - z) / (rampFoot - seaWallZ))) * deckY;

const addRamp = (builder: AttractionBuilder) => {
  const body = new Shape();
  body.moveTo(-rampFoot - 0.1, promenadeY - 0.06);
  body.lineTo(-seaWallZ, deckY - 0.04);
  body.lineTo(-seaWallZ + 0.3, deckY - 0.04);
  body.lineTo(-seaWallZ + 0.3, -0.4);
  body.lineTo(-rampFoot - 0.1, -0.4);
  body.closePath();
  builder.sidePlate("matte", palette.stone, body, 0, deckHalf * 2 - 0.1);
  const slope = Math.hypot(rampFoot - seaWallZ, deckY);
  const tilt = Math.atan2(deckY, rampFoot - seaWallZ);
  const planks = builder.isFar ? 1 : 14;
  builder.painted(
    new BoxGeometry(2.9, 0.06, slope, 1, 1, planks),
    (centre, normal) =>
      normal.y < 0.5
        ? "#5a3e28"
        : plankShades[
            Math.floor(
              (centre.z - seaWallZ) / ((rampFoot - seaWallZ) / planks),
            ) % 4
          ],
    {
      at: [0, deckY / 2 + 0.01, (seaWallZ + rampFoot) / 2],
      rotation: [tilt, 0, 0],
    },
    "matte",
    undefined,
  );
  [-1, 1].forEach((side) => {
    const parapet = new Shape();
    parapet.moveTo(-rampFoot - 0.1, 0.0);
    parapet.lineTo(-rampFoot - 0.1, 0.5);
    parapet.lineTo(-seaWallZ, deckY + 0.5);
    parapet.lineTo(-seaWallZ, deckY - 0.1);
    parapet.closePath();
    builder.sidePlate(
      "matte",
      shade(palette.stone, 1.08),
      parapet,
      side * 1.53,
      0.16,
    );
    builder.box(
      "matte",
      palette.cream,
      [0.24, 0.07, slope + 0.1],
      [side * 1.53, deckY / 2 + 0.53, (seaWallZ + rampFoot) / 2 - 0.05],
      [tilt, 0, 0],
    );
    builder.box(
      "matte",
      shade(palette.stone, 1.08),
      [0.3, 0.75, 0.3],
      [side * 1.53, 0.38, rampFoot - 0.02],
    );
    builder.sphere(
      "paint",
      ironwork,
      0.12,
      [side * 1.53, 0.86, rampFoot - 0.02],
      [1, 1, 1],
      10,
    );
  });
};

const addAllRailings = (builder: AttractionBuilder) => {
  const rails: [LocalPoint, LocalPoint][] = [
    [
      { x: -deckHalf, z: entrance.minZ },
      { x: -deckHalf, z: neck.minZ },
    ],
    [
      { x: deckHalf, z: entrance.minZ },
      { x: deckHalf, z: neck.minZ },
    ],
    [
      { x: entrance.minX, z: entrance.minZ },
      { x: entrance.minX, z: entrance.maxZ },
    ],
    [
      { x: entrance.maxX, z: entrance.minZ },
      { x: entrance.maxX, z: entrance.maxZ },
    ],
    [
      { x: entrance.minX, z: entrance.minZ },
      { x: -deckHalf, z: entrance.minZ },
    ],
    [
      { x: deckHalf, z: entrance.minZ },
      { x: entrance.maxX, z: entrance.minZ },
    ],
    [
      { x: entrance.minX, z: entrance.maxZ },
      { x: -deckHalf, z: entrance.maxZ },
    ],
    [
      { x: deckHalf, z: entrance.maxZ },
      { x: entrance.maxX, z: entrance.maxZ },
    ],
    [
      { x: head.minX, z: head.maxZ },
      { x: -deckHalf, z: head.maxZ },
    ],
    [
      { x: deckHalf, z: head.maxZ },
      { x: head.maxX, z: head.maxZ },
    ],
    [
      { x: head.minX, z: head.maxZ },
      { x: head.minX, z: head.minZ },
    ],
    [
      { x: head.maxX, z: head.maxZ },
      { x: head.maxX, z: head.minZ },
    ],
    [
      { x: head.minX, z: head.minZ },
      { x: head.maxX, z: head.minZ },
    ],
  ];
  rails.forEach(([from, to]) => addRailing(builder, from, to, deckY));
  [-1, 1].forEach((side) => {
    addRailing(
      builder,
      { x: side * 10.4, z: seaWallZ - 0.05 },
      { x: side * entrance.maxX, z: seaWallZ - 0.05 },
      promenadeY,
      0.78,
    );
  });
};

const addEntranceArch = (builder: AttractionBuilder) => {
  const z = seaWallZ - 0.15;
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", ironwork, {
      radius: 0.09,
      length: 2.5,
      at: [side * 1.66, deckY + 1.25, z],
      segments: 10,
    });
    builder.cylinder("paint", ironwork, {
      radius: 0.15,
      radiusEnd: 0.11,
      length: 0.35,
      at: [side * 1.66, deckY + 0.17, z],
      segments: 10,
    });
    builder.sphere(
      "metal",
      gold,
      0.11,
      [side * 1.66, deckY + 2.62, z],
      [1, 1, 1],
      10,
    );
  });
  builder.add(
    "paint",
    ironwork,
    new TorusGeometry(1.66, 0.06, 6, builder.segments(24, 10), Math.PI),
    { at: [0, deckY + 2.45, z], scale: [1, 0.5, 1] },
  );
  builder.box("paint", navy, [2.3, 0.42, 0.08], [0, deckY + 2.55, z]);
  builder.box("paint", gold, [2.1, 0.04, 0.02], [0, deckY + 2.7, z + 0.05]);
  builder.box("paint", gold, [2.1, 0.04, 0.02], [0, deckY + 2.4, z + 0.05]);
  builder.box(
    "paint",
    palette.cream,
    [1.3, 0.12, 0.02],
    [0, deckY + 2.55, z + 0.05],
  );
  builder.box(
    "paint",
    palette.cream,
    [1.3, 0.12, 0.02],
    [0, deckY + 2.55, z - 0.05],
  );
};

const deckLamps: Triple[] = [
  [-deckHalf, deckY, -1.9],
  [deckHalf, deckY, -1.9],
  [-deckHalf, deckY, -5.2],
  [deckHalf, deckY, -5.2],
  [-deckHalf, deckY, -8.5],
  [deckHalf, deckY, -8.5],
  [head.minX + 0.05, deckY, head.minZ + 0.05],
  [head.maxX - 0.05, deckY, head.minZ + 0.05],
];

const bulbColours = ["#ffd27a", "#ff8a7a", "#9fd8ff", "#b8ff9a", "#ffe6a0"];

const addLights = (builder: AttractionBuilder) => {
  deckLamps.forEach((at) => addPierLamp(builder, at, 2.3));
  if (builder.isFar) {
    return;
  }
  [-deckHalf, deckHalf].forEach((x) => {
    [
      [-1.9, -5.2],
      [-5.2, -8.5],
    ].forEach(([fromZ, toZ]) => {
      const top = deckY + 2.25;
      const bulbs = 6;
      for (let bulb = 0; bulb <= bulbs; bulb++) {
        const share = bulb / bulbs;
        const sag = Math.sin(share * Math.PI) * 0.45;
        const at: Triple = [x, top - sag, fromZ + (toZ - fromZ) * share];
        if (bulb > 0 && bulb < bulbs) {
          addBulb(
            builder,
            [at[0], at[1] - 0.05, at[2]],
            bulbColours[bulb % bulbColours.length],
          );
        }
        if (bulb < bulbs) {
          const nextShare = (bulb + 1) / bulbs;
          builder.bar(
            "matte",
            palette.black,
            at,
            [
              x,
              top - Math.sin(nextShare * Math.PI) * 0.45,
              fromZ + (toZ - fromZ) * nextShare,
            ],
            0.012,
            3,
          );
        }
      }
    });
  });
};

/* The helter-skelter */

const tower = { x: 0, z: -10.6 };
const towerRadius = 0.8;
const towerHeight = 5.6;
const helixRadius = 1.4;
const pitch = 2.1;
const turns = 2;
const slideFoot = 0.32;
const runOut = 1.5;

/** The spiral starts at the back of the tower and ends at the back again. */
const helixAngle = (share: number): number =>
  Math.PI - turns * Math.PI * 2 * (1 - share);
const helixLift = (share: number): number =>
  deckY + slideFoot + pitch * turns * (1 - share);

const helixPoint = (share: number): Triple => {
  const angle = helixAngle(share);
  return [
    tower.x + Math.sin(angle) * helixRadius,
    helixLift(share),
    tower.z + Math.cos(angle) * helixRadius,
  ];
};

const slideProfile = [
  [-0.34, 0.26],
  [-0.34, 0.0],
  [-0.22, -0.08],
  [0.22, -0.08],
  [0.34, 0.0],
  [0.34, 0.26],
  [0.29, 0.26],
  [0.29, 0.03],
  [0.19, -0.03],
  [-0.19, -0.03],
  [-0.29, 0.03],
  [-0.29, 0.26],
] as const;

const slideProfileFar = [
  [-0.34, 0.24],
  [-0.24, -0.08],
  [0.24, -0.08],
  [0.34, 0.24],
  [0.26, 0.24],
  [-0.26, 0.24],
] as const;

const addHelterSkelter = (builder: AttractionBuilder) => {
  const { x, z } = tower;
  builder.cylinder("paint", stripeCream, {
    radius: towerRadius + 0.22,
    length: 0.16,
    at: [x, deckY + 0.08, z],
    segments: 24,
  });
  const bands = 1;
  builder.painted(
    new CylinderGeometry(
      towerRadius - 0.04,
      towerRadius + 0.04,
      towerHeight,
      builder.segments(28, 12),
      bands,
      true,
    ),
    (centre) => {
      const angle =
        Math.atan2(centre.x - x, centre.z - z) / (Math.PI * 2) + 0.5;
      const stripe = Math.floor(angle * 14);
      return stripe % 2 === 0 ? stripeRed : stripeCream;
    },
    { at: [x, deckY + towerHeight / 2, z] },
    "paint",
  );
  const top = deckY + towerHeight;
  builder.cylinder("paint", gold, {
    radius: towerRadius + 0.12,
    length: 0.14,
    at: [x, top, z],
    segments: 24,
  });
  builder.cylinder("paint", stripeCream, {
    radius: towerRadius,
    length: 0.1,
    at: [x, top + 0.05, z],
    segments: 24,
  });
  const roofSegments = builder.segments(16, 8);
  builder.painted(
    new ConeGeometry(towerRadius + 0.45, 1.7, roofSegments, 1, false),
    (centre, normal) => {
      if (normal.y < -0.5) {
        return stripeCream;
      }
      const angle =
        Math.atan2(centre.x - x, centre.z - z) / (Math.PI * 2) + 0.5;
      return Math.floor(angle * roofSegments) % 2 === 0
        ? stripeRed
        : stripeCream;
    },
    { at: [x, top + 0.9, z] },
    "paint",
    undefined,
  );
  builder.bar("metal", gold, [x, top + 1.7, z], [x, top + 2.6, z], 0.05, 6);
  builder.sphere("metal", gold, 0.08, [x, top + 1.78, z], [1, 1, 1], 10);
  builder.box(
    "matte",
    "#2a2422",
    [0.52, 1.05, 0.06],
    [x, deckY + 0.53, z + towerRadius + 0.01],
  );
  builder.box(
    "paint",
    gold,
    [0.66, 0.08, 0.1],
    [x, deckY + 1.1, z + towerRadius + 0.02],
  );
  builder.box(
    "matte",
    "#2a2422",
    [0.55, 0.9, 0.06],
    [x, helixLift(0) + 0.45, z - towerRadius],
  );
  const steps = builder.segments(turns * 22, turns * 9);
  const rings: SweepRing[] = [];
  for (let step = 0; step <= steps; step++) {
    const share = step / steps;
    const angle = helixAngle(share);
    rings.push({
      centre: helixPoint(share),
      side: [Math.sin(angle), 0, Math.cos(angle)],
      up: [0, 1, 0],
    });
  }
  const tail = builder.isFar ? 1 : 4;
  for (let step = 1; step <= tail; step++) {
    const share = step / tail;
    rings.push({
      centre: [
        tower.x - runOut * share,
        deckY + slideFoot - 0.16 * share,
        tower.z - helixRadius,
      ],
      side: [0, 0, -1],
      up: [0, 1, 0],
    });
  }
  builder.add(
    "paint",
    "#e4b23d",
    buildSweep(rings, builder.isFar ? slideProfileFar : slideProfile),
    {},
  );
  const brackets = builder.isFar ? turns * 2 : turns * 6;
  for (let bracket = 0; bracket < brackets; bracket++) {
    const share = (bracket + 0.5) / brackets;
    const angle = helixAngle(share);
    const under = helixLift(share) - 0.15;
    builder.bar(
      "paint",
      gold,
      [
        x + Math.sin(angle) * towerRadius,
        under - 0.35,
        z + Math.cos(angle) * towerRadius,
      ],
      [
        x + Math.sin(angle) * (helixRadius + 0.12),
        under,
        z + Math.cos(angle) * (helixRadius + 0.12),
      ],
      0.05,
      6,
    );
  }
  builder.box(
    "matte",
    "#3c6e9e",
    [1.3, 0.05, 0.9],
    [tower.x - runOut - 0.5, deckY + 0.025, tower.z - helixRadius],
  );
  builder.bar(
    "paint",
    gold,
    [tower.x - runOut + 0.1, deckY, tower.z - helixRadius],
    [tower.x - runOut + 0.1, deckY + slideFoot - 0.2, tower.z - helixRadius],
    0.07,
    6,
  );
};

const flagPivot: Triple = [tower.x, deckY + towerHeight + 2.5, tower.z];
const flagMotion: Motion = {
  kind: "swing",
  axis: "y",
  amplitude: 0.35,
  period: 2.6,
};

const buildFlag = (builder: AttractionBuilder) => {
  const pennant = new Shape();
  pennant.moveTo(0, 0);
  pennant.lineTo(0.75, -0.14);
  pennant.lineTo(0, -0.3);
  pennant.closePath();
  builder.sidePlate("paint", stripeRed, pennant, 0, 0.02);
};

/* The promenade, sea wall and beach */

const flagstone = palette.paving;

const addPromenade = (builder: AttractionBuilder) => {
  const slabs: [Area, number, number][] = [
    [{ minX: -10.6, maxX: 10.6, minZ: seaWallZ, maxZ: 8.6 }, 22, 5],
    [{ minX: -9.1, maxX: 9.1, minZ: 8.6, maxZ: 10.3 }, 18, 2],
  ];
  slabs.forEach(([area, across, along]) => {
    builder.painted(
      new BoxGeometry(
        area.maxX - area.minX,
        0.14,
        area.maxZ - area.minZ,
        builder.isFar ? 1 : across,
        1,
        builder.isFar ? 1 : along,
      ),
      (centre, normal) => {
        if (normal.y < -0.5) {
          return undefined;
        }
        if (normal.y < 0.5) {
          return palette.darkStone;
        }
        const tile =
          Math.floor(
            (centre.x - area.minX) / ((area.maxX - area.minX) / across),
          ) +
          Math.floor(
            (centre.z - area.minZ) / ((area.maxZ - area.minZ) / along),
          );
        return tile % 2 === 0 ? flagstone : shade(flagstone, 0.94);
      },
      { at: [0, promenadeY - 0.07, (area.minZ + area.maxZ) / 2] },
      "matte",
      undefined,
    );
  });
  builder.box(
    "matte",
    palette.darkStone,
    [21.4, 1.9, 0.45],
    [0, promenadeY - 0.95, seaWallZ - 0.2],
  );
  builder.box(
    "matte",
    palette.cream,
    [21.5, 0.14, 0.6],
    [0, promenadeY + 0.0, seaWallZ - 0.2],
  );
  const beach = new Shape();
  beach.moveTo(-seaWallZ + 0.4, -0.3);
  beach.lineTo(2.2, -1.3);
  beach.lineTo(2.2, -1.7);
  beach.lineTo(-seaWallZ + 0.4, -1.7);
  beach.closePath();
  builder.sidePlate("matte", "#dcc79a", beach, 0, 20.4);
};

const hutColours: [string, string][] = [
  ["#7fb7d9", palette.white],
  ["#f1c84b", "#2f6fa8"],
  ["#9bd1b5", "#c4363b"],
  ["#e8837a", palette.white],
  ["#b9a3d6", "#f1c84b"],
];
const hutXs = [-3.5, -4.8, -6.1, -7.4, -8.7];
const hutZ = 9.4;
const boothAt: Triple = [6.4, promenadeY, 9.2];

const addSeafront = (builder: AttractionBuilder) => {
  hutXs.forEach((x, index) => {
    const [body, door] = hutColours[index];
    addBeachHut(builder, [x, promenadeY, hutZ], body, door);
  });
  addPunchBooth(builder, boothAt);
  addDeckchair(builder, [5.6, promenadeY, 7.4], 0.15, "#2f6fa8");
  addDeckchair(builder, [6.5, promenadeY, 7.2], 0, stripeRed);
  addDeckchair(builder, [7.4, promenadeY, 7.4], -0.15, "#3f8a3a");
  if (!builder.isFar) {
    addBench(builder, [-6, promenadeY, 4.5], Math.PI);
    addBench(builder, [5.8, promenadeY, 4.5], Math.PI);
    addBench(builder, [-2.5, deckY, -10.6], -Math.PI / 2);
    addBench(builder, [2.5, deckY, -10.6], Math.PI / 2);
  }
  addPierLamp(builder, [-3.8, promenadeY, 4.25], 2.3);
  addPierLamp(builder, [3.8, promenadeY, 4.25], 2.3);
  addPierLamp(builder, [-9.6, promenadeY, 4.25], 2.3);
  addPierLamp(builder, [9.6, promenadeY, 4.25], 2.3);
  addKiosk(builder, [-2.25, deckY, 2.1], "#3f8a3a", Math.PI / 2);
  addKiosk(builder, [2.25, deckY, 2.1], stripeRed, -Math.PI / 2);
  addSignBoard(builder, [2.6, promenadeY, 10.9], navy);
  builder.cylinder("paint", copperGreen, {
    radius: 0.2,
    radiusEnd: 0.16,
    length: 0.7,
    at: [-2.1, promenadeY + 0.35, 7.9],
    segments: 12,
  });
};

/* The helter-skelter ride */

const doorFront = tower.z + towerRadius;
const rideStart: LocalPoint = { x: tower.x, z: tower.z + 2.3 };
const rideFinish: LocalPoint = {
  x: tower.x - runOut - 0.9,
  z: tower.z - helixRadius,
};

const helterSkelterRide = (progress: number): LocalSpot => {
  if (progress < 0.08) {
    const share = progress / 0.08;
    return {
      x: tower.x,
      y: deckY,
      z: rideStart.z + (doorFront - 0.2 - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.38) {
    const share = (progress - 0.08) / 0.3;
    const angle = share * Math.PI * 4;
    return {
      x: tower.x + Math.sin(angle) * 0.35,
      y: deckY + (helixLift(0) - deckY) * share,
      z: tower.z + Math.cos(angle) * 0.35,
      heading: angle + Math.PI / 2,
    };
  }
  if (progress < 0.44) {
    const share = (progress - 0.38) / 0.06;
    const [x, , z] = helixPoint(0);
    return {
      x: tower.x + (x - tower.x) * share,
      y: helixLift(0) - 0.02,
      z: tower.z + 0.35 + (z - tower.z - 0.35) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.9) {
    const share = ((progress - 0.44) / 0.46) ** 1.25;
    const [x, y, z] = helixPoint(share);
    const angle = helixAngle(share);
    return {
      x,
      y: y - 0.01,
      z,
      heading: Math.atan2(Math.cos(angle), -Math.sin(angle)),
    };
  }
  const share = (progress - 0.9) / 0.1;
  const along = share * (runOut + 0.9);
  return {
    x: tower.x - along,
    y: deckY + Math.max(0, (slideFoot - 0.03) * (1 - along / runOut)),
    z: tower.z - helixRadius,
    heading: -Math.PI / 2,
  };
};

/* Where people can walk */

const piersDeck: Deck = (point) =>
  isInside(point, entrance) || isInside(point, neck) || isInside(point, head)
    ? { height: deckY, kind: "bridge" }
    : undefined;

const rampDeck: Deck = ({ x, z }) =>
  Math.abs(x) <= 1.45 && z > seaWallZ && z <= rampFoot
    ? { height: rampHeight(z), kind: "bridge" }
    : undefined;

const promenadeDeck: Deck = (point) =>
  (isInside(point, { minX: -10.6, maxX: 10.6, minZ: seaWallZ, maxZ: 8.6 }) ||
    isInside(point, { minX: -9.1, maxX: 9.1, minZ: 8.6, maxZ: 10.3 })) &&
  !(Math.abs(point.x) <= deckHalf && point.z <= rampFoot)
    ? { height: promenadeY, kind: "trail" }
    : undefined;

const edge = (from: LocalPoint, to: LocalPoint): LocalBlocker[] =>
  listWallBlockers(from, to, 0.3, 0.45);

const pierBlockers: LocalBlocker[] = [
  ...edge({ x: -1.9, z: 0.15 }, { x: -1.9, z: -8.25 }),
  ...edge({ x: 1.9, z: 0.15 }, { x: 1.9, z: -8.25 }),
  ...edge({ x: -3.6, z: 0.15 }, { x: -3.6, z: 3.5 }),
  ...edge({ x: 3.6, z: 0.15 }, { x: 3.6, z: 3.5 }),
  ...edge({ x: -3.6, z: 0.1 }, { x: -1.9, z: 0.1 }),
  ...edge({ x: 1.9, z: 0.1 }, { x: 3.6, z: 0.1 }),
  ...edge({ x: -10.6, z: 3.5 }, { x: -1.9, z: 3.5 }),
  ...edge({ x: 1.9, z: 3.5 }, { x: 10.6, z: 3.5 }),
  ...edge({ x: -1.8, z: 3.9 }, { x: -1.8, z: rampFoot }),
  ...edge({ x: 1.8, z: 3.9 }, { x: 1.8, z: rampFoot }),
  ...edge({ x: -3.7, z: -8.25 }, { x: -1.9, z: -8.25 }),
  ...edge({ x: 1.9, z: -8.25 }, { x: 3.7, z: -8.25 }),
  ...edge({ x: -3.7, z: -8.25 }, { x: -3.7, z: -13.05 }),
  ...edge({ x: 3.7, z: -8.25 }, { x: 3.7, z: -13.05 }),
  ...edge({ x: -3.7, z: -13.05 }, { x: 3.7, z: -13.05 }),
];

export const seasidePierModel: AttractionModel = {
  kind: "seaside-pier",
  name: "Seaside Pier",
  fact: "The Victorians built seaside piers so that people could stroll out over the sea in the fresh air. New railways in the 1800s brought families from the towns to the seaside for the day. Southend Pier, in Essex, is the longest pleasure pier in the world, at over two kilometres.",
  curriculumLink:
    "History, Key Stage 1: changes beyond living memory. Seaside holidays in the past.",
  footprint: 14,
  setting: "shore",
  hasGroundPad: false,
  landSamples: [
    { x: 0, z: 9 },
    { x: -6, z: 5 },
    { x: 6, z: 5 },
    { x: -9.5, z: 6.5 },
    { x: 9.5, z: 6.5 },
    { x: -6, z: 9.5 },
    { x: 6, z: 9.5 },
    { x: 2.6, z: 11.4 },
  ],
  seaSamples: [
    { x: 0, z: -2.5 },
    { x: 0, z: -6 },
    { x: 0, z: -9 },
    { x: 0, z: -12 },
    { x: -2.8, z: -6 },
    { x: 2.8, z: -6 },
    { x: -3, z: -11.5 },
    { x: 3, z: -11.5 },
  ],
  signSpot: { x: 2.6, z: 11.7 },
  build: (builder) => {
    addPromenade(builder);
    addSubstructure(builder);
    addDeckSlab(builder, entrance);
    addDeckSlab(builder, neck);
    addDeckSlab(builder, head);
    addRamp(builder);
    addAllRailings(builder);
    addEntranceArch(builder);
    addLights(builder);
    addHelterSkelter(builder);
    addSeafront(builder);
  },
  moving: [
    {
      name: "pennant",
      pivot: flagPivot,
      build: buildFlag,
      motion: flagMotion,
    },
    {
      name: "mr-punch",
      pivot: [boothAt[0], boothAt[1] + 1.5, boothAt[2] - 0.38],
      build: buildPunch,
      motion: { kind: "bob", height: 0.12, period: 1.3 },
    },
  ],
  wanderers: [
    {
      name: "gulls",
      build: buildGull,
      count: 2,
      centre: { x: 0, z: -3 },
      radius: 6,
      speed: 2.2,
      height: 8.5,
      bob: 0.3,
    },
  ],
  blockers: [
    ...pierBlockers,
    { x: tower.x, z: tower.z, radius: 1.75 },
    { x: -2.25, z: 2.1, radius: 0.88 },
    { x: 2.25, z: 2.1, radius: 0.88 },
    ...hutXs.map((x) => ({ x, z: hutZ, radius: 0.72 })),
    { x: boothAt[0], z: boothAt[2], radius: 0.82 },
  ],
  decks: [piersDeck, rampDeck, promenadeDeck],
  rides: [
    {
      id: "helter-skelter",
      name: "the helter-skelter",
      start: rideStart,
      reach: 0.5,
      seconds: 11,
      finish: rideFinish,
      follow: helterSkelterRide,
    },
  ],
  tune: [67, 72, 72, 72, 71, 72, 74, 72, 69, 67],
};
