import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  readFields,
} from "./curriculum-file.js";
import { subjects, type Subject } from "./skills.js";
import { isYearGroup, type YearGroup } from "./year-groups.js";
import {
  challengeArenaName,
  challengeArenaYears,
  parseMapPosition,
  parseRegionSubject,
  parseTheme,
  readKebabCaseId,
  readText,
  type MapPosition,
  type Theme,
} from "./world-map.js";
import islandsFile from "./islands.json" with { type: "json" };

export const islandSkies = [
  "aurora",
  "desert-haze",
  "rainforest-mist",
  "volcanic-smoke",
  "starlit-night",
] as const;

export type IslandSky = (typeof islandSkies)[number];

export const islandRegionLandmarks = [
  "big-top",
  "ice-harbour",
  "snow-library",
  "ice-grotto",
  "aurora-lab",
  "frozen-waterfall",
  "polar-lookout",
  "ice-fort",
  "snowbot-works",
  "oasis-fountain",
  "scroll-bazaar",
  "mirage-prism",
  "dune-drums",
  "caravan-signpost",
  "stepped-pyramid",
  "relay-mast",
  "monkey-falls",
  "storyvine-shrine",
  "orchid-glasshouse",
  "bamboo-drums",
  "stilt-mapworks",
  "overgrown-temple",
  "firefly-treehouse",
  "anvil-quarry",
  "inkfire-archive",
  "magma-crucible",
  "volcanic-forge",
  "obsidian-lookout",
  "iron-keep",
  "cinder-core",
  "constellation-court",
  "moonlit-scriptorium",
  "observatory",
  "nebula-hall",
  "standing-stones",
  "starfall-ruins",
  "signal-tower",
  "easel",
  "workshop",
  "embassy",
  "challenge-arena",
] as const;

export type IslandRegionLandmark = (typeof islandRegionLandmarks)[number];

export interface IslandRegion {
  id: string;
  name: string;
  subject: Subject | undefined;
  landmark: IslandRegionLandmark;
  mapPosition: MapPosition;
}

export interface Island {
  id: string;
  name: string;
  yearGroup: YearGroup;
  sky: IslandSky;
  theme: Theme;
  regions: IslandRegion[];
}

export const bigTopName = "Brainwave Big Top";
export const longestRegionName = 20;
const lastPhonicsYear = 2;
const firstLanguagesYear = 3;

const islandFields = ["id", "name", "yearGroup", "sky", "theme", "regions"];
const regionFields = ["id", "name", "subject", "landmark", "mapPosition"];

export const listSubjectsTaughtInYear = (yearGroup: YearGroup): Subject[] =>
  subjects.filter(
    (subject) =>
      (subject !== "phonics" || yearGroup <= lastPhonicsYear) &&
      (subject !== "languages" || yearGroup >= firstLanguagesYear),
  );

const isIslandSky = (value: unknown): value is IslandSky =>
  islandSkies.some((sky) => sky === value);

const isIslandRegionLandmark = (
  value: unknown,
): value is IslandRegionLandmark =>
  islandRegionLandmarks.some((landmark) => landmark === value);

const parseIslandRegion = (
  regionFile: unknown,
  islandId: string,
): IslandRegion => {
  const fields = readFields(
    regionFile,
    regionFields,
    `A Region on Island "${islandId}"`,
  );
  const id = readKebabCaseId(
    fields.get("id"),
    `A Region on Island "${islandId}"`,
  );
  const name = readText(fields.get("name"), `The name of Region "${id}"`);
  if (name.length > longestRegionName) {
    throw new InvalidCurriculumFileError(
      `Region "${id}" needs a name of ${String(longestRegionName)} characters or fewer, to fit on the map on a phone`,
    );
  }
  const landmark = fields.get("landmark");
  if (!isIslandRegionLandmark(landmark)) {
    throw new InvalidCurriculumFileError(
      `Region "${id}" needs a landmark, one of ${islandRegionLandmarks.join(", ")}`,
    );
  }
  return {
    id,
    name,
    subject: parseRegionSubject(fields.get("subject"), id),
    landmark,
    mapPosition: parseMapPosition(fields.get("mapPosition"), id),
  };
};

export const sharedSubjectLandmarks: readonly IslandRegionLandmark[] = [
  "easel",
  "workshop",
  "embassy",
];

const sharedLandmarks: readonly IslandRegionLandmark[] = [
  "big-top",
  "challenge-arena",
];

const assertRegionsWithoutSubject = (
  regions: readonly IslandRegion[],
  islandId: string,
  yearGroup: YearGroup,
) => {
  const misplaced = regions.find(
    ({ subject, landmark }) =>
      (subject === undefined) !== sharedLandmarks.includes(landmark),
  );
  if (misplaced !== undefined) {
    throw new InvalidCurriculumFileError(
      `Region "${misplaced.id}" on Island "${islandId}" needs no subject if, and only if, it is the ${bigTopName} or the ${challengeArenaName}`,
    );
  }
  const challengeArenas = regions.filter(
    ({ landmark }) => landmark === "challenge-arena",
  );
  const needsChallengeArena = challengeArenaYears.includes(yearGroup);
  if (
    challengeArenas.length !== (needsChallengeArena ? 1 : 0) ||
    challengeArenas.some(({ name }) => name !== challengeArenaName)
  ) {
    throw new InvalidCurriculumFileError(
      needsChallengeArena
        ? `Island "${islandId}" needs one ${challengeArenaName}, with the challenge-arena landmark, since Year ${String(yearGroup)} has a statutory check`
        : `Island "${islandId}" can't have a ${challengeArenaName}, since Year ${String(yearGroup)} has no statutory check`,
    );
  }
};

const assertBigTop = (regions: readonly IslandRegion[], islandId: string) => {
  const bigTops = regions.filter(({ landmark }) => landmark === "big-top");
  const [bigTop] = bigTops;
  if (bigTops.length !== 1 || bigTop.name !== bigTopName) {
    throw new InvalidCurriculumFileError(
      `Island "${islandId}" needs one Region with no subject, the ${bigTopName}, with the big-top landmark`,
    );
  }
};

const assertSubjectsOfYear = (
  regions: readonly IslandRegion[],
  islandId: string,
  yearGroup: YearGroup,
) => {
  const taught = listSubjectsTaughtInYear(yearGroup);
  const regionSubjects = regions.flatMap(({ subject }) =>
    subject === undefined ? [] : [subject],
  );
  const repeatedSubject = findRepeat(regionSubjects);
  if (repeatedSubject !== undefined) {
    throw new InvalidCurriculumFileError(
      `Island "${islandId}" has two Regions for ${repeatedSubject}`,
    );
  }
  const untaught = regionSubjects.find((subject) => !taught.includes(subject));
  if (untaught !== undefined) {
    throw new InvalidCurriculumFileError(
      `Island "${islandId}" has a Region for ${untaught}, which isn't taught in Year ${String(yearGroup)}`,
    );
  }
  const missing = taught.find((subject) => !regionSubjects.includes(subject));
  if (missing !== undefined) {
    throw new InvalidCurriculumFileError(
      `Island "${islandId}" needs a Region for ${missing}, which is taught in Year ${String(yearGroup)}`,
    );
  }
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
  const sky = fields.get("sky");
  if (!isIslandSky(sky)) {
    throw new InvalidCurriculumFileError(
      `Island "${id}" needs a sky, one of ${islandSkies.join(", ")}`,
    );
  }
  const regionFiles = fields.get("regions");
  if (!isNonEmptyList(regionFiles)) {
    throw new InvalidCurriculumFileError(`Island "${id}" needs Regions`);
  }
  const regions = regionFiles.map((regionFile) =>
    parseIslandRegion(regionFile, id),
  );
  const repeatedRegionId = findRepeat(regions.map((region) => region.id));
  if (repeatedRegionId !== undefined) {
    throw new InvalidCurriculumFileError(
      `Island "${id}" has two Regions with the ID "${repeatedRegionId}"`,
    );
  }
  assertRegionsWithoutSubject(regions, id, yearGroup);
  assertBigTop(regions, id);
  assertSubjectsOfYear(regions, id, yearGroup);
  return {
    id,
    name: readText(fields.get("name"), `The name of Island "${id}"`),
    yearGroup,
    sky,
    theme: parseTheme(fields.get("theme")),
    regions,
  };
};

export const parseIslands = (islandsContent: unknown): Island[] => {
  const fields = readFields(islandsContent, ["islands"], "The Islands file");
  const islandFiles = fields.get("islands");
  if (!isNonEmptyList(islandFiles)) {
    throw new InvalidCurriculumFileError("The Islands file needs Islands");
  }
  const parsed = islandFiles.map(parseIsland);
  const repeatedYear = findRepeat(parsed.map(({ yearGroup }) => yearGroup));
  if (repeatedYear !== undefined) {
    throw new InvalidCurriculumFileError(
      `Two Islands are for Year ${String(repeatedYear)}`,
    );
  }
  const repeatedLandmark = findRepeat(
    parsed.flatMap(({ regions }) =>
      regions
        .map(({ landmark }) => landmark)
        .filter(
          (landmark) =>
            !sharedLandmarks.includes(landmark) &&
            !sharedSubjectLandmarks.includes(landmark),
        ),
    ),
  );
  if (repeatedLandmark !== undefined) {
    throw new InvalidCurriculumFileError(
      `The landmark "${repeatedLandmark}" is on two Islands, so they would look alike`,
    );
  }
  return parsed;
};

export const islands = parseIslands(islandsFile);
