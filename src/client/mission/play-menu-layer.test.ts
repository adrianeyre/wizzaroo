import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const theme = readFileSync(join(process.cwd(), "src/client/theme.css"), "utf8");

const findOpenMenuLayer = (): number => {
  const layer = /--layer-open-menu:\s*(\d+)/.exec(theme)?.[1];
  if (layer === undefined) {
    throw new Error("no --layer-open-menu");
  }
  return Number(layer);
};

const listOtherLayers = (): number[] =>
  Array.from(theme.matchAll(/z-index:\s*(-?\d+)\s*;/g), ([, layer]) =>
    Number(layer),
  );

describe("the open Menu", () => {
  it("lifts the bar holding the Menu above every other layer while it is open", () => {
    expect(theme).toMatch(
      /\.play-nav:has\(\.play-menu-toggle\[aria-expanded="true"\]\)[^{]*\{\s*z-index: var\(--layer-open-menu\);/,
    );
    expect(theme).toMatch(
      /\.site-header:has\(\.site-menu-toggle\[aria-expanded="true"\]\)\s*\{\s*z-index: var\(--layer-open-menu\);/,
    );
    expect(findOpenMenuLayer()).toBeGreaterThan(Math.max(...listOtherLayers()));
  });
});
