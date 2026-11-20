import { describe, expect, it } from "vitest";
import {
  findRegionHeading,
  fitHeadingFont,
  headingFontSizes,
  headingSidePadding,
} from "./region-heading.js";

const headingTextureWidth = 512;
const roomForText = headingTextureWidth - headingSidePadding * 2;

// Each letter about as wide as 0.62 of the font size, close to Baloo 2 in capitals.
const makeMeasuringContext = () => {
  const context = {
    font: "",
    letterSpacing: "0px",
    measureText: (label: string) => ({
      width: label.length * 0.62 * Number(/(\d+)px/.exec(context.font)?.[1]),
    }),
  };
  return context;
};

const readFontSize = (font: string) => Number(/(\d+)px/.exec(font)?.[1]);

const measureWithSpacing = (
  context: ReturnType<typeof makeMeasuringContext>,
  label: string,
) =>
  context.measureText(label).width +
  Number.parseFloat(context.letterSpacing) * label.length;

describe("fitHeadingFont", () => {
  it("keeps a short Subject at the largest size", () => {
    const context = makeMeasuringContext();

    fitHeadingFont(context, "MUSIC", roomForText);

    expect(readFontSize(context.font)).toBe(headingFontSizes.largest);
  });

  it.each([
    "COMPUTING",
    "GEOGRAPHY",
    "LANGUAGES",
    "ART AND DESIGN",
    "DESIGN AND TECHNOLOGY",
  ])(
    "shrinks %s until it sits inside the plaque with room either side",
    (label) => {
      const context = makeMeasuringContext();

      fitHeadingFont(context, label, roomForText);

      expect(readFontSize(context.font)).toBeLessThan(headingFontSizes.largest);
      expect(measureWithSpacing(context, label)).toBeLessThanOrEqual(
        roomForText,
      );
    },
  );
});

describe("findRegionHeading", () => {
  it("names a Region's Subject, calls the Challenge Arena Checks, and gives the Big Top no heading", () => {
    expect(findRegionHeading({ subject: "maths", landmark: "bubbles" })).toBe(
      "Maths",
    );
    expect(
      findRegionHeading({ subject: undefined, landmark: "challenge-arena" }),
    ).toBe("Checks");
    expect(
      findRegionHeading({ subject: undefined, landmark: "big-top" }),
    ).toBeUndefined();
  });
});
