import {
  buildAdditionQuestions,
  listAdditionSlips,
  type AdditionQuestion,
} from "../../curriculum/adding-to-20.js";
import {
  buildBlockMeasureQuestions,
  describeBlockMeasure,
  listBlockMeasureSlips,
  type BlockMeasureYear,
} from "../../curriculum/block-measures.js";
import { buildComparingHeightsQuestions } from "../../curriculum/comparing-heights.js";
import {
  buildCountingInStepsQuestions,
  listCountingInStepsSlips,
  type CountingInStepsDifficulty,
} from "../../curriculum/counting-in-steps.js";
import {
  buildCountingQuestions,
  listNearbyCounts,
} from "../../curriculum/counting-to-20.js";
import {
  buildChartQuestions,
  type ChartYear,
} from "../../curriculum/chart-tower.js";
import {
  buildFairShareQuestions,
  type FairShareYear,
} from "../../curriculum/fair-shares.js";
import { buildFractionQuestions } from "../../curriculum/fractions.js";
import {
  buildMeasuringHeightQuestions,
  describeMeasuredHeight,
  listMeasuringHeightSlips,
  listMillimetreSlips,
  type MeasuringHeightQuestion,
} from "../../curriculum/measuring-height.js";
import {
  buildMoreAndLessQuestions,
  buildTemperatureQuestions,
  listMoreAndLessSlips,
  listTemperatureSlips,
  type MoreAndLessYear,
} from "../../curriculum/more-and-less.js";
import {
  buildNumberBondQuestions,
  type BondTotal,
} from "../../curriculum/number-bonds.js";
import {
  buildNumberFactQuestions,
  type NumberFactYear,
} from "../../curriculum/missing-number-facts.js";
import { formatNumber } from "../../curriculum/number-format.js";
import {
  buildOneMoreOneLessQuestions,
  buildTenMoreTenLessQuestions,
  listOneMoreOneLessSlips,
  listTenMoreTenLessSlips,
} from "../../curriculum/one-more-one-less.js";
import type {
  PictureQuestion,
  PictureQuestionDifficulty,
} from "../../curriculum/picture-questions.js";
import {
  buildPlaceValueQuestions,
  type PlaceValueYear,
} from "../../curriculum/place-value.js";
import {
  buildPolygonQuestions,
  listNetDistractors,
  shapesWithNets,
  type PolygonYear,
} from "../../curriculum/polygons.js";
import {
  buildShapePropertyQuestions,
  listShapesNotSharing,
  shapeProperties,
} from "../../curriculum/shape-properties.js";
import { shapes3d } from "../../curriculum/shapes-3d.js";
import type { YearGroup } from "../../curriculum/skills.js";
import {
  buildTakingAwayQuestions,
  listTakingAwaySlips,
  type TakingAwayQuestion,
} from "../../curriculum/taking-away-within-20.js";
import { buildClockQuestions } from "../../curriculum/telling-the-time.js";
import {
  buildTensAndOnesQuestions,
  listTensAndOnesSlips,
} from "../../curriculum/tens-and-ones.js";
import {
  buildTreasureMapQuestions,
  type TreasureMapYear,
} from "../../curriculum/treasure-map.js";
import {
  buildTwoDigitAdditionQuestions,
  buildTwoDigitTakingAwayQuestions,
  listTwoDigitSlips,
} from "../../curriculum/two-digit-calculations.js";
import type { GameType } from "../../curriculum/world-map.js";
import {
  buildWrittenAdditionQuestions,
  buildWrittenTakingAwayQuestions,
  listWrittenCalculationSlips,
  type WrittenCalculationYear,
} from "../../curriculum/written-calculations.js";
import {
  buildChoices,
  questionsPerActivity,
  shuffle,
  type Mission,
  type MissionParts,
  type MissionQuestion,
  type QuestionPrompt,
} from "./mission.js";

export const mathsGameTypes = [
  "popping-bubbles",
  "fish-count",
  "ten-frames",
  "shape-hunt",
  "shell-sums",
  "crab-take-away",
  "skip-count",
  "coral-heights",
  "fraction-find",
  "ship-clock",
] as const satisfies readonly GameType[];

export type MathsGameType = (typeof mathsGameTypes)[number];

export const isMathsGameType = (
  gameType: GameType,
): gameType is MathsGameType =>
  mathsGameTypes.some((mathsGameType) => mathsGameType === gameType);

export const mathsSkillIds: Record<MathsGameType, Record<YearGroup, string>> = {
  "popping-bubbles": {
    1: "maths.number-bonds-10",
    2: "maths.add-subtract-facts-to-20",
    3: "maths.times-tables-3-4-8",
    4: "maths.times-tables-to-12",
    5: "maths.squares-cubes-and-powers-of-ten",
    6: "maths.order-of-operations",
  },
  "fish-count": {
    1: "maths.count-objects-to-20",
    2: "maths.tens-and-ones",
    3: "maths.hundreds-tens-and-ones",
    4: "maths.thousands-hundreds-tens-and-ones",
    5: "maths.decimal-place-value",
    6: "maths.numbers-to-ten-million",
  },
  "ten-frames": {
    1: "maths.one-more-one-less",
    2: "maths.ten-more-ten-less",
    3: "maths.ten-or-hundred-more-or-less",
    4: "maths.thousand-more-or-less",
    5: "maths.powers-of-ten-more-or-less",
    6: "maths.negative-numbers",
  },
  "shape-hunt": {
    1: "maths.name-3d-shapes",
    2: "maths.shape-properties",
    3: "maths.right-angles-and-sides",
    4: "maths.classify-triangles-and-quadrilaterals",
    5: "maths.regular-and-irregular-polygons",
    6: "maths.nets-of-3d-shapes",
  },
  "shell-sums": {
    1: "maths.add-within-20",
    2: "maths.add-two-digit",
    3: "maths.add-three-digit",
    4: "maths.add-four-digit",
    5: "maths.add-decimals",
    6: "maths.add-large-numbers",
  },
  "crab-take-away": {
    1: "maths.subtract-within-20",
    2: "maths.subtract-two-digit",
    3: "maths.subtract-three-digit",
    4: "maths.subtract-four-digit",
    5: "maths.subtract-decimals",
    6: "maths.subtract-large-numbers",
  },
  "skip-count": {
    1: "maths.count-in-steps",
    2: "maths.count-in-threes-and-tens",
    3: "maths.count-in-fours-eights-and-fifties",
    4: "maths.count-in-sixes-sevens-and-twenty-fives",
    5: "maths.count-in-powers-of-ten-and-tenths",
    6: "maths.linear-sequences",
  },
  "coral-heights": {
    1: "maths.compare-heights",
    2: "maths.measure-in-centimetres",
    3: "maths.measure-in-millimetres",
    4: "maths.perimeter-of-rectangles",
    5: "maths.area-of-rectangles",
    6: "maths.volume-of-cuboids",
  },
  "fraction-find": {
    1: "maths.halves-and-quarters",
    2: "maths.fractions-of-shapes",
    3: "maths.unit-and-non-unit-fractions",
    4: "maths.families-of-equivalent-fractions",
    5: "maths.fractions-decimals-percentages",
    6: "maths.fractions-as-decimal-equivalents",
  },
  "ship-clock": {
    1: "maths.tell-the-time",
    2: "maths.time-to-five-minutes",
    3: "maths.time-to-the-minute",
    4: "maths.twenty-four-hour-clock",
    5: "maths.later-times",
    6: "maths.durations",
  },
};

type QuestionBuilder<Source> = (
  source: Source,
  random: () => number,
) => MissionQuestion;

interface ActivityPlan {
  buildQuestions: (random: () => number) => MissionQuestion[];
}

const planActivity = <Source>(
  sources: readonly Source[],
  buildQuestion: QuestionBuilder<Source>,
): ActivityPlan => ({
  buildQuestions: (random) =>
    shuffle(sources, random)
      .slice(0, questionsPerActivity)
      .map((source) => buildQuestion(source, random)),
});

const planActivities = <Source, Difficulty>(
  difficulties: readonly Difficulty[],
  listSources: (difficulty: Difficulty) => readonly Source[],
  buildQuestion: QuestionBuilder<Source>,
): ActivityPlan[] =>
  difficulties.map((difficulty) =>
    planActivity(listSources(difficulty), buildQuestion),
  );

const everyDifficulty = [1, 2, 3] as const;

const buildNumberQuestion = (
  prompt: QuestionPrompt,
  answer: number,
  slips: readonly number[],
  random: () => number,
): MissionQuestion => ({
  prompt,
  choices: buildChoices(formatNumber(answer), slips.map(formatNumber), random),
  answer: formatNumber(answer),
});

const buildWordQuestion = (
  prompt: QuestionPrompt,
  answer: string,
  distractors: readonly string[],
  random: () => number,
): MissionQuestion => ({
  prompt,
  choices: buildChoices(answer, distractors, random),
  answer,
});

const planNumberBonds = (bondTotal: BondTotal) =>
  planActivities(
    [1, 1, 2] as const,
    (difficulty) => buildNumberBondQuestions(difficulty, bondTotal),
    (numberBond, random) =>
      buildWordQuestion(
        { kind: "number-bond", numberBond },
        String(numberBond.answer),
        Array.from({ length: bondTotal + 1 }, (_, part) => String(part)),
        random,
      ),
  );

const planNumberFacts = (year: NumberFactYear) =>
  planActivities(
    everyDifficulty,
    (difficulty) => buildNumberFactQuestions(year, difficulty),
    ({ sentence, answer, slips }, random) =>
      buildNumberQuestion(
        { kind: "missing-number", sentence },
        answer,
        slips,
        random,
      ),
  );

const planPlaceValue = (year: PlaceValueYear) =>
  planActivities(
    everyDifficulty,
    (difficulty) => buildPlaceValueQuestions(year, difficulty),
    ({ columns, answer, slips }, random) =>
      buildNumberQuestion(
        { kind: "place-value", columns },
        answer,
        slips,
        random,
      ),
  );

const planMoreAndLess = (year: MoreAndLessYear) =>
  planActivities(
    everyDifficulty,
    (difficulty) => buildMoreAndLessQuestions(year, difficulty),
    (moreOrLess, random) =>
      buildNumberQuestion(
        { kind: "more-or-less", moreOrLess },
        moreOrLess.answer,
        listMoreAndLessSlips(moreOrLess),
        random,
      ),
  );

const planPolygons = (year: PolygonYear) =>
  planActivities(
    everyDifficulty,
    (difficulty) => buildPolygonQuestions(year, difficulty),
    ({ clue, answer, distractors }, random) =>
      buildWordQuestion(
        { kind: "polygon-clue", clue },
        answer,
        distractors,
        random,
      ),
  );

const planAdditions = (
  listQuestions: (difficulty: 1 | 2 | 3) => readonly AdditionQuestion[],
  listSlips: (addition: AdditionQuestion) => number[],
) =>
  planActivities(everyDifficulty, listQuestions, (addition, random) =>
    buildNumberQuestion(
      { kind: "addition", addition },
      addition.answer,
      listSlips(addition),
      random,
    ),
  );

const planTakeAways = (
  listQuestions: (difficulty: 1 | 2 | 3) => readonly TakingAwayQuestion[],
  listSlips: (takingAway: TakingAwayQuestion) => number[],
) =>
  planActivities(everyDifficulty, listQuestions, (takingAway, random) =>
    buildNumberQuestion(
      { kind: "taking-away", takingAway },
      takingAway.answer,
      listSlips(takingAway),
      random,
    ),
  );

const planWrittenAdditions = (year: WrittenCalculationYear) =>
  planAdditions(
    (difficulty) => buildWrittenAdditionQuestions(year, difficulty),
    ({ answer }) => listWrittenCalculationSlips(year, answer),
  );

const planWrittenTakeAways = (year: WrittenCalculationYear) =>
  planTakeAways(
    (difficulty) => buildWrittenTakingAwayQuestions(year, difficulty),
    ({ answer }) => listWrittenCalculationSlips(year, answer),
  );

const planSequences = (difficulties: readonly CountingInStepsDifficulty[]) =>
  planActivities(
    difficulties,
    buildCountingInStepsQuestions,
    (sequence, random) =>
      buildNumberQuestion(
        { kind: "sequence", sequence },
        sequence.answer,
        listCountingInStepsSlips(sequence),
        random,
      ),
  );

const planMeasuredHeights = (
  difficulties: readonly (1 | 2 | 3 | 4 | 5 | 6)[],
  listSlips: (measure: MeasuringHeightQuestion) => number[],
  describeSlip: (slip: number) => string,
) =>
  planActivities(
    difficulties,
    buildMeasuringHeightQuestions,
    (measure, random) =>
      buildWordQuestion(
        { kind: "height-measure", measure },
        describeMeasuredHeight(measure),
        listSlips(measure).map(describeSlip),
        random,
      ),
  );

const planBlockMeasures = (year: BlockMeasureYear) =>
  planActivities(
    everyDifficulty,
    (difficulty) => buildBlockMeasureQuestions(year, difficulty),
    (block, random) =>
      buildWordQuestion(
        { kind: "block-measure", block },
        describeBlockMeasure(block.kind, block.answer),
        listBlockMeasureSlips(block).map((slip) =>
          describeBlockMeasure(block.kind, slip),
        ),
        random,
      ),
  );

const planFractions = (year: YearGroup) =>
  planActivities(
    everyDifficulty,
    (difficulty) => buildFractionQuestions(year, difficulty),
    (fraction, random) =>
      buildWordQuestion(
        { kind: "fraction", fraction },
        fraction.target,
        fraction.distractors,
        random,
      ),
  );

const planClocks = (year: YearGroup) =>
  planActivities(
    everyDifficulty,
    (difficulty) => buildClockQuestions(year, difficulty),
    (clock, random) =>
      buildWordQuestion(
        { kind: "clock", clock },
        clock.answer,
        clock.slips,
        random,
      ),
  );

const planGame: Record<MathsGameType, (year: YearGroup) => ActivityPlan[]> = {
  "popping-bubbles": (year) =>
    year === 1 || year === 2
      ? planNumberBonds(year === 1 ? 10 : 20)
      : planNumberFacts(year),
  "fish-count": (year) => {
    if (year === 1) {
      return planActivities(
        everyDifficulty,
        buildCountingQuestions,
        (count, random) =>
          buildNumberQuestion(
            { kind: "count", count },
            count,
            listNearbyCounts(count),
            random,
          ),
      );
    }
    if (year === 2) {
      return planActivities(
        everyDifficulty,
        buildTensAndOnesQuestions,
        (count, random) =>
          buildNumberQuestion(
            { kind: "count", count },
            count,
            listTensAndOnesSlips(count),
            random,
          ),
      );
    }
    return planPlaceValue(year);
  },
  "ten-frames": (year) => {
    if (year === 1 || year === 2) {
      return planActivities(
        everyDifficulty,
        year === 1
          ? buildOneMoreOneLessQuestions
          : buildTenMoreTenLessQuestions,
        (oneMoreOneLess, random) =>
          buildNumberQuestion(
            { kind: "one-more-one-less", oneMoreOneLess },
            oneMoreOneLess.answer,
            year === 1
              ? listOneMoreOneLessSlips(oneMoreOneLess)
              : listTenMoreTenLessSlips(oneMoreOneLess),
            random,
          ),
      );
    }
    if (year === 6) {
      return planActivities(
        everyDifficulty,
        buildTemperatureQuestions,
        (temperature, random) =>
          buildNumberQuestion(
            { kind: "temperature", temperature },
            temperature.answer,
            listTemperatureSlips(temperature),
            random,
          ),
      );
    }
    return planMoreAndLess(year);
  },
  "shape-hunt": (year) => {
    if (year === 1) {
      return planActivities(
        everyDifficulty,
        () => shapes3d,
        (shape, random) =>
          buildWordQuestion({ kind: "shape", shape }, shape, shapes3d, random),
      );
    }
    if (year === 2) {
      return planActivities(
        shapeProperties,
        buildShapePropertyQuestions,
        (question, random) =>
          buildWordQuestion(
            {
              kind: "shape-property",
              property: question.property,
              count: question.count,
            },
            question.shape,
            listShapesNotSharing(question),
            random,
          ),
      );
    }
    if (year === 6) {
      return planActivities(
        everyDifficulty,
        () => shapesWithNets,
        (shape, random) =>
          buildWordQuestion(
            { kind: "net", shape },
            shape,
            listNetDistractors(shape),
            random,
          ),
      );
    }
    return planPolygons(year);
  },
  "shell-sums": (year) => {
    if (year === 1) {
      return planAdditions(buildAdditionQuestions, listAdditionSlips);
    }
    if (year === 2) {
      return planAdditions(
        buildTwoDigitAdditionQuestions,
        ({ answer, second }) => listTwoDigitSlips(answer, second),
      );
    }
    return planWrittenAdditions(year);
  },
  "crab-take-away": (year) => {
    if (year === 1) {
      return planTakeAways(buildTakingAwayQuestions, listTakingAwaySlips);
    }
    if (year === 2) {
      return planTakeAways(
        buildTwoDigitTakingAwayQuestions,
        ({ answer, takenAway }) => listTwoDigitSlips(answer, takenAway),
      );
    }
    return planWrittenTakeAways(year);
  },
  "skip-count": (year) => {
    const firstDifficulty = (year - 1) * 3 + 1;
    return planSequences(
      [0, 1, 2].map((offset) => findStepsDifficulty(firstDifficulty + offset)),
    );
  },
  "coral-heights": (year) => {
    if (year === 1) {
      return planActivities(
        [1, 2, 2] as const,
        buildComparingHeightsQuestions,
        ({ extreme, heights, answer }, random) => ({
          prompt: { kind: "height-extreme", extreme },
          choices: shuffle(heights.map(String), random),
          answer: String(answer),
        }),
      );
    }
    if (year === 2) {
      return planMeasuredHeights(
        [1, 2, 3],
        listMeasuringHeightSlips,
        (slip) => `${String(slip)} cm`,
      );
    }
    if (year === 3) {
      return planMeasuredHeights(
        [4, 5, 6],
        listMillimetreSlips,
        (slip) => `${String(slip)} mm`,
      );
    }
    return planBlockMeasures(year);
  },
  "fraction-find": planFractions,
  "ship-clock": planClocks,
};

const stepsDifficulties: readonly CountingInStepsDifficulty[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
];

const findStepsDifficulty = (difficulty: number): CountingInStepsDifficulty =>
  stepsDifficulties.find((known) => known === difficulty) ?? 1;

export interface MathsMissionParts extends MissionParts {
  level: YearGroup;
}

export const buildMathsMission = (
  gameType: MathsGameType,
  { random, buildId, level }: MathsMissionParts,
): Mission => ({
  gameType,
  phonicsGame: undefined,
  englishYear: undefined,
  labGame: undefined,
  geographyGame: undefined,
  historyQuest: undefined,
  activities: planGame[gameType](level).map(({ buildQuestions }) => ({
    id: buildId(),
    skillId: mathsSkillIds[gameType][level],
    gameType,
    questions: buildQuestions(random),
  })),
});

export const mathsExtraGameTypes = [
  "fair-shares",
  "treasure-map",
  "chart-tower",
] as const satisfies readonly GameType[];

export type MathsExtraGameType = (typeof mathsExtraGameTypes)[number];

export const isMathsExtraGameType = (
  gameType: GameType,
): gameType is MathsExtraGameType =>
  mathsExtraGameTypes.some((extraGameType) => extraGameType === gameType);

export interface MathsExtraLevel {
  skillId: string;
  planActivities: () => ActivityPlan[];
}

const planPictureLevel = <Picture>(
  skillId: string,
  listQuestions: (
    difficulty: PictureQuestionDifficulty,
  ) => PictureQuestion<Picture>[],
  buildPrompt: (question: PictureQuestion<Picture>) => QuestionPrompt,
): MathsExtraLevel => ({
  skillId,
  planActivities: () =>
    planActivities(everyDifficulty, listQuestions, (question, random) =>
      buildWordQuestion(
        buildPrompt(question),
        question.answer,
        question.slips,
        random,
      ),
    ),
});

const planFairShares = (year: FairShareYear, skillId: string) =>
  planPictureLevel(
    skillId,
    (difficulty) => buildFairShareQuestions(year, difficulty),
    ({ ask, picture }) => ({ kind: "fair-share", ask, picture }),
  );

const planTreasureMap = (year: TreasureMapYear, skillId: string) =>
  planPictureLevel(
    skillId,
    (difficulty) => buildTreasureMapQuestions(year, difficulty),
    ({ ask, picture }) => ({ kind: "treasure-map", ask, picture }),
  );

const planChartTower = (year: ChartYear, skillId: string) =>
  planPictureLevel(
    skillId,
    (difficulty) => buildChartQuestions(year, difficulty),
    ({ ask, picture }) => ({ kind: "chart", ask, picture }),
  );

const mathsExtraLevels: Record<
  MathsExtraGameType,
  Partial<Record<YearGroup, MathsExtraLevel>>
> = {
  "fair-shares": {
    1: planFairShares(1, "maths.multiply-and-divide-with-objects"),
    2: planFairShares(2, "maths.times-tables-2-5-10"),
    6: planFairShares(6, "maths.ratio-and-scale"),
  },
  "treasure-map": {
    1: planTreasureMap(1, "maths.position-and-turns"),
    2: planTreasureMap(2, "maths.clockwise-turns"),
    4: planTreasureMap(4, "maths.coordinates-first-quadrant"),
    5: planTreasureMap(5, "maths.reflection-and-translation"),
    6: planTreasureMap(6, "maths.coordinates-four-quadrants"),
  },
  "chart-tower": {
    2: planChartTower(2, "maths.tally-charts-and-pictograms"),
    3: planChartTower(3, "maths.bar-charts-and-tables"),
    4: planChartTower(4, "maths.line-graphs"),
    5: planChartTower(5, "maths.tables-and-timetables"),
    6: planChartTower(6, "maths.pie-charts-and-mean"),
  },
};

export const findMathsExtraLevel = (
  gameType: MathsExtraGameType,
  level: YearGroup,
): MathsExtraLevel | undefined => mathsExtraLevels[gameType][level];

export const buildMathsExtraMission = (
  gameType: MathsExtraGameType,
  { random, buildId, level }: MathsMissionParts,
): Mission | undefined => {
  const extraLevel = findMathsExtraLevel(gameType, level);
  if (extraLevel === undefined) {
    return undefined;
  }
  return {
    gameType,
    phonicsGame: undefined,
    englishYear: undefined,
    labGame: undefined,
    geographyGame: undefined,
    historyQuest: undefined,
    activities: extraLevel.planActivities().map(({ buildQuestions }) => ({
      id: buildId(),
      skillId: extraLevel.skillId,
      gameType,
      questions: buildQuestions(random),
    })),
  };
};
