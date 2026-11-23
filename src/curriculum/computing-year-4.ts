import {
  buildNumberDistractors,
  defineComputingGame,
  describeArrows,
  directions,
  findOppositeDirection,
  followPath,
  isInsideGrid,
  isSameCell,
  pickOne,
  pickWholeNumber,
  shuffleValues,
  type ChartBar,
  type CodeBlock,
  type CodeGadget,
  type ComputingDifficulty,
  type ComputingQuestion,
  type Direction,
  type GridCell,
  type NetworkNode,
} from "./computing-scenes.js";

const questionsPerBatch = 6;

const buildBatch = (
  buildQuestion: () => ComputingQuestion | undefined,
): ComputingQuestion[] => {
  const batch: ComputingQuestion[] = [];
  let attemptsLeft = questionsPerBatch * 60;
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

const findEnd = (start: GridCell, path: readonly Direction[]): GridCell =>
  followPath(start, path).at(-1) ?? start;

const listUniqueValues = (values: readonly string[]): string[] => [
  ...new Set(values),
];

const packetRouterCounts: Record<ComputingDifficulty, number> = {
  1: 3,
  2: 5,
  3: 6,
};

const routerSpots: readonly GridCell[] = [1, 2, 3].flatMap((column) =>
  [0, 1, 2].map((row) => ({ column, row })),
);

const homeNode: NetworkNode = {
  id: "home",
  device: "computer",
  label: "Home",
  column: 0,
  row: 1,
};

const schoolNode: NetworkNode = {
  id: "school",
  device: "server",
  label: "School",
  column: 4,
  row: 1,
};

interface PacketNetwork {
  nodes: NetworkNode[];
  links: [string, string][];
}

const isNextTo = (first: NetworkNode, second: NetworkNode): boolean =>
  Math.abs(first.column - second.column) <= 1 &&
  Math.abs(first.row - second.row) <= 1;

const pickSomeOf = <Value>(
  values: readonly Value[],
  chance: number,
  random: () => number,
): Value[] => {
  const picked = values.filter(() => random() < chance);
  return picked.length > 0 ? picked : [pickOne(values, random)];
};

const buildPacketNetwork = (
  difficulty: ComputingDifficulty,
  random: () => number,
): PacketNetwork | undefined => {
  const spots = shuffleValues(routerSpots, random)
    .slice(0, packetRouterCounts[difficulty])
    .toSorted((first, second) =>
      first.column === second.column
        ? first.row - second.row
        : first.column - second.column,
    );
  const routers: NetworkNode[] = spots.map((spot, index) => ({
    id: `R${String(index + 1)}`,
    device: "router",
    label: `R${String(index + 1)}`,
    ...spot,
  }));
  const firstColumn = routers.filter(({ column }) => column === 1);
  const lastColumn = routers.filter(({ column }) => column === 3);
  if (firstColumn.length === 0 || lastColumn.length === 0) {
    return undefined;
  }
  const routerLinks = routers.flatMap((router, index) =>
    routers
      .slice(index + 1)
      .filter((other) => isNextTo(router, other) && random() < 0.55)
      .map((other): [string, string] => [router.id, other.id]),
  );
  const homeLinks = pickSomeOf(firstColumn, 0.5, random).map(
    ({ id }): [string, string] => [homeNode.id, id],
  );
  const schoolLinks = pickSomeOf(lastColumn, 0.5, random).map(
    ({ id }): [string, string] => [id, schoolNode.id],
  );
  return {
    nodes: [homeNode, ...routers, schoolNode],
    links: [...homeLinks, ...routerLinks, ...schoolLinks],
  };
};

const listNeighbours = (network: PacketNetwork, id: string): string[] =>
  network.links.flatMap(([from, to]) => {
    if (from === id) {
      return [to];
    }
    return to === id ? [from] : [];
  });

const listSimpleRoutes = (
  network: PacketNetwork,
  route: readonly string[],
): string[][] => {
  const here = route.at(-1) ?? homeNode.id;
  if (here === schoolNode.id) {
    return [[...route]];
  }
  return listNeighbours(network, here)
    .filter((next) => !route.includes(next))
    .flatMap((next) => listSimpleRoutes(network, [...route, next]));
};

const listRoutersOnRoute = (route: readonly string[]): string[] =>
  route.slice(1, -1);

const describeRoute = (route: readonly string[]): string =>
  listRoutersOnRoute(route).join(", ");

const packetConcepts: readonly Omit<ComputingQuestion, "scene">[] = [
  {
    ask: "What job does a router do?",
    answer: "Sends packets the right way",
    distractors: [
      "Stores every web page",
      "Types messages for you",
      "Makes the screen brighter",
      "Prints the packets out",
    ],
    hint: "Think about the packet hopping from router to router.",
  },
  {
    ask: "Data is split into small pieces to travel. What are they called?",
    answer: "Packets",
    distractors: ["Pixels", "Folders", "Routers", "Programs"],
    hint: "You can see one moving along the route.",
  },
  {
    ask: "What is the internet?",
    answer: "A network of networks",
    distractors: [
      "One giant computer",
      "A single website",
      "A search engine",
      "A type of cable",
    ],
    hint: "Lots of smaller networks are joined together.",
  },
  {
    ask: "What happens to the packets when they all arrive?",
    answer: "They are put back together",
    distractors: [
      "They are thrown away",
      "They go to every computer",
      "They turn into routers",
      "They are sent back home",
    ],
    hint: "The message was split up to travel. What must happen at the end?",
  },
];

// Asked only on a map with a second route, or the picture would show packets with nowhere else to go.
const linkBreaksConcept: Omit<ComputingQuestion, "scene"> = {
  ask: "One link breaks. What can the packets do?",
  answer: "Take another route",
  distractors: [
    "Stop for ever",
    "Turn into emails",
    "Delete themselves",
    "Wait for a new cable",
  ],
  hint: "Look for other paths through the routers.",
};

const buildPacketPathQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const network = buildPacketNetwork(difficulty, random);
  if (network === undefined) {
    return undefined;
  }
  const routes = listSimpleRoutes(network, [homeNode.id]);
  if (routes.length === 0) {
    return undefined;
  }
  const fewestStops = Math.min(...routes.map((route) => route.length));
  const shortestRoutes = routes.filter((route) => route.length === fewestStops);
  if (shortestRoutes.length !== 1) {
    return undefined;
  }
  const shortest = shortestRoutes[0];
  const shortestRouterCount = listRoutersOnRoute(shortest).length;
  const map = { kind: "network-map" as const, ...network };
  const kindOfAsk = pickWholeNumber(0, 3, random);
  if (kindOfAsk === 0) {
    const shortestRouters = listRoutersOnRoute(shortest);
    const unusedRouters = network.nodes
      .map(({ id }) => id)
      .filter(
        (id) =>
          id !== homeNode.id &&
          id !== schoolNode.id &&
          !shortestRouters.includes(id),
      );
    const droppedRoutes =
      shortestRouters.length > 1
        ? shortestRouters.map((_, index) =>
            shortestRouters.toSpliced(index, 1).join(", "),
          )
        : [];
    const swappedRoutes = shortestRouters.flatMap((_, index) =>
      unusedRouters.map((unused) =>
        shortestRouters.with(index, unused).join(", "),
      ),
    );
    const longerRoutes = routes
      .filter((route) => route !== shortest)
      .map(describeRoute);
    const wrongRoutes = listUniqueValues([
      ...shuffleValues(longerRoutes, random).slice(0, 3),
      ...shuffleValues([...droppedRoutes, ...swappedRoutes], random),
    ]).filter((route) => route !== describeRoute(shortest));
    if (wrongRoutes.length < 3) {
      return undefined;
    }
    return {
      ask: "Which routers are on the shortest route from Home to School?",
      scene: map,
      answer: describeRoute(shortest),
      distractors: wrongRoutes.slice(0, 5),
      hint: "Shortest means the fewest hops. Count the routers on each route.",
    };
  }
  if (kindOfAsk === 1) {
    const route = pickOne(routes, random);
    const routerCount = listRoutersOnRoute(route).length;
    return {
      ask: "Follow the moving packet. How many routers does it pass through?",
      scene: { ...map, route },
      answer: String(routerCount),
      distractors: buildNumberDistractors(routerCount, 1),
      hint: "Count only the routers, not Home or School.",
    };
  }
  if (kindOfAsk === 2) {
    return {
      ask: "How many routers are on the shortest route from Home to School?",
      scene: map,
      answer: String(shortestRouterCount),
      distractors: buildNumberDistractors(shortestRouterCount, 1),
      hint: "Find the route with the fewest hops, then count its routers.",
    };
  }
  // Any other route misses at least one of the shortest route's links, so breaking that link leaves it open.
  const concepts =
    routes.length > 1 ? [...packetConcepts, linkBreaksConcept] : packetConcepts;
  return {
    ...pickOne(concepts, random),
    scene: { ...map, route: shortest },
  };
};

const packetPath = defineComputingGame({
  gameType: "packet-path",
  title: "Packet Path",
  skillId: "computing.how-the-internet-works",
  instruction: "Help each packet find its way.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildPacketPathQuestion(difficulty, random)),
  },
});

const webWonders = defineComputingGame({
  gameType: "web-wonders",
  title: "Web Wonders",
  skillId: "computing.world-wide-web",
  instruction: "Read the browser, then choose the right answer.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "What is the World Wide Web?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["www.ocean-facts.example", "Ocean Facts", "See: Sharks"],
          },
        },
        answer: "Web pages linked together",
        distractors: [
          "The cables under the sea",
          "A type of computer",
          "A search engine",
          "The wires in school",
        ],
        hint: "Think of pages joined by links, like a spider's web.",
      },
      {
        ask: "What is the internet?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["www.net-kids.example", "How computers connect"],
          },
        },
        answer: "A huge network of computers",
        distractors: [
          "Just one website",
          "A web browser",
          "A single web page",
          "A type of keyboard",
        ],
        hint: "It joins computers all over the world together.",
      },
      {
        ask: "Is the World Wide Web the same as the internet?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["www.net-kids.example", "Web or internet?"],
          },
        },
        answer: "No, the web uses the internet",
        distractors: [
          "Yes, exactly the same",
          "No, the web came first",
          "Yes, both are browsers",
        ],
        hint: "The web is one of the things that travels over the internet.",
      },
      {
        ask: "What do we call the app you use to look at web pages?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["www.zoo-trip.example", "Welcome to the zoo!"],
          },
        },
        answer: "A web browser",
        distractors: [
          "A spreadsheet",
          "A paint program",
          "A calculator",
          "A router",
        ],
        hint: "It lets you browse from page to page.",
      },
      {
        ask: "You can tap the underlined words to visit another page. What are they?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: [
              "www.ocean-facts.example",
              "Sharks have no bones.",
              "Learn more about sharks",
            ],
          },
        },
        answer: "A link",
        distractors: ["A pop-up", "A password", "A virus", "A spell check"],
        hint: "It links one page to another.",
      },
      {
        ask: "What happens when you tap a link?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["www.space-club.example", "Planets", "Go to: Mars page"],
          },
        },
        answer: "You go to another page",
        distractors: [
          "The page is printed",
          "The tablet turns off",
          "The page is deleted",
        ],
      },
      {
        ask: "Which part of this web address is the website's name?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: { app: "browser", lines: ["www.ocean-facts.example"] },
        },
        answer: "ocean-facts",
        distractors: ["www", ".example", "The dots", "The whole tablet"],
        hint: "It is the part in the middle that tells you what the site is about.",
      },
      {
        ask: "What do the letters www stand for?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: { app: "browser", lines: ["www.bug-hunt.example"] },
        },
        answer: "World Wide Web",
        distractors: ["World Wide Wires", "Web With Words", "Wide World Wifi"],
      },
      {
        ask: "Which of these is a web address?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: { app: "browser", lines: ["Type an address here"] },
        },
        answer: "www.space-club.example",
        distractors: ["space club", "Space Club page", "Mars and Venus"],
        hint: "Web addresses often start with www and have dots in them.",
      },
      {
        ask: "Where do you type a web address?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["www.pet-care.example", "Caring for rabbits"],
          },
        },
        answer: "In the address bar",
        distractors: [
          "On the back button",
          "In the page's pictures",
          "On the volume button",
        ],
        hint: "It is the long box at the top of the browser.",
      },
      {
        ask: "Which button takes you to the page you saw before?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["www.pet-care.example", "Rabbit food"],
          },
        },
        answer: "Back",
        distractors: ["Refresh", "Print", "Close", "Share"],
      },
      {
        ask: "Who can make content for the web?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["www.my-dog-blog.example", "My dog Pip's blog"],
          },
        },
        answer: "Almost anyone",
        distractors: [
          "Only teachers",
          "Only scientists",
          "Only the government",
          "Only computers",
        ],
        hint: "This blog was made by a child. That is why we check what we read.",
      },
      {
        ask: "Where are the web pages you visit stored?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["www.castle-trip.example", "Castles of Wales"],
          },
        },
        answer: "On computers called servers",
        distractors: [
          "Inside your keyboard",
          "In the router's lights",
          "In the tablet's case",
        ],
        hint: "Your browser asks another computer to send the page.",
      },
      {
        ask: "Which of these uses the internet but is not the web?",
        scene: {
          kind: "tablet-screen",
          title: "Mail",
          screen: { app: "email", lines: ["To: Gran", "Hello from school!"] },
        },
        answer: "Sending an email",
        distractors: [
          "Reading a web page",
          "Clicking a link",
          "Visiting a website",
        ],
        hint: "The web is pages and links. Which one is not a page?",
      },
    ],
  },
});

const soundSecondLabels = ["1s", "2s", "3s", "4s", "5s", "6s"] as const;
const soundChartTitle = "Loudness of my clip";

const soundBarCounts: Record<ComputingDifficulty, number> = {
  1: 4,
  2: 5,
  3: 6,
};

const soundAskCounts: Record<ComputingDifficulty, number> = {
  1: 2,
  2: 3,
  3: 5,
};

const soundTools = [
  "Trim",
  "Fade in",
  "Fade out",
  "Turn volume up",
  "Turn volume down",
  "Copy",
] as const;

const buildSoundBars = (values: readonly number[]): ChartBar[] =>
  values.map((value, index) => ({ label: soundSecondLabels[index], value }));

const buildSoundChart = (values: readonly number[]) => ({
  kind: "bar-chart" as const,
  title: soundChartTitle,
  style: "bars" as const,
  bars: buildSoundBars(values),
});

const listOtherLabels = (count: number, answerIndex: number): string[] =>
  soundSecondLabels.slice(0, count).filter((_, index) => index !== answerIndex);

const isOnlyOnce = (values: readonly number[], value: number): boolean =>
  values.filter((other) => other === value).length === 1;

const buildSoundStudioQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const barCount = soundBarCounts[difficulty];
  const kindOfAsk = pickWholeNumber(0, soundAskCounts[difficulty] - 1, random);
  if (kindOfAsk <= 1) {
    const values = Array.from({ length: barCount }, () =>
      pickWholeNumber(2, 20, random),
    );
    const target = kindOfAsk === 0 ? Math.max(...values) : Math.min(...values);
    if (!isOnlyOnce(values, target)) {
      return undefined;
    }
    const answerIndex = values.indexOf(target);
    return {
      ask:
        kindOfAsk === 0
          ? "Which second of the clip is the loudest?"
          : "Which second of the clip is the quietest?",
      scene: buildSoundChart(values),
      answer: soundSecondLabels[answerIndex],
      distractors: listOtherLabels(barCount, answerIndex),
      hint:
        kindOfAsk === 0
          ? "The loudest part has the tallest bar."
          : "The quietest part has the shortest bar.",
    };
  }
  if (kindOfAsk === 2) {
    const silentIndex = random() < 0.5 ? 0 : barCount - 1;
    const values = Array.from({ length: barCount }, (_, index) =>
      index === silentIndex ? 0 : pickWholeNumber(4, 18, random),
    );
    return {
      ask: "Which second is silent and could be trimmed off?",
      scene: buildSoundChart(values),
      answer: soundSecondLabels[silentIndex],
      distractors: listOtherLabels(barCount, silentIndex),
      hint: "Silence has no loudness at all, so there is no bar.",
    };
  }
  if (kindOfAsk === 3) {
    const silentAtStart = pickWholeNumber(1, 2, random);
    const silentAtEnd = pickWholeNumber(0, 1, random);
    const keptCount = barCount - silentAtStart - silentAtEnd;
    const values = Array.from({ length: barCount }, (_, index) =>
      index < silentAtStart || index >= barCount - silentAtEnd
        ? 0
        : pickWholeNumber(4, 18, random),
    );
    const describeSeconds = (count: number) =>
      count === 1 ? "1 second" : `${String(count)} seconds`;
    return {
      ask: "You trim off all the silent seconds. How long is the clip now?",
      scene: buildSoundChart(values),
      answer: describeSeconds(keptCount),
      distractors: [1, 2, 3, 4, 5, 6]
        .filter((count) => count !== keptCount)
        .map(describeSeconds),
      hint: "Count only the seconds that have a bar.",
    };
  }
  const effect = pickOne(
    ["Fade in", "Fade out", "Turn volume up", "Turn volume down"] as const,
    random,
  );
  const steady = pickWholeNumber(14, 18, random);
  const rising = [3, 7, 11, steady, steady - 1, steady];
  const effectValues: Record<typeof effect, number[]> = {
    "Fade in": rising,
    "Fade out": rising.toReversed(),
    "Turn volume up": Array.from({ length: barCount }, () =>
      pickWholeNumber(1, 3, random),
    ),
    "Turn volume down": Array.from({ length: barCount }, () =>
      pickWholeNumber(19, 20, random),
    ),
  };
  const effectAsks: Record<typeof effect, string> = {
    "Fade in": "Look at the start of this clip. Which effect was used?",
    "Fade out": "Look at the end of this clip. Which effect was used?",
    "Turn volume up":
      "The whole clip is too quiet to hear. Which tool fixes it?",
    "Turn volume down": "The whole clip is far too loud. Which tool fixes it?",
  };
  const unfairDistractors: Record<typeof effect, string> = {
    "Fade in": "Turn volume up",
    "Fade out": "Turn volume down",
    "Turn volume up": "Fade in",
    "Turn volume down": "Fade out",
  };
  return {
    ask: effectAsks[effect],
    scene: buildSoundChart(effectValues[effect]),
    answer: effect,
    distractors: soundTools.filter(
      (tool) => tool !== effect && tool !== unfairDistractors[effect],
    ),
    hint: "Look at how the bars change from one second to the next.",
  };
};

const soundStudio = defineComputingGame({
  gameType: "sound-studio",
  title: "Sound Studio",
  skillId: "computing.audio-editing",
  instruction: "Use the loudness bars to edit the sound.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildSoundStudioQuestion(difficulty, random)),
  },
});

interface TurtleShape {
  name: string;
  sides: number;
  angle: number;
}

const turtleShapes: readonly TurtleShape[] = [
  { name: "Triangle", sides: 3, angle: 120 },
  { name: "Square", sides: 4, angle: 90 },
  { name: "Pentagon", sides: 5, angle: 72 },
  { name: "Hexagon", sides: 6, angle: 60 },
  { name: "Octagon", sides: 8, angle: 45 },
];

const describeShapeGoal = (name: string): string =>
  `${/^[AEIOU]/.test(name) ? "an" : "a"} ${name.toLowerCase()}`;

const turtleShapeCounts: Record<ComputingDifficulty, number> = {
  1: 2,
  2: 4,
  3: 5,
};

const turtleAskCounts: Record<ComputingDifficulty, number> = {
  1: 2,
  2: 3,
  3: 4,
};

const turtleMoveLengths = [30, 40, 50, 60, 80] as const;
const turtleRepeatChoices = [2, 3, 4, 5, 6, 8, 10] as const;
const turtleAngleChoices = [45, 60, 72, 90, 120, 180] as const;
const turtleShapeNames = [
  ...turtleShapes.map(({ name }) => name),
  "Circle",
  "Rectangle",
];

const startBlock: CodeBlock = {
  text: "Start on green flag",
  category: "event",
};
const penDownBlock: CodeBlock = { text: "Pen down", category: "looks" };

const describeDegrees = (angle: number): string => `${String(angle)} degrees`;

const buildShapeBlocks = (
  repeatText: string,
  moveText: string,
  turnText: string,
): CodeBlock[] => [
  startBlock,
  penDownBlock,
  { text: repeatText, category: "control" },
  { text: moveText, category: "motion", depth: 1 },
  { text: turnText, category: "motion", depth: 1 },
];

const buildTurtleShapesQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  const shape = pickOne(
    turtleShapes.slice(0, turtleShapeCounts[difficulty]),
    random,
  );
  const moveLength = pickOne(turtleMoveLengths, random);
  const moveText = `Move ${String(moveLength)}`;
  const repeatText = `Repeat ${String(shape.sides)}`;
  const turnText = `Turn right ${String(shape.angle)}`;
  const kindOfAsk = pickWholeNumber(0, turtleAskCounts[difficulty] - 1, random);
  if (kindOfAsk === 0) {
    return {
      ask: "What shape will the pen draw?",
      scene: {
        kind: "code-stack",
        blocks: buildShapeBlocks(repeatText, moveText, turnText),
      },
      answer: shape.name,
      distractors: turtleShapeNames.filter((name) => name !== shape.name),
      hint: "The repeat number tells you how many sides the shape has.",
    };
  }
  if (kindOfAsk === 1) {
    return {
      ask: `The pen should draw ${describeShapeGoal(shape.name)}, drawing each side once. What number goes in the repeat?`,
      scene: {
        kind: "code-stack",
        blocks: buildShapeBlocks("Repeat ?", moveText, turnText),
      },
      answer: String(shape.sides),
      distractors: turtleRepeatChoices
        .filter((choice) => choice % shape.sides !== 0)
        .map(String),
      hint: "Each time round the loop draws one side. How many sides are there?",
    };
  }
  if (kindOfAsk === 2) {
    return {
      ask: `The pen should draw ${describeShapeGoal(shape.name)}. How far should each turn be?`,
      scene: {
        kind: "code-stack",
        blocks: buildShapeBlocks(repeatText, moveText, "Turn right ?"),
      },
      answer: describeDegrees(shape.angle),
      distractors: turtleAngleChoices
        .filter((choice) => choice !== shape.angle)
        .map(describeDegrees),
      hint: "All the turns add up to one full turn of 360 degrees. Share 360 between the sides.",
    };
  }
  const longSide = pickOne([60, 80], random);
  const shortSide = longSide / 2;
  return {
    ask: "What shape will the pen draw?",
    scene: {
      kind: "code-stack",
      blocks: [
        startBlock,
        penDownBlock,
        { text: "Repeat 2", category: "control" },
        { text: `Move ${String(longSide)}`, category: "motion", depth: 1 },
        { text: "Turn right 90", category: "motion", depth: 1 },
        { text: `Move ${String(shortSide)}`, category: "motion", depth: 1 },
        { text: "Turn right 90", category: "motion", depth: 1 },
      ],
    },
    answer: "Rectangle",
    distractors: ["Square", "Triangle", "Hexagon", "Pentagon"],
    hint: "Two of the sides are long and two are short.",
  };
};

const turtleShapesGame = defineComputingGame({
  gameType: "turtle-shapes",
  title: "Turtle Shapes",
  skillId: "computing.repetition-in-shapes",
  instruction: "Use the repeat loop to work out the shape.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildTurtleShapesQuestion(difficulty, random),
      ),
  },
});

const loopGridSizes: Record<ComputingDifficulty, number> = {
  1: 6,
  2: 6,
  3: 7,
};

const loopBodyLengths: Record<ComputingDifficulty, readonly number[]> = {
  1: [1, 2],
  2: [2],
  3: [2, 3],
};

const loopRepeatRanges: Record<ComputingDifficulty, [number, number]> = {
  1: [2, 3],
  2: [2, 4],
  3: [3, 4],
};

const loopLetters = ["A", "B", "C", "D"];

const buildLoopBody = (length: number, random: () => number): Direction[] => {
  const first = pickOne(directions, random);
  const turn = pickOne(
    directions.filter(
      (direction) =>
        direction !== first && direction !== findOppositeDirection(first),
    ),
    random,
  );
  const allowed = [first, turn];
  return [
    first,
    ...Array.from({ length: length - 1 }, () => pickOne(allowed, random)),
  ];
};

const buildRepeatedPath = (
  body: readonly Direction[],
  repeats: number,
): Direction[] => Array.from({ length: repeats }, () => body).flat();

const describeLoop = (body: readonly Direction[], repeats: number): string =>
  `Repeat ${String(repeats)}: ${describeArrows(body)}`;

const buildLoopLegendsQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const size = loopGridSizes[difficulty];
  const body = buildLoopBody(
    pickOne(loopBodyLengths[difficulty], random),
    random,
  );
  const [fewest, most] = loopRepeatRanges[difficulty];
  const repeats = pickWholeNumber(fewest, most, random);
  const robot = pickCell(size, size, random);
  const path = buildRepeatedPath(body, repeats);
  const isPathInside = followPath(robot, path).every((cell) =>
    isInsideGrid(cell, size, size),
  );
  if (!isPathInside) {
    return undefined;
  }
  const end = findEnd(robot, path);
  if (random() < 0.5) {
    const repeatChoices = [repeats - 2, repeats - 1, repeats + 1, repeats + 2]
      .filter((count) => count >= 1)
      .map(String);
    return {
      ask: `Bolt repeats ${describeArrows(body)} again and again. How many repeats reach the star?`,
      scene: {
        kind: "robot-grid",
        columns: size,
        rows: size,
        robot,
        goal: end,
      },
      answer: String(repeats),
      distractors: [...repeatChoices, String(repeats + 3)].slice(0, 4),
      hint: "Move your finger through the arrows once, then again, counting each time.",
    };
  }
  const slips = [
    findEnd(robot, buildRepeatedPath(body, repeats - 1)),
    findEnd(robot, buildRepeatedPath(body, repeats + 1)),
    findEnd(robot, body),
    findEnd(robot, [...path, body[0]]),
    pickCell(size, size, random),
    pickCell(size, size, random),
    pickCell(size, size, random),
  ];
  const landingCells = [end];
  for (const slip of slips) {
    if (
      landingCells.length < loopLetters.length &&
      isInsideGrid(slip, size, size) &&
      !isSameCell(slip, robot) &&
      !landingCells.some((cell) => isSameCell(cell, slip))
    ) {
      landingCells.push(slip);
    }
  }
  if (landingCells.length < loopLetters.length) {
    return undefined;
  }
  const shuffledCells = shuffleValues(landingCells, random);
  const answerIndex = shuffledCells.findIndex((cell) => isSameCell(cell, end));
  return {
    ask: `Bolt runs ${describeLoop(body, repeats)}. Where will Bolt stop?`,
    scene: {
      kind: "robot-grid",
      columns: size,
      rows: size,
      robot,
      labels: shuffledCells.map((cell, index) => ({
        cell,
        text: loopLetters[index],
      })),
    },
    answer: loopLetters[answerIndex],
    distractors: loopLetters.filter((_, index) => index !== answerIndex),
    hint: "Do all the arrows inside the loop, then do them again for each repeat.",
  };
};

const loopLegends = defineComputingGame({
  gameType: "loop-legends",
  title: "Loop Legends",
  skillId: "computing.repetition-in-games",
  instruction: "Work out where the loop takes Bolt.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildLoopLegendsQuestion(difficulty, random)),
  },
});

interface LoggerSensor {
  name: string;
  title: string;
  smallest: number;
  largest: number;
  differenceAsk: (higher: string, lower: string) => string;
}

const loggerSensors: readonly LoggerSensor[] = [
  {
    name: "Temperature sensor",
    title: "Temperature in °C",
    smallest: 8,
    largest: 20,
    differenceAsk: (higher, lower) =>
      `How many degrees warmer was it at ${higher} than at ${lower}?`,
  },
  {
    name: "Light sensor",
    title: "Light level",
    smallest: 1,
    largest: 20,
    differenceAsk: (higher, lower) =>
      `How much higher was the light level at ${higher} than at ${lower}?`,
  },
  {
    name: "Sound sensor",
    title: "Sound level",
    smallest: 1,
    largest: 20,
    differenceAsk: (higher, lower) =>
      `How much higher was the sound level at ${higher} than at ${lower}?`,
  },
];

const loggerContexts: readonly { place: string; sensorName: string }[] = [
  { place: "how warm the greenhouse got", sensorName: "Temperature sensor" },
  { place: "how cold the fridge stayed", sensorName: "Temperature sensor" },
  { place: "how bright the classroom was", sensorName: "Light sensor" },
  { place: "when it got dark outside", sensorName: "Light sensor" },
  { place: "how noisy the lunch hall was", sensorName: "Sound sensor" },
  { place: "how loud the playground got", sensorName: "Sound sensor" },
];

const loggerSensorNames = [
  "Temperature sensor",
  "Light sensor",
  "Sound sensor",
  "Motion sensor",
  "Keyboard",
];

const loggerIntervals: Record<ComputingDifficulty, readonly number[]> = {
  1: [60],
  2: [30, 60],
  3: [10, 15, 30, 60],
};

const loggerReadingCounts: Record<ComputingDifficulty, number> = {
  1: 4,
  2: 5,
  3: 6,
};

const loggerAskCounts: Record<ComputingDifficulty, number> = {
  1: 3,
  2: 5,
  3: 6,
};

const describeInterval = (minutes: number): string =>
  minutes % 60 === 0
    ? minutes === 60
      ? "Every hour"
      : `Every ${String(minutes / 60)} hours`
    : `Every ${String(minutes)} minutes`;

const loggerIntervalChoices = [10, 15, 30, 60, 120].map(describeInterval);

const formatClockTime = (minutesAfterMidnight: number): string => {
  const hours = Math.floor(minutesAfterMidnight / 60);
  const minutes = minutesAfterMidnight % 60;
  return `${String(hours)}:${String(minutes).padStart(2, "0")}`;
};

const buildDataLoggerQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const readingCount = loggerReadingCounts[difficulty];
  const interval = pickOne(loggerIntervals[difficulty], random);
  const startMinutes = pickWholeNumber(9, 13, random) * 60;
  const times = Array.from({ length: readingCount }, (_, index) =>
    formatClockTime(startMinutes + index * interval),
  );
  const kindOfAsk = pickWholeNumber(0, loggerAskCounts[difficulty] - 1, random);
  const context = pickOne(loggerContexts, random);
  const sensor =
    kindOfAsk === 2
      ? (loggerSensors.find(({ name }) => name === context.sensorName) ??
        loggerSensors[0])
      : pickOne(loggerSensors, random);
  const values = Array.from({ length: readingCount }, () =>
    pickWholeNumber(sensor.smallest, sensor.largest, random),
  );
  const bars = values.map((value, index) => ({ label: times[index], value }));
  const chart = {
    kind: "bar-chart" as const,
    title: sensor.title,
    style: "line" as const,
    bars,
  };
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const listOtherTimes = (answerIndex: number) =>
    times.filter((_, index) => index !== answerIndex);
  if (kindOfAsk <= 1) {
    const target = kindOfAsk === 0 ? highest : lowest;
    if (!isOnlyOnce(values, target)) {
      return undefined;
    }
    const answerIndex = values.indexOf(target);
    return {
      ask:
        kindOfAsk === 0
          ? "At what time was the reading highest?"
          : "At what time was the reading lowest?",
      scene: chart,
      answer: times[answerIndex],
      distractors: listOtherTimes(answerIndex),
      hint:
        kindOfAsk === 0
          ? "Find the highest point on the line, then read the time below it."
          : "Find the lowest point on the line, then read the time below it.",
    };
  }
  if (kindOfAsk === 2) {
    return {
      ask: `A data logger measured ${context.place}. Which sensor did it use?`,
      scene: { ...chart, title: "Logger readings" },
      answer: context.sensorName,
      distractors: loggerSensorNames.filter(
        (name) => name !== context.sensorName,
      ),
      hint: "Think about what was being measured: heat, light or sound?",
    };
  }
  if (kindOfAsk === 3) {
    const [firstIndex, secondIndex] = shuffleValues(
      times.map((_, index) => index),
      random,
    );
    if (values[firstIndex] === values[secondIndex]) {
      return undefined;
    }
    const higherIndex =
      values[firstIndex] > values[secondIndex] ? firstIndex : secondIndex;
    const lowerIndex = higherIndex === firstIndex ? secondIndex : firstIndex;
    const difference = values[higherIndex] - values[lowerIndex];
    return {
      ask: sensor.differenceAsk(times[higherIndex], times[lowerIndex]),
      scene: chart,
      answer: String(difference),
      distractors: buildNumberDistractors(difference, 1),
      hint: "Read both values from the line, then take the smaller from the bigger.",
    };
  }
  if (kindOfAsk === 4) {
    const answer = describeInterval(interval);
    return {
      ask: "How often did the data logger take a reading?",
      scene: chart,
      answer,
      distractors: loggerIntervalChoices.filter((choice) => choice !== answer),
      hint: "Look at the times along the bottom. How far apart are they?",
    };
  }
  const range = highest - lowest;
  if (range === 0) {
    return undefined;
  }
  return {
    ask: "What is the difference between the highest and lowest reading?",
    scene: chart,
    answer: String(range),
    distractors: buildNumberDistractors(range, 1),
    hint: "Find the top and bottom points, then subtract.",
  };
};

const dataLogger = defineComputingGame({
  gameType: "data-logger",
  title: "Data Logger",
  skillId: "computing.data-logging",
  instruction: "Read the graph to find the answer.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildDataLoggerQuestion(difficulty, random)),
  },
});

const photoFixer = defineComputingGame({
  gameType: "photo-fixer",
  title: "Photo Fixer",
  skillId: "computing.photo-editing",
  instruction: "Choose the best edit for the photo.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which edit would fix this photo?",
        scene: {
          kind: "photo-frame",
          subject: "mountain",
          orientation: "landscape",
          light: "good",
          focus: "sharp",
          tilt: "crooked",
          shot: "wide",
        },
        answer: "Rotate to straighten",
        distractors: [
          "Make it brighter",
          "Make it darker",
          "Add a funny filter",
          "Crop the top off",
        ],
        hint: "Look at the edges of the photo. Is anything leaning?",
      },
      {
        ask: "Which edit would fix this photo?",
        scene: {
          kind: "photo-frame",
          subject: "cat",
          orientation: "landscape",
          light: "dark",
          focus: "sharp",
          tilt: "level",
          shot: "medium",
        },
        answer: "Make it brighter",
        distractors: ["Make it darker", "Rotate it", "Crop it", "Flip it"],
        hint: "Can you see the cat clearly? What is wrong with the light?",
      },
      {
        ask: "Which edit would fix this photo?",
        scene: {
          kind: "photo-frame",
          subject: "flower",
          orientation: "portrait",
          light: "bright",
          focus: "sharp",
          tilt: "level",
          shot: "close-up",
        },
        answer: "Make it darker",
        distractors: ["Make it brighter", "Rotate it", "Crop it", "Flip it"],
        hint: "The colours look washed out. Is there too much light or too little?",
      },
      {
        ask: "You want the house to fill the whole photo. Which edit helps?",
        scene: {
          kind: "photo-frame",
          subject: "house",
          orientation: "landscape",
          light: "good",
          focus: "sharp",
          tilt: "level",
          shot: "wide",
        },
        answer: "Crop it",
        distractors: ["Rotate it", "Make it darker", "Make it brighter"],
        hint: "Which edit cuts away the parts you do not need?",
      },
      {
        ask: "This photo is very blurry. What is the best fix?",
        scene: {
          kind: "photo-frame",
          subject: "tree",
          orientation: "portrait",
          light: "good",
          focus: "blurry",
          tilt: "level",
          shot: "medium",
        },
        answer: "Take the photo again",
        distractors: ["Make it darker", "Rotate it", "Crop it smaller"],
        hint: "Editing cannot bring back detail the camera never caught.",
      },
      {
        ask: "What does cropping a photo do?",
        scene: {
          kind: "photo-frame",
          subject: "friends",
          orientation: "landscape",
          light: "good",
          focus: "sharp",
          tilt: "level",
          shot: "wide",
        },
        answer: "Cuts away the edges",
        distractors: [
          "Makes it brighter",
          "Turns it round",
          "Adds a sound",
          "Makes it blurry",
        ],
      },
      {
        ask: "What does rotating a photo do?",
        scene: {
          kind: "photo-frame",
          subject: "tree",
          orientation: "landscape",
          light: "good",
          focus: "sharp",
          tilt: "crooked",
          shot: "wide",
        },
        answer: "Turns the photo round",
        distractors: [
          "Cuts the edges off",
          "Makes it darker",
          "Makes it blurry",
          "Adds more people",
        ],
      },
      {
        ask: "This photo was crooked before. Which edit was made?",
        scene: {
          kind: "photo-frame",
          subject: "mountain",
          orientation: "landscape",
          light: "good",
          focus: "sharp",
          tilt: "level",
          shot: "wide",
        },
        answer: "It was straightened",
        distractors: [
          "It was made darker",
          "It was made blurry",
          "It was made brighter",
        ],
      },
      {
        ask: "This photo was too dark before. Which edit was made?",
        scene: {
          kind: "photo-frame",
          subject: "cat",
          orientation: "landscape",
          light: "good",
          focus: "sharp",
          tilt: "level",
          shot: "medium",
        },
        answer: "It was made brighter",
        distractors: ["It was made darker", "It was rotated", "It was cropped"],
      },
      {
        ask: "Is it OK to change a photo to trick people?",
        scene: {
          kind: "photo-frame",
          subject: "friends",
          orientation: "landscape",
          light: "good",
          focus: "sharp",
          tilt: "level",
          shot: "medium",
        },
        answer: "No, it is not honest",
        distractors: [
          "Yes, always",
          "Yes, if it is funny",
          "Yes, if nobody checks",
        ],
        hint: "Think about how the people who see it would feel.",
      },
      {
        ask: "An advert photo was edited to make a house look bigger. Is that fair?",
        scene: {
          kind: "photo-frame",
          subject: "house",
          orientation: "portrait",
          light: "bright",
          focus: "sharp",
          tilt: "level",
          shot: "close-up",
        },
        answer: "No, it misleads people",
        distractors: [
          "Yes, adverts can trick",
          "Yes, it looks nicer",
          "It does not matter",
        ],
      },
      {
        ask: "You changed a photo a lot before sharing it. What is honest?",
        scene: {
          kind: "photo-frame",
          subject: "flower",
          orientation: "portrait",
          light: "good",
          focus: "sharp",
          tilt: "level",
          shot: "close-up",
        },
        answer: "Say that it was edited",
        distractors: [
          "Say it is untouched",
          "Hide the first photo",
          "Pretend it is real",
        ],
      },
      {
        ask: "You want to edit a photo of your friend and post it. What first?",
        scene: {
          kind: "photo-frame",
          subject: "friends",
          orientation: "portrait",
          light: "good",
          focus: "sharp",
          tilt: "level",
          shot: "close-up",
        },
        answer: "Ask if they are happy",
        distractors: [
          "Make them look silly",
          "Post it straight away",
          "Keep it a surprise",
        ],
        hint: "It is their face. How would you feel?",
      },
      {
        ask: "Before you start editing, what is a good idea to keep?",
        scene: {
          kind: "photo-frame",
          subject: "tree",
          orientation: "landscape",
          light: "dark",
          focus: "sharp",
          tilt: "level",
          shot: "wide",
        },
        answer: "A copy of the original",
        distractors: ["Nothing at all", "Only the edited one", "A blank page"],
        hint: "What if you want to undo everything later?",
      },
    ],
  },
});

interface LoopPuzzle {
  goal: string;
  blocks: CodeBlock[];
  bugText: string;
  fixText: string;
  fixChoices: string[];
  gadget?: CodeGadget;
}

const fixShapeCounts: Record<ComputingDifficulty, number> = {
  1: 2,
  2: 4,
  3: 5,
};

const fixRepeatChoices = [2, 3, 4, 5, 6, 8];

const listWrongRepeatCounts = (correct: number): number[] =>
  fixRepeatChoices.filter((count) => count % correct !== 0);

const buildRepeatChoices = (correct: number): string[] =>
  listWrongRepeatCounts(correct).map((count) => `Repeat ${String(count)}`);

const buildShapeLoopPuzzle = (
  difficulty: ComputingDifficulty,
  random: () => number,
): LoopPuzzle => {
  const shape = pickOne(
    turtleShapes.slice(0, fixShapeCounts[difficulty]),
    random,
  );
  const moveText = `Move ${String(pickOne(turtleMoveLengths, random))}`;
  const repeatText = `Repeat ${String(shape.sides)}`;
  const turnText = `Turn right ${String(shape.angle)}`;
  const goal = `Goal: draw ${describeShapeGoal(shape.name)}, drawing each side once.`;
  const bugKind =
    difficulty === 1 ? "repeat" : pickOne(["repeat", "turn", "block"], random);
  if (bugKind === "repeat") {
    const wrongCount = pickOne(listWrongRepeatCounts(shape.sides), random);
    const bugText = `Repeat ${String(wrongCount)}`;
    return {
      goal,
      blocks: buildShapeBlocks(bugText, moveText, turnText),
      bugText,
      fixText: repeatText,
      fixChoices: buildRepeatChoices(shape.sides),
    };
  }
  if (bugKind === "turn") {
    const turnChoices = turtleAngleChoices
      .filter((angle) => angle !== shape.angle)
      .map((angle) => `Turn right ${String(angle)}`);
    const bugText = pickOne(turnChoices, random);
    return {
      goal,
      blocks: buildShapeBlocks(repeatText, moveText, bugText),
      bugText,
      fixText: turnText,
      fixChoices: turnChoices,
    };
  }
  const bugText = pickOne(["Play a beep", "Say hello"], random);
  return {
    goal,
    blocks: buildShapeBlocks(repeatText, bugText, turnText),
    bugText,
    fixText: moveText,
    fixChoices: ["Play a beep", "Say hello", "Pen up", "Wait 1 second"].filter(
      (text) => text !== bugText,
    ),
  };
};

const buildLampLoopPuzzle = (
  difficulty: ComputingDifficulty,
  random: () => number,
): LoopPuzzle => {
  const flashes = pickWholeNumber(2, 6, random);
  const repeatText = `Repeat ${String(flashes)}`;
  const goal = `Goal: flash the lamp on and off ${String(flashes)} times.`;
  const buildLampBlocks = (loopText: string, offText: string): CodeBlock[] => [
    startBlock,
    { text: loopText, category: "control" },
    { text: "Lamp on", category: "looks", depth: 1 },
    { text: "Wait 1 second", category: "control", depth: 1 },
    { text: offText, category: "looks", depth: 1 },
    { text: "Wait 1 second", category: "control", depth: 1 },
  ];
  const gadget: CodeGadget = { kind: "lamp", isOn: true };
  if (difficulty === 1 || random() < 0.5) {
    const wrongCount = pickOne(
      fixRepeatChoices.filter((count) => count !== flashes),
      random,
    );
    const bugText = `Repeat ${String(wrongCount)}`;
    return {
      goal,
      blocks: buildLampBlocks(bugText, "Lamp off"),
      bugText,
      fixText: repeatText,
      fixChoices: fixRepeatChoices
        .filter((count) => count !== flashes)
        .map((count) => `Repeat ${String(count)}`),
      gadget,
    };
  }
  return {
    goal,
    blocks: buildLampBlocks(repeatText, "Play a beep"),
    bugText: "Play a beep",
    fixText: "Lamp off",
    fixChoices: ["Play a beep", "Lamp on", "Say hello", "Move 10"],
    gadget,
  };
};

const buildFixTheLoopQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  if (difficulty === 3 && random() < 0.3) {
    const drums = pickWholeNumber(2, 5, random);
    return {
      ask: `Goal: drum ${String(drums)} times, then ring the bell once. Which block should move out of the loop?`,
      scene: {
        kind: "code-stack",
        blocks: [
          startBlock,
          { text: `Repeat ${String(drums)}`, category: "control" },
          { text: "Play drum", category: "sound", depth: 1 },
          { text: "Wait 1 second", category: "control", depth: 1 },
          { text: "Play bell", category: "sound", depth: 1 },
        ],
      },
      answer: "Play bell",
      distractors: [
        startBlock.text,
        `Repeat ${String(drums)}`,
        "Play drum",
        "Wait 1 second",
      ],
      hint: "Blocks inside the loop happen every time round. Which should happen only once?",
    };
  }
  const puzzle =
    random() < 0.6
      ? buildShapeLoopPuzzle(difficulty, random)
      : buildLampLoopPuzzle(difficulty, random);
  const scene = {
    kind: "code-stack" as const,
    blocks: puzzle.blocks,
    ...(puzzle.gadget === undefined ? {} : { gadget: puzzle.gadget }),
  };
  const isFixAsk = difficulty > 1 && random() < 0.5;
  if (isFixAsk) {
    return {
      ask: `${puzzle.goal} Which block should replace ${puzzle.bugText}?`,
      scene,
      answer: puzzle.fixText,
      distractors: puzzle.fixChoices.filter(
        (choice) => choice !== puzzle.fixText && choice !== puzzle.bugText,
      ),
      hint: "Think about what the goal needs each time round the loop.",
    };
  }
  return {
    ask: `${puzzle.goal} Which block is the bug?`,
    scene,
    answer: puzzle.bugText,
    distractors: listUniqueValues(puzzle.blocks.map(({ text }) => text)).filter(
      (text) => text !== puzzle.bugText,
    ),
    hint: "Check the repeat number first, then each block inside the loop.",
  };
};

const fixTheLoop = defineComputingGame({
  gameType: "fix-the-loop",
  title: "Fix the Loop",
  skillId: "computing.debug-loops",
  instruction: "Find and fix the bug in the loop.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildFixTheLoopQuestion(difficulty, random),
      ),
  },
});

const factOrFake = defineComputingGame({
  gameType: "fact-or-fake",
  title: "Fact or Fake?",
  skillId: "computing.reliable-information",
  instruction: "Decide what you can trust online.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which line on this page is an advert?",
        scene: {
          kind: "tablet-screen",
          title: "Shark Fact File",
          screen: {
            app: "browser",
            lines: [
              "www.sea-life.example",
              "Sharks have no bones.",
              "AD: Buy shark toys now!",
              "Written by Dr Shah",
            ],
          },
        },
        answer: "AD: Buy shark toys now!",
        distractors: [
          "Sharks have no bones.",
          "Written by Dr Shah",
          "www.sea-life.example",
        ],
        hint: "Adverts try to sell you something.",
      },
      {
        ask: "Why are adverts put on web pages?",
        scene: {
          kind: "tablet-screen",
          title: "Ad",
          screen: {
            app: "pop-up",
            lines: ["Super Sneakers!", "Half price today!", "Buy now"],
          },
        },
        answer: "To sell you something",
        distractors: [
          "To teach you facts",
          "To keep you safe",
          "To fix the page",
        ],
      },
      {
        ask: "Which is a clue that a page might not be reliable?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: [
              "www.dino-truth.example",
              "dinosaurs is still alive",
              "i seen won!!!",
            ],
          },
        },
        answer: "Lots of spelling mistakes",
        distractors: [
          "It has a date on it",
          "It names an expert",
          "It lists its sources",
        ],
        hint: "Look closely at how the page is written.",
      },
      {
        ask: "What should you do before you believe this post?",
        scene: {
          kind: "tablet-screen",
          title: "Friends feed",
          screen: {
            app: "social",
            lines: ["Carrots let you see", "in the dark!!!", "SHARE NOW!!!"],
          },
        },
        answer: "Check other trusted sites",
        distractors: [
          "Share it straight away",
          "Believe it, it is online",
          "Add more exclamation marks",
        ],
        hint: "One post is not enough. What could you compare it with?",
      },
      {
        ask: "Which website is most likely to be reliable about space?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: { app: "browser", lines: ["Search: facts about Mars"] },
        },
        answer: "A space science centre",
        distractors: [
          "An advert for telescopes",
          "A stranger's comment",
          "A joke video",
        ],
        hint: "Who knows the most about space and wants to teach it?",
      },
      {
        ask: "This page was last updated in 2009. Why might that matter?",
        scene: {
          kind: "tablet-screen",
          title: "Phone Facts",
          screen: {
            app: "browser",
            lines: ["www.tech-facts.example", "Newest phones", "Updated 2009"],
          },
        },
        answer: "It may be out of date",
        distractors: [
          "Old pages are always right",
          "It must be an advert",
          "Dates never matter",
        ],
      },
      {
        ask: "Why is this page more trustworthy?",
        scene: {
          kind: "tablet-screen",
          title: "Ocean Life",
          screen: {
            app: "browser",
            lines: [
              "www.ocean-lab.example",
              "Written by Dr Lee,",
              "ocean scientist",
              "Sources listed below",
            ],
          },
        },
        answer: "An expert wrote it",
        distractors: [
          "It has bright colours",
          "It has lots of adverts",
          "It has a pop-up",
        ],
      },
      {
        ask: "A video shows a cat flying a plane. What is it most likely to be?",
        scene: {
          kind: "tablet-screen",
          title: "Videos",
          screen: { app: "video", lines: ["Cat flies a plane!", "1M views"] },
        },
        answer: "Edited or fake",
        distractors: ["Real news", "A science fact", "A live report"],
        hint: "Could this really happen?",
      },
      {
        ask: "What does sponsored mean on a post?",
        scene: {
          kind: "tablet-screen",
          title: "Friends feed",
          screen: {
            app: "social",
            lines: ["Sponsored", "Try Crunch Bars today!"],
          },
        },
        answer: "Someone paid for it",
        distractors: [
          "It is a true fact",
          "A teacher checked it",
          "It is very old",
        ],
      },
      {
        ask: "Is everything on the internet true?",
        scene: {
          kind: "tablet-screen",
          title: "Friends feed",
          screen: {
            app: "social",
            lines: ["Fish can climb trees!", "Posted by Fun4U"],
          },
        },
        answer: "No, anyone can post",
        distractors: [
          "Yes, it is all checked",
          "Yes, if it is popular",
          "Yes, if it has a photo",
        ],
      },
      {
        ask: "Two sites say one thing and a third says another. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["Search: tallest animal", "3 results"],
          },
        },
        answer: "Check more trusted sources",
        distractors: [
          "Believe the odd one out",
          "Pick the funniest one",
          "Stop looking at once",
        ],
        hint: "The more good sources agree, the more sure you can be.",
      },
      {
        ask: "Which clue shows this headline is fake?",
        scene: {
          kind: "tablet-screen",
          title: "News?",
          screen: {
            app: "browser",
            lines: ["www.wow-news.example", "Chocolate makes", "you fly!"],
          },
        },
        answer: "It claims the impossible",
        distractors: ["It is about chocolate", "It has a title", "It is short"],
      },
    ],
  },
});

const footprintFinder = defineComputingGame({
  gameType: "footprint-finder",
  title: "Footprint Finder",
  skillId: "computing.digital-footprint",
  instruction: "Choose the wise thing to post or share.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "What is a digital footprint?",
        scene: {
          kind: "tablet-screen",
          title: "My profile",
          screen: {
            app: "social",
            lines: ["Posts: 12", "Photos: 5", "Comments: 30"],
          },
        },
        answer: "What you leave online",
        distractors: ["A muddy shoe print", "A type of virus", "Your password"],
        hint: "Think of everything you post, like, and share.",
      },
      {
        ask: "Is it OK to post this?",
        scene: {
          kind: "tablet-screen",
          title: "New post",
          screen: {
            app: "social",
            lines: ["My new house!", "12 Elm Road"],
          },
        },
        answer: "No, it shows your address",
        distractors: [
          "Yes, anyone can see it",
          "Yes, it is a nice house",
          "Yes, add your phone number",
        ],
        hint: "Would you want a stranger to know where you live?",
      },
      {
        ask: "Is it OK to post this?",
        scene: {
          kind: "tablet-screen",
          title: "New post",
          screen: { app: "social", lines: ["I scored a goal today!"] },
        },
        answer: "Yes, it shares nothing private",
        distractors: [
          "No, never post anything",
          "Only with your address",
          "Only with your password",
        ],
      },
      {
        ask: "You delete a post. Is it gone for ever?",
        scene: {
          kind: "tablet-screen",
          title: "Delete post?",
          screen: { app: "pop-up", lines: ["Delete this post?", "Yes   No"] },
        },
        answer: "Not always, it may be saved",
        distractors: [
          "Yes, completely",
          "Yes, after one minute",
          "Only if nobody liked it",
        ],
        hint: "Someone may have copied it before you deleted it.",
      },
      {
        ask: "Who can see a public post?",
        scene: {
          kind: "tablet-screen",
          title: "New post",
          screen: { app: "social", lines: ["Public", "Look at my drawing!"] },
        },
        answer: "Anyone online",
        distractors: ["Only you", "Only your family", "Only your teacher"],
      },
      {
        ask: "Your friend shares your post. What can happen?",
        scene: {
          kind: "tablet-screen",
          title: "Friends feed",
          screen: {
            app: "social",
            lines: ["Ava shared your post", "Shared 40 times"],
          },
        },
        answer: "Many more people see it",
        distractors: [
          "It disappears",
          "Only Ava can see it",
          "It turns private",
        ],
      },
      {
        ask: "Before you post, what should you ask yourself?",
        scene: {
          kind: "tablet-screen",
          title: "New post",
          screen: { app: "social", lines: ["What's on your mind?"] },
        },
        answer: "Would I mind everyone seeing?",
        distractors: [
          "Will it get lots of likes?",
          "Is it really long?",
          "Is it all in capitals?",
        ],
      },
      {
        ask: "This photo shows your school badge. Why is that a problem?",
        scene: {
          kind: "tablet-screen",
          title: "New post",
          screen: {
            app: "social",
            lines: ["Photo: me in uniform", "Badge: Oak Hill School"],
          },
        },
        answer: "Strangers could find you",
        distractors: [
          "The photo is too bright",
          "Badges are not allowed",
          "Nothing at all",
        ],
      },
      {
        ask: "Which is the safest username?",
        scene: {
          kind: "tablet-screen",
          title: "Sign up",
          screen: { app: "login", lines: ["Choose a username", "________"] },
        },
        answer: "A made-up nickname",
        distractors: ["Your full name", "Your school and age", "Your birthday"],
        hint: "A good username does not tell people who you are.",
      },
      {
        ask: "Someone posted an embarrassing photo of you. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Friends feed",
          screen: {
            app: "social",
            lines: ["Look at this LOL", "Photo of you"],
          },
        },
        answer: "Tell a trusted adult",
        distractors: [
          "Post one of them back",
          "Keep it a secret",
          "Share it even more",
        ],
        hint: "You do not have to sort this out alone.",
      },
      {
        ask: "You posted something unkind and feel bad. What is best?",
        scene: {
          kind: "tablet-screen",
          title: "My posts",
          screen: {
            app: "social",
            lines: ["Your post", "That game is rubbish"],
          },
        },
        answer: "Delete it and say sorry",
        distractors: [
          "Post something worse",
          "Pretend it was not you",
          "Hide it from adults",
        ],
        hint: "Everyone makes mistakes. Putting it right is brave.",
      },
      {
        ask: "Why does your digital footprint matter later on?",
        scene: {
          kind: "tablet-screen",
          title: "Search",
          screen: { app: "browser", lines: ["Search your name", "8 results"] },
        },
        answer: "People may see it years on",
        distractors: [
          "It vanishes at age 11",
          "Nobody ever looks",
          "It only lasts a day",
        ],
      },
      {
        ask: "Someone online asks for a photo of you. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [{ from: "Pal_77", text: "Send me a photo of you" }],
          },
        },
        answer: "Don't send it, tell an adult",
        distractors: [
          "Send one quickly",
          "Send a friend's photo",
          "Keep it a secret",
        ],
      },
    ],
  },
});

export const yearFourComputingGames = [
  packetPath,
  webWonders,
  soundStudio,
  turtleShapesGame,
  loopLegends,
  dataLogger,
  photoFixer,
  fixTheLoop,
  factOrFake,
  footprintFinder,
] as const;
