import {
  CircleGeometry,
  CylinderGeometry,
  RingGeometry,
  TorusGeometry,
} from "three";
import {
  addLampPost,
  addSignBoard,
  buildFlatDeck,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addChilli,
  addFarmStand,
  addHowHotBoard,
  addScarecrow,
  addVanePost,
  buildBee,
  buildCrow,
  buildMercury,
  buildScarecrowTop,
  buildTractor,
  buildVaneChilli,
  chilliColours,
  chilliShades,
  trailerSeat,
} from "./chilli-farm-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const footprint = 10;
const track = { radius: 9.05, width: 1.0 };
const boardwalk = { minX: -0.8, maxX: 0.8, minZ: -2.6, maxZ: 5.6 };
const boardwalkHeight = 0.1;
const sprinklerTop = 1.3;

/** Three terraces of raised beds each side, stepping up towards the back. */
const beds = [-1, 1].flatMap((side) =>
  [
    { z: 3.7, height: 0.34 },
    { z: 1.0, height: 0.46 },
    { z: -1.7, height: 0.58 },
  ].map(({ z, height }) => ({ x: side * 3.8, z, height })),
);
const bedWidth = 4.8;
const bedDepth = 1.4;

const tunnel = { minX: -5.0, maxX: -1.4, z: -5.2, radius: 1.2 };
const rack = { minX: 1.8, maxX: 5.4, z: -4.4 };
const standAt: Triple = [3.7, 0, 6.3];
const roasterAt = { x: 6.0, z: 5.15 };
const scarecrowAt: Triple = [-4.1, 0, 6.0];
const boardAt: Triple = [-5.9, 0, 5.2];
const signAt = { x: -2.2, z: 6.6 };

const tractorMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: track.radius,
  count: 1,
  speed: -0.26,
  isFacingAlong: true,
};

/* ------------------------------------------------------------------ */
/* The ground: the track, paths and boardwalk                          */
/* ------------------------------------------------------------------ */

const buildGround = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    chilliColours.track,
    new RingGeometry(
      track.radius - track.width / 2,
      track.radius + track.width / 2,
      builder.segments(48, 24),
    ),
    { at: [0, 0.012, 0], rotation: [-Math.PI / 2, 0, 0] },
  );
  builder.box("matte", chilliColours.track, [1.8, 0.02, 3.2], [0, 0.01, 7.0]);
  builder.box(
    "matte",
    chilliColours.track,
    [12.6, 0.02, 1.5],
    [0, 0.01, -3.15],
  );
  builder.box(
    "paint",
    palette.paleTimber,
    [
      boardwalk.maxX - boardwalk.minX,
      boardwalkHeight,
      boardwalk.maxZ - boardwalk.minZ,
    ],
    [0, boardwalkHeight / 2, (boardwalk.minZ + boardwalk.maxZ) / 2],
  );
  if (!builder.isFar) {
    for (let z = boardwalk.minZ + 0.3; z < boardwalk.maxZ; z += 0.4) {
      builder.box(
        "paint",
        shade(palette.paleTimber, 0.82),
        [1.62, 0.012, 0.03],
        [0, boardwalkHeight + 0.004, z],
      );
    }
    /* An ash-grey kerb round the track's inner edge */
    builder.cylinder("matte", chilliColours.basaltEdge, {
      radius: track.radius - track.width / 2,
      length: 0.1,
      at: [0, 0.05, 0],
      segments: 48,
      isOpen: true,
    });
  }
  /* Lumps of lava rock and pumice round the edges */
  [
    [-7.4, -2.6, 0.45],
    [7.2, -3.2, 0.5],
    [-6.8, 1.6, 0.3],
    [6.9, 2.3, 0.32],
    [-0.4, -7.6, 0.55],
  ].forEach(([x, z, size], index) => {
    if (builder.isFar) {
      return;
    }
    builder.sphere(
      index % 3 === 0 ? "glass" : "matte",
      index % 3 === 0 ? "#141012" : chilliColours.basalt,
      size,
      [x, size * 0.45, z],
      [1.2, 0.8, 1],
      builder.segments(7, 5),
    );
  });
  addLampPost(builder, [-1.1, 0, 5.4]);
  addLampPost(builder, [1.1, 0, 5.4]);
};

/* ------------------------------------------------------------------ */
/* The raised beds and their chilli plants                             */
/* ------------------------------------------------------------------ */

const addPlant = (builder: AttractionBuilder, at: Triple, seed: number) => {
  const [x, y, z] = at;
  builder.cylinder("matte", chilliColours.darkLeaf, {
    radius: 0.03,
    radiusEnd: 0.02,
    length: 0.34,
    at: [x, y + 0.17, z],
    segments: 4,
    isOpen: true,
  });
  builder.sphere(
    "matte",
    seed % 2 === 0 ? chilliColours.leaf : chilliColours.darkLeaf,
    0.3,
    [x, y + 0.48, z],
    [1, 0.78, 1],
    6,
  );
  if (seed % 2 === 1) {
    builder.sphere(
      "matte",
      shade(chilliColours.leaf, 1.15),
      0.18,
      [x + 0.12, y + 0.66, z + 0.06],
      [1, 0.8, 1],
      5,
    );
  }
  [0, 2.1, 4.2].forEach((turn, index) => {
    const angle = turn + seed * 0.9;
    addChilli(
      builder,
      [x + Math.sin(angle) * 0.27, y + 0.5, z + Math.cos(angle) * 0.27],
      chilliShades[(seed + index * 2) % chilliShades.length],
    );
  });
  if (seed % 3 === 0) {
    builder.box(
      "glow",
      chilliColours.flower,
      [0.06, 0.04, 0.06],
      [x - 0.12, y + 0.62, z + 0.14],
    );
  }
};

const buildBeds = (builder: AttractionBuilder) => {
  beds.forEach(({ x, z, height }, bed) => {
    builder.box(
      "matte",
      chilliColours.basalt,
      [bedWidth, height, bedDepth],
      [x, height / 2, z],
    );
    builder.box(
      "matte",
      chilliColours.basaltEdge,
      [bedWidth + 0.08, 0.06, bedDepth + 0.08],
      [x, height - 0.02, z],
    );
    builder.box(
      "matte",
      chilliColours.soil,
      [bedWidth - 0.2, 0.03, bedDepth - 0.2],
      [x, height + 0.02, z],
    );
    /* A sprinkler riser in the middle of each bed */
    builder.cylinder("metal", palette.steel, {
      radius: 0.03,
      length: sprinklerTop - height,
      at: [x, (sprinklerTop + height) / 2, z],
      segments: 6,
    });
    builder.cylinder("metal", palette.brass, {
      radius: 0.05,
      length: 0.08,
      at: [x, sprinklerTop - 0.02, z],
      segments: 8,
    });
    if (builder.isFar) {
      [-0.35, 0.35].forEach((row) => {
        builder.box(
          "matte",
          chilliColours.leaf,
          [bedWidth - 0.5, 0.5, 0.42],
          [x, height + 0.3, z + row],
        );
        builder.box(
          "paint",
          chilliColours.red,
          [bedWidth - 0.7, 0.12, 0.44],
          [x, height + 0.3, z + row],
        );
      });
      return;
    }
    /* Stone blocks on the front face */
    for (let course = 0; course < 1; course++) {
      for (let block = 0; block < 5; block++) {
        const along = -bedWidth / 2 + (block + 0.5) * (bedWidth / 5);
        builder.box(
          "matte",
          (block + course) % 2 === 0
            ? chilliColours.basaltEdge
            : shade(chilliColours.basalt, 1.2),
          [bedWidth / 5 - 0.06, height - 0.12, 0.03],
          [x + along, height / 2 - 0.04, z + bedDepth / 2 + 0.01],
        );
      }
    }
    [-0.35, 0.35].forEach((row, rowIndex) => {
      [-1.6, 0, 1.6].forEach((along, plant) => {
        addPlant(
          builder,
          [x + along + rowIndex * 0.3 - 0.15, height + 0.03, z + row],
          bed * 6 + rowIndex * 3 + plant,
        );
      });
    });
  });
};

/* ------------------------------------------------------------------ */
/* The polytunnel, the drying rack and the roaster                     */
/* ------------------------------------------------------------------ */

const buildTunnel = (builder: AttractionBuilder) => {
  const { minX, maxX, z, radius } = tunnel;
  const length = maxX - minX;
  const middle = (minX + maxX) / 2;
  const skin = "#e6efe9";
  builder.add(
    "glass",
    skin,
    new CylinderGeometry(
      radius,
      radius,
      length,
      builder.segments(18, 10),
      1,
      true,
      0,
      Math.PI,
    ),
    { at: [middle, 0, z], rotation: [0, 0, Math.PI / 2] },
  );
  builder.add(
    "glass",
    skin,
    new CircleGeometry(radius, builder.segments(18, 10), 0, Math.PI),
    { at: [minX, 0, z], rotation: [0, -Math.PI / 2, 0] },
  );
  builder.add(
    "glass",
    skin,
    new CircleGeometry(radius, builder.segments(18, 10), 0, Math.PI),
    { at: [maxX, 0, z], rotation: [0, Math.PI / 2, 0] },
  );
  const hoops = builder.isFar ? 2 : 5;
  for (let hoop = 0; hoop < hoops; hoop++) {
    builder.add(
      "metal",
      palette.steel,
      new TorusGeometry(
        radius + 0.01,
        0.03,
        3,
        builder.segments(10, 6),
        Math.PI,
      ),
      {
        at: [minX + (hoop / (hoops - 1)) * length, 0, z],
        rotation: [0, Math.PI / 2, 0],
      },
    );
  }
  /* The door at the end facing the path */
  builder.box(
    "paint",
    palette.darkTimber,
    [0.04, 1.3, 0.75],
    [maxX + 0.03, 0.65, z],
  );
  builder.box(
    "paint",
    chilliColours.green,
    [0.06, 0.08, 0.9],
    [maxX + 0.04, 1.32, z],
  );
  if (builder.isFar) {
    return;
  }
  [-0.43, 0.43].forEach((side) => {
    builder.box(
      "paint",
      chilliColours.green,
      [0.06, 1.3, 0.07],
      [maxX + 0.04, 0.65, z + side],
    );
  });
  builder.box(
    "matte",
    chilliColours.soil,
    [length - 0.3, 0.05, 0.8],
    [middle, 0.03, z - 0.45],
  );
  [-4.5, -3.6, -2.7, -1.9].forEach((x, plant) => {
    addPlant(builder, [x, 0.05, z - 0.45], plant * 5 + 1);
  });
  /* A water butt by the door */
  builder.cylinder("paint", "#2f5d3a", {
    radius: 0.3,
    length: 0.8,
    at: [maxX + 0.45, 0.4, z + 0.85],
    segments: 14,
  });
  builder.cylinder("water", palette.water, {
    radius: 0.26,
    length: 0.02,
    at: [maxX + 0.45, 0.79, z + 0.85],
    segments: 14,
  });
};

const buildRack = (builder: AttractionBuilder) => {
  const { minX, maxX, z } = rack;
  [minX, maxX].forEach((x) => {
    [-0.3, 0.3].forEach((dz) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.12, 2.2, 0.12],
        [x, 1.1, z + dz],
      );
    });
  });
  builder.box(
    "matte",
    palette.timber,
    [maxX - minX + 0.3, 0.1, 0.1],
    [(minX + maxX) / 2, 2.0, z],
  );
  builder.box("matte", palette.timber, [0.1, 0.1, 0.7], [minX, 2.15, z]);
  builder.box("matte", palette.timber, [0.1, 0.1, 0.7], [maxX, 2.15, z]);
  addRackRoof(builder);
  const ristras = 8;
  for (let ristra = 0; ristra < ristras; ristra++) {
    const x = minX + 0.25 + (ristra / (ristras - 1)) * (maxX - minX - 0.5);
    builder.bar(
      "matte",
      chilliColours.straw,
      [x, 2.0, z],
      [x, 0.72, z],
      0.02,
      4,
    );
    if (builder.isFar) {
      builder.cylinder("matte", chilliColours.deepRed, {
        radius: 0.1,
        radiusEnd: 0.13,
        length: 1.1,
        at: [x, 1.35, z],
        segments: 6,
      });
      continue;
    }
    for (let chilli = 0; chilli < 7; chilli++) {
      const angle = chilli * 2.3 + ristra;
      addChilli(
        builder,
        [
          x + Math.sin(angle) * 0.07,
          1.9 - chilli * 0.17,
          z + Math.cos(angle) * 0.07,
        ],
        chilli % 3 === 0 ? chilliColours.deepRed : chilliColours.red,
        0.22,
      );
    }
    builder.box("matte", chilliColours.straw, [0.07, 0.07, 0.07], [x, 0.7, z]);
  }
  /* Crates of the day's pick */
  [
    [minX + 0.5, -0.75],
    [minX + 1.15, -0.75],
    [minX + 0.8, -0.75],
  ].forEach(([x, dz], crate) => {
    const y = crate === 2 ? 0.55 : 0.18;
    builder.box("paint", palette.paleTimber, [0.55, 0.34, 0.4], [x, y, z + dz]);
    builder.box(
      "paint",
      chilliShades[crate],
      [0.48, 0.04, 0.33],
      [x, y + 0.16, z + dz],
    );
  });
};

const addRackRoof = (builder: AttractionBuilder) => {
  const { minX, maxX, z } = rack;
  const width = maxX - minX + 0.4;
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      palette.roofTile,
      [width, 0.06, 0.62],
      [(minX + maxX) / 2, 2.38, z + side * 0.27],
      [side * 0.55, 0, 0],
    );
  });
};

const buildRoaster = (builder: AttractionBuilder) => {
  const { x, z } = roasterAt;
  [-0.35, 0.35].forEach((dx) => {
    builder.bar(
      "metal",
      palette.black,
      [x + dx, 0, z - 0.25],
      [x + dx, 0.9, z],
      0.05,
      6,
    );
    builder.bar(
      "metal",
      palette.black,
      [x + dx, 0, z + 0.25],
      [x + dx, 0.9, z],
      0.05,
      6,
    );
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.34,
    length: 0.8,
    at: [x, 1.0, z],
    axis: "x",
    segments: 16,
  });
  builder.box("metal", palette.black, [0.6, 0.24, 0.5], [x, 0.4, z]);
  builder.box(
    "glow",
    chilliColours.orange,
    [0.4, 0.1, 0.02],
    [x, 0.4, z + 0.26],
  );
  if (builder.isFar) {
    return;
  }
  [-0.25, 0, 0.25].forEach((dx) => {
    builder.cylinder("metal", palette.black, {
      radius: 0.345,
      length: 0.03,
      at: [x + dx, 1.0, z],
      axis: "x",
      segments: 16,
      isOpen: true,
    });
  });
  builder.bar(
    "metal",
    palette.steel,
    [x + 0.4, 1.0, z],
    [x + 0.62, 1.0, z],
    0.04,
    6,
  );
  builder.bar(
    "metal",
    palette.steel,
    [x + 0.62, 1.0, z],
    [x + 0.62, 1.2, z + 0.1],
    0.04,
    6,
  );
};

const buildFarm = (builder: AttractionBuilder) => {
  buildGround(builder);
  buildBeds(builder);
  buildTunnel(builder);
  buildRack(builder);
  buildRoaster(builder);
  addFarmStand(builder, standAt);
  addVanePost(builder, [standAt[0], 2.12, standAt[2] - 0.1]);
  addScarecrow(builder, scarecrowAt);
  addHowHotBoard(builder, boardAt);
  addSignBoard(builder, [signAt.x, 0, signAt.z], chilliColours.sign);
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

const buildSprays = (builder: AttractionBuilder) => {
  beds.forEach(({ x, z }) => {
    builder.cylinder("water", "#bfe4f2", {
      radius: 0.04,
      radiusEnd: 0.55,
      length: 0.45,
      at: [x, 0.22, z],
      segments: builder.segments(12, 6),
      isOpen: true,
    });
    if (builder.isFar) {
      return;
    }
    [0, 2.1, 4.2].forEach((angle) => {
      builder.sphere(
        "water",
        "#d8f0f8",
        0.05,
        [x + Math.sin(angle) * 0.62, 0.42, z + Math.cos(angle) * 0.62],
        [1, 1.3, 1],
        4,
      );
    });
  });
};

const rideStart = { x: 1.3, z: 7.7 };
const rideFinish = { x: -0.9, z: 8.1 };

const tractorRide = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(tractorMotion, seconds);
  const [x, y, z] = moveWithPose([0, 0, 0], trailerSeat, pose);
  const share = Math.min(1, progress / 0.08, (1 - progress) / 0.08);
  const ground = progress < 0.5 ? rideStart : rideFinish;
  const hop = 0.7 * Math.sin(Math.PI * share);
  return {
    x: ground.x + (x - ground.x) * share,
    y: y * share + (share < 1 ? hop : 0),
    z: ground.z + (z - ground.z) * share,
    heading: pose.rotation[1],
  };
};

export const chilliFarmModel: NewLandAttractionModel = {
  kind: "chilli-farm",
  islandId: "ember-isle",
  name: "Chilli Farm",
  fact: "A chilli is really a fruit! Bees carry pollen from flower to flower, and once a chilli flower has been pollinated it grows into a fruit packed with seeds, each of which can grow into a new chilli plant. The fiery heat comes from a chemical called capsaicin, found mostly in the pale pith round the seeds.",
  curriculumLink:
    "Science, Year 5: living things and their habitats. Describe the life process of reproduction in some plants: pollinated flowers grow into fruits full of seeds.",
  footprint,
  setting: "inland",
  padColour: chilliColours.ash,
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: buildFarm,
  moving: [
    {
      name: "tractor",
      pivot: [0, 0, 0],
      build: buildTractor,
      motion: tractorMotion,
    },
    {
      name: "sprinklers",
      pivot: [0, sprinklerTop, 0],
      build: buildSprays,
      motion: { kind: "splash", reach: 6, period: 1.4 },
    },
    {
      name: "scarecrow",
      pivot: [scarecrowAt[0], 1.62, scarecrowAt[2]],
      build: buildScarecrowTop,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 4.5,
        amplitude: 0.35,
        period: 0.9,
      },
    },
    {
      name: "chilli weathervane",
      pivot: [standAt[0], 2.62, standAt[2] - 0.1],
      build: buildVaneChilli,
      motion: { kind: "whirl", axis: "y", idle: 0.4, speed: 6, reach: 5 },
    },
    {
      name: "how hot",
      pivot: [boardAt[0] - 0.12, 0.95, boardAt[2] + 0.09],
      build: buildMercury,
      motion: { kind: "rise", reach: 4.5, height: 1.05, period: 1.6 },
    },
  ],
  wanderers: [
    {
      name: "bees",
      build: buildBee,
      count: 5,
      centre: { x: 0, z: 1.0 },
      radius: 5,
      speed: 0.9,
      height: 1.1,
      bob: 0.15,
    },
    {
      name: "crows",
      build: buildCrow,
      count: 3,
      centre: { x: -2, z: 1 },
      radius: 6,
      speed: 1.6,
      height: 3.2,
      bob: 0.3,
    },
  ],
  smoke: [
    {
      at: [roasterAt.x, 1.4, roasterAt.z],
      colour: "#8a8079",
      puffs: 6,
      size: 0.3,
      rise: 2.2,
      spread: 0.4,
    },
  ],
  decks: [buildFlatDeck(boardwalk, boardwalkHeight)],
  rides: [
    {
      id: "tractor",
      name: "the tractor trailer",
      start: rideStart,
      reach: 0.6,
      seconds: 24,
      finish: rideFinish,
      follow: tractorRide,
    },
  ],
  play: {
    label: "Pick a chilli",
    news: "Crunch! You picked a shiny red chilli and peeked inside: it was packed with pale seeds, each one ready to grow into a brand-new chilli plant.",
    tune: [67, 71, 74, 79],
  },
};
