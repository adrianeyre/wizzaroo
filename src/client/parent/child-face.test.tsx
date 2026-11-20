import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPortraitShot,
  useItemPictureUrl,
} from "../character/item-picture.js";
import { ChildFace, getInitial } from "./child-face.js";

vi.mock("../character/item-picture.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../character/item-picture.js")>()),
  useItemPictureUrl: vi.fn(),
}));

const portraitUrl = "data:image/png;base64,portrait";

describe("a Child's face", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.mocked(useItemPictureUrl).mockReset();
  });

  const showFace = (loadout: Parameters<typeof ChildFace>[0]["loadout"]) => {
    act(() => {
      root.render(
        <ChildFace
          className="child-face"
          nickname=" amara"
          loadout={loadout}
        />,
      );
    });
    const face = container.querySelector(".child-face");
    if (face === null) {
      throw new Error("No face was shown");
    }
    return face;
  };

  it("is their 3D Character once its picture is taken", () => {
    vi.mocked(useItemPictureUrl).mockReturnValue(portraitUrl);
    const face = showFace({ hat: "hat-pointy-purple" });
    expect(face.querySelector("img")?.getAttribute("src")).toBe(portraitUrl);
    expect(face.textContent).toBe("");
    expect(face.getAttribute("aria-hidden")).toBe("true");
    expect(vi.mocked(useItemPictureUrl)).toHaveBeenLastCalledWith(
      buildPortraitShot({ hat: "hat-pointy-purple" }),
    );
  });

  it("is their initial while the picture is being taken", () => {
    vi.mocked(useItemPictureUrl).mockReturnValue(undefined);
    const face = showFace({ hat: "hat-pointy-purple" });
    expect(face.querySelector("img")).toBeNull();
    expect(face.textContent).toBe("A");
  });

  it("is their initial before they've made a Character", () => {
    vi.mocked(useItemPictureUrl).mockReturnValue(undefined);
    const face = showFace(null);
    expect(vi.mocked(useItemPictureUrl)).toHaveBeenLastCalledWith(undefined);
    expect(face.textContent).toBe(getInitial(" amara"));
  });
});

describe("a Character's portrait shot", () => {
  it("frames the whole Character on their head and hat, without a wand or pet", () => {
    const shot = buildPortraitShot({
      hat: "hat-pointy-purple",
      wand: "wand-star",
    });
    expect(shot.subject).toBe("character");
    if (shot.subject !== "character") {
      return;
    }
    expect(shot.focusPartNames).toEqual(["head", "hat"]);
    expect(shot.look.hat.model).not.toBe("none");
    expect(shot.look.wand.model).toBe("none");
    expect(shot.stillShowOff).toBeUndefined();
  });
});
