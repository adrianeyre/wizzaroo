import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { useThree } from "@react-three/fiber";
import { BufferGeometry, Mesh, Vector3, type Camera } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  catalogue,
  furnitureSlots,
  type CharacterLoadout,
  type RoomLoadout,
} from "../../curriculum/catalogue.js";
import type { ExploreInput } from "../islands/island-explore-hud.js";
import {
  startingRoomPlayState,
  type RoomPlayState,
  type RoomThing,
} from "./room-play-actions.js";
import type { RoomCameraView } from "../islands/island-explore-hud.js";
import {
  findMapCameraHeight,
  findRoomViewAim,
  RoomPlayScene,
  type RoomPlaySceneProps,
} from "./room-play-scene.js";

const frameSeconds = 1 / 60;
const roomPlayMeshBudget = 120;
const roomPlayTriangleBudget = 40_000;
const withOwl: CharacterLoadout = { pet: "pet-owl" };
const tap = { delta: 0, stopPropagation: () => undefined };

interface PlayRecord {
  reached: RoomThing[];
  nearby: (RoomThing | undefined)[];
  strokes: number;
  gotUp: number;
}

const CameraCatcher = ({
  onCameraFound,
}: {
  onCameraFound: (camera: Camera) => void;
}) => {
  onCameraFound(useThree((state) => state.camera));
  return null;
};

const renderPlay = async ({
  room = {},
  loadout = withOwl,
  playState = startingRoomPlayState,
  cameraView = "behind",
}: {
  room?: RoomLoadout;
  loadout?: CharacterLoadout;
  playState?: RoomPlayState;
  cameraView?: RoomCameraView;
} = {}) => {
  const record: PlayRecord = { reached: [], nearby: [], strokes: 0, gotUp: 0 };
  const input: { current: ExploreInput } = {
    current: { right: 0, forward: 0, wantsJump: false },
  };
  const buildProps = (state: RoomPlayState): RoomPlaySceneProps => ({
    room,
    trophies: [{ islandId: "meadow-isle", regionId: "bubble-bay" }],
    loadout,
    inputRef: input,
    playState: state,
    cameraView,
    onNearbyChanged: (thing) => {
      record.nearby.push(thing);
    },
    onThingReached: (thing) => {
      record.reached.push(thing);
    },
    onPetStroked: () => {
      record.strokes += 1;
    },
    onGotUp: () => {
      record.gotUp += 1;
    },
  });
  const caught: { camera?: Camera } = {};
  const buildScene = (state: RoomPlayState) => (
    <>
      <RoomPlayScene {...buildProps(state)} />
      <CameraCatcher
        onCameraFound={(camera) => {
          caught.camera = camera;
        }}
      />
    </>
  );
  const renderer = await ReactThreeTestRenderer.create(buildScene(playState));
  const changeState = async (state: RoomPlayState) => {
    await renderer.update(buildScene(state));
  };
  const findCamera = (): Camera => {
    if (caught.camera === undefined) {
      throw new Error("the scene has no camera");
    }
    return caught.camera;
  };
  return { renderer, input, record, changeState, findCamera };
};

const isMesh = (value: unknown): value is Mesh => value instanceof Mesh;

const listShownMeshes = (renderer: ReactThreeTest.Renderer): Mesh[] => {
  const meshes: Mesh[] = [];
  renderer.scene.instance.traverseVisible((part) => {
    if (isMesh(part)) {
      meshes.push(part);
    }
  });
  return meshes;
};

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const findNamed = (renderer: ReactThreeTest.Renderer, name: string) =>
  renderer.scene.findAll(({ instance }) => instance.name === name);

const findPlayer = (renderer: ReactThreeTest.Renderer) => {
  const [player] = findNamed(renderer, "room-player");
  return player.instance;
};

const buildFullestRoom = (pickLast: boolean): RoomLoadout =>
  Object.fromEntries(
    furnitureSlots.map((slot) => {
      const choices = catalogue.filter((item) => item.slot === slot);
      return [slot, (pickLast ? choices.at(-1) : choices[0])?.id ?? ""];
    }),
  );

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("RoomPlayScene", () => {
  it.each([
    ["the starter Room", {}],
    ["a Room of the first choices", buildFullestRoom(false)],
    ["a Room of the last choices", buildFullestRoom(true)],
  ])(
    "draws %s with four walls, every piece of Furniture, the Character and their Pet within the budget",
    async (_roomName, room) => {
      const { renderer } = await renderPlay({ room });
      await renderer.advanceFrames(2, frameSeconds);

      furnitureSlots
        .filter((slot) => slot !== "wallpaper")
        .forEach((slot) => {
          expect(findNamed(renderer, `play-${slot}`), slot).toHaveLength(1);
        });
      ["floor", "walls", "room-player", "character", "room-pet"].forEach(
        (name) => {
          expect(findNamed(renderer, name).length, name).toBeGreaterThan(0);
        },
      );
      const meshes = listShownMeshes(renderer);
      const triangles = meshes.reduce(
        (total, mesh) => total + countTriangles(mesh.geometry),
        0,
      );
      expect(meshes.length).toBeLessThanOrEqual(roomPlayMeshBudget);
      expect(triangles).toBeLessThanOrEqual(roomPlayTriangleBudget);
      await renderer.unmount();
    },
  );

  it("walks the Character while the stick is pushed, but never through the walls", async () => {
    const { renderer, input } = await renderPlay();
    await renderer.advanceFrames(2, frameSeconds);
    const before = findPlayer(renderer).position.clone();

    input.current.forward = 1;
    await renderer.advanceFrames(240, frameSeconds);

    const after = findPlayer(renderer).position;
    expect(after.distanceTo(before)).toBeGreaterThan(0.5);
    expect(Math.abs(after.x)).toBeLessThan(3);
    expect(Math.abs(after.z)).toBeLessThan(2.2);
  });

  it("walks to a tapped piece of Furniture and plays with it on arrival", async () => {
    const { renderer, record } = await renderPlay();
    const [toyBox] = findNamed(renderer, "play-toyBox");

    await renderer.fireEvent(toyBox, "onClick", tap);
    await renderer.advanceFrames(240, frameSeconds);

    expect(record.reached).toContain("toyBox");
    expect(record.nearby).toContain("toyBox");
  });

  it("ignores a tap that was really a drag to look around", async () => {
    const { renderer, record } = await renderPlay();
    const [lamp] = findNamed(renderer, "play-lamp");

    await renderer.fireEvent(lamp, "onClick", { ...tap, delta: 40 });
    await renderer.advanceFrames(240, frameSeconds);

    expect(record.reached).not.toContain("lamp");
  });

  it("walks to where the floor is tapped", async () => {
    const { renderer } = await renderPlay();
    const [floor] = findNamed(renderer, "floor");

    await renderer.fireEvent(floor, "onClick", {
      ...tap,
      point: new Vector3(1.5, 0, 1.6),
    });
    await renderer.advanceFrames(240, frameSeconds);

    const { x, z } = findPlayer(renderer).position;
    expect(Math.hypot(x - 1.5, z - 1.6)).toBeLessThan(0.4);
  });

  it("knocks on the wall straight away when a wall is tapped", async () => {
    const { renderer, record } = await renderPlay();
    const [walls] = findNamed(renderer, "walls");

    await renderer.fireEvent(walls, "onClick", tap);

    expect(record.reached).toEqual(["wallpaper"]);
  });

  it("lies the Character down on the bed, and asks to get up when the Child walks", async () => {
    const { renderer, input, record, changeState } = await renderPlay();
    await changeState({ ...startingRoomPlayState, pose: "lying" });
    await renderer.advanceFrames(2, frameSeconds);

    const player = findPlayer(renderer);
    expect(player.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(player.position.y).toBeGreaterThan(0.4);
    expect(player.position.x).toBeCloseTo(-1.85);

    input.current.forward = 1;
    await renderer.advanceFrames(3, frameSeconds);
    expect(record.gotUp).toBe(1);
  });

  it("sits the Character on the seat", async () => {
    const { renderer, changeState } = await renderPlay();
    await changeState({ ...startingRoomPlayState, pose: "sitting" });
    await renderer.advanceFrames(2, frameSeconds);

    const player = findPlayer(renderer);
    expect(player.rotation.y).toBeCloseTo(-Math.PI / 2);
    expect(player.position.x).toBeGreaterThan(2);
  });

  it("walks to the Pet when it is tapped, then holds it, and strokes it when it is tapped again", async () => {
    const { renderer, record, changeState } = await renderPlay();
    const [pet] = findNamed(renderer, "room-pet");

    await renderer.fireEvent(pet, "onClick", tap);
    await renderer.advanceFrames(60, frameSeconds);
    expect(record.reached).toContain("pet");

    await changeState({ ...startingRoomPlayState, isPetHeld: true });
    await renderer.advanceFrames(2, frameSeconds);
    const [heldPet] = findNamed(renderer, "held-pet");
    expect(heldPet.instance.visible).toBe(true);
    expect(findNamed(renderer, "room-pet")[0].instance.visible).toBe(false);
    expect(record.nearby.at(-1)).toBe("pet");

    await renderer.fireEvent(heldPet, "onClick", tap);
    expect(record.strokes).toBe(1);
  });

  it("strokes the held Pet once the Child has rubbed it far enough, and not again straight away", async () => {
    const { renderer, record } = await renderPlay({
      playState: { ...startingRoomPlayState, isPetHeld: true },
    });
    const [heldPet] = findNamed(renderer, "held-pet");
    const rub = async () => {
      await renderer.fireEvent(heldPet, "onPointerMove", {
        buttons: 1,
        nativeEvent: { movementX: 30, movementY: 40 },
      });
    };

    await rub();
    expect(record.strokes).toBe(0);
    await rub();
    expect(record.strokes).toBe(1);
    await rub();
    await rub();
    expect(record.strokes).toBe(1);
    await renderer.advanceFrames(40, frameSeconds);
    await rub();
    expect(record.strokes).toBe(2);
  });

  it("hides the Character in first person but keeps a held Pet in sight", async () => {
    const { renderer, changeState } = await renderPlay({
      cameraView: "first-person",
    });
    await renderer.advanceFrames(2, frameSeconds);
    const [model] = findNamed(renderer, "room-player-model");
    expect(model.instance.visible).toBe(false);

    await changeState({ ...startingRoomPlayState, isPetHeld: true });
    await renderer.advanceFrames(2, frameSeconds);
    expect(findNamed(renderer, "held-pet")[0].instance.visible).toBe(true);

    await changeState({ ...startingRoomPlayState, pose: "lying" });
    await renderer.advanceFrames(2, frameSeconds);
    expect(model.instance.visible).toBe(true);
  });

  it("turns the Character with left and right in first person instead of stepping sideways", async () => {
    const { renderer, input } = await renderPlay({
      cameraView: "first-person",
    });
    await renderer.advanceFrames(2, frameSeconds);
    const before = findPlayer(renderer).position.clone();

    input.current.right = 1;
    await renderer.advanceFrames(30, frameSeconds);

    expect(findPlayer(renderer).position.distanceTo(before)).toBeLessThan(0.01);
  });

  it.each<[RoomCameraView, number]>([
    ["behind", 1],
    ["birds-eye", 2.5],
    ["wide", 2.5],
  ])(
    "keeps the %s camera inside the Room, at least %d high, and showing the Character",
    async (cameraView, lowestHeight) => {
      const { renderer, findCamera } = await renderPlay({ cameraView });
      await renderer.advanceFrames(120, frameSeconds);

      const { x, y, z } = findCamera().position;
      expect(y).toBeGreaterThan(lowestHeight);
      expect(y).toBeLessThan(3.2);
      expect(Math.abs(x)).toBeLessThan(3.2);
      expect(Math.abs(z)).toBeLessThan(2.2);
      const [model] = findNamed(renderer, "room-player-model");
      expect(model.instance.visible).toBe(true);
    },
  );

  it("shows the whole Room from straight above in the Map view, without its ceiling, and marks the Character", async () => {
    const { renderer, findCamera } = await renderPlay({ cameraView: "map" });
    await renderer.advanceFrames(240, frameSeconds);

    const camera = findCamera().position;
    expect(camera.y).toBeGreaterThan(3.2);
    expect(Math.abs(camera.x)).toBeLessThan(0.05);
    expect(Math.abs(camera.z)).toBeLessThan(0.05);
    expect(findNamed(renderer, "ceiling")[0].instance.visible).toBe(false);
    const [marker] = findNamed(renderer, "map-marker");
    expect(marker.instance.visible).toBe(true);
    const player = findPlayer(renderer).position;
    expect(marker.instance.position.x).toBeCloseTo(player.x);
    expect(marker.instance.position.z).toBeCloseTo(player.z);
  });

  it("walks up the screen, towards the back wall, when the stick is pushed up in the Map view", async () => {
    const { renderer, input } = await renderPlay({ cameraView: "map" });
    await renderer.advanceFrames(2, frameSeconds);
    const before = findPlayer(renderer).position.clone();

    input.current.forward = 1;
    await renderer.advanceFrames(20, frameSeconds);

    const after = findPlayer(renderer).position;
    expect(after.z).toBeLessThan(before.z - 0.1);
    expect(Math.abs(after.x - before.x)).toBeLessThan(0.05);
  });

  it("raises the Map camera high enough to fit the Room on a tall, narrow phone screen", () => {
    expect(findMapCameraHeight(0.45)).toBeGreaterThan(findMapCameraHeight(1.6));
  });

  it("keeps the ceiling on in every other view", async () => {
    const { renderer } = await renderPlay({ cameraView: "wide" });
    await renderer.advanceFrames(2, frameSeconds);

    expect(findNamed(renderer, "ceiling")[0].instance.visible).toBe(true);
    expect(findNamed(renderer, "map-marker")[0].instance.visible).toBe(false);
  });

  it("puts the camera at the Character's eyes in first person", async () => {
    const { renderer, findCamera } = await renderPlay({
      cameraView: "first-person",
    });
    await renderer.advanceFrames(2, frameSeconds);

    const player = findPlayer(renderer).position;
    const camera = findCamera().position;
    expect(camera.x).toBeCloseTo(player.x);
    expect(camera.z).toBeCloseTo(player.z);
    expect(camera.y).toBeGreaterThan(1);
  });

  it("looks down from above in bird's eye and from further back when wide", () => {
    const behind = findRoomViewAim("behind", 0.45, false);
    const birdsEye = findRoomViewAim("birds-eye", 0.45, false);
    const wide = findRoomViewAim("wide", 0.45, false);

    expect(birdsEye.pitch).toBeGreaterThan(behind.pitch);
    expect(wide.distance).toBeGreaterThan(behind.distance);
    expect(findRoomViewAim("behind", 0.45, true).pitch).toBeGreaterThan(0.45);
  });

  it("leaves the Pet out when the Character has none", async () => {
    const { renderer } = await renderPlay({ loadout: {} });

    expect(findNamed(renderer, "room-pet")).toHaveLength(0);
    expect(findNamed(renderer, "held-pet")).toHaveLength(0);
  });

  it("lights the lamp only while it is on", async () => {
    const { renderer, changeState } = await renderPlay();
    expect(findNamed(renderer, "lamp-glow")).toHaveLength(1);

    await changeState({ ...startingRoomPlayState, isLampOn: false });
    expect(findNamed(renderer, "lamp-glow")).toHaveLength(0);
  });
});
