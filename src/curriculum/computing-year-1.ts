import {
  buildRandomPath,
  defineComputingGame,
  describeArrows,
  directions,
  followPath,
  isInsideGrid,
  isSameCell,
  moveCell,
  pickOne,
  pickWholeNumber,
  shuffleValues,
  type CodeBlock,
  type ComputingDifficulty,
  type ComputingQuestion,
  type Direction,
  type GridCell,
  type ItemColour,
  type ItemShape,
  type SortItem,
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

const robotStepsSizes: Record<ComputingDifficulty, number> = {
  1: 4,
  2: 5,
  3: 5,
};

const robotStepsLengths: Record<ComputingDifficulty, number> = {
  1: 1,
  2: 2,
  3: 3,
};

const buildRobotStepsQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const size = robotStepsSizes[difficulty];
  const robot = pickCell(size, size, random);
  const path = buildRandomPath(
    robot,
    robotStepsLengths[difficulty],
    size,
    size,
    random,
  );
  if (path.length < robotStepsLengths[difficulty]) {
    return undefined;
  }
  const goal = findEnd(robot, path);
  const stepsToGoal =
    Math.abs(goal.column - robot.column) + Math.abs(goal.row - robot.row);
  if (stepsToGoal !== path.length) {
    return undefined;
  }
  const distractors = listAllPaths(path.length)
    .filter((candidate) => !isSameCell(findEnd(robot, candidate), goal))
    .filter((candidate) =>
      followPath(robot, candidate).every((cell) =>
        isInsideGrid(cell, size, size),
      ),
    )
    .map(describeArrows);
  if (distractors.length < 3) {
    return undefined;
  }
  return {
    ask:
      path.length === 1
        ? "Which arrow moves Bolt onto the star?"
        : "Which arrows take Bolt to the star?",
    scene: { kind: "robot-grid", columns: size, rows: size, robot, goal },
    answer: describeArrows(path),
    distractors: shuffleValues(distractors, random).slice(0, 6),
    hint: "Count the squares between Bolt and the star, then try again.",
  };
};

const robotSteps = defineComputingGame({
  gameType: "robot-steps",
  title: "Robot Steps",
  skillId: "computing.single-step-instructions",
  instruction: "Tap the arrows that take Bolt to the star.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildRobotStepsQuestion(difficulty, random)),
  },
});

const techSpotter = defineComputingGame({
  gameType: "tech-spotter",
  title: "Tech Spotter",
  skillId: "computing.name-technology",
  instruction: "Look at the technology, then tap its name.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "What is this called?",
        scene: { kind: "device", device: "laptop" },
        answer: "Laptop",
        distractors: ["Printer", "Keyboard", "Speaker", "Microwave"],
      },
      {
        ask: "What is this called?",
        scene: { kind: "device", device: "tablet" },
        answer: "Tablet",
        distractors: ["Mouse", "Headphones", "Printer", "Microphone"],
      },
      {
        ask: "What is this called?",
        scene: { kind: "device", device: "mouse" },
        answer: "Mouse",
        distractors: ["Keyboard", "Tablet", "Speaker", "Camera"],
      },
      {
        ask: "What is this called?",
        scene: { kind: "device", device: "keyboard" },
        answer: "Keyboard",
        distractors: ["Mouse", "Printer", "Laptop", "Speaker"],
      },
      {
        ask: "What is this called?",
        scene: { kind: "device", device: "printer" },
        answer: "Printer",
        distractors: ["Tablet", "Microwave", "Mouse", "Headphones"],
      },
      {
        ask: "What is this called?",
        scene: { kind: "device", device: "headphones" },
        answer: "Headphones",
        distractors: ["Microphone", "Keyboard", "Camera", "Mouse"],
      },
      {
        ask: "What is this called?",
        scene: { kind: "device", device: "desktop-computer" },
        answer: "Computer",
        distractors: ["Printer", "Washing machine", "Speaker", "Phone"],
      },
      {
        ask: "What is this called?",
        scene: { kind: "device", device: "digital-camera" },
        answer: "Camera",
        distractors: ["Speaker", "Printer", "Keyboard", "Tablet"],
      },
      {
        ask: "What is this called?",
        scene: { kind: "device", device: "smartphone" },
        answer: "Mobile phone",
        distractors: ["Printer", "Keyboard", "Mouse", "Microwave"],
      },
      {
        ask: "What do we use this to do?",
        scene: { kind: "device", device: "printer" },
        answer: "Print on paper",
        distractors: ["Take photos", "Play music", "Cook food"],
      },
      {
        ask: "What do we use this to do?",
        scene: { kind: "device", device: "headphones" },
        answer: "Listen to sounds",
        distractors: ["Type words", "Print on paper", "Take photos"],
      },
      {
        ask: "What do we use this to do?",
        scene: { kind: "device", device: "keyboard" },
        answer: "Type letters",
        distractors: ["Listen to music", "Take photos", "Wash clothes"],
      },
      {
        ask: "What is this called?",
        scene: { kind: "device", device: "floor-robot" },
        answer: "Floor robot",
        distractors: ["Printer", "Tablet", "Headphones", "Keyboard"],
      },
    ],
  },
});

const pixelPainter = defineComputingGame({
  gameType: "pixel-painter",
  title: "Pixel Painter",
  skillId: "computing.digital-painting",
  instruction: "Pick the colour or tool to finish the picture.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which colour finishes the strawberry?",
        scene: {
          kind: "pixel-grid",
          frames: [
            [
              "..ggg..",
              ".ggggg.",
              ".rrrrr.",
              "rrr?rrr",
              "rrrrr?r",
              ".rr?rr.",
              "..rrr..",
            ],
          ],
        },
        answer: "Red",
        distractors: ["Blue", "Green", "Yellow", "Purple"],
        hint: "Look at the colour all around the gaps.",
      },
      {
        ask: "Which colour finishes the sun?",
        scene: {
          kind: "pixel-grid",
          frames: [
            [
              "y..y..y",
              ".yyyyy.",
              ".yy?yy.",
              "yyyyy?y",
              ".y?yyy.",
              ".yyyyy.",
              "y..y..y",
            ],
          ],
        },
        answer: "Yellow",
        distractors: ["Blue", "Black", "Green", "Purple"],
        hint: "Look at the colour all around the gaps.",
      },
      {
        ask: "Which colour finishes the tree's leaves?",
        scene: {
          kind: "pixel-grid",
          frames: [
            [
              "..ggg..",
              ".gg?gg.",
              "ggggg?g",
              ".g?ggg.",
              "...n...",
              "...n...",
              "..nnn..",
            ],
          ],
        },
        answer: "Green",
        distractors: ["Red", "Yellow", "Blue", "Purple"],
        hint: "Look at the colour all around the gaps.",
      },
      {
        ask: "Which colour finishes the fish?",
        scene: {
          kind: "pixel-grid",
          frames: [
            [
              ".......",
              "..ooo.o",
              ".oko?oo",
              "o?oooo.",
              ".oooo?o",
              "..ooo.o",
              ".......",
            ],
          ],
        },
        answer: "Orange",
        distractors: ["Green", "Blue", "Black", "Purple"],
        hint: "Look at the colour all around the gaps.",
      },
      {
        ask: "Which colour finishes the heart?",
        scene: {
          kind: "pixel-grid",
          frames: [
            [
              ".pp.pp.",
              "ppp?ppp",
              "ppppp?p",
              ".p?ppp.",
              "..ppp..",
              "...p...",
              ".......",
            ],
          ],
        },
        answer: "Purple",
        distractors: ["Yellow", "Green", "Orange", "Black"],
        hint: "Look at the colour all around the gaps.",
      },
      {
        ask: "Which colour finishes the sea?",
        scene: {
          kind: "pixel-grid",
          frames: [
            [
              "wwwwwww",
              "wwwywww",
              "wwwwwww",
              "bbb?bbb",
              "b?bbbbb",
              "bbbbb?b",
              "nnnnnnn",
            ],
          ],
        },
        answer: "Blue",
        distractors: ["Red", "Yellow", "Brown", "Purple"],
        hint: "Look at the colour all around the gaps.",
      },
      {
        ask: "Which tool fills a whole space with one colour?",
        scene: {
          kind: "pixel-grid",
          frames: [
            [
              ".kkkkk.",
              "k?????k",
              "k?????k",
              "k?????k",
              "k?????k",
              "k?????k",
              ".kkkkk.",
            ],
          ],
        },
        answer: "Fill",
        distractors: ["Eraser", "Undo", "Save"],
        hint: "This tool pours colour into a space, like paint from a pot.",
      },
      {
        ask: "Oops! Which button takes back your last change?",
        scene: {
          kind: "pixel-grid",
          frames: [
            [
              "..ggg..",
              ".ggggg.",
              "kkkkkkk",
              "...n...",
              "...n...",
              "...n...",
              "..nnn..",
            ],
          ],
        },
        answer: "Undo",
        distractors: ["Fill", "Print", "Save"],
        hint: "This button goes back one step.",
      },
      {
        ask: "Which tool rubs out a square of colour?",
        scene: {
          kind: "pixel-grid",
          frames: [
            [
              ".......",
              ".bbbbb.",
              ".bbbbb.",
              ".bbrbb.",
              ".bbbbb.",
              ".bbbbb.",
              ".......",
            ],
          ],
        },
        answer: "Eraser",
        distractors: ["Fill", "Pencil", "Print"],
        hint: "Think of the tool that is like a rubber.",
      },
      {
        ask: "Which button keeps your picture so you can finish it later?",
        scene: {
          kind: "pixel-grid",
          frames: [
            [
              "y..y..y",
              ".yyyyy.",
              ".yyyyy.",
              "yyyyyyy",
              ".yyyyy.",
              ".yyyyy.",
              "y..y..y",
            ],
          ],
        },
        answer: "Save",
        distractors: ["Undo", "Eraser", "Fill"],
        hint: "This button stores your work on the computer.",
      },
    ],
  },
});

const sortColourNames: Record<ItemColour, string> = {
  red: "Red",
  blue: "Blue",
  green: "Green",
  yellow: "Yellow",
  purple: "Purple",
  orange: "Orange",
};

const sortShapeNames: Record<ItemShape, string> = {
  circle: "Circles",
  square: "Squares",
  triangle: "Triangles",
  star: "Stars",
  heart: "Hearts",
};

const sortColours: readonly ItemColour[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
];
const sortShapes: readonly ItemShape[] = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
];

const buildSortItem = (random: () => number): SortItem => ({
  shape: pickOne(sortShapes, random),
  colour: pickOne(sortColours, random),
  size: random() < 0.5 ? "small" : "big",
});

const describeSizeAndColour = ({ size, colour }: SortItem): string =>
  `${size === "big" ? "Big" : "Small"} and ${sortColourNames[colour].toLowerCase()}`;

const buildSortQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  const item = buildSortItem(random);
  if (difficulty === 1) {
    const answer = sortColourNames[item.colour];
    const others = shuffleValues(
      sortColours.filter((colour) => colour !== item.colour),
      random,
    )
      .slice(0, 3)
      .map((colour) => sortColourNames[colour]);
    return {
      ask: "Sort by colour. Which box should it go in?",
      scene: {
        kind: "sort-machine",
        item,
        bins: shuffleValues([answer, ...others], random),
      },
      answer,
      distractors: others,
      hint: "Look at the colour of the shape on the belt.",
    };
  }
  if (difficulty === 2) {
    const answer = sortShapeNames[item.shape];
    const others = shuffleValues(
      sortShapes.filter((shape) => shape !== item.shape),
      random,
    )
      .slice(0, 3)
      .map((shape) => sortShapeNames[shape]);
    return {
      ask: "Sort by shape. Which box should it go in?",
      scene: {
        kind: "sort-machine",
        item,
        bins: shuffleValues([answer, ...others], random),
      },
      answer,
      distractors: others,
      hint: "Look at the shape on the belt. How many sides or points does it have?",
    };
  }
  const otherColour = pickOne(
    sortColours.filter((colour) => colour !== item.colour),
    random,
  );
  const otherSize = item.size === "big" ? "small" : "big";
  const answer = describeSizeAndColour(item);
  const others = [
    describeSizeAndColour({ ...item, size: otherSize }),
    describeSizeAndColour({ ...item, colour: otherColour }),
    describeSizeAndColour({ ...item, size: otherSize, colour: otherColour }),
  ];
  return {
    ask: "Sort by size and colour. Which box should it go in?",
    scene: {
      kind: "sort-machine",
      item,
      bins: shuffleValues([answer, ...others], random),
    },
    answer,
    distractors: others,
    hint: "Check two things: is it big or small, and what colour is it?",
  };
};

const sortItOut = defineComputingGame({
  gameType: "sort-it-out",
  title: "Sort It Out",
  skillId: "computing.group-objects",
  instruction: "Sort each shape into the right box.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildSortQuestion(difficulty, random),
      ),
  },
});

const stepByStep = defineComputingGame({
  gameType: "step-by-step",
  title: "Step by Step",
  skillId: "computing.everyday-algorithms",
  instruction: "Find the missing step in the algorithm.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Brushing teeth: which step is missing?",
        scene: {
          kind: "story-cards",
          cards: ["Wet the brush", "Add toothpaste", "Brush teeth", "Rinse"],
          missingIndex: 1,
        },
        answer: "Add toothpaste",
        distractors: ["Put on shoes", "Eat breakfast", "Open the door"],
      },
      {
        ask: "Making toast: which step is missing?",
        scene: {
          kind: "story-cards",
          cards: [
            "Get the bread",
            "Put it in the toaster",
            "Wait",
            "Spread butter",
          ],
          missingIndex: 2,
        },
        answer: "Wait",
        distractors: ["Brush teeth", "Wash your hands", "Go to sleep"],
      },
      {
        ask: "Planting a seed: which step is missing?",
        scene: {
          kind: "story-cards",
          cards: [
            "Fill a pot with soil",
            "Push in a seed",
            "Water it",
            "Watch it grow",
          ],
          missingIndex: 1,
        },
        answer: "Push in a seed",
        distractors: ["Eat the seed", "Put on a coat", "Turn on the TV"],
      },
      {
        ask: "Washing hands: what is the first step?",
        scene: {
          kind: "story-cards",
          cards: ["Turn on the tap", "Add soap", "Rub hands", "Rinse and dry"],
          missingIndex: 0,
        },
        answer: "Turn on the tap",
        distractors: ["Dry your hands", "Eat lunch", "Put on gloves"],
      },
      {
        ask: "Getting dressed: which step is missing?",
        scene: {
          kind: "story-cards",
          cards: ["Pants on", "Trousers on", "Socks on", "Shoes on"],
          missingIndex: 2,
        },
        answer: "Socks on",
        distractors: ["Hat off", "Pyjamas on", "Shoes off"],
      },
      {
        ask: "Making a sandwich: what is the last step?",
        scene: {
          kind: "story-cards",
          cards: [
            "Get two slices",
            "Spread butter",
            "Add the filling",
            "Put the top on",
          ],
          missingIndex: 3,
        },
        answer: "Put the top on",
        distractors: ["Get two slices", "Wash the plate", "Open the fridge"],
      },
      {
        ask: "Feeding a pet: which step is missing?",
        scene: {
          kind: "story-cards",
          cards: [
            "Get the bowl",
            "Add the food",
            "Put the bowl down",
            "Pet eats",
          ],
          missingIndex: 1,
        },
        answer: "Add the food",
        distractors: ["Wash the car", "Pet goes to sleep", "Close the bowl"],
      },
      {
        ask: "Drawing a face: which step is missing?",
        scene: {
          kind: "story-cards",
          cards: ["Draw a circle", "Add two eyes", "Add a nose", "Add a smile"],
          missingIndex: 2,
        },
        answer: "Add a nose",
        distractors: ["Draw a house", "Add a tail", "Rub it all out"],
      },
      {
        ask: "Making a drink: which step is missing?",
        scene: {
          kind: "story-cards",
          cards: ["Get a cup", "Pour in squash", "Add water", "Drink it"],
          missingIndex: 2,
        },
        answer: "Add water",
        distractors: ["Wash the cup", "Drop the cup", "Get a plate"],
      },
      {
        ask: "Going outside to play: which step is missing?",
        scene: {
          kind: "story-cards",
          cards: [
            "Put on a coat",
            "Put on shoes",
            "Open the door",
            "Go and play",
          ],
          missingIndex: 1,
        },
        answer: "Put on shoes",
        distractors: ["Take off your coat", "Go to bed", "Close the door"],
      },
    ],
  },
});

const bugCatcherLengths: Record<ComputingDifficulty, number> = {
  1: 4,
  2: 5,
  3: 6,
};

const bugCatcherSize = 6;

const findFixableSteps = (
  robot: GridCell,
  route: readonly Direction[],
  goal: GridCell,
): number[] =>
  route.flatMap((current, index) =>
    directions.some(
      (direction) =>
        direction !== current &&
        isSameCell(findEnd(robot, route.with(index, direction)), goal),
    )
      ? [index]
      : [],
  );

const buildBugCatcherQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const stepCount = bugCatcherLengths[difficulty];
  const robot = pickCell(bugCatcherSize, bugCatcherSize, random);
  const intended = buildRandomPath(
    robot,
    stepCount,
    bugCatcherSize,
    bugCatcherSize,
    random,
  );
  if (intended.length < stepCount) {
    return undefined;
  }
  const goal = findEnd(robot, intended);
  const bugIndex = pickWholeNumber(0, stepCount - 1, random);
  const wrongDirection = pickOne(
    directions.filter((direction) => direction !== intended[bugIndex]),
    random,
  );
  const route = intended.with(bugIndex, wrongDirection);
  const visited = followPath(robot, route);
  const isRouteClear =
    visited.every((cell) =>
      isInsideGrid(cell, bugCatcherSize, bugCatcherSize),
    ) &&
    visited.every(
      (cell, index) =>
        visited.findIndex((other) => isSameCell(other, cell)) === index,
    );
  const fixableSteps = findFixableSteps(robot, route, goal);
  if (
    !isRouteClear ||
    fixableSteps.length !== 1 ||
    fixableSteps[0] !== bugIndex
  ) {
    return undefined;
  }
  const stepNames = route.map((_, index) => `Step ${String(index + 1)}`);
  return {
    ask: "Bolt should land on the star. Which step is the bug?",
    scene: {
      kind: "robot-grid",
      columns: bugCatcherSize,
      rows: bugCatcherSize,
      robot,
      goal,
      path: route,
    },
    answer: stepNames[bugIndex],
    distractors: stepNames.filter((_, index) => index !== bugIndex),
    hint: "Follow the arrows one at a time. Where does Bolt go the wrong way?",
  };
};

const bugCatcher = defineComputingGame({
  gameType: "bug-catcher",
  title: "Bug Catcher",
  skillId: "computing.debug-a-route",
  instruction: "Find the step that sends Bolt the wrong way.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildBugCatcherQuestion(difficulty, random)),
  },
});

const predictLengths: Record<ComputingDifficulty, number> = {
  1: 2,
  2: 3,
  3: 4,
};

const predictSize = 5;
const landingLetters = ["A", "B", "C", "D"];

const buildWhereWillBoltGoQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const stepCount = predictLengths[difficulty];
  const robot = pickCell(predictSize, predictSize, random);
  const path = buildRandomPath(
    robot,
    stepCount,
    predictSize,
    predictSize,
    random,
  );
  if (path.length < stepCount) {
    return undefined;
  }
  const end = findEnd(robot, path);
  const slips = [
    findEnd(robot, path.slice(0, -1)),
    moveCell(end, path.at(-1) ?? "up"),
    findEnd(robot, path.with(0, pickOne(directions, random))),
    pickCell(predictSize, predictSize, random),
    pickCell(predictSize, predictSize, random),
    pickCell(predictSize, predictSize, random),
  ];
  const landingCells = [end];
  for (const slip of slips) {
    if (
      landingCells.length < landingLetters.length &&
      isInsideGrid(slip, predictSize, predictSize) &&
      !isSameCell(slip, robot) &&
      !landingCells.some((cell) => isSameCell(cell, slip))
    ) {
      landingCells.push(slip);
    }
  }
  if (landingCells.length < landingLetters.length) {
    return undefined;
  }
  const shuffledCells = shuffleValues(landingCells, random);
  const answerIndex = shuffledCells.findIndex((cell) => isSameCell(cell, end));
  return {
    ask: `Bolt follows ${describeArrows(path)}. Where will Bolt stop?`,
    scene: {
      kind: "robot-grid",
      columns: predictSize,
      rows: predictSize,
      robot,
      labels: shuffledCells.map((cell, index) => ({
        cell,
        text: landingLetters[index],
      })),
    },
    answer: landingLetters[answerIndex],
    distractors: landingLetters.filter((_, index) => index !== answerIndex),
    hint: "Move your finger one square for each arrow.",
  };
};

const whereWillBoltGo = defineComputingGame({
  gameType: "where-will-bolt-go",
  title: "Where Will Bolt Go?",
  skillId: "computing.predict-a-route",
  instruction: "Read the program. Where will Bolt stop?",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildWhereWillBoltGoQuestion(difficulty, random)),
  },
});

const safeSurfer = defineComputingGame({
  gameType: "safe-surfer",
  title: "Safe Surfer",
  skillId: "computing.ask-for-help-online",
  instruction: "Choose the safe thing to do.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "A pop-up says you have won a prize. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "You won!",
          screen: {
            app: "pop-up",
            lines: ["You won a prize!", "Click here now!"],
          },
        },
        answer: "Tell a grown-up",
        distractors: ["Click it quickly", "Type your name", "Keep it a secret"],
      },
      {
        ask: "Someone you don't know asks where you live. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [{ from: "Gamer99", text: "Where do you live?" }],
          },
        },
        answer: "Don't answer, tell an adult",
        distractors: [
          "Tell them your street",
          "Send a photo",
          "Ask them to visit",
        ],
      },
      {
        ask: "A video makes you feel scared. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Videos",
          screen: { app: "video", lines: ["Scary video", "Keep watching?"] },
        },
        answer: "Stop and tell an adult",
        distractors: [
          "Keep watching it",
          "Show your little brother",
          "Hide the tablet",
        ],
      },
      {
        ask: "Which of these is a trusted adult you can tell?",
        scene: {
          kind: "tablet-screen",
          title: "Who can help?",
          screen: {
            app: "document",
            lines: ["Who can help me", "when I'm worried?"],
          },
        },
        answer: "Your teacher",
        distractors: [
          "A stranger in a game",
          "A pop-up message",
          "Someone online",
        ],
      },
      {
        ask: "A game asks for your full name. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Super Game",
          screen: { app: "game", lines: ["Type your", "full name:"] },
        },
        answer: "Ask a grown-up first",
        distractors: ["Type it in", "Type a friend's name", "Shout it out"],
      },
      {
        ask: "You want to share a photo of your friend. What should you do first?",
        scene: {
          kind: "tablet-screen",
          title: "Photos",
          screen: { app: "social", lines: ["Share this photo?", "Yes   No"] },
        },
        answer: "Ask your friend",
        distractors: [
          "Share it straight away",
          "Share it with everyone",
          "Change their face",
        ],
      },
      {
        ask: "Something online makes you feel worried. Who can you tell?",
        scene: {
          kind: "tablet-screen",
          title: "Uh oh",
          screen: {
            app: "browser",
            lines: ["Something here", "feels wrong..."],
          },
        },
        answer: "A trusted adult",
        distractors: ["Nobody at all", "A stranger online", "The pop-up"],
      },
      {
        ask: "A message says 'Don't tell your parents'. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [{ from: "NewFriend", text: "Don't tell your parents!" }],
          },
        },
        answer: "Tell a grown-up",
        distractors: ["Keep the secret", "Reply 'OK'", "Delete the game"],
      },
      {
        ask: "Where is a safe place to watch videos?",
        scene: {
          kind: "tablet-screen",
          title: "Videos",
          screen: { app: "video", lines: ["Which video", "app is safe?"] },
        },
        answer: "An app a grown-up chose",
        distractors: ["Any pop-up", "A stranger's link", "A random website"],
      },
      {
        ask: "Someone online asks you to send a photo of yourself. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [{ from: "Stranger", text: "Send me a photo!" }],
          },
        },
        answer: "Say no and tell an adult",
        distractors: ["Send a photo", "Send a friend's photo", "Keep chatting"],
      },
    ],
  },
});

const wordWizard = defineComputingGame({
  gameType: "word-wizard",
  title: "Word Wizard",
  skillId: "computing.keyboard-keys",
  instruction: "Pick the key or button that does the job.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which key makes a space between words?",
        scene: { kind: "device", device: "keyboard" },
        answer: "Space bar",
        distractors: ["Enter", "Shift", "Backspace"],
      },
      {
        ask: "Which key starts a new line?",
        scene: { kind: "device", device: "keyboard" },
        answer: "Enter",
        distractors: ["Space bar", "Shift", "Backspace"],
      },
      {
        ask: "Which key takes away the last letter you typed?",
        scene: { kind: "device", device: "keyboard" },
        answer: "Backspace",
        distractors: ["Enter", "Space bar", "Shift"],
      },
      {
        ask: "Hold this key to type one capital letter.",
        scene: { kind: "device", device: "keyboard" },
        answer: "Shift",
        distractors: ["Space bar", "Enter", "Backspace"],
      },
      {
        ask: "Which key turns on capitals for every letter?",
        scene: { kind: "device", device: "keyboard" },
        answer: "Caps Lock",
        distractors: ["Space bar", "Enter", "Backspace"],
      },
      {
        ask: "Which button makes your words bold?",
        scene: {
          kind: "tablet-screen",
          title: "My story",
          screen: { app: "document", lines: ["B   I   U", "The cat sat."] },
        },
        answer: "B",
        distractors: ["I", "U", "Undo"],
      },
      {
        ask: "Which button makes your words lean over, like this: italic?",
        scene: {
          kind: "tablet-screen",
          title: "My story",
          screen: { app: "document", lines: ["B   I   U", "I like dogs."] },
        },
        answer: "I",
        distractors: ["B", "U", "Undo"],
      },
      {
        ask: "Which button draws a line under your words?",
        scene: {
          kind: "tablet-screen",
          title: "My story",
          screen: { app: "document", lines: ["B   I   U", "We went out."] },
        },
        answer: "U",
        distractors: ["B", "I", "Save"],
      },
      {
        ask: "Which part of the computer do you click with?",
        scene: { kind: "device", device: "mouse" },
        answer: "Mouse",
        distractors: ["Speaker", "Printer", "Headphones"],
      },
      {
        ask: "You typed 'catt'. Which key fixes it?",
        scene: {
          kind: "tablet-screen",
          title: "My story",
          screen: { app: "document", lines: ["B   I   U", "My catt"] },
        },
        answer: "Backspace",
        distractors: ["Enter", "Caps Lock", "Space bar"],
      },
    ],
  },
});

const jumpAndGoMoves = [
  { text: "Move right 2", steps: 2 },
  { text: "Move right 3", steps: 3 },
  { text: "Move right 1", steps: 1 },
  { text: "Jump", steps: 0 },
  { text: "Spin", steps: 0 },
  { text: "Say hello", steps: 0 },
  { text: "Grow bigger", steps: 0 },
] as const;

const jumpAndGoStarts = ["Start on green flag", "Start on tap"] as const;

const findJumpAndGoCategory = (text: string): CodeBlock["category"] =>
  text === "Say hello" || text === "Grow bigger" ? "looks" : "motion";

const buildJumpAndGoQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  const actionCount = difficulty + 1;
  const actions = shuffleValues(jumpAndGoMoves, random).slice(0, actionCount);
  const start = pickOne(jumpAndGoStarts, random);
  const blocks: CodeBlock[] = [
    { text: start, category: "event" },
    ...actions.map(({ text }) => ({
      text,
      category: findJumpAndGoCategory(text),
    })),
  ];
  const scene = {
    kind: "code-stack" as const,
    blocks,
    gadget: { kind: "robot" as const },
  };
  const otherActions = jumpAndGoMoves
    .map(({ text }) => text)
    .filter((text) => !actions.some((chosen) => chosen.text === text));
  const kindOfAsk = pickWholeNumber(0, difficulty === 1 ? 1 : 3, random);
  if (kindOfAsk === 0) {
    return {
      ask: "What does Bolt do first?",
      scene,
      answer: actions[0].text,
      distractors: [
        ...actions.slice(1).map(({ text }) => text),
        ...otherActions,
      ],
      hint: "Read the blocks from the top. The first block after the start block happens first.",
    };
  }
  if (kindOfAsk === 1) {
    return {
      ask: "What does Bolt do last?",
      scene,
      answer: actions[actions.length - 1].text,
      distractors: [
        ...actions.slice(0, -1).map(({ text }) => text),
        ...otherActions,
      ],
      hint: "The block at the bottom happens last.",
    };
  }
  if (kindOfAsk === 2) {
    return {
      ask: "Which block starts this program?",
      scene,
      answer: start,
      distractors: [
        ...jumpAndGoStarts.filter((other) => other !== start),
        ...actions.map(({ text }) => text),
      ],
      hint: "Start blocks are at the very top of the program.",
    };
  }
  const totalSteps = actions.reduce((total, { steps }) => total + steps, 0);
  return {
    ask: "How many steps right does Bolt move in total?",
    scene,
    answer: String(totalSteps),
    distractors: [
      totalSteps + 1,
      totalSteps + 2,
      totalSteps + 3,
      totalSteps - 1,
    ]
      .filter((candidate) => candidate >= 0)
      .map(String),
    hint: "Add up the numbers on the move blocks.",
  };
};

const jumpAndGo = defineComputingGame({
  gameType: "jump-and-go",
  title: "Jump and Go",
  skillId: "computing.animation-programs",
  instruction: "Read the blocks. What will Bolt do?",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildJumpAndGoQuestion(difficulty, random),
      ),
  },
});

export const yearOneComputingGames = [
  robotSteps,
  techSpotter,
  pixelPainter,
  sortItOut,
  stepByStep,
  bugCatcher,
  whereWillBoltGo,
  safeSurfer,
  wordWizard,
  jumpAndGo,
] as const;
