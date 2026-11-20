import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type ColorRepresentation,
} from "three";
import type {
  DeviceName,
  NetworkDevice,
} from "../curriculum/computing-scenes.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "./world-map-models.js";

const deviceColours = {
  shell: "#e7edf6",
  shellDark: "#334155",
  charcoal: "#1e293b",
  screen: "#0f2a4a",
  screenGlow: "#38bdf8",
  key: "#f8fafc",
  accent: "#22d3ee",
  red: "#ef4444",
  amber: "#f59e0b",
  green: "#22c55e",
  metal: "#94a3b8",
  paper: "#ffffff",
  robotBody: "#fbbf24",
  robotFace: "#0f172a",
} as const;

const box = (
  size: Triple,
  colour: ColorRepresentation,
  position: Triple = [0, 0, 0],
  rotation?: Triple,
): ModelPart => ({
  geometry: new BoxGeometry(...size),
  colour,
  position,
  rotation,
});

const cylinder = (
  radius: number,
  height: number,
  colour: ColorRepresentation,
  position: Triple = [0, 0, 0],
  rotation?: Triple,
  segments = 16,
): ModelPart => ({
  geometry: new CylinderGeometry(radius, radius, height, segments),
  colour,
  position,
  rotation,
});

const ball = (
  radius: number,
  colour: ColorRepresentation,
  position: Triple = [0, 0, 0],
): ModelPart => ({
  geometry: new SphereGeometry(radius, 14, 10),
  colour,
  position,
  isSmooth: true,
});

const ring = (
  radius: number,
  tube: number,
  colour: ColorRepresentation,
  position: Triple = [0, 0, 0],
  rotation?: Triple,
  arc = Math.PI * 2,
): ModelPart => ({
  geometry: new TorusGeometry(radius, tube, 6, 18, arc),
  colour,
  position,
  rotation,
});

const listKeyRows = (
  columns: number,
  rows: number,
  keySize: number,
  gap: number,
  y: number,
  zCentre: number,
): ModelPart[] =>
  Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_unused, column) =>
      box([keySize, keySize * 0.4, keySize], deviceColours.key, [
        (column - (columns - 1) / 2) * (keySize + gap),
        y,
        zCentre + (row - (rows - 1) / 2) * (keySize + gap),
      ]),
    ),
  ).flat();

const buildKeyboardParts = (): ModelPart[] => [
  box([1.5, 0.08, 0.6], deviceColours.shellDark, [0, 0.04, 0]),
  ...listKeyRows(10, 3, 0.11, 0.025, 0.11, -0.05),
  box([0.72, 0.045, 0.1], deviceColours.key, [0, 0.11, 0.22]),
];

const buildMouseParts = (): ModelPart[] => [
  {
    geometry: new SphereGeometry(0.3, 16, 10),
    colour: deviceColours.shell,
    position: [0, 0.08, 0],
    scale: [0.75, 0.45, 1.1],
    isSmooth: true,
  },
  box([0.02, 0.06, 0.24], deviceColours.charcoal, [0, 0.2, -0.16]),
  cylinder(
    0.035,
    0.06,
    deviceColours.charcoal,
    [0, 0.22, -0.12],
    [Math.PI / 2, 0, 0],
    10,
  ),
  cylinder(
    0.015,
    0.7,
    deviceColours.charcoal,
    [0, 0.05, -0.65],
    [Math.PI / 2, 0, 0],
    6,
  ),
];

const buildDesktopParts = (): ModelPart[] => [
  box([1.5, 0.95, 0.08], deviceColours.charcoal, [0, 0.95, 0]),
  box([1.36, 0.8, 0.02], deviceColours.screen, [0, 0.96, 0.045]),
  box([0.5, 0.06, 0.02], deviceColours.screenGlow, [-0.3, 1.18, 0.06]),
  box([0.8, 0.06, 0.02], deviceColours.accent, [0.1, 1.0, 0.06]),
  box([0.12, 0.38, 0.08], deviceColours.metal, [0, 0.3, -0.04]),
  box([0.6, 0.05, 0.35], deviceColours.metal, [0, 0.03, 0]),
  ...buildKeyboardParts().map((part) => ({
    ...part,
    position: [
      (part.position?.[0] ?? 0) * 0.7,
      (part.position?.[1] ?? 0) * 0.7,
      (part.position?.[2] ?? 0) * 0.7 + 0.55,
    ] satisfies Triple,
    scale: 0.7,
  })),
];

const buildLaptopParts = (): ModelPart[] => [
  box([1.4, 0.07, 0.95], deviceColours.metal, [0, 0.035, 0]),
  ...listKeyRows(10, 3, 0.09, 0.025, 0.08, -0.12),
  box([0.4, 0.01, 0.24], deviceColours.shellDark, [0, 0.075, 0.3]),
  box([1.4, 0.9, 0.05], deviceColours.metal, [0, 0.5, -0.5], [-0.25, 0, 0]),
  box([1.26, 0.76, 0.01], deviceColours.screen, [0, 0.5, -0.47], [-0.25, 0, 0]),
  box(
    [0.7, 0.07, 0.01],
    deviceColours.screenGlow,
    [0, 0.62, -0.44],
    [-0.25, 0, 0],
  ),
];

const buildTabletParts = (): ModelPart[] => [
  box([1.0, 1.4, 0.07], deviceColours.charcoal, [0, 0.75, 0], [-0.15, 0, 0]),
  box([0.88, 1.2, 0.01], deviceColours.screen, [0, 0.76, 0.04], [-0.15, 0, 0]),
  box(
    [0.6, 0.12, 0.01],
    deviceColours.screenGlow,
    [0, 1.05, 0.05],
    [-0.15, 0, 0],
  ),
  box(
    [0.25, 0.25, 0.01],
    deviceColours.accent,
    [-0.2, 0.75, 0.05],
    [-0.15, 0, 0],
  ),
  box(
    [0.25, 0.25, 0.01],
    deviceColours.amber,
    [0.2, 0.75, 0.05],
    [-0.15, 0, 0],
  ),
  box([0.7, 0.06, 0.4], deviceColours.metal, [0, 0.03, 0.1]),
];

const buildSmartphoneParts = (): ModelPart[] => [
  box([0.6, 1.2, 0.07], deviceColours.charcoal, [0, 0.65, 0], [-0.12, 0, 0]),
  box([0.52, 1.04, 0.01], deviceColours.screen, [0, 0.66, 0.04], [-0.12, 0, 0]),
  ...[0.95, 0.75, 0.55].map((y, index) =>
    box(
      [0.36, 0.1, 0.01],
      index === 0 ? deviceColours.green : deviceColours.screenGlow,
      [0, y, 0.05],
      [-0.12, 0, 0],
    ),
  ),
  cylinder(
    0.025,
    0.02,
    deviceColours.shellDark,
    [0, 1.19, 0.03],
    [Math.PI / 2, 0, 0],
    8,
  ),
];

const buildPrinterParts = (): ModelPart[] => [
  box([1.3, 0.5, 0.8], deviceColours.shell, [0, 0.25, 0]),
  box([1.1, 0.06, 0.7], deviceColours.shellDark, [0, 0.52, -0.02]),
  box([0.8, 0.02, 0.5], deviceColours.paper, [0, 0.62, -0.25], [-0.5, 0, 0]),
  box([0.8, 0.02, 0.4], deviceColours.paper, [0, 0.2, 0.55]),
  box([0.9, 0.04, 0.3], deviceColours.metal, [0, 0.17, 0.5]),
  box([0.2, 0.05, 0.02], deviceColours.green, [0.45, 0.38, 0.41]),
];

const buildSpeakerParts = (): ModelPart[] => [
  box([0.7, 1.2, 0.6], deviceColours.charcoal, [0, 0.6, 0]),
  cylinder(
    0.25,
    0.04,
    deviceColours.metal,
    [0, 0.45, 0.31],
    [Math.PI / 2, 0, 0],
    20,
  ),
  cylinder(
    0.1,
    0.06,
    deviceColours.shellDark,
    [0, 0.45, 0.33],
    [Math.PI / 2, 0, 0],
    14,
  ),
  cylinder(
    0.12,
    0.04,
    deviceColours.metal,
    [0, 0.95, 0.31],
    [Math.PI / 2, 0, 0],
    16,
  ),
];

const buildMicrophoneParts = (): ModelPart[] => [
  cylinder(0.3, 0.06, deviceColours.charcoal, [0, 0.03, 0], undefined, 18),
  cylinder(0.03, 0.8, deviceColours.metal, [0, 0.45, 0], undefined, 8),
  cylinder(0.12, 0.35, deviceColours.charcoal, [0, 0.95, 0], undefined, 14),
  ball(0.17, deviceColours.metal, [0, 1.22, 0]),
];

const buildWebcamParts = (): ModelPart[] => [
  box([0.8, 0.35, 0.3], deviceColours.charcoal, [0, 0.62, 0]),
  cylinder(
    0.12,
    0.06,
    deviceColours.screenGlow,
    [0, 0.62, 0.16],
    [Math.PI / 2, 0, 0],
    18,
  ),
  cylinder(
    0.06,
    0.07,
    deviceColours.charcoal,
    [0, 0.62, 0.17],
    [Math.PI / 2, 0, 0],
    12,
  ),
  ball(0.03, deviceColours.green, [0.28, 0.7, 0.15]),
  box([0.1, 0.45, 0.1], deviceColours.shellDark, [0, 0.22, 0]),
  box([0.5, 0.05, 0.4], deviceColours.shellDark, [0, 0.02, 0]),
];

const buildHeadphonesParts = (): ModelPart[] => [
  ring(0.5, 0.05, deviceColours.charcoal, [0, 0.7, 0], undefined, Math.PI),
  cylinder(
    0.22,
    0.16,
    deviceColours.accent,
    [-0.5, 0.65, 0],
    [0, 0, Math.PI / 2],
    18,
  ),
  cylinder(
    0.22,
    0.16,
    deviceColours.accent,
    [0.5, 0.65, 0],
    [0, 0, Math.PI / 2],
    18,
  ),
  cylinder(
    0.17,
    0.05,
    deviceColours.charcoal,
    [-0.4, 0.65, 0],
    [0, 0, Math.PI / 2],
    16,
  ),
  cylinder(
    0.17,
    0.05,
    deviceColours.charcoal,
    [0.4, 0.65, 0],
    [0, 0, Math.PI / 2],
    16,
  ),
];

const buildGamesControllerParts = (): ModelPart[] => [
  box([0.8, 0.18, 0.45], deviceColours.charcoal, [0, 0.3, 0]),
  {
    geometry: new SphereGeometry(0.28, 14, 10),
    colour: deviceColours.charcoal,
    position: [-0.42, 0.28, 0.12],
    scale: [1, 0.6, 1.2],
    isSmooth: true,
  },
  {
    geometry: new SphereGeometry(0.28, 14, 10),
    colour: deviceColours.charcoal,
    position: [0.42, 0.28, 0.12],
    scale: [1, 0.6, 1.2],
    isSmooth: true,
  },
  box([0.2, 0.05, 0.06], deviceColours.shell, [-0.38, 0.42, 0]),
  box([0.06, 0.05, 0.2], deviceColours.shell, [-0.38, 0.42, 0]),
  ball(0.045, deviceColours.red, [0.38, 0.42, -0.06]),
  ball(0.045, deviceColours.green, [0.46, 0.42, 0.02]),
  ball(0.045, deviceColours.accent, [0.3, 0.42, 0.02]),
  ball(0.045, deviceColours.amber, [0.38, 0.42, 0.1]),
];

export const buildRobotParts = (): ModelPart[] => [
  box([0.7, 0.45, 0.6], deviceColours.robotBody, [0, 0.38, 0]),
  box([0.56, 0.36, 0.5], deviceColours.robotBody, [0, 0.82, 0]),
  box([0.44, 0.2, 0.02], deviceColours.robotFace, [0, 0.84, 0.25]),
  ball(0.05, deviceColours.screenGlow, [-0.1, 0.85, 0.27]),
  ball(0.05, deviceColours.screenGlow, [0.1, 0.85, 0.27]),
  cylinder(0.02, 0.18, deviceColours.metal, [0, 1.08, 0], undefined, 6),
  ball(0.05, deviceColours.red, [0, 1.19, 0]),
  cylinder(
    0.14,
    0.1,
    deviceColours.charcoal,
    [-0.38, 0.14, 0.15],
    [0, 0, Math.PI / 2],
    12,
  ),
  cylinder(
    0.14,
    0.1,
    deviceColours.charcoal,
    [0.38, 0.14, 0.15],
    [0, 0, Math.PI / 2],
    12,
  ),
  cylinder(
    0.14,
    0.1,
    deviceColours.charcoal,
    [-0.38, 0.14, -0.15],
    [0, 0, Math.PI / 2],
    12,
  ),
  cylinder(
    0.14,
    0.1,
    deviceColours.charcoal,
    [0.38, 0.14, -0.15],
    [0, 0, Math.PI / 2],
    12,
  ),
];

const buildFloorRobotParts = (): ModelPart[] => [
  {
    geometry: new SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    colour: deviceColours.robotBody,
    position: [0, 0.1, 0],
    scale: [1, 0.8, 1.15],
    isSmooth: true,
  },
  box([0.12, 0.04, 0.12], deviceColours.green, [0, 0.52, -0.1]),
  ...[
    [0, 0.12],
    [0, -0.32],
    [-0.22, -0.1],
    [0.22, -0.1],
  ].map(([x, z]) => box([0.1, 0.04, 0.1], deviceColours.shell, [x, 0.48, z])),
  ball(0.08, deviceColours.robotFace, [-0.18, 0.4, 0.42]),
  ball(0.08, deviceColours.robotFace, [0.18, 0.4, 0.42]),
  cylinder(0.52, 0.1, deviceColours.charcoal, [0, 0.07, 0], undefined, 20),
];

const buildTrafficLightsParts = (): ModelPart[] => [
  cylinder(0.06, 1.0, deviceColours.shellDark, [0, 0.5, 0], undefined, 8),
  box([0.4, 0.95, 0.3], deviceColours.charcoal, [0, 1.35, 0]),
  ball(0.11, deviceColours.red, [0, 1.65, 0.14]),
  ball(0.11, deviceColours.amber, [0, 1.35, 0.14]),
  ball(0.11, deviceColours.green, [0, 1.05, 0.14]),
  cylinder(0.25, 0.06, deviceColours.shellDark, [0, 0.03, 0], undefined, 14),
];

const buildWashingMachineParts = (): ModelPart[] => [
  box([1.0, 1.1, 0.9], deviceColours.shell, [0, 0.55, 0]),
  ring(0.3, 0.05, deviceColours.metal, [0, 0.5, 0.46]),
  cylinder(
    0.27,
    0.02,
    deviceColours.screenGlow,
    [0, 0.5, 0.45],
    [Math.PI / 2, 0, 0],
    20,
  ),
  box([0.9, 0.18, 0.02], deviceColours.metal, [0, 0.98, 0.46]),
  cylinder(
    0.06,
    0.04,
    deviceColours.shellDark,
    [0.32, 0.98, 0.48],
    [Math.PI / 2, 0, 0],
    10,
  ),
  box([0.3, 0.08, 0.02], deviceColours.screen, [-0.15, 0.98, 0.48]),
];

const buildMicrowaveParts = (): ModelPart[] => [
  box([1.3, 0.7, 0.8], deviceColours.shell, [0, 0.35, 0]),
  box([0.85, 0.5, 0.02], deviceColours.charcoal, [-0.18, 0.35, 0.41]),
  box([0.3, 0.55, 0.02], deviceColours.shellDark, [0.45, 0.35, 0.41]),
  box([0.2, 0.08, 0.02], deviceColours.green, [0.45, 0.53, 0.43]),
  ...[0.35, 0.22].map((y) =>
    cylinder(
      0.04,
      0.03,
      deviceColours.metal,
      [0.45, y, 0.43],
      [Math.PI / 2, 0, 0],
      10,
    ),
  ),
];

const buildRouterParts = (): ModelPart[] => [
  box([1.0, 0.18, 0.6], deviceColours.shellDark, [0, 0.12, 0]),
  ...[-0.35, 0, 0.35].map((x) =>
    cylinder(
      0.03,
      0.55,
      deviceColours.charcoal,
      [x, 0.48, -0.25],
      [0.15, 0, 0],
      6,
    ),
  ),
  ...[-0.3, -0.15, 0, 0.15, 0.3].map((x, index) =>
    ball(0.025, index % 2 === 0 ? deviceColours.green : deviceColours.accent, [
      x,
      0.17,
      0.31,
    ]),
  ),
];

const buildSmartWatchParts = (): ModelPart[] => [
  box([0.5, 0.6, 0.12], deviceColours.charcoal, [0, 0.7, 0], [-0.2, 0, 0]),
  box([0.42, 0.5, 0.01], deviceColours.screen, [0, 0.71, 0.06], [-0.2, 0, 0]),
  ring(0.12, 0.025, deviceColours.green, [0, 0.72, 0.07], [-0.2, 0, 0]),
  box([0.32, 0.5, 0.06], deviceColours.accent, [0, 1.2, -0.1], [-0.2, 0, 0]),
  box([0.32, 0.5, 0.06], deviceColours.accent, [0, 0.22, 0.1], [-0.2, 0, 0]),
];

const buildBarcodeScannerParts = (): ModelPart[] => [
  box([0.3, 0.3, 0.7], deviceColours.charcoal, [0, 0.95, 0.1], [0.25, 0, 0]),
  box(
    [0.22, 0.65, 0.22],
    deviceColours.charcoal,
    [0, 0.45, -0.1],
    [-0.25, 0, 0],
  ),
  box([0.26, 0.08, 0.02], deviceColours.red, [0, 0.82, 0.47], [0.25, 0, 0]),
  box([0.6, 0.02, 0.4], deviceColours.paper, [0, 0.02, 0.5]),
  ...[-0.2, -0.12, -0.06, 0.02, 0.1, 0.16, 0.22].map((x) =>
    box([0.025, 0.01, 0.25], deviceColours.charcoal, [x, 0.035, 0.5]),
  ),
];

const buildThermometerParts = (): ModelPart[] => [
  cylinder(0.08, 1.2, deviceColours.paper, [0, 0.8, 0], undefined, 12),
  cylinder(0.035, 0.8, deviceColours.red, [0, 0.62, 0.06], undefined, 8),
  ball(0.16, deviceColours.red, [0, 0.18, 0]),
  ...[0.5, 0.7, 0.9, 1.1, 1.3].map((y) =>
    box([0.1, 0.015, 0.02], deviceColours.charcoal, [0.07, y, 0.06]),
  ),
];

const buildSmartSpeakerParts = (): ModelPart[] => [
  cylinder(0.38, 0.75, deviceColours.shellDark, [0, 0.38, 0], undefined, 24),
  ring(0.32, 0.03, deviceColours.accent, [0, 0.77, 0], [Math.PI / 2, 0, 0]),
  cylinder(0.33, 0.02, deviceColours.charcoal, [0, 0.76, 0], undefined, 24),
  ...[-0.12, 0, 0.12].map((x) =>
    ball(0.03, deviceColours.shell, [x, 0.78, 0.15]),
  ),
];

const buildDigitalCameraParts = (): ModelPart[] => [
  box([1.0, 0.6, 0.35], deviceColours.charcoal, [0, 0.45, 0]),
  cylinder(
    0.25,
    0.35,
    deviceColours.shellDark,
    [0, 0.42, 0.33],
    [Math.PI / 2, 0, 0],
    20,
  ),
  cylinder(
    0.17,
    0.02,
    deviceColours.screenGlow,
    [0, 0.42, 0.51],
    [Math.PI / 2, 0, 0],
    18,
  ),
  box([0.2, 0.08, 0.15], deviceColours.metal, [0.32, 0.79, 0]),
  box([0.22, 0.14, 0.02], deviceColours.paper, [-0.32, 0.62, 0.18]),
];

const buildLightSensorParts = (): ModelPart[] => [
  box([0.8, 0.06, 0.6], deviceColours.green, [0, 0.03, 0]),
  {
    geometry: new SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    colour: deviceColours.amber,
    position: [0, 0.06, 0],
    isSmooth: true,
  },
  cylinder(0.015, 0.3, deviceColours.metal, [-0.08, 0.2, -0.2], undefined, 6),
  cylinder(0.015, 0.3, deviceColours.metal, [0.08, 0.2, -0.2], undefined, 6),
  ...[0.3, 0.45, 0.6].map((radius) =>
    ring(
      radius,
      0.012,
      deviceColours.amber,
      [0, 0.55, 0],
      [Math.PI / 2, 0, 0],
      Math.PI,
    ),
  ),
];

const buildServerParts = (): ModelPart[] => [
  box([0.8, 1.6, 0.8], deviceColours.charcoal, [0, 0.8, 0]),
  ...[0.3, 0.6, 0.9, 1.2, 1.45].flatMap((y) => [
    box([0.7, 0.18, 0.02], deviceColours.shellDark, [0, y, 0.41]),
    ball(0.025, deviceColours.green, [0.27, y, 0.43]),
    box([0.3, 0.03, 0.02], deviceColours.accent, [-0.1, y, 0.43]),
  ]),
];

const devicePartBuilders: Record<DeviceName, () => ModelPart[]> = {
  "desktop-computer": buildDesktopParts,
  laptop: buildLaptopParts,
  tablet: buildTabletParts,
  smartphone: buildSmartphoneParts,
  keyboard: buildKeyboardParts,
  mouse: buildMouseParts,
  printer: buildPrinterParts,
  speaker: buildSpeakerParts,
  microphone: buildMicrophoneParts,
  webcam: buildWebcamParts,
  headphones: buildHeadphonesParts,
  "games-controller": buildGamesControllerParts,
  "floor-robot": buildFloorRobotParts,
  "traffic-lights": buildTrafficLightsParts,
  "washing-machine": buildWashingMachineParts,
  microwave: buildMicrowaveParts,
  router: buildRouterParts,
  "smart-watch": buildSmartWatchParts,
  "barcode-scanner": buildBarcodeScannerParts,
  thermometer: buildThermometerParts,
  "smart-speaker": buildSmartSpeakerParts,
  "digital-camera": buildDigitalCameraParts,
  "light-sensor": buildLightSensorParts,
  server: buildServerParts,
};

const buildNetworkComputerParts = (): ModelPart[] => [
  box([1.3, 0.85, 0.1], deviceColours.charcoal, [0, 1.0, 0]),
  box([1.16, 0.7, 0.02], deviceColours.screenGlow, [0, 1.0, 0.06]),
  box([0.14, 0.45, 0.1], deviceColours.metal, [0, 0.35, 0]),
  box([0.6, 0.06, 0.4], deviceColours.metal, [0, 0.03, 0]),
];

const buildNetworkLaptopParts = (): ModelPart[] => [
  box([1.3, 0.08, 0.9], deviceColours.metal, [0, 0.04, 0]),
  box([1.3, 0.85, 0.06], deviceColours.metal, [0, 0.5, -0.45], [-0.25, 0, 0]),
  box(
    [1.16, 0.7, 0.01],
    deviceColours.screenGlow,
    [0, 0.5, -0.41],
    [-0.25, 0, 0],
  ),
];

const buildNetworkTabletParts = (): ModelPart[] => [
  box([0.95, 1.3, 0.08], deviceColours.charcoal, [0, 0.7, 0], [-0.2, 0, 0]),
  box(
    [0.83, 1.12, 0.01],
    deviceColours.screenGlow,
    [0, 0.71, 0.05],
    [-0.2, 0, 0],
  ),
];

const buildNetworkPhoneParts = (): ModelPart[] => [
  box([0.6, 1.15, 0.08], deviceColours.charcoal, [0, 0.62, 0], [-0.15, 0, 0]),
  box([0.5, 0.98, 0.01], deviceColours.green, [0, 0.63, 0.05], [-0.15, 0, 0]),
];

const buildNetworkRouterParts = (): ModelPart[] => [
  box([1.1, 0.25, 0.7], deviceColours.shellDark, [0, 0.15, 0]),
  ...[-0.38, 0.38].map((x) =>
    box(
      [0.06, 0.7, 0.06],
      deviceColours.charcoal,
      [x, 0.6, -0.25],
      [0.15, 0, 0],
    ),
  ),
  box([0.7, 0.06, 0.02], deviceColours.green, [0, 0.2, 0.36]),
];

const buildNetworkSwitchParts = (): ModelPart[] => [
  box([1.3, 0.22, 0.6], deviceColours.metal, [0, 0.12, 0]),
  box([1.0, 0.08, 0.02], deviceColours.charcoal, [0, 0.12, 0.31]),
  box([0.9, 0.03, 0.02], deviceColours.green, [0, 0.2, 0.31]),
];

const buildNetworkServerParts = (): ModelPart[] => [
  box([0.8, 1.6, 0.8], deviceColours.charcoal, [0, 0.8, 0]),
  ...[0.4, 0.8, 1.2].map((y) =>
    box([0.66, 0.08, 0.02], deviceColours.accent, [0, y, 0.41]),
  ),
];

const buildNetworkPrinterParts = (): ModelPart[] => [
  box([1.2, 0.5, 0.8], deviceColours.shell, [0, 0.25, 0]),
  box([0.8, 0.02, 0.4], deviceColours.paper, [0, 0.55, -0.2], [-0.5, 0, 0]),
  box([0.8, 0.04, 0.35], deviceColours.metal, [0, 0.18, 0.5]),
];

const networkDevicePartBuilders: Record<NetworkDevice, () => ModelPart[]> = {
  computer: buildNetworkComputerParts,
  laptop: buildNetworkLaptopParts,
  tablet: buildNetworkTabletParts,
  phone: buildNetworkPhoneParts,
  router: buildNetworkRouterParts,
  switch: buildNetworkSwitchParts,
  server: buildNetworkServerParts,
  printer: buildNetworkPrinterParts,
};

export const buildDeviceGeometry = (device: DeviceName): BufferGeometry =>
  buildModelGeometry(devicePartBuilders[device]());

export const buildRobotGeometry = (): BufferGeometry =>
  buildModelGeometry(buildRobotParts());

export const listNetworkDeviceParts = (device: NetworkDevice): ModelPart[] =>
  networkDevicePartBuilders[device]();

export const buildSpireGeometry = (): BufferGeometry =>
  buildModelGeometry([
    cylinder(1.1, 0.3, "#475569", [0, 0.15, 0], undefined, 8),
    cylinder(0.85, 0.25, "#64748b", [0, 0.42, 0], undefined, 8),
    {
      geometry: new CylinderGeometry(0.35, 0.65, 2.6, 8),
      colour: "#cbd5e1",
      position: [0, 1.85, 0],
    },
    ...[0.9, 1.5, 2.1, 2.7].map((y) =>
      ring(
        0.58 - (y - 0.9) * 0.12,
        0.05,
        deviceColours.accent,
        [0, y, 0],
        [Math.PI / 2, 0, 0],
      ),
    ),
    {
      geometry: new ConeGeometry(0.42, 0.7, 8),
      colour: "#334155",
      position: [0, 3.5, 0],
    },
    cylinder(0.04, 0.8, deviceColours.metal, [0, 4.1, 0], undefined, 6),
    ...[0, 1, 2, 3].map((side) =>
      box(
        [0.06, 0.6, 0.36],
        "#0e7490",
        [
          Math.cos((side * Math.PI) / 2) * 0.72,
          0.6,
          Math.sin((side * Math.PI) / 2) * 0.72,
        ],
        [0, -(side * Math.PI) / 2, 0],
      ),
    ),
  ]);
