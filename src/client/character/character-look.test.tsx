import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { BufferGeometry, Mesh, type Object3D } from "three";
import { act } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  catalogue,
  featureSlots,
  wearableSlots,
  type CharacterLoadout,
  type FeatureSlot,
  type Item,
  type WearableSlot,
} from "../../curriculum/catalogue.js";
import {
  buildCharacterLook,
  buildShowOffLook,
  characterTypeGear,
  describeCharacter,
} from "./character-look.js";
import { CharacterModel } from "./character-model.js";
import {
  anticModels,
  FidgetingFigure,
  findAnticPose,
  findStillEmotePose,
  PetFigure,
  ShowingOffCharacter,
} from "./character-show-off.js";
import { buildItemShot, ShotSubject } from "./item-picture.js";
import { describeRoom } from "./room-scene.js";

const characterTriangleBudget = 16_000;
const characterMeshBudget = 65;

const isMesh = (value: unknown): value is Mesh => value instanceof Mesh;

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const listMeshesUnder = (object: Object3D): Mesh[] => {
  const meshes: Mesh[] = [];
  object.traverse((child) => {
    if (isMesh(child)) {
      meshes.push(child);
    }
  });
  return meshes;
};

const renderCharacter = (loadout: CharacterLoadout) =>
  ReactThreeTestRenderer.create(
    <CharacterModel look={buildCharacterLook(loadout)} />,
  );

const findPart = (
  renderer: ReactThreeTest.Renderer,
  name: string,
): Object3D | undefined =>
  renderer.scene.findAll(({ instance }) => instance.name === name)[0]?.instance;

type DrawnSlot = FeatureSlot | WearableSlot;

type DrawnItem = Item & { slot: DrawnSlot };

const isDrawnItem = (item: Item): item is DrawnItem =>
  [...featureSlots, ...wearableSlots].some((slot) => slot === item.slot);

const partNameBySlot: Partial<Record<DrawnSlot, string[]>> = {
  hairStyle: ["hair"],
  eyes: ["eyes"],
  eyebrows: ["eyebrows"],
  mouth: ["mouth"],
  facialHair: ["facial-hair"],
  hat: ["hat"],
  accessory: ["face-accessory", "neck-accessory"],
  back: ["back"],
  wand: ["held"],
};

const blankLoadout: CharacterLoadout = {
  characterType: "type-superhero",
  hairStyle: "hair-bald",
  facialHair: "facial-hair-none",
  hat: "hat-none",
  accessory: "accessory-none",
  back: "back-none",
};

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("buildCharacterLook", () => {
  it("dresses a new Character as the first Character Type, in its own gear", () => {
    const look = buildCharacterLook({});

    expect(look.characterType).toBe("wizard");
    expect(look).toMatchObject(characterTypeGear.wizard);
    expect(look.facialHair).toBe("none");
  });

  it("puts on what the Child wears over the Character Type's own gear, slot by slot", () => {
    const look = buildCharacterLook({
      characterType: "type-knight",
      hat: "hat-pirate",
      eyes: "eyes-hearts",
      bodyColour: "body-cocoa",
    });

    expect(look.characterType).toBe("knight");
    expect(look.hat).toEqual({
      model: "tricorn",
      colour: catalogue.find(({ id }) => id === "hat-pirate")?.colour,
    });
    expect(look.outfit).toEqual(characterTypeGear.knight.outfit);
    expect(look.wand).toEqual(characterTypeGear.knight.wand);
    expect(look.eyes.model).toBe("hearts");
    expect(look.eyes.colour).toBe("#e0356a");
    expect(look.skinColour).toBe("#6f4429");
  });

  it("colours the eyes with the Eye colour the Child chose", () => {
    const look = buildCharacterLook({
      eyes: "eyes-hearts",
      eyeColour: "eye-colour-sky-blue",
    });

    expect(look.eyes).toEqual({ model: "hearts", colour: "#7ab8e8" });
  });
});

describe("describeCharacter", () => {
  it("names the Character Type and everything worn, leaving out empty choices", () => {
    expect(describeCharacter("Sparkle", {})).toBe("Sparkle the Wizard");
    expect(
      describeCharacter("Sparkle", {
        characterType: "type-pirate",
        hat: "hat-none",
        outfit: "outfit-stripes",
        accessory: "eyes-cool-shades",
      }),
    ).toBe("Sparkle the Pirate, wearing Cool shades, Stripy jumper");
  });

  it("says what the Character rides and which Pet is with them", () => {
    expect(
      describeCharacter("Sparkle", {
        mount: "mount-dragon",
        pet: "pet-owl",
        emote: "emote-wave",
      }),
    ).toBe("Sparkle the Wizard, riding a Friendly Dragon, with a Wise Owl");
  });
});

describe("buildShowOffLook", () => {
  it("shows off only what is chosen, and nothing in an empty slot", () => {
    expect(buildShowOffLook({})).toEqual({
      pet: undefined,
      mount: undefined,
      emote: undefined,
      spellEffect: undefined,
    });
    expect(
      buildShowOffLook({ pet: "pet-cat", emote: "emote-spin", hat: "pet-fox" }),
    ).toMatchObject({ pet: { model: "cat" }, emote: "spin", mount: undefined });
  });
});

describe("PetFigure", () => {
  const petMeshBudget = 30;
  const pets = catalogue.filter(({ slot }) => slot === "pet");

  it.each(pets.map(({ id }) => id))(
    "draws %s as its own small shape",
    async (petId) => {
      const pet = buildShowOffLook({ pet: petId }).pet;
      expect(pet).toBeDefined();
      if (pet === undefined) {
        return;
      }
      const renderer = await ReactThreeTestRenderer.create(
        <PetFigure pet={pet} />,
      );

      const petPart = findPart(renderer, "pet");
      expect(petPart).toBeDefined();
      const meshCount =
        petPart === undefined ? 0 : listMeshesUnder(petPart).length;
      expect(meshCount).toBeGreaterThan(0);
      expect(meshCount).toBeLessThanOrEqual(petMeshBudget);
      await renderer.unmount();
    },
  );

  it("gives every Pet its own model", () => {
    const models = pets.map(({ model }) => model);
    expect(new Set(models).size).toBe(models.length);
  });
});

describe("ShowingOffCharacter", () => {
  it("draws the Pet beside the Character and the Mount under them", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <ShowingOffCharacter
        loadout={{ pet: "pet-bunny", mount: "mount-cloud" }}
        showOffCount={0}
      />,
    );

    expect(findPart(renderer, "pet")).toBeDefined();
    expect(findPart(renderer, "mount")).toBeDefined();
    expect(findPart(renderer, "character")).toBeDefined();
    await renderer.unmount();
  });

  it("plays the Spell Effect once the Child shows off, and stops when it ends", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <ShowingOffCharacter
        loadout={{ spellEffect: "spell-effect-sparkles" }}
        showOffCount={1}
      />,
    );
    await renderer.advanceFrames(2, 0.1);

    expect(findPart(renderer, "spell-effect")).toBeDefined();

    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(20, 0.1);
    });

    expect(findPart(renderer, "spell-effect")).toBeUndefined();
    await renderer.unmount();
  });

  const findRiderTurn = (renderer: ReactThreeTest.Renderer): number => {
    const rider = findPart(renderer, "character")?.parent;
    if (rider === undefined || rider === null) {
      throw new Error("the Character isn't drawn");
    }
    return rider.rotation.y;
  };

  const renderSpinWithSparkles = () =>
    ReactThreeTestRenderer.create(
      <ShowingOffCharacter
        loadout={{ emote: "emote-spin", spellEffect: "spell-effect-sparkles" }}
        showOffCount={1}
      />,
    );

  it("spins the Emote and moves the Spell Effect when motion isn't reduced", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const renderer = await renderSpinWithSparkles();
    await renderer.advanceFrames(2, 0.1);
    const firstTurn = findRiderTurn(renderer);
    await renderer.advanceFrames(2, 0.1);

    expect(findRiderTurn(renderer)).not.toBe(firstTurn);
    expect(findPart(renderer, "spell-effect-glow")).toBeUndefined();
    await renderer.unmount();
    vi.unstubAllGlobals();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  it("shows the Emote as a still pose and the Spell Effect as a glow when reduced motion is on", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const renderer = await renderSpinWithSparkles();
    await renderer.advanceFrames(2, 0.1);
    const stillTurn = findRiderTurn(renderer);
    await renderer.advanceFrames(3, 0.1);

    expect(stillTurn).toBe(findStillEmotePose("spin").turn);
    expect(findRiderTurn(renderer)).toBe(stillTurn);
    expect(findPart(renderer, "spell-effect-glow")).toBeDefined();
    await renderer.unmount();
    vi.unstubAllGlobals();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });
});

describe("findAnticPose", () => {
  it("raises the free arm to wave and lowers it again", () => {
    expect(findAnticPose("wave", 0).freeArmRaise).toBe(0);
    expect(findAnticPose("wave", 0.5).freeArmRaise).toBeGreaterThan(2);
    expect(findAnticPose("wave", 1).freeArmRaise).toBe(0);
  });

  it("keeps the free arm down for every antic but a wave", () => {
    const loweredArms = anticModels
      .filter((antic) => antic !== "wave")
      .map((antic) => findAnticPose(antic, 0.5).freeArmRaise);

    expect(loweredArms.every((raise) => raise === 0)).toBe(true);
  });
});

describe("FidgetingFigure", () => {
  const findFreeArmRaise = (renderer: ReactThreeTest.Renderer): number => {
    const freeArm = findPart(renderer, "free-arm");
    if (freeArm === undefined) {
      throw new Error("the free arm isn't drawn");
    }
    return -freeArm.rotation.z;
  };

  const renderFidgetingCharacter = () =>
    ReactThreeTestRenderer.create(
      <FidgetingFigure>
        <CharacterModel look={buildCharacterLook({})} />
      </FidgetingFigure>,
    );

  it("waves after a pause and comes back to rest", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.spyOn(Math, "random").mockReturnValue(0);
    const renderer = await renderFidgetingCharacter();
    await renderer.advanceFrames(2, 0.1);
    const restingRaise = findFreeArmRaise(renderer);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await renderer.advanceFrames(8, 0.1);
    const wavingRaise = findFreeArmRaise(renderer);
    await renderer.advanceFrames(12, 0.1);

    expect(restingRaise).toBeCloseTo(0);
    expect(wavingRaise).toBeGreaterThan(2);
    expect(findFreeArmRaise(renderer)).toBeCloseTo(0);
    await renderer.unmount();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  it("stays still when reduced motion is on", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const renderer = await renderFidgetingCharacter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await renderer.advanceFrames(8, 0.1);

    expect(findFreeArmRaise(renderer)).toBeCloseTo(0);
    await renderer.unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });
});

describe("describeRoom", () => {
  it("names every piece of Furniture, the starters where nothing is chosen, and counts the Trophies", () => {
    expect(
      describeRoom("Sparkle", { bed: "bed-bunk", rug: "rug-star" }, [
        { islandId: "meadow-isle", regionId: "bubble-bay" },
        { islandId: "meadow-isle", regionId: "crystal-caves" },
      ]),
    ).toBe(
      "Sparkle's Room, with Bunk Bed, Star Rug, Plain Paint, Sunflower Picture, Plank Shelf, Desk Lamp, Square Window, Cactus, Wooden Desk, Beanbag, Toy Chest, Round Clock, Fish Bowl, Teddy Bear and Toy Drum. 2 Trophies on the shelf.",
    );
    expect(describeRoom("A Classmate", {}, [])).toMatch(
      /^A Classmate's Room, with Wooden Bed, .* No Trophies on the shelf yet\.$/,
    );
  });
});

describe("CharacterModel", () => {
  it.each(
    catalogue
      .filter(isDrawnItem)
      .filter(
        ({ model }) =>
          model !== undefined && model !== "none" && model !== "bald",
      ),
  )("draws the $name ($slot)", async (item) => {
    const renderer = await renderCharacter({
      ...blankLoadout,
      [item.slot]: item.id,
    });
    const partNames = partNameBySlot[item.slot];

    if (partNames === undefined) {
      expect(listMeshesUnder(renderer.scene.instance).length).toBeGreaterThan(
        0,
      );
    } else {
      const meshCount = partNames
        .map((name) => findPart(renderer, name))
        .filter((part) => part !== undefined)
        .reduce((total, part) => total + listMeshesUnder(part).length, 0);
      expect(meshCount).toBeGreaterThan(0);
    }
    await renderer.unmount();
  });

  it.each(Object.keys(characterTypeGear))(
    `draws a fully dressed %s within ${String(characterTriangleBudget)} triangles and ${String(characterMeshBudget)} meshes`,
    async (characterType) => {
      const renderer = await renderCharacter({
        characterType: `type-${characterType}`,
        hairStyle: "hair-curly",
        eyes: "eyes-lashes",
        mouth: "mouth-gap-tooth",
        facialHair: "facial-hair-braided-beard",
        accessory: "accessory-round-glasses",
      });
      const meshes = listMeshesUnder(renderer.scene.instance);
      const triangles = meshes.reduce(
        (total, { geometry }) => total + countTriangles(geometry),
        0,
      );

      expect(triangles).toBeLessThanOrEqual(characterTriangleBudget);
      expect(meshes.length).toBeLessThanOrEqual(characterMeshBudget);
      await renderer.unmount();
    },
  );
});

describe("buildItemShot", () => {
  const loadout: CharacterLoadout = {
    characterType: "type-pirate",
    hairStyle: "hair-curly",
    hat: "hat-wizard-blue",
    accessory: "eyes-cool-shades",
  };

  it("pictures a Character Type in its own gear, with the Child's Features", () => {
    const shot = buildItemShot("characterType", "type-knight", loadout);

    expect(shot).toMatchObject({
      subject: "character",
      look: {
        characterType: "knight",
        hairStyle: "curly",
        ...characterTypeGear.knight,
      },
    });
  });

  it("pictures a face Feature close up on the Child's own head, with nothing hiding it", () => {
    const shot = buildItemShot("eyes", "eyes-hearts", loadout);

    expect(shot).toMatchObject({
      subject: "head",
      focusPartNames: ["eyes"],
      look: {
        eyes: { model: "hearts" },
        hat: { model: "none" },
        accessory: { model: "none" },
      },
    });
    expect(buildItemShot("hairStyle", "hair-afro", loadout)).toMatchObject({
      subject: "head",
      focusPartNames: [],
      look: { hairStyle: "afro" },
    });
  });

  it("pictures something to wear on its own, and the Character Type's own gear when nothing is chosen", () => {
    expect(buildItemShot("hat", "hat-pirate", loadout)).toMatchObject({
      subject: "hat",
      look: { hat: { model: "tricorn" } },
    });
    expect(buildItemShot("hat", undefined, loadout)).toMatchObject({
      subject: "hat",
      look: { hat: characterTypeGear.pirate.hat },
    });
  });

  it("pictures an accessory on the Character, framed on the accessory, with no hat in the way", () => {
    expect(
      buildItemShot("accessory", "accessory-round-glasses", loadout),
    ).toMatchObject({
      subject: "character",
      focusPartNames: ["face-accessory", "neck-accessory"],
      look: {
        accessory: { model: "round-glasses" },
        hat: { model: "none" },
        wand: { model: "none" },
      },
    });
  });

  it("pictures a Pet, a Mount or Furniture on its own", () => {
    expect(buildItemShot("pet", "pet-fox", loadout)).toMatchObject({
      subject: "pet",
      pet: { model: "fox" },
    });
    expect(buildItemShot("mount", "mount-broomstick", loadout)).toMatchObject({
      subject: "mount",
      mount: { model: "broomstick" },
    });
    expect(buildItemShot("bed", "bed-rocket", loadout)).toMatchObject({
      subject: "furniture",
      furniture: { slot: "bed", model: "rocket" },
    });
    expect(buildItemShot("pet", undefined, loadout)).toBeUndefined();
  });

  it("pictures an Emote or Spell Effect on the Character, standing still", () => {
    expect(buildItemShot("emote", "emote-bow", loadout)).toMatchObject({
      subject: "character",
      stillShowOff: { emote: "bow", spellEffect: undefined },
    });
    expect(
      buildItemShot("spellEffect", "spell-effect-bubbles", loadout),
    ).toMatchObject({
      subject: "character",
      stillShowOff: { spellEffect: { model: "bubbles" } },
    });
  });

  it("leaves the colour Features and empty slots as swatches", () => {
    expect(
      buildItemShot("accessory", "accessory-none", loadout),
    ).toBeUndefined();
    expect(buildItemShot("bodyColour", "body-cocoa", loadout)).toBeUndefined();
    expect(
      buildItemShot("eyeColour", "eye-colour-green", loadout),
    ).toBeUndefined();
  });
});

describe("ShotSubject", () => {
  it.each(
    catalogue.filter(({ model }) => model !== undefined && model !== "none"),
  )("pictures the $name ($slot)", async (item) => {
    const shot = buildItemShot(item.slot, item.id, blankLoadout);
    if (shot === undefined) {
      throw new Error(`No picture for ${item.id}`);
    }
    const renderer = await ReactThreeTestRenderer.create(
      <ShotSubject shot={shot} />,
    );

    expect(listMeshesUnder(renderer.scene.instance).length).toBeGreaterThan(0);
    await renderer.unmount();
  });

  it("pictures nothing for an empty slot, so the tile keeps its swatch", async () => {
    const shot = buildItemShot("hat", "hat-none", blankLoadout);
    if (shot === undefined) {
      throw new Error("No picture for hat-none");
    }
    const renderer = await ReactThreeTestRenderer.create(
      <ShotSubject shot={shot} />,
    );

    expect(listMeshesUnder(renderer.scene.instance)).toHaveLength(0);
    await renderer.unmount();
  });
});
