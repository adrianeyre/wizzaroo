import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Object3D,
  SRGBColorSpace,
  type Group,
  type InstancedMesh,
} from "three";
import type { BlockMeasureQuestion } from "../curriculum/block-measures.js";
import {
  findGrowth,
  promptGrowSeconds,
  usePromptGrowth,
  usePromptPosition,
} from "./bay-stage.js";
import { useDisposedOnUnmount } from "./studio-stage.js";

export type PaintCanvas = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => void;

interface PaintedTexture {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

const buildPaintedTexture = (
  width: number,
  height: number,
  paint: PaintCanvas,
): PaintedTexture | undefined => {
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
  paint(context, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture };
};

export const labelFont = `700 56px "Baloo 2 Variable", "Baloo 2", sans-serif`;

export const usePaintedTexture = (
  width: number,
  height: number,
  paint: PaintCanvas,
): CanvasTexture | undefined => {
  const painted = useMemo(
    () => buildPaintedTexture(width, height, paint),
    [width, height, paint],
  );

  useEffect(() => {
    if (painted === undefined) {
      return;
    }
    let isShown = true;
    void document.fonts.load(labelFont).then(() => {
      const context = painted.canvas.getContext("2d");
      if (isShown && context !== null) {
        context.clearRect(0, 0, width, height);
        paint(context, width, height);
        painted.texture.needsUpdate = true;
      }
    });
    return () => {
      isShown = false;
      painted.texture.dispose();
    };
  }, [painted, paint, width, height]);

  return painted?.texture;
};

const blockPalette = {
  cube: "#7cc4e4",
  tile: "#9fd6c2",
  mutedTile: "#5e8fa6",
  outline: "#ffd166",
  labelBackground: "#0b2238",
  labelInk: "#f4f9ff",
  labelEdge: "#5ee0f0",
} as const;

const unitSize = 0.3;
const cubeFill = 0.92;
const tileThickness = 0.35;
const labelSize = { width: 256, height: 112 };

const buildLabelPainter =
  (text: string): PaintCanvas =>
  (context, width, height) => {
    const corner = height / 2;
    context.fillStyle = blockPalette.labelBackground;
    context.globalAlpha = 0.86;
    context.beginPath();
    context.roundRect(4, 4, width - 8, height - 8, corner - 4);
    context.fill();
    context.globalAlpha = 1;
    context.strokeStyle = blockPalette.labelEdge;
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = blockPalette.labelInk;
    context.font = labelFont;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, width / 2, height / 2 + 4);
  };

const EdgeLabel = ({
  text,
  position,
}: {
  text: string;
  position: [number, number, number];
}) => {
  const paint = useMemo(() => buildLabelPainter(text), [text]);
  const label = usePaintedTexture(labelSize.width, labelSize.height, paint);
  if (label === undefined) {
    return null;
  }
  return (
    <sprite position={position} scale={[0.62, 0.27, 1]} name="edge-label">
      <spriteMaterial map={label} transparent depthWrite={false} />
    </sprite>
  );
};

export interface BlockLayout {
  layers: number;
  cellHeight: number;
  spots: [number, number, number][];
}

export const buildBlockLayout = ({
  kind,
  length,
  width,
  height,
}: BlockMeasureQuestion): BlockLayout => {
  const layers = kind === "volume" ? height : 1;
  const cellHeight = kind === "volume" ? unitSize : unitSize * tileThickness;
  const spots: [number, number, number][] = [];
  for (let layer = 0; layer < layers; layer++) {
    for (let row = 0; row < width; row++) {
      for (let column = 0; column < length; column++) {
        spots.push([
          (column - (length - 1) / 2) * unitSize,
          layer * cellHeight + cellHeight / 2,
          (row - (width - 1) / 2) * unitSize,
        ]);
      }
    }
  }
  return { layers, cellHeight, spots };
};

const buildOutlineGeometry = (length: number, width: number, y: number) => {
  const halfLength = (length * unitSize) / 2;
  const halfWidth = (width * unitSize) / 2;
  const corners = [
    [-halfLength, -halfWidth],
    [halfLength, -halfWidth],
    [halfLength, halfWidth],
    [-halfLength, halfWidth],
  ];
  const points = corners.flatMap(([x, z], index) => {
    const [nextX, nextZ] = corners[(index + 1) % corners.length];
    return [x, y, z, nextX, y, nextZ];
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
};

const findCubeColour = (kind: BlockMeasureQuestion["kind"]) => {
  switch (kind) {
    case "perimeter":
      return blockPalette.mutedTile;
    case "area":
      return blockPalette.tile;
    case "volume":
      return blockPalette.cube;
  }
};

export const MeasureBlock = ({ block }: { block: BlockMeasureQuestion }) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const turner = useRef<Group>(null);
  const cubes = useRef<InstancedMesh>(null);
  const layout = useMemo(() => buildBlockLayout(block), [block]);
  const outline = useMemo(
    () =>
      buildOutlineGeometry(
        block.length,
        block.width,
        layout.cellHeight * layout.layers + 0.004,
      ),
    [block.length, block.width, layout],
  );
  useDisposedOnUnmount(outline);
  const halfLength = (block.length * unitSize) / 2;
  const halfWidth = (block.width * unitSize) / 2;
  const topHeight = layout.cellHeight * layout.layers;

  useLayoutEffect(() => {
    const mesh = cubes.current;
    if (mesh === null) {
      return;
    }
    const placer = new Object3D();
    layout.spots.forEach((spot, index) => {
      placer.position.set(...spot);
      placer.scale.set(
        unitSize * cubeFill,
        layout.cellHeight * cubeFill,
        unitSize * cubeFill,
      );
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    });
    mesh.count = layout.spots.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [layout]);

  useFrame(() => {
    const body = turner.current;
    if (body === null) {
      return;
    }
    body.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    body.rotation.y = -0.62 + Math.sin(age.current * 0.4) * 0.07 * motionScale;
  });

  return (
    <group position={position} name="measure-block">
      <group rotation={[0.48, 0, 0]} position={[0, -0.35, 0]}>
        <group ref={turner}>
          <instancedMesh
            ref={cubes}
            args={[undefined, undefined, layout.spots.length]}
            frustumCulled={false}
            name="unit-cubes"
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial
              color={findCubeColour(block.kind)}
              roughness={0.32}
              clearcoat={0.9}
              clearcoatRoughness={0.14}
              sheen={0.3}
            />
          </instancedMesh>
          {block.kind === "perimeter" ? (
            <lineSegments geometry={outline} name="perimeter-outline">
              <lineBasicMaterial color={blockPalette.outline} />
            </lineSegments>
          ) : null}
          <EdgeLabel
            text={`${String(block.length)} cm`}
            position={[0, 0, halfWidth + 0.26]}
          />
          <EdgeLabel
            text={`${String(block.width)} cm`}
            position={[halfLength + 0.4, 0, 0]}
          />
          {block.kind === "volume" ? (
            <EdgeLabel
              text={`${String(block.height)} cm`}
              position={[halfLength + 0.36, topHeight / 2, halfWidth + 0.1]}
            />
          ) : null}
        </group>
      </group>
    </group>
  );
};
