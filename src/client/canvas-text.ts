import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

export type FaceStyle =
  "parchment" | "slate" | "wood" | "stone" | "page" | "clear";

export type InkTone = "ink" | "accent" | "soft";

export interface TextBlock {
  text: string;
  centre: [number, number];
  size: [number, number];
  tone?: InkTone;
  isHeading?: boolean;
}

export interface TextFace {
  width: number;
  height: number;
  style: FaceStyle;
  blocks: TextBlock[];
}

interface FacePaint {
  background: [string, string] | undefined;
  edge: string | undefined;
  inks: Record<InkTone, string>;
}

const facePaints: Record<FaceStyle, FacePaint> = {
  parchment: {
    background: ["#f6ead0", "#e3cfa3"],
    edge: "#a07a45",
    inks: { ink: "#2d2014", accent: "#9a3412", soft: "#6b5235" },
  },
  slate: {
    background: ["#33424a", "#1f2a30"],
    edge: "#55656e",
    inks: { ink: "#f4f7f8", accent: "#fcd34d", soft: "#b8c6cc" },
  },
  wood: {
    background: ["#b07a4a", "#8a5a33"],
    edge: "#5b3a22",
    inks: { ink: "#2a1a0e", accent: "#fff3d6", soft: "#4a2f1b" },
  },
  stone: {
    background: ["#a7adb2", "#7c8389"],
    edge: "#5d646a",
    inks: { ink: "#1f2427", accent: "#7c2d12", soft: "#3b4146" },
  },
  page: {
    background: ["#fbf7ee", "#efe5cf"],
    edge: undefined,
    inks: { ink: "#1f2937", accent: "#b45309", soft: "#57534e" },
  },
  clear: {
    background: undefined,
    edge: undefined,
    inks: { ink: "#fff8e6", accent: "#fcd34d", soft: "#e7dcc4" },
  },
};

const headingFamily = `"Baloo 2 Variable", "Baloo 2", sans-serif`;
const bodyFamily = `"Nunito Variable", "Nunito", sans-serif`;
const largestShare = 0.9;
const shrinkStep = 0.9;
const fittingAttempts = 26;

const buildFont = (sizePixels: number, isHeading: boolean) =>
  isHeading
    ? `800 ${String(Math.round(sizePixels))}px ${headingFamily}`
    : `800 ${String(Math.round(sizePixels))}px ${bodyFamily}`;

export const wrapWords = (
  text: string,
  maxWidth: number,
  measure: (line: string) => number,
): string[] =>
  text.split(" ").reduce<string[]>((lines, word) => {
    const current = lines.at(-1);
    if (current === undefined) {
      return [word];
    }
    const joined = `${current} ${word}`;
    return measure(joined) <= maxWidth
      ? [...lines.slice(0, -1), joined]
      : [...lines, word];
  }, []);

const paintBackground = (context: CanvasRenderingContext2D, face: TextFace) => {
  const { width, height, style } = face;
  const { background, edge } = facePaints[style];
  if (background === undefined) {
    context.clearRect(0, 0, width, height);
    return;
  }
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, background[0]);
  gradient.addColorStop(1, background[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const vignette = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.25,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.28)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
  if (edge !== undefined) {
    context.strokeStyle = edge;
    context.globalAlpha = 0.55;
    context.lineWidth = Math.max(4, height * 0.03);
    const inset = Math.max(8, height * 0.05);
    context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    context.globalAlpha = 1;
  }
};

const paintBlock = (
  context: CanvasRenderingContext2D,
  { width, height, style }: TextFace,
  { text, centre, size, tone = "ink", isHeading = true }: TextBlock,
) => {
  const boxWidth = size[0] * width;
  const boxHeight = size[1] * height;
  let fontSize = boxHeight * largestShare;
  let lines = [text];
  for (let attempt = 0; attempt < fittingAttempts; attempt++) {
    context.font = buildFont(fontSize, isHeading);
    lines = wrapWords(
      text,
      boxWidth,
      (line) => context.measureText(line).width,
    );
    const isFitting =
      lines.length * fontSize * 1.08 <= boxHeight &&
      lines.every((line) => context.measureText(line).width <= boxWidth);
    if (isFitting) {
      break;
    }
    fontSize *= shrinkStep;
  }
  context.font = buildFont(fontSize, isHeading);
  context.fillStyle = facePaints[style].inks[tone];
  context.textAlign = "center";
  context.textBaseline = "middle";
  const lineHeight = fontSize * 1.08;
  const firstLineY =
    centre[1] * height -
    ((lines.length - 1) * lineHeight) / 2 +
    fontSize * 0.04;
  lines.forEach((line, index) => {
    context.fillText(line, centre[0] * width, firstLineY + index * lineHeight);
  });
};

export const paintTextFace = (
  canvas: HTMLCanvasElement,
  face: TextFace,
): boolean => {
  const context = canvas.getContext("2d");
  if (context === null) {
    return false;
  }
  paintBackground(context, face);
  face.blocks.forEach((block) => {
    paintBlock(context, face, block);
  });
  return true;
};

interface PaintedFace {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

const buildTextTexture = (face: TextFace): PaintedFace | undefined => {
  const canvas = document.createElement("canvas");
  canvas.width = face.width;
  canvas.height = face.height;
  if (!paintTextFace(canvas, face)) {
    return undefined;
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture };
};

const fontsToWaitFor = [buildFont(48, true), buildFont(48, false)];

export const useTextTexture = (face: TextFace): CanvasTexture | undefined => {
  const painted = useMemo(() => buildTextTexture(face), [face]);

  useEffect(() => {
    if (painted === undefined) {
      return;
    }
    let isShown = true;
    void Promise.all(
      fontsToWaitFor.map((font) => document.fonts.load(font)),
    ).then(() => {
      if (isShown && paintTextFace(painted.canvas, face)) {
        painted.texture.needsUpdate = true;
      }
    });
    return () => {
      isShown = false;
      painted.texture.dispose();
    };
  }, [painted, face]);

  return painted?.texture;
};
