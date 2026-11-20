import { describe, expect, it } from "vitest";
import { mapSymbols } from "../../curriculum/geography.js";
import {
  mapSymbolPainters,
  symbolUnits,
  type SymbolCanvas,
} from "./map-symbol-painters.js";

class RecordingCanvas implements SymbolCanvas {
  fillStyle: string | CanvasGradient | CanvasPattern = "#000000";
  strokeStyle: string | CanvasGradient | CanvasPattern = "#000000";
  lineWidth = 1;
  lineCap: CanvasLineCap = "butt";
  lineJoin: CanvasLineJoin = "miter";
  font = "10px sans-serif";
  textAlign: CanvasTextAlign = "start";
  textBaseline: CanvasTextBaseline = "alphabetic";
  paintCount = 0;
  saveDepth = 0;
  transformedDepths: number[] = [];
  strayPoints: string[] = [];
  texts: string[] = [];

  private notePoint(x: number, y: number) {
    const isTransformed = this.transformedDepths.length > 0;
    const isInside = x >= 0 && x <= symbolUnits && y >= 0 && y <= symbolUnits;
    if (!isTransformed && !isInside) {
      this.strayPoints.push(`${String(x)},${String(y)}`);
    }
  }

  private noteTransform() {
    if (!this.transformedDepths.includes(this.saveDepth)) {
      this.transformedDepths.push(this.saveDepth);
    }
  }

  arc(x: number, y: number, radius: number) {
    this.notePoint(x - radius, y - radius);
    this.notePoint(x + radius, y + radius);
  }
  ellipse(x: number, y: number, radiusX: number, radiusY: number) {
    this.notePoint(x - radiusX, y - radiusY);
    this.notePoint(x + radiusX, y + radiusY);
  }
  beginPath() {
    return undefined;
  }
  closePath() {
    return undefined;
  }
  moveTo(x: number, y: number) {
    this.notePoint(x, y);
  }
  lineTo(x: number, y: number) {
    this.notePoint(x, y);
  }
  quadraticCurveTo(controlX: number, controlY: number, x: number, y: number) {
    this.notePoint(x, y);
  }
  bezierCurveTo(
    firstX: number,
    firstY: number,
    secondX: number,
    secondY: number,
    x: number,
    y: number,
  ) {
    this.notePoint(x, y);
  }
  rect(x: number, y: number, width: number, height: number) {
    this.notePoint(x, y);
    this.notePoint(x + width, y + height);
  }
  roundRect(x: number, y: number, width: number, height: number) {
    this.rect(x, y, width, height);
  }
  fillRect(x: number, y: number, width: number, height: number) {
    this.rect(x, y, width, height);
    this.paintCount++;
  }
  fill() {
    this.paintCount++;
  }
  stroke() {
    this.paintCount++;
  }
  fillText(text: string, x: number, y: number) {
    this.notePoint(x, y);
    this.texts.push(text);
    this.paintCount++;
  }
  save() {
    this.saveDepth++;
  }
  restore() {
    this.transformedDepths = this.transformedDepths.filter(
      (depth) => depth !== this.saveDepth,
    );
    this.saveDepth--;
  }
  translate() {
    this.noteTransform();
  }
  rotate() {
    this.noteTransform();
  }
  setLineDash() {
    return undefined;
  }
}

const paintSymbol = (symbol: (typeof mapSymbols)[number]) => {
  const canvas = new RecordingCanvas();
  mapSymbolPainters[symbol](canvas);
  return canvas;
};

const readableWords = /[a-z]{3,}/i;

describe("the map symbol painters", () => {
  it("has exactly one painter for every map symbol", () => {
    expect(Object.keys(mapSymbolPainters).sort()).toEqual(
      [...mapSymbols].sort(),
    );
  });

  it.each(mapSymbols)("paints %s inside its square", (symbol) => {
    const canvas = paintSymbol(symbol);

    expect(canvas.paintCount).toBeGreaterThan(0);
    expect(canvas.strayPoints).toEqual([]);
    expect(canvas.saveDepth).toBe(0);
    expect(canvas.transformedDepths).toEqual([]);
  });

  it.each(mapSymbols)("never writes a word naming %s", (symbol) => {
    const canvas = paintSymbol(symbol);
    const nameWords = symbol.split("-");

    for (const text of canvas.texts) {
      expect(text).not.toMatch(readableWords);
      for (const word of nameWords) {
        expect(text.toLowerCase()).not.toContain(word);
      }
    }
  });
});
