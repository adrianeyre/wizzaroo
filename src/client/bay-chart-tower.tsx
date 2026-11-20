import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  type Group,
} from "three";
import type {
  ChartBar,
  ChartPicture,
  PieSlice,
} from "../curriculum/chart-tower.js";
import { formatNumber } from "../curriculum/number-format.js";
import type { PaintCanvas } from "./bay-block-measures.js";
import { mergePaintedGeometries } from "./bay-place-value.js";
import {
  LabelSprite,
  PaintedBoard,
  PaintedMaterial,
  PieceInstances,
  findBoardPoint,
  paintText,
  picturePalette,
  type BoardSize,
  type Piece,
  type Vector,
} from "./bay-picture-parts.js";
import {
  findGrowth,
  promptGrowSeconds,
  usePromptGrowth,
  usePromptPosition,
} from "./bay-stage.js";
import { useDisposedOnUnmount } from "./studio-stage.js";

const chartColours = ["#ff7a59", "#4cc9f0", "#ffd23f", "#b388ff", "#5fd39a"];

const chartBoard: BoardSize = {
  width: 2.6,
  height: 1.95,
  canvasWidth: 512,
  canvasHeight: 384,
};

const plot = { left: 0.2, right: 0.95, bottom: 0.2, top: 0.86 };
const plotWidth = plot.right - plot.left;
const plotHeight = plot.top - plot.bottom;
const pieceDepth = 0.08;

interface ChartLabel {
  text: string;
  position: Vector;
}

interface ChartLayout {
  bars: Piece[];
  ghostBars: Piece[];
  symbols: Piece[];
  sticks: Piece[];
  points: Piece[];
  segments: Piece[];
  labels: ChartLabel[];
  paint: PaintCanvas;
}

const emptyLayout = {
  bars: [],
  ghostBars: [],
  symbols: [],
  sticks: [],
  points: [],
  segments: [],
  labels: [],
};

export const findAxisTop = (values: readonly number[], step: number) =>
  Math.max(step, Math.ceil(Math.max(...values) / step) * step);

const placeOnBoard = (across: number, up: number, depth = pieceDepth): Vector =>
  findBoardPoint(chartBoard, across, up, depth);

const findColumnCentre = (index: number, count: number) =>
  plot.left + ((index + 0.5) * plotWidth) / count;

const findRowCentre = (index: number, count: number) =>
  plot.top - ((index + 0.5) * plotHeight) / count;

const paintBackground = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  const fill = context.createLinearGradient(0, 0, 0, height);
  fill.addColorStop(0, "#1d4263");
  fill.addColorStop(1, picturePalette.board);
  context.fillStyle = fill;
  context.fillRect(0, 0, width, height);
};

const paintValueAxis = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  axisTop: number,
  step: number,
  unit: string,
) => {
  const tickStep = axisTop / step > 10 ? step * 2 : step;
  for (let value = 0; value <= axisTop; value += tickStep) {
    const y = (1 - (plot.bottom + (value / axisTop) * plotHeight)) * height;
    context.strokeStyle = picturePalette.softInk;
    context.globalAlpha = value === 0 ? 1 : 0.35;
    context.lineWidth = value === 0 ? 4 : 2;
    context.beginPath();
    context.moveTo(plot.left * width, y);
    context.lineTo(plot.right * width, y);
    context.stroke();
    context.globalAlpha = 1;
    paintText(
      context,
      `${formatNumber(value)}${unit}`,
      plot.left * width - 10,
      y,
      20,
      picturePalette.ink,
      "right",
    );
  }
  context.strokeStyle = picturePalette.softInk;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(plot.left * width, (1 - plot.bottom) * height);
  context.lineTo(plot.left * width, (1 - plot.top) * height - 8);
  context.stroke();
};

const paintColumnLabels = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  labels: readonly string[],
) => {
  labels.forEach((label, index) => {
    paintText(
      context,
      label,
      findColumnCentre(index, labels.length) * width,
      (1 - plot.bottom) * height + 24,
      labels.length > 5 ? 17 : 21,
    );
  });
};

const paintRowLabels = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  labels: readonly string[],
) => {
  labels.forEach((label, index) => {
    paintText(
      context,
      label,
      plot.left * width - 10,
      (1 - findRowCentre(index, labels.length)) * height,
      22,
      picturePalette.ink,
      "right",
    );
  });
};

const paintHeading = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  heading: string,
) => {
  paintText(
    context,
    heading,
    width / 2,
    height * 0.07,
    22,
    picturePalette.gold,
  );
};

const buildColumnLayout = (
  bars: readonly ChartBar[],
  step: number,
  hiddenLabel: string | undefined,
  isBlocks: boolean,
): ChartLayout => {
  const axisTop = findAxisTop(
    bars.map(({ value }) => value),
    step,
  );
  const columnWidth = (plotWidth / bars.length) * 0.56;
  const boardColumnWidth = columnWidth * chartBoard.width;
  const unitHeight = (plotHeight * chartBoard.height) / axisTop;
  const visible = bars.filter(({ label }) => label !== hiddenLabel);
  const findBarPiece = ({ value }: ChartBar, index: number): Piece => {
    const [x, baseY] = placeOnBoard(
      findColumnCentre(index, bars.length),
      plot.bottom,
    );
    const height = value * unitHeight;
    return {
      position: [x, baseY + height / 2, pieceDepth],
      scale: [boardColumnWidth, height, 0.16],
      colour: chartColours[index % chartColours.length],
    };
  };
  const blocks = isBlocks
    ? bars.flatMap(({ value }, index) =>
        Array.from({ length: value }, (_, level): Piece => {
          const [x, baseY] = placeOnBoard(
            findColumnCentre(index, bars.length),
            plot.bottom,
          );
          return {
            position: [x, baseY + (level + 0.5) * unitHeight, pieceDepth],
            scale: [
              Math.min(boardColumnWidth, unitHeight * 1.6) * 0.9,
              unitHeight * 0.9,
              0.14,
            ],
            colour: chartColours[index % chartColours.length],
          };
        }),
      )
    : [];
  const hiddenIndex = bars.findIndex(({ label }) => label === hiddenLabel);
  return {
    ...emptyLayout,
    bars: isBlocks
      ? blocks
      : visible.map((bar) => findBarPiece(bar, bars.indexOf(bar))),
    ghostBars:
      hiddenIndex === -1
        ? []
        : [findBarPiece({ label: "?", value: axisTop }, hiddenIndex)],
    labels:
      hiddenIndex === -1
        ? []
        : [
            {
              text: "?",
              position: placeOnBoard(
                findColumnCentre(hiddenIndex, bars.length),
                plot.bottom + plotHeight * 0.5,
                0.3,
              ),
            },
          ],
    paint: (context, width, height) => {
      paintBackground(context, width, height);
      paintValueAxis(context, width, height, axisTop, step, "");
      paintColumnLabels(
        context,
        width,
        height,
        bars.map(({ label }) => label),
      );
    },
  };
};

const symbolPitch = 0.066;

const buildPictogramLayout = (
  bars: readonly ChartBar[],
  symbolValue: number,
): ChartLayout => ({
  ...emptyLayout,
  symbols: bars.flatMap(({ value }, row) => {
    const wholeSymbols = Math.floor(value / symbolValue);
    const hasHalf = value % symbolValue !== 0;
    return Array.from(
      { length: wholeSymbols + (hasHalf ? 1 : 0) },
      (_, index): Piece => {
        const isHalf = index === wholeSymbols;
        const [x, y] = placeOnBoard(
          plot.left + 0.05 + index * symbolPitch,
          findRowCentre(row, bars.length),
        );
        return {
          position: [isHalf ? x - 0.04 : x, y, pieceDepth],
          scale: [isHalf ? 0.5 : 1, 1, 1],
          colour: chartColours[row % chartColours.length],
        };
      },
    );
  }),
  paint: (context, width, height) => {
    paintBackground(context, width, height);
    paintRowLabels(
      context,
      width,
      height,
      bars.map(({ label }) => label),
    );
    paintHeading(
      context,
      width,
      height,
      symbolValue === 1
        ? "Each shell stands for 1"
        : `Each shell stands for ${formatNumber(symbolValue)}`,
    );
  },
});

const tallyPitch = 0.024;
const tallyGroupGap = 0.03;

const buildTallyLayout = (bars: readonly ChartBar[]): ChartLayout => ({
  ...emptyLayout,
  sticks: bars.flatMap(({ value }, row) =>
    Array.from({ length: value }, (_, index): Piece => {
      const group = Math.floor(index / 5);
      const inGroup = index % 5;
      const groupStart =
        plot.left + 0.05 + group * (4 * tallyPitch + tallyGroupGap);
      const [, y] = placeOnBoard(0, findRowCentre(row, bars.length));
      if (inGroup === 4) {
        const [x] = placeOnBoard(groupStart + 1.5 * tallyPitch, 0);
        return {
          position: [x, y, pieceDepth + 0.02],
          rotation: [0, 0, -1.05],
          scale: [0.022, 0.24, 0.022],
          colour: picturePalette.gold,
        };
      }
      const [x] = placeOnBoard(groupStart + inGroup * tallyPitch, 0);
      return {
        position: [x, y, pieceDepth],
        scale: [0.022, 0.18, 0.022],
        colour: picturePalette.ink,
      };
    }),
  ),
  paint: (context, width, height) => {
    paintBackground(context, width, height);
    paintRowLabels(
      context,
      width,
      height,
      bars.map(({ label }) => label),
    );
    paintHeading(context, width, height, "Tally chart");
  },
});

const buildLineLayout = (
  points: readonly ChartBar[],
  step: number,
  unit: string,
): ChartLayout => {
  const axisTop = findAxisTop(
    points.map(({ value }) => value),
    step,
  );
  const placed = points.map(({ value }, index) =>
    placeOnBoard(
      findColumnCentre(index, points.length),
      plot.bottom + (value / axisTop) * plotHeight,
    ),
  );
  return {
    ...emptyLayout,
    points: placed.map((position): Piece => ({
      position,
      scale: [0.045, 0.045, 0.045],
      colour: picturePalette.gold,
    })),
    segments: placed.slice(1).map((to, index): Piece => {
      const from = placed[index];
      const across = to[0] - from[0];
      const up = to[1] - from[1];
      return {
        position: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, pieceDepth],
        rotation: [0, 0, Math.atan2(up, across) - Math.PI / 2],
        scale: [0.016, Math.hypot(across, up), 0.016],
        colour: chartColours[1],
      };
    }),
    paint: (context, width, height) => {
      paintBackground(context, width, height);
      paintValueAxis(context, width, height, axisTop, step, unit.trim());
      paintColumnLabels(
        context,
        width,
        height,
        points.map(({ label }) => label),
      );
    },
  };
};

const buildTimetableLayout = (
  stops: readonly string[],
  departures: readonly (readonly string[])[],
): ChartLayout => ({
  ...emptyLayout,
  paint: (context, width, height) => {
    context.fillStyle = "#f6ead0";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#a07a45";
    context.lineWidth = 10;
    context.strokeRect(5, 5, width - 10, height - 10);
    const rowHeight = height / (stops.length + 2);
    const nameWidth = width * 0.4;
    const columnWidth = (width - nameWidth - 20) / departures.length;
    paintText(
      context,
      "Ferry timetable",
      width / 2,
      rowHeight * 0.7,
      28,
      "#9a3412",
    );
    stops.forEach((stop, stopIndex) => {
      const y = rowHeight * (stopIndex + 1.8);
      context.fillStyle = stopIndex % 2 === 0 ? "#efdcb2" : "#f6ead0";
      context.fillRect(14, y - rowHeight / 2, width - 28, rowHeight);
      paintText(context, stop, 24, y, 24, "#2d2014", "left");
      departures.forEach((times, column) => {
        paintText(
          context,
          times[stopIndex],
          nameWidth + (column + 0.5) * columnWidth,
          y,
          26,
          "#2d2014",
        );
      });
    });
  },
});

type BoardPicture = Exclude<ChartPicture, { kind: "pie" }>;

export const buildChartLayout = (picture: BoardPicture): ChartLayout => {
  switch (picture.kind) {
    case "pictogram":
      return buildPictogramLayout(picture.bars, picture.symbolValue);
    case "tally":
      return buildTallyLayout(picture.bars);
    case "blocks":
      return buildColumnLayout(picture.bars, 1, undefined, true);
    case "bar-chart":
      return buildColumnLayout(
        picture.bars,
        picture.scaleStep,
        picture.hiddenLabel,
        false,
      );
    case "line-graph":
      return buildLineLayout(picture.points, picture.scaleStep, picture.unit);
    case "timetable":
      return buildTimetableLayout(picture.stops, picture.departures);
  }
};

const buildScallopGeometry = () =>
  mergePaintedGeometries([
    {
      geometry: new CylinderGeometry(
        0.085,
        0.085,
        0.025,
        7,
        1,
        false,
        Math.PI - 1.1,
        2.2,
      )
        .rotateX(Math.PI / 2)
        .translate(0, -0.04, 0),
      colour: "#ffffff",
    },
    {
      geometry: new BoxGeometry(0.04, 0.022, 0.03).translate(0, -0.045, 0),
      colour: "#ffffff",
    },
  ]);

const useChartGeometries = () => {
  const geometries = useMemo(
    () => ({
      bar: new BoxGeometry(1, 1, 1),
      scallop: buildScallopGeometry(),
      stick: new BoxGeometry(1, 1, 1),
      point: new SphereGeometry(1, 10, 8),
      segment: new CylinderGeometry(1, 1, 1, 6),
    }),
    [],
  );
  useDisposedOnUnmount(geometries.bar);
  useDisposedOnUnmount(geometries.scallop);
  useDisposedOnUnmount(geometries.stick);
  useDisposedOnUnmount(geometries.point);
  useDisposedOnUnmount(geometries.segment);
  return geometries;
};

const BoardChart = ({ picture }: { picture: BoardPicture }) => {
  const geometries = useChartGeometries();
  const layout = useMemo(() => buildChartLayout(picture), [picture]);
  return (
    <group name="chart-board">
      <PaintedBoard size={chartBoard} paint={layout.paint} />
      <PieceInstances
        pieces={layout.bars}
        geometry={geometries.bar}
        name="chart-bars"
        staggerSeconds={0.06}
      >
        <meshPhysicalMaterial
          roughness={0.3}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
        />
      </PieceInstances>
      <PieceInstances
        pieces={layout.ghostBars}
        geometry={geometries.bar}
        name="chart-hidden-bar"
      >
        <meshPhysicalMaterial
          color={picturePalette.ghost}
          roughness={0.2}
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </PieceInstances>
      <PieceInstances
        pieces={layout.symbols}
        geometry={geometries.scallop}
        name="chart-symbols"
      >
        <PaintedMaterial />
      </PieceInstances>
      <PieceInstances
        pieces={layout.sticks}
        geometry={geometries.stick}
        name="chart-tally"
        staggerSeconds={0.02}
      >
        <meshPhysicalMaterial roughness={0.4} clearcoat={0.5} />
      </PieceInstances>
      <PieceInstances
        pieces={layout.segments}
        geometry={geometries.segment}
        name="chart-line"
        staggerSeconds={0.08}
      >
        <meshPhysicalMaterial roughness={0.3} clearcoat={0.6} />
      </PieceInstances>
      <PieceInstances
        pieces={layout.points}
        geometry={geometries.point}
        name="chart-points"
        staggerSeconds={0.08}
      >
        <meshPhysicalMaterial
          roughness={0.15}
          clearcoat={1}
          emissive={picturePalette.gold}
          emissiveIntensity={0.25}
        />
      </PieceInstances>
      {layout.labels.map(({ text, position }) => (
        <LabelSprite key={text} text={text} position={position} />
      ))}
    </group>
  );
};

const pieRadius = 0.95;
const pieExplode = 0.07;

interface PieWedge {
  slice: PieSlice;
  start: number;
  length: number;
  middle: number;
}

export const listPieWedges = (
  slices: readonly PieSlice[],
  wholeParts: number,
): PieWedge[] => {
  let start = 0;
  return slices.map((slice) => {
    const length = (slice.parts / wholeParts) * Math.PI * 2;
    const wedge = { slice, start, length, middle: start + length / 2 };
    start += length;
    return wedge;
  });
};

const describeWedge = ({ label, parts }: PieSlice, wholeParts: number) =>
  wholeParts === 360 ? `${label} ${formatNumber(parts)}°` : label;

const SandDollarPie = ({
  slices,
  wholeParts,
}: {
  slices: readonly PieSlice[];
  wholeParts: number;
}) => {
  const { age, motionScale } = usePromptGrowth();
  const wedges = useMemo(
    () => listPieWedges(slices, wholeParts),
    [slices, wholeParts],
  );
  const wedgeGroups = useRef<(Group | null)[]>([]);

  useFrame(() => {
    const opening = findGrowth(
      age.current - 0.3,
      promptGrowSeconds * 2,
      motionScale,
    );
    wedges.forEach(({ middle }, index) => {
      wedgeGroups.current[index]?.position.set(
        Math.sin(middle) * pieExplode * opening,
        Math.cos(middle) * pieExplode * opening,
        0,
      );
    });
  });

  return (
    <group name="sand-dollar-pie" rotation={[-0.35, 0, 0]}>
      {wedges.map(({ start, length }, index) => (
        <group
          key={start}
          ref={(wedge) => {
            wedgeGroups.current[index] = wedge;
          }}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} name="pie-slice">
            <cylinderGeometry
              args={[pieRadius, pieRadius, 0.12, 40, 1, false, start, length]}
            />
            <meshPhysicalMaterial
              color={chartColours[index % chartColours.length]}
              roughness={0.45}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
              sheen={0.5}
              sheenColor={picturePalette.sand}
            />
          </mesh>
        </group>
      ))}
      {wedges.map(({ slice, middle }) => (
        <LabelSprite
          key={slice.label}
          text={describeWedge(slice, wholeParts)}
          position={[
            Math.sin(middle) * pieRadius * 0.62,
            Math.cos(middle) * pieRadius * 0.62,
            0.2,
          ]}
          height={0.2}
        />
      ))}
    </group>
  );
};

export const ChartTowerScene = ({ picture }: { picture: ChartPicture }) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const grower = useRef<Group>(null);

  useFrame(() => {
    const body = grower.current;
    if (body === null) {
      return;
    }
    body.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    body.rotation.y = -0.12 + Math.sin(age.current * 0.4) * 0.04 * motionScale;
  });

  return (
    <group position={position} name="chart-tower">
      <group ref={grower}>
        {picture.kind === "pie" ? (
          <SandDollarPie
            slices={picture.slices}
            wholeParts={picture.wholeParts}
          />
        ) : (
          <group rotation={[-0.12, 0, 0]}>
            <BoardChart picture={picture} />
          </group>
        )}
      </group>
    </group>
  );
};
