import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  kebabCaseShape,
  readFields,
} from "./curriculum-file.js";
import {
  computingGameTypes,
  type ComputingGameType,
} from "./computing-games.js";
import {
  checkGameTypes,
  isCheckGameType,
  type CheckGameType,
} from "./checks.js";
import { englishGameTypes } from "./english-games.js";
import { musicGameTypes, type MusicGameType } from "./music-games.js";
import {
  isSubject,
  isYearGroup,
  skills,
  subjects,
  type Skill,
  type Subject,
  type YearGroup,
} from "./skills.js";
import { findPitchOf, InvalidMusicError } from "./music-theory.js";
import worldMapFile from "./world-map.json" with { type: "json" };

export const builtInQuestionGameTypes = [
  "popping-bubbles",
  "listen-and-pick",
  "fish-count",
  "ten-frames",
  "shape-hunt",
  "letter-match",
  "shell-sums",
  "crab-take-away",
  "skip-count",
  "coral-heights",
  "fraction-find",
  "ship-clock",
  "fair-shares",
  "treasure-map",
  "chart-tower",
  ...englishGameTypes,
  "phonics-games",
  "science-lab",
  "geography-games",
  "history-quest",
] as const;

export type BuiltInQuestionGameType = (typeof builtInQuestionGameTypes)[number];

export type QuestionGameType =
  BuiltInQuestionGameType | MusicGameType | ComputingGameType;

export const questionGameTypes: readonly QuestionGameType[] = [
  ...builtInQuestionGameTypes,
  ...musicGameTypes,
  ...computingGameTypes,
];

export const puzzleGameTypes = [
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
] as const;

export type PuzzleGameType = (typeof puzzleGameTypes)[number];
export type GameType = QuestionGameType | PuzzleGameType | CheckGameType;

export const gameTypes: readonly GameType[] = [
  ...questionGameTypes,
  ...puzzleGameTypes,
  ...checkGameTypes,
];

export const isPuzzleGameType = (
  gameType: GameType,
): gameType is PuzzleGameType =>
  puzzleGameTypes.some((puzzleGameType) => puzzleGameType === gameType);

export const regionLandmarks = [
  "bubbles",
  "forest",
  "crystals",
  "castle",
  "spire",
  "music",
  "big-top",
  "globe",
  "hourglass",
  "easel",
  "workshop",
  "embassy",
  "challenge-arena",
] as const;

export type RegionLandmark = (typeof regionLandmarks)[number];

export interface MapPosition {
  x: number;
  z: number;
}

export const mapHalfWidth = 26;
export const mapHalfDepth = 16;

export const gamesPerRegion = 10;

export const challengeArenaName = "Challenge Arena";

export const challengeArenaYears: readonly YearGroup[] = [1, 4, 6];

export interface RegionGame {
  id: string;
  gameType: GameType;
  subject: Subject;
}

export interface Region {
  islandId: string;
  id: string;
  name: string;
  subject: Subject | undefined;
  story: string;
  landmark: RegionLandmark;
  mapPosition: MapPosition;
  games: RegionGame[];
  extraGames: RegionGame[];
}

const paletteColours = ["sky", "ground", "accent"] as const;

export type ThemePalette = Record<(typeof paletteColours)[number], string>;

export type TuneStep = number | null;

export interface ThemeMusic {
  id: string;
  beatsPerMinute: number;
  regionTunes: Record<string, TuneStep[]>;
}

export interface Theme {
  id: string;
  palette: ThemePalette;
  music: ThemeMusic;
  modelSet: string;
  companionStyle: string;
}

export interface Island {
  id: string;
  name: string;
  yearGroup: YearGroup;
  seaPosition: MapPosition;
  landmarks: string[];
  theme: Theme;
}

export interface WorldMap {
  islands: Island[];
  regions: Region[];
}

export type TeachesSubject = (
  yearGroup: YearGroup,
  subject: Subject,
) => boolean;

const worldMapFields = ["islands", "regions"];
const islandFields = [
  "id",
  "name",
  "yearGroup",
  "seaPosition",
  "landmarks",
  "theme",
];
const themeFields = ["id", "palette", "music", "modelSet", "companionStyle"];
const themeMusicFields = ["id", "beatsPerMinute", "regionTunes"];
const slowestTune = 60;
const fastestTune = 200;
const longestTune = 32;
const tuneRest = "-";
const regionFields = [
  "islandId",
  "id",
  "name",
  "subject",
  "story",
  "landmark",
  "mapPosition",
  "games",
  "extraGames",
];
const gameFields = ["id", "gameType", "subject"];
const colourShape = /^#[0-9a-f]{6}$/;

const isWithin = (value: unknown, halfSize: number): value is number =>
  typeof value === "number" && Math.abs(value) <= halfSize;

export const parseMapPosition = (
  mapPosition: unknown,
  regionId: string,
): MapPosition => {
  const fields = readFields(
    mapPosition,
    ["x", "z"],
    `The map position of Region "${regionId}"`,
  );
  const x = fields.get("x");
  const z = fields.get("z");
  if (!isWithin(x, mapHalfWidth) || !isWithin(z, mapHalfDepth)) {
    throw new InvalidCurriculumFileError(
      `Region "${regionId}" needs a map position with x from -${String(mapHalfWidth)} to ${String(mapHalfWidth)} and z from -${String(mapHalfDepth)} to ${String(mapHalfDepth)}`,
    );
  }
  return { x, z };
};

const parseSeaPosition = (
  seaPosition: unknown,
  islandId: string,
): MapPosition => {
  const fields = readFields(
    seaPosition,
    ["x", "z"],
    `The sea position of Island "${islandId}"`,
  );
  const x = fields.get("x");
  const z = fields.get("z");
  if (typeof x !== "number" || typeof z !== "number") {
    throw new InvalidCurriculumFileError(
      `Island "${islandId}" needs a sea position with numbers for x and z`,
    );
  }
  return { x, z };
};

const isRegionLandmark = (value: unknown): value is RegionLandmark =>
  regionLandmarks.some((landmark) => landmark === value);

const isGameType = (value: unknown): value is GameType =>
  gameTypes.some((gameType) => gameType === value);

export const readKebabCaseId = (
  value: unknown,
  describedAs: string,
): string => {
  if (typeof value !== "string" || !kebabCaseShape.test(value)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs an ID shaped like "bubble-bay"`,
    );
  }
  return value;
};

export const readText = (value: unknown, describedAs: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidCurriculumFileError(`${describedAs} can't be empty`);
  }
  return value;
};

const parsePalette = (palette: unknown, themeId: string): ThemePalette => {
  const fields = readFields(
    palette,
    paletteColours,
    `The palette of theme "${themeId}"`,
  );
  const [sky, ground, accent] = paletteColours.map((colourName) => {
    const colour = fields.get(colourName);
    if (typeof colour !== "string" || !colourShape.test(colour)) {
      throw new InvalidCurriculumFileError(
        `Theme "${themeId}" needs its ${colourName} colour shaped like "#8fd3ff"`,
      );
    }
    return colour;
  });
  return { sky, ground, accent };
};

const parseTuneStep = (step: string, where: string): TuneStep => {
  if (step === tuneRest) {
    return null;
  }
  try {
    return findPitchOf(step);
  } catch (error) {
    if (error instanceof InvalidMusicError) {
      throw new InvalidCurriculumFileError(`${where}: ${error.message}`);
    }
    throw error;
  }
};

const parseTune = (tune: unknown, where: string): TuneStep[] => {
  const steps = typeof tune === "string" ? tune.trim().split(/\s+/) : [];
  if (
    steps.length > longestTune ||
    steps.every((step) => step === tuneRest || step === "")
  ) {
    throw new InvalidCurriculumFileError(
      `${where} needs 1 to ${String(longestTune)} notes or rests, such as "C5 E5 - G5"`,
    );
  }
  return steps.map((step) => parseTuneStep(step, where));
};

const parseThemeMusic = (musicFile: unknown, themeId: string): ThemeMusic => {
  const where = `The music of theme "${themeId}"`;
  const fields = readFields(musicFile, themeMusicFields, where);
  const beatsPerMinute = fields.get("beatsPerMinute");
  if (
    typeof beatsPerMinute !== "number" ||
    !Number.isInteger(beatsPerMinute) ||
    beatsPerMinute < slowestTune ||
    beatsPerMinute > fastestTune
  ) {
    throw new InvalidCurriculumFileError(
      `${where} needs a whole number of beats a minute from ${String(slowestTune)} to ${String(fastestTune)}`,
    );
  }
  const regionTunes = fields.get("regionTunes");
  if (
    typeof regionTunes !== "object" ||
    regionTunes === null ||
    Array.isArray(regionTunes)
  ) {
    throw new InvalidCurriculumFileError(`${where} needs its Region tunes`);
  }
  return {
    id: readKebabCaseId(fields.get("id"), where),
    beatsPerMinute,
    regionTunes: Object.fromEntries(
      Object.entries(regionTunes).map(([regionId, tune]) => [
        readKebabCaseId(regionId, `A Region tune in ${where}`),
        parseTune(
          tune,
          `The tune of Region "${regionId}" in theme "${themeId}"`,
        ),
      ]),
    ),
  };
};

export const parseTheme = (themeFile: unknown): Theme => {
  const fields = readFields(themeFile, themeFields, "A theme");
  const id = readKebabCaseId(fields.get("id"), "A theme");
  return {
    id,
    palette: parsePalette(fields.get("palette"), id),
    music: parseThemeMusic(fields.get("music"), id),
    modelSet: readKebabCaseId(
      fields.get("modelSet"),
      `The model set of theme "${id}"`,
    ),
    companionStyle: readKebabCaseId(
      fields.get("companionStyle"),
      `The Companion style of theme "${id}"`,
    ),
  };
};

const parseIsland = (islandFile: unknown): Island => {
  const fields = readFields(islandFile, islandFields, "An Island");
  const id = readKebabCaseId(fields.get("id"), "An Island");
  const yearGroup = fields.get("yearGroup");
  if (!isYearGroup(yearGroup)) {
    throw new InvalidCurriculumFileError(
      `Island "${id}" needs a Year Group from 1 to 6`,
    );
  }
  const landmarks = fields.get("landmarks");
  if (!isNonEmptyList(landmarks)) {
    throw new InvalidCurriculumFileError(`Island "${id}" needs landmarks`);
  }
  return {
    id,
    name: readText(fields.get("name"), `The name of Island "${id}"`),
    yearGroup,
    seaPosition: parseSeaPosition(fields.get("seaPosition"), id),
    landmarks: landmarks.map((landmark) =>
      readKebabCaseId(landmark, `A landmark of Island "${id}"`),
    ),
    theme: parseTheme(fields.get("theme")),
  };
};

const parseRegionGame = (gameFile: unknown, regionId: string): RegionGame => {
  const fields = readFields(
    gameFile,
    gameFields,
    `A Game in Region "${regionId}"`,
  );
  const gameType = fields.get("gameType");
  const subject = fields.get("subject");
  if (!isGameType(gameType)) {
    throw new InvalidCurriculumFileError(
      `Region "${regionId}" has a Game whose Game Type "${String(gameType)}" isn't one Wizzaroo knows`,
    );
  }
  if (!isSubject(subject)) {
    throw new InvalidCurriculumFileError(
      `Region "${regionId}" has a Game with no Subject`,
    );
  }
  return {
    id: readKebabCaseId(fields.get("id"), `A Game in Region "${regionId}"`),
    gameType,
    subject,
  };
};

export const parseRegionSubject = (
  subject: unknown,
  regionId: string,
): Subject | undefined => {
  if (subject === undefined || isSubject(subject)) {
    return subject;
  }
  throw new InvalidCurriculumFileError(
    `Region "${regionId}" is for a subject that isn't a Subject`,
  );
};

const parseGameList = (gameFiles: unknown, regionId: string): RegionGame[] =>
  Array.isArray(gameFiles)
    ? gameFiles.map((gameFile) => parseRegionGame(gameFile, regionId))
    : [];

const checkRegionGames = (
  id: string,
  subject: Subject | undefined,
  games: readonly RegionGame[],
  extraGames: readonly RegionGame[],
) => {
  const everyGame = [...games, ...extraGames];
  const repeatedGameId = findRepeat(everyGame.map((game) => game.id));
  if (repeatedGameId !== undefined) {
    throw new InvalidCurriculumFileError(
      `Region "${id}" lists the Game "${repeatedGameId}" twice`,
    );
  }
  if (subject === undefined) {
    const isEveryGameAPuzzle = games.every(({ gameType }) =>
      isPuzzleGameType(gameType),
    );
    const isEveryGameACheck = games.every(({ gameType }) =>
      isCheckGameType(gameType),
    );
    if (
      games.length === 0 ||
      extraGames.length > 0 ||
      (!isEveryGameAPuzzle && !isEveryGameACheck)
    ) {
      throw new InvalidCurriculumFileError(
        `Region "${id}" has no Subject, so it is the Brainwave Big Top holding puzzles only, or the ${challengeArenaName} holding Checks only`,
      );
    }
    return;
  }
  if (everyGame.some(({ gameType }) => isCheckGameType(gameType))) {
    throw new InvalidCurriculumFileError(
      `Region "${id}" is for ${subject}, so it can't hold Checks; they belong in the ${challengeArenaName}`,
    );
  }
  if (games.length !== gamesPerRegion) {
    throw new InvalidCurriculumFileError(
      `Region "${id}" needs ${String(gamesPerRegion)} Games in the order they unlock, not ${String(games.length)}`,
    );
  }
  if (everyGame.some((game) => game.subject !== subject)) {
    throw new InvalidCurriculumFileError(
      `Region "${id}" is for ${subject}, so every Game in it needs to be ${subject}`,
    );
  }
};

const parseRegion = (
  regionFile: unknown,
  islandIds: ReadonlySet<string>,
): Region => {
  const fields = readFields(regionFile, regionFields, "A Region");
  const id = readKebabCaseId(fields.get("id"), "A Region");
  const islandId = fields.get("islandId");
  if (typeof islandId !== "string" || !islandIds.has(islandId)) {
    throw new InvalidCurriculumFileError(`Region "${id}" is on no Island`);
  }
  const subject = parseRegionSubject(fields.get("subject"), id);
  const games = parseGameList(fields.get("games"), id);
  const extraGames = parseGameList(fields.get("extraGames"), id);
  checkRegionGames(id, subject, games, extraGames);
  const landmark = fields.get("landmark");
  if (!isRegionLandmark(landmark)) {
    throw new InvalidCurriculumFileError(
      `Region "${id}" needs a landmark, one of ${regionLandmarks.join(", ")}`,
    );
  }
  const holdsChecks = games.some(({ gameType }) => isCheckGameType(gameType));
  if (holdsChecks !== (landmark === "challenge-arena")) {
    throw new InvalidCurriculumFileError(
      `Region "${id}" needs the challenge-arena landmark if, and only if, it holds Checks`,
    );
  }
  return {
    islandId,
    id,
    name: readText(fields.get("name"), `The name of Region "${id}"`),
    subject,
    story: readText(fields.get("story"), `The story of Region "${id}"`),
    landmark,
    mapPosition: parseMapPosition(fields.get("mapPosition"), id),
    games,
    extraGames,
  };
};

const checkIslandRegions = (
  island: Island,
  islandRegions: readonly Region[],
  teachesSubject: TeachesSubject,
) => {
  const repeatedRegionId = findRepeat(islandRegions.map(({ id }) => id));
  if (repeatedRegionId !== undefined) {
    throw new InvalidCurriculumFileError(
      `Island "${island.id}" has two Regions called "${repeatedRegionId}"`,
    );
  }
  const challengeArenas = islandRegions.filter(
    ({ landmark }) => landmark === "challenge-arena",
  );
  const needsChallengeArena = challengeArenaYears.includes(island.yearGroup);
  if (
    challengeArenas.length !== (needsChallengeArena ? 1 : 0) ||
    challengeArenas.some(({ name }) => name !== challengeArenaName)
  ) {
    throw new InvalidCurriculumFileError(
      needsChallengeArena
        ? `Island "${island.id}" needs one Region called the ${challengeArenaName}, since Year ${String(island.yearGroup)} has a statutory check`
        : `Island "${island.id}" can't have a ${challengeArenaName}, since Year ${String(island.yearGroup)} has no statutory check`,
    );
  }
  const regionSubjects = new Set(islandRegions.map(({ subject }) => subject));
  const missingSubject = subjects.find(
    (subject) =>
      teachesSubject(island.yearGroup, subject) && !regionSubjects.has(subject),
  );
  if (missingSubject !== undefined) {
    throw new InvalidCurriculumFileError(
      `Island "${island.id}" needs a Region for ${missingSubject}, which Year ${String(island.yearGroup)} is taught`,
    );
  }
};

export const buildTeachesSubject =
  (knownSkills: readonly Skill[]): TeachesSubject =>
  (yearGroup, subject) =>
    knownSkills.some(
      (skill) => skill.yearGroup === yearGroup && skill.subject === subject,
    );

export const parseWorldMap = (
  worldMapContent: unknown,
  teachesSubject: TeachesSubject = buildTeachesSubject(skills),
): WorldMap => {
  const fields = readFields(worldMapContent, worldMapFields, "The World Map");
  const islandFiles = fields.get("islands");
  const regionFiles = fields.get("regions");
  if (!isNonEmptyList(islandFiles) || !isNonEmptyList(regionFiles)) {
    throw new InvalidCurriculumFileError(
      "The World Map needs at least one Island and one Region",
    );
  }
  const islands = islandFiles.map(parseIsland);
  if (findRepeat(islands.map(({ id }) => id)) !== undefined) {
    throw new InvalidCurriculumFileError("Two Islands have the same ID");
  }
  if (findRepeat(islands.map(({ yearGroup }) => yearGroup)) !== undefined) {
    throw new InvalidCurriculumFileError("Two Islands teach the same Year");
  }
  const islandIds = new Set(islands.map(({ id }) => id));
  const regions = regionFiles.map((regionFile) =>
    parseRegion(regionFile, islandIds),
  );
  for (const island of islands) {
    checkIslandRegions(
      island,
      regions.filter(({ islandId }) => islandId === island.id),
      teachesSubject,
    );
  }
  return {
    islands: islands.toSorted(
      (first, second) => first.yearGroup - second.yearGroup,
    ),
    regions,
  };
};

export const worldMap = parseWorldMap(worldMapFile);

export const isBigTop = ({ landmark }: Pick<Region, "landmark">): boolean =>
  landmark === "big-top";

export const isChallengeArena = ({
  landmark,
}: Pick<Region, "landmark">): boolean => landmark === "challenge-arena";

export const hasEveryGameOpen = (region: Pick<Region, "landmark">): boolean =>
  isBigTop(region) || isChallengeArena(region);

export const findRegionKey = ({
  islandId,
  id,
}: Pick<Region, "islandId" | "id">): string => `${islandId}/${id}`;

export const findGameKey = (
  region: Pick<Region, "islandId" | "id">,
  { id }: Pick<RegionGame, "id">,
): string => `${findRegionKey(region)}/${id}`;

export const listRegionGames = ({
  games,
  extraGames,
}: Pick<Region, "games" | "extraGames">): RegionGame[] => [
  ...games,
  ...extraGames,
];

export const findIsland = (
  islandId: string,
  { islands }: WorldMap = worldMap,
): Island | undefined => islands.find(({ id }) => id === islandId);

export const findHomeIsland = (
  yearGroup: YearGroup | null,
  { islands }: WorldMap = worldMap,
): Island => {
  const [firstIsland] = islands;
  return (
    islands.find((island) => island.yearGroup === yearGroup) ?? firstIsland
  );
};

export const listIslandRegions = (
  islandId: string,
  { regions }: WorldMap = worldMap,
): Region[] => regions.filter((region) => region.islandId === islandId);

export const findRegion = (
  islandId: string,
  regionId: string,
  { regions }: WorldMap = worldMap,
): Region | undefined =>
  regions.find(
    (region) => region.islandId === islandId && region.id === regionId,
  );

export interface GamePlace {
  islandId: string;
  regionId: string;
  gameId: string;
}
