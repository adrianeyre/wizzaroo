import type { MapSymbol } from "../../curriculum/geography.js";

export type SymbolCanvas = Pick<
  CanvasRenderingContext2D,
  | "arc"
  | "beginPath"
  | "bezierCurveTo"
  | "closePath"
  | "ellipse"
  | "fill"
  | "fillRect"
  | "fillStyle"
  | "fillText"
  | "font"
  | "lineCap"
  | "lineJoin"
  | "lineTo"
  | "lineWidth"
  | "moveTo"
  | "quadraticCurveTo"
  | "rect"
  | "restore"
  | "rotate"
  | "roundRect"
  | "save"
  | "setLineDash"
  | "stroke"
  | "strokeStyle"
  | "textAlign"
  | "textBaseline"
  | "translate"
>;

export type MapSymbolPainter = (context: SymbolCanvas) => void;

export const symbolUnits = 100;

const osColours = {
  black: "#1b1b1b",
  tourist: "#1f73b7",
  touristDark: "#155a91",
  white: "#ffffff",
  contour: "#c8742f",
  woodTint: "#d6ebc0",
  woodSymbol: "#2f7d3a",
  footpath: "#2e9a45",
  motorway: "#3f7fcf",
  motorwayCasing: "#163e7a",
  station: "#d7262b",
  building: "#5e5047",
  lighthouseLight: "#c2187c",
  sea: "#bfe1f5",
  coast: "#5aa9d6",
} as const;

const pictureColours = {
  grass: "#a9d68a",
  grassEdge: "#86bd68",
  roof: "#c4553a",
  roofShade: "#9e3f2a",
  roofLine: "#7a2f1f",
  chimney: "#7b6f66",
  path: "#e7d3a6",
  leafDark: "#2f7a35",
  leaf: "#4a9a41",
  leafLight: "#74bd5a",
  shadow: "rgba(0, 0, 0, 0.18)",
  water: "#5fb3e6",
  waterEdge: "#2a78b8",
  waterLight: "rgba(255, 255, 255, 0.55)",
  road: "#73787f",
  roadEdge: "#4d5157",
  stone: "#b29d7d",
  stoneEdge: "#6f5f48",
  wheat: "#e8cf6a",
  barley: "#d9b85a",
  pasture: "#8cc56d",
  meadow: "#b7dc8e",
  ploughed: "#b88a5f",
  furrow: "#94683f",
  hedge: "#3e7a35",
  softSurface: "#ef9b6a",
  fence: "#8a5a32",
  sand: "#f1d99a",
  metal: "#5b6d82",
  slide: "#ffcf3a",
  tarmac: "#9aa1a8",
  slate: "#7d8a99",
  slateShade: "#636f7d",
  chalk: "#ffffff",
  pitchLine: "rgba(255, 255, 255, 0.9)",
} as const;

const fillCircle = (
  context: SymbolCanvas,
  x: number,
  y: number,
  radius: number,
  colour: string,
) => {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = colour;
  context.fill();
};

const fillRoundedSquare = (
  context: SymbolCanvas,
  inset: number,
  radius: number,
  colour: string,
) => {
  context.beginPath();
  context.roundRect(
    inset,
    inset,
    symbolUnits - inset * 2,
    symbolUnits - inset * 2,
    radius,
  );
  context.fillStyle = colour;
  context.fill();
};

const paintGrassGround = (context: SymbolCanvas) => {
  fillRoundedSquare(context, 4, 10, pictureColours.grass);
  context.lineWidth = 2;
  context.strokeStyle = pictureColours.grassEdge;
  context.stroke();
};

const paintTouristSquare = (context: SymbolCanvas) => {
  fillRoundedSquare(context, 16, 7, osColours.tourist);
};

const traceShape = (
  context: SymbolCanvas,
  points: readonly (readonly [number, number])[],
) => {
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.closePath();
};

const strokeLine = (
  context: SymbolCanvas,
  from: readonly [number, number],
  to: readonly [number, number],
  width: number,
  colour: string,
) => {
  context.beginPath();
  context.moveTo(from[0], from[1]);
  context.lineTo(to[0], to[1]);
  context.lineWidth = width;
  context.strokeStyle = colour;
  context.stroke();
};

const writeMapFigures = (
  context: SymbolCanvas,
  text: string,
  x: number,
  y: number,
  size: number,
  colour: string,
) => {
  context.font = `700 ${String(size)}px "Helvetica Neue", Arial, sans-serif`;
  context.fillStyle = colour;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(text, x, y);
};

const paintHouse = (context: SymbolCanvas) => {
  paintGrassGround(context);
  context.fillStyle = pictureColours.path;
  context.fillRect(45, 66, 10, 30);
  context.fillStyle = pictureColours.shadow;
  context.fillRect(24, 32, 58, 40);
  context.fillStyle = pictureColours.roof;
  context.fillRect(20, 28, 58, 20);
  context.fillStyle = pictureColours.roofShade;
  context.fillRect(20, 48, 58, 20);
  context.lineWidth = 1;
  context.strokeStyle = pictureColours.roofLine;
  for (let row = 33; row < 68; row += 5) {
    strokeLine(context, [20, row], [78, row], 0.8, pictureColours.roofLine);
  }
  strokeLine(context, [20, 48], [78, 48], 2.5, pictureColours.roofLine);
  traceShape(context, [
    [20, 28],
    [78, 28],
    [78, 68],
    [20, 68],
  ]);
  context.lineWidth = 2;
  context.strokeStyle = pictureColours.roofLine;
  context.stroke();
  context.fillStyle = pictureColours.chimney;
  context.fillRect(62, 33, 9, 9);
  context.fillStyle = "#3d3733";
  context.fillRect(64, 35, 5, 5);
};

const treeLumps = [0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
  const angle = (index / 8) * Math.PI * 2;
  return [50 + Math.cos(angle) * 21, 48 + Math.sin(angle) * 21] as const;
});

const paintTree = (context: SymbolCanvas) => {
  paintGrassGround(context);
  fillCircle(context, 55, 54, 31, pictureColours.shadow);
  fillCircle(context, 50, 48, 24, pictureColours.leafDark);
  for (const [x, y] of treeLumps) {
    fillCircle(context, x, y, 11, pictureColours.leafDark);
  }
  fillCircle(context, 47, 45, 21, pictureColours.leaf);
  for (const [x, y] of treeLumps) {
    fillCircle(context, x - 2, y - 2, 8, pictureColours.leaf);
  }
  fillCircle(context, 40, 38, 9, pictureColours.leafLight);
  fillCircle(context, 52, 34, 5, pictureColours.leafLight);
  fillCircle(context, 36, 50, 4, pictureColours.leafLight);
};

const traceRoadCurve = (context: SymbolCanvas) => {
  context.beginPath();
  context.moveTo(6, 64);
  context.bezierCurveTo(34, 64, 62, 38, 94, 40);
};

const paintRoad = (context: SymbolCanvas) => {
  paintGrassGround(context);
  context.lineCap = "butt";
  traceRoadCurve(context);
  context.lineWidth = 24;
  context.strokeStyle = pictureColours.roadEdge;
  context.stroke();
  traceRoadCurve(context);
  context.lineWidth = 20;
  context.strokeStyle = pictureColours.road;
  context.stroke();
  traceRoadCurve(context);
  context.setLineDash([7, 6]);
  context.lineWidth = 2.5;
  context.strokeStyle = pictureColours.chalk;
  context.stroke();
  context.setLineDash([]);
};

const traceRiverCurve = (context: SymbolCanvas) => {
  context.beginPath();
  context.moveTo(12, 6);
  context.bezierCurveTo(10, 40, 62, 28, 52, 58);
  context.bezierCurveTo(44, 80, 82, 82, 92, 96);
};

const paintRiver = (context: SymbolCanvas) => {
  paintGrassGround(context);
  context.lineCap = "round";
  traceRiverCurve(context);
  context.lineWidth = 22;
  context.strokeStyle = pictureColours.waterEdge;
  context.stroke();
  traceRiverCurve(context);
  context.lineWidth = 17;
  context.strokeStyle = pictureColours.water;
  context.stroke();
  context.lineWidth = 1.6;
  context.strokeStyle = pictureColours.waterLight;
  context.beginPath();
  context.moveTo(18, 24);
  context.quadraticCurveTo(24, 30, 32, 32);
  context.moveTo(48, 48);
  context.quadraticCurveTo(50, 54, 49, 60);
  context.moveTo(60, 78);
  context.quadraticCurveTo(68, 82, 76, 84);
  context.stroke();
};

const tracePondEdge = (context: SymbolCanvas, grow: number) => {
  context.beginPath();
  context.moveTo(30 - grow, 40);
  context.bezierCurveTo(28 - grow, 22 - grow, 58, 18 - grow, 70 + grow, 30);
  context.bezierCurveTo(86 + grow, 44, 80 + grow, 70 + grow, 58, 74 + grow);
  context.bezierCurveTo(40, 80 + grow, 20 - grow, 66, 30 - grow, 40);
  context.closePath();
};

const paintPond = (context: SymbolCanvas) => {
  paintGrassGround(context);
  tracePondEdge(context, 3);
  context.fillStyle = pictureColours.waterEdge;
  context.fill();
  tracePondEdge(context, 0);
  context.fillStyle = pictureColours.water;
  context.fill();
  context.beginPath();
  context.ellipse(48, 40, 14, 6, -0.3, 0, Math.PI * 2);
  context.fillStyle = pictureColours.waterLight;
  context.fill();
  fillCircle(context, 64, 60, 5, pictureColours.leaf);
  fillCircle(context, 56, 64, 3.5, pictureColours.leaf);
  context.lineCap = "round";
  for (const [x, y, lean] of [
    [24, 54, -3],
    [27, 58, 1],
    [22, 60, -1],
    [78, 30, 3],
    [81, 34, 1],
  ] as const) {
    strokeLine(context, [x, y], [x + lean, y - 11], 2, pictureColours.hedge);
  }
};

const paintBridge = (context: SymbolCanvas) => {
  paintGrassGround(context);
  context.lineCap = "butt";
  strokeLine(context, [50, 4], [50, 96], 26, pictureColours.waterEdge);
  strokeLine(context, [50, 4], [50, 96], 21, pictureColours.water);
  strokeLine(context, [4, 50], [96, 50], 22, pictureColours.roadEdge);
  strokeLine(context, [4, 50], [96, 50], 18, pictureColours.road);
  context.fillStyle = pictureColours.shadow;
  context.fillRect(34, 62, 32, 5);
  context.fillStyle = pictureColours.stone;
  context.fillRect(32, 37, 36, 26);
  context.fillStyle = pictureColours.road;
  context.fillRect(32, 41, 36, 18);
  context.lineCap = "round";
  for (const edge of [37.5, 62.5]) {
    const flare = edge < 50 ? -6 : 6;
    context.beginPath();
    context.moveTo(26, edge + flare);
    context.lineTo(32, edge);
    context.lineTo(68, edge);
    context.lineTo(74, edge + flare);
    context.lineWidth = 4;
    context.strokeStyle = pictureColours.stoneEdge;
    context.stroke();
  }
};

const fieldPatches = [
  {
    colour: pictureColours.wheat,
    corners: [
      [8, 8],
      [56, 8],
      [50, 46],
      [8, 50],
    ],
  },
  {
    colour: pictureColours.pasture,
    corners: [
      [56, 8],
      [92, 8],
      [92, 40],
      [50, 46],
    ],
  },
  {
    colour: pictureColours.ploughed,
    corners: [
      [8, 50],
      [50, 46],
      [44, 92],
      [8, 92],
    ],
  },
  {
    colour: pictureColours.meadow,
    corners: [
      [50, 46],
      [92, 40],
      [92, 70],
      [47, 72],
    ],
  },
  {
    colour: pictureColours.barley,
    corners: [
      [47, 72],
      [92, 70],
      [92, 92],
      [44, 92],
    ],
  },
] as const;

const paintField = (context: SymbolCanvas) => {
  fillRoundedSquare(context, 4, 10, pictureColours.hedge);
  for (const patch of fieldPatches) {
    traceShape(context, patch.corners);
    context.fillStyle = patch.colour;
    context.fill();
  }
  context.lineCap = "round";
  for (let furrow = 0; furrow < 6; furrow++) {
    const top = 54 + furrow * 6.5;
    strokeLine(context, [11, top], [45, top - 2], 1.6, pictureColours.furrow);
  }
  for (let row = 0; row < 5; row++) {
    const top = 14 + row * 7;
    strokeLine(context, [12, top], [48, top - 1], 1.2, pictureColours.barley);
  }
  context.lineJoin = "round";
  for (const patch of fieldPatches) {
    traceShape(context, patch.corners);
    context.lineWidth = 3.5;
    context.strokeStyle = pictureColours.hedge;
    context.stroke();
  }
  fillCircle(context, 50, 46, 4, pictureColours.leafDark);
  fillCircle(context, 92, 40, 4, pictureColours.leafDark);
};

const paintPlayground = (context: SymbolCanvas) => {
  paintGrassGround(context);
  fillRoundedSquare(context, 12, 8, pictureColours.softSurface);
  context.setLineDash([3, 2.5]);
  context.lineWidth = 2.5;
  context.strokeStyle = pictureColours.fence;
  context.stroke();
  context.setLineDash([]);
  fillCircle(context, 34, 34, 13, "#d93a48");
  fillCircle(context, 34, 34, 11, "#f45b69");
  context.lineCap = "round";
  for (let spoke = 0; spoke < 4; spoke++) {
    const angle = (spoke / 4) * Math.PI * 2 + 0.4;
    strokeLine(
      context,
      [34, 34],
      [34 + Math.cos(angle) * 11, 34 + Math.sin(angle) * 11],
      2,
      pictureColours.chalk,
    );
  }
  fillCircle(context, 34, 34, 3, pictureColours.metal);
  strokeLine(context, [56, 24], [84, 24], 3.5, pictureColours.metal);
  strokeLine(context, [56, 21], [56, 27], 3, pictureColours.metal);
  strokeLine(context, [84, 21], [84, 27], 3, pictureColours.metal);
  context.fillStyle = "#3d3733";
  context.fillRect(61, 30, 7, 4);
  context.fillRect(72, 30, 7, 4);
  strokeLine(context, [64.5, 24], [64.5, 30], 1, pictureColours.metal);
  strokeLine(context, [75.5, 24], [75.5, 30], 1, pictureColours.metal);
  context.fillStyle = pictureColours.slide;
  context.fillRect(64, 46, 10, 34);
  context.fillStyle = pictureColours.metal;
  context.fillRect(62, 40, 14, 8);
  for (let rung = 0; rung < 3; rung++) {
    strokeLine(
      context,
      [63, 41 + rung * 2.8],
      [75, 41 + rung * 2.8],
      1,
      pictureColours.chalk,
    );
  }
  context.beginPath();
  context.roundRect(20, 58, 24, 22, 4);
  context.fillStyle = pictureColours.sand;
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = pictureColours.fence;
  context.stroke();
  fillCircle(context, 28, 66, 2, "#d9b86a");
  fillCircle(context, 36, 72, 2.5, "#d9b86a");
};

const paintSchool = (context: SymbolCanvas) => {
  paintGrassGround(context);
  context.fillStyle = pictureColours.tarmac;
  context.fillRect(10, 44, 46, 46);
  context.fillStyle = pictureColours.shadow;
  traceShape(context, [
    [13, 13],
    [93, 13],
    [93, 47],
    [79, 47],
    [79, 29],
    [13, 29],
  ]);
  context.fill();
  traceShape(context, [
    [10, 10],
    [90, 10],
    [90, 44],
    [76, 44],
    [76, 26],
    [10, 26],
  ]);
  context.fillStyle = pictureColours.slate;
  context.fill();
  context.fillStyle = pictureColours.slateShade;
  context.fillRect(10, 18, 66, 8);
  context.fillRect(83, 18, 7, 26);
  strokeLine(context, [10, 18], [83, 18], 1.5, "#4d5866");
  strokeLine(context, [83, 18], [83, 44], 1.5, "#4d5866");
  context.lineWidth = 1.6;
  context.strokeStyle = pictureColours.chalk;
  for (let square = 0; square < 4; square++) {
    context.beginPath();
    context.rect(16, 78 - square * 8, 8, 8);
    context.stroke();
  }
  context.beginPath();
  context.arc(40, 66, 9, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = pictureColours.pasture;
  context.fillRect(60, 52, 30, 38);
  context.lineWidth = 1.4;
  context.strokeStyle = pictureColours.pitchLine;
  context.beginPath();
  context.ellipse(75, 71, 11, 15, 0, 0, Math.PI * 2);
  context.stroke();
  strokeLine(context, [64, 71], [86, 71], 1.4, pictureColours.pitchLine);
};

const paintChurchCross = (context: SymbolCanvas, baseY: number) => {
  context.fillStyle = osColours.black;
  context.fillRect(47, 14, 6, baseY - 14);
  context.fillRect(37, 24, 26, 6);
};

const paintChurchWithTower = (context: SymbolCanvas) => {
  paintChurchCross(context, 52);
  context.fillStyle = osColours.black;
  context.fillRect(33, 50, 34, 34);
};

const paintChurchWithSpire = (context: SymbolCanvas) => {
  paintChurchCross(context, 52);
  fillCircle(context, 50, 67, 18, osColours.black);
};

const paintPostOffice = (context: SymbolCanvas) => {
  context.fillStyle = osColours.building;
  context.fillRect(12, 34, 28, 32);
  context.fillRect(40, 48, 10, 18);
  context.font = `700 34px "Times New Roman", Georgia, serif`;
  context.fillStyle = osColours.black;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText("PO", 56, 52);
};

const paintParking = (context: SymbolCanvas) => {
  paintTouristSquare(context);
  context.font = `800 52px "Helvetica Neue", Arial, sans-serif`;
  context.fillStyle = osColours.white;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("P", 50, 53);
};

const paintRailwayStation = (context: SymbolCanvas) => {
  strokeLine(context, [6, 50], [94, 50], 5, osColours.black);
  context.beginPath();
  context.roundRect(31, 39, 38, 22, 4);
  context.fillStyle = osColours.station;
  context.fill();
  context.lineWidth = 2.5;
  context.strokeStyle = osColours.black;
  context.stroke();
};

const paintCampsite = (context: SymbolCanvas) => {
  paintTouristSquare(context);
  traceShape(context, [
    [50, 28],
    [74, 70],
    [26, 70],
  ]);
  context.fillStyle = osColours.white;
  context.fill();
  traceShape(context, [
    [50, 46],
    [58, 70],
    [42, 70],
  ]);
  context.fillStyle = osColours.tourist;
  context.fill();
  strokeLine(context, [50, 28], [50, 22], 2.5, osColours.white);
};

const paintCaravanSite = (context: SymbolCanvas) => {
  paintTouristSquare(context);
  context.beginPath();
  context.roundRect(24, 34, 44, 28, [10, 10, 3, 3]);
  context.fillStyle = osColours.white;
  context.fill();
  context.fillStyle = osColours.tourist;
  context.fillRect(30, 40, 12, 9);
  context.fillRect(48, 40, 13, 9);
  strokeLine(context, [68, 59], [78, 62], 3, osColours.white);
  fillCircle(context, 44, 64, 7, osColours.white);
  fillCircle(context, 44, 64, 3, osColours.tourist);
};

const paintPicnicSite = (context: SymbolCanvas) => {
  paintTouristSquare(context);
  context.fillStyle = osColours.white;
  context.fillRect(26, 36, 48, 6);
  context.fillRect(20, 54, 60, 5);
  context.lineCap = "round";
  strokeLine(context, [36, 42], [28, 72], 4, osColours.white);
  strokeLine(context, [64, 42], [72, 72], 4, osColours.white);
};

const paintViewpoint = (context: SymbolCanvas) => {
  context.lineCap = "round";
  for (let ray = 0; ray < 9; ray++) {
    const angle = Math.PI + ((ray + 0.5) / 9) * Math.PI;
    strokeLine(
      context,
      [50 + Math.cos(angle) * 8, 74 + Math.sin(angle) * 8],
      [50 + Math.cos(angle) * 44, 74 + Math.sin(angle) * 44],
      3.5,
      osColours.tourist,
    );
  }
  fillCircle(context, 50, 74, 5, osColours.tourist);
};

const paintInformationCentre = (context: SymbolCanvas) => {
  fillRoundedSquare(context, 20, 8, osColours.white);
  context.lineWidth = 4;
  context.strokeStyle = osColours.tourist;
  context.stroke();
  fillCircle(context, 50, 32, 6, osColours.tourist);
  context.fillStyle = osColours.tourist;
  context.fillRect(45, 43, 10, 28);
  context.fillRect(40, 43, 10, 5);
  context.fillRect(40, 68, 20, 5);
};

const paintTelephone = (context: SymbolCanvas) => {
  paintTouristSquare(context);
  context.lineCap = "round";
  context.beginPath();
  context.arc(50, 66, 24, Math.PI * 1.18, Math.PI * 1.82);
  context.lineWidth = 8;
  context.strokeStyle = osColours.white;
  context.stroke();
  for (const side of [-1, 1]) {
    context.save();
    context.translate(50 + side * 20, 56);
    context.rotate(side * 0.5);
    context.beginPath();
    context.roundRect(-7, -4, 14, 12, 3);
    context.fillStyle = osColours.white;
    context.fill();
    context.restore();
  }
  context.beginPath();
  context.roundRect(36, 66, 28, 8, 3);
  context.fillStyle = osColours.white;
  context.fill();
};

const woodSpots = [0, 1, 2, 3].flatMap((row) =>
  [0, 1, 2, 3].map(
    (column) => [22 + column * 19 + (row % 2) * 8, 22 + row * 19] as const,
  ),
);

const paintWoodTint = (context: SymbolCanvas) => {
  fillRoundedSquare(context, 6, 6, osColours.woodTint);
};

const paintConiferousWood = (context: SymbolCanvas) => {
  paintWoodTint(context);
  for (const [x, y] of woodSpots) {
    strokeLine(context, [x, y - 2], [x, y + 8], 1.8, osColours.woodSymbol);
    traceShape(context, [
      [x, y - 8],
      [x + 4.5, y + 3],
      [x - 4.5, y + 3],
    ]);
    context.fillStyle = osColours.woodSymbol;
    context.fill();
  }
};

const paintDeciduousWood = (context: SymbolCanvas) => {
  paintWoodTint(context);
  for (const [x, y] of woodSpots) {
    strokeLine(context, [x, y], [x, y + 8], 1.8, osColours.woodSymbol);
    fillCircle(context, x, y - 3, 4.8, osColours.woodSymbol);
  }
};

const traceMotorway = (context: SymbolCanvas) => {
  context.beginPath();
  context.moveTo(4, 62);
  context.bezierCurveTo(36, 62, 62, 40, 96, 38);
};

const paintMotorway = (context: SymbolCanvas) => {
  context.lineCap = "butt";
  context.beginPath();
  context.moveTo(40, 58);
  context.quadraticCurveTo(52, 70, 70, 84);
  context.lineWidth = 9;
  context.strokeStyle = osColours.motorwayCasing;
  context.stroke();
  context.lineWidth = 6;
  context.strokeStyle = osColours.motorway;
  context.stroke();
  traceMotorway(context);
  context.lineWidth = 24;
  context.strokeStyle = osColours.motorwayCasing;
  context.stroke();
  traceMotorway(context);
  context.lineWidth = 19;
  context.strokeStyle = osColours.motorway;
  context.stroke();
  traceMotorway(context);
  context.lineWidth = 2.5;
  context.strokeStyle = osColours.motorwayCasing;
  context.stroke();
};

const paintFootpath = (context: SymbolCanvas) => {
  context.beginPath();
  context.moveTo(8, 82);
  context.bezierCurveTo(30, 82, 32, 52, 52, 50);
  context.bezierCurveTo(72, 48, 70, 22, 92, 18);
  context.setLineDash([7, 5]);
  context.lineCap = "butt";
  context.lineWidth = 4;
  context.strokeStyle = osColours.footpath;
  context.stroke();
  context.setLineDash([]);
};

const paintRailwayLine = (context: SymbolCanvas) => {
  const start = [8, 66] as const;
  const end = [92, 34] as const;
  strokeLine(context, start, end, 3.5, osColours.black);
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const alongX = (end[0] - start[0]) / length;
  const alongY = (end[1] - start[1]) / length;
  for (let tick = 6; tick < length; tick += 9) {
    const x = start[0] + alongX * tick;
    const y = start[1] + alongY * tick;
    strokeLine(
      context,
      [x - alongY * 6, y + alongX * 6],
      [x + alongY * 6, y - alongX * 6],
      2.2,
      osColours.black,
    );
  }
};

const traceContour = (context: SymbolCanvas, size: number) => {
  context.beginPath();
  context.moveTo(50 - size * 1.2, 52);
  context.bezierCurveTo(
    50 - size * 1.2,
    52 - size,
    50 + size * 0.3,
    52 - size * 1.1,
    50 + size * 1.1,
    50 - size * 0.4,
  );
  context.bezierCurveTo(
    50 + size * 1.6,
    50 + size * 0.2,
    50 + size * 0.6,
    52 + size * 0.95,
    50 - size * 0.2,
    52 + size * 0.85,
  );
  context.bezierCurveTo(
    50 - size,
    52 + size * 0.8,
    50 - size * 1.2,
    52 + size * 0.5,
    50 - size * 1.2,
    52,
  );
  context.closePath();
};

const paintContourLines = (context: SymbolCanvas) => {
  for (const [size, width] of [
    [36, 3],
    [27, 1.6],
    [18, 1.6],
    [9, 1.6],
  ] as const) {
    traceContour(context, size);
    context.lineWidth = width;
    context.strokeStyle = osColours.contour;
    context.stroke();
  }
  context.fillStyle = "#fffdf6";
  context.fillRect(4, 44, 18, 14);
  writeMapFigures(context, "100", 5, 51.5, 11, osColours.contour);
};

const paintSpotHeight = (context: SymbolCanvas) => {
  fillCircle(context, 36, 52, 4, osColours.black);
  writeMapFigures(context, "143", 44, 52, 22, osColours.black);
};

const paintTrigPoint = (context: SymbolCanvas) => {
  traceShape(context, [
    [34, 36],
    [50, 64],
    [18, 64],
  ]);
  context.lineJoin = "miter";
  context.lineWidth = 4;
  context.strokeStyle = osColours.tourist;
  context.stroke();
  fillCircle(context, 34, 55, 3.2, osColours.tourist);
  writeMapFigures(context, "212", 56, 54, 22, osColours.black);
};

const paintLighthouse = (context: SymbolCanvas) => {
  context.beginPath();
  context.moveTo(62, 96);
  context.bezierCurveTo(66, 74, 84, 70, 96, 62);
  context.lineTo(96, 96);
  context.closePath();
  context.fillStyle = osColours.sea;
  context.fill();
  context.beginPath();
  context.moveTo(62, 96);
  context.bezierCurveTo(66, 74, 84, 70, 96, 62);
  context.lineWidth = 2;
  context.strokeStyle = osColours.coast;
  context.stroke();
  context.lineCap = "round";
  for (let ray = 0; ray < 8; ray++) {
    const angle = (ray / 8) * Math.PI * 2;
    strokeLine(
      context,
      [48 + Math.cos(angle) * 13, 48 + Math.sin(angle) * 13],
      [48 + Math.cos(angle) * 30, 48 + Math.sin(angle) * 30],
      4,
      osColours.lighthouseLight,
    );
  }
  fillCircle(context, 48, 48, 9, osColours.black);
  fillCircle(context, 48, 48, 3.5, osColours.white);
};

const paintWindmill = (context: SymbolCanvas) => {
  context.lineCap = "butt";
  for (let sail = 0; sail < 4; sail++) {
    const angle = Math.PI / 4 + (sail * Math.PI) / 2;
    context.save();
    context.translate(50, 50);
    context.rotate(angle);
    context.beginPath();
    context.rect(10, -4.5, 26, 9);
    context.fillStyle = osColours.white;
    context.fill();
    context.lineWidth = 2.5;
    context.strokeStyle = osColours.black;
    context.stroke();
    for (let bar = 0; bar < 3; bar++) {
      strokeLine(
        context,
        [16 + bar * 7, -4.5],
        [16 + bar * 7, 4.5],
        1.5,
        osColours.black,
      );
    }
    context.restore();
  }
  fillCircle(context, 50, 50, 10, osColours.black);
};

const paintGolfCourse = (context: SymbolCanvas) => {
  paintTouristSquare(context);
  strokeLine(context, [44, 26], [44, 72], 3.5, osColours.white);
  traceShape(context, [
    [46, 26],
    [70, 34],
    [46, 42],
  ]);
  context.fillStyle = osColours.white;
  context.fill();
  context.beginPath();
  context.ellipse(44, 74, 12, 4, 0, 0, Math.PI * 2);
  context.lineWidth = 2.5;
  context.strokeStyle = osColours.white;
  context.stroke();
};

export const mapSymbolPainters: Record<MapSymbol, MapSymbolPainter> = {
  house: paintHouse,
  tree: paintTree,
  road: paintRoad,
  river: paintRiver,
  pond: paintPond,
  bridge: paintBridge,
  field: paintField,
  playground: paintPlayground,
  school: paintSchool,
  "church-with-tower": paintChurchWithTower,
  "church-with-spire": paintChurchWithSpire,
  "post-office": paintPostOffice,
  parking: paintParking,
  "railway-station": paintRailwayStation,
  campsite: paintCampsite,
  "caravan-site": paintCaravanSite,
  "picnic-site": paintPicnicSite,
  viewpoint: paintViewpoint,
  "information-centre": paintInformationCentre,
  telephone: paintTelephone,
  "coniferous-wood": paintConiferousWood,
  "deciduous-wood": paintDeciduousWood,
  motorway: paintMotorway,
  footpath: paintFootpath,
  "railway-line": paintRailwayLine,
  "contour-lines": paintContourLines,
  "spot-height": paintSpotHeight,
  "trig-point": paintTrigPoint,
  lighthouse: paintLighthouse,
  windmill: paintWindmill,
  "golf-course": paintGolfCourse,
};
