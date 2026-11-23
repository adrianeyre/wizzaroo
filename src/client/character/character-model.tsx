import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useRef, type ReactNode } from "react";
import type { Group } from "three";
import {
  AccessoryOnFace,
  AccessoryOnNeck,
  BackGear,
  Hat,
  HeldGear,
  isHairHiddenByHat,
} from "./character-gear.js";
import type {
  CharacterLook,
  EyebrowsModel,
  EyesModel,
  FacialHairModel,
  HairStyleModel,
  MouthModel,
  OutfitModel,
  PartLook,
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
  mixColours,
  partColours,
  ring,
  shadeColour,
  type Vector,
} from "./character-parts.js";

export const headHeight = 1.55;
const headRadius = 0.42;
const eyeSpacing = 0.15;
const eyeHeight = 0.05;
const eyeDepth = 0.36;
const browHeight = 0.19;
const browDepth = 0.35;
const mouthHeight = -0.15;
const mouthDepth = 0.385;
const waistHeight = 0.6;
const shoulderHeight = 1.12;
const torsoHeight = 0.6;
const torsoBottomRadius = 0.3;
const torsoTopRadius = 0.27;
const skirtTopRadius = 0.3;
const skirtBottomRadius = 0.42;
const robeLength = 0.55;
const layerGap = 0.012;

const getTorsoRadiusAt = (height: number): number =>
  torsoBottomRadius -
  ((torsoBottomRadius - torsoTopRadius) * (height - (0.86 - torsoHeight / 2))) /
    torsoHeight +
  layerGap;

const getRobeRadiusAt = (height: number): number =>
  skirtTopRadius +
  ((skirtBottomRadius - skirtTopRadius) * (waistHeight - height)) / robeLength +
  layerGap;

interface OutfitStyle {
  legColour: string;
  shoeColour: string;
  sleeveColour: string;
  skirtLength: number;
  details: ReactNode;
}

const Belt = ({ colour }: { colour: string }) => (
  <Part colour={colour} position={[0, waistHeight + 0.04, 0]}>
    {cylinder(
      getTorsoRadiusAt(waistHeight + 0.075),
      getTorsoRadiusAt(waistHeight + 0.005),
      0.07,
    )}
  </Part>
);

const Buttons = ({ colour, count }: { colour: string; count: number }) => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <Part
        key={index}
        colour={colour}
        position={[0, 1.02 - index * 0.13, 0.285]}
      >
        {ball(0.03)}
      </Part>
    ))}
  </>
);

const BackDrape = ({ colour }: { colour: string }) => (
  <Part colour={colour} position={[0, 0.72, -0.3]} rotation={[0.12, 0, 0]}>
    {box(0.62, 0.9, 0.04)}
  </Part>
);

const rainbowColours = ["#e8312e", "#ff9a1f", "#ffe14a", "#5fd03c", "#3fa0ff"];

const buildOutfitStyle = ({
  model,
  colour,
}: PartLook<OutfitModel>): OutfitStyle => {
  const dark = shadeColour(colour, -0.45);
  const light = shadeColour(colour, 0.5);
  const plain = {
    legColour: dark,
    shoeColour: partColours.ink,
    sleeveColour: colour,
    skirtLength: 0,
    details: null,
  };
  switch (model) {
    case "tunic":
      return {
        ...plain,
        legColour: "#5a3a22",
        shoeColour: "#4a2f1a",
        details: <Belt colour="#4a2f1a" />,
      };
    case "cloak":
      return {
        ...plain,
        legColour: "#5a3a22",
        details: (
          <>
            <BackDrape colour={dark} />
            <Part
              colour={dark}
              position={[0, shoulderHeight, 0]}
              rotation={flat}
            >
              {ring(0.27, 0.06)}
            </Part>
          </>
        ),
      };
    case "robe":
      return {
        ...plain,
        skirtLength: robeLength,
        details: <Belt colour={partColours.gold} />,
      };
    case "starry-robe":
      return {
        ...plain,
        skirtLength: robeLength,
        details: (
          <>
            <StarShape
              colour={partColours.gold}
              position={[-0.12, 0.95, 0.3]}
              size={0.06}
            />
            <StarShape
              colour={partColours.gold}
              position={[0.1, 0.78, 0.31]}
              size={0.05}
            />
            <StarShape
              colour={partColours.gold}
              position={[-0.05, 0.35, 0.36]}
              size={0.06}
            />
          </>
        ),
      };
    case "rainbow-robe":
      return {
        ...plain,
        skirtLength: robeLength,
        details: (
          <>
            {rainbowColours.map((bandColour, index) => (
              <Part
                key={bandColour}
                colour={bandColour}
                position={[0, 0.5 - index * 0.09, 0]}
              >
                {cylinder(
                  getRobeRadiusAt(0.53 - index * 0.09),
                  getRobeRadiusAt(0.47 - index * 0.09),
                  0.06,
                )}
              </Part>
            ))}
          </>
        ),
      };
    case "striped-top":
      return {
        ...plain,
        legColour: "#2f4f8f",
        details: (
          <>
            {[0.72, 0.88, 1.04].map((stripeHeight) => (
              <Part
                key={stripeHeight}
                colour={partColours.white}
                position={[0, stripeHeight, 0]}
              >
                {cylinder(
                  getTorsoRadiusAt(stripeHeight + 0.03),
                  getTorsoRadiusAt(stripeHeight - 0.03),
                  0.06,
                )}
              </Part>
            ))}
          </>
        ),
      };
    case "raincoat":
      return {
        ...plain,
        legColour: "#2f4f8f",
        shoeColour: colour,
        skirtLength: 0.25,
        details: <Buttons colour={dark} count={3} />,
      };
    case "armour":
      return {
        ...plain,
        legColour: shadeColour(colour, -0.2),
        shoeColour: shadeColour(colour, -0.35),
        details: (
          <>
            <Part colour={light} position={[0, 0.9, 0.2]} scale={[1, 1.1, 0.5]}>
              {ball(0.25)}
            </Part>
            <Part colour={light} position={[-0.33, shoulderHeight - 0.02, 0]}>
              {ball(0.13)}
            </Part>
            <Part colour={light} position={[0.33, shoulderHeight - 0.02, 0]}>
              {ball(0.13)}
            </Part>
          </>
        ),
      };
    case "space-suit":
      return {
        ...plain,
        legColour: colour,
        shoeColour: "#8d8d96",
        details: (
          <>
            <Part colour="#8d8d96" position={[0, 0.9, 0.27]}>
              {box(0.26, 0.18, 0.06)}
            </Part>
            <Part colour={partColours.red} position={[-0.06, 0.92, 0.31]}>
              {ball(0.03)}
            </Part>
            <Part colour={partColours.sky} position={[0.06, 0.92, 0.31]}>
              {ball(0.03)}
            </Part>
            <Belt colour="#8d8d96" />
          </>
        ),
      };
    case "jumper":
      return {
        ...plain,
        legColour: "#2f4f8f",
        details: (
          <>
            <Part colour={partColours.white} position={[0, 0.85, 0]}>
              {cylinder(getTorsoRadiusAt(0.9), getTorsoRadiusAt(0.8), 0.1)}
            </Part>
            <StarShape
              colour={partColours.white}
              position={[0, 1.0, 0.29]}
              size={0.07}
            />
          </>
        ),
      };
    case "hoodie":
      return {
        ...plain,
        legColour: "#2b3445",
        shoeColour: partColours.white,
        details: (
          <>
            <Part
              colour={dark}
              position={[0, shoulderHeight + 0.04, -0.12]}
              scale={[1.15, 0.75, 0.9]}
            >
              {ball(0.22)}
            </Part>
            <Part
              colour={dark}
              position={[0, shoulderHeight + 0.01, 0]}
              rotation={flat}
            >
              {ring(0.22, 0.05)}
            </Part>
            <Part colour={partColours.white} position={[-0.06, 1.02, 0.3]}>
              {box(0.025, 0.16, 0.025)}
            </Part>
            <Part colour={partColours.white} position={[0.06, 1.02, 0.3]}>
              {box(0.025, 0.16, 0.025)}
            </Part>
            <Part colour={dark} position={[0, 0.7, 0.31]}>
              {box(0.3, 0.13, 0.04)}
            </Part>
          </>
        ),
      };
    case "caped-tunic":
      return {
        ...plain,
        legColour: "#5a3a22",
        details: (
          <>
            <BackDrape colour={partColours.gold} />
            <Belt colour={partColours.gold} />
          </>
        ),
      };
    case "scarf-jumper":
      return {
        ...plain,
        legColour: "#2f4f8f",
        details: (
          <>
            <Part
              colour={partColours.red}
              position={[0, shoulderHeight + 0.02, 0]}
              rotation={flat}
            >
              {ring(0.2, 0.07)}
            </Part>
            <Part colour={partColours.red} position={[0.1, 0.95, 0.3]}>
              {box(0.1, 0.3, 0.05)}
            </Part>
          </>
        ),
      };
    case "dress":
      return {
        ...plain,
        legColour: light,
        skirtLength: 0.3,
        details: <Belt colour={light} />,
      };
    case "overalls":
      return {
        ...plain,
        legColour: colour,
        sleeveColour: partColours.white,
        details: (
          <>
            <Part colour={partColours.white} position={[0, 1.0, 0]}>
              {cylinder(getTorsoRadiusAt(1.14), getTorsoRadiusAt(0.86), 0.28)}
            </Part>
            <Part colour={colour} position={[0, 0.95, 0.24]}>
              {box(0.34, 0.3, 0.08)}
            </Part>
            <Part colour={partColours.gold} position={[-0.12, 1.06, 0.29]}>
              {ball(0.03)}
            </Part>
            <Part colour={partColours.gold} position={[0.12, 1.06, 0.29]}>
              {ball(0.03)}
            </Part>
          </>
        ),
      };
    case "explorer-shirt":
      return {
        ...plain,
        legColour: shadeColour(colour, -0.25),
        shoeColour: "#4a2f1a",
        details: (
          <>
            <Part colour={dark} position={[-0.12, 0.98, 0.28]}>
              {box(0.12, 0.1, 0.04)}
            </Part>
            <Part colour={dark} position={[0.12, 0.98, 0.28]}>
              {box(0.12, 0.1, 0.04)}
            </Part>
            <Belt colour="#4a2f1a" />
          </>
        ),
      };
    case "ninja-suit":
      return {
        ...plain,
        legColour: colour,
        shoeColour: colour,
        details: <Belt colour={partColours.red} />,
      };
    case "pirate-coat":
      return {
        ...plain,
        legColour: "#2b2b2b",
        skirtLength: 0.22,
        details: (
          <>
            <Part colour={partColours.white} position={[0, 0.95, 0.24]}>
              {box(0.14, 0.34, 0.08)}
            </Part>
            <Buttons colour={partColours.gold} count={3} />
            <Belt colour="#2b2b2b" />
          </>
        ),
      };
    case "hero-suit":
      return {
        ...plain,
        legColour: colour,
        shoeColour: partColours.gold,
        details: (
          <>
            <Part
              colour={partColours.gold}
              position={[0, 0.95, 0.28]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              {cylinder(0.1, 0.1, 0.04, 20)}
            </Part>
            <Belt colour={partColours.gold} />
          </>
        ),
      };
    case "leather-jerkin":
      return {
        ...plain,
        legColour: "#4a2f1a",
        shoeColour: "#2b1a0e",
        details: (
          <>
            <Part
              colour="#e8dcc4"
              position={[0, shoulderHeight, 0]}
              rotation={flat}
            >
              {ring(0.26, 0.07)}
            </Part>
            <Belt colour="#2b1a0e" />
          </>
        ),
      };
    case "scale-armour":
      return {
        ...plain,
        legColour: shadeColour(colour, -0.3),
        details: (
          <>
            {[
              [-0.1, 1.0],
              [0.1, 1.0],
              [0, 0.86],
              [-0.14, 0.74],
              [0.14, 0.74],
            ].map(([x, y]) => (
              <Part
                key={`${String(x)}-${String(y)}`}
                colour={light}
                position={[x, y, 0.27]}
                scale={[1, 1, 0.4]}
              >
                {ball(0.07)}
              </Part>
            ))}
            <Belt colour={partColours.gold} />
          </>
        ),
      };
  }
};

export const Body = ({
  outfit,
  skinColour,
}: {
  outfit: PartLook<OutfitModel>;
  skinColour: string;
}) => {
  const style = buildOutfitStyle(outfit);
  return (
    <group name="body">
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Part colour={style.legColour} position={[side * 0.13, 0.32, 0]}>
            {cylinder(0.11, 0.1, 0.5, 20)}
          </Part>
          <Part colour={style.shoeColour} position={[side * 0.13, 0.06, 0.04]}>
            {box(0.2, 0.12, 0.3)}
          </Part>
          <group
            name={side === 1 ? "wand-arm" : "free-arm"}
            position={[side * 0.37, shoulderHeight, 0]}
          >
            <Part
              colour={style.sleeveColour}
              position={[0, 0.88 - shoulderHeight, 0]}
              rotation={[0, 0, side * 0.12]}
            >
              {cylinder(0.09, 0.08, 0.5, 20)}
            </Part>
            <Part
              colour={skinColour}
              position={[side * 0.03, 0.6 - shoulderHeight, 0]}
            >
              {ball(0.095)}
            </Part>
          </group>
        </group>
      ))}
      <Part colour={outfit.colour} position={[0, 0.86, 0]}>
        {cylinder(torsoTopRadius, torsoBottomRadius, torsoHeight)}
      </Part>
      {style.skirtLength > 0 ? (
        <Part
          colour={outfit.colour}
          position={[0, waistHeight - style.skirtLength / 2, 0]}
        >
          {cylinder(
            skirtTopRadius,
            skirtTopRadius +
              ((skirtBottomRadius - skirtTopRadius) * style.skirtLength) /
                robeLength,
            style.skirtLength,
          )}
        </Part>
      ) : null}
      <Part colour={skinColour} position={[0, 1.18, 0]}>
        {cylinder(0.1, 0.11, 0.14, 20)}
      </Part>
      {style.details}
    </group>
  );
};

const EyeWhite = ({ radius = 0.085 }: { radius?: number }) => (
  <Part colour={partColours.white} scale={[1, 1, 0.6]}>
    {ball(radius)}
  </Part>
);

const Pupil = ({
  colour,
  radius = 0.05,
  scale = [1, 1, 0.6],
}: {
  colour: string;
  radius?: number;
  scale?: Vector;
}) => (
  <Part colour={colour} position={[0, 0, 0.035]} scale={scale}>
    {ball(radius)}
  </Part>
);

const ClosedEye = () => (
  <Part colour={partColours.ink} position={[0, -0.03, 0.02]}>
    {ring(0.06, 0.016, Math.PI)}
  </Part>
);

const drawEye = (model: EyesModel, colour: string, side: -1 | 1) => {
  switch (model) {
    case "round":
      return (
        <>
          <EyeWhite />
          <Pupil colour={colour} />
        </>
      );
    case "sleepy":
      return (
        <>
          <Pupil colour={colour} scale={[1.1, 0.5, 0.6]} />
          <Part colour={partColours.ink} position={[0, 0.03, 0.04]}>
            {box(0.13, 0.02, 0.02)}
          </Part>
        </>
      );
    case "sparkly":
      return (
        <>
          <EyeWhite />
          <Pupil colour={colour} radius={0.06} />
          <Part colour={partColours.white} position={[0.02, 0.025, 0.075]}>
            {ball(0.018)}
          </Part>
        </>
      );
    case "winking":
      return side === 1 ? (
        <ClosedEye />
      ) : (
        <>
          <EyeWhite />
          <Pupil colour={colour} />
        </>
      );
    case "happy":
      return <ClosedEye />;
    case "wide":
      return (
        <>
          <EyeWhite radius={0.11} />
          <Pupil colour={colour} radius={0.04} />
        </>
      );
    case "starry":
      return (
        <>
          <EyeWhite />
          <StarShape colour={colour} position={[0, 0, 0.05]} size={0.055} />
        </>
      );
    case "hearts":
      return <HeartShape colour={colour} position={[0, 0, 0.03]} size={0.05} />;
    case "determined":
      return (
        <>
          <EyeWhite />
          <Pupil colour={colour} />
          <Part
            colour={partColours.ink}
            position={[0, 0.06, 0.04]}
            rotation={[0, 0, side * -0.3]}
          >
            {box(0.15, 0.025, 0.02)}
          </Part>
        </>
      );
    case "dots":
      return <Pupil colour={partColours.ink} radius={0.04} />;
    case "cat":
      return (
        <>
          <Part colour={colour} scale={[1, 1, 0.6]}>
            {ball(0.08)}
          </Part>
          <Pupil colour={partColours.ink} radius={0.05} scale={[0.3, 1, 0.6]} />
        </>
      );
    case "lashes":
      return (
        <>
          <EyeWhite />
          <Pupil colour={colour} />
          {[0, 1, 2].map((lash) => (
            <Part
              key={lash}
              colour={partColours.ink}
              position={[side * (0.03 + lash * 0.03), 0.085, 0.03]}
              rotation={[0, 0, side * (-0.3 - lash * 0.3)]}
            >
              {box(0.012, 0.05, 0.012)}
            </Part>
          ))}
        </>
      );
    case "spiral":
      return (
        <>
          <EyeWhite />
          {[0.06, 0.035].map((radius) => (
            <Part
              key={radius}
              colour={colour}
              position={[0, 0, 0.04]}
              rotation={[0, 0, side * radius * 20]}
            >
              {ring(radius, 0.009, Math.PI * 1.6)}
            </Part>
          ))}
        </>
      );
    case "side-glance":
      return (
        <>
          <EyeWhite />
          <Part
            colour={colour}
            position={[0.035, 0, 0.035]}
            scale={[1, 1, 0.6]}
          >
            {ball(0.045)}
          </Part>
        </>
      );
    case "flower":
      return (
        <>
          <EyeWhite />
          {[0, 1, 2, 3, 4].map((petal) => {
            const angle = (petal / 5) * Math.PI * 2;
            return (
              <Part
                key={petal}
                colour={colour}
                position={[
                  Math.sin(angle) * 0.035,
                  Math.cos(angle) * 0.035,
                  0.04,
                ]}
                scale={[1, 1, 0.4]}
              >
                {ball(0.025)}
              </Part>
            );
          })}
          <Part colour={partColours.gold} position={[0, 0, 0.05]}>
            {ball(0.02)}
          </Part>
        </>
      );
  }
};

const Eyes = ({ eyes }: { eyes: CharacterLook["eyes"] }) => (
  <group name="eyes">
    {([-1, 1] as const).map((side) => (
      <group key={side} position={[side * eyeSpacing, eyeHeight, eyeDepth]}>
        {drawEye(eyes.model, eyes.colour, side)}
      </group>
    ))}
  </group>
);

const drawEyebrow = (model: EyebrowsModel, colour: string, side: -1 | 1) => {
  const tilt = (angle: number): Vector => [0, 0, side * angle];
  switch (model) {
    case "straight":
      return <Part colour={colour}>{box(0.14, 0.03, 0.03)}</Part>;
    case "arched":
      return (
        <Part colour={colour} position={[0, -0.04, 0]}>
          {ring(0.07, 0.016, Math.PI)}
        </Part>
      );
    case "bushy":
      return <Part colour={colour}>{box(0.17, 0.06, 0.05)}</Part>;
    case "thin":
      return <Part colour={colour}>{box(0.13, 0.014, 0.02)}</Part>;
    case "cross":
      return (
        <Part colour={colour} rotation={tilt(-0.4)}>
          {box(0.15, 0.035, 0.03)}
        </Part>
      );
    case "worried":
      return (
        <Part colour={colour} rotation={tilt(0.4)}>
          {box(0.14, 0.03, 0.03)}
        </Part>
      );
    case "raised":
      return (
        <Part
          colour={colour}
          position={[0, side === 1 ? 0.05 : 0, 0]}
          rotation={tilt(side === 1 ? 0.25 : 0)}
        >
          {box(0.14, 0.03, 0.03)}
        </Part>
      );
    case "wavy":
      return (
        <>
          <Part
            colour={colour}
            position={[-0.035, 0, 0]}
            rotation={[0, 0, 0.3]}
          >
            {box(0.075, 0.025, 0.03)}
          </Part>
          <Part
            colour={colour}
            position={[0.035, 0, 0]}
            rotation={[0, 0, -0.3]}
          >
            {box(0.075, 0.025, 0.03)}
          </Part>
        </>
      );
    case "dots":
      return <Part colour={colour}>{ball(0.03)}</Part>;
    case "chunky":
      return <Part colour={colour}>{box(0.12, 0.05, 0.05)}</Part>;
  }
};

const Eyebrows = ({
  model,
  colour,
}: {
  model: EyebrowsModel;
  colour: string;
}) => (
  <group name="eyebrows">
    {([-1, 1] as const).map((side) => (
      <group key={side} position={[side * eyeSpacing, browHeight, browDepth]}>
        {drawEyebrow(model, colour, side)}
      </group>
    ))}
  </group>
);

const OpenMouth = ({ scale }: { scale: Vector }) => (
  <Part colour={partColours.mouth} scale={scale}>
    {ball(0.07)}
  </Part>
);

const drawMouth = (model: MouthModel) => {
  const smile = (radius: number) => (
    <Part
      colour={partColours.mouth}
      rotation={[0, 0, Math.PI]}
      position={[0, 0.03, 0]}
    >
      {ring(radius, 0.018, Math.PI)}
    </Part>
  );
  switch (model) {
    case "smile":
      return smile(0.08);
    case "grin":
      return (
        <>
          {smile(0.11)}
          <Part
            colour={partColours.white}
            position={[0, -0.02, -0.005]}
            scale={[1, 0.45, 0.3]}
          >
            {ball(0.1)}
          </Part>
        </>
      );
    case "laugh":
      return (
        <>
          <OpenMouth scale={[1.3, 0.8, 0.35]} />
          <Part
            colour={partColours.tongue}
            position={[0, -0.03, 0.01]}
            scale={[1, 0.5, 0.3]}
          >
            {ball(0.05)}
          </Part>
        </>
      );
    case "tongue":
      return (
        <>
          {smile(0.08)}
          <Part
            colour={partColours.tongue}
            position={[0, -0.06, 0.01]}
            scale={[1, 1.2, 0.4]}
          >
            {ball(0.035)}
          </Part>
        </>
      );
    case "little-o":
      return <Part colour={partColours.mouth}>{ring(0.03, 0.014)}</Part>;
    case "smirk":
      return (
        <Part
          colour={partColours.mouth}
          rotation={[0, 0, Math.PI + 0.5]}
          position={[0.03, 0.03, 0]}
        >
          {ring(0.06, 0.016, Math.PI * 0.7)}
        </Part>
      );
    case "toothy":
      return (
        <>
          <OpenMouth scale={[1.4, 0.6, 0.3]} />
          <Part colour={partColours.white} position={[0, 0.015, 0.015]}>
            {box(0.12, 0.03, 0.02)}
          </Part>
        </>
      );
    case "gap-tooth":
      return (
        <>
          <OpenMouth scale={[1.3, 0.6, 0.3]} />
          <Part colour={partColours.white} position={[-0.025, 0.015, 0.015]}>
            {box(0.035, 0.035, 0.02)}
          </Part>
          <Part colour={partColours.white} position={[0.025, 0.015, 0.015]}>
            {box(0.035, 0.035, 0.02)}
          </Part>
        </>
      );
    case "fangs":
      return (
        <>
          {smile(0.08)}
          <Part
            colour={partColours.white}
            position={[-0.04, -0.035, 0.01]}
            rotation={[0, 0, Math.PI]}
          >
            {cone(0.015, 0.045, 4)}
          </Part>
          <Part
            colour={partColours.white}
            position={[0.04, -0.035, 0.01]}
            rotation={[0, 0, Math.PI]}
          >
            {cone(0.015, 0.045, 4)}
          </Part>
        </>
      );
    case "neutral":
      return <Part colour={partColours.mouth}>{box(0.1, 0.02, 0.02)}</Part>;
    case "cat":
      return (
        <>
          <Part
            colour={partColours.mouth}
            rotation={[0, 0, Math.PI]}
            position={[-0.03, 0.01, 0]}
          >
            {ring(0.03, 0.012, Math.PI)}
          </Part>
          <Part
            colour={partColours.mouth}
            rotation={[0, 0, Math.PI]}
            position={[0.03, 0.01, 0]}
          >
            {ring(0.03, 0.012, Math.PI)}
          </Part>
        </>
      );
    case "surprised":
      return <OpenMouth scale={[0.6, 0.9, 0.3]} />;
    case "buck-teeth":
      return (
        <>
          {smile(0.08)}
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={partColours.white}
              position={[side * 0.018, -0.07, 0.01]}
            >
              {box(0.032, 0.05, 0.015)}
            </Part>
          ))}
        </>
      );
    case "wavy":
      return (
        <>
          {[-1, 0, 1].map((step) => (
            <Part
              key={step}
              colour={partColours.mouth}
              position={[step * 0.04, 0, 0]}
              rotation={[0, 0, step % 2 === 0 ? 0.6 : -0.6]}
            >
              {box(0.045, 0.018, 0.02)}
            </Part>
          ))}
        </>
      );
    case "whistle":
      return (
        <group position={[0.02, 0, 0]}>
          <Part colour={shadeColour(partColours.tongue, -0.1)}>
            {ring(0.022, 0.015)}
          </Part>
          <Part colour={partColours.mouth} position={[0, 0, -0.005]}>
            {ball(0.015)}
          </Part>
        </group>
      );
  }
};

const Moustache = ({ colour }: { colour: string }) => (
  <>
    <Part
      colour={colour}
      position={[-0.05, mouthHeight + 0.06, mouthDepth]}
      scale={[1.4, 0.6, 0.6]}
      rotation={[0, 0, 0.2]}
    >
      {ball(0.045)}
    </Part>
    <Part
      colour={colour}
      position={[0.05, mouthHeight + 0.06, mouthDepth]}
      scale={[1.4, 0.6, 0.6]}
      rotation={[0, 0, -0.2]}
    >
      {ball(0.045)}
    </Part>
  </>
);

const Beard = ({ colour }: { colour: string }) => (
  <Part colour={colour} position={[0, -0.3, 0.07]}>
    {ball(0.3)}
  </Part>
);

const drawFacialHair = (
  model: FacialHairModel,
  colour: string,
  skinColour: string,
) => {
  switch (model) {
    case "none":
      return null;
    case "moustache":
      return <Moustache colour={colour} />;
    case "handlebar":
      return (
        <>
          <Moustache colour={colour} />
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.12, mouthHeight + 0.09, mouthDepth - 0.03]}
            >
              {ball(0.025)}
            </Part>
          ))}
        </>
      );
    case "full-beard":
      return (
        <>
          <Beard colour={colour} />
          <Moustache colour={colour} />
        </>
      );
    case "goatee":
      return (
        <Part
          colour={colour}
          position={[0, -0.32, 0.3]}
          rotation={[0.3, 0, Math.PI]}
        >
          {cone(0.07, 0.14, 6)}
        </Part>
      );
    case "stubble":
      return (
        <Part colour={mixColours(skinColour, colour, 0.45)}>
          {ballSlice(headRadius + 0.006, 0.68, 0.25)}
        </Part>
      );
    case "wizard-beard":
      return (
        <>
          <Part
            colour={colour}
            position={[0, -0.55, 0.18]}
            rotation={[0.15, 0, Math.PI]}
          >
            {cone(0.24, 0.75, 16)}
          </Part>
          <Moustache colour={colour} />
        </>
      );
    case "sideburns":
      return (
        <>
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.39, -0.02, 0.08]}
            >
              {box(0.06, 0.2, 0.12)}
            </Part>
          ))}
        </>
      );
    case "chin-strap":
      return (
        <Part colour={colour}>{ballSlice(headRadius + 0.01, 0.74, 0.12)}</Part>
      );
    case "curly-moustache":
      return (
        <>
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.06, mouthHeight + 0.07, mouthDepth]}
              rotation={[0, 0, side === 1 ? 0 : Math.PI]}
            >
              {ring(0.04, 0.015, Math.PI * 1.4)}
            </Part>
          ))}
        </>
      );
    case "braided-beard":
      return (
        <>
          <Beard colour={colour} />
          <Moustache colour={colour} />
          {[0, 1, 2].map((link) => (
            <Part
              key={link}
              colour={shadeColour(colour, -0.15)}
              position={[0, -0.6 - link * 0.09, 0.2]}
            >
              {ball(0.055 - link * 0.008)}
            </Part>
          ))}
        </>
      );
    case "pencil-moustache":
      return (
        <Part
          colour={colour}
          position={[0, mouthHeight + 0.055, mouthDepth + 0.01]}
        >
          {box(0.14, 0.012, 0.02)}
        </Part>
      );
    case "walrus":
      return (
        <Part
          colour={colour}
          position={[0, mouthHeight + 0.03, mouthDepth + 0.01]}
          scale={[1.6, 0.8, 0.5]}
        >
          {ballSlice(0.09, 0, 0.6)}
        </Part>
      );
    case "mutton-chops":
      return (
        <>
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.3, -0.16, 0.22]}
              rotation={[0, side * 0.6, 0]}
              scale={[0.7, 1.2, 0.6]}
            >
              {ball(0.12)}
            </Part>
          ))}
          <Moustache colour={colour} />
        </>
      );
    case "soul-patch":
      return (
        <Part
          colour={colour}
          position={[0, mouthHeight - 0.08, mouthDepth - 0.01]}
        >
          {box(0.045, 0.05, 0.02)}
        </Part>
      );
  }
};

const HairCap = ({
  colour,
  radius = 0.445,
  turnLength = 0.42,
}: {
  colour: string;
  radius?: number;
  turnLength?: number;
}) => (
  <Part colour={colour} rotation={[-0.35, 0, 0]}>
    {ballSlice(radius, 0, turnLength)}
  </Part>
);

const BackHair = ({ colour, length }: { colour: string; length: number }) => (
  <Part
    colour={colour}
    position={[0, -length / 2 + 0.05, -0.2]}
    scale={[1, 1, 0.55]}
  >
    {cylinder(0.42, 0.4, length)}
  </Part>
);

const drawHair = (
  model: HairStyleModel,
  colour: string,
  isUnderHat: boolean,
) => {
  const cap = <HairCap colour={colour} />;
  switch (model) {
    case "bald":
      return null;
    case "short":
      return cap;
    case "spiky":
      return (
        <>
          {cap}
          {isUnderHat
            ? null
            : [-0.24, -0.08, 0.08, 0.24].map((x) => (
                <Part
                  key={x}
                  colour={colour}
                  position={[x, 0.42 - Math.abs(x) * 0.4, -0.02]}
                  rotation={[-0.3, 0, -x * 1.6]}
                >
                  {cone(0.09, 0.25, 5)}
                </Part>
              ))}
        </>
      );
    case "curly":
      return (
        <>
          {cap}
          {[
            [-0.36, 0.12, 0.05],
            [0.36, 0.12, 0.05],
            [-0.3, 0.05, -0.25],
            [0.3, 0.05, -0.25],
            [0, 0.1, -0.38],
            ...(isUnderHat
              ? []
              : [
                  [-0.18, 0.38, 0.1],
                  [0.18, 0.38, 0.1],
                  [0, 0.42, -0.12],
                ]),
          ].map(([x, y, z]) => (
            <Part
              key={`${String(x)}-${String(y)}-${String(z)}`}
              colour={colour}
              position={[x, y, z]}
            >
              {ball(0.13)}
            </Part>
          ))}
        </>
      );
    case "long":
      return (
        <>
          {cap}
          <BackHair colour={colour} length={0.65} />
        </>
      );
    case "ponytail":
      return (
        <>
          {cap}
          <Part
            colour={colour}
            position={[0, 0.0, -0.5]}
            rotation={[0.5, 0, 0]}
          >
            {cone(0.12, 0.45, 6)}
          </Part>
        </>
      );
    case "bun":
      return (
        <>
          {cap}
          {isUnderHat ? null : (
            <Part colour={colour} position={[0, 0.42, -0.18]}>
              {ball(0.15)}
            </Part>
          )}
        </>
      );
    case "mohawk":
      return isUnderHat ? (
        cap
      ) : (
        <Part
          colour={colour}
          position={[0, 0.3, -0.05]}
          rotation={[-0.2, 0, 0]}
        >
          {box(0.1, 0.35, 0.7)}
        </Part>
      );
    case "afro":
      return isUnderHat ? (
        <HairCap colour={colour} radius={0.5} turnLength={0.5} />
      ) : (
        <Part colour={colour} position={[0, 0.18, -0.08]}>
          {ball(0.58)}
        </Part>
      );
    case "braids":
      return (
        <>
          {cap}
          {([-1, 1] as const).flatMap((side) =>
            [0, 1, 2, 3].map((link) => (
              <Part
                key={`${String(side)}-${String(link)}`}
                colour={colour}
                position={[side * 0.4, -0.1 - link * 0.13, -0.08]}
              >
                {ball(0.07)}
              </Part>
            )),
          )}
        </>
      );
    case "bob":
      return (
        <>
          <HairCap colour={colour} radius={0.47} />
          <BackHair colour={colour} length={0.35} />
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.4, -0.05, 0.05]}
            >
              {box(0.1, 0.32, 0.3)}
            </Part>
          ))}
        </>
      );
    case "pigtails":
      return (
        <>
          {cap}
          {([-1, 1] as const).map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.5, 0.05, -0.1]}
              rotation={[0, 0, side * -0.6]}
              scale={[0.8, 1.3, 0.8]}
            >
              {ball(0.14)}
            </Part>
          ))}
        </>
      );
    case "space-buns":
      return (
        <>
          {cap}
          {isUnderHat
            ? null
            : ([-1, 1] as const).map((side) => (
                <Part
                  key={side}
                  colour={colour}
                  position={[side * 0.26, 0.38, -0.05]}
                >
                  {ball(0.13)}
                </Part>
              ))}
        </>
      );
    case "quiff":
      return (
        <>
          {cap}
          {isUnderHat ? null : (
            <Part
              colour={colour}
              position={[0, 0.4, 0.14]}
              rotation={[0.5, 0, 0]}
              scale={[1, 0.6, 1.3]}
            >
              {ball(0.2)}
            </Part>
          )}
        </>
      );
    case "locs":
      return (
        <>
          {cap}
          {[-0.36, -0.22, -0.08, 0.08, 0.22, 0.36].map((x) => (
            <Part
              key={x}
              colour={colour}
              position={[x, -0.2, -0.42 + Math.abs(x) * 0.6]}
            >
              {cylinder(0.04, 0.035, 0.5, 6)}
            </Part>
          ))}
        </>
      );
  }
};

/**
 * How far open a speaking Character's mouth is now, from 0 to 1. A Character
 * drawn inside it talks (ADR 0077); outside it, the mouth is as chosen.
 */
export const SpeakingMouthContext = createContext<(() => number) | undefined>(
  undefined,
);

/** How quickly the mouth follows the voice: quick enough for syllables, not jittery. */
const mouthFollowRate = 22;
const closedBelow = 0.06;

const TalkingMouth = ({
  model,
  readOpenness,
}: {
  model: MouthModel;
  readOpenness: () => number;
}) => {
  const resting = useRef<Group>(null);
  const open = useRef<Group>(null);
  const openness = useRef(0);
  useFrame((_, seconds) => {
    const target = readOpenness();
    openness.current +=
      (target - openness.current) * Math.min(1, seconds * mouthFollowRate);
    const isOpen = openness.current > closedBelow;
    if (resting.current !== null) {
      resting.current.visible = !isOpen;
    }
    if (open.current !== null) {
      open.current.visible = isOpen;
      // The jaw drops as the mouth opens: taller, a little narrower and lower.
      open.current.scale.set(
        1 - openness.current * 0.2,
        0.3 + openness.current * 1.5,
        1,
      );
      open.current.position.y = -openness.current * 0.035;
    }
  });
  return (
    <>
      <group ref={resting}>{drawMouth(model)}</group>
      <group ref={open} visible={false}>
        <OpenMouth scale={[1.25, 0.9, 0.35]} />
        <Part
          colour={partColours.tongue}
          position={[0, -0.035, 0.012]}
          scale={[1, 0.45, 0.3]}
        >
          {ball(0.05)}
        </Part>
      </group>
    </>
  );
};

export const Head = ({ look }: { look: CharacterLook }) => {
  const isUnderHat = isHairHiddenByHat(look.hat.model);
  const readOpenness = useContext(SpeakingMouthContext);
  return (
    <group name="head" position={[0, headHeight, 0]}>
      <Part colour={look.skinColour}>{ball(headRadius)}</Part>
      {([-1, 1] as const).map((side) => (
        <Part
          key={side}
          colour={look.skinColour}
          position={[side * 0.41, 0, 0]}
        >
          {ball(0.08)}
        </Part>
      ))}
      <Part
        colour={shadeColour(look.skinColour, -0.08)}
        position={[0, -0.04, 0.42]}
      >
        {ball(0.055)}
      </Part>
      <group name="hair">
        {drawHair(look.hairStyle, look.hairColour, isUnderHat)}
      </group>
      <Eyes eyes={look.eyes} />
      <Eyebrows model={look.eyebrows} colour={look.hairColour} />
      <group name="mouth" position={[0, mouthHeight, mouthDepth]}>
        {readOpenness === undefined ? (
          drawMouth(look.mouth)
        ) : (
          <TalkingMouth model={look.mouth} readOpenness={readOpenness} />
        )}
      </group>
      <group name="facial-hair">
        {drawFacialHair(look.facialHair, look.hairColour, look.skinColour)}
      </group>
      <AccessoryOnFace accessory={look.accessory} />
      <Hat hat={look.hat} />
    </group>
  );
};

export const CharacterModel = ({ look }: { look: CharacterLook }) => (
  <group name="character">
    <Body outfit={look.outfit} skinColour={look.skinColour} />
    <AccessoryOnNeck accessory={look.accessory} />
    <BackGear back={look.back} />
    <HeldGear wand={look.wand} />
    <Head look={look} />
  </group>
);
