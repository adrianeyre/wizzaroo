import {
  buildNumberDistractors,
  defineComputingGame,
  pickOne,
  pickWholeNumber,
  shuffleValues,
  type CodeBlock,
  type CodeCategory,
  type ComputingDifficulty,
  type ComputingQuestion,
  type GridCell,
  type NetworkDevice,
  type NetworkNode,
} from "./computing-scenes.js";

const questionsPerBatch = 6;

const buildBatch = (
  buildQuestion: () => ComputingQuestion | undefined,
): ComputingQuestion[] => {
  const batch: ComputingQuestion[] = [];
  let attemptsLeft = questionsPerBatch * 40;
  while (batch.length < questionsPerBatch && attemptsLeft > 0) {
    attemptsLeft--;
    const question = buildQuestion();
    if (question !== undefined) {
      batch.push(question);
    }
  }
  return batch;
};

const isInOrder = (order: readonly number[]): boolean =>
  order.every((value, index) => value === index);

const findFixableSpots = (order: readonly number[]): number[] =>
  order.flatMap((value, index) => {
    const without = order.toSpliced(index, 1);
    const isFixedByMoving = order.some((_, spot) =>
      isInOrder(without.toSpliced(spot, 0, value)),
    );
    return isFixedByMoving ? [index] : [];
  });

const buildDisplacedOrder = (
  length: number,
  random: () => number,
): number[] | undefined => {
  const from = pickWholeNumber(0, length - 1, random);
  const to = pickWholeNumber(0, length - 1, random);
  if (Math.abs(from - to) < 2) {
    return undefined;
  }
  const inOrder = Array.from({ length }, (_, index) => index);
  const order = inOrder.toSpliced(from, 1).toSpliced(to, 0, from);
  const fixableSpots = findFixableSpots(order);
  return fixableSpots.length === 1 ? order : undefined;
};

const buildNetworkNode = (
  id: string,
  device: NetworkDevice,
  label: string,
  column: number,
  row: number,
): NetworkNode => ({ id, device, label, column, row });

const networkBuilder = defineComputingGame({
  gameType: "network-builder",
  title: "Network Builder",
  skillId: "computing.connect-computers",
  instruction: "Look at the network, then answer the question.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which device joins these computers into one network?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("a", "computer", "Ali", 0, 0),
            buildNetworkNode("b", "computer", "Bea", 0, 2),
            buildNetworkNode("c", "computer", "Cal", 4, 0),
            buildNetworkNode("d", "computer", "Dev", 4, 2),
            buildNetworkNode("hub", "switch", "?", 2, 1),
          ],
          links: [
            ["a", "hub"],
            ["b", "hub"],
            ["c", "hub"],
            ["d", "hub"],
          ],
        },
        answer: "A switch",
        distractors: ["A printer", "A speaker", "A webcam", "A keyboard"],
        hint: "Look at the box in the middle that every cable goes to.",
      },
      {
        ask: "What job does the router do?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("router", "router", "Router", 2, 0),
            buildNetworkNode("hub", "switch", "Switch", 2, 1),
            buildNetworkNode("a", "computer", "Ali", 0, 1),
            buildNetworkNode("b", "computer", "Bea", 4, 1),
            buildNetworkNode("c", "laptop", "Cal", 2, 2),
          ],
          links: [
            ["router", "hub"],
            ["a", "hub"],
            ["b", "hub"],
            ["c", "hub"],
          ],
        },
        answer: "Links us to the internet",
        distractors: [
          "Prints our work",
          "Types the letters",
          "Plays the music",
          "Takes photos",
        ],
        hint: "The router connects our network to other networks far away.",
      },
      {
        ask: "How many computers are on this network?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("hub", "switch", "Switch", 2, 1),
            buildNetworkNode("print", "printer", "Printer", 2, 0),
            buildNetworkNode("a", "computer", "Ali", 0, 0),
            buildNetworkNode("b", "computer", "Bea", 0, 2),
            buildNetworkNode("c", "computer", "Cal", 4, 0),
            buildNetworkNode("d", "computer", "Dev", 4, 2),
            buildNetworkNode("e", "computer", "Eve", 2, 2),
          ],
          links: [
            ["print", "hub"],
            ["a", "hub"],
            ["b", "hub"],
            ["c", "hub"],
            ["d", "hub"],
            ["e", "hub"],
          ],
        },
        answer: "5",
        distractors: ["4", "6", "7", "3"],
        hint: "Count only the computers, not the printer or the switch.",
      },
      {
        ask: "Which computer is not connected to the network?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("hub", "switch", "Switch", 2, 1),
            buildNetworkNode("a", "computer", "A", 0, 0),
            buildNetworkNode("b", "computer", "B", 4, 0),
            buildNetworkNode("c", "computer", "C", 0, 2),
            buildNetworkNode("d", "computer", "D", 4, 2),
          ],
          links: [
            ["a", "hub"],
            ["b", "hub"],
            ["c", "hub"],
          ],
        },
        answer: "Computer D",
        distractors: ["Computer A", "Computer B", "Computer C"],
        hint: "Follow each cable. Which computer has no cable at all?",
      },
      {
        ask: "Ali sends a message to Bea. Which device does it pass through?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("router", "router", "Router", 2, 0),
            buildNetworkNode("hub", "switch", "Switch", 2, 1),
            buildNetworkNode("a", "computer", "Ali", 0, 1),
            buildNetworkNode("b", "computer", "Bea", 4, 1),
            buildNetworkNode("c", "computer", "Cal", 1, 2),
            buildNetworkNode("print", "printer", "Printer", 3, 2),
          ],
          links: [
            ["router", "hub"],
            ["a", "hub"],
            ["b", "hub"],
            ["c", "hub"],
            ["print", "hub"],
          ],
          route: ["a", "hub", "b"],
        },
        answer: "The switch",
        distractors: ["The printer", "The router", "Cal's computer"],
        hint: "Watch the moving message. Where does it stop on the way?",
      },
      {
        ask: "The cable to the router is cut. What can the computers no longer reach?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("router", "router", "Router", 2, 0),
            buildNetworkNode("hub", "switch", "Switch", 2, 1),
            buildNetworkNode("a", "computer", "Ali", 0, 1),
            buildNetworkNode("b", "computer", "Bea", 4, 1),
            buildNetworkNode("c", "computer", "Cal", 2, 2),
          ],
          links: [
            ["a", "hub"],
            ["b", "hub"],
            ["c", "hub"],
          ],
        },
        answer: "The internet",
        distractors: ["Each other", "The switch", "Their keyboards"],
        hint: "The computers are still joined to the switch. What does the router give them?",
      },
      {
        ask: "Which device is not joined to the network?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("router", "router", "Router", 0, 0),
            buildNetworkNode("hub", "switch", "Switch", 2, 1),
            buildNetworkNode("a", "computer", "A", 0, 2),
            buildNetworkNode("b", "laptop", "B", 2, 2),
            buildNetworkNode("print", "printer", "Printer", 4, 0),
          ],
          links: [
            ["router", "hub"],
            ["a", "hub"],
            ["b", "hub"],
          ],
        },
        answer: "The printer",
        distractors: ["The switch", "Computer A", "The router", "Laptop B"],
        hint: "Look for a device with no line going to it.",
      },
      {
        ask: "What is a computer network?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("hub", "switch", "Switch", 2, 1),
            buildNetworkNode("a", "computer", "Ali", 0, 1),
            buildNetworkNode("b", "laptop", "Bea", 4, 1),
            buildNetworkNode("c", "tablet", "Cal", 2, 0),
          ],
          links: [
            ["a", "hub"],
            ["b", "hub"],
            ["c", "hub"],
          ],
        },
        answer: "Computers joined together",
        distractors: [
          "One computer on its own",
          "A cable for charging",
          "A kind of computer game",
        ],
        hint: "Look at all the lines between the devices.",
      },
      {
        ask: "Why do schools join their computers in a network?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("hub", "switch", "Switch", 2, 1),
            buildNetworkNode("print", "printer", "Printer", 2, 0),
            buildNetworkNode("serve", "server", "Files", 2, 2),
            buildNetworkNode("a", "computer", "Class 3", 0, 1),
            buildNetworkNode("b", "computer", "Class 4", 4, 1),
          ],
          links: [
            ["print", "hub"],
            ["serve", "hub"],
            ["a", "hub"],
            ["b", "hub"],
          ],
        },
        answer: "To share files and printers",
        distractors: [
          "To make them lighter",
          "To charge their batteries",
          "To keep them cool",
        ],
        hint: "Both classes can reach the printer and the files.",
      },
      {
        ask: "The tablet joins the router with no cable. How does it do that?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("router", "router", "Router", 2, 1),
            buildNetworkNode("t", "tablet", "Tablet", 4, 1),
            buildNetworkNode("a", "computer", "Ali", 0, 1),
          ],
          links: [
            ["router", "t"],
            ["router", "a"],
          ],
        },
        answer: "Wirelessly, using Wi-Fi",
        distractors: [
          "It cannot join at all",
          "Through the printer",
          "By plugging in a mouse",
        ],
        hint: "Some devices join a network through the air, with no wires.",
      },
      {
        ask: "What job does the server do on this network?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("hub", "switch", "Switch", 2, 1),
            buildNetworkNode("serve", "server", "Server", 2, 0),
            buildNetworkNode("a", "computer", "Ali", 0, 1),
            buildNetworkNode("b", "computer", "Bea", 4, 1),
            buildNetworkNode("c", "laptop", "Cal", 2, 2),
          ],
          links: [
            ["serve", "hub"],
            ["a", "hub"],
            ["b", "hub"],
            ["c", "hub"],
          ],
        },
        answer: "Stores and shares files",
        distractors: ["Prints pictures", "Plays sounds aloud", "Takes photos"],
        hint: "Every computer can reach the server to get its work.",
      },
      {
        ask: "Which new link would join computer B to the network?",
        scene: {
          kind: "network-map",
          nodes: [
            buildNetworkNode("hub", "switch", "Switch", 2, 1),
            buildNetworkNode("a", "computer", "A", 0, 0),
            buildNetworkNode("b", "computer", "B", 4, 0),
            buildNetworkNode("c", "computer", "C", 0, 2),
            buildNetworkNode("print", "printer", "Printer", 4, 2),
          ],
          links: [
            ["a", "hub"],
            ["c", "hub"],
            ["print", "hub"],
          ],
        },
        answer: "B to the switch",
        distractors: [
          "A to the switch",
          "Printer to the switch",
          "C to the switch",
        ],
        hint: "Those other links are already there. Which one is missing?",
      },
    ],
  },
});

interface FrameMotion {
  columnStep: number;
  rowStep: number;
}

const frameColumns = 8;
const frameRows = 5;
const frameCount = 4;

const frameMotions: Record<ComputingDifficulty, readonly FrameMotion[]> = {
  1: [
    { columnStep: 1, rowStep: 0 },
    { columnStep: -1, rowStep: 0 },
    { columnStep: 0, rowStep: 1 },
    { columnStep: 0, rowStep: -1 },
  ],
  2: [
    { columnStep: 1, rowStep: 0 },
    { columnStep: -1, rowStep: 0 },
    { columnStep: 2, rowStep: 0 },
    { columnStep: -2, rowStep: 0 },
    { columnStep: 0, rowStep: 1 },
    { columnStep: 0, rowStep: -1 },
  ],
  3: [
    { columnStep: 2, rowStep: 0 },
    { columnStep: -2, rowStep: 0 },
    { columnStep: 1, rowStep: 1 },
    { columnStep: -1, rowStep: 1 },
    { columnStep: 1, rowStep: -1 },
    { columnStep: -1, rowStep: -1 },
    { columnStep: 0, rowStep: 1 },
  ],
};

const frameBallSizes: Record<ComputingDifficulty, number> = {
  1: 1,
  2: 2,
  3: 2,
};

const frameBallColours = ["r", "b", "g", "p", "o"] as const;

const buildAnimationFrame = (
  spot: GridCell,
  size: number,
  colour: string,
): string[] =>
  Array.from({ length: frameRows }, (_, row) =>
    Array.from({ length: frameColumns }, (_, column) => {
      const isBall =
        column >= spot.column &&
        column < spot.column + size &&
        row >= spot.row &&
        row < spot.row + size;
      return isBall ? colour : ".";
    }).join(""),
  );

const buildQuestionFrame = (): string[] =>
  Array.from({ length: frameRows }, () => "?".repeat(frameColumns));

const isBallInsideFrame = (spot: GridCell, size: number): boolean =>
  spot.column >= 0 &&
  spot.row >= 0 &&
  spot.column + size <= frameColumns &&
  spot.row + size <= frameRows;

const describeSteps = (count: number, word: string): string =>
  `${String(count)} ${count === 1 ? "square" : "squares"} ${word}`;

const describeFrameMotion = ({ columnStep, rowStep }: FrameMotion): string => {
  const across = columnStep > 0 ? "right" : "left";
  const upDown = rowStep > 0 ? "down" : "up";
  if (columnStep === 0 && rowStep === 0) {
    return "Stays still";
  }
  if (rowStep === 0) {
    return describeSteps(Math.abs(columnStep), across);
  }
  if (columnStep === 0) {
    return describeSteps(Math.abs(rowStep), upDown);
  }
  return `${String(Math.abs(columnStep))} ${across} and ${String(Math.abs(rowStep))} ${upDown}`;
};

const directionNames = ["Right", "Left", "Down", "Up"] as const;

const findMotionDirectionName = ({
  columnStep,
  rowStep,
}: FrameMotion): string => {
  if (columnStep > 0) {
    return "Right";
  }
  if (columnStep < 0) {
    return "Left";
  }
  return rowStep > 0 ? "Down" : "Up";
};

const listMotionDistractors = (
  motion: FrameMotion,
  random: () => number,
): string[] => {
  const answer = describeFrameMotion(motion);
  const opposite = describeFrameMotion({
    columnStep: -motion.columnStep,
    rowStep: -motion.rowStep,
  });
  const everyMotion = [-2, -1, 0, 1, 2].flatMap((columnStep) =>
    [-1, 0, 1].map((rowStep) => describeFrameMotion({ columnStep, rowStep })),
  );
  const others = shuffleValues(
    everyMotion.filter(
      (description) => description !== answer && description !== opposite,
    ),
    random,
  );
  return [opposite, ...others.slice(0, 3)];
};

const buildFrameByFrameQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const motion = pickOne(frameMotions[difficulty], random);
  const size = frameBallSizes[difficulty];
  const colour = pickOne(frameBallColours, random);
  const start = {
    column: pickWholeNumber(0, frameColumns - size, random),
    row: pickWholeNumber(0, frameRows - size, random),
  };
  const spots = Array.from({ length: frameCount }, (_, index) => ({
    column: start.column + index * motion.columnStep,
    row: start.row + index * motion.rowStep,
  }));
  if (!spots.every((spot) => isBallInsideFrame(spot, size))) {
    return undefined;
  }
  const frames = spots.map((spot) => buildAnimationFrame(spot, size, colour));
  const isStraight = motion.columnStep === 0 || motion.rowStep === 0;
  const askStyles =
    difficulty === 1
      ? ["next", "direction"]
      : isStraight
        ? ["next", "order", "distance"]
        : ["next", "order"];
  const askStyle = pickOne(askStyles, random);
  if (askStyle === "direction") {
    const answer = findMotionDirectionName(motion);
    return {
      ask: "Which way is the ball moving?",
      scene: { kind: "pixel-grid", frames: frames.slice(0, 3) },
      answer,
      distractors: directionNames.filter((name) => name !== answer),
      hint: "Look at frame 1, then frame 2, then frame 3. Where does the ball go?",
    };
  }
  if (askStyle === "distance") {
    const distance = Math.abs(motion.columnStep + motion.rowStep);
    return {
      ask: "How many squares does the ball move each frame?",
      scene: { kind: "pixel-grid", frames: frames.slice(0, 3) },
      answer: String(distance),
      distractors: buildNumberDistractors(distance, 0),
      hint: "Count the squares between the ball in frame 1 and frame 2.",
    };
  }
  if (askStyle === "order") {
    const order = buildDisplacedOrder(frameCount, random);
    if (order === undefined) {
      return undefined;
    }
    const [wrongSpot] = findFixableSpots(order);
    const frameNames = order.map((_, index) => `Frame ${String(index + 1)}`);
    return {
      ask: "One frame is in the wrong place. Which one?",
      scene: {
        kind: "pixel-grid",
        frames: order.map((position) => frames[position]),
      },
      answer: frameNames[wrongSpot],
      distractors: frameNames.filter((_, index) => index !== wrongSpot),
      hint: "The ball should move the same small amount each frame. Which frame jumps?",
    };
  }
  return {
    ask: "How will the ball move in the next frame?",
    scene: {
      kind: "pixel-grid",
      frames: [...frames.slice(0, 3), buildQuestionFrame()],
    },
    answer: describeFrameMotion(motion),
    distractors: listMotionDistractors(motion, random),
    hint: "Smooth animations make the same small change every frame.",
  };
};

const frameByFrame = defineComputingGame({
  gameType: "frame-by-frame",
  title: "Frame by Frame",
  skillId: "computing.stop-frame-animation",
  instruction: "Look at the frames. How does the ball move?",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildFrameByFrameQuestion(difficulty, random)),
  },
});

type SoundStep =
  { kind: "sound"; name: string } | { kind: "wait"; seconds: number };

const soundNames = ["Drum", "Bell", "Clap", "Guitar", "Whistle", "Piano"];
const ordinalWords = ["first", "second", "third", "fourth", "fifth", "sixth"];

const describeSeconds = (seconds: number): string =>
  `${String(seconds)} ${seconds === 1 ? "second" : "seconds"}`;

const buildSoundBlock = (step: SoundStep, depth: number): CodeBlock =>
  step.kind === "sound"
    ? { text: `Play ${step.name.toLowerCase()}`, category: "sound", depth }
    : {
        text: `Wait ${describeSeconds(step.seconds)}`,
        category: "control",
        depth,
      };

const pickWaitStep = (random: () => number): SoundStep => ({
  kind: "wait",
  seconds: pickWholeNumber(1, 3, random),
});

interface SoundProgram {
  blocks: CodeBlock[];
  steps: SoundStep[];
}

const buildPlainSoundProgram = (
  soundCount: number,
  waitCount: number,
  random: () => number,
): SoundProgram => {
  const sounds = shuffleValues(soundNames, random)
    .slice(0, soundCount)
    .map((name): SoundStep => ({ kind: "sound", name }));
  const steps = [...sounds];
  for (let waitIndex = 0; waitIndex < waitCount; waitIndex++) {
    const spot = pickWholeNumber(1, steps.length - 1, random);
    steps.splice(spot, 0, pickWaitStep(random));
  }
  return {
    blocks: [
      { text: "When flag clicked", category: "event" },
      ...steps.map((step) => buildSoundBlock(step, 0)),
    ],
    steps,
  };
};

const buildRepeatSoundProgram = (random: () => number): SoundProgram => {
  const [before, inside, after] = shuffleValues(soundNames, random)
    .slice(0, 3)
    .map((name): SoundStep => ({ kind: "sound", name }));
  const wait = pickWaitStep(random);
  const repeatCount = pickWholeNumber(2, 3, random);
  const loop = Array.from({ length: repeatCount }, () => [inside, wait]).flat();
  return {
    blocks: [
      { text: "When flag clicked", category: "event" },
      buildSoundBlock(before, 0),
      { text: `Repeat ${String(repeatCount)}`, category: "control" },
      buildSoundBlock(inside, 1),
      buildSoundBlock(wait, 1),
      buildSoundBlock(after, 0),
    ],
    steps: [before, ...loop, after],
  };
};

const buildSoundProgram = (
  difficulty: ComputingDifficulty,
  random: () => number,
): SoundProgram => {
  if (difficulty === 1) {
    return buildPlainSoundProgram(3, pickWholeNumber(0, 1, random), random);
  }
  if (difficulty === 2) {
    return buildPlainSoundProgram(pickWholeNumber(3, 4, random), 2, random);
  }
  return random() < 0.7
    ? buildRepeatSoundProgram(random)
    : buildPlainSoundProgram(4, 2, random);
};

const listPlayedSounds = (steps: readonly SoundStep[]): string[] =>
  steps.flatMap((step) => (step.kind === "sound" ? [step.name] : []));

const addUpWaiting = (steps: readonly SoundStep[]): number =>
  steps.reduce(
    (total, step) => (step.kind === "wait" ? total + step.seconds : total),
    0,
  );

const buildSoundSequencerQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  const { blocks, steps } = buildSoundProgram(difficulty, random);
  const scene = { kind: "code-stack" as const, blocks };
  const played = listPlayedSounds(steps);
  const totalWait = addUpWaiting(steps);
  const askStyles = [
    "order",
    "last",
    ...(difficulty === 1 ? [] : ["count"]),
    ...(totalWait > 0 && difficulty > 1 ? ["wait"] : []),
  ];
  const askStyle = pickOne(askStyles, random);
  if (askStyle === "count") {
    return {
      ask: "How many sounds play altogether?",
      scene,
      answer: String(played.length),
      distractors: buildNumberDistractors(played.length, 1),
      hint: "Count the sound blocks. Sounds inside a repeat play more than once.",
    };
  }
  if (askStyle === "wait") {
    return {
      ask: "How long does the program wait altogether?",
      scene,
      answer: describeSeconds(totalWait),
      distractors: buildNumberDistractors(totalWait, 1)
        .map(Number)
        .map(describeSeconds),
      hint: "Add up every wait. A wait inside a repeat happens each time round.",
    };
  }
  const position =
    askStyle === "last"
      ? played.length - 1
      : pickWholeNumber(0, Math.min(played.length, 4) - 1, random);
  const answer = played[position];
  const inProgram = played.filter((name) => name !== answer);
  const notInProgram = soundNames.filter(
    (name) => name !== answer && !inProgram.includes(name),
  );
  const distractors = [...new Set([...inProgram, ...notInProgram])].slice(0, 4);
  return {
    ask:
      askStyle === "last"
        ? "Which sound plays last?"
        : `Which sound plays ${ordinalWords[position]}?`,
    scene,
    answer,
    distractors,
    hint: "Start at the top and say each sound in order. Waits do not make a sound.",
  };
};

const soundSequencer = defineComputingGame({
  gameType: "sound-sequencer",
  title: "Sound Sequencer",
  skillId: "computing.sequence-sounds",
  instruction: "Read the sound program from the top.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildSoundSequencerQuestion(difficulty, random),
      ),
  },
});

const animalTree = {
  question: "Does it have feathers?",
  yes: {
    question: "Can it fly?",
    yes: { leaf: "Eagle" },
    no: { leaf: "Penguin" },
  },
  no: {
    question: "Does it live in water?",
    yes: { leaf: "Shark" },
    no: { leaf: "Lion" },
  },
};

const fruitTree = {
  question: "Is it yellow?",
  yes: {
    question: "Is it long and curved?",
    yes: { leaf: "Banana" },
    no: { leaf: "Lemon" },
  },
  no: {
    question: "Does it grow in bunches?",
    yes: { leaf: "Grapes" },
    no: { leaf: "Apple" },
  },
};

const shapeTree = {
  question: "Does it have corners?",
  yes: {
    question: "Does it have 3 sides?",
    yes: { leaf: "Triangle" },
    no: { leaf: "Square" },
  },
  no: {
    question: "Is it 3D?",
    yes: { leaf: "Sphere" },
    no: { leaf: "Circle" },
  },
};

const minibeastTree = {
  question: "Does it have 6 legs?",
  yes: {
    question: "Can it fly?",
    yes: { leaf: "Bee" },
    no: { leaf: "Ant" },
  },
  no: {
    question: "Does it have 8 legs?",
    yes: { leaf: "Spider" },
    no: { leaf: "Snail" },
  },
};

const branchExplorer = defineComputingGame({
  gameType: "branch-explorer",
  title: "Branch Explorer",
  skillId: "computing.branching-databases",
  instruction: "Follow the yes and no branches.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which animal has feathers but cannot fly?",
        scene: { kind: "branch-tree", root: animalTree },
        answer: "Penguin",
        distractors: ["Eagle", "Shark", "Lion"],
        hint: "Go yes at the first question, then no at the next one.",
      },
      {
        ask: "Answer no, then yes. Which animal do you reach?",
        scene: { kind: "branch-tree", root: animalTree },
        answer: "Shark",
        distractors: ["Eagle", "Penguin", "Lion"],
        hint: "Start at the top. Follow the no branch first.",
      },
      {
        ask: "Which question would split the shark from the lion?",
        scene: {
          kind: "branch-tree",
          root: {
            question: "Does it have feathers?",
            yes: {
              question: "Can it fly?",
              yes: { leaf: "Eagle" },
              no: { leaf: "Penguin" },
            },
            no: { question: "?", yes: { leaf: "Shark" }, no: { leaf: "Lion" } },
          },
        },
        answer: "Does it live in water?",
        distractors: [
          "Does it have feathers?",
          "Is it an animal?",
          "Does it have eyes?",
          "Is it alive?",
        ],
        hint: "The question needs a yes for one animal and a no for the other.",
      },
      {
        ask: "Which is a good yes or no question for a branching database?",
        scene: { kind: "branch-tree", root: animalTree },
        answer: "Does it have four legs?",
        distractors: [
          "What colour is it?",
          "Is it nice?",
          "How big is it?",
          "Where does it live?",
        ],
        hint: "A good question can only be answered yes or no, and everyone agrees.",
      },
      {
        ask: "Which fruit is yellow but not long and curved?",
        scene: { kind: "branch-tree", root: fruitTree },
        answer: "Lemon",
        distractors: ["Banana", "Grapes", "Apple"],
        hint: "Go yes at the top, then no.",
      },
      {
        ask: "How many questions do you answer to reach Grapes?",
        scene: {
          kind: "branch-tree",
          root: fruitTree,
          highlightLeaf: "Grapes",
        },
        answer: "2",
        distractors: ["1", "3", "4"],
        hint: "Count the question boxes on the path from the top to Grapes.",
      },
      {
        ask: "A shape with corners and 4 equal sides goes down this tree. Where does it end up?",
        scene: { kind: "branch-tree", root: shapeTree },
        answer: "Square",
        distractors: ["Triangle", "Sphere", "Circle"],
        hint: "This shape has corners and 4 sides. Answer each question for it.",
      },
      {
        ask: "A football goes down this tree. Where does it end up?",
        scene: { kind: "branch-tree", root: shapeTree },
        answer: "Sphere",
        distractors: ["Triangle", "Square", "Circle"],
        hint: "A football has no corners, and you can hold it in your hands.",
      },
      {
        ask: "A minibeast has 6 legs and can fly. Where does it end up?",
        scene: { kind: "branch-tree", root: minibeastTree },
        answer: "Bee",
        distractors: ["Ant", "Spider", "Snail"],
        hint: "Answer the first question, then the next one, for this minibeast.",
      },
      {
        ask: "Which question would split the cat from the fish?",
        scene: {
          kind: "branch-tree",
          root: { question: "?", yes: { leaf: "Cat" }, no: { leaf: "Fish" } },
        },
        answer: "Does it have fur?",
        distractors: [
          "Is it an animal?",
          "Is it alive?",
          "Does it have eyes?",
          "Is it cute?",
        ],
        hint: "The cat must answer yes and the fish must answer no.",
      },
      {
        ask: "Which question is asked first in this tree?",
        scene: { kind: "branch-tree", root: minibeastTree },
        answer: "Does it have 6 legs?",
        distractors: ["Can it fly?", "Does it have 8 legs?", "Is it a bee?"],
        hint: "The first question is at the very top of the tree.",
      },
      {
        ask: "Why is this a poor question for a branching database?",
        scene: {
          kind: "branch-tree",
          root: {
            question: "Is it pretty?",
            yes: { leaf: "Rose" },
            no: { leaf: "Cactus" },
          },
        },
        answer: "People may not agree",
        distractors: [
          "It is too short",
          "It has no question mark",
          "It is about plants",
        ],
        hint: "Would everyone give the same answer?",
      },
    ],
  },
});

const pageDesigner = defineComputingGame({
  gameType: "page-designer",
  title: "Page Designer",
  skillId: "computing.desktop-publishing",
  instruction: "Choose the best way to design the page.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which part of this poster is the heading?",
        scene: {
          kind: "tablet-screen",
          title: "Poster",
          screen: {
            app: "poster",
            lines: [
              "SCHOOL FAIR",
              "[picture]",
              "Saturday at 10am",
              "Cakes and games",
            ],
          },
        },
        answer: "SCHOOL FAIR",
        distractors: ["[picture]", "Saturday at 10am", "Cakes and games"],
        hint: "A heading is big and comes first. It tells you what the page is about.",
      },
      {
        ask: "What is the box marked [picture] for?",
        scene: {
          kind: "tablet-screen",
          title: "Poster",
          screen: {
            app: "poster",
            lines: [
              "LOST CAT",
              "[picture]",
              "Black with white paws",
              "Call Room 5",
            ],
          },
        },
        answer: "Holding an image",
        distractors: [
          "Typing the heading",
          "Saving the poster",
          "Printing it out",
        ],
        hint: "It is a space kept ready for something you can see.",
      },
      {
        ask: "A page that is taller than it is wide is called…",
        scene: {
          kind: "tablet-screen",
          title: "Page setup",
          screen: {
            app: "document",
            lines: ["Page shape:", "Portrait or landscape?"],
          },
        },
        answer: "Portrait",
        distractors: ["Landscape", "Template", "Heading"],
        hint: "Think of a painting of a person standing up.",
      },
      {
        ask: "A page that is wider than it is tall is called…",
        scene: {
          kind: "tablet-screen",
          title: "Page setup",
          screen: {
            app: "document",
            lines: ["Page shape:", "Portrait or landscape?"],
          },
        },
        answer: "Landscape",
        distractors: ["Portrait", "Text box", "Font"],
        hint: "Think of a wide picture of hills and fields.",
      },
      {
        ask: "Which font choice is easiest to read on a poster?",
        scene: {
          kind: "tablet-screen",
          title: "Fonts",
          screen: {
            app: "document",
            lines: ["Pick a font for", "your poster"],
          },
        },
        answer: "Clear and large",
        distractors: [
          "Tiny and swirly",
          "Pale yellow on white",
          "A different font each line",
        ],
        hint: "Think about someone reading it from across the room.",
      },
      {
        ask: "What is a template?",
        scene: {
          kind: "tablet-screen",
          title: "Templates",
          screen: {
            app: "document",
            lines: ["Birthday card", "Party invite", "Class newsletter"],
          },
        },
        answer: "A ready-made page layout",
        distractors: [
          "A kind of picture",
          "A spelling checker",
          "A printer setting",
        ],
        hint: "It gives you a page with the spaces already set out.",
      },
      {
        ask: "What do you put in a text box?",
        scene: {
          kind: "tablet-screen",
          title: "Newsletter",
          screen: {
            app: "document",
            lines: ["CLASS NEWS", "[text box]", "[picture]"],
          },
        },
        answer: "Words",
        distractors: ["Sounds", "Videos", "Photos only"],
        hint: "The name gives you a clue.",
      },
      {
        ask: "Desktop publishing mixes which two things on a page?",
        scene: {
          kind: "tablet-screen",
          title: "Leaflet",
          screen: {
            app: "poster",
            lines: ["VISIT THE ZOO", "[picture]", "Open every day"],
          },
        },
        answer: "Text and images",
        distractors: [
          "Sounds and music",
          "Numbers and sums",
          "Games and videos",
        ],
        hint: "Look at what is on the leaflet.",
      },
      {
        ask: "Which is the best heading for this poster?",
        scene: {
          kind: "tablet-screen",
          title: "Poster",
          screen: {
            app: "poster",
            lines: ["?", "[picture]", "Bake sale in the hall", "Friday at 3pm"],
          },
        },
        answer: "BAKE SALE",
        distractors: ["Hello everyone", "Please read this", "Things on Friday"],
        hint: "A good heading is short and says what the poster is about.",
      },
      {
        ask: "What would make this poster harder to read?",
        scene: {
          kind: "tablet-screen",
          title: "Poster",
          screen: {
            app: "poster",
            lines: ["SPORTS DAY", "[picture]", "Monday on the field"],
          },
        },
        answer: "Using lots of fonts",
        distractors: ["A clear heading", "Large text", "One helpful picture"],
        hint: "Which choice would make the page look messy?",
      },
      {
        ask: "Why use a template for a class newsletter?",
        scene: {
          kind: "tablet-screen",
          title: "Templates",
          screen: {
            app: "document",
            lines: ["CLASS NEWS", "[text box]", "[picture]", "[text box]"],
          },
        },
        answer: "It saves time",
        distractors: [
          "It adds sounds",
          "It checks spelling",
          "It prints faster",
        ],
        hint: "The layout is already done for you.",
      },
      {
        ask: "Where should the heading go on a poster?",
        scene: {
          kind: "tablet-screen",
          title: "Poster",
          screen: {
            app: "poster",
            lines: ["[picture]", "Join our choir!", "Tuesdays at lunch"],
          },
        },
        answer: "At the top, nice and big",
        distractors: [
          "At the bottom, very small",
          "Hidden behind the picture",
          "Sideways in a corner",
        ],
        hint: "People read the heading first.",
      },
    ],
  },
});

interface EventChoice {
  block: string;
  phrase: string;
}

interface ActionChoice {
  block: string;
  phrase: string;
  category: CodeCategory;
}

const eventChoices: readonly EventChoice[] = [
  { block: "When green flag clicked", phrase: "the green flag is clicked" },
  { block: "When space key pressed", phrase: "the space key is pressed" },
  { block: "When sprite clicked", phrase: "the sprite is clicked" },
  { block: "When up arrow pressed", phrase: "the up arrow is pressed" },
  { block: "When A key pressed", phrase: "the A key is pressed" },
];

const actionChoices: readonly ActionChoice[] = [
  { block: "Jump", phrase: "jump", category: "motion" },
  { block: "Say Hello!", phrase: "say Hello!", category: "looks" },
  { block: "Play pop sound", phrase: "play a pop sound", category: "sound" },
  { block: "Change colour", phrase: "change colour", category: "looks" },
  { block: "Move 10 steps", phrase: "move 10 steps", category: "motion" },
  { block: "Spin around", phrase: "spin around", category: "motion" },
  { block: "Hide", phrase: "hide", category: "looks" },
  { block: "Grow bigger", phrase: "grow bigger", category: "looks" },
];

interface EventScript {
  event: EventChoice;
  actions: ActionChoice[];
}

const eventScriptSizes: Record<ComputingDifficulty, readonly number[]> = {
  1: [1, 1],
  2: [1, 1, 1],
  3: [2, 1, 1],
};

const buildEventScripts = (
  difficulty: ComputingDifficulty,
  random: () => number,
): EventScript[] => {
  const sizes = eventScriptSizes[difficulty];
  const events = shuffleValues(eventChoices, random);
  const actions = shuffleValues(actionChoices, random);
  let actionsUsed = 0;
  return sizes.map((size, index) => {
    const scriptActions = actions.slice(actionsUsed, actionsUsed + size);
    actionsUsed += size;
    return { event: events[index], actions: scriptActions };
  });
};

const buildEventBlocks = (scripts: readonly EventScript[]): CodeBlock[] =>
  scripts.flatMap(({ event, actions }) => [
    { text: event.block, category: "event" },
    ...actions.map(({ block, category }) => ({ text: block, category })),
  ]);

const buildEventExplorerQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  const scripts = buildEventScripts(difficulty, random);
  const scene = {
    kind: "code-stack" as const,
    blocks: buildEventBlocks(scripts),
  };
  const script = pickOne(scripts, random);
  const askStyles = ["what", "which", ...(difficulty === 3 ? ["count"] : [])];
  const askStyle = pickOne(askStyles, random);
  if (askStyle === "which") {
    const action = pickOne(script.actions, random);
    return {
      ask: `Which event makes the sprite ${action.phrase}?`,
      scene,
      answer: script.event.block,
      distractors: eventChoices
        .map(({ block }) => block)
        .filter((block) => block !== script.event.block),
      hint: "Find the action, then look up to the event block above it.",
    };
  }
  if (askStyle === "count") {
    const count = script.actions.length;
    return {
      ask: `How many actions happen when ${script.event.phrase}?`,
      scene,
      answer: String(count),
      distractors: buildNumberDistractors(count, 0),
      hint: "Count the blocks under that event, stopping at the next event block.",
    };
  }
  const position = pickWholeNumber(0, script.actions.length - 1, random);
  const answer = script.actions[position].block;
  const others = actionChoices
    .map(({ block }) => block)
    .filter((block) => block !== answer);
  const sameScript = script.actions
    .map(({ block }) => block)
    .filter((block) => block !== answer);
  const shown = scripts
    .flatMap(({ actions }) => actions.map(({ block }) => block))
    .filter((block) => block !== answer && !sameScript.includes(block));
  const distractors = [
    ...new Set([...sameScript, ...shown, ...shuffleValues(others, random)]),
  ].slice(0, 4);
  const ordinal = position === 0 ? "first" : "second";
  return {
    ask:
      script.actions.length === 1
        ? `What happens when ${script.event.phrase}?`
        : `What happens ${ordinal} when ${script.event.phrase}?`,
    scene,
    answer,
    distractors,
    hint: "Find that event block. The actions under it are what happen.",
  };
};

const eventExplorer = defineComputingGame({
  gameType: "event-explorer",
  title: "Event Explorer",
  skillId: "computing.events-and-actions",
  instruction: "Which event makes each action happen?",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildEventExplorerQuestion(difficulty, random),
      ),
  },
});

const breakItDown = defineComputingGame({
  gameType: "break-it-down",
  title: "Break It Down",
  skillId: "computing.decompose-a-task",
  instruction: "Break the big job into smaller parts.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Planning a party: which part is missing?",
        scene: {
          kind: "story-cards",
          cards: ["Send invites", "Buy food", "?", "Plan games"],
          missingIndex: 2,
        },
        answer: "Decorate the room",
        distractors: ["Do maths homework", "Wash the car", "Go to bed early"],
        hint: "Which card is a job you would do to get ready for a party?",
      },
      {
        ask: "Which card is NOT part of cleaning the classroom?",
        scene: {
          kind: "story-cards",
          cards: [
            "Tidy the books",
            "Wipe the tables",
            "Eat a sandwich",
            "Sweep the floor",
          ],
        },
        answer: "Eat a sandwich",
        distractors: ["Tidy the books", "Wipe the tables", "Sweep the floor"],
        hint: "Which card does not help the room get clean?",
      },
      {
        ask: "Which card is the big task the others are part of?",
        scene: {
          kind: "story-cards",
          cards: [
            "Pack a bag",
            "Buy sun cream",
            "Go on holiday",
            "Book a hotel",
          ],
        },
        answer: "Go on holiday",
        distractors: ["Pack a bag", "Buy sun cream", "Book a hotel"],
        hint: "Which card is the whole job, not a small piece of it?",
      },
      {
        ask: "Making a computer game: which part is missing?",
        scene: {
          kind: "story-cards",
          cards: ["Draw characters", "?", "Add sounds", "Test it works"],
          missingIndex: 1,
        },
        answer: "Write the rules",
        distractors: ["Bake a cake", "Walk the dog", "Water the plants"],
        hint: "Which card is a job you need for making a game?",
      },
      {
        ask: "What does decomposing a task mean?",
        scene: {
          kind: "story-cards",
          cards: ["Big task", "Part 1", "Part 2", "Part 3"],
          highlightIndex: 0,
        },
        answer: "Breaking it into parts",
        distractors: [
          "Doing it all at once",
          "Giving up on it",
          "Making it bigger",
        ],
        hint: "Look at how the big card turns into lots of little cards.",
      },
      {
        ask: "Why do we break a big task into smaller parts?",
        scene: {
          kind: "story-cards",
          cards: [
            "Put on a play",
            "Learn lines",
            "Make costumes",
            "Paint a set",
          ],
          highlightIndex: 0,
        },
        answer: "Small parts are easier",
        distractors: [
          "To make it take longer",
          "So nobody can help",
          "To skip the hard bits",
        ],
        hint: "Is it easier to solve one big problem or lots of small ones?",
      },
      {
        ask: "Planting a garden: which card is a smaller part of the task?",
        scene: {
          kind: "story-cards",
          cards: ["Plant a garden", "Dig the soil", "?"],
          missingIndex: 2,
          highlightIndex: 0,
        },
        answer: "Sow the seeds",
        distractors: ["Paint your nails", "Fly a kite", "Read a comic"],
        hint: "Which job would you do when making a garden?",
      },
      {
        ask: "Writing a story: which part is missing?",
        scene: {
          kind: "story-cards",
          cards: ["Beginning", "?", "Ending"],
          missingIndex: 1,
        },
        answer: "Middle",
        distractors: ["Front cover", "Back cover", "Page numbers"],
        hint: "Every story has three main parts.",
      },
      {
        ask: "Which card is NOT part of getting ready for sports day?",
        scene: {
          kind: "story-cards",
          cards: [
            "Mark the track",
            "Find the cones",
            "Make prizes",
            "Paint a mural",
          ],
        },
        answer: "Paint a mural",
        distractors: ["Mark the track", "Find the cones", "Make prizes"],
        hint: "Which card has nothing to do with races?",
      },
      {
        ask: "Your team splits the job into parts. What does that let you do?",
        scene: {
          kind: "story-cards",
          cards: ["Build a model", "Ali: base", "Bea: walls", "Cal: roof"],
          highlightIndex: 0,
        },
        answer: "Share the work",
        distractors: [
          "Do it all alone",
          "Skip the hard part",
          "Finish nothing",
        ],
        hint: "Look at who is doing each part.",
      },
      {
        ask: "Making a class quiz: which part is missing?",
        scene: {
          kind: "story-cards",
          cards: ["Pick a topic", "?", "Find the answers", "Ask the class"],
          missingIndex: 1,
        },
        answer: "Write the questions",
        distractors: ["Tidy the cupboard", "Feed the fish", "Go out to play"],
        hint: "What do you need before you can find the answers?",
      },
      {
        ask: "Which is the best way to tackle a big job?",
        scene: {
          kind: "story-cards",
          cards: ["Make a robot", "Plan it", "Build it", "Program it"],
          highlightIndex: 0,
        },
        answer: "One small part at a time",
        distractors: [
          "All parts at once",
          "Start with the end",
          "Guess and hope",
        ],
        hint: "Look how the big card is split up.",
      },
    ],
  },
});

interface BugHuntAction {
  block: string;
  noun: string;
  category: CodeCategory;
}

const bugHuntActions: readonly BugHuntAction[] = [
  { block: "Jump", noun: "jump", category: "motion" },
  { block: "Hop", noun: "hop", category: "motion" },
  { block: "Spin", noun: "spin", category: "motion" },
  { block: "Clap", noun: "clap", category: "sound" },
  { block: "Beep", noun: "beep", category: "sound" },
  { block: "Wave", noun: "wave", category: "looks" },
  { block: "Nod", noun: "nod", category: "looks" },
];

const bugHuntLengths: Record<ComputingDifficulty, number> = {
  1: 3,
  2: 4,
  3: 5,
};

const bugHuntStart = "When flag clicked";

const describeTimes = (block: string, count: number): string =>
  `${block} ${String(count)} ${count === 1 ? "time" : "times"}`;

const describeGoalCount = (noun: string, count: number): string =>
  `${String(count)} ${count === 1 ? noun : `${noun}s`}`;

const buildBugHuntBlocks = (
  texts: readonly string[],
  actions: readonly BugHuntAction[],
): CodeBlock[] => [
  { text: bugHuntStart, category: "event" },
  ...texts.map((text, index) => ({ text, category: actions[index].category })),
];

const buildWrongPlaceQuestion = (
  actions: readonly BugHuntAction[],
  random: () => number,
): ComputingQuestion | undefined => {
  const order = buildDisplacedOrder(actions.length, random);
  if (order === undefined) {
    return undefined;
  }
  const [wrongSpot] = findFixableSpots(order);
  const shownActions = order.map((position) => actions[position]);
  const texts = shownActions.map(({ block }) => block);
  const goal = actions.map(({ block }) => block).join(", ");
  return {
    ask: `Goal: ${goal}. Which block is in the wrong place?`,
    scene: {
      kind: "code-stack",
      blocks: buildBugHuntBlocks(texts, shownActions),
      gadget: { kind: "robot" },
    },
    answer: texts[wrongSpot],
    distractors: [
      ...texts.filter((_, index) => index !== wrongSpot),
      bugHuntStart,
    ],
    hint: "Read the goal and the blocks side by side. Which one has moved?",
  };
};

const buildWrongNumberQuestion = (
  actions: readonly BugHuntAction[],
  random: () => number,
): ComputingQuestion => {
  const counts = actions.map(() => pickWholeNumber(1, 4, random));
  const bugSpot = pickWholeNumber(0, actions.length - 1, random);
  const wrongCount = pickOne(
    [1, 2, 3, 4, 5].filter((count) => count !== counts[bugSpot]),
    random,
  );
  const shownCounts = counts.with(bugSpot, wrongCount);
  const texts = actions.map(({ block }, index) =>
    describeTimes(block, shownCounts[index]),
  );
  const goal = actions
    .map(({ noun }, index) => describeGoalCount(noun, counts[index]))
    .join(", ");
  return {
    ask: `Goal: ${goal}. Which block has the wrong number?`,
    scene: {
      kind: "code-stack",
      blocks: buildBugHuntBlocks(texts, actions),
      gadget: { kind: "robot" },
    },
    answer: texts[bugSpot],
    distractors: [
      ...texts.filter((_, index) => index !== bugSpot),
      bugHuntStart,
    ],
    hint: "Check each number against the goal, one block at a time.",
  };
};

const buildCodeBugHuntQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const actions = shuffleValues(bugHuntActions, random).slice(
    0,
    bugHuntLengths[difficulty],
  );
  return random() < 0.5
    ? buildWrongPlaceQuestion(actions, random)
    : buildWrongNumberQuestion(actions, random);
};

const codeBugHunt = defineComputingGame({
  gameType: "code-bug-hunt",
  title: "Code Bug Hunt",
  skillId: "computing.debug-a-sequence",
  instruction: "Find the block that does not match the goal.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildCodeBugHuntQuestion(difficulty, random)),
  },
});

const loginScreen = {
  kind: "tablet-screen" as const,
  title: "Log in",
  screen: {
    app: "login" as const,
    lines: ["Username: star_kid", "Password: ********", "[ Log in ]"],
  },
};

const passwordPower = defineComputingGame({
  gameType: "password-power",
  title: "Password Power",
  skillId: "computing.strong-passwords",
  instruction: "Choose the strongest password or the safest thing to do.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which is the strongest password?",
        scene: {
          kind: "tablet-screen",
          title: "New password",
          screen: {
            app: "login",
            lines: ["Make a password", "Password: ____"],
          },
        },
        answer: "Purple!Tiger7Jumps",
        distractors: ["password", "Sam2015", "123456", "football"],
        hint: "Strong passwords are long and mix letters, numbers and symbols.",
      },
      {
        ask: "Which is the strongest password?",
        scene: {
          kind: "tablet-screen",
          title: "New password",
          screen: {
            app: "login",
            lines: ["Make a password", "Password: ____"],
          },
        },
        answer: "Rain#Boots42Cloud",
        distractors: ["abcdef", "Ella", "qwerty", "1111"],
        hint: "Look for the longest one with a mix of letters, numbers and symbols.",
      },
      {
        ask: "Which is the weakest password?",
        scene: {
          kind: "tablet-screen",
          title: "New password",
          screen: {
            app: "login",
            lines: ["Make a password", "Password: ____"],
          },
        },
        answer: "12345",
        distractors: ["Moon$Jelly8Kite", "Blue7Fox!River", "Snow&Lamp29Hill"],
        hint: "Which one could someone guess straight away?",
      },
      {
        ask: "Who can you share your password with?",
        scene: loginScreen,
        answer: "Your parent or carer",
        distractors: [
          "Your best friend",
          "A player in a game",
          "Anyone who asks",
        ],
        hint: "Only someone who looks after you at home.",
      },
      {
        ask: "A friend found out your password. What should you do?",
        scene: loginScreen,
        answer: "Tell an adult and change it",
        distractors: ["Ignore it", "Tell more friends", "Write it on the wall"],
        hint: "A grown-up can help you make a new one.",
      },
      {
        ask: "Why is Max2016 a weak password?",
        scene: {
          kind: "tablet-screen",
          title: "Check password",
          screen: {
            app: "login",
            lines: ["Password: Max2016", "Strength: weak"],
          },
        },
        answer: "It is a name and a year",
        distractors: [
          "It has a capital letter",
          "It has numbers in it",
          "It is too long",
        ],
        hint: "Could someone who knows you guess it?",
      },
      {
        ask: "Which change makes a password stronger?",
        scene: {
          kind: "tablet-screen",
          title: "Check password",
          screen: { app: "login", lines: ["Password: cat", "Strength: weak"] },
        },
        answer: "Make it much longer",
        distractors: ["Use your name", "Make it shorter", "Use 1234"],
        hint: "Longer passwords are harder to guess.",
      },
      {
        ask: "A message says to send your password to win coins. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Messages",
          screen: {
            app: "chat",
            messages: [{ from: "CoinBot", text: "Send your password!" }],
          },
        },
        answer: "Don't reply, tell an adult",
        distractors: ["Send it quickly", "Send half of it", "Send a friend's"],
        hint: "Real games never ask for your password.",
      },
      {
        ask: "You finish on a shared school computer. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Class laptop",
          screen: {
            app: "login",
            lines: ["Logged in: star_kid", "[ Log out ]"],
          },
        },
        answer: "Log out",
        distractors: [
          "Leave it logged in",
          "Write your password down",
          "Tell others your password",
        ],
        hint: "Make sure nobody else can use your account.",
      },
      {
        ask: "Where is the best place to keep your password?",
        scene: loginScreen,
        answer: "In your head",
        distractors: [
          "On a note on the screen",
          "In a class chat",
          "On your school bag",
        ],
        hint: "Somewhere nobody else can see it.",
      },
      {
        ask: "Should you use the same password for everything?",
        scene: loginScreen,
        answer: "No, use different ones",
        distractors: [
          "Yes, it is easier",
          "Yes, if it is short",
          "Only for games",
        ],
        hint: "If someone learns one, what could they get into?",
      },
    ],
  },
});

const inputOutputChoices = ["Input", "Output", "Input and output", "Neither"];

const listInputOutputDistractors = (answer: string): string[] =>
  inputOutputChoices.filter((choice) => choice !== answer);

const inputOutputAsk = "Is this an input device, an output device, or both?";

const inOrOut = defineComputingGame({
  gameType: "in-or-out",
  title: "In or Out?",
  skillId: "computing.inputs-and-outputs",
  instruction: "Is it an input, an output, or both?",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: inputOutputAsk,
        scene: { kind: "device", device: "keyboard", caption: "Keyboard" },
        answer: "Input",
        distractors: listInputOutputDistractors("Input"),
        hint: "Does it send information into the computer, or give it out?",
      },
      {
        ask: inputOutputAsk,
        scene: { kind: "device", device: "mouse", caption: "Mouse" },
        answer: "Input",
        distractors: listInputOutputDistractors("Input"),
        hint: "When you move and click it, which way does the information go?",
      },
      {
        ask: inputOutputAsk,
        scene: { kind: "device", device: "microphone", caption: "Microphone" },
        answer: "Input",
        distractors: listInputOutputDistractors("Input"),
        hint: "It picks up your voice. Where does the sound go?",
      },
      {
        ask: inputOutputAsk,
        scene: { kind: "device", device: "webcam", caption: "Webcam" },
        answer: "Input",
        distractors: listInputOutputDistractors("Input"),
        hint: "It sends pictures of you to the computer.",
      },
      {
        ask: inputOutputAsk,
        scene: { kind: "device", device: "printer", caption: "Printer" },
        answer: "Output",
        distractors: listInputOutputDistractors("Output"),
        hint: "Does it give you something from the computer?",
      },
      {
        ask: inputOutputAsk,
        scene: { kind: "device", device: "speaker", caption: "Speaker" },
        answer: "Output",
        distractors: listInputOutputDistractors("Output"),
        hint: "The sound comes out of the computer and into your ears.",
      },
      {
        ask: inputOutputAsk,
        scene: { kind: "device", device: "headphones", caption: "Headphones" },
        answer: "Output",
        distractors: listInputOutputDistractors("Output"),
        hint: "You listen with these. Which way does the sound travel?",
      },
      {
        ask: inputOutputAsk,
        scene: { kind: "device", device: "tablet", caption: "Touchscreen" },
        answer: "Input and output",
        distractors: listInputOutputDistractors("Input and output"),
        hint: "You touch the screen, and the screen shows you pictures.",
      },
      {
        ask: inputOutputAsk,
        scene: {
          kind: "device",
          device: "barcode-scanner",
          caption: "Scanner",
        },
        answer: "Input",
        distractors: listInputOutputDistractors("Input"),
        hint: "It reads the stripes on a packet and sends them to the till.",
      },
      {
        ask: "What does a microphone do?",
        scene: { kind: "device", device: "microphone" },
        answer: "Lets a computer hear sound",
        distractors: [
          "Puts work onto paper",
          "Plays music out loud",
          "Shows moving pictures",
        ],
        hint: "You speak into it.",
      },
      {
        ask: "What does a printer do?",
        scene: { kind: "device", device: "printer" },
        answer: "Puts work onto paper",
        distractors: [
          "Lets a computer hear sound",
          "Takes photos of you",
          "Moves the pointer",
        ],
        hint: "Think of what comes out of it.",
      },
      {
        ask: "A smart speaker hears you and talks back. What kind of device is it?",
        scene: { kind: "device", device: "smart-speaker" },
        answer: "Input and output",
        distractors: listInputOutputDistractors("Input and output"),
        hint: "It listens to you and it also makes sounds.",
      },
      {
        ask: "What does a webcam do?",
        scene: { kind: "device", device: "webcam" },
        answer: "Sends pictures to a computer",
        distractors: [
          "Puts work onto paper",
          "Plays music out loud",
          "Types letters",
        ],
        hint: "It points at your face during a video call.",
      },
    ],
  },
});

export const yearThreeComputingGames = [
  networkBuilder,
  frameByFrame,
  soundSequencer,
  branchExplorer,
  pageDesigner,
  eventExplorer,
  breakItDown,
  codeBugHunt,
  passwordPower,
  inOrOut,
] as const;
