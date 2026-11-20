import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";
import {
  ball,
  ballSlice,
  box,
  cone,
  cylinder,
  Part,
  partColours,
  ring,
  shadeColour,
  StarShape,
  type Vector,
} from "./character-parts.js";

const faceColour = "#fffdf5";
const waterColour = "#4fb6e8";
const sandColour = "#f2d8a0";
const coralColours = ["#ff7f6e", "#ffb74d", "#f06292"];
const fishColours = ["#ff9a1f", "#f2c530", "#e8312e", "#3fa0ff"];
const faceRadius = 0.24;
const minutesPerHour = 60;
const hoursPerTurn = 12;

export const findClockHandTurns = (
  time: Date,
): { hour: number; minute: number } => {
  const minute = time.getMinutes() / minutesPerHour;
  return {
    hour: ((time.getHours() % hoursPerTurn) + minute) / hoursPerTurn,
    minute,
  };
};

const ClockHand = ({ turn, length }: { turn: number; length: number }) => (
  <group rotation={[0, 0, -turn * Math.PI * 2]}>
    <Part colour={partColours.ink} position={[0, length / 2, 0]}>
      {box(0.025, length, 0.01)}
    </Part>
  </group>
);

const ClockFace = ({ radius = faceRadius }: { radius?: number }) => {
  const [time] = useState(() => new Date());
  const turns = findClockHandTurns(time);
  return (
    <group name="clock-face">
      <Part colour={faceColour} rotation={[Math.PI / 2, 0, 0]}>
        {cylinder(radius, radius, 0.03, 24)}
      </Part>
      {[0, 1, 2, 3].map((quarter) => {
        const angle = (quarter / 4) * Math.PI * 2;
        return (
          <Part
            key={quarter}
            colour={partColours.ink}
            position={[
              Math.sin(angle) * radius * 0.8,
              Math.cos(angle) * radius * 0.8,
              0.02,
            ]}
          >
            {ball(0.018)}
          </Part>
        );
      })}
      <group position={[0, 0, 0.03]}>
        <ClockHand turn={turns.hour} length={radius * 0.5} />
        <ClockHand turn={turns.minute} length={radius * 0.78} />
      </group>
      <Part colour={partColours.red} position={[0, 0, 0.04]}>
        {ball(0.02)}
      </Part>
    </group>
  );
};

const Petals = ({
  colour,
  count,
  reach,
  size,
}: {
  colour: string;
  count: number;
  reach: number;
  size: number;
}) => (
  <>
    {Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2;
      return (
        <Part
          key={index}
          colour={colour}
          position={[Math.cos(angle) * reach, Math.sin(angle) * reach, -0.02]}
          scale={[1, 1, 0.3]}
        >
          {ball(size)}
        </Part>
      );
    })}
  </>
);

export const Clock = ({ model, colour }: { model: string; colour: string }) => {
  switch (model) {
    case "square":
      return (
        <>
          <Part colour={colour} position={[0, 0, -0.02]}>
            {box(0.6, 0.6, 0.05)}
          </Part>
          <ClockFace />
        </>
      );
    case "sun":
      return (
        <>
          {Array.from({ length: 10 }, (_, index) => {
            const angle = (index / 10) * Math.PI * 2;
            return (
              <Part
                key={index}
                colour={colour}
                position={[
                  Math.cos(angle) * 0.33,
                  Math.sin(angle) * 0.33,
                  -0.02,
                ]}
                rotation={[0, 0, angle - Math.PI / 2]}
                scale={[1, 1, 0.3]}
              >
                {cone(0.06, 0.14, 4)}
              </Part>
            );
          })}
          <Part
            colour={colour}
            position={[0, 0, -0.02]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {cylinder(0.28, 0.28, 0.04, 24)}
          </Part>
          <ClockFace />
        </>
      );
    case "flower":
      return (
        <>
          <Petals colour={colour} count={8} reach={0.27} size={0.1} />
          <ClockFace radius={0.22} />
        </>
      );
    case "alarm":
      return (
        <>
          <Part
            colour={colour}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, -0.03]}
          >
            {cylinder(0.28, 0.28, 0.08, 24)}
          </Part>
          {[-1, 1].flatMap((side) => [
            <Part
              key={`bell${String(side)}`}
              colour={partColours.gold}
              position={[side * 0.2, 0.28, -0.02]}
            >
              {ballSlice(0.1, 0, 0.5)}
            </Part>,
            <Part
              key={`leg${String(side)}`}
              colour={partColours.ink}
              position={[side * 0.15, -0.3, -0.02]}
              rotation={[0, 0, side * 0.4]}
            >
              {cylinder(0.015, 0.015, 0.1, 6)}
            </Part>,
          ])}
          <ClockFace />
        </>
      );
    case "star":
      return (
        <>
          <StarShape colour={colour} position={[0, 0, -0.06]} size={0.45} />
          <ClockFace radius={0.2} />
        </>
      );
    case "cat":
      return (
        <>
          <Part
            colour={colour}
            position={[0, -0.12, -0.03]}
            scale={[0.8, 1.4, 0.3]}
          >
            {ball(0.26)}
          </Part>
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.15, 0.28, -0.03]}
              scale={[1, 1, 0.3]}
            >
              {cone(0.08, 0.16, 4)}
            </Part>
          ))}
          <Part
            colour={colour}
            position={[0.08, -0.55, -0.02]}
            rotation={[0, 0, 0.3]}
          >
            {cylinder(0.025, 0.025, 0.3, 6)}
          </Part>
          <ClockFace radius={0.18} />
        </>
      );
    case "owl":
      return (
        <>
          <Part
            colour={colour}
            position={[0, -0.05, -0.04]}
            scale={[1, 1.3, 0.35]}
          >
            {ball(0.32)}
          </Part>
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={shadeColour(colour, -0.25)}
              position={[side * 0.2, 0.33, -0.03]}
              scale={[1, 1, 0.3]}
            >
              {cone(0.06, 0.14, 4)}
            </Part>
          ))}
          <ClockFace radius={0.2} />
        </>
      );
    case "cuckoo":
      return (
        <>
          <Part colour={colour} position={[0, -0.05, -0.08]}>
            {box(0.55, 0.65, 0.16)}
          </Part>
          <Part
            colour={shadeColour(colour, -0.25)}
            position={[0, 0.38, -0.08]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[1.15, 1, 0.5]}
          >
            {cone(0.45, 0.3, 4)}
          </Part>
          <Part colour={partColours.gold} position={[0, 0.2, 0.02]}>
            {ball(0.05)}
          </Part>
          <Part colour={partColours.gold} position={[0, -0.6, -0.05]}>
            {cylinder(0.01, 0.01, 0.4, 6)}
          </Part>
          <Part
            colour={partColours.gold}
            position={[0, -0.8, -0.05]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {cylinder(0.06, 0.06, 0.02, 12)}
          </Part>
          <group position={[0, -0.12, 0]}>
            <ClockFace radius={0.18} />
          </group>
        </>
      );
    case "rocket":
      return (
        <>
          <Part
            colour={colour}
            position={[0, -0.05, -0.08]}
            scale={[1, 1, 0.4]}
          >
            {cylinder(0.28, 0.28, 0.6, 20)}
          </Part>
          <Part
            colour={partColours.red}
            position={[0, 0.42, -0.08]}
            scale={[1, 1, 0.4]}
          >
            {cone(0.28, 0.35, 20)}
          </Part>
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={partColours.red}
              position={[side * 0.32, -0.3, -0.08]}
              scale={[1, 1, 0.2]}
            >
              {cone(0.1, 0.25, 3)}
            </Part>
          ))}
          <ClockFace radius={0.2} />
        </>
      );
    default:
      return (
        <>
          <Part
            colour={colour}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, -0.02]}
          >
            {cylinder(0.29, 0.29, 0.05, 28)}
          </Part>
          <ClockFace />
        </>
      );
  }
};

const Fish = ({ colour }: { colour: string }) => (
  <>
    <Part colour={colour} scale={[1.5, 1, 0.6]}>
      {ball(0.05)}
    </Part>
    <Part
      colour={colour}
      position={[-0.08, 0, 0]}
      rotation={[0, 0, Math.PI / 2]}
      scale={[1, 1, 0.3]}
    >
      {cone(0.04, 0.06, 3)}
    </Part>
  </>
);

interface FishPath {
  centre: Vector;
  reach: number;
  speed: number;
  colour: string;
}

const SwimmingFish = ({ path }: { path: FishPath }) => {
  const fish = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (fish.current === null) {
      return;
    }
    const swim = Math.sin(clock.elapsedTime * path.speed);
    fish.current.position.x = path.centre[0] + swim * path.reach;
    fish.current.rotation.y =
      Math.cos(clock.elapsedTime * path.speed) >= 0 ? 0 : Math.PI;
  });
  return (
    <group ref={fish} position={path.centre}>
      <Fish colour={path.colour} />
    </group>
  );
};

const buildFishPaths = (
  count: number,
  width: number,
  bottom: number,
  height: number,
  colours: readonly string[] = fishColours,
): FishPath[] =>
  Array.from({ length: count }, (_, index) => ({
    centre: [
      0,
      bottom + height * ((index + 1) / (count + 1)),
      0.05 - index * 0.04,
    ] satisfies Vector,
    reach: width * 0.32,
    speed: 0.8 + index * 0.35,
    colour: colours[index % colours.length],
  }));

const tankStandHeight = 0.55;

const TankStand = ({ width }: { width: number }) => (
  <>
    <Part colour={partColours.wood} position={[0, tankStandHeight / 2, 0]}>
      {box(width, tankStandHeight, 0.45)}
    </Part>
    <Part
      colour={shadeColour(partColours.wood, 0.2)}
      position={[0, tankStandHeight / 2, 0.226]}
    >
      {box(width - 0.12, tankStandHeight - 0.12, 0.01)}
    </Part>
  </>
);

const GlassTank = ({
  colour,
  width,
  height,
  water = waterColour,
  fishCount,
  fishColoursShown,
}: {
  colour: string;
  width: number;
  height: number;
  water?: string;
  fishCount: number;
  fishColoursShown?: readonly string[];
}) => (
  <group position={[0, tankStandHeight, 0]}>
    <Part colour={colour} position={[0, 0.015, 0]}>
      {box(width + 0.04, 0.03, 0.42)}
    </Part>
    <Part colour={sandColour} position={[0, 0.05, 0]}>
      {box(width - 0.02, 0.04, 0.36)}
    </Part>
    <Part colour={water} position={[0, height / 2 + 0.02, 0]} isGlassy>
      {box(width, height, 0.38)}
    </Part>
    <Part colour={colour} position={[0, height + 0.03, 0]}>
      {box(width + 0.04, 0.03, 0.42)}
    </Part>
    {buildFishPaths(fishCount, width, 0.08, height, fishColoursShown).map(
      (path) => (
        <SwimmingFish key={path.speed} path={path} />
      ),
    )}
  </group>
);

const Weed = ({ position }: { position: Vector }) => (
  <Part colour={partColours.leaf} position={position}>
    {cone(0.04, 0.3, 5)}
  </Part>
);

export const FishTank = ({
  model,
  colour,
}: {
  model: string;
  colour: string;
}) => {
  switch (model) {
    case "bowl":
      return (
        <>
          <TankStand width={0.5} />
          <group position={[0, tankStandHeight, 0]}>
            <Part colour={waterColour} position={[0, 0.2, 0]} isGlassy>
              {ball(0.2)}
            </Part>
            <Part colour={colour} position={[0, 0.36, 0]}>
              {ring(0.12, 0.012)}
            </Part>
            <SwimmingFish
              path={{
                centre: [0, 0.2, 0],
                reach: 0.08,
                speed: 1,
                colour: fishColours[0],
              }}
            />
          </group>
        </>
      );
    case "big":
      return (
        <>
          <TankStand width={1} />
          <GlassTank colour={colour} width={0.95} height={0.5} fishCount={3} />
          <Weed position={[-0.35, tankStandHeight + 0.2, -0.1]} />
          <Weed position={[0.3, tankStandHeight + 0.2, -0.12]} />
        </>
      );
    case "tall":
      return (
        <>
          <Part colour={partColours.wood} position={[0, 0.2, 0]}>
            {cylinder(0.25, 0.27, 0.4, 20)}
          </Part>
          <Part colour={waterColour} position={[0, 0.85, 0]} isGlassy>
            {cylinder(0.22, 0.22, 0.9, 20)}
          </Part>
          <Part colour={colour} position={[0, 1.31, 0]}>
            {cylinder(0.24, 0.24, 0.03, 20)}
          </Part>
          {[0.6, 0.9, 1.15].map((y, index) => (
            <SwimmingFish
              key={y}
              path={{
                centre: [0, y, 0.05],
                reach: 0.08,
                speed: 0.9 + index * 0.4,
                colour: fishColours[index],
              }}
            />
          ))}
        </>
      );
    case "tropical":
      return (
        <>
          <TankStand width={0.9} />
          <GlassTank
            colour={colour}
            width={0.85}
            height={0.42}
            fishCount={4}
            fishColoursShown={["#ffeb3b", "#ff4081", "#00e5ff", "#76ff03"]}
          />
          <Weed position={[-0.3, tankStandHeight + 0.2, -0.1]} />
        </>
      );
    case "castle":
      return (
        <>
          <TankStand width={0.9} />
          <GlassTank colour={colour} width={0.85} height={0.42} fishCount={2} />
          <group position={[0.2, tankStandHeight + 0.07, -0.05]}>
            <Part colour={partColours.steel} position={[0, 0.1, 0]}>
              {box(0.2, 0.2, 0.12)}
            </Part>
            {[-1, 1].map((side) => (
              <Part
                key={side}
                colour={partColours.red}
                position={[side * 0.1, 0.24, 0]}
              >
                {cone(0.05, 0.1, 6)}
              </Part>
            ))}
          </group>
        </>
      );
    case "turtle":
      return (
        <>
          <TankStand width={0.9} />
          <GlassTank colour={colour} width={0.85} height={0.42} fishCount={0} />
          <group position={[0, tankStandHeight + 0.1, 0]}>
            <Part
              colour={partColours.steel}
              position={[0.25, 0, -0.05]}
              scale={[1.3, 0.6, 1]}
            >
              {ball(0.12)}
            </Part>
            <Part
              colour={partColours.leaf}
              position={[-0.1, 0.05, 0]}
              scale={[1.2, 0.5, 1]}
            >
              {ball(0.1)}
            </Part>
            <Part
              colour={shadeColour(partColours.leaf, 0.3)}
              position={[0.03, 0.05, 0]}
            >
              {ball(0.04)}
            </Part>
          </group>
        </>
      );
    case "coral":
      return (
        <>
          <TankStand width={0.9} />
          <GlassTank colour={colour} width={0.85} height={0.42} fishCount={3} />
          {coralColours.map((coralColour, index) => (
            <Part
              key={coralColour}
              colour={coralColour}
              position={[-0.25 + index * 0.25, tankStandHeight + 0.15, -0.08]}
            >
              {index === 1 ? ball(0.08) : cone(0.06, 0.2, 6)}
            </Part>
          ))}
        </>
      );
    case "jellyfish":
      return (
        <>
          <TankStand width={0.9} />
          <GlassTank
            colour={colour}
            width={0.85}
            height={0.42}
            water="#283593"
            fishCount={0}
          />
          {[-0.2, 0.15].map((x, index) => (
            <group
              key={x}
              position={[x, tankStandHeight + 0.25 + index * 0.08, 0]}
            >
              <Part colour={colour} isGlassy>
                {ballSlice(0.08, 0, 0.5)}
              </Part>
              {[-0.03, 0, 0.03].map((tentacleX) => (
                <Part
                  key={tentacleX}
                  colour={colour}
                  position={[tentacleX, -0.06, 0]}
                >
                  {cylinder(0.006, 0.006, 0.12, 4)}
                </Part>
              ))}
            </group>
          ))}
        </>
      );
    case "shipwreck":
      return (
        <>
          <TankStand width={0.9} />
          <GlassTank colour={colour} width={0.85} height={0.42} fishCount={2} />
          <group
            position={[-0.1, tankStandHeight + 0.12, -0.05]}
            rotation={[0, 0, 0.25]}
          >
            <Part colour={partColours.wood}>{box(0.32, 0.1, 0.12)}</Part>
            <Part colour={partColours.wood} position={[0, 0.12, 0]}>
              {cylinder(0.012, 0.012, 0.22, 6)}
            </Part>
          </group>
          <Part
            colour={partColours.gold}
            position={[0.25, tankStandHeight + 0.1, 0]}
          >
            {box(0.1, 0.06, 0.07)}
          </Part>
        </>
      );
    default:
      return (
        <>
          <TankStand width={0.75} />
          <GlassTank colour={colour} width={0.7} height={0.38} fishCount={2} />
        </>
      );
  }
};
