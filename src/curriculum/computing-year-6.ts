import {
  buildNumberDistractors,
  defineComputingGame,
  pickOne,
  pickWholeNumber,
  shuffleValues,
  type CodeBlock,
  type ComputingDifficulty,
  type ComputingQuestion,
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

const buildNumberChoices = (
  answer: number,
  tempting: readonly number[],
  random: () => number,
): string[] => {
  const temptingChoices = tempting
    .filter((value) => value >= 0 && value !== answer)
    .map(String);
  const nearChoices = shuffleValues(buildNumberDistractors(answer), random);
  const uniqueChoices = [...new Set([...temptingChoices, ...nearChoices])];
  return uniqueChoices.slice(0, 5);
};

const searchSkills = defineComputingGame({
  gameType: "search-skills",
  title: "Search Skills",
  skillId: "computing.effective-searching",
  instruction: "Choose the best search or the most helpful result.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "You want to know how bees make honey. Which search is best?",
        scene: {
          kind: "search-engine",
          query: "What should I type?",
          results: [
            { title: "Search tips", address: "www.search-help.example" },
          ],
        },
        answer: "how bees make honey",
        distractors: ["bees", "I like bees a lot", "honey on toast", "make"],
        hint: "Pick the words that match exactly what you want to find out.",
      },
      {
        ask: "Which of these results is an advert?",
        scene: {
          kind: "search-engine",
          query: "roman soldiers facts",
          results: [
            {
              title: "Roman Soldiers for Kids",
              address: "www.history-hub.example",
            },
            {
              title: "Buy Toy Swords Now!",
              address: "www.toy-shop.example",
              isAdvert: true,
            },
            {
              title: "Life in the Roman Army",
              address: "www.museum-trail.example",
            },
          ],
        },
        answer: "Buy Toy Swords Now!",
        distractors: [
          "Roman Soldiers for Kids",
          "Life in the Roman Army",
          "None of them",
        ],
        hint: "Adverts are paid for. Look for a small label on the card.",
      },
      {
        ask: "You want pages with the exact words Great Fire of London. What do you type?",
        scene: {
          kind: "search-engine",
          query: "Great Fire of London",
          results: [
            {
              title: "The Great Fire, 1666",
              address: "www.london-past.example",
            },
          ],
        },
        answer: '"Great Fire of London"',
        distractors: [
          "Great Fire London",
          "fire",
          "London fire great of",
          "great?fire?london",
        ],
        hint: "Some marks around words tell the search engine to keep them together.",
      },
      {
        ask: "Which result answers the question: how tall is Ben Nevis?",
        scene: {
          kind: "search-engine",
          query: "how tall is ben nevis",
          results: [
            {
              title: "Ben Nevis Car Park Times",
              address: "www.park-info.example",
            },
            {
              title: "Ben Nevis is 1,345 m high",
              address: "www.uk-peaks.example",
            },
            {
              title: "Walking Boots Sale",
              address: "www.boot-shop.example",
              isAdvert: true,
            },
          ],
        },
        answer: "Ben Nevis is 1,345 m high",
        distractors: [
          "Ben Nevis Car Park Times",
          "Walking Boots Sale",
          "None of them",
        ],
        hint: "Read each title. Which one tells you a height?",
      },
      {
        ask: "Search: please tell me about Mars. Which words can you remove?",
        scene: {
          kind: "search-engine",
          query: "please tell me about Mars",
          results: [
            {
              title: "Mars: The Red Planet",
              address: "www.space-facts.example",
            },
          ],
        },
        answer: "please tell me about",
        distractors: [
          "Mars",
          "about Mars",
          "tell me about Mars",
          "all of them",
        ],
        hint: "Keep the words that carry the meaning. Polite words are not needed.",
      },
      {
        ask: "How can you tell that a search result is an advert?",
        scene: {
          kind: "search-engine",
          query: "rainforest animals",
          results: [
            {
              title: "Cheap Jungle Holidays",
              address: "www.trip-deals.example",
              isAdvert: true,
            },
            {
              title: "Rainforest Animal Guide",
              address: "www.wild-world.example",
            },
          ],
        },
        answer: "It is labelled Ad or Sponsored",
        distractors: [
          "It is always the last result",
          "It has the longest title",
          "It is always true",
        ],
      },
      {
        ask: "You want to know how fast the big cat called a jaguar runs. Which result?",
        scene: {
          kind: "search-engine",
          query: "jaguar speed",
          results: [
            {
              title: "Jaguar Cars For Sale",
              address: "www.car-deals.example",
              isAdvert: true,
            },
            {
              title: "How Fast Can a Jaguar Run?",
              address: "www.wild-cats.example",
            },
            {
              title: "Jaguar Car Top Speeds",
              address: "www.motor-news.example",
            },
          ],
        },
        answer: "How Fast Can a Jaguar Run?",
        distractors: [
          "Jaguar Cars For Sale",
          "Jaguar Car Top Speeds",
          "None of them",
        ],
        hint: "Some words mean more than one thing. Which result is about the animal?",
      },
      {
        ask: "Is the top search result always the best answer?",
        scene: {
          kind: "search-engine",
          query: "volcano facts",
          results: [
            {
              title: "Volcano Facts for Kids",
              address: "www.earth-zone.example",
            },
            {
              title: "Volcano Model Kits",
              address: "www.craft-box.example",
              isAdvert: true,
            },
          ],
        },
        answer: "No, check it answers you",
        distractors: [
          "Yes, it is always right",
          "Yes, a teacher checks it",
          "Yes, if it has a picture",
        ],
        hint: "Search engines put results in order, but you still need to read and check.",
      },
      {
        ask: "What does a search engine's web crawler do?",
        scene: {
          kind: "search-engine",
          query: "how do search engines work",
          results: [
            {
              title: "Crawlers and Indexes",
              address: "www.how-it-works.example",
            },
          ],
        },
        answer: "Finds and lists web pages",
        distractors: [
          "Writes new web pages",
          "Deletes old websites",
          "Fixes broken computers",
        ],
        hint: "Before it can show results, a search engine has to know which pages exist.",
      },
      {
        ask: "Searching dogs gives millions of results. What will help most?",
        scene: {
          kind: "search-engine",
          query: "dogs",
          results: [
            { title: "Dogs: All About Dogs", address: "www.pet-world.example" },
            {
              title: "Dog Beds Half Price",
              address: "www.pet-store.example",
              isAdvert: true,
            },
          ],
        },
        answer: "Add more exact keywords",
        distractors: [
          "Type it in capitals",
          "Search dogs again",
          "Use fewer words",
        ],
        hint: "Think about what you really want to know about dogs.",
      },
      {
        ask: "Which keywords are best to find out what hedgehogs eat?",
        scene: {
          kind: "search-engine",
          query: "What should I type?",
          results: [
            { title: "Search tips", address: "www.search-help.example" },
          ],
        },
        answer: "what hedgehogs eat",
        distractors: ["animals", "hedgehog", "garden", "eat"],
        hint: "One word alone is too wide. Include the animal and the question.",
      },
      {
        ask: "Two sites disagree about a fact. What should you do?",
        scene: {
          kind: "search-engine",
          query: "how long do owls live",
          results: [
            {
              title: "Owls live 5 to 10 years",
              address: "www.bird-trust.example",
            },
            { title: "Owls live 200 years!", address: "www.wow-facts.example" },
          ],
        },
        answer: "Check more trusted sites",
        distractors: [
          "Pick the funniest one",
          "Believe the first one",
          "Give up searching",
        ],
        hint: "When answers do not match, look for more places to compare.",
      },
    ],
  },
});

const webBuilder = defineComputingGame({
  gameType: "web-builder",
  title: "Web Builder",
  skillId: "computing.webpage-creation",
  instruction: "Choose the right part for the webpage.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which part takes you to another page when you click it?",
        scene: {
          kind: "tablet-screen",
          title: "My Pets Site",
          screen: {
            app: "browser",
            lines: [
              "www.my-pets.example",
              "Home | Cats | Dogs",
              "Click Cats to read more",
            ],
          },
        },
        answer: "A hyperlink",
        distractors: [
          "A heading",
          "A full stop",
          "The page colour",
          "A picture frame",
        ],
        hint: "It is usually underlined or a different colour.",
      },
      {
        ask: "What do we call the big title text at the top of a section?",
        scene: {
          kind: "tablet-screen",
          title: "Owls of Britain",
          screen: {
            app: "browser",
            lines: [
              "www.owl-club.example",
              "BARN OWLS",
              "Barn owls hunt at night.",
            ],
          },
        },
        answer: "A heading",
        distractors: ["A hyperlink", "A password", "A web address", "A pop-up"],
      },
      {
        ask: "What is the row of links Home, About and Contact for?",
        scene: {
          kind: "tablet-screen",
          title: "Class 6 Site",
          screen: {
            app: "browser",
            lines: [
              "www.class-six.example",
              "Home | About | Contact",
              "Welcome to Class 6!",
            ],
          },
        },
        answer: "Moving between pages",
        distractors: [
          "Printing the page",
          "Making text bold",
          "Saving a photo",
        ],
        hint: "This bar is called navigation. Think about what navigating means.",
      },
      {
        ask: "You found a great photo on another website. What should you do first?",
        scene: {
          kind: "tablet-screen",
          title: "Add an image",
          screen: {
            app: "browser",
            lines: ["Photo by Sam Lee", "All rights reserved"],
          },
        },
        answer: "Check you have permission",
        distractors: [
          "Just copy it",
          "Crop off the name",
          "Make it bigger",
          "Rename the file",
        ],
        hint: "Someone made that photo. Can you use it?",
      },
      {
        ask: "Which image is safe to use on your webpage?",
        scene: {
          kind: "tablet-screen",
          title: "Add an image",
          screen: {
            app: "browser",
            lines: ["Choose a picture", "for your page"],
          },
        },
        answer: "A photo you took yourself",
        distractors: [
          "Any photo you find",
          "A famous film poster",
          "A logo from a shop",
          "A stranger's holiday photo",
        ],
      },
      {
        ask: "Why should you preview your page on a phone and a laptop?",
        scene: {
          kind: "tablet-screen",
          title: "Preview",
          screen: {
            app: "browser",
            lines: ["Preview: phone", "Preview: laptop"],
          },
        },
        answer: "To check it looks right",
        distractors: [
          "To make it load slower",
          "To delete it",
          "To change the address",
        ],
        hint: "Screens come in different sizes.",
      },
      {
        ask: "What is another name for a web address?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: { app: "browser", lines: ["www.space-club.example"] },
        },
        answer: "A URL",
        distractors: ["A heading", "A pixel", "A sprite", "A cell"],
      },
      {
        ask: "Which program do you use to look at webpages?",
        scene: {
          kind: "tablet-screen",
          title: "Browser",
          screen: {
            app: "browser",
            lines: ["www.river-facts.example", "Rivers of the UK"],
          },
        },
        answer: "A web browser",
        distractors: [
          "A spreadsheet",
          "A paint program",
          "A calculator",
          "A music editor",
        ],
      },
      {
        ask: "What does embedding a video on your page mean?",
        scene: {
          kind: "tablet-screen",
          title: "Our Trip",
          screen: {
            app: "browser",
            lines: ["Our trip to the farm", "[ video plays here ]"],
          },
        },
        answer: "It plays inside the page",
        distractors: [
          "It is deleted",
          "It is printed out",
          "It is sent by email",
        ],
      },
      {
        ask: "Your Dogs link opens the Cats page. What should you fix?",
        scene: {
          kind: "tablet-screen",
          title: "My Pets Site",
          screen: {
            app: "browser",
            lines: ["Home | Cats | Dogs", "Clicked: Dogs", "Opened: Cats page"],
          },
        },
        answer: "The link's web address",
        distractors: ["The page colour", "The heading size", "The picture"],
        hint: "A link goes wherever its address tells it to go.",
      },
      {
        ask: "What does copyright mean?",
        scene: {
          kind: "tablet-screen",
          title: "Image info",
          screen: {
            app: "browser",
            lines: ["© 2026 Priya Shah", "Ask before using"],
          },
        },
        answer: "The creator owns the work",
        distractors: [
          "Anyone can copy it",
          "It is free to sell",
          "It is a type of link",
        ],
      },
      {
        ask: "Which is the best title for a page about British owls?",
        scene: {
          kind: "tablet-screen",
          title: "New page",
          screen: {
            app: "browser",
            lines: ["Page title: ?", "Topic: British owls"],
          },
        },
        answer: "Owls of Britain",
        distractors: ["Page 1", "Untitled", "asdfgh", "My stuff"],
        hint: "A good title tells visitors what the page is about.",
      },
    ],
  },
});

interface VaultChange {
  name: string;
  kind: "add" | "subtract" | "set";
  amount: number;
  text: string;
}

type VaultLine =
  | { kind: "change"; change: VaultChange }
  | { kind: "repeat"; times: number; body: VaultChange[] };

const vaultNamePairs = [
  ["score", "lives"],
  ["coins", "gems"],
  ["points", "time"],
  ["lives", "coins"],
] as const;

const buildVaultChange = (
  name: string,
  kind: VaultChange["kind"],
  amount: number,
  random: () => number,
): VaultChange => {
  if (kind === "set") {
    return { name, kind, amount, text: `${name} = ${String(amount)}` };
  }
  if (kind === "subtract") {
    return {
      name,
      kind,
      amount,
      text: `${name} = ${name} - ${String(amount)}`,
    };
  }
  const text =
    random() < 0.5
      ? `change ${name} by ${String(amount)}`
      : `${name} = ${name} + ${String(amount)}`;
  return { name, kind, amount, text };
};

const pickVaultChange = (name: string, random: () => number): VaultChange => {
  const kind = random() < 0.6 ? "add" : "subtract";
  return buildVaultChange(name, kind, pickWholeNumber(1, 5, random), random);
};

const applyVaultChange = (
  values: ReadonlyMap<string, number>,
  { name, kind, amount }: VaultChange,
): Map<string, number> => {
  const before = values.get(name) ?? 0;
  const after =
    kind === "set"
      ? amount
      : kind === "add"
        ? before + amount
        : before - amount;
  return new Map(values).set(name, after);
};

const listVaultSteps = (lines: readonly VaultLine[]): VaultChange[] =>
  lines.flatMap((line) =>
    line.kind === "change"
      ? [line.change]
      : Array.from({ length: line.times }, () => line.body).flat(),
  );

const listVaultCode = (lines: readonly VaultLine[]): VaultChange[][] =>
  lines.map((line) => (line.kind === "change" ? [line.change] : line.body));

const describeVaultLines = (lines: readonly VaultLine[]): string[] =>
  lines.flatMap((line) =>
    line.kind === "change"
      ? [line.change.text]
      : [
          `repeat ${String(line.times)} times`,
          ...line.body.map(({ text }) => `  ${text}`),
        ],
  );

const buildVaultLines = (
  difficulty: ComputingDifficulty,
  names: readonly string[],
  random: () => number,
): VaultLine[] => {
  const [first, second] = names;
  if (difficulty === 1) {
    return [
      { kind: "change", change: pickVaultChange(first, random) },
      { kind: "change", change: pickVaultChange(first, random) },
    ];
  }
  if (difficulty === 2) {
    if (random() < 0.5) {
      return [
        { kind: "change", change: pickVaultChange(first, random) },
        {
          kind: "repeat",
          times: pickWholeNumber(2, 3, random),
          body: [
            buildVaultChange(
              first,
              "add",
              pickWholeNumber(2, 5, random),
              random,
            ),
          ],
        },
      ];
    }
    return [
      { kind: "change", change: pickVaultChange(first, random) },
      { kind: "change", change: pickVaultChange(second, random) },
      { kind: "change", change: pickVaultChange(first, random) },
      { kind: "change", change: pickVaultChange(first, random) },
    ];
  }
  const opening = buildVaultChange(
    pickOne(names, random),
    "set",
    pickWholeNumber(0, 10, random),
    random,
  );
  return [
    { kind: "change", change: opening },
    {
      kind: "repeat",
      times: pickWholeNumber(3, 4, random),
      body: [
        buildVaultChange(first, "add", pickWholeNumber(2, 5, random), random),
        pickVaultChange(second, random),
      ],
    },
    { kind: "change", change: pickVaultChange(pickOne(names, random), random) },
  ];
};

const vaultLineNames = [
  "Line 1",
  "Line 2",
  "Line 3",
  "Line 4",
  "Line 5",
  "Line 6",
];

const buildVariableVaultQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const names = shuffleValues(pickOne(vaultNamePairs, random), random);
  const crateNames = difficulty === 1 ? names.slice(0, 1) : names;
  const lines = buildVaultLines(difficulty, names, random);
  const startValues = new Map<string, number>(
    crateNames.map((name) => [name, pickWholeNumber(0, 10, random)]),
  );
  const steps = listVaultSteps(lines);
  const history = steps.reduce<Map<string, number>[]>(
    (states, step) => [
      ...states,
      applyVaultChange(states.at(-1) ?? startValues, step),
    ],
    [startValues],
  );
  const isSensible = history.every((state) =>
    [...state.values()].every((value) => value >= 0 && value <= 99),
  );
  if (!isSensible) {
    return undefined;
  }
  const endValues = history.at(-1) ?? startValues;
  const target = pickOne(
    crateNames.filter((name) => steps.some((step) => step.name === name)),
    random,
  );
  const code = describeVaultLines(lines);
  const scene = {
    kind: "variable-crates" as const,
    crates: crateNames.map((name) => ({
      name,
      value: String(startValues.get(name) ?? 0),
    })),
    code,
  };
  const linesChangingTarget = code.flatMap((text, index) =>
    text.trim().startsWith(`change ${target} `) ||
    text.trim().startsWith(`${target} =`)
      ? [index]
      : [],
  );
  const canAskWhichLine =
    crateNames.length > 1 &&
    linesChangingTarget.length === 1 &&
    code.length >= 4;
  if (canAskWhichLine && random() < 0.35) {
    const answerIndex = linesChangingTarget[0];
    const lineNames = vaultLineNames.slice(0, code.length);
    return {
      ask: `Which line of code changes ${target}?`,
      scene,
      answer: lineNames[answerIndex],
      distractors: lineNames.filter((_, index) => index !== answerIndex),
      hint: `Look for the line that has ${target} in it.`,
    };
  }
  const answer = endValues.get(target) ?? 0;
  const runOnce = listVaultCode(lines)
    .flat()
    .reduce((state, step) => applyVaultChange(state, step), startValues)
    .get(target);
  const otherName = crateNames.find((name) => name !== target);
  const otherEnd =
    otherName === undefined ? undefined : endValues.get(otherName);
  const tempting = [runOnce, otherEnd, startValues.get(target)].filter(
    (value) => value !== undefined,
  );
  return {
    ask: `The crates show the start values. What is ${target} after the code runs?`,
    scene,
    answer: String(answer),
    distractors: buildNumberChoices(answer, tempting, random),
    hint: "Work down one line at a time and update the crate as you go.",
  };
};

const variableVault = defineComputingGame({
  gameType: "variable-vault",
  title: "Variable Vault",
  skillId: "computing.variables-in-games",
  instruction: "Run the code in your head. What changes?",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildVariableVaultQuestion(difficulty, random)),
  },
});

const sheetThemes = [
  {
    label: "Fruit",
    items: ["Apple", "Pear", "Plum"],
    first: "Price",
    second: "Qty",
  },
  {
    label: "Snack",
    items: ["Crisps", "Juice", "Banana"],
    first: "Cost",
    second: "Sold",
  },
  {
    label: "Team",
    items: ["Red", "Blue", "Green"],
    first: "Wins",
    second: "Goals",
  },
  {
    label: "Pet",
    items: ["Cats", "Dogs", "Fish"],
    first: "Year 5",
    second: "Year 6",
  },
] as const;

const sheetColumnLetters = ["B", "C"] as const;
const sheetRowNumbers = [2, 3, 4] as const;

const buildSpreadsheetSumsQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const theme = pickOne(sheetThemes, random);
  const largest = difficulty === 1 ? 9 : 12;
  const firstValues = sheetRowNumbers.map(() =>
    pickWholeNumber(1, largest, random),
  );
  const secondValues = sheetRowNumbers.map(() =>
    pickWholeNumber(1, largest, random),
  );
  const valuesByColumn = { B: firstValues, C: secondValues };
  const headingsByColumn = { B: theme.first, C: theme.second };
  const rows = [
    ["", "A", "B", "C"],
    ["1", theme.label, theme.first, theme.second],
    ...sheetRowNumbers.map((rowNumber, index) => [
      String(rowNumber),
      theme.items[index],
      String(firstValues[index]),
      String(secondValues[index]),
    ]),
  ];
  const scene = {
    kind: "tablet-screen" as const,
    title: `${theme.label} sheet`,
    screen: { app: "spreadsheet" as const, rows },
  };
  const allValues = [...firstValues, ...secondValues];
  const column = pickOne(sheetColumnLetters, random);
  const columnValues = valuesByColumn[column];
  const rowIndex = pickWholeNumber(0, 2, random);
  const rowNumber = sheetRowNumbers[rowIndex];
  const kindOfAsk = pickWholeNumber(0, difficulty === 1 ? 1 : 3, random);
  if (difficulty === 1 && kindOfAsk === 0) {
    const answer = columnValues[rowIndex];
    return {
      ask: `What number is in cell ${column}${String(rowNumber)}?`,
      scene,
      answer: String(answer),
      distractors: buildNumberChoices(answer, allValues, random),
      hint: "Find the column letter along the top, then the row number down the side.",
    };
  }
  if (difficulty === 1) {
    const item = theme.items[rowIndex];
    const answer = `A${String(rowNumber)}`;
    const nearbyCells = [
      ...sheetRowNumbers.map((number) => `A${String(number)}`),
      `B${String(rowNumber)}`,
      `C${String(rowNumber)}`,
      `A1`,
    ].filter((cell) => cell !== answer);
    return {
      ask: `Which cell holds the word ${item}?`,
      scene,
      answer,
      distractors: nearbyCells,
      hint: "A cell's name is its column letter then its row number.",
    };
  }
  if (kindOfAsk === 0) {
    const otherIndex = pickOne(
      [0, 1, 2].filter((index) => index !== rowIndex),
      random,
    );
    const answer = columnValues[rowIndex] + columnValues[otherIndex];
    const formula = `=${column}${String(rowNumber)}+${column}${String(sheetRowNumbers[otherIndex])}`;
    return {
      ask: `What does the formula ${formula} work out as?`,
      scene,
      answer: String(answer),
      distractors: buildNumberChoices(answer, [], random),
      hint: "Find the two cells, then add their numbers together.",
    };
  }
  if (kindOfAsk === 1) {
    const answer = columnValues.reduce((total, value) => total + value, 0);
    return {
      ask: `What does the formula =SUM(${column}2:${column}4) give?`,
      scene,
      answer: String(answer),
      distractors: buildNumberChoices(answer, [], random),
      hint: `SUM adds up every cell from ${column}2 down to ${column}4.`,
    };
  }
  if (kindOfAsk === 2 && difficulty === 3) {
    const answer = firstValues[rowIndex] * secondValues[rowIndex];
    const added = firstValues[rowIndex] + secondValues[rowIndex];
    return {
      ask: `What does the formula =B${String(rowNumber)}*C${String(rowNumber)} give?`,
      scene,
      answer: String(answer),
      distractors: buildNumberChoices(answer, [added], random),
      hint: "In a spreadsheet the star symbol means multiply.",
    };
  }
  if (kindOfAsk === 2) {
    const answer = columnValues[rowIndex];
    return {
      ask: `What number is in cell ${column}${String(rowNumber)}?`,
      scene,
      answer: String(answer),
      distractors: buildNumberChoices(answer, allValues, random),
      hint: "Find the column letter along the top, then the row number down the side.",
    };
  }
  const otherColumn = column === "B" ? "C" : "B";
  const answer = `=SUM(${column}2:${column}4)`;
  return {
    ask: `Which formula adds up all the ${headingsByColumn[column]} numbers?`,
    scene,
    answer,
    distractors: [
      `=SUM(${otherColumn}2:${otherColumn}4)`,
      `=SUM(${column}2:${column}3)`,
      `=${column}2+${column}3`,
      "=SUM(A2:A4)",
    ],
    hint: "Find the column with that heading, then include every number in it.",
  };
};

const spreadsheetSums = defineComputingGame({
  gameType: "spreadsheet-sums",
  title: "Spreadsheet Sums",
  skillId: "computing.spreadsheets",
  instruction: "Use the cells and formulas to find the answer.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildSpreadsheetSumsQuestion(difficulty, random)),
  },
});

const modelMaker = defineComputingGame({
  gameType: "model-maker",
  title: "Model Maker",
  skillId: "computing.3d-modelling",
  instruction: "How is the 3D model built?",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which 3D shape makes the roof of this house?",
        scene: {
          kind: "model-workbench",
          parts: [
            { shape: "cube", colour: "red", position: [0, 0, 0] },
            { shape: "pyramid", colour: "blue", position: [0, 1, 0] },
          ],
        },
        answer: "Pyramid",
        distractors: ["Cube", "Sphere", "Cylinder", "Cone"],
        hint: "It has a square bottom and triangle sides that meet at a point.",
      },
      {
        ask: "How many cubes make this tower?",
        scene: {
          kind: "model-workbench",
          parts: [
            { shape: "cube", colour: "yellow", position: [0, 0, 0] },
            { shape: "cube", colour: "green", position: [0, 1, 0] },
            { shape: "cube", colour: "purple", position: [0, 2, 0] },
          ],
        },
        answer: "3",
        distractors: ["1", "2", "4", "5"],
      },
      {
        ask: "How many cubes make this wall?",
        scene: {
          kind: "model-workbench",
          parts: [
            { shape: "cube", colour: "orange", position: [-1, 0, 0] },
            { shape: "cube", colour: "orange", position: [0, 0, 0] },
            { shape: "cube", colour: "orange", position: [1, 0, 0] },
            { shape: "cube", colour: "red", position: [-1, 1, 0] },
            { shape: "cube", colour: "red", position: [0, 1, 0] },
            { shape: "cube", colour: "red", position: [1, 1, 0] },
          ],
        },
        answer: "6",
        distractors: ["3", "4", "5", "8"],
        hint: "Count the bottom row, then the top row.",
      },
      {
        ask: "Which shapes make this rocket?",
        scene: {
          kind: "model-workbench",
          parts: [
            { shape: "cylinder", colour: "blue", position: [0, 0, 0] },
            { shape: "cylinder", colour: "blue", position: [0, 1, 0] },
            { shape: "cone", colour: "red", position: [0, 2, 0] },
          ],
        },
        answer: "Cylinders and a cone",
        distractors: [
          "Cubes and a pyramid",
          "Spheres and a cone",
          "Cuboids and a prism",
        ],
      },
      {
        ask: "What 3D shape is the snowman's body made from?",
        scene: {
          kind: "model-workbench",
          parts: [
            { shape: "sphere", colour: "blue", position: [0, 0, 0] },
            {
              shape: "sphere",
              colour: "blue",
              position: [0, 1, 0],
              size: [0.7, 0.7, 0.7],
            },
          ],
        },
        answer: "Sphere",
        distractors: ["Cube", "Cone", "Cylinder", "Pyramid"],
      },
      {
        ask: "What 3D shape is this tent?",
        scene: {
          kind: "model-workbench",
          parts: [
            {
              shape: "prism",
              colour: "green",
              position: [0, 0, 0],
              size: [2, 1, 1],
            },
          ],
        },
        answer: "Triangular prism",
        distractors: ["Pyramid", "Cube", "Cylinder", "Sphere"],
        hint: "Its ends are triangles and its sides are rectangles.",
      },
      {
        ask: "How many cylinders are used as the table legs?",
        scene: {
          kind: "model-workbench",
          parts: [
            {
              shape: "cuboid",
              colour: "orange",
              position: [0, 1, 0],
              size: [3, 0.3, 2],
            },
            {
              shape: "cylinder",
              colour: "yellow",
              position: [-1, 0, -0.7],
              size: [0.3, 1, 0.3],
            },
            {
              shape: "cylinder",
              colour: "yellow",
              position: [1, 0, -0.7],
              size: [0.3, 1, 0.3],
            },
            {
              shape: "cylinder",
              colour: "yellow",
              position: [-1, 0, 0.7],
              size: [0.3, 1, 0.3],
            },
            {
              shape: "cylinder",
              colour: "yellow",
              position: [1, 0, 0.7],
              size: [0.3, 1, 0.3],
            },
          ],
        },
        answer: "4",
        distractors: ["2", "3", "5", "6"],
      },
      {
        ask: "Which 3D shape is the flat table top?",
        scene: {
          kind: "model-workbench",
          parts: [
            {
              shape: "cuboid",
              colour: "orange",
              position: [0, 1, 0],
              size: [3, 0.3, 2],
            },
            {
              shape: "cylinder",
              colour: "yellow",
              position: [-1, 0, 0],
              size: [0.3, 1, 0.3],
            },
            {
              shape: "cylinder",
              colour: "yellow",
              position: [1, 0, 0],
              size: [0.3, 1, 0.3],
            },
          ],
        },
        answer: "Cuboid",
        distractors: ["Sphere", "Cone", "Pyramid", "Cylinder"],
      },
      {
        ask: "You want this block taller without adding shapes. Which tool helps?",
        scene: {
          kind: "model-workbench",
          parts: [{ shape: "cuboid", colour: "purple", position: [0, 0, 0] }],
        },
        answer: "Resize it",
        distractors: ["Delete it", "Change its colour", "Copy it"],
        hint: "You want to change how big it is.",
      },
      {
        ask: "How can you see the back of your model?",
        scene: {
          kind: "model-workbench",
          parts: [
            { shape: "cube", colour: "red", position: [0, 0, 0] },
            { shape: "cone", colour: "yellow", position: [0, 1, 0] },
          ],
        },
        answer: "Rotate the view",
        distractors: [
          "Delete the front",
          "Make it smaller",
          "Change the colour",
        ],
      },
      {
        ask: "You want the roof and house to move together. What should you do?",
        scene: {
          kind: "model-workbench",
          parts: [
            { shape: "cube", colour: "green", position: [0, 0, 0] },
            { shape: "pyramid", colour: "red", position: [0, 1, 0] },
          ],
        },
        answer: "Group them",
        distractors: ["Delete the roof", "Colour them the same", "Undo"],
        hint: "Joining shapes so they act as one object has a special name.",
      },
      {
        ask: "The roof is floating above the house. How do you fix it?",
        scene: {
          kind: "model-workbench",
          parts: [
            { shape: "cube", colour: "blue", position: [0, 0, 0] },
            { shape: "pyramid", colour: "red", position: [0, 2, 0] },
          ],
        },
        answer: "Move it down onto the house",
        distractors: [
          "Make it bigger",
          "Move it up higher",
          "Change it to a sphere",
        ],
      },
      {
        ask: "How many cones are on top of this castle?",
        scene: {
          kind: "model-workbench",
          parts: [
            { shape: "cylinder", colour: "purple", position: [-1, 0, 0] },
            { shape: "cone", colour: "red", position: [-1, 1, 0] },
            { shape: "cube", colour: "yellow", position: [0, 0, 0] },
            { shape: "cylinder", colour: "purple", position: [1, 0, 0] },
            { shape: "cone", colour: "red", position: [1, 1, 0] },
          ],
        },
        answer: "2",
        distractors: ["1", "3", "4", "5"],
      },
      {
        ask: "A 3D shape has width, height and what else?",
        scene: {
          kind: "model-workbench",
          parts: [
            {
              shape: "cuboid",
              colour: "green",
              position: [0, 0, 0],
              size: [2, 1, 1],
            },
          ],
        },
        answer: "Depth",
        distractors: ["Colour", "Speed", "Sound", "Weight"],
        hint: "It is how far the shape goes from front to back.",
      },
    ],
  },
});

const buildStepBlocks = (stepSize: number, hasReset: boolean): CodeBlock[] => [
  { text: "On start", category: "event" },
  { text: "Set steps to 0", category: "variables", depth: 1 },
  { text: "On shake", category: "event" },
  {
    text: `Change steps by ${String(stepSize)}`,
    category: "variables",
    depth: 1,
  },
  { text: "Show steps", category: "looks", depth: 1 },
  ...(hasReset
    ? [
        { text: "On button A", category: "event" as const },
        { text: "Set steps to 0", category: "variables" as const, depth: 1 },
      ]
    : []),
];

const stepSizes: Record<ComputingDifficulty, readonly number[]> = {
  1: [1],
  2: [1, 2],
  3: [2, 3],
};

const describeShakes = (count: number): string =>
  count === 1 ? "shake once" : `shake ${String(count)} times`;

const buildStepCounterQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  const stepSize = pickOne(stepSizes[difficulty], random);
  const isWorkingBackwards = random() < 0.3;
  if (isWorkingBackwards) {
    const shakes = pickWholeNumber(3, difficulty === 1 ? 9 : 8, random);
    const shown = shakes * stepSize;
    return {
      ask: `From the start you only shake the board. It shows ${String(shown)}. How many shakes?`,
      scene: {
        kind: "code-stack",
        blocks: buildStepBlocks(stepSize, false),
        gadget: { kind: "led-board", shows: String(shown) },
      },
      answer: String(shakes),
      distractors: buildNumberChoices(shakes, [shown], random).filter(
        (choice) => choice !== "0",
      ),
      hint: `Each shake changes steps by ${String(stepSize)}.`,
    };
  }
  const phaseCount = difficulty;
  const phases = Array.from({ length: phaseCount }, () =>
    pickWholeNumber(2, difficulty === 1 ? 9 : 6, random),
  );
  const lastPhase = phases.at(-1) ?? 0;
  const answer = lastPhase * stepSize;
  const totalShakes = phases.reduce((total, count) => total + count, 0);
  const withoutReset = totalShakes * stepSize;
  const describedPhases = phases.map(describeShakes).join(", press A, ");
  const plan = `${describedPhases.charAt(0).toUpperCase()}${describedPhases.slice(1)}`;
  return {
    ask: `${plan}. What does the board show?`,
    scene: {
      kind: "code-stack",
      blocks: buildStepBlocks(stepSize, difficulty > 1),
      gadget: { kind: "led-board", shows: "?" },
    },
    answer: String(answer),
    distractors: buildNumberChoices(answer, [withoutReset, lastPhase], random),
    hint:
      difficulty === 1
        ? "Each shake runs the On shake blocks once."
        : "Pressing A sets steps back to 0. Count only what happens after that.",
  };
};

const stepCounter = defineComputingGame({
  gameType: "step-counter",
  title: "Step Counter",
  skillId: "computing.sensing-movement",
  instruction: "Read the code. What will the board show?",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildStepCounterQuestion(difficulty, random),
      ),
  },
});

const gameDesigner = defineComputingGame({
  gameType: "game-designer",
  title: "Game Designer",
  skillId: "computing.design-a-game",
  instruction: "Plan your game and choose the right card.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Designing a game: which step is missing?",
        scene: {
          kind: "story-cards",
          cards: [
            "Plan the idea",
            "Draw the sprites",
            "Write the code",
            "Test the game",
          ],
          missingIndex: 2,
        },
        answer: "Write the code",
        distractors: ["Sell the game", "Delete the sprites", "Switch it off"],
        hint: "The sprites are drawn, but they cannot move yet.",
      },
      {
        ask: "In a maze game, which part needs a variable?",
        scene: {
          kind: "story-cards",
          cards: ["Maze walls", "Player sprite", "Score", "Background"],
        },
        answer: "Score",
        distractors: ["Maze walls", "Player sprite", "Background"],
        hint: "A variable stores a value that changes while you play.",
      },
      {
        ask: "In a catch game, which card is an input?",
        scene: {
          kind: "story-cards",
          cards: ["Arrow keys", "Falling apples", "Score display", "Music"],
        },
        answer: "Arrow keys",
        distractors: ["Falling apples", "Score display", "Music"],
        hint: "An input is how the player tells the game what to do.",
      },
      {
        ask: "Splitting a game into smaller parts like this is called what?",
        scene: {
          kind: "story-cards",
          cards: ["Space game", "Rocket", "Asteroids", "Score"],
          highlightIndex: 0,
        },
        answer: "Decomposition",
        distractors: ["Debugging", "Repetition", "Downloading"],
      },
      {
        ask: "Which card is a rule of the game?",
        scene: {
          kind: "story-cards",
          cards: [
            "Green background",
            "Touch lava: lose life",
            "Cat sprite",
            "Jump sound",
          ],
        },
        answer: "Touch lava: lose life",
        distractors: ["Green background", "Cat sprite", "Jump sound"],
        hint: "A rule says what happens when something occurs.",
      },
      {
        ask: "Which variable should count how many tries a player has left?",
        scene: {
          kind: "story-cards",
          cards: ["score", "lives", "speed", "timer"],
        },
        answer: "lives",
        distractors: ["score", "speed", "timer"],
      },
      {
        ask: "What is a sprite in a computer game?",
        scene: {
          kind: "story-cards",
          cards: ["Hero", "Dragon", "Coin"],
        },
        answer: "A character or object",
        distractors: ["A type of drink", "The game's price", "A broken block"],
        hint: "All three cards are examples of sprites.",
      },
      {
        ask: "In a racing game, which card needs a variable that changes?",
        scene: {
          kind: "story-cards",
          cards: ["Track picture", "Car speed", "Game title", "Finish line"],
        },
        answer: "Car speed",
        distractors: ["Track picture", "Game title", "Finish line"],
      },
      {
        ask: "Testers say your game is too hard. What should you do next?",
        scene: {
          kind: "story-cards",
          cards: ["Plan", "Build", "Test", "Improve"],
          highlightIndex: 3,
        },
        answer: "Change it and test again",
        distractors: [
          "Ignore the testers",
          "Delete the game",
          "Make it even harder",
        ],
        hint: "Designers improve their game using feedback.",
      },
      {
        ask: "In a catch game, which card is an output?",
        scene: {
          kind: "story-cards",
          cards: ["Mouse click", "Key press", "Score on screen", "Tilting"],
        },
        answer: "Score on screen",
        distractors: ["Mouse click", "Key press", "Tilting"],
        hint: "An output is something the game shows or plays to you.",
      },
      {
        ask: "What should a game designer do before writing any code?",
        scene: {
          kind: "story-cards",
          cards: ["?", "Build", "Test", "Improve"],
          missingIndex: 0,
        },
        answer: "Plan and sketch it",
        distractors: ["Share it online", "Fix the bugs", "Print the score"],
      },
      {
        ask: "The player touches a coin. What should happen to the score?",
        scene: {
          kind: "story-cards",
          cards: ["Player", "touches coin", "score ?"],
          missingIndex: 2,
        },
        answer: "Score goes up",
        distractors: ["Score goes to 0", "Game ends", "Nothing happens"],
      },
    ],
  },
});

interface DebugSlot {
  block: CodeBlock;
  wrongTexts: string[];
}

interface DebugPlan {
  goal: string;
  blocks: CodeBlock[];
  slots: number[];
  wrongTexts: string[][];
}

const listNearbyNumbers = (value: number, smallest: number): number[] =>
  [value - 2, value - 1, value + 1, value + 2, value + 3].filter(
    (candidate) => candidate >= smallest && candidate !== value,
  );

const buildNumberSlot = (
  category: CodeBlock["category"],
  depth: number,
  value: number,
  smallest: number,
  describe: (amount: number) => string,
): DebugSlot => ({
  block: { text: describe(value), category, depth },
  wrongTexts: listNearbyNumbers(value, smallest).map(describe),
});

const buildDebugPlan = (
  goal: string,
  parts: readonly (CodeBlock | DebugSlot)[],
): DebugPlan => {
  const blocks = parts.map((part) => ("block" in part ? part.block : part));
  const slots = parts.flatMap((part, index) =>
    "block" in part ? [index] : [],
  );
  const wrongTexts = parts.flatMap((part) =>
    "block" in part ? [part.wrongTexts] : [],
  );
  return { goal, blocks, slots, wrongTexts };
};

const startBlock: CodeBlock = { text: "When game starts", category: "event" };

const buildLivesPlan = (random: () => number): DebugPlan => {
  const start = pickWholeNumber(3, 6, random);
  const lost = pickWholeNumber(1, 2, random);
  return buildDebugPlan(
    `Goal: lives start at ${String(start)}, then you lose ${String(lost)}.`,
    [
      startBlock,
      buildNumberSlot(
        "variables",
        0,
        start,
        1,
        (amount) => `Set lives to ${String(amount)}`,
      ),
      {
        block: {
          text: `Change lives by -${String(lost)}`,
          category: "variables",
        },
        wrongTexts: [
          `Change lives by ${String(lost)}`,
          `Change lives by -${String(lost + 1)}`,
          `Change lives by -${String(lost + 2)}`,
        ],
      },
      { text: "Show lives", category: "looks" },
    ],
  );
};

const buildCoinsPlan = (random: () => number): DebugPlan => {
  const first = pickWholeNumber(2, 5, random);
  const second = pickWholeNumber(6, 9, random);
  return buildDebugPlan(
    `Goal: coins start at 0, add ${String(first)}, then add ${String(second)}.`,
    [
      startBlock,
      buildNumberSlot(
        "variables",
        0,
        0,
        0,
        (amount) => `Set coins to ${String(amount)}`,
      ),
      buildNumberSlot(
        "variables",
        0,
        first,
        1,
        (amount) => `Change coins by ${String(amount)}`,
      ),
      buildNumberSlot(
        "variables",
        0,
        second,
        1,
        (amount) => `Change coins by ${String(amount)}`,
      ),
      { text: "Show coins", category: "looks" },
    ],
  );
};

const buildRepeatPlan = (random: () => number): DebugPlan => {
  const start = pickWholeNumber(0, 9, random);
  const times = pickWholeNumber(3, 6, random);
  const amount = pickWholeNumber(2, 9, random);
  return buildDebugPlan(
    `Goal: score starts at ${String(start)}, add ${String(amount)} points, ${String(times)} times.`,
    [
      startBlock,
      buildNumberSlot(
        "variables",
        0,
        start,
        0,
        (value) => `Set score to ${String(value)}`,
      ),
      buildNumberSlot(
        "control",
        0,
        times,
        2,
        (value) => `Repeat ${String(value)} times`,
      ),
      buildNumberSlot(
        "variables",
        1,
        amount,
        1,
        (value) => `Change score by ${String(value)}`,
      ),
      { text: "Show score", category: "looks" },
    ],
  );
};

const buildWinPlan = (random: () => number): DebugPlan => {
  const times = pickWholeNumber(3, 6, random);
  const amount = pickWholeNumber(2, 5, random);
  const target = pickWholeNumber(8, 20, random);
  return buildDebugPlan(
    `Goal: from 0, add ${String(amount)}, ${String(times)} times. If score > ${String(target)}, say You win!`,
    [
      buildNumberSlot(
        "variables",
        0,
        0,
        0,
        (value) => `Set score to ${String(value)}`,
      ),
      buildNumberSlot(
        "control",
        0,
        times,
        2,
        (value) => `Repeat ${String(value)} times`,
      ),
      buildNumberSlot(
        "variables",
        1,
        amount,
        1,
        (value) => `Change score by ${String(value)}`,
      ),
      {
        block: {
          text: `If score > ${String(target)} then`,
          category: "control",
        },
        wrongTexts: [
          `If score < ${String(target)} then`,
          `If score = ${String(target)} then`,
          `If score > ${String(target + 2)} then`,
        ],
      },
      { text: "Say You win!", category: "looks", depth: 1 },
    ],
  );
};

const debugPlanBuilders: Record<
  ComputingDifficulty,
  readonly ((random: () => number) => DebugPlan)[]
> = {
  1: [buildLivesPlan, buildCoinsPlan],
  2: [buildRepeatPlan, buildCoinsPlan],
  3: [buildWinPlan, buildRepeatPlan],
};

const buildDebugDetectiveQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const plan = pickOne(debugPlanBuilders[difficulty], random)(random);
  const slotChoice = pickWholeNumber(0, plan.slots.length - 1, random);
  const bugIndex = plan.slots[slotChoice];
  const wrongTexts = plan.wrongTexts[slotChoice];
  const bugText = pickOne(wrongTexts, random);
  const correctText = plan.blocks[bugIndex].text;
  const isAskingForFix = random() < 0.5;
  const blocks = plan.blocks.map((block, index) =>
    index === bugIndex
      ? { ...block, text: bugText, isHighlighted: isAskingForFix }
      : block,
  );
  const blockTexts = blocks.map(({ text }) => text);
  if (new Set(blockTexts).size !== blockTexts.length) {
    return undefined;
  }
  const scene = { kind: "code-stack" as const, blocks };
  if (isAskingForFix) {
    const otherWrong = shuffleValues(
      wrongTexts.filter((text) => text !== bugText),
      random,
    );
    return {
      ask: `${plan.goal} Fix the glowing block.`,
      scene,
      answer: correctText,
      distractors: [bugText, ...otherWrong],
      hint: "Read the goal again and match each number to the code.",
    };
  }
  return {
    ask: `${plan.goal} Which block is wrong?`,
    scene,
    answer: bugText,
    distractors: blockTexts.filter((text) => text !== bugText),
    hint: "Check each block against the goal, one at a time.",
  };
};

const debugDetective = defineComputingGame({
  gameType: "debug-detective",
  title: "Debug Detective",
  skillId: "computing.debug-with-variables",
  instruction: "Find or fix the bug in the program.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildDebugDetectiveQuestion(difficulty, random)),
  },
});

const emailNetwork = {
  kind: "network-map" as const,
  nodes: [
    { id: "amy", device: "laptop" as const, label: "Amy", column: 0, row: 1 },
    {
      id: "home-router",
      device: "router" as const,
      label: "Router",
      column: 1,
      row: 1,
    },
    {
      id: "amy-mail",
      device: "server" as const,
      label: "Amy mail",
      column: 2,
      row: 0,
    },
    {
      id: "ben-mail",
      device: "server" as const,
      label: "Ben mail",
      column: 3,
      row: 0,
    },
    {
      id: "ben-router",
      device: "router" as const,
      label: "Router",
      column: 3,
      row: 2,
    },
    { id: "ben", device: "tablet" as const, label: "Ben", column: 4, row: 1 },
  ],
  links: [
    ["amy", "home-router"],
    ["home-router", "amy-mail"],
    ["amy-mail", "ben-mail"],
    ["ben-mail", "ben-router"],
    ["ben-router", "ben"],
  ] satisfies [string, string][],
};

const videoNetwork = {
  kind: "network-map" as const,
  nodes: [
    { id: "zara", device: "laptop" as const, label: "Zara", column: 0, row: 1 },
    {
      id: "router-one",
      device: "router" as const,
      label: "Router",
      column: 1,
      row: 1,
    },
    {
      id: "router-two",
      device: "router" as const,
      label: "Router",
      column: 2,
      row: 0,
    },
    {
      id: "router-three",
      device: "router" as const,
      label: "Router",
      column: 2,
      row: 2,
    },
    {
      id: "router-four",
      device: "router" as const,
      label: "Router",
      column: 3,
      row: 1,
    },
    { id: "gran", device: "phone" as const, label: "Gran", column: 4, row: 1 },
  ],
  links: [
    ["zara", "router-one"],
    ["router-one", "router-two"],
    ["router-one", "router-three"],
    ["router-two", "router-four"],
    ["router-three", "router-four"],
    ["router-four", "gran"],
  ] satisfies [string, string][],
};

const emailRoute = ["amy", "home-router", "amy-mail", "ben-mail"];

const messageRoute = defineComputingGame({
  gameType: "message-route",
  title: "Message Route",
  skillId: "computing.internet-communication",
  instruction: "How does the message travel?",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Amy emails Ben, but Ben's tablet is switched off. Where does the email wait?",
        scene: { ...emailNetwork, route: emailRoute },
        answer: "On Ben's mail server",
        distractors: [
          "On Amy's laptop",
          "In the router",
          "Inside the cable",
          "It disappears",
        ],
        hint: "A server is a computer that stores things and is always switched on.",
      },
      {
        ask: "Messages are split into small pieces to travel. What are they called?",
        scene: {
          ...videoNetwork,
          route: ["zara", "router-one", "router-two", "router-four", "gran"],
        },
        answer: "Packets",
        distractors: ["Pixels", "Folders", "Sprites", "Cells"],
      },
      {
        ask: "When the packets reach Gran's phone, what happens to them?",
        scene: {
          ...videoNetwork,
          route: ["zara", "router-one", "router-three", "router-four", "gran"],
        },
        answer: "They are put back in order",
        distractors: [
          "They are thrown away",
          "They are printed",
          "They are sent back",
        ],
        hint: "The pieces have to be joined up to make the whole message again.",
      },
      {
        ask: "Can packets from the same message take different routes?",
        scene: {
          ...videoNetwork,
          route: ["zara", "router-one", "router-two", "router-four", "gran"],
        },
        answer: "Yes, they can",
        distractors: ["No, never", "Only for emails", "Only at night"],
        hint: "Look at the map. Is there more than one way to reach Gran?",
      },
      {
        ask: "Which device sends packets the right way between networks?",
        scene: { ...videoNetwork, route: ["zara", "router-one"] },
        answer: "A router",
        distractors: ["A printer", "A speaker", "A keyboard", "A mouse"],
      },
      {
        ask: "Zara is on a video call with Gran. What is being sent?",
        scene: {
          ...videoNetwork,
          route: ["zara", "router-one", "router-three", "router-four", "gran"],
        },
        answer: "Sound and video packets",
        distractors: ["Paper letters", "Only one big file", "Nothing at all"],
      },
      {
        ask: "Follow the email. Where does it go straight after the router?",
        scene: { ...emailNetwork, route: emailRoute },
        answer: "Amy's mail server",
        distractors: ["Ben's tablet", "Ben's router", "Back to Amy"],
        hint: "Watch the moving packet and see where it stops next.",
      },
      {
        ask: "Ben switches on his tablet. How does he get Amy's email?",
        scene: { ...emailNetwork, route: ["ben-mail", "ben-router", "ben"] },
        answer: "From his mail server",
        distractors: [
          "Straight from Amy's laptop",
          "From the printer",
          "It is posted",
        ],
      },
      {
        ask: "What do we call a computer that stores emails and websites for others?",
        scene: { ...emailNetwork },
        answer: "A server",
        distractors: ["A router", "A tablet", "A keyboard", "A monitor"],
      },
      {
        ask: "Ben's email address is ben@school.example. What does the part after @ tell?",
        scene: { ...emailNetwork, route: ["amy-mail", "ben-mail"] },
        answer: "Which mail server to use",
        distractors: ["Ben's age", "Ben's password", "What the email says"],
      },
      {
        ask: "Why are messages split into packets?",
        scene: {
          ...videoNetwork,
          route: ["zara", "router-one", "router-two", "router-four", "gran"],
        },
        answer: "Small pieces travel easily",
        distractors: [
          "To make them secret",
          "To make them bigger",
          "To delete them",
        ],
        hint: "Think about lots of people sharing the same roads.",
      },
      {
        ask: "A packet goes missing on the way. What happens?",
        scene: {
          ...videoNetwork,
          route: ["zara", "router-one", "router-three"],
        },
        answer: "It is sent again",
        distractors: [
          "The whole internet stops",
          "Gran's phone breaks",
          "Zara gets told off",
        ],
      },
    ],
  },
});

const thinkBeforeYouShare = defineComputingGame({
  gameType: "think-before-you-share",
  title: "Think Before You Share",
  skillId: "computing.responsible-sharing",
  instruction: "Choose the kind and sensible thing to do.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "You took a funny photo of your friend. What should you do before posting it?",
        scene: {
          kind: "tablet-screen",
          title: "New post",
          screen: {
            app: "social",
            lines: ["Photo: Leo pulling a face", "Post now?"],
          },
        },
        answer: "Ask your friend first",
        distractors: [
          "Post it straight away",
          "Add a mean caption",
          "Share it with everyone",
        ],
        hint: "How would you feel if someone posted a photo of you?",
      },
      {
        ask: "This post says sharks are in the local pond. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Trending",
          screen: {
            app: "social",
            lines: ["SHARKS FOUND IN POND!!", "Share before it's deleted!"],
          },
        },
        answer: "Check a trusted site first",
        distractors: [
          "Share it with everyone",
          "Believe it at once",
          "Add more scary bits",
        ],
        hint: "Could this be fake news?",
      },
      {
        ask: "Someone could take a screenshot of your post. What does that mean?",
        scene: {
          kind: "tablet-screen",
          title: "My post",
          screen: {
            app: "social",
            lines: ["Posted 2 minutes ago", "Deleted?"],
          },
        },
        answer: "It could be kept forever",
        distractors: [
          "It is deleted for good",
          "Only you can see it",
          "It turns private",
        ],
      },
      {
        ask: "This app is rated 13 and over. You are 10. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "App store",
          screen: {
            app: "social",
            lines: ["Chat-Zone app", "Age rating: 13+"],
          },
        },
        answer: "Don't use it, ask an adult",
        distractors: [
          "Fib about your age",
          "Use it in secret",
          "Get a friend to sign up",
        ],
        hint: "Age ratings are there to keep you safe.",
      },
      {
        ask: "You want to use a popular song in your video. What should you check?",
        scene: {
          kind: "tablet-screen",
          title: "My video",
          screen: { app: "video", lines: ["Add music?", "Hit song by a band"] },
        },
        answer: "That you have permission",
        distractors: [
          "That it is loud",
          "That it is short",
          "Nothing, just use it",
        ],
        hint: "Music is protected by copyright.",
      },
      {
        ask: "Your classmate shared a drawing. Which comment is kind?",
        scene: {
          kind: "tablet-screen",
          title: "Art club",
          screen: {
            app: "social",
            lines: ["Mia shared a drawing", "of a dragon"],
          },
        },
        answer: "Great colours, well done!",
        distractors: ["That's rubbish", "LOL so bad", "Nobody likes it"],
      },
      {
        ask: "Someone leaves an unkind comment on your post. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Comments",
          screen: {
            app: "social",
            lines: ["Your post", "Comment: you're a loser"],
          },
        },
        answer: "Tell a trusted adult, report",
        distractors: [
          "Reply with something mean",
          "Keep it a secret",
          "Delete your account",
        ],
        hint: "It is not your fault. Who can help you?",
      },
      {
        ask: "A post says: you won't believe what happens next! What might it be?",
        scene: {
          kind: "tablet-screen",
          title: "Feed",
          screen: {
            app: "social",
            lines: ["You won't believe this!", "Click to see!"],
          },
        },
        answer: "Clickbait",
        distractors: ["A school letter", "A trusted fact", "A help guide"],
        hint: "Some posts just want you to click.",
      },
      {
        ask: "Before posting this selfie, what should you remove?",
        scene: {
          kind: "tablet-screen",
          title: "New post",
          screen: {
            app: "social",
            lines: ["Selfie at the park", "Badge: Elm Road School"],
          },
        },
        answer: "Your school's name",
        distractors: ["The trees", "Your smile", "The sky"],
        hint: "What could tell a stranger where to find you?",
      },
      {
        ask: "You use a free picture whose creator asks for credit. What should you add?",
        scene: {
          kind: "tablet-screen",
          title: "My project",
          screen: {
            app: "document",
            lines: ["Picture by Tom Reed", "Free to use with credit"],
          },
        },
        answer: "The creator's name",
        distractors: ["Your own name", "Nothing at all", "A fake name"],
      },
      {
        ask: "A friend shares a video in the group chat that upsets you. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Group chat",
          screen: {
            app: "social",
            lines: ["Sam shared a video", "Pass it on!"],
          },
        },
        answer: "Tell a trusted adult",
        distractors: ["Pass it on", "Watch it again", "Keep it to yourself"],
        hint: "You never need to keep worrying things secret.",
      },
      {
        ask: "A mean joke about a classmate is going round. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Group chat",
          screen: {
            app: "social",
            lines: ["Look at this!", "Everyone share it!"],
          },
        },
        answer: "Don't share it, tell an adult",
        distractors: [
          "Share it too",
          "Add a laughing face",
          "Send it to more people",
        ],
        hint: "Think about the person the joke is about.",
      },
    ],
  },
});

export const yearSixComputingGames = [
  searchSkills,
  webBuilder,
  variableVault,
  spreadsheetSums,
  modelMaker,
  stepCounter,
  gameDesigner,
  debugDetective,
  messageRoute,
  thinkBeforeYouShare,
] as const;
