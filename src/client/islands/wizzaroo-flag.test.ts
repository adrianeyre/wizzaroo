import { describe, expect, it } from "vitest";
import {
  drawWizzarooFlag,
  flagName,
  flagTextureSize,
  type FlagCanvas,
} from "./wizzaroo-flag.js";

const letterWidthShare = 0.55;

const buildRecordingCanvas = () => {
  const drawnText: { text: string; x: number; y: number; font: string }[] = [];
  const gradient = { addColorStop: () => undefined };
  const canvas: FlagCanvas = {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineJoin: "miter",
    globalAlpha: 1,
    shadowColor: "transparent",
    shadowBlur: 0,
    shadowOffsetY: 0,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillRect: () => undefined,
    strokeRect: () => undefined,
    beginPath: () => undefined,
    arc: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    closePath: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    fillText: (text, x, y) => {
      drawnText.push({ text, x, y, font: canvas.font });
    },
    strokeText: (text, x, y) => {
      drawnText.push({ text, x, y, font: canvas.font });
    },
    measureText: (text) => {
      const size = Number(/(\d+)px/.exec(canvas.font)?.[1] ?? 10);
      return new TextMetricsLike(text.length * size * letterWidthShare);
    },
    save: () => undefined,
    restore: () => undefined,
  };
  return { canvas, drawnText };
};

class TextMetricsLike implements TextMetrics {
  actualBoundingBoxAscent = 0;
  actualBoundingBoxDescent = 0;
  actualBoundingBoxLeft = 0;
  actualBoundingBoxRight = 0;
  alphabeticBaseline = 0;
  emHeightAscent = 0;
  emHeightDescent = 0;
  fontBoundingBoxAscent = 0;
  fontBoundingBoxDescent = 0;
  hangingBaseline = 0;
  ideographicBaseline = 0;
  constructor(public readonly width: number) {}
}

describe("the Wizzaroo flag", () => {
  it("writes Wizzaroo on the flag, outlined and in gold, beside its crest", () => {
    const { canvas, drawnText } = buildRecordingCanvas();
    drawWizzarooFlag(canvas, flagTextureSize.width, flagTextureSize.height);

    expect(drawnText.map(({ text }) => text)).toStrictEqual([
      flagName,
      flagName,
    ]);
    expect(flagName).toBe("Wizzaroo");
  });

  it("fits the name between the crest and the border", () => {
    const { canvas, drawnText } = buildRecordingCanvas();
    drawWizzarooFlag(canvas, flagTextureSize.width, flagTextureSize.height);

    drawnText.forEach(({ x, font }) => {
      const size = Number(/(\d+)px/.exec(font)?.[1]);
      const halfWidth = (flagName.length * size * letterWidthShare) / 2;
      expect(x - halfWidth).toBeGreaterThan(232);
      expect(x + halfWidth).toBeLessThan(flagTextureSize.width - 30);
    });
  });
});
