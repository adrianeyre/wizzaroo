import type { ReactNode } from "react";
import {
  ball,
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

const toyBoxWidth = 0.8;
const toyBoxHeight = 0.45;
const toyBoxDepth = 0.45;
const toyColours = ["#e8312e", "#3fa0ff", "#f2c530", "#3f9d5a", "#7a3fc4"];
const ivoryColour = "#fffdf5";
const stringColour = "#eeeeee";

const Wheels = ({ x, z, radius }: { x: number; z: number; radius: number }) => (
  <>
    {[-1, 1].flatMap((sideX) =>
      [-1, 1].map((sideZ) => (
        <Part
          key={`${String(sideX)}-${String(sideZ)}`}
          colour={partColours.ink}
          position={[sideX * x, radius, sideZ * z]}
          rotation={[0, 0, Math.PI / 2]}
        >
          {cylinder(radius, radius, 0.06, 14)}
        </Part>
      )),
    )}
  </>
);

const ToyBoxBody = ({
  colour,
  lift = 0,
}: {
  colour: string;
  lift?: number;
}) => (
  <Part colour={colour} position={[0, lift + toyBoxHeight / 2, 0]}>
    {box(toyBoxWidth, toyBoxHeight, toyBoxDepth)}
  </Part>
);

const PeekingToys = ({ height }: { height: number }) => (
  <>
    {toyColours.slice(0, 3).map((toyColour, index) => (
      <Part
        key={toyColour}
        colour={toyColour}
        position={[-0.2 + index * 0.2, height, (index - 1) * 0.05]}
      >
        {ball(0.08)}
      </Part>
    ))}
  </>
);

export const ToyBox = ({
  model,
  colour,
}: {
  model: string;
  colour: string;
}) => {
  switch (model) {
    case "basket":
      return (
        <>
          <Part colour={colour} position={[0, 0.2, 0]}>
            {cylinder(0.33, 0.27, 0.4, 16)}
          </Part>
          <Part colour={shadeColour(colour, -0.2)} position={[0, 0.4, 0]}>
            {ring(0.33, 0.03)}
          </Part>
          <Part colour={shadeColour(colour, -0.2)} position={[0, 0.4, 0]}>
            {ring(0.3, 0.02, Math.PI)}
          </Part>
          <PeekingToys height={0.42} />
        </>
      );
    case "crate":
      return (
        <>
          <ToyBoxBody colour={colour} />
          {[0.08, 0.22, 0.36].map((y) => (
            <Part
              key={y}
              colour={shadeColour(colour, -0.2)}
              position={[0, y, toyBoxDepth / 2 + 0.005]}
            >
              {box(toyBoxWidth, 0.04, 0.01)}
            </Part>
          ))}
          <PeekingToys height={toyBoxHeight + 0.02} />
        </>
      );
    case "barrel":
      return (
        <>
          <Part colour={colour} position={[0, 0.25, 0]}>
            {cylinder(0.28, 0.24, 0.5, 16)}
          </Part>
          {[0.08, 0.42].map((y) => (
            <Part key={y} colour={partColours.ink} position={[0, y, 0]}>
              {cylinder(0.275, 0.275, 0.04, 16)}
            </Part>
          ))}
          <PeekingToys height={0.52} />
        </>
      );
    case "star":
      return (
        <>
          <ToyBoxBody colour={colour} />
          {[-0.22, 0, 0.22].map((x) => (
            <StarShape
              key={x}
              colour={x === 0 ? partColours.white : partColours.sky}
              position={[x, 0.22, toyBoxDepth / 2 + 0.02]}
              size={0.08}
            />
          ))}
        </>
      );
    case "car":
      return (
        <>
          <ToyBoxBody colour={colour} lift={0.08} />
          <Part colour={partColours.sky} position={[0, 0.5, -0.05]} isGlassy>
            {box(0.5, 0.18, 0.3)}
          </Part>
          <Wheels x={0.41} z={0.16} radius={0.1} />
          {[-0.28, 0.28].map((x) => (
            <Part
              key={x}
              colour={partColours.gold}
              position={[x, 0.3, toyBoxDepth / 2]}
            >
              {ball(0.05)}
            </Part>
          ))}
        </>
      );
    case "wagon":
      return (
        <>
          <Part colour={colour} position={[0, 0.28, 0]}>
            {box(toyBoxWidth, 0.24, toyBoxDepth)}
          </Part>
          <Wheels x={0.3} z={0.24} radius={0.09} />
          <Part
            colour={partColours.ink}
            position={[0, 0.35, 0.45]}
            rotation={[1, 0, 0]}
          >
            {cylinder(0.015, 0.015, 0.5, 6)}
          </Part>
          <PeekingToys height={0.42} />
        </>
      );
    case "robot":
      return (
        <>
          <ToyBoxBody colour={colour} />
          <Part colour={shadeColour(colour, -0.15)} position={[0, 0.57, 0]}>
            {box(0.36, 0.24, 0.3)}
          </Part>
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={partColours.sky}
              position={[side * 0.08, 0.6, 0.15]}
            >
              {ball(0.04)}
            </Part>
          ))}
          <Part colour={partColours.steel} position={[0, 0.76, 0]}>
            {cylinder(0.01, 0.01, 0.14, 6)}
          </Part>
          <Part colour={partColours.red} position={[0, 0.84, 0]}>
            {ball(0.035)}
          </Part>
        </>
      );
    case "dragon-egg":
      return (
        <>
          <Part colour={colour} position={[0, 0.36, 0]} scale={[1, 1.3, 1]}>
            {ball(0.3)}
          </Part>
          {[0.5, 2, 3.6, 5].map((angle, index) => (
            <Part
              key={angle}
              colour={shadeColour(colour, -0.3)}
              position={[
                Math.cos(angle) * 0.26,
                0.22 + index * 0.1,
                Math.sin(angle) * 0.26,
              ]}
            >
              {ball(0.06)}
            </Part>
          ))}
          <Part colour={partColours.gold} position={[0, 0.48, 0.02]}>
            {ring(0.3, 0.012)}
          </Part>
        </>
      );
    default: {
      const isTreasure = model === "treasure";
      return (
        <>
          <ToyBoxBody colour={colour} />
          <Part
            colour={colour}
            position={[0, toyBoxHeight, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1, 1, toyBoxDepth / 0.4]}
          >
            {cylinder(0.2, 0.2, toyBoxWidth, 16)}
          </Part>
          {[-0.3, 0.3].map((x) => (
            <Part
              key={x}
              colour={isTreasure ? partColours.gold : shadeColour(colour, -0.3)}
              position={[x, 0.33, 0]}
            >
              {box(0.06, 0.66, toyBoxDepth + 0.02)}
            </Part>
          ))}
          <Part
            colour={partColours.gold}
            position={[0, toyBoxHeight - 0.02, toyBoxDepth / 2 + 0.01]}
          >
            {box(0.1, 0.12, 0.03)}
          </Part>
          {isTreasure
            ? toyColours.slice(0, 3).map((gemColour, index) => (
                <Part
                  key={gemColour}
                  colour={gemColour}
                  position={[
                    -0.15 + index * 0.15,
                    0.18,
                    toyBoxDepth / 2 + 0.02,
                  ]}
                >
                  <octahedronGeometry args={[0.045]} />
                </Part>
              ))
            : null}
        </>
      );
    }
  }
};

interface SoftToyShape {
  ears: "round" | "long" | "pointy" | "floppy" | "big" | "none";
  snout: boolean;
}

const softToyShapes: Partial<Record<string, SoftToyShape>> = {
  bunny: { ears: "long", snout: false },
  kitten: { ears: "pointy", snout: false },
  puppy: { ears: "floppy", snout: true },
  elephant: { ears: "big", snout: false },
  penguin: { ears: "none", snout: false },
  unicorn: { ears: "pointy", snout: true },
  dragon: { ears: "pointy", snout: true },
};

const SoftToyEars = ({
  ears,
  colour,
}: {
  ears: SoftToyShape["ears"];
  colour: string;
}) => {
  const placeEar = (
    side: number,
    child: ReactNode,
    position: Vector,
    rotation?: Vector,
    scale?: Vector,
  ) => (
    <Part
      key={side}
      colour={colour}
      position={[side * position[0], position[1], position[2]]}
      rotation={
        rotation === undefined
          ? undefined
          : [rotation[0], rotation[1], side * rotation[2]]
      }
      scale={scale}
    >
      {child}
    </Part>
  );
  switch (ears) {
    case "long":
      return (
        <>
          {[-1, 1].map((side) =>
            placeEar(
              side,
              ball(0.05),
              [0.07, 0.68, 0],
              [0, 0, -0.15],
              [1, 3, 0.7],
            ),
          )}
        </>
      );
    case "pointy":
      return (
        <>
          {[-1, 1].map((side) =>
            placeEar(side, cone(0.05, 0.1, 6), [0.09, 0.62, 0], [0, 0, -0.3]),
          )}
        </>
      );
    case "floppy":
      return (
        <>
          {[-1, 1].map((side) =>
            placeEar(
              side,
              ball(0.06),
              [0.15, 0.45, 0],
              undefined,
              [0.6, 1.4, 0.8],
            ),
          )}
        </>
      );
    case "big":
      return (
        <>
          {[-1, 1].map((side) =>
            placeEar(
              side,
              ball(0.11),
              [0.17, 0.5, -0.02],
              undefined,
              [1, 1.2, 0.3],
            ),
          )}
        </>
      );
    case "none":
      return null;
    case "round":
      return (
        <>{[-1, 1].map((side) => placeEar(side, ball(0.05), [0.11, 0.6, 0]))}</>
      );
  }
};

const SoftToyAnimal = ({
  model,
  colour,
}: {
  model: string;
  colour: string;
}) => {
  const shape = softToyShapes[model] ?? { ears: "round", snout: true };
  const bellyColour =
    model === "penguin" ? partColours.white : shadeColour(colour, 0.35);
  return (
    <>
      <Part colour={colour} position={[0, 0.2, 0]} scale={[1, 1.05, 0.9]}>
        {ball(0.2)}
      </Part>
      <Part colour={bellyColour} position={[0, 0.2, 0.1]} scale={[1, 1.1, 0.5]}>
        {ball(0.14)}
      </Part>
      {[-1, 1].map((side) => (
        <Part
          key={side}
          colour={colour}
          position={[side * 0.1, 0.06, 0.13]}
          scale={[1, 0.8, 1.3]}
        >
          {ball(0.07)}
        </Part>
      ))}
      <Part colour={colour} position={[0, 0.47, 0]}>
        {ball(0.16)}
      </Part>
      <SoftToyEars ears={shape.ears} colour={colour} />
      {[-1, 1].map((side) => (
        <Part
          key={side}
          colour={partColours.ink}
          position={[side * 0.06, 0.5, 0.14]}
        >
          {ball(0.022)}
        </Part>
      ))}
      {shape.snout ? (
        <Part
          colour={bellyColour}
          position={[0, 0.43, 0.14]}
          scale={[1.2, 0.9, 0.8]}
        >
          {ball(0.06)}
        </Part>
      ) : null}
      {model === "penguin" ? (
        <Part
          colour={partColours.flame}
          position={[0, 0.44, 0.16]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          {cone(0.03, 0.07, 6)}
        </Part>
      ) : null}
      {model === "elephant" ? (
        <Part colour={colour} position={[0, 0.34, 0.16]} rotation={[0.3, 0, 0]}>
          {cylinder(0.03, 0.04, 0.2, 8)}
        </Part>
      ) : null}
      {model === "unicorn" ? (
        <Part
          colour={partColours.gold}
          position={[0, 0.66, 0.05]}
          rotation={[0.3, 0, 0]}
        >
          {cone(0.025, 0.14, 8)}
        </Part>
      ) : null}
      {model === "dragon"
        ? [-1, 1].map((side) => (
            <Part
              key={side}
              colour={shadeColour(colour, -0.2)}
              position={[side * 0.2, 0.3, -0.12]}
              rotation={[0, 0, side * -1]}
              scale={[1, 1, 0.2]}
            >
              {cone(0.1, 0.22, 3)}
            </Part>
          ))
        : null}
    </>
  );
};

const Octopus = ({ colour }: { colour: string }) => (
  <>
    <Part colour={colour} position={[0, 0.32, 0]} scale={[1, 1.1, 1]}>
      {ball(0.2)}
    </Part>
    {Array.from({ length: 8 }, (_, index) => {
      const angle = (index / 8) * Math.PI * 2;
      return (
        <Part
          key={index}
          colour={shadeColour(colour, -0.1)}
          position={[Math.cos(angle) * 0.2, 0.05, Math.sin(angle) * 0.2]}
          rotation={[0, -angle, Math.PI / 2]}
        >
          {cylinder(0.035, 0.025, 0.2, 6)}
        </Part>
      );
    })}
    {[-1, 1].map((side) => (
      <Part
        key={side}
        colour={partColours.ink}
        position={[side * 0.07, 0.34, 0.18]}
      >
        {ball(0.025)}
      </Part>
    ))}
  </>
);

const Dinosaur = ({ colour }: { colour: string }) => (
  <>
    <Part colour={colour} position={[0, 0.2, 0]} scale={[0.9, 1, 1.3]}>
      {ball(0.2)}
    </Part>
    <Part colour={colour} position={[0, 0.42, 0.15]}>
      {ball(0.13)}
    </Part>
    <Part colour={colour} position={[0, 0.12, -0.3]} rotation={[-1.9, 0, 0]}>
      {cone(0.08, 0.3, 8)}
    </Part>
    {[0.15, 0.03, -0.1].map((z) => (
      <Part
        key={z}
        colour={partColours.gold}
        position={[0, 0.4 - Math.abs(z) * 0.4, z]}
      >
        {cone(0.035, 0.08, 4)}
      </Part>
    ))}
    {[-1, 1].map((side) => (
      <Part
        key={side}
        colour={partColours.ink}
        position={[side * 0.06, 0.46, 0.26]}
      >
        {ball(0.02)}
      </Part>
    ))}
  </>
);

export const SoftToy = ({
  model,
  colour,
}: {
  model: string;
  colour: string;
}) => {
  switch (model) {
    case "octopus":
      return <Octopus colour={colour} />;
    case "dinosaur":
      return <Dinosaur colour={colour} />;
    default:
      return <SoftToyAnimal model={model} colour={colour} />;
  }
};

const Stand = ({ height }: { height: number }) => (
  <>
    <Part colour={partColours.ink} position={[0, height / 2, 0]}>
      {cylinder(0.02, 0.02, height, 6)}
    </Part>
    <Part colour={partColours.ink} position={[0, 0.02, 0]}>
      {cylinder(0.18, 0.18, 0.03, 10)}
    </Part>
  </>
);

const StringedBody = ({ colour, scale }: { colour: string; scale: number }) => (
  <group scale={scale}>
    <Part colour={colour} position={[0, 0.25, 0]} scale={[1, 1, 0.35]}>
      {ball(0.2)}
    </Part>
    <Part colour={colour} position={[0, 0.5, 0]} scale={[0.85, 0.8, 0.35]}>
      {ball(0.16)}
    </Part>
    <Part
      colour={partColours.ink}
      position={[0, 0.32, 0.07]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      {cylinder(0.05, 0.05, 0.01, 12)}
    </Part>
    <Part colour={partColours.wood} position={[0, 0.9, 0]}>
      {box(0.06, 0.6, 0.04)}
    </Part>
    <Part colour={shadeColour(colour, -0.3)} position={[0, 1.25, 0]}>
      {box(0.1, 0.14, 0.04)}
    </Part>
  </group>
);

export const Instrument = ({
  model,
  colour,
}: {
  model: string;
  colour: string;
}) => {
  switch (model) {
    case "xylophone":
      return (
        <>
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={partColours.wood}
              position={[0, 0.28, side * 0.15]}
              rotation={[0, side * 0.1, 0]}
            >
              {box(0.9, 0.04, 0.04)}
            </Part>
          ))}
          {[-0.4, 0.4].flatMap((x) =>
            [-0.15, 0.15].map((z) => (
              <Part
                key={`${String(x)}-${String(z)}`}
                colour={partColours.wood}
                position={[x, 0.13, z]}
              >
                {box(0.04, 0.26, 0.04)}
              </Part>
            )),
          )}
          {toyColours.concat(colour).map((barColour, index) => (
            <Part
              key={barColour}
              colour={barColour}
              position={[-0.35 + index * 0.14, 0.32, 0]}
            >
              {box(0.11, 0.03, 0.42 - index * 0.04)}
            </Part>
          ))}
        </>
      );
    case "tambourine":
      return (
        <>
          <Stand height={0.6} />
          <group position={[0, 0.75, 0]} rotation={[Math.PI / 2 - 0.3, 0, 0]}>
            <Part colour={colour}>{cylinder(0.2, 0.2, 0.06, 20)}</Part>
            <Part colour={ivoryColour} position={[0, 0.032, 0]}>
              {cylinder(0.18, 0.18, 0.01, 20)}
            </Part>
          </group>
          {[0, 1, 2, 3, 4].map((step) => {
            const angle = (step / 5) * Math.PI * 2;
            return (
              <Part
                key={step}
                colour={partColours.gold}
                position={[
                  Math.cos(angle) * 0.2,
                  0.75 + Math.sin(angle) * 0.19,
                  0.06,
                ]}
              >
                {cylinder(0.03, 0.03, 0.02, 10)}
              </Part>
            );
          })}
        </>
      );
    case "trumpet":
      return (
        <>
          <Stand height={0.7} />
          <group position={[0, 0.8, 0]}>
            <Part colour={colour} rotation={[0, 0, Math.PI / 2]}>
              {cylinder(0.025, 0.025, 0.5, 10)}
            </Part>
            <Part
              colour={colour}
              position={[0.32, 0, 0]}
              rotation={[0, 0, -Math.PI / 2]}
            >
              {cone(0.1, 0.18, 16)}
            </Part>
            {[-0.06, 0, 0.06].map((x) => (
              <Part key={x} colour={partColours.steel} position={[x, 0.06, 0]}>
                {cylinder(0.018, 0.018, 0.1, 8)}
              </Part>
            ))}
          </group>
        </>
      );
    case "guitar":
    case "cello":
      return (
        <group rotation={[-0.15, 0, 0]}>
          <StringedBody colour={colour} scale={model === "cello" ? 1.3 : 0.9} />
        </group>
      );
    case "keyboard":
      return (
        <>
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={partColours.ink}
              position={[side * 0.3, 0.32, 0]}
              rotation={[0, 0, side * 0.5]}
            >
              {box(0.04, 0.72, 0.04)}
            </Part>
          ))}
          <Part colour={colour} position={[0, 0.66, 0]}>
            {box(1, 0.08, 0.3)}
          </Part>
          <Part colour={partColours.white} position={[0, 0.71, 0.05]}>
            {box(0.92, 0.02, 0.16)}
          </Part>
          {Array.from({ length: 7 }, (_, index) => (
            <Part
              key={index}
              colour={partColours.ink}
              position={[-0.39 + index * 0.13, 0.725, 0.02]}
            >
              {box(0.05, 0.02, 0.09)}
            </Part>
          ))}
        </>
      );
    case "drum-kit":
      return (
        <>
          <Part
            colour={colour}
            position={[0, 0.3, -0.1]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {cylinder(0.3, 0.3, 0.3, 20)}
          </Part>
          <Part
            colour={ivoryColour}
            position={[0, 0.3, 0.06]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {cylinder(0.27, 0.27, 0.01, 20)}
          </Part>
          {[-0.25, 0.25].map((x) => (
            <Part
              key={x}
              colour={colour}
              position={[x, 0.7, 0]}
              rotation={[0.3, 0, 0]}
            >
              {cylinder(0.14, 0.14, 0.14, 16)}
            </Part>
          ))}
          <Part colour={partColours.steel} position={[0.55, 0.45, 0.1]}>
            {cylinder(0.015, 0.015, 0.9, 6)}
          </Part>
          <Part
            colour={partColours.gold}
            position={[0.55, 0.9, 0.1]}
            rotation={[0.2, 0, 0]}
          >
            {cylinder(0.2, 0.2, 0.01, 20)}
          </Part>
        </>
      );
    case "harp":
      return (
        <>
          <Part colour={colour} position={[0, 0.05, 0]}>
            {box(0.5, 0.1, 0.25)}
          </Part>
          <Part colour={colour} position={[-0.2, 0.65, 0]}>
            {cylinder(0.04, 0.05, 1.2, 10)}
          </Part>
          <Part
            colour={colour}
            position={[0.05, 1.05, 0]}
            rotation={[0, 0, -0.4]}
          >
            {ring(0.3, 0.03, Math.PI * 0.8)}
          </Part>
          <Part
            colour={colour}
            position={[0.12, 0.5, 0]}
            rotation={[0, 0, 0.35]}
          >
            {box(0.08, 0.95, 0.1)}
          </Part>
          {Array.from({ length: 5 }, (_, index) => (
            <Part
              key={index}
              colour={stringColour}
              position={[-0.13 + index * 0.06, 0.55 + index * 0.04, 0]}
            >
              {cylinder(0.005, 0.005, 0.8 - index * 0.1, 4)}
            </Part>
          ))}
        </>
      );
    case "piano":
      return (
        <>
          <Part colour={colour} position={[0, 0.6, -0.12]}>
            {box(1.2, 1.2, 0.35)}
          </Part>
          <Part colour={colour} position={[0, 0.65, 0.12]}>
            {box(1.2, 0.08, 0.3)}
          </Part>
          <Part colour={partColours.white} position={[0, 0.7, 0.14]}>
            {box(1.1, 0.03, 0.2)}
          </Part>
          {Array.from({ length: 8 }, (_, index) => (
            <Part
              key={index}
              colour={partColours.ink}
              position={[-0.47 + index * 0.135, 0.725, 0.1]}
            >
              {box(0.05, 0.02, 0.11)}
            </Part>
          ))}
          {[-0.5, 0.5].map((x) => (
            <Part key={x} colour={colour} position={[x, 0.3, 0.2]}>
              {box(0.08, 0.6, 0.08)}
            </Part>
          ))}
        </>
      );
    default:
      return (
        <>
          <Part colour={colour} position={[0, 0.22, 0]}>
            {cylinder(0.25, 0.25, 0.4, 20)}
          </Part>
          <Part colour={ivoryColour} position={[0, 0.425, 0]}>
            {cylinder(0.24, 0.24, 0.02, 20)}
          </Part>
          {[0.05, 0.38].map((y) => (
            <Part key={y} colour={partColours.gold} position={[0, y, 0]}>
              {cylinder(0.26, 0.26, 0.03, 20)}
            </Part>
          ))}
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * 0.08, 0.48, 0.05]}
              rotation={[0, 0, side * 0.5]}
            >
              <Part colour={partColours.wood}>
                {cylinder(0.012, 0.012, 0.3, 6)}
              </Part>
              <Part colour={partColours.white} position={[0, 0.15, 0]}>
                {ball(0.025)}
              </Part>
            </group>
          ))}
        </>
      );
  }
};
