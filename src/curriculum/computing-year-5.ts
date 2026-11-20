import {
  buildNumberDistractors,
  defineComputingGame,
  pickOne,
  pickWholeNumber,
  shuffleValues,
  type CodeBlock,
  type ComputingDifficulty,
  type ComputingQuestion,
  type ItemColour,
  type ItemShape,
  type PhotoFrameScene,
  type PhotoSubject,
  type ShapeLayer,
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

const listOtherValues = (values: readonly string[], answer: string): string[] =>
  [...new Set(values)].filter((value) => value !== answer);

const teamUpOnline = defineComputingGame({
  gameType: "team-up-online",
  title: "Team Up Online",
  skillId: "computing.online-collaboration",
  instruction: "Choose the best way to work together online.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Sam left a note on the side of your shared document. What is this called?",
        scene: {
          kind: "tablet-screen",
          title: "Volcano project",
          screen: {
            app: "document",
            lines: ["Volcanoes erupt when...", "Sam: Add a picture here?"],
          },
        },
        answer: "A comment",
        distractors: ["A pop-up", "An advert", "A password", "A search"],
        hint: "It is a note that lets someone suggest a change without editing the work.",
      },
      {
        ask: "Your paragraph was deleted by mistake. What can bring an older copy back?",
        scene: {
          kind: "tablet-screen",
          title: "Volcano project",
          screen: {
            app: "document",
            lines: ["Volcanoes erupt when...", "(your part is gone)"],
          },
        },
        answer: "Version history",
        distractors: [
          "A new password",
          "Printing it",
          "Turning it off",
          "Closing the tab",
        ],
        hint: "Shared documents remember every saved change over time.",
      },
      {
        ask: "Which reply to Mia is the most respectful?",
        scene: {
          kind: "tablet-screen",
          title: "Group chat",
          screen: {
            app: "chat",
            messages: [
              { from: "Mia", text: "Idea: a rainforest poster?" },
              { from: "Leo", text: "Hmm, not sure." },
            ],
          },
        },
        answer: "Nice idea! Can we add maps?",
        distractors: [
          "That is a rubbish idea",
          "Just ignore Mia",
          "Delete her work",
          "Nobody asked you",
        ],
      },
      {
        ask: "You want to send your teacher a file with a short message. What is best?",
        scene: {
          kind: "tablet-screen",
          title: "New email",
          screen: {
            app: "email",
            lines: [
              "To: teacher@school.example",
              "Subject: My homework",
              "File: river-report",
            ],
          },
        },
        answer: "An email with an attachment",
        distractors: [
          "A video call",
          "A printed poster",
          "A pop-up message",
          "A search engine",
        ],
      },
      {
        ask: "Which part of an email tells you what it is about?",
        scene: {
          kind: "tablet-screen",
          title: "Inbox",
          screen: {
            app: "email",
            lines: [
              "From: ali@school.example",
              "Subject: Science club",
              "See you on Friday!",
            ],
          },
        },
        answer: "The subject",
        distractors: [
          "The From line",
          "The sign-off",
          "The date",
          "The attachment",
        ],
      },
      {
        ask: "Your group needs a quick back-and-forth chat right now. What is best?",
        scene: {
          kind: "tablet-screen",
          title: "Group chat",
          screen: {
            app: "chat",
            messages: [
              { from: "Zara", text: "Who is doing the title?" },
              { from: "Ben", text: "Me! Then you do pictures?" },
            ],
          },
        },
        answer: "A chat message",
        distractors: [
          "A posted letter",
          "A printed poster",
          "A long report",
          "A paper notice",
        ],
        hint: "Which one sends and replies in seconds?",
      },
      {
        ask: "On a video call, someone else is talking. What is polite?",
        scene: {
          kind: "tablet-screen",
          title: "Video call",
          screen: {
            app: "video",
            lines: ["Group call: 4 people", "Kai is talking..."],
          },
        },
        answer: "Mute your microphone",
        distractors: [
          "Talk over them",
          "Play loud music",
          "Leave without a word",
          "Make silly noises",
        ],
      },
      {
        ask: "Your camera shows your bedroom on a call. What helps keep things private?",
        scene: {
          kind: "tablet-screen",
          title: "Video call",
          screen: {
            app: "video",
            lines: ["Camera on", "Your room is showing"],
          },
        },
        answer: "Blur the background",
        distractors: [
          "Show your address",
          "Film the whole house",
          "Share your password",
          "Hold up your post",
        ],
      },
      {
        ask: "Two of you type in the same shared document at once. What happens?",
        scene: {
          kind: "tablet-screen",
          title: "Shared document",
          screen: {
            app: "document",
            lines: [
              "Mia is typing...",
              "Leo is typing...",
              "Our trip to the zoo",
            ],
          },
        },
        answer: "Both changes appear",
        distractors: [
          "The document is deleted",
          "Nobody can type",
          "It prints twice",
          "The computer turns off",
        ],
      },
      {
        ask: "You think Ana's paragraph should go. What should you do first?",
        scene: {
          kind: "tablet-screen",
          title: "Shared document",
          screen: {
            app: "document",
            lines: ["Ana: Rivers flow to sea", "You: Rivers start high up"],
          },
        },
        answer: "Ask Ana in a comment",
        distractors: [
          "Delete it quietly",
          "Rewrite all of it",
          "Tell everyone she is wrong",
          "Close the document",
        ],
        hint: "Good team-mates talk before changing someone else's work.",
      },
      {
        ask: "Why is a shared online document good for group work?",
        scene: {
          kind: "tablet-screen",
          title: "Shared document",
          screen: {
            app: "document",
            lines: ["Shared with: 4 people", "Our class newspaper"],
          },
        },
        answer: "Everyone works on one copy",
        distractors: [
          "It writes the work for you",
          "Only one person can see it",
          "It works with no internet",
          "It never needs checking",
        ],
      },
      {
        ask: "Someone adds a rude comment to your group's shared work. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Shared document",
          screen: {
            app: "document",
            lines: ["Our class newspaper", "Comment: This is dumb"],
          },
        },
        answer: "Tell your teacher",
        distractors: [
          "Write a ruder reply",
          "Delete everyone's work",
          "Keep it to yourself",
          "Copy it everywhere",
        ],
      },
    ],
  },
});

const buildPhotoScene = (
  subject: PhotoSubject,
  shot: PhotoFrameScene["shot"],
  changes: Partial<PhotoFrameScene> = {},
): PhotoFrameScene => ({
  kind: "photo-frame",
  subject,
  orientation: "landscape",
  light: "good",
  focus: "sharp",
  tilt: "level",
  shot,
  ...changes,
});

const videoDirector = defineComputingGame({
  gameType: "video-director",
  title: "Video Director",
  skillId: "computing.video-production",
  instruction: "Look through the camera and make the best choice.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "What type of shot is this?",
        scene: buildPhotoScene("mountain", "wide"),
        answer: "Wide shot",
        distractors: ["Close-up", "Medium shot", "Upside-down shot"],
        hint: "Can you see the whole place, or just a small part?",
      },
      {
        ask: "What type of shot is this?",
        scene: buildPhotoScene("flower", "close-up"),
        answer: "Close-up",
        distractors: ["Wide shot", "Medium shot", "Upside-down shot"],
        hint: "How near is the camera to the subject?",
      },
      {
        ask: "What type of shot is this?",
        scene: buildPhotoScene("friends", "medium"),
        answer: "Medium shot",
        distractors: ["Wide shot", "Close-up", "Upside-down shot"],
        hint: "Not the whole scene, and not just one face.",
      },
      {
        ask: "Which shot best shows how a character is feeling?",
        scene: buildPhotoScene("friends", "close-up"),
        answer: "Close-up",
        distractors: ["Wide shot", "A shot of the sky", "A black screen"],
        hint: "Feelings show on faces. How near should the camera be?",
      },
      {
        ask: "Which shot best shows where your story takes place?",
        scene: buildPhotoScene("house", "wide"),
        answer: "Wide shot",
        distractors: ["Close-up", "A shot of a shoe", "A black screen"],
      },
      {
        ask: "What is a storyboard for?",
        scene: buildPhotoScene("cat", "medium"),
        answer: "Planning shots in order",
        distractors: [
          "Charging the camera",
          "Deleting clips",
          "Making it louder",
        ],
      },
      {
        ask: "Your clip has a boring bit at the very start. Which edit removes it?",
        scene: buildPhotoScene("tree", "medium"),
        answer: "Trim",
        distractors: ["Duplicate", "Rotate", "Add music"],
        hint: "This edit cuts away the ends of a clip.",
      },
      {
        ask: "Which editing tool cuts one clip into two pieces?",
        scene: buildPhotoScene("cat", "close-up"),
        answer: "Split",
        distractors: ["Mute", "Undo", "Zoom"],
      },
      {
        ask: "This shot came out wobbly and blurry. What would help?",
        scene: buildPhotoScene("cat", "medium", { focus: "blurry" }),
        answer: "Hold the camera steady",
        distractors: [
          "Shake the camera more",
          "Film in the dark",
          "Cover the lens",
        ],
      },
      {
        ask: "This clip is far too dark. What would help most?",
        scene: buildPhotoScene("house", "wide", { light: "dark" }),
        answer: "Film somewhere brighter",
        distractors: [
          "Turn the lights off",
          "Film at midnight",
          "Cover the lens",
        ],
      },
      {
        ask: "What is wrong with this shot?",
        scene: buildPhotoScene("tree", "medium", { tilt: "crooked" }),
        answer: "It is tilted",
        distractors: ["It is too dark", "It is blurry", "It is a close-up"],
        hint: "Look at the edges of the picture. Are they straight?",
      },
      {
        ask: "Most video screens are wide. How should you hold the camera?",
        scene: buildPhotoScene("mountain", "wide"),
        answer: "Sideways, in landscape",
        distractors: [
          "Upright, in portrait",
          "Upside down",
          "Facing the floor",
        ],
      },
      {
        ask: "Which step comes after filming all your clips?",
        scene: buildPhotoScene("friends", "wide"),
        answer: "Editing the clips",
        distractors: [
          "Writing the storyboard",
          "Choosing the idea",
          "Planning the shots",
        ],
      },
    ],
  },
});

const ledLetters = ["Y", "N", "H", "S", "A", "B", "C", "X"] as const;

const sensorRules = [
  { sensor: "temperature", smallest: 12, largest: 28, describe: "degrees" },
  { sensor: "light", smallest: 25, largest: 75, describe: "light level" },
] as const;

const buildButtonQuestion = (random: () => number): ComputingQuestion => {
  const [shownWhenPressed, shownOtherwise, ...spareLetters] = shuffleValues(
    ledLetters,
    random,
  );
  const isPressed = random() < 0.5;
  const answer = isPressed ? shownWhenPressed : shownOtherwise;
  return {
    ask: isPressed
      ? "Button A is pressed. What does the board show?"
      : "Nobody presses button A. What does the board show?",
    scene: {
      kind: "code-stack",
      blocks: [
        { text: "When started", category: "event" },
        { text: "Forever", category: "control" },
        { text: "If button A pressed", category: "control", depth: 1 },
        { text: `Show ${shownWhenPressed}`, category: "looks", depth: 2 },
        { text: "Else", category: "control", depth: 1 },
        { text: `Show ${shownOtherwise}`, category: "looks", depth: 2 },
      ],
      gadget: { kind: "led-board", shows: "?" },
    },
    answer,
    distractors: listOtherValues(
      [shownWhenPressed, shownOtherwise, ...spareLetters.slice(0, 2)],
      answer,
    ),
    hint: "Is the condition true? If it is, run the blocks under If. If not, run the blocks under Else.",
  };
};

const buildSensorReadingQuestion = (
  random: () => number,
): ComputingQuestion => {
  const rule = pickOne(sensorRules, random);
  const threshold = pickWholeNumber(rule.smallest, rule.largest, random);
  const isAbove = random() < 0.5;
  const comparison = isAbove ? ">" : "<";
  const gap = pickWholeNumber(1, 9, random);
  const reading = random() < 0.5 ? threshold + gap : threshold - gap;
  const isTrue = isAbove ? reading > threshold : reading < threshold;
  const [shownWhenTrue, shownOtherwise, ...spareLetters] = shuffleValues(
    ledLetters,
    random,
  );
  const answer = isTrue ? shownWhenTrue : shownOtherwise;
  const readingText =
    rule.sensor === "temperature"
      ? `It is ${String(reading)} degrees.`
      : `The light level is ${String(reading)}.`;
  return {
    ask: `${readingText} What does the board show?`,
    scene: {
      kind: "code-stack",
      blocks: [
        { text: "When started", category: "event" },
        { text: "Forever", category: "control" },
        {
          text: `If ${rule.sensor} ${comparison} ${String(threshold)}`,
          category: "control",
          depth: 1,
        },
        { text: `Show ${shownWhenTrue}`, category: "looks", depth: 2 },
        { text: "Else", category: "control", depth: 1 },
        { text: `Show ${shownOtherwise}`, category: "looks", depth: 2 },
      ],
      gadget: { kind: "led-board", shows: "?" },
    },
    answer,
    distractors: listOtherValues(
      [shownWhenTrue, shownOtherwise, ...spareLetters.slice(0, 2)],
      answer,
    ),
    hint: "Compare the reading with the number in the If block. Is it bigger or smaller?",
  };
};

const missingConditionJobs = [
  {
    goal: "The lamp should turn on when it gets dark.",
    answer: "light < 30",
    distractors: ["light > 30", "temperature > 30", "sound > 30"],
  },
  {
    goal: "The lamp should turn on when it gets hot.",
    answer: "temperature > 25",
    distractors: ["temperature < 25", "light > 25", "light < 25"],
  },
  {
    goal: "The lamp should turn on when it gets cold.",
    answer: "temperature < 5",
    distractors: ["temperature > 5", "light < 5", "sound > 5"],
  },
  {
    goal: "The lamp should turn on when the room is noisy.",
    answer: "sound > 70",
    distractors: ["sound < 70", "light > 70", "temperature > 70"],
  },
  {
    goal: "The lamp should turn on while button B is pressed.",
    answer: "button B pressed",
    distractors: ["button A pressed", "light < 50", "temperature > 20"],
  },
] as const;

const buildMissingConditionQuestion = (
  random: () => number,
): ComputingQuestion => {
  const job = pickOne(missingConditionJobs, random);
  return {
    ask: `${job.goal} Which condition is missing?`,
    scene: {
      kind: "code-stack",
      blocks: [
        { text: "When started", category: "event" },
        { text: "Forever", category: "control" },
        {
          text: "If ???",
          category: "control",
          depth: 1,
          isHighlighted: true,
        },
        { text: "Lamp on", category: "looks", depth: 2 },
        { text: "Else", category: "control", depth: 1 },
        { text: "Lamp off", category: "looks", depth: 2 },
      ],
      gadget: { kind: "lamp", isOn: false },
    },
    answer: job.answer,
    distractors: [...job.distractors],
    hint: "Which sensor notices this, and should the reading be bigger or smaller?",
  };
};

const buildNestedSelectionQuestion = (
  random: () => number,
): ComputingQuestion => {
  const [shownWhenWarm, shownWhenCool, shownOtherwise, spareLetter] =
    shuffleValues(ledLetters, random);
  const threshold = pickWholeNumber(15, 25, random);
  const gap = pickWholeNumber(1, 8, random);
  const temperature = random() < 0.5 ? threshold + gap : threshold - gap;
  const isPressed = random() < 0.65;
  const isWarm = temperature > threshold;
  const shownWhenPressed = isWarm ? shownWhenWarm : shownWhenCool;
  const answer = isPressed ? shownWhenPressed : shownOtherwise;
  const pressedText = isPressed ? "is pressed" : "is not pressed";
  return {
    ask: `Button A ${pressedText} and it is ${String(temperature)} degrees. What does the board show?`,
    scene: {
      kind: "code-stack",
      blocks: [
        { text: "If button A pressed", category: "control" },
        {
          text: `If temperature > ${String(threshold)}`,
          category: "control",
          depth: 1,
        },
        { text: `Show ${shownWhenWarm}`, category: "looks", depth: 2 },
        { text: "Else", category: "control", depth: 1 },
        { text: `Show ${shownWhenCool}`, category: "looks", depth: 2 },
        { text: "Else", category: "control" },
        { text: `Show ${shownOtherwise}`, category: "looks", depth: 1 },
      ],
      gadget: { kind: "led-board", shows: "?" },
    },
    answer,
    distractors: listOtherValues(
      [shownWhenWarm, shownWhenCool, shownOtherwise, spareLetter],
      answer,
    ),
    hint: "Check the outside If first. Only look inside it if button A is pressed.",
  };
};

const buildIfThisThenThatQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  if (difficulty === 1) {
    return buildButtonQuestion(random);
  }
  if (difficulty === 2) {
    return random() < 0.6
      ? buildSensorReadingQuestion(random)
      : buildMissingConditionQuestion(random);
  }
  return random() < 0.7
    ? buildNestedSelectionQuestion(random)
    : buildMissingConditionQuestion(random);
};

const ifThisThenThat = defineComputingGame({
  gameType: "if-this-then-that",
  title: "If This, Then That",
  skillId: "computing.selection-physical-computing",
  instruction: "What will the gadget do?",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildIfThisThenThatQuestion(difficulty, random),
      ),
  },
});

interface PupilRecord {
  name: string;
  age: number;
  pet: string;
  height: number;
}

const pupilNames = [
  "Amir",
  "Bella",
  "Chen",
  "Dara",
  "Ella",
  "Finn",
  "Grace",
  "Hari",
  "Isla",
  "Jack",
  "Kemi",
  "Leo",
  "Maya",
  "Noah",
  "Priya",
] as const;

const pupilPets = ["Cat", "Dog", "Fish", "Rabbit", "Hamster"] as const;

const databaseHeader = ["Name", "Age", "Pet", "Height cm"];
const countChoices = ["0", "1", "2", "3", "4"];
const recordCount = 4;

const buildPupilRecords = (random: () => number): PupilRecord[] => {
  const names = shuffleValues(pupilNames, random).slice(0, recordCount);
  const heights = shuffleValues(
    Array.from({ length: 26 }, (_, index) => 125 + index),
    random,
  );
  return names.map((name, index) => ({
    name,
    age: pickWholeNumber(9, 11, random),
    pet: pickOne(pupilPets, random),
    height: heights[index],
  }));
};

const buildDatabaseScene = (records: readonly PupilRecord[]) => ({
  kind: "tablet-screen" as const,
  title: "Class database",
  screen: {
    app: "table" as const,
    rows: [
      databaseHeader,
      ...records.map(({ name, age, pet, height }) => [
        name,
        String(age),
        pet,
        String(height),
      ]),
    ],
  },
});

const listNamesExcept = (
  records: readonly PupilRecord[],
  answer: string,
): string[] =>
  records.map(({ name }) => name).filter((name) => name !== answer);

const buildNameAnswer = (
  ask: string,
  records: readonly PupilRecord[],
  match: PupilRecord | undefined,
  hint: string,
): ComputingQuestion | undefined =>
  match === undefined
    ? undefined
    : {
        ask,
        scene: buildDatabaseScene(records),
        answer: match.name,
        distractors: listNamesExcept(records, match.name),
        hint,
      };

const buildCountAnswer = (
  ask: string,
  records: readonly PupilRecord[],
  count: number,
  hint: string,
): ComputingQuestion => ({
  ask,
  scene: buildDatabaseScene(records),
  answer: String(count),
  distractors: listOtherValues(countChoices, String(count)),
  hint,
});

const findOnlyMatch = (
  records: readonly PupilRecord[],
  isMatch: (record: PupilRecord) => boolean,
): PupilRecord | undefined => {
  const matches = records.filter(isMatch);
  return matches.length === 1 ? matches[0] : undefined;
};

const buildSortedByHeight = (
  records: readonly PupilRecord[],
  isTallestFirst: boolean,
): PupilRecord[] =>
  records.toSorted((first, second) =>
    isTallestFirst
      ? second.height - first.height
      : first.height - second.height,
  );

const buildDatabaseDifficultyOne = (
  records: readonly PupilRecord[],
  random: () => number,
): ComputingQuestion | undefined => {
  const style = pickWholeNumber(0, 2, random);
  if (style === 0) {
    return {
      ask: "How many records are in this table?",
      scene: buildDatabaseScene(records),
      answer: String(records.length),
      distractors: ["2", "3", "5", "6"],
      hint: "Each pupil is one record. The top row only names the fields.",
    };
  }
  if (style === 1) {
    return {
      ask: "Each record has the same fields. How many fields are there?",
      scene: buildDatabaseScene(records),
      answer: String(databaseHeader.length),
      distractors: ["1", "2", "3", "5"],
      hint: "Fields are the headings along the top row.",
    };
  }
  const pet = pickOne(pupilPets, random);
  return buildNameAnswer(
    `Search the Pet field. Who has a ${pet.toLowerCase()}?`,
    records,
    findOnlyMatch(records, (record) => record.pet === pet),
    "Look down the Pet column only.",
  );
};

const buildDatabaseDifficultyTwo = (
  records: readonly PupilRecord[],
  random: () => number,
): ComputingQuestion | undefined => {
  const style = pickWholeNumber(0, 3, random);
  if (style === 0 || style === 1) {
    const isTallestFirst = style === 1;
    const [first] = buildSortedByHeight(records, isTallestFirst);
    const order = isTallestFirst ? "tallest first" : "shortest first";
    return buildNameAnswer(
      `Sort by Height, ${order}. Who comes first?`,
      records,
      first,
      "Compare the numbers in the Height column.",
    );
  }
  if (style === 2) {
    const pet = pickOne(pupilPets, random);
    const count = records.filter((record) => record.pet === pet).length;
    return buildCountAnswer(
      `How many records have ${pet} in the Pet field?`,
      records,
      count,
      "Go down the Pet column and count each match.",
    );
  }
  const age = pickWholeNumber(9, 11, random);
  const count = records.filter((record) => record.age === age).length;
  return buildCountAnswer(
    `How many records have ${String(age)} in the Age field?`,
    records,
    count,
    "Go down the Age column and count each match.",
  );
};

const placeWords = ["first", "second", "third", "last"] as const;

const buildDatabaseDifficultyThree = (
  records: readonly PupilRecord[],
  random: () => number,
): ComputingQuestion | undefined => {
  const style = pickWholeNumber(0, 3, random);
  if (style === 0) {
    const isTallestFirst = random() < 0.5;
    const place = pickWholeNumber(1, recordCount - 1, random);
    const sorted = buildSortedByHeight(records, isTallestFirst);
    const order = isTallestFirst ? "tallest first" : "shortest first";
    return buildNameAnswer(
      `Sort by Height, ${order}. Who comes ${placeWords[place]}?`,
      records,
      sorted[place],
      "Put the heights in order on your fingers, then count along.",
    );
  }
  if (style === 1) {
    const isLast = random() < 0.5;
    const sorted = records.toSorted((first, second) =>
      first.name.localeCompare(second.name),
    );
    const match = isLast ? sorted.at(-1) : sorted[1];
    const place = isLast ? "last" : "second";
    return buildNameAnswer(
      `Sort by Name, A to Z. Who comes ${place}?`,
      records,
      match,
      "Alphabetical order goes by the first letter of each name.",
    );
  }
  if (style === 2) {
    const chosen = pickOne(records, random);
    return buildNameAnswer(
      `Search for Age ${String(chosen.age)} AND Pet ${chosen.pet}. Who matches?`,
      records,
      findOnlyMatch(
        records,
        (record) => record.age === chosen.age && record.pet === chosen.pet,
      ),
      "A match must pass both checks, not just one.",
    );
  }
  const limit = pickWholeNumber(130, 145, random);
  const count = records.filter((record) => record.height > limit).length;
  return buildCountAnswer(
    `How many records have a Height greater than ${String(limit)}?`,
    records,
    count,
    "Greater than means bigger, not equal to.",
  );
};

const buildDatabaseQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  const records = buildPupilRecords(random);
  if (difficulty === 1) {
    return buildDatabaseDifficultyOne(records, random);
  }
  if (difficulty === 2) {
    return buildDatabaseDifficultyTwo(records, random);
  }
  return buildDatabaseDifficultyThree(records, random);
};

const databaseDetective = defineComputingGame({
  gameType: "database-detective",
  title: "Database Detective",
  skillId: "computing.flat-file-databases",
  instruction: "Search, sort or count the records.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildDatabaseQuestion(difficulty, random)),
  },
});

const layerColours: readonly ItemColour[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
];

const layerShapes: readonly ItemShape[] = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
];

const describeLayer = ({ colour, shape }: ShapeLayer): string =>
  `${colour.charAt(0).toUpperCase()}${colour.slice(1)} ${shape}`;

const describeLayerInSentence = (layer: ShapeLayer): string =>
  `the ${describeLayer(layer).toLowerCase()}`;

const buildLayers = (count: number, random: () => number): ShapeLayer[] => {
  const colours = shuffleValues(layerColours, random);
  return shuffleValues(layerShapes, random)
    .slice(0, count)
    .map((shape, index) => ({ shape, colour: colours[index] }));
};

const buildLayerQuestion = (
  ask: string,
  layers: readonly ShapeLayer[],
  answerLayer: ShapeLayer,
  hint: string,
): ComputingQuestion => {
  const names = layers.map(describeLayer);
  const answer = describeLayer(answerLayer);
  return {
    ask,
    scene: { kind: "shape-layers", layers: [...layers] },
    answer,
    distractors: listOtherValues(names, answer),
    hint,
  };
};

const buildFrontOrBackQuestion = (
  layers: readonly ShapeLayer[],
  random: () => number,
): ComputingQuestion => {
  const isFront = random() < 0.5;
  const answerLayer = isFront ? layers[layers.length - 1] : layers[0];
  return buildLayerQuestion(
    isFront
      ? "Which shape is on the top layer, at the front?"
      : "Which shape is on the bottom layer, at the back?",
    layers,
    answerLayer,
    "Look for the shape that covers the others, or the one hidden behind them all.",
  );
};

const buildMoveToEndQuestion = (
  layers: readonly ShapeLayer[],
  random: () => number,
): ComputingQuestion => {
  const moved = pickOne(layers, random);
  const others = layers.filter((layer) => layer !== moved);
  const isSentToBack = random() < 0.5;
  const reordered = isSentToBack ? [moved, ...others] : [...others, moved];
  const answerLayer = isSentToBack
    ? reordered[reordered.length - 1]
    : reordered[0];
  const movedName = describeLayerInSentence(moved);
  return buildLayerQuestion(
    isSentToBack
      ? `You send ${movedName} to the back. Which shape is now at the front?`
      : `You bring ${movedName} to the front. Which shape is now at the back?`,
    layers,
    answerLayer,
    "Picture the move first, then check the other end of the stack.",
  );
};

const buildNeighbourLayerQuestion = (
  layers: readonly ShapeLayer[],
  random: () => number,
): ComputingQuestion => {
  const index = pickWholeNumber(0, layers.length - 2, random);
  const chosen = layers[index];
  const inFront = layers[index + 1];
  const chosenName = describeLayerInSentence(chosen);
  return random() < 0.5
    ? buildLayerQuestion(
        `Which shape is on the layer just in front of ${chosenName}?`,
        layers,
        inFront,
        "Find that shape, then look one layer nearer to you.",
      )
    : buildLayerQuestion(
        `You bring ${chosenName} forward one layer. Which shape is now just behind it?`,
        layers,
        inFront,
        "Bring forward swaps a shape with the one just in front of it.",
      );
};

const vectorConcepts: readonly ComputingQuestion[] = [
  {
    ask: "Why can a vector drawing be made huge without going blocky?",
    scene: {
      kind: "shape-layers",
      layers: [
        { shape: "circle", colour: "yellow" },
        { shape: "star", colour: "red" },
      ],
    },
    answer: "Shapes, not pixels",
    distractors: [
      "It uses bigger pixels",
      "It has no colours",
      "It is printed first",
    ],
  },
  {
    ask: "These shapes are grouped. What happens if you drag one of them?",
    scene: {
      kind: "shape-layers",
      layers: [
        { shape: "square", colour: "blue" },
        { shape: "triangle", colour: "green" },
        { shape: "circle", colour: "orange" },
      ],
      isGrouped: true,
    },
    answer: "They all move together",
    distractors: [
      "Only that one moves",
      "They all get deleted",
      "They all change colour",
    ],
  },
  {
    ask: "Which tool joins shapes so they can be moved as one object?",
    scene: {
      kind: "shape-layers",
      layers: [
        { shape: "heart", colour: "purple" },
        { shape: "star", colour: "yellow" },
      ],
    },
    answer: "Group",
    distractors: ["Duplicate", "Delete", "Send to back"],
  },
  {
    ask: "You need ten stars exactly the same. Which tool saves time?",
    scene: {
      kind: "shape-layers",
      layers: [
        { shape: "square", colour: "blue" },
        { shape: "star", colour: "yellow" },
      ],
    },
    answer: "Duplicate",
    distractors: ["Group", "Send to back", "Delete"],
  },
  {
    ask: "Which kind of picture is made of tiny coloured squares?",
    scene: {
      kind: "shape-layers",
      layers: [
        { shape: "triangle", colour: "green" },
        { shape: "circle", colour: "red" },
      ],
    },
    answer: "A paint program picture",
    distractors: ["A vector drawing", "A sound file", "A database"],
  },
];

const vectorLayerCounts: Record<ComputingDifficulty, number> = {
  1: 4,
  2: 4,
  3: 5,
};

const buildVectorQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  const layers = buildLayers(vectorLayerCounts[difficulty], random);
  if (difficulty === 1) {
    return buildFrontOrBackQuestion(layers, random);
  }
  if (difficulty === 2) {
    return random() < 0.7
      ? buildMoveToEndQuestion(layers, random)
      : buildFrontOrBackQuestion(layers, random);
  }
  return random() < 0.6
    ? buildNeighbourLayerQuestion(layers, random)
    : buildMoveToEndQuestion(layers, random);
};

const vectorArtist = defineComputingGame({
  gameType: "vector-artist",
  title: "Vector Artist",
  skillId: "computing.vector-drawing",
  instruction: "Work out which shape goes on which layer.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) => [
      ...Array.from({ length: questionsPerBatch - 1 }, () =>
        buildVectorQuestion(difficulty, random),
      ),
      pickOne(vectorConcepts, random),
    ],
  },
});

const quizItems = [
  {
    question: "capital of France?",
    right: "Paris",
    wrong: ["Rome", "London", "Madrid"],
  },
  {
    question: "capital of Wales?",
    right: "Cardiff",
    wrong: ["Swansea", "Bristol", "Belfast"],
  },
  {
    question: "largest planet?",
    right: "Jupiter",
    wrong: ["Mars", "Earth", "Venus"],
  },
  { question: "legs on a spider?", right: "8", wrong: ["6", "4", "10"] },
  { question: "7 times 8?", right: "56", wrong: ["54", "48", "64"] },
  {
    question: "days in a leap year?",
    right: "366",
    wrong: ["365", "364", "360"],
  },
] as const;

const quizFeedback = [
  { good: "Correct!", bad: "Try again" },
  { good: "Well done!", bad: "Not quite" },
  { good: "Yes!", bad: "Sorry, no" },
] as const;

const buildQuizOpening = (question: string, right: string): CodeBlock[] => [
  { text: `Ask: ${question}`, category: "sensing" },
  { text: `If answer = ${right}`, category: "control" },
];

const buildQuizSayQuestion = (random: () => number): ComputingQuestion => {
  const item = pickOne(quizItems, random);
  const feedback = pickOne(quizFeedback, random);
  const otherFeedback = pickOne(
    quizFeedback.filter((option) => option !== feedback),
    random,
  );
  const isRight = random() < 0.5;
  const typed = isRight ? item.right : pickOne(item.wrong, random);
  const answer = isRight ? feedback.good : feedback.bad;
  return {
    ask: `The player types ${typed}. What does the sprite say?`,
    scene: {
      kind: "code-stack",
      blocks: [
        { text: "When flag clicked", category: "event" },
        ...buildQuizOpening(item.question, item.right),
        { text: `Say ${feedback.good}`, category: "looks", depth: 1 },
        { text: "Else", category: "control" },
        { text: `Say ${feedback.bad}`, category: "looks", depth: 1 },
      ],
    },
    answer,
    distractors: listOtherValues(
      [feedback.good, feedback.bad, otherFeedback.good, "Nothing at all"],
      answer,
    ),
    hint: "Does what the player typed match the answer in the If block?",
  };
};

const buildQuizConditionQuestion = (
  random: () => number,
): ComputingQuestion => {
  const item = pickOne(quizItems, random);
  const feedback = pickOne(quizFeedback, random);
  const [firstWrong, secondWrong] = shuffleValues(item.wrong, random);
  return {
    ask: `The sprite should say ${feedback.good} only for the right answer. Which condition is missing?`,
    scene: {
      kind: "code-stack",
      blocks: [
        { text: "When flag clicked", category: "event" },
        { text: `Ask: ${item.question}`, category: "sensing" },
        { text: "If ???", category: "control", isHighlighted: true },
        { text: `Say ${feedback.good}`, category: "looks", depth: 1 },
        { text: "Else", category: "control" },
        { text: `Say ${feedback.bad}`, category: "looks", depth: 1 },
      ],
    },
    answer: `answer = ${item.right}`,
    distractors: [
      `answer = ${firstWrong}`,
      `answer = ${secondWrong}`,
      `score = ${item.right}`,
    ],
    hint: "The condition must compare what the player typed with the right answer.",
  };
};

const buildQuizScoreQuestion = (random: () => number): ComputingQuestion => {
  const item = pickOne(quizItems, random);
  const feedback = pickOne(quizFeedback, random);
  const startScore = pickWholeNumber(0, 9, random);
  const isRight = random() < 0.5;
  const typed = isRight ? item.right : pickOne(item.wrong, random);
  const endScore = isRight ? startScore + 1 : startScore;
  return {
    ask: `The score is ${String(startScore)}. The player types ${typed}. What is the score now?`,
    scene: {
      kind: "code-stack",
      blocks: [
        { text: "When flag clicked", category: "event" },
        ...buildQuizOpening(item.question, item.right),
        { text: `Say ${feedback.good}`, category: "looks", depth: 1 },
        { text: "Change score by 1", category: "variables", depth: 1 },
        { text: "Else", category: "control" },
        { text: `Say ${feedback.bad}`, category: "looks", depth: 1 },
      ],
    },
    answer: String(endScore),
    distractors: buildNumberDistractors(endScore),
    hint: "The score only changes inside the If part.",
  };
};

const buildQuizTwoRoundsQuestion = (
  random: () => number,
): ComputingQuestion => {
  const item = pickOne(quizItems, random);
  const feedback = pickOne(quizFeedback, random);
  const pointsForRight = pickWholeNumber(2, 3, random);
  const startScore = pickWholeNumber(2, 10, random);
  const rounds = [random() < 0.5, random() < 0.5];
  const typedAnswers = rounds.map((isRight) =>
    isRight ? item.right : pickOne(item.wrong, random),
  );
  const endScore = rounds.reduce(
    (score, isRight) => (isRight ? score + pointsForRight : score - 1),
    startScore,
  );
  return {
    ask: `Score starts at ${String(startScore)}. The quiz runs twice: ${typedAnswers[0]}, then ${typedAnswers[1]}. Score now?`,
    scene: {
      kind: "code-stack",
      blocks: [
        ...buildQuizOpening(item.question, item.right),
        { text: `Say ${feedback.good}`, category: "looks", depth: 1 },
        {
          text: `Change score by ${String(pointsForRight)}`,
          category: "variables",
          depth: 1,
        },
        { text: "Else", category: "control" },
        { text: `Say ${feedback.bad}`, category: "looks", depth: 1 },
        { text: "Change score by -1", category: "variables", depth: 1 },
      ],
    },
    answer: String(endScore),
    distractors: buildNumberDistractors(endScore),
    hint: "Work through one answer at a time. A wrong answer takes one point away.",
  };
};

const buildQuizMasterQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion => {
  if (difficulty === 1) {
    return buildQuizSayQuestion(random);
  }
  if (difficulty === 2) {
    const style = pickWholeNumber(0, 2, random);
    if (style === 0) {
      return buildQuizSayQuestion(random);
    }
    return style === 1
      ? buildQuizScoreQuestion(random)
      : buildQuizConditionQuestion(random);
  }
  return random() < 0.6
    ? buildQuizTwoRoundsQuestion(random)
    : buildQuizConditionQuestion(random);
};

const quizMaster = defineComputingGame({
  gameType: "quiz-master",
  title: "Quiz Master",
  skillId: "computing.selection-in-quizzes",
  instruction: "Work out what the quiz program does.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      Array.from({ length: questionsPerBatch }, () =>
        buildQuizMasterQuestion(difficulty, random),
      ),
  },
});

interface GuessingGame {
  cards: string[];
  low: number;
  high: number;
  lastGuess: number;
  wrongSideMiddle: number;
}

const findMiddle = (low: number, high: number): number =>
  Math.floor((low + high) / 2);

const countWorstGuesses = (rangeSize: number): number => {
  let remaining = rangeSize;
  let guesses = 0;
  while (remaining > 0) {
    guesses++;
    remaining = Math.floor(remaining / 2);
  }
  return guesses;
};

const buildGuessingGame = (
  largest: number,
  guessCount: number,
  random: () => number,
): GuessingGame | undefined => {
  const secret = pickWholeNumber(1, largest, random);
  const cards = [`1 to ${String(largest)}`];
  let low = 1;
  let high = largest;
  let lastGuess = 0;
  let wrongSideMiddle = 0;
  for (let round = 0; round < guessCount; round++) {
    const guess = findMiddle(low, high);
    if (guess === secret) {
      return undefined;
    }
    if (secret < guess) {
      wrongSideMiddle = findMiddle(guess + 1, high);
      high = guess - 1;
      cards.push(`Guess ${String(guess)}: lower`);
    } else {
      wrongSideMiddle = findMiddle(low, guess - 1);
      low = guess + 1;
      cards.push(`Guess ${String(guess)}: higher`);
    }
    lastGuess = guess;
  }
  if (high - low + 1 < 3) {
    return undefined;
  }
  return { cards, low, high, lastGuess, wrongSideMiddle };
};

const buildFirstGuessQuestion = (random: () => number): ComputingQuestion => {
  const largest = pickOne([10, 20, 30, 40, 50, 100], random);
  const answer = findMiddle(1, largest);
  return {
    ask: `The secret number is from 1 to ${String(largest)}. Which first guess halves the range?`,
    scene: {
      kind: "story-cards",
      cards: [`1 to ${String(largest)}`, "?"],
      missingIndex: 1,
    },
    answer: String(answer),
    distractors: listOtherValues(
      ["1", String(largest), String(answer + 10), String(answer - 3)],
      String(answer),
    ),
    hint: "Pick the number in the middle, so either answer rules out half.",
  };
};

const buildNextGuessQuestion = (
  largest: number,
  guessCount: number,
  random: () => number,
): ComputingQuestion | undefined => {
  const game = buildGuessingGame(largest, guessCount, random);
  if (game === undefined) {
    return undefined;
  }
  const answer = findMiddle(game.low, game.high);
  return {
    ask: "Lower means the secret is smaller. Best next guess? Take the middle, rounding down.",
    scene: {
      kind: "story-cards",
      cards: [...game.cards, "?"],
      missingIndex: game.cards.length,
    },
    answer: String(answer),
    distractors: listOtherValues(
      [
        String(game.low),
        String(game.high),
        String(game.lastGuess),
        String(game.wrongSideMiddle),
      ],
      String(answer),
    ),
    hint: "Work out which numbers are still possible, then pick the middle one.",
  };
};

const buildGuessesLeftQuestion = (
  random: () => number,
): ComputingQuestion | undefined => {
  const game = buildGuessingGame(100, pickWholeNumber(1, 2, random), random);
  if (game === undefined) {
    return undefined;
  }
  const answer = countWorstGuesses(game.high - game.low + 1);
  return {
    ask: "If you keep halving the range, what is the most guesses you could still need?",
    scene: {
      kind: "story-cards",
      cards: game.cards,
      highlightIndex: game.cards.length - 1,
    },
    answer: String(answer),
    distractors: buildNumberDistractors(answer, 1),
    hint: "Count how many numbers are left. How many times can you halve that?",
  };
};

const buildWorstCaseQuestion = (random: () => number): ComputingQuestion => {
  const largest = pickOne([10, 20, 50, 100], random);
  const answer = countWorstGuesses(largest);
  return {
    ask: `Halving each time, what is the most guesses needed for any number 1 to ${String(largest)}?`,
    scene: {
      kind: "story-cards",
      cards: [`1 to ${String(largest)}`, "Halve each time"],
    },
    answer: String(answer),
    distractors: listOtherValues(
      [
        String(answer - 1),
        String(answer + 1),
        String(answer + 3),
        String(largest),
      ],
      String(answer),
    ),
    hint: "Keep halving the range until only one number is left. Count each halving.",
  };
};

const halvingWhyQuestion: ComputingQuestion = {
  ask: "Why is guessing the middle better than guessing 1, 2, 3 and so on?",
  scene: {
    kind: "story-cards",
    cards: ["Guess 1, 2, 3...", "Guess the middle"],
    highlightIndex: 1,
  },
  answer: "Each guess rules out half",
  distractors: [
    "It is always right first time",
    "Small numbers are unlucky",
    "It uses fewer numbers",
  ],
};

const buildHigherOrLowerQuestion = (
  difficulty: ComputingDifficulty,
  random: () => number,
): ComputingQuestion | undefined => {
  if (difficulty === 1) {
    const style = pickWholeNumber(0, 3, random);
    if (style === 0) {
      return buildFirstGuessQuestion(random);
    }
    if (style === 1) {
      return halvingWhyQuestion;
    }
    return buildNextGuessQuestion(pickOne([20, 40], random), 1, random);
  }
  if (difficulty === 2) {
    return random() < 0.7
      ? buildNextGuessQuestion(100, 2, random)
      : buildWorstCaseQuestion(random);
  }
  const style = pickWholeNumber(0, 2, random);
  if (style === 0) {
    return buildNextGuessQuestion(100, 3, random);
  }
  return style === 1
    ? buildGuessesLeftQuestion(random)
    : buildWorstCaseQuestion(random);
};

const higherOrLower = defineComputingGame({
  gameType: "higher-or-lower",
  title: "Higher or Lower",
  skillId: "computing.explain-algorithms",
  instruction: "Halve the range to find the number fast.",
  questions: {
    kind: "generated",
    generate: (difficulty, random) =>
      buildBatch(() => buildHigherOrLowerQuestion(difficulty, random)),
  },
});

const searchRanker = defineComputingGame({
  gameType: "search-ranker",
  title: "Search Ranker",
  skillId: "computing.search-ranking",
  instruction: "How does the search engine choose its order?",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Why does the top result have an Ad label?",
        scene: {
          kind: "search-engine",
          query: "football boots",
          results: [
            {
              title: "Super Boots Sale",
              address: "www.bootshop.example",
              isAdvert: true,
            },
            { title: "How to choose boots", address: "www.kit-help.example" },
            { title: "Football boot guide", address: "www.sport-tips.example" },
          ],
        },
        answer: "Someone paid for it",
        distractors: [
          "It is the best page",
          "It is the newest page",
          "The search engine wrote it",
        ],
      },
      {
        ask: "Which of these results is an advert?",
        scene: {
          kind: "search-engine",
          query: "tiger facts",
          results: [
            { title: "Tiger facts for kids", address: "www.big-cats.example" },
            {
              title: "Cheap Zoo Tickets",
              address: "www.zoo-deals.example",
              isAdvert: true,
            },
            { title: "Where tigers live", address: "www.wild-world.example" },
          ],
        },
        answer: "Cheap Zoo Tickets",
        distractors: [
          "Tiger facts for kids",
          "Where tigers live",
          "None of them",
        ],
        hint: "Look for a small label next to one of the results.",
      },
      {
        ask: "Pages that match your search words closely usually rank...",
        scene: {
          kind: "search-engine",
          query: "how volcanoes erupt",
          results: [
            { title: "How volcanoes erupt", address: "www.earth-lab.example" },
            { title: "Volcano holidays", address: "www.trips.example" },
          ],
        },
        answer: "Higher up the list",
        distractors: [
          "Lower down the list",
          "In a random place",
          "Last of all",
        ],
      },
      {
        ask: "Lots of other websites link to a page. What usually happens to its rank?",
        scene: {
          kind: "search-engine",
          query: "rainforest animals",
          results: [
            {
              title: "Rainforest animals A to Z",
              address: "www.jungle-facts.example",
            },
            { title: "My rainforest diary", address: "www.amys-blog.example" },
          ],
        },
        answer: "It usually ranks higher",
        distractors: [
          "It usually ranks lower",
          "It gets hidden",
          "It turns into an advert",
        ],
      },
      {
        ask: "Is the first result always the best one for you?",
        scene: {
          kind: "search-engine",
          query: "space facts",
          results: [
            { title: "Space facts", address: "www.star-guide.example" },
            { title: "Planets for kids", address: "www.orbit-club.example" },
          ],
        },
        answer: "No, check it is useful",
        distractors: [
          "Yes, always",
          "Yes, teachers check it",
          "Yes, it is never wrong",
        ],
      },
      {
        ask: "What does a search engine use to decide the order of results?",
        scene: {
          kind: "search-engine",
          query: "pancake recipe",
          results: [
            { title: "Easy pancakes", address: "www.quick-cook.example" },
            { title: "Pancake day history", address: "www.food-past.example" },
          ],
        },
        answer: "An algorithm",
        distractors: ["A coin toss", "The page colour", "Alphabetical order"],
      },
      {
        ask: "What is a web crawler?",
        scene: {
          kind: "search-engine",
          query: "web crawler",
          results: [
            { title: "What crawlers do", address: "www.web-guide.example" },
          ],
        },
        answer: "A program that visits pages",
        distractors: [
          "A spider in your computer",
          "A type of advert",
          "A slow internet",
        ],
        hint: "It travels from link to link, reading web pages.",
      },
      {
        ask: "Before you search, what has the search engine already made?",
        scene: {
          kind: "search-engine",
          query: "castles",
          results: [
            { title: "Castles of Britain", address: "www.old-forts.example" },
            { title: "Build a sandcastle", address: "www.beach-fun.example" },
          ],
        },
        answer: "An index of web pages",
        distractors: [
          "A printout of every page",
          "A list of your friends",
          "Nothing at all",
        ],
        hint: "Like the back of a book, it lists which pages have which words.",
      },
      {
        ask: "Why might a company pay to appear at the top of the results?",
        scene: {
          kind: "search-engine",
          query: "new trainers",
          results: [
            {
              title: "Trainers half price",
              address: "www.shoe-mart.example",
              isAdvert: true,
            },
            { title: "Trainer reviews", address: "www.kit-check.example" },
          ],
        },
        answer: "So more people visit them",
        distractors: [
          "To make the internet faster",
          "Because it is the law",
          "To delete other sites",
        ],
      },
      {
        ask: "You want to learn how to train a puppy. Which search is best?",
        scene: {
          kind: "search-engine",
          query: "dog",
          results: [
            { title: "Dog breeds", address: "www.pet-world.example" },
            { title: "Dog toys", address: "www.toy-shop.example" },
          ],
        },
        answer: "how to train a puppy",
        distractors: ["dog", "puppy stuff", "help"],
        hint: "Clear, exact words help the search engine match the right pages.",
      },
      {
        ask: "Why might two people get different results for the same search?",
        scene: {
          kind: "search-engine",
          query: "swimming pools",
          results: [
            { title: "Pools near you", address: "www.swim-finder.example" },
          ],
        },
        answer: "Different places and history",
        distractors: [
          "One typed louder",
          "The internet is broken",
          "Results are totally random",
        ],
      },
      {
        ask: "A result at the bottom of the page matches exactly what you need. What should you do?",
        scene: {
          kind: "search-engine",
          query: "egypt pyramids facts",
          results: [
            {
              title: "Desert holidays",
              address: "www.sun-trips.example",
              isAdvert: true,
            },
            { title: "Pyramid toys", address: "www.toy-shop.example" },
            {
              title: "Pyramids of Egypt facts",
              address: "www.history-hub.example",
            },
          ],
        },
        answer: "Choose it, even though lower",
        distractors: [
          "Only ever click the top",
          "Click the advert",
          "Give up searching",
        ],
      },
    ],
  },
});

const sensorJobs = {
  thermometer: "Checking a fish tank is warm",
  light: "Turning lights on at night",
  microphone: "Measuring how noisy a room is",
  barcode: "Reading prices at a shop till",
  watch: "Counting steps on a walk",
  webcam: "Seeing your gran on a call",
  camera: "Photographing a bird feeder",
} as const;

const listOtherSensorJobs = (answer: string): string[] =>
  listOtherValues(Object.values(sensorJobs), answer).slice(0, 4);

const sensorSense = defineComputingGame({
  gameType: "sensor-sense",
  title: "Sensor Sense",
  skillId: "computing.choose-sensors",
  instruction: "Choose the right sensor for the job.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Which job is this sensor best for?",
        scene: {
          kind: "device",
          device: "thermometer",
          caption: "Temperature sensor",
        },
        answer: sensorJobs.thermometer,
        distractors: listOtherSensorJobs(sensorJobs.thermometer),
      },
      {
        ask: "Which job is this sensor best for?",
        scene: {
          kind: "device",
          device: "light-sensor",
          caption: "Light sensor",
        },
        answer: sensorJobs.light,
        distractors: listOtherSensorJobs(sensorJobs.light),
      },
      {
        ask: "Which job is this input best for?",
        scene: { kind: "device", device: "microphone", caption: "Microphone" },
        answer: sensorJobs.microphone,
        distractors: listOtherSensorJobs(sensorJobs.microphone),
      },
      {
        ask: "Which job is this input best for?",
        scene: {
          kind: "device",
          device: "barcode-scanner",
          caption: "Barcode scanner",
        },
        answer: sensorJobs.barcode,
        distractors: listOtherSensorJobs(sensorJobs.barcode),
      },
      {
        ask: "Which job is this device's motion sensor best for?",
        scene: {
          kind: "device",
          device: "smart-watch",
          caption: "Smart watch",
        },
        answer: sensorJobs.watch,
        distractors: listOtherSensorJobs(sensorJobs.watch),
      },
      {
        ask: "Which job is this input best for?",
        scene: { kind: "device", device: "webcam", caption: "Webcam" },
        answer: sensorJobs.webcam,
        distractors: listOtherSensorJobs(sensorJobs.webcam),
      },
      {
        ask: "What does this sensor measure?",
        scene: {
          kind: "device",
          device: "thermometer",
          caption: "Temperature sensor",
        },
        answer: "How hot or cold it is",
        distractors: ["How bright it is", "How loud it is", "How fast it is"],
      },
      {
        ask: "What does this sensor measure?",
        scene: {
          kind: "device",
          device: "light-sensor",
          caption: "Light sensor",
        },
        answer: "How bright it is",
        distractors: [
          "How hot or cold it is",
          "How loud it is",
          "How heavy it is",
        ],
      },
      {
        ask: "What kind of data does this input collect?",
        scene: { kind: "device", device: "microphone", caption: "Microphone" },
        answer: "Sound",
        distractors: ["Temperature", "Light", "Prices"],
      },
      {
        ask: "A sensor takes a reading every minute all day. What is this called?",
        scene: {
          kind: "device",
          device: "thermometer",
          caption: "Temperature sensor",
        },
        answer: "Data logging",
        distractors: ["Debugging", "Printing", "Searching"],
        hint: "The readings are saved one after another, like a log book.",
      },
      {
        ask: "Is this an input device or an output device?",
        scene: { kind: "device", device: "speaker", caption: "Speaker" },
        answer: "Output",
        distractors: ["Input", "A sensor", "A barcode"],
        hint: "Does it collect data, or give something out?",
      },
      {
        ask: "A wildlife club wants pictures of birds at the feeder. Which device fits?",
        scene: {
          kind: "device",
          device: "digital-camera",
          caption: "Digital camera",
        },
        answer: "This camera",
        distractors: ["A thermometer", "A barcode scanner", "A microphone"],
      },
      {
        ask: "A garden lamp should switch on when it gets dark. Which sensor?",
        scene: { kind: "device", device: "light-sensor", caption: "Sensor" },
        answer: "A light sensor",
        distractors: ["A microphone", "A barcode scanner", "A keyboard"],
      },
    ],
  },
});

const reportIt = defineComputingGame({
  gameType: "report-it",
  title: "Report It",
  skillId: "computing.report-concerns",
  instruction: "Choose the best way to get help.",
  questions: {
    kind: "bank",
    questions: [
      {
        ask: "Someone you met online says to keep your chats secret. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [
              { from: "StarPlayer", text: "Don't tell anyone we chat" },
            ],
          },
        },
        answer: "Tell a trusted adult",
        distractors: [
          "Keep the secret",
          "Send them a photo",
          "Give them your address",
        ],
      },
      {
        ask: "Someone posts unkind comments about you. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Comments",
          screen: {
            app: "social",
            lines: ["Your drawing", "Comment: you are useless"],
          },
        },
        answer: "Tell an adult you trust",
        distractors: [
          "Reply with mean words",
          "Keep it to yourself",
          "Share it with everyone",
        ],
      },
      {
        ask: "What does the Block button do?",
        scene: {
          kind: "tablet-screen",
          title: "Player menu",
          screen: { app: "game", lines: ["Player: Grr123", "Block", "Report"] },
        },
        answer: "Stops them contacting you",
        distractors: [
          "Sends them a gift",
          "Makes them your friend",
          "Shares your location",
        ],
      },
      {
        ask: "What does the Report button do?",
        scene: {
          kind: "tablet-screen",
          title: "Player menu",
          screen: { app: "game", lines: ["Player: Grr123", "Block", "Report"] },
        },
        answer: "Tells the site's safety team",
        distractors: [
          "Tells all their friends",
          "Posts it again",
          "Deletes the internet",
        ],
      },
      {
        ask: "Why might a trusted adult ask you to take a screenshot?",
        scene: {
          kind: "tablet-screen",
          title: "Chat",
          screen: {
            app: "chat",
            messages: [{ from: "Unknown", text: "You will be sorry" }],
          },
        },
        answer: "To keep evidence for a report",
        distractors: [
          "To share it online",
          "To laugh at it",
          "To make a poster",
        ],
        hint: "A picture of the screen shows exactly what was said.",
      },
      {
        ask: "Which of these is NOT acceptable behaviour online?",
        scene: {
          kind: "tablet-screen",
          title: "Game chat",
          screen: {
            app: "chat",
            messages: [
              { from: "Ria", text: "Good game, well played!" },
              { from: "Tom", text: "Thanks for the help!" },
            ],
          },
        },
        answer: "Sending threats",
        distractors: [
          "Saying well played",
          "Saying thank you",
          "Asking a friend for help",
        ],
      },
      {
        ask: "You feel you cannot talk to an adult you know. Who else could help?",
        scene: {
          kind: "tablet-screen",
          title: "Get help",
          screen: {
            app: "browser",
            lines: ["Need to talk?", "Free children's helpline"],
          },
        },
        answer: "A children's helpline",
        distractors: ["A stranger online", "Nobody at all", "A random pop-up"],
      },
      {
        ask: "A player keeps asking for photos of you. What is this?",
        scene: {
          kind: "tablet-screen",
          title: "Game chat",
          screen: {
            app: "chat",
            messages: [{ from: "Max_77", text: "Send me a photo of you" }],
          },
        },
        answer: "Not OK, so report it",
        distractors: [
          "Normal and fine",
          "Just being friendly",
          "A game reward",
        ],
      },
      {
        ask: "A video upsets you. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Videos",
          screen: { app: "video", lines: ["Up next:", "Scary prank video"] },
        },
        answer: "Close it and tell an adult",
        distractors: [
          "Watch it again",
          "Send it to friends",
          "Keep it a secret",
        ],
      },
      {
        ask: "You clicked a bad link by mistake, then told an adult. Was that right?",
        scene: {
          kind: "tablet-screen",
          title: "Oops",
          screen: { app: "pop-up", lines: ["Warning!", "This page is unsafe"] },
        },
        answer: "Yes, telling is always right",
        distractors: [
          "No, you'll be in trouble",
          "No, hide it instead",
          "Only if it's tiny",
        ],
        hint: "Adults want to help, even when something was a mistake.",
      },
      {
        ask: "A friend is being picked on in a group chat. What could you do?",
        scene: {
          kind: "tablet-screen",
          title: "Group chat",
          screen: {
            app: "chat",
            messages: [
              { from: "Jay", text: "Nobody likes you Sam" },
              { from: "Kit", text: "Ha ha" },
            ],
          },
        },
        answer: "Support Sam and tell an adult",
        distractors: [
          "Join in the joke",
          "Add a laughing face",
          "Forward it to others",
        ],
      },
      {
        ask: "An online gamer asks to meet you in real life. What should you do?",
        scene: {
          kind: "tablet-screen",
          title: "Game chat",
          screen: {
            app: "chat",
            messages: [
              { from: "Pro_Gamer", text: "Want to meet at the park?" },
            ],
          },
        },
        answer: "Don't go, tell an adult",
        distractors: [
          "Go on your own",
          "Meet them in secret",
          "Send your address",
        ],
      },
    ],
  },
});

export const yearFiveComputingGames = [
  teamUpOnline,
  videoDirector,
  ifThisThenThat,
  databaseDetective,
  vectorArtist,
  quizMaster,
  higherOrLower,
  searchRanker,
  sensorSense,
  reportIt,
] as const;
