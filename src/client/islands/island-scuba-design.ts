import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Matrix4,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { buildLoftGeometry, paintFaces } from "./island-lofts.js";
import { buildLiveryGeometry, onBothSides } from "./island-livery.js";

// The Wizzaroo dive locker: a sturdy marine cabinet of deep purple panels in
// a varnished teak frame, trimmed in gold and brass, standing at the end of
// the pier under a little peaked roof that flies the red-and-white dive flag.
// A life ring hangs on one side and a coil of rope on the other. Its two
// porthole doors swing open from their outer edges to show a spare scuba set
// on the rack inside, which vanishes as the Character puts it on. It grows up
// out of the pier deck when the dive begins and shrinks away after.

export const scubaLockerWidth = 0.9;
export const scubaLockerDepth = 0.55;
export const scubaLockerGrowthCentre: Triple = [0, 0, 0];

const halfWidth = scubaLockerWidth / 2;
const halfDepth = scubaLockerDepth / 2;
const plinthTop = 0.07;
const carcassTop = 0.9;
const boardTop = 1.06;
const eaves = 1.09;
const ridge = 1.31;
export const scubaLockerRoofRidge = ridge;
const doorBottom = 0.1;
const doorTop = 0.88;
const doorHeight = doorTop - doorBottom;
const doorWidth = 0.4;
const doorInner = 0.005;
const hingeX = doorInner + doorWidth;
const doorThickness = 0.03;
const doorZ = halfDepth - doorThickness / 2;
const doorSwing = 1.95;

const colours = {
  purple: "#4c1d95",
  purpleDeep: "#3b1675",
  violet: "#6d28d9",
  gold: "#f5c542",
  brass: "#d4a537",
  teak: "#a0612f",
  teakDark: "#7a4520",
  teakLight: "#bf7a3f",
  navy: "#1e1b4b",
  lining: "#4338a0",
  rope: "#d9bf86",
  red: "#dc2626",
  white: "#f8fafc",
  glass: "#2b5f8a",
  rubber: "#111827",
} as const;

const box = (
  width: number,
  height: number,
  depth: number,
  colour: string,
  position: Triple,
  rotation?: Triple,
): ModelPart => ({
  geometry: new BoxGeometry(width, height, depth),
  colour,
  position,
  ...(rotation === undefined ? {} : { rotation }),
});

const rod = (
  radius: number,
  length: number,
  colour: string,
  position: Triple,
  rotation: Triple = [0, 0, 0],
  sides = 8,
): ModelPart => ({
  geometry: new CylinderGeometry(radius, radius, length, sides),
  colour,
  position,
  rotation,
});

// The side panels carry the livery, so they are built on their own for the
// decals to be cast onto.
const sidePanelThickness = 0.04;
const buildSidePanelGeometry = (side: number): BufferGeometry =>
  new BoxGeometry(
    sidePanelThickness,
    boardTop - plinthTop,
    scubaLockerDepth - 0.04,
  ).translate(
    side * (halfWidth - sidePanelThickness / 2),
    (boardTop + plinthTop) / 2,
    0,
  );

const signBoardY = (carcassTop + boardTop) / 2;
const signBoardHeight = boardTop - carcassTop - 0.01;
const buildSignBoardGeometry = (): BufferGeometry =>
  new BoxGeometry(scubaLockerWidth - 0.06, signBoardHeight, 0.035).translate(
    0,
    signBoardY,
    halfDepth - 0.0,
  );

const gableFront = halfDepth + 0.005;
const buildGableGeometry = (): BufferGeometry => {
  const triangle = (z: number): Triple[] => [
    [-halfWidth, eaves, z],
    [0, ridge - 0.02, z],
    [halfWidth, eaves, z],
  ];
  const prism = buildLoftGeometry([triangle(-halfDepth), triangle(gableFront)]);
  return prism;
};

const buildCarcassParts = (): ModelPart[] => {
  const postHeight = boardTop - plinthTop;
  const posts = [-1, 1].flatMap((side) =>
    [-1, 1].map((end) =>
      box(0.055, postHeight, 0.055, colours.teak, [
        side * (halfWidth - 0.025),
        plinthTop + postHeight / 2,
        end * (halfDepth - 0.025),
      ]),
    ),
  );
  const sideTrim = [-1, 1].flatMap((side) =>
    [plinthTop + 0.03, boardTop - 0.035].map((y) =>
      box(0.012, 0.018, scubaLockerDepth - 0.1, colours.gold, [
        side * (halfWidth + 0.002),
        y,
        0,
      ]),
    ),
  );
  return [
    box(
      scubaLockerWidth + 0.06,
      plinthTop,
      scubaLockerDepth + 0.06,
      colours.teakDark,
      [0, plinthTop / 2, 0],
    ),
    box(scubaLockerWidth + 0.07, 0.012, scubaLockerDepth + 0.07, colours.gold, [
      0,
      plinthTop - 0.004,
      0,
    ]),
    box(
      scubaLockerWidth - 0.04,
      carcassTop - plinthTop,
      0.03,
      colours.purpleDeep,
      [0, (carcassTop + plinthTop) / 2, -halfDepth + 0.015],
    ),
    box(
      scubaLockerWidth - 0.1,
      carcassTop - plinthTop - 0.04,
      0.01,
      colours.lining,
      [0, (carcassTop + plinthTop) / 2, -halfDepth + 0.035],
    ),
    box(
      scubaLockerWidth - 0.06,
      0.03,
      scubaLockerDepth - 0.04,
      colours.teakLight,
      [0, plinthTop + 0.015, 0],
    ),
    box(scubaLockerWidth - 0.06, 0.025, scubaLockerDepth - 0.04, colours.navy, [
      0,
      carcassTop - 0.012,
      0,
    ]),
    // the sign board's frame and the cornice above it
    box(scubaLockerWidth - 0.02, 0.022, 0.05, colours.gold, [
      0,
      carcassTop - 0.004,
      halfDepth - 0.005,
    ]),
    box(scubaLockerWidth - 0.02, 0.022, 0.05, colours.gold, [
      0,
      boardTop + 0.003,
      halfDepth - 0.005,
    ]),
    box(
      scubaLockerWidth - 0.06,
      boardTop - carcassTop,
      scubaLockerDepth - 0.06,
      colours.purpleDeep,
      [0, signBoardY, -0.02],
    ),
    box(scubaLockerWidth + 0.06, 0.035, scubaLockerDepth + 0.08, colours.teak, [
      0,
      boardTop + 0.025,
      0,
    ]),
    ...posts,
    ...sideTrim,
    // the gear rack: a teak rail with brass pegs
    box(scubaLockerWidth - 0.12, 0.04, 0.03, colours.teakLight, [
      0,
      0.79,
      -halfDepth + 0.06,
    ]),
    ...[-0.24, 0.02, 0.24].map((x) =>
      rod(
        0.01,
        0.07,
        colours.brass,
        [x, 0.79, -halfDepth + 0.1],
        [Math.PI / 2, 0, 0],
      ),
    ),
  ];
};

const roofSlope = Math.atan2(ridge - eaves, halfWidth + 0.04);
const roofSlant = Math.hypot(ridge - eaves, halfWidth + 0.04);

const buildRoofParts = (): ModelPart[] => [
  ...[-1, 1].flatMap((side): ModelPart[] => [
    box(
      roofSlant + 0.02,
      0.035,
      scubaLockerDepth + 0.12,
      colours.purpleDeep,
      [(side * (halfWidth + 0.04)) / 2, (eaves + ridge) / 2 + 0.02, 0],
      [0, 0, -side * roofSlope],
    ),
    // shingle courses
    ...[0.2, 0.45, 0.7].map((share) =>
      box(0.012, 0.01, scubaLockerDepth + 0.13, colours.violet, [
        side * (halfWidth + 0.04) * share,
        ridge - (ridge - eaves) * share + 0.045,
        0,
      ]),
    ),
    // gold barge boards along the front and back eaves
    ...[-1, 1].map((end) =>
      box(
        roofSlant + 0.03,
        0.03,
        0.02,
        colours.gold,
        [
          (side * (halfWidth + 0.04)) / 2,
          (eaves + ridge) / 2 + 0.005,
          end * (halfDepth + 0.065),
        ],
        [0, 0, -side * roofSlope],
      ),
    ),
  ]),
  rod(
    0.022,
    scubaLockerDepth + 0.16,
    colours.gold,
    [0, ridge + 0.035, 0],
    [Math.PI / 2, 0, 0],
  ),
  ...[-1, 1].map((end): ModelPart => ({
    geometry: new SphereGeometry(0.035, 12, 8),
    colour: colours.gold,
    position: [0, ridge + 0.045, end * (halfDepth + 0.08)],
  })),
];

const flagPole: Triple = [0.3, ridge - 0.08, -0.12];
const flagWidth = 0.26;
const flagHeight = 0.17;
const flagTop = flagPole[1] + 0.42;

const buildFlagParts = (): ModelPart[] => {
  const flagCentre: Triple = [
    flagPole[0] + flagWidth / 2 + 0.012,
    flagTop - flagHeight / 2 - 0.02,
    flagPole[2],
  ];
  return [
    rod(0.012, 0.46, colours.teakDark, [
      flagPole[0],
      flagPole[1] + 0.23,
      flagPole[2],
    ]),
    {
      geometry: new SphereGeometry(0.022, 10, 8),
      colour: colours.gold,
      position: [flagPole[0], flagPole[1] + 0.47, flagPole[2]],
    },
    box(flagWidth, flagHeight, 0.008, colours.red, flagCentre),
    box(
      Math.hypot(flagWidth, flagHeight) - 0.02,
      0.04,
      0.011,
      colours.white,
      flagCentre,
      [0, 0, -Math.atan2(flagHeight, flagWidth)],
    ),
  ];
};

const lifeRingCentre: Triple = [halfWidth + 0.035, 0.27, 0];

const buildSideFittingParts = (): ModelPart[] => [
  // the life ring on the right side, with its grab rope
  {
    geometry: new TorusGeometry(0.105, 0.035, 10, 28),
    colour: colours.white,
    position: lifeRingCentre,
    rotation: [0, Math.PI / 2, 0],
  },
  ...Array.from({ length: 4 }, (_, band): ModelPart => {
    const angle = (band / 4) * Math.PI * 2 + Math.PI / 4;
    return {
      geometry: new TorusGeometry(0.038, 0.012, 6, 12),
      colour: colours.red,
      position: [
        lifeRingCentre[0],
        lifeRingCentre[1] + Math.sin(angle) * 0.105,
        lifeRingCentre[2] + Math.cos(angle) * 0.105,
      ],
      rotation: [-angle, 0, 0],
    };
  }),
  {
    geometry: new TorusGeometry(0.145, 0.007, 4, 32),
    colour: colours.rope,
    position: [lifeRingCentre[0] + 0.004, lifeRingCentre[1], 0],
    rotation: [0, Math.PI / 2, 0],
  },
  rod(
    0.014,
    0.05,
    colours.brass,
    [halfWidth + 0.02, 0.41, 0],
    [0, 0, Math.PI / 2],
  ),
  // a coil of rope on the left side
  ...[0, 1, 2, 3].map((turn): ModelPart => ({
    geometry: new TorusGeometry(0.1 - turn * 0.004, 0.014, 6, 24),
    colour: turn % 2 === 0 ? colours.rope : "#c9a96d",
    position: [-halfWidth - 0.02 - turn * 0.006, 0.27 - turn * 0.012, 0],
    rotation: [0, Math.PI / 2, 0.06 * turn],
  })),
  rod(
    0.014,
    0.05,
    colours.brass,
    [-halfWidth - 0.02, 0.38, 0],
    [0, 0, Math.PI / 2],
  ),
  // rope trim along the plinth
  rod(
    0.013,
    scubaLockerWidth + 0.06,
    colours.rope,
    [0, plinthTop + 0.012, halfDepth + 0.03],
    [0, 0, Math.PI / 2],
    6,
  ),
  ...[-1, 1].map((side) =>
    rod(
      0.013,
      scubaLockerDepth + 0.06,
      colours.rope,
      [side * (halfWidth + 0.03), plinthTop + 0.012, 0],
      [Math.PI / 2, 0, 0],
      6,
    ),
  ),
];

const paintPanel = (colour: string) => {
  const painted = new Color(colour);
  return () => painted;
};

export const buildScubaLockerGeometry = (): BufferGeometry => {
  const gable = paintFaces(buildGableGeometry(), paintPanel(colours.purple));
  gable.computeVertexNormals();
  return mergeGeometries([
    paintFaces(buildSidePanelGeometry(1), paintPanel(colours.purple)),
    paintFaces(buildSidePanelGeometry(-1), paintPanel(colours.purple)),
    paintFaces(buildSignBoardGeometry(), paintPanel(colours.navy)),
    gable,
    buildModelGeometry([
      ...buildCarcassParts(),
      ...buildRoofParts(),
      ...buildFlagParts(),
      ...buildSideFittingParts(),
    ]),
  ]);
};

export const buildScubaLockerLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    {
      surface: buildSignBoardGeometry(),
      decals: [
        {
          face: "name",
          centre: [0, signBoardY, halfDepth + 0.02],
          outward: [0, 0, 1],
          up: [0, 1, 0],
          width: 0.74,
          height: 0.145,
        },
      ],
    },
    {
      surface: buildGableGeometry(),
      decals: [
        {
          face: "flag",
          centre: [0, eaves + 0.07, gableFront],
          outward: [0, 0, 1],
          up: [0, 1, 0],
          width: 0.26,
          height: 0.13,
        },
      ],
    },
    {
      surface: mergeGeometries([
        buildSidePanelGeometry(1),
        buildSidePanelGeometry(-1),
      ]),
      decals: [
        ...onBothSides({
          face: "flag",
          centre: [halfWidth, 0.8, 0],
          outward: [1, 0, 0],
          up: [0, 1, 0],
          width: 0.36,
          height: 0.18,
        }),
        ...onBothSides({
          face: "name",
          centre: [halfWidth, 0.585, 0],
          outward: [1, 0, 0],
          up: [0, 1, 0],
          width: 0.44,
          height: 0.11,
        }),
      ],
    },
  ]);

// Each door is built closed, on its own side of the doorway; `side` -1 is
// the left door, hinged at its outer (left) edge.
const buildDoorGeometry = (side: number): BufferGeometry => {
  const centreX = side * (doorInner + doorWidth / 2);
  const front = halfDepth;
  const handleX = side * (doorInner + 0.045);
  const hingeEdge = side * (hingeX - 0.012);
  const portholeY = doorTop - 0.17;
  const panelY = doorBottom + 0.2;
  const panelInset = 0.29;
  const louvres = Array.from({ length: 5 }, (_, slat) =>
    box(
      doorWidth - 0.12,
      0.022,
      0.016,
      colours.teakLight,
      [centreX, doorBottom + 0.39 + slat * 0.035, front + 0.002],
      [-0.5, 0, 0],
    ),
  );
  const panelBeading = [
    box(panelInset + 0.02, 0.014, 0.01, colours.gold, [
      centreX,
      panelY + 0.15,
      front + 0.006,
    ]),
    box(panelInset + 0.02, 0.014, 0.01, colours.gold, [
      centreX,
      panelY - 0.15,
      front + 0.006,
    ]),
    box(0.014, 0.3, 0.01, colours.gold, [
      centreX - (panelInset / 2 + 0.003),
      panelY,
      front + 0.006,
    ]),
    box(0.014, 0.3, 0.01, colours.gold, [
      centreX + (panelInset / 2 + 0.003),
      panelY,
      front + 0.006,
    ]),
  ];
  const bolts = Array.from({ length: 8 }, (_, bolt): ModelPart => {
    const angle = (bolt / 8) * Math.PI * 2;
    return {
      geometry: new SphereGeometry(0.008, 6, 4),
      colour: colours.gold,
      position: [
        centreX + Math.cos(angle) * 0.1,
        portholeY + Math.sin(angle) * 0.1,
        front + 0.014,
      ],
    };
  });
  return buildModelGeometry([
    box(doorWidth, doorHeight, doorThickness, colours.teak, [
      centreX,
      (doorTop + doorBottom) / 2,
      doorZ,
    ]),
    box(doorWidth - 0.07, doorHeight - 0.07, 0.008, colours.purple, [
      centreX,
      (doorTop + doorBottom) / 2,
      halfDepth - doorThickness - 0.002,
    ]),
    box(panelInset, 0.28, 0.008, colours.purple, [
      centreX,
      panelY,
      front + 0.001,
    ]),
    box(doorWidth - 0.08, doorHeight - 0.34, 0.006, colours.purple, [
      centreX,
      doorTop - 0.2,
      front,
    ]),
    ...panelBeading,
    ...louvres,
    {
      geometry: new TorusGeometry(0.085, 0.018, 8, 28),
      colour: colours.brass,
      position: [centreX, portholeY, front + 0.006],
    },
    {
      geometry: new CylinderGeometry(0.075, 0.075, 0.01, 24),
      colour: colours.glass,
      position: [centreX, portholeY, front + 0.002],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new SphereGeometry(0.03, 8, 6),
      colour: "#bfe9ff",
      position: [centreX - 0.025, portholeY + 0.03, front + 0.004],
      scale: [1, 0.6, 0.2],
    },
    ...bolts,
    // the brass handle on the door's inner edge
    rod(0.011, 0.13, colours.brass, [
      handleX,
      doorBottom + 0.38,
      front + 0.035,
    ]),
    ...[-1, 1].map((end) =>
      rod(
        0.008,
        0.035,
        colours.brass,
        [handleX, doorBottom + 0.38 + end * 0.05, front + 0.017],
        [Math.PI / 2, 0, 0],
      ),
    ),
    // brass hinges on the outer edge
    ...[doorBottom + 0.1, doorTop - 0.1].map((y) =>
      box(0.035, 0.08, 0.014, colours.brass, [hingeEdge, y, front + 0.006]),
    ),
  ]);
};

const gearCentre: Triple = [0, 0.47, -halfDepth + 0.14];

const buildGearGeometry = (): BufferGeometry => {
  const backZ = -halfDepth + 0.12;
  const tankX = -0.25;
  const tankBottom = plinthTop + 0.035;
  const tankHeight = 0.44;
  const finParts = [-1, 1].flatMap((side): ModelPart[] => {
    const x = 0.265 + side * 0.075;
    const lean = side * 0.08;
    const blade = (top: number, bottom: number, height: number) =>
      new CylinderGeometry(top, bottom, height, 4)
        .rotateY(Math.PI / 4)
        .scale(1, 1, 0.12);
    return [
      {
        geometry: blade(0.045, 0.05, 0.1),
        colour: colours.rubber,
        position: [x, 0.66, backZ + 0.03],
        rotation: [0, 0, lean],
      },
      {
        geometry: blade(0.045, 0.075, 0.24),
        colour: "#8b5cf6",
        position: [x - side * 0.013, 0.49, backZ + 0.03],
        rotation: [0, 0, lean],
      },
      {
        geometry: blade(0.075, 0.078, 0.05),
        colour: colours.gold,
        position: [x - side * 0.024, 0.345, backZ + 0.03],
        rotation: [0, 0, lean],
      },
    ];
  });
  return buildModelGeometry([
    // the tank, standing in a strap
    rod(
      0.07,
      tankHeight,
      colours.white,
      [tankX, tankBottom + tankHeight / 2, backZ + 0.03],
      [0, 0, 0],
      16,
    ),
    {
      geometry: new SphereGeometry(0.07, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: colours.white,
      position: [tankX, tankBottom + tankHeight, backZ + 0.03],
    },
    ...[0.12, 0.3].map(
      (y) =>
        ({
          geometry: new TorusGeometry(0.071, 0.008, 6, 20),
          colour: colours.gold,
          position: [tankX, tankBottom + y, backZ + 0.03],
          rotation: [Math.PI / 2, 0, 0],
        }) satisfies ModelPart,
    ),
    rod(0.016, 0.06, "#cbd5e1", [
      tankX,
      tankBottom + tankHeight + 0.09,
      backZ + 0.03,
    ]),
    rod(
      0.014,
      0.05,
      "#cbd5e1",
      [tankX + 0.03, tankBottom + tankHeight + 0.1, backZ + 0.03],
      [0, 0, Math.PI / 2],
    ),
    {
      geometry: new TorusGeometry(0.035, 0.01, 6, 14),
      colour: colours.rubber,
      position: [tankX + 0.06, tankBottom + tankHeight + 0.04, backZ + 0.05],
    },
    box(0.16, 0.035, 0.02, colours.rubber, [
      tankX,
      tankBottom + 0.22,
      backZ + 0.1,
    ]),
    // the wetsuit on its hanger
    rod(
      0.006,
      0.2,
      colours.teakLight,
      [0.02, 0.74, backZ + 0.02],
      [0, 0, Math.PI / 2],
    ),
    rod(0.005, 0.05, colours.brass, [0.02, 0.77, backZ + 0.02]),
    box(0.19, 0.3, 0.04, colours.rubber, [0.02, 0.58, backZ + 0.03]),
    box(0.04, 0.29, 0.042, "#5b21b6", [-0.06, 0.58, backZ + 0.03]),
    box(0.04, 0.29, 0.042, "#5b21b6", [0.1, 0.58, backZ + 0.03]),
    box(0.012, 0.29, 0.044, colours.gold, [-0.04, 0.58, backZ + 0.03]),
    box(0.012, 0.29, 0.044, colours.gold, [0.08, 0.58, backZ + 0.03]),
    box(
      0.06,
      0.2,
      0.04,
      colours.rubber,
      [-0.1, 0.62, backZ + 0.03],
      [0, 0, -0.25],
    ),
    box(
      0.06,
      0.2,
      0.04,
      colours.rubber,
      [0.14, 0.62, backZ + 0.03],
      [0, 0, 0.25],
    ),
    box(0.17, 0.12, 0.04, colours.rubber, [0.02, 0.38, backZ + 0.03]),
    // the mask on its peg
    box(0.13, 0.075, 0.035, colours.rubber, [0.24, 0.79, backZ + 0.06]),
    box(0.105, 0.05, 0.01, "#7dd3fc", [0.24, 0.79, backZ + 0.08]),
    {
      geometry: new TorusGeometry(0.06, 0.008, 5, 16),
      colour: colours.rubber,
      position: [0.24, 0.8, backZ + 0.03],
      rotation: [Math.PI / 2, 0, 0],
      scale: [1.1, 0.7, 1],
    },
    ...finParts,
  ]);
};

export const buildScubaLockerMovingPartsGeometry = (): BufferGeometry[] => [
  buildDoorGeometry(-1),
  buildDoorGeometry(1),
  buildGearGeometry(),
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const aboutPoint = ([x, y, z]: Triple, transform: Matrix4): Matrix4 =>
  new Matrix4()
    .makeTranslation(x, y, z)
    .multiply(transform)
    .multiply(new Matrix4().makeTranslation(-x, -y, -z));

/** How big the spare scuba set on the rack shows, quickly vanishing once taken. */
export const findScubaGearShown = (gearOnRack: number): number => {
  const share = clamp01(gearOnRack / 0.4);
  return Math.max(0.001, share * share * (3 - 2 * share));
};

/** How far the doors swing open, in radians, easing at both ends. */
export const findScubaDoorSwing = (opening: number): number => {
  const share = clamp01(opening);
  return doorSwing * share * share * (3 - 2 * share);
};

export const placeScubaLockerMovingParts = (
  opening: number,
  gearOnRack: number,
  size: number,
): Matrix4[] => {
  const grown = Math.max(0.001, size);
  const growth = aboutPoint(
    scubaLockerGrowthCentre,
    new Matrix4().makeScale(grown, grown, grown),
  );
  const swing = findScubaDoorSwing(opening);
  const doors = [-1, 1].map((side) =>
    growth
      .clone()
      .multiply(
        aboutPoint(
          [side * hingeX, 0, doorZ],
          new Matrix4().makeRotationY(side * swing),
        ),
      ),
  );
  const shown = findScubaGearShown(gearOnRack);
  const gear = growth
    .clone()
    .multiply(
      aboutPoint(gearCentre, new Matrix4().makeScale(shown, shown, shown)),
    );
  return [...doors, gear];
};
