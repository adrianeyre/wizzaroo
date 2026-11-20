import { describe, expect, it } from "vitest";
import { isShape3d, shapes3d } from "./shapes-3d.js";

describe("shapes3d", () => {
  it("names the 3-D shapes the Year 1 curriculum asks a Child to recognise", () => {
    expect(shapes3d).toEqual([
      "cube",
      "cuboid",
      "pyramid",
      "sphere",
      "cylinder",
      "cone",
    ]);
  });

  it("knows a shape's name from any other word", () => {
    expect(isShape3d("cylinder")).toBe(true);
    expect(isShape3d("circle")).toBe(false);
  });
});
