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
} from "./character-parts.js";

const deskHeight = 0.75;
const deskWidth = 1.3;
const deskDepth = 0.6;
const paperColour = "#fffdf5";
const screenColour = "#7fd3ff";
const cushionColour = "#fff3e0";
const pencilColours = ["#e8312e", "#3fa0ff", "#3f9d5a"];

const DeskTop = ({
  colour,
  height = deskHeight,
  isGlassy = false,
}: {
  colour: string;
  height?: number;
  isGlassy?: boolean;
}) => (
  <Part colour={colour} position={[0, height - 0.03, 0]} isGlassy={isGlassy}>
    {box(deskWidth, 0.06, deskDepth)}
  </Part>
);

const DeskLegs = ({
  colour,
  height = deskHeight,
}: {
  colour: string;
  height?: number;
}) => (
  <>
    {[-1, 1].flatMap((sideX) =>
      [-1, 1].map((sideZ) => (
        <Part
          key={`${String(sideX)}-${String(sideZ)}`}
          colour={colour}
          position={[
            sideX * (deskWidth / 2 - 0.06),
            (height - 0.06) / 2,
            sideZ * (deskDepth / 2 - 0.06),
          ]}
        >
          {box(0.06, height - 0.06, 0.06)}
        </Part>
      )),
    )}
  </>
);

const Paper = ({ y = deskHeight }: { y?: number }) => (
  <Part colour={paperColour} position={[-0.2, y + 0.005, 0.05]}>
    {box(0.3, 0.01, 0.22)}
  </Part>
);

export const Desk = ({ model, colour }: { model: string; colour: string }) => {
  switch (model) {
    case "school":
      return (
        <>
          <DeskTop colour={colour} />
          <DeskLegs colour={partColours.steel} />
          <Part colour={partColours.steel} position={[0, 0.5, -0.05]}>
            {box(deskWidth - 0.1, 0.2, deskDepth - 0.15)}
          </Part>
          <Paper />
        </>
      );
    case "drawing":
      return (
        <>
          <DeskLegs colour={partColours.wood} />
          <group position={[0, deskHeight, 0]} rotation={[0.3, 0, 0]}>
            <Part colour={colour}>{box(deskWidth, 0.05, deskDepth)}</Part>
            <Paper y={0.02} />
          </group>
          {pencilColours.map((pencilColour, index) => (
            <Part
              key={pencilColour}
              colour={pencilColour}
              position={[0.35 + index * 0.06, deskHeight + 0.12, 0.2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              {cylinder(0.015, 0.015, 0.2, 6)}
            </Part>
          ))}
        </>
      );
    case "log":
      return (
        <>
          {[-0.45, 0.45].map((x) => (
            <Part key={x} colour={partColours.wood} position={[x, 0.36, 0]}>
              {cylinder(0.16, 0.18, 0.72, 12)}
            </Part>
          ))}
          <Part colour={colour} position={[0, deskHeight - 0.05, 0]}>
            {box(deskWidth, 0.1, deskDepth)}
          </Part>
          <Part
            colour={shadeColour(colour, 0.25)}
            position={[deskWidth / 2, deskHeight - 0.05, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            {cylinder(0.05, 0.05, 0.01, 12)}
          </Part>
        </>
      );
    case "round":
      return (
        <>
          <Part colour={colour} position={[0, deskHeight - 0.03, 0]}>
            {cylinder(0.55, 0.55, 0.06, 24)}
          </Part>
          <Part colour={partColours.steel} position={[0, deskHeight / 2, 0]}>
            {cylinder(0.05, 0.05, deskHeight, 10)}
          </Part>
          <Part colour={partColours.steel} position={[0, 0.02, 0]}>
            {cylinder(0.3, 0.3, 0.04, 16)}
          </Part>
        </>
      );
    case "computer":
      return (
        <>
          <DeskTop colour={colour} />
          <DeskLegs colour={shadeColour(colour, -0.2)} />
          <Part
            colour={partColours.ink}
            position={[0, deskHeight + 0.28, -0.15]}
          >
            {box(0.6, 0.38, 0.04)}
          </Part>
          <Part colour={screenColour} position={[0, deskHeight + 0.28, -0.125]}>
            {box(0.54, 0.32, 0.01)}
          </Part>
          <Part
            colour={partColours.ink}
            position={[0, deskHeight + 0.05, -0.15]}
          >
            {box(0.06, 0.1, 0.06)}
          </Part>
          <Part
            colour={partColours.white}
            position={[0, deskHeight + 0.01, 0.12]}
          >
            {box(0.5, 0.02, 0.15)}
          </Part>
        </>
      );
    case "science":
      return (
        <>
          <DeskTop colour={partColours.white} />
          <DeskLegs colour={partColours.steel} />
          <Part
            colour={colour}
            position={[-0.35, deskHeight + 0.12, 0]}
            isGlassy
          >
            {cone(0.1, 0.24, 12)}
          </Part>
          <Part colour={colour} position={[-0.35, deskHeight + 0.05, 0]}>
            {cone(0.075, 0.08, 12)}
          </Part>
          {pencilColours.map((tubeColour, index) => (
            <Part
              key={tubeColour}
              colour={tubeColour}
              position={[0.2 + index * 0.08, deskHeight + 0.09, 0]}
              isGlassy
            >
              {cylinder(0.025, 0.025, 0.18, 8)}
            </Part>
          ))}
        </>
      );
    case "standing":
      return (
        <>
          <DeskTop colour={colour} height={1.05} />
          {[-1, 1].flatMap((side) => [
            <Part
              key={`leg${String(side)}`}
              colour={partColours.ink}
              position={[side * 0.5, 0.51, 0]}
            >
              {box(0.06, 1.02, 0.06)}
            </Part>,
            <Part
              key={`foot${String(side)}`}
              colour={partColours.ink}
              position={[side * 0.5, 0.02, 0]}
            >
              {box(0.08, 0.04, deskDepth)}
            </Part>,
          ])}
          <Part colour={partColours.steel} position={[0, 1.06, 0]}>
            {box(0.4, 0.02, 0.28)}
          </Part>
          <Part
            colour={partColours.steel}
            position={[0, 1.18, -0.13]}
            rotation={[-0.2, 0, 0]}
          >
            {box(0.4, 0.26, 0.02)}
          </Part>
        </>
      );
    case "glass":
      return (
        <>
          <DeskTop colour={colour} isGlassy />
          <DeskLegs colour={partColours.steel} />
          <Paper />
        </>
      );
    case "wizard":
      return (
        <>
          <DeskTop colour={colour} />
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={shadeColour(colour, -0.3)}
              position={[side * 0.5, 0.36, 0]}
            >
              {cylinder(0.05, 0.12, 0.72, 8)}
            </Part>
          ))}
          <Part
            colour={partColours.red}
            position={[-0.3, deskHeight + 0.03, 0]}
          >
            {box(0.36, 0.05, 0.26)}
          </Part>
          <Part colour={paperColour} position={[-0.3, deskHeight + 0.06, 0]}>
            {box(0.32, 0.02, 0.22)}
          </Part>
          <Part
            colour={partColours.white}
            position={[0.4, deskHeight + 0.1, -0.1]}
          >
            {cylinder(0.03, 0.03, 0.2, 8)}
          </Part>
          <Part
            colour={partColours.flame}
            position={[0.4, deskHeight + 0.24, -0.1]}
          >
            {cone(0.03, 0.08, 8)}
          </Part>
          <Part
            colour="#b39ddb"
            position={[0.15, deskHeight + 0.12, 0.05]}
            isGlassy
          >
            {ball(0.12)}
          </Part>
        </>
      );
    default:
      return (
        <>
          <DeskTop colour={colour} />
          <DeskLegs colour={shadeColour(colour, -0.15)} />
          <Part
            colour={shadeColour(colour, -0.1)}
            position={[0.38, deskHeight - 0.18, 0]}
          >
            {box(0.45, 0.24, deskDepth - 0.04)}
          </Part>
          <Part
            colour={partColours.gold}
            position={[0.38, deskHeight - 0.18, deskDepth / 2]}
          >
            {ball(0.025)}
          </Part>
        </>
      );
  }
};

const seatHeights: Partial<Record<string, number>> = {
  beanbag: 0.4,
  stool: 0.55,
  rocking: 0.5,
  toadstool: 0.5,
  gaming: 0.55,
  swing: 0.6,
  throne: 0.5,
};

export const findSeatHeight = (model: string): number =>
  seatHeights[model] ?? 0.45;

const ChairBack = ({
  colour,
  seatHeight,
  backHeight,
  width = 0.7,
}: {
  colour: string;
  seatHeight: number;
  backHeight: number;
  width?: number;
}) => (
  <Part colour={colour} position={[0, seatHeight + backHeight / 2, -0.3]}>
    {box(width, backHeight, 0.12)}
  </Part>
);

export const Seat = ({ model, colour }: { model: string; colour: string }) => {
  const seatHeight = findSeatHeight(model);
  switch (model) {
    case "stool":
      return (
        <>
          <Part colour={colour} position={[0, seatHeight - 0.03, 0]}>
            {cylinder(0.25, 0.25, 0.06, 16)}
          </Part>
          {[0, 1, 2].map((step) => {
            const angle = (step / 3) * Math.PI * 2;
            return (
              <Part
                key={step}
                colour={shadeColour(colour, -0.2)}
                position={[
                  Math.sin(angle) * 0.15,
                  seatHeight / 2,
                  Math.cos(angle) * 0.15,
                ]}
                rotation={[Math.cos(angle) * -0.15, 0, Math.sin(angle) * 0.15]}
              >
                {cylinder(0.025, 0.03, seatHeight, 6)}
              </Part>
            );
          })}
        </>
      );
    case "armchair":
    case "sofa": {
      const width = model === "sofa" ? 1.3 : 0.8;
      return (
        <>
          <Part colour={colour} position={[0, 0.22, 0]}>
            {box(width, 0.44, 0.7)}
          </Part>
          <ChairBack
            colour={colour}
            seatHeight={0.2}
            backHeight={0.7}
            width={width}
          />
          {[-1, 1].map((side) => (
            <Part
              key={side}
              colour={shadeColour(colour, -0.12)}
              position={[side * (width / 2 + 0.06), 0.4, 0]}
            >
              {box(0.14, 0.4, 0.72)}
            </Part>
          ))}
          {(model === "sofa" ? [-0.3, 0.3] : [0]).map((x) => (
            <Part
              key={x}
              colour={shadeColour(colour, 0.25)}
              position={[x, seatHeight + 0.02, 0.05]}
            >
              {box(model === "sofa" ? 0.58 : 0.7, 0.08, 0.55)}
            </Part>
          ))}
        </>
      );
    }
    case "rocking":
      return (
        <>
          <Part colour={colour} position={[0, seatHeight, 0]}>
            {box(0.6, 0.06, 0.55)}
          </Part>
          <ChairBack
            colour={colour}
            seatHeight={seatHeight}
            backHeight={0.65}
            width={0.6}
          />
          {[-1, 1].flatMap((side) => [
            <Part
              key={`rocker${String(side)}`}
              colour={shadeColour(colour, -0.2)}
              position={[side * 0.28, 0.55, 0]}
              rotation={[0, Math.PI / 2, Math.PI + 0.9]}
            >
              {ring(0.55, 0.025, 1.3)}
            </Part>,
            <Part
              key={`leg${String(side)}`}
              colour={colour}
              position={[side * 0.28, 0.26, 0]}
            >
              {box(0.05, 0.45, 0.05)}
            </Part>,
          ])}
        </>
      );
    case "toadstool":
      return (
        <>
          <Part colour={cushionColour} position={[0, 0.22, 0]}>
            {cylinder(0.16, 0.2, 0.44, 12)}
          </Part>
          <Part colour={colour} position={[0, 0.42, 0]} scale={[1, 0.5, 1]}>
            {ballSlice(0.36, 0, 0.5)}
          </Part>
          {[0.4, 2.2, 4].map((angle) => (
            <Part
              key={angle}
              colour={partColours.white}
              position={[Math.cos(angle) * 0.22, 0.53, Math.sin(angle) * 0.22]}
            >
              {ball(0.05)}
            </Part>
          ))}
        </>
      );
    case "gaming":
      return (
        <>
          <Part colour={partColours.ink} position={[0, 0.05, 0]}>
            {cylinder(0.3, 0.3, 0.04, 5)}
          </Part>
          <Part colour={partColours.ink} position={[0, 0.27, 0]}>
            {cylinder(0.04, 0.04, 0.45, 8)}
          </Part>
          <Part colour={partColours.ink} position={[0, seatHeight, 0]}>
            {box(0.6, 0.1, 0.55)}
          </Part>
          <ChairBack
            colour={partColours.ink}
            seatHeight={seatHeight}
            backHeight={0.85}
            width={0.55}
          />
          <Part colour={colour} position={[0, seatHeight + 0.43, -0.235]}>
            {box(0.14, 0.85, 0.01)}
          </Part>
        </>
      );
    case "egg":
      return (
        <>
          <Part colour={partColours.steel} position={[0, 0.03, 0]}>
            {cylinder(0.25, 0.3, 0.06, 16)}
          </Part>
          <Part colour={colour} position={[0, 0.65, -0.05]} scale={[1, 1.3, 1]}>
            {ball(0.45)}
          </Part>
          <Part
            colour={partColours.sky}
            position={[0, 0.62, 0.32]}
            scale={[1, 1.3, 0.3]}
          >
            {ball(0.34)}
          </Part>
        </>
      );
    case "swing":
      return (
        <>
          <Part colour={partColours.steel} position={[0, 0.03, -0.1]}>
            {cylinder(0.3, 0.3, 0.06, 16)}
          </Part>
          <Part colour={partColours.steel} position={[0, 0.9, -0.45]}>
            {cylinder(0.03, 0.03, 1.8, 8)}
          </Part>
          <Part
            colour={partColours.steel}
            position={[0, 1.78, -0.15]}
            rotation={[0, Math.PI / 2, 0]}
          >
            {ring(0.3, 0.03, Math.PI / 2)}
          </Part>
          <Part colour={partColours.steel} position={[0, 1.3, 0.15]}>
            {cylinder(0.015, 0.015, 0.9, 6)}
          </Part>
          <Part
            colour={colour}
            position={[0, 0.85, 0.15]}
            rotation={[Math.PI, 0, 0]}
          >
            {ballSlice(0.42, 0, 0.6)}
          </Part>
          <Part colour={cushionColour} position={[0, seatHeight + 0.02, 0.15]}>
            {cylinder(0.3, 0.3, 0.06, 16)}
          </Part>
        </>
      );
    case "throne":
      return (
        <>
          <Part colour={colour} position={[0, 0.25, 0]}>
            {box(0.8, 0.5, 0.65)}
          </Part>
          <ChairBack
            colour={colour}
            seatHeight={0.3}
            backHeight={1.2}
            width={0.8}
          />
          <Part
            colour={partColours.gold}
            position={[0, seatHeight + 0.01, 0.03]}
          >
            {box(0.68, 0.04, 0.55)}
          </Part>
          {[-0.28, 0, 0.28].map((x) => (
            <Part key={x} colour={partColours.gold} position={[x, 1.6, -0.3]}>
              {cone(0.08, 0.2, 4)}
            </Part>
          ))}
          <StarShape
            colour={partColours.gold}
            position={[0, 1.2, -0.23]}
            size={0.1}
          />
        </>
      );
    default:
      return (
        <>
          <Part colour={colour} position={[0, 0.3, 0]} scale={[1, 0.65, 1]}>
            {ball(0.5)}
          </Part>
          <Part
            colour={shadeColour(colour, -0.15)}
            position={[0, 0.52, -0.22]}
            scale={[1, 0.7, 0.6]}
          >
            {ball(0.36)}
          </Part>
        </>
      );
  }
};
