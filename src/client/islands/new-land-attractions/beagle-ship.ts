import { BoxGeometry, ExtrudeGeometry, Shape, ShapeGeometry } from "three";
import {
  addBench,
  addLampPost,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalSpot,
  type PlayRide,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

/*
 * HMS Beagle, the little survey ship that carried Charles Darwin round
 * the world, standing in a stone dry dock on timber blocks and shores.
 * A gangplank climbs to her deck, which the Character can walk along
 * to her wheel; a Galapagos corner of cactus, lava rock and giant
 * tortoises sits beside her, with Darwin himself on a plinth.
 */

const hullBlack = "#1f2328";
const strakeWhite = "#efe9d8";
const copper = "#b87348";
const deckTimber = "#c9a46e";
const bulwarkBuff = "#d8c39a";
const railTimber = "#5a3a22";
const sparTimber = "#7a5232";
const rope = "#a08a62";
const sailCloth = "#efe6cf";
const dockStone = "#8f96a6";
const dockStoneDark = "#6c7282";
const sand = "#d9c79a";
const lavaRock = "#3f3b44";
const cactusGreen = "#5f8a3c";
const brass = "#d4b04a";
const signColour = "#1f2d5c";
const ensignRed = "#c8102e";

const footprint = 10;

/* The hull lies along z, her bow to -z and her stern to +z. */
const hullX = -1.7;
const bowZ = -5.6;
const sternZ = 4.2;
const beam = 1.55;
const deckY = 1.75;
const gapFrom = -1.35;
const gapTo = -0.05;
const gapZ = (gapFrom + gapTo) / 2;
const rampFoot = 3.9;

const shareAlong = (z: number) => (z - bowZ) / (sternZ - bowZ);

const findHalfWidth = (z: number): number => {
  const along = Math.min(1, Math.max(0, shareAlong(z)));
  if (along < 0.55) {
    return Math.max(
      0.06,
      beam * Math.sin((along / 0.55) * (Math.PI / 2)) ** 0.7,
    );
  }
  return beam * (1 - 0.28 * ((along - 0.55) / 0.45) ** 2);
};

const findKeel = (z: number): number =>
  0.45 + 1.1 * Math.max(0, 1 - shareAlong(z) / 0.15) ** 2;

const findRail = (z: number): number => {
  const along = shareAlong(z);
  return (
    deckY +
    0.55 +
    0.25 * Math.max(0, (along - 0.8) / 0.2) ** 2 +
    0.3 * Math.max(0, (0.15 - along) / 0.15) ** 2
  );
};

const waterLine = 1.0;
const strakeFrom = 1.5;
const strakeTo = 1.82;

/** One section of the hull, outside and in, with the deck across it. */
const sectionAt = (z: number): (readonly [number, number])[] => {
  const width = findHalfWidth(z);
  const keel = findKeel(z);
  const rail = findRail(z);
  const depth = deckY - keel;
  const side: [number, number][] = [
    [1, rail],
    [1.03, deckY - 0.1],
    [1, deckY - 0.3 * depth],
    [0.93, deckY - 0.6 * depth],
    [0.78, deckY - 0.8 * depth],
    [0.52, deckY - 0.93 * depth],
    [0.2, keel + 0.02],
    [0, keel],
  ];
  const inner = Math.max(width * 0.35, width - 0.12);
  return [
    ...side.map(([out, up]) => [out * width, up] as const),
    ...side
      .slice(0, -1)
      .toReversed()
      .map(([out, up]) => [-out * width, up] as const),
    [-inner, rail],
    [-inner, deckY],
    [inner, deckY],
    [inner, rail],
  ].map(([x, y]) => [x + hullX, y] as const);
};

const isInGap = (x: number, y: number, z: number) =>
  x > hullX && y > deckY + 0.02 && z > gapFrom && z < gapTo;

const buildHull = (builder: AttractionBuilder) => {
  const steps = builder.segments(30, 12);
  const zs = [
    ...Array.from(
      { length: steps + 1 },
      (_, step) => bowZ + ((sternZ - bowZ) * step) / steps,
    ),
    gapFrom,
    gapTo,
  ].toSorted((a, b) => a - b);
  builder.loft({
    stations: zs.map((z) => ({ z, points: sectionAt(z) })),
    finish: "paint",
    capEnd: false,
    paint: (centre, normal) => {
      const { x, y, z } = centre;
      if (isInGap(x, y, z)) {
        return undefined;
      }
      const width = findHalfWidth(z);
      const isInside = Math.abs(x - hullX) < width - 0.06 && y > deckY - 0.02;
      if (normal.y > 0.7 && Math.abs(y - deckY) < 0.04) {
        const plank = Math.floor((x - hullX) * 6) % 2 === 0;
        return {
          colour: shade(deckTimber, plank ? 1 : 0.9),
          finish: "matte",
        };
      }
      if (normal.y > 0.7 && y > deckY + 0.3) {
        return { colour: railTimber, finish: "matte" };
      }
      if (isInside) {
        return { colour: bulwarkBuff, finish: "paint" };
      }
      if (y < waterLine) {
        return { colour: copper, finish: "metal" };
      }
      if (y > strakeFrom && y < strakeTo) {
        return { colour: strakeWhite, finish: "paint" };
      }
      return { colour: hullBlack, finish: "paint" };
    },
  });
  /* The flat transom across the stern, with her windows and name */
  const outline = sectionAt(sternZ).slice(0, 15);
  const transom = new Shape();
  outline.forEach(([x, y], index) => {
    if (index === 0) {
      transom.moveTo(x - hullX, y);
    } else {
      transom.lineTo(x - hullX, y);
    }
  });
  builder.add(
    "paint",
    hullBlack,
    new ShapeGeometry(transom, builder.segments(8, 4)),
    {
      at: [hullX, 0, sternZ],
    },
  );
  const sternWidth = findHalfWidth(sternZ);
  const sternRail = findRail(sternZ);
  builder.box(
    "paint",
    bulwarkBuff,
    [sternWidth * 2 - 0.2, sternRail - deckY, 0.06],
    [hullX, (sternRail + deckY) / 2, sternZ - 0.04],
  );
  builder.box(
    "matte",
    railTimber,
    [sternWidth * 2 + 0.06, 0.08, 0.18],
    [hullX, sternRail + 0.04, sternZ - 0.02],
  );
  builder.box(
    "paint",
    strakeWhite,
    [sternWidth * 1.7, 0.34, 0.03],
    [hullX, deckY + 0.1, sternZ + 0.02],
  );
  builder.box(
    "paint",
    "#d9b45a",
    [sternWidth * 1.1, 0.12, 0.03],
    [hullX, deckY - 0.18, sternZ + 0.02],
  );
  if (builder.isFar) {
    return;
  }
  /* "BEAGLE" in gilt letters on the transom */
  for (let letter = 0; letter < 6; letter++) {
    builder.box(
      "metal",
      brass,
      [0.1, 0.16, 0.02],
      [hullX - 0.45 + letter * 0.18, deckY - 0.18, sternZ + 0.05],
    );
  }
  [-0.75, -0.25, 0.25, 0.75].forEach((across) => {
    builder.box(
      "glow",
      palette.warmLight,
      [0.3, 0.26, 0.02],
      [hullX + across, deckY + 0.1, sternZ + 0.045],
    );
    builder.box(
      "paint",
      strakeWhite,
      [0.04, 0.3, 0.03],
      [hullX + across, deckY + 0.1, sternZ + 0.06],
    );
  });
  /* Gun ports along the white strake */
  [-3.6, -2.4, 0.6, 1.8, 3.0].forEach((z) => {
    [-1, 1].forEach((side) => {
      const width = findHalfWidth(z);
      builder.box(
        "paint",
        hullBlack,
        [0.03, 0.22, 0.28],
        [hullX + side * (width * 1.02 + 0.02), (strakeFrom + strakeTo) / 2, z],
      );
    });
  });
  /* Rope ladder hanging down the side, for climbing aboard */
  const ladderZ = 2.0;
  const ladderX = hullX + findHalfWidth(ladderZ) * 1.03 + 0.04;
  [-0.18, 0.18].forEach((along) => {
    builder.bar(
      "matte",
      rope,
      [ladderX, findRail(ladderZ), ladderZ + along],
      [ladderX + 0.05, 0.1, ladderZ + along],
      0.03,
      4,
    );
  });
  for (let rung = 0; rung < 7; rung++) {
    const y = 0.35 + rung * 0.3;
    builder.box(
      "matte",
      sparTimber,
      [0.05, 0.04, 0.42],
      [ladderX + 0.03, y, ladderZ],
    );
  }
  /* Anchors hanging at the bow */
  [-1, 1].forEach((side) => {
    const z = bowZ + 1.1;
    const x = hullX + side * (findHalfWidth(z) + 0.06);
    builder.bar(
      "metal",
      palette.darkSteel,
      [x, 1.95, z],
      [x, 1.05, z],
      0.07,
      6,
    );
    builder.bar(
      "metal",
      palette.darkSteel,
      [x, 1.1, z - 0.3],
      [x, 1.1, z + 0.3],
      0.06,
      6,
    );
    builder.torus(
      "metal",
      palette.darkSteel,
      0.09,
      0.025,
      [x, 2.02, z],
      "x",
      10,
    );
  });
};

/* The dry dock, its blocks and shores */

const buildDock = (builder: AttractionBuilder) => {
  const dockWidth = 5.4;
  const dockFrom = -6.6;
  const dockTo = 5.2;
  builder.box(
    "matte",
    dockStone,
    [dockWidth, 0.06, dockTo - dockFrom],
    [hullX, 0.03, (dockFrom + dockTo) / 2],
  );
  const flags = builder.isFar ? 0 : 9;
  for (let row = 0; row < flags; row++) {
    builder.box(
      "matte",
      dockStoneDark,
      [dockWidth - 0.1, 0.012, 0.04],
      [hullX, 0.065, dockFrom + 0.6 + row * 1.25],
    );
  }
  /* A low coping round the dock, low enough to step over */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(dockStone, 1.1),
      [0.3, 0.18, dockTo - dockFrom],
      [hullX + side * (dockWidth / 2), 0.09, (dockFrom + dockTo) / 2],
    );
  });
  builder.box(
    "matte",
    shade(dockStone, 1.1),
    [dockWidth + 0.3, 0.18, 0.3],
    [hullX, 0.09, dockFrom],
  );
  /* Keel blocks under her keel */
  [-4.4, -3.0, -1.5, 0, 1.5, 3.0].forEach((z) => {
    const keel = findKeel(z);
    builder.box(
      "matte",
      railTimber,
      [0.7, keel - 0.06, 0.45],
      [hullX, (keel + 0.06) / 2, z],
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        sparTimber,
        [0.8, 0.06, 0.5],
        [hullX, keel - 0.03, z],
      );
    }
  });
  /* Timber shores propping her upright */
  const shoreZs = builder.isFar ? [-3.4, 1.4] : [-4.2, -2.8, 0.7, 1.4, 3.1];
  shoreZs.forEach((z) => {
    [-1, 1].forEach((side) => {
      if (side > 0 && z > gapFrom - 0.4 && z < gapTo + 0.4) {
        return;
      }
      const width = findHalfWidth(z);
      builder.bar(
        "matte",
        sparTimber,
        [hullX + side * (width + 1.0), 0.08, z],
        [hullX + side * (width * 0.97), 1.25, z],
        0.14,
        6,
      );
      builder.box(
        "matte",
        railTimber,
        [0.35, 0.1, 0.3],
        [hullX + side * (width + 1.0), 0.06, z],
      );
    });
  });
};

/* The gangplank up to the deck */

const buildGangplank = (builder: AttractionBuilder) => {
  const top: Triple = [hullX + findHalfWidth(gapZ) - 0.05, deckY - 0.02, gapZ];
  const foot: Triple = [rampFoot, 0.04, gapZ];
  const length = Math.hypot(foot[0] - top[0], foot[1] - top[1]);
  const slope = Math.atan2(top[1] - foot[1], foot[0] - top[0]);
  builder.box(
    "matte",
    deckTimber,
    [length, 0.08, 1.3],
    [(top[0] + foot[0]) / 2, (top[1] + foot[1]) / 2 - 0.04, gapZ],
    [0, 0, slope],
  );
  const cleats = builder.isFar ? 0 : 10;
  for (let cleat = 1; cleat < cleats; cleat++) {
    const share = cleat / cleats;
    builder.box(
      "matte",
      railTimber,
      [0.05, 0.03, 1.2],
      [
        foot[0] + (top[0] - foot[0]) * share,
        foot[1] + (top[1] - foot[1]) * share + 0.02,
        gapZ,
      ],
      [0, 0, slope],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Rope handrails on stanchions */
  [-0.68, 0.68].forEach((across) => {
    const posts = builder.isFar ? 2 : 5;
    for (let post = 0; post < posts; post++) {
      const share = post / (posts - 1);
      const x = foot[0] + (top[0] - foot[0]) * share;
      const y = foot[1] + (top[1] - foot[1]) * share;
      builder.cylinder("metal", brass, {
        radius: 0.03,
        length: 0.9,
        at: [x, y + 0.45, gapZ + across],
        segments: 6,
      });
    }
    builder.bar(
      "matte",
      rope,
      [foot[0], foot[1] + 0.88, gapZ + across],
      [top[0], top[1] + 0.88, gapZ + across],
      0.035,
      5,
    );
  });
  /* Trestles under the plank */
  [0.35, 0.65].forEach((share) => {
    const x = foot[0] + (top[0] - foot[0]) * share;
    const y = foot[1] + (top[1] - foot[1]) * share;
    [-0.5, 0.5].forEach((across) => {
      builder.box(
        "matte",
        railTimber,
        [0.1, y, 0.1],
        [x, y / 2, gapZ + across],
      );
    });
  });
};

/* Masts, yards, sails and rigging */

interface Mast {
  z: number;
  height: number;
}

const masts: readonly Mast[] = [
  { z: -3.4, height: 6.4 },
  { z: -0.6, height: 7.0 },
  { z: 2.5, height: 5.2 },
];

const mastTopY = (mast: Mast) => deckY + mast.height;
const topPlatformY = (mast: Mast) => deckY + mast.height * 0.52;

const addSail = (
  builder: AttractionBuilder,
  width: number,
  height: number,
  at: Triple,
) => {
  const sail = new BoxGeometry(
    width,
    height,
    0.03,
    builder.isFar ? 2 : 6,
    builder.isFar ? 1 : 4,
    1,
  );
  const positions = sail.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const billow =
      Math.cos((x / width) * Math.PI) * Math.cos((y / height) * Math.PI) * 0.28;
    positions.setXYZ(index, x, y, positions.getZ(index) - billow);
  }
  sail.computeVertexNormals();
  builder.add("matte", sailCloth, sail, { at });
};

const buildRig = (builder: AttractionBuilder) => {
  masts.forEach((mast, index) => {
    const lower = mast.height * 0.55;
    builder.cylinder("matte", sparTimber, {
      radius: 0.15,
      radiusEnd: 0.12,
      length: lower + 0.1,
      at: [hullX, deckY + lower / 2, mast.z],
      segments: 10,
    });
    builder.cylinder("matte", sparTimber, {
      radius: 0.1,
      radiusEnd: 0.05,
      length: mast.height - lower + 0.3,
      at: [hullX, deckY + (lower + mast.height) / 2, mast.z - 0.05],
      segments: 8,
    });
    /* The top: a little platform at the lower masthead */
    builder.cylinder("matte", railTimber, {
      radius: 0.55,
      length: 0.08,
      at: [hullX, topPlatformY(mast), mast.z],
      segments: 12,
    });
    if (!builder.isFar) {
      builder.sphere(
        "paint",
        strakeWhite,
        0.09,
        [hullX, mastTopY(mast) + 0.12, mast.z - 0.05],
        [1, 1, 1],
        8,
      );
    }
    /* Three yards, a furled course, a set topsail and a furled topgallant */
    const yards = [
      { y: deckY + mast.height * 0.38, span: 1.6, set: false },
      { y: deckY + mast.height * 0.68, span: 1.3, set: true },
      { y: deckY + mast.height * 0.88, span: 0.95, set: false },
    ];
    yards.forEach((yard, yardIndex) => {
      const span = yard.span * (index === 2 ? 0.8 : 1);
      builder.bar(
        "matte",
        sparTimber,
        [hullX - span, yard.y, mast.z + 0.16],
        [hullX + span, yard.y, mast.z + 0.16],
        0.07,
        6,
      );
      if (yard.set) {
        const below = yards[yardIndex - 1].y;
        addSail(builder, span * 1.8, yard.y - below - 0.12, [
          hullX,
          (yard.y + below) / 2,
          mast.z + 0.22,
        ]);
      } else {
        builder.cylinder("matte", sailCloth, {
          radius: 0.09,
          length: span * 1.7,
          at: [hullX, yard.y - 0.09, mast.z + 0.2],
          axis: "x",
          segments: 8,
        });
      }
    });
    if (builder.isFar) {
      return;
    }
    /* Shrouds from the rails up to the top, with ratlines */
    [-1, 1].forEach((side) => {
      const width = findHalfWidth(mast.z);
      const top: Triple = [hullX + side * 0.15, topPlatformY(mast), mast.z];
      [-0.35, 0, 0.35].forEach((along) => {
        builder.bar(
          "matte",
          rope,
          [hullX + side * (width + 0.05), findRail(mast.z), mast.z + along],
          top,
          0.025,
          3,
        );
      });
      for (let rung = 1; rung < 6; rung++) {
        const share = rung / 6;
        const x = hullX + side * (width + 0.05 + (0.15 - width - 0.05) * share);
        const y = findRail(mast.z) + (top[1] - findRail(mast.z)) * share;
        builder.box(
          "matte",
          rope,
          [0.02, 0.02, 0.7 * (1 - share) + 0.05],
          [x, y, mast.z],
        );
      }
      builder.bar(
        "matte",
        rope,
        [hullX + side * 0.4, topPlatformY(mast) + 0.05, mast.z],
        [hullX + side * 0.06, mastTopY(mast) - 0.3, mast.z],
        0.02,
        3,
      );
    });
    /* Rails round the top */
    builder.torus(
      "matte",
      railTimber,
      0.52,
      0.02,
      [hullX, topPlatformY(mast) + 0.35, mast.z],
      "y",
      10,
    );
  });
  /* Bowsprit and jib boom, with two jibs */
  const bowTop: Triple = [hullX, findRail(bowZ + 0.3), bowZ + 0.3];
  const sprit: Triple = [hullX, deckY + 1.5, bowZ - 2.6];
  builder.bar(
    "matte",
    sparTimber,
    [hullX, deckY + 0.2, bowZ + 1.2],
    sprit,
    0.16,
    8,
  );
  const fore = masts[0];
  [0, 1].forEach((jib) => {
    const tack: Triple = [
      hullX,
      sprit[1] - 0.3 + jib * 0.3,
      sprit[2] + 1.2 - jib * 1.0,
    ];
    const head: Triple = [
      hullX,
      topPlatformY(fore) + 0.6 + jib * 1.2,
      fore.z - 0.1,
    ];
    const clew: Triple = [
      hullX,
      deckY + 1.0 + jib * 0.4,
      fore.z - 1.3 + jib * 0.2,
    ];
    const shape = new Shape();
    shape.moveTo(tack[2], tack[1]);
    shape.lineTo(head[2], head[1]);
    shape.lineTo(clew[2], clew[1]);
    shape.lineTo(tack[2], tack[1]);
    const cloth = new ExtrudeGeometry(shape, {
      depth: 0.03,
      bevelEnabled: false,
    });
    builder.add("matte", sailCloth, cloth, {
      at: [hullX - 0.015, 0, 0],
      rotation: [0, -Math.PI / 2, 0],
    });
    builder.bar("matte", rope, tack, head, 0.025, 3);
  });
  builder.bar(
    "matte",
    rope,
    sprit,
    [hullX, mastTopY(fore) - 0.4, fore.z],
    0.025,
    3,
  );
  builder.bar("matte", rope, bowTop, [hullX, deckY + 0.9, bowZ - 1.2], 0.02, 3);
  /* Stays between the masts */
  builder.bar(
    "matte",
    rope,
    [hullX, mastTopY(masts[1]) - 0.4, masts[1].z],
    [hullX, topPlatformY(fore) + 0.1, fore.z],
    0.025,
    3,
  );
  builder.bar(
    "matte",
    rope,
    [hullX, mastTopY(masts[2]) - 0.3, masts[2].z],
    [hullX, topPlatformY(masts[1]) + 0.1, masts[1].z],
    0.025,
    3,
  );
  /* The ensign staff at the stern */
  builder.bar(
    "matte",
    sparTimber,
    [hullX, findRail(sternZ) - 0.1, sternZ - 0.1],
    [hullX, findRail(sternZ) + 1.3, sternZ + 0.15],
    0.05,
    6,
  );
};

/* Things on her deck */

const wheelPivot: Triple = [hullX, deckY + 0.78, 3.45];

const buildDeckThings = (builder: AttractionBuilder) => {
  /* The wheel's stand and the binnacle beside it */
  [-0.28, 0.28].forEach((side) => {
    builder.box(
      "matte",
      railTimber,
      [0.08, 0.85, 0.12],
      [hullX + side, deckY + 0.42, 3.5],
    );
  });
  builder.box(
    "matte",
    railTimber,
    [0.64, 0.1, 0.14],
    [hullX, deckY + 0.84, 3.5],
  );
  builder.cylinder("paint", railTimber, {
    radius: 0.16,
    radiusEnd: 0.12,
    length: 0.8,
    at: [hullX, deckY + 0.4, 2.85],
    segments: 10,
  });
  builder.sphere(
    "metal",
    brass,
    0.17,
    [hullX, deckY + 0.86, 2.85],
    [1, 0.8, 1],
    10,
  );
  /* The skylight over the poop cabin where Darwin worked */
  builder.box(
    "paint",
    strakeWhite,
    [0.8, 0.36, 1.0],
    [hullX, deckY + 0.18, 1.2],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#7fb0d8",
      [0.42, 0.03, 0.9],
      [hullX + side * 0.18, deckY + 0.44, 1.2],
      [0, 0, side * -0.5],
    );
  });
  /* The capstan */
  builder.cylinder("matte", sparTimber, {
    radius: 0.24,
    radiusEnd: 0.18,
    length: 0.6,
    at: [hullX, deckY + 0.3, 0.3],
    segments: 12,
  });
  builder.cylinder("matte", railTimber, {
    radius: 0.3,
    length: 0.1,
    at: [hullX, deckY + 0.62, 0.3],
    segments: 12,
  });
  /* A hatch grating forward, and the galley chimney */
  builder.box("matte", railTimber, [0.9, 0.2, 0.9], [hullX, deckY + 0.1, -2.1]);
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.09,
    length: 0.7,
    at: [hullX + 0.5, deckY + 0.35, -4.2],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  for (let bar = 0; bar < 5; bar++) {
    builder.box(
      "matte",
      sparTimber,
      [0.84, 0.03, 0.05],
      [hullX, deckY + 0.215, -2.45 + bar * 0.17],
    );
  }
  for (let spoke = 0; spoke < 8; spoke++) {
    const angle = (spoke / 8) * Math.PI * 2;
    builder.box(
      "matte",
      railTimber,
      [0.05, 0.5, 0.05],
      [
        hullX + Math.sin(angle) * 0.24,
        deckY + 0.6,
        0.3 + Math.cos(angle) * 0.24,
      ],
      [0, angle, 0],
    );
  }
  /* Two small carronades, Darwin's specimen chest, barrels and coils of rope */
  [-1, 1].forEach((side) => {
    const z = -1.9 + side * 0.0;
    const x = hullX + side * (findHalfWidth(z) - 0.45);
    builder.box(
      "matte",
      railTimber,
      [0.4, 0.18, 0.5],
      [x, deckY + 0.09, z + 0.55 * side],
    );
    builder.cylinder("metal", palette.black, {
      radius: 0.09,
      radiusEnd: 0.07,
      length: 0.6,
      at: [x + side * 0.1, deckY + 0.28, z + 0.55 * side],
      axis: "x",
      segments: 8,
    });
  });
  builder.box(
    "matte",
    "#7a4a2a",
    [0.6, 0.34, 0.38],
    [hullX - 0.75, deckY + 0.17, 2.0],
  );
  builder.box(
    "metal",
    brass,
    [0.62, 0.04, 0.4],
    [hullX - 0.75, deckY + 0.3, 2.0],
  );
  [
    [hullX + 0.85, -3.0],
    [hullX + 0.95, -3.55],
    [hullX - 0.9, -2.9],
  ].forEach(([x, z]) => {
    builder.cylinder("matte", "#8a5a35", {
      radius: 0.17,
      length: 0.42,
      at: [x, deckY + 0.21, z],
      segments: 10,
    });
    builder.torus(
      "metal",
      palette.darkSteel,
      0.175,
      0.012,
      [x, deckY + 0.32, z],
      "y",
      10,
    );
  });
  [
    [hullX - 0.9, 0.9],
    [hullX + 0.95, 2.55],
  ].forEach(([x, z]) => {
    builder.torus("matte", rope, 0.16, 0.05, [x, deckY + 0.05, z], "y", 12);
    builder.torus("matte", rope, 0.1, 0.045, [x, deckY + 0.12, z], "y", 10);
  });
  /* The ship's bell on its belfry */
  builder.box(
    "matte",
    railTimber,
    [0.06, 0.6, 0.06],
    [hullX - 0.25, deckY + 0.3, -4.7],
  );
  builder.box(
    "matte",
    railTimber,
    [0.06, 0.6, 0.06],
    [hullX + 0.25, deckY + 0.3, -4.7],
  );
  builder.box(
    "matte",
    railTimber,
    [0.6, 0.06, 0.1],
    [hullX, deckY + 0.62, -4.7],
  );
  builder.lathe(
    "metal",
    brass,
    [
      [0.001, 0.2],
      [0.06, 0.19],
      [0.08, 0.1],
      [0.12, 0.0],
    ],
    [hullX, deckY + 0.36, -4.7],
    "y",
    12,
  );
};

/* The Galapagos corner, Darwin's statue, lamps and benches */

const galapagos = { x: 5.4, z: -3.6 };
const statueAt = { x: 5.6, z: 2.6 };

const addCactus = (builder: AttractionBuilder, at: Triple, size: number) => {
  const [x, , z] = at;
  builder.cylinder("matte", "#7a6a52", {
    radius: 0.1 * size,
    length: 0.8 * size,
    at: [x, 0.4 * size, z],
    segments: 7,
  });
  const pads: Triple[] = builder.isFar
    ? [[0, 1.0, 0]]
    : [
        [0, 1.0, 0],
        [0.25, 1.35, 0.05],
        [-0.22, 1.3, -0.04],
        [0.05, 1.7, 0.02],
        [0.4, 1.0, -0.05],
      ];
  pads.forEach(([dx, dy, dz], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? cactusGreen : shade(cactusGreen, 1.15),
      0.26 * size,
      [x + dx * size, dy * size, z + dz * size],
      [1, 1.15, 0.35],
      8,
    );
  });
};

const buildShore = (builder: AttractionBuilder) => {
  builder.cylinder("matte", sand, {
    radius: 2.5,
    radiusEnd: 2.6,
    length: 0.04,
    at: [galapagos.x, 0.02, galapagos.z],
    segments: builder.segments(20, 10),
  });
  [
    [galapagos.x + 1.7, galapagos.z - 1.2, 0.45],
    [galapagos.x - 1.8, galapagos.z + 0.9, 0.35],
    [galapagos.x + 0.6, galapagos.z + 1.9, 0.3],
    [galapagos.x - 1.2, galapagos.z - 1.8, 0.4],
  ].forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? lavaRock : shade(lavaRock, 1.25),
      size,
      [x, size * 0.45, z],
      [1.3, 0.75, 1.1],
      8,
    );
  });
  addCactus(builder, [galapagos.x + 1.8, 0, galapagos.z + 0.6], 1);
  addCactus(builder, [galapagos.x - 0.9, 0, galapagos.z - 2.0], 0.85);
  /* Darwin on his plinth, in frock coat and side-whiskers, notebook in hand */
  const { x, z } = statueAt;
  builder.box("matte", dockStone, [0.9, 0.7, 0.9], [x, 0.35, z]);
  builder.box("matte", shade(dockStone, 1.12), [1.05, 0.1, 1.05], [x, 0.74, z]);
  builder.box("metal", brass, [0.5, 0.16, 0.02], [x, 0.4, z + 0.46]);
  const bronze = "#6d7a58";
  builder.cylinder("metal", bronze, {
    radius: 0.24,
    radiusEnd: 0.3,
    length: 0.8,
    at: [x, 1.2, z],
    segments: 12,
  });
  builder.cylinder("metal", bronze, {
    radius: 0.19,
    radiusEnd: 0.24,
    length: 0.5,
    at: [x, 1.85, z],
    segments: 12,
  });
  builder.sphere("metal", bronze, 0.17, [x, 2.27, z], [1, 1.1, 1], 12);
  builder.sphere(
    "metal",
    shade(bronze, 0.9),
    0.12,
    [x, 2.16, z + 0.08],
    [1.1, 1, 0.8],
    10,
  );
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.bar(
        "metal",
        bronze,
        [x + side * 0.22, 2.05, z],
        [x + side * 0.24, 1.6, z + 0.18],
        0.1,
        6,
      );
    });
    builder.box(
      "metal",
      shade(bronze, 1.2),
      [0.24, 0.3, 0.05],
      [x, 1.62, z + 0.27],
      [-0.5, 0, 0],
    );
    [-0.08, 0.08].forEach((side) => {
      builder.cylinder("metal", bronze, {
        radius: 0.08,
        length: 0.2,
        at: [x + side, 0.85, z],
        segments: 8,
      });
    });
  }
  if (builder.isFar) {
    return;
  }
  addLampPost(builder, [3.3, 0, 5.4], 2.3);
  addLampPost(builder, [-5.6, 0, 5.8], 2.3);
  addBench(builder, [5.9, 0, 4.4], -Math.PI / 2 - 0.4, "#3c4f80");
  addBench(builder, [1.6, 0, 6.6], Math.PI, "#3c4f80");
};

/* Moving parts */

const buildWheel = (builder: AttractionBuilder) => {
  builder.torus("matte", "#8a5a35", 0.36, 0.035, [0, 0, 0], "z", 14);
  builder.torus("matte", "#8a5a35", 0.14, 0.04, [0, 0, 0], "z", 12);
  builder.cylinder("metal", brass, {
    radius: 0.07,
    length: 0.14,
    at: [0, 0, 0],
    axis: "z",
    segments: 10,
  });
  for (let spoke = 0; spoke < 8; spoke++) {
    const angle = (spoke / 8) * Math.PI * 2;
    builder.bar(
      "matte",
      "#8a5a35",
      [Math.cos(angle) * 0.08, Math.sin(angle) * 0.08, 0],
      [Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0],
      0.04,
      5,
    );
    if (!builder.isFar) {
      builder.sphere(
        "matte",
        railTimber,
        0.035,
        [Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0],
        [1, 1, 1],
        5,
      );
    }
  }
};

const buildPennant = (builder: AttractionBuilder) => {
  builder.box("paint", ensignRed, [0.03, 0.12, 1.1], [0, 0, 0.55]);
  builder.box("paint", strakeWhite, [0.03, 0.04, 0.5], [0, 0, 1.2]);
};

const buildEnsign = (builder: AttractionBuilder) => {
  builder.box("paint", ensignRed, [0.02, 0.45, 0.7], [0, 0, 0.35]);
  if (builder.isFar) {
    return;
  }
  /* The Union in the top corner, nearest the staff */
  builder.box("paint", "#1f3a8a", [0.025, 0.22, 0.32], [0, 0.11, 0.16]);
  builder.box("paint", strakeWhite, [0.03, 0.05, 0.32], [0, 0.11, 0.16]);
  builder.box("paint", strakeWhite, [0.03, 0.22, 0.06], [0, 0.11, 0.16]);
  builder.box("paint", ensignRed, [0.035, 0.025, 0.32], [0, 0.11, 0.16]);
};

const buildLantern = (builder: AttractionBuilder) => {
  builder.cylinder("glow", palette.warmLight, {
    radius: 0.14,
    length: 0.3,
    at: [0, 0, 0],
    segments: 8,
  });
  builder.cylinder("metal", brass, {
    radius: 0.18,
    radiusEnd: 0.04,
    length: 0.16,
    at: [0, 0.23, 0],
    segments: 8,
  });
  builder.cylinder("metal", brass, {
    radius: 0.16,
    length: 0.04,
    at: [0, -0.17, 0],
    segments: 8,
  });
};

/* Wanderers: giant tortoises and Darwin's finches */

const buildTortoise = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#5a5040", 0.42, [0, 0.3, 0], [1, 0.72, 1.2], 12);
  if (!builder.isFar) {
    for (let plate = 0; plate < 5; plate++) {
      const angle = (plate / 5) * Math.PI * 2;
      builder.sphere(
        "matte",
        "#6e624c",
        0.13,
        [Math.sin(angle) * 0.2, 0.52, Math.cos(angle) * 0.26],
        [1, 0.4, 1],
        6,
      );
    }
  }
  builder.sphere("matte", "#4a4436", 0.13, [0, 0.6, 0], [1, 0.4, 1], 6);
  if (builder.isFar) {
    builder.sphere(
      "matte",
      "#8a8268",
      0.1,
      [0, 0.4, 0.55],
      [0.9, 0.85, 1.2],
      6,
    );
    return;
  }
  builder.cylinder("matte", "#7a7058", {
    radius: 0.42,
    length: 0.08,
    at: [0, 0.14, 0],
    segments: 12,
  });
  builder.bar("matte", "#8a8268", [0, 0.25, 0.4], [0, 0.42, 0.62], 0.12, 6);
  builder.sphere("matte", "#8a8268", 0.1, [0, 0.45, 0.68], [0.9, 0.85, 1.2], 8);
  [
    [-0.3, 0.3],
    [0.3, 0.3],
    [-0.3, -0.3],
    [0.3, -0.3],
  ].forEach(([x, z]) => {
    builder.cylinder("matte", "#8a8268", {
      radius: 0.08,
      length: 0.2,
      at: [x, 0.1, z],
      segments: 6,
    });
  });
};

const buildFinch = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#3a3530", 0.08, [0, 0, 0], [0.85, 0.85, 1.3], 6);
  if (builder.isFar) {
    return;
  }
  builder.sphere("matte", "#4a443c", 0.055, [0, 0.04, 0.09], [1, 1, 1], 6);
  builder.cylinder("matte", "#d9b46a", {
    radius: 0.03,
    radiusEnd: 0.005,
    length: 0.07,
    at: [0, 0.03, 0.17],
    axis: "z",
    segments: 5,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#2a2622",
      [0.14, 0.012, 0.08],
      [side * 0.1, 0.03, 0],
      [0, 0, side * 0.4],
    );
  });
};

/* Where the Character can go */

const deckFrom = bowZ + 0.7;
const deckTo = sternZ - 0.12;

const shipDeck: Deck = ({ x, z }) => {
  if (z < deckFrom || z > deckTo) {
    return undefined;
  }
  const reach = findHalfWidth(z) - 0.13;
  const isAboard = Math.abs(x - hullX) <= reach;
  const isInGangway =
    z > gapFrom + 0.05 &&
    z < gapTo - 0.05 &&
    x > hullX &&
    x <= hullX + reach + 0.3;
  return isAboard || isInGangway
    ? { height: deckY, kind: "bridge" }
    : undefined;
};

const rampTop = hullX + findHalfWidth(gapZ) - 0.1;

const gangplankDeck: Deck = ({ x, z }) => {
  if (Math.abs(z - gapZ) > 0.6 || x < rampTop || x > rampFoot) {
    return undefined;
  }
  return {
    height: (deckY * (rampFoot - x)) / (rampFoot - rampTop),
    kind: "bridge",
  };
};

/** Walks a path of points at an even pace, pausing where a point says so. */
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

const ladderZ = 2.0;
const shroudFoot = hullX + findHalfWidth(masts[2].z) - 0.1;
const riggingStart = { x: 1.1, z: 2.0 };
const riggingFinish = { x: rampFoot + 0.7, z: gapZ };
const riggingPath: readonly (readonly [number, number, number, number?])[] = [
  [riggingStart.x, 0, riggingStart.z],
  [hullX + findHalfWidth(ladderZ) + 0.35, 0, ladderZ],
  [hullX + findHalfWidth(ladderZ) + 0.25, deckY + 0.6, ladderZ],
  [hullX + findHalfWidth(ladderZ) - 0.3, deckY, ladderZ],
  [shroudFoot, deckY, masts[2].z],
  [hullX + 0.35, topPlatformY(masts[2]), masts[2].z, 3],
  [shroudFoot, deckY, masts[2].z],
  [hullX + 0.4, deckY, 1.9],
  [hullX + 0.5, deckY, gapZ],
  [rampTop, deckY, gapZ],
  [rampFoot, 0, gapZ],
  [riggingFinish.x, 0, riggingFinish.z],
];

const riggingRide: PlayRide = {
  id: "rigging",
  name: "the rigging",
  start: riggingStart,
  reach: 0.5,
  seconds: 16,
  finish: riggingFinish,
  follow: (progress) => followPath(riggingPath, progress),
};

export const beagleShipModel: NewLandAttractionModel = {
  kind: "beagle-ship",
  islandId: "starfall-isle",
  name: "Beagle Ship",
  fact: "HMS Beagle sailed right round the world from 1831 to 1836, with a young naturalist called Charles Darwin on board. He collected fossils, plants and animals, and noticed that living things are suited to the places where they live. Years later he explained how living things slowly change over many generations, which we call evolution.",
  curriculumLink:
    "Science, Year 6: evolution and inheritance. How Charles Darwin's voyage on HMS Beagle led to his idea that living things adapt to their surroundings and change over time.",
  footprint,
  setting: "inland",
  signSpot: { x: 3.15, z: 8.7 },
  build: (builder) => {
    buildDock(builder);
    buildHull(builder);
    buildGangplank(builder);
    buildRig(builder);
    buildDeckThings(builder);
    buildShore(builder);
    addSignBoard(builder, [3.4, 0, 7.9], signColour, -0.3);
  },
  moving: [
    {
      name: "wheel",
      pivot: wheelPivot,
      build: buildWheel,
      motion: { kind: "whirl", axis: "z", idle: 0.15, speed: 2.4, reach: 3.5 },
    },
    {
      name: "pennant",
      pivot: [hullX, mastTopY(masts[1]) + 0.2, masts[1].z - 0.05],
      build: buildPennant,
      motion: { kind: "swing", axis: "y", amplitude: 0.35, period: 2.8 },
    },
    {
      name: "ensign",
      pivot: [hullX, findRail(sternZ) + 1.05, sternZ + 0.12],
      build: buildEnsign,
      motion: {
        kind: "swing",
        axis: "y",
        amplitude: 0.3,
        period: 3.4,
        phase: 1,
      },
    },
    {
      name: "lantern",
      pivot: [hullX, findRail(sternZ) + 0.45, sternZ - 0.1],
      build: buildLantern,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "giant tortoises",
      build: buildTortoise,
      count: 2,
      centre: galapagos,
      radius: 1.5,
      speed: 0.15,
    },
    {
      name: "finches",
      build: buildFinch,
      count: 4,
      centre: { x: hullX, z: -0.5 },
      radius: 4,
      speed: 1.6,
      height: 6.5,
      bob: 0.3,
    },
  ],
  decks: [shipDeck, gangplankDeck],
  rides: [riggingRide],
  tune: [74, 76, 78, 79, 81, 79, 78, 76, 74, 81],
  play: {
    label: "Ring the ship's bell",
    news: "Ding-ding! Eight bells rang out across the dock, just as they did on the Beagle to tell the sailors their watch was over.",
  },
};
