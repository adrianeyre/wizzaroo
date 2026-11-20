import { describe, expect, it } from "vitest";
import { catalogue, findItem, type CharacterLoadout } from "./catalogue.js";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import { meadowIsleQuest } from "./island-quests/meadow-isle.js";
import { listHeldFindIds, type IslandQuest } from "./island-quests.js";
import {
  applyPlayRecords,
  buildStartingChildRewards,
  listQuestTrophies,
  findPurchaseProblem,
  mostOutfits,
  parseRewardRules,
  rewardRules,
  type ChildRewards,
  type FamilyRewards,
  type PlayRecord,
} from "./rewards.js";

const sparkleId = "sparkle";
const thunderpawsId = "thunderpaws";
const numberBonds = "maths.number-bonds-10";

const startFamily = (...childIds: string[]): FamilyRewards => ({
  children: childIds.map((childId) => buildStartingChildRewards(childId)),
  familyChestActivityCount: 0,
});

const welcomeBackItemIds = catalogue
  .filter(({ unlock }) => unlock.kind === "welcome-back")
  .map(({ id }) => id);

const findChild = (family: FamilyRewards, childId: string): ChildRewards => {
  const child = family.children.find(
    (candidate) => candidate.childId === childId,
  );
  if (child === undefined) {
    throw new Error(`the Family has no Child "${childId}"`);
  }
  return {
    ...child,
    heldItemIds: child.heldItemIds.filter(
      (itemId) => !welcomeBackItemIds.includes(itemId),
    ),
  };
};

const playActivity = (
  localDate: string,
  rightFirstTimeCount: number,
  childId = sparkleId,
  skillId = numberBonds,
): PlayRecord[] => [
  ...Array.from({ length: 5 }, (_, index): PlayRecord => ({
    kind: "question-answered",
    childId,
    skillId,
    localDate,
    isRightFirstTime: index < rightFirstTimeCount,
  })),
  { kind: "activity-finished", childId, skillId, localDate, secondsSpent: 60 },
];

const playMission = (
  localDate: string,
  rightFirstTimeCount: number,
  childId = sparkleId,
): PlayRecord[] =>
  [1, 2, 3].flatMap(() =>
    playActivity(localDate, rightFirstTimeCount, childId),
  );

const buyItem = (
  itemId: string,
  localDate = "2026-11-20",
  childId = sparkleId,
  giftForChildId: string | null = null,
): PlayRecord => ({
  kind: "item-bought",
  childId,
  itemId,
  localDate,
  giftForChildId,
});

const masterNumberBonds = (childId = sparkleId): PlayRecord[] => [
  ...playMission("2026-11-01", 5, childId),
  ...playMission("2026-11-02", 5, childId),
  ...playMission("2026-11-03", 5, childId),
];

const findStars = (playRecords: PlayRecord[], childId = sparkleId) =>
  findChild(
    applyPlayRecords(startFamily(sparkleId, thunderpawsId), playRecords),
    childId,
  ).stars;

const getStarCost = (itemId: string): number => {
  const starCost = findItem(itemId)?.starCost;
  if (starCost === undefined || starCost === null) {
    throw new Error(`Item "${itemId}" can't be bought`);
  }
  return starCost;
};

describe("parseRewardRules", () => {
  it("reads the launch values from the data file", () => {
    expect(rewardRules).toEqual({
      starsPerActivityFinished: 3,
      masteryBonusStars: 20,
      familyChestActivities: 30,
      starsPerGameUnlock: 10,
      starsPerQuest: 50,
    });
  });

  it("refuses reward rules that are missing a value, or have one that isn't a whole number of Stars", () => {
    expect(() =>
      parseRewardRules({ starsPerActivityFinished: 3, masteryBonusStars: 20 }),
    ).toThrow(InvalidCurriculumFileError);
    expect(() =>
      parseRewardRules({ ...rewardRules, masteryBonusStars: 2.5 }),
    ).toThrow(InvalidCurriculumFileError);
    expect(() => parseRewardRules({ ...rewardRules, streakBonus: 5 })).toThrow(
      InvalidCurriculumFileError,
    );
  });
});

describe("Stars", () => {
  it("earns 9 Stars for a Mission of 3 Activities, whether or not the answers were right", () => {
    expect(findStars(playMission("2026-11-01", 5))).toBe(9);
    expect(findStars(playMission("2026-11-01", 0))).toBe(9);
  });

  it("adds 20 Stars once when a Skill becomes Mastered, and never again after a Review brings it back", () => {
    const mastered = masterNumberBonds();
    const afterReviews = [
      ...mastered,
      ...playMission("2026-11-10", 1),
      ...playMission("2026-11-11", 5),
    ];

    expect(findStars(mastered)).toBe(3 * 9 + 20);
    expect(findStars(afterReviews)).toBe(5 * 9 + 20);
  });

  it("earns nothing for an Activity on a Mastered Skill until it is Due for review, then earns for each Review", () => {
    const mastered = masterNumberBonds();

    expect(findStars([...mastered, ...playMission("2026-11-05", 5)])).toBe(
      findStars(mastered),
    );
    expect(findStars([...mastered, ...playMission("2026-11-10", 5)])).toBe(
      findStars(mastered) + 9,
    );
  });

  it("always gives the same balance when the same events are replayed, even when they arrive in two parts", () => {
    const playRecords = [
      ...masterNumberBonds(),
      buyItem("hat-wizard-blue"),
      ...playMission("2026-11-21", 2),
      buyItem("hat-pirate", "2026-11-21"),
    ];
    const family = startFamily(sparkleId, thunderpawsId);

    const replays = [1, 2, 3].map(() => applyPlayRecords(family, playRecords));
    const inTwoParts = applyPlayRecords(
      applyPlayRecords(family, playRecords.slice(0, 20)),
      playRecords.slice(20),
    );

    expect(replays[1]).toEqual(replays[0]);
    expect(replays[2]).toEqual(replays[0]);
    expect(inTwoParts).toEqual(replays[0]);
    expect(findChild(replays[0], sparkleId).stars).toBe(
      4 * 9 + 20 - getStarCost("hat-wizard-blue") - getStarCost("hat-pirate"),
    );
  });

  it("keeps each Child's Stars their own", () => {
    expect(findStars(playMission("2026-11-01", 5), thunderpawsId)).toBe(0);
  });

  it("adds the Stars the Admin gives to that Child's balance alone, without unlocking any Game", () => {
    const awarded: PlayRecord = {
      kind: "stars-awarded",
      childId: sparkleId,
      stars: 50,
    };
    const family = startFamily(sparkleId, thunderpawsId);

    const afterAward = applyPlayRecords(family, [
      ...playMission("2026-11-01", 5),
      awarded,
    ]);

    expect(findChild(afterAward, sparkleId).stars).toBe(9 + 50);
    expect(findChild(afterAward, thunderpawsId).stars).toBe(0);
    expect(findChild(afterAward, sparkleId).regionProgress).toEqual(
      findChild(
        applyPlayRecords(family, playMission("2026-11-01", 5)),
        sparkleId,
      ).regionProgress,
    );
  });

  it("lets a Child spend the Stars the Admin gave them", () => {
    expect(
      findStars([
        { kind: "stars-awarded", childId: sparkleId, stars: 20 },
        buyItem("hat-wizard-blue"),
      ]),
    ).toBe(20 - getStarCost("hat-wizard-blue"));
  });
});

describe("buying Items", () => {
  it("prices Items by rarity: common 15, uncommon 30, rare 60", () => {
    expect(getStarCost("hat-wizard-blue")).toBe(15);
    expect(getStarCost("hat-pirate")).toBe(30);
    expect(getStarCost("hat-dragon-horns")).toBe(60);
  });

  it("honours both purchases when two Family Devices overspend offline, keeping both Items and stopping the balance at zero", () => {
    const earned = [
      ...playMission("2026-11-01", 5),
      ...playMission("2026-11-02", 5),
    ];
    const fromKitchenTablet = buyItem("hat-wizard-blue");
    const fromLaptop = buyItem("outfit-stars");

    const family = applyPlayRecords(startFamily(sparkleId), [
      ...earned,
      fromKitchenTablet,
      fromLaptop,
    ]);

    expect(findChild(family, sparkleId)).toMatchObject({
      stars: 0,
      heldItemIds: ["hat-wizard-blue", "outfit-stars"],
    });
    expect(
      findStars([
        ...earned,
        fromKitchenTablet,
        fromLaptop,
        ...playMission("2026-11-03", 0),
      ]),
    ).toBe(9);
  });

  it("won't sell a Skill-tied Item until its Skill is Mastered", () => {
    const plenty = [
      ...playMission("2026-10-01", 0),
      ...playMission("2026-10-02", 0),
      ...playMission("2026-10-03", 0),
      ...playMission("2026-10-04", 0),
      ...playMission("2026-10-05", 0),
      ...playMission("2026-10-06", 0),
      ...playMission("2026-10-07", 0),
    ];

    const tooSoon = applyPlayRecords(startFamily(sparkleId), [
      ...plenty,
      buyItem("hat-number-bonds", "2026-10-07"),
    ]);
    const onceMastered = applyPlayRecords(startFamily(sparkleId), [
      ...plenty,
      ...masterNumberBonds(),
      buyItem("hat-number-bonds", "2026-11-03"),
    ]);

    expect(findChild(tooSoon, sparkleId)).toMatchObject({
      stars: 7 * 9,
      heldItemIds: [],
    });
    expect(findChild(onceMastered, sparkleId).heldItemIds).toContain(
      "hat-number-bonds",
    );
  });

  it("sells a seasonal Item only in its season, and again every year", () => {
    const earned = masterNumberBonds();

    const heldAfterBuying = (localDate: string) =>
      findChild(
        applyPlayRecords(startFamily(sparkleId), [
          ...earned,
          buyItem("hat-snowflake", localDate),
        ]),
        sparkleId,
      ).heldItemIds;

    expect(heldAfterBuying("2026-11-30")).toEqual([]);
    expect(heldAfterBuying("2026-12-01")).toEqual(["hat-snowflake"]);
    expect(heldAfterBuying("2029-12-24")).toEqual(["hat-snowflake"]);
  });

  it("never sells the same Item twice, or an Item that only comes from the Family Chest or a welcome-back gift", () => {
    const family = applyPlayRecords(startFamily(sparkleId), [
      ...masterNumberBonds(),
      buyItem("hat-wizard-blue"),
      buyItem("hat-wizard-blue"),
      buyItem("hat-treasure-crown"),
      buyItem("eyes-winking"),
      buyItem("hat-red-cap"),
      buyItem("not-in-the-catalogue"),
    ]);

    expect(findChild(family, sparkleId)).toMatchObject({
      stars: 3 * 9 + 20 - getStarCost("hat-wizard-blue"),
      heldItemIds: ["hat-wizard-blue"],
    });
  });
});

describe("dressing the Character", () => {
  it("saves the loadout, keeping only Items the Child holds, each in its own slot", () => {
    const family = applyPlayRecords(startFamily(sparkleId), [
      ...playMission("2026-11-01", 5),
      ...playMission("2026-11-02", 5),
      buyItem("hat-wizard-blue"),
      {
        kind: "character-dressed",
        childId: sparkleId,
        loadout: {
          hat: "hat-wizard-blue",
          bodyColour: "body-berry-pink",
          outfit: "outfit-astronaut",
          wand: "hat-pirate",
        },
      },
    ]);

    expect(findChild(family, sparkleId).loadout).toEqual({
      hat: "hat-wizard-blue",
      bodyColour: "body-berry-pink",
    });
  });
});

describe("furnishing the Room", () => {
  it("starts every Child with an empty choice, so each place shows its free starter", () => {
    expect(buildStartingChildRewards(sparkleId).room).toEqual({});
  });

  it("saves the Furniture the Child chose, keeping only Items they hold, each in its own place", () => {
    const family = applyPlayRecords(startFamily(sparkleId), [
      ...playMission("2026-11-01", 5),
      ...playMission("2026-11-02", 5),
      buyItem("rug-star"),
      {
        kind: "room-furnished",
        childId: sparkleId,
        room: {
          bed: "bed-bunk",
          rug: "rug-star",
          lamp: "lamp-star",
          plant: "bed-wooden",
        },
      },
    ]);

    expect(findChild(family, sparkleId).room).toEqual({
      bed: "bed-bunk",
      rug: "rug-star",
    });
  });

  it("dresses a Character with a Pet, Mount, Emote and Spell Effect only once the Child holds them", () => {
    const showingOff: PlayRecord = {
      kind: "character-dressed",
      childId: sparkleId,
      loadout: {
        pet: "pet-cat",
        mount: "mount-broomstick",
        emote: "emote-wave",
        spellEffect: "spell-effect-sparkles",
      },
    };
    const family = applyPlayRecords(startFamily(sparkleId), [
      ...playMission("2026-11-01", 5),
      ...playMission("2026-11-02", 5),
      buyItem("pet-cat"),
      buyItem("emote-wave"),
      showingOff,
    ]);

    expect(findChild(family, sparkleId).loadout).toEqual({
      pet: "pet-cat",
      emote: "emote-wave",
    });
  });
});

describe("saved outfits", () => {
  const saveOutfit = (
    outfitId: string,
    name: string,
    loadout: CharacterLoadout,
  ): PlayRecord => ({
    kind: "outfit-saved",
    childId: sparkleId,
    outfitId,
    name,
    loadout,
  });

  const wearOutfit = (outfitId: string): PlayRecord => ({
    kind: "outfit-worn",
    childId: sparkleId,
    outfitId,
  });

  it("saves the Items the Child is wearing under a name, and puts them all back on in one go", () => {
    const family = applyPlayRecords(startFamily(sparkleId), [
      saveOutfit("outfit-1", " Wizard day ", {
        hat: "hat-pointy-purple",
        wand: "wand-star",
        bodyColour: "body-berry-pink",
      }),
      {
        kind: "character-dressed",
        childId: sparkleId,
        loadout: { hat: "hat-red-cap", bodyColour: "body-berry-pink" },
      },
      wearOutfit("outfit-1"),
    ]);

    const sparkle = findChild(family, sparkleId);
    expect(sparkle.outfits).toEqual([
      {
        id: "outfit-1",
        name: "Wizard day",
        loadout: { hat: "hat-pointy-purple", wand: "wand-star" },
      },
    ]);
    expect(sparkle.loadout).toEqual({
      bodyColour: "body-berry-pink",
      hat: "hat-pointy-purple",
      wand: "wand-star",
    });
  });

  it("skips a slot whose Item the Child no longer holds, keeping what they wear there now", () => {
    const family = applyPlayRecords(startFamily(sparkleId), [
      saveOutfit("outfit-1", "Space", {
        outfit: "outfit-astronaut",
        wand: "wand-star",
      }),
      {
        kind: "character-dressed",
        childId: sparkleId,
        loadout: { wand: "wand-twig", hat: "hat-red-cap" },
      },
      wearOutfit("outfit-1"),
    ]);

    expect(findChild(family, sparkleId).loadout).toEqual({
      wand: "wand-star",
    });
  });

  it("replaces an outfit saved again under its own id, and keeps no more than the most outfits allowed", () => {
    const family = applyPlayRecords(startFamily(sparkleId), [
      ...Array.from({ length: mostOutfits + 1 }, (_, index) =>
        saveOutfit(`outfit-${String(index)}`, `Look ${String(index)}`, {
          hat: "hat-red-cap",
        }),
      ),
      saveOutfit("outfit-0", "Look 0", { hat: "hat-pointy-purple" }),
    ]);

    const { outfits } = findChild(family, sparkleId);
    expect(outfits).toHaveLength(mostOutfits);
    expect(outfits[0]).toEqual({
      id: "outfit-0",
      name: "Look 0",
      loadout: { hat: "hat-pointy-purple" },
    });
    expect(outfits.map(({ id }) => id)).not.toContain(
      `outfit-${String(mostOutfits)}`,
    );
  });

  it("ignores wearing an outfit that was never saved", () => {
    const family = applyPlayRecords(startFamily(sparkleId), [
      {
        kind: "character-dressed",
        childId: sparkleId,
        loadout: { hat: "hat-red-cap" },
      },
      wearOutfit("never-saved"),
    ]);

    expect(findChild(family, sparkleId).loadout).toEqual({
      hat: "hat-red-cap",
    });
  });
});

describe("the Family Chest", () => {
  it("fills after 30 Activities between the Children, then gives each of them their own Item and starts again", () => {
    const tenMissionsBetweenThem = [
      ...[1, 2, 3, 4, 5, 6, 7].flatMap(() =>
        playMission("2026-11-01", 5, sparkleId),
      ),
      ...[1, 2, 3].flatMap(() => playMission("2026-11-01", 1, thunderpawsId)),
    ];
    const family = startFamily(sparkleId, thunderpawsId);

    const nearlyFull = applyPlayRecords(
      family,
      tenMissionsBetweenThem.slice(0, -1),
    );
    const full = applyPlayRecords(family, [
      ...tenMissionsBetweenThem,
      ...playActivity("2026-11-01", 5, thunderpawsId),
    ]);

    expect(nearlyFull.familyChestActivityCount).toBe(29);
    expect(findChild(nearlyFull, sparkleId).heldItemIds).toEqual([]);
    expect(full.familyChestActivityCount).toBe(1);
    expect(findChild(full, sparkleId).heldItemIds).toEqual([
      "hat-treasure-crown",
    ]);
    expect(findChild(full, thunderpawsId).heldItemIds).toEqual([
      "hat-treasure-crown",
    ]);
  });

  it("counts each gold coin the Admin adds as one finished Activity, opening the chest once for every 30 and keeping the rest", () => {
    const family = startFamily(sparkleId, thunderpawsId);

    const topUp = applyPlayRecords(family, [
      ...playActivity("2026-11-01", 5),
      { kind: "family-chest-coins-awarded", coins: 28 },
    ]);
    const filledTwice = applyPlayRecords(family, [
      ...playActivity("2026-11-01", 5),
      { kind: "family-chest-coins-awarded", coins: 64 },
    ]);

    expect(topUp.familyChestActivityCount).toBe(29);
    expect(findChild(topUp, sparkleId).heldItemIds).toEqual([]);
    expect(filledTwice.familyChestActivityCount).toBe(5);
    expect(findChild(filledTwice, sparkleId).heldItemIds).toHaveLength(2);
    expect(findChild(filledTwice, thunderpawsId).heldItemIds).toHaveLength(2);
    expect(findChild(filledTwice, sparkleId).heldItemIds[0]).toBe(
      "hat-treasure-crown",
    );
  });
});

describe("Gifts", () => {
  const earned = [
    ...playMission("2026-11-01", 5),
    ...playMission("2026-11-02", 5),
  ];

  it("gives a Gift to the sibling it was bought for, and never to the Child who bought it", () => {
    const family = applyPlayRecords(startFamily(sparkleId, thunderpawsId), [
      ...earned,
      buyItem("hat-gift-bow", "2026-11-02", sparkleId, thunderpawsId),
    ]);

    expect(findChild(family, sparkleId)).toMatchObject({
      stars: 18 - getStarCost("hat-gift-bow"),
      heldItemIds: [],
    });
    expect(findChild(family, thunderpawsId).heldItemIds).toEqual([
      "hat-gift-bow",
    ]);
  });

  it("won't let a Child keep a Gift by buying it for themselves, or for anyone outside the Family", () => {
    const family = applyPlayRecords(startFamily(sparkleId, thunderpawsId), [
      ...earned,
      buyItem("hat-gift-bow", "2026-11-02", sparkleId, sparkleId),
      buyItem("hat-gift-bow", "2026-11-02", sparkleId),
      buyItem("hat-gift-bow", "2026-11-02", sparkleId, "a-stranger"),
    ]);

    expect(findChild(family, sparkleId)).toMatchObject({
      stars: 18,
      heldItemIds: [],
    });
    expect(findChild(family, thunderpawsId).heldItemIds).toEqual([]);
  });

  it("never moves Stars between Children, and only sells a Gift as a Gift", () => {
    const family = applyPlayRecords(startFamily(sparkleId, thunderpawsId), [
      ...earned,
      buyItem("hat-wizard-blue", "2026-11-02", sparkleId, thunderpawsId),
    ]);

    expect(findChild(family, sparkleId).stars).toBe(18);
    expect(findChild(family, thunderpawsId)).toMatchObject({
      stars: 0,
      heldItemIds: [],
    });
  });
});

describe("the welcome-back gift", () => {
  const playOn = (localDates: string[]) => {
    const family = applyPlayRecords(
      startFamily(sparkleId),
      localDates.flatMap((localDate) => playActivity(localDate, 3)),
    );
    return family.children[0];
  };

  it("gives a gift the first time a Child plays on each new day after their first", () => {
    expect(playOn(["2026-11-01"]).heldItemIds).toEqual([]);
    expect(playOn(["2026-11-01", "2026-11-01"]).heldItemIds).toEqual([]);
    expect(playOn(["2026-11-01", "2026-11-02"]).heldItemIds).toEqual(
      welcomeBackItemIds.slice(0, 1),
    );
  });

  it("never counts consecutive days, so a Child who misses days gets exactly what one who plays every day gets", () => {
    const everyDay = playOn(["2026-11-01", "2026-11-02", "2026-11-03"]);
    const withGaps = playOn(["2026-11-01", "2026-11-09", "2026-12-25"]);

    expect(withGaps.heldItemIds).toEqual(everyDay.heldItemIds);
    expect(withGaps.stars).toBe(everyDay.stars);
    expect(everyDay.heldItemIds).toEqual(welcomeBackItemIds.slice(0, 2));
  });

  it("takes nothing away for missing a day", () => {
    const beforeTheGap = playOn(["2026-11-01", "2026-11-02"]);
    const afterTheGap = playOn(["2026-11-01", "2026-11-02", "2026-11-30"]);

    expect(afterTheGap.heldItemIds).toEqual(
      expect.arrayContaining(beforeTheGap.heldItemIds),
    );
    expect(afterTheGap.stars).toBeGreaterThan(beforeTheGap.stars);
  });
});

describe("findPurchaseProblem", () => {
  const buyer = buildStartingChildRewards(sparkleId);
  const sibling = buildStartingChildRewards(thunderpawsId);

  const findProblem = (
    itemId: string,
    recipient?: ChildRewards,
    localDate = "2026-11-20",
  ) => {
    const item = findItem(itemId);
    if (item === undefined) {
      throw new Error(`the Catalogue has no Item "${itemId}"`);
    }
    return findPurchaseProblem({ buyer, recipient, item, localDate });
  };

  it("says why an Item can't be bought, so the wardrobe can show it", () => {
    expect(findProblem("hat-wizard-blue")).toBeUndefined();
    expect(findProblem("hat-red-cap")).toBe("not-for-sale");
    expect(findProblem("hat-number-bonds")).toBe("skill-not-mastered");
    expect(findProblem("hat-pumpkin")).toBe("out-of-season");
    expect(findProblem("hat-pumpkin", undefined, "2026-10-31")).toBeUndefined();
    expect(findProblem("hat-gift-bow")).toBe("gift-only");
    expect(findProblem("hat-gift-bow", buyer)).toBe("gifts-are-for-siblings");
    expect(findProblem("hat-gift-bow", sibling)).toBeUndefined();
    expect(
      findProblem("hat-gift-bow", {
        ...sibling,
        heldItemIds: ["hat-gift-bow"],
      }),
    ).toBe("already-held");
  });
});

describe("replaying in parts (pen test F4, ADR 0055)", () => {
  // The server keeps what a Family's replay worked out and replays only what is new on top of it, so the result must
  // be the same wherever the history is cut, whatever order the device's dates come in.
  const otherSkill = "maths.add-and-subtract-within-20";
  const history: PlayRecord[] = [
    ...playMission("2026-11-20", 5),
    ...playActivity("2026-11-03", 2),
    ...playMission("2026-11-10", 5, thunderpawsId),
    { kind: "stars-awarded", childId: thunderpawsId, stars: 40 },
    ...playActivity("2026-10-01", 5, sparkleId, otherSkill),
    ...playMission("2026-11-27", 5),
    { kind: "family-chest-coins-awarded", coins: 3 },
    buyItem("hat-wizard-blue", "2026-11-28"),
    ...playActivity("2026-09-15", 1, sparkleId, otherSkill),
    ...playMission("2026-12-04", 4),
    ...playActivity("2026-11-20", 0),
  ];

  it("works out the same rewards, practice days and Mastery Stars wherever the history is cut in two", () => {
    const whole = applyPlayRecords(
      startFamily(sparkleId, thunderpawsId),
      history,
    );

    for (let cut = 0; cut <= history.length; cut += 1) {
      const firstPart = applyPlayRecords(
        startFamily(sparkleId, thunderpawsId),
        history.slice(0, cut),
      );
      expect(
        applyPlayRecords(firstPart, history.slice(cut)),
        `cut after ${String(cut)} records`,
      ).toEqual(whole);
    }
  });

  it("keeps each Skill's days in date order, one per date, however the dates arrive", () => {
    const { practiceDays } = findChild(
      applyPlayRecords(startFamily(sparkleId), history),
      sparkleId,
    );

    expect(
      practiceDays.map(({ skillId, localDate }) => `${skillId} ${localDate}`),
    ).toEqual([
      `${otherSkill} 2026-09-15`,
      `${otherSkill} 2026-10-01`,
      `${numberBonds} 2026-11-03`,
      `${numberBonds} 2026-11-20`,
      `${numberBonds} 2026-11-27`,
      `${numberBonds} 2026-12-04`,
    ]);
    expect(
      practiceDays.find(({ localDate }) => localDate === "2026-11-20"),
    ).toMatchObject({ questionCount: 20, rightFirstTimeCount: 15 });
  });
});

const meadow = "meadow-isle";

/** Every record a Child would make solving a Quest from start to end, in an order that works. */
const playWholeQuest = (
  quest: IslandQuest,
  childId = sparkleId,
): PlayRecord[] => {
  const pickedUpFindIds = [...quest.lyingFindIds];
  const solvedPuzzleIds: string[] = [];
  const records: PlayRecord[] = quest.lyingFindIds.map((findId) => ({
    kind: "quest-find-picked-up",
    childId,
    islandId: quest.islandId,
    findId,
  }));
  while (solvedPuzzleIds.length < quest.puzzles.length) {
    const held = listHeldFindIds(quest, { pickedUpFindIds, solvedPuzzleIds });
    const next = quest.puzzles.find(
      ({ id, needs }) => !solvedPuzzleIds.includes(id) && held.includes(needs),
    );
    if (next === undefined) {
      throw new Error(`${quest.islandId} can't be finished`);
    }
    solvedPuzzleIds.push(next.id);
    records.push({
      kind: "quest-puzzle-solved",
      childId,
      islandId: quest.islandId,
      puzzleId: next.id,
    });
  }
  return records;
};

describe("the Island Quest", () => {
  it("keeps the Finds a Child picks up and the Puzzles they solve, on their own Island", () => {
    const family = applyPlayRecords(startFamily(sparkleId, thunderpawsId), [
      {
        kind: "quest-find-picked-up",
        childId: sparkleId,
        islandId: meadow,
        findId: "meadow-isle.rusty-key",
      },
      {
        kind: "quest-puzzle-solved",
        childId: sparkleId,
        islandId: meadow,
        puzzleId: "meadow-isle.open-the-shed",
      },
    ]);
    expect(findChild(family, sparkleId).questProgress).toEqual([
      {
        islandId: meadow,
        pickedUpFindIds: ["meadow-isle.rusty-key"],
        solvedPuzzleIds: ["meadow-isle.open-the-shed"],
      },
    ]);
    expect(findChild(family, thunderpawsId).questProgress).toEqual([]);
  });

  it("solves a Puzzle only when the Child holds the Find it needs, and only once", () => {
    const family = applyPlayRecords(startFamily(sparkleId), [
      {
        kind: "quest-puzzle-solved",
        childId: sparkleId,
        islandId: meadow,
        puzzleId: "meadow-isle.open-the-shed",
      },
      {
        kind: "quest-find-picked-up",
        childId: sparkleId,
        islandId: meadow,
        findId: "meadow-isle.police-whistle",
      },
      {
        kind: "quest-find-picked-up",
        childId: sparkleId,
        islandId: meadow,
        findId: "meadow-isle.rusty-key",
      },
      {
        kind: "quest-find-picked-up",
        childId: sparkleId,
        islandId: "frost-isle",
        findId: "meadow-isle.empty-bucket",
      },
      ...Array.from({ length: 2 }, (): PlayRecord => ({
        kind: "quest-puzzle-solved",
        childId: sparkleId,
        islandId: meadow,
        puzzleId: "meadow-isle.open-the-shed",
      })),
    ]);
    expect(findChild(family, sparkleId).questProgress).toEqual([
      {
        islandId: meadow,
        pickedUpFindIds: ["meadow-isle.rusty-key"],
        solvedPuzzleIds: ["meadow-isle.open-the-shed"],
      },
    ]);
  });

  it("gives the Quest's Stars and its Trophy once all thirty Puzzles are solved, and never again", () => {
    const records = playWholeQuest(meadowIsleQuest);
    const almost = applyPlayRecords(
      startFamily(sparkleId),
      records.slice(0, -1),
    );
    expect(findChild(almost, sparkleId).stars).toBe(0);
    expect(listQuestTrophies(findChild(almost, sparkleId))).toEqual([]);

    const finished = applyPlayRecords(almost, [
      ...records.slice(-1),
      ...records,
    ]);
    expect(findChild(finished, sparkleId).stars).toBe(
      rewardRules.starsPerQuest,
    );
    expect(listQuestTrophies(findChild(finished, sparkleId))).toEqual([
      { islandId: meadow, trophyName: meadowIsleQuest.trophyName },
    ]);
  });
});
