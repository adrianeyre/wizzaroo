import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, SRGBColorSpace, type BufferGeometry } from "three";
import { getMotionScale } from "../reduced-motion.js";

export const geographyPalette = {
  ink: "#10213a",
  paper: "#fbf6e9",
  parchment: "#efe2c2",
  parchmentEdge: "#c9b07a",
  land: "#6cc070",
  landDark: "#3f8f4f",
  sand: "#e8d39a",
  sea: "#3a8fd8",
  seaDeep: "#1d5fa8",
  ice: "#eef7ff",
  rock: "#8a8f99",
  wood: "#9a6a3d",
  woodDark: "#6b4426",
  brass: "#d6a548",
  highlight: "#ffd23f",
  highlightGlow: "#ffb703",
  marker: "#ff4d6d",
  white: "#ffffff",
} as const;

export const useMotionScale = (): number => {
  const [motionScale] = useState(getMotionScale);
  return motionScale;
};

export const useSceneAge = () => {
  const age = useRef(0);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
  });
  return age;
};

export const findPulse = (ageSeconds: number, motionScale: number): number =>
  motionScale === 0 ? 1 : 0.5 + 0.5 * Math.sin(ageSeconds * 4);

export const labelFontFamily = `"Baloo 2 Variable", "Baloo 2", "Nunito Variable", sans-serif`;

export type CanvasPainter = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => void;

interface CanvasFace {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

const paintCanvas = (
  canvas: HTMLCanvasElement,
  paint: CanvasPainter,
): boolean => {
  const context = canvas.getContext("2d");
  if (context === null) {
    return false;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  paint(context, canvas.width, canvas.height);
  return true;
};

const buildCanvasFace = (
  width: number,
  height: number,
  paint: CanvasPainter,
): CanvasFace | undefined => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  if (!paintCanvas(canvas, paint)) {
    return undefined;
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture };
};

export const useCanvasTexture = (
  width: number,
  height: number,
  paint: CanvasPainter,
): CanvasTexture | undefined => {
  const face = useMemo(
    () => buildCanvasFace(width, height, paint),
    [width, height, paint],
  );

  useEffect(() => {
    if (face === undefined) {
      return;
    }
    let isShown = true;
    void document.fonts.load(`800 32px ${labelFontFamily}`).then(() => {
      if (isShown && paintCanvas(face.canvas, paint)) {
        face.texture.needsUpdate = true;
      }
    });
    return () => {
      isShown = false;
      face.texture.dispose();
    };
  }, [face, paint]);

  return face?.texture;
};

export const drawRoundedRectangle = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
};

export const fitLabelFont = (
  context: CanvasRenderingContext2D,
  text: string,
  largestPixels: number,
  widestPixels: number,
) => {
  let size = largestPixels;
  context.font = `800 ${String(size)}px ${labelFontFamily}`;
  while (size > 10 && context.measureText(text).width > widestPixels) {
    size -= 2;
    context.font = `800 ${String(size)}px ${labelFontFamily}`;
  }
};

export const fitModelHeight = (
  geometry: BufferGeometry,
  height: number,
): BufferGeometry => {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (bounds === null) {
    return geometry;
  }
  const scale = height / Math.max(bounds.max.y - bounds.min.y, 0.001);
  geometry.translate(
    -(bounds.max.x + bounds.min.x) / 2,
    -bounds.min.y,
    -(bounds.max.z + bounds.min.z) / 2,
  );
  geometry.scale(scale, scale, scale);
  return geometry;
};
