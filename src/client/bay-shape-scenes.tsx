import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import {
  BufferGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  type Group,
} from "three";
import type { PolygonName } from "../curriculum/polygons.js";
import type { Shape3d } from "../curriculum/shapes-3d.js";
import {
  bayPalette,
  findGrowth,
  promptGrowSeconds,
  useGrowingChoice,
  useMotionScale,
  usePromptGrowth,
  usePromptPosition,
  type ChoiceSlot,
} from "./bay-stage.js";
import { useDisposedOnUnmount } from "./studio-stage.js";

type Point = [number, number];

const shapePalette = {
  tiles: ["#2f7fb8", "#c2577a", "#c99a2e", "#3c9a6e"],
  edge: "#0b1a2e",
  marker: "#f4f9ff",
  net: "#e9eef4",
  netEdge: "#1d3a5c",
} as const;

const buildRegularPoints = (
  sides: number,
  startAngle: number,
  reach = 0.95,
): Point[] =>
  Array.from({ length: sides }, (_, index) => {
    const angle = startAngle + (index / sides) * Math.PI * 2;
    return [Math.cos(angle) * reach, Math.sin(angle) * reach];
  });

export const buildPolygonPoints = (polygon: PolygonName): Point[] => {
  switch (polygon) {
    case "square":
      return [
        [-0.7, -0.7],
        [0.7, -0.7],
        [0.7, 0.7],
        [-0.7, 0.7],
      ];
    case "rectangle":
      return [
        [-0.95, -0.5],
        [0.95, -0.5],
        [0.95, 0.5],
        [-0.95, 0.5],
      ];
    case "rhombus":
      return [
        [0, -0.95],
        [0.6, 0],
        [0, 0.95],
        [-0.6, 0],
      ];
    case "parallelogram":
      return [
        [-0.95, -0.5],
        [0.45, -0.5],
        [0.95, 0.5],
        [-0.45, 0.5],
      ];
    case "trapezium":
      return [
        [-0.95, -0.5],
        [0.95, -0.5],
        [0.45, 0.5],
        [-0.45, 0.5],
      ];
    case "right-angled-trapezium":
      return [
        [-0.8, -0.55],
        [0.9, -0.55],
        [0.3, 0.55],
        [-0.8, 0.55],
      ];
    case "kite":
      return [
        [0, -0.95],
        [0.55, 0.35],
        [0, 0.95],
        [-0.55, 0.35],
      ];
    case "equilateral-triangle":
      return buildRegularPoints(3, Math.PI / 2);
    case "isosceles-triangle":
      return [
        [-0.55, -0.75],
        [0.55, -0.75],
        [0, 0.95],
      ];
    case "scalene-triangle":
      return [
        [-0.9, -0.7],
        [0.8, -0.7],
        [-0.35, 0.85],
      ];
    case "right-angled-triangle":
      return [
        [-0.8, -0.7],
        [0.85, -0.7],
        [-0.8, 0.8],
      ];
    case "regular-pentagon":
      return buildRegularPoints(5, Math.PI / 2);
    case "irregular-pentagon":
      return [
        [-0.65, -0.72],
        [0.65, -0.72],
        [0.65, 0.15],
        [0, 0.95],
        [-0.65, 0.15],
      ];
    case "regular-hexagon":
      return buildRegularPoints(6, 0);
    case "irregular-hexagon":
      return [
        [0.95, 0],
        [0.45, 0.6],
        [-0.45, 0.6],
        [-0.95, 0],
        [-0.45, -0.6],
        [0.45, -0.6],
      ];
    case "regular-octagon":
      return buildRegularPoints(8, Math.PI / 8);
  }
};

const rightAngleTolerance = 1e-6;

export const listRightAngleCorners = (points: readonly Point[]): number[] =>
  points.flatMap(([x, y], index) => {
    const [beforeX, beforeY] =
      points[(index + points.length - 1) % points.length];
    const [afterX, afterY] = points[(index + 1) % points.length];
    const dot = (beforeX - x) * (afterX - x) + (beforeY - y) * (afterY - y);
    return Math.abs(dot) < rightAngleTolerance ? [index] : [];
  });

const buildTileShape = (points: readonly Point[], scale: number) => {
  const shape = new Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      shape.moveTo(x * scale, y * scale);
    } else {
      shape.lineTo(x * scale, y * scale);
    }
  });
  shape.closePath();
  return shape;
};

const markerShare = 0.16;

const buildMarkerGeometry = (
  points: readonly Point[],
  scale: number,
  depth: number,
) => {
  const segments = listRightAngleCorners(points).flatMap((index) => {
    const [x, y] = points[index];
    const [beforeX, beforeY] =
      points[(index + points.length - 1) % points.length];
    const [afterX, afterY] = points[(index + 1) % points.length];
    const towards = (toX: number, toY: number): Point => {
      const length = Math.hypot(toX - x, toY - y);
      return [
        ((toX - x) / length) * markerShare,
        ((toY - y) / length) * markerShare,
      ];
    };
    const [firstX, firstY] = towards(beforeX, beforeY);
    const [secondX, secondY] = towards(afterX, afterY);
    const corner: Point = [x + firstX + secondX, y + firstY + secondY];
    return [
      [x + firstX, y + firstY],
      corner,
      corner,
      [x + secondX, y + secondY],
    ];
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      segments.flatMap(([x, y]) => [x * scale, y * scale, depth]),
      3,
    ),
  );
  return geometry;
};

export const PolygonTile = ({
  polygon,
  ...slot
}: ChoiceSlot & { polygon: PolygonName }) => {
  const { choice, age, motionScale } = useGrowingChoice(slot);
  const turner = useRef<Group>(null);
  const tileScale = slot.radius * 0.82;
  const depth = slot.radius * 0.14;
  const points = useMemo(() => buildPolygonPoints(polygon), [polygon]);
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(buildTileShape(points, tileScale), {
        depth,
        bevelEnabled: true,
        bevelSize: depth * 0.35,
        bevelThickness: depth * 0.35,
        bevelSegments: 1,
      }).translate(0, 0, -depth / 2),
    [points, tileScale, depth],
  );
  const edges = useMemo(() => new EdgesGeometry(geometry, 30), [geometry]);
  const markers = useMemo(
    () => buildMarkerGeometry(points, tileScale, depth / 2 + depth * 0.36),
    [points, tileScale, depth],
  );
  useDisposedOnUnmount(geometry);
  useDisposedOnUnmount(edges);
  useDisposedOnUnmount(markers);

  useFrame(() => {
    if (turner.current !== null) {
      turner.current.rotation.y =
        Math.sin(age.current * 0.5 + slot.index) * 0.12 * motionScale;
    }
  });

  return (
    <group ref={choice} position={slot.position} name={`polygon-${polygon}`}>
      <group ref={turner} rotation={[-0.12, 0, 0]}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            color={shapePalette.tiles[slot.index % shapePalette.tiles.length]}
            roughness={0.18}
            clearcoat={1}
            clearcoatRoughness={0.06}
            sheen={0.25}
          />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial
            color={shapePalette.edge}
            transparent
            opacity={0.6}
          />
        </lineSegments>
        <lineSegments geometry={markers} name="right-angle-markers">
          <lineBasicMaterial color={shapePalette.marker} />
        </lineSegments>
      </group>
      <mesh position={[0, -slot.radius * 1.02, 0]}>
        <cylinderGeometry
          args={[slot.radius * 0.78, slot.radius * 0.9, slot.radius * 0.12, 28]}
        />
        <meshPhysicalMaterial
          color={bayPalette.plinth}
          roughness={0.2}
          clearcoat={1}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0, -slot.radius * 0.95, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[slot.radius * 0.8, slot.radius * 0.025, 4, 28]} />
        <meshBasicMaterial color={bayPalette.plinthGlow} toneMapped={false} />
      </mesh>
    </group>
  );
};

type NetFace =
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number }
  | { kind: "circle"; radius: number }
  | { kind: "sector"; reach: number; sweep: number };

interface NetHinge {
  at: Point;
  turn: number;
  piece: NetPiece;
}

interface NetPiece {
  face: NetFace;
  hinges: NetHinge[];
}

interface NetPlan {
  root: NetPiece;
  offset: Point;
}

const buildFaceShape = (face: NetFace): Shape => {
  const shape = new Shape();
  switch (face.kind) {
    case "rectangle":
      shape.moveTo(-face.width / 2, 0);
      shape.lineTo(face.width / 2, 0);
      shape.lineTo(face.width / 2, face.height);
      shape.lineTo(-face.width / 2, face.height);
      break;
    case "triangle":
      shape.moveTo(-face.base / 2, 0);
      shape.lineTo(face.base / 2, 0);
      shape.lineTo(0, face.height);
      break;
    case "circle":
      shape.absarc(0, face.radius, face.radius, 0, Math.PI * 2, false);
      break;
    case "sector":
      shape.moveTo(0, face.reach);
      shape.absarc(
        0,
        face.reach,
        face.reach,
        -Math.PI / 2 - face.sweep / 2,
        -Math.PI / 2 + face.sweep / 2,
        false,
      );
      break;
  }
  shape.closePath();
  return shape;
};

const rectangle = (
  width: number,
  height: number,
  hinges: NetHinge[] = [],
): NetPiece => ({
  face: { kind: "rectangle", width, height },
  hinges,
});

const onTop = (height: number, piece: NetPiece): NetHinge => ({
  at: [0, height],
  turn: 0,
  piece,
});
const onLeft = (width: number, height: number, piece: NetPiece): NetHinge => ({
  at: [-width / 2, height / 2],
  turn: Math.PI / 2,
  piece,
});
const onRight = (width: number, height: number, piece: NetPiece): NetHinge => ({
  at: [width / 2, height / 2],
  turn: -Math.PI / 2,
  piece,
});
const onBottom = (piece: NetPiece): NetHinge => ({
  at: [0, 0],
  turn: Math.PI,
  piece,
});

const buildBoxNet = (
  length: number,
  width: number,
  height: number,
): NetPlan => ({
  root: rectangle(length, height, [
    onTop(height, rectangle(length, width)),
    onBottom(
      rectangle(length, width, [onTop(width, rectangle(length, height))]),
    ),
    onLeft(length, height, rectangle(height, width)),
    onRight(length, height, rectangle(height, width)),
  ]),
  offset: [0, 0],
});

const buildPyramidNet = (side: number, slant: number): NetPlan => {
  const triangle: NetPiece = {
    face: { kind: "triangle", base: side, height: slant },
    hinges: [],
  };
  return {
    root: rectangle(side, side, [
      onTop(side, triangle),
      onBottom(triangle),
      onLeft(side, side, triangle),
      onRight(side, side, triangle),
    ]),
    offset: [0, -side / 2],
  };
};

const buildCylinderNet = (radius: number, height: number): NetPlan => {
  const lid: NetPiece = { face: { kind: "circle", radius }, hinges: [] };
  return {
    root: rectangle(Math.PI * 2 * radius, height, [
      onTop(height, lid),
      onBottom(lid),
    ]),
    offset: [0, -height / 2],
  };
};

const buildConeNet = (radius: number, reach: number): NetPlan => ({
  root: {
    face: { kind: "sector", reach, sweep: (Math.PI * 2 * radius) / reach },
    hinges: [onBottom({ face: { kind: "circle", radius }, hinges: [] })],
  },
  offset: [0, -reach / 2 + radius],
});

export const findNetPlan = (shape: Shape3d): NetPlan | undefined => {
  switch (shape) {
    case "cube":
      return buildBoxNet(0.5, 0.5, 0.5);
    case "cuboid":
      return buildBoxNet(0.78, 0.42, 0.5);
    case "pyramid":
      return buildPyramidNet(0.7, 0.62);
    case "cylinder":
      return buildCylinderNet(0.3, 0.8);
    case "cone":
      return buildConeNet(0.32, 1.05);
    case "sphere":
      return undefined;
  }
};

export const countNetFaces = (piece: NetPiece): number =>
  1 +
  piece.hinges.reduce(
    (total, { piece: child }) => total + countNetFaces(child),
    0,
  );

const netDepth = 0.03;
const largestFold = 0.32;
const restingFold = 0.14;

const NetFaceTile = ({
  face,
  colourIndex,
}: {
  face: NetFace;
  colourIndex: number;
}) => {
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(buildFaceShape(face), {
        depth: netDepth,
        bevelEnabled: false,
        curveSegments: 18,
      }),
    [face],
  );
  const edges = useMemo(() => new EdgesGeometry(geometry, 30), [geometry]);
  useDisposedOnUnmount(geometry);
  useDisposedOnUnmount(edges);

  return (
    <>
      <mesh geometry={geometry} name="net-face">
        <meshPhysicalMaterial
          color={colourIndex === 0 ? shapePalette.tiles[0] : shapePalette.net}
          roughness={0.3}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          color={shapePalette.netEdge}
          transparent
          opacity={0.75}
        />
      </lineSegments>
    </>
  );
};

const FoldingHinge = ({
  hinge,
  fold,
  depth,
}: {
  hinge: NetHinge;
  fold: RefObject<number>;
  depth: number;
}) => {
  const flap = useRef<Group>(null);
  useFrame(() => {
    if (flap.current !== null) {
      flap.current.rotation.x = fold.current;
    }
  });

  return (
    <group
      position={[hinge.at[0], hinge.at[1], 0]}
      rotation={[0, 0, hinge.turn]}
    >
      <group ref={flap}>
        <NetPieceView piece={hinge.piece} fold={fold} depth={depth + 1} />
      </group>
    </group>
  );
};

const NetPieceView = ({
  piece,
  fold,
  depth,
}: {
  piece: NetPiece;
  fold: RefObject<number>;
  depth: number;
}): ReactNode => (
  <>
    <NetFaceTile face={piece.face} colourIndex={depth} />
    {piece.hinges.map((hinge, index) => (
      <FoldingHinge key={index} hinge={hinge} fold={fold} depth={depth} />
    ))}
  </>
);

const netScale = 0.72;

export const ShapeNet = ({ shape }: { shape: Shape3d }) => {
  const position = usePromptPosition();
  const { age } = usePromptGrowth();
  const motionScale = useMotionScale();
  const plan = useMemo(() => findNetPlan(shape), [shape]);
  const body = useRef<Group>(null);
  const fold = useRef(restingFold);

  useFrame(() => {
    body.current?.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    fold.current =
      motionScale === 0
        ? restingFold
        : (0.5 + 0.5 * Math.sin(age.current * 0.9 - Math.PI / 2)) * largestFold;
  });

  if (plan === undefined) {
    return null;
  }
  return (
    <group position={position} name={`net-${shape}`}>
      <group ref={body} rotation={[-0.32, 0.18, 0]}>
        <group scale={netScale}>
          <group position={[plan.offset[0], plan.offset[1], 0]}>
            <NetPieceView piece={plan.root} fold={fold} depth={0} />
          </group>
        </group>
      </group>
    </group>
  );
};
