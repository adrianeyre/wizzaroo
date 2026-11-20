import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  EdgesGeometry,
  NearestFilter,
  Object3D,
  SphereGeometry,
  SRGBColorSpace,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type MeshPhysicalMaterial,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  isTenStep,
  type OneMoreOneLessQuestion,
} from "../curriculum/one-more-one-less.js";
import { isPolygonName } from "../curriculum/polygons.js";
import { isShape3d, type Shape3d } from "../curriculum/shapes-3d.js";
import type { QuestionGameType } from "../curriculum/world-map.js";
import type { QuestionPrompt } from "./mission/mission.js";
import { PlaceValueFrames, PlaceValueSchool } from "./bay-place-value.js";
import {
  CoralColumn,
  FractionTile,
  MeasuredCoral,
  ShipClock,
  SteppingStones,
} from "./bay-measure-scenes.js";
import { CrabTakeAway, ShellSums } from "./bay-sums-scenes.js";
import {
  CountersDifference,
  CountersMoreOrLess,
  CountersNumber,
  CountersSum,
} from "./bay-counters.js";
import { MeasureBlock } from "./bay-block-measures.js";
import { ChartTowerScene } from "./bay-chart-tower.js";
import { FairShareScene, PairTray } from "./bay-fair-shares.js";
import { TreasureMapScene } from "./bay-treasure-map.js";
import { PolygonTile, ShapeNet } from "./bay-shape-scenes.js";
import { Thermometer } from "./bay-thermometer.js";
import {
  BayStage,
  SeaGlassToken,
  bayPalette,
  findGrowth,
  promptGrowSeconds,
  useFaceTexture,
  useGrowingChoice,
  usePromptGrowth,
  usePromptPosition,
  type ChoiceSlot,
} from "./bay-stage.js";
import {
  BubbleBurst,
  useChoicePositions,
  useChoiceRadius,
  useDisposedOnUnmount,
  type CompanionMood,
} from "./studio-stage.js";

export const bayGameTypes = [
  "fish-count",
  "ten-frames",
  "shape-hunt",
  "letter-match",
  "shell-sums",
  "crab-take-away",
  "skip-count",
  "coral-heights",
  "fraction-find",
  "ship-clock",
  "fair-shares",
  "treasure-map",
  "chart-tower",
] as const satisfies readonly QuestionGameType[];

export type BayGameType = (typeof bayGameTypes)[number];

export const isBayGameType = (
  gameType: QuestionGameType,
): gameType is BayGameType =>
  bayGameTypes.some((bayGameType) => bayGameType === gameType);

export interface BayGameWorldProps {
  gameType: BayGameType;
  prompt: QuestionPrompt | undefined;
  choices: readonly string[];
  hiddenChoiceIndexes: readonly number[];
  companionMood: CompanionMood;
  poppedChoiceIndex: number | undefined;
  popCount: number;
  isEffectsOn: boolean;
}

export const fishPerRow = 5;
const fishRowsPerTen = 2;
const largestFishSchool = 20;
const largestRodNumber = 99;

const isCountedWithCounters = (numbers: readonly number[]) =>
  numbers.some(
    (number) => number > largestRodNumber || !Number.isInteger(number),
  );
const fishSpacing = { x: 0.62, y: 0.38, betweenTens: 0.16 };
const fishAppearStaggerSeconds = 0.05;
const counterSpacing = 0.38;
const countersPerFrame = 10;
const frameGap = 0.2;

const ringStripeCount = 8;

const buildRingStripes = (): DataTexture => {
  const colours = [bayPalette.ringRed, bayPalette.ringWhite].map(
    (hex) => new Color(hex),
  );
  const texels = new Uint8Array(ringStripeCount * 4);
  for (let stripe = 0; stripe < ringStripeCount; stripe++) {
    const colour = colours[stripe % 2];
    texels.set(
      [colour.r * 255, colour.g * 255, colour.b * 255, 255].map(Math.round),
      stripe * 4,
    );
  }
  const stripes = new DataTexture(texels, ringStripeCount, 1);
  stripes.magFilter = NearestFilter;
  stripes.minFilter = NearestFilter;
  stripes.colorSpace = SRGBColorSpace;
  stripes.needsUpdate = true;
  return stripes;
};

const LifeRing = (slot: ChoiceSlot) => {
  const { choice, age, motionScale } = useGrowingChoice(slot);
  const ring = useRef<Group>(null);
  const stripes = useMemo(() => buildRingStripes(), []);
  useDisposedOnUnmount(stripes);

  useFrame(() => {
    if (ring.current !== null) {
      ring.current.rotation.z =
        Math.sin(age.current * 0.9 + slot.index) * 0.12 * motionScale;
    }
  });

  return (
    <group ref={choice} position={slot.position} name="life-ring">
      <group ref={ring}>
        <mesh>
          <torusGeometry
            args={[slot.radius * 0.76, slot.radius * 0.2, 10, 32]}
          />
          <meshPhysicalMaterial
            map={stripes}
            roughness={0.32}
            clearcoat={0.8}
            clearcoatRoughness={0.18}
          />
        </mesh>
      </group>
    </group>
  );
};

const buildShapeGeometry = (shape: Shape3d, radius: number): BufferGeometry => {
  switch (shape) {
    case "cube":
      return new BoxGeometry(radius * 1.15, radius * 1.15, radius * 1.15);
    case "cuboid":
      return new BoxGeometry(radius * 1.7, radius * 0.9, radius * 0.9);
    case "pyramid":
      return new ConeGeometry(radius * 0.95, radius * 1.45, 4, 1).rotateY(
        Math.PI / 4,
      );
    case "sphere":
      return new SphereGeometry(radius * 0.82, 24, 16);
    case "cylinder":
      return new CylinderGeometry(
        radius * 0.62,
        radius * 0.62,
        radius * 1.4,
        32,
      );
    case "cone":
      return new ConeGeometry(radius * 0.78, radius * 1.5, 32);
  }
};

const isFlatFaced = (shape: Shape3d) =>
  shape === "cube" || shape === "cuboid" || shape === "pyramid";

const ShapeOnPlinth = ({ shape, ...slot }: ChoiceSlot & { shape: Shape3d }) => {
  const { choice, age, motionScale } = useGrowingChoice(slot);
  const spinner = useRef<Group>(null);
  const geometry = useMemo(
    () => buildShapeGeometry(shape, slot.radius),
    [shape, slot.radius],
  );
  const edges = useMemo(() => new EdgesGeometry(geometry, 25), [geometry]);
  useDisposedOnUnmount(geometry);
  useDisposedOnUnmount(edges);

  useFrame(() => {
    if (spinner.current !== null) {
      spinner.current.rotation.y =
        0.5 + age.current * 0.55 * motionScale + slot.index;
    }
  });

  return (
    <group ref={choice} position={slot.position} name={`shape-${shape}`}>
      <group ref={spinner} rotation={[0.32, 0, 0]}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            color={bayPalette.shapes[slot.index % bayPalette.shapes.length]}
            roughness={0.22}
            clearcoat={1}
            clearcoatRoughness={0.08}
            flatShading={isFlatFaced(shape)}
          />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial
            color={bayPalette.shapeEdge}
            transparent
            opacity={0.55}
          />
        </lineSegments>
      </group>
      <mesh position={[0, -slot.radius * 1.02, 0]}>
        <cylinderGeometry
          args={[slot.radius * 0.78, slot.radius * 0.9, slot.radius * 0.14, 32]}
        />
        <meshPhysicalMaterial
          color={bayPalette.plinth}
          roughness={0.2}
          clearcoat={1}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0, -slot.radius * 0.95, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[slot.radius * 0.8, slot.radius * 0.025, 4, 32]} />
        <meshBasicMaterial color={bayPalette.plinthGlow} toneMapped={false} />
      </mesh>
    </group>
  );
};

export const listFishSpots = (count: number): [number, number][] => {
  const shownCount = Math.min(count, largestFishSchool);
  const rowCount = Math.ceil(shownCount / fishPerRow);
  const tensGap = rowCount > fishRowsPerTen ? fishSpacing.betweenTens : 0;
  const height = (rowCount - 1) * fishSpacing.y + tensGap;
  return Array.from({ length: shownCount }, (_, index) => {
    const row = Math.floor(index / fishPerRow);
    const column = index % fishPerRow;
    const gapAbove = row >= fishRowsPerTen ? fishSpacing.betweenTens : 0;
    return [
      (column - (fishPerRow - 1) / 2) * fishSpacing.x,
      height / 2 - row * fishSpacing.y - gapAbove,
    ];
  });
};

type FishPart = "body" | "tail" | "eye";

const FishSchool = ({ count }: { count: number }) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const spots = useMemo(() => listFishSpots(count), [count]);
  const placer = useMemo(() => new Object3D(), []);
  const body = useRef<InstancedMesh>(null);
  const tail = useRef<InstancedMesh>(null);
  const eye = useRef<InstancedMesh>(null);

  useEffect(() => {
    const fishBodies = body.current;
    const fishTails = tail.current;
    spots.forEach((_spot, index) => {
      const colour = new Color(
        bayPalette.fishGroups[
          Math.floor(index / fishPerRow) % bayPalette.fishGroups.length
        ],
      );
      fishBodies?.setColorAt(index, colour);
      fishTails?.setColorAt(index, colour);
    });
    for (const mesh of [fishBodies, fishTails]) {
      if (mesh?.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }, [spots]);

  useFrame(() => {
    const time = age.current * motionScale;
    const parts: Record<FishPart, InstancedMesh | null> = {
      body: body.current,
      tail: tail.current,
      eye: eye.current,
    };
    spots.forEach(([x, y], index) => {
      const growth = findGrowth(
        age.current - index * fishAppearStaggerSeconds,
        promptGrowSeconds,
        motionScale,
      );
      const swimX = x + Math.sin(time * 1.2 + index * 0.7) * 0.04;
      const swimY = y + Math.sin(time * 1.7 + index) * 0.03;
      const wag = Math.sin(time * 9 + index) * 0.45;
      const place = (
        part: FishPart,
        offset: [number, number, number],
        scale: [number, number, number],
        rotation: [number, number, number],
      ) => {
        placer.position.set(
          swimX + offset[0] * growth,
          swimY + offset[1] * growth,
          offset[2] * growth,
        );
        placer.rotation.set(...rotation);
        placer.scale.set(
          scale[0] * growth,
          scale[1] * growth,
          scale[2] * growth,
        );
        placer.updateMatrix();
        parts[part]?.setMatrixAt(index, placer.matrix);
      };
      place("body", [0, 0, 0], [0.2, 0.13, 0.1], [0, wag * 0.12, 0]);
      place("tail", [-0.22, 0, 0], [0.12, 0.13, 0.025], [0, wag, -Math.PI / 2]);
      place("eye", [0.11, 0.035, 0.075], [0.03, 0.03, 0.018], [0, 0, 0]);
    });
    Object.values(parts).forEach((mesh) => {
      if (mesh !== null) {
        mesh.count = spots.length;
        mesh.instanceMatrix.needsUpdate = true;
      }
    });
  });

  return (
    <group position={position} name="fish-school">
      <instancedMesh
        ref={body}
        args={[undefined, undefined, largestFishSchool]}
        frustumCulled={false}
        name="fish-bodies"
      >
        <sphereGeometry args={[1, 10, 7]} />
        <meshPhysicalMaterial
          roughness={0.3}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
        />
      </instancedMesh>
      <instancedMesh
        ref={tail}
        args={[undefined, undefined, largestFishSchool]}
        frustumCulled={false}
      >
        <coneGeometry args={[1, 1, 8]} />
        <meshPhysicalMaterial roughness={0.35} clearcoat={0.6} />
      </instancedMesh>
      <instancedMesh
        ref={eye}
        args={[undefined, undefined, largestFishSchool]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 5]} />
        <meshPhysicalMaterial
          color={bayPalette.fishEye}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.02}
        />
      </instancedMesh>
    </group>
  );
};

export interface CounterLayout {
  frameCount: number;
  settledCount: number;
  changingIndex: number;
}

export const buildCounterLayout = ({
  start,
  step,
  answer,
}: OneMoreOneLessQuestion): CounterLayout => ({
  frameCount: Math.max(start, answer) > countersPerFrame ? 2 : 1,
  settledCount: step === "one-more" ? start : start - 1,
  changingIndex: step === "one-more" ? start : start - 1,
});

const findFrameCentreY = (frameIndex: number, frameCount: number) => {
  const frameHeight = 2 * counterSpacing + frameGap;
  return ((frameCount - 1) / 2 - frameIndex) * frameHeight;
};

export const findCounterSpot = (
  index: number,
  frameCount: number,
): [number, number] => {
  const frameIndex = Math.floor(index / countersPerFrame);
  const inFrame = index % countersPerFrame;
  const row = Math.floor(inFrame / fishPerRow);
  const column = inFrame % fishPerRow;
  return [
    (column - (fishPerRow - 1) / 2) * counterSpacing,
    findFrameCentreY(frameIndex, frameCount) + (0.5 - row) * counterSpacing,
  ];
};

const counterRadius = counterSpacing * 0.4;

const TenFrames = ({
  oneMoreOneLess,
}: {
  oneMoreOneLess: OneMoreOneLessQuestion;
}) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const layout = useMemo(
    () => buildCounterLayout(oneMoreOneLess),
    [oneMoreOneLess],
  );
  const frames = useRef<Group>(null);
  const wells = useRef<InstancedMesh>(null);
  const counters = useRef<InstancedMesh>(null);
  const changing = useRef<Group>(null);
  const changingMaterial = useRef<MeshPhysicalMaterial>(null);
  const placer = useMemo(() => new Object3D(), []);
  const trayGeometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        fishPerRow * counterSpacing + 0.2,
        2 * counterSpacing + 0.2,
        0.12,
        2,
        0.06,
      ),
    [],
  );
  useDisposedOnUnmount(trayGeometry);
  const wellCount = layout.frameCount * countersPerFrame;
  const isOneMore = oneMoreOneLess.step === "one-more";

  useFrame(() => {
    const growth = findGrowth(age.current, promptGrowSeconds, motionScale);
    frames.current?.scale.setScalar(growth);
    const placeDisc = (
      mesh: InstancedMesh | null,
      index: number,
      depth: number,
      tilt: number,
    ) => {
      const [x, y] = findCounterSpot(index, layout.frameCount);
      placer.position.set(x, y, depth);
      placer.rotation.set(tilt, 0, 0);
      placer.scale.setScalar(1);
      placer.updateMatrix();
      mesh?.setMatrixAt(index, placer.matrix);
    };
    for (let index = 0; index < wellCount; index++) {
      placeDisc(wells.current, index, 0.062, 0);
    }
    for (let index = 0; index < layout.settledCount; index++) {
      const landed = findGrowth(
        age.current - 0.15 - index * 0.03,
        promptGrowSeconds,
        motionScale,
      );
      placeDisc(counters.current, index, 0.1 + (1 - landed) * 0.6, Math.PI / 2);
    }
    for (const mesh of [wells.current, counters.current]) {
      if (mesh !== null) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    if (wells.current !== null) {
      wells.current.count = wellCount;
    }
    if (counters.current !== null) {
      counters.current.count = layout.settledCount;
    }
    const [x, y] = findCounterSpot(layout.changingIndex, layout.frameCount);
    const pulse = 0.5 + 0.5 * Math.sin(age.current * 4 * motionScale);
    const hover = isOneMore
      ? 0.28 - Math.min(1, age.current / 1.2) * 0.12
      : 0.36;
    changing.current?.position.set(
      x,
      y + (isOneMore ? 0 : 0.12),
      hover + pulse * 0.04 * motionScale,
    );
    if (changingMaterial.current !== null) {
      changingMaterial.current.opacity = isOneMore
        ? 0.55 + pulse * 0.35
        : 0.3 + pulse * 0.2;
      changingMaterial.current.emissiveIntensity = isOneMore
        ? 0.35 + pulse * 0.4
        : 0.1;
    }
  });

  return (
    <group position={position} name="ten-frames">
      <group ref={frames}>
        {Array.from({ length: layout.frameCount }, (_, frameIndex) => (
          <mesh
            key={frameIndex}
            geometry={trayGeometry}
            position={[0, findFrameCentreY(frameIndex, layout.frameCount), 0]}
          >
            <meshPhysicalMaterial
              color={bayPalette.frameTray}
              roughness={0.35}
              clearcoat={0.7}
              clearcoatRoughness={0.2}
            />
          </mesh>
        ))}
        <instancedMesh
          ref={wells}
          args={[undefined, undefined, 2 * countersPerFrame]}
          frustumCulled={false}
        >
          <circleGeometry args={[counterRadius * 1.08, 20]} />
          <meshStandardMaterial color={bayPalette.frameWell} roughness={0.8} />
        </instancedMesh>
        <instancedMesh
          ref={counters}
          args={[undefined, undefined, 2 * countersPerFrame]}
          frustumCulled={false}
          name="counters"
        >
          <cylinderGeometry args={[counterRadius, counterRadius, 0.07, 20]} />
          <meshPhysicalMaterial
            color={bayPalette.counter}
            roughness={0.25}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </instancedMesh>
        <group
          ref={changing}
          name={isOneMore ? "counter-added" : "counter-taken"}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[counterRadius, counterRadius, 0.07, 20]} />
            <meshPhysicalMaterial
              ref={changingMaterial}
              color={
                isOneMore ? bayPalette.changingCounter : bayPalette.counter
              }
              emissive={
                isOneMore ? bayPalette.changingCounter : bayPalette.counter
              }
              roughness={0.25}
              clearcoat={1}
              transparent
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
};

const LetterBlock = ({ smallLetter }: { smallLetter: string }) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const block = useRef<Group>(null);
  const face = useFaceTexture(smallLetter);
  const geometry = useMemo(
    () => new RoundedBoxGeometry(1.3, 1.3, 1.3, 4, 0.16),
    [],
  );
  useDisposedOnUnmount(geometry);

  useFrame(() => {
    const body = block.current;
    if (body === null) {
      return;
    }
    const time = age.current * motionScale;
    body.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    body.rotation.set(
      0.12 + Math.sin(time * 0.8) * 0.06,
      -0.35 + Math.sin(time * 0.5) * 0.3,
      Math.sin(time * 0.7) * 0.05,
    );
    body.position.y = position[1] + Math.sin(time * 1.4) * 0.08;
  });

  return (
    <group ref={block} position={position} name="letter-block">
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          key={face === undefined ? "plain" : "lettered"}
          color={face === undefined ? bayPalette.block : "#ffffff"}
          map={face ?? null}
          roughness={0.38}
          clearcoat={0.8}
          clearcoatRoughness={0.16}
        />
      </mesh>
    </group>
  );
};

const renderPromptObject = (prompt: QuestionPrompt | undefined): ReactNode => {
  switch (prompt?.kind) {
    case "count":
      return prompt.count > largestFishSchool ? (
        <PlaceValueSchool count={prompt.count} />
      ) : (
        <FishSchool count={prompt.count} />
      );
    case "one-more-one-less":
      return isTenStep(prompt.oneMoreOneLess.step) ? (
        <PlaceValueFrames oneMoreOneLess={prompt.oneMoreOneLess} />
      ) : (
        <TenFrames oneMoreOneLess={prompt.oneMoreOneLess} />
      );
    case "capital-letter":
      return <LetterBlock smallLetter={prompt.smallLetter} />;
    case "addition":
      return isCountedWithCounters([
        prompt.addition.answer,
        prompt.addition.first,
      ]) ? (
        <CountersSum addition={prompt.addition} />
      ) : (
        <ShellSums addition={prompt.addition} />
      );
    case "taking-away":
      return isCountedWithCounters([
        prompt.takingAway.start,
        prompt.takingAway.answer,
      ]) ? (
        <CountersDifference takingAway={prompt.takingAway} />
      ) : (
        <CrabTakeAway takingAway={prompt.takingAway} />
      );
    case "place-value":
      return <CountersNumber columns={prompt.columns} />;
    case "more-or-less":
      return <CountersMoreOrLess moreOrLess={prompt.moreOrLess} />;
    case "temperature":
      return <Thermometer temperature={prompt.temperature} />;
    case "net":
      return <ShapeNet shape={prompt.shape} />;
    case "block-measure":
      return <MeasureBlock block={prompt.block} />;
    case "sequence":
      return <SteppingStones sequence={prompt.sequence} />;
    case "height-measure":
      return <MeasuredCoral measure={prompt.measure} />;
    case "clock":
      return <ShipClock time={prompt.clock.time} dial={prompt.clock.dial} />;
    case "fair-share":
      return <FairShareScene picture={prompt.picture} />;
    case "treasure-map":
      return <TreasureMapScene picture={prompt.picture} />;
    case "chart":
      return <ChartTowerScene picture={prompt.picture} />;
    default:
      return null;
  }
};

const renderChoiceObject = (
  gameType: BayGameType,
  prompt: QuestionPrompt | undefined,
  choice: string,
  slot: ChoiceSlot,
): ReactNode => {
  if (gameType === "shape-hunt" && isPolygonName(choice)) {
    return <PolygonTile polygon={choice} {...slot} />;
  }
  if (gameType === "shape-hunt") {
    return isShape3d(choice) ? (
      <ShapeOnPlinth shape={choice} {...slot} />
    ) : null;
  }
  if (gameType === "letter-match") {
    return <LifeRing {...slot} />;
  }
  if (prompt?.kind === "height-extreme") {
    return <CoralColumn height={Number(choice)} {...slot} />;
  }
  if (prompt?.kind === "fair-share" && prompt.picture.kind === "pairs") {
    return <PairTray count={Number(choice)} {...slot} />;
  }
  if (prompt?.kind === "fraction") {
    return (
      <FractionTile
        picture={choice}
        outline={prompt.fraction.outline}
        {...slot}
      />
    );
  }
  return <SeaGlassToken {...slot} />;
};

export const BayGameWorld = ({
  gameType,
  prompt,
  choices,
  hiddenChoiceIndexes,
  companionMood,
  poppedChoiceIndex,
  popCount,
  isEffectsOn,
}: BayGameWorldProps) => {
  const radius = useChoiceRadius();
  const choicePositions = useChoicePositions(choices.length, gameType);
  const poppedPosition =
    poppedChoiceIndex === undefined
      ? undefined
      : choicePositions[poppedChoiceIndex];

  return (
    <>
      <BayStage companionMood={companionMood} />
      <group key={popCount}>{renderPromptObject(prompt)}</group>
      {choices.map((choice, index) =>
        hiddenChoiceIndexes.includes(index) ? null : (
          <group key={`${String(popCount)}-${choice}`}>
            {renderChoiceObject(gameType, prompt, choice, {
              position: choicePositions[index],
              radius,
              index,
            })}
          </group>
        ),
      )}
      {isEffectsOn && poppedPosition !== undefined ? (
        <BubbleBurst
          key={`burst-${String(popCount)}`}
          position={poppedPosition}
          radius={radius}
        />
      ) : null}
    </>
  );
};
