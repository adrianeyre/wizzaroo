import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Object3D,
  SRGBColorSpace,
  type Group,
  type InstancedMesh,
  type MeshPhysicalMaterial,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { AdditionQuestion } from "../curriculum/adding-to-20.js";
import type { MoreAndLessQuestion } from "../curriculum/more-and-less.js";
import { formatNumber } from "../curriculum/number-format.js";
import type { PlaceValueColumn } from "../curriculum/place-value.js";
import type { TakingAwayQuestion } from "../curriculum/taking-away-within-20.js";
import {
  findGrowth,
  promptGrowSeconds,
  usePromptGrowth,
  usePromptPosition,
} from "./bay-stage.js";
import { useDisposedOnUnmount } from "./studio-stage.js";

export const counterPalette = {
  values: {
    "1000000": "#4c2a85",
    "100000": "#0f6e6a",
    "10000": "#2f3f8f",
    "1000": "#b9771a",
    "100": "#a3233a",
    "10": "#1f5fa8",
    "1": "#1d7d4f",
    "0.1": "#b04a6f",
    "0.01": "#4f5d6e",
    "0.001": "#6b4f2e",
  },
  fallback: "#3d5368",
  faceInk: "#ffffff",
  headerInk: "#e8f4fb",
  headerRule: "#9be7ff",
  sign: "#d9e6ef",
  glow: "#f2b63d",
} as const;

const thousandths = 1000;
const largestPlace = 1_000_000_000_000;
const mostColumns = 6;
const counterGap = 1;
const counterRadius = 0.42;
const counterDepth = 0.16;
const discSegments = 16;
const columnGutter = 0.55;
const rowGap = 0.7;
const headerGap = 0.75;
const headerHeight = 0.42;
const fitWidth = 4.6;
const fitHeight = 2.3;
const largestScale = 0.42;
const appearStaggerSeconds = 0.025;
const leaveDelaySeconds = 1.1;
const leaveSeconds = 1.1;
const faceTextureSize = 128;
const headerTextureSize = { width: 256, height: 64 };

const toThousandths = (value: number) => Math.round(value * thousandths);

const listPlacesInThousandths = (): number[] => {
  const places: number[] = [];
  for (let place = largestPlace; place >= 1; place /= 10) {
    places.push(place);
  }
  return places;
};

const findHighestPlace = (amount: number) =>
  listPlacesInThousandths().find((place) => amount >= place);

const findLowestPlace = (amount: number) =>
  listPlacesInThousandths()
    .toReversed()
    .find((place) => Math.floor(amount / place) % 10 !== 0);

export const listCounterColumns = (numbers: readonly number[]): number[] => {
  const amounts = numbers.map((number) => Math.abs(toThousandths(number)));
  const highest = Math.max(
    ...amounts.map((amount) => findHighestPlace(amount) ?? 0),
  );
  const lowest = Math.min(
    ...amounts.map((amount) => findLowestPlace(amount) ?? largestPlace),
  );
  if (highest === 0) {
    return [1];
  }
  return listPlacesInThousandths()
    .filter((place) => place <= highest && place >= lowest)
    .map((place) => place / thousandths);
};

export const splitIntoColumns = (
  number: number,
  columnValues: readonly number[],
): number[] => {
  let remaining = Math.abs(toThousandths(number));
  return columnValues.map((value) => {
    const place = toThousandths(value);
    const count = Math.floor(remaining / place);
    remaining -= count * place;
    return count;
  });
};

const limitColumns = (columnValues: readonly number[]) =>
  columnValues.slice(0, mostColumns);

export interface ExchangedTakeAway {
  shown: number[];
  taken: number[];
  exchangedColumns: number[];
}

export const exchangeForTakingAway = (
  start: readonly number[],
  taken: readonly number[],
): ExchangedTakeAway => {
  const shown = [...start];
  const exchangedColumns = new Set<number>();
  for (let column = shown.length - 1; column >= 0; column--) {
    if (shown[column] >= taken[column]) {
      continue;
    }
    let lender = column - 1;
    while (lender >= 0 && shown[lender] === 0) {
      lender--;
    }
    if (lender < 0) {
      continue;
    }
    for (let receiver = lender; receiver < column; receiver++) {
      shown[receiver] -= 1;
      shown[receiver + 1] += 10;
      exchangedColumns.add(receiver + 1);
    }
  }
  return {
    shown,
    taken: [...taken],
    exchangedColumns: [...exchangedColumns],
  };
};

type Spot = [number, number];

export interface CounterLayout {
  columnSpots: Spot[][][];
  headers: { x: number; width: number }[];
  headerY: number;
  signSpot: Spot | undefined;
  width: number;
  height: number;
}

export const buildCounterLayout = (
  rows: readonly (readonly number[])[],
  gridHeight: number,
  hasSign: boolean,
): CounterLayout => {
  const columnCount = rows[0]?.length ?? 0;
  const subColumns = Array.from({ length: columnCount }, (_, column) =>
    Math.max(
      2,
      ...rows.map((counts) => Math.ceil(counts[column] / gridHeight)),
    ),
  );
  const signWidth = hasSign ? counterGap * 1.4 : 0;
  const columnLefts = subColumns.map(
    (_width, column) =>
      signWidth +
      subColumns
        .slice(0, column)
        .reduce((total, width) => total + width * counterGap + columnGutter, 0),
  );
  const width =
    signWidth +
    subColumns.reduce((total, columns) => total + columns * counterGap, 0) +
    columnGutter * Math.max(0, columnCount - 1);
  const rowHeight = gridHeight * counterGap;
  const rowsHeight = rows.length * rowHeight + (rows.length - 1) * rowGap;
  const height = rowsHeight + headerGap + headerHeight;
  const top = height / 2 - headerGap - headerHeight;
  const left = -width / 2;
  const findRowTop = (row: number) => top - row * (rowHeight + rowGap);
  const columnSpots = rows.map((counts, row) =>
    counts.map((count, column) =>
      Array.from({ length: count }, (_, index): Spot => {
        const subColumn = Math.floor(index / gridHeight);
        const slot = index % gridHeight;
        return [
          left + columnLefts[column] + (subColumn + 0.5) * counterGap,
          findRowTop(row) - (slot + 0.5) * counterGap,
        ];
      }),
    ),
  );
  return {
    columnSpots,
    headers: subColumns.map((columns, column) => ({
      x: left + columnLefts[column] + (columns * counterGap) / 2,
      width: columns * counterGap,
    })),
    headerY: height / 2 - headerHeight / 2,
    signSpot: hasSign
      ? [
          left + signWidth / 2 - 0.15,
          findRowTop(rows.length - 1) - rowHeight / 2,
        ]
      : undefined,
    width,
    height,
  };
};

const findCounterColour = (value: number): string => {
  const key = formatNumber(value).replaceAll(",", "");
  return (
    Object.entries(counterPalette.values).find(
      ([valueKey]) => valueKey === key,
    )?.[1] ?? counterPalette.fallback
  );
};

const findTextSize = (text: string, size: number) =>
  Math.round(size * Math.min(0.46, 1.5 / Math.max(text.length, 1)));

type PaintLabel = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  colour: string,
) => void;

const labelFont = (size: number) =>
  `800 ${String(size)}px "Baloo 2 Variable", "Baloo 2", sans-serif`;

const paintFace: PaintLabel = (context, width, height, text, colour) => {
  const middle = width / 2;
  const sheen = context.createRadialGradient(
    middle * 0.7,
    middle * 0.6,
    4,
    middle,
    middle,
    middle,
  );
  sheen.addColorStop(
    0,
    new Color(colour).lerp(new Color("#ffffff"), 0.28).getStyle(),
  );
  sheen.addColorStop(1, colour);
  context.fillStyle = sheen;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = counterPalette.faceInk;
  context.globalAlpha = 0.55;
  context.lineWidth = width * 0.035;
  context.beginPath();
  context.arc(middle, middle, middle * 0.8, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;
  context.fillStyle = counterPalette.faceInk;
  context.font = labelFont(findTextSize(text, width));
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, middle, middle * 1.06);
};

const paintHeader: PaintLabel = (context, width, height, text) => {
  context.clearRect(0, 0, width, height);
  context.fillStyle = counterPalette.headerInk;
  context.font = labelFont(Math.round(height * 0.62));
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, width / 2, height * 0.42);
  context.strokeStyle = counterPalette.headerRule;
  context.globalAlpha = 0.6;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(width * 0.12, height - 4);
  context.lineTo(width * 0.88, height - 4);
  context.stroke();
  context.globalAlpha = 1;
};

interface PaintedLabel {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

const buildLabelTexture = (
  width: number,
  height: number,
  paint: PaintLabel,
  text: string,
  colour: string,
): PaintedLabel | undefined => {
  if (typeof document === "undefined") {
    return undefined;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    return undefined;
  }
  paint(context, width, height, text, colour);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture };
};

const useLabelTexture = (
  width: number,
  height: number,
  paint: PaintLabel,
  text: string,
  colour: string,
): CanvasTexture | undefined => {
  const painted = useMemo(
    () => buildLabelTexture(width, height, paint, text, colour),
    [width, height, paint, text, colour],
  );

  useEffect(() => {
    if (painted === undefined) {
      return;
    }
    let isShown = true;
    void document.fonts.load(labelFont(findTextSize(text, width))).then(() => {
      const context = painted.canvas.getContext("2d");
      if (isShown && context !== null) {
        paint(context, width, height, text, colour);
        painted.texture.needsUpdate = true;
      }
    });
    return () => {
      isShown = false;
      painted.texture.dispose();
    };
  }, [painted, paint, text, colour, width, height]);

  return painted?.texture;
};

const useCounterGeometries = () => {
  const geometries = useMemo(
    () => ({
      body: new CylinderGeometry(
        counterRadius,
        counterRadius,
        counterDepth,
        discSegments,
        1,
        true,
      ).rotateX(Math.PI / 2),
      face: new CircleGeometry(counterRadius * 0.98, discSegments).translate(
        0,
        0,
        counterDepth / 2 + 0.002,
      ),
    }),
    [],
  );
  useDisposedOnUnmount(geometries.body);
  useDisposedOnUnmount(geometries.face);
  return geometries;
};

interface PlacedSpot {
  spot: Spot;
  delay: number;
}

const placeCounters = (
  mesh: InstancedMesh | null,
  placed: readonly PlacedSpot[],
  placer: Object3D,
  findPlacement: (placedSpot: PlacedSpot) => { lift: number; scale: number },
) => {
  if (mesh === null) {
    return;
  }
  placed.forEach((placedSpot, index) => {
    const { lift, scale } = findPlacement(placedSpot);
    placer.position.set(placedSpot.spot[0], placedSpot.spot[1] + lift, 0);
    placer.rotation.set(0, 0, 0);
    placer.scale.setScalar(scale);
    placer.updateMatrix();
    mesh.setMatrixAt(index, placer.matrix);
  });
  mesh.count = placed.length;
  mesh.instanceMatrix.needsUpdate = true;
};

const CounterFaces = ({
  value,
  placed,
  findPlacement,
  isLeaving,
  name,
}: {
  value: number;
  placed: readonly PlacedSpot[];
  findPlacement: (placedSpot: PlacedSpot) => { lift: number; scale: number };
  isLeaving: boolean;
  name: string;
}) => {
  const colour = findCounterColour(value);
  const face = useLabelTexture(
    faceTextureSize,
    faceTextureSize,
    paintFace,
    formatNumber(value),
    colour,
  );
  const { face: geometry } = useCounterGeometries();
  const faces = useRef<InstancedMesh>(null);
  const material = useRef<MeshPhysicalMaterial>(null);
  const placer = useMemo(() => new Object3D(), []);

  useFrame(() => {
    placeCounters(faces.current, placed, placer, findPlacement);
    if (isLeaving && material.current !== null && placed.length > 0) {
      material.current.opacity = findLeavingOpacity(
        findPlacement(placed[0]).lift,
      );
    }
  });

  return (
    <instancedMesh
      ref={faces}
      args={[geometry, undefined, Math.max(1, placed.length)]}
      frustumCulled={false}
      name={name}
    >
      <meshPhysicalMaterial
        ref={material}
        key={face === undefined ? "plain" : "labelled"}
        map={face ?? null}
        color={face === undefined ? colour : "#ffffff"}
        roughness={0.28}
        clearcoat={1}
        clearcoatRoughness={0.08}
        transparent={isLeaving}
        depthWrite={!isLeaving}
      />
    </instancedMesh>
  );
};

const leaveLift = 1.6;

const findLeavingOpacity = (lift: number) =>
  0.92 - Math.min(1, lift / leaveLift) * 0.62;

const CounterBodies = ({
  placed,
  values,
  findPlacement,
  isLeaving,
  name,
}: {
  placed: readonly PlacedSpot[];
  values: readonly number[];
  findPlacement: (placedSpot: PlacedSpot) => { lift: number; scale: number };
  isLeaving: boolean;
  name: string;
}) => {
  const { body } = useCounterGeometries();
  const bodies = useRef<InstancedMesh>(null);
  const material = useRef<MeshPhysicalMaterial>(null);
  const placer = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const mesh = bodies.current;
    if (mesh === null) {
      return;
    }
    values.forEach((value, index) => {
      mesh.setColorAt(index, new Color(findCounterColour(value)));
    });
    if (mesh.instanceColor !== null) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [values]);

  useFrame(() => {
    placeCounters(bodies.current, placed, placer, findPlacement);
    if (isLeaving && material.current !== null && placed.length > 0) {
      material.current.opacity = findLeavingOpacity(
        findPlacement(placed[0]).lift,
      );
    }
  });

  return (
    <instancedMesh
      ref={bodies}
      args={[body, undefined, Math.max(1, placed.length)]}
      frustumCulled={false}
      name={name}
    >
      <meshPhysicalMaterial
        ref={material}
        roughness={0.3}
        clearcoat={1}
        clearcoatRoughness={0.1}
        transparent={isLeaving}
        depthWrite={!isLeaving}
      />
    </instancedMesh>
  );
};

const ColumnHeader = ({
  value,
  x,
  y,
  width,
}: {
  value: number;
  x: number;
  y: number;
  width: number;
}) => {
  const label = useLabelTexture(
    headerTextureSize.width,
    headerTextureSize.height,
    paintHeader,
    formatNumber(value),
    counterPalette.headerInk,
  );
  const planeWidth = Math.min(width, headerHeight * 4);

  return (
    <mesh
      position={[x, y, 0]}
      visible={label !== undefined}
      name="column-header"
    >
      <planeGeometry args={[planeWidth, planeWidth / 4]} />
      <meshBasicMaterial
        map={label ?? null}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

const PlusSign = ({ spot }: { spot: Spot }) => {
  const geometry = useMemo(
    () =>
      mergeGeometries([
        new BoxGeometry(0.7, 0.16, 0.12),
        new BoxGeometry(0.16, 0.7, 0.12),
      ]),
    [],
  );
  useDisposedOnUnmount(geometry);

  return (
    <mesh geometry={geometry} position={[spot[0], spot[1], 0]} name="plus-sign">
      <meshPhysicalMaterial
        color={counterPalette.sign}
        metalness={0.85}
        roughness={0.25}
        clearcoat={1}
      />
    </mesh>
  );
};

interface ChangingCounter {
  column: number;
  isAdded: boolean;
}

interface CounterSceneProps {
  name: string;
  columnValues: readonly number[];
  rows: readonly (readonly number[])[];
  leaving?: readonly number[];
  changing?: ChangingCounter;
  gridHeight: number;
  hasSign?: boolean;
}

const fitScale = (width: number, height: number) =>
  Math.min(
    largestScale,
    fitWidth / Math.max(width, 1),
    fitHeight / Math.max(height, 1),
  );

const ChangingCounterPiece = ({
  value,
  spot,
  isAdded,
}: {
  value: number;
  spot: Spot;
  isAdded: boolean;
}) => {
  const { age, motionScale } = usePromptGrowth();
  const { body, face: faceGeometry } = useCounterGeometries();
  const colour = findCounterColour(value);
  const face = useLabelTexture(
    faceTextureSize,
    faceTextureSize,
    paintFace,
    formatNumber(value),
    colour,
  );
  const piece = useRef<Group>(null);
  const bodyMaterial = useRef<MeshPhysicalMaterial>(null);
  const faceMaterial = useRef<MeshPhysicalMaterial>(null);

  useFrame(() => {
    const pulse = 0.5 + 0.5 * Math.sin(age.current * 4 * motionScale);
    const travel = motionScale === 0 ? 1 : Math.min(1, age.current / 1.2);
    const lift = isAdded ? (1 - travel) * 1.4 : 0.35 + travel * 0.9;
    piece.current?.position.set(
      spot[0],
      spot[1] + lift,
      0.3 + pulse * 0.08 * motionScale,
    );
    const opacity = isAdded ? 0.75 + pulse * 0.25 : 0.38 + pulse * 0.16;
    for (const material of [bodyMaterial.current, faceMaterial.current]) {
      if (material !== null) {
        material.opacity = opacity;
        material.emissiveIntensity = isAdded ? 0.25 + pulse * 0.35 : 0.05;
      }
    }
  });

  return (
    <group ref={piece} name={isAdded ? "counter-added" : "counter-taken"}>
      <mesh geometry={body}>
        <meshPhysicalMaterial
          ref={bodyMaterial}
          color={colour}
          emissive={isAdded ? counterPalette.glow : colour}
          roughness={0.3}
          clearcoat={1}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={faceGeometry}>
        <meshPhysicalMaterial
          ref={faceMaterial}
          key={face === undefined ? "plain" : "labelled"}
          map={face ?? null}
          color={face === undefined ? colour : "#ffffff"}
          emissive={isAdded ? counterPalette.glow : "#000000"}
          roughness={0.28}
          clearcoat={1}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

const CounterScene = ({
  name,
  columnValues,
  rows,
  leaving,
  changing,
  gridHeight,
  hasSign = false,
}: CounterSceneProps) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const scene = useRef<Group>(null);
  const layoutRows = useMemo(
    () =>
      changing?.isAdded === true
        ? rows.map((counts) =>
            counts.map((count, column) =>
              column === changing.column ? count + 1 : count,
            ),
          )
        : rows,
    [rows, changing],
  );
  const layout = useMemo(
    () => buildCounterLayout(layoutRows, gridHeight, hasSign),
    [layoutRows, gridHeight, hasSign],
  );
  const scale = fitScale(layout.width, layout.height);

  const staying = useMemo(
    () =>
      columnValues.map((_value, column) =>
        rows.flatMap((counts, row) => {
          const kept =
            row === 0 && leaving !== undefined
              ? counts[column] - leaving[column]
              : counts[column];
          return layout.columnSpots[row][column]
            .slice(0, kept)
            .map((spot, index): PlacedSpot => ({
              spot,
              delay: (row * 6 + column * 3 + index) * appearStaggerSeconds,
            }));
        }),
      ),
    [columnValues, rows, leaving, layout],
  );
  const going = useMemo(
    () =>
      columnValues.map((_value, column) => {
        if (leaving === undefined) {
          return [];
        }
        const spots = layout.columnSpots[0][column];
        return spots
          .slice(spots.length - leaving[column])
          .map((spot, index): PlacedSpot => ({ spot, delay: index * 0.04 }));
      }),
    [columnValues, leaving, layout],
  );
  const changingSpot =
    changing === undefined
      ? undefined
      : layout.columnSpots[0][changing.column].at(-1);
  const stayingSpots = useMemo(() => {
    if (changing === undefined) {
      return staying;
    }
    return staying.map((placed, column) =>
      column === changing.column
        ? placed.slice(0, placed.length - (changing.isAdded ? 0 : 1))
        : placed,
    );
  }, [staying, changing]);

  const allStaying = useMemo(() => stayingSpots.flat(), [stayingSpots]);
  const stayingValues = useMemo(
    () =>
      stayingSpots.flatMap((placed, column) =>
        placed.map(() => columnValues[column]),
      ),
    [stayingSpots, columnValues],
  );
  const allGoing = useMemo(() => going.flat(), [going]);
  const goingValues = useMemo(
    () =>
      going.flatMap((placed, column) => placed.map(() => columnValues[column])),
    [going, columnValues],
  );

  const findStayingPlacement = ({ delay }: PlacedSpot) => {
    const growth = findGrowth(
      age.current - delay,
      promptGrowSeconds,
      motionScale,
    );
    return { lift: (1 - growth) * 0.5, scale: growth };
  };
  const findGoingPlacement = ({ delay }: PlacedSpot) => {
    const growth = findGrowth(
      age.current - delay,
      promptGrowSeconds,
      motionScale,
    );
    const travel =
      motionScale === 0
        ? 1
        : Math.min(
            1,
            Math.max(
              0,
              (age.current - leaveDelaySeconds - delay) / leaveSeconds,
            ),
          );
    const eased = 1 - (1 - travel) ** 3;
    return { lift: eased * leaveLift, scale: growth };
  };

  useFrame(() => {
    const body = scene.current;
    if (body === null) {
      return;
    }
    body.rotation.y = Math.sin(age.current * 0.4 * motionScale) * 0.05;
  });

  return (
    <group position={position} name={name}>
      <group ref={scene} scale={scale}>
        <CounterBodies
          placed={allStaying}
          values={stayingValues}
          findPlacement={findStayingPlacement}
          isLeaving={false}
          name="counter-bodies"
        />
        {columnValues.map((value, column) => (
          <CounterFaces
            key={`stay-${String(value)}`}
            value={value}
            placed={stayingSpots[column]}
            findPlacement={findStayingPlacement}
            isLeaving={false}
            name={`counters-${String(value)}`}
          />
        ))}
        {allGoing.length > 0 ? (
          <>
            <CounterBodies
              placed={allGoing}
              values={goingValues}
              findPlacement={findGoingPlacement}
              isLeaving
              name="counter-bodies-leaving"
            />
            {columnValues.map((value, column) =>
              going[column].length > 0 ? (
                <CounterFaces
                  key={`go-${String(value)}`}
                  value={value}
                  placed={going[column]}
                  findPlacement={findGoingPlacement}
                  isLeaving
                  name={`counters-leaving-${String(value)}`}
                />
              ) : null,
            )}
          </>
        ) : null}
        {columnValues.map((value, column) => (
          <ColumnHeader
            key={`header-${String(value)}`}
            value={value}
            x={layout.headers[column].x}
            y={layout.headerY}
            width={layout.headers[column].width}
          />
        ))}
        {layout.signSpot === undefined ? null : (
          <PlusSign spot={layout.signSpot} />
        )}
        {changing === undefined || changingSpot === undefined ? null : (
          <ChangingCounterPiece
            value={columnValues[changing.column]}
            spot={changingSpot}
            isAdded={changing.isAdded}
          />
        )}
      </group>
    </group>
  );
};

const numberGridHeight = 5;
const sumGridHeight = 3;

export const CountersNumber = ({
  columns,
}: {
  columns: PlaceValueColumn[];
}) => {
  const columnValues = useMemo(
    () => columns.map(({ value }) => value),
    [columns],
  );
  const rows = useMemo(() => [columns.map(({ count }) => count)], [columns]);

  return (
    <CounterScene
      name="place-value-counters"
      columnValues={columnValues}
      rows={rows}
      gridHeight={numberGridHeight}
    />
  );
};

export const buildMoreOrLessCounters = ({
  start,
  change,
  answer,
}: MoreAndLessQuestion) => {
  const columnValues = limitColumns(
    listCounterColumns([start, answer, Math.abs(change)]),
  );
  const changedValue = Math.abs(change);
  const column = Math.max(
    0,
    columnValues.findIndex(
      (value) => toThousandths(value) === toThousandths(changedValue),
    ),
  );
  const startCounts = splitIntoColumns(start, columnValues);
  const isAdded = change > 0;
  const counts = isAdded
    ? startCounts
    : exchangeForTakingAway(
        startCounts,
        columnValues.map((_value, index) => (index === column ? 1 : 0)),
      ).shown;
  return { columnValues, counts, column, isAdded };
};

export const CountersMoreOrLess = ({
  moreOrLess,
}: {
  moreOrLess: MoreAndLessQuestion;
}) => {
  const { columnValues, counts, column, isAdded } = useMemo(
    () => buildMoreOrLessCounters(moreOrLess),
    [moreOrLess],
  );
  const rows = useMemo(() => [counts], [counts]);
  const changing = useMemo(() => ({ column, isAdded }), [column, isAdded]);

  return (
    <CounterScene
      name="counters-more-or-less"
      columnValues={columnValues}
      rows={rows}
      changing={changing}
      gridHeight={numberGridHeight}
    />
  );
};

export const CountersSum = ({ addition }: { addition: AdditionQuestion }) => {
  const columnValues = useMemo(
    () => limitColumns(listCounterColumns([addition.first, addition.second])),
    [addition],
  );
  const rows = useMemo(
    () => [
      splitIntoColumns(addition.first, columnValues),
      splitIntoColumns(addition.second, columnValues),
    ],
    [addition, columnValues],
  );

  return (
    <CounterScene
      name="counters-sum"
      columnValues={columnValues}
      rows={rows}
      gridHeight={sumGridHeight}
      hasSign
    />
  );
};

export const buildTakeAwayCounters = ({
  start,
  takenAway,
  answer,
}: TakingAwayQuestion) => {
  const columnValues = limitColumns(
    listCounterColumns([start, takenAway, answer]),
  );
  return {
    columnValues,
    ...exchangeForTakingAway(
      splitIntoColumns(start, columnValues),
      splitIntoColumns(takenAway, columnValues),
    ),
  };
};

export const CountersDifference = ({
  takingAway,
}: {
  takingAway: TakingAwayQuestion;
}) => {
  const { columnValues, shown, taken } = useMemo(
    () => buildTakeAwayCounters(takingAway),
    [takingAway],
  );
  const rows = useMemo(() => [shown], [shown]);

  return (
    <CounterScene
      name="counters-difference"
      columnValues={columnValues}
      rows={rows}
      leaving={taken}
      gridHeight={numberGridHeight}
    />
  );
};
