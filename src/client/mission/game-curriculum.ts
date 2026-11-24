import {
  findCurriculumPointLocation,
  type CurriculumPointLocation,
} from "../../curriculum/curriculum-point-location.js";
import {
  curriculumPoints,
  type CurriculumPoint,
} from "../../curriculum/curriculum-points.js";
import { nationalCurriculumUrl } from "../../curriculum/national-curriculum.js";
import {
  skills,
  subjectNames,
  type YearGroup,
} from "../../curriculum/skills.js";
import {
  findIsland,
  findRegion,
  listRegionGames,
  type GamePlace,
} from "../../curriculum/world-map.js";
import { findGameCardContent, listCardSkillIds } from "./game-card-content.js";

export { nationalCurriculumUrl };

export interface GameCurriculumPoint extends CurriculumPointLocation {
  key: string;
  subjectName: string;
  yearGroup: YearGroup;
  heading: string;
  summary: string;
  programmeOfStudyUrl: string;
  /** The Skills this Game plays that teach the point, by the names the Parent page uses. */
  skillNames: string[];
}

/** What a Game on the World Map practises, told for a Parent. */
export interface GameCurriculum {
  title: string;
  islandName: string;
  regionName: string;
  yearGroup: YearGroup;
  points: GameCurriculumPoint[];
}

const findSkillName = (skillId: string): string =>
  skills.find(({ id }) => id === skillId)?.name ?? skillId;

const describePoint = (
  point: CurriculumPoint,
  playedSkillIds: ReadonlySet<string>,
): GameCurriculumPoint => ({
  ...findCurriculumPointLocation(point),
  key: `${point.subject}/${String(point.yearGroup)}/${point.id}`,
  subjectName: subjectNames[point.subject],
  yearGroup: point.yearGroup,
  heading: point.heading,
  summary: point.summary,
  programmeOfStudyUrl: point.programmeOfStudyUrl,
  skillNames: point.skillIds
    .filter((skillId) => playedSkillIds.has(skillId))
    .map(findSkillName),
});

/**
 * The Curriculum Points a Game practises, found through the same Skills the
 * World Map's Game card and the Parent page's progress report use, so the
 * three always agree. Undefined for a place that isn't a Game on the map.
 */
export const findGameCurriculum = ({
  islandId,
  regionId,
  gameId,
}: GamePlace): GameCurriculum | undefined => {
  const island = findIsland(islandId);
  const region = findRegion(islandId, regionId);
  const game =
    region === undefined
      ? undefined
      : listRegionGames(region).find(({ id }) => id === gameId);
  if (island === undefined || region === undefined || game === undefined) {
    return undefined;
  }
  const cardContent = findGameCardContent(game, island.yearGroup);
  const playedSkillIds = new Set(
    listCardSkillIds(game, island.yearGroup, cardContent),
  );
  return {
    title: cardContent?.title ?? game.id,
    islandName: island.name,
    regionName: region.name,
    yearGroup: island.yearGroup,
    points: curriculumPoints
      .filter(({ skillIds }) =>
        skillIds.some((skillId) => playedSkillIds.has(skillId)),
      )
      .map((point) => describePoint(point, playedSkillIds)),
  };
};
