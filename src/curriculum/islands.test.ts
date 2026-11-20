import { describe, expect, it } from "vitest";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import {
  bigTopName,
  islands,
  listSubjectsTaughtInYear,
  longestRegionName,
  parseIslands,
} from "./islands.js";
import { challengeArenaName, mapHalfDepth, mapHalfWidth } from "./world-map.js";

const theme = {
  id: "frost-isle",
  palette: { sky: "#a9d8ff", ground: "#e8f1f8", accent: "#5ec8f2" },
  music: { id: "frost-isle-chiptune", beatsPerMinute: 100, regionTunes: {} },
  modelSet: "low-poly-frost",
  companionStyle: "snowy-owl",
};

const yearThreeRegions = [
  ["oasis-pools", "Oasis Pools", "maths", "oasis-fountain"],
  ["scroll-bazaar", "Scroll Bazaar", "english", "scroll-bazaar"],
  ["mirage-prism", "Mirage Prism", "science", "mirage-prism"],
  ["drumbeat-dunes", "Drumbeat Dunes", "music", "dune-drums"],
  ["caravan-crossing", "Caravan Crossing", "geography", "caravan-signpost"],
  ["pyramid-steps", "Pyramid Steps", "history", "stepped-pyramid"],
  ["sandstorm-relay", "Sandstorm Relay", "computing", "relay-mast"],
  ["mosaic-courtyard", "Mosaic Courtyard", "art", "easel"],
  ["camel-gearworks", "Camel Gearworks", "design", "workshop"],
  ["echo-well", "Echo Well", "languages", "embassy"],
].map(([id, name, subject, landmark], index) => ({
  id,
  name,
  subject,
  landmark,
  mapPosition: { x: index * 3 - 9, z: 0 },
}));

const bigTop = {
  id: "brainwave-big-top",
  name: bigTopName,
  landmark: "big-top",
  mapPosition: { x: 0, z: 9 },
};

const yearThreeIsland = {
  id: "sunscorch-sands",
  name: "Sunscorch Sands",
  yearGroup: 3,
  sky: "desert-haze",
  theme: { ...theme, id: "sunscorch-sands" },
  regions: [...yearThreeRegions, bigTop],
};

const parseOne = (island: object) => parseIslands({ islands: [island] });

describe("islands", () => {
  it("holds Islands 2 to 6, one per Year Group, each with its own name and theme", () => {
    expect(islands.map(({ name, yearGroup }) => [yearGroup, name])).toEqual([
      [2, "Frost Isle"],
      [3, "Sunscorch Sands"],
      [4, "Jungle Reach"],
      [5, "Ember Isle"],
      [6, "Starfall Isle"],
    ]);
    const themeIds = new Set(islands.map(({ theme: { id } }) => id));
    const companions = new Set(
      islands.map(({ theme: { companionStyle } }) => companionStyle),
    );
    const music = new Set(islands.map(({ theme: { music } }) => music.id));
    const skies = new Set(islands.map(({ sky }) => sky));
    for (const distinct of [themeIds, companions, music, skies]) {
      expect(distinct.size).toBe(islands.length);
    }
  });

  it("gives every Island a Region for each Subject taught in its Year, and the Brainwave Big Top", () => {
    for (const { yearGroup, regions } of islands) {
      expect(
        regions
          .flatMap(({ subject }) => (subject === undefined ? [] : [subject]))
          .toSorted(),
      ).toEqual(listSubjectsTaughtInYear(yearGroup).toSorted());
      expect(regions.filter(({ name }) => name === bigTopName)).toHaveLength(1);
    }
  });

  it("teaches Languages from Year 3, the start of Key Stage 2, and Art and design and Design and technology in every Year", () => {
    expect(listSubjectsTaughtInYear(2)).not.toContain("languages");
    expect(listSubjectsTaughtInYear(3)).toContain("languages");
    for (const yearGroup of [1, 2, 3, 4, 5, 6] as const) {
      expect(listSubjectsTaughtInYear(yearGroup)).toEqual(
        expect.arrayContaining(["art", "design"]),
      );
    }
  });

  it("puts the Challenge Arena on Jungle Reach and Starfall Isle only, the Islands for Years 4 and 6", () => {
    expect(
      islands
        .filter(({ regions }) =>
          regions.some(({ name }) => name === challengeArenaName),
        )
        .map(({ name }) => name),
    ).toEqual(["Jungle Reach", "Starfall Isle"]);
  });

  it("puts Phonics only on Frost Isle, the Year 2 Island", () => {
    expect(
      islands
        .filter(({ regions }) =>
          regions.some(({ subject }) => subject === "phonics"),
        )
        .map(({ name }) => name),
    ).toEqual(["Frost Isle"]);
  });

  it("uses the Region names confirmed in the PRD, each short enough for a phone", () => {
    const frostIsle = islands[0];

    expect(frostIsle.regions.map(({ name }) => name)).toEqual([
      "Icicle Inlet",
      "Snowdrift Library",
      "Glacier Grotto",
      "Aurora Lab",
      "Chiming Icefall",
      "Polar Lookout",
      "Frozen Fort",
      "Snowbot Works",
      "Frost Gallery",
      "Sleigh Workshop",
      bigTopName,
    ]);
    for (const { regions } of islands) {
      for (const { name, mapPosition } of regions) {
        expect(name.length).toBeLessThanOrEqual(longestRegionName);
        expect(Math.abs(mapPosition.x)).toBeLessThanOrEqual(mapHalfWidth);
        expect(Math.abs(mapPosition.z)).toBeLessThanOrEqual(mapHalfDepth);
      }
    }
  });

  it("keeps Regions on one Island far enough apart to tap each one", () => {
    for (const { regions } of islands) {
      for (const [index, region] of regions.entries()) {
        for (const other of regions.slice(index + 1)) {
          expect(
            Math.hypot(
              region.mapPosition.x - other.mapPosition.x,
              region.mapPosition.z - other.mapPosition.z,
            ),
            `${region.id} and ${other.id}`,
          ).toBeGreaterThanOrEqual(7);
        }
      }
    }
  });
});

describe("parseIslands", () => {
  it("reads a well-formed Island", () => {
    expect(parseOne(yearThreeIsland)).toEqual([
      expect.objectContaining({ id: "sunscorch-sands", yearGroup: 3 }),
    ]);
  });

  it.each([
    [
      "a Region missing a Subject taught in the Year",
      { ...yearThreeIsland, regions: [...yearThreeRegions.slice(1), bigTop] },
      'Island "sunscorch-sands" needs a Region for maths, which is taught in Year 3',
    ],
    [
      "a Phonics Region on an Island for Year 3 or above",
      {
        ...yearThreeIsland,
        regions: [
          ...yearThreeIsland.regions,
          {
            ...bigTop,
            id: "sand-sounds",
            name: "Sand Sounds",
            subject: "phonics",
            landmark: "ice-grotto",
          },
        ],
      },
      'Island "sunscorch-sands" has a Region for phonics, which isn\'t taught in Year 3',
    ],
    [
      "two Regions for one Subject",
      {
        ...yearThreeIsland,
        regions: [
          ...yearThreeIsland.regions,
          { ...yearThreeRegions[0], id: "more-pools" },
        ],
      },
      'Island "sunscorch-sands" has two Regions for maths',
    ],
    [
      "an Island with no Brainwave Big Top",
      { ...yearThreeIsland, regions: yearThreeRegions },
      `Island "sunscorch-sands" needs one Region with no subject, the ${bigTopName}, with the big-top landmark`,
    ],
    [
      "a Big Top under another name",
      {
        ...yearThreeIsland,
        regions: [...yearThreeRegions, { ...bigTop, name: "Sandy Big Top" }],
      },
      `Island "sunscorch-sands" needs one Region with no subject, the ${bigTopName}, with the big-top landmark`,
    ],
    [
      "a Region name too long for a phone",
      {
        ...yearThreeIsland,
        regions: [
          { ...yearThreeRegions[0], name: "The Very Long Oasis Pools" },
          ...yearThreeRegions.slice(1),
          bigTop,
        ],
      },
      'Region "oasis-pools" needs a name of 20 characters or fewer, to fit on the map on a phone',
    ],
    [
      "a landmark Wizzaroo can't draw",
      {
        ...yearThreeIsland,
        regions: [
          { ...yearThreeRegions[0], landmark: "windmill" },
          ...yearThreeRegions.slice(1),
          bigTop,
        ],
      },
      'Region "oasis-pools" needs a landmark',
    ],
    [
      "a sky Wizzaroo can't draw",
      { ...yearThreeIsland, sky: "rainbow" },
      'Island "sunscorch-sands" needs a sky',
    ],
    [
      "a Year Group outside 1 to 6",
      { ...yearThreeIsland, yearGroup: 7 },
      'Island "sunscorch-sands" needs a Year Group from 1 to 6',
    ],
    [
      "a Region off the map",
      {
        ...yearThreeIsland,
        regions: [
          { ...yearThreeRegions[0], mapPosition: { x: 40, z: 0 } },
          ...yearThreeRegions.slice(1),
          bigTop,
        ],
      },
      'Region "oasis-pools" needs a map position',
    ],
  ])("rejects %s", (_, island, message) => {
    expect(() => parseOne(island)).toThrow(InvalidCurriculumFileError);
    expect(() => parseOne(island)).toThrow(message);
  });

  it("needs a Challenge Arena on a Year with a statutory check, and refuses one on any other Year", () => {
    const challengeArena = {
      id: "challenge-arena",
      name: challengeArenaName,
      landmark: "challenge-arena",
      mapPosition: { x: 9, z: 9 },
    };

    expect(() => parseOne({ ...yearThreeIsland, yearGroup: 4 })).toThrow(
      `needs one ${challengeArenaName}`,
    );
    expect(
      parseOne({
        ...yearThreeIsland,
        yearGroup: 4,
        regions: [...yearThreeRegions, bigTop, challengeArena],
      }),
    ).toHaveLength(1);
    expect(() =>
      parseOne({
        ...yearThreeIsland,
        regions: [...yearThreeRegions, bigTop, challengeArena],
      }),
    ).toThrow(`can't have a ${challengeArenaName}`);
    expect(() =>
      parseOne({
        ...yearThreeIsland,
        yearGroup: 4,
        regions: [
          ...yearThreeRegions,
          bigTop,
          { ...challengeArena, subject: "maths" },
        ],
      }),
    ).toThrow("needs no subject if, and only if");
  });

  it("rejects two Islands for one Year, and one landmark on two Islands", () => {
    expect(() =>
      parseIslands({
        islands: [yearThreeIsland, { ...yearThreeIsland, id: "dune-isle" }],
      }),
    ).toThrow("Two Islands are for Year 3");
    expect(() =>
      parseIslands({
        islands: [
          yearThreeIsland,
          { ...yearThreeIsland, id: "dune-isle", yearGroup: 5 },
        ],
      }),
    ).toThrow(
      'The landmark "oasis-fountain" is on two Islands, so they would look alike',
    );
  });
});
