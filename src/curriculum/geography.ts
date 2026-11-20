import { yearGroups, type YearGroup } from "./year-groups.js";
import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  readFields,
} from "./curriculum-file.js";

export const geographyScenes = [
  "globe-spinner",
  "uk-explorer",
  "compass-island",
  "weather-window",
  "landscape-lookout",
  "map-key",
  "grid-hunt",
  "biome-dome",
  "river-valley",
  "volcano-cutaway",
  "settlement-board",
  "resource-dock",
  "data-towers",
  "region-tour",
] as const;

export type GeographyScene = (typeof geographyScenes)[number];

export const isGeographyScene = (value: unknown): value is GeographyScene =>
  geographyScenes.some((scene) => scene === value);

export const geographyStrands = [
  "locational-knowledge",
  "place-knowledge",
  "human-and-physical-geography",
  "geographical-skills-and-fieldwork",
] as const;

export type GeographyStrand = (typeof geographyStrands)[number];

export const continents = [
  "africa",
  "antarctica",
  "asia",
  "europe",
  "north-america",
  "oceania",
  "south-america",
] as const;

export const oceans = [
  "arctic-ocean",
  "atlantic-ocean",
  "indian-ocean",
  "pacific-ocean",
  "southern-ocean",
] as const;

export const globeLines = [
  "equator",
  "prime-meridian",
  "tropic-of-cancer",
  "tropic-of-capricorn",
  "arctic-circle",
  "antarctic-circle",
] as const;

export const hemispheres = [
  "northern-hemisphere",
  "southern-hemisphere",
  "eastern-hemisphere",
  "western-hemisphere",
] as const;

export const globeHighlights = [
  ...continents,
  ...oceans,
  ...globeLines,
  ...hemispheres,
] as const;

export type Continent = (typeof continents)[number];
export type Ocean = (typeof oceans)[number];
export type GlobeLine = (typeof globeLines)[number];
export type Hemisphere = (typeof hemispheres)[number];
export type GlobeHighlight = (typeof globeHighlights)[number];

export const ukNations = [
  "england",
  "scotland",
  "wales",
  "northern-ireland",
] as const;

export const ukSeas = [
  "north-sea",
  "irish-sea",
  "english-channel",
  "atlantic-ocean",
] as const;

export const ukHighlights = [...ukNations, ...ukSeas] as const;

export type UkNation = (typeof ukNations)[number];
export type UkSea = (typeof ukSeas)[number];
export type UkHighlight = (typeof ukHighlights)[number];

export const compassDirections = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const;

export type CompassDirection = (typeof compassDirections)[number];

export const compassLandmarks = [
  "lighthouse",
  "castle",
  "windmill",
  "palm-tree",
  "cave",
  "volcano",
  "bridge",
  "treasure-chest",
] as const;

export type CompassLandmark = (typeof compassLandmarks)[number];

export const compassPointCounts = [4, 8] as const;
export type CompassPointCount = (typeof compassPointCounts)[number];

export const distances = ["near", "far"] as const;
export type Distance = (typeof distances)[number];

export const weatherKinds = [
  "sunny",
  "cloudy",
  "rainy",
  "snowy",
  "windy",
  "foggy",
  "stormy",
  "rainbow",
] as const;

export type WeatherKind = (typeof weatherKinds)[number];

export const seasons = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof seasons)[number];

export const physicalFeatures = [
  "beach",
  "cliff",
  "forest",
  "hill",
  "mountain",
  "river",
  "sea",
  "valley",
  "lake",
  "island",
  "waterfall",
] as const;

export const humanFeatures = [
  "house",
  "farm",
  "factory",
  "office",
  "shop",
  "school",
  "church",
  "port",
  "harbour",
  "lighthouse",
] as const;

export const coastalLandforms = [
  "headland",
  "bay",
  "sea-cave",
  "sea-arch",
  "sea-stack",
  "sea-stump",
] as const;

export const landscapeFeatures = [
  ...physicalFeatures,
  ...humanFeatures,
  ...coastalLandforms,
] as const;

export type LandscapeFeature = (typeof landscapeFeatures)[number];

export const mapSymbols = [
  "house",
  "tree",
  "road",
  "river",
  "pond",
  "bridge",
  "field",
  "playground",
  "school",
  "church-with-tower",
  "church-with-spire",
  "post-office",
  "parking",
  "railway-station",
  "campsite",
  "caravan-site",
  "picnic-site",
  "viewpoint",
  "information-centre",
  "telephone",
  "coniferous-wood",
  "deciduous-wood",
  "motorway",
  "footpath",
  "railway-line",
  "contour-lines",
  "spot-height",
  "trig-point",
  "lighthouse",
  "windmill",
  "golf-course",
] as const;

export type MapSymbol = (typeof mapSymbols)[number];

export const gridStyles = ["letters", "four-figure", "six-figure"] as const;
export type GridStyle = (typeof gridStyles)[number];

export const biomes = [
  "desert",
  "rainforest",
  "polar",
  "savanna",
  "temperate-forest",
  "taiga",
  "grassland",
  "tundra",
  "mountain",
  "coral-reef",
] as const;

export type Biome = (typeof biomes)[number];

export const riverFeatures = [
  "source",
  "tributary",
  "confluence",
  "waterfall",
  "meander",
  "ox-bow-lake",
  "floodplain",
  "mouth",
  "estuary",
  "delta",
] as const;

export const waterCycleStages = [
  "evaporation",
  "condensation",
  "precipitation",
  "collection",
  "transpiration",
  "infiltration",
] as const;

export const valleyMarkers = [...riverFeatures, ...waterCycleStages] as const;

export type RiverFeature = (typeof riverFeatures)[number];
export type WaterCycleStage = (typeof waterCycleStages)[number];
export type ValleyMarker = (typeof valleyMarkers)[number];

export const volcanoParts = [
  "crater",
  "main-vent",
  "side-vent",
  "magma-chamber",
  "lava-flow",
  "ash-cloud",
] as const;

export const earthLayers = [
  "crust",
  "mantle",
  "outer-core",
  "inner-core",
] as const;

export const earthquakeParts = [
  "epicentre",
  "focus",
  "fault-line",
  "seismic-waves",
  "tectonic-plates",
] as const;

export const cutawayParts = [
  ...volcanoParts,
  ...earthLayers,
  ...earthquakeParts,
] as const;

export type VolcanoPart = (typeof volcanoParts)[number];
export type EarthLayer = (typeof earthLayers)[number];
export type EarthquakePart = (typeof earthquakeParts)[number];
export type CutawayPart = (typeof cutawayParts)[number];

export const settlementSizes = [
  "isolated-dwelling",
  "hamlet",
  "village",
  "town",
  "city",
] as const;

export const landUses = [
  "residential",
  "commercial",
  "industrial",
  "agricultural",
  "recreational",
  "transport",
] as const;

export const urbanZones = [
  "central-business-district",
  "inner-city",
  "suburbs",
  "rural-urban-fringe",
] as const;

export const settlementTiles = [
  ...settlementSizes,
  ...landUses,
  ...urbanZones,
] as const;

export type SettlementSize = (typeof settlementSizes)[number];
export type LandUse = (typeof landUses)[number];
export type UrbanZone = (typeof urbanZones)[number];
export type SettlementTile = (typeof settlementTiles)[number];

export const resources = [
  "oil",
  "coal",
  "natural-gas",
  "uranium",
  "wind",
  "solar",
  "hydro",
  "geothermal",
  "timber",
  "wheat",
  "rice",
  "cocoa",
  "coffee",
  "bananas",
  "tea",
  "cotton",
  "fish",
  "fresh-water",
  "gold",
  "iron-ore",
  "copper",
] as const;

export type Resource = (typeof resources)[number];

export const tourRegions = [
  "lake-district",
  "swiss-alps",
  "amazon-rainforest",
] as const;

export type TourRegion = (typeof tourRegions)[number];

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface DataBar {
  label: string;
  value: number;
}

export type GeographyShow =
  | {
      scene: "globe-spinner";
      highlight?: GlobeHighlight;
      pin?: GeoPoint;
      sunLongitude?: number;
    }
  | { scene: "uk-explorer"; highlight?: UkHighlight; pin?: GeoPoint }
  | {
      scene: "compass-island";
      target: CompassLandmark;
      direction: CompassDirection;
      points: CompassPointCount;
      distance?: Distance;
    }
  | { scene: "weather-window"; weather?: WeatherKind; season?: Season }
  | { scene: "landscape-lookout"; feature: LandscapeFeature }
  | { scene: "map-key"; symbol: MapSymbol }
  | { scene: "grid-hunt"; style: GridStyle; x: number; y: number }
  | { scene: "biome-dome"; biome: Biome }
  | { scene: "river-valley"; marker: ValleyMarker }
  | { scene: "volcano-cutaway"; part: CutawayPart }
  | { scene: "settlement-board"; tile: SettlementTile }
  | { scene: "resource-dock"; resource: Resource }
  | {
      scene: "data-towers";
      title: string;
      unit?: string;
      bars: DataBar[];
    }
  | { scene: "region-tour"; region?: TourRegion };

export type GeographyShowOf<Type extends GeographyScene> = Extract<
  GeographyShow,
  { scene: Type }
>;

export interface GeographyQuestion {
  ask: string;
  show: GeographyShow;
  answer: string;
  wrongAnswers: string[];
}

export interface GeographyGame {
  skillId: string;
  title: string;
  skillName: string;
  yearGroup: YearGroup;
  strand: GeographyStrand;
  scene: GeographyScene;
  instruction: string;
  questions: GeographyQuestion[];
}

export const fewestQuestionsPerGame = 10;
export const fewestWrongAnswers = 3;
const fewestBars = 2;
const mostBars = 6;
const largestLatitude = 90;
const largestLongitude = 180;
const gridSquaresAcross = 6;
const gridLetters = "ABCDEF";

const yearFileFields = ["yearGroup", "games"];
const gameFields = [
  "skillId",
  "title",
  "skillName",
  "strand",
  "scene",
  "instruction",
  "questions",
];
const questionFields = ["ask", "show", "answer", "wrongAnswers"];
const geographySkillIdShape = /^geography\.[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isOneOf = <Value extends string | number>(
  values: readonly Value[],
  value: unknown,
): value is Value => values.some((candidate) => candidate === value);

const readText = (value: unknown, describedAs: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidCurriculumFileError(`${describedAs} can't be empty`);
  }
  return value;
};

const readOneOf = <Value extends string | number>(
  values: readonly Value[],
  value: unknown,
  describedAs: string,
): Value => {
  if (!isOneOf(values, value)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} must be one of ${values.join(", ")}`,
    );
  }
  return value;
};

const readOptionalOneOf = <Value extends string | number>(
  values: readonly Value[],
  value: unknown,
  describedAs: string,
): Value | undefined =>
  value === undefined ? undefined : readOneOf(values, value, describedAs);

const readNumberWithin = (
  value: unknown,
  smallest: number,
  largest: number,
  describedAs: string,
): number => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < smallest ||
    value > largest
  ) {
    throw new InvalidCurriculumFileError(
      `${describedAs} must be a number from ${String(smallest)} to ${String(largest)}`,
    );
  }
  return value;
};

const parseGeoPoint = (value: unknown, describedAs: string): GeoPoint => {
  const fields = readFields(value, ["latitude", "longitude"], describedAs);
  return {
    latitude: readNumberWithin(
      fields.get("latitude"),
      -largestLatitude,
      largestLatitude,
      `The latitude of ${describedAs}`,
    ),
    longitude: readNumberWithin(
      fields.get("longitude"),
      -largestLongitude,
      largestLongitude,
      `The longitude of ${describedAs}`,
    ),
  };
};

const parseOptionalGeoPoint = (
  value: unknown,
  describedAs: string,
): GeoPoint | undefined =>
  value === undefined ? undefined : parseGeoPoint(value, describedAs);

const includeWhenPresent = <Key extends string, Value>(
  key: Key,
  value: Value | undefined,
): Partial<Record<Key, Value>> => {
  const included: Partial<Record<Key, Value>> = {};
  if (value !== undefined) {
    included[key] = value;
  }
  return included;
};

const parseDataBar = (value: unknown, describedAs: string): DataBar => {
  const fields = readFields(value, ["label", "value"], describedAs);
  return {
    label: readText(fields.get("label"), `The label of ${describedAs}`),
    value: readNumberWithin(
      fields.get("value"),
      0,
      Number.MAX_SAFE_INTEGER,
      `The value of ${describedAs}`,
    ),
  };
};

const isWholeTenth = (value: number) =>
  Math.abs(Math.round(value * 10) - value * 10) < 1e-9;

const parseGridShow = (
  fields: Map<string, unknown>,
  describedAs: string,
): GeographyShowOf<"grid-hunt"> => {
  const style = readOneOf(
    gridStyles,
    fields.get("style"),
    `${describedAs}'s style`,
  );
  const largest = style === "letters" ? gridSquaresAcross - 1 : 99;
  const x = readNumberWithin(fields.get("x"), 0, largest, `${describedAs}'s x`);
  const y = readNumberWithin(
    fields.get("y"),
    style === "letters" ? 1 : 0,
    style === "letters" ? gridSquaresAcross : 99,
    `${describedAs}'s y`,
  );
  const isShapedForStyle =
    style === "six-figure"
      ? isWholeTenth(x) && isWholeTenth(y)
      : Number.isInteger(x) && Number.isInteger(y);
  if (!isShapedForStyle) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs ${style === "six-figure" ? "x and y in tenths, like 23.4" : "whole-number x and y"} for a ${style} grid`,
    );
  }
  return { scene: "grid-hunt", style, x, y };
};

const showFieldsByScene: Record<GeographyScene, readonly string[]> = {
  "globe-spinner": ["highlight", "pin", "sunLongitude"],
  "uk-explorer": ["highlight", "pin"],
  "compass-island": ["target", "direction", "points", "distance"],
  "weather-window": ["weather", "season"],
  "landscape-lookout": ["feature"],
  "map-key": ["symbol"],
  "grid-hunt": ["style", "x", "y"],
  "biome-dome": ["biome"],
  "river-valley": ["marker"],
  "volcano-cutaway": ["part"],
  "settlement-board": ["tile"],
  "resource-dock": ["resource"],
  "data-towers": ["title", "unit", "bars"],
  "region-tour": ["region"],
};

const readOptionalNumberWithin = (
  value: unknown,
  smallest: number,
  largest: number,
  describedAs: string,
): number | undefined =>
  value === undefined
    ? undefined
    : readNumberWithin(value, smallest, largest, describedAs);

const assertSomethingShown = (
  shownValues: readonly unknown[],
  describedAs: string,
  whatToShow: string,
) => {
  if (shownValues.every((value) => value === undefined)) {
    throw new InvalidCurriculumFileError(`${describedAs} needs ${whatToShow}`);
  }
};

const parseGlobeShow = (
  fields: Map<string, unknown>,
  describedAs: string,
): GeographyShowOf<"globe-spinner"> => {
  const highlight = readOptionalOneOf(
    globeHighlights,
    fields.get("highlight"),
    `${describedAs}'s highlight`,
  );
  const pin = parseOptionalGeoPoint(fields.get("pin"), `${describedAs}'s pin`);
  const sunLongitude = readOptionalNumberWithin(
    fields.get("sunLongitude"),
    -largestLongitude,
    largestLongitude,
    `${describedAs}'s sunLongitude`,
  );
  assertSomethingShown(
    [highlight, pin],
    describedAs,
    "a highlight or a pin to show on the globe",
  );
  return {
    scene: "globe-spinner",
    ...includeWhenPresent("highlight", highlight),
    ...includeWhenPresent("pin", pin),
    ...includeWhenPresent("sunLongitude", sunLongitude),
  };
};

const parseUkShow = (
  fields: Map<string, unknown>,
  describedAs: string,
): GeographyShowOf<"uk-explorer"> => {
  const highlight = readOptionalOneOf(
    ukHighlights,
    fields.get("highlight"),
    `${describedAs}'s highlight`,
  );
  const pin = parseOptionalGeoPoint(fields.get("pin"), `${describedAs}'s pin`);
  assertSomethingShown(
    [highlight, pin],
    describedAs,
    "a highlight or a pin to show on the UK map",
  );
  return {
    scene: "uk-explorer",
    ...includeWhenPresent("highlight", highlight),
    ...includeWhenPresent("pin", pin),
  };
};

const parseCompassShow = (
  fields: Map<string, unknown>,
  describedAs: string,
): GeographyShowOf<"compass-island"> => {
  const points = readOneOf(
    compassPointCounts,
    fields.get("points"),
    `${describedAs}'s points`,
  );
  const direction = readOneOf(
    compassDirections,
    fields.get("direction"),
    `${describedAs}'s direction`,
  );
  if (points === 4 && direction.includes("-")) {
    throw new InvalidCurriculumFileError(
      `${describedAs} uses ${direction} on a four-point compass`,
    );
  }
  return {
    scene: "compass-island",
    target: readOneOf(
      compassLandmarks,
      fields.get("target"),
      `${describedAs}'s target`,
    ),
    direction,
    points,
    ...includeWhenPresent(
      "distance",
      readOptionalOneOf(
        distances,
        fields.get("distance"),
        `${describedAs}'s distance`,
      ),
    ),
  };
};

const parseWeatherShow = (
  fields: Map<string, unknown>,
  describedAs: string,
): GeographyShowOf<"weather-window"> => {
  const weather = readOptionalOneOf(
    weatherKinds,
    fields.get("weather"),
    `${describedAs}'s weather`,
  );
  const season = readOptionalOneOf(
    seasons,
    fields.get("season"),
    `${describedAs}'s season`,
  );
  assertSomethingShown(
    [weather, season],
    describedAs,
    "a weather or a season to show",
  );
  return {
    scene: "weather-window",
    ...includeWhenPresent("weather", weather),
    ...includeWhenPresent("season", season),
  };
};

const parseDataShow = (
  fields: Map<string, unknown>,
  describedAs: string,
): GeographyShowOf<"data-towers"> => {
  const bars = fields.get("bars");
  if (
    !Array.isArray(bars) ||
    bars.length < fewestBars ||
    bars.length > mostBars
  ) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs ${String(fewestBars)} to ${String(mostBars)} bars`,
    );
  }
  const parsedBars = bars.map((bar: unknown, index) =>
    parseDataBar(bar, `bar ${String(index + 1)} of ${describedAs}`),
  );
  const repeatedLabel = findRepeat(parsedBars.map(({ label }) => label));
  if (repeatedLabel !== undefined) {
    throw new InvalidCurriculumFileError(
      `${describedAs} has two bars labelled "${repeatedLabel}"`,
    );
  }
  const unit = fields.get("unit");
  return {
    scene: "data-towers",
    title: readText(fields.get("title"), `${describedAs}'s title`),
    ...includeWhenPresent(
      "unit",
      unit === undefined ? undefined : readText(unit, `${describedAs}'s unit`),
    ),
    bars: parsedBars,
  };
};

const parseShow = (
  value: unknown,
  scene: GeographyScene,
  describedAs: string,
): GeographyShow => {
  const fields = readFields(value, showFieldsByScene[scene], describedAs);
  switch (scene) {
    case "globe-spinner":
      return parseGlobeShow(fields, describedAs);
    case "uk-explorer":
      return parseUkShow(fields, describedAs);
    case "compass-island":
      return parseCompassShow(fields, describedAs);
    case "weather-window":
      return parseWeatherShow(fields, describedAs);
    case "landscape-lookout":
      return {
        scene,
        feature: readOneOf(
          landscapeFeatures,
          fields.get("feature"),
          `${describedAs}'s feature`,
        ),
      };
    case "map-key":
      return {
        scene,
        symbol: readOneOf(
          mapSymbols,
          fields.get("symbol"),
          `${describedAs}'s symbol`,
        ),
      };
    case "grid-hunt":
      return parseGridShow(fields, describedAs);
    case "biome-dome":
      return {
        scene,
        biome: readOneOf(biomes, fields.get("biome"), `${describedAs}'s biome`),
      };
    case "river-valley":
      return {
        scene,
        marker: readOneOf(
          valleyMarkers,
          fields.get("marker"),
          `${describedAs}'s marker`,
        ),
      };
    case "volcano-cutaway":
      return {
        scene,
        part: readOneOf(
          cutawayParts,
          fields.get("part"),
          `${describedAs}'s part`,
        ),
      };
    case "settlement-board":
      return {
        scene,
        tile: readOneOf(
          settlementTiles,
          fields.get("tile"),
          `${describedAs}'s tile`,
        ),
      };
    case "resource-dock":
      return {
        scene,
        resource: readOneOf(
          resources,
          fields.get("resource"),
          `${describedAs}'s resource`,
        ),
      };
    case "data-towers":
      return parseDataShow(fields, describedAs);
    case "region-tour":
      return {
        scene,
        ...includeWhenPresent(
          "region",
          readOptionalOneOf(
            tourRegions,
            fields.get("region"),
            `${describedAs}'s region`,
          ),
        ),
      };
  }
};

const padTwoDigits = (value: number) => String(value).padStart(2, "0");

export const buildGridReference = ({
  style,
  x,
  y,
}: GeographyShowOf<"grid-hunt">): string => {
  switch (style) {
    case "letters":
      return `${gridLetters.charAt(x)}${String(y)}`;
    case "four-figure":
      return `${padTwoDigits(x)}${padTwoDigits(y)}`;
    case "six-figure": {
      const describeInTenths = (value: number) =>
        String(Math.round(value * 10)).padStart(3, "0");
      return `${describeInTenths(x)}${describeInTenths(y)}`;
    }
  }
};

export const findGridOrigin = ({
  style,
  x,
  y,
}: GeographyShowOf<"grid-hunt">): { x: number; y: number } => {
  if (style === "letters") {
    return { x: 0, y: 1 };
  }
  const floorToFive = (value: number) => {
    const whole = Math.floor(value);
    return Math.min(whole - (whole % 5), 99 - (gridSquaresAcross - 1));
  };
  return { x: floorToFive(x), y: floorToFive(y) };
};

export const gridSquareCount = gridSquaresAcross;

const parseQuestion = (
  value: unknown,
  scene: GeographyScene,
  describedAs: string,
): GeographyQuestion => {
  const fields = readFields(value, questionFields, describedAs);
  const answer = readText(fields.get("answer"), `The answer to ${describedAs}`);
  const wrongAnswers = fields.get("wrongAnswers");
  if (
    !Array.isArray(wrongAnswers) ||
    wrongAnswers.length < fewestWrongAnswers ||
    !wrongAnswers.every(
      (wrongAnswer) => typeof wrongAnswer === "string" && wrongAnswer !== "",
    )
  ) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs at least ${String(fewestWrongAnswers)} wrong answers`,
    );
  }
  const shownWrongAnswers = wrongAnswers.filter(
    (wrongAnswer): wrongAnswer is string => typeof wrongAnswer === "string",
  );
  if (shownWrongAnswers.includes(answer)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} lists its answer "${answer}" as a wrong answer`,
    );
  }
  const repeatedWrongAnswer = findRepeat(shownWrongAnswers);
  if (repeatedWrongAnswer !== undefined) {
    throw new InvalidCurriculumFileError(
      `${describedAs} lists the wrong answer "${repeatedWrongAnswer}" twice`,
    );
  }
  const show = parseShow(
    fields.get("show"),
    scene,
    `The show of ${describedAs}`,
  );
  if (show.scene === "grid-hunt" && buildGridReference(show) !== answer) {
    throw new InvalidCurriculumFileError(
      `${describedAs} answers "${answer}", but its pin is at ${buildGridReference(show)}`,
    );
  }
  return {
    ask: readText(fields.get("ask"), `The ask of ${describedAs}`),
    show,
    answer,
    wrongAnswers: shownWrongAnswers,
  };
};

const parseGame = (value: unknown, yearGroup: YearGroup): GeographyGame => {
  const fields = readFields(value, gameFields, "A geography game");
  const skillId = fields.get("skillId");
  if (typeof skillId !== "string" || !geographySkillIdShape.test(skillId)) {
    throw new InvalidCurriculumFileError(
      'A geography game needs a skillId shaped like "geography.seven-continents"',
    );
  }
  const describedAs = `Geography game "${skillId}"`;
  const scene = readOneOf(
    geographyScenes,
    fields.get("scene"),
    `The scene of ${describedAs}`,
  );
  const questionFiles = fields.get("questions");
  if (
    !isNonEmptyList(questionFiles) ||
    questionFiles.length < fewestQuestionsPerGame
  ) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs at least ${String(fewestQuestionsPerGame)} questions`,
    );
  }
  const questions = questionFiles.map((questionFile, index) =>
    parseQuestion(
      questionFile,
      scene,
      `question ${String(index + 1)} of ${describedAs}`,
    ),
  );
  const repeatedAsk = findRepeat(
    questions.map(({ ask, show }) => `${ask} ${JSON.stringify(show)}`),
  );
  if (repeatedAsk !== undefined) {
    throw new InvalidCurriculumFileError(
      `${describedAs} asks the same question twice: ${repeatedAsk}`,
    );
  }
  return {
    skillId,
    title: readText(fields.get("title"), `The title of ${describedAs}`),
    skillName: readText(
      fields.get("skillName"),
      `The skill name of ${describedAs}`,
    ),
    yearGroup,
    strand: readOneOf(
      geographyStrands,
      fields.get("strand"),
      `The strand of ${describedAs}`,
    ),
    scene,
    instruction: readText(
      fields.get("instruction"),
      `The instruction of ${describedAs}`,
    ),
    questions,
  };
};

const parseYearFile = (value: unknown): GeographyGame[] => {
  const fields = readFields(value, yearFileFields, "A geography year file");
  const yearGroup = readOneOf(
    yearGroups,
    fields.get("yearGroup"),
    "The yearGroup of a geography year file",
  );
  const gameFiles = fields.get("games");
  if (!Array.isArray(gameFiles)) {
    throw new InvalidCurriculumFileError(
      `The geography file for Year ${String(yearGroup)} needs a list of games`,
    );
  }
  return gameFiles.map((gameFile: unknown) => parseGame(gameFile, yearGroup));
};

export const parseGeographyGames = (
  yearFiles: readonly unknown[],
): GeographyGame[] => {
  const games = yearFiles.flatMap(parseYearFile);
  const repeatedSkillId = findRepeat(games.map(({ skillId }) => skillId));
  if (repeatedSkillId !== undefined) {
    throw new InvalidCurriculumFileError(
      `Two geography games have the skillId "${repeatedSkillId}"`,
    );
  }
  const repeatedTitle = findRepeat(games.map(({ title }) => title));
  if (repeatedTitle !== undefined) {
    throw new InvalidCurriculumFileError(
      `Two geography games have the title "${repeatedTitle}"`,
    );
  }
  return games;
};
