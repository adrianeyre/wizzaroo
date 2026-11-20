import { formatNumber } from "./number-format.js";
import {
  buildNumberQuestion,
  buildWordQuestion,
  type PictureQuestion,
  type PictureQuestionDifficulty,
} from "./picture-questions.js";

export interface ChartBar {
  label: string;
  value: number;
}

export interface PieSlice {
  label: string;
  parts: number;
}

export type ChartPicture =
  | { kind: "pictogram"; bars: ChartBar[]; symbolValue: number }
  | { kind: "tally"; bars: ChartBar[] }
  | { kind: "blocks"; bars: ChartBar[] }
  | {
      kind: "bar-chart";
      bars: ChartBar[];
      scaleStep: number;
      hiddenLabel: string | undefined;
    }
  | { kind: "line-graph"; points: ChartBar[]; scaleStep: number; unit: string }
  | { kind: "timetable"; stops: string[]; departures: string[][] }
  | { kind: "pie"; slices: PieSlice[]; wholeParts: number; total: number };

export type ChartQuestion = PictureQuestion<ChartPicture>;

export type ChartYear = 2 | 3 | 4 | 5 | 6;

const buildBars = (
  labels: readonly string[],
  values: readonly number[],
): ChartBar[] =>
  values.map((value, index) => ({ label: labels[index], value }));

const buildReadQuestions = (
  picture: ChartPicture,
  bars: readonly ChartBar[],
  ask: (label: string) => string,
  step: number,
  unit = "",
): ChartQuestion[] =>
  bars.map(({ label, value }) =>
    buildNumberQuestion(
      ask(label),
      picture,
      value,
      [
        ...bars.map((bar) => bar.value),
        value + step,
        value - step,
        value + 1,
        value - 1,
      ],
      unit,
    ),
  );

const buildExtremeQuestions = (
  picture: ChartPicture,
  bars: readonly ChartBar[],
  noun: string,
): ChartQuestion[] => {
  const ordered = bars.toSorted((first, second) => second.value - first.value);
  const labels = bars.map(({ label }) => label);
  return [
    buildWordQuestion(
      `Which ${noun} has the most?`,
      picture,
      ordered[0].label,
      labels,
    ),
    buildWordQuestion(
      `Which ${noun} has the fewest?`,
      picture,
      ordered[ordered.length - 1].label,
      labels,
    ),
  ];
};

const listOrderedPairs = (bars: readonly ChartBar[]): [ChartBar, ChartBar][] =>
  bars.flatMap((first, index) =>
    bars
      .slice(index + 1)
      .filter((second) => second.value !== first.value)
      .map((second): [ChartBar, ChartBar] =>
        first.value > second.value ? [first, second] : [second, first],
      ),
  );

const buildCompareQuestions = (
  picture: ChartPicture,
  bars: readonly ChartBar[],
  step: number,
  pairCount: number,
): ChartQuestion[] =>
  listOrderedPairs(bars)
    .slice(0, pairCount)
    .flatMap(([more, fewer]) => [
      buildNumberQuestion(
        `How many more ${more.label} than ${fewer.label}?`,
        picture,
        more.value - fewer.value,
        [
          more.value + fewer.value,
          more.value - fewer.value + step,
          more.value - fewer.value - step,
          more.value,
          fewer.value,
        ],
      ),
      buildNumberQuestion(
        `How many ${more.label} and ${fewer.label} altogether?`,
        picture,
        more.value + fewer.value,
        [
          more.value - fewer.value,
          more.value + fewer.value + step,
          more.value + fewer.value - step,
          more.value,
        ],
      ),
    ]);

const seaFinds = ["crabs", "fish", "shells", "starfish"];

const yearTwoCounts = [
  [4, 7, 2, 9],
  [6, 3, 8, 5],
  [9, 5, 7, 2],
  [3, 8, 6, 10],
  [7, 2, 10, 4],
];

const askHowManyFound = (label: string) => `How many ${label} were found?`;

const buildYearTwoQuestions = (
  difficulty: PictureQuestionDifficulty,
): ChartQuestion[] =>
  yearTwoCounts.flatMap((counts) => {
    const bars = buildBars(seaFinds, counts);
    switch (difficulty) {
      case 1:
        return buildReadQuestions(
          { kind: "pictogram", bars, symbolValue: 1 },
          bars,
          askHowManyFound,
          1,
        );
      case 2:
        return [
          ...buildReadQuestions(
            { kind: "tally", bars },
            bars,
            askHowManyFound,
            1,
          ),
          ...buildExtremeQuestions({ kind: "tally", bars }, bars, "sea find"),
        ];
      case 3:
        return buildCompareQuestions({ kind: "blocks", bars }, bars, 1, 2);
    }
  });

const seaAnimals = ["dolphins", "turtles", "sharks", "whales"];

const askHowManyChose = (label: string) => `How many children chose ${label}?`;

const yearThreePictograms = [
  [8, 13, 6, 11],
  [14, 5, 10, 9],
  [7, 12, 16, 3],
  [10, 15, 4, 9],
];

const yearThreeBarCharts: { values: number[]; scaleStep: number }[] = [
  { values: [15, 30, 20, 45], scaleStep: 5 },
  { values: [25, 10, 40, 35], scaleStep: 5 },
  { values: [6, 14, 10, 18], scaleStep: 2 },
  { values: [12, 4, 16, 8], scaleStep: 2 },
];

const yearThreeComparisons = [
  [40, 25, 60, 35],
  [55, 30, 20, 45],
  [70, 35, 50, 15],
];

const buildBarChart = (
  bars: ChartBar[],
  scaleStep: number,
  hiddenLabel?: string,
): ChartPicture => ({ kind: "bar-chart", bars, scaleStep, hiddenLabel });

const buildYearThreeQuestions = (
  difficulty: PictureQuestionDifficulty,
): ChartQuestion[] => {
  switch (difficulty) {
    case 1:
      return yearThreePictograms.flatMap((values) => {
        const bars = buildBars(seaAnimals, values);
        return bars.map(({ label, value }) =>
          buildNumberQuestion(
            `Each whole shell stands for 2 children. ${askHowManyChose(label)}`,
            { kind: "pictogram", bars, symbolValue: 2 },
            value,
            [Math.ceil(value / 2), value + 1, value - 1, value + 2, value - 2],
          ),
        );
      });
    case 2:
      return yearThreeBarCharts.flatMap(({ values, scaleStep }) => {
        const bars = buildBars(seaAnimals, values);
        return buildReadQuestions(
          buildBarChart(bars, scaleStep),
          bars,
          askHowManyChose,
          scaleStep,
        );
      });
    case 3:
      return yearThreeComparisons.flatMap((values) => {
        const bars = buildBars(seaAnimals, values);
        return buildCompareQuestions(buildBarChart(bars, 10), bars, 5, 3);
      });
  }
};

const poolTimes = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm"];

const poolTemperatures = [
  [8, 10, 14, 18, 20, 16, 12],
  [6, 8, 12, 16, 18, 14, 10],
  [10, 12, 16, 22, 24, 20, 14],
];

const yearFourBarCharts: { values: number[]; scaleStep: number }[] = [
  { values: [120, 80, 160, 60], scaleStep: 20 },
  { values: [100, 140, 40, 180], scaleStep: 20 },
  { values: [75, 150, 125, 50], scaleStep: 25 },
];

const askTemperatureAt = (label: string) =>
  `What was the temperature of the rock pool at ${label}?`;

const buildLineGraph = (
  points: ChartBar[],
  scaleStep: number,
  unit: string,
): ChartPicture => ({ kind: "line-graph", points, scaleStep, unit });

const buildChangeQuestion = (
  picture: ChartPicture,
  earlier: ChartBar,
  later: ChartBar,
  describeChange: (isRise: boolean) => string,
  step: number,
  unit: string,
): ChartQuestion => {
  const change = Math.abs(later.value - earlier.value);
  return buildNumberQuestion(
    `${describeChange(later.value > earlier.value)} between ${earlier.label} and ${later.label}?`,
    picture,
    change,
    [
      later.value,
      earlier.value,
      change + step,
      change - step,
      later.value + earlier.value,
    ],
    unit,
  );
};

const describeTemperatureChange = (isRise: boolean) =>
  `How many degrees did the temperature ${isRise ? "rise" : "fall"}`;

const buildYearFourQuestions = (
  difficulty: PictureQuestionDifficulty,
): ChartQuestion[] => {
  switch (difficulty) {
    case 1:
      return yearFourBarCharts.flatMap(({ values, scaleStep }) => {
        const bars = buildBars(seaAnimals, values);
        const picture = buildBarChart(bars, scaleStep);
        return [
          ...buildReadQuestions(picture, bars, askHowManyChose, scaleStep),
          ...buildCompareQuestions(picture, bars, scaleStep, 1),
        ];
      });
    case 2:
      return poolTemperatures.flatMap((temperatures) => {
        const points = buildBars(poolTimes, temperatures);
        return buildReadQuestions(
          buildLineGraph(points, 2, "°C"),
          points,
          askTemperatureAt,
          2,
          "°C",
        );
      });
    case 3:
      return poolTemperatures.flatMap((temperatures) => {
        const points = buildBars(poolTimes, temperatures);
        const picture = buildLineGraph(points, 2, "°C");
        const warmest = points.toSorted(
          (first, second) => second.value - first.value,
        )[0];
        return [
          buildChangeQuestion(
            picture,
            points[1],
            points[4],
            describeTemperatureChange,
            2,
            "°C",
          ),
          buildChangeQuestion(
            picture,
            points[0],
            points[3],
            describeTemperatureChange,
            2,
            "°C",
          ),
          buildChangeQuestion(
            picture,
            points[4],
            points[6],
            describeTemperatureChange,
            2,
            "°C",
          ),
          buildWordQuestion(
            "At what time was the rock pool warmest?",
            picture,
            warmest.label,
            points.map(({ label }) => label),
          ),
        ];
      });
  }
};

const tideTimes = ["6am", "8am", "10am", "12pm", "2pm", "4pm"];

const tideHeights = [
  [50, 125, 200, 250, 175, 75],
  [100, 175, 225, 150, 75, 25],
  [25, 100, 150, 225, 200, 125],
];

const describeTideChange = (isRise: boolean) =>
  `How many centimetres did the tide ${isRise ? "rise" : "fall"}`;

const ferryStops = ["Coral Cove", "Pearl Point", "Kelp Harbour", "Shell Beach"];

interface Timetable {
  starts: number[];
  offsets: number[];
}

const timetables: Timetable[] = [
  {
    starts: [9 * 60 + 10, 10 * 60 + 25, 11 * 60 + 40],
    offsets: [0, 12, 30, 45],
  },
  {
    starts: [8 * 60 + 45, 10 * 60 + 5, 13 * 60 + 20],
    offsets: [0, 18, 33, 52],
  },
  {
    starts: [7 * 60 + 50, 9 * 60 + 35, 12 * 60 + 15],
    offsets: [0, 14, 29, 41],
  },
];

const minutesInAnHour = 60;

export const formatClockMinutes = (minutes: number): string =>
  `${String(Math.floor(minutes / minutesInAnHour)).padStart(2, "0")}:${String(minutes % minutesInAnHour).padStart(2, "0")}`;

const describeMinutesUnit = (minutes: number) =>
  ` ${minutes === 1 ? "minute" : "minutes"}`;

const buildTimetablePicture = ({
  starts,
  offsets,
}: Timetable): ChartPicture => ({
  kind: "timetable",
  stops: ferryStops,
  departures: starts.map((start) =>
    offsets.map((offset) => formatClockMinutes(start + offset)),
  ),
});

const buildArrivalQuestions = (timetable: Timetable): ChartQuestion[] => {
  const picture = buildTimetablePicture(timetable);
  const { starts, offsets } = timetable;
  return starts.flatMap((start) =>
    [2, 3].map((stopIndex) =>
      buildWordQuestion(
        `When does the ${formatClockMinutes(start)} ferry from ${ferryStops[0]} reach ${ferryStops[stopIndex]}?`,
        picture,
        formatClockMinutes(start + offsets[stopIndex]),
        [
          ...offsets.map((offset) => formatClockMinutes(start + offset)),
          ...starts.map((other) =>
            formatClockMinutes(other + offsets[stopIndex]),
          ),
          formatClockMinutes(start + offsets[stopIndex] + 10),
        ],
      ),
    ),
  );
};

const buildJourneyQuestions = (timetable: Timetable): ChartQuestion[] => {
  const picture = buildTimetablePicture(timetable);
  const { starts, offsets } = timetable;
  const journeys: [number, number][] = [
    [0, 3],
    [1, 3],
    [0, 2],
  ];
  const durationQuestions = journeys.map(([from, to]) => {
    const minutes = offsets[to] - offsets[from];
    return buildNumberQuestion(
      `How long does the ferry take from ${ferryStops[from]} to ${ferryStops[to]}?`,
      picture,
      minutes,
      [
        minutes + 5,
        minutes - 5,
        minutes + 10,
        offsets[to],
        offsets[to] - offsets[from + 1],
        100 - minutes,
      ],
      describeMinutesUnit(minutes),
    );
  });
  const arrivalAtPearlPoint = starts[0] + offsets[1] + 20;
  const nextAtPearlPoint = starts[1] + offsets[1];
  const catchQuestion = buildWordQuestion(
    `You get to ${ferryStops[1]} at ${formatClockMinutes(arrivalAtPearlPoint)}. When is the next ferry from there?`,
    picture,
    formatClockMinutes(nextAtPearlPoint),
    [
      formatClockMinutes(starts[0] + offsets[1]),
      formatClockMinutes(starts[2] + offsets[1]),
      formatClockMinutes(starts[1]),
      formatClockMinutes(starts[1] + offsets[2]),
    ],
  );
  return [...durationQuestions, catchQuestion];
};

const buildYearFiveQuestions = (
  difficulty: PictureQuestionDifficulty,
): ChartQuestion[] => {
  switch (difficulty) {
    case 1:
      return tideHeights.flatMap((heights) => {
        const points = buildBars(tideTimes, heights);
        const picture = buildLineGraph(points, 25, " cm");
        return [
          ...buildReadQuestions(
            picture,
            points,
            (label) => `How high was the tide at ${label}?`,
            25,
            " cm",
          ),
          buildChangeQuestion(
            picture,
            points[0],
            points[2],
            describeTideChange,
            25,
            " cm",
          ),
        ];
      });
    case 2:
      return timetables.flatMap(buildArrivalQuestions);
    case 3:
      return timetables.flatMap(buildJourneyQuestions);
  }
};

interface Pie {
  slices: PieSlice[];
  wholeParts: number;
  total: number;
}

const buildPieSlice = (label: string, parts: number): PieSlice => ({
  label,
  parts,
});

const fractionPies: Pie[] = [
  {
    slices: [
      buildPieSlice("dolphins", 2),
      buildPieSlice("turtles", 1),
      buildPieSlice("sharks", 1),
    ],
    wholeParts: 4,
    total: 24,
  },
  {
    slices: [
      buildPieSlice("dolphins", 3),
      buildPieSlice("turtles", 2),
      buildPieSlice("sharks", 1),
      buildPieSlice("whales", 2),
    ],
    wholeParts: 8,
    total: 40,
  },
  {
    slices: [
      buildPieSlice("dolphins", 1),
      buildPieSlice("turtles", 4),
      buildPieSlice("sharks", 3),
    ],
    wholeParts: 8,
    total: 32,
  },
  {
    slices: [
      buildPieSlice("dolphins", 1),
      buildPieSlice("turtles", 2),
      buildPieSlice("whales", 1),
    ],
    wholeParts: 4,
    total: 48,
  },
];

const anglePies: Pie[] = [
  {
    slices: [
      buildPieSlice("dolphins", 120),
      buildPieSlice("turtles", 90),
      buildPieSlice("sharks", 150),
    ],
    wholeParts: 360,
    total: 36,
  },
  {
    slices: [
      buildPieSlice("dolphins", 60),
      buildPieSlice("turtles", 180),
      buildPieSlice("whales", 120),
    ],
    wholeParts: 360,
    total: 24,
  },
  {
    slices: [
      buildPieSlice("dolphins", 90),
      buildPieSlice("turtles", 30),
      buildPieSlice("sharks", 150),
      buildPieSlice("whales", 90),
    ],
    wholeParts: 360,
    total: 72,
  },
];

const describeFractionOfPie = (parts: number, wholeParts: number) => {
  if (parts * 2 === wholeParts) {
    return "half of them";
  }
  if (parts * 4 === wholeParts) {
    return "a quarter of them";
  }
  return `${formatNumber(parts)} out of every ${formatNumber(wholeParts)}`;
};

const buildPieQuestions = (
  { slices, wholeParts, total }: Pie,
  isAngled: boolean,
): ChartQuestion[] => {
  const picture: ChartPicture = { kind: "pie", slices, wholeParts, total };
  const countChildren = (parts: number) => (total * parts) / wholeParts;
  return slices.map(({ label, parts }) =>
    buildNumberQuestion(
      isAngled
        ? `The pie chart shows ${formatNumber(total)} children. The ${label} slice is ${formatNumber(parts)}°. How many children chose ${label}?`
        : `${formatNumber(total)} children chose a sea animal, and ${describeFractionOfPie(parts, wholeParts)} chose ${label}. How many children chose ${label}?`,
      picture,
      countChildren(parts),
      [
        ...slices.map((slice) => countChildren(slice.parts)),
        isAngled ? parts / 10 : parts,
        total / slices.length,
        countChildren(parts) + 2,
        countChildren(parts) - 2,
      ],
    ),
  );
};

const crabNames = ["Sid", "Pip", "Kit", "Mo", "Bo"];

const shellHauls = [
  [4, 6, 8, 2],
  [5, 9, 7, 3],
  [10, 6, 8],
  [3, 7, 5, 9, 6],
  [12, 8, 10, 6],
  [9, 4, 5],
];

const sumValues = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

const buildMeanQuestions = (values: readonly number[]): ChartQuestion[] => {
  const bars = buildBars(crabNames, values);
  const total = sumValues(values);
  const mean = total / values.length;
  const hidden = bars[bars.length - 1];
  return [
    buildNumberQuestion(
      "What is the mean number of shells each crab found?",
      buildBarChart(bars, 2),
      mean,
      [total, mean + 1, mean - 1, Math.max(...values), Math.min(...values)],
    ),
    buildNumberQuestion(
      `The mean is ${formatNumber(mean)} shells. How many shells did ${hidden.label} find?`,
      buildBarChart(bars, 2, hidden.label),
      hidden.value,
      [
        mean,
        hidden.value + 1,
        hidden.value - 1,
        hidden.value + 2,
        total - hidden.value,
      ],
    ),
  ];
};

const buildYearSixQuestions = (
  difficulty: PictureQuestionDifficulty,
): ChartQuestion[] => {
  switch (difficulty) {
    case 1:
      return fractionPies.flatMap((pie) => buildPieQuestions(pie, false));
    case 2:
      return anglePies.flatMap((pie) => buildPieQuestions(pie, true));
    case 3:
      return shellHauls.flatMap(buildMeanQuestions);
  }
};

const yearBuilders: Record<
  ChartYear,
  (difficulty: PictureQuestionDifficulty) => ChartQuestion[]
> = {
  2: buildYearTwoQuestions,
  3: buildYearThreeQuestions,
  4: buildYearFourQuestions,
  5: buildYearFiveQuestions,
  6: buildYearSixQuestions,
};

export const buildChartQuestions = (
  year: ChartYear,
  difficulty: PictureQuestionDifficulty,
): ChartQuestion[] => yearBuilders[year](difficulty);
