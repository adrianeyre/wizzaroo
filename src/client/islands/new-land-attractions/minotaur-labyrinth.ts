import {
  addBench,
  addBush,
  addLampPost,
  addSignBoard,
  listWallBlockers,
  type AttractionBuilder,
  type LocalSpot,
  type MovingPart,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addCypress,
  amphoraSpots,
  buildCourt,
  buildGate,
  buildGoat,
  buildLabrys,
  buildMinotaurBody,
  buildMinotaurHead,
  buildThread,
  buildTorchFlame,
  buildWalls,
  courtFinish,
  cypressSpots,
  gateZ,
  gravel,
  half,
  labrysPivot,
  neckPivot,
  signColour,
  threadRoute,
  threadStart,
  torchSpots,
  wallRuns,
} from "./minotaur-labyrinth-parts.js";

const signAt = { x: 2.7, z: half + 1.7 };

/* Following Ariadne's thread, at a steady walk, round every corner */

const routeLengths = threadRoute.map((point, index) =>
  index === 0
    ? 0
    : Math.hypot(
        point.x - threadRoute[index - 1].x,
        point.z - threadRoute[index - 1].z,
      ),
);
const routeLength = routeLengths.reduce((sum, length) => sum + length, 0);

const findRoutePoint = (distance: number): { x: number; z: number } => {
  let left = Math.max(0, Math.min(routeLength, distance));
  for (let index = 1; index < threadRoute.length; index++) {
    const length = routeLengths[index];
    if (left <= length || index === threadRoute.length - 1) {
      const share = length === 0 ? 0 : Math.min(1, left / length);
      const from = threadRoute[index - 1];
      const to = threadRoute[index];
      return {
        x: from.x + (to.x - from.x) * share,
        z: from.z + (to.z - from.z) * share,
      };
    }
    left -= length;
  }
  return threadRoute[threadRoute.length - 1];
};

const followThread = (progress: number, seconds: number): LocalSpot => {
  const distance = progress * routeLength;
  const here = findRoutePoint(distance);
  const behind = findRoutePoint(distance - 0.5);
  const ahead = findRoutePoint(distance + 0.5);
  return {
    x: here.x,
    y: 0.04 * Math.abs(Math.sin(seconds * 7)),
    z: here.z,
    heading: Math.atan2(ahead.x - behind.x, ahead.z - behind.z),
  };
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    gravel,
    [half * 2 + 0.5, 0.03, half * 2 + 0.5],
    [0, 0.015, 0],
  );
  builder.box("matte", "#9a918a", [2.0, 0.035, 2.6], [0, 0.018, half + 1.4]);
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        "#5b5450",
        [0.1, 0.06, 2.6],
        [side * 1.05, 0.03, half + 1.4],
      );
    });
  }
  cypressSpots.forEach((spot) => {
    addCypress(builder, spot);
  });
  if (builder.isFar) {
    return;
  }
  addCypress(builder, { x: -half - 0.9, z: 1.2 }, 0.8);
  addCypress(builder, { x: half + 0.9, z: -1.6 }, 0.85);
  addBush(builder, [-3.4, 0, half + 1.0], 0.4, "#55703f");
  addBush(builder, [half + 0.8, 0, 3.0], 0.45, "#55703f");
  addBench(builder, [-2.6, 0, half + 1.9], 0.15, "#7a5233");
  addLampPost(builder, [1.6, 0, half + 2.6]);
};

const headNod: MovingPart = {
  name: "minotaur head",
  pivot: neckPivot,
  build: buildMinotaurHead,
  motion: { kind: "nod", axis: "x", reach: 4, amplitude: 0.28, period: 0.8 },
};

export const minotaurLabyrinthModel: NewLandAttractionModel = {
  kind: "minotaur-labyrinth",
  islandId: "ember-isle",
  name: "Minotaur Labyrinth",
  fact: "An Ancient Greek myth tells of the Minotaur, half man and half bull, who lived in a twisting labyrinth on the island of Crete. The hero Theseus found his way back out by unwinding a ball of thread given to him by Princess Ariadne. On Crete, archaeologists have found the palace of Knossos, with so many rooms and passages that it may have started the story.",
  curriculumLink:
    "History, Key Stage 2: Ancient Greece. Greek myths and legends, and the palace of Knossos on Crete.",
  footprint: 9,
  setting: "inland",
  padColour: "#6f6862",
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: (builder) => {
    buildGrounds(builder);
    buildWalls(builder);
    buildGate(builder);
    buildCourt(builder);
    buildThread(builder);
    buildMinotaurBody(builder);
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    headNod,
    {
      name: "labrys",
      pivot: labrysPivot,
      build: buildLabrys,
      motion: { kind: "whirl", axis: "y", idle: 0.4, speed: 4, reach: 4 },
    },
    ...torchSpots.map((pivot, index): MovingPart => ({
      name: `gate torch ${String(index + 1)}`,
      pivot,
      build: buildTorchFlame,
      motion: { kind: "flicker", period: 0.7 + index * 0.1, phase: index },
    })),
  ],
  wanderers: [
    {
      name: "goats",
      build: buildGoat,
      count: 2,
      centre: { x: -4.2, z: half + 1.6 },
      radius: 1.0,
      speed: 0.25,
    },
  ],
  blockers: [
    ...wallRuns.flatMap((run) => listWallBlockers(run.from, run.to, 0.3, 0.4)),
    { x: 0, z: 0, radius: 0.7 },
    ...amphoraSpots.map(({ x, z }) => ({ x, z, radius: 0.3 })),
    ...cypressSpots.map(({ x, z }) => ({ x, z, radius: 0.45 })),
    { x: -1.05, z: gateZ, radius: 0.32 },
    { x: 1.05, z: gateZ, radius: 0.32 },
  ],
  rides: [
    {
      id: "ariadnes-thread",
      name: "Ariadne's thread",
      start: threadStart,
      reach: 0.7,
      seconds: Math.round(routeLength / 2.2),
      finish: courtFinish,
      follow: followThread,
    },
  ],
  tune: [62, 65, 67, 69, 67, 65, 62, 60, 62],
  play: {
    label: "Follow Ariadne's thread",
    news: "You followed the red thread round every twist and turn, right to the middle. There was the Minotaur, nodding hello. He just wanted someone to play with!",
  },
};
