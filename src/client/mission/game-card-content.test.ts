import { describe, expect, it } from "vitest";
import { curriculumPoints } from "../../curriculum/curriculum-points.js";
import { skills } from "../../curriculum/skills.js";
import { worldMap } from "../../curriculum/world-map.js";
import { buildSkillGames, listSkillGames } from "./game-card-content.js";

describe("the Games that teach each Skill", () => {
  it("teaches every Curriculum Point in every Year with at least one Game on the World Map", () => {
    const pointsWithoutGames = curriculumPoints
      .filter(({ skillIds }) =>
        skillIds.every((skillId) => listSkillGames(skillId).length === 0),
      )
      .map(
        ({ subject, yearGroup, heading }) =>
          `${subject} Year ${String(yearGroup)}: ${heading}`,
      );

    expect(pointsWithoutGames).toEqual([]);
  });

  it("teaches every Skill with at least one Game on the World Map", () => {
    expect(
      skills
        .filter(({ id }) => listSkillGames(id).length === 0)
        .map(({ id }) => id),
    ).toEqual([]);
  });

  it("names each Game with its title, Region and Island", () => {
    const [bubbleBayGame] = listSkillGames("maths.number-bonds-10").filter(
      ({ key }) => key === "meadow-isle/bubble-bay/popping-bubbles",
    );

    expect(bubbleBayGame.title).not.toBe("");
    expect(bubbleBayGame.regionName).toBe("Bubble Bay");
    expect(bubbleBayGame.islandName).toBe("Meadow Isle");
  });

  it("counts Listen and pick as teaching every letter sound", () => {
    expect(
      listSkillGames("phonics.sound-m").map(({ regionName }) => regionName),
    ).toContain("Crystal Caves");
  });

  it("counts a Brainwave Big Top puzzle towards the Skill it plays", () => {
    const bigTopGames = [...buildSkillGames(worldMap).values()]
      .flat()
      .filter(({ regionName }) => regionName === "Brainwave Big Top");

    expect(bigTopGames.length).toBeGreaterThan(0);
  });
});
