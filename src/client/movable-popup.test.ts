import { describe, expect, it } from "vitest";
import { keepPopupOnScreen } from "./movable-popup.js";

const screen = { width: 1000, height: 800 };
const restingBox = { left: 300, top: 200, width: 400, height: 200 };

describe("keepPopupOnScreen", () => {
  it("lets a pop-up move anywhere it stays on the screen", () => {
    expect(
      keepPopupOnScreen({ x: -120, y: 250 }, restingBox, screen),
    ).toStrictEqual({ x: -120, y: 250 });
  });

  it("keeps enough of a pop-up on screen to grab it again", () => {
    expect(
      keepPopupOnScreen({ x: -2000, y: -900 }, restingBox, screen),
    ).toStrictEqual({ x: -636, y: -200 });
    expect(
      keepPopupOnScreen({ x: 2000, y: 2000 }, restingBox, screen),
    ).toStrictEqual({ x: 636, y: 536 });
  });

  it("always lets a pop-up stay where it started, even before it has been measured", () => {
    expect(
      keepPopupOnScreen(
        { x: 0, y: 0 },
        { left: 0, top: 0, width: 0, height: 0 },
        screen,
      ),
    ).toStrictEqual({ x: 0, y: 0 });
  });
});
