import { describe, expect, it } from "vitest";
import { findCurriculumPointLocation } from "../../curriculum/curriculum-point-location.js";
import { curriculumPoints } from "../../curriculum/curriculum-points.js";
import { listRegionGames, worldMap } from "../../curriculum/world-map.js";
import {
  findGameCurriculum,
  nationalCurriculumUrl,
} from "./game-curriculum.js";

const everyGamePlace = worldMap.regions.flatMap((region) =>
  listRegionGames(region).map((game) => ({
    islandId: region.islandId,
    regionId: region.id,
    gameId: game.id,
  })),
);

const findPoint = (subject: string, yearGroup: number, id: string) => {
  const point = curriculumPoints.find(
    (candidate) =>
      candidate.subject === subject &&
      candidate.yearGroup === yearGroup &&
      candidate.id === id,
  );
  if (point === undefined) {
    throw new Error(`no point ${subject} ${String(yearGroup)} ${id}`);
  }
  return point;
};

describe("what each Game practises in the National Curriculum", () => {
  it("names at least one Curriculum Point, with the Skill it plays, for every Game in every Region on every Island", () => {
    const gamesWithoutPoints = everyGamePlace.filter((place) => {
      const gameCurriculum = findGameCurriculum(place);
      return (
        gameCurriculum === undefined ||
        gameCurriculum.points.length === 0 ||
        gameCurriculum.points.some(({ skillNames }) => skillNames.length === 0)
      );
    });

    expect(gamesWithoutPoints).toEqual([]);
  });

  it("links every point to its programme of study on gov.uk", () => {
    const links = new Set(
      everyGamePlace.flatMap(
        (place) =>
          findGameCurriculum(place)?.points.map(
            ({ programmeOfStudyUrl }) => programmeOfStudyUrl,
          ) ?? [],
      ),
    );

    expect(
      [...links].every((link) =>
        link.startsWith(
          "https://www.gov.uk/government/publications/national-curriculum-in-england-",
        ),
      ),
    ).toBe(true);
    expect(nationalCurriculumUrl).toBe(
      "https://www.gov.uk/government/collections/national-curriculum",
    );
  });

  it("tells a Bubble Bay maths Game's Year, Key Stage and statutory heading", () => {
    const gameCurriculum = findGameCurriculum({
      islandId: "meadow-isle",
      regionId: "bubble-bay",
      gameId: "popping-bubbles",
    });

    expect(gameCurriculum).toMatchObject({
      title: "Pop the bubbles",
      regionName: "Bubble Bay",
      islandName: "Meadow Isle",
      yearGroup: 1,
    });
    expect(gameCurriculum?.points[0]).toMatchObject({
      subjectName: "Maths",
      programmeOfStudy: "Mathematics programmes of study: key stages 1 and 2",
      keyStage: "Key Stage 1",
      programmePart: "Year 1 programme of study",
      statutoryHeading: "Number: addition and subtraction",
      skillNames: ["Number bonds to 10"],
    });
  });

  it("is undefined for a place that isn't a Game on the World Map", () => {
    expect(
      findGameCurriculum({
        islandId: "nowhere",
        regionId: "nowhere",
        gameId: "nothing",
      }),
    ).toBeUndefined();
  });
});

describe("where a Curriculum Point sits in the programme of study", () => {
  it("names phonics by the English heading it is taught under", () => {
    expect(
      findCurriculumPointLocation(
        findPoint("phonics", 1, "grapheme-phoneme-correspondences"),
      ),
    ).toEqual({
      programmeOfStudy: "English programmes of study: key stages 1 and 2",
      keyStage: "Key Stage 1",
      programmePart: "Year 1 programme of study",
      statutoryHeading: "Reading: word reading",
    });
    expect(
      findCurriculumPointLocation(findPoint("phonics", 2, "homophones"))
        .statutoryHeading,
    ).toBe("Writing: transcription (spelling)");
  });

  it("groups English in Years 3 and 4, and in Years 5 and 6, as the programme of study does", () => {
    expect(
      findCurriculumPointLocation(findPoint("english", 4, "spelling")),
    ).toMatchObject({
      keyStage: "Key Stage 2",
      programmePart: "Lower key stage 2: Years 3 and 4 programme of study",
    });
  });

  it("places a Key Stage programme in the Year whose Games teach it", () => {
    expect(
      findCurriculumPointLocation(findPoint("music", 4, "performing")),
    ).toEqual({
      programmeOfStudy: "Music programmes of study: key stages 1 and 2",
      keyStage: "Key Stage 2",
      programmePart:
        "Key Stage 2 programme of study (subject content), taught here in Year 4",
      statutoryHeading: "Performing",
    });
  });

  it("names every point with a programme of study and a statutory heading", () => {
    expect(
      curriculumPoints
        .map(findCurriculumPointLocation)
        .filter(
          ({ programmeOfStudy, statutoryHeading }) =>
            programmeOfStudy === "" || statutoryHeading === "",
        ),
    ).toEqual([]);
  });
});
