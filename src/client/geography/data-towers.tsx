import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  type BufferGeometry,
  type Group,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { DataBar, GeographyShowOf } from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { buildModelGeometry, type Triple } from "../world-map-models.js";
import {
  buildChartScale,
  describeGridlineValue,
  findBarShare,
  findGridlineValue,
  type ChartScale,
} from "./chart-scale.js";
import {
  drawRoundedRectangle,
  fitLabelFont,
  geographyPalette,
  useMotionScale,
  useCanvasTexture,
  useSceneAge,
} from "./geography-kit.js";

const towerColours = [
  "#ff6b6b",
  "#ffb703",
  "#2ec4b6",
  "#4d96ff",
  "#9b5de5",
  "#8ac926",
] as const;

const floorY = -1.5;
const baseHeight = 0.36;
const baseTop = floorY + baseHeight;
const baseWidth = 3.56;
const baseDepth = 1.25;
const baseCentreZ = 0.02;
const baseFront = baseCentreZ + baseDepth / 2;

const panelWidth = 3.4;
const panelPixelsWide = 512;
const panelPixelsHigh = 320;
const panelHeight = (panelWidth * panelPixelsHigh) / panelPixelsWide;
const panelZ = -0.47;
const panelBottom = baseTop;
const panelTop = panelBottom + panelHeight;
const chartHeight = 1.84;
const axisX = -1.3;
const plotRight = 1.62;

const towerDepth = 0.34;
const towerZ = panelZ + towerDepth / 2 + 0.012;

const labelPixelsHigh = 48;
const labelStripHeight = (panelWidth * labelPixelsHigh) / panelPixelsWide;

const signPixelsWide = 512;
const signPixelsHigh = 96;
const signWidth = 2.7;
const signHeight = (signWidth * signPixelsHigh) / signPixelsWide;
const signCentreY = panelTop + 0.12 + signHeight / 2;
const signZ = panelZ + 0.02;

const growDelaySeconds = 0.35;
const growStaggerSeconds = 0.13;
const growSeconds = 0.85;

const findPanelPixelX = (worldX: number): number =>
  ((worldX + panelWidth / 2) / panelWidth) * panelPixelsWide;

const findPanelPixelY = (worldY: number): number =>
  ((panelTop - worldY) / panelHeight) * panelPixelsHigh;

const findTowerSlotWidth = (towerCount: number): number =>
  (plotRight - axisX - 0.12) / towerCount;

const findTowerX = (index: number, towerCount: number): number =>
  axisX + 0.12 + findTowerSlotWidth(towerCount) * (index + 0.5);

const findTowerWidth = (towerCount: number): number =>
  Math.min(0.46, findTowerSlotWidth(towerCount) * 0.64);

const easeOutCubic = (progress: number): number => 1 - (1 - progress) ** 3;

const paintChartPanel = (
  context: CanvasRenderingContext2D,
  scale: ChartScale,
  unit: string | undefined,
) => {
  context.fillStyle = "#fbf9ff";
  context.fillRect(0, 0, panelPixelsWide, panelPixelsHigh);
  const glow = context.createLinearGradient(0, 0, 0, panelPixelsHigh);
  glow.addColorStop(0, "rgba(155, 140, 255, 0.10)");
  glow.addColorStop(1, "rgba(155, 140, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, panelPixelsWide, panelPixelsHigh);

  const axisPixel = findPanelPixelX(axisX);
  const rightPixel = findPanelPixelX(plotRight);
  for (let line = 1; line <= scale.lineCount; line++) {
    const linePixel = findPanelPixelY(
      baseTop + (line / scale.lineCount) * chartHeight,
    );
    context.strokeStyle = "rgba(38, 26, 77, 0.22)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(axisPixel, linePixel);
    context.lineTo(rightPixel, linePixel);
    context.stroke();
    context.strokeStyle = geographyPalette.ink;
    context.beginPath();
    context.moveTo(axisPixel - 7, linePixel);
    context.lineTo(axisPixel, linePixel);
    context.stroke();
  }

  context.fillStyle = geographyPalette.ink;
  context.textAlign = "right";
  context.textBaseline = "middle";
  for (let line = 0; line <= scale.lineCount; line++) {
    const text = describeGridlineValue(findGridlineValue(scale, line));
    fitLabelFont(context, text, 24, axisPixel - 14);
    context.fillText(
      text,
      axisPixel - 10,
      Math.min(
        findPanelPixelY(baseTop + (line / scale.lineCount) * chartHeight) + 1,
        panelPixelsHigh - 12,
      ),
    );
  }

  context.strokeStyle = geographyPalette.ink;
  context.lineWidth = 4;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(axisPixel, findPanelPixelY(baseTop + chartHeight) - 14);
  context.lineTo(axisPixel, findPanelPixelY(baseTop));
  context.stroke();

  if (unit !== undefined) {
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillStyle = "#4a3f80";
    fitLabelFont(context, unit, 22, 300);
    context.fillText(unit, axisPixel + 12, 18);
  }
};

const paintTowerLabels = (
  context: CanvasRenderingContext2D,
  bars: DataBar[],
) => {
  const gradient = context.createLinearGradient(0, 0, 0, labelPixelsHigh);
  gradient.addColorStop(0, "#fff7e6");
  gradient.addColorStop(1, "#f1e3c4");
  context.fillStyle = gradient;
  context.fillRect(0, 0, panelPixelsWide, labelPixelsHigh);
  const slotPixels =
    (findTowerSlotWidth(bars.length) / panelWidth) * panelPixelsWide;
  context.textAlign = "center";
  context.textBaseline = "middle";
  bars.forEach((bar, index) => {
    const centre = findPanelPixelX(findTowerX(index, bars.length));
    context.fillStyle = towerColours[index % towerColours.length] ?? "#ffffff";
    drawRoundedRectangle(context, centre - 10, 4, 20, 5, 2.5);
    context.fill();
    context.fillStyle = geographyPalette.ink;
    fitLabelFont(context, bar.label, 26, slotPixels - 8);
    context.fillText(bar.label, centre, labelPixelsHigh / 2 + 4);
  });
};

const paintTitleSign = (context: CanvasRenderingContext2D, title: string) => {
  drawRoundedRectangle(
    context,
    3,
    3,
    signPixelsWide - 6,
    signPixelsHigh - 6,
    22,
  );
  context.fillStyle = "#fffaf0";
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = "#7a6fd1";
  context.stroke();
  context.fillStyle = geographyPalette.ink;
  context.textAlign = "center";
  context.textBaseline = "middle";
  fitLabelFont(context, title, 44, signPixelsWide - 48);
  context.fillText(title, signPixelsWide / 2, signPixelsHigh / 2 + 3);
};

const buildStageGeometry = (): BufferGeometry => {
  const panelFrameCentreY = (panelBottom + panelTop) / 2;
  const postHeight = signCentreY - panelTop + 0.05;
  return buildModelGeometry([
    {
      geometry: new RoundedBoxGeometry(
        baseWidth,
        baseHeight - 0.02,
        baseDepth,
        2,
        0.06,
      ),
      colour: "#5b4a9e",
      position: [0, floorY + (baseHeight - 0.02) / 2, baseCentreZ],
    },
    {
      geometry: new BoxGeometry(baseWidth - 0.1, 0.03, baseDepth - 0.1),
      colour: "#d9d2f5",
      position: [0, baseTop - 0.015, baseCentreZ],
    },
    {
      geometry: new BoxGeometry(panelWidth + 0.14, panelHeight + 0.1, 0.07),
      colour: "#3e3275",
      position: [0, panelFrameCentreY + 0.03, panelZ - 0.04],
    },
    ...[-1, 1].flatMap((side) => [
      {
        geometry: new CylinderGeometry(0.035, 0.035, postHeight, 10),
        colour: geographyPalette.brass,
        position: [
          side * signWidth * 0.36,
          panelTop + postHeight / 2,
          signZ - 0.03,
        ] satisfies Triple,
      },
      {
        geometry: new SphereGeometry(0.06, 12, 8),
        colour: "#ffd23f",
        position: [
          side * (baseWidth / 2 - 0.16),
          baseTop + 0.07,
          baseFront - 0.14,
        ] satisfies Triple,
      },
    ]),
    {
      geometry: new BoxGeometry(signWidth + 0.1, signHeight + 0.1, 0.05),
      colour: "#3e3275",
      position: [0, signCentreY, signZ - 0.035],
    },
  ]);
};

interface TowerPlan {
  label: string;
  height: number;
  x: number;
  width: number;
  colour: string;
}

const buildTowerPlans = (bars: DataBar[], scale: ChartScale): TowerPlan[] =>
  bars.map((bar, index) => ({
    label: bar.label,
    height: findBarShare(scale, bar.value) * chartHeight,
    x: findTowerX(index, bars.length),
    width: findTowerWidth(bars.length),
    colour: towerColours[index % towerColours.length] ?? "#ffffff",
  }));

const buildTowerGeometry = (width: number, height: number): BufferGeometry => {
  const geometry = new RoundedBoxGeometry(
    width,
    height,
    towerDepth,
    2,
    Math.min(0.06, height / 2, width / 4),
  );
  geometry.translate(0, height / 2, 0);
  return geometry;
};

const Tower = ({ plan, order }: { plan: TowerPlan; order: number }) => {
  const geometry = useMemo(
    () => buildTowerGeometry(plan.width, plan.height),
    [plan.width, plan.height],
  );
  useDisposedOnUnmount(geometry);
  const tower = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    const progress =
      motionScale === 0
        ? 1
        : Math.min(
            1,
            Math.max(
              0,
              (age.current - growDelaySeconds - order * growStaggerSeconds) /
                growSeconds,
            ),
          );
    tower.current?.scale.set(1, Math.max(0.0001, easeOutCubic(progress)), 1);
  });

  return (
    <group
      ref={tower}
      position={[plan.x, baseTop, towerZ]}
      scale={[1, motionScale === 0 ? 1 : 0.0001, 1]}
      name={`tower-${plan.label}`}
    >
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color={plan.colour}
          roughness={0.35}
          clearcoat={0.9}
          clearcoatRoughness={0.2}
        />
      </mesh>
    </group>
  );
};

export const DataTowersScene = ({
  show,
}: {
  show: GeographyShowOf<"data-towers">;
}) => {
  const { title, unit, bars } = show;
  const scale = useMemo(
    () => buildChartScale(Math.max(0, ...bars.map((bar) => bar.value))),
    [bars],
  );
  const towers = useMemo(() => buildTowerPlans(bars, scale), [bars, scale]);
  const stage = useBuiltGeometry(buildStageGeometry);

  const paintPanel = useCallback(
    (context: CanvasRenderingContext2D) => {
      paintChartPanel(context, scale, unit);
    },
    [scale, unit],
  );
  const paintLabels = useCallback(
    (context: CanvasRenderingContext2D) => {
      paintTowerLabels(context, bars);
    },
    [bars],
  );
  const paintSign = useCallback(
    (context: CanvasRenderingContext2D) => {
      paintTitleSign(context, title);
    },
    [title],
  );
  const panel = useCanvasTexture(panelPixelsWide, panelPixelsHigh, paintPanel);
  const labels = useCanvasTexture(
    panelPixelsWide,
    labelPixelsHigh,
    paintLabels,
  );
  const sign = useCanvasTexture(signPixelsWide, signPixelsHigh, paintSign);

  return (
    <group name={show.scene}>
      <mesh geometry={stage}>
        <meshStandardMaterial vertexColors roughness={0.55} />
      </mesh>
      <mesh position={[0, (panelBottom + panelTop) / 2, panelZ]}>
        <planeGeometry args={[panelWidth, panelHeight]} />
        <meshStandardMaterial
          key={panel === undefined ? "plain" : "painted"}
          color={panel === undefined ? "#fbf9ff" : "#ffffff"}
          map={panel ?? null}
          roughness={0.9}
        />
      </mesh>
      <mesh
        position={[0, floorY + baseHeight / 2, baseFront + 0.004]}
        name="tower-labels"
      >
        <planeGeometry args={[panelWidth, labelStripHeight]} />
        <meshStandardMaterial
          key={labels === undefined ? "plain" : "painted"}
          color={labels === undefined ? "#fff7e6" : "#ffffff"}
          map={labels ?? null}
          roughness={0.8}
        />
      </mesh>
      <mesh position={[0, signCentreY, signZ]} name="chart-title">
        <planeGeometry args={[signWidth, signHeight]} />
        <meshStandardMaterial
          key={sign === undefined ? "plain" : "painted"}
          color={sign === undefined ? "#fffaf0" : "#ffffff"}
          map={sign ?? null}
          transparent
          roughness={0.7}
        />
      </mesh>
      {towers.map((plan, index) =>
        plan.height > 0 ? (
          <Tower
            key={`${plan.label}-${String(index)}`}
            plan={plan}
            order={index}
          />
        ) : null,
      )}
    </group>
  );
};
