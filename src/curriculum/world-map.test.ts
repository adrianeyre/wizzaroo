import { describe, expect, it } from "vitest";
import { computingGameTypes } from "./computing-games.js";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import { islands as drawnIslands } from "./islands.js";
import {
  englishExtraGameTypes,
  englishRegionGameTypes,
} from "./english-games.js";
import { labGames } from "./lab-games.js";
import { musicGameTypes } from "./music-games.js";
import { subjects, type Subject, type YearGroup } from "./skills.js";
import {
  findHomeIsland,
  findRegionKey,
  challengeArenaName,
  gamesPerRegion,
  hasEveryGameOpen,
  isBigTop,
  isChallengeArena,
  listIslandRegions,
  parseTheme,
  parseWorldMap,
  worldMap,
  type TeachesSubject,
} from "./world-map.js";

const theme = {
  id: "bright-meadow",
  palette: { sky: "#8fd3ff", ground: "#7ccf6a", accent: "#ffd23f" },
  music: { id: "bright-meadow-chiptune", beatsPerMinute: 100, regionTunes: {} },
  modelSet: "low-poly-meadow",
  companionStyle: "round-owl",
};

const meadowIsle = {
  id: "meadow-isle",
  name: "Meadow Isle",
  yearGroup: 1,
  seaPosition: { x: 0, z: 0 },
  landmarks: ["volcano", "lighthouse"],
  theme,
};

const tenGames = (subject: Subject, prefix: string) =>
  Array.from({ length: gamesPerRegion }, (_, index) => ({
    id: `${prefix}-${String(index + 1)}`,
    gameType: "popping-bubbles",
    subject,
  }));

const bubbleBay = {
  islandId: "meadow-isle",
  id: "bubble-bay",
  name: "Bubble Bay",
  subject: "maths",
  story: "The bubble machine is jammed!",
  landmark: "bubbles",
  mapPosition: { x: -14, z: 9 },
  games: tenGames("maths", "maths-game"),
};

const bigTop = {
  islandId: "meadow-isle",
  id: "brainwave-big-top",
  name: "Brainwave Big Top",
  story: "Roll up for puzzles!",
  landmark: "big-top",
  mapPosition: { x: 16, z: 2 },
  games: [
    { id: "word-search", gameType: "word-search", subject: "english" },
    { id: "sudoku", gameType: "sudoku", subject: "maths" },
  ],
};

const challengeArena = {
  islandId: "meadow-isle",
  id: "challenge-arena",
  name: "Challenge Arena",
  story: "Read every word to the judges!",
  landmark: "challenge-arena",
  mapPosition: { x: 4, z: 11 },
  games: [
    {
      id: "phonics-screening-check",
      gameType: "phonics-screening-check",
      subject: "phonics",
    },
  ],
};

const teachesMathsOnly: TeachesSubject = (_yearGroup, subject) =>
  subject === "maths";

const worldMapContent = {
  islands: [meadowIsle],
  regions: [bubbleBay, bigTop, challengeArena],
};

const parseTestMap = (content: unknown) =>
  parseWorldMap(content, teachesMathsOnly);

describe("worldMap", () => {
  it("holds six Islands, one for each Year Group, from Meadow Isle in Year 1 to Starfall Isle in Year 6", () => {
    expect(
      worldMap.islands.map(({ name, yearGroup }) => [name, yearGroup]),
    ).toEqual([
      ["Meadow Isle", 1],
      ["Frost Isle", 2],
      ["Sunscorch Sands", 3],
      ["Jungle Reach", 4],
      ["Ember Isle", 5],
      ["Starfall Isle", 6],
    ]);
  });

  it("makes today's map Island 1, keeping every Region's name", () => {
    expect(listIslandRegions("meadow-isle").map(({ name }) => name)).toEqual([
      "Bubble Bay",
      "Whispering Woods",
      "Crystal Caves",
      "Cloud Castle",
      "Brainwave Big Top",
      "Crescendo Canyon",
      "Compass Peak",
      "Hourglass Heights",
      "Circuit Spire",
      "Rainbow Easel",
      "Tinker Mill",
      "Challenge Arena",
    ]);
  });

  it("gives every Island a Region for each Subject, with Phonics on Islands 1 and 2 only and Languages from Island 3", () => {
    for (const island of worldMap.islands) {
      const islandSubjects = listIslandRegions(island.id).flatMap(
        ({ subject }) => (subject === undefined ? [] : [subject]),
      );
      expect(islandSubjects.toSorted(), island.name).toEqual(
        subjects
          .filter((subject) => subject !== "phonics" || island.yearGroup <= 2)
          .filter((subject) => subject !== "languages" || island.yearGroup >= 3)
          .toSorted(),
      );
    }
  });

  it("puts the Brainwave Big Top on every Island under the same name, with the same twelve puzzles", () => {
    for (const island of worldMap.islands) {
      const bigTops = listIslandRegions(island.id).filter(isBigTop);
      expect(bigTops.map(({ name }) => name)).toEqual(["Brainwave Big Top"]);
      expect(bigTops[0].games.map(({ gameType }) => gameType)).toEqual([
        "word-search",
        "sudoku",
        "mine-sweeper",
        "crossword",
        "mahjong",
        "number-pyramid",
        "number-trail",
        "bingo",
        "clock-pairs",
        "tightrope-words",
        "ring-sort",
        "sentence-parade",
      ]);
    }
  });

  it("lists ten Games in every Region for a Subject, all of that Subject", () => {
    for (const region of worldMap.regions) {
      if (region.subject === undefined) {
        continue;
      }
      expect(region.games, findRegionKey(region)).toHaveLength(gamesPerRegion);
      expect(
        new Set(region.games.map(({ subject }) => subject)),
        findRegionKey(region),
      ).toEqual(new Set([region.subject]));
    }
  });

  it("keeps every Game added to cover a National Curriculum gap as an extra Game, outside the ten", () => {
    expect(
      worldMap.regions.flatMap((region) =>
        region.extraGames
          .filter(({ gameType }) => gameType !== "science-lab")
          .map(({ id }) => `${findRegionKey(region)}/${id}`),
      ),
    ).toEqual([
      "meadow-isle/bubble-bay/fair-shares",
      "meadow-isle/bubble-bay/treasure-map",
      "meadow-isle/whispering-woods/letter-match",
      "meadow-isle/whispering-woods/story-scrolls",
      "meadow-isle/whispering-woods/story-builder",
      "meadow-isle/crystal-caves/listen-and-pick",
      "meadow-isle/crescendo-canyon/chant-along",
      "frost-isle/icicle-inlet/fair-shares",
      "frost-isle/icicle-inlet/treasure-map",
      "frost-isle/icicle-inlet/chart-tower",
      "frost-isle/snowdrift-library/story-scrolls",
      "frost-isle/snowdrift-library/story-builder",
      "sunscorch-sands/oasis-pools/chart-tower",
      "sunscorch-sands/scroll-bazaar/story-scrolls",
      "sunscorch-sands/scroll-bazaar/story-builder",
      "jungle-reach/monkey-falls/treasure-map",
      "jungle-reach/monkey-falls/chart-tower",
      "jungle-reach/storyvine-temple/story-scrolls",
      "jungle-reach/storyvine-temple/story-builder",
      "ember-isle/anvil-quarry/treasure-map",
      "ember-isle/anvil-quarry/chart-tower",
      "ember-isle/inkfire-archive/story-scrolls",
      "ember-isle/inkfire-archive/story-builder",
      "ember-isle/obsidian-peaks/comparing-regions",
      "starfall-isle/constellation-court/fair-shares",
      "starfall-isle/constellation-court/treasure-map",
      "starfall-isle/constellation-court/chart-tower",
      "starfall-isle/moonlit-scriptorium/story-scrolls",
      "starfall-isle/moonlit-scriptorium/story-builder",
    ]);
  });

  it("puts every lab game from a Subject's lab games files in that Subject's Region on its Year's Island, as an extra Game", () => {
    for (const game of labGames.filter(
      ({ subject }) => subject !== "science",
    )) {
      const region = listIslandRegions(findHomeIsland(game.yearGroup).id).find(
        ({ subject }) => subject === game.subject,
      );
      expect(
        [...(region?.games ?? []), ...(region?.extraGames ?? [])].map(
          ({ id, gameType }) => `${gameType}/${id}`,
        ),
        game.id,
      ).toContain(`science-lab/${game.id}`);
    }
  });

  it("orders Whispering Woods' Games the way they unlock, the ten English games on every Island, with the two extra English games beside them", () => {
    for (const island of worldMap.islands) {
      const english = listIslandRegions(island.id).find(
        ({ subject }) => subject === "english",
      );
      expect(english?.games.map(({ gameType }) => gameType)).toEqual(
        englishRegionGameTypes,
      );
      expect(
        english?.extraGames
          .map(({ gameType }) => gameType)
          .filter(
            (gameType) =>
              gameType !== "letter-match" && gameType !== "science-lab",
          ),
      ).toEqual(englishExtraGameTypes);
    }
  });

  it("splits the sixty Music and sixty Computing games ten to an Island, beside any extra Games", () => {
    const listGameTypes = (subject: Subject) =>
      worldMap.regions
        .filter((region) => region.subject === subject)
        .flatMap(({ games }) => games.map(({ gameType }) => gameType));
    const extraGameTypes = new Set(
      worldMap.regions.flatMap(({ extraGames }) =>
        extraGames.map(({ gameType }) => gameType),
      ),
    );

    expect(listGameTypes("music")).toEqual(
      musicGameTypes.filter((gameType) => !extraGameTypes.has(gameType)),
    );
    expect(listGameTypes("computing")).toEqual(computingGameTypes);
  });

  it("gives every Island a theme of palette, music, model set and Companion style", () => {
    for (const island of worldMap.islands) {
      expect(Object.keys(island.theme)).toEqual([
        "id",
        "palette",
        "music",
        "modelSet",
        "companionStyle",
      ]);
      expect(island.landmarks.length).toBeGreaterThan(0);
    }
  });

  it("gives every Region a short looping tune in its Island's theme, and every Island its own tempo", () => {
    for (const island of worldMap.islands) {
      const islandRegionIds = worldMap.regions
        .filter(({ islandId }) => islandId === island.id)
        .map(({ id }) => id);
      expect(Object.keys(island.theme.music.regionTunes).toSorted()).toEqual(
        islandRegionIds.toSorted(),
      );
      for (const tune of Object.values(island.theme.music.regionTunes)) {
        expect(tune.length).toBeGreaterThanOrEqual(8);
        expect(tune.length).toBeLessThanOrEqual(32);
      }
    }
    expect(
      new Set(worldMap.islands.map(({ theme }) => theme.music.beatsPerMinute))
        .size,
    ).toBe(worldMap.islands.length);
  });

  it.each([
    ["a tune with a note that isn't one", { "bubble-bay": "C5 H9" }],
    ["a tune of nothing but rests", { "bubble-bay": "- - -" }],
    ["a tune that isn't text", { "bubble-bay": 5 }],
  ])("refuses a theme with %s", (_, regionTunes) => {
    expect(() =>
      parseTheme({ ...theme, music: { ...theme.music, regionTunes } }),
    ).toThrow(/tune of Region "bubble-bay"/);
  });

  it("agrees with the landscapes of Islands 2 to 6 on every Island's name, Year and theme, and every Region's name, Subject and place", () => {
    for (const drawnIsland of drawnIslands) {
      const island = worldMap.islands.find(({ id }) => id === drawnIsland.id);
      expect(island, drawnIsland.id).toMatchObject({
        name: drawnIsland.name,
        yearGroup: drawnIsland.yearGroup,
        theme: drawnIsland.theme,
      });
      expect(
        listIslandRegions(drawnIsland.id).map(
          ({ id, name, subject, mapPosition }) => ({
            id,
            name,
            subject,
            mapPosition,
          }),
        ),
      ).toEqual(
        expect.arrayContaining(
          drawnIsland.regions.map(({ id, name, subject, mapPosition }) => ({
            id,
            name,
            subject,
            mapPosition,
          })),
        ),
      );
      expect(listIslandRegions(drawnIsland.id)).toHaveLength(
        drawnIsland.regions.length,
      );
    }
  });
});

describe("the Challenge Arena", () => {
  it("is on Meadow Isle, Jungle Reach and Starfall Isle, the Years with a statutory check, under one name", () => {
    expect(
      worldMap.regions
        .filter(isChallengeArena)
        .map(({ islandId, name }) => [islandId, name]),
    ).toEqual([
      ["meadow-isle", challengeArenaName],
      ["jungle-reach", challengeArenaName],
      ["starfall-isle", challengeArenaName],
    ]);
  });

  it("holds Checks only, the times tables check in Year 4 and five SATs papers in Year 6", () => {
    expect(
      worldMap.regions
        .filter(isChallengeArena)
        .map(({ games }) => games.map(({ gameType }) => gameType)),
    ).toEqual([
      ["phonics-screening-check"],
      ["times-tables-check"],
      [
        "arithmetic-check",
        "reasoning-check",
        "grammar-check",
        "spelling-check",
        "reading-check",
      ],
    ]);
  });

  it("opens every Game, as the Big Top does, and no Subject Region does", () => {
    expect(
      worldMap.regions.filter(hasEveryGameOpen).map(({ landmark }) => landmark),
    ).toEqual([
      ...worldMap.islands.map(() => "big-top"),
      "challenge-arena",
      "challenge-arena",
      "challenge-arena",
    ]);
  });

  it.each([
    [
      "an Island with a statutory check but no Challenge Arena",
      { ...worldMapContent, regions: [bubbleBay, bigTop] },
      'Island "meadow-isle" needs one Region called the Challenge Arena',
    ],
    [
      "a Challenge Arena on a Year with no statutory check",
      {
        islands: [{ ...meadowIsle, yearGroup: 2 }],
        regions: [bubbleBay, bigTop, challengeArena],
      },
      'Island "meadow-isle" can\'t have a Challenge Arena',
    ],
    [
      "a Check outside the Challenge Arena",
      {
        ...worldMapContent,
        regions: [
          {
            ...bubbleBay,
            games: [
              ...bubbleBay.games.slice(1),
              {
                id: "times-tables-check",
                gameType: "times-tables-check",
                subject: "maths",
              },
            ],
          },
          bigTop,
          challengeArena,
        ],
      },
      "can't hold Checks; they belong in the Challenge Arena",
    ],
    [
      "a Region with no Subject mixing puzzles and Checks",
      {
        ...worldMapContent,
        regions: [
          bubbleBay,
          bigTop,
          {
            ...challengeArena,
            games: [...challengeArena.games, ...bigTop.games],
          },
        ],
      },
      "holding Checks only",
    ],
  ])("refuses %s", (_, content, message) => {
    expect(() => parseTestMap(content)).toThrow(message);
  });
});

describe("findHomeIsland", () => {
  it.each([
    [1, "meadow-isle"],
    [2, "frost-isle"],
    [3, "sunscorch-sands"],
    [6, "starfall-isle"],
  ] as const)(
    "finds the Island for Year %i",
    (yearGroup: YearGroup, islandId) => {
      expect(findHomeIsland(yearGroup).id).toBe(islandId);
    },
  );

  it("starts a Child with no Year Group yet on Island 1", () => {
    expect(findHomeIsland(null).id).toBe("meadow-isle");
  });
});

describe("parseWorldMap", () => {
  it("reads Islands and their Regions, a Region with no Subject being the Big Top", () => {
    const parsed = parseTestMap(worldMapContent);

    expect(parsed.islands.map(({ id }) => id)).toEqual(["meadow-isle"]);
    expect(
      parsed.regions.map(({ id, subject, extraGames }) => [
        id,
        subject,
        extraGames,
      ]),
    ).toEqual([
      ["bubble-bay", "maths", []],
      ["brainwave-big-top", undefined, []],
      ["challenge-arena", undefined, []],
    ]);
  });

  it("works out which Subjects an Island needs from the Skills taught in its Year", () => {
    const teachesPhonicsInYearOne: TeachesSubject = (yearGroup, subject) =>
      subject === "maths" || (subject === "phonics" && yearGroup === 1);

    expect(() =>
      parseWorldMap(worldMapContent, teachesPhonicsInYearOne),
    ).toThrow('Island "meadow-isle" needs a Region for phonics');
    expect(() =>
      parseWorldMap(
        {
          islands: [{ ...meadowIsle, id: "frost-isle", yearGroup: 2 }],
          regions: [
            { ...bubbleBay, islandId: "frost-isle" },
            { ...bigTop, islandId: "frost-isle" },
          ],
        },
        teachesPhonicsInYearOne,
      ),
    ).not.toThrow();
  });

  it.each([
    [
      "a Region on no Island",
      { ...worldMapContent, regions: [{ ...bubbleBay, islandId: undefined }] },
      'Region "bubble-bay" is on no Island',
    ],
    [
      "a Region on an Island that doesn't exist",
      {
        ...worldMapContent,
        regions: [{ ...bubbleBay, islandId: "atlantis" }],
      },
      'Region "bubble-bay" is on no Island',
    ],
    [
      "an Island missing a Subject taught in its Year",
      { ...worldMapContent, regions: [bigTop, challengeArena] },
      'Island "meadow-isle" needs a Region for maths',
    ],
    [
      "a Region with nine Games",
      {
        ...worldMapContent,
        regions: [{ ...bubbleBay, games: bubbleBay.games.slice(1) }, bigTop],
      },
      'Region "bubble-bay" needs 10 Games in the order they unlock, not 9',
    ],
    [
      "a Region with eleven Games",
      {
        ...worldMapContent,
        regions: [
          {
            ...bubbleBay,
            games: [
              ...bubbleBay.games,
              { id: "eleventh", gameType: "fish-count", subject: "maths" },
            ],
          },
          bigTop,
        ],
      },
      'Region "bubble-bay" needs 10 Games in the order they unlock, not 11',
    ],
    [
      "a Region mixing Subjects",
      {
        ...worldMapContent,
        regions: [
          {
            ...bubbleBay,
            games: [
              ...bubbleBay.games.slice(1),
              { id: "letters", gameType: "letter-match", subject: "english" },
            ],
          },
          bigTop,
        ],
      },
      'Region "bubble-bay" is for maths, so every Game in it needs to be maths',
    ],
    [
      "a Region mixing Subjects in its extra Games",
      {
        ...worldMapContent,
        regions: [
          {
            ...bubbleBay,
            extraGames: [
              { id: "letters", gameType: "letter-match", subject: "english" },
            ],
          },
          bigTop,
        ],
      },
      'Region "bubble-bay" is for maths, so every Game in it needs to be maths',
    ],
  ])("refuses %s", (_, content, message) => {
    expect(() => parseTestMap(content)).toThrow(message);
  });

  it.each([
    [
      "a Region listing the same Game twice",
      {
        ...worldMapContent,
        regions: [
          {
            ...bubbleBay,
            games: [...bubbleBay.games.slice(1), bubbleBay.games[1]],
          },
          bigTop,
        ],
      },
    ],
    [
      "a Big Top holding something other than puzzles",
      {
        ...worldMapContent,
        regions: [
          bubbleBay,
          { ...bigTop, games: [...bigTop.games, bubbleBay.games[0]] },
        ],
      },
    ],
    [
      "a Region for a Subject that doesn't exist",
      { ...worldMapContent, regions: [{ ...bubbleBay, subject: "latin" }] },
    ],
    [
      "a Game of a Game Type that doesn't exist",
      {
        ...worldMapContent,
        regions: [
          {
            ...bubbleBay,
            games: bubbleBay.games.with(0, {
              id: "tracing",
              gameType: "tracing",
              subject: "maths",
            }),
          },
          bigTop,
        ],
      },
    ],
    [
      "a Game with no Subject",
      {
        ...worldMapContent,
        regions: [
          {
            ...bubbleBay,
            games: [
              ...bubbleBay.games.slice(1),
              { id: "bubbles", gameType: "popping-bubbles", subject: "latin" },
            ],
          },
          bigTop,
        ],
      },
    ],
    [
      "a Region with no story",
      { ...worldMapContent, regions: [{ ...bubbleBay, story: "" }, bigTop] },
    ],
    [
      "a Region off the edge of its Island",
      {
        ...worldMapContent,
        regions: [{ ...bubbleBay, mapPosition: { x: 40, z: 0 } }, bigTop],
      },
    ],
    [
      "a Region with a landmark it can't draw",
      {
        ...worldMapContent,
        regions: [{ ...bubbleBay, landmark: "volcano" }, bigTop],
      },
    ],
    [
      "two Regions with the same ID on one Island",
      { ...worldMapContent, regions: [bubbleBay, bubbleBay, bigTop] },
    ],
    [
      "two Islands for the same Year",
      {
        ...worldMapContent,
        islands: [meadowIsle, { ...meadowIsle, id: "second-meadow" }],
      },
    ],
    [
      "an Island with a Year Group that isn't 1 to 6",
      { ...worldMapContent, islands: [{ ...meadowIsle, yearGroup: 7 }] },
    ],
    [
      "an Island with no landmarks",
      { ...worldMapContent, islands: [{ ...meadowIsle, landmarks: [] }] },
    ],
    [
      "a palette colour that isn't hex",
      {
        ...worldMapContent,
        islands: [
          {
            ...meadowIsle,
            theme: { ...theme, palette: { ...theme.palette, sky: "blue" } },
          },
        ],
      },
    ],
    [
      "a theme with no Companion style",
      {
        ...worldMapContent,
        islands: [
          { ...meadowIsle, theme: { ...theme, companionStyle: undefined } },
        ],
      },
    ],
    ["no Islands", { ...worldMapContent, islands: [] }],
    ["no Regions", { ...worldMapContent, regions: [] }],
  ])("refuses %s", (_, content) => {
    expect(() => parseTestMap(content)).toThrow(InvalidCurriculumFileError);
  });
});
