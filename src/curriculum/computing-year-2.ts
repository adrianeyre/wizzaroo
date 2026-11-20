import {
  buildNumberDistractors,
  buildRandomPath,
  defineComputingGame,
  describeArrows,
  directions,
  followPath,
  isInsideGrid,
  isSameCell,
  moveCell,
  photoSubjects,
  pickOne,
  pickWholeNumber,
  shuffleValues,
  type ComputingDifficulty,
  type ComputingQuestion,
  type Direction,
  type GridCell,
  type PhotoFrameScene,
  type PixelGridScene,
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

const pickCell = (
  columns: number,
  rows: number,
  random: () => number,
): GridCell => ({
  column: pickWholeNumber(0, columns - 1, random),
  row: pickWholeNumber(0, rows - 1, random),
});

const listAllPaths = (length: number): Direction[][] =>
  length === 0
    ? [[]]
    : listAllPaths(length - 1).flatMap((path) =>
        directions.map((direction) => [...path, direction]),
      );

const findEnd = (start: GridCell, path: readonly Direction[]): GridCell =>
  followPath(start, path).at(-1) ?? start;

const isCellInList = (cell: GridCell, cells: readonly GridCell[]): boolean =>
  cells.some((other) => isSameCell(other, cell));

const findStepDistance = (first: GridCell, second: GridCell): number =>
  Math.abs(first.column - second.column) + Math.abs(first.row - second.row);

const pickFreeCells = (
  count: number,
  columns: number,
  rows: number,
  takenCells: readonly GridCell[],
  random: () => number,
): GridCell[] => {
  const freeCells = Array.from({ length: columns * rows }, (_, index) => ({
    column: index % columns,
    row: Math.floor(index / columns),
  })).filter((cell) => !isCellInList(cell, takenCells));
  return shuffleValues(freeCells, random).slice(0, count);
};

const techDetective = defineComputingGame({
  gameType: "tech-detective",
  title: "Tech Detective",
  skillId: "computing.technology-beyond-school",
  instruction: "Where is this technology used, and how does it help?",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Where would you find this?",
        scene: { kind: "device", device: "traffic-lights" },
        answer: "On a road",
        distractors: ["In a bathroom", "In a classroom", "In a fridge"],
        hint: "Think about where cars stop and go.",
      },
      {
        ask: "Where would you find this?",
        scene: { kind: "device", device: "barcode-scanner" },
        answer: "At a shop till",
        distractors: ["On a road", "In a bedroom", "In a garden"],
        hint: "Think about where you pay for things.",
      },
      {
        ask: "Where would you find this?",
        scene: { kind: "device", device: "washing-machine" },
        answer: "At home",
        distractors: ["On a road", "At a shop till", "In a park"],
        hint: "Think about where your clothes get washed.",
      },
      {
        ask: "Where would you find this?",
        scene: { kind: "device", device: "microwave" },
        answer: "In a kitchen",
        distractors: ["On a road", "In a bathroom", "In a park"],
        hint: "Think about where food gets cooked.",
      },
      {
        ask: "How do traffic lights help us?",
        scene: { kind: "device", device: "traffic-lights" },
        answer: "Keep roads safe",
        distractors: ["Wash clothes", "Heat up food", "Play music"],
      },
      {
        ask: "How does a barcode scanner help?",
        scene: { kind: "device", device: "barcode-scanner" },
        answer: "Reads the price",
        distractors: ["Cooks dinner", "Takes photos", "Keeps roads safe"],
        hint: "It beeps when it reads the stripes on a packet.",
      },
      {
        ask: "What does this help us do?",
        scene: { kind: "device", device: "washing-machine" },
        answer: "Wash clothes",
        distractors: ["Heat up food", "Print pictures", "Tell the time"],
      },
      {
        ask: "What does this help us do?",
        scene: { kind: "device", device: "microwave" },
        answer: "Heat up food",
        distractors: ["Wash clothes", "Keep roads safe", "Read prices"],
      },
      {
        ask: "What does a thermometer help us do?",
        scene: { kind: "device", device: "thermometer" },
        answer: "Check how hot it is",
        distractors: ["Play music", "Wash dishes", "Make phone calls"],
      },
      {
        ask: "What can a smart watch do?",
        scene: { kind: "device", device: "smart-watch" },
        answer: "Tell the time",
        distractors: ["Wash clothes", "Cook food", "Print paper"],
      },
      {
        ask: "What can a smart speaker do when you ask?",
        scene: { kind: "device", device: "smart-speaker" },
        answer: "Play music",
        distractors: ["Wash clothes", "Cook toast", "Mend a bike"],
      },
      {
        ask: "Which of these uses a computer inside?",
        scene: { kind: "device", device: "washing-machine" },
        answer: "A washing machine",
        distractors: ["A wooden spoon", "A paper book", "A pencil"],
        hint: "Look for the thing with buttons and a screen.",
      },
      {
        ask: "Which of these is technology?",
        scene: { kind: "device", device: "traffic-lights" },
        answer: "Traffic lights",
        distractors: ["A tree", "A puddle", "A rock"],
        hint: "Technology is made by people to help us. It often has a computer inside.",
      },
    ],
  },
});

type PhotoAskStyle =
  "orientation" | "light" | "focus" | "tilt" | "fix" | "shot";

const photoAskStyles: Record<ComputingDifficulty, readonly PhotoAskStyle[]> = {
  1: ["orientation", "light"],
  2: ["orientation", "light", "focus", "tilt"],
  3: ["fix", "shot", "focus", "tilt"],
};

const buildGoodPhoto = (random: () => number): PhotoFrameScene => ({
  kind: "photo-frame",
  subject: pickOne(photoSubjects, random),
  orientation: random() < 0.5 ? "landscape" : "portrait",
  light: "good",
  focus: "sharp",
  tilt: "level",
  shot: pickOne(["wide", "medium", "close-up"] as const, random),
});

const photoLightAnswers: Record<PhotoFrameScene["light"], string> = {
  dark: "Too dark",
  bright: "Too bright",
  good: "Just right",
};

const photoFixes = [
  { problem: "dark", fix: "Turn on more light" },
  { problem: "bright", fix: "Move out of bright sun" },
  { problem: "blurry", fix: "Hold the camera still" },
  { problem: "crooked", fix: "Hold the camera straight" },
  { problem: "none", fix: "Nothing needs fixing" },
] as const;

const buildPhotoFixScene = (
  problem: (typeof photoFixes)[number]["problem"],
  goodPhoto: PhotoFrameScene,
): PhotoFrameScene => {
  switch (problem) {
    case "dark":
      return { ...goodPhoto, light: "dark" };
    case "bright":
      return { ...goodPhoto, light: "bright" };
    case "blurry":
      return { ...goodPhoto, focus: "blurry" };
    case "crooked":
      return { ...goodPhoto, tilt: "crooked" };
    case "none":
      return goodPhoto;
  }
};

const buildPhotoStudioQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  const goodPhoto = buildGoodPhoto(random);
  const style = pickOne(photoAskStyles[difficulty], random);
  if (style === "orientation") {
    const answer =
      goodPhoto.orientation === "landscape" ? "Landscape" : "Portrait";
    return {
      ask: "Is this photo landscape or portrait?",
      scene: goodPhoto,
      answer,
      distractors: [
        answer === "Landscape" ? "Portrait" : "Landscape",
        "Upside down",
        "Back to front",
      ],
      hint: "Landscape is wider than it is tall. Portrait is taller than it is wide.",
    };
  }
  if (style === "light") {
    const light = pickOne(["dark", "good", "bright"] as const, random);
    const answer = photoLightAnswers[light];
    return {
      ask: "Is this photo too dark, too bright or just right?",
      scene: { ...goodPhoto, light },
      answer,
      distractors: [
        ...Object.values(photoLightAnswers).filter(
          (choice) => choice !== answer,
        ),
        "Blurry",
      ],
      hint: "Can you see everything clearly, or is it too shadowy or too glary?",
    };
  }
  if (style === "focus") {
    const focus = random() < 0.5 ? "sharp" : "blurry";
    const answer = focus === "sharp" ? "Sharp" : "Blurry";
    return {
      ask: "Is this photo sharp or blurry?",
      scene: { ...goodPhoto, focus },
      answer,
      distractors: [
        answer === "Sharp" ? "Blurry" : "Sharp",
        "Too dark",
        "Too bright",
      ],
      hint: "Look at the edges. Are they clear or fuzzy?",
    };
  }
  if (style === "tilt") {
    const tilt = random() < 0.5 ? "level" : "crooked";
    const answer = tilt === "level" ? "Straight" : "Crooked";
    return {
      ask: "Is this photo straight or crooked?",
      scene: { ...goodPhoto, tilt },
      answer,
      distractors: [
        answer === "Straight" ? "Crooked" : "Straight",
        "Too dark",
        "Blurry",
      ],
      hint: "Look at the bottom of the photo. Is it flat or sloping?",
    };
  }
  if (style === "shot") {
    const shot = random() < 0.5 ? "wide" : "close-up";
    const answer = shot === "wide" ? "Wide shot" : "Close-up";
    return {
      ask: "Is this a close-up or a wide shot?",
      scene: { ...goodPhoto, shot },
      answer,
      distractors: [
        answer === "Wide shot" ? "Close-up" : "Wide shot",
        "Too dark",
        "Blurry",
      ],
      hint: "A close-up fills the photo with the subject. A wide shot shows lots around it.",
    };
  }
  const chosen = pickOne(photoFixes, random);
  return {
    ask: "How can you make this photo better?",
    scene: buildPhotoFixScene(chosen.problem, goodPhoto),
    answer: chosen.fix,
    distractors: photoFixes
      .filter(({ fix }) => fix !== chosen.fix)
      .map(({ fix }) => fix),
    hint: "Is it too dark, too bright, blurry or crooked? Or is it already good?",
  };
};

const photoStudio = defineComputingGame({
  gameType: "photo-studio",
  title: "Photo Studio",
  skillId: "computing.taking-photos",
  instruction: "Look at the photo, then choose the best answer.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildPhotoStudioQuestion(difficulty, random),
      ),
  },
});

const robotRouteSizes: Record<ComputingDifficulty, number> = {
  1: 4,
  2: 5,
  3: 6,
};

const robotRouteLengths: Record<ComputingDifficulty, readonly number[]> = {
  1: [2],
  2: [3],
  3: [4, 5],
};

const robotRouteObstacleCounts: Record<ComputingDifficulty, number> = {
  1: 1,
  2: 2,
  3: 4,
};

const countDifferentSteps = (
  first: readonly Direction[],
  second: readonly Direction[],
): number =>
  first.filter((direction, index) => direction !== second[index]).length;

const isBacktracking = (
  start: GridCell,
  path: readonly Direction[],
): boolean => {
  const visited = followPath(start, path);
  return visited.some((cell, index) =>
    isCellInList(cell, visited.slice(0, index)),
  );
};

const buildRobotRouteQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const size = robotRouteSizes[difficulty];
  const stepCount = pickOne(robotRouteLengths[difficulty], random);
  const robot = pickCell(size, size, random);
  const path = buildRandomPath(robot, stepCount, size, size, random);
  const goal = findEnd(robot, path);
  if (path.length < stepCount || findStepDistance(robot, goal) !== stepCount) {
    return undefined;
  }
  const obstacles = pickFreeCells(
    robotRouteObstacleCounts[difficulty],
    size,
    size,
    followPath(robot, path),
    random,
  );
  const isSafeAndMissesStar = (candidate: readonly Direction[]): boolean => {
    const visited = followPath(robot, candidate);
    return visited.every(
      (cell, index) =>
        isInsideGrid(cell, size, size) &&
        !isCellInList(cell, obstacles) &&
        (index === 0 || !isSameCell(cell, goal)),
    );
  };
  const scoreCandidate = (candidate: readonly Direction[]): number => {
    const backtrackPenalty = isBacktracking(robot, candidate) ? stepCount : 0;
    return countDifferentSteps(candidate, path) + backtrackPenalty;
  };
  const nearMisses = shuffleValues(
    listAllPaths(stepCount).filter(isSafeAndMissesStar),
    random,
  ).toSorted((first, second) => scoreCandidate(first) - scoreCandidate(second));
  if (nearMisses.length < 3) {
    return undefined;
  }
  return {
    ask: "Which program takes Bolt to the star without hitting a rock?",
    scene: {
      kind: "robot-grid",
      columns: size,
      rows: size,
      robot,
      goal,
      obstacles,
    },
    answer: describeArrows(path),
    distractors: shuffleValues(nearMisses.slice(0, 5), random).map(
      describeArrows,
    ),
    hint: "Try each arrow with your finger, one square at a time. Do you land on the star?",
  };
};

const robotRoute = defineComputingGame({
  gameType: "robot-route",
  title: "Robot Route",
  skillId: "computing.plan-a-route",
  instruction: "Pick the arrows that reach the star and miss the rocks.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildRobotRouteQuestion(difficulty, random)),
  },
});

const pictogramTopics = [
  {
    title: "Favourite fruit",
    noun: "fruit",
    labels: ["Apple", "Banana", "Grape", "Orange", "Pear"],
  },
  {
    title: "Favourite pets",
    noun: "pet",
    labels: ["Cat", "Dog", "Fish", "Rabbit", "Hamster"],
  },
  {
    title: "Favourite colours",
    noun: "colour",
    labels: ["Red", "Blue", "Green", "Yellow", "Purple"],
  },
  {
    title: "Favourite sports",
    noun: "sport",
    labels: ["Football", "Swimming", "Tennis", "Netball", "Running"],
  },
] as const;

const pictogramRanges: Record<ComputingDifficulty, [number, number]> = {
  1: [1, 6],
  2: [1, 10],
  3: [2, 12],
};

type PictogramAskStyle = "most" | "least" | "count" | "more" | "together";

const pictogramAskStyles: Record<
  ComputingDifficulty,
  readonly PictogramAskStyle[]
> = {
  1: ["most", "least", "count"],
  2: ["most", "least", "count", "more"],
  3: ["more", "together", "least", "count"],
};

const buildPictogramQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  const topic = pickOne(pictogramTopics, random);
  const [smallest, largest] = pictogramRanges[difficulty];
  const allValues = Array.from(
    { length: largest - smallest + 1 },
    (_, index) => smallest + index,
  );
  const values = shuffleValues(allValues, random).slice(0, 4);
  const labels = shuffleValues(topic.labels, random).slice(0, 4);
  const bars = labels.map((label, index) => ({ label, value: values[index] }));
  const scene = {
    kind: "bar-chart",
    title: topic.title,
    style: "pictogram",
    bars,
  } as const;
  const byValue = bars.toSorted((first, second) => second.value - first.value);
  const style = pickOne(pictogramAskStyles[difficulty], random);
  if (style === "most" || style === "least") {
    const chosen = style === "most" ? byValue[0] : byValue[byValue.length - 1];
    return {
      ask: `Which ${topic.noun} is the ${style} popular?`,
      scene,
      answer: chosen.label,
      distractors: labels.filter((label) => label !== chosen.label),
      hint:
        style === "most"
          ? "Find the row with the most pictures."
          : "Find the row with the fewest pictures.",
    };
  }
  if (style === "count") {
    const chosen = pickOne(bars, random);
    return {
      ask: `How many children chose ${chosen.label}?`,
      scene,
      answer: String(chosen.value),
      distractors: buildNumberDistractors(chosen.value, 0),
      hint: "Each picture is one child. Count the pictures carefully.",
    };
  }
  const [first, second] = shuffleValues(bars, random);
  if (style === "together") {
    const total = first.value + second.value;
    return {
      ask: `How many children chose ${first.label} or ${second.label} altogether?`,
      scene,
      answer: String(total),
      distractors: buildNumberDistractors(total, 0),
      hint: "Count both rows, then add them together.",
    };
  }
  const [bigger, smaller] =
    first.value > second.value ? [first, second] : [second, first];
  const difference = bigger.value - smaller.value;
  return {
    ask: `How many more children chose ${bigger.label} than ${smaller.label}?`,
    scene,
    answer: String(difference),
    distractors: buildNumberDistractors(difference, 0),
    hint: "Count both rows. How many extra pictures does the longer row have?",
  };
};

const pictogramParty = defineComputingGame({
  gameType: "pictogram-party",
  title: "Pictogram Party",
  skillId: "computing.pictograms",
  instruction: "Read the pictogram to find the answer.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildPictogramQuestion(difficulty, random),
      ),
  },
});

const musicInstruments = [
  { name: "Drum", code: "r" },
  { name: "Clap", code: "y" },
  { name: "Bell", code: "b" },
  { name: "Shaker", code: "g" },
] as const;

const musicBeatCounts: Record<ComputingDifficulty, number> = {
  1: 4,
  2: 6,
  3: 8,
};

type MusicAskStyle =
  | "count-instrument"
  | "who-on-beat"
  | "busiest-beat"
  | "count-beat"
  | "busiest-instrument";

const musicAskStyles: Record<ComputingDifficulty, readonly MusicAskStyle[]> = {
  1: ["count-instrument", "who-on-beat"],
  2: ["count-instrument", "who-on-beat", "busiest-beat", "count-beat"],
  3: ["count-instrument", "busiest-beat", "count-beat", "busiest-instrument"],
};

const describeBeat = (beatIndex: number): string =>
  `Beat ${String(beatIndex + 1)}`;

const findOnlyLargest = (values: readonly number[]): number | undefined => {
  const largest = Math.max(...values);
  const largestIndexes = values.flatMap((value, index) =>
    value === largest ? [index] : [],
  );
  return largestIndexes.length === 1 ? largestIndexes[0] : undefined;
};

const buildMusicMakerQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const beatCount = musicBeatCounts[difficulty];
  const beatIndexes = Array.from({ length: beatCount }, (_, index) => index);
  const plays = musicInstruments.map(() =>
    beatIndexes.map(() => random() < 0.45),
  );
  const rows = musicInstruments.map(({ code }, rowIndex) =>
    plays[rowIndex].map((isPlaying) => (isPlaying ? code : ".")).join(""),
  );
  const scene: PixelGridScene = {
    kind: "pixel-grid",
    frames: [rows],
    rowLabels: musicInstruments.map(({ name }) => name),
  };
  const instrumentNames = musicInstruments.map(({ name }) => name);
  const instrumentTotals = plays.map(
    (row) => row.filter((isPlaying) => isPlaying).length,
  );
  const beatTotals = beatIndexes.map(
    (beatIndex) => plays.filter((row) => row[beatIndex]).length,
  );
  const beatNames = beatIndexes.map(describeBeat);
  const style = pickOne(musicAskStyles[difficulty], random);
  if (style === "count-instrument") {
    const rowIndex = pickWholeNumber(0, musicInstruments.length - 1, random);
    const total = instrumentTotals[rowIndex];
    return {
      ask: `How many times does the ${instrumentNames[rowIndex]} play?`,
      scene,
      answer: String(total),
      distractors: buildNumberDistractors(total, 0),
      hint: "Follow that row and count the coloured squares.",
    };
  }
  if (style === "count-beat") {
    const beatIndex = pickOne(beatIndexes, random);
    const total = beatTotals[beatIndex];
    return {
      ask: `How many sounds play on beat ${String(beatIndex + 1)}?`,
      scene,
      answer: String(total),
      distractors: buildNumberDistractors(total, 0),
      hint: "Count the columns from the left, then count the coloured squares going down.",
    };
  }
  if (style === "who-on-beat") {
    const soloBeats = beatIndexes.filter(
      (beatIndex) => beatTotals[beatIndex] === 1,
    );
    if (soloBeats.length === 0) {
      return undefined;
    }
    const beatIndex = pickOne(soloBeats, random);
    const playerIndex = plays.findIndex((row) => row[beatIndex]);
    const answer = instrumentNames[playerIndex];
    return {
      ask: `Which instrument plays on beat ${String(beatIndex + 1)}?`,
      scene,
      answer,
      distractors: instrumentNames.filter((name) => name !== answer),
      hint: "Count the columns from the left. Which row has a coloured square there?",
    };
  }
  if (style === "busiest-beat") {
    const busiestIndex = findOnlyLargest(beatTotals);
    if (busiestIndex === undefined) {
      return undefined;
    }
    return {
      ask: "Which beat has the most sounds playing at once?",
      scene,
      answer: beatNames[busiestIndex],
      distractors: shuffleValues(
        beatNames.filter((_, index) => index !== busiestIndex),
        random,
      ).slice(0, 4),
      hint: "Look down each column. Which one has the most coloured squares?",
    };
  }
  const busiestIndex = findOnlyLargest(instrumentTotals);
  if (busiestIndex === undefined) {
    return undefined;
  }
  return {
    ask: "Which instrument plays the most times?",
    scene,
    answer: instrumentNames[busiestIndex],
    distractors: instrumentNames.filter((_, index) => index !== busiestIndex),
    hint: "Count the coloured squares in each row.",
  };
};

const musicMaker = defineComputingGame({
  gameType: "music-maker",
  title: "Music Maker",
  skillId: "computing.digital-music",
  instruction: "Read the beat grid to find the answer.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildMusicMakerQuestion(difficulty, random)),
  },
});

const quizCoder = defineComputingGame({
  gameType: "quiz-coder",
  title: "Quiz Coder",
  skillId: "computing.program-a-quiz",
  instruction: "Read the blocks. How does the program start?",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which block starts this program?",
        scene: {
          kind: "code-stack",
          blocks: [
            { text: "When Bolt is tapped", category: "event" },
            { text: "Say What is 2 + 2?", category: "looks" },
            { text: "Wait 3", category: "control" },
            { text: "Say It is 4!", category: "looks" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "When Bolt is tapped",
        distractors: ["Say What is 2 + 2?", "Wait 3", "Say It is 4!"],
        hint: "A start block sits at the very top of the program.",
      },
      {
        ask: "What does Bolt do first when it is tapped?",
        scene: {
          kind: "code-stack",
          blocks: [
            { text: "When Bolt is tapped", category: "event" },
            { text: "Say What is 2 + 2?", category: "looks" },
            { text: "Wait 3", category: "control" },
            { text: "Say It is 4!", category: "looks" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "Says What is 2 + 2?",
        distractors: ["Says It is 4!", "Waits 3", "Jumps up"],
        hint: "Read the block just under the start block.",
      },
      {
        ask: "What does Bolt say last?",
        scene: {
          kind: "code-stack",
          blocks: [
            { text: "When Bolt is tapped", category: "event" },
            { text: "Say What is 2 + 2?", category: "looks" },
            { text: "Wait 3", category: "control" },
            { text: "Say It is 4!", category: "looks" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "It is 4!",
        distractors: ["What is 2 + 2?", "Hello!", "Wait 3"],
        hint: "The block at the bottom happens last.",
      },
      {
        ask: "Why does Bolt wait before giving the answer?",
        scene: {
          kind: "code-stack",
          blocks: [
            { text: "When Bolt is tapped", category: "event" },
            { text: "Say Which is a fruit?", category: "looks" },
            { text: "Wait 3", category: "control", isHighlighted: true },
            { text: "Say An apple!", category: "looks" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "So you can think",
        distractors: ["So Bolt can sleep", "To end the quiz", "To start again"],
        hint: "What do you need time to do when someone asks a quiz question?",
      },
      {
        ask: "What kind of block is glowing?",
        scene: {
          kind: "code-stack",
          blocks: [
            {
              text: "When green flag clicked",
              category: "event",
              isHighlighted: true,
            },
            { text: "Say Hello!", category: "looks" },
            { text: "Move right 2", category: "motion" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "A start block",
        distractors: ["A move block", "A sound block", "A wait block"],
        hint: "This block is at the top. It waits for something to happen.",
      },
      {
        ask: "What makes this program start?",
        scene: {
          kind: "code-stack",
          blocks: [
            { text: "When green flag clicked", category: "event" },
            { text: "Say Hello!", category: "looks" },
            { text: "Move right 2", category: "motion" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "Clicking the green flag",
        distractors: ["Tapping Bolt", "Shouting at it", "Turning it over"],
        hint: "Read the top block carefully.",
      },
      {
        ask: "What happens after Bolt says Hello?",
        scene: {
          kind: "code-stack",
          blocks: [
            { text: "When green flag clicked", category: "event" },
            { text: "Say Hello!", category: "looks" },
            { text: "Move right 2", category: "motion" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "Bolt moves right 2",
        distractors: ["Bolt says Goodbye", "Bolt moves left 2", "Nothing"],
        hint: "Find the Say Hello block, then read the next block down.",
      },
      {
        ask: "Bolt should say the answer when tapped. Which block goes on top?",
        scene: {
          kind: "code-stack",
          blocks: [{ text: "Say The answer is 6!", category: "looks" }],
          gadget: { kind: "robot" },
        },
        answer: "When Bolt is tapped",
        distractors: ["Wait 3", "Move right 1", "Play a beep"],
        hint: "You need a start block that listens for a tap.",
      },
      {
        ask: "Which block plays a sound?",
        scene: {
          kind: "code-stack",
          blocks: [
            { text: "When Bolt is tapped", category: "event" },
            { text: "Say Well done!", category: "looks" },
            { text: "Play a cheer", category: "sound" },
            { text: "Jump", category: "motion" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "Play a cheer",
        distractors: ["When Bolt is tapped", "Say Well done!", "Jump"],
        hint: "Look for the block about something you can hear.",
      },
      {
        ask: "What does Bolt do after the cheer?",
        scene: {
          kind: "code-stack",
          blocks: [
            { text: "When Bolt is tapped", category: "event" },
            { text: "Say Well done!", category: "looks" },
            { text: "Play a cheer", category: "sound" },
            { text: "Jump", category: "motion" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "Jump",
        distractors: ["Say Well done!", "Spin round", "Start again"],
        hint: "Find the cheer block, then look just below it.",
      },
      {
        ask: "Bolt never moves. What is missing from the top?",
        scene: {
          kind: "code-stack",
          blocks: [
            { text: "Move right 3", category: "motion" },
            { text: "Say I made it!", category: "looks" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "A start block",
        distractors: ["A second move block", "A sound block", "A wait block"],
        hint: "Every program needs something at the top that tells it when to begin.",
      },
      {
        ask: "How many questions does Bolt ask in this quiz?",
        scene: {
          kind: "code-stack",
          blocks: [
            { text: "When Bolt is tapped", category: "event" },
            { text: "Say What is 5 + 1?", category: "looks" },
            { text: "Wait 3", category: "control" },
            { text: "Say What colour is grass?", category: "looks" },
            { text: "Wait 3", category: "control" },
          ],
          gadget: { kind: "robot" },
        },
        answer: "2",
        distractors: ["1", "3", "4", "5"],
        hint: "Count the blocks that end with a question mark.",
      },
    ],
  },
});

const debugTheDance = defineComputingGame({
  gameType: "debug-the-dance",
  title: "Debug the Dance",
  skillId: "computing.debug-an-algorithm",
  instruction: "Find the card that does not match the plan.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "The dance should be: clap, jump, clap, jump. Which card is the bug?",
        scene: { kind: "story-cards", cards: ["Clap", "Jump", "Clap", "Spin"] },
        answer: "Card 4",
        distractors: ["Card 1", "Card 2", "Card 3"],
        hint: "Check each card against the plan, one at a time.",
      },
      {
        ask: "The dance should be: hop, hop, spin, wave. Which card is the bug?",
        scene: { kind: "story-cards", cards: ["Hop", "Clap", "Spin", "Wave"] },
        answer: "Card 2",
        distractors: ["Card 1", "Card 3", "Card 4"],
        hint: "Check each card against the plan, one at a time.",
      },
      {
        ask: "The dance should be: stamp, clap, stamp, clap. Which card is the bug?",
        scene: {
          kind: "story-cards",
          cards: ["Clap", "Clap", "Stamp", "Clap"],
        },
        answer: "Card 1",
        distractors: ["Card 2", "Card 3", "Card 4"],
        hint: "Start with the very first card.",
      },
      {
        ask: "The dance should be: wave, spin, jump, bow. Which card is the bug?",
        scene: {
          kind: "story-cards",
          cards: ["Wave", "Spin", "Hop", "Bow"],
        },
        answer: "Card 3",
        distractors: ["Card 1", "Card 2", "Card 4"],
        hint: "Check each card against the plan, one at a time.",
      },
      {
        ask: "The dance should be: clap, jump, clap, jump. What should the glowing card say?",
        scene: {
          kind: "story-cards",
          cards: ["Clap", "Jump", "Wave", "Jump"],
          highlightIndex: 2,
        },
        answer: "Clap",
        distractors: ["Jump", "Wave", "Spin"],
        hint: "Count along the plan to the same place as the glowing card.",
      },
      {
        ask: "The dance should be: spin, wave, spin, wave. What should the glowing card say?",
        scene: {
          kind: "story-cards",
          cards: ["Spin", "Hop", "Spin", "Wave"],
          highlightIndex: 1,
        },
        answer: "Wave",
        distractors: ["Spin", "Hop", "Clap"],
        hint: "Count along the plan to the same place as the glowing card.",
      },
      {
        ask: "The dance should be: hop, clap, hop, clap, bow. What goes in the gap?",
        scene: {
          kind: "story-cards",
          cards: ["Hop", "Clap", "Hop", "Clap", "Bow"],
          missingIndex: 3,
        },
        answer: "Clap",
        distractors: ["Hop", "Bow", "Spin"],
        hint: "Count along the plan to the gap.",
      },
      {
        ask: "To brush teeth: wet brush, add paste, brush, rinse. Which card is the bug?",
        scene: {
          kind: "story-cards",
          cards: ["Wet the brush", "Add shampoo", "Brush teeth", "Rinse"],
        },
        answer: "Card 2",
        distractors: ["Card 1", "Card 3", "Card 4"],
        hint: "Read each card carefully. Would you put that in your mouth?",
      },
      {
        ask: "Making toast: bread in, wait, take out, add butter. What should the glowing card say?",
        scene: {
          kind: "story-cards",
          cards: ["Put bread in", "Wait", "Add butter", "Add butter"],
          highlightIndex: 2,
        },
        answer: "Take the toast out",
        distractors: ["Put bread in", "Wait", "Eat the plate"],
        hint: "What do you do with the toast before you butter it?",
      },
      {
        ask: "Bolt's plan: forward, forward, turn, forward. Which card is the bug?",
        scene: {
          kind: "story-cards",
          cards: ["Forward", "Back", "Turn", "Forward"],
        },
        answer: "Card 2",
        distractors: ["Card 1", "Card 3", "Card 4"],
        hint: "Check each card against the plan, one at a time.",
      },
      {
        ask: "The dance should be: jump, spin, jump, spin, bow. Which card is the bug?",
        scene: {
          kind: "story-cards",
          cards: ["Jump", "Spin", "Jump", "Spin", "Wave"],
        },
        answer: "Card 5",
        distractors: ["Card 2", "Card 3", "Card 4"],
        hint: "Check right to the end of the dance.",
      },
      {
        ask: "What do we call a mistake in an algorithm?",
        scene: {
          kind: "story-cards",
          cards: ["Clap", "Jump", "Clap", "Spin"],
          highlightIndex: 3,
        },
        answer: "A bug",
        distractors: ["A beetle", "A loop", "A robot"],
        hint: "Finding and fixing it is called debugging.",
      },
    ],
  },
});

const predictPathSizes: Record<ComputingDifficulty, number> = {
  1: 5,
  2: 6,
  3: 6,
};

const predictPathLengths: Record<ComputingDifficulty, readonly number[]> = {
  1: [3],
  2: [4, 5],
  3: [6],
};

const predictPathObstacleCounts: Record<ComputingDifficulty, number> = {
  1: 1,
  2: 2,
  3: 3,
};

const predictLetters = ["A", "B", "C", "D"];

const buildPredictThePathQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const size = predictPathSizes[difficulty];
  const stepCount = pickOne(predictPathLengths[difficulty], random);
  const robot = pickCell(size, size, random);
  const path = buildRandomPath(robot, stepCount, size, size, random);
  if (path.length < stepCount) {
    return undefined;
  }
  const visited = followPath(robot, path);
  const end = findEnd(robot, path);
  const lastDirection = path.at(-1) ?? "up";
  const slips = [
    findEnd(robot, path.slice(0, -1)),
    moveCell(end, lastDirection),
    findEnd(robot, path.with(0, pickOne(directions, random))),
    findEnd(robot, path.with(-1, pickOne(directions, random))),
    pickCell(size, size, random),
    pickCell(size, size, random),
  ];
  const landingCells = [end];
  for (const slip of slips) {
    if (
      landingCells.length < predictLetters.length &&
      isInsideGrid(slip, size, size) &&
      !isSameCell(slip, robot) &&
      !isCellInList(slip, landingCells)
    ) {
      landingCells.push(slip);
    }
  }
  if (landingCells.length < predictLetters.length) {
    return undefined;
  }
  const obstacles = pickFreeCells(
    predictPathObstacleCounts[difficulty],
    size,
    size,
    [...visited, ...landingCells],
    random,
  );
  const shuffledCells = shuffleValues(landingCells, random);
  const answerIndex = shuffledCells.findIndex((cell) => isSameCell(cell, end));
  return {
    ask: `Bolt follows ${describeArrows(path)}. Where will Bolt stop?`,
    scene: {
      kind: "robot-grid",
      columns: size,
      rows: size,
      robot,
      obstacles,
      labels: shuffledCells.map((cell, index) => ({
        cell,
        text: predictLetters[index],
      })),
    },
    answer: predictLetters[answerIndex],
    distractors: predictLetters.filter((_, index) => index !== answerIndex),
    hint: "Move your finger one square for each arrow. Keep count as you go.",
  };
};

const predictThePath = defineComputingGame({
  gameType: "predict-the-path",
  title: "Predict the Path",
  skillId: "computing.predict-longer-programs",
  instruction: "Read the program. Where will Bolt stop?",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildPredictThePathQuestion(difficulty, random)),
  },
});

const privatePals = defineComputingGame({
  gameType: "private-pals",
  title: "Private Pals",
  skillId: "computing.keep-information-private",
  instruction: "Choose what to keep private and what to share.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which of these is private?",
        scene: {
          kind: "tablet-screen",
          title: "All about me",
          screen: { app: "game", lines: ["Tell us about you!"] },
        },
        answer: "Your home address",
        distractors: [
          "Your favourite colour",
          "Your favourite food",
          "You like dogs",
          "Your favourite song",
        ],
        hint: "Private information could help a stranger find you.",
      },
      {
        ask: "Which of these is OK to share in a game?",
        scene: {
          kind: "tablet-screen",
          title: "Make a player",
          screen: {
            app: "game",
            lines: ["Pick a player name", "and a colour"],
          },
        },
        answer: "Your favourite colour",
        distractors: [
          "Your home address",
          "Your password",
          "Your school's name",
          "Your full name",
        ],
        hint: "Pick the one that could not help a stranger find you.",
      },
      {
        ask: "A game asks for your password. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Free coins!",
          screen: {
            app: "pop-up",
            lines: ["Type your password", "for coins!"],
          },
        },
        answer: "Say no, tell an adult",
        distractors: ["Type it in", "Give a friend's", "Share it with all"],
        hint: "Passwords are secret. Only you and your grown-ups should know them.",
      },
      {
        ask: "Who can you tell your password to?",
        scene: {
          kind: "tablet-screen",
          title: "Log in",
          screen: { app: "login", lines: ["Name: Sam", "Password: ****"] },
        },
        answer: "Your parent or carer",
        distractors: [
          "A new online friend",
          "Everyone in the game",
          "A pop-up message",
        ],
      },
      {
        ask: "Someone online asks which school you go to. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [{ from: "Player7", text: "Which school do you go to?" }],
          },
        },
        answer: "Don't say, tell an adult",
        distractors: [
          "Tell them the name",
          "Send a photo of it",
          "Tell them your class",
        ],
        hint: "Your school's name could help someone find you.",
      },
      {
        ask: "Which is the safest name to use in a game?",
        scene: {
          kind: "tablet-screen",
          title: "Pick a name",
          screen: { app: "game", lines: ["Choose your", "player name:"] },
        },
        answer: "SpeedyStar",
        distractors: ["Amy Jones", "Amy Jones age 7", "Amy at Oak School"],
        hint: "A made-up name keeps your real name private.",
      },
      {
        ask: "Which of these should you keep private?",
        scene: {
          kind: "tablet-screen",
          title: "My page",
          screen: { app: "social", lines: ["Write something", "about you!"] },
        },
        answer: "Your birthday",
        distractors: [
          "Your favourite animal",
          "You like football",
          "Your favourite book",
        ],
        hint: "Which one is about the real, personal you?",
      },
      {
        ask: "Which of these is OK to share?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [{ from: "Friend", text: "Do you have a pet?" }],
          },
        },
        answer: "I have a pet cat",
        distractors: [
          "I live at 5 Elm Road",
          "My password is cat1",
          "My phone number",
        ],
        hint: "Pick the one that could not help a stranger find you.",
      },
      {
        ask: "A website asks for your full name. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Sign up",
          screen: { app: "login", lines: ["First name:", "Last name:"] },
        },
        answer: "Ask a grown-up first",
        distractors: ["Type it in", "Make up a friend's", "Type your address"],
      },
      {
        ask: "Why should you keep your address private?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [{ from: "Stranger", text: "What is your address?" }],
          },
        },
        answer: "Strangers could find you",
        distractors: [
          "It is too long",
          "It is boring",
          "It will break the tablet",
        ],
      },
      {
        ask: "You told someone your password by mistake. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Log in",
          screen: { app: "login", lines: ["Name: Ben", "Password: ****"] },
        },
        answer: "Tell a trusted adult",
        distractors: ["Keep it a secret", "Tell more people", "Do nothing"],
        hint: "It's OK to make a mistake. A grown-up can help you change it.",
      },
      {
        ask: "Which of these is private information?",
        scene: {
          kind: "tablet-screen",
          title: "About me",
          screen: { app: "document", lines: ["Private or", "OK to share?"] },
        },
        answer: "Your phone number",
        distractors: [
          "Your favourite colour",
          "Your favourite game",
          "You like pizza",
        ],
      },
    ],
  },
});

const kindClicks = defineComputingGame({
  gameType: "kind-clicks",
  title: "Kind Clicks",
  skillId: "computing.be-kind-online",
  instruction: "Choose the kind thing to say or do.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Mia shared her painting. Which reply is kind?",
        scene: {
          kind: "tablet-screen",
          title: "Class chat",
          screen: {
            app: "chat",
            messages: [{ from: "Mia", text: "Here is my painting!" }],
          },
        },
        answer: "I love the colours!",
        distractors: ["That looks silly", "Mine is better", "Boring"],
        hint: "How would you like someone to reply to you?",
      },
      {
        ask: "Leo got a sum wrong. Which reply is kind?",
        scene: {
          kind: "tablet-screen",
          title: "Class chat",
          screen: {
            app: "chat",
            messages: [{ from: "Leo", text: "I got 5 + 3 wrong" }],
          },
        },
        answer: "Good try, keep going!",
        distractors: ["Ha ha, you got it wrong", "That's easy!", "Silly you"],
      },
      {
        ask: "Someone sends you an unkind message. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [{ from: "Player3", text: "You are rubbish!" }],
          },
        },
        answer: "Tell a trusted adult",
        distractors: [
          "Send a mean reply",
          "Keep it a secret",
          "Share it with all",
        ],
        hint: "You don't have to deal with it on your own.",
      },
      {
        ask: "You see unkind messages sent to your friend. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Game chat",
          screen: {
            app: "chat",
            messages: [
              { from: "Player9", text: "Go away, Sam!" },
              { from: "Player4", text: "Nobody wants you here" },
            ],
          },
        },
        answer: "Tell a trusted adult",
        distractors: ["Join in", "Laugh at it", "Send it to others"],
        hint: "How can you help your friend stay safe?",
      },
      {
        ask: "Which message is kind?",
        scene: {
          kind: "tablet-screen",
          title: "Game chat",
          screen: {
            app: "chat",
            messages: [{ from: "Zara", text: "I lost the race" }],
          },
        },
        answer: "Well played, Zara!",
        distractors: ["You're so slow!", "I always win", "Don't play again"],
      },
      {
        ask: "Before you send a message, what should you ask yourself?",
        scene: {
          kind: "tablet-screen",
          title: "New message",
          screen: { app: "email", lines: ["To: Jack", "Your message..."] },
        },
        answer: "Is it kind?",
        distractors: [
          "Is it long?",
          "Is it funny to me?",
          "Is it in capitals?",
        ],
        hint: "Think about how the other person will feel.",
      },
      {
        ask: "Someone online is unkind to you. How might you feel?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [{ from: "Player2", text: "Your drawing is ugly" }],
          },
        },
        answer: "Sad or upset",
        distractors: ["Very proud", "Sleepy", "Hungry"],
        hint: "Unkind words online can hurt just as much as in real life.",
      },
      {
        ask: "Ella wasn't picked for the team. Which reply is kind?",
        scene: {
          kind: "tablet-screen",
          title: "Class chat",
          screen: {
            app: "chat",
            messages: [{ from: "Ella", text: "I wasn't picked today" }],
          },
        },
        answer: "Play with us next time!",
        distractors: ["Too bad!", "You're not good enough", "So what?"],
      },
      {
        ask: "A friend sends a photo you think is funny. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Photos",
          screen: {
            app: "social",
            lines: ["Share this photo", "with everyone?"],
          },
        },
        answer: "Ask before you share",
        distractors: [
          "Share it with everyone",
          "Laugh and send it on",
          "Draw on it and share",
        ],
        hint: "Would your friend be happy for everyone to see it?",
      },
      {
        ask: "An unkind message keeps coming back. What can a grown-up help you do?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [
              { from: "Player5", text: "You are silly" },
              { from: "Player5", text: "Silly silly silly" },
            ],
          },
        },
        answer: "Block and report it",
        distractors: [
          "Send it to friends",
          "Write a mean reply",
          "Keep reading it",
        ],
      },
      {
        ask: "Which is a kind thing to do online?",
        scene: {
          kind: "tablet-screen",
          title: "Class chat",
          screen: {
            app: "chat",
            messages: [{ from: "Kai", text: "Can I play too?" }],
          },
        },
        answer: "Let Kai join in",
        distractors: ["Ignore Kai", "Tell Kai to go away", "Laugh at Kai"],
      },
    ],
  },
});

export const yearTwoComputingGames = [
  techDetective,
  photoStudio,
  robotRoute,
  pictogramParty,
  musicMaker,
  quizCoder,
  debugTheDance,
  predictThePath,
  privatePals,
  kindClicks,
] as const;
