export type ComputingDifficulty = 1 | 2 | 3;

export const directions = ["up", "down", "left", "right"] as const;
export type Direction = (typeof directions)[number];

export interface GridCell {
  column: number;
  row: number;
}

export interface GridLabel {
  cell: GridCell;
  text: string;
}

export interface RobotGridScene {
  kind: "robot-grid";
  columns: number;
  rows: number;
  robot: GridCell;
  goal?: GridCell;
  obstacles?: GridCell[];
  path?: Direction[];
  labels?: GridLabel[];
}

export const codeCategories = [
  "event",
  "motion",
  "looks",
  "sound",
  "control",
  "variables",
  "operators",
  "sensing",
] as const;
export type CodeCategory = (typeof codeCategories)[number];

export interface CodeBlock {
  text: string;
  category: CodeCategory;
  depth?: number;
  isHighlighted?: boolean;
}

export type CodeGadget =
  | { kind: "led-board"; shows: string }
  | { kind: "lamp"; isOn: boolean }
  | { kind: "robot" };

export interface CodeStackScene {
  kind: "code-stack";
  blocks: CodeBlock[];
  gadget?: CodeGadget;
}

export const deviceNames = [
  "desktop-computer",
  "laptop",
  "tablet",
  "smartphone",
  "keyboard",
  "mouse",
  "printer",
  "speaker",
  "microphone",
  "webcam",
  "headphones",
  "games-controller",
  "floor-robot",
  "traffic-lights",
  "washing-machine",
  "microwave",
  "router",
  "smart-watch",
  "barcode-scanner",
  "thermometer",
  "smart-speaker",
  "digital-camera",
  "light-sensor",
  "server",
] as const;
export type DeviceName = (typeof deviceNames)[number];

export interface DeviceScene {
  kind: "device";
  device: DeviceName;
  caption?: string;
}

export const textScreenApps = [
  "browser",
  "email",
  "login",
  "pop-up",
  "document",
  "poster",
  "social",
  "game",
  "video",
] as const;
export type TextScreenApp = (typeof textScreenApps)[number];

export interface ChatMessage {
  from: string;
  text: string;
  isMine?: boolean;
}

export type ScreenContent =
  | { app: "chat"; messages: ChatMessage[] }
  | { app: "table" | "spreadsheet"; rows: string[][] }
  | { app: TextScreenApp; lines: string[] };

export interface TabletScene {
  kind: "tablet-screen";
  title: string;
  screen: ScreenContent;
}

export interface SearchResult {
  title: string;
  address: string;
  isAdvert?: boolean;
}

export interface SearchEngineScene {
  kind: "search-engine";
  query: string;
  results: SearchResult[];
}

export const networkDevices = [
  "computer",
  "laptop",
  "tablet",
  "phone",
  "router",
  "switch",
  "server",
  "printer",
] as const;
export type NetworkDevice = (typeof networkDevices)[number];

export interface NetworkNode {
  id: string;
  device: NetworkDevice;
  label: string;
  column: number;
  row: number;
}

export interface NetworkMapScene {
  kind: "network-map";
  nodes: NetworkNode[];
  links: [string, string][];
  route?: string[];
}

export interface ChartBar {
  label: string;
  value: number;
}

export interface BarChartScene {
  kind: "bar-chart";
  title: string;
  style: "bars" | "pictogram" | "line";
  bars: ChartBar[];
}

export const pixelCodes = [
  "r",
  "o",
  "y",
  "g",
  "b",
  "p",
  "k",
  "w",
  "n",
  "s",
  ".",
  "?",
] as const;
export type PixelCode = (typeof pixelCodes)[number];

export interface PixelGridScene {
  kind: "pixel-grid";
  frames: string[][];
  highlight?: GridCell;
  rowLabels?: string[];
}

export const itemColours = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
] as const;
export type ItemColour = (typeof itemColours)[number];

export const itemShapes = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
] as const;
export type ItemShape = (typeof itemShapes)[number];

export interface SortItem {
  shape: ItemShape;
  colour: ItemColour;
  size: "small" | "big";
}

export interface SortMachineScene {
  kind: "sort-machine";
  item: SortItem;
  bins: string[];
}

export type BranchNode =
  { question: string; yes: BranchNode; no: BranchNode } | { leaf: string };

export interface BranchTreeScene {
  kind: "branch-tree";
  root: BranchNode;
  highlightLeaf?: string;
}

export interface VariableCrate {
  name: string;
  value: string;
}

export interface VariableCratesScene {
  kind: "variable-crates";
  crates: VariableCrate[];
  code: string[];
}

export interface StoryCardsScene {
  kind: "story-cards";
  cards: string[];
  missingIndex?: number;
  highlightIndex?: number;
}

export const photoSubjects = [
  "house",
  "tree",
  "cat",
  "flower",
  "friends",
  "mountain",
] as const;
export type PhotoSubject = (typeof photoSubjects)[number];

export interface PhotoFrameScene {
  kind: "photo-frame";
  subject: PhotoSubject;
  orientation: "landscape" | "portrait";
  light: "dark" | "good" | "bright";
  focus: "sharp" | "blurry";
  tilt: "level" | "crooked";
  shot: "wide" | "medium" | "close-up";
}

export interface ShapeLayer {
  shape: ItemShape;
  colour: ItemColour;
}

export interface ShapeLayersScene {
  kind: "shape-layers";
  layers: ShapeLayer[];
  isGrouped?: boolean;
}

export const workbenchShapes = [
  "cube",
  "cuboid",
  "cylinder",
  "cone",
  "sphere",
  "pyramid",
  "prism",
] as const;
export type WorkbenchShape = (typeof workbenchShapes)[number];

export interface WorkbenchPart {
  shape: WorkbenchShape;
  colour: ItemColour;
  position: [number, number, number];
  size?: [number, number, number];
}

export interface ModelWorkbenchScene {
  kind: "model-workbench";
  parts: WorkbenchPart[];
}

export type ComputingScene =
  | RobotGridScene
  | CodeStackScene
  | DeviceScene
  | TabletScene
  | SearchEngineScene
  | NetworkMapScene
  | BarChartScene
  | PixelGridScene
  | SortMachineScene
  | BranchTreeScene
  | VariableCratesScene
  | StoryCardsScene
  | PhotoFrameScene
  | ShapeLayersScene
  | ModelWorkbenchScene;

export type ComputingSceneKind = ComputingScene["kind"];

export interface ComputingQuestion {
  ask: string;
  scene: ComputingScene;
  answer: string;
  distractors: string[];
  hint?: string;
}

export type ComputingQuestionSource =
  | { kind: "bank"; questions: ComputingQuestion[] }
  | {
      kind: "generated";
      generate: (
        difficulty: ComputingDifficulty,
        random: () => number,
      ) => ComputingQuestion[];
    };

export interface ComputingGame<GameTypeName extends string = string> {
  gameType: GameTypeName;
  title: string;
  skillId: string;
  instruction: string;
  questions: ComputingQuestionSource;
}

export const defineComputingGame = <const GameTypeName extends string>(
  game: ComputingGame<GameTypeName>,
): ComputingGame<GameTypeName> => game;

export const pickWholeNumber = (
  smallest: number,
  largest: number,
  random: () => number,
): number => smallest + Math.floor(random() * (largest - smallest + 1));

export const pickOne = <Value>(
  values: readonly Value[],
  random: () => number,
): Value => values[Math.floor(random() * values.length)];

export const shuffleValues = <Value>(
  values: readonly Value[],
  random: () => number,
): Value[] => {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

export const buildNumberDistractors = (
  answer: number,
  smallest = 0,
): string[] =>
  [answer - 2, answer - 1, answer + 1, answer + 2, answer + 3]
    .filter((candidate) => candidate >= smallest && candidate !== answer)
    .map(String);

const directionSteps: Record<Direction, GridCell> = {
  up: { column: 0, row: -1 },
  down: { column: 0, row: 1 },
  left: { column: -1, row: 0 },
  right: { column: 1, row: 0 },
};

export const directionArrows: Record<Direction, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export const directionWords: Record<Direction, string> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
};

export const moveCell = (
  { column, row }: GridCell,
  direction: Direction,
): GridCell => ({
  column: column + directionSteps[direction].column,
  row: row + directionSteps[direction].row,
});

export const followPath = (
  start: GridCell,
  path: readonly Direction[],
): GridCell[] =>
  path.reduce<GridCell[]>(
    (visited, direction) => [
      ...visited,
      moveCell(visited.at(-1) ?? start, direction),
    ],
    [start],
  );

export const isSameCell = (first: GridCell, second: GridCell): boolean =>
  first.column === second.column && first.row === second.row;

export const isInsideGrid = (
  { column, row }: GridCell,
  columns: number,
  rows: number,
): boolean => column >= 0 && column < columns && row >= 0 && row < rows;

export const describeArrows = (path: readonly Direction[]): string =>
  path.map((direction) => directionArrows[direction]).join(" ");

export const findOppositeDirection = (direction: Direction): Direction => {
  switch (direction) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
};

export const describeArrowsInWords = (choice: string): string =>
  directions.reduce(
    (described, direction) =>
      described.replaceAll(
        directionArrows[direction],
        directionWords[direction],
      ),
    choice,
  );

export const buildRandomPath = (
  start: GridCell,
  stepCount: number,
  columns: number,
  rows: number,
  random: () => number,
): Direction[] => {
  const path: Direction[] = [];
  let here = start;
  const visited = [start];
  for (let step = 0; step < stepCount; step++) {
    const openDirections = directions.filter((direction) => {
      const next = moveCell(here, direction);
      return (
        isInsideGrid(next, columns, rows) &&
        !visited.some((cell) => isSameCell(cell, next))
      );
    });
    if (openDirections.length === 0) {
      return path;
    }
    const direction = pickOne(openDirections, random);
    path.push(direction);
    here = moveCell(here, direction);
    visited.push(here);
  }
  return path;
};
