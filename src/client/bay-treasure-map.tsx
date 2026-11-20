import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
  type Group,
  type MeshBasicMaterial,
} from "three";
import type {
  GridPoint,
  Landmark,
  MapPicture,
  TreasureGrid,
} from "../curriculum/treasure-map.js";
import { quartersInATurn } from "../curriculum/treasure-map.js";
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

const mapPalette = {
  shell: "#ffb4a2",
  shellLine: "#e07a6a",
  starfish: "#ff7a59",
  crab: "#e5484d",
  claw: "#c2312f",
  eye: "#14161f",
  anchor: "#7d8fa6",
  clam: "#cdb8e6",
  fish: "#4cc9f0",
  fin: "#ffd23f",
  turtleShell: "#2f9e6b",
  turtleSkin: "#9be3a0",
  ground: "#e9cf9c",
  ring: "#5ee0f0",
  chest: "#9b5a2a",
  submarine: "#ffcf4a",
  window: "#9fe7ff",
  flag: "#ff4f8b",
  pole: "#f4f7fb",
  outline: "#ff8a3d",
  mirror: "#bfe9ff",
  paper: "#f3e3bf",
  paperEdge: "#c9a86a",
  gridLine: "#b8975f",
  axis: "#5a3d1c",
  number: "#4a3215",
} as const;

const buildStarGeometry = (outer: number, inner: number): BufferGeometry => {
  const points = Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2 + Math.PI / 2;
    const reach = index % 2 === 0 ? outer : inner;
    return new Vector2(Math.cos(angle) * reach, Math.sin(angle) * reach);
  });
  return new ExtrudeGeometry(new Shape(points), {
    depth: 0.06,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    bevelSegments: 1,
  });
};

const buildLandmarkGeometry = (landmark: Landmark): BufferGeometry => {
  switch (landmark) {
    case "shell":
      return mergePaintedGeometries([
        {
          geometry: new ConeGeometry(0.22, 0.3, 9, 1, true)
            .rotateX(Math.PI)
            .scale(1, 1, 0.45)
            .translate(0, 0.17, 0),
          colour: mapPalette.shell,
        },
        {
          geometry: new SphereGeometry(0.06, 6, 4).translate(0, 0.03, 0),
          colour: mapPalette.shellLine,
        },
      ]);
    case "starfish":
      return mergePaintedGeometries([
        {
          geometry: buildStarGeometry(0.22, 0.09).translate(0, 0.22, -0.03),
          colour: mapPalette.starfish,
        },
      ]);
    case "crab":
      return mergePaintedGeometries([
        {
          geometry: new SphereGeometry(1, 8, 5)
            .scale(0.2, 0.12, 0.15)
            .translate(0, 0.12, 0),
          colour: mapPalette.crab,
        },
        {
          geometry: new SphereGeometry(0.07, 6, 4).translate(-0.22, 0.2, 0.06),
          colour: mapPalette.claw,
        },
        {
          geometry: new SphereGeometry(0.07, 6, 4).translate(0.22, 0.2, 0.06),
          colour: mapPalette.claw,
        },
        {
          geometry: new SphereGeometry(0.03, 4, 3).translate(-0.06, 0.25, 0.1),
          colour: mapPalette.eye,
        },
        {
          geometry: new SphereGeometry(0.03, 4, 3).translate(0.06, 0.25, 0.1),
          colour: mapPalette.eye,
        },
      ]);
    case "anchor":
      return mergePaintedGeometries([
        {
          geometry: new TorusGeometry(0.06, 0.022, 4, 10).translate(0, 0.42, 0),
          colour: mapPalette.anchor,
        },
        {
          geometry: new BoxGeometry(0.05, 0.32, 0.05).translate(0, 0.22, 0),
          colour: mapPalette.anchor,
        },
        {
          geometry: new BoxGeometry(0.22, 0.04, 0.04).translate(0, 0.32, 0),
          colour: mapPalette.anchor,
        },
        {
          geometry: new TorusGeometry(0.16, 0.025, 4, 10, Math.PI)
            .rotateZ(Math.PI)
            .translate(0, 0.16, 0),
          colour: mapPalette.anchor,
        },
      ]);
    case "pearl":
      return mergePaintedGeometries([
        {
          geometry: new SphereGeometry(0.2, 10, 3, 0, Math.PI * 2, Math.PI / 2)
            .scale(1, 0.5, 1)
            .translate(0, 0.1, 0),
          colour: mapPalette.clam,
        },
        {
          geometry: new SphereGeometry(0.09, 8, 6).translate(0, 0.16, 0),
          colour: picturePalette.pearl,
        },
      ]);
    case "fish":
      return mergePaintedGeometries([
        {
          geometry: new SphereGeometry(1, 8, 5)
            .scale(0.22, 0.14, 0.09)
            .translate(0, 0.2, 0),
          colour: mapPalette.fish,
        },
        {
          geometry: new ConeGeometry(0.1, 0.14, 4)
            .rotateZ(Math.PI / 2)
            .translate(-0.27, 0.2, 0),
          colour: mapPalette.fin,
        },
        {
          geometry: new SphereGeometry(0.025, 4, 3).translate(0.13, 0.23, 0.07),
          colour: mapPalette.eye,
        },
      ]);
  }
};

const LandmarkProp = ({
  landmark,
  position,
  turn = 0,
}: {
  landmark: Landmark;
  position: Vector;
  turn?: number;
}) => {
  const geometry = useMemo(() => buildLandmarkGeometry(landmark), [landmark]);
  useDisposedOnUnmount(geometry);
  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={[0, turn, 0]}
      name={`landmark-${landmark}`}
    >
      <PaintedMaterial />
    </mesh>
  );
};

const buildTurtleGeometry = () =>
  mergePaintedGeometries([
    {
      geometry: new SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2)
        .scale(0.26, 0.16, 0.32)
        .translate(0, 0.05, 0),
      colour: mapPalette.turtleShell,
    },
    {
      geometry: new SphereGeometry(0.09, 8, 6).translate(0, 0.08, 0.38),
      colour: mapPalette.turtleSkin,
    },
    ...[-1, 1].flatMap((side) => [
      {
        geometry: new SphereGeometry(1, 6, 4)
          .scale(0.14, 0.03, 0.07)
          .rotateY(side * 0.5)
          .translate(side * 0.27, 0.04, 0.16),
        colour: mapPalette.turtleSkin,
      },
      {
        geometry: new SphereGeometry(1, 6, 4)
          .scale(0.1, 0.03, 0.05)
          .rotateY(-side * 0.5)
          .translate(side * 0.22, 0.04, -0.22),
        colour: mapPalette.turtleSkin,
      },
    ]),
    {
      geometry: new SphereGeometry(0.022, 4, 3).translate(-0.045, 0.12, 0.45),
      colour: mapPalette.eye,
    },
    {
      geometry: new SphereGeometry(0.022, 4, 3).translate(0.045, 0.12, 0.45),
      colour: mapPalette.eye,
    },
  ]);

const compassReach = 0.95;

export const findCompassSpot = (direction: number): Vector => {
  const angle = (direction / quartersInATurn) * Math.PI * 2;
  return [Math.sin(angle) * compassReach, 0, -Math.cos(angle) * compassReach];
};

export const findFacingTurn = (direction: number): number =>
  Math.PI - (direction / quartersInATurn) * Math.PI * 2;

const TurnScene = ({
  around,
  facing,
}: {
  around: readonly Landmark[];
  facing: number;
}) => {
  const { age, motionScale } = usePromptGrowth();
  const turtle = useRef<Group>(null);
  const beam = useRef<MeshBasicMaterial>(null);
  const turtleGeometry = useMemo(() => buildTurtleGeometry(), []);
  useDisposedOnUnmount(turtleGeometry);
  const facingTurn = findFacingTurn(facing);

  useFrame(() => {
    const time = age.current * motionScale;
    if (turtle.current !== null) {
      turtle.current.position.y = 0.04 + Math.sin(time * 2.2) * 0.02;
      turtle.current.rotation.set(
        Math.sin(time * 1.6) * 0.04,
        facingTurn,
        Math.sin(time * 1.1) * 0.05,
      );
    }
    if (beam.current !== null) {
      beam.current.opacity = 0.35 + Math.sin(time * 3) * 0.12;
    }
  });

  return (
    <group name="turtle-turns">
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[1.32, 1.4, 0.06, 40]} />
        <meshPhysicalMaterial
          color={mapPalette.ground}
          roughness={0.9}
          sheen={0.3}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <torusGeometry args={[compassReach * 0.62, 0.012, 4, 48]} />
        <meshBasicMaterial color={mapPalette.ring} toneMapped={false} />
      </mesh>
      <group ref={turtle} name="turtle">
        <mesh geometry={turtleGeometry}>
          <PaintedMaterial />
        </mesh>
        <mesh position={[0, 0.06, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
          <meshBasicMaterial
            ref={beam}
            color={mapPalette.ring}
            transparent
            opacity={0.4}
            toneMapped={false}
          />
        </mesh>
      </group>
      {around.map((landmark, direction) => (
        <LandmarkProp
          key={landmark}
          landmark={landmark}
          position={findCompassSpot(direction)}
        />
      ))}
    </group>
  );
};

const shelfSize = { width: 2.3, rowHeight: 0.66 };

const ShelfScene = ({ rows }: { rows: readonly (readonly Landmark[])[] }) => {
  const planks = useMemo(
    (): Piece[] =>
      rows.map((_, row) => ({
        position: [0, (0.5 - row) * shelfSize.rowHeight - 0.24, 0.12],
        scale: [shelfSize.width, 0.06, 0.36],
      })),
    [rows],
  );
  const plankGeometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  useDisposedOnUnmount(plankGeometry);

  return (
    <group name="landmark-shelf" rotation={[0.18, 0, 0]}>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry
          args={[
            shelfSize.width + 0.16,
            shelfSize.rowHeight * rows.length + 0.2,
            0.06,
          ]}
        />
        <meshPhysicalMaterial
          color={picturePalette.darkWood}
          roughness={0.7}
          clearcoat={0.3}
        />
      </mesh>
      <PieceInstances pieces={planks} geometry={plankGeometry} name="planks">
        <meshPhysicalMaterial
          color={picturePalette.wood}
          roughness={0.6}
          clearcoat={0.4}
        />
      </PieceInstances>
      {rows.flatMap((row, rowIndex) =>
        row.map((landmark, column) => (
          <LandmarkProp
            key={landmark}
            landmark={landmark}
            position={[
              (column - (row.length - 1) / 2) * (shelfSize.width / 3),
              (0.5 - rowIndex) * shelfSize.rowHeight - 0.21,
              0.14,
            ]}
          />
        )),
      )}
    </group>
  );
};

const gridBoard: BoardSize = {
  width: 2.3,
  height: 2.3,
  canvasWidth: 512,
  canvasHeight: 512,
};
const gridStart = 0.11;
const gridSpan = 0.83;

const findGridShare = (value: number, low: number, high: number) =>
  gridStart + ((value - low) / (high - low)) * gridSpan;

const buildGridPainter =
  (low: number, high: number): PaintCanvas =>
  (context, width, height) => {
    context.fillStyle = mapPalette.paper;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = mapPalette.paperEdge;
    context.lineWidth = 10;
    context.strokeRect(5, 5, width - 10, height - 10);
    const toX = (value: number) => findGridShare(value, low, high) * width;
    const toY = (value: number) =>
      (1 - findGridShare(value, low, high)) * height;
    const axisAt = Math.max(low, Math.min(high, 0));
    for (let value = low; value <= high; value++) {
      context.strokeStyle = mapPalette.gridLine;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(toX(value), toY(low));
      context.lineTo(toX(value), toY(high));
      context.moveTo(toX(low), toY(value));
      context.lineTo(toX(high), toY(value));
      context.stroke();
      const isLabelled = value !== 0 || low === 0;
      if (isLabelled) {
        paintText(
          context,
          formatNumber(value),
          toX(value),
          toY(axisAt) + 20,
          22,
          mapPalette.number,
        );
      }
      if (value !== 0) {
        paintText(
          context,
          formatNumber(value),
          toX(axisAt) - 16,
          toY(value),
          22,
          mapPalette.number,
          "right",
        );
      }
    }
    context.strokeStyle = mapPalette.axis;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(toX(low), toY(axisAt));
    context.lineTo(toX(high) + 14, toY(axisAt));
    context.moveTo(toX(axisAt), toY(low));
    context.lineTo(toX(axisAt), toY(high) - 14);
    context.stroke();
    paintText(
      context,
      "x",
      toX(high) + 6,
      toY(axisAt) - 18,
      26,
      mapPalette.axis,
    );
    paintText(
      context,
      "y",
      toX(axisAt) + 18,
      toY(high) - 6,
      26,
      mapPalette.axis,
    );
  };

const placeOnGrid = (
  { x, y }: GridPoint,
  { low, high }: TreasureGrid,
  depth: number,
): Vector =>
  findBoardPoint(
    gridBoard,
    findGridShare(x, low, high),
    findGridShare(y, low, high),
    depth,
  );

const buildChestGeometry = () =>
  mergePaintedGeometries([
    {
      geometry: new BoxGeometry(0.2, 0.12, 0.12).translate(0, 0, 0.06),
      colour: mapPalette.chest,
    },
    {
      geometry: new CylinderGeometry(0.06, 0.06, 0.2, 8, 1, false, 0, Math.PI)
        .rotateZ(Math.PI / 2)
        .rotateX(-Math.PI / 2)
        .translate(0, 0.06, 0.06),
      colour: picturePalette.gold,
    },
  ]);

const buildSubmarineGeometry = () =>
  mergePaintedGeometries([
    {
      geometry: new SphereGeometry(1, 10, 6).scale(0.2, 0.09, 0.09),
      colour: mapPalette.submarine,
    },
    {
      geometry: new BoxGeometry(0.07, 0.07, 0.05).translate(0.02, 0.1, 0),
      colour: mapPalette.submarine,
    },
    {
      geometry: new SphereGeometry(0.03, 6, 4).translate(0.1, 0.01, 0.08),
      colour: mapPalette.window,
    },
    {
      geometry: new ConeGeometry(0.05, 0.06, 4)
        .rotateZ(Math.PI / 2)
        .translate(-0.22, 0, 0),
      colour: mapPalette.outline,
    },
  ]);

const buildFlagGeometry = () =>
  mergePaintedGeometries([
    {
      geometry: new CylinderGeometry(0.012, 0.012, 0.3, 5).translate(
        0,
        0.15,
        0,
      ),
      colour: mapPalette.pole,
    },
    {
      geometry: new BoxGeometry(0.12, 0.08, 0.01).translate(0.06, 0.26, 0),
      colour: mapPalette.flag,
    },
  ]);

const useGridGeometries = () => {
  const geometries = useMemo(
    () => ({
      chest: buildChestGeometry(),
      submarine: buildSubmarineGeometry(),
      flag: buildFlagGeometry(),
      edge: new CylinderGeometry(1, 1, 1, 6),
      dot: new SphereGeometry(1, 8, 6),
    }),
    [],
  );
  useDisposedOnUnmount(geometries.chest);
  useDisposedOnUnmount(geometries.submarine);
  useDisposedOnUnmount(geometries.flag);
  useDisposedOnUnmount(geometries.edge);
  useDisposedOnUnmount(geometries.dot);
  return geometries;
};

export const listOutlineEdges = (
  outline: readonly GridPoint[],
  isClosed: boolean,
): [GridPoint, GridPoint][] =>
  outline
    .map((corner, index): [GridPoint, GridPoint] => [
      corner,
      outline[(index + 1) % outline.length],
    ])
    .slice(0, isClosed ? outline.length : outline.length - 1);

const buildEdgePiece = (from: Vector, to: Vector): Piece => {
  const across = to[0] - from[0];
  const up = to[1] - from[1];
  return {
    position: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, from[2]],
    rotation: [0, 0, Math.atan2(up, across) - Math.PI / 2],
    scale: [0.018, Math.hypot(across, up), 0.018],
  };
};

const GridScene = ({ grid }: { grid: TreasureGrid }) => {
  const { age, motionScale } = usePromptGrowth();
  const geometries = useGridGeometries();
  const paint = useMemo(
    () => buildGridPainter(grid.low, grid.high),
    [grid.low, grid.high],
  );
  const glow = useRef<Group>(null);
  const submarine = useRef<Group>(null);
  const edges = useMemo(
    () =>
      listOutlineEdges(grid.outline, grid.isOutlineClosed).map(([from, to]) =>
        buildEdgePiece(
          placeOnGrid(from, grid, 0.03),
          placeOnGrid(to, grid, 0.03),
        ),
      ),
    [grid],
  );
  const corners = useMemo(
    () =>
      grid.outline.map((corner): Piece => ({
        position: placeOnGrid(corner, grid, 0.04),
        scale: [0.045, 0.045, 0.045],
      })),
    [grid],
  );
  const flags = useMemo(
    () =>
      grid.flags.map((flag): Piece => ({
        position: placeOnGrid(flag, grid, 0.02),
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 1],
      })),
    [grid],
  );

  useFrame(() => {
    const time = age.current * motionScale;
    if (glow.current !== null) {
      glow.current.scale.setScalar(1 + Math.sin(time * 3.2) * 0.12);
    }
    if (submarine.current !== null) {
      submarine.current.position.z = 0.12 + Math.sin(time * 1.8) * 0.02;
      submarine.current.rotation.z = Math.sin(time * 1.2) * 0.06;
    }
  });

  return (
    <group name="treasure-grid">
      <PaintedBoard
        size={gridBoard}
        paint={paint}
        frameColour={mapPalette.chest}
      />
      {grid.mirror === undefined ? null : (
        <mesh
          name="mirror-line"
          position={
            grid.mirror.axis === "x"
              ? placeOnGrid(
                  { x: grid.mirror.at, y: (grid.low + grid.high) / 2 },
                  grid,
                  0.05,
                )
              : placeOnGrid(
                  { x: (grid.low + grid.high) / 2, y: grid.mirror.at },
                  grid,
                  0.05,
                )
          }
          rotation={[0, 0, grid.mirror.axis === "x" ? 0 : Math.PI / 2]}
        >
          <boxGeometry args={[0.035, gridBoard.height * gridSpan, 0.08]} />
          <meshPhysicalMaterial
            color={mapPalette.mirror}
            emissive={mapPalette.mirror}
            emissiveIntensity={0.5}
            roughness={0.05}
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
      )}
      <PieceInstances
        pieces={edges}
        geometry={geometries.edge}
        name="shape-edges"
      >
        <meshPhysicalMaterial color={mapPalette.outline} roughness={0.3} />
      </PieceInstances>
      <PieceInstances
        pieces={corners}
        geometry={geometries.dot}
        name="shape-corners"
      >
        <meshPhysicalMaterial
          color={mapPalette.outline}
          roughness={0.2}
          clearcoat={1}
        />
      </PieceInstances>
      <PieceInstances
        pieces={flags}
        geometry={geometries.flag}
        name="grid-flags"
      >
        <PaintedMaterial />
      </PieceInstances>
      {grid.flags.map((flag) => (
        <LabelSprite
          key={flag.label}
          text={flag.label}
          position={placeOnGrid(
            { x: flag.x + 0.55, y: flag.y + 0.5 },
            grid,
            0.2,
          )}
          height={0.16}
        />
      ))}
      {grid.treasure === undefined ? null : (
        <group position={placeOnGrid(grid.treasure, grid, 0)} name="treasure">
          <mesh
            geometry={geometries.chest}
            rotation={[Math.PI / 2 - 0.4, 0, 0]}
          >
            <PaintedMaterial />
          </mesh>
          <group ref={glow}>
            <mesh position={[0, 0, 0.01]}>
              <torusGeometry args={[0.13, 0.016, 4, 24]} />
              <meshBasicMaterial
                color={picturePalette.glow}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>
      )}
      {grid.submarine === undefined ? null : (
        <group position={placeOnGrid(grid.submarine, grid, 0)}>
          <group ref={submarine} name="submarine">
            <mesh geometry={geometries.submarine}>
              <PaintedMaterial />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

export const TreasureMapScene = ({ picture }: { picture: MapPicture }) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const grower = useRef<Group>(null);

  useFrame(() => {
    grower.current?.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
  });

  const renderPicture = () => {
    switch (picture.kind) {
      case "turn":
        return (
          <group rotation={[0.62, 0, 0]} position={[0, -0.1, 0]}>
            <TurnScene around={picture.around} facing={picture.facing} />
          </group>
        );
      case "shelf":
        return <ShelfScene rows={picture.rows} />;
      case "grid":
        return (
          <group rotation={[-0.3, -0.08, 0]} position={[0, 0.1, 0]}>
            <GridScene grid={picture} />
          </group>
        );
    }
  };

  return (
    <group position={position} name="treasure-map">
      <group ref={grower}>{renderPicture()}</group>
    </group>
  );
};
