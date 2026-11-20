import {
  CylinderGeometry,
  LatheGeometry,
  Quaternion,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import {
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type Triple,
} from "../attractions/attraction-kit.js";

/* ------------------------------------------------------------------ */
/* Colours and sizes                                                   */
/* ------------------------------------------------------------------ */

export const bronze = "#b27a3c";
export const darkBronze = "#7a4e26";
export const brightBronze = "#d9a05a";
export const verdigris = "#4f9a86";
export const sunGold = "#e8b84e";
export const marble = "#ece6da";
export const marbleShadow = "#cfc6b6";
export const marbleVein = "#a9a196";
export const flameOrange = "#ff8a1e";
export const flameYellow = "#ffd36b";
export const basalt = "#3a3230";

/** Where the statue stands: the middle of the plinth. */
export const statueAt = { x: 0, z: -2 };
/** The plinth's top, where the statue's feet stand. */
export const plinthTop = 2.4;
export const plinthHalf = { step: 2.6, upper: 2.35, block: 1.9, cornice: 2.1 };
export const stairs = {
  halfWidth: 0.7,
  rise: 0.2,
  run: 0.28,
  count: 12,
  /** Where the top step meets the plinth's front. */
  topZ: statueAt.z + plinthHalf.cornice,
};
export const stairFootZ = stairs.topZ + stairs.run * stairs.count;

/** A point on the statue, from the plinth top above its middle. */
export const onStatue = (x: number, y: number, z: number): Triple => [
  statueAt.x + x,
  plinthTop + y,
  statueAt.z + z,
];

/** The torch's handle, cup and lookout gallery, held high in the right hand. */
export const torch = { x: 1.35, z: 0.2, hand: 8.1, cup: 8.95, gallery: 9.2 };
export const torchCup = onStatue(torch.x, torch.cup, torch.z);
export const galleryFloor = onStatue(torch.x, torch.gallery + 0.06, torch.z);
export const galleryRadius = 0.95;
export const headAt = onStatue(0, 6.72, 0);

/* ------------------------------------------------------------------ */
/* Little shape helpers                                                */
/* ------------------------------------------------------------------ */

/** A lathe stretched by `scale`, for oval bodies. */
export const addOvalLathe = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  profile: readonly (readonly [number, number])[],
  at: Triple,
  scale: Triple,
  segments = 22,
) => {
  builder.add(
    finish,
    colour,
    new LatheGeometry(
      profile.map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(segments, Math.max(6, Math.round(segments / 2.5))),
    ),
    { at, scale },
  );
};

/** A cone from a base point to a tip, like a sun ray or a spike. */
export const addSpike = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  from: Triple,
  to: Triple,
  radius: number,
  segments = 6,
) => {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const geometry = new CylinderGeometry(
    0,
    radius,
    direction.length(),
    builder.segments(segments, 4),
  );
  geometry.applyQuaternion(
    new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.clone().normalize(),
    ),
  );
  const middle = start.add(direction.multiplyScalar(0.5));
  builder.add(finish, colour, geometry, { at: [middle.x, middle.y, middle.z] });
};

/* ------------------------------------------------------------------ */
/* The stepped marble plinth and its stairway                          */
/* ------------------------------------------------------------------ */

const addMarbleSlab = (
  builder: AttractionBuilder,
  half: number,
  bottom: number,
  top: number,
  colour: string,
) => {
  builder.box(
    "matte",
    colour,
    [half * 2, top - bottom, half * 2],
    [statueAt.x, (bottom + top) / 2, statueAt.z],
  );
};

export const buildPlinth = (builder: AttractionBuilder) => {
  const { x, z } = statueAt;
  addMarbleSlab(builder, plinthHalf.step, 0, 0.3, marbleShadow);
  addMarbleSlab(builder, plinthHalf.upper, 0.3, 0.6, marble);
  addMarbleSlab(builder, plinthHalf.block + 0.08, 0.6, 0.78, marbleShadow);
  builder.box(
    "matte",
    marble,
    [plinthHalf.block * 2, 1.32, plinthHalf.block * 2],
    [x, 1.44, z],
  );
  addMarbleSlab(builder, plinthHalf.cornice - 0.1, 2.1, 2.2, marbleShadow);
  addMarbleSlab(builder, plinthHalf.cornice, 2.2, plinthTop, marble);
  /* A band of bronze sun discs and a meander round the block */
  const faces = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  faces.forEach((turn) => {
    const out = (along: number, up: number, extra = 0): Triple => [
      x +
        Math.sin(turn) * (plinthHalf.block + 0.02 + extra) +
        Math.cos(turn) * along,
      up,
      z +
        Math.cos(turn) * (plinthHalf.block + 0.02 + extra) -
        Math.sin(turn) * along,
    ];
    const isFront = turn === 0;
    const spots = isFront ? [-1.3, 1.3] : [0];
    spots.forEach((along) => {
      if (builder.isFar) {
        return;
      }
      builder.cylinder("metal", bronze, {
        radius: 0.26,
        length: 0.05,
        at: out(along, 1.45),
        axis: Math.abs(Math.sin(turn)) > 0.5 ? "x" : "z",
        segments: 12,
      });
      builder.sphere(
        "metal",
        verdigris,
        0.08,
        out(along, 1.45, 0.03),
        [1, 1, 0.5],
        6,
      );
    });
    if (builder.isFar) {
      return;
    }
    /* A Greek key (meander) frieze under the cornice */
    for (let step = 0; step < 5; step++) {
      const along = -1.6 + step * 0.8;
      if (isFront && Math.abs(along) < stairs.halfWidth + 0.15) {
        continue;
      }
      const [mx, , mz] = out(along, 0);
      const rotation: Triple = [0, turn, 0];
      builder.box(
        "paint",
        darkBronze,
        [0.3, 0.04, 0.02],
        [mx, 1.92, mz],
        rotation,
      );
      builder.box(
        "paint",
        darkBronze,
        [0.04, 0.2, 0.02],
        [mx + Math.cos(turn) * 0.13, 1.84, mz - Math.sin(turn) * 0.13],
        rotation,
      );
    }
    /* Veins in the marble */
    [-0.9, 0.6].forEach((along, index) => {
      if (isFront) {
        return;
      }
      builder.bar(
        "matte",
        marbleVein,
        out(along, 0.95 + index * 0.2, 0),
        out(along + 0.5, 1.15 + index * 0.25, 0),
        0.02,
        4,
      );
    });
  });
  /* Bronze corner ornaments (acroteria) on the cornice */
  if (builder.isFar) {
    buildStairs(builder);
    return;
  }
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      const cx = x + sideX * (plinthHalf.cornice - 0.2);
      const cz = z + sideZ * (plinthHalf.cornice - 0.2);
      builder.lathe(
        "metal",
        darkBronze,
        [
          [0.16, 0],
          [0.12, 0.1],
          [0.17, 0.3],
          [0, 0.46],
        ],
        [cx, plinthTop, cz],
        "y",
        8,
      );
    });
  });
  buildStairs(builder);
};

const buildStairs = (builder: AttractionBuilder) => {
  const { halfWidth, rise, run, count, topZ } = stairs;
  const stride = builder.isFar ? 3 : 1;
  for (let step = stride - 1; step < count; step += stride) {
    const top = (step + 1) * rise;
    const front = topZ + (count - step + stride - 1) * run;
    const back = step === count - 1 ? topZ - 0.02 : front - run * stride;
    builder.box(
      "matte",
      step % 2 === 0 ? marble : shade(marble, 0.97),
      [halfWidth * 2, top, front - back],
      [statueAt.x, top / 2, (front + back) / 2],
    );
  }
  /* The stair's low side walls, sloping down with it */
  [-1, 1].forEach((side) => {
    const wallX = statueAt.x + side * (halfWidth + 0.1);
    const slope = Math.atan2(rise, run);
    const length = Math.hypot(rise * count, run * count);
    builder.box(
      "matte",
      marbleShadow,
      [0.2, 0.42, length + 0.2],
      [wallX, (rise * count) / 2 + 0.12, topZ + (run * count) / 2],
      [slope, 0, 0],
    );
    builder.box(
      "matte",
      marbleShadow,
      [0.2, 0.5, 0.3],
      [wallX, 0.25, stairFootZ - 0.05],
    );
    /* Bronze handrail on little posts */
    builder.bar(
      "metal",
      brightBronze,
      [wallX, plinthTop + 0.85, topZ + 0.1],
      [wallX, 0.85, stairFootZ - 0.1],
      0.06,
      6,
    );
    if (!builder.isFar) {
      for (let post = 0; post <= 2; post++) {
        const share = post / 2;
        const pz = topZ + 0.1 + (stairFootZ - 0.2 - topZ) * share;
        const py = plinthTop * (1 - share);
        builder.cylinder("metal", bronze, {
          radius: 0.025,
          length: 0.55,
          at: [wallX, py + 0.55, pz],
          segments: 6,
        });
      }
      builder.sphere(
        "metal",
        brightBronze,
        0.07,
        [wallX, 0.88, stairFootZ - 0.1],
        [1, 1, 1],
        6,
      );
    }
  });
};

/* ------------------------------------------------------------------ */
/* The bronze Sun god                                                  */
/* ------------------------------------------------------------------ */

const buildLegs = (builder: AttractionBuilder) => {
  builder.box("metal", darkBronze, [1.9, 0.14, 1.3], onStatue(0, 0.07, 0.05));
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      bronze,
      [0.4, 0.24, 0.62],
      onStatue(side * 0.5, 0.26, 0.0),
    );
    builder.sphere(
      "metal",
      bronze,
      0.2,
      onStatue(side * 0.5, 0.2, 0.32),
      [1, 0.7, 1.3],
      8,
    );
    if (!builder.isFar) {
      /* Sandal straps and toes */
      [0.0, 0.25].forEach((dz) => {
        builder.box(
          "metal",
          darkBronze,
          [0.45, 0.05, 0.06],
          onStatue(side * 0.5, 0.38, 0.12 + dz),
        );
      });
      builder.sphere(
        "metal",
        verdigris,
        0.12,
        onStatue(side * 0.5, 0.17, -0.25),
        [1.6, 0.5, 1.3],
        6,
      );
    }
    builder.lathe(
      "metal",
      bronze,
      [
        [0.17, 0],
        [0.29, 0.85],
        [0.23, 1.75],
        [0.36, 2.5],
        [0.42, 3.05],
        [0.4, 3.4],
        [0, 3.45],
      ],
      onStatue(side * 0.48, 0.32, 0),
      "y",
      builder.segments(12, 6),
    );
    /* Knee cap */
    builder.sphere(
      "metal",
      shade(bronze, 1.06),
      0.17,
      onStatue(side * 0.48, 2.1, 0.17),
      [1, 1.1, 0.6],
      8,
    );
  });
};

const buildTunic = (builder: AttractionBuilder) => {
  const hemY = 3.0;
  addOvalLathe(
    builder,
    "metal",
    bronze,
    [
      [0, -0.01],
      [0.98, 0],
      [0.95, 0.15],
      [0.82, 0.7],
      [0.7, 1.1],
      [0.66, 1.3],
      [0, 1.32],
    ],
    onStatue(0, hemY, 0),
    [1.2, 1, 0.95],
    18,
  );
  if (!builder.isFar) {
    builder.add(
      "metal",
      darkBronze,
      new TorusGeometry(0.97, 0.05, 5, builder.segments(18, 10)),
      {
        at: onStatue(0, hemY + 0.03, 0),
        rotation: [Math.PI / 2, 0, 0],
        scale: [1.2, 0.95, 1],
      },
    );
    builder.add(
      "metal",
      darkBronze,
      new TorusGeometry(0.67, 0.07, 5, builder.segments(16, 8)),
      {
        at: onStatue(0, 4.22, 0),
        rotation: [Math.PI / 2, 0, 0],
        scale: [1.24, 0.84, 1],
      },
    );
  }
  builder.cylinder("metal", brightBronze, {
    radius: 0.12,
    length: 0.06,
    at: onStatue(0, 4.22, 0.58),
    axis: "z",
    segments: 12,
  });
  if (builder.isFar) {
    return;
  }
  /* Pleats down the tunic */
  for (let pleat = 0; pleat < 12; pleat++) {
    const angle = (pleat / 12) * Math.PI * 2 + 0.1;
    builder.bar(
      "metal",
      pleat % 2 === 0 ? darkBronze : shade(bronze, 0.9),
      onStatue(Math.sin(angle) * 1.16, hemY + 0.08, Math.cos(angle) * 0.92),
      onStatue(Math.sin(angle) * 0.82, hemY + 1.15, Math.cos(angle) * 0.66),
      0.05,
      4,
    );
  }
  /* Patina gathered in the folds */
  [-0.5, 0.45].forEach((dx) => {
    builder.sphere(
      "metal",
      verdigris,
      0.12,
      onStatue(dx, hemY + 0.15, 0.82),
      [1.4, 0.5, 0.5],
      6,
    );
  });
};

const buildTorso = (builder: AttractionBuilder) => {
  addOvalLathe(
    builder,
    "metal",
    bronze,
    [
      [0, 0],
      [0.62, 0.02],
      [0.6, 0.4],
      [0.68, 0.9],
      [0.75, 1.3],
      [0.72, 1.62],
      [0.55, 1.84],
      [0.28, 1.95],
      [0, 1.97],
    ],
    onStatue(0, 4.15, 0),
    [1.25, 1, 0.82],
    18,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "metal",
      bronze,
      0.36,
      onStatue(side * 0.9, 5.66, 0),
      [1, 0.95, 1],
      10,
    );
  });
  builder.cylinder("metal", bronze, {
    radius: 0.25,
    radiusEnd: 0.22,
    length: 0.5,
    at: onStatue(0, 6.2, 0),
    segments: 14,
  });
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "metal",
      shade(bronze, 1.05),
      0.34,
      onStatue(side * 0.34, 5.3, 0.42),
      [1, 0.65, 0.5],
      8,
    );
  });
  [4.62, 4.9].forEach((y) => {
    [-1, 1].forEach((side) => {
      builder.sphere(
        "metal",
        shade(bronze, 1.03),
        0.13,
        onStatue(side * 0.15, y, 0.5),
        [1, 0.8, 0.45],
        6,
      );
    });
  });
  builder.sphere(
    "metal",
    darkBronze,
    0.05,
    onStatue(0, 4.45, 0.54),
    [1, 1, 0.5],
    6,
  );
};

const buildHead = (builder: AttractionBuilder) => {
  const [hx, hy, hz] = headAt;
  const at = (x: number, y: number, z: number): Triple => [
    hx + x,
    hy + y,
    hz + z,
  ];
  builder.sphere("metal", bronze, 0.46, at(0, 0, 0), [0.9, 1.08, 0.95], 10);
  builder.sphere(
    "metal",
    darkBronze,
    0.47,
    at(0, 0.1, -0.08),
    [0.94, 0.98, 0.92],
    8,
  );
  builder.box(
    "metal",
    bronze,
    [0.12, 0.24, 0.16],
    at(0, -0.02, 0.43),
    [-0.2, 0, 0],
  );
  /* The radiant crown's band and its fixed rays */
  builder.torus("metal", sunGold, 0.43, 0.05, at(0, 0.24, -0.02), "y", 14);
  for (let ray = 0; ray < 9; ray += builder.isFar ? 2 : 1) {
    const angle = -1.4 + (ray / 8) * 2.8;
    const length = ray % 2 === 0 ? 0.42 : 0.3;
    addSpike(
      builder,
      "metal",
      sunGold,
      at(Math.sin(angle) * 0.42, 0.26, Math.cos(angle) * 0.4 - 0.02),
      at(
        Math.sin(angle) * (0.52 + length * 0.25),
        0.26 + length,
        Math.cos(angle) * (0.5 + length * 0.25) - 0.02,
      ),
      0.06,
      builder.isFar ? 4 : 6,
    );
  }
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "metal",
      "#2a1d12",
      0.05,
      at(side * 0.16, 0.07, 0.38),
      [1.3, 0.8, 0.6],
      6,
    );
    builder.box(
      "metal",
      darkBronze,
      [0.16, 0.035, 0.05],
      at(side * 0.16, 0.15, 0.39),
      [0, 0, side * -0.15],
    );
    builder.sphere(
      "metal",
      bronze,
      0.09,
      at(side * 0.41, 0.0, 0),
      [0.5, 1, 0.8],
      6,
    );
  });
  builder.box("metal", darkBronze, [0.16, 0.03, 0.04], at(0, -0.2, 0.39));
  builder.sphere("metal", bronze, 0.12, at(0, -0.33, 0.28), [1.2, 0.8, 0.9], 8);
  /* Curls of hair along the brow */
  for (let curl = 0; curl < 5; curl++) {
    const angle = -1.4 + (curl / 4) * 2.8;
    builder.sphere(
      "metal",
      darkBronze,
      0.075,
      at(Math.sin(angle) * 0.4, 0.2, Math.cos(angle) * 0.36),
      [1, 1, 1],
      6,
    );
  }
};

const buildArms = (builder: AttractionBuilder) => {
  const limb = (from: Triple, to: Triple, thickness: number) => {
    builder.bar(
      "metal",
      bronze,
      onStatue(...from),
      onStatue(...to),
      thickness,
      9,
    );
    builder.sphere(
      "metal",
      bronze,
      thickness / 2,
      onStatue(...to),
      [1, 1, 1],
      8,
    );
  };
  /* Right arm, held high with the torch */
  limb([0.92, 5.72, 0], [1.24, 6.95, 0.14], 0.44);
  limb([1.24, 6.95, 0.14], [torch.x, torch.hand - 0.12, torch.z], 0.36);
  builder.sphere(
    "metal",
    bronze,
    0.24,
    onStatue(torch.x, torch.hand, torch.z),
    [1.05, 1.15, 1],
    10,
  );
  if (!builder.isFar) {
    builder.sphere(
      "metal",
      shade(bronze, 1.05),
      0.26,
      onStatue(1.05, 6.35, 0.1),
      [0.9, 1.3, 0.9],
      8,
    );
    [0, 1, 2, 3].forEach((finger) => {
      builder.box(
        "metal",
        shade(bronze, 0.95),
        [0.1, 0.08, 0.12],
        onStatue(
          torch.x - 0.05,
          torch.hand - 0.12 + finger * 0.09,
          torch.z + 0.2,
        ),
      );
    });
  }
  /* Left arm, lowered, with the cloak over it */
  limb([-0.92, 5.72, 0], [-1.18, 4.6, 0.1], 0.42);
  limb([-1.18, 4.6, 0.1], [-1.05, 4.1, 0.6], 0.34);
  builder.sphere(
    "metal",
    bronze,
    0.2,
    onStatue(-1.03, 4.05, 0.72),
    [1, 1, 1.2],
    8,
  );
};

const buildCloak = (builder: AttractionBuilder) => {
  const cloak = new CylinderGeometry(
    0.82,
    1.18,
    3.6,
    builder.segments(22, 10),
    builder.isFar ? 1 : 3,
    true,
    Math.PI / 2 + 0.25,
    Math.PI - 0.5,
  );
  builder.add("metal", darkBronze, cloak, {
    at: onStatue(0, 4.05, -0.02),
    scale: [1.25, 1, 0.95],
  });
  /* A hem of green patina along the cloak's bottom edge */
  builder.add(
    "metal",
    verdigris,
    new CylinderGeometry(
      1.165,
      1.18,
      0.16,
      builder.segments(22, 10),
      1,
      true,
      Math.PI / 2 + 0.25,
      Math.PI - 0.5,
    ),
    {
      at: onStatue(0, 2.33, -0.02),
      scale: [1.27, 1, 0.97],
    },
  );
  builder.box(
    "metal",
    darkBronze,
    [0.34, 1.5, 0.5],
    onStatue(-1.2, 3.45, 0.45),
    [0.1, 0, 0.05],
  );
  builder.sphere(
    "metal",
    sunGold,
    0.13,
    onStatue(-0.75, 5.95, 0.32),
    [1, 1, 0.6],
    8,
  );
  if (!builder.isFar) {
    [-0.12, 0.12].forEach((dx) => {
      builder.bar(
        "metal",
        shade(darkBronze, 0.85),
        onStatue(-1.2 + dx, 4.15, 0.62),
        onStatue(-1.2 + dx * 1.4, 2.75, 0.55),
        0.07,
        4,
      );
    });
  }
};

const buildTorch = (builder: AttractionBuilder) => {
  const at = (y: number): Triple => onStatue(torch.x, y, torch.z);
  builder.cylinder("metal", darkBronze, {
    radius: 0.1,
    radiusEnd: 0.13,
    length: torch.cup - torch.hand + 0.4,
    at: at((torch.cup + torch.hand - 0.4) / 2),
    segments: 10,
  });
  builder.lathe(
    "metal",
    brightBronze,
    [
      [0.12, 0],
      [0.3, 0.2],
      [0.42, 0.4],
      [0.48, 0.48],
      [0.42, 0.52],
      [0.1, 0.42],
    ],
    at(torch.cup),
    "y",
    builder.segments(18, 8),
  );
  builder.cylinder("glow", flameOrange, {
    radius: 0.38,
    length: 0.04,
    at: at(torch.cup + 0.45),
    segments: 16,
  });
  /* The lookout gallery round the torch */
  builder.cylinder("metal", darkBronze, {
    radius: galleryRadius,
    length: 0.08,
    at: at(torch.gallery),
    segments: 24,
  });
  builder.torus(
    "metal",
    brightBronze,
    galleryRadius - 0.04,
    0.035,
    at(torch.gallery + 0.75),
    "y",
    builder.segments(18, 10),
  );
  const posts = builder.isFar ? 4 : 8;
  for (let post = 0; post < posts; post++) {
    const angle = (post / posts) * Math.PI * 2;
    builder.cylinder("metal", bronze, {
      radius: 0.025,
      length: 0.72,
      at: [
        galleryFloor[0] + Math.sin(angle) * (galleryRadius - 0.04),
        plinthTop + torch.gallery + 0.4,
        galleryFloor[2] + Math.cos(angle) * (galleryRadius - 0.04),
      ],
      segments: 5,
    });
  }
  for (let strut = 0; strut < (builder.isFar ? 0 : 4); strut++) {
    const angle = (strut / 4) * Math.PI * 2 + Math.PI / 4;
    builder.bar(
      "metal",
      darkBronze,
      at(torch.gallery - 0.6),
      [
        galleryFloor[0] + Math.sin(angle) * (galleryRadius - 0.1),
        plinthTop + torch.gallery - 0.04,
        galleryFloor[2] + Math.cos(angle) * (galleryRadius - 0.1),
      ],
      0.06,
      5,
    );
  }
};

export const buildStatue = (builder: AttractionBuilder) => {
  buildLegs(builder);
  buildTunic(builder);
  buildTorso(builder);
  buildHead(builder);
  buildArms(builder);
  buildCloak(builder);
  buildTorch(builder);
};

/* ------------------------------------------------------------------ */
/* The colonnade behind the statue                                     */
/* ------------------------------------------------------------------ */

export const colonnade = { radius: 5.7, height: 2.95, angles: 6, spread: 1.25 };

export const listColumnSpots = (): { x: number; z: number; angle: number }[] =>
  Array.from({ length: colonnade.angles }, (_, index) => {
    const angle =
      -colonnade.spread +
      (index / (colonnade.angles - 1)) * colonnade.spread * 2;
    return {
      x: statueAt.x + Math.sin(angle) * colonnade.radius,
      z: statueAt.z - Math.cos(angle) * colonnade.radius,
      angle,
    };
  });

export const buildColonnade = (builder: AttractionBuilder) => {
  const spots = listColumnSpots();
  const { height } = colonnade;
  spots.forEach(({ x, z, angle }) => {
    builder.box(
      "matte",
      marbleShadow,
      [0.66, 0.16, 0.66],
      [x, 0.08, z],
      [0, angle, 0],
    );
    builder.lathe(
      "matte",
      marble,
      [
        [0.3, 0.16],
        [0.27, height * 0.4],
        [0.22, height - 0.18],
        [0, height - 0.18],
      ],
      [x, 0, z],
      "y",
      builder.segments(8, 5),
    );
    builder.lathe(
      "matte",
      marbleShadow,
      [
        [0.22, height - 0.2],
        [0.37, height - 0.04],
        [0, height],
      ],
      [x, 0, z],
      "y",
      builder.segments(8, 5),
    );
    builder.box(
      "matte",
      marble,
      [0.72, 0.12, 0.72],
      [x, height + 0.06, z],
      [0, angle, 0],
    );
  });
  /* Architrave, frieze and cornice from column to column */
  for (let index = 0; index < spots.length - 1; index++) {
    const from = spots[index];
    const to = spots[index + 1];
    const length = Math.hypot(to.x - from.x, to.z - from.z) + 0.72;
    const turn = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI / 2;
    const mid: [number, number] = [(from.x + to.x) / 2, (from.z + to.z) / 2];
    builder.box(
      "matte",
      marble,
      [length, 0.3, 0.6],
      [mid[0], height + 0.27, mid[1]],
      [0, turn, 0],
    );
    builder.box(
      "matte",
      marbleShadow,
      [length + 0.04, 0.26, 0.56],
      [mid[0], height + 0.55, mid[1]],
      [0, turn, 0],
    );
    builder.box(
      "matte",
      marble,
      [length + 0.1, 0.12, 0.72],
      [mid[0], height + 0.74, mid[1]],
      [0, turn, 0],
    );
    if (!builder.isFar) {
      const inward: [number, number] = [
        statueAt.x - mid[0],
        statueAt.z - mid[1],
      ];
      const reach = Math.hypot(...inward);
      [-0.5, 0.5].forEach((along) => {
        builder.box(
          "paint",
          darkBronze,
          [0.14, 0.22, 0.03],
          [
            mid[0] + (inward[0] / reach) * 0.29 + Math.cos(turn) * along,
            height + 0.55,
            mid[1] + (inward[1] / reach) * 0.29 - Math.sin(turn) * along,
          ],
          [0, turn, 0],
        );
      });
    }
  }
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

/** The spinning sun crown behind the head, built about its own middle. */
export const buildSunCrown = (builder: AttractionBuilder) => {
  builder.torus("metal", sunGold, 0.62, 0.05, [0, 0, 0], "z", 16);
  const rays = 12;
  for (let ray = 0; ray < rays; ray += builder.isFar ? 2 : 1) {
    const angle = (ray / rays) * Math.PI * 2;
    const length = ray % 2 === 0 ? 0.75 : 0.48;
    addSpike(
      builder,
      "metal",
      ray % 2 === 0 ? sunGold : brightBronze,
      [Math.sin(angle) * 0.6, Math.cos(angle) * 0.6, 0],
      [Math.sin(angle) * (0.6 + length), Math.cos(angle) * (0.6 + length), 0],
      0.1,
      6,
    );
  }
  if (!builder.isFar) {
    for (let ray = 0; ray < rays; ray += 2) {
      const angle = ((ray + 1) / rays) * Math.PI * 2;
      builder.sphere(
        "glow",
        flameYellow,
        0.05,
        [Math.sin(angle) * 0.68, Math.cos(angle) * 0.68, 0.02],
        [1, 1, 1],
        6,
      );
    }
  }
};

export const buildTorchFlame = (builder: AttractionBuilder) => {
  const segments = builder.segments(10, 6);
  builder.lathe(
    "glow",
    flameOrange,
    [
      [0, 0],
      [0.36, 0.05],
      [0.4, 0.3],
      [0.28, 0.7],
      [0.12, 1.05],
      [0, 1.3],
    ],
    [0, 0, 0],
    "y",
    segments,
  );
  builder.lathe(
    "glow",
    flameYellow,
    [
      [0, 0.02],
      [0.22, 0.06],
      [0.24, 0.3],
      [0.14, 0.62],
      [0, 0.85],
    ],
    [0, 0.02, 0],
    "y",
    segments,
  );
  if (!builder.isFar) {
    [
      [0.18, 0.95, 0.1, 0.06],
      [-0.15, 1.1, -0.05, 0.05],
      [0.05, 1.4, -0.1, 0.04],
    ].forEach(([x, y, z, radius]) => {
      builder.sphere("glow", flameYellow, radius, [x, y, z], [1, 1.3, 1], 6);
    });
  }
};

export const buildTorchHalo = (builder: AttractionBuilder) => {
  builder.sphere("glow", flameOrange, 1.5, [0, 0.6, 0], [1, 1.2, 1], 10);
};

export const buildBrazierFlame = (builder: AttractionBuilder) => {
  const segments = builder.segments(9, 5);
  builder.lathe(
    "glow",
    flameOrange,
    [
      [0, 0],
      [0.26, 0.03],
      [0.24, 0.25],
      [0.12, 0.55],
      [0, 0.75],
    ],
    [0, 0, 0],
    "y",
    segments,
  );
  builder.lathe(
    "glow",
    flameYellow,
    [
      [0, 0.01],
      [0.15, 0.04],
      [0.12, 0.25],
      [0, 0.45],
    ],
    [0, 0.01, 0],
    "y",
    segments,
  );
};

/** A gull, facing local -z, so it flies forward round its orbit. */
export const buildGull = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#f4f1ea", 0.14, [0, 0, 0], [0.8, 0.75, 1.7], 6);
  if (builder.isFar) {
    builder.box("paint", "#e4e7ea", [0.9, 0.025, 0.16], [0, 0.06, 0]);
    return;
  }
  builder.sphere("paint", "#f4f1ea", 0.09, [0, 0.06, -0.24], [1, 1, 1], 6);
  addSpike(
    builder,
    "paint",
    "#e9a227",
    [0, 0.05, -0.31],
    [0, 0.03, -0.42],
    0.03,
    4,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      "#e4e7ea",
      [0.42, 0.025, 0.16],
      [side * 0.26, 0.05, 0],
      [0, 0, side * 0.25],
    );
    builder.box(
      "paint",
      "#3a3d42",
      [0.14, 0.026, 0.14],
      [side * 0.5, 0.11, 0.01],
      [0, 0, side * 0.25],
    );
  });
  builder.box("paint", "#d9dde2", [0.14, 0.02, 0.14], [0, 0.02, 0.26]);
};
