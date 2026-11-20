import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Object3D,
  Shape,
  SphereGeometry,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  followPath,
  type BarChartScene,
  type BranchNode,
  type BranchTreeScene,
  type CodeBlock,
  type CodeCategory,
  type CodeGadget,
  type CodeStackScene,
  type ComputingScene,
  type DeviceScene,
  type Direction,
  type ItemColour,
  type ItemShape,
  type ModelWorkbenchScene,
  type NetworkMapScene,
  type PhotoFrameScene,
  type PixelGridScene,
  type RobotGridScene,
  type SearchEngineScene,
  type ShapeLayersScene,
  type SortItem,
  type SortMachineScene,
  type StoryCardsScene,
  type TabletScene,
  type VariableCratesScene,
  type WorkbenchShape,
} from "../curriculum/computing-scenes.js";
import {
  buildDeviceGeometry,
  buildRobotGeometry,
  listNetworkDeviceParts,
} from "./computing-lab-devices.js";
import {
  fillRoundedRect,
  labBodyFont,
  labHeadingFont,
  labInk,
  usePaintedTexture,
  writeFittedText,
  type PaintCanvas,
} from "./computing-lab-text.js";
import { getMotionScale } from "./reduced-motion.js";
import { useDisposedOnUnmount } from "./studio-stage.js";
import { buildModelGeometry, type ModelPart } from "./world-map-models.js";

export const labPalette = {
  board: "#1e293b",
  tileLight: "#e2e8f0",
  tileDark: "#cbd5e1",
  obstacle: "#7c5c3b",
  star: "#facc15",
  glow: "#22d3ee",
  plinth: "#e0f2fe",
  plinthRim: "#38bdf8",
  bezel: "#0b1220",
  card: "#f8fafc",
  belt: "#334155",
  roller: "#94a3b8",
  bin: "#475569",
  crate: "#b7793f",
  crateEdge: "#7c4a1e",
  wire: "#64748b",
  packet: "#f472b6",
  route: "#22d3ee",
} as const;

export const itemColourValues: Record<ItemColour, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#facc15",
  purple: "#a855f7",
  orange: "#f97316",
};

const codeCategoryColours: Record<CodeCategory, string> = {
  event: "#facc15",
  motion: "#4c97ff",
  looks: "#9966ff",
  sound: "#cf63cf",
  control: "#ffab19",
  variables: "#ff8c1a",
  operators: "#59c059",
  sensing: "#5cb1d6",
};

const pixelColourValues: Record<string, string | undefined> = {
  r: "#ef4444",
  o: "#f97316",
  y: "#facc15",
  g: "#22c55e",
  b: "#3b82f6",
  p: "#a855f7",
  k: "#1e293b",
  w: "#f8fafc",
  n: "#92400e",
  s: "#fcd34d",
};

const useMotionScale = () => {
  const [motionScale] = useState(getMotionScale);
  return motionScale;
};

const useLabAge = () => {
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
  });
  return age;
};

const useOwnedGeometry = <Input,>(
  build: (input: Input) => BufferGeometry,
  input: Input,
) => {
  const geometry = useMemo(() => build(input), [build, input]);
  useDisposedOnUnmount(geometry);
  return geometry;
};

const useDisposedListOnUnmount = (
  disposables: readonly { dispose: () => void }[],
) => {
  useEffect(
    () => () => {
      for (const disposable of disposables) {
        disposable.dispose();
      }
    },
    [disposables],
  );
};

const useSway = (amount = 0.12, speed = 0.5) => {
  const group = useRef<Group>(null);
  const age = useLabAge();
  useFrame(() => {
    if (group.current !== null) {
      group.current.rotation.y = Math.sin(age.current * speed) * amount;
    }
  });
  return group;
};

const PaintedPlane = ({
  texture,
  width,
  height,
  position = [0, 0, 0],
  rotation,
  name,
  fallbackColour = labPalette.card,
  isLit = false,
}: {
  texture: ReturnType<typeof usePaintedTexture>;
  width: number;
  height: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  name?: string;
  fallbackColour?: string;
  isLit?: boolean;
}) => (
  <mesh position={position} rotation={rotation} name={name}>
    <planeGeometry args={[width, height]} />
    {isLit ? (
      <meshStandardMaterial
        key={texture === undefined ? "plain" : "painted"}
        map={texture ?? null}
        color={texture === undefined ? fallbackColour : "#ffffff"}
        transparent
        roughness={0.6}
      />
    ) : (
      <meshBasicMaterial
        key={texture === undefined ? "plain" : "painted"}
        map={texture ?? null}
        color={texture === undefined ? fallbackColour : "#ffffff"}
        transparent
        toneMapped={false}
      />
    )}
  </mesh>
);

const placeInstances = (
  mesh: InstancedMesh | null,
  placements: {
    position: [number, number, number];
    scale?: [number, number, number];
    colour?: string;
  }[],
) => {
  if (mesh === null) {
    return;
  }
  const placer = new Object3D();
  const colour = new Color();
  placements.forEach(({ position, scale = [1, 1, 1], colour: hex }, index) => {
    placer.position.set(...position);
    placer.scale.set(...scale);
    placer.updateMatrix();
    mesh.setMatrixAt(index, placer.matrix);
    if (hex !== undefined) {
      mesh.setColorAt(index, colour.set(hex));
    }
  });
  mesh.count = placements.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor !== null) {
    mesh.instanceColor.needsUpdate = true;
  }
};

const useInstances = (
  placements: {
    position: [number, number, number];
    scale?: [number, number, number];
    colour?: string;
  }[],
) => {
  const mesh = useRef<InstancedMesh>(null);
  const layout = useMemo(() => placements, [placements]);
  useFrame(() => {
    placeInstances(mesh.current, layout);
  });
  return mesh;
};

const buildStarShape = (outer: number, inner: number, points = 5): Shape => {
  const shape = new Shape();
  for (let index = 0; index < points * 2; index++) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (index / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
};

const buildHeartShape = (size: number): Shape => {
  const shape = new Shape();
  shape.moveTo(0, -size * 0.9);
  shape.bezierCurveTo(
    size * 1.3,
    -size * 0.1,
    size * 0.7,
    size * 1.1,
    0,
    size * 0.45,
  );
  shape.bezierCurveTo(
    -size * 0.7,
    size * 1.1,
    -size * 1.3,
    -size * 0.1,
    0,
    -size * 0.9,
  );
  return shape;
};

const buildFlatShape = (shape: ItemShape, size: number): Shape => {
  switch (shape) {
    case "star":
      return buildStarShape(size, size * 0.45);
    case "heart":
      return buildHeartShape(size);
    case "circle": {
      const circle = new Shape();
      circle.absarc(0, 0, size, 0, Math.PI * 2, false);
      return circle;
    }
    case "square": {
      const square = new Shape();
      square.moveTo(-size * 0.85, -size * 0.85);
      square.lineTo(size * 0.85, -size * 0.85);
      square.lineTo(size * 0.85, size * 0.85);
      square.lineTo(-size * 0.85, size * 0.85);
      square.closePath();
      return square;
    }
    case "triangle": {
      const triangle = new Shape();
      triangle.moveTo(0, size);
      triangle.lineTo(size * 0.95, -size * 0.7);
      triangle.lineTo(-size * 0.95, -size * 0.7);
      triangle.closePath();
      return triangle;
    }
  }
};

const buildChunkyShapeGeometry = (
  shape: ItemShape,
  size: number,
  depth: number,
) =>
  new ExtrudeGeometry(buildFlatShape(shape, size), {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.25,
    bevelSize: size * 0.06,
    bevelSegments: 1,
    curveSegments: 8,
  }).center();

const boardSpan = 2.5;

const buildGridStarGeometry = (cellSize: number) =>
  buildChunkyShapeGeometry("star", cellSize * 0.34, cellSize * 0.12);

const buildCodeBlockGeometry = () =>
  new RoundedBoxGeometry(blockWidth, blockHeight, 0.18, 2, 0.06);

const buildTabletGeometry = () =>
  new RoundedBoxGeometry(3.1, 2.5, 0.12, 3, 0.16);

interface BoardMetrics {
  cellSize: number;
  findSpot: (column: number, row: number) => [number, number];
}

const measureBoard = (columns: number, rows: number): BoardMetrics => {
  const cellSize = boardSpan / Math.max(columns, rows);
  return {
    cellSize,
    findSpot: (column, row) => [
      (column - (columns - 1) / 2) * cellSize,
      (row - (rows - 1) / 2) * cellSize,
    ],
  };
};

const arrowAngles: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

const paintRobotFloor: PaintCanvas<RobotGridScene> = (
  context,
  scene,
  width,
  height,
) => {
  const cellWidth = width / scene.columns;
  const cellHeight = height / scene.rows;
  const visited = followPath(scene.robot, scene.path ?? []);
  context.textAlign = "center";
  context.textBaseline = "middle";
  (scene.path ?? []).forEach((direction, index) => {
    const from = visited[index];
    const to = visited[index + 1];
    const startX = (from.column + 0.5) * cellWidth;
    const startY = (from.row + 0.5) * cellHeight;
    const endX = (to.column + 0.5) * cellWidth;
    const endY = (to.row + 0.5) * cellHeight;
    context.strokeStyle = "rgba(14, 116, 144, 0.9)";
    context.lineWidth = cellWidth * 0.12;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
    const middleX = (startX + endX) / 2;
    const middleY = (startY + endY) / 2;
    context.save();
    context.translate(middleX, middleY);
    context.rotate(arrowAngles[direction]);
    context.fillStyle = "#0e7490";
    context.beginPath();
    context.moveTo(cellWidth * 0.2, 0);
    context.lineTo(-cellWidth * 0.12, -cellWidth * 0.16);
    context.lineTo(-cellWidth * 0.12, cellWidth * 0.16);
    context.closePath();
    context.fill();
    context.restore();
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(
      middleX - cellWidth * 0.22,
      middleY - cellHeight * 0.22,
      cellWidth * 0.15,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.fillStyle = labInk;
    context.font = `800 ${String(Math.round(cellWidth * 0.22))}px ${labHeadingFont}`;
    context.fillText(
      String(index + 1),
      middleX - cellWidth * 0.22,
      middleY - cellHeight * 0.2,
    );
  });
  for (const { cell, text } of scene.labels ?? []) {
    const x = (cell.column + 0.5) * cellWidth;
    const y = (cell.row + 0.5) * cellHeight;
    context.fillStyle = "rgba(124, 58, 237, 0.92)";
    fillRoundedRect(
      context,
      x - cellWidth * 0.34,
      y - cellHeight * 0.34,
      cellWidth * 0.68,
      cellHeight * 0.68,
      cellWidth * 0.16,
    );
    context.fillStyle = "#ffffff";
    context.font = `800 ${String(Math.round(cellWidth * 0.46))}px ${labHeadingFont}`;
    context.fillText(text, x, y + cellHeight * 0.04);
  }
};

const robotFacing = (path: readonly Direction[] | undefined): number => {
  const first = path?.[0] ?? "up";
  return { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[
    first
  ];
};

const RobotGrid = ({ scene }: { scene: RobotGridScene }) => {
  const { cellSize, findSpot } = measureBoard(scene.columns, scene.rows);
  const tiles = useMemo(
    () =>
      Array.from({ length: scene.columns * scene.rows }, (_, index) => {
        const column = index % scene.columns;
        const row = Math.floor(index / scene.columns);
        const [x, z] = findSpot(column, row);
        return {
          position: [x, 0, z] satisfies [number, number, number],
          colour:
            (column + row) % 2 === 0
              ? labPalette.tileLight
              : labPalette.tileDark,
        };
      }),
    [scene, findSpot],
  );
  const obstacles = useMemo(
    () =>
      (scene.obstacles ?? []).map(({ column, row }) => {
        const [x, z] = findSpot(column, row);
        return {
          position: [x, cellSize * 0.3, z] satisfies [number, number, number],
        };
      }),
    [scene, findSpot, cellSize],
  );
  const tileMesh = useInstances(tiles);
  const obstacleMesh = useInstances(obstacles);
  const floor = usePaintedTexture(
    paintRobotFloor,
    scene,
    512,
    Math.round((512 * scene.rows) / scene.columns),
  );
  const robot = useRef<Group>(null);
  const star = useRef<Mesh>(null);
  const age = useLabAge();
  const robotGeometry = useOwnedGeometry(buildRobotGeometry, undefined);
  const starGeometry = useOwnedGeometry(buildGridStarGeometry, cellSize);
  const [robotX, robotZ] = findSpot(scene.robot.column, scene.robot.row);
  const goalSpot =
    scene.goal === undefined
      ? undefined
      : findSpot(scene.goal.column, scene.goal.row);

  useFrame(() => {
    if (robot.current !== null) {
      robot.current.position.y =
        Math.abs(Math.sin(age.current * 3)) * cellSize * 0.06;
    }
    if (star.current !== null) {
      star.current.rotation.y = age.current * 1.4;
    }
  });

  return (
    <group rotation={[0.95, 0, 0]} name="robot-grid">
      <mesh position={[0, -cellSize * 0.18, 0]}>
        <boxGeometry
          args={[
            cellSize * scene.columns + 0.2,
            0.12,
            cellSize * scene.rows + 0.2,
          ]}
        />
        <meshStandardMaterial
          color={labPalette.board}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>
      <instancedMesh
        ref={tileMesh}
        args={[undefined, undefined, tiles.length]}
        name="grid-tiles"
      >
        <boxGeometry args={[cellSize * 0.94, 0.08, cellSize * 0.94]} />
        <meshStandardMaterial roughness={0.45} />
      </instancedMesh>
      <PaintedPlane
        texture={floor}
        width={cellSize * scene.columns}
        height={cellSize * scene.rows}
        position={[0, 0.045, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        name="grid-markings"
        fallbackColour="#ffffff00"
      />
      {obstacles.length === 0 ? null : (
        <instancedMesh
          ref={obstacleMesh}
          args={[undefined, undefined, obstacles.length]}
          name="grid-rocks"
        >
          <dodecahedronGeometry args={[cellSize * 0.32, 0]} />
          <meshStandardMaterial
            color={labPalette.obstacle}
            roughness={0.9}
            flatShading
          />
        </instancedMesh>
      )}
      {goalSpot === undefined ? null : (
        <mesh
          ref={star}
          geometry={starGeometry}
          position={[goalSpot[0], cellSize * 0.4, goalSpot[1]]}
          name="grid-star"
        >
          <meshStandardMaterial
            color={labPalette.star}
            emissive={labPalette.star}
            emissiveIntensity={0.35}
            metalness={0.3}
            roughness={0.3}
          />
        </mesh>
      )}
      <group position={[robotX, 0.05, robotZ]}>
        <group ref={robot}>
          <mesh
            geometry={robotGeometry}
            scale={cellSize * 0.62}
            rotation={[0, robotFacing(scene.path), 0]}
            name="bolt-robot"
          >
            <meshPhysicalMaterial
              vertexColors
              roughness={0.35}
              clearcoat={0.6}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
};

const blockHeight = 0.34;
const blockGap = 0.04;
const blockWidth = 2.1;
const blockIndent = 0.22;

const paintCodeBlocks: PaintCanvas<CodeStackScene> = (
  context,
  { blocks },
  width,
  height,
) => {
  const rowHeight = height / blocks.length;
  context.textAlign = "left";
  context.textBaseline = "middle";
  blocks.forEach(({ text, depth = 0, isHighlighted }, index) => {
    const x =
      28 + depth * (width * (blockIndent / (blockWidth + blockIndent * 2)));
    const y = rowHeight * (index + 0.5);
    if (isHighlighted === true) {
      context.strokeStyle = "#fef08a";
      context.lineWidth = 8;
      context.strokeRect(
        x - 16,
        y - rowHeight * 0.42,
        width - x - 12,
        rowHeight * 0.84,
      );
    }
    context.fillStyle = "#ffffff";
    writeFittedText(
      context,
      text,
      x,
      y,
      width - x - 30,
      Math.min(52, rowHeight * 0.55),
      labBodyFont,
      800,
    );
  });
};

const LedBoard = ({ shows }: { shows: string }) => {
  const paintLeds = useMemo<PaintCanvas<string>>(
    () => (context, text, width, height) => {
      context.fillStyle = "#0b1220";
      context.fillRect(0, 0, width, height);
      for (let row = 0; row < 5; row++) {
        for (let column = 0; column < 5; column++) {
          context.fillStyle = "rgba(239, 68, 68, 0.18)";
          context.beginPath();
          context.arc(
            ((column + 0.5) * width) / 5,
            ((row + 0.5) * height) / 5,
            width / 16,
            0,
            Math.PI * 2,
          );
          context.fill();
        }
      }
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.shadowColor = "#ff3b3b";
      context.shadowBlur = 24;
      context.fillStyle = "#ff5a5a";
      writeFittedText(
        context,
        text,
        width / 2,
        height / 2 + 8,
        width * 0.9,
        190,
        labHeadingFont,
        800,
      );
    },
    [],
  );
  const face = usePaintedTexture(paintLeds, shows, 256, 256);
  return (
    <group name="led-board">
      <mesh>
        <boxGeometry args={[1.0, 0.8, 0.06]} />
        <meshStandardMaterial color="#0f766e" roughness={0.5} />
      </mesh>
      <PaintedPlane
        texture={face}
        width={0.56}
        height={0.56}
        position={[0, 0, 0.035]}
        fallbackColour="#ff5a5a"
      />
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.05, 12]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
    </group>
  );
};

const Lamp = ({ isOn }: { isOn: boolean }) => (
  <group name={isOn ? "lamp-on" : "lamp-off"}>
    <mesh position={[0, 0.25, 0]}>
      <sphereGeometry args={[0.32, 20, 14]} />
      <meshStandardMaterial
        color={isOn ? "#fde68a" : "#64748b"}
        emissive={isOn ? "#facc15" : "#000000"}
        emissiveIntensity={isOn ? 1.4 : 0}
        transparent
        opacity={0.92}
      />
    </mesh>
    <mesh position={[0, -0.18, 0]}>
      <cylinderGeometry args={[0.16, 0.2, 0.3, 14]} />
      <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
    </mesh>
    {isOn ? (
      <pointLight
        position={[0, 0.3, 0.4]}
        intensity={2}
        distance={3}
        color="#fde68a"
      />
    ) : null}
  </group>
);

const BobbingRobot = () => {
  const geometry = useOwnedGeometry(buildRobotGeometry, undefined);
  const robot = useRef<Mesh>(null);
  const age = useLabAge();
  useFrame(() => {
    if (robot.current !== null) {
      robot.current.position.y =
        -0.55 + Math.abs(Math.sin(age.current * 2.5)) * 0.08;
      robot.current.rotation.y = -0.5 + Math.sin(age.current) * 0.25;
    }
  });
  return (
    <mesh ref={robot} geometry={geometry} scale={0.9} name="bolt-robot">
      <meshPhysicalMaterial vertexColors roughness={0.35} clearcoat={0.6} />
    </mesh>
  );
};

const renderGadget = (gadget: CodeGadget): ReactNode => {
  switch (gadget.kind) {
    case "led-board":
      return <LedBoard shows={gadget.shows} />;
    case "lamp":
      return <Lamp isOn={gadget.isOn} />;
    case "robot":
      return <BobbingRobot />;
  }
};

const listBlockPlacements = (blocks: readonly CodeBlock[]) => {
  const stackHeight = blocks.length * (blockHeight + blockGap);
  return blocks.map(({ category, depth = 0 }, index) => ({
    position: [
      depth * blockIndent,
      stackHeight / 2 - (index + 0.5) * (blockHeight + blockGap),
      0,
    ] satisfies [number, number, number],
    scale: [1 - (depth * blockIndent) / blockWidth, 1, 1] satisfies [
      number,
      number,
      number,
    ],
    colour: codeCategoryColours[category],
  }));
};

const CodeStack = ({ scene }: { scene: CodeStackScene }) => {
  const placements = useMemo(() => listBlockPlacements(scene.blocks), [scene]);
  const blocks = useInstances(placements);
  const text = usePaintedTexture(
    paintCodeBlocks,
    scene,
    512,
    96 * scene.blocks.length,
  );
  const geometry = useOwnedGeometry(buildCodeBlockGeometry, undefined);
  const sway = useSway(0.1, 0.4);
  const stackHeight = scene.blocks.length * (blockHeight + blockGap);
  const hasGadget = scene.gadget !== undefined;

  return (
    <group ref={sway} name="code-stack">
      <group position={[hasGadget ? -0.55 : 0, 0, 0]}>
        <instancedMesh
          ref={blocks}
          args={[geometry, undefined, placements.length]}
          name="code-blocks"
        >
          <meshPhysicalMaterial
            roughness={0.35}
            clearcoat={0.7}
            clearcoatRoughness={0.2}
          />
        </instancedMesh>
        <PaintedPlane
          texture={text}
          width={blockWidth + blockIndent * 2}
          height={stackHeight}
          position={[blockIndent, 0, 0.1]}
          name="code-text"
          fallbackColour="#ffffff00"
        />
      </group>
      {scene.gadget === undefined ? null : (
        <group position={[1.25, 0, 0.2]} rotation={[0, -0.4, 0]}>
          {renderGadget(scene.gadget)}
        </group>
      )}
    </group>
  );
};

const paintCaption: PaintCanvas<string> = (context, caption, width, height) => {
  context.fillStyle = "#0f172a";
  fillRoundedRect(context, 4, 4, width - 8, height - 8, 28);
  context.fillStyle = "#e0f2fe";
  context.textAlign = "center";
  context.textBaseline = "middle";
  writeFittedText(
    context,
    caption,
    width / 2,
    height / 2 + 4,
    width - 40,
    64,
    labHeadingFont,
  );
};

const Turntable = ({
  children,
  radius = 1.15,
}: {
  children: ReactNode;
  radius?: number;
}) => {
  const spinner = useRef<Group>(null);
  const age = useLabAge();
  useFrame(() => {
    if (spinner.current !== null) {
      spinner.current.rotation.y = -0.5 + Math.sin(age.current * 0.45) * 0.7;
    }
  });
  return (
    <group>
      <mesh position={[0, -0.08, 0]} name="turntable">
        <cylinderGeometry args={[radius, radius * 1.08, 0.16, 40]} />
        <meshPhysicalMaterial
          color={labPalette.plinth}
          roughness={0.25}
          clearcoat={1}
        />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.94, radius, 48]} />
        <meshBasicMaterial color={labPalette.plinthRim} toneMapped={false} />
      </mesh>
      <group ref={spinner}>{children}</group>
    </group>
  );
};

const DeviceOnTurntable = ({ scene }: { scene: DeviceScene }) => {
  const geometry = useOwnedGeometry(buildDeviceGeometry, scene.device);
  const caption = usePaintedTexture(
    paintCaption,
    scene.caption ?? "",
    512,
    112,
  );
  return (
    <group position={[0, -0.75, 0]} rotation={[0.3, 0, 0]} name="device-stand">
      <Turntable>
        <mesh geometry={geometry} name={`device-${scene.device}`}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.32}
            clearcoat={0.8}
            clearcoatRoughness={0.15}
          />
        </mesh>
      </Turntable>
      {scene.caption === undefined ? null : (
        <PaintedPlane
          texture={caption}
          width={1.6}
          height={0.35}
          position={[0, -0.05, 1.25]}
          rotation={[-0.3, 0, 0]}
          name="device-caption"
          fallbackColour="#0f172a"
        />
      )}
    </group>
  );
};

const screenAppColours: Record<string, string> = {
  chat: "#22c55e",
  browser: "#3b82f6",
  email: "#f97316",
  login: "#6366f1",
  "pop-up": "#ef4444",
  document: "#2563eb",
  poster: "#ec4899",
  social: "#8b5cf6",
  game: "#14b8a6",
  video: "#dc2626",
  table: "#0891b2",
  spreadsheet: "#16a34a",
};

const paintTabletScreen: PaintCanvas<TabletScene> = (
  context,
  { title, screen },
  width,
  height,
) => {
  context.fillStyle = "#f1f5f9";
  context.fillRect(0, 0, width, height);
  context.fillStyle = screenAppColours[screen.app] ?? "#3b82f6";
  context.fillRect(0, 0, width, 84);
  context.fillStyle = "#ffffff";
  context.textAlign = "left";
  context.textBaseline = "middle";
  writeFittedText(context, title, 28, 44, width - 56, 48, labHeadingFont);
  const top = 108;
  if ("messages" in screen) {
    screen.messages.forEach(({ from, text, isMine }, index) => {
      const y = top + index * 104;
      const bubbleWidth = width * 0.8;
      const x = isMine === true ? width - bubbleWidth - 24 : 24;
      context.fillStyle = isMine === true ? "#bbf7d0" : "#ffffff";
      fillRoundedRect(context, x, y, bubbleWidth, 92, 26);
      context.fillStyle = "#475569";
      context.textAlign = "left";
      writeFittedText(
        context,
        from,
        x + 22,
        y + 24,
        bubbleWidth - 44,
        24,
        labBodyFont,
        700,
      );
      context.fillStyle = labInk;
      writeFittedText(context, text, x + 22, y + 62, bubbleWidth - 44, 34);
    });
    return;
  }
  if ("rows" in screen) {
    const columnCount = screen.rows[0].length;
    const cellWidth = (width - 40) / columnCount;
    const cellHeight = Math.min(78, (height - top - 20) / screen.rows.length);
    screen.rows.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        const x = 20 + columnIndex * cellWidth;
        const y = top + rowIndex * cellHeight;
        context.fillStyle = rowIndex === 0 ? "#cbd5e1" : "#ffffff";
        context.fillRect(x, y, cellWidth, cellHeight);
        context.strokeStyle = "#94a3b8";
        context.lineWidth = 2;
        context.strokeRect(x, y, cellWidth, cellHeight);
        context.fillStyle = labInk;
        context.textAlign = "center";
        writeFittedText(
          context,
          cell,
          x + cellWidth / 2,
          y + cellHeight / 2 + 2,
          cellWidth - 14,
          34,
          labBodyFont,
          rowIndex === 0 ? 800 : 700,
        );
      });
    });
    return;
  }
  const isPopUp = screen.app === "pop-up";
  if (isPopUp) {
    context.fillStyle = "#fee2e2";
    fillRoundedRect(context, 40, top, width - 80, height - top - 30, 30);
  }
  context.fillStyle = labInk;
  context.textAlign = isPopUp ? "center" : "left";
  const lineHeight = Math.min(80, (height - top - 30) / screen.lines.length);
  screen.lines.forEach((line, index) => {
    writeFittedText(
      context,
      line,
      isPopUp ? width / 2 : 32,
      top + lineHeight * (index + 0.6),
      width - 72,
      index === 0 ? 46 : 38,
      labBodyFont,
      index === 0 ? 800 : 700,
    );
  });
};

const TabletScreen = ({ scene }: { scene: TabletScene }) => {
  const screen = usePaintedTexture(paintTabletScreen, scene, 640, 512);
  const geometry = useOwnedGeometry(buildTabletGeometry, undefined);
  const sway = useSway(0.14, 0.45);
  return (
    <group ref={sway} rotation={[-0.08, 0, 0]} name="tablet-screen">
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color={labPalette.bezel}
          roughness={0.25}
          metalness={0.4}
          clearcoat={1}
        />
      </mesh>
      <PaintedPlane
        texture={screen}
        width={2.8}
        height={2.24}
        position={[0, 0, 0.065]}
        name="tablet-display"
        fallbackColour="#f1f5f9"
      />
    </group>
  );
};

const paintSearchBar: PaintCanvas<string> = (context, query, width, height) => {
  context.fillStyle = "#ffffff";
  fillRoundedRect(context, 4, 4, width - 8, height - 8, (height - 8) / 2);
  context.fillStyle = labInk;
  context.textAlign = "left";
  context.textBaseline = "middle";
  writeFittedText(context, query, 120, height / 2 + 2, width - 160, 52);
  context.strokeStyle = "#3b82f6";
  context.lineWidth = 10;
  context.beginPath();
  context.arc(62, height / 2 - 6, 22, 0, Math.PI * 2);
  context.moveTo(78, height / 2 + 10);
  context.lineTo(96, height / 2 + 28);
  context.stroke();
};

const paintSearchResults: PaintCanvas<SearchEngineScene> = (
  context,
  { results },
  width,
  height,
) => {
  const rowHeight = height / Math.max(results.length, 1);
  results.forEach(({ title, address, isAdvert }, index) => {
    const y = index * rowHeight;
    context.fillStyle = isAdvert === true ? "#fef9c3" : "#ffffff";
    fillRoundedRect(context, 6, y + 6, width - 12, rowHeight - 12, 24);
    context.textAlign = "left";
    context.textBaseline = "middle";
    let x = 30;
    if (isAdvert === true) {
      context.fillStyle = "#854d0e";
      fillRoundedRect(context, x, y + rowHeight * 0.18, 64, 36, 10);
      context.fillStyle = "#ffffff";
      writeFittedText(context, "Ad", x + 14, y + rowHeight * 0.18 + 19, 40, 26);
      x += 80;
    }
    context.fillStyle = "#1d4ed8";
    writeFittedText(
      context,
      title,
      x,
      y + rowHeight * 0.34,
      width - x - 30,
      36,
    );
    context.fillStyle = "#15803d";
    writeFittedText(
      context,
      address,
      30,
      y + rowHeight * 0.7,
      width - 60,
      26,
      labBodyFont,
      700,
    );
  });
};

const SearchEngine = ({ scene }: { scene: SearchEngineScene }) => {
  const bar = usePaintedTexture(paintSearchBar, scene.query, 768, 128);
  const results = usePaintedTexture(
    paintSearchResults,
    scene,
    640,
    150 * scene.results.length,
  );
  const sway = useSway(0.12, 0.4);
  const resultsHeight = 0.48 * scene.results.length;
  return (
    <group ref={sway} name="search-engine">
      <mesh position={[0, 1.05, -0.02]}>
        <capsuleGeometry args={[0.24, 2.6, 4, 16]} />
        <meshPhysicalMaterial color="#e0f2fe" roughness={0.2} clearcoat={1} />
      </mesh>
      <PaintedPlane
        texture={bar}
        width={3.0}
        height={0.5}
        position={[0, 1.05, 0.25]}
        name="search-bar"
      />
      <PaintedPlane
        texture={results}
        width={2.9}
        height={resultsHeight}
        position={[0.05, 0.7 - resultsHeight / 2, 0.12]}
        rotation={[-0.12, 0, 0]}
        name="search-results"
        isLit
      />
    </group>
  );
};

const networkSpacing = { x: 0.82, z: 0.72 };
const networkDeviceScale = 0.32;

const findNetworkSpot = (
  column: number,
  row: number,
): [number, number, number] => [
  (column - 2) * networkSpacing.x,
  0,
  (row - 1) * networkSpacing.z,
];

const buildLinkParts = (
  scene: NetworkMapScene,
  links: readonly [string, string][],
  colour: string,
  thickness: number,
): ModelPart[] =>
  links.flatMap(([from, to]) => {
    const start = scene.nodes.find(({ id }) => id === from);
    const end = scene.nodes.find(({ id }) => id === to);
    if (start === undefined || end === undefined) {
      return [];
    }
    const [x1, , z1] = findNetworkSpot(start.column, start.row);
    const [x2, , z2] = findNetworkSpot(end.column, end.row);
    const length = Math.hypot(x2 - x1, z2 - z1);
    return [
      {
        geometry: new BoxGeometry(length, thickness, thickness),
        colour,
        position: [(x1 + x2) / 2, 0.03, (z1 + z2) / 2],
        rotation: [0, -Math.atan2(z2 - z1, x2 - x1), 0],
      },
    ];
  });

const listRouteLinks = (route: readonly string[]): [string, string][] =>
  route.slice(1).map((stop, index) => [route[index], stop]);

const paintNetworkLabels: PaintCanvas<NetworkMapScene> = (
  context,
  { nodes },
  width,
  height,
) => {
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const { column, row, label } of nodes) {
    const x = ((column + 0.5) / 5) * width;
    const y = ((row + 0.5) / 3) * height + height * 0.12;
    context.fillStyle = "rgba(15, 23, 42, 0.85)";
    fillRoundedRect(context, x - width * 0.09, y - 22, width * 0.18, 44, 14);
    context.fillStyle = "#e0f2fe";
    writeFittedText(context, label, x, y + 2, width * 0.17, 30);
  }
};

const buildNetworkGeometry = (scene: NetworkMapScene) =>
  buildModelGeometry([
    ...scene.nodes.flatMap(({ device, column, row }) => {
      const [spotX, , spotZ] = findNetworkSpot(column, row);
      return listNetworkDeviceParts(device).map((part) => ({
        ...part,
        position: [
          spotX + (part.position?.[0] ?? 0) * networkDeviceScale,
          (part.position?.[1] ?? 0) * networkDeviceScale,
          spotZ + (part.position?.[2] ?? 0) * networkDeviceScale,
        ] satisfies [number, number, number],
        scale: networkDeviceScale,
      }));
    }),
    ...buildLinkParts(scene, scene.links, labPalette.wire, 0.035),
  ]);

const buildNetworkRouteGeometry = (scene: NetworkMapScene) =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(0.001, 0.001, 0.001),
      colour: labPalette.route,
    },
    ...buildLinkParts(
      scene,
      listRouteLinks(scene.route ?? []),
      labPalette.route,
      0.06,
    ),
  ]);

const NetworkMap = ({ scene }: { scene: NetworkMapScene }) => {
  const geometry = useOwnedGeometry(buildNetworkGeometry, scene);
  const route = useMemo(() => scene.route ?? [], [scene]);
  const routeGeometry = useOwnedGeometry(buildNetworkRouteGeometry, scene);
  const labels = usePaintedTexture(paintNetworkLabels, scene, 640, 384);
  const packet = useRef<Mesh>(null);
  const age = useLabAge();

  useFrame(() => {
    const mesh = packet.current;
    if (mesh === null || route.length < 2) {
      return;
    }
    const legs = route.length - 1;
    const travelled = (age.current * 0.6) % legs;
    const leg = Math.floor(travelled);
    const progress = travelled - leg;
    const from = scene.nodes.find(({ id }) => id === route[leg]);
    const to = scene.nodes.find(({ id }) => id === route[leg + 1]);
    if (from === undefined || to === undefined) {
      return;
    }
    const [x1, , z1] = findNetworkSpot(from.column, from.row);
    const [x2, , z2] = findNetworkSpot(to.column, to.row);
    mesh.position.set(
      x1 + (x2 - x1) * progress,
      0.12,
      z1 + (z2 - z1) * progress,
    );
  });

  return (
    <group rotation={[0.75, 0, 0]} name="network-map">
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[4.2, 0.08, 2.5]} />
        <meshStandardMaterial
          color={labPalette.board}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
      <mesh geometry={geometry} name="network-devices">
        <meshPhysicalMaterial vertexColors roughness={0.35} clearcoat={0.6} />
      </mesh>
      {route.length < 2 ? null : (
        <>
          <mesh geometry={routeGeometry} name="network-route">
            <meshBasicMaterial vertexColors toneMapped={false} />
          </mesh>
          <mesh ref={packet} name="network-packet">
            <sphereGeometry args={[0.08, 12, 8]} />
            <meshBasicMaterial color={labPalette.packet} toneMapped={false} />
          </mesh>
        </>
      )}
      <PaintedPlane
        texture={labels}
        width={4.1}
        height={2.46}
        position={[0, 0.0, 0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        name="network-labels"
        fallbackColour="#ffffff00"
      />
    </group>
  );
};

const chartWidth = 3.2;
const chartHeight = 1.8;

const findChartScale = (bars: BarChartScene["bars"]) =>
  Math.max(5, Math.ceil(Math.max(...bars.map(({ value }) => value)) / 5) * 5);

const paintChartBoard: PaintCanvas<BarChartScene> = (
  context,
  scene,
  width,
  height,
) => {
  const scale = findChartScale(scene.bars);
  const plotTop = 70;
  const plotBottom = height - 70;
  context.fillStyle = "#f8fafc";
  fillRoundedRect(context, 0, 0, width, height, 30);
  context.fillStyle = labInk;
  context.textAlign = "center";
  context.textBaseline = "middle";
  writeFittedText(
    context,
    scene.title,
    width / 2,
    36,
    width - 60,
    40,
    labHeadingFont,
  );
  const step = scale <= 10 ? 1 : scale <= 20 ? 2 : 5;
  context.font = `700 22px ${labBodyFont}`;
  for (let value = 0; value <= scale; value += step) {
    const y = plotBottom - ((plotBottom - plotTop) * value) / scale;
    context.strokeStyle = value === 0 ? "#475569" : "#e2e8f0";
    context.lineWidth = value === 0 ? 4 : 2;
    context.beginPath();
    context.moveTo(70, y);
    context.lineTo(width - 20, y);
    context.stroke();
    context.fillStyle = "#475569";
    context.fillText(String(value), 40, y);
  }
  const slot = (width - 90) / scene.bars.length;
  scene.bars.forEach(({ label }, index) => {
    context.fillStyle = labInk;
    writeFittedText(
      context,
      label,
      70 + slot * (index + 0.5),
      height - 34,
      slot - 10,
      30,
    );
  });
};

const buildChartLineGeometry = (
  points: readonly { position: [number, number, number] }[],
) =>
  buildModelGeometry([
    { geometry: new BoxGeometry(0.001, 0.001, 0.001), colour: "#ef4444" },
    ...points.slice(1).map((point, index): ModelPart => {
      const [x1, y1] = points[index].position;
      const [x2, y2] = point.position;
      return {
        geometry: new BoxGeometry(Math.hypot(x2 - x1, y2 - y1), 0.04, 0.04),
        colour: "#ef4444",
        position: [(x1 + x2) / 2, (y1 + y2) / 2, 0.12],
        rotation: [0, 0, Math.atan2(y2 - y1, x2 - x1)],
      };
    }),
  ]);

const chartBarColours = [
  "#3b82f6",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
];

const BarChart = ({ scene }: { scene: BarChartScene }) => {
  const scale = findChartScale(scene.bars);
  const board = usePaintedTexture(paintChartBoard, scene, 768, 512);
  const plotHeight = (chartHeight * (512 - 140)) / 512;
  const plotBottom = -chartHeight / 2 + chartHeight * (70 / 512);
  const plotLeft = -chartWidth / 2 + chartWidth * (70 / 768);
  const slot = (chartWidth * ((768 - 90) / 768)) / scene.bars.length;
  const unit = plotHeight / scale;
  const placements = useMemo(() => {
    if (scene.style === "pictogram") {
      return scene.bars.flatMap(({ value }, index) =>
        Array.from({ length: value }, (_, step) => ({
          position: [
            plotLeft + slot * (index + 0.5),
            plotBottom + unit * (step + 0.5),
            0.12,
          ] satisfies [number, number, number],
          scale: [
            Math.min(unit, slot * 0.6) * 0.82,
            Math.min(unit, slot * 0.6) * 0.82,
            Math.min(unit, slot * 0.6) * 0.82,
          ] satisfies [number, number, number],
          colour: chartBarColours[index % chartBarColours.length],
        })),
      );
    }
    if (scene.style === "line") {
      return scene.bars.map(({ value }, index) => ({
        position: [
          plotLeft + slot * (index + 0.5),
          plotBottom + unit * value,
          0.12,
        ] satisfies [number, number, number],
        scale: [0.11, 0.11, 0.11] satisfies [number, number, number],
        colour: "#ef4444",
      }));
    }
    return scene.bars.map(({ value }, index) => ({
      position: [
        plotLeft + slot * (index + 0.5),
        plotBottom + (unit * value) / 2,
        0.14,
      ] satisfies [number, number, number],
      scale: [slot * 0.55, Math.max(0.001, unit * value), 0.22] satisfies [
        number,
        number,
        number,
      ],
      colour: chartBarColours[index % chartBarColours.length],
    }));
  }, [scene, plotLeft, plotBottom, slot, unit]);
  const marks = useInstances(placements);
  const linkGeometry = useOwnedGeometry(buildChartLineGeometry, placements);
  const sway = useSway(0.12, 0.35);
  return (
    <group ref={sway} name="bar-chart">
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[chartWidth + 0.12, chartHeight + 0.12, 0.08]} />
        <meshStandardMaterial color={labPalette.board} roughness={0.5} />
      </mesh>
      <PaintedPlane
        texture={board}
        width={chartWidth}
        height={chartHeight}
        name="chart-board"
      />
      <instancedMesh
        ref={marks}
        args={[undefined, undefined, Math.max(placements.length, 1)]}
        name="chart-marks"
      >
        {scene.style === "bars" ? (
          <boxGeometry args={[1, 1, 1]} />
        ) : (
          <icosahedronGeometry args={[0.5, 1]} />
        )}
        <meshPhysicalMaterial roughness={0.3} clearcoat={0.8} />
      </instancedMesh>
      {scene.style === "line" ? (
        <mesh geometry={linkGeometry} name="chart-line">
          <meshBasicMaterial vertexColors toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};

const pixelSize = 0.2;
const frameGap = 0.3;

const paintPixelLabels: PaintCanvas<PixelGridScene> = (
  context,
  scene,
  width,
  height,
) => {
  const rowCount = scene.frames[0].length;
  const columnCount = scene.frames[0][0].length;
  const labelWidth = width * 0.3;
  const cellHeight = height / (rowCount + 1);
  const cellWidth = (width - labelWidth) / columnCount;
  context.textBaseline = "middle";
  context.textAlign = "right";
  context.fillStyle = "#e0f2fe";
  (scene.rowLabels ?? []).forEach((label, row) => {
    writeFittedText(
      context,
      label,
      labelWidth - 14,
      cellHeight * (row + 1.5),
      labelWidth - 20,
      34,
    );
  });
  context.textAlign = "center";
  for (let column = 0; column < columnCount; column++) {
    writeFittedText(
      context,
      String(column + 1),
      labelWidth + cellWidth * (column + 0.5),
      cellHeight * 0.5,
      cellWidth,
      30,
    );
  }
};

const findPixelFrameX = (scene: PixelGridScene, frameIndex: number) => {
  const frameWidth = scene.frames[0][0].length * pixelSize;
  const totalWidth =
    scene.frames.length * frameWidth + (scene.frames.length - 1) * frameGap;
  return -totalWidth / 2 + frameIndex * (frameWidth + frameGap);
};

const PixelGrid = ({ scene }: { scene: PixelGridScene }) => {
  const rowCount = scene.frames[0].length;
  const columnCount = scene.frames[0][0].length;
  const frameWidth = columnCount * pixelSize;
  const totalWidth =
    scene.frames.length * frameWidth + (scene.frames.length - 1) * frameGap;
  const fit = Math.min(1.4, 3.3 / totalWidth, 2.1 / (rowCount * pixelSize));
  const findFrameX = (frameIndex: number) => findPixelFrameX(scene, frameIndex);
  const { solid, gaps } = useMemo(() => {
    const solidPixels: {
      position: [number, number, number];
      colour: string;
    }[] = [];
    const gapPixels: { position: [number, number, number] }[] = [];
    scene.frames.forEach((frame, frameIndex) => {
      frame.forEach((line, row) => {
        Array.from({ length: line.length }, (_, column) => {
          const code = line.charAt(column);
          const position: [number, number, number] = [
            findPixelFrameX(scene, frameIndex) + (column + 0.5) * pixelSize,
            ((frame.length - 1) / 2 - row) * pixelSize,
            0.06,
          ];
          const colour = pixelColourValues[code];
          if (code === "?") {
            gapPixels.push({ position });
          } else if (colour !== undefined) {
            solidPixels.push({ position, colour });
          }
        });
      });
    });
    return { solid: solidPixels, gaps: gapPixels };
  }, [scene]);
  const solidMesh = useInstances(solid);
  const gapMesh = useInstances(gaps);
  const labels = usePaintedTexture(
    paintPixelLabels,
    scene,
    640,
    64 * (rowCount + 1),
  );
  const glow = useRef<Mesh>(null);
  const gapMaterial = useRef<MeshBasicMaterial>(null);
  const age = useLabAge();
  const sway = useSway(0.16, 0.4);
  useFrame(() => {
    if (gapMaterial.current !== null) {
      gapMaterial.current.opacity = 0.45 + 0.35 * Math.sin(age.current * 4);
    }
    if (glow.current !== null) {
      glow.current.visible = scene.highlight !== undefined;
    }
  });
  const hasLabels = scene.rowLabels !== undefined;
  return (
    <group
      ref={sway}
      scale={fit}
      position={[hasLabels ? 0.45 : 0, 0, 0]}
      name="pixel-grid"
    >
      {scene.frames.map((_, frameIndex) => (
        <mesh
          key={frameIndex}
          position={[findFrameX(frameIndex) + frameWidth / 2, 0, -0.02]}
        >
          <boxGeometry
            args={[frameWidth + 0.1, rowCount * pixelSize + 0.1, 0.06]}
          />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
      ))}
      {solid.length === 0 ? null : (
        <instancedMesh
          ref={solidMesh}
          args={[undefined, undefined, solid.length]}
          name="pixels"
        >
          <boxGeometry
            args={[pixelSize * 0.92, pixelSize * 0.92, pixelSize * 0.4]}
          />
          <meshPhysicalMaterial roughness={0.35} clearcoat={0.6} />
        </instancedMesh>
      )}
      {gaps.length === 0 ? null : (
        <instancedMesh
          ref={gapMesh}
          args={[undefined, undefined, gaps.length]}
          name="pixel-gaps"
        >
          <boxGeometry
            args={[pixelSize * 0.92, pixelSize * 0.92, pixelSize * 0.1]}
          />
          <meshBasicMaterial
            ref={gapMaterial}
            color={labPalette.glow}
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </instancedMesh>
      )}
      {scene.highlight === undefined ? null : (
        <mesh
          ref={glow}
          position={[
            findFrameX(0) + (scene.highlight.column + 0.5) * pixelSize,
            ((rowCount - 1) / 2 - scene.highlight.row) * pixelSize,
            0.2,
          ]}
        >
          <ringGeometry
            args={[pixelSize * 0.55, pixelSize * 0.7, 4, 1, Math.PI / 4]}
          />
          <meshBasicMaterial color="#fef08a" toneMapped={false} />
        </mesh>
      )}
      {hasLabels ? (
        <PaintedPlane
          texture={labels}
          width={(frameWidth / 0.7) * 1}
          height={(rowCount + 1) * pixelSize}
          position={[
            findFrameX(0) + frameWidth - frameWidth / 0.7 / 2,
            pixelSize / 2,
            0.08,
          ]}
          name="pixel-labels"
          fallbackColour="#ffffff00"
        />
      ) : null}
    </group>
  );
};

const paintBinLabels: PaintCanvas<SortMachineScene> = (
  context,
  { bins },
  width,
  height,
) => {
  const slot = width / bins.length;
  context.textAlign = "center";
  context.textBaseline = "middle";
  bins.forEach((bin, index) => {
    context.fillStyle = "#f8fafc";
    fillRoundedRect(context, slot * index + 8, 8, slot - 16, height - 16, 18);
    context.fillStyle = labInk;
    writeFittedText(
      context,
      bin,
      slot * (index + 0.5),
      height / 2 + 2,
      slot - 30,
      40,
      labHeadingFont,
    );
  });
};

const findSortItemSize = ({ size }: SortItem) => (size === "big" ? 0.36 : 0.22);

const buildSortItemGeometry = (item: SortItem) => {
  const size = findSortItemSize(item);
  return buildChunkyShapeGeometry(item.shape, size, size * 0.6);
};

const SortMachine = ({ scene }: { scene: SortMachineScene }) => {
  const item = useRef<Group>(null);
  const age = useLabAge();
  const size = findSortItemSize(scene.item);
  const itemGeometry = useOwnedGeometry(buildSortItemGeometry, scene.item);
  const binSpan = 3.4 / scene.bins.length;
  const labels = usePaintedTexture(paintBinLabels, scene, 768, 110);
  const rollers = useMemo(
    () =>
      Array.from({ length: 9 }, (_, index) => ({
        position: [-1.6 + index * 0.4, 0.62, 0] satisfies [
          number,
          number,
          number,
        ],
      })),
    [],
  );
  const rollerMesh = useInstances(rollers);
  const bins = useMemo(
    () =>
      scene.bins.map((_, index) => ({
        position: [-1.7 + binSpan * (index + 0.5), -0.55, 0.15] satisfies [
          number,
          number,
          number,
        ],
        scale: [binSpan * 0.86, 0.6, 0.7] satisfies [number, number, number],
      })),
    [scene, binSpan],
  );
  const binMesh = useInstances(bins);
  useFrame(() => {
    const body = item.current;
    if (body !== null) {
      const slide = (age.current * 0.35) % 1;
      body.position.x = -1.2 + slide * 1.6;
      body.position.y =
        0.75 + size + Math.abs(Math.sin(age.current * 3)) * 0.04;
      body.rotation.y = Math.sin(age.current * 0.8) * 0.5;
    }
  });
  return (
    <group rotation={[0.25, -0.15, 0]} name="sort-machine">
      <mesh position={[0, 0.66, 0]}>
        <boxGeometry args={[3.6, 0.08, 0.7]} />
        <meshStandardMaterial color={labPalette.belt} roughness={0.8} />
      </mesh>
      <instancedMesh
        ref={rollerMesh}
        args={[undefined, undefined, rollers.length]}
        rotation={[0, 0, 0]}
      >
        <cylinderGeometry args={[0.07, 0.07, 0.74, 8]} />
        <meshStandardMaterial
          color={labPalette.roller}
          metalness={0.6}
          roughness={0.3}
        />
      </instancedMesh>
      <group ref={item} name={`sort-item-${scene.item.shape}`}>
        <mesh geometry={itemGeometry}>
          <meshPhysicalMaterial
            color={itemColourValues[scene.item.colour]}
            roughness={0.25}
            clearcoat={1}
          />
        </mesh>
      </group>
      <instancedMesh
        ref={binMesh}
        args={[undefined, undefined, bins.length]}
        name="sort-bins"
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          color={labPalette.bin}
          roughness={0.4}
          clearcoat={0.5}
        />
      </instancedMesh>
      <PaintedPlane
        texture={labels}
        width={3.4}
        height={0.48}
        position={[0, -0.55, 0.52]}
        name="sort-labels"
        fallbackColour="#f8fafc"
      />
    </group>
  );
};

interface PlacedBranch {
  text: string;
  isLeaf: boolean;
  x: number;
  y: number;
  parent?: { x: number; y: number; isYes: boolean };
}

const placeBranches = (
  node: BranchNode,
  depth: number,
  left: number,
  right: number,
  parent?: PlacedBranch["parent"],
): PlacedBranch[] => {
  const x = (left + right) / 2;
  const y = depth;
  if ("leaf" in node) {
    return [{ text: node.leaf, isLeaf: true, x, y, parent }];
  }
  return [
    { text: node.question, isLeaf: false, x, y, parent },
    ...placeBranches(node.yes, depth + 1, left, x, { x, y, isYes: true }),
    ...placeBranches(node.no, depth + 1, x, right, { x, y, isYes: false }),
  ];
};

const findTreeDepth = (node: BranchNode): number =>
  "leaf" in node
    ? 0
    : 1 + Math.max(findTreeDepth(node.yes), findTreeDepth(node.no));

const paintBranchTree: PaintCanvas<BranchTreeScene> = (
  context,
  scene,
  width,
  height,
) => {
  const depth = findTreeDepth(scene.root);
  const placed = placeBranches(scene.root, 0, 0, 1);
  const rowHeight = height / (depth + 1);
  const toPixels = (x: number, y: number): [number, number] => [
    x * width,
    rowHeight * (y + 0.5),
  ];
  context.lineWidth = 6;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const { x, y, parent } of placed) {
    if (parent === undefined) {
      continue;
    }
    const [fromX, fromY] = toPixels(parent.x, parent.y);
    const [toX, toY] = toPixels(x, y);
    context.strokeStyle = parent.isYes ? "#22c55e" : "#ef4444";
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();
    context.fillStyle = parent.isYes ? "#15803d" : "#b91c1c";
    context.font = `800 26px ${labBodyFont}`;
    context.fillText(
      parent.isYes ? "Yes" : "No",
      (fromX + toX) / 2 + (parent.isYes ? -26 : 26),
      (fromY + toY) / 2,
    );
  }
  const boxWidth = Math.min(300, width / 2 ** depth - 12);
  for (const { text, isLeaf, x, y } of placed) {
    const [centreX, centreY] = toPixels(x, y);
    const isHighlighted = isLeaf && text === scene.highlightLeaf;
    context.fillStyle = isLeaf
      ? isHighlighted
        ? "#fde047"
        : "#e0f2fe"
      : "#1e3a8a";
    fillRoundedRect(
      context,
      centreX - boxWidth / 2,
      centreY - rowHeight * 0.3,
      boxWidth,
      rowHeight * 0.6,
      18,
    );
    context.fillStyle = isLeaf ? labInk : "#ffffff";
    writeFittedText(
      context,
      text,
      centreX,
      centreY + 2,
      boxWidth - 16,
      Math.min(34, rowHeight * 0.32),
    );
  }
};

const BranchTree = ({ scene }: { scene: BranchTreeScene }) => {
  const diagram = usePaintedTexture(paintBranchTree, scene, 1024, 640);
  const sway = useSway(0.1, 0.35);
  return (
    <group ref={sway} name="branch-tree">
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[3.7, 2.35, 0.1]} />
        <meshPhysicalMaterial color="#0f172a" roughness={0.4} clearcoat={0.6} />
      </mesh>
      <PaintedPlane
        texture={diagram}
        width={3.55}
        height={2.22}
        name="branch-diagram"
        fallbackColour="#e0f2fe"
      />
    </group>
  );
};

const paintCrateLabel: PaintCanvas<{ name: string; value: string }> = (
  context,
  { name, value },
  width,
  height,
) => {
  context.fillStyle = "#fef3c7";
  fillRoundedRect(context, 6, 6, width - 12, height - 12, 20);
  context.fillStyle = "#78350f";
  context.textAlign = "center";
  context.textBaseline = "middle";
  writeFittedText(
    context,
    name,
    width / 2,
    height * 0.28,
    width - 30,
    40,
    labHeadingFont,
  );
  context.fillStyle = labInk;
  writeFittedText(
    context,
    value,
    width / 2,
    height * 0.68,
    width - 30,
    84,
    labHeadingFont,
  );
};

const VariableCrateBox = ({
  name,
  value,
  position,
}: {
  name: string;
  value: string;
  position: [number, number, number];
}) => {
  const label = useMemo(() => ({ name, value }), [name, value]);
  const face = usePaintedTexture(paintCrateLabel, label, 256, 256);
  return (
    <group position={position} name={`crate-${name}`}>
      <mesh>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color={labPalette.crate} roughness={0.8} />
      </mesh>
      <PaintedPlane
        texture={face}
        width={0.66}
        height={0.66}
        position={[0, 0, 0.405]}
        isLit
      />
    </group>
  );
};

const paintCodeScreen: PaintCanvas<string[]> = (
  context,
  lines,
  width,
  height,
) => {
  context.fillStyle = "#0b1220";
  context.fillRect(0, 0, width, height);
  context.textAlign = "left";
  context.textBaseline = "middle";
  const lineHeight = Math.min(64, (height - 30) / Math.max(lines.length, 1));
  lines.forEach((line, index) => {
    context.fillStyle = "#64748b";
    context.font = `700 26px ${labBodyFont}`;
    context.fillText(String(index + 1), 18, 30 + lineHeight * (index + 0.5));
    context.fillStyle = "#a5f3fc";
    writeFittedText(
      context,
      line,
      62,
      30 + lineHeight * (index + 0.5),
      width - 80,
      34,
    );
  });
};

const VariableCrates = ({ scene }: { scene: VariableCratesScene }) => {
  const code = usePaintedTexture(paintCodeScreen, scene.code, 512, 420);
  const sway = useSway(0.1, 0.4);
  return (
    <group ref={sway} name="variable-crates">
      <group position={[-0.95, 0.15, 0]} rotation={[0, 0.25, 0]}>
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[1.8, 1.55, 0.08]} />
          <meshPhysicalMaterial
            color="#1e293b"
            roughness={0.3}
            clearcoat={0.8}
          />
        </mesh>
        <PaintedPlane
          texture={code}
          width={1.68}
          height={1.4}
          name="code-screen"
          fallbackColour="#0b1220"
        />
      </group>
      {scene.crates.map(({ name, value }, index) => (
        <VariableCrateBox
          key={name}
          name={name}
          value={value}
          position={[
            0.75 + (index % 2) * 0.88,
            -0.4 + Math.floor(index / 2) * 0.9,
            0.1,
          ]}
        />
      ))}
    </group>
  );
};

const paintStoryCard: PaintCanvas<{
  text: string;
  number: number;
  isMissing: boolean;
  isHighlighted: boolean;
}> = (context, { text, number, isMissing, isHighlighted }, width, height) => {
  context.fillStyle = isMissing
    ? "#cffafe"
    : isHighlighted
      ? "#fef9c3"
      : "#ffffff";
  fillRoundedRect(context, 6, 6, width - 12, height - 12, 26);
  context.fillStyle = "#0e7490";
  context.beginPath();
  context.arc(46, 46, 30, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `800 34px ${labHeadingFont}`;
  context.fillText(String(number), 46, 48);
  context.fillStyle = labInk;
  if (isMissing) {
    context.font = `800 150px ${labHeadingFont}`;
    context.fillText("?", width / 2, height / 2 + 20);
    return;
  }
  const words = text.split(" ");
  const lines: string[] = [];
  for (const word of words) {
    const current = lines.at(-1);
    if (current !== undefined && `${current} ${word}`.length <= 11) {
      lines[lines.length - 1] = `${current} ${word}`;
    } else {
      lines.push(word);
    }
  }
  lines.forEach((line, index) => {
    writeFittedText(
      context,
      line,
      width / 2,
      height / 2 + 20 + (index - (lines.length - 1) / 2) * 50,
      width - 30,
      44,
    );
  });
};

const StoryCard = ({
  text,
  number,
  isMissing,
  isHighlighted,
  position,
}: {
  text: string;
  number: number;
  isMissing: boolean;
  isHighlighted: boolean;
  position: [number, number, number];
}) => {
  const card = useMemo(
    () => ({ text, number, isMissing, isHighlighted }),
    [text, number, isMissing, isHighlighted],
  );
  const face = usePaintedTexture(paintStoryCard, card, 256, 320);
  const body = useRef<Group>(null);
  const age = useLabAge();
  useFrame(() => {
    if (body.current !== null) {
      body.current.position.y =
        position[1] +
        (isMissing || isHighlighted ? Math.sin(age.current * 3) * 0.05 : 0);
    }
  });
  return (
    <group
      ref={body}
      position={position}
      rotation={[-0.1, -position[0] * 0.12, 0]}
      name={isMissing ? "story-card-missing" : "story-card"}
    >
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[0.7, 0.88, 0.04]} />
        <meshStandardMaterial
          color={
            isMissing ? labPalette.glow : isHighlighted ? "#facc15" : "#1e293b"
          }
          emissive={
            isMissing || isHighlighted
              ? isMissing
                ? labPalette.glow
                : "#facc15"
              : "#000000"
          }
          emissiveIntensity={0.5}
        />
      </mesh>
      <PaintedPlane texture={face} width={0.64} height={0.8} isLit />
    </group>
  );
};

const StoryCards = ({ scene }: { scene: StoryCardsScene }) => {
  const spacing = Math.min(0.78, 3.6 / scene.cards.length);
  return (
    <group scale={Math.min(1.2, spacing / 0.62)} name="story-cards">
      {scene.cards.map((text, index) => (
        <StoryCard
          key={`${String(index)}-${text}`}
          text={text}
          number={index + 1}
          isMissing={index === scene.missingIndex}
          isHighlighted={index === scene.highlightIndex}
          position={[(index - (scene.cards.length - 1) / 2) * 0.78, 0, 0]}
        />
      ))}
      <mesh position={[0, -0.5, -0.1]}>
        <boxGeometry args={[scene.cards.length * 0.78 + 0.2, 0.06, 0.4]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
    </group>
  );
};

const drawPhotoSubject = (
  context: CanvasRenderingContext2D,
  scene: PhotoFrameScene,
  width: number,
  height: number,
) => {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#7dd3fc");
  sky.addColorStop(1, "#e0f2fe");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#86efac";
  context.fillRect(0, height * 0.68, width, height * 0.32);
  context.fillStyle = "#fde047";
  context.beginPath();
  context.arc(
    width * 0.82,
    height * 0.18,
    Math.min(width, height) * 0.08,
    0,
    Math.PI * 2,
  );
  context.fill();
  const zoom = { wide: 0.45, medium: 0.75, "close-up": 1.35 }[scene.shot];
  const unit = Math.min(width, height) * 0.5 * zoom;
  const centreX = width / 2;
  const groundY = scene.shot === "close-up" ? height * 0.95 : height * 0.72;
  switch (scene.subject) {
    case "house":
      context.fillStyle = "#fca5a5";
      context.fillRect(centreX - unit * 0.6, groundY - unit, unit * 1.2, unit);
      context.fillStyle = "#b91c1c";
      context.beginPath();
      context.moveTo(centreX - unit * 0.75, groundY - unit);
      context.lineTo(centreX, groundY - unit * 1.6);
      context.lineTo(centreX + unit * 0.75, groundY - unit);
      context.fill();
      context.fillStyle = "#78350f";
      context.fillRect(
        centreX - unit * 0.15,
        groundY - unit * 0.5,
        unit * 0.3,
        unit * 0.5,
      );
      return;
    case "tree":
      context.fillStyle = "#92400e";
      context.fillRect(
        centreX - unit * 0.12,
        groundY - unit,
        unit * 0.24,
        unit,
      );
      context.fillStyle = "#16a34a";
      context.beginPath();
      context.arc(centreX, groundY - unit * 1.25, unit * 0.6, 0, Math.PI * 2);
      context.fill();
      return;
    case "cat":
      context.fillStyle = "#fb923c";
      context.beginPath();
      context.ellipse(
        centreX,
        groundY - unit * 0.4,
        unit * 0.55,
        unit * 0.4,
        0,
        0,
        Math.PI * 2,
      );
      context.arc(
        centreX + unit * 0.5,
        groundY - unit * 0.9,
        unit * 0.32,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.beginPath();
      context.moveTo(centreX + unit * 0.28, groundY - unit * 1.1);
      context.lineTo(centreX + unit * 0.36, groundY - unit * 1.45);
      context.lineTo(centreX + unit * 0.52, groundY - unit * 1.18);
      context.moveTo(centreX + unit * 0.56, groundY - unit * 1.18);
      context.lineTo(centreX + unit * 0.72, groundY - unit * 1.45);
      context.lineTo(centreX + unit * 0.78, groundY - unit * 1.05);
      context.fill();
      context.fillStyle = labInk;
      context.beginPath();
      context.arc(
        centreX + unit * 0.42,
        groundY - unit * 0.95,
        unit * 0.05,
        0,
        Math.PI * 2,
      );
      context.arc(
        centreX + unit * 0.62,
        groundY - unit * 0.95,
        unit * 0.05,
        0,
        Math.PI * 2,
      );
      context.fill();
      return;
    case "flower":
      context.strokeStyle = "#15803d";
      context.lineWidth = unit * 0.08;
      context.beginPath();
      context.moveTo(centreX, groundY);
      context.lineTo(centreX, groundY - unit);
      context.stroke();
      context.fillStyle = "#f472b6";
      for (let petal = 0; petal < 6; petal++) {
        const angle = (petal / 6) * Math.PI * 2;
        context.beginPath();
        context.arc(
          centreX + Math.cos(angle) * unit * 0.25,
          groundY - unit + Math.sin(angle) * unit * 0.25,
          unit * 0.18,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      context.fillStyle = "#facc15";
      context.beginPath();
      context.arc(centreX, groundY - unit, unit * 0.15, 0, Math.PI * 2);
      context.fill();
      return;
    case "friends":
      [-0.45, 0.45].forEach((offset, index) => {
        context.fillStyle = index === 0 ? "#3b82f6" : "#a855f7";
        context.fillRect(
          centreX + offset * unit - unit * 0.2,
          groundY - unit * 0.8,
          unit * 0.4,
          unit * 0.8,
        );
        context.fillStyle = "#fcd34d";
        context.beginPath();
        context.arc(
          centreX + offset * unit,
          groundY - unit * 1.05,
          unit * 0.22,
          0,
          Math.PI * 2,
        );
        context.fill();
      });
      return;
    case "mountain":
      context.fillStyle = "#64748b";
      context.beginPath();
      context.moveTo(centreX - unit * 1.2, groundY);
      context.lineTo(centreX, groundY - unit * 1.5);
      context.lineTo(centreX + unit * 1.2, groundY);
      context.fill();
      context.fillStyle = "#f8fafc";
      context.beginPath();
      context.moveTo(centreX - unit * 0.3, groundY - unit * 1.12);
      context.lineTo(centreX, groundY - unit * 1.5);
      context.lineTo(centreX + unit * 0.3, groundY - unit * 1.12);
      context.fill();
      return;
  }
};

const paintPhoto: PaintCanvas<PhotoFrameScene> = (
  context,
  scene,
  width,
  height,
) => {
  const sketch = document.createElement("canvas");
  sketch.width = width;
  sketch.height = height;
  const sketchContext = sketch.getContext("2d");
  if (sketchContext === null) {
    return;
  }
  drawPhotoSubject(sketchContext, scene, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.save();
  if (scene.tilt === "crooked") {
    context.translate(width / 2, height / 2);
    context.rotate(0.22);
    context.scale(1.3, 1.3);
    context.translate(-width / 2, -height / 2);
  }
  if (scene.focus === "blurry") {
    context.globalAlpha = 0.16;
    for (let shift = 0; shift < 12; shift++) {
      const angle = (shift / 12) * Math.PI * 2;
      context.drawImage(sketch, Math.cos(angle) * 9, Math.sin(angle) * 9);
    }
    context.globalAlpha = 1;
  } else {
    context.drawImage(sketch, 0, 0);
  }
  context.restore();
  if (scene.light === "dark") {
    context.fillStyle = "rgba(2, 6, 23, 0.68)";
    context.fillRect(0, 0, width, height);
  }
  if (scene.light === "bright") {
    context.fillStyle = "rgba(255, 255, 255, 0.6)";
    context.fillRect(0, 0, width, height);
  }
};

const PhotoFrame = ({ scene }: { scene: PhotoFrameScene }) => {
  const isLandscape = scene.orientation === "landscape";
  const photo = usePaintedTexture(
    paintPhoto,
    scene,
    isLandscape ? 480 : 340,
    isLandscape ? 320 : 460,
  );
  const cameraGeometry = useOwnedGeometry(
    buildDeviceGeometry,
    "digital-camera",
  );
  const photoWidth = isLandscape ? 2.4 : 1.55;
  const photoHeight = isLandscape ? 1.6 : 2.1;
  const sway = useSway(0.12, 0.4);
  return (
    <group ref={sway} name="photo-frame">
      <group position={[0.45, 0, 0]} rotation={[0, -0.12, 0]}>
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[photoWidth + 0.16, photoHeight + 0.16, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <PaintedPlane
          texture={photo}
          width={photoWidth}
          height={photoHeight}
          name={`photo-${scene.orientation}`}
          fallbackColour="#7dd3fc"
        />
      </group>
      <mesh
        geometry={cameraGeometry}
        position={[-1.35, -0.75, 0.4]}
        rotation={[0.2, 0.6, 0]}
        scale={0.8}
      >
        <meshPhysicalMaterial vertexColors roughness={0.3} clearcoat={0.8} />
      </mesh>
    </group>
  );
};

const ShapeLayers = ({ scene }: { scene: ShapeLayersScene }) => {
  const group = useRef<Group>(null);
  const age = useLabAge();
  const geometries = useMemo(
    () =>
      scene.layers.map(({ shape }) =>
        buildChunkyShapeGeometry(shape, 0.62, 0.06),
      ),
    [scene],
  );
  useDisposedListOnUnmount(geometries);
  const edges = useMemo(
    () =>
      new EdgesGeometry(
        new BoxGeometry(2.6, 2.0, scene.layers.length * 0.32 + 0.2),
      ),
    [scene],
  );
  useDisposedOnUnmount(edges);
  useFrame(() => {
    if (group.current !== null) {
      group.current.rotation.y = -0.55 + Math.sin(age.current * 0.5) * 0.25;
    }
  });
  const layerSpacing = 0.32;
  return (
    <group ref={group} name="shape-layers">
      {scene.layers.map(({ shape, colour }, index) => (
        <mesh
          key={`${String(index)}-${shape}`}
          geometry={geometries[index]}
          position={[
            (index - (scene.layers.length - 1) / 2) * 0.22,
            (index - (scene.layers.length - 1) / 2) * -0.1,
            (index - (scene.layers.length - 1) / 2) * layerSpacing,
          ]}
          name={`layer-${shape}`}
        >
          <meshPhysicalMaterial
            color={itemColourValues[colour]}
            roughness={0.25}
            clearcoat={1}
            transparent
            opacity={0.96}
          />
        </mesh>
      ))}
      {scene.isGrouped === true ? (
        <lineSegments geometry={edges} name="layer-group">
          <lineBasicMaterial color={labPalette.glow} />
        </lineSegments>
      ) : null}
    </group>
  );
};

const workbenchUnit = 0.42;

const buildWorkbenchGeometry = (shape: WorkbenchShape): BufferGeometry => {
  switch (shape) {
    case "cube":
      return new BoxGeometry(1, 1, 1);
    case "cuboid":
      return new BoxGeometry(1.6, 0.8, 0.8);
    case "cylinder":
      return new CylinderGeometry(0.5, 0.5, 1, 20);
    case "cone":
      return new ConeGeometry(0.55, 1, 20);
    case "sphere":
      return new SphereGeometry(0.55, 18, 12);
    case "pyramid":
      return new ConeGeometry(0.7, 1, 4).rotateY(Math.PI / 4);
    case "prism":
      return new CylinderGeometry(0.6, 0.6, 1.4, 3)
        .rotateZ(Math.PI / 2)
        .rotateX(Math.PI / 2);
  }
};

const ModelWorkbench = ({ scene }: { scene: ModelWorkbenchScene }) => {
  const geometries = useMemo(
    () => scene.parts.map(({ shape }) => buildWorkbenchGeometry(shape)),
    [scene],
  );
  useDisposedListOnUnmount(geometries);
  return (
    <group
      position={[0, -0.8, 0]}
      rotation={[0.35, 0, 0]}
      name="model-workbench"
    >
      <Turntable radius={1.3}>
        <group position={[0, 0.02, 0]} scale={workbenchUnit}>
          {scene.parts.map(({ shape, colour, position, size }, index) => (
            <mesh
              key={`${String(index)}-${shape}`}
              geometry={geometries[index]}
              position={[position[0], position[1] + 0.5, position[2]]}
              scale={size ?? [1, 1, 1]}
              name={`part-${shape}`}
            >
              <meshPhysicalMaterial
                color={itemColourValues[colour]}
                roughness={0.3}
                clearcoat={0.8}
                flatShading={shape === "pyramid" || shape === "prism"}
              />
            </mesh>
          ))}
        </group>
      </Turntable>
    </group>
  );
};

export const renderComputingScene = (scene: ComputingScene): ReactNode => {
  switch (scene.kind) {
    case "robot-grid":
      return <RobotGrid scene={scene} />;
    case "code-stack":
      return <CodeStack scene={scene} />;
    case "device":
      return <DeviceOnTurntable scene={scene} />;
    case "tablet-screen":
      return <TabletScreen scene={scene} />;
    case "search-engine":
      return <SearchEngine scene={scene} />;
    case "network-map":
      return <NetworkMap scene={scene} />;
    case "bar-chart":
      return <BarChart scene={scene} />;
    case "pixel-grid":
      return <PixelGrid scene={scene} />;
    case "sort-machine":
      return <SortMachine scene={scene} />;
    case "branch-tree":
      return <BranchTree scene={scene} />;
    case "variable-crates":
      return <VariableCrates scene={scene} />;
    case "story-cards":
      return <StoryCards scene={scene} />;
    case "photo-frame":
      return <PhotoFrame scene={scene} />;
    case "shape-layers":
      return <ShapeLayers scene={scene} />;
    case "model-workbench":
      return <ModelWorkbench scene={scene} />;
  }
};
