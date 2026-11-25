import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CharacterHead, CharacterPreview } from "./character-preview.js";

const canvasResizes: unknown[] = [];

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ resize }: { resize?: unknown; children?: ReactNode }) => {
    canvasResizes.push(resize);
    return <canvas />;
  },
  useFrame: () => undefined,
}));

afterEach(() => {
  canvasResizes.length = 0;
  vi.unstubAllGlobals();
});

const render = (node: ReactNode) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  document.body.innerHTML = "<div id=root></div>";
  const container = document.getElementById("root");
  if (container === null) {
    throw new Error("no root");
  }
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  act(() => {
    root.unmount();
  });
};

describe("sizing a Character's canvas", () => {
  it("sizes the speaking face's head by its layout box, so it fills its circle even when it mounts mid pop-in", () => {
    render(<CharacterHead loadout={{}} />);
    expect(canvasResizes).toStrictEqual([{ offsetSize: true }]);
  });

  it("sizes a Character's portrait by its layout box too", () => {
    render(<CharacterPreview characterName="Kofi" loadout={{}} />);
    expect(canvasResizes).toContainEqual({ offsetSize: true });
  });
});
