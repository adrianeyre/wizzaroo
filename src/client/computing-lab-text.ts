import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

export const labInk = "#0f172a";
export const labHeadingFont =
  '"Baloo 2 Variable", "Baloo 2", system-ui, sans-serif';
export const labBodyFont = '"Nunito Variable", "Nunito", system-ui, sans-serif';

export type PaintCanvas<Subject> = (
  context: CanvasRenderingContext2D,
  subject: Subject,
  width: number,
  height: number,
) => void;

interface PaintedFace {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
  scale: number;
}

const largestTextureSide = 512;

export const findTextureScale = (width: number, height: number): number =>
  Math.min(1, largestTextureSide / Math.max(width, height));

const repaint = <Subject>(
  canvas: HTMLCanvasElement,
  paint: PaintCanvas<Subject>,
  subject: Subject,
  scale: number,
): boolean => {
  const context = canvas.getContext("2d");
  if (context === null) {
    return false;
  }
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  paint(context, subject, canvas.width / scale, canvas.height / scale);
  return true;
};

const buildPaintedFace = <Subject>(
  paint: PaintCanvas<Subject>,
  subject: Subject,
  width: number,
  height: number,
): PaintedFace | undefined => {
  if (typeof document === "undefined") {
    return undefined;
  }
  const scale = findTextureScale(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  if (!repaint(canvas, paint, subject, scale)) {
    return undefined;
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture, scale };
};

const fontsToWaitFor = [
  `800 40px ${labHeadingFont}`,
  `700 32px ${labBodyFont}`,
];

export const usePaintedTexture = <Subject>(
  paint: PaintCanvas<Subject>,
  subject: Subject,
  width = 512,
  height = 256,
): CanvasTexture | undefined => {
  const face = useMemo(
    () => buildPaintedFace(paint, subject, width, height),
    [paint, subject, width, height],
  );

  useEffect(() => {
    if (face === undefined) {
      return;
    }
    let isShown = true;
    void Promise.all(
      fontsToWaitFor.map((font) => document.fonts.load(font)),
    ).then(() => {
      if (isShown && repaint(face.canvas, paint, subject, face.scale)) {
        face.texture.needsUpdate = true;
      }
    });
    return () => {
      isShown = false;
      face.texture.dispose();
    };
  }, [face, paint, subject]);

  return face?.texture;
};

export const fillRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
};

export const writeFittedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  largestSize: number,
  fontFamily = labBodyFont,
  weight = 800,
) => {
  let size = largestSize;
  context.font = `${String(weight)} ${String(size)}px ${fontFamily}`;
  while (size > 12 && context.measureText(text).width > maxWidth) {
    size -= 2;
    context.font = `${String(weight)} ${String(size)}px ${fontFamily}`;
  }
  context.fillText(text, x, y);
};
