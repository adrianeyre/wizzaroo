import type { FurnitureSlot } from "../../curriculum/catalogue.js";
import {
  ball,
  ballSlice,
  box,
  cone,
  cylinder,
  HeartShape,
  Part,
  partColours,
  ring,
  shadeColour,
  StarShape,
} from "./character-parts.js";
import { Clock, FishTank } from "./room-clock-and-fish-tank.js";
import { Desk, Seat } from "./room-desk-and-seat.js";
import { Instrument, SoftToy, ToyBox } from "./room-toys.js";

export interface FurnitureLook {
  slot: FurnitureSlot;
  model: string;
  colour: string;
}

export const wallWidth = 6;
export const wallHeight = 3.2;

const mattressColour = "#f7f3ea";
const pillowColour = "#ffffff";
const potColour = "#c4683b";
const skyColour = "#bfe6ff";
const bookColours = ["#e8312e", "#3fa0ff", "#f2c530", "#3f9d5a", "#7a3fc4"];
const paneColours = ["#e8312e", "#3fa0ff", "#f2c530", "#3f9d5a"];
const rainbowColours = [
  "#e8312e",
  "#ff9a1f",
  "#f2c530",
  "#3f9d5a",
  "#3fa0ff",
  "#7a3fc4",
];

const BedFrame = ({ colour }: { colour: string }) => (
  <>
    <Part colour={colour} position={[0, 0.2, 0]}>
      {box(1.1, 0.25, 1.9)}
    </Part>
    <Part colour={mattressColour} position={[0, 0.4, 0.05]}>
      {box(1, 0.16, 1.75)}
    </Part>
    <Part colour={pillowColour} position={[0, 0.53, -0.62]}>
      {box(0.7, 0.12, 0.35)}
    </Part>
    <Part colour={shadeColour(colour, 0.3)} position={[0, 0.5, 0.35]}>
      {box(1.04, 0.06, 1.05)}
    </Part>
  </>
);

const Bed = ({ model, colour }: { model: string; colour: string }) => {
  switch (model) {
    case "bunk":
      return (
        <>
          <BedFrame colour={colour} />
          <group position={[0, 0.95, 0]}>
            <BedFrame colour={colour} />
          </group>
          {[-0.53, 0.53].flatMap((x) =>
            [-0.92, 0.92].map((z) => (
              <Part
                key={`${String(x)}-${String(z)}`}
                colour={shadeColour(colour, -0.2)}
                position={[x, 0.85, z]}
              >
                {box(0.08, 1.7, 0.08)}
              </Part>
            )),
          )}
        </>
      );
    case "canopy":
      return (
        <>
          <BedFrame colour={colour} />
          {[-0.53, 0.53].flatMap((x) =>
            [-0.92, 0.92].map((z) => (
              <Part
                key={`${String(x)}-${String(z)}`}
                colour={partColours.gold}
                position={[x, 0.9, z]}
              >
                {cylinder(0.03, 0.03, 1.8, 8)}
              </Part>
            )),
          )}
          <Part colour={colour} position={[0, 1.9, 0]} scale={[1.15, 1, 2]}>
            {cone(0.6, 0.4, 4)}
          </Part>
        </>
      );
    case "hammock":
      return (
        <>
          {[-0.95, 0.95].map((z) => (
            <Part key={z} colour={partColours.wood} position={[0, 0.6, z]}>
              {cylinder(0.05, 0.06, 1.2, 8)}
            </Part>
          ))}
          <Part
            colour={colour}
            position={[0, 0.95, 0]}
            rotation={[0, Math.PI / 2, Math.PI]}
            scale={[1, 0.5, 4]}
          >
            {ring(0.9, 0.08, Math.PI)}
          </Part>
        </>
      );
    case "rocket":
      return (
        <>
          <Part
            colour={colour}
            position={[0, 0.45, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {cylinder(0.5, 0.5, 1.5, 16)}
          </Part>
          <Part
            colour={partColours.steel}
            position={[0, 0.45, -1.05]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            {cone(0.5, 0.6, 16)}
          </Part>
          <Part colour={mattressColour} position={[0, 0.9, 0.1]}>
            {box(0.8, 0.12, 1.2)}
          </Part>
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={partColours.flame}
              position={[side * 0.55, 0.3, 0.7]}
            >
              {box(0.15, 0.5, 0.4)}
            </Part>
          ))}
        </>
      );
    case "castle":
      return (
        <>
          <BedFrame colour={colour} />
          <Part colour={colour} position={[0, 0.8, -0.95]}>
            {box(1.2, 1, 0.12)}
          </Part>
          {[-0.45, -0.15, 0.15, 0.45].map((x) => (
            <Part key={x} colour={colour} position={[x, 1.38, -0.95]}>
              {box(0.18, 0.16, 0.12)}
            </Part>
          ))}
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.62, 0, -0.95]}>
              <Part colour={colour} position={[0, 0.75, 0]}>
                {cylinder(0.14, 0.14, 1.5, 12)}
              </Part>
              <Part colour={partColours.red} position={[0, 1.65, 0]}>
                {cone(0.18, 0.35, 12)}
              </Part>
            </group>
          ))}
        </>
      );
    case "boat":
      return (
        <>
          <BedFrame colour={colour} />
          {[-1, 1].map((side) => (
            <Part key={side} colour={colour} position={[side * 0.6, 0.35, 0]}>
              {box(0.1, 0.5, 1.95)}
            </Part>
          ))}
          <Part colour={colour} position={[0, 0.45, -1]}>
            {box(1.3, 0.7, 0.1)}
          </Part>
          <Part
            colour={colour}
            position={[0, 0.35, 1.05]}
            rotation={[0, Math.PI / 4, 0]}
          >
            {box(0.85, 0.5, 0.85)}
          </Part>
          <Part colour={partColours.white} position={[0, 0.28, 0]}>
            {box(1.32, 0.06, 1.9)}
          </Part>
          <Part colour={partColours.wood} position={[0, 1.2, 1.15]}>
            {cylinder(0.03, 0.03, 1.6, 8)}
          </Part>
          <Part
            colour={partColours.white}
            position={[0, 1.25, 1.15]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[0.15, 1, 1]}
          >
            {cone(0.4, 0.9, 3)}
          </Part>
        </>
      );
    case "cloud":
      return (
        <>
          <BedFrame colour={colour} />
          {[-0.55, 0.55].flatMap((x) =>
            [-0.8, -0.25, 0.3, 0.85].map((z) => (
              <Part
                key={`${String(x)}-${String(z)}`}
                colour={partColours.white}
                position={[x, 0.25, z]}
              >
                {ball(0.28)}
              </Part>
            )),
          )}
          {[-0.35, 0, 0.35].map((x) => (
            <Part
              key={x}
              colour={partColours.white}
              position={[x, x === 0 ? 0.85 : 0.7, -0.95]}
            >
              {ball(0.3)}
            </Part>
          ))}
        </>
      );
    case "race-car":
      return (
        <>
          <Part colour={colour} position={[0, 0.32, 0]}>
            {box(1.2, 0.45, 2)}
          </Part>
          <Part colour={mattressColour} position={[0, 0.6, -0.1]}>
            {box(0.9, 0.14, 1.4)}
          </Part>
          <Part colour={pillowColour} position={[0, 0.72, -0.62]}>
            {box(0.6, 0.1, 0.3)}
          </Part>
          <Part colour={partColours.white} position={[0, 0.56, 0.85]}>
            {box(0.3, 0.02, 0.3)}
          </Part>
          {[-1, 1].flatMap((side) =>
            [-0.65, 0.65].map((z) => (
              <Part
                key={`${String(side)}-${String(z)}`}
                colour={partColours.ink}
                position={[side * 0.62, 0.25, z]}
                rotation={[0, 0, Math.PI / 2]}
              >
                {cylinder(0.25, 0.25, 0.14, 16)}
              </Part>
            )),
          )}
          <Part colour={shadeColour(colour, -0.25)} position={[0, 0.85, 0.95]}>
            {box(1.3, 0.06, 0.3)}
          </Part>
          {[-0.45, 0.45].map((x) => (
            <Part key={x} colour={partColours.ink} position={[x, 0.68, 0.95]}>
              {box(0.06, 0.3, 0.06)}
            </Part>
          ))}
        </>
      );
    case "dragon":
      return (
        <>
          <BedFrame colour={colour} />
          <Part colour={colour} position={[0, 0.65, -0.95]}>
            {box(1.1, 0.75, 0.1)}
          </Part>
          <Part colour={colour} position={[0, 1.2, -0.9]} scale={[1, 0.9, 1.2]}>
            {ball(0.26)}
          </Part>
          {[-1, 1].flatMap((side) => [
            <Part
              key={`eye${String(side)}`}
              colour={partColours.gold}
              position={[side * 0.1, 1.27, -0.66]}
            >
              {ball(0.05)}
            </Part>,
            <Part
              key={`horn${String(side)}`}
              colour={partColours.gold}
              position={[side * 0.14, 1.48, -0.92]}
              rotation={[0, 0, side * -0.4]}
            >
              {cone(0.05, 0.22, 8)}
            </Part>,
            <Part
              key={`wing${String(side)}`}
              colour={shadeColour(colour, -0.2)}
              position={[side * 0.75, 0.95, -0.9]}
              rotation={[0, 0, side * -0.9]}
              scale={[1, 1, 0.12]}
            >
              {cone(0.35, 0.7, 3)}
            </Part>,
          ])}
          <Part
            colour={colour}
            position={[0, 0.3, 1.15]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            {cone(0.12, 0.5, 10)}
          </Part>
        </>
      );
    default:
      return (
        <>
          <BedFrame colour={colour} />
          <Part colour={colour} position={[0, 0.65, -0.95]}>
            {box(1.1, 0.75, 0.1)}
          </Part>
        </>
      );
  }
};

const bedTopHeights: Partial<Record<string, number>> = {
  rocket: 0.96,
  "race-car": 0.67,
  hammock: 0.55,
};

export const findBedTopHeight = (model: string): number =>
  bedTopHeights[model] ?? 0.48;

const flatRugHeight = 0.02;

const Rug = ({ model, colour }: { model: string; colour: string }) => {
  switch (model) {
    case "striped":
      return (
        <>
          {[-0.6, -0.3, 0, 0.3, 0.6].map((z, index) => (
            <Part
              key={z}
              colour={index % 2 === 0 ? colour : partColours.white}
              position={[0, flatRugHeight, z]}
            >
              {box(2.2, 0.02, 0.3)}
            </Part>
          ))}
        </>
      );
    case "star":
      return (
        <group rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.05]}>
          <StarShape colour={colour} position={[0, 0, 0]} size={1} />
        </group>
      );
    case "rainbow":
      return (
        <>
          {rainbowColours.map((ringColour, index) => (
            <Part
              key={ringColour}
              colour={ringColour}
              position={[0, flatRugHeight + index * 0.004, 0]}
            >
              {cylinder(1.1 - index * 0.16, 1.1 - index * 0.16, 0.02, 32)}
            </Part>
          ))}
        </>
      );
    case "moon":
      return (
        <Part
          colour={colour}
          position={[0, flatRugHeight, 0]}
          rotation={[Math.PI / 2, 0, 0.6]}
          scale={[1, 1, 0.05]}
        >
          {ring(0.75, 0.3, Math.PI * 1.3)}
        </Part>
      );
    case "map":
      return (
        <>
          <Part colour={colour} position={[0, flatRugHeight, 0]}>
            {box(2, 0.02, 1.4)}
          </Part>
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={partColours.red}
              position={[0.4, flatRugHeight + 0.01, 0.2]}
              rotation={[0, side * (Math.PI / 4), 0]}
            >
              {box(0.4, 0.02, 0.08)}
            </Part>
          ))}
          {[-0.5, -0.2, 0.1].map((x) => (
            <Part
              key={x}
              colour={partColours.ink}
              position={[x, flatRugHeight + 0.01, -0.25 + x * 0.3]}
            >
              {box(0.15, 0.02, 0.04)}
            </Part>
          ))}
        </>
      );
    case "heart":
      return (
        <group
          position={[0, flatRugHeight, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1, 1, 0.03]}
        >
          <HeartShape colour={colour} position={[0, -0.2, 0]} size={1} />
        </group>
      );
    case "flower":
      return (
        <>
          {Array.from({ length: 6 }, (_, index) => {
            const angle = (index / 6) * Math.PI * 2;
            return (
              <Part
                key={index}
                colour={colour}
                position={[
                  Math.cos(angle) * 0.62,
                  flatRugHeight,
                  Math.sin(angle) * 0.62,
                ]}
              >
                {cylinder(0.42, 0.42, 0.02, 24)}
              </Part>
            );
          })}
          <Part
            colour={partColours.gold}
            position={[0, flatRugHeight + 0.005, 0]}
          >
            {cylinder(0.42, 0.42, 0.02, 24)}
          </Part>
        </>
      );
    case "checkers":
      return (
        <>
          <Part colour={partColours.white} position={[0, flatRugHeight, 0]}>
            {box(2, 0.02, 1.34)}
          </Part>
          {Array.from({ length: 12 }, (_, index) => {
            const row = Math.floor(index / 3);
            const column = (index % 3) * 2 + (row % 2);
            return (
              <Part
                key={index}
                colour={colour}
                position={[
                  -0.835 + column * 0.334,
                  flatRugHeight + 0.005,
                  -0.5 + row * 0.334,
                ]}
              >
                {box(0.334, 0.02, 0.334)}
              </Part>
            );
          })}
        </>
      );
    case "paw":
      return (
        <>
          <Part
            colour={colour}
            position={[0, flatRugHeight, 0]}
            scale={[1, 1, 0.75]}
          >
            {cylinder(1.1, 1.1, 0.02, 32)}
          </Part>
          <Part
            colour={shadeColour(colour, 0.55)}
            position={[0, flatRugHeight + 0.005, 0.15]}
            scale={[1.2, 1, 1]}
          >
            {cylinder(0.3, 0.3, 0.02, 24)}
          </Part>
          {[-0.45, -0.16, 0.16, 0.45].map((x) => (
            <Part
              key={x}
              colour={shadeColour(colour, 0.55)}
              position={[
                x,
                flatRugHeight + 0.005,
                Math.abs(x) > 0.3 ? -0.25 : -0.38,
              ]}
            >
              {cylinder(0.12, 0.12, 0.02, 16)}
            </Part>
          ))}
        </>
      );
    default:
      return (
        <>
          <Part colour={colour} position={[0, flatRugHeight, 0]}>
            {cylinder(1.1, 1.1, 0.02, 32)}
          </Part>
          <Part
            colour={shadeColour(colour, 0.35)}
            position={[0, flatRugHeight + 0.005, 0]}
          >
            {cylinder(0.7, 0.7, 0.02, 32)}
          </Part>
        </>
      );
  }
};

const patternSpacing = 0.6;
const brickHeight = 0.3;

const listPatternSpots = (width: number, height: number) =>
  Array.from(
    { length: Math.floor(width / patternSpacing) },
    (_, column) => column,
  ).flatMap((column) =>
    Array.from(
      { length: Math.floor(height / patternSpacing) },
      (_, row) => row,
    ).map((row) => ({
      key: `${String(column)}-${String(row)}`,
      x: -width / 2 + patternSpacing / 2 + column * patternSpacing,
      y: patternSpacing / 2 + row * patternSpacing,
      isOdd: (column + row) % 2 === 1,
    })),
  );

export const WallpaperPanel = ({
  model,
  colour,
  width,
  height,
}: {
  model: string;
  colour: string;
  width: number;
  height: number;
}) => {
  const patternColour = shadeColour(colour, model === "stars" ? 0.6 : -0.12);
  const spots = listPatternSpots(width, height);
  const pattern = (() => {
    switch (model) {
      case "stripes":
        return spots
          .filter(({ y }) => y === patternSpacing / 2)
          .map(({ key, x }) => (
            <Part
              key={key}
              colour={patternColour}
              position={[x, height / 2, 0.06]}
            >
              {box(0.18, height, 0.01)}
            </Part>
          ));
      case "dots":
        return spots.map(({ key, x, y, isOdd }) => (
          <Part
            key={key}
            colour={isOdd ? patternColour : partColours.white}
            position={[x, y, 0.06]}
            scale={[1, 1, 0.1]}
          >
            {ball(0.07)}
          </Part>
        ));
      case "stars":
        return spots
          .filter(({ isOdd }) => isOdd)
          .map(({ key, x, y }) => (
            <StarShape
              key={key}
              colour={partColours.gold}
              position={[x, y, 0.06]}
              size={0.07}
            />
          ));
      case "forest":
        return spots
          .filter(({ y }) => y < 1.5)
          .map(({ key, x, y, isOdd }) => (
            <Part
              key={key}
              colour={isOdd ? patternColour : shadeColour(colour, -0.3)}
              position={[x, y + 0.1, 0.06]}
              scale={[1, 1, 0.1]}
            >
              {cone(0.24, 0.6, 8)}
            </Part>
          ));
      case "ocean":
        return spots
          .filter(({ isOdd }) => isOdd)
          .map(({ key, x, y }) => (
            <Part
              key={key}
              colour={partColours.white}
              position={[x, y, 0.06]}
              scale={[1, 1, 0.1]}
            >
              {ring(0.12, 0.025, Math.PI)}
            </Part>
          ));
      case "hearts":
        return spots
          .filter(({ isOdd }) => isOdd)
          .map(({ key, x, y }) => (
            <group key={key} scale={[1, 1, 0.2]}>
              <HeartShape
                colour={shadeColour(colour, -0.3)}
                position={[x, y, 0.3]}
                size={0.08}
              />
            </group>
          ));
      case "clouds":
        return spots
          .filter(({ isOdd }) => isOdd)
          .map(({ key, x, y }) => (
            <Part
              key={key}
              colour={partColours.white}
              position={[x, y, 0.06]}
              scale={[1.7, 1, 0.1]}
            >
              {ball(0.11)}
            </Part>
          ));
      case "bricks":
        return [
          ...Array.from(
            { length: Math.floor(height / brickHeight) },
            (_, row) => (
              <Part
                key={`row-${String(row)}`}
                colour={partColours.white}
                position={[0, (row + 1) * brickHeight, 0.055]}
              >
                {box(width, 0.03, 0.01)}
              </Part>
            ),
          ),
          ...spots
            .filter(({ isOdd }) => isOdd)
            .map(({ key, x, y }) => (
              <Part
                key={key}
                colour={partColours.white}
                position={[x, y, 0.055]}
              >
                {box(0.03, brickHeight, 0.01)}
              </Part>
            )),
        ];
      case "space":
        return spots.map(({ key, x, y, isOdd }, index) =>
          isOdd ? (
            <StarShape
              key={key}
              colour={partColours.white}
              position={[x, y, 0.06]}
              size={0.045}
            />
          ) : index % 5 === 0 ? (
            <Part
              key={key}
              colour={rainbowColours[index % rainbowColours.length]}
              position={[x, y, 0.06]}
              scale={[1, 1, 0.2]}
            >
              {ball(0.1)}
            </Part>
          ) : null,
        );
      default:
        return null;
    }
  })();
  return (
    <group name="wallpaper">
      <Part colour={colour} position={[0, height / 2, 0]}>
        {box(width, height, 0.1)}
      </Part>
      {pattern}
    </group>
  );
};

const PictureMotif = ({ model, colour }: { model: string; colour: string }) => {
  switch (model) {
    case "boat":
      return (
        <>
          <Part colour={partColours.wood} position={[0, -0.12, 0]}>
            {box(0.4, 0.1, 0.02)}
          </Part>
          <Part
            colour={partColours.white}
            position={[0, 0.06, 0]}
            scale={[1, 1, 0.1]}
          >
            {cone(0.14, 0.26, 3)}
          </Part>
        </>
      );
    case "castle":
      return (
        <>
          <Part colour={partColours.steel} position={[0, -0.05, 0]}>
            {box(0.36, 0.26, 0.02)}
          </Part>
          {[-0.15, 0.15].map((x) => (
            <Part
              key={x}
              colour={partColours.red}
              position={[x, 0.15, 0]}
              scale={[1, 1, 0.1]}
            >
              {cone(0.07, 0.16, 6)}
            </Part>
          ))}
        </>
      );
    case "rocket":
      return (
        <>
          <Part
            colour={partColours.white}
            position={[0, -0.02, 0]}
            scale={[1, 1, 0.2]}
          >
            {cylinder(0.07, 0.07, 0.26, 10)}
          </Part>
          <Part colour={colour} position={[0, 0.16, 0]} scale={[1, 1, 0.2]}>
            {cone(0.07, 0.12, 10)}
          </Part>
        </>
      );
    case "dinosaur":
      return (
        <>
          <Part colour={colour} position={[0, -0.05, 0]} scale={[1.6, 1, 0.2]}>
            {ball(0.12)}
          </Part>
          <Part colour={colour} position={[0.17, 0.08, 0]} scale={[1, 1, 0.2]}>
            {ball(0.07)}
          </Part>
        </>
      );
    case "rainbow":
      return (
        <>
          {rainbowColours.slice(0, 4).map((arcColour, index) => (
            <Part key={arcColour} colour={arcColour} position={[0, -0.12, 0]}>
              {ring(0.24 - index * 0.045, 0.02, Math.PI)}
            </Part>
          ))}
        </>
      );
    case "cat":
      return (
        <>
          <Part colour={colour} position={[0, -0.04, 0]} scale={[1, 0.9, 0.2]}>
            {ball(0.14)}
          </Part>
          {[-1, 1].flatMap((side) => [
            <Part
              key={`ear${String(side)}`}
              colour={colour}
              position={[side * 0.09, 0.12, 0]}
              scale={[1, 1, 0.2]}
            >
              {cone(0.05, 0.1, 4)}
            </Part>,
            <Part
              key={`eye${String(side)}`}
              colour={partColours.ink}
              position={[side * 0.05, -0.01, 0.03]}
            >
              {ball(0.018)}
            </Part>,
          ])}
        </>
      );
    case "whale":
      return (
        <>
          <Part
            colour={colour}
            position={[-0.03, -0.06, 0]}
            scale={[1.8, 1, 0.2]}
          >
            {ball(0.11)}
          </Part>
          <Part
            colour={colour}
            position={[0.2, -0.02, 0]}
            rotation={[0, 0, -Math.PI / 2]}
            scale={[1, 1, 0.2]}
          >
            {cone(0.07, 0.1, 3)}
          </Part>
          <Part colour={partColours.sky} position={[-0.08, 0.12, 0]}>
            {box(0.02, 0.1, 0.02)}
          </Part>
          <Part colour={partColours.ink} position={[-0.13, -0.04, 0.03]}>
            {ball(0.015)}
          </Part>
        </>
      );
    case "planet":
      return (
        <>
          <Part colour={colour} scale={[1, 1, 0.3]}>
            {ball(0.12)}
          </Part>
          <Part
            colour={partColours.gold}
            rotation={[0, 0, 0.3]}
            scale={[1, 0.35, 0.3]}
          >
            {ring(0.2, 0.02)}
          </Part>
          {[-0.2, 0.22].map((x) => (
            <StarShape
              key={x}
              colour={partColours.gold}
              position={[x, 0.15, 0]}
              size={0.03}
            />
          ))}
        </>
      );
    case "unicorn":
      return (
        <>
          <Part
            colour={partColours.white}
            position={[0, -0.05, 0]}
            scale={[0.8, 1.2, 0.2]}
          >
            {ball(0.12)}
          </Part>
          <Part
            colour={partColours.gold}
            position={[0.02, 0.15, 0]}
            rotation={[0, 0, -0.2]}
          >
            {cone(0.025, 0.14, 8)}
          </Part>
          {rainbowColours.slice(0, 3).map((maneColour, index) => (
            <Part
              key={maneColour}
              colour={index === 1 ? colour : maneColour}
              position={[-0.1, 0.06 - index * 0.07, 0]}
              scale={[1, 1, 0.2]}
            >
              {ball(0.04)}
            </Part>
          ))}
        </>
      );
    default:
      return (
        <>
          <Part colour={partColours.leaf} position={[0, -0.1, 0]}>
            {box(0.03, 0.22, 0.02)}
          </Part>
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (index / 8) * Math.PI * 2;
            return (
              <Part
                key={index}
                colour={colour}
                position={[
                  Math.cos(angle) * 0.1,
                  0.06 + Math.sin(angle) * 0.1,
                  0,
                ]}
                scale={[1, 1, 0.2]}
              >
                {ball(0.05)}
              </Part>
            );
          })}
          <Part
            colour={partColours.wood}
            position={[0, 0.06, 0.01]}
            scale={[1, 1, 0.2]}
          >
            {ball(0.06)}
          </Part>
        </>
      );
  }
};

const WallPicture = ({ model, colour }: { model: string; colour: string }) => (
  <>
    <Part colour={partColours.wood}>{box(0.8, 0.65, 0.06)}</Part>
    <Part colour={partColours.white} position={[0, 0, 0.035]}>
      {box(0.66, 0.51, 0.02)}
    </Part>
    <group position={[0, 0, 0.05]}>
      <PictureMotif model={model} colour={colour} />
    </group>
  </>
);

const Plank = ({ colour }: { colour: string }) => (
  <Part colour={colour} position={[0, -0.04, 0]}>
    {box(1.6, 0.08, 0.32)}
  </Part>
);

export const shelfRowGap = 0.5;

const Shelf = ({ model, colour }: { model: string; colour: string }) => {
  const planks = (
    <>
      <Plank colour={colour} />
      <group position={[0, shelfRowGap, 0]}>
        <Plank colour={colour} />
      </group>
    </>
  );
  switch (model) {
    case "bookcase":
      return (
        <>
          {planks}
          {[-1, 1].map((side) => (
            <Part key={side} colour={colour} position={[side * 0.82, 0.2, 0]}>
              {box(0.08, 1, 0.32)}
            </Part>
          ))}
          {bookColours.map((bookColour, index) => (
            <Part
              key={bookColour}
              colour={bookColour}
              position={[0.45 + index * 0.07, shelfRowGap + 0.13, 0]}
            >
              {box(0.06, 0.26, 0.22)}
            </Part>
          ))}
        </>
      );
    case "ladder":
      return (
        <>
          {planks}
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={shadeColour(colour, -0.2)}
              position={[side * 0.7, 0.1, 0.12]}
              rotation={[0.15, 0, 0]}
            >
              {box(0.06, 1.3, 0.06)}
            </Part>
          ))}
        </>
      );
    case "treasure":
      return (
        <>
          {planks}
          {[-0.75, 0.75].map((x) => (
            <Part key={x} colour={partColours.gold} position={[x, 0.02, 0.17]}>
              {ball(0.06)}
            </Part>
          ))}
          <Part colour={partColours.wood} position={[0, -0.18, 0]}>
            {box(1.5, 0.2, 0.3)}
          </Part>
        </>
      );
    case "crystal":
      return (
        <>
          <Part colour={colour} position={[0, -0.04, 0]} isGlassy>
            {box(1.6, 0.08, 0.32)}
          </Part>
          <Part colour={colour} position={[0, shelfRowGap - 0.04, 0]} isGlassy>
            {box(1.6, 0.08, 0.32)}
          </Part>
          {[-0.78, 0.78].map((x) => (
            <Part key={x} colour={colour} position={[x, -0.2, 0]}>
              <octahedronGeometry args={[0.12]} />
            </Part>
          ))}
        </>
      );
    case "cloud":
      return (
        <>
          {planks}
          {[-0.6, -0.2, 0.2, 0.6].map((x) => (
            <Part key={x} colour={partColours.white} position={[x, -0.12, 0]}>
              {ball(0.16)}
            </Part>
          ))}
        </>
      );
    case "tree":
      return (
        <>
          {planks}
          <Part colour={colour} position={[0, 0.1, -0.12]}>
            {box(0.14, 1.2, 0.06)}
          </Part>
          {[-0.7, 0.7, -0.4, 0.45].map((x, index) => (
            <Part
              key={x}
              colour={partColours.leaf}
              position={[x, index < 2 ? 0.75 : -0.15, -0.05]}
              scale={[1.3, 0.8, 0.6]}
            >
              {ball(0.16)}
            </Part>
          ))}
        </>
      );
    case "honeycomb":
      return (
        <>
          {planks}
          {[-0.55, 0, 0.55].map((x, index) => (
            <Part
              key={x}
              colour={index === 1 ? shadeColour(colour, -0.2) : colour}
              position={[x, shelfRowGap / 2, -0.1]}
              rotation={[Math.PI / 2, Math.PI / 6, 0]}
            >
              {cylinder(0.26, 0.26, 0.1, 6)}
            </Part>
          ))}
        </>
      );
    case "pirate":
      return (
        <>
          {planks}
          <Part colour={colour} position={[0, -0.2, 0]}>
            {box(1.5, 0.24, 0.3)}
          </Part>
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={colour}
              position={[side * 0.82, -0.12, 0]}
              rotation={[0, 0, side * 0.5]}
            >
              {box(0.2, 0.3, 0.3)}
            </Part>
          ))}
          <Part colour={partColours.wood} position={[-0.75, 0.75, -0.08]}>
            {cylinder(0.025, 0.025, 0.6, 8)}
          </Part>
          <Part colour={partColours.ink} position={[-0.68, 0.95, -0.08]}>
            {box(0.14, 0.1, 0.01)}
          </Part>
        </>
      );
    case "rainbow":
      return (
        <>
          {[0, shelfRowGap].map((y, index) => (
            <Part
              key={y}
              colour={rainbowColours[index * 3]}
              position={[0, y - 0.04, 0]}
            >
              {box(1.6, 0.08, 0.32)}
            </Part>
          ))}
          {rainbowColours.map((arcColour, index) => (
            <Part
              key={arcColour}
              colour={arcColour}
              position={[0, -0.06, -0.1]}
              rotation={[0, 0, Math.PI]}
            >
              {ring(0.4 - index * 0.05, 0.025, Math.PI)}
            </Part>
          ))}
        </>
      );
    default:
      return (
        <>
          {planks}
          {[-0.6, 0.6].map((x) => (
            <Part
              key={x}
              colour={partColours.steel}
              position={[x, -0.15, -0.08]}
            >
              {box(0.05, 0.22, 0.16)}
            </Part>
          ))}
        </>
      );
  }
};

const Lamp = ({ model, colour }: { model: string; colour: string }) => {
  switch (model) {
    case "lantern":
      return (
        <>
          <Part colour={partColours.ink} position={[0, 0.03, 0]}>
            {box(0.3, 0.06, 0.3)}
          </Part>
          <Part colour={colour} position={[0, 0.25, 0]} isGlassy>
            {box(0.24, 0.36, 0.24)}
          </Part>
          <Part colour={partColours.flame} position={[0, 0.22, 0]}>
            {ball(0.06)}
          </Part>
          <Part colour={partColours.ink} position={[0, 0.5, 0]}>
            {cone(0.2, 0.16, 4)}
          </Part>
        </>
      );
    case "mushroom":
      return (
        <>
          <Part colour={partColours.white} position={[0, 0.25, 0]}>
            {cylinder(0.08, 0.11, 0.5, 12)}
          </Part>
          <Part colour={colour} position={[0, 0.52, 0]} scale={[1, 0.65, 1]}>
            {ball(0.28)}
          </Part>
          {[0, 2, 4].map((step) => (
            <Part
              key={step}
              colour={partColours.white}
              position={[Math.cos(step) * 0.18, 0.62, Math.sin(step) * 0.18]}
            >
              {ball(0.045)}
            </Part>
          ))}
        </>
      );
    case "moon":
      return (
        <>
          <Part colour={partColours.steel} position={[0, 0.25, 0]}>
            {cylinder(0.02, 0.02, 0.5, 8)}
          </Part>
          <Part colour={partColours.steel} position={[0, 0.02, 0]}>
            {cylinder(0.14, 0.16, 0.04, 16)}
          </Part>
          <Part colour={colour} position={[0, 0.62, 0]} rotation={[0, 0, 0.8]}>
            {ring(0.16, 0.07, Math.PI * 1.3)}
          </Part>
        </>
      );
    case "lava":
      return (
        <>
          <Part colour={partColours.steel} position={[0, 0.1, 0]}>
            {cone(0.16, 0.2, 16)}
          </Part>
          <Part colour={colour} position={[0, 0.38, 0]} isGlassy>
            {cylinder(0.08, 0.13, 0.4, 16)}
          </Part>
          {[0.3, 0.42, 0.52].map((y) => (
            <Part key={y} colour={colour} position={[0, y, 0]}>
              {ball(0.05)}
            </Part>
          ))}
          <Part colour={partColours.steel} position={[0, 0.62, 0]}>
            {cone(0.08, 0.1, 16)}
          </Part>
        </>
      );
    case "star":
      return (
        <>
          <Part colour={partColours.steel} position={[0, 0.25, 0]}>
            {cylinder(0.02, 0.02, 0.5, 8)}
          </Part>
          <Part colour={partColours.steel} position={[0, 0.02, 0]}>
            {cylinder(0.14, 0.16, 0.04, 16)}
          </Part>
          <StarShape colour={colour} position={[0, 0.65, 0]} size={0.18} />
        </>
      );
    case "rocket":
      return (
        <>
          <Part colour={colour} position={[0, 0.3, 0]}>
            {cylinder(0.11, 0.13, 0.5, 16)}
          </Part>
          <Part colour={partColours.red} position={[0, 0.66, 0]}>
            {cone(0.11, 0.22, 16)}
          </Part>
          <Part colour={partColours.gold} position={[0, 0.38, 0.11]} isGlassy>
            {ball(0.05)}
          </Part>
          {[0, 1, 2].map((step) => {
            const angle = (step / 3) * Math.PI * 2;
            return (
              <Part
                key={step}
                colour={partColours.red}
                position={[Math.sin(angle) * 0.14, 0.1, Math.cos(angle) * 0.14]}
                rotation={[0, angle, 0]}
              >
                {box(0.02, 0.2, 0.1)}
              </Part>
            );
          })}
        </>
      );
    case "cloud":
      return (
        <>
          <Part colour={partColours.steel} position={[0, 0.02, 0]}>
            {cylinder(0.14, 0.16, 0.04, 16)}
          </Part>
          <Part colour={partColours.steel} position={[0, 0.25, 0]}>
            {cylinder(0.02, 0.02, 0.5, 8)}
          </Part>
          {[-0.14, 0, 0.14].map((x) => (
            <Part
              key={x}
              colour={colour}
              position={[x, x === 0 ? 0.66 : 0.6, 0]}
            >
              {ball(x === 0 ? 0.14 : 0.11)}
            </Part>
          ))}
        </>
      );
    case "jellyfish":
      return (
        <>
          <Part colour={partColours.steel} position={[0, 0.02, 0]}>
            {cylinder(0.14, 0.16, 0.04, 16)}
          </Part>
          {[-0.08, -0.03, 0.03, 0.08].map((x) => (
            <Part key={x} colour={colour} position={[x, 0.27, 0]}>
              {cylinder(0.012, 0.012, 0.46, 6)}
            </Part>
          ))}
          <Part colour={colour} position={[0, 0.5, 0]} isGlassy>
            {ballSlice(0.18, 0, 0.5)}
          </Part>
        </>
      );
    case "globe":
      return (
        <>
          <Part colour={partColours.wood} position={[0, 0.03, 0]}>
            {cylinder(0.13, 0.15, 0.06, 16)}
          </Part>
          <Part colour={partColours.wood} position={[0, 0.12, 0]}>
            {cylinder(0.02, 0.02, 0.14, 8)}
          </Part>
          <Part
            colour={partColours.gold}
            position={[0, 0.4, 0]}
            rotation={[0, Math.PI / 2, 0.4]}
          >
            {ring(0.23, 0.012, Math.PI * 1.2)}
          </Part>
          <Part colour={colour} position={[0, 0.4, 0]}>
            {ball(0.2)}
          </Part>
          {[0.6, 2.4, 4.2].map((angle) => (
            <Part
              key={angle}
              colour={partColours.leaf}
              position={[
                Math.cos(angle) * 0.13,
                0.42 + Math.sin(angle) * 0.08,
                Math.sin(angle) * 0.13,
              ]}
            >
              {ball(0.09)}
            </Part>
          ))}
        </>
      );
    default:
      return (
        <>
          <Part colour={partColours.steel} position={[0, 0.02, 0]}>
            {cylinder(0.15, 0.17, 0.04, 16)}
          </Part>
          <Part
            colour={partColours.steel}
            position={[0, 0.3, 0]}
            rotation={[0, 0, 0.3]}
          >
            {cylinder(0.02, 0.02, 0.6, 8)}
          </Part>
          <Part
            colour={colour}
            position={[-0.08, 0.6, 0]}
            rotation={[0, 0, -0.5]}
          >
            {cone(0.16, 0.2, 16)}
          </Part>
        </>
      );
  }
};

const Glass = ({ shape }: { shape: "square" | "round" }) => (
  <>
    <Part colour={skyColour} position={[0, 0, -0.02]}>
      {shape === "round" ? cylinder(0.4, 0.4, 0.02, 24) : box(0.8, 0.8, 0.02)}
    </Part>
    <Part colour={partColours.white} position={[0.12, 0.15, 0]} isGlassy>
      {shape === "round" ? cylinder(0.4, 0.4, 0.02, 24) : box(0.8, 0.8, 0.02)}
    </Part>
  </>
);

const roundGlass = [Math.PI / 2, 0, 0] as const;

const SquareWindow = ({ colour }: { colour: string }) => (
  <>
    <Glass shape="square" />
    {[-1, 1].flatMap((side) => [
      <Part
        key={`v${String(side)}`}
        colour={colour}
        position={[side * 0.42, 0, 0]}
      >
        {box(0.08, 0.92, 0.08)}
      </Part>,
      <Part
        key={`h${String(side)}`}
        colour={colour}
        position={[0, side * 0.42, 0]}
      >
        {box(0.92, 0.08, 0.08)}
      </Part>,
    ])}
    <Part colour={colour}>{box(0.05, 0.8, 0.05)}</Part>
    <Part colour={colour}>{box(0.8, 0.05, 0.05)}</Part>
  </>
);

const Window = ({ model, colour }: { model: string; colour: string }) => {
  switch (model) {
    case "diamond":
      return (
        <group rotation={[0, 0, Math.PI / 4]} scale={0.85}>
          <SquareWindow colour={colour} />
        </group>
      );
    case "heart":
      return (
        <group scale={[1, 1, 0.1]}>
          <HeartShape colour={colour} position={[0, -0.12, -0.2]} size={0.55} />
          <HeartShape
            colour={skyColour}
            position={[0, -0.1, 0.1]}
            size={0.45}
          />
        </group>
      );
    case "shuttered":
      return (
        <>
          <SquareWindow colour={partColours.white} />
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.68, 0, 0.04]}>
              <Part colour={colour}>{box(0.42, 0.92, 0.04)}</Part>
              {[-0.25, 0, 0.25].map((y) => (
                <Part
                  key={y}
                  colour={shadeColour(colour, -0.2)}
                  position={[0, y, 0.025]}
                >
                  {box(0.34, 0.05, 0.02)}
                </Part>
              ))}
            </group>
          ))}
        </>
      );
    case "round":
    case "porthole":
      return (
        <>
          <group rotation={[...roundGlass]}>
            <Glass shape="round" />
          </group>
          <Part colour={model === "porthole" ? partColours.steel : colour}>
            {ring(0.42, model === "porthole" ? 0.08 : 0.05)}
          </Part>
          {model === "porthole"
            ? [0, 1, 2, 3, 4, 5].map((step) => {
                const angle = (step / 6) * Math.PI * 2;
                return (
                  <Part
                    key={step}
                    colour={partColours.gold}
                    position={[
                      Math.cos(angle) * 0.42,
                      Math.sin(angle) * 0.42,
                      0.07,
                    ]}
                  >
                    {ball(0.025)}
                  </Part>
                );
              })
            : null}
        </>
      );
    case "arched":
    case "tower":
    case "castle":
    case "stained-glass": {
      const stretch = model === "arched" || model === "stained-glass" ? 1 : 1.3;
      return (
        <group scale={[model === "tower" ? 0.7 : 1, stretch, 1]}>
          {model === "castle"
            ? [-0.4, 0, 0.4].map((x) => (
                <Part key={x} colour={colour} position={[x, 0.95, 0]}>
                  {box(0.22, 0.2, 0.12)}
                </Part>
              ))
            : null}
          <Glass shape="square" />
          <Part
            colour={skyColour}
            position={[0, 0.4, -0.02]}
            rotation={[...roundGlass]}
          >
            {cylinder(0.4, 0.4, 0.02, 24)}
          </Part>
          {model === "stained-glass"
            ? paneColours.map((paneColour, index) => (
                <Part
                  key={paneColour}
                  colour={paneColour}
                  position={[
                    index % 2 === 0 ? -0.2 : 0.2,
                    index < 2 ? 0.2 : -0.2,
                    0.01,
                  ]}
                >
                  {box(0.38, 0.38, 0.02)}
                </Part>
              ))
            : null}
          <Part colour={colour} position={[0, 0.4, 0]}>
            {ring(0.42, 0.05, Math.PI)}
          </Part>
          {[-1, 1].map((side) => (
            <Part key={side} colour={colour} position={[side * 0.42, 0, 0]}>
              {box(0.08, 0.84, 0.08)}
            </Part>
          ))}
          <Part colour={colour} position={[0, -0.42, 0]}>
            {box(0.92, 0.08, 0.08)}
          </Part>
        </group>
      );
    }
    default:
      return <SquareWindow colour={colour} />;
  }
};

const Pot = () => (
  <>
    <Part colour={potColour} position={[0, 0.15, 0]}>
      {cylinder(0.2, 0.15, 0.3, 16)}
    </Part>
    <Part colour={shadeColour(potColour, -0.15)} position={[0, 0.31, 0]}>
      {cylinder(0.22, 0.22, 0.05, 16)}
    </Part>
  </>
);

const Plant = ({ model, colour }: { model: string; colour: string }) => {
  const growth = (() => {
    switch (model) {
      case "cactus":
        return (
          <>
            <Part colour={colour} position={[0, 0.6, 0]}>
              {cylinder(0.1, 0.12, 0.6, 12)}
            </Part>
            {[-1, 1].map((side) => (
              <Part
                key={side}
                colour={colour}
                position={[side * 0.15, 0.65 + side * 0.05, 0]}
                rotation={[0, 0, side * -0.3]}
              >
                {cylinder(0.05, 0.06, 0.25, 10)}
              </Part>
            ))}
            <Part colour={partColours.tongue} position={[0, 0.92, 0]}>
              {ball(0.05)}
            </Part>
          </>
        );
      case "sunflower":
        return (
          <>
            <Part colour={partColours.leaf} position={[0, 0.75, 0]}>
              {cylinder(0.025, 0.03, 0.9, 8)}
            </Part>
            <group position={[0, 1.2, 0.04]}>
              {Array.from({ length: 10 }, (_, index) => {
                const angle = (index / 10) * Math.PI * 2;
                return (
                  <Part
                    key={index}
                    colour={colour}
                    position={[
                      Math.cos(angle) * 0.13,
                      Math.sin(angle) * 0.13,
                      0,
                    ]}
                    scale={[1, 1, 0.4]}
                  >
                    {ball(0.07)}
                  </Part>
                );
              })}
              <Part
                colour={partColours.wood}
                position={[0, 0, 0.03]}
                scale={[1, 1, 0.5]}
              >
                {ball(0.09)}
              </Part>
            </group>
          </>
        );
      case "bonsai":
        return (
          <>
            <Part
              colour={partColours.wood}
              position={[0, 0.5, 0]}
              rotation={[0, 0, 0.3]}
            >
              {cylinder(0.04, 0.06, 0.4, 8)}
            </Part>
            <Part
              colour={colour}
              position={[-0.1, 0.72, 0]}
              scale={[1.4, 0.6, 1.2]}
            >
              {ball(0.2)}
            </Part>
          </>
        );
      case "flytrap":
        return (
          <>
            <Part colour={partColours.leaf} position={[0, 0.55, 0]}>
              {cylinder(0.025, 0.03, 0.4, 8)}
            </Part>
            <group position={[0, 0.82, 0]}>
              <Part
                colour={colour}
                position={[0, 0.05, 0]}
                rotation={[-0.4, 0, 0]}
                scale={[1, 0.5, 1]}
              >
                {ball(0.15)}
              </Part>
              <Part
                colour={partColours.red}
                position={[0, -0.04, 0.04]}
                rotation={[0.4, 0, 0]}
                scale={[1, 0.4, 1]}
              >
                {ball(0.14)}
              </Part>
            </group>
          </>
        );
      case "tree":
        return (
          <>
            <Part colour={partColours.wood} position={[0, 0.7, 0]}>
              {cylinder(0.06, 0.08, 0.8, 10)}
            </Part>
            <Part colour={colour} position={[0, 1.25, 0]}>
              {ball(0.38)}
            </Part>
            <HeartShape
              colour={partColours.red}
              position={[0.2, 1.3, 0.32]}
              size={0.05}
            />
          </>
        );
      case "rose":
        return (
          <>
            <Part
              colour={partColours.leaf}
              position={[0, 0.62, 0]}
              scale={[1.2, 0.9, 1.2]}
            >
              {ball(0.26)}
            </Part>
            {[0.3, 1.6, 2.9, 4.2, 5.5].map((angle, index) => (
              <Part
                key={angle}
                colour={colour}
                position={[
                  Math.cos(angle) * 0.24,
                  0.7 + (index % 2) * 0.1,
                  Math.sin(angle) * 0.24,
                ]}
              >
                {ball(0.07)}
              </Part>
            ))}
          </>
        );
      case "palm":
        return (
          <>
            {[0, 1, 2, 3].map((step) => (
              <Part
                key={step}
                colour={shadeColour(partColours.wood, step % 2 === 0 ? 0 : 0.2)}
                position={[step * 0.02, 0.45 + step * 0.22, 0]}
              >
                {cylinder(0.06, 0.08, 0.24, 10)}
              </Part>
            ))}
            {[0, 1, 2, 3, 4].map((step) => {
              const angle = (step / 5) * Math.PI * 2;
              return (
                <Part
                  key={step}
                  colour={colour}
                  position={[
                    0.06 + Math.cos(angle) * 0.25,
                    1.28,
                    Math.sin(angle) * 0.25,
                  ]}
                  rotation={[Math.sin(angle) * 1.2, 0, -Math.cos(angle) * 1.2]}
                  scale={[1, 1, 0.3]}
                >
                  {cone(0.1, 0.55, 6)}
                </Part>
              );
            })}
          </>
        );
      case "tulips":
        return (
          <>
            {[-0.1, 0, 0.1].map((x, index) => (
              <group key={x} position={[x, 0, index === 1 ? 0.05 : -0.03]}>
                <Part
                  colour={partColours.leaf}
                  position={[0, 0.55 + index * 0.06, 0]}
                >
                  {cylinder(0.015, 0.015, 0.5 + index * 0.12, 6)}
                </Part>
                <Part
                  colour={index === 1 ? partColours.gold : colour}
                  position={[0, 0.85 + index * 0.12, 0]}
                  scale={[1, 1.3, 1]}
                >
                  {ballSlice(0.07, 0.35, 0.65)}
                </Part>
              </group>
            ))}
          </>
        );
      case "spider":
        return (
          <>
            {Array.from({ length: 7 }, (_, step) => {
              const angle = (step / 7) * Math.PI * 2;
              return (
                <Part
                  key={step}
                  colour={step % 2 === 0 ? colour : shadeColour(colour, 0.35)}
                  position={[
                    Math.cos(angle) * 0.18,
                    0.5,
                    Math.sin(angle) * 0.18,
                  ]}
                  rotation={[Math.sin(angle) * 1.1, 0, -Math.cos(angle) * 1.1]}
                  scale={[1, 1, 0.3]}
                >
                  {cone(0.05, 0.5, 4)}
                </Part>
              );
            })}
          </>
        );
      default:
        return (
          <>
            {[0, 1, 2, 3, 4].map((step) => (
              <Part
                key={step}
                colour={colour}
                position={[
                  Math.cos(step * 1.3) * 0.12,
                  0.55,
                  Math.sin(step * 1.3) * 0.12,
                ]}
                rotation={[
                  Math.sin(step * 1.3) * 0.5,
                  0,
                  -Math.cos(step * 1.3) * 0.5,
                ]}
              >
                {cone(0.07, 0.5, 6)}
              </Part>
            ))}
          </>
        );
    }
  })();
  return (
    <>
      <Pot />
      {growth}
    </>
  );
};

const wallpaperPictureSize = 1.2;

const FurnitureShape = ({ look }: { look: FurnitureLook }) => {
  const { model, colour } = look;
  switch (look.slot) {
    case "bed":
      return <Bed model={model} colour={colour} />;
    case "rug":
      return <Rug model={model} colour={colour} />;
    case "wallpaper":
      return (
        <WallpaperPanel
          model={model}
          colour={colour}
          width={wallpaperPictureSize}
          height={wallpaperPictureSize}
        />
      );
    case "wallPicture":
      return <WallPicture model={model} colour={colour} />;
    case "shelf":
      return <Shelf model={model} colour={colour} />;
    case "lamp":
      return <Lamp model={model} colour={colour} />;
    case "window":
      return <Window model={model} colour={colour} />;
    case "plant":
      return <Plant model={model} colour={colour} />;
    case "desk":
      return <Desk model={model} colour={colour} />;
    case "seat":
      return <Seat model={model} colour={colour} />;
    case "toyBox":
      return <ToyBox model={model} colour={colour} />;
    case "clock":
      return <Clock model={model} colour={colour} />;
    case "fishTank":
      return <FishTank model={model} colour={colour} />;
    case "softToy":
      return <SoftToy model={model} colour={colour} />;
    case "instrument":
      return <Instrument model={model} colour={colour} />;
  }
};

export const Furniture = ({ look }: { look: FurnitureLook }) => (
  <group name={`furniture-${look.slot}`}>
    <FurnitureShape look={look} />
  </group>
);

export const TrophyCup = () => (
  <group name="trophy">
    <Part colour={partColours.gold} position={[0, 0.02, 0]}>
      {cylinder(0.06, 0.07, 0.04, 12)}
    </Part>
    <Part colour={partColours.gold} position={[0, 0.08, 0]}>
      {cylinder(0.015, 0.015, 0.08, 8)}
    </Part>
    <Part colour={partColours.gold} position={[0, 0.17, 0]}>
      {cylinder(0.08, 0.04, 0.12, 12)}
    </Part>
    {[-1, 1].map((side) => (
      <Part
        key={side}
        colour={partColours.gold}
        position={[side * 0.08, 0.18, 0]}
        rotation={[0, 0, side * (Math.PI / 2)]}
      >
        {ring(0.035, 0.01, Math.PI)}
      </Part>
    ))}
  </group>
);
