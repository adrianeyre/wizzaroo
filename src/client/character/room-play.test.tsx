import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CharacterLoadout } from "../../curriculum/catalogue.js";
import type { RoomThing } from "./room-play-actions.js";
import { RoomPlay } from "./room-play.js";
import type { RoomPlaySceneProps } from "./room-play-scene.js";

const findButtonNamed = (name: string): HTMLButtonElement | undefined =>
  [...document.querySelectorAll("button")].find(
    (candidate) =>
      (candidate.getAttribute("aria-label") ?? candidate.textContent) === name,
  );

const clickButton = (name: string) => {
  const button = findButtonNamed(name);
  if (button === undefined) {
    throw new Error(`no button named ${name}`);
  }
  act(() => {
    button.click();
  });
};

const findStatus = () =>
  document.querySelector(".room-play [role=status]")?.textContent ?? "";

describe("RoomPlay", () => {
  let root: Root;
  let scene: RoomPlaySceneProps;
  const onLeave = vi.fn();

  const renderPlay = (loadout: CharacterLoadout = { pet: "pet-owl" }) => {
    act(() => {
      root.render(
        <RoomPlay
          characterName="Sparkle"
          room={{ bed: "bed-cloud", instrument: "instrument-piano" }}
          trophies={[]}
          loadout={loadout}
          soundSettings={{ isMusicMuted: true, areSoundEffectsMuted: true }}
          renderScene={(sceneProps) => {
            scene = sceneProps;
            return <div className="room-play-scene" />;
          }}
          onLeave={onLeave}
        />,
      );
    });
  };

  const reportNearby = (thing: RoomThing | undefined) => {
    act(() => {
      scene.onNearbyChanged(thing);
    });
  };

  beforeEach(() => {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    onLeave.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
  });

  it("covers the whole screen with the Room and explains how to play", () => {
    renderPlay();

    const section = document.querySelector(".room-play");
    expect(section?.getAttribute("aria-label")).toBe(
      "Playing in Sparkle's Room",
    );
    expect(document.querySelector(".explore-help")?.textContent).toContain(
      "Tap your Wise Owl to pick it up",
    );
    clickButton("Let's play!");
    expect(document.querySelector(".explore-help")).toBeNull();
  });

  it("offers to lie on the bed when the Character is beside it, and to get up again", () => {
    renderPlay();
    reportNearby("bed");

    clickButton("Lie down on the Cloud Bed");
    expect(findStatus()).toBe(
      "Ahh, comfy! You snuggle down on the Cloud Bed. Zzz…",
    );
    expect(scene.playState.pose).toBe("lying");

    reportNearby("clock");
    clickButton("Get up");
    expect(scene.playState.pose).toBe("standing");
  });

  it("gets up when the scene says the Child walked off", () => {
    renderPlay();
    act(() => {
      scene.onThingReached("bed");
    });
    expect(scene.playState.pose).toBe("lying");

    act(() => {
      scene.onGotUp();
    });
    expect(scene.playState.pose).toBe("standing");
  });

  it("plays with whatever the Character walked up to", () => {
    renderPlay();
    act(() => {
      scene.onThingReached("instrument");
    });

    expect(findStatus()).toBe("You play the Piano. What a lovely tune!");
    expect(scene.playState.pokes.instrument).toBe(1);
  });

  it("jumps when the Character plays on the rug", () => {
    renderPlay();
    act(() => {
      scene.onThingReached("rug");
    });

    expect(scene.inputRef.current.wantsJump).toBe(true);
  });

  it("picks the Pet up, strokes it with a button or by touch, and puts it down", () => {
    renderPlay();
    reportNearby("pet");

    clickButton("Pick up your Wise Owl");
    expect(scene.playState.isPetHeld).toBe(true);

    clickButton("Stroke your Wise Owl");
    expect(findStatus()).toBe(
      "You stroke your Wise Owl. It wriggles happily. It loves you!",
    );
    act(() => {
      scene.onPetStroked();
    });
    expect(scene.playState.strokes).toBe(2);

    clickButton("Put your Wise Owl down");
    expect(scene.playState.isPetHeld).toBe(false);
    expect(findButtonNamed("Stroke your Wise Owl")).toBeUndefined();
  });

  it("tells a Child with no Pet where to get one", () => {
    renderPlay({});

    expect(document.querySelector(".explore-help")?.textContent).toContain(
      "Get a Pet from your Wardrobe",
    );
  });

  it("walks with the arrow keys, plays with E, and gets up with Escape", () => {
    renderPlay();
    reportNearby("bed");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }));
    });
    expect(scene.inputRef.current.forward).toBe(1);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp" }));
    });
    expect(scene.inputRef.current.forward).toBe(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    });
    expect(scene.playState.pose).toBe("lying");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" }));
    });
    expect(scene.playState.pose).toBe("standing");
  });

  it("changes the camera view with the buttons and the V key, like exploring an Island", () => {
    renderPlay();
    expect(scene.cameraView).toBe("behind");
    expect(document.querySelector(".explore-help")?.textContent).toContain(
      "Press V or the camera buttons to change your view.",
    );

    clickButton("Bird's eye");
    expect(scene.cameraView).toBe("birds-eye");
    expect(findButtonNamed("Bird's eye")?.getAttribute("aria-pressed")).toBe(
      "true",
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyV" }));
    });
    expect(scene.cameraView).toBe("wide");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyV" }));
    });
    expect(scene.cameraView).toBe("map");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyV" }));
    });
    expect(scene.cameraView).toBe("behind");

    clickButton("First person");
    expect(scene.cameraView).toBe("first-person");
  });

  it("offers a Map of the whole Room from above, and says how to use it", () => {
    renderPlay();
    expect(document.querySelector(".explore-help")?.textContent).toContain(
      "Choose Map to see your whole Room from above",
    );

    clickButton("Map");
    expect(scene.cameraView).toBe("map");
    expect(findButtonNamed("Map")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("goes back to the Room", () => {
    renderPlay();

    clickButton("Back to my Room");

    expect(onLeave).toHaveBeenCalledOnce();
  });
});
