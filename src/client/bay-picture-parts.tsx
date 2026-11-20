import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  Object3D,
  SphereGeometry,
  type BufferGeometry,
  type InstancedMesh,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  labelFont,
  usePaintedTexture,
  type PaintCanvas,
} from "./bay-block-measures.js";
import { mergePaintedGeometries } from "./bay-place-value.js";
import { findGrowth, promptGrowSeconds, usePromptGrowth } from "./bay-stage.js";
import { useDisposedOnUnmount } from "./studio-stage.js";

export type Vector = [number, number, number];

export interface Piece {
  position: Vector;
  scale: Vector;
  rotation?: Vector;
  colour?: string;
}

export const picturePalette = {
  pearl: "#fbf3e4",
  pearlSheen: "#c8ecff",
  red: "#e5484d",
  blue: "#3b82f6",
  plate: "#f2dcb3",
  plateRim: "#c99a5b",
  fishOrange: "#ff8a3d",
  fishYellow: "#ffd23f",
  sand: "#e9cf9c",
  board: "#16324a",
  boardEdge: "#5ee0f0",
  ink: "#f4f9ff",
  softInk: "#9fc3dd",
  gold: "#ffcf4a",
  glow: "#fff2a8",
  ghost: "#bfe9ff",
  wood: "#9b6a3c",
  darkWood: "#6b4423",
} as const;

interface PieceInstancesProps {
  pieces: readonly Piece[];
  geometry: BufferGeometry;
  name?: string;
  staggerSeconds?: number;
  children: ReactNode;
}

const noTurn: Vector = [0, 0, 0];

export const PieceInstances = ({
  pieces,
  geometry,
  name,
  staggerSeconds = 0.03,
  children,
}: PieceInstancesProps) => {
  const mesh = useRef<InstancedMesh>(null);
  const { age, motionScale } = usePromptGrowth();
  const placer = useMemo(() => new Object3D(), []);
  const isPainted = pieces.some(({ colour }) => colour !== undefined);

  useLayoutEffect(() => {
    const instances = mesh.current;
    if (instances === null || !isPainted) {
      return;
    }
    pieces.forEach(({ colour = "#ffffff" }, index) => {
      instances.setColorAt(index, new Color(colour));
    });
    if (instances.instanceColor !== null) {
      instances.instanceColor.needsUpdate = true;
    }
  }, [pieces, isPainted]);

  useFrame(() => {
    const instances = mesh.current;
    if (instances === null) {
      return;
    }
    pieces.forEach(({ position, scale, rotation = noTurn }, index) => {
      const growth = findGrowth(
        age.current - index * staggerSeconds,
        promptGrowSeconds,
        motionScale,
      );
      placer.position.set(...position);
      placer.rotation.set(...rotation);
      placer.scale.set(scale[0] * growth, scale[1] * growth, scale[2] * growth);
      placer.updateMatrix();
      instances.setMatrixAt(index, placer.matrix);
    });
    instances.count = pieces.length;
    instances.instanceMatrix.needsUpdate = true;
  });

  if (pieces.length === 0) {
    return null;
  }
  return (
    <instancedMesh
      key={pieces.length}
      ref={mesh}
      args={[geometry, undefined, pieces.length]}
      frustumCulled={false}
      name={name}
    >
      {children}
    </instancedMesh>
  );
};

export const PearlMaterial = ({ isGhost = false }: { isGhost?: boolean }) => (
  <meshPhysicalMaterial
    roughness={0.18}
    clearcoat={1}
    clearcoatRoughness={0.08}
    iridescence={isGhost ? 0 : 0.8}
    sheen={0.4}
    sheenColor={picturePalette.pearlSheen}
    transparent={isGhost}
    opacity={isGhost ? 0.32 : 1}
    depthWrite={!isGhost}
  />
);

export const PaintedMaterial = () => (
  <meshPhysicalMaterial
    vertexColors
    roughness={0.35}
    clearcoat={0.7}
    clearcoatRoughness={0.16}
  />
);

const buildPictureGeometries = () => ({
  pearl: new SphereGeometry(1, 6, 4),
  plate: new CylinderGeometry(1, 0.88, 0.12, 24).rotateX(Math.PI / 2),
  block: new RoundedBoxGeometry(1, 1, 1, 1, 0.12),
  fish: mergePaintedGeometries([
    {
      geometry: new SphereGeometry(1, 7, 4).scale(0.5, 0.32, 0.24),
      colour: "#ffffff",
    },
    {
      geometry: new ConeGeometry(0.26, 0.3, 5)
        .rotateZ(Math.PI / 2)
        .translate(-0.6, 0, 0),
      colour: "#ffd9c2",
    },
  ]),
});

type PictureGeometries = ReturnType<typeof buildPictureGeometries>;

export const usePictureGeometries = (): PictureGeometries => {
  const geometries = useMemo(() => buildPictureGeometries(), []);
  useDisposedOnUnmount(geometries.pearl);
  useDisposedOnUnmount(geometries.plate);
  useDisposedOnUnmount(geometries.block);
  useDisposedOnUnmount(geometries.fish);
  return geometries;
};

const labelCanvas = { width: 256, height: 112 };

const buildLabelPainter =
  (text: string): PaintCanvas =>
  (context, width, height) => {
    context.fillStyle = picturePalette.board;
    context.globalAlpha = 0.88;
    context.beginPath();
    context.roundRect(4, 4, width - 8, height - 8, height / 2 - 4);
    context.fill();
    context.globalAlpha = 1;
    context.strokeStyle = picturePalette.boardEdge;
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = picturePalette.ink;
    context.font = labelFont;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, width / 2, height / 2 + 4, width - 24);
  };

export const LabelSprite = ({
  text,
  position,
  height = 0.24,
}: {
  text: string;
  position: Vector;
  height?: number;
}) => {
  const paint = useMemo(() => buildLabelPainter(text), [text]);
  const label = usePaintedTexture(labelCanvas.width, labelCanvas.height, paint);
  if (label === undefined) {
    return null;
  }
  return (
    <sprite
      position={position}
      scale={[(height * labelCanvas.width) / labelCanvas.height, height, 1]}
      name="picture-label"
    >
      <spriteMaterial map={label} transparent depthWrite={false} />
    </sprite>
  );
};

export interface BoardSize {
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const PaintedBoard = ({
  size,
  paint,
  frameColour = picturePalette.darkWood,
}: {
  size: BoardSize;
  paint: PaintCanvas;
  frameColour?: string;
}) => {
  const face = usePaintedTexture(size.canvasWidth, size.canvasHeight, paint);
  const frame = useMemo(
    () =>
      new RoundedBoxGeometry(
        size.width + 0.16,
        size.height + 0.16,
        0.1,
        2,
        0.05,
      ),
    [size.width, size.height],
  );
  useDisposedOnUnmount(frame);
  return (
    <group name="picture-board">
      <mesh geometry={frame} position={[0, 0, -0.06]}>
        <meshPhysicalMaterial
          color={frameColour}
          roughness={0.55}
          clearcoat={0.4}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[size.width, size.height]} />
        <meshStandardMaterial
          key={face === undefined ? "plain" : "painted"}
          color={face === undefined ? picturePalette.board : "#ffffff"}
          map={face ?? null}
          roughness={0.85}
        />
      </mesh>
    </group>
  );
};

export const findBoardPoint = (
  size: BoardSize,
  across: number,
  up: number,
  depth = 0,
): Vector => [(across - 0.5) * size.width, (up - 0.5) * size.height, depth];

export const paintText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  sizePixels: number,
  colour: string = picturePalette.ink,
  align: CanvasTextAlign = "center",
) => {
  context.fillStyle = colour;
  context.font = `800 ${String(Math.round(sizePixels))}px "Baloo 2 Variable", "Baloo 2", sans-serif`;
  context.textAlign = align;
  context.textBaseline = "middle";
  context.fillText(text, x, y);
};
