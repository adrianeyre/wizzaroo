import { describe, expect, it } from "vitest";
import {
  catalogue,
  furnitureSlots,
  type RoomLoadout,
} from "../../curriculum/catalogue.js";
import {
  describeRoomAction,
  getUpInRoom,
  playWithRoomThing,
  startingRoomPlayState,
  strokeRoomPet,
  type RoomPlayFacts,
} from "./room-play-actions.js";
import { findFurnitureItems } from "./room-scene.js";

const buildFacts = (
  room: RoomLoadout = {},
  {
    petName = "Wise Owl",
    trophyCount = 0,
  }: { petName?: string; trophyCount?: number } = {},
): RoomPlayFacts => ({
  furniture: new Map(findFurnitureItems(room, catalogue)),
  petName,
  trophyCount,
  time: new Date(2026, 10, 16, 15, 10),
});

describe("playing in the Room", () => {
  it("lies down on the bed, and gets up again", () => {
    const facts = buildFacts({ bed: "bed-dragon" });
    expect(describeRoomAction("bed", startingRoomPlayState, facts)).toBe(
      "Lie down on the Dragon Bed",
    );

    const lying = playWithRoomThing("bed", startingRoomPlayState, facts);
    expect(lying.state.pose).toBe("lying");
    expect(lying.message).toBe(
      "Ahh, comfy! You snuggle down on the Dragon Bed. Zzz…",
    );
    expect(lying.sound).toBeDefined();
    expect(describeRoomAction("bed", lying.state, facts)).toBe("Get up");

    const up = playWithRoomThing("bed", lying.state, facts);
    expect(up.state.pose).toBe("standing");
    expect(up.message).toBe("Good morning! You hop out of bed.");
  });

  it("sits on the seat and stands up, and gets up from either to play with anything else", () => {
    const facts = buildFacts({ seat: "seat-throne" });
    const sitting = playWithRoomThing("seat", startingRoomPlayState, facts);
    expect(sitting.state.pose).toBe("sitting");
    expect(sitting.message).toBe("You sit on the Throne. So comfy!");
    expect(describeRoomAction("seat", sitting.state, facts)).toBe("Stand up");

    expect(playWithRoomThing("plant", sitting.state, facts).state.pose).toBe(
      "standing",
    );
    expect(getUpInRoom(sitting.state).pose).toBe("standing");
    expect(getUpInRoom(startingRoomPlayState)).toBe(startingRoomPlayState);
  });

  it("turns the lamp off and on, and turns day to night through the window", () => {
    const facts = buildFacts({
      lamp: "lamp-jellyfish",
      window: "window-heart",
    });
    expect(describeRoomAction("lamp", startingRoomPlayState, facts)).toBe(
      "Turn off the Jellyfish Lamp",
    );
    const dark = playWithRoomThing("lamp", startingRoomPlayState, facts);
    expect(dark.state.isLampOn).toBe(false);
    expect(dark.message).toBe("Click! The Jellyfish Lamp is off.");
    expect(describeRoomAction("lamp", dark.state, facts)).toBe(
      "Turn on the Jellyfish Lamp",
    );

    const night = playWithRoomThing("window", startingRoomPlayState, facts);
    expect(night.state.isNight).toBe(true);
    expect(night.message).toContain("night time");
    expect(playWithRoomThing("window", night.state, facts).state.isNight).toBe(
      false,
    );
  });

  it("reads the time from the clock and polishes however many Trophies there are", () => {
    expect(
      playWithRoomThing("clock", startingRoomPlayState, buildFacts()).message,
    ).toBe("Tick tock! The Round Clock says it's 3:10 pm.");
    expect(
      playWithRoomThing(
        "shelf",
        startingRoomPlayState,
        buildFacts({}, { trophyCount: 3 }),
      ).message,
    ).toBe("You polish your 3 Trophies. They sparkle!");
    expect(
      playWithRoomThing(
        "shelf",
        startingRoomPlayState,
        buildFacts({}, { trophyCount: 1 }),
      ).message,
    ).toBe("You polish your Trophy. It sparkles!");
    expect(
      describeRoomAction("shelf", startingRoomPlayState, buildFacts()),
    ).toBe("Dust the Plank Shelf");
  });

  it("plays every Instrument with its own tune", () => {
    const tunes = catalogue
      .filter(({ slot }) => slot === "instrument")
      .map(({ id }) => {
        const outcome = playWithRoomThing(
          "instrument",
          startingRoomPlayState,
          buildFacts({ instrument: id }),
        );
        return JSON.stringify(outcome.sound);
      });

    expect(tunes).toHaveLength(10);
    expect(new Set(tunes).size).toBe(10);
  });

  it("does something with every piece of Furniture, and counts each go so the Room can react", () => {
    const facts = buildFacts();
    furnitureSlots.forEach((slot) => {
      expect(describeRoomAction(slot, startingRoomPlayState, facts)).not.toBe(
        "",
      );
      const outcome = playWithRoomThing(slot, startingRoomPlayState, facts);
      expect(outcome.message, slot).not.toBe("");
      expect(outcome.state.pokes[slot], slot).toBe(1);
    });
  });

  it("picks the Pet up, strokes it, and puts it down", () => {
    const facts = buildFacts();
    expect(describeRoomAction("pet", startingRoomPlayState, facts)).toBe(
      "Pick up your Wise Owl",
    );
    const held = playWithRoomThing("pet", startingRoomPlayState, facts);
    expect(held.state.isPetHeld).toBe(true);
    expect(held.message).toContain("You pick up your Wise Owl");
    expect(describeRoomAction("pet", held.state, facts)).toBe(
      "Put your Wise Owl down",
    );

    const stroked = strokeRoomPet(held.state, facts);
    expect(stroked.state.strokes).toBe(1);
    expect(stroked.message).toBe(
      "You stroke your Wise Owl. It wriggles happily. It loves you!",
    );

    const putDown = playWithRoomThing("pet", stroked.state, facts);
    expect(putDown.state.isPetHeld).toBe(false);
    expect(putDown.message).toBe("You put your Wise Owl down gently.");
  });
});
