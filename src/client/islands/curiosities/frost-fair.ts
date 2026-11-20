import { BoxGeometry, CylinderGeometry } from "three";
import {
  addLampPost,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snow = "#f4f8fb";
const snowShadow = "#d9e3ea";
const riverIce = "#bfdcea";
const iceCrack = "#e8f4f9";
const stallTimber = "#7a4e2e";
const stallPale = "#c99a68";
const canvasCream = "#f3ead6";
const gingerbread = "#b8743a";
const icing = "#fbf6ee";
const inkBlack = "#24262a";
const paperCream = "#f2e8cf";
const lanternColours = ["#ffcf6a", "#ff8a6a", "#ffe9a0", "#ff9ec0"];
const boatBlue = "#3a5a80";
const signColour = "#7a2e2a";

/* The frozen river runs across the fair, from bank to bank */
const river = { x: 0, z: 0.2, radiusX: 4.5, radiusZ: 2.0, height: 0.05 };

interface Stall {
  x: number;
  z: number;
  turn: number;
  stripe: string;
}
const gingerStall: Stall = { x: -2.7, z: -3.0, turn: 0.35, stripe: "#c8323a" };
const pressStall: Stall = { x: 0.3, z: -3.4, turn: 0, stripe: "#2f5a9a" };
const chestnutStall: Stall = { x: 3.0, z: -2.8, turn: -0.4, stripe: "#3f8a4f" };
const stallWidth = 1.7;
const stallDepth = 0.9;
const halfStall = stallWidth / 2;
const lane = { fromX: -3.6, toX: -0.9, z: 1.15, width: 0.62 };
const boatAt: Triple = [2.5, river.height, 0.9];
const signAt: Triple = [2.0, 0, 4.6];

/** Turns a point in a stall's own frame (+z to the front) to the fair's. */
const stallPlace =
  (stall: Stall) =>
  (x: number, y: number, z: number): Triple => [
    stall.x + x * Math.cos(stall.turn) + z * Math.sin(stall.turn),
    y,
    stall.z - x * Math.sin(stall.turn) + z * Math.cos(stall.turn),
  ];

const bellAt: Triple = stallPlace(gingerStall)(
  stallWidth / 2 + 0.05,
  1.85,
  stallDepth / 2 + 0.22,
);
const pinwheelAt: Triple = stallPlace(chestnutStall)(
  -stallWidth / 2 - 0.02,
  2.15,
  stallDepth / 2 + 0.2,
);
const brazierAt: Triple = stallPlace(chestnutStall)(
  0.35,
  0,
  stallDepth / 2 + 0.55,
);

/** A market stall: posts, a counter hung with cloth, and a striped canopy. */
const buildStall = (builder: AttractionBuilder, stall: Stall) => {
  const place = stallPlace(stall);
  const rotation: Triple = [0, stall.turn, 0];
  const halfWidth = stallWidth / 2;
  const halfDepth = stallDepth / 2;
  builder.box(
    "matte",
    stallTimber,
    [stallWidth, 0.85, 0.4],
    place(0, 0.425, halfDepth - 0.2),
    rotation,
  );
  builder.box(
    "matte",
    stallPale,
    [stallWidth, 1.6, 0.06],
    place(0, 0.8, -halfDepth),
    rotation,
  );
  /* The canopy slopes down to the front, in stripes */
  const tilt = 0.32;
  const canopyDepth = stallDepth + 0.5;
  const stripes = builder.isFar ? 1 : 7;
  for (let stripe = 0; stripe < stripes; stripe++) {
    const across =
      -halfWidth - 0.1 + ((stripe + 0.5) * (stallWidth + 0.2)) / stripes;
    builder.add(
      "matte",
      builder.isFar || stripe % 2 === 0 ? stall.stripe : canvasCream,
      new BoxGeometry((stallWidth + 0.2) / stripes, 0.04, canopyDepth)
        .rotateX(tilt)
        .rotateY(stall.turn),
      { at: place(across, 2.05, 0.2) },
      undefined,
    );
  }
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    [-halfDepth, halfDepth + 0.25].forEach((depth) => {
      builder.box(
        "matte",
        stallTimber,
        [0.08, depth > 0 ? 1.82 : 2.25, 0.08],
        place(side * halfWidth, depth > 0 ? 0.91 : 1.12, depth),
        rotation,
      );
    });
  });
  /* A scalloped valance along the canopy's front edge */
  const edgeZ = 0.2 + (Math.cos(tilt) * canopyDepth) / 2;
  const edgeY = 2.05 - (Math.sin(tilt) * canopyDepth) / 2;
  for (let scallop = 0; scallop < 8; scallop++) {
    const across =
      -halfWidth - 0.1 + ((scallop + 0.5) * (stallWidth + 0.2)) / 8;
    builder.add(
      "matte",
      scallop % 2 === 0 ? stall.stripe : canvasCream,
      new CylinderGeometry(0.12, 0.12, 0.02, 8, 1, false, Math.PI / 2, Math.PI)
        .rotateX(Math.PI / 2)
        .rotateY(stall.turn),
      { at: place(across, edgeY - 0.01, edgeZ) },
    );
  }
  /* A cloth over the counter and a board along the top */
  builder.box(
    "matte",
    stall.stripe,
    [stallWidth + 0.04, 0.32, 0.02],
    place(0, 0.62, halfDepth + 0.01),
    rotation,
  );
  builder.box(
    "matte",
    stallPale,
    [stallWidth + 0.1, 0.05, 0.5],
    place(0, 0.875, halfDepth - 0.18),
    rotation,
  );
  builder.box(
    "paint",
    palette.cream,
    [0.9, 0.2, 0.03],
    place(0, 2.36, -halfDepth + 0.05),
    rotation,
  );
  builder.box(
    "paint",
    stall.stripe,
    [0.7, 0.05, 0.01],
    place(0, 2.36, -halfDepth + 0.07),
    rotation,
  );
};

/** A gingerbread man, lying on a tray, iced with buttons. */
const addGingerbreadMan = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
) => {
  const rotation: Triple = [0, turn, 0];
  const along = (forward: number): Triple => [
    at[0] + Math.sin(turn) * forward,
    at[1],
    at[2] + Math.cos(turn) * forward,
  ];
  builder.box("matte", gingerbread, [0.08, 0.02, 0.1], along(0), rotation);
  builder.cylinder("matte", gingerbread, {
    radius: 0.04,
    length: 0.02,
    at: along(-0.08),
    segments: 8,
  });
  builder.box(
    "matte",
    gingerbread,
    [0.18, 0.018, 0.035],
    along(-0.02),
    rotation,
  );
  builder.box(
    "matte",
    gingerbread,
    [0.035, 0.018, 0.08],
    [
      along(0.08)[0] + Math.cos(turn) * 0.03,
      at[1],
      along(0.08)[2] - Math.sin(turn) * 0.03,
    ],
    [0, turn - 0.25, 0],
  );
  builder.box(
    "matte",
    gingerbread,
    [0.035, 0.018, 0.08],
    [
      along(0.08)[0] - Math.cos(turn) * 0.03,
      at[1],
      along(0.08)[2] + Math.sin(turn) * 0.03,
    ],
    [0, turn + 0.25, 0],
  );
  builder.box("matte", icing, [0.015, 0.024, 0.015], along(0.0), rotation);
  builder.box("matte", icing, [0.06, 0.024, 0.01], along(-0.06), rotation);
};

const buildGingerStall = (builder: AttractionBuilder) => {
  buildStall(builder, gingerStall);
  if (builder.isFar) {
    return;
  }
  const place = stallPlace(gingerStall);
  const counterY = 0.905;
  builder.box(
    "metal",
    palette.steel,
    [0.9, 0.02, 0.36],
    place(-0.15, counterY, stallDepth / 2 - 0.15),
    [0, gingerStall.turn, 0],
  );
  for (let man = 0; man < 6; man++) {
    addGingerbreadMan(
      builder,
      place(
        -0.5 + (man % 3) * 0.24,
        counterY + 0.02,
        stallDepth / 2 - 0.25 + Math.floor(man / 3) * 0.17,
      ),
      gingerStall.turn + Math.PI,
    );
  }
  /* Strings of gingerbread hearts hanging from the canopy */
  for (let heart = 0; heart < 4; heart++) {
    const at = place(-0.6 + heart * 0.4, 1.55, stallDepth / 2 + 0.24);
    builder.bar("matte", palette.cream, [at[0], 1.85, at[2]], at, 0.01, 3);
    builder.sphere(
      "matte",
      gingerbread,
      0.07,
      [at[0], at[1] - 0.05, at[2]],
      [1, 1, 0.3],
      8,
    );
    builder.box(
      "matte",
      "#c8323a",
      [0.05, 0.012, 0.01],
      [at[0], at[1] - 0.05, at[2] + 0.025],
      [0, gingerStall.turn, 0],
    );
  }
  builder.box(
    "matte",
    palette.thatch,
    [0.4, 0.2, 0.3],
    place(0.55, counterY + 0.1, stallDepth / 2 - 0.2),
    [0, gingerStall.turn, 0],
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    place(halfStall, 1.95, stallDepth / 2 + 0.25),
    bellAt,
    0.03,
    5,
  );
};

/** A wooden printing press, which printed souvenir cards on the ice. */
const buildPressStall = (builder: AttractionBuilder) => {
  buildStall(builder, pressStall);
  if (builder.isFar) {
    return;
  }
  const place = stallPlace(pressStall);
  const rotation: Triple = [0, pressStall.turn, 0];
  const press = { x: -0.35, z: -0.05 };
  [-0.22, 0.22].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.1, 1.55, 0.12],
      place(press.x + side, 0.775, press.z),
      rotation,
    );
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [0.6, 0.14, 0.16],
    place(press.x, 1.6, press.z),
    rotation,
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.6, 0.1, 0.16],
    place(press.x, 0.95, press.z),
    rotation,
  );
  builder.cylinder("metal", palette.brass, {
    radius: 0.045,
    length: 0.3,
    at: place(press.x, 1.4, press.z),
    segments: 10,
  });
  builder.box(
    "matte",
    stallPale,
    [0.36, 0.06, 0.3],
    place(press.x, 1.22, press.z),
    rotation,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    place(press.x, 1.45, press.z),
    place(press.x + 0.45, 1.45, press.z + 0.3),
    0.03,
    6,
  );
  builder.sphere(
    "matte",
    palette.darkTimber,
    0.04,
    place(press.x + 0.45, 1.45, press.z + 0.3),
    [1, 1, 1],
    6,
  );
  /* The bed running out in front, with a sheet ready to print */
  builder.box(
    "matte",
    palette.timber,
    [0.36, 0.08, 0.7],
    place(press.x, 1.05, press.z + 0.25),
    rotation,
  );
  builder.box(
    "matte",
    paperCream,
    [0.26, 0.01, 0.3],
    place(press.x, 1.095, press.z + 0.42),
    rotation,
  );
  /* Ink balls on the counter, and printed cards pegged up to show */
  [0.25, 0.45].forEach((across) => {
    builder.sphere(
      "matte",
      inkBlack,
      0.07,
      place(across, 0.97, stallDepth / 2 - 0.1),
      [1, 0.7, 1],
      8,
    );
    builder.bar(
      "matte",
      stallPale,
      place(across, 1.0, stallDepth / 2 - 0.1),
      place(across, 1.16, stallDepth / 2 - 0.1),
      0.025,
      4,
    );
  });
  builder.bar(
    "matte",
    palette.cream,
    place(-halfStall, 1.75, stallDepth / 2 + 0.25),
    place(halfStall, 1.75, stallDepth / 2 + 0.25),
    0.012,
    3,
  );
  for (let card = 0; card < 5; card++) {
    const at = place(-0.65 + card * 0.32, 1.62, stallDepth / 2 + 0.25);
    builder.box("paint", paperCream, [0.16, 0.22, 0.01], at, rotation);
    [0.05, 0.0, -0.05].forEach((line) => {
      builder.box(
        "paint",
        inkBlack,
        [0.11 - Math.abs(line) * 0.5, 0.012, 0.012],
        [at[0], at[1] + line, at[2]],
        rotation,
      );
    });
  }
};

const buildChestnutStall = (builder: AttractionBuilder) => {
  buildStall(builder, chestnutStall);
  if (builder.isFar) {
    return;
  }
  const place = stallPlace(chestnutStall);
  const rotation: Triple = [0, chestnutStall.turn, 0];
  /* Mugs of hot punch and a barrel, and the roasting brazier out front */
  for (let mug = 0; mug < 4; mug++) {
    builder.cylinder("paint", mug % 2 === 0 ? "#c8a050" : "#8a8a8a", {
      radius: 0.05,
      length: 0.11,
      at: place(-0.5 + mug * 0.16, 0.96, stallDepth / 2 - 0.1),
      segments: 8,
    });
  }
  builder.cylinder("matte", palette.timber, {
    radius: 0.2,
    radiusEnd: 0.17,
    length: 0.4,
    at: place(0.45, 1.1, -0.05),
    segments: 12,
  });
  builder.cylinder("metal", palette.brass, {
    radius: 0.025,
    length: 0.08,
    at: place(0.45, 1.05, 0.15),
    axis: "z",
    segments: 6,
  });
  const [x, , z] = brazierAt;
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      palette.black,
      [x + Math.sin(angle) * 0.22, 0, z + Math.cos(angle) * 0.22],
      [x + Math.sin(angle) * 0.15, 0.5, z + Math.cos(angle) * 0.15],
      0.03,
      4,
    );
  });
  builder.lathe(
    "metal",
    palette.black,
    [
      [0, 0],
      [0.12, 0.0],
      [0.24, 0.12],
      [0.25, 0.16],
      [0.22, 0.16],
      [0, 0.1],
    ],
    [x, 0.45, z],
    "y",
    14,
  );
  builder.cylinder("glow", "#ff7a2a", {
    radius: 0.2,
    length: 0.04,
    at: [x, 0.58, z],
    segments: 12,
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.16,
    length: 0.04,
    at: [x, 0.64, z],
    segments: 12,
  });
  for (let nut = 0; nut < 7; nut++) {
    builder.sphere(
      "matte",
      "#6b3a1e",
      0.03,
      [x + Math.sin(nut * 2.4) * 0.09, 0.67, z + Math.cos(nut * 2.4) * 0.09],
      [1, 0.8, 1],
      6,
    );
  }
  builder.box(
    "paint",
    palette.cream,
    [0.5, 0.3, 0.03],
    place(-0.4, 1.55, -stallDepth / 2 + 0.06),
    rotation,
  );
};

const buildRiver = (builder: AttractionBuilder) => {
  const segments = builder.segments(44, 14);
  builder.add(
    "matte",
    snowShadow,
    new CylinderGeometry(
      river.radiusX + 0.15,
      river.radiusX + 0.25,
      0.03,
      segments,
    ).scale(1, 1, (river.radiusZ + 0.2) / (river.radiusX + 0.2)),
    { at: [river.x, 0.015, river.z] },
  );
  builder.add(
    "glass",
    riverIce,
    new CylinderGeometry(river.radiusX, river.radiusX, 0.03, segments).scale(
      1,
      1,
      river.radiusZ / river.radiusX,
    ),
    { at: [river.x, river.height - 0.015, river.z] },
  );
  if (builder.isFar) {
    return;
  }
  /* Cracks and skate marks scratched in the ice, and snow blown in drifts */
  [
    [-1.5, -0.6, 1.2, 0.3],
    [0.6, 0.9, 0.9, -0.5],
    [1.4, -0.9, 1.4, 0.15],
    [-0.4, 0.2, 0.7, 1.2],
    [3.4, 0.0, 0.8, 0.9],
  ].forEach(([x, z, length, turn]) => {
    builder.box(
      "matte",
      iceCrack,
      [length, 0.006, 0.02],
      [x, river.height + 0.003, z],
      [0, turn, 0],
    );
    builder.box(
      "matte",
      iceCrack,
      [length * 0.4, 0.006, 0.015],
      [x + length * 0.3, river.height + 0.003, z + 0.1],
      [0, turn + 0.6, 0],
    );
  });
  [
    [-3.9, -0.4, 0.4],
    [3.9, 1.0, 0.35],
    [0.8, 2.0, 0.3],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snow, size, [x, river.height, z], [1.8, 0.3, 1], 8);
  });
};

const buildSkittles = (builder: AttractionBuilder) => {
  const { fromX, toX, z, width } = lane;
  const length = toX - fromX;
  builder.box(
    "matte",
    stallPale,
    [length, 0.04, width],
    [(fromX + toX) / 2, river.height + 0.02, z],
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      stallTimber,
      [length, 0.1, 0.06],
      [(fromX + toX) / 2, river.height + 0.05, z + side * (width / 2 + 0.03)],
    );
  });
  for (let plank = 1; plank < 4; plank++) {
    builder.box(
      "matte",
      shade(stallPale, 0.85),
      [length, 0.042, 0.01],
      [
        (fromX + toX) / 2,
        river.height + 0.02,
        z - width / 2 + plank * (width / 4),
      ],
    );
  }
  /* Nine skittles set in a diamond at the far end */
  const head = fromX + 0.35;
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const along = head + (row + column) * 0.11;
      const across = (row - column) * 0.11;
      builder.lathe(
        "paint",
        (row + column) % 2 === 0 ? palette.white : "#e8d9b0",
        [
          [0, 0],
          [0.035, 0.0],
          [0.05, 0.08],
          [0.03, 0.17],
          [0.035, 0.22],
          [0, 0.25],
        ],
        [along, river.height + 0.04, z + across],
        "y",
        10,
      );
      builder.cylinder("paint", "#c8323a", {
        radius: 0.042,
        length: 0.02,
        at: [along, river.height + 0.16, z + across],
        segments: 10,
      });
    }
  }
  builder.sphere(
    "matte",
    palette.darkTimber,
    0.1,
    [toX - 0.3, river.height + 0.14, z + 0.05],
    [1, 1, 1],
    12,
  );
  builder.sphere(
    "matte",
    palette.darkTimber,
    0.1,
    [toX + 0.15, river.height + 0.1, z + 0.45],
    [1, 1, 1],
    12,
  );
};

/** A rowing boat frozen into the ice, turned into a seat for the fair. */
const buildBoat = (builder: AttractionBuilder) => {
  const [x, y, z] = boatAt;
  builder.lathe(
    "paint",
    boatBlue,
    [
      [0, 0],
      [0.22, 0.02],
      [0.34, 0.15],
      [0.36, 0.3],
      [0, 0.3],
    ],
    [x, y, z],
    "y",
    builder.isFar ? 8 : 18,
  );
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "paint",
    shade(boatBlue, 1.4),
    0.355,
    0.025,
    [x, y + 0.3, z],
    "y",
    18,
  );
  builder.box("matte", stallPale, [0.62, 0.04, 0.14], [x, y + 0.25, z]);
  builder.bar(
    "matte",
    stallPale,
    [x - 0.2, y + 0.3, z + 0.25],
    [x + 0.6, y + 0.15, z + 0.65],
    0.05,
    5,
  );
  builder.box(
    "matte",
    stallPale,
    [0.5, 0.02, 0.12],
    [x + 0.65, y + 0.14, z + 0.7],
    [0, -0.45, 0],
  );
};

const buildLanterns = (builder: AttractionBuilder) => {
  const poles: Triple[] = [
    [-4.1, 0, -1.5],
    [-1.0, 0, -2.25],
    [1.7, 0, -2.25],
    [4.1, 0, -1.4],
  ];
  poles.forEach(([x, , z]) => {
    builder.cylinder("matte", stallTimber, {
      radius: 0.05,
      length: 2.5,
      at: [x, 1.25, z],
      segments: builder.isFar ? 4 : 8,
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Strings of lanterns sagging between the poles */
  poles.slice(0, -1).forEach((pole, index) => {
    const next = poles[index + 1];
    const points = 6;
    let previous: Triple = [pole[0], 2.45, pole[2]];
    for (let point = 1; point <= points; point++) {
      const share = point / points;
      const sag = Math.sin(share * Math.PI) * 0.35;
      const here: Triple = [
        pole[0] + (next[0] - pole[0]) * share,
        2.45 - sag,
        pole[2] + (next[2] - pole[2]) * share,
      ];
      builder.bar("matte", palette.black, previous, here, 0.012, 3);
      if (point < points) {
        builder.sphere(
          "glow",
          lanternColours[(point + index) % lanternColours.length],
          0.07,
          [here[0], here[1] - 0.09, here[2]],
          [1, 1.25, 1],
          8,
        );
      }
      previous = here;
    }
  });
  addLampPost(builder, [-3.4, 0, 2.9], 1.9);
  addLampPost(builder, [3.6, 0, 2.6], 1.9);
};

/** The stall's hand bell, hanging on its bracket to call customers. */
const buildBell = (builder: AttractionBuilder) => {
  builder.bar("metal", palette.darkSteel, [0, 0, 0], [0, -0.08, 0], 0.015, 4);
  builder.lathe(
    "metal",
    palette.brass,
    [
      [0, -0.08],
      [0.04, -0.09],
      [0.06, -0.16],
      [0.09, -0.24],
      [0.095, -0.25],
      [0, -0.25],
    ],
    [0, 0, 0],
    "y",
    16,
  );
  builder.sphere(
    "metal",
    palette.darkSteel,
    0.025,
    [0, -0.26, 0],
    [1, 1, 1],
    6,
  );
};

/** A paper pinwheel on a stick, a toy sold at the fair. */
const buildPinwheel = (builder: AttractionBuilder) => {
  for (let blade = 0; blade < 4; blade++) {
    const angle = (blade / 4) * Math.PI * 2;
    builder.box(
      "paint",
      lanternColours[blade],
      [0.16, 0.07, 0.01],
      [Math.cos(angle) * 0.09, Math.sin(angle) * 0.09, 0],
      [0, 0.3, angle],
    );
  }
  builder.sphere("paint", palette.brass, 0.022, [0, 0, 0.015], [1, 1, 1], 6);
};

const riverDeck: Deck = ({ x, z }) =>
  ((x - river.x) / river.radiusX) ** 2 + ((z - river.z) / river.radiusZ) ** 2 <=
  1
    ? { height: river.height, kind: "ice" }
    : undefined;

/** Blockers for a stall's counter and back. */
const stallBlockers = (stall: Stall): LocalBlocker[] =>
  [-0.5, 0, 0.5].map((across) => {
    const [x, , z] = stallPlace(stall)(across * stallWidth * 0.8, 0, 0);
    return { x, z, radius: 0.5 };
  });

export const frostFairModel: CuriosityModel = {
  kind: "frost-fair",
  islandId: "frost-isle",
  name: "Frost Fair",
  fact: "In the bitter winter of 1683 to 1684, the River Thames in London froze so thick that people held a Frost Fair on the ice. There were stalls selling gingerbread and hot drinks, games of skittles, and a printing press that printed your name on a card to take home. King Charles II came to visit! The Thames has not frozen like that for over 200 years.",
  curriculumLink:
    "History, Key Stage 1: events beyond living memory that are significant nationally or globally, such as the Great Frost Fair on the frozen River Thames in 1683–84.",
  footprint: 5.8,
  setting: "inland",
  padColour: "#e8eef2",
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildRiver(builder);
    buildGingerStall(builder);
    buildPressStall(builder);
    buildChestnutStall(builder);
    buildSkittles(builder);
    buildBoat(builder);
    buildLanterns(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "stall bell",
      pivot: bellAt,
      build: buildBell,
      motion: { kind: "nod", axis: "z", reach: 7, amplitude: 0.5, period: 0.7 },
    },
    {
      name: "pinwheel",
      pivot: pinwheelAt,
      build: buildPinwheel,
      motion: { kind: "whirl", axis: "z", idle: 0.8, speed: 6, reach: 7 },
    },
  ],
  smoke: [
    {
      at: [brazierAt[0], 0.75, brazierAt[2]],
      colour: "#d8d4cc",
      puffs: 4,
      size: 0.1,
      rise: 1.2,
      spread: 0.2,
    },
  ],
  decks: [riverDeck],
  tune: [79, 81, 83, 84, 83, 81, 79, 76],
  blockers: [
    ...stallBlockers(gingerStall),
    ...stallBlockers(pressStall),
    ...stallBlockers(chestnutStall),
    { x: brazierAt[0], z: brazierAt[2], radius: 0.3 },
    { x: boatAt[0], z: boatAt[2], radius: 0.42 },
    { x: -4.1, z: -1.5, radius: 0.15 },
    { x: -1.0, z: -2.25, radius: 0.15 },
    { x: 1.7, z: -2.25, radius: 0.15 },
    { x: 4.1, z: -1.4, radius: 0.15 },
    { x: -3.4, z: 2.9, radius: 0.15 },
    { x: 3.6, z: 2.6, radius: 0.15 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Buy a gingerbread",
    news: "Ding-a-ling! You paid a penny for a gingerbread man, still warm from the stall, and munched it on the ice.",
  },
};
