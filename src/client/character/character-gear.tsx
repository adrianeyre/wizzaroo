import type { ReactNode } from "react";
import type {
  AccessoryModel,
  BackModel,
  CharacterLook,
  HatModel,
  WandModel,
} from "./character-look.js";
import {
  HeartShape,
  Part,
  StarShape,
  ball,
  ballSlice,
  box,
  cone,
  cylinder,
  flat,
  partColours,
  ring,
  shadeColour,
} from "./character-parts.js";

const hatsThatShowHair = new Set<HatModel>([
  "none",
  "headband",
  "bow",
  "flower-crown",
  "wreath",
  "bunny-ears",
  "goggles",
  "horns",
]);

export const isHairHiddenByHat = (hat: HatModel): boolean =>
  !hatsThatShowHair.has(hat);

const Brim = ({
  colour,
  radius,
  height = 0.3,
  sides = 14,
}: {
  colour: string;
  radius: number;
  height?: number;
  sides?: number;
}) => (
  <Part colour={colour} position={[0, height, 0]}>
    {cylinder(radius, radius, 0.035, sides)}
  </Part>
);

const Dome = ({
  colour,
  radius = 0.47,
  turnLength = 0.5,
}: {
  colour: string;
  radius?: number;
  turnLength?: number;
}) => (
  <Part colour={colour} position={[0, 0.03, 0]} rotation={[-0.45, 0, 0]}>
    {ballSlice(radius, 0, turnLength)}
  </Part>
);

const Horns = ({ colour, height }: { colour: string; height: number }) => (
  <>
    {([-1, 1] as const).map((side) => (
      <Part
        key={side}
        colour={colour}
        position={[side * 0.38, height, 0]}
        rotation={[0, 0, side * -0.7]}
      >
        {cone(0.08, 0.32, 6)}
      </Part>
    ))}
  </>
);

const drawHat = (model: HatModel, colour: string): ReactNode => {
  const dark = shadeColour(colour, -0.4);
  const light = shadeColour(colour, 0.5);
  switch (model) {
    case "none":
      return null;
    case "pointy":
      return (
        <>
          <Part
            colour={colour}
            position={[0, 0.62, -0.03]}
            rotation={[-0.1, 0, 0]}
          >
            {cone(0.4, 0.7)}
          </Part>
          <Part colour={dark} position={[0, 0.3, 0]}>
            {cylinder(0.41, 0.42, 0.07)}
          </Part>
        </>
      );
    case "cap":
      return (
        <>
          <Dome colour={colour} />
          <Part colour={dark} position={[0, 0.25, 0.4]} rotation={[0.15, 0, 0]}>
            {box(0.45, 0.03, 0.3)}
          </Part>
        </>
      );
    case "wizard":
      return (
        <>
          <Brim colour={colour} radius={0.62} />
          <Part
            colour={colour}
            position={[0, 0.75, -0.05]}
            rotation={[-0.15, 0, 0.1]}
          >
            {cone(0.38, 0.9)}
          </Part>
          <StarShape
            colour={partColours.gold}
            position={[0, 0.6, 0.3]}
            size={0.08}
          />
        </>
      );
    case "top-hat":
      return (
        <>
          <Brim colour={colour} radius={0.56} />
          <Part colour={colour} position={[0, 0.6, 0]}>
            {cylinder(0.33, 0.33, 0.6)}
          </Part>
          <Part colour={partColours.red} position={[0, 0.38, 0]}>
            {cylinder(0.335, 0.335, 0.09)}
          </Part>
        </>
      );
    case "crown":
      return (
        <>
          <Part colour={colour} position={[0, 0.42, 0]}>
            {cylinder(0.36, 0.34, 0.2, 24)}
          </Part>
          {[0, 1, 2, 3, 4].map((point) => {
            const angle = (point / 5) * Math.PI * 2;
            return (
              <Part
                key={point}
                colour={point % 2 === 0 ? partColours.red : partColours.sky}
                position={[
                  Math.sin(angle) * 0.36,
                  0.56,
                  Math.cos(angle) * 0.36,
                ]}
              >
                {ball(0.05)}
              </Part>
            );
          })}
        </>
      );
    case "wreath":
      return (
        <>
          <Part colour={colour} position={[0, 0.3, 0]} rotation={flat}>
            {ring(0.4, 0.06)}
          </Part>
          {[-0.25, 0, 0.25].map((x) => (
            <Part
              key={x}
              colour={light}
              position={[x, 0.32, 0.36]}
              scale={[1, 0.6, 0.5]}
            >
              {ball(0.07)}
            </Part>
          ))}
        </>
      );
    case "tricorn":
      return (
        <>
          <Dome colour={colour} radius={0.46} />
          <Part
            colour={colour}
            position={[0, 0.32, 0]}
            rotation={[0, Math.PI, 0]}
          >
            {cylinder(0.65, 0.6, 0.12, 3)}
          </Part>
          <Part colour={partColours.gold} position={[0, 0.39, 0.32]}>
            {ball(0.05)}
          </Part>
        </>
      );
    case "horns":
      return <Horns colour={colour} height={0.36} />;
    case "mortarboard":
      return (
        <>
          <Dome colour={dark} turnLength={0.4} />
          <Part
            colour={dark}
            position={[0, 0.47, 0]}
            rotation={[0, Math.PI / 4, 0]}
          >
            {box(0.8, 0.04, 0.8)}
          </Part>
          <Part colour={colour} position={[0.3, 0.35, 0.3]}>
            {cylinder(0.02, 0.02, 0.25, 4)}
          </Part>
          <Part colour={colour} position={[0.3, 0.2, 0.3]}>
            {ball(0.05)}
          </Part>
        </>
      );
    case "pumpkin":
      return (
        <>
          <Part colour={colour} position={[0, 0.45, 0]} scale={[1.1, 0.8, 1.1]}>
            {ball(0.45)}
          </Part>
          <Part colour={partColours.leaf} position={[0, 0.85, 0]}>
            {cylinder(0.04, 0.06, 0.15, 5)}
          </Part>
        </>
      );
    case "beanie":
      return (
        <>
          <Dome colour={colour} radius={0.47} turnLength={0.45} />
          <Part
            colour={partColours.white}
            position={[0, 0.08, 0]}
            rotation={[Math.PI / 2 - 0.45, 0, 0]}
          >
            {ring(0.43, 0.05)}
          </Part>
          <Part colour={partColours.white} position={[0, 0.5, -0.08]}>
            {ball(0.1)}
          </Part>
        </>
      );
    case "bunny-ears":
      return (
        <>
          {([-1, 1] as const).map((side) => (
            <group
              key={side}
              position={[side * 0.16, 0.6, -0.05]}
              rotation={[0, 0, side * -0.2]}
            >
              <Part colour={colour} scale={[0.35, 1, 0.2]}>
                {ball(0.25)}
              </Part>
              <Part
                colour={partColours.tongue}
                position={[0, 0, 0.03]}
                scale={[0.18, 0.7, 0.1]}
              >
                {ball(0.25)}
              </Part>
            </group>
          ))}
        </>
      );
    case "bow":
      return (
        <group position={[0.22, 0.38, 0.1]} rotation={[0, 0, -0.4]}>
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.1, 0, 0]}
              rotation={[0, 0, side * (Math.PI / 2)]}
            >
              {cone(0.08, 0.18, 4)}
            </Part>
          ))}
          <Part colour={dark}>{ball(0.05)}</Part>
        </group>
      );
    case "cowboy":
      return (
        <>
          <Part colour={colour} position={[0, 0.3, 0]} scale={[1, 1, 0.85]}>
            {cylinder(0.72, 0.72, 0.035, 32)}
          </Part>
          <Part colour={colour} position={[0, 0.5, 0]}>
            {cylinder(0.3, 0.36, 0.4, 24)}
          </Part>
          <Part colour={dark} position={[0, 0.36, 0]}>
            {cylinder(0.365, 0.365, 0.07, 24)}
          </Part>
        </>
      );
    case "chef":
      return (
        <>
          <Part colour={colour} position={[0, 0.45, 0]}>
            {cylinder(0.36, 0.36, 0.32)}
          </Part>
          <Part colour={colour} position={[0, 0.7, 0]} scale={[1, 0.7, 1]}>
            {ball(0.45)}
          </Part>
        </>
      );
    case "flower-crown":
      return (
        <>
          <Part
            colour={partColours.leaf}
            position={[0, 0.3, 0]}
            rotation={flat}
          >
            {ring(0.41, 0.03)}
          </Part>
          {[0, 1, 2, 3, 4, 5].map((flower) => {
            const angle = (flower / 6) * Math.PI * 2;
            return (
              <Part
                key={flower}
                colour={flower % 2 === 0 ? colour : partColours.gold}
                position={[
                  Math.sin(angle) * 0.41,
                  0.32,
                  Math.cos(angle) * 0.41,
                ]}
              >
                {ball(0.07)}
              </Part>
            );
          })}
        </>
      );
    case "pith-helmet":
      return (
        <>
          <Part colour={colour} position={[0, 0.2, 0]} scale={[1, 0.85, 1.1]}>
            {ballSlice(0.5, 0, 0.5)}
          </Part>
          <Brim colour={colour} radius={0.6} height={0.2} />
          <Part colour={dark} position={[0, 0.25, 0]}>
            {cylinder(0.5, 0.5, 0.06)}
          </Part>
        </>
      );
    case "headband":
      return (
        <>
          <Part
            colour={colour}
            position={[0, 0.2, 0]}
            rotation={[Math.PI / 2 - 0.15, 0, 0]}
          >
            {ring(0.43, 0.04)}
          </Part>
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.08, 0.1, -0.47]}
              rotation={[0.4, 0, side * 0.5]}
            >
              {box(0.06, 0.25, 0.03)}
            </Part>
          ))}
        </>
      );
    case "feathered-cap":
      return (
        <>
          <Part
            colour={colour}
            position={[0, 0.4, -0.02]}
            rotation={[-0.2, 0, 0.15]}
            scale={[1, 0.6, 1.2]}
          >
            {cone(0.46, 0.5, 20)}
          </Part>
          <Part
            colour={partColours.red}
            position={[0.3, 0.5, -0.1]}
            rotation={[0, 0, -0.6]}
            scale={[0.3, 1, 0.3]}
          >
            {ball(0.22)}
          </Part>
        </>
      );
    case "propeller-cap":
      return (
        <>
          <Dome colour={colour} />
          <Part colour={partColours.red} position={[0, 0.5, 0]}>
            {cylinder(0.02, 0.02, 0.15, 4)}
          </Part>
          <Part
            colour={partColours.sky}
            position={[0, 0.58, 0]}
            rotation={[0, 0.5, 0]}
          >
            {box(0.6, 0.02, 0.08)}
          </Part>
        </>
      );
    case "knight-helmet":
      return (
        <>
          <Dome colour={colour} radius={0.48} turnLength={0.5} />
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.42, -0.08, 0.12]}
            >
              {box(0.06, 0.3, 0.22)}
            </Part>
          ))}
          <Part colour={colour} position={[0, 0.1, 0.45]}>
            {box(0.05, 0.2, 0.04)}
          </Part>
          <Part
            colour={partColours.red}
            position={[0, 0.55, -0.1]}
            rotation={[-0.5, 0, 0]}
            scale={[0.4, 1, 1]}
          >
            {ball(0.18)}
          </Part>
        </>
      );
    case "viking-helmet":
      return (
        <>
          <Dome colour={colour} radius={0.47} turnLength={0.5} />
          <Part colour={dark} position={[0, 0.17, 0]}>
            {cylinder(0.465, 0.465, 0.07)}
          </Part>
          <Horns colour="#f2e2c4" height={0.38} />
        </>
      );
    case "goggles":
      return (
        <>
          <Part
            colour={partColours.ink}
            position={[0, 0.26, 0]}
            rotation={[Math.PI / 2 - 0.25, 0, 0]}
          >
            {ring(0.43, 0.03)}
          </Part>
          {([-1, 1] as const).map((side) => (
            <group
              key={side}
              position={[side * 0.14, 0.32, 0.36]}
              rotation={[Math.PI / 2 - 0.5, 0, 0]}
            >
              <Part colour={colour}>{cylinder(0.1, 0.1, 0.08)}</Part>
              <Part colour={partColours.sky} position={[0, 0.045, 0]}>
                {cylinder(0.075, 0.075, 0.01)}
              </Part>
            </group>
          ))}
        </>
      );
    case "space-helmet":
      return (
        <>
          <Part colour={partColours.sky} isGlassy>
            {ball(0.6)}
          </Part>
          <Part colour={colour} position={[0, -0.5, 0]} rotation={flat}>
            {ring(0.4, 0.08)}
          </Part>
        </>
      );
    case "beret":
      return (
        <group position={[0.06, 0.3, -0.02]} rotation={[-0.2, 0, -0.25]}>
          <Part colour={colour} scale={[1, 0.32, 1]}>
            {ball(0.5)}
          </Part>
          <Part colour={dark} position={[0, 0.17, 0]}>
            {cylinder(0.015, 0.025, 0.08, 6)}
          </Part>
        </group>
      );
  }
};

export const Hat = ({ hat }: { hat: CharacterLook["hat"] }) => (
  <group name="hat">{drawHat(hat.model, hat.colour)}</group>
);

const eyeSpots = [-0.15, 0.15];

const drawFaceAccessory = (
  model: AccessoryModel,
  colour: string,
): ReactNode => {
  switch (model) {
    case "round-glasses":
    case "shades":
    case "heart-glasses":
      return (
        <>
          {eyeSpots.map((x) =>
            model === "heart-glasses" ? (
              <HeartShape
                key={x}
                colour={colour}
                position={[x, 0.05, 0.42]}
                size={0.07}
              />
            ) : (
              <group key={x} position={[x, 0.05, 0.42]}>
                <Part colour={colour}>{ring(0.08, 0.014)}</Part>
                {model === "shades" ? (
                  <Part colour={colour} rotation={flat}>
                    {cylinder(0.08, 0.08, 0.01)}
                  </Part>
                ) : null}
              </group>
            ),
          )}
          <Part colour={colour} position={[0, 0.07, 0.43]}>
            {box(0.12, 0.02, 0.02)}
          </Part>
        </>
      );
    case "monocle":
      return (
        <group position={[0.15, 0.05, 0.42]}>
          <Part colour={colour}>{ring(0.08, 0.014)}</Part>
          <Part
            colour={colour}
            position={[0.06, -0.2, -0.05]}
            rotation={[0, 0, 0.3]}
          >
            {cylinder(0.008, 0.008, 0.3, 4)}
          </Part>
        </group>
      );
    case "eyepatch":
      return (
        <>
          <Part colour={colour} position={[-0.15, 0.05, 0.41]} rotation={flat}>
            {cylinder(0.09, 0.09, 0.02)}
          </Part>
          <group rotation={[0, 0, -0.4]}>
            <Part colour={colour} position={[0, 0.02, 0]} rotation={flat}>
              {ring(0.43, 0.012)}
            </Part>
          </group>
        </>
      );
    case "ninja-mask":
      return (
        <Part colour={colour} rotation={[-0.1, 0, 0]}>
          {ballSlice(0.44, 0.52, 0.3)}
        </Part>
      );
    case "hero-mask":
      return (
        <>
          {eyeSpots.map((x) => (
            <Part
              key={x}
              colour={colour}
              position={[x, 0.05, 0.33]}
              scale={[1.2, 0.9, 0.5]}
            >
              {ball(0.12)}
            </Part>
          ))}
        </>
      );
    case "star-glasses":
      return (
        <>
          {eyeSpots.map((x) => (
            <StarShape
              key={x}
              colour={colour}
              position={[x, 0.05, 0.42]}
              size={0.1}
            />
          ))}
          <Part colour={colour} position={[0, 0.07, 0.43]}>
            {box(0.12, 0.02, 0.02)}
          </Part>
        </>
      );
    case "lab-goggles":
      return (
        <>
          <Part
            colour={partColours.ink}
            position={[0, 0.05, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {ring(0.43, 0.02)}
          </Part>
          <Part colour={colour} position={[0, 0.05, 0.39]} isGlassy>
            {box(0.46, 0.15, 0.08)}
          </Part>
          <Part colour={partColours.white} position={[0, 0.05, 0.38]}>
            {box(0.48, 0.17, 0.05)}
          </Part>
        </>
      );
    case "headphones":
      return (
        <>
          <Part colour={partColours.ink} position={[0, 0.05, 0]}>
            {ring(0.45, 0.03, Math.PI)}
          </Part>
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.45, 0.02, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              {cylinder(0.11, 0.11, 0.09)}
            </Part>
          ))}
        </>
      );
    case "none":
    case "bow-tie":
    case "scarf":
    case "necklace":
    case "medal":
    case "apron":
    case "necktie":
    case "sash":
    case "bandana":
      return null;
  }
};

const drawNeckAccessory = (
  model: AccessoryModel,
  colour: string,
): ReactNode => {
  switch (model) {
    case "bow-tie":
      return (
        <group position={[0, 1.1, 0.29]}>
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.06, 0, 0]}
              rotation={[0, 0, side * (Math.PI / 2)]}
            >
              {cone(0.055, 0.12, 4)}
            </Part>
          ))}
          <Part colour={shadeColour(colour, -0.3)}>{ball(0.035)}</Part>
        </group>
      );
    case "scarf":
      return (
        <>
          <Part colour={colour} position={[0, 1.14, 0]} rotation={flat}>
            {ring(0.22, 0.07)}
          </Part>
          <Part
            colour={colour}
            position={[0.12, 0.95, 0.27]}
            rotation={[0, 0, 0.1]}
          >
            {box(0.1, 0.3, 0.05)}
          </Part>
        </>
      );
    case "necklace":
      return (
        <>
          <Part
            colour={colour}
            position={[0, 1.1, 0.05]}
            rotation={[Math.PI / 2 - 0.5, 0, 0]}
          >
            {ring(0.24, 0.015)}
          </Part>
          <Part colour={colour} position={[0, 0.98, 0.28]}>
            {ball(0.04)}
          </Part>
        </>
      );
    case "medal":
      return (
        <>
          <Part colour={partColours.red} position={[0, 1.04, 0.28]}>
            {box(0.06, 0.16, 0.02)}
          </Part>
          <Part colour={colour} position={[0, 0.93, 0.3]} rotation={flat}>
            {cylinder(0.06, 0.06, 0.02)}
          </Part>
        </>
      );
    case "apron":
      return (
        <>
          <Part
            colour={colour}
            position={[0, 0.7, 0.33]}
            rotation={[-0.08, 0, 0]}
          >
            {box(0.4, 0.62, 0.03)}
          </Part>
          <Part
            colour={colour}
            position={[0, 1.08, 0.24]}
            rotation={[-0.4, 0, 0]}
          >
            {box(0.24, 0.14, 0.03)}
          </Part>
          <Part colour={shadeColour(colour, -0.25)} position={[0, 0.66, 0.35]}>
            {box(0.22, 0.12, 0.02)}
          </Part>
        </>
      );
    case "necktie":
      return (
        <>
          <Part colour={colour} position={[0, 1.1, 0.27]}>
            {box(0.07, 0.06, 0.04)}
          </Part>
          <Part colour={colour} position={[0, 0.92, 0.3]} scale={[1, 1, 0.2]}>
            {cylinder(0.05, 0.075, 0.3, 4)}
          </Part>
          <Part
            colour={colour}
            position={[0, 0.74, 0.3]}
            rotation={[0, 0, Math.PI]}
            scale={[1, 1, 0.2]}
          >
            {cone(0.075, 0.08, 4)}
          </Part>
        </>
      );
    case "sash":
      return (
        <group position={[0, 0.86, 0]} rotation={[0, 0, 0.6]}>
          <Part colour={colour} rotation={flat} scale={[1.25, 1, 1.05]}>
            {ring(0.3, 0.035)}
          </Part>
        </group>
      );
    case "bandana":
      return (
        <>
          <Part colour={colour} position={[0, 1.14, 0]} rotation={flat}>
            {ring(0.17, 0.05)}
          </Part>
          <Part
            colour={colour}
            position={[0, 1.04, 0.24]}
            rotation={[-0.3, 0, Math.PI]}
            scale={[1, 1, 0.25]}
          >
            {cone(0.16, 0.2, 3)}
          </Part>
        </>
      );
    case "none":
    case "round-glasses":
    case "shades":
    case "heart-glasses":
    case "monocle":
    case "eyepatch":
    case "ninja-mask":
    case "hero-mask":
    case "star-glasses":
    case "lab-goggles":
    case "headphones":
      return null;
  }
};

export const AccessoryOnFace = ({
  accessory,
}: {
  accessory: CharacterLook["accessory"];
}) => (
  <group name="face-accessory">
    {drawFaceAccessory(accessory.model, accessory.colour)}
  </group>
);

export const AccessoryOnNeck = ({
  accessory,
}: {
  accessory: CharacterLook["accessory"];
}) => (
  <group name="neck-accessory">
    {drawNeckAccessory(accessory.model, accessory.colour)}
  </group>
);

const Wing = ({
  colour,
  side,
  isGlassy,
  scale,
}: {
  colour: string;
  side: -1 | 1;
  isGlassy: boolean;
  scale: [number, number, number];
}) => (
  <Part
    colour={colour}
    position={[side * 0.35, 0.15, -0.05]}
    rotation={[0, side * 0.4, side * -0.5]}
    scale={scale}
    isGlassy={isGlassy}
  >
    {ball(0.3)}
  </Part>
);

const drawBack = (model: BackModel, colour: string): ReactNode => {
  const dark = shadeColour(colour, -0.35);
  switch (model) {
    case "none":
      return null;
    case "backpack":
      return (
        <>
          <Part colour={colour}>{box(0.42, 0.48, 0.2)}</Part>
          <Part colour={dark} position={[0, 0.12, -0.06]}>
            {box(0.44, 0.22, 0.12)}
          </Part>
        </>
      );
    case "cape":
      return (
        <>
          <Part
            colour={colour}
            position={[0, -0.2, -0.04]}
            rotation={[0.15, 0, 0]}
          >
            {box(0.66, 1.0, 0.03)}
          </Part>
          <Part colour={dark} position={[0, 0.27, 0.36]} rotation={flat}>
            {ring(0.26, 0.04)}
          </Part>
        </>
      );
    case "quiver":
      return (
        <group rotation={[0, 0, 0.4]}>
          <Part colour={colour}>{cylinder(0.1, 0.09, 0.55, 16)}</Part>
          {[-0.04, 0, 0.04].map((x) => (
            <group key={x} position={[x, 0.35, 0]}>
              <Part colour={partColours.wood}>
                {cylinder(0.012, 0.012, 0.2, 4)}
              </Part>
              <Part colour={partColours.red} position={[0, 0.1, 0]}>
                {cone(0.03, 0.06, 4)}
              </Part>
            </group>
          ))}
        </group>
      );
    case "round-shield":
      return (
        <>
          <Part colour={colour} rotation={flat}>
            {cylinder(0.34, 0.34, 0.05, 28)}
          </Part>
          <Part colour={partColours.steel} position={[0, 0, -0.04]}>
            {ball(0.08)}
          </Part>
        </>
      );
    case "kite-shield":
      return (
        <>
          <Part colour={colour} position={[0, 0.1, 0]}>
            {box(0.5, 0.36, 0.05)}
          </Part>
          <Part
            colour={colour}
            position={[0, -0.25, 0]}
            rotation={[0, 0, Math.PI]}
            scale={[1, 1, 0.12]}
          >
            {cone(0.29, 0.36, 4)}
          </Part>
          <Part colour={partColours.gold} position={[0, 0.05, -0.03]}>
            {box(0.08, 0.4, 0.02)}
          </Part>
        </>
      );
    case "fairy-wings":
      return (
        <>
          {([-1, 1] as const).map((side) => (
            <Wing
              key={side}
              colour={colour}
              side={side}
              isGlassy
              scale={[1, 1.3, 0.12]}
            />
          ))}
        </>
      );
    case "turtle-shell":
      return (
        <>
          <Part colour={colour} scale={[1, 1.15, 0.45]}>
            {ball(0.36)}
          </Part>
          <Part colour={dark} position={[0, 0, -0.14]} scale={[1, 1.1, 0.3]}>
            {ball(0.18)}
          </Part>
        </>
      );
    case "katana":
      return (
        <group rotation={[0, 0, -0.7]}>
          <Part colour={colour} position={[0, -0.1, 0]}>
            {box(0.07, 0.75, 0.05)}
          </Part>
          <Part colour={partColours.gold} position={[0, 0.28, 0]}>
            {box(0.14, 0.03, 0.08)}
          </Part>
          <Part colour={partColours.red} position={[0, 0.4, 0]}>
            {cylinder(0.025, 0.025, 0.22, 6)}
          </Part>
        </group>
      );
    case "gear-pack":
      return (
        <>
          <Part colour={dark}>{box(0.42, 0.45, 0.2)}</Part>
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.14, 0.1, -0.12]}
            >
              {ring(0.09, 0.035)}
            </Part>
          ))}
        </>
      );
    case "jetpack":
      return (
        <>
          {([-1, 1] as const).map((side) => (
            <group key={side} position={[side * 0.13, 0, 0]}>
              <Part colour={colour}>{cylinder(0.11, 0.11, 0.5)}</Part>
              <Part
                colour={partColours.flame}
                position={[0, -0.36, 0]}
                rotation={[Math.PI, 0, 0]}
              >
                {cone(0.08, 0.2, 6)}
              </Part>
            </group>
          ))}
        </>
      );
    case "dragon-wings":
      return (
        <>
          {([-1, 1] as const).map((side) => (
            <Wing
              key={side}
              colour={colour}
              side={side}
              isGlassy={false}
              scale={[1.6, 1.1, 0.1]}
            />
          ))}
        </>
      );
    case "balloons":
      return (
        <group position={[0.25, 0.9, 0]}>
          {[
            [0, 0.3, partColours.red],
            [-0.22, 0.15, partColours.sky],
            [0.22, 0.12, partColours.gold],
          ].map(([x, y, balloonColour]) => (
            <group key={String(balloonColour)}>
              <Part
                colour={String(balloonColour)}
                position={[Number(x), Number(y), 0]}
                scale={[1, 1.2, 1]}
              >
                {ball(0.15)}
              </Part>
              <Part
                colour={partColours.white}
                position={[Number(x) / 2, Number(y) / 2 - 0.4, 0]}
                rotation={[0, 0, Number(x)]}
              >
                {cylinder(0.006, 0.006, 0.8, 3)}
              </Part>
            </group>
          ))}
        </group>
      );
  }
};

export const BackGear = ({ back }: { back: CharacterLook["back"] }) => (
  <group name="back" position={[0, 0.88, -0.36]}>
    {drawBack(back.model, back.colour)}
  </group>
);

const WandStick = ({
  colour,
  length = 0.45,
}: {
  colour: string;
  length?: number;
}) => (
  <Part colour={colour} position={[0, length / 2 - 0.08, 0]}>
    {cylinder(0.02, 0.025, length, 5)}
  </Part>
);

const tipHeight = 0.38;

const drawHeld = (model: WandModel, colour: string): ReactNode => {
  const light = shadeColour(colour, 0.5);
  switch (model) {
    case "none":
      return null;
    case "twig":
      return (
        <>
          <WandStick colour={colour} />
          <Part
            colour={partColours.leaf}
            position={[0.04, 0.25, 0]}
            scale={[1, 0.5, 0.3]}
          >
            {ball(0.05)}
          </Part>
        </>
      );
    case "star":
    case "golden":
      return (
        <>
          <WandStick
            colour={model === "golden" ? partColours.gold : partColours.white}
          />
          <StarShape colour={colour} position={[0, tipHeight, 0]} size={0.1} />
        </>
      );
    case "crystal":
      return (
        <>
          <WandStick colour={partColours.white} />
          <Part
            colour={colour}
            position={[0, tipHeight, 0]}
            scale={[1, 1.6, 1]}
          >
            <octahedronGeometry args={[0.07]} />
          </Part>
        </>
      );
    case "lightning":
      return (
        <>
          <WandStick colour={partColours.ink} />
          {[0, 1, 2].map((bolt) => (
            <Part
              key={bolt}
              colour={colour}
              position={[
                bolt % 2 === 0 ? 0.03 : -0.03,
                tipHeight - 0.05 + bolt * 0.07,
                0,
              ]}
              rotation={[0, 0, bolt % 2 === 0 ? 0.6 : -0.6]}
            >
              {box(0.03, 0.09, 0.02)}
            </Part>
          ))}
        </>
      );
    case "snake":
      return (
        <>
          {[0, 1].map((curve) => (
            <Part
              key={curve}
              colour={colour}
              position={[0, 0.05 + curve * 0.16, 0]}
              rotation={[0, 0, curve === 0 ? -Math.PI / 2 : Math.PI / 2]}
            >
              {ring(0.08, 0.025, Math.PI)}
            </Part>
          ))}
          <Part colour={colour} position={[-0.08, 0.33, 0]}>
            {ball(0.04)}
          </Part>
        </>
      );
    case "comet":
      return (
        <>
          <WandStick colour={partColours.ink} />
          <Part colour={colour} position={[0, tipHeight, 0]}>
            {ball(0.07)}
          </Part>
          <Part
            colour={partColours.flame}
            position={[-0.08, tipHeight - 0.06, 0]}
            rotation={[0, 0, 2.2]}
          >
            {cone(0.05, 0.18, 6)}
          </Part>
        </>
      );
    case "heart":
      return (
        <>
          <WandStick colour={partColours.white} />
          <HeartShape
            colour={colour}
            position={[0, tipHeight, 0]}
            size={0.08}
          />
        </>
      );
    case "staff":
      return (
        <>
          <Part colour={colour} position={[0, 0.1, 0]}>
            {cylinder(0.03, 0.035, 1.3, 6)}
          </Part>
          <Part colour={partColours.sky} position={[0, 0.8, 0]}>
            <octahedronGeometry args={[0.1, 1]} />
          </Part>
        </>
      );
    case "sword":
    case "cutlass":
      return (
        <>
          <Part colour={partColours.wood} position={[0, -0.02, 0]}>
            {cylinder(0.025, 0.025, 0.14, 6)}
          </Part>
          <Part colour={partColours.gold} position={[0, 0.06, 0]}>
            {box(0.18, 0.03, 0.05)}
          </Part>
          <Part
            colour={colour}
            position={[model === "cutlass" ? 0.04 : 0, 0.38, 0]}
            rotation={[0, 0, model === "cutlass" ? -0.15 : 0]}
          >
            {box(model === "cutlass" ? 0.09 : 0.06, 0.6, 0.02)}
          </Part>
        </>
      );
    case "axe":
      return (
        <>
          <Part colour={partColours.wood} position={[0, 0.2, 0]}>
            {cylinder(0.025, 0.025, 0.7, 6)}
          </Part>
          <Part colour={colour} position={[0.09, 0.45, 0]} scale={[1, 1, 0.25]}>
            {cylinder(0.14, 0.14, 0.16, 3)}
          </Part>
        </>
      );
    case "bow":
      return (
        <>
          <Part
            colour={colour}
            position={[-0.05, 0.15, 0]}
            rotation={[0, 0, -Math.PI / 2]}
          >
            {ring(0.38, 0.02, Math.PI)}
          </Part>
          <Part colour={partColours.white} position={[-0.05, 0.15, 0]}>
            {cylinder(0.005, 0.005, 0.76, 3)}
          </Part>
        </>
      );
    case "throwing-star":
      return (
        <group position={[0, 0.08, 0.05]}>
          {[0, 1, 2, 3].map((point) => (
            <Part
              key={point}
              colour={colour}
              rotation={[0, 0, (point * Math.PI) / 2]}
              position={[
                Math.sin((point * Math.PI) / 2) * -0.07,
                Math.cos((point * Math.PI) / 2) * 0.07,
                0,
              ]}
            >
              {cone(0.04, 0.12, 4)}
            </Part>
          ))}
        </group>
      );
    case "flag":
      return (
        <>
          <WandStick colour={partColours.steel} length={0.8} />
          <Part colour={colour} position={[0.13, 0.55, 0]}>
            {box(0.24, 0.16, 0.01)}
          </Part>
        </>
      );
    case "torch":
      return (
        <>
          <WandStick colour={partColours.wood} length={0.35} />
          <Part colour={colour} position={[0, 0.16, 0]}>
            {cone(0.07, 0.16, 6)}
          </Part>
          <Part colour={partColours.gold} position={[0, 0.27, 0]}>
            {cone(0.05, 0.12, 6)}
          </Part>
        </>
      );
    case "wrench":
      return (
        <>
          <Part colour={colour} position={[0, 0.12, 0]}>
            {box(0.05, 0.4, 0.03)}
          </Part>
          <Part
            colour={colour}
            position={[0, 0.36, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            {ring(0.06, 0.025, Math.PI * 1.5)}
          </Part>
        </>
      );
    case "dragon-egg":
      return (
        <group position={[0, 0.08, 0.1]}>
          <Part colour={colour} scale={[1, 1.3, 1]}>
            {ball(0.13)}
          </Part>
          <Part colour={light} position={[0.05, 0.06, 0.1]}>
            {ball(0.03)}
          </Part>
          <Part colour={light} position={[-0.06, -0.04, 0.1]}>
            {ball(0.025)}
          </Part>
        </group>
      );
    case "whisk":
      return (
        <>
          <Part colour={partColours.wood} position={[0, 0.02, 0]}>
            {cylinder(0.03, 0.03, 0.2, 6)}
          </Part>
          {[0, 1].map((loop) => (
            <Part
              key={loop}
              colour={colour}
              position={[0, 0.25, 0]}
              rotation={[0, (loop * Math.PI) / 2, 0]}
              scale={[0.6, 1, 1]}
            >
              {ring(0.12, 0.008)}
            </Part>
          ))}
        </>
      );
    case "magnifying-glass":
      return (
        <>
          <Part colour={colour} position={[0, 0.04, 0]}>
            {cylinder(0.025, 0.03, 0.26, 6)}
          </Part>
          <Part colour={partColours.gold} position={[0, 0.27, 0]}>
            {ring(0.1, 0.02)}
          </Part>
          <Part
            colour={partColours.sky}
            position={[0, 0.27, 0]}
            rotation={flat}
            isGlassy
          >
            {cylinder(0.09, 0.09, 0.01)}
          </Part>
        </>
      );
    case "lasso":
      return (
        <>
          <Part
            colour={colour}
            position={[0, 0.15, 0.05]}
            rotation={[0.3, 0, 0]}
          >
            {ring(0.16, 0.02)}
          </Part>
          <Part
            colour={colour}
            position={[0.1, 0.32, 0]}
            rotation={[0.4, 0, 0.3]}
          >
            {ring(0.2, 0.015)}
          </Part>
        </>
      );
    case "guitar":
      return (
        <group position={[-0.12, 0.05, 0.12]} rotation={[0, 0, 0.6]}>
          <Part colour={colour} scale={[1, 1, 0.35]}>
            {ball(0.15)}
          </Part>
          <Part colour={colour} position={[0, 0.17, 0]} scale={[1, 1, 0.35]}>
            {ball(0.11)}
          </Part>
          <Part
            colour={partColours.ink}
            position={[0, 0.02, 0.05]}
            rotation={flat}
          >
            {cylinder(0.04, 0.04, 0.01)}
          </Part>
          <Part colour={partColours.wood} position={[0, 0.45, 0]}>
            {box(0.05, 0.42, 0.03)}
          </Part>
          <Part colour={partColours.ink} position={[0, 0.69, 0]}>
            {box(0.08, 0.1, 0.04)}
          </Part>
        </group>
      );
    case "watering-can":
      return (
        <group position={[0, 0.02, 0.08]}>
          <Part colour={colour}>{cylinder(0.11, 0.12, 0.22)}</Part>
          <Part
            colour={colour}
            position={[0, 0.15, -0.06]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {ring(0.08, 0.018, Math.PI)}
          </Part>
          <Part colour={colour} position={[0, 0.1, 0.2]} rotation={[1.0, 0, 0]}>
            {cylinder(0.02, 0.025, 0.24, 6)}
          </Part>
          <Part
            colour={shadeColour(colour, -0.3)}
            position={[0, 0.2, 0.3]}
            rotation={[1.0, 0, 0]}
          >
            {cone(0.045, 0.06, 8)}
          </Part>
        </group>
      );
    case "paintbrush":
      return (
        <>
          <Part colour={partColours.wood} position={[0, 0.12, 0]}>
            {cylinder(0.018, 0.025, 0.4, 6)}
          </Part>
          <Part colour={partColours.steel} position={[0, 0.35, 0]}>
            {cylinder(0.028, 0.025, 0.07, 6)}
          </Part>
          <Part colour={colour} position={[0, 0.43, 0]}>
            {cone(0.035, 0.1, 8)}
          </Part>
        </>
      );
  }
};

export const HeldGear = ({ wand }: { wand: CharacterLook["wand"] }) => (
  <group name="held" position={[0.42, 0.6, 0.08]} rotation={[0.3, 0, -0.1]}>
    {drawHeld(wand.model, wand.colour)}
  </group>
);
