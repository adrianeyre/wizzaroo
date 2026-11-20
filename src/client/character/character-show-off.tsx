import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { Group } from "three";
import type { CharacterLoadout } from "../../curriculum/catalogue.js";
import { getMotionScale } from "../reduced-motion.js";
import {
  buildCharacterLook,
  buildShowOffLook,
  type EmoteModel,
  type MountModel,
  type PartLook,
  type PetModel,
  type ShowOffLook,
  type SpellEffectModel,
} from "./character-look.js";
import { CharacterModel } from "./character-model.js";
import {
  ball,
  ballSlice,
  box,
  cone,
  cylinder,
  flat,
  mixColours,
  Part,
  partColours,
  ring,
  shadeColour,
  StarShape,
  type Vector,
} from "./character-parts.js";

export interface EmotePose {
  lift: number;
  turn: number;
  tilt: number;
  lean: number;
  stretch: number;
}

export type PetPlace = "ground" | "shoulder";

const showOffSeconds = 1.6;
const millisecondsPerSecond = 1000;
const fullTurn = Math.PI * 2;
const restingPose: EmotePose = {
  lift: 0,
  turn: 0,
  tilt: 0,
  lean: 0,
  stretch: 1,
};

const petPlaces: Record<PetPlace, { position: Vector; scale: number }> = {
  ground: { position: [0.82, 0, 0.18], scale: 1 },
  shoulder: { position: [0.6, 0.98, 0.05], scale: 0.72 },
};

const mountLifts: Record<MountModel, number> = {
  broomstick: 0.24,
  cloud: 0.32,
  dragon: 0.78,
};

const petMountGap = 0.45;
const strawColour = "#e0b04a";
const cloudColour = "#ffffff";
const glowOpacity = 0.2;
const glowRadius = 0.95;
const effectCentreHeight = 1.05;
const rainbowColours = [
  "#e8312e",
  "#ff9a1f",
  "#f2c530",
  "#3f9d5a",
  "#3fa0ff",
  "#7a3fc4",
];

const swingOf = (progress: number): number => Math.sin(Math.PI * progress);

const easeInOut = (progress: number): number =>
  progress * progress * (3 - 2 * progress);

const emoteMotions: Record<EmoteModel, (progress: number) => EmotePose> = {
  wave: (progress) => ({
    ...restingPose,
    tilt: 0.16 * Math.sin(6 * Math.PI * progress) * swingOf(progress),
  }),
  cheer: (progress) => {
    const bounce = Math.abs(Math.sin(2 * Math.PI * progress));
    return { ...restingPose, lift: 0.35 * bounce, stretch: 1 + 0.08 * bounce };
  },
  dance: (progress) => ({
    ...restingPose,
    turn: 0.5 * Math.sin(4 * Math.PI * progress),
    tilt: 0.1 * Math.sin(8 * Math.PI * progress),
    lift: 0.08 * Math.abs(Math.sin(8 * Math.PI * progress)),
  }),
  spin: (progress) => ({
    ...restingPose,
    turn: fullTurn * easeInOut(progress),
    lift: 0.12 * swingOf(progress),
  }),
  jump: (progress) => ({
    ...restingPose,
    lift: 0.6 * swingOf(progress),
    stretch: 1 + 0.1 * swingOf(progress),
  }),
  bow: (progress) => ({ ...restingPose, lean: 0.5 * swingOf(progress) }),
  wobble: (progress) => ({
    ...restingPose,
    stretch: 1 + 0.15 * Math.sin(6 * Math.PI * progress) * swingOf(progress),
  }),
  shimmy: (progress) => ({
    ...restingPose,
    tilt: 0.08 * Math.sin(16 * Math.PI * progress) * swingOf(progress),
    turn: 0.15 * Math.sin(8 * Math.PI * progress) * swingOf(progress),
  }),
  nod: (progress) => ({
    ...restingPose,
    lean: 0.18 * Math.abs(Math.sin(4 * Math.PI * progress)),
  }),
  bounce: (progress) => {
    const bounce = Math.abs(Math.sin(4 * Math.PI * progress));
    return { ...restingPose, lift: 0.25 * bounce, stretch: 1 + 0.06 * bounce };
  },
  stretch: (progress) => ({
    ...restingPose,
    lift: 0.05 * swingOf(progress),
    stretch: 1 + 0.18 * swingOf(progress),
  }),
  limbo: (progress) => ({ ...restingPose, lean: -0.45 * swingOf(progress) }),
  sway: (progress) => ({
    ...restingPose,
    tilt: 0.22 * Math.sin(2 * Math.PI * progress),
  }),
  "spin-jump": (progress) => ({
    ...restingPose,
    turn: fullTurn * easeInOut(progress),
    lift: 0.5 * swingOf(progress),
  }),
};

const hopMotion = (progress: number): EmotePose => ({
  ...restingPose,
  lift: 0.2 * swingOf(progress),
});

const stillEmotePoses: Record<EmoteModel, EmotePose> = {
  wave: { ...restingPose, tilt: 0.14 },
  cheer: { ...restingPose, lift: 0.2, stretch: 1.06 },
  dance: { ...restingPose, turn: 0.4, tilt: 0.1 },
  spin: { ...restingPose, turn: Math.PI / 2 },
  jump: { ...restingPose, lift: 0.3, stretch: 1.08 },
  bow: { ...restingPose, lean: 0.45 },
  wobble: { ...restingPose, stretch: 1.12 },
  shimmy: { ...restingPose, tilt: 0.08, turn: 0.15 },
  nod: { ...restingPose, lean: 0.18 },
  bounce: { ...restingPose, lift: 0.25, stretch: 1.06 },
  stretch: { ...restingPose, lift: 0.05, stretch: 1.18 },
  limbo: { ...restingPose, lean: -0.45 },
  sway: { ...restingPose, tilt: 0.2 },
  "spin-jump": { ...restingPose, turn: Math.PI / 2, lift: 0.5 },
};

export const findEmotePose = (
  emote: EmoteModel | undefined,
  progress: number,
): EmotePose =>
  emote === undefined ? hopMotion(progress) : emoteMotions[emote](progress);

export const findStillEmotePose = (emote: EmoteModel | undefined): EmotePose =>
  emote === undefined ? restingPose : stillEmotePoses[emote];

const applyPose = (group: Group, pose: EmotePose, baseLift: number) => {
  group.position.y = baseLift + pose.lift;
  group.rotation.set(pose.lean, pose.turn, pose.tilt);
  group.scale.set(1, pose.stretch, 1);
};

export const anticModels = [
  "wave",
  "cheer",
  "jump",
  "spin",
  "nod",
  "wobble",
  "shimmy",
  "bounce",
  "sway",
  "dance",
] as const satisfies readonly EmoteModel[];

export type AnticModel = (typeof anticModels)[number];

export interface AnticPose {
  body: EmotePose;
  freeArmRaise: number;
}

const waveArmRaise = 2.6;
const waveArmSwing = 0.35;
const waveArmRiseShare = 0.2;
const shortestAnticPauseSeconds = 2;
const longestAnticPauseSeconds = 7;
const longestAnticFrameSeconds = 0.1;

const findWaveArmRaise = (progress: number): number => {
  const raised = Math.min(progress, 1 - progress) / waveArmRiseShare;
  const envelope = easeInOut(Math.min(raised, 1));
  const swing = waveArmSwing * Math.sin(8 * Math.PI * progress);
  return envelope * (waveArmRaise + swing);
};

export const findAnticPose = (
  antic: AnticModel,
  progress: number,
): AnticPose => ({
  body: findEmotePose(antic, progress),
  freeArmRaise: antic === "wave" ? findWaveArmRaise(progress) : 0,
});

const pickAntic = (): AnticModel =>
  anticModels[Math.floor(Math.random() * anticModels.length)] ?? "wave";

const pickAnticPauseMilliseconds = (): number =>
  (shortestAnticPauseSeconds +
    Math.random() * (longestAnticPauseSeconds - shortestAnticPauseSeconds)) *
  millisecondsPerSecond;

const applyAnticPose = (figure: Group, anticPose: AnticPose) => {
  applyPose(figure, anticPose.body, 0);
  const freeArm = figure.getObjectByName("free-arm");
  if (freeArm !== undefined) {
    freeArm.rotation.z = -anticPose.freeArmRaise;
  }
};

const restingAnticPose: AnticPose = { body: restingPose, freeArmRaise: 0 };

export const FidgetingFigure = ({ children }: { children: ReactNode }) => {
  const [motionScale] = useState(getMotionScale);
  const [antic, setAntic] = useState<AnticModel>();
  const figure = useRef<Group>(null);
  const age = useRef(0);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (motionScale === 0 || antic !== undefined) {
      return;
    }
    const nextAntic = setTimeout(() => {
      age.current = 0;
      setAntic(pickAntic());
      invalidate();
    }, pickAnticPauseMilliseconds());
    return () => {
      clearTimeout(nextAntic);
    };
  }, [antic, invalidate, motionScale]);

  useFrame((_state, deltaSeconds) => {
    if (antic === undefined || figure.current === null) {
      return;
    }
    age.current += Math.min(deltaSeconds, longestAnticFrameSeconds);
    const progress = Math.min(age.current / showOffSeconds, 1);
    if (progress >= 1) {
      applyAnticPose(figure.current, restingAnticPose);
      setAntic(undefined);
    } else {
      applyAnticPose(figure.current, findAnticPose(antic, progress));
    }
    invalidate();
  });

  return <group ref={figure}>{children}</group>;
};

interface EyePlacement {
  height: number;
  depth: number;
  spacing: number;
  size: number;
}

const AnimalEyes = ({ height, depth, spacing, size }: EyePlacement) => (
  <>
    {([-1, 1] as const).map((side) => (
      <Part
        key={side}
        colour={partColours.ink}
        position={[side * spacing, height, depth]}
      >
        {ball(size)}
      </Part>
    ))}
  </>
);

const FurryAnimal = ({
  colour,
  ears,
  snout,
  tail,
}: {
  colour: string;
  ears: ReactNode;
  snout: ReactNode;
  tail: ReactNode;
}) => (
  <>
    <Part colour={colour} position={[0, 0.2, 0]} scale={[1, 0.85, 1.25]}>
      {ball(0.19)}
    </Part>
    {([-1, 1] as const).flatMap((side) =>
      [-0.12, 0.12].map((depth) => (
        <Part
          key={`${String(side)}-${String(depth)}`}
          colour={shadeColour(colour, -0.15)}
          position={[side * 0.1, 0.06, depth]}
        >
          {cylinder(0.045, 0.05, 0.12, 10)}
        </Part>
      )),
    )}
    <group position={[0, 0.44, 0.17]}>
      <Part colour={colour}>{ball(0.15)}</Part>
      <AnimalEyes height={0.03} depth={0.13} spacing={0.06} size={0.022} />
      {ears}
      {snout}
    </group>
    {tail}
  </>
);

const pandaPatchColour = "#2e2e38";
const lambFaceColour = "#3b3135";
const tortoiseSkinColour = "#9bbf6a";

const hedgehogSpines: Vector[] = [-0.1, 0, 0.1].flatMap((across) =>
  [0.08, -0.06, -0.2].map((depth): Vector => [
    across,
    0.33 - Math.abs(across) * 0.5,
    depth,
  ]),
);

const RoundEars = ({
  colour,
  size,
  spread,
}: {
  colour: string;
  size: number;
  spread: number;
}) => (
  <>
    {([-1, 1] as const).map((side) => (
      <Part
        key={side}
        colour={colour}
        position={[side * spread, 0.12, -0.02]}
        scale={[1, 1, 0.6]}
      >
        {ball(size)}
      </Part>
    ))}
  </>
);

const BirdChick = ({
  colour,
  belly,
  beak,
  bodyScale,
  isBeakFlat = false,
  crest = null,
  tail = null,
}: {
  colour: string;
  belly: string;
  beak: string;
  bodyScale: Vector;
  isBeakFlat?: boolean;
  crest?: ReactNode;
  tail?: ReactNode;
}) => (
  <>
    <Part colour={colour} position={[0, 0.22, 0]} scale={bodyScale}>
      {ball(0.17)}
    </Part>
    <Part colour={belly} position={[0, 0.2, 0.09]} scale={[0.9, 1.1, 0.5]}>
      {ball(0.13)}
    </Part>
    <group position={[0, 0.46, 0.04]}>
      <Part colour={colour}>{ball(0.12)}</Part>
      {([-1, 1] as const).map((side) => (
        <Part
          key={side}
          colour={partColours.white}
          position={[side * 0.05, 0.03, 0.09]}
        >
          {ball(0.032)}
        </Part>
      ))}
      <AnimalEyes height={0.03} depth={0.115} spacing={0.05} size={0.018} />
      <Part
        colour={beak}
        position={[0, -0.01, 0.13]}
        rotation={flat}
        scale={isBeakFlat ? [1.4, 1, 0.45] : 1}
      >
        {cone(0.03, 0.08, 8)}
      </Part>
    </group>
    {([-1, 1] as const).map((side) => (
      <group key={side}>
        <Part
          colour={shadeColour(colour, -0.15)}
          position={[side * 0.17, 0.24, 0]}
          rotation={[0, 0, side * 0.3]}
          scale={[0.3, 1, 0.7]}
        >
          {ball(0.12)}
        </Part>
        <Part
          colour={partColours.flame}
          position={[side * 0.07, 0.02, 0.06]}
          scale={[1, 0.3, 1.4]}
        >
          {ball(0.045)}
        </Part>
      </group>
    ))}
    {crest}
    {tail}
  </>
);

const PetShape = ({ pet }: { pet: PartLook<PetModel> }) => {
  const { colour } = pet;
  const darker = shadeColour(colour, -0.25);
  const lighter = shadeColour(colour, 0.45);
  const pointyEars = (
    <>
      {([-1, 1] as const).map((side) => (
        <Part
          key={side}
          colour={colour}
          position={[side * 0.08, 0.14, -0.01]}
          rotation={[0, 0, side * -0.25]}
        >
          {cone(0.05, 0.12, 8)}
        </Part>
      ))}
    </>
  );
  const nose = (
    <Part colour={partColours.ink} position={[0, -0.03, 0.15]}>
      {ball(0.022)}
    </Part>
  );
  switch (pet.model) {
    case "cat":
      return (
        <FurryAnimal
          colour={colour}
          ears={pointyEars}
          snout={nose}
          tail={
            <Part
              colour={darker}
              position={[0, 0.34, -0.26]}
              rotation={[-0.5, 0, 0]}
            >
              {cylinder(0.025, 0.03, 0.34, 8)}
            </Part>
          }
        />
      );
    case "puppy":
      return (
        <FurryAnimal
          colour={colour}
          ears={
            <>
              {([-1, 1] as const).map((side) => (
                <Part
                  key={side}
                  colour={darker}
                  position={[side * 0.14, 0.02, -0.01]}
                  scale={[0.45, 1, 0.8]}
                >
                  {ball(0.09)}
                </Part>
              ))}
            </>
          }
          snout={
            <>
              <Part colour={lighter} position={[0, -0.05, 0.11]}>
                {ball(0.07)}
              </Part>
              <Part colour={partColours.ink} position={[0, -0.02, 0.17]}>
                {ball(0.025)}
              </Part>
            </>
          }
          tail={
            <Part
              colour={darker}
              position={[0, 0.3, -0.24]}
              rotation={[-0.9, 0, 0]}
            >
              {cylinder(0.02, 0.035, 0.18, 8)}
            </Part>
          }
        />
      );
    case "bunny":
      return (
        <FurryAnimal
          colour={colour}
          ears={
            <>
              {([-1, 1] as const).map((side) => (
                <Part
                  key={side}
                  colour={colour}
                  position={[side * 0.06, 0.24, -0.02]}
                  rotation={[0, 0, side * -0.12]}
                  scale={[1, 1, 0.6]}
                >
                  {cylinder(0.035, 0.04, 0.26, 10)}
                </Part>
              ))}
            </>
          }
          snout={
            <Part colour={partColours.tongue} position={[0, -0.03, 0.15]}>
              {ball(0.02)}
            </Part>
          }
          tail={
            <Part colour={partColours.white} position={[0, 0.22, -0.25]}>
              {ball(0.06)}
            </Part>
          }
        />
      );
    case "fox":
      return (
        <FurryAnimal
          colour={colour}
          ears={pointyEars}
          snout={
            <>
              <Part
                colour={lighter}
                position={[0, -0.04, 0.17]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                {cone(0.06, 0.14, 10)}
              </Part>
              <Part colour={partColours.ink} position={[0, -0.04, 0.24]}>
                {ball(0.018)}
              </Part>
            </>
          }
          tail={
            <group position={[0, 0.24, -0.3]} rotation={[-1.1, 0, 0]}>
              <Part colour={colour} scale={[1, 1.4, 1]}>
                {ball(0.08)}
              </Part>
              <Part colour={partColours.white} position={[0, -0.12, 0]}>
                {ball(0.05)}
              </Part>
            </group>
          }
        />
      );
    case "owl":
      return (
        <>
          <Part colour={colour} position={[0, 0.26, 0]} scale={[1, 1.2, 0.95]}>
            {ball(0.2)}
          </Part>
          <Part
            colour={lighter}
            position={[0, 0.2, 0.12]}
            scale={[1, 1.1, 0.5]}
          >
            {ball(0.13)}
          </Part>
          {([-1, 1] as const).map((side) => (
            <group key={side}>
              <Part
                colour={partColours.white}
                position={[side * 0.08, 0.36, 0.15]}
              >
                {ball(0.065)}
              </Part>
              <Part
                colour={partColours.ink}
                position={[side * 0.08, 0.36, 0.2]}
              >
                {ball(0.03)}
              </Part>
              <Part
                colour={darker}
                position={[side * 0.2, 0.24, 0]}
                scale={[0.35, 1, 0.8]}
              >
                {ball(0.14)}
              </Part>
              <Part
                colour={darker}
                position={[side * 0.11, 0.5, 0.02]}
                rotation={[0, 0, side * -0.4]}
              >
                {cone(0.035, 0.1, 6)}
              </Part>
            </group>
          ))}
          <Part
            colour={partColours.flame}
            position={[0, 0.3, 0.2]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {cone(0.025, 0.06, 6)}
          </Part>
        </>
      );
    case "dragonling":
      return (
        <FurryAnimal
          colour={colour}
          ears={
            <>
              {([-1, 1] as const).map((side) => (
                <Part
                  key={side}
                  colour={partColours.gold}
                  position={[side * 0.07, 0.15, -0.04]}
                  rotation={[-0.3, 0, side * -0.2]}
                >
                  {cone(0.025, 0.1, 6)}
                </Part>
              ))}
            </>
          }
          snout={
            <Part colour={lighter} position={[0, -0.05, 0.12]}>
              {ball(0.08)}
            </Part>
          }
          tail={
            <>
              <Part
                colour={colour}
                position={[0, 0.14, -0.3]}
                rotation={[-1.9, 0, 0]}
              >
                {cone(0.06, 0.26, 8)}
              </Part>
              {([-1, 1] as const).map((side) => (
                <Part
                  key={side}
                  colour={darker}
                  position={[side * 0.17, 0.34, -0.04]}
                  rotation={[0, 0, side * -0.9]}
                  scale={[1, 1, 0.25]}
                >
                  {cone(0.1, 0.24, 3)}
                </Part>
              ))}
            </>
          }
        />
      );
    case "hamster":
      return (
        <FurryAnimal
          colour={colour}
          ears={<RoundEars colour={darker} size={0.045} spread={0.09} />}
          snout={
            <>
              {([-1, 1] as const).map((side) => (
                <Part
                  key={side}
                  colour={lighter}
                  position={[side * 0.08, -0.05, 0.08]}
                >
                  {ball(0.065)}
                </Part>
              ))}
              <Part colour={partColours.tongue} position={[0, -0.02, 0.15]}>
                {ball(0.018)}
              </Part>
            </>
          }
          tail={
            <Part colour={lighter} position={[0, 0.2, -0.24]}>
              {ball(0.035)}
            </Part>
          }
        />
      );
    case "panda":
      return (
        <FurryAnimal
          colour={colour}
          ears={
            <>
              <RoundEars colour={pandaPatchColour} size={0.055} spread={0.1} />
              {([-1, 1] as const).map((side) => (
                <Part
                  key={side}
                  colour={pandaPatchColour}
                  position={[side * 0.06, 0.03, 0.11]}
                  rotation={[0, 0, side * 0.5]}
                  scale={[0.8, 1.15, 0.5]}
                >
                  {ball(0.045)}
                </Part>
              ))}
            </>
          }
          snout={nose}
          tail={
            <Part colour={pandaPatchColour} position={[0, 0.22, -0.24]}>
              {ball(0.045)}
            </Part>
          }
        />
      );
    case "piglet":
      return (
        <FurryAnimal
          colour={colour}
          ears={
            <>
              {([-1, 1] as const).map((side) => (
                <Part
                  key={side}
                  colour={darker}
                  position={[side * 0.09, 0.13, 0.02]}
                  rotation={[0.6, 0, side * -0.3]}
                >
                  {cone(0.045, 0.1, 6)}
                </Part>
              ))}
            </>
          }
          snout={
            <>
              <Part colour={darker} position={[0, -0.03, 0.15]} rotation={flat}>
                {cylinder(0.05, 0.05, 0.05, 14)}
              </Part>
              {([-1, 1] as const).map((side) => (
                <Part
                  key={side}
                  colour={partColours.ink}
                  position={[side * 0.018, -0.03, 0.176]}
                >
                  {ball(0.012)}
                </Part>
              ))}
            </>
          }
          tail={
            <Part
              colour={darker}
              position={[0, 0.24, -0.25]}
              rotation={[0, Math.PI / 2, 0]}
            >
              {ring(0.035, 0.012, Math.PI * 1.6)}
            </Part>
          }
        />
      );
    case "lamb":
      return (
        <FurryAnimal
          colour={colour}
          ears={
            <>
              {([-1, 1] as const).map((side) => (
                <Part
                  key={side}
                  colour={lambFaceColour}
                  position={[side * 0.15, 0.03, -0.01]}
                  rotation={[0, 0, side * 0.4]}
                  scale={[1, 0.45, 0.6]}
                >
                  {ball(0.07)}
                </Part>
              ))}
              {[-0.06, 0, 0.06].map((across) => (
                <Part
                  key={across}
                  colour={colour}
                  position={[across, 0.13, 0.03]}
                >
                  {ball(0.05)}
                </Part>
              ))}
            </>
          }
          snout={
            <Part colour={lambFaceColour} position={[0, -0.05, 0.1]}>
              {ball(0.075)}
            </Part>
          }
          tail={
            <>
              {[-0.1, 0.1].map((across) => (
                <Part key={across} colour={colour} position={[across, 0.32, 0]}>
                  {ball(0.1)}
                </Part>
              ))}
              <Part colour={colour} position={[0, 0.24, -0.26]}>
                {ball(0.05)}
              </Part>
            </>
          }
        />
      );
    case "mouse":
      return (
        <FurryAnimal
          colour={colour}
          ears={
            <>
              {([-1, 1] as const).map((side) => (
                <group key={side} position={[side * 0.11, 0.12, -0.02]}>
                  <Part colour={colour} scale={[1, 1, 0.3]}>
                    {ball(0.075)}
                  </Part>
                  <Part
                    colour={partColours.tongue}
                    position={[0, 0, 0.015]}
                    scale={[1, 1, 0.3]}
                  >
                    {ball(0.05)}
                  </Part>
                </group>
              ))}
            </>
          }
          snout={
            <>
              <Part colour={colour} position={[0, -0.03, 0.13]} rotation={flat}>
                {cone(0.05, 0.1, 10)}
              </Part>
              <Part colour={partColours.tongue} position={[0, -0.03, 0.19]}>
                {ball(0.018)}
              </Part>
            </>
          }
          tail={
            <Part
              colour={partColours.tongue}
              position={[0, 0.16, -0.38]}
              rotation={[-1.2, 0, 0]}
            >
              {cylinder(0.008, 0.016, 0.34, 6)}
            </Part>
          }
        />
      );
    case "bear-cub":
      return (
        <FurryAnimal
          colour={colour}
          ears={<RoundEars colour={colour} size={0.055} spread={0.1} />}
          snout={
            <>
              <Part colour={lighter} position={[0, -0.04, 0.11]}>
                {ball(0.07)}
              </Part>
              <Part colour={partColours.ink} position={[0, -0.01, 0.17]}>
                {ball(0.024)}
              </Part>
            </>
          }
          tail={
            <Part colour={darker} position={[0, 0.22, -0.24]}>
              {ball(0.04)}
            </Part>
          }
        />
      );
    case "hedgehog":
      return (
        <FurryAnimal
          colour={lighter}
          ears={<RoundEars colour={lighter} size={0.035} spread={0.09} />}
          snout={
            <>
              <Part
                colour={lighter}
                position={[0, -0.03, 0.14]}
                rotation={flat}
              >
                {cone(0.05, 0.1, 10)}
              </Part>
              <Part colour={partColours.ink} position={[0, -0.03, 0.2]}>
                {ball(0.02)}
              </Part>
            </>
          }
          tail={
            <>
              {hedgehogSpines.map(([across, height, depth]) => (
                <Part
                  key={`${String(across)}-${String(height)}-${String(depth)}`}
                  colour={darker}
                  position={[across, height, depth]}
                  rotation={[-0.9 + depth * 2, 0, -across * 4]}
                >
                  {cone(0.035, 0.14, 5)}
                </Part>
              ))}
            </>
          }
        />
      );
    case "unicorn":
      return (
        <FurryAnimal
          colour={colour}
          ears={
            <>
              {pointyEars}
              <Part
                colour={partColours.gold}
                position={[0, 0.2, 0.06]}
                rotation={[0.35, 0, 0]}
              >
                {cone(0.025, 0.16, 8)}
              </Part>
              {rainbowColours.slice(0, 4).map((maneColour, index) => (
                <Part
                  key={maneColour}
                  colour={maneColour}
                  position={[0, 0.12 - index * 0.06, -0.12 - index * 0.02]}
                >
                  {ball(0.04)}
                </Part>
              ))}
            </>
          }
          snout={
            <>
              <Part colour={lighter} position={[0, -0.05, 0.11]}>
                {ball(0.07)}
              </Part>
              <Part colour={partColours.tongue} position={[0, -0.04, 0.175]}>
                {ball(0.015)}
              </Part>
            </>
          }
          tail={
            <group position={[0, 0.24, -0.27]} rotation={[-1, 0, 0]}>
              {rainbowColours.map((tailColour, index) => (
                <Part
                  key={tailColour}
                  colour={tailColour}
                  position={[(index - 2.5) * 0.02, -index * 0.03, 0]}
                >
                  {ball(0.035)}
                </Part>
              ))}
            </group>
          }
        />
      );
    case "penguin":
      return (
        <BirdChick
          colour={colour}
          belly={partColours.white}
          beak={partColours.flame}
          bodyScale={[1, 1.35, 0.95]}
        />
      );
    case "duckling":
      return (
        <BirdChick
          colour={colour}
          belly={lighter}
          beak={partColours.flame}
          bodyScale={[1, 0.95, 1.15]}
          isBeakFlat
        />
      );
    case "phoenix-chick":
      return (
        <BirdChick
          colour={colour}
          belly={partColours.gold}
          beak={partColours.gold}
          bodyScale={[1, 1.05, 1]}
          crest={
            <>
              {[-1, 0, 1].map((side) => (
                <Part
                  key={side}
                  colour={side === 0 ? partColours.gold : partColours.red}
                  position={[side * 0.04, 0.6, -0.02]}
                  rotation={[-0.3, 0, side * -0.4]}
                >
                  {cone(0.03, 0.14, 6)}
                </Part>
              ))}
            </>
          }
          tail={
            <>
              {[-1, 0, 1].map((side) => (
                <Part
                  key={side}
                  colour={side === 0 ? partColours.red : partColours.gold}
                  position={[side * 0.06, 0.2, -0.22]}
                  rotation={[-2, 0, side * 0.4]}
                >
                  {cone(0.04, 0.24, 6)}
                </Part>
              ))}
            </>
          }
        />
      );
    case "frog":
      return (
        <>
          <Part colour={colour} position={[0, 0.14, 0]} scale={[1.2, 0.75, 1]}>
            {ball(0.17)}
          </Part>
          <Part
            colour={lighter}
            position={[0, 0.11, 0.1]}
            scale={[1, 0.7, 0.6]}
          >
            {ball(0.12)}
          </Part>
          {([-1, 1] as const).map((side) => (
            <group key={side}>
              <Part colour={colour} position={[side * 0.08, 0.27, 0.06]}>
                {ball(0.06)}
              </Part>
              <Part
                colour={partColours.white}
                position={[side * 0.08, 0.29, 0.1]}
              >
                {ball(0.035)}
              </Part>
              <Part
                colour={partColours.ink}
                position={[side * 0.08, 0.29, 0.13]}
              >
                {ball(0.018)}
              </Part>
              <Part
                colour={darker}
                position={[side * 0.17, 0.05, -0.04]}
                scale={[0.7, 0.5, 1.3]}
              >
                {ball(0.08)}
              </Part>
              <Part
                colour={darker}
                position={[side * 0.1, 0.03, 0.13]}
                scale={[1, 0.4, 1.2]}
              >
                {ball(0.04)}
              </Part>
            </group>
          ))}
          <Part
            colour={partColours.mouth}
            position={[0, 0.17, 0.178]}
            rotation={[0, 0, Math.PI]}
          >
            {ring(0.06, 0.008, Math.PI)}
          </Part>
        </>
      );
    case "tortoise":
      return (
        <>
          <Part colour={colour} position={[0, 0.13, 0]} scale={[1, 0.65, 1.2]}>
            {ballSlice(0.22, 0, 0.5)}
          </Part>
          <Part
            colour={darker}
            position={[0, 0.13, 0]}
            rotation={flat}
            scale={[1, 1.2, 1]}
          >
            {cylinder(0.22, 0.22, 0.03, 20)}
          </Part>
          {[-0.08, 0.08].flatMap((across) =>
            [-0.08, 0.08].map((depth) => (
              <Part
                key={`${String(across)}-${String(depth)}`}
                colour={darker}
                position={[across, 0.25, depth]}
                scale={[1, 0.3, 1]}
              >
                {ball(0.05)}
              </Part>
            )),
          )}
          {([-1, 1] as const).flatMap((side) =>
            [-0.14, 0.14].map((depth) => (
              <Part
                key={`${String(side)}-${String(depth)}`}
                colour={tortoiseSkinColour}
                position={[side * 0.15, 0.05, depth]}
              >
                {cylinder(0.04, 0.045, 0.1, 8)}
              </Part>
            )),
          )}
          <group position={[0, 0.16, 0.3]}>
            <Part colour={tortoiseSkinColour}>{ball(0.09)}</Part>
            <AnimalEyes
              height={0.03}
              depth={0.07}
              spacing={0.045}
              size={0.018}
            />
          </group>
          <Part
            colour={tortoiseSkinColour}
            position={[0, 0.1, -0.28]}
            rotation={[-1.9, 0, 0]}
          >
            {cone(0.025, 0.08, 6)}
          </Part>
        </>
      );
  }
};

export const PetFigure = ({ pet }: { pet: PartLook<PetModel> }) => (
  <group name="pet">
    <PetShape pet={pet} />
  </group>
);

const MountShape = ({ mount }: { mount: PartLook<MountModel> }) => {
  const { colour } = mount;
  switch (mount.model) {
    case "broomstick":
      return (
        <group position={[0, 0.17, 0]}>
          <Part colour={colour} rotation={[0, 0, Math.PI / 2]}>
            {cylinder(0.04, 0.04, 1.5, 10)}
          </Part>
          <Part
            colour={strawColour}
            position={[-0.88, 0, 0]}
            rotation={[0, 0, -Math.PI / 2]}
          >
            {cone(0.17, 0.42, 12)}
          </Part>
          <Part
            colour={partColours.red}
            position={[-0.66, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            {cylinder(0.06, 0.06, 0.06, 12)}
          </Part>
        </group>
      );
    case "cloud":
      return (
        <group position={[0, 0.14, 0]}>
          {[
            [0, 0, 0, 0.3],
            [-0.32, -0.04, 0.05, 0.22],
            [0.32, -0.04, 0.05, 0.22],
            [0.12, 0.04, -0.2, 0.22],
            [-0.14, 0.02, 0.22, 0.2],
          ].map(([x, y, z, radius]) => (
            <Part
              key={`${String(x)}-${String(z)}`}
              colour={mixColours(cloudColour, colour, 0.25)}
              position={[x, y, z]}
              scale={[1, 0.55, 1]}
            >
              {ball(radius)}
            </Part>
          ))}
        </group>
      );
    case "dragon":
      return (
        <group position={[0, 0.42, -0.05]}>
          <Part colour={colour} scale={[1.7, 0.75, 0.85]}>
            {ball(0.36)}
          </Part>
          <Part
            colour={shadeColour(colour, 0.35)}
            position={[0, -0.08, 0.16]}
            scale={[1.5, 0.6, 0.5]}
          >
            {ball(0.3)}
          </Part>
          <group position={[0.72, 0.32, 0]}>
            <Part colour={colour}>{ball(0.2)}</Part>
            <Part
              colour={colour}
              position={[0.18, -0.04, 0]}
              rotation={[0, 0, -Math.PI / 2]}
            >
              {cylinder(0.08, 0.12, 0.2, 10)}
            </Part>
            <AnimalEyes height={0.07} depth={0.15} spacing={0.09} size={0.03} />
            {([-1, 1] as const).map((side) => (
              <Part
                key={side}
                colour={partColours.gold}
                position={[-0.06, 0.18, side * 0.08]}
                rotation={[side * 0.3, 0, 0.4]}
              >
                {cone(0.035, 0.16, 6)}
              </Part>
            ))}
          </group>
          <Part
            colour={colour}
            position={[-0.78, 0.04, 0]}
            rotation={[0, 0, Math.PI / 2 + 0.3]}
          >
            {cone(0.12, 0.6, 10)}
          </Part>
          {([-1, 1] as const).map((side) => (
            <group key={side}>
              <Part
                colour={shadeColour(colour, -0.2)}
                position={[0.05, 0.3, side * 0.42]}
                rotation={[side * 1.1, 0, 0]}
                scale={[1, 1, 0.2]}
              >
                {cone(0.32, 0.6, 3)}
              </Part>
              {[-0.35, 0.35].map((x) => (
                <Part
                  key={x}
                  colour={shadeColour(colour, -0.15)}
                  position={[x, -0.3, side * 0.16]}
                >
                  {cylinder(0.07, 0.08, 0.26, 10)}
                </Part>
              ))}
            </group>
          ))}
        </group>
      );
  }
};

export const MountFigure = ({ mount }: { mount: PartLook<MountModel> }) => (
  <group name="mount">
    <MountShape mount={mount} />
  </group>
);

interface Spark {
  position: Vector;
  size: number;
  colour: string;
  shape: "gem" | "star" | "bubble" | "flake";
}

const sparkCount = 12;

const scatter = (index: number, salt: number): number => {
  const wave = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return wave - Math.floor(wave);
};

const aroundCharacter = (
  angle: number,
  radius: number,
  height: number,
): Vector => [Math.cos(angle) * radius, height, Math.sin(angle) * radius];

const pickRainbowColour = (index: number): string =>
  rainbowColours[index % rainbowColours.length];

const listSparks = (
  spellEffect: PartLook<SpellEffectModel>,
  progress: number,
): Spark[] => {
  const strength = swingOf(progress);
  const { colour } = spellEffect;
  switch (spellEffect.model) {
    case "sparkles":
      return Array.from({ length: sparkCount }, (_, index) => {
        const angle = (index / sparkCount) * fullTurn + progress * fullTurn;
        return {
          position: [
            Math.cos(angle) * 0.7,
            0.3 + (index % 4) * 0.45,
            Math.sin(angle) * 0.7,
          ],
          size: 0.06 * strength * (0.7 + 0.3 * Math.sin(index + progress * 12)),
          colour: index % 3 === 0 ? partColours.white : colour,
          shape: "gem",
        };
      });
    case "star-trail":
      return Array.from({ length: 8 }, (_, index) => {
        const angle = index * 0.8 + progress * 4;
        return {
          position: [
            Math.cos(angle) * 0.62,
            Math.max(0.1, progress * 2.4 - index * 0.16),
            Math.sin(angle) * 0.62,
          ],
          size: 0.07 * strength,
          colour,
          shape: "star",
        };
      });
    case "bubbles":
      return Array.from({ length: 10 }, (_, index) => {
        const angle = index * 2.4;
        return {
          position: [
            Math.cos(angle) * (0.45 + (index % 3) * 0.15),
            ((index / 10 + progress) % 1) * 2.2,
            Math.sin(angle) * (0.45 + (index % 3) * 0.15),
          ],
          size: (0.05 + (index % 3) * 0.02) * (0.4 + 0.6 * strength),
          colour,
          shape: "bubble",
        };
      });
    case "rainbow":
      return [];
    case "fireflies":
      return Array.from({ length: 10 }, (_, index) => {
        const angle = scatter(index, 1) * fullTurn + progress * 2;
        const blink = 0.5 + 0.5 * Math.sin(index * 3 + progress * 20);
        return {
          position: aroundCharacter(
            angle,
            0.5 + scatter(index, 2) * 0.4,
            0.3 +
              scatter(index, 3) * 1.6 +
              0.15 * Math.sin(progress * 8 + index),
          ),
          size: 0.045 * strength * (0.4 + 0.6 * blink),
          colour: index % 2 === 0 ? colour : partColours.white,
          shape: "gem",
        };
      });
    case "snowfall":
      return Array.from({ length: 14 }, (_, index) => ({
        position: aroundCharacter(
          scatter(index, 1) * fullTurn + progress,
          0.35 + scatter(index, 2) * 0.5,
          2.3 - ((scatter(index, 3) + progress) % 1) * 2.3,
        ),
        size: 0.05 * strength,
        colour,
        shape: "star",
      }));
    case "confetti":
      return Array.from({ length: 16 }, (_, index) => {
        const burst = easeInOut(Math.min(progress * 2, 1));
        const fall = Math.max(progress - 0.5, 0) * 1.6;
        return {
          position: aroundCharacter(
            scatter(index, 1) * fullTurn,
            0.2 + burst * (0.4 + scatter(index, 2) * 0.5),
            1.4 + burst * scatter(index, 3) * 0.9 - fall,
          ),
          size: 0.05 * strength,
          colour: pickRainbowColour(index),
          shape: "flake",
        };
      });
    case "fizzy-spiral":
      return Array.from({ length: 12 }, (_, index) => {
        const rise = (index / 12 + progress) % 1;
        return {
          position: aroundCharacter(rise * fullTurn * 2, 0.55, rise * 2.2),
          size: 0.06 * (0.4 + 0.6 * strength),
          colour,
          shape: "bubble",
        };
      });
    case "fireworks":
      return Array.from({ length: 14 }, (_, index) => {
        const spread = easeInOut(progress) * 0.8;
        const angle = (index / 14) * fullTurn;
        const upward = Math.sin(index * 1.7);
        return {
          position: [
            Math.cos(angle) * spread * Math.cos(upward),
            2.1 + spread * upward,
            Math.sin(angle) * spread * Math.cos(upward) * 0.5,
          ],
          size: 0.06 * strength,
          colour: index % 2 === 0 ? colour : partColours.gold,
          shape: "star",
        };
      });
    case "comet-ring":
      return Array.from({ length: 9 }, (_, index) => ({
        position: aroundCharacter(
          progress * fullTurn * 2 - index * 0.18,
          0.7,
          effectCentreHeight + 0.3,
        ),
        size: 0.08 * strength * (1 - index / 10),
        colour: index === 0 ? partColours.white : colour,
        shape: "star",
      }));
    case "autumn-leaves":
      return Array.from({ length: 12 }, (_, index) => {
        const fall = (scatter(index, 3) + progress) % 1;
        return {
          position: aroundCharacter(
            scatter(index, 1) * fullTurn + fall * 3,
            0.45 + scatter(index, 2) * 0.4,
            2.2 - fall * 2.2,
          ),
          size: 0.06 * strength,
          colour: index % 3 === 0 ? partColours.gold : colour,
          shape: "flake",
        };
      });
    case "rain-shower":
      return Array.from({ length: 16 }, (_, index) => ({
        position: aroundCharacter(
          scatter(index, 1) * fullTurn,
          0.3 + scatter(index, 2) * 0.5,
          2.4 - ((scatter(index, 3) + progress * 3) % 1) * 2.4,
        ),
        size: 0.03 * (0.4 + 0.6 * strength),
        colour,
        shape: "bubble",
      }));
    case "galaxy":
      return Array.from({ length: 18 }, (_, index) => {
        const arm = index % 3;
        const along = Math.floor(index / 3) / 6;
        return {
          position: aroundCharacter(
            (arm / 3) * fullTurn + along * 2.5 + progress * fullTurn,
            0.25 + along * 0.7,
            effectCentreHeight + 0.15 * Math.sin(along * 6),
          ),
          size: 0.05 * strength * (1.2 - along),
          colour: arm === 0 ? partColours.white : colour,
          shape: "gem",
        };
      });
    case "fountain":
      return Array.from({ length: 12 }, (_, index) => {
        const flight = (index / 12 + progress) % 1;
        return {
          position: aroundCharacter(
            (index / 12) * fullTurn,
            0.2 + flight * 0.6,
            0.4 + 1.8 * swingOf(flight),
          ),
          size: 0.05 * (0.4 + 0.6 * strength),
          colour,
          shape: "bubble",
        };
      });
    case "crackle":
      return Array.from({ length: 12 }, (_, index) => {
        const jump = Math.floor(progress * 10);
        return {
          position: aroundCharacter(
            scatter(index, jump) * fullTurn,
            0.4 + scatter(index, jump + 1) * 0.4,
            0.2 + scatter(index, jump + 2) * 1.8,
          ),
          size: 0.05 * strength,
          colour: index % 3 === 0 ? partColours.white : colour,
          shape: "gem",
        };
      });
    case "halo":
      return Array.from({ length: 10 }, (_, index) => ({
        position: aroundCharacter(
          (index / 10) * fullTurn + progress * fullTurn,
          0.35,
          2.05,
        ),
        size: 0.06 * strength,
        colour,
        shape: "star",
      }));
    case "pixie-dust":
      return Array.from({ length: 16 }, (_, index) => {
        const fall = (index / 16 + progress) % 1;
        return {
          position: aroundCharacter(fall * fullTurn * 1.5, 0.6, 2.2 - fall * 2),
          size: 0.03 * strength * (1 - fall * 0.5),
          colour: index % 2 === 0 ? colour : partColours.white,
          shape: "gem",
        };
      });
    case "crystal-orbit":
      return Array.from({ length: 3 }, (_, index) => ({
        position: aroundCharacter(
          (index / 3) * fullTurn + progress * fullTurn * 1.5,
          0.75,
          effectCentreHeight + 0.4 * Math.sin(progress * fullTurn + index * 2),
        ),
        size: 0.1 * strength,
        colour,
        shape: "gem",
      }));
    case "whirlwind":
      return Array.from({ length: 16 }, (_, index) => {
        const rise = (index / 16 + progress) % 1;
        return {
          position: aroundCharacter(
            index * 1.3 + progress * fullTurn * 3,
            0.2 + rise * 0.7,
            rise * 2.3,
          ),
          size: 0.04 * strength,
          colour: index % 2 === 0 ? colour : partColours.white,
          shape: "flake",
        };
      });
  }
};

const RainbowArc = ({ progress }: { progress: number }) => {
  const reach = Math.max(easeInOut(Math.min(progress * 2, 1)), 0.01);
  return (
    <group position={[0, effectCentreHeight - 0.25, -0.2]} scale={reach}>
      {rainbowColours.map((colour, index) => (
        <Part key={colour} colour={colour}>
          {ring(1.05 - index * 0.07, 0.035, Math.PI)}
        </Part>
      ))}
    </group>
  );
};

export const SpellEffectSparks = ({
  spellEffect,
  progress,
}: {
  spellEffect: PartLook<SpellEffectModel>;
  progress: number;
}) => (
  <group name="spell-effect">
    {spellEffect.model === "rainbow" ? (
      <RainbowArc progress={progress} />
    ) : null}
    {listSparks(spellEffect, progress).map(
      ({ position, size, colour, shape }, index) => {
        if (shape === "star") {
          return (
            <StarShape
              key={index}
              colour={colour}
              position={position}
              size={size}
            />
          );
        }
        return (
          <Part
            key={index}
            colour={colour}
            position={position}
            isGlassy={shape === "bubble"}
          >
            {shape === "bubble" ? ball(size) : null}
            {shape === "gem" ? <octahedronGeometry args={[size]} /> : null}
            {shape === "flake" ? box(size * 2, size * 1.2, size * 0.3) : null}
          </Part>
        );
      },
    )}
  </group>
);

const stillProgress = 0.5;

export const SpellEffectGlow = ({
  spellEffect,
}: {
  spellEffect: PartLook<SpellEffectModel>;
}) => (
  <group name="spell-effect-glow">
    <mesh position={[0, effectCentreHeight, 0]}>
      {ball(glowRadius)}
      <meshBasicMaterial
        color={spellEffect.colour}
        transparent
        opacity={glowOpacity}
        depthWrite={false}
      />
    </mesh>
    <SpellEffectSparks spellEffect={spellEffect} progress={stillProgress} />
  </group>
);

export const findRiderLift = (showOff: ShowOffLook): number =>
  showOff.mount === undefined ? 0 : mountLifts[showOff.mount.model];

const findPetPlace = (showOff: ShowOffLook, petPlace: PetPlace) => {
  const place = petPlaces[petPlace];
  return showOff.mount?.model === "dragon" && petPlace === "ground"
    ? {
        ...place,
        position: [
          place.position[0] + petMountGap,
          place.position[1],
          place.position[2],
        ] satisfies Vector,
      }
    : place;
};

export const ShowOffFigure = ({
  showOff,
  pose,
  petPlace = "ground",
  riderRef,
  effect,
  children,
}: {
  showOff: ShowOffLook;
  pose: EmotePose;
  petPlace?: PetPlace;
  riderRef?: RefObject<Group | null>;
  effect?: ReactNode;
  children: ReactNode;
}) => {
  const lift = findRiderLift(showOff);
  const place = findPetPlace(showOff, petPlace);
  return (
    <>
      {showOff.mount === undefined ? null : (
        <MountFigure mount={showOff.mount} />
      )}
      <group
        ref={riderRef}
        position={[0, lift + pose.lift, 0]}
        rotation={[pose.lean, pose.turn, pose.tilt]}
        scale={[1, pose.stretch, 1]}
      >
        {children}
      </group>
      {effect === undefined ? null : (
        <group position={[0, lift, 0]}>{effect}</group>
      )}
      {showOff.pet === undefined ? null : (
        <group position={place.position} scale={place.scale}>
          <PetFigure pet={showOff.pet} />
        </group>
      )}
    </>
  );
};

const useShowOff = (showOffCount: number) => {
  const [motionScale] = useState(getMotionScale);
  const [shownCount, setShownCount] = useState(0);
  const invalidate = useThree((state) => state.invalidate);
  const isWaiting = showOffCount > shownCount;
  const isMoving = motionScale > 0 && isWaiting;
  const isStill = motionScale === 0 && isWaiting;

  useEffect(() => {
    if (!isStill) {
      return;
    }
    const stillPose = setTimeout(() => {
      setShownCount(showOffCount);
    }, showOffSeconds * millisecondsPerSecond);
    return () => {
      clearTimeout(stillPose);
    };
  }, [isStill, showOffCount]);

  useEffect(() => {
    if (isMoving) {
      invalidate();
    }
  }, [isMoving, invalidate, showOffCount]);

  const finishMoving = () => {
    setShownCount(showOffCount);
  };

  return { isMoving, isStill, invalidate, finishMoving };
};

const MovingSparks = ({
  spellEffect,
  progressRef,
}: {
  spellEffect: PartLook<SpellEffectModel>;
  progressRef: RefObject<number>;
}) => {
  const [progress, setProgress] = useState(0);
  useFrame(() => {
    if (progressRef.current !== progress) {
      setProgress(progressRef.current);
    }
  });
  return <SpellEffectSparks spellEffect={spellEffect} progress={progress} />;
};

export const ShowingOffCharacter = ({
  loadout,
  showOffCount,
  petPlace = "ground",
}: {
  loadout: CharacterLoadout;
  showOffCount: number;
  petPlace?: PetPlace;
}) => {
  const look = useMemo(() => buildCharacterLook(loadout), [loadout]);
  const showOff = useMemo(() => buildShowOffLook(loadout), [loadout]);
  const rider = useRef<Group>(null);
  const age = useRef(0);
  const progress = useRef(0);
  const { isMoving, isStill, invalidate, finishMoving } =
    useShowOff(showOffCount);
  const lift = findRiderLift(showOff);

  useEffect(() => {
    if (isMoving) {
      age.current = 0;
    }
  }, [isMoving, showOffCount]);

  useFrame((_state, deltaSeconds) => {
    if (!isMoving || rider.current === null) {
      return;
    }
    age.current += deltaSeconds;
    progress.current = Math.min(age.current / showOffSeconds, 1);
    applyPose(
      rider.current,
      findEmotePose(showOff.emote, progress.current),
      lift,
    );
    if (progress.current >= 1) {
      applyPose(rider.current, restingPose, lift);
      finishMoving();
    }
    invalidate();
  });

  return (
    <ShowOffFigure
      showOff={showOff}
      pose={isStill ? findStillEmotePose(showOff.emote) : restingPose}
      petPlace={petPlace}
      riderRef={rider}
      effect={
        showOff.spellEffect === undefined ? undefined : (
          <>
            {isMoving ? (
              <MovingSparks
                spellEffect={showOff.spellEffect}
                progressRef={progress}
              />
            ) : null}
            {isStill ? (
              <SpellEffectGlow spellEffect={showOff.spellEffect} />
            ) : null}
          </>
        )
      }
    >
      <CharacterModel look={look} />
    </ShowOffFigure>
  );
};
