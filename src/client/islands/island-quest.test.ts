import { describe, expect, it } from "vitest";
import {
  findShapes,
  islanderHats,
  islanderHelds,
  islanderOutfits,
  islandQuests,
  questThingShapes,
  type QuestProgress,
} from "../../curriculum/island-quests.js";
import { meadowIsleQuest } from "../../curriculum/island-quests/meadow-isle.js";
import { findExploreAdventure, findWalkSurface } from "./island-adventures.js";
import {
  addQuestPlay,
  findFindState,
  findIslanderTalk,
  findThingLook,
  listFindsInReach,
  listLyingFinds,
  listQuestBlockers,
  listQuestInteractions,
  shuffleChoices,
  tryFindOn,
} from "./island-quest.js";
import {
  checkQuestSite,
  findQuestSites,
  listWantedQuestSpots,
} from "./island-quest-placing.js";
import { questSites } from "./island-quest-sites.js";
import { buildFindGeometry } from "./quest-find-models.js";
import { buildIslanderGeometry } from "./quest-islander-models.js";
import { buildThingGeometry } from "./quest-thing-models.js";
import { buildExploreWorld } from "./island-transport.js";

const countTriangles = (geometry: {
  getAttribute: (name: string) => { count: number };
}) => geometry.getAttribute("position").count / 3;

const mostFindTriangles = 1400;
const mostThingTriangles = 2600;
const mostIslanderTriangles = 2400;

const meadow = meadowIsleQuest.islandId;

const startProgress = (
  play: Omit<QuestProgress, "islandId"> = {
    pickedUpFindIds: [],
    solvedPuzzleIds: [],
  },
): QuestProgress => ({ islandId: meadow, ...play });

describe("the Quest's models", () => {
  it("models every shape of Find small enough to show many at once", () => {
    for (const shape of findShapes) {
      const geometry = buildFindGeometry({
        shape,
        colour: "#ef4444",
        trim: "#facc15",
      });
      expect(countTriangles(geometry), shape).toBeGreaterThan(0);
      expect(countTriangles(geometry), shape).toBeLessThanOrEqual(
        mostFindTriangles,
      );
      geometry.computeBoundingBox();
      const size = geometry.boundingBox;
      expect(size?.max.y, shape).toBeLessThanOrEqual(1.2);
      expect(size?.min.y, shape).toBeGreaterThanOrEqual(-0.2);
    }
  });

  it("models every shape of thing, as found and once solved", () => {
    for (const shape of questThingShapes) {
      for (const isSolved of [false, true]) {
        const geometry = buildThingGeometry(
          { shape, colour: "#8b5a2b", trim: "#facc15" },
          isSolved,
        );
        expect(countTriangles(geometry), shape).toBeGreaterThan(0);
        expect(countTriangles(geometry), shape).toBeLessThanOrEqual(
          mostThingTriangles,
        );
      }
    }
  });

  it("models an Islander in every hat, outfit and with everything they might hold", () => {
    const [islander] = meadowIsleQuest.islanders;
    for (const hat of islanderHats) {
      for (const outfit of islanderOutfits) {
        const held = islanderHelds[(hat.length + outfit.length) % 16];
        const geometry = buildIslanderGeometry({
          ...islander.look,
          hat,
          outfit,
          held,
        });
        expect(
          countTriangles(geometry),
          `${hat} ${outfit}`,
        ).toBeLessThanOrEqual(mostIslanderTriangles);
      }
    }
    for (const held of islanderHelds) {
      expect(
        countTriangles(buildIslanderGeometry({ ...islander.look, held })),
      ).toBeGreaterThan(0);
    }
  });
});

describe.each(islandQuests.map((quest) => [quest.islandId, quest] as const))(
  "the Quest's spots on %s",
  (islandId, quest) => {
    const adventure = findExploreAdventure(islandId);
    const sites = questSites[islandId] ?? [];

    it("has a spot for every thing, Islander and Find lying about, on dry ground", () => {
      expect(sites.map(({ id }) => id).toSorted()).toEqual(
        listWantedQuestSpots(quest)
          .map(({ id }) => id)
          .toSorted(),
      );
      const world = buildExploreWorld(adventure);
      for (const site of sites) {
        expect(
          findWalkSurface(world, site.centre, Infinity).kind,
          site.id,
        ).not.toMatch(/water|lava|shallows/);
      }
    });

    it("keeps every spot where it still fits, and the placer still finds the same ones", () => {
      sites.forEach((site, index) => {
        expect(
          checkQuestSite(adventure, site, sites.slice(0, index)),
          site.id,
        ).toBeUndefined();
      });
      const found = findQuestSites(adventure, quest);
      expect(found.map(({ id }) => id)).toEqual(sites.map(({ id }) => id));
      found.forEach((site, index) => {
        expect(site.centre.x).toBeCloseTo(sites[index].centre.x, 1);
        expect(site.centre.z).toBeCloseTo(sites[index].centre.z, 1);
      });
    }, 60_000);

    it("lets the Character talk to every Islander and look at every thing, and keeps them from walking through", () => {
      const interactions = listQuestInteractions(islandId);
      expect(
        interactions.filter(({ kind }) => kind === "islander"),
      ).toHaveLength(quest.islanders.length);
      expect(
        interactions.filter(({ kind }) => kind === "quest-thing"),
      ).toHaveLength(quest.things.length);
      expect(listQuestBlockers(islandId)).toHaveLength(
        quest.islanders.length + quest.things.length,
      );
    });
  },
);

describe("picking up Finds", () => {
  it("lists the Finds still lying about, and those the Character stands beside", () => {
    expect(listLyingFinds(meadow, startProgress())).toHaveLength(10);
    const picked = startProgress({
      pickedUpFindIds: ["meadow-isle.rusty-key"],
      solvedPuzzleIds: [],
    });
    expect(listLyingFinds(meadow, picked)).toHaveLength(9);
    const key = (questSites[meadow] ?? []).find(
      ({ id }) => id === "meadow-isle.empty-bucket",
    );
    expect(
      listFindsInReach(meadow, picked, {
        x: (key?.centre.x ?? 0) + 0.5,
        z: key?.centre.z ?? 0,
      }).map(({ id }) => id),
    ).toEqual(["meadow-isle.empty-bucket"]);
  });

  it("adds what the Child did since the server last replayed their play", () => {
    expect(
      addQuestPlay(
        startProgress({
          pickedUpFindIds: ["meadow-isle.rusty-key"],
          solvedPuzzleIds: [],
        }),
        {
          pickedUpFindIds: ["meadow-isle.rusty-key", "meadow-isle.spanner"],
          solvedPuzzleIds: ["meadow-isle.open-the-shed"],
        },
      ),
    ).toEqual({
      islandId: meadow,
      pickedUpFindIds: ["meadow-isle.rusty-key", "meadow-isle.spanner"],
      solvedPuzzleIds: ["meadow-isle.open-the-shed"],
    });
  });
});

describe("using Finds", () => {
  const find = (id: string) => {
    const found = meadowIsleQuest.finds.find(
      (candidate) => candidate.id === id,
    );
    if (found === undefined) {
      throw new Error(id);
    }
    return found;
  };
  const withKey = startProgress({
    pickedUpFindIds: ["meadow-isle.rusty-key", "meadow-isle.spanner"],
    solvedPuzzleIds: [],
  });

  it("solves a Puzzle with the right Find, and says why the wrong one does nothing", () => {
    expect(
      tryFindOn(
        meadowIsleQuest,
        withKey,
        { kind: "thing", id: "meadow-isle.garden-shed" },
        "Garden Shed",
        find("meadow-isle.rusty-key"),
      ),
    ).toMatchObject({
      kind: "solved",
      puzzle: { id: "meadow-isle.open-the-shed" },
    });
    expect(
      tryFindOn(
        meadowIsleQuest,
        withKey,
        { kind: "thing", id: "meadow-isle.garden-shed" },
        "Garden Shed",
        find("meadow-isle.spanner"),
      ),
    ).toMatchObject({ kind: "no-use" });
    expect(
      tryFindOn(
        meadowIsleQuest,
        withKey,
        { kind: "islander", id: "meadow-isle.officer-patel" },
        "Officer Patel",
        find("meadow-isle.spanner"),
      ),
    ).toEqual({
      kind: "no-use",
      message:
        '"Thank you, but I don\'t need the Spanner," says Officer Patel. "Keep looking!"',
    });
  });

  it("asks the question before a finishing Puzzle is solved", () => {
    const withTicket = startProgress({
      pickedUpFindIds: ["meadow-isle.rusty-key"],
      solvedPuzzleIds: [
        "meadow-isle.open-the-shed",
        "meadow-isle.whistle-for-officer-patel",
      ],
    });
    expect(
      tryFindOn(
        meadowIsleQuest,
        withTicket,
        { kind: "thing", id: "meadow-isle.fairground-gate" },
        "Fairground Gate",
        find("meadow-isle.fair-ticket"),
      ),
    ).toMatchObject({
      kind: "asks-a-question",
      puzzle: { id: "meadow-isle.open-the-fair-gate" },
    });
    expect(
      findFindState(meadowIsleQuest, withTicket, "meadow-isle.rusty-key"),
    ).toBe("used");
    expect(
      findFindState(meadowIsleQuest, withTicket, "meadow-isle.fair-ticket"),
    ).toBe("held");
    expect(
      findFindState(meadowIsleQuest, withTicket, "meadow-isle.big-brass-key"),
    ).toBe("not-found");
  });

  it("keeps every question's right answer among its choices, not always first", () => {
    const rightPlaces = new Set<number>();
    for (const quest of islandQuests) {
      for (const puzzle of quest.puzzles) {
        if (puzzle.question === undefined) {
          continue;
        }
        const choices = shuffleChoices(puzzle);
        expect(choices.map(({ text }) => text).toSorted()).toEqual(
          [...puzzle.question.choices].toSorted(),
        );
        const right = choices.findIndex(({ isRight }) => isRight);
        expect(choices[right].text).toBe(
          puzzle.question.choices[puzzle.question.answer],
        );
        rightPlaces.add(right);
      }
    }
    expect(rightPlaces).toEqual(new Set([0, 1, 2]));
  });
});

describe("talking to Islanders", () => {
  it("asks for help, gives hints for the Puzzles they know, and thanks the Child once it's all done", () => {
    const talk = findIslanderTalk(
      meadowIsleQuest,
      startProgress(),
      "meadow-isle.officer-patel",
    );
    expect(talk?.says).toContain("I've lost my whistle");
    expect(talk?.hints).toHaveLength(3);
    const done = findIslanderTalk(
      meadowIsleQuest,
      startProgress({
        pickedUpFindIds: [],
        solvedPuzzleIds: meadowIsleQuest.puzzles.map(({ id }) => id),
      }),
      "meadow-isle.officer-patel",
    );
    expect(done?.says).toBe(meadowIsleQuest.islanders[0].thanks);
    expect(done?.hints).toEqual([]);
  });

  it("describes a thing as found and once its Puzzle is solved", () => {
    expect(
      findThingLook(
        meadowIsleQuest,
        startProgress(),
        "meadow-isle.garden-shed",
      ),
    ).toMatchObject({
      isSolved: false,
      says: "The shed door is locked tight. Something shiny glints through the window.",
    });
    expect(
      findThingLook(
        meadowIsleQuest,
        startProgress({
          pickedUpFindIds: ["meadow-isle.rusty-key"],
          solvedPuzzleIds: ["meadow-isle.open-the-shed"],
        }),
        "meadow-isle.garden-shed",
      ),
    ).toMatchObject({ isSolved: true });
  });
});
