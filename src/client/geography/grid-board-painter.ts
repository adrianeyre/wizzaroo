import { gridSquareCount, type GridStyle } from "../../curriculum/geography.js";
import { buildRandom } from "../world-map-terrain.js";
import { geographyPalette, labelFontFamily } from "./geography-kit.js";
import {
  boardTexturePixels,
  findLinePixelAlong,
  findLinePixelUpward,
  gridBottomPixel,
  gridLeftPixel,
  gridRightPixel,
  gridSidePixels,
  gridTopPixel,
  isLabellingSquares,
  type GridAxisLabels,
} from "./grid-board-layout.js";

const landColours = {
  meadow: "#a8cf86",
  pasture: "#94c274",
  barley: "#e6d58c",
  wheat: "#dcc070",
  ploughed: "#c8a57c",
  hedge: "#5d8c45",
  wood: "#4f8a47",
  woodShade: "#3a6d37",
  woodLight: "#6aa65a",
  river: "#5aa9e0",
  riverBank: "#3b84c4",
  road: "#f2e3b3",
  roadCasing: "#8a7a5a",
  roof: "#c4553a",
  roofShade: "#9e3f2a",
  slate: "#6f7884",
  gridLine: "#1f4f8f",
  tick: "#1f4f8f",
} as const;

const fieldColours = [
  landColours.meadow,
  landColours.pasture,
  landColours.barley,
  landColours.wheat,
  landColours.ploughed,
  landColours.pasture,
] as const;

const fieldLattice = 5;

const buildFieldCorners = (): { x: number; y: number }[][] => {
  const random = buildRandom(2207);
  const step = gridSidePixels / fieldLattice;
  return Array.from({ length: fieldLattice + 1 }, (_unused, row) =>
    Array.from({ length: fieldLattice + 1 }, (_other, column) => {
      const isEdgeColumn = column === 0 || column === fieldLattice;
      const isEdgeRow = row === 0 || row === fieldLattice;
      return {
        x:
          gridLeftPixel +
          column * step +
          (isEdgeColumn ? 0 : (random() - 0.5) * step * 0.45),
        y:
          gridTopPixel +
          row * step +
          (isEdgeRow ? 0 : (random() - 0.5) * step * 0.45),
      };
    }),
  );
};

const paintFields = (context: CanvasRenderingContext2D) => {
  const corners = buildFieldCorners();
  const random = buildRandom(77);
  for (let row = 0; row < fieldLattice; row++) {
    for (let column = 0; column < fieldLattice; column++) {
      const upperRow = corners[row];
      const lowerRow = corners[row + 1];
      const topLeft = upperRow[column];
      const topRight = upperRow[column + 1];
      const bottomRight = lowerRow[column + 1];
      const bottomLeft = lowerRow[column];
      context.beginPath();
      context.moveTo(topLeft.x, topLeft.y);
      context.lineTo(topRight.x, topRight.y);
      context.lineTo(bottomRight.x, bottomRight.y);
      context.lineTo(bottomLeft.x, bottomLeft.y);
      context.closePath();
      context.fillStyle =
        fieldColours[Math.floor(random() * fieldColours.length)] ??
        landColours.meadow;
      context.fill();
      context.strokeStyle = landColours.hedge;
      context.lineWidth = 2.5;
      context.stroke();
    }
  }
};

const paintWood = (
  context: CanvasRenderingContext2D,
  centreX: number,
  centreY: number,
  spread: number,
  seed: number,
) => {
  const random = buildRandom(seed);
  const crowns = Array.from({ length: 26 }, () => ({
    x: centreX + (random() - 0.5) * spread * 2,
    y: centreY + (random() - 0.5) * spread * 1.3,
    radius: 6 + random() * 5,
  }));
  context.fillStyle = landColours.woodShade;
  for (const crown of crowns) {
    context.beginPath();
    context.arc(crown.x + 2, crown.y + 2, crown.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = landColours.wood;
  for (const crown of crowns) {
    context.beginPath();
    context.arc(crown.x, crown.y, crown.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = landColours.woodLight;
  for (const crown of crowns) {
    context.beginPath();
    context.arc(
      crown.x - crown.radius * 0.3,
      crown.y - crown.radius * 0.3,
      crown.radius * 0.45,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
};

const traceRiver = (context: CanvasRenderingContext2D) => {
  context.beginPath();
  context.moveTo(gridLeftPixel + 150, gridTopPixel - 4);
  context.bezierCurveTo(
    gridLeftPixel + 90,
    gridTopPixel + 110,
    gridLeftPixel + 250,
    gridTopPixel + 150,
    gridLeftPixel + 210,
    gridTopPixel + 250,
  );
  context.bezierCurveTo(
    gridLeftPixel + 175,
    gridTopPixel + 330,
    gridLeftPixel + 330,
    gridTopPixel + 360,
    gridRightPixel + 4,
    gridBottomPixel - 40,
  );
};

const paintRiver = (context: CanvasRenderingContext2D) => {
  context.lineCap = "round";
  traceRiver(context);
  context.strokeStyle = landColours.riverBank;
  context.lineWidth = 15;
  context.stroke();
  traceRiver(context);
  context.strokeStyle = landColours.river;
  context.lineWidth = 10;
  context.stroke();
  context.beginPath();
  context.ellipse(
    gridLeftPixel + 330,
    gridTopPixel + 70,
    30,
    18,
    -0.3,
    0,
    Math.PI * 2,
  );
  context.fillStyle = landColours.river;
  context.fill();
  context.strokeStyle = landColours.riverBank;
  context.lineWidth = 2.5;
  context.stroke();
};

const traceRoad = (context: CanvasRenderingContext2D) => {
  context.beginPath();
  context.moveTo(gridLeftPixel - 4, gridTopPixel + 300);
  context.bezierCurveTo(
    gridLeftPixel + 120,
    gridTopPixel + 280,
    gridLeftPixel + 160,
    gridTopPixel + 190,
    gridLeftPixel + 270,
    gridTopPixel + 180,
  );
  context.bezierCurveTo(
    gridLeftPixel + 340,
    gridTopPixel + 175,
    gridLeftPixel + 380,
    gridTopPixel + 120,
    gridRightPixel + 4,
    gridTopPixel + 110,
  );
};

const paintRoad = (context: CanvasRenderingContext2D) => {
  context.lineCap = "butt";
  traceRoad(context);
  context.strokeStyle = landColours.roadCasing;
  context.lineWidth = 9;
  context.stroke();
  traceRoad(context);
  context.strokeStyle = landColours.road;
  context.lineWidth = 6;
  context.stroke();
};

const paintVillage = (context: CanvasRenderingContext2D) => {
  const random = buildRandom(5150);
  const villageX = gridLeftPixel + 268;
  const villageY = gridTopPixel + 196;
  for (let index = 0; index < 11; index++) {
    const x = villageX + (random() - 0.5) * 90;
    const y = villageY + (random() - 0.5) * 40 + (index % 2 === 0 ? 14 : -26);
    const width = 9 + random() * 6;
    const height = 7 + random() * 4;
    context.save();
    context.translate(x, y);
    context.rotate((random() - 0.5) * 0.6);
    context.fillStyle = "rgba(0, 0, 0, 0.22)";
    context.fillRect(-width / 2 + 1.5, -height / 2 + 1.5, width, height);
    context.fillStyle = index % 3 === 0 ? landColours.slate : landColours.roof;
    context.fillRect(-width / 2, -height / 2, width, height / 2);
    context.fillStyle =
      index % 3 === 0 ? geographyPalette.rock : landColours.roofShade;
    context.fillRect(-width / 2, 0, width, height / 2);
    context.restore();
  }
};

const paintGridLines = (context: CanvasRenderingContext2D) => {
  context.strokeStyle = landColours.gridLine;
  context.lineCap = "square";
  for (let line = 0; line <= gridSquareCount; line++) {
    const isEdge = line === 0 || line === gridSquareCount;
    context.lineWidth = isEdge ? 3 : 2;
    context.beginPath();
    context.moveTo(findLinePixelAlong(line), gridTopPixel);
    context.lineTo(findLinePixelAlong(line), gridBottomPixel);
    context.moveTo(gridLeftPixel, findLinePixelUpward(line));
    context.lineTo(gridRightPixel, findLinePixelUpward(line));
    context.stroke();
  }
};

const paintTenthTicks = (context: CanvasRenderingContext2D) => {
  context.strokeStyle = landColours.tick;
  context.globalAlpha = 0.75;
  context.lineWidth = 1.2;
  context.beginPath();
  for (let line = 0; line <= gridSquareCount; line++) {
    const alongPixel = findLinePixelAlong(line);
    const upwardPixel = findLinePixelUpward(line);
    for (let tenth = 1; tenth < gridSquareCount * 10; tenth++) {
      if (tenth % 10 === 0) {
        continue;
      }
      const length = tenth % 5 === 0 ? 6 : 3.5;
      const offset = tenth / 10;
      context.moveTo(alongPixel - length, findLinePixelUpward(offset));
      context.lineTo(alongPixel + length, findLinePixelUpward(offset));
      context.moveTo(findLinePixelAlong(offset), upwardPixel - length);
      context.lineTo(findLinePixelAlong(offset), upwardPixel + length);
    }
  }
  context.stroke();
  context.globalAlpha = 1;
};

const paintMargin = (context: CanvasRenderingContext2D) => {
  const gradient = context.createLinearGradient(0, 0, 0, boardTexturePixels);
  gradient.addColorStop(0, geographyPalette.paper);
  gradient.addColorStop(1, geographyPalette.parchment);
  context.fillStyle = gradient;
  context.fillRect(0, 0, boardTexturePixels, boardTexturePixels);
  const random = buildRandom(31);
  context.fillStyle = geographyPalette.parchmentEdge;
  for (let index = 0; index < 900; index++) {
    context.globalAlpha = 0.08 + random() * 0.12;
    context.fillRect(
      random() * boardTexturePixels,
      random() * boardTexturePixels,
      1.5,
      1.5,
    );
  }
  context.globalAlpha = 1;
};

const labelFontPixels = 24;
const labelGapPixels = 8;

const paintAxisLabels = (
  context: CanvasRenderingContext2D,
  style: GridStyle,
  labels: GridAxisLabels,
) => {
  const offset = isLabellingSquares(style) ? 0.5 : 0;
  context.fillStyle = geographyPalette.ink;
  context.font = `800 ${String(labelFontPixels)}px ${labelFontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "top";
  labels.along.forEach((label, index) => {
    context.fillText(
      label,
      findLinePixelAlong(index + offset),
      gridBottomPixel + labelGapPixels,
    );
  });
  context.textAlign = "right";
  context.textBaseline = "middle";
  labels.upward.forEach((label, index) => {
    context.fillText(
      label,
      gridLeftPixel - labelGapPixels,
      findLinePixelUpward(index + offset) + 1,
    );
  });
};

const paintAxisArrows = (context: CanvasRenderingContext2D) => {
  context.strokeStyle = geographyPalette.ink;
  context.fillStyle = geographyPalette.ink;
  context.globalAlpha = 0.45;
  context.lineWidth = 3;
  const arrowY = gridBottomPixel + 54;
  context.beginPath();
  context.moveTo(gridLeftPixel + 40, arrowY);
  context.lineTo(gridRightPixel - 40, arrowY);
  context.stroke();
  context.beginPath();
  context.moveTo(gridRightPixel - 28, arrowY);
  context.lineTo(gridRightPixel - 42, arrowY - 7);
  context.lineTo(gridRightPixel - 42, arrowY + 7);
  context.closePath();
  context.fill();
  const arrowX = 18;
  context.beginPath();
  context.moveTo(arrowX, gridBottomPixel - 40);
  context.lineTo(arrowX, gridTopPixel + 40);
  context.stroke();
  context.beginPath();
  context.moveTo(arrowX, gridTopPixel + 28);
  context.lineTo(arrowX - 7, gridTopPixel + 42);
  context.lineTo(arrowX + 7, gridTopPixel + 42);
  context.closePath();
  context.fill();
  context.globalAlpha = 1;
};

export const paintGridBoard = (
  context: CanvasRenderingContext2D,
  style: GridStyle,
  labels: GridAxisLabels,
) => {
  paintMargin(context);
  context.save();
  context.beginPath();
  context.rect(gridLeftPixel, gridTopPixel, gridSidePixels, gridSidePixels);
  context.clip();
  context.fillStyle = landColours.meadow;
  context.fillRect(gridLeftPixel, gridTopPixel, gridSidePixels, gridSidePixels);
  paintFields(context);
  paintWood(context, gridLeftPixel + 70, gridTopPixel + 70, 46, 12);
  paintWood(context, gridLeftPixel + 340, gridTopPixel + 300, 52, 44);
  paintWood(context, gridLeftPixel + 90, gridTopPixel + 360, 30, 91);
  paintRiver(context);
  paintRoad(context);
  paintVillage(context);
  context.restore();
  if (style === "six-figure") {
    paintTenthTicks(context);
  }
  paintGridLines(context);
  paintAxisLabels(context, style, labels);
  paintAxisArrows(context);
};
