import {
  addBench,
  addLampPost,
  addSignBoard,
  type AttractionBuilder,
  type LocalPoint,
  type LocalSpot,
  type MovingPart,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  ash,
  brazierSpots,
  buildBraziers,
  buildCauseway,
  buildChute,
  buildDrum,
  buildEruption,
  buildFlame,
  buildHall,
  buildPendulum,
  buildPlinths,
  buildSeismograph,
  buildVisitor,
  buildVolcano,
  causewayDeck,
  craterFloor,
  darkPaving,
  drumPivot,
  findChutePoint,
  hallAt,
  hallFront,
  paving,
  pendulumPivot,
  plinthSpots,
  seismographAt,
  signColour,
  volcanoAt,
} from "./volcano-museum-parts.js";

const signAt = { x: -1.7, z: 8.5 };

/* The eruption slide: in at the cut, up the vent, out of the crater and down */

const slideStart: LocalPoint = {
  x: volcanoAt.x + Math.sin(Math.PI * 1.75) * 3.7,
  z: volcanoAt.z + Math.cos(Math.PI * 1.75) * 3.7,
};
const slideFinish: LocalPoint = {
  x: volcanoAt.x + Math.sin(Math.PI / 4) * 4.6,
  z: volcanoAt.z + Math.cos(Math.PI / 4) * 4.6,
};

const ease = (share: number): number => share * share * (3 - 2 * share);

const between = (
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  share: number,
  hop = 0,
): LocalSpot => ({
  x: from.x + (to.x - from.x) * share,
  y: from.y + (to.y - from.y) * share + hop * Math.sin(share * Math.PI),
  z: from.z + (to.z - from.z) * share,
  heading: Math.atan2(to.x - from.x, to.z - from.z),
});

const eruptionSlide = (progress: number, seconds: number): LocalSpot => {
  const start = { ...slideStart, y: 0 };
  const ventFoot = { x: volcanoAt.x, y: 0.45, z: volcanoAt.z };
  const crater = { x: volcanoAt.x, y: craterFloor + 0.05, z: volcanoAt.z };
  const top = findChutePoint(0);
  const walkIn = 0.1;
  const rise = 0.32;
  const pop = 0.44;
  const slide = 0.92;
  if (progress < walkIn) {
    return between(start, ventFoot, ease(progress / walkIn));
  }
  if (progress < rise) {
    const share = (progress - walkIn) / (rise - walkIn);
    const spot = between(ventFoot, crater, ease(share));
    return {
      ...spot,
      x: spot.x + 0.03 * Math.sin(seconds * 9),
      heading: seconds * 2,
    };
  }
  if (progress < pop) {
    return between(
      crater,
      { x: top.x, y: top.y + 0.05, z: top.z },
      (progress - rise) / (pop - rise),
      1.5,
    );
  }
  if (progress < slide) {
    const share = (progress - pop) / (slide - pop);
    const here = findChutePoint(share);
    const ahead = findChutePoint(Math.min(1, share + 0.02));
    return {
      x: here.x,
      y: here.y + 0.05,
      z: here.z,
      heading: Math.atan2(ahead.x - here.x, ahead.z - here.z),
    };
  }
  const foot = findChutePoint(1);
  return between(
    { x: foot.x, y: foot.y + 0.05, z: foot.z },
    { ...slideFinish, y: 0 },
    ease((progress - slide) / (1 - slide)),
  );
};

/* The grounds */

const buildGrounds = (builder: AttractionBuilder) => {
  builder.cylinder("matte", darkPaving, {
    radius: 3.15,
    length: 0.035,
    at: [-0.6, 0.017, 2.6],
    segments: builder.segments(40, 18),
  });
  builder.cylinder("matte", paving, {
    radius: 3.0,
    length: 0.045,
    at: [-0.6, 0.022, 2.6],
    segments: builder.segments(40, 18),
  });
  builder.box("matte", paving, [1.8, 0.04, 4.4], [-0.3, 0.02, 7.4]);
  builder.box(
    "matte",
    paving,
    [4.4, 0.04, 1.3],
    [-5.6, 0.02, 3.5],
    [0, 0.25, 0],
  );
  builder.box(
    "matte",
    paving,
    [2.6, 0.04, 1.4],
    [-4.3, 0.02, 0.4],
    [0, -0.6, 0],
  );
  if (!builder.isFar) {
    /* A compass of lava-red tiles in the middle of the square */
    builder.cylinder("matte", ash, {
      radius: 1.0,
      length: 0.05,
      at: [-0.6, 0.026, 2.6],
      segments: 6,
    });
    builder.cylinder("glow", "#e2561a", {
      radius: 0.45,
      length: 0.055,
      at: [-0.6, 0.028, 2.6],
      segments: 6,
    });
    for (let ray = 0; ray < 6; ray++) {
      const angle = (ray / 6) * Math.PI * 2;
      builder.box(
        "matte",
        darkPaving,
        [0.06, 0.052, 1.9],
        [-0.6 + Math.sin(angle) * 1.6, 0.027, 2.6 + Math.cos(angle) * 1.6],
        [0, angle, 0],
      );
    }
  }
};

const buildFurniture = (builder: AttractionBuilder) => {
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  if (builder.isFar) {
    return;
  }
  addBench(builder, [2.4, 0, 6.9], -Math.PI / 2 - 0.3, "#7a5233");
  addBench(builder, [-2.7, 0, 5.2], Math.PI / 2 + 0.5, "#7a5233");
  addBench(builder, [-2.3, 0, -0.3], 0.35, "#7a5233");
  addLampPost(builder, [1.0, 0, 5.4]);
  addLampPost(builder, [-1.6, 0, 6.0]);
  addLampPost(builder, [2.6, 0, 0.4], 2.4);
};

const flames: MovingPart[] = brazierSpots.map(({ x, z }, index) => ({
  name: `brazier flame ${String(index + 1)}`,
  pivot: [x, 0.97, z],
  build: buildFlame,
  motion: { kind: "flicker", period: 0.6 + index * 0.13, phase: index * 1.7 },
}));

export const volcanoMuseumModel: NewLandAttractionModel = {
  kind: "volcano-museum",
  islandId: "ember-isle",
  name: "Volcano Museum",
  fact: "Deep under a volcano is a chamber of melted rock called magma. When the pressure builds, the magma rushes up a pipe called the vent and pours out as lava. As it cools, it hardens into new igneous rock, such as basalt, glassy obsidian, or pumice, which is so full of bubbles it can float!",
  curriculumLink:
    "Geography, Key Stage 2: physical geography, including volcanoes and earthquakes. How a volcano erupts and its lava cools into new rock.",
  footprint: 10,
  setting: "inland",
  padColour: "#6f6862",
  signSpot: { x: signAt.x, z: signAt.z + 0.75 },
  build: (builder) => {
    buildGrounds(builder);
    buildVolcano(builder);
    buildChute(builder);
    buildHall(builder);
    buildCauseway(builder);
    buildPlinths(builder);
    buildSeismograph(builder);
    buildBraziers(builder);
    buildFurniture(builder);
  },
  moving: [
    {
      name: "eruption",
      pivot: [volcanoAt.x, craterFloor - 1.0, volcanoAt.z],
      build: buildEruption,
      motion: { kind: "rise", reach: 7.5, height: 1.7, period: 0.9 },
    },
    {
      name: "seismograph drum",
      pivot: drumPivot,
      build: buildDrum,
      motion: { kind: "spin", axis: "x", speed: 0.5 },
    },
    {
      name: "seismograph pendulum",
      pivot: pendulumPivot,
      build: buildPendulum,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 4.5,
        amplitude: 0.3,
        period: 0.45,
      },
    },
    ...flames,
  ],
  wanderers: [
    {
      name: "visitors",
      build: buildVisitor,
      count: 3,
      centre: { x: -0.6, z: 3.2 },
      radius: 2.1,
      speed: 0.45,
    },
  ],
  smoke: [
    {
      at: [volcanoAt.x, 4.1, volcanoAt.z],
      colour: "#8f8882",
      puffs: 7,
      size: 0.42,
      rise: 2.8,
      spread: 0.6,
    },
  ],
  blockers: [
    { x: volcanoAt.x, z: volcanoAt.z, radius: 2.4 },
    { x: hallAt.x, z: hallAt.z, radius: hallFront - hallAt.z },
    ...plinthSpots.map(({ x, z }) => ({ x, z, radius: 0.42 })),
    { x: seismographAt.x, z: seismographAt.z, radius: 0.75 },
  ],
  decks: [causewayDeck],
  rides: [
    {
      id: "eruption-slide",
      name: "the eruption slide",
      start: slideStart,
      reach: 0.7,
      seconds: 13,
      finish: slideFinish,
      follow: eruptionSlide,
    },
  ],
  play: {
    label: "Make the volcano erupt",
    news: "Rumble, rumble... WHOOSH! The model volcano puffed out a cloud of ash, and glowing pretend lava bubbled up out of its crater.",
    tune: [36, 38, 41, 43, 48, 55],
  },
};
