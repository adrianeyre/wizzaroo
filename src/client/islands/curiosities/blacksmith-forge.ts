import { BoxGeometry, CylinderGeometry, TorusGeometry } from "three";
import {
  addGableRoof,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ashGround = "#5b4a42";
const wallStone = "#6f6660";
const wallStoneDark = "#544c47";
const flagstone = "#7d746c";
const timber = "#6b4a2f";
const timberDark = "#4a3220";
const roofShingle = "#4b3b35";
const hearthBrick = "#8a3f2c";
const coal = "#262222";
const ember = "#ff6a1f";
const emberCore = "#ffc04a";
const iron = "#3b3f44";
const ironLight = "#5c6369";
const leather = "#7a4a2a";
const hotIron = "#ff8a2a";
const tubWater = "#3f6f80";
const signColour = "#6b2f1e";

const shed = { minX: -2.4, maxX: 2.0, minZ: -1.8, maxZ: 1.4, height: 2.2 };
const shedMiddleX = (shed.minX + shed.maxX) / 2;
const shedWidth = shed.maxX - shed.minX;
const shedDepth = shed.maxZ - shed.minZ;
const roofRise = 1.1;
const hearthAt = { x: -1.1, z: -1.1 };
const hearthHeight = 0.8;
const chimneyAt = { x: hearthAt.x, z: -1.35 };
const chimneyTop = shed.height + roofRise + 0.9;
const bellowsHinge: Triple = [-1.7, 0.78, -1.0];
const anvilAt = { x: 0.35, z: 0.3 };
const anvilFace = 0.78;
const hammerPivot: Triple = [1.45, 1.02, anvilAt.z];
const tubAt = { x: 1.55, z: 0.95 };

const buildShed = (builder: AttractionBuilder) => {
  /* Flagstone floor */
  builder.box(
    "matte",
    flagstone,
    [shedWidth, 0.06, shedDepth],
    [shedMiddleX, 0.03, (shed.minZ + shed.maxZ) / 2],
  );
  /* Thick stone walls at the back and the left */
  builder.box(
    "matte",
    wallStone,
    [shedWidth, shed.height, 0.3],
    [shedMiddleX, shed.height / 2, shed.minZ + 0.15],
  );
  builder.box(
    "matte",
    wallStone,
    [0.3, shed.height, shedDepth - 0.8],
    [shed.minX + 0.15, shed.height / 2, shed.minZ + (shedDepth - 0.8) / 2],
  );
  /* Timber posts holding up the open front and right side */
  [
    [shed.minX + 0.12, shed.maxZ - 0.12],
    [shed.maxX - 0.12, shed.maxZ - 0.12],
    [shed.maxX - 0.12, shed.minZ + 0.3],
    [shed.maxX - 0.12, (shed.minZ + shed.maxZ) / 2],
  ].forEach(([x, z]) => {
    builder.box(
      "matte",
      timber,
      [0.2, shed.height, 0.2],
      [x, shed.height / 2, z],
    );
  });
  builder.box(
    "matte",
    timberDark,
    [shedWidth, 0.2, 0.22],
    [shedMiddleX, shed.height - 0.1, shed.maxZ - 0.12],
  );
  builder.box(
    "matte",
    timberDark,
    [0.22, 0.2, shedDepth],
    [shed.maxX - 0.12, shed.height - 0.1, (shed.minZ + shed.maxZ) / 2],
  );
  addGableRoof(builder, {
    width: shedWidth,
    depth: shedDepth,
    rise: roofRise,
    at: [shedMiddleX, shed.height, (shed.minZ + shed.maxZ) / 2],
    colour: roofShingle,
    overhang: 0.3,
    thickness: 0.12,
  });
  /* The loft under the roof, a timber-clad triangular prism */
  const halfDiagonal = shedDepth / 2;
  builder.add(
    "matte",
    shade(timber, 0.9),
    new BoxGeometry(
      shedWidth - 0.04,
      halfDiagonal * Math.SQRT2,
      halfDiagonal * Math.SQRT2,
    )
      .rotateX(Math.PI / 4)
      .scale(1, (roofRise - 0.04) / halfDiagonal, 1),
    { at: [shedMiddleX, shed.height, (shed.minZ + shed.maxZ) / 2] },
    undefined,
  );
  if (builder.isFar) {
    return;
  }
  /* Rows of shingles on the front slope */
  const slopeAngle = Math.atan2(roofRise, shedDepth / 2 + 0.3);
  for (let row = 1; row < 5; row++) {
    const share = row / 5;
    builder.box(
      "matte",
      shade(roofShingle, row % 2 === 0 ? 1.15 : 0.9),
      [shedWidth + 0.62, 0.03, 0.08],
      [
        shedMiddleX,
        shed.height + roofRise * share + 0.08,
        shed.maxZ + 0.3 - (shedDepth / 2 + 0.3) * share,
      ],
      [slopeAngle, 0, 0],
    );
  }
  /* Bigger quoin stones at the wall's corner, and a darker plinth */
  for (let course = 0; course < 5; course++) {
    builder.box(
      "matte",
      wallStoneDark,
      [course % 2 === 0 ? 0.4 : 0.34, 0.3, course % 2 === 0 ? 0.34 : 0.4],
      [shed.minX + 0.17, 0.25 + course * 0.42, shed.minZ + 0.17],
    );
  }
  builder.box(
    "matte",
    wallStoneDark,
    [0.34, 0.25, shedDepth - 0.78],
    [shed.minX + 0.15, 0.13, shed.minZ + (shedDepth - 0.8) / 2],
  );
  /* A big iron horseshoe over the front, for luck */
  builder.add(
    "metal",
    ironLight,
    new TorusGeometry(0.22, 0.045, 6, builder.segments(14), Math.PI * 1.4),
    {
      at: [shedMiddleX, shed.height + 0.45, shed.maxZ + 0.2],
      rotation: [0, 0, -Math.PI * 0.2],
    },
  );
};

const buildHearth = (builder: AttractionBuilder) => {
  const { x, z } = hearthAt;
  builder.box(
    "matte",
    hearthBrick,
    [1.2, hearthHeight, 0.95],
    [x, hearthHeight / 2, z],
  );
  builder.box(
    "matte",
    shade(hearthBrick, 0.8),
    [1.3, 0.1, 1.05],
    [x, hearthHeight + 0.05, z],
  );
  builder.box("glow", ember, [0.7, 0.04, 0.5], [x, hearthHeight + 0.11, z]);
  /* The hood narrowing up into the chimney */
  builder.add(
    "matte",
    wallStone,
    new CylinderGeometry(0.4, 0.95, 0.9, 4).rotateY(Math.PI / 4),
    { at: [x, 1.85, z - 0.05] },
    undefined,
  );
  builder.box(
    "matte",
    wallStoneDark,
    [0.6, chimneyTop - 2.3, 0.6],
    [chimneyAt.x, (chimneyTop + 2.3) / 2, chimneyAt.z],
  );
  builder.box(
    "matte",
    wallStoneDark,
    [0.74, 0.14, 0.74],
    [chimneyAt.x, chimneyTop, chimneyAt.z],
  );
  if (builder.isFar) {
    return;
  }
  /* Coals heaped in the fire, glowing at their hearts */
  for (let lump = 0; lump < 12; lump++) {
    const angle = lump * 2.4;
    const reach = 0.08 + (lump % 4) * 0.07;
    builder.sphere(
      lump % 3 === 0 ? "glow" : "matte",
      lump % 3 === 0 ? emberCore : coal,
      0.07 + (lump % 2) * 0.02,
      [
        x + Math.sin(angle) * reach * 1.2,
        hearthHeight + 0.15,
        z + Math.cos(angle) * reach,
      ],
      [1, 0.7, 1],
      6,
    );
  }
  /* Brick courses picked out on the hearth's front */
  [0.25, 0.5].forEach((height) => {
    builder.box(
      "matte",
      shade(hearthBrick, 1.18),
      [1.22, 0.03, 0.02],
      [x, height, z + 0.48],
    );
  });
  /* The ash pit's dark mouth */
  builder.box("matte", coal, [0.5, 0.28, 0.02], [x, 0.22, z + 0.48]);
  builder.cylinder("matte", wallStoneDark, {
    radius: 0.07,
    length: 0.3,
    at: [chimneyAt.x, chimneyTop + 0.2, chimneyAt.z],
    segments: 10,
  });
};

const buildBellowsBase = (builder: AttractionBuilder) => {
  const [hingeX, hingeY, hingeZ] = bellowsHinge;
  /* A timber stand, the bottom board, and the nozzle into the fire */
  [-0.5, -0.05].forEach((along) => {
    builder.box(
      "matte",
      timberDark,
      [0.08, hingeY - 0.08, 0.5],
      [hingeX + along, (hingeY - 0.08) / 2, hingeZ],
    );
  });
  builder.box(
    "matte",
    timber,
    [0.7, 0.05, 0.46],
    [hingeX - 0.33, hingeY - 0.05, hingeZ],
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", iron, {
    radius: 0.05,
    radiusEnd: 0.03,
    length: 0.3,
    at: [hingeX + 0.15, hingeY - 0.03, hingeZ],
    axis: "x",
    segments: 8,
  });
  /* The leather bag between the boards */
  builder.sphere(
    "matte",
    leather,
    0.24,
    [hingeX - 0.36, hingeY + 0.04, hingeZ],
    [1.5, 0.45, 0.95],
    12,
  );
};

/** The bellows' top board and handle, pumping air into the fire. */
const buildBellowsTop = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    shade(timber, 1.1),
    [0.72, 0.05, 0.46],
    [-0.36, 0.14, 0],
    [0, 0, -0.14],
  );
  builder.box(
    "matte",
    leather,
    [0.6, 0.08, 0.42],
    [-0.32, 0.07, 0],
    [0, 0, -0.08],
  );
  /* Brass studs round the board */
  [-0.15, -0.38, -0.6].forEach((along) => {
    builder.sphere(
      "metal",
      palette.brass,
      0.025,
      [along, 0.15 - along * 0.14 + 0.02, 0.2],
      [1, 1, 1],
      5,
    );
  });
  builder.bar("matte", timberDark, [-0.65, 0.2, 0], [-1.0, 0.55, 0], 0.05, 6);
  builder.cylinder("matte", timberDark, {
    radius: 0.04,
    length: 0.26,
    at: [-1.0, 0.55, 0],
    axis: "z",
    segments: 6,
  });
};

const buildAnvil = (builder: AttractionBuilder) => {
  const { x, z } = anvilAt;
  /* A big tree stump to stand it on */
  builder.cylinder("matte", timber, {
    radius: 0.32,
    radiusEnd: 0.28,
    length: 0.45,
    at: [x, 0.225, z],
    segments: builder.isFar ? 8 : 16,
  });
  builder.box("metal", iron, [0.42, 0.12, 0.26], [x, 0.51, z]);
  builder.box("metal", iron, [0.24, 0.14, 0.16], [x, 0.63, z]);
  builder.box(
    "metal",
    iron,
    [0.5, 0.08, 0.24],
    [x - 0.02, anvilFace - 0.04, z],
  );
  /* The beak, a cone sticking out of one end */
  builder.cylinder("metal", iron, {
    radius: 0.11,
    radiusEnd: 0.01,
    length: 0.34,
    at: [x - 0.43, anvilFace - 0.06, z],
    axis: "x",
    segments: builder.isFar ? 6 : 12,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", shade(timber, 1.25), {
    radius: 0.3,
    length: 0.01,
    at: [x, 0.455, z],
    segments: 16,
  });
  builder.torus(
    "matte",
    shade(timber, 0.85),
    0.18,
    0.012,
    [x, 0.461, z],
    "y",
    14,
  );
  /* A glowing horseshoe being shaped on the anvil */
  builder.add(
    "glow",
    hotIron,
    new TorusGeometry(0.1, 0.022, 5, builder.segments(12), Math.PI * 1.3),
    {
      at: [x + 0.04, anvilFace + 0.02, z],
      rotation: [-Math.PI / 2, 0, Math.PI * 0.85],
    },
  );
  /* Tongs resting against the stump */
  builder.bar(
    "metal",
    ironLight,
    [x + 0.3, 0.02, z + 0.25],
    [x + 0.18, 0.75, z + 0.12],
    0.025,
    4,
  );
  builder.bar(
    "metal",
    ironLight,
    [x + 0.36, 0.02, z + 0.2],
    [x + 0.2, 0.75, z + 0.1],
    0.025,
    4,
  );
};

/** A helve hammer's frame, where the hammer swings on its axle. */
const buildHammerFrame = (builder: AttractionBuilder) => {
  const [x, y, z] = hammerPivot;
  [-0.18, 0.18].forEach((side) => {
    builder.box(
      "matte",
      timberDark,
      [0.14, y + 0.15, 0.12],
      [x, (y + 0.15) / 2, z + side],
    );
  });
  builder.box("matte", timberDark, [0.5, 0.12, 0.52], [x, 0.06, z]);
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", iron, {
    radius: 0.04,
    length: 0.5,
    at: [x, y, z],
    axis: "z",
    segments: 8,
  });
  /* A foot treadle and its cord, to work the hammer */
  builder.box(
    "matte",
    timber,
    [0.6, 0.05, 0.14],
    [x + 0.35, 0.12, z + 0.32],
    [0, 0, 0.12],
  );
  builder.bar(
    "matte",
    "#c9a86a",
    [x + 0.6, 0.15, z + 0.32],
    [x + 0.3, y - 0.05, z + 0.12],
    0.015,
    4,
  );
};

/** The hammer: raised, then thumping down on the horseshoe. */
const buildHammer = (builder: AttractionBuilder) => {
  const rest = 0.32;
  const reach = hammerPivot[0] - anvilAt.x;
  const headX = -reach * Math.cos(rest);
  const headY = reach * Math.sin(rest);
  builder.bar("matte", timber, [0.15, 0, 0], [headX, headY, 0], 0.07, 6);
  builder.box(
    "metal",
    ironLight,
    [0.16, 0.24, 0.16],
    [headX, headY - 0.05, 0],
    [0, 0, -rest],
  );
  builder.box(
    "metal",
    iron,
    [0.2, 0.04, 0.2],
    [headX + 0.03, headY - 0.17, 0],
    [0, 0, -rest],
  );
  builder.box("metal", iron, [0.12, 0.08, 0.12], [0.2, 0, 0]);
};

/** A shower of sparks as the hammer strikes. */
const buildSparks = (builder: AttractionBuilder) => {
  for (let spark = 0; spark < 12; spark++) {
    const angle = spark * 2.4;
    const out = 0.12 + (spark % 4) * 0.08;
    builder.box(
      "glow",
      spark % 2 === 0 ? emberCore : ember,
      [0.025, 0.025, 0.025],
      [
        Math.sin(angle) * out,
        0.05 + (spark % 3) * 0.07 + out * 0.4,
        Math.cos(angle) * out,
      ],
    );
  }
};

/** Flames dancing over the coals. */
const buildFlames = (builder: AttractionBuilder) => {
  [
    [0, 0, 0.22, 0.42],
    [-0.18, 0.06, 0.15, 0.3],
    [0.17, -0.04, 0.16, 0.32],
    [0.05, 0.12, 0.12, 0.25],
  ].forEach(([x, z, radius, height], index) => {
    builder.cylinder("glow", index === 0 ? ember : emberCore, {
      radius,
      radiusEnd: 0.0,
      length: height,
      at: [x, height / 2, z],
      segments: 8,
    });
  });
};

const buildTub = (builder: AttractionBuilder) => {
  const { x, z } = tubAt;
  builder.cylinder("matte", timber, {
    radius: 0.36,
    radiusEnd: 0.4,
    length: 0.6,
    at: [x, 0.3, z],
    segments: builder.isFar ? 8 : 18,
  });
  builder.cylinder("water", tubWater, {
    radius: 0.36,
    length: 0.02,
    at: [x, 0.58, z],
    segments: builder.isFar ? 8 : 18,
  });
  if (builder.isFar) {
    return;
  }
  [0.12, 0.48].forEach((height) => {
    builder.torus(
      "metal",
      iron,
      0.37 + height * 0.06,
      0.02,
      [x, height, z],
      "y",
      18,
    );
  });
  /* A rod of iron cooling in the water */
  builder.bar(
    "metal",
    iron,
    [x - 0.1, 0.4, z],
    [x + 0.25, 0.9, z - 0.2],
    0.03,
    5,
  );
};

const buildToolRack = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const rackZ = shed.minZ + 0.32;
  builder.box("matte", timberDark, [1.6, 0.1, 0.06], [1.0, 1.75, rackZ]);
  builder.box("matte", timberDark, [1.6, 0.1, 0.06], [1.0, 1.15, rackZ]);
  /* Horseshoes hung on pegs */
  [0.35, 0.7, 1.05].forEach((x, index) => {
    builder.add(
      "metal",
      index === 1 ? ironLight : iron,
      new TorusGeometry(0.09, 0.02, 4, builder.segments(10), Math.PI * 1.3),
      {
        at: [x, 1.6, rackZ + 0.05],
        rotation: [0, 0, -Math.PI * 0.15 + Math.PI],
      },
    );
  });
  /* Tongs, a hammer and a file hanging below */
  [1.35, 1.5].forEach((x, index) => {
    builder.bar(
      "metal",
      ironLight,
      [x, 1.72, rackZ + 0.05],
      [x + (index === 0 ? 0.06 : -0.06), 1.1, rackZ + 0.05],
      0.025,
      4,
    );
  });
  builder.bar(
    "matte",
    timber,
    [1.7, 1.2, rackZ + 0.05],
    [1.7, 1.72, rackZ + 0.05],
    0.04,
    5,
  );
  builder.box("metal", iron, [0.16, 0.08, 0.08], [1.7, 1.72, rackZ + 0.06]);
  builder.box("metal", ironLight, [0.03, 0.4, 0.02], [0.2, 1.3, rackZ + 0.05]);
  /* A sack of coal and a heap of it by the fire */
  builder.roundedBox(
    "matte",
    "#3a3330",
    [0.45, 0.55, 0.35],
    0.12,
    [-1.95, 0.3, 0.75],
    [0, 0.4, 0],
  );
  builder.sphere("matte", coal, 0.35, [-1.5, 0.05, 0.25], [1.2, 0.5, 1], 10);
  /* A stack of iron bars by the right-hand post */
  for (let bar = 0; bar < 5; bar++) {
    builder.box(
      "metal",
      bar % 2 === 0 ? iron : ironLight,
      [0.06, 0.06, 1.1],
      [2.45 + (bar % 3) * 0.08, 0.04 + Math.floor(bar / 3) * 0.07, -0.6],
    );
  }
  /* A grindstone on its frame outside */
  const stoneAt: Triple = [2.6, 0.55, 0.6];
  builder.cylinder("matte", "#a39a8d", {
    radius: 0.35,
    length: 0.12,
    at: stoneAt,
    axis: "x",
    segments: 18,
  });
  [-0.12, 0.12].forEach((side) => {
    builder.bar(
      "matte",
      timberDark,
      [stoneAt[0] + side, 0, stoneAt[2] - 0.25],
      [stoneAt[0] + side, stoneAt[1], stoneAt[2]],
      0.06,
      4,
    );
    builder.bar(
      "matte",
      timberDark,
      [stoneAt[0] + side, 0, stoneAt[2] + 0.25],
      [stoneAt[0] + side, stoneAt[1], stoneAt[2]],
      0.06,
      4,
    );
  });
  builder.bar(
    "metal",
    iron,
    [stoneAt[0] - 0.3, stoneAt[1], stoneAt[2]],
    [stoneAt[0] + 0.3, stoneAt[1], stoneAt[2]],
    0.04,
    5,
  );
  builder.bar(
    "metal",
    iron,
    [stoneAt[0] + 0.3, stoneAt[1], stoneAt[2]],
    [stoneAt[0] + 0.3, stoneAt[1] - 0.2, stoneAt[2]],
    0.03,
    4,
  );
};

/** A workbench with a vice, a finished sword and shield, firewood and a bucket. */
const buildWorkshopExtras = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* Stones picked out in the walls' faces */
  for (let stone = 0; stone < 16; stone++) {
    const x = shed.minX + 0.5 + ((stone * 0.83) % (shedWidth - 0.8));
    const y = 0.3 + ((stone * 0.57) % 1.7);
    if (Math.abs(x - hearthAt.x) < 0.75 && y < 2.1) {
      continue;
    }
    builder.box(
      "matte",
      stone % 2 === 0 ? wallStoneDark : shade(wallStone, 1.12),
      [0.3 + (stone % 3) * 0.06, 0.18, 0.04],
      [x, y, shed.minZ + 0.31],
    );
  }
  /* The workbench along the right-hand side */
  const bench = { x: 1.55, z: -0.75 };
  builder.box(
    "matte",
    shade(timber, 1.15),
    [0.6, 0.08, 1.1],
    [bench.x, 0.86, bench.z],
  );
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "matte",
        timberDark,
        [0.07, 0.82, 0.07],
        [bench.x + sideX * 0.24, 0.41, bench.z + sideZ * 0.48],
      );
    });
  });
  builder.box("matte", timberDark, [0.5, 0.05, 1.0], [bench.x, 0.25, bench.z]);
  /* A vice clamped to the bench */
  builder.box(
    "metal",
    iron,
    [0.14, 0.16, 0.2],
    [bench.x - 0.2, 0.98, bench.z + 0.35],
  );
  builder.box(
    "metal",
    ironLight,
    [0.14, 0.14, 0.05],
    [bench.x - 0.2, 0.98, bench.z + 0.48],
  );
  builder.bar(
    "metal",
    ironLight,
    [bench.x - 0.32, 0.95, bench.z + 0.52],
    [bench.x - 0.08, 0.95, bench.z + 0.52],
    0.02,
    4,
  );
  /* A newly made sword lying on the bench, its hilt bound in leather */
  builder.box(
    "metal",
    "#c8d0d6",
    [0.06, 0.015, 0.62],
    [bench.x + 0.05, 0.91, bench.z - 0.1],
  );
  builder.box(
    "metal",
    palette.brass,
    [0.2, 0.03, 0.04],
    [bench.x + 0.05, 0.92, bench.z + 0.23],
  );
  builder.cylinder("matte", leather, {
    radius: 0.025,
    length: 0.16,
    at: [bench.x + 0.05, 0.92, bench.z + 0.33],
    axis: "z",
    segments: 6,
  });
  builder.sphere(
    "metal",
    palette.brass,
    0.035,
    [bench.x + 0.05, 0.92, bench.z + 0.43],
    [1, 1, 1],
    6,
  );
  /* A round Viking shield hung on the back wall */
  const shieldAt: Triple = [-0.1, 1.45, shed.minZ + 0.33];
  builder.cylinder("paint", "#b8332a", {
    radius: 0.36,
    length: 0.04,
    at: shieldAt,
    axis: "z",
    segments: 20,
  });
  builder.box("paint", "#f0e2b8", [0.1, 0.7, 0.045], shieldAt);
  builder.box("paint", "#f0e2b8", [0.7, 0.1, 0.045], shieldAt);
  builder.torus("metal", iron, 0.36, 0.025, shieldAt, "z", 20);
  builder.sphere(
    "metal",
    ironLight,
    0.08,
    [shieldAt[0], shieldAt[1], shieldAt[2] + 0.03],
    [1, 1, 0.6],
    8,
  );
  /* A stack of firewood against the left wall, outside */
  for (let log = 0; log < 9; log++) {
    const row = Math.floor(log / 4);
    const along = (log % 4) * 0.24 + row * 0.12;
    builder.cylinder("matte", log % 2 === 0 ? "#8a6240" : "#a07850", {
      radius: 0.11,
      length: 0.7,
      at: [shed.minX - 0.25, 0.11 + row * 0.2, -1.2 + along],
      axis: "x",
      segments: 8,
    });
  }
  /* A bucket of water and a lantern on the post */
  builder.cylinder("metal", ironLight, {
    radius: 0.17,
    radiusEnd: 0.2,
    length: 0.3,
    at: [0.95, 0.15, 1.15],
    segments: 14,
  });
  builder.cylinder("water", tubWater, {
    radius: 0.18,
    length: 0.01,
    at: [0.95, 0.27, 1.15],
    segments: 14,
  });
  builder.torus("metal", iron, 0.17, 0.012, [0.95, 0.38, 1.15], "x", 10);
  builder.box(
    "glow",
    palette.warmLight,
    [0.14, 0.2, 0.14],
    [shed.maxX - 0.12, 1.75, shed.maxZ + 0.05],
  );
  builder.cylinder("metal", palette.black, {
    radius: 0.12,
    radiusEnd: 0.02,
    length: 0.1,
    at: [shed.maxX - 0.12, 1.9, shed.maxZ + 0.05],
    segments: 8,
  });
};

export const blacksmithForgeModel: CuriosityModel = {
  kind: "blacksmith-forge",
  islandId: "ember-isle",
  name: "Blacksmith's Forge",
  fact: "A blacksmith heats iron in a fire until it glows orange and turns soft enough to bend and hammer into shape. Bellows blow air into the fire to make it hotter. Dipping the hot iron in water cools it quickly and makes it hard again. Heating changes the iron's shape for good, and it never turns back by itself.",
  curriculumLink:
    "Science, Year 5: properties and changes of materials. Explain that some changes result in the formation of new materials, and that this kind of change is not usually reversible.",
  footprint: 4.6,
  setting: "inland",
  padColour: ashGround,
  signSpot: { x: -1.6, z: 3.6 },
  build: (builder) => {
    buildShed(builder);
    buildHearth(builder);
    buildBellowsBase(builder);
    buildAnvil(builder);
    buildHammerFrame(builder);
    buildTub(builder);
    buildToolRack(builder);
    buildWorkshopExtras(builder);
    addSignBoard(builder, [-1.6, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "flames",
      pivot: [hearthAt.x, hearthHeight + 0.12, hearthAt.z],
      build: buildFlames,
      motion: { kind: "flicker", period: 0.8 },
    },
    {
      name: "bellows",
      pivot: bellowsHinge,
      build: buildBellowsTop,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 7,
        amplitude: 0.16,
        period: 1.4,
      },
    },
    {
      name: "hammer",
      pivot: hammerPivot,
      build: buildHammer,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 7,
        amplitude: 0.32,
        period: 0.9,
      },
    },
    {
      name: "sparks",
      pivot: [anvilAt.x, anvilFace + 0.02, anvilAt.z],
      build: buildSparks,
      motion: { kind: "wake", reach: 5 },
    },
  ],
  smoke: [
    {
      at: [chimneyAt.x, chimneyTop + 0.4, chimneyAt.z],
      colour: "#8a8580",
      puffs: 6,
      size: 0.22,
      rise: 2.2,
      spread: 0.45,
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: shed.minX + 0.4, z: shed.minZ + 0.3 },
      { x: shed.maxX - 0.2, z: shed.minZ + 0.3 },
      0.35,
      0.5,
    ),
    ...listWallBlockers(
      { x: shed.minX + 0.2, z: shed.minZ + 0.4 },
      { x: shed.minX + 0.2, z: shed.maxZ - 0.9 },
      0.3,
      0.45,
    ),
    { x: hearthAt.x, z: hearthAt.z, radius: 0.7 },
    { x: bellowsHinge[0] - 0.35, z: bellowsHinge[2], radius: 0.35 },
    { x: anvilAt.x, z: anvilAt.z, radius: 0.4 },
    { x: hammerPivot[0], z: hammerPivot[2], radius: 0.3 },
    { x: tubAt.x, z: tubAt.z, radius: 0.42 },
    { x: shed.minX + 0.12, z: shed.maxZ - 0.12, radius: 0.15 },
    { x: shed.maxX - 0.12, z: shed.maxZ - 0.12, radius: 0.15 },
    { x: shed.maxX - 0.12, z: (shed.minZ + shed.maxZ) / 2, radius: 0.15 },
    { x: 2.6, z: 0.6, radius: 0.35 },
    { x: -1.95, z: 0.75, radius: 0.3 },
    { x: 1.55, z: -0.5, radius: 0.35 },
    { x: 1.55, z: -1.0, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Hammer a horseshoe",
    news: "Clang! Clang! Clang! You hammered the glowing iron into a horseshoe and dunked it in the tub with a loud HISSS.",
    tune: [84, 84, 91, 84, 96],
  },
};
