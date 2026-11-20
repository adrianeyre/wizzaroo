import type { ReactNode } from "react";
import { Color } from "three";

export type Vector = [number, number, number];

interface PartProps {
  colour: string;
  position?: Vector;
  rotation?: Vector;
  scale?: Vector | number;
  isGlassy?: boolean;
  children: ReactNode;
}

const glassOpacity = 0.35;
const surfaceRoughness = 0.62;

export const Part = ({
  colour,
  position,
  rotation,
  scale,
  isGlassy = false,
  children,
}: PartProps) => (
  <mesh position={position} rotation={rotation} scale={scale}>
    {children}
    <meshStandardMaterial
      color={colour}
      roughness={surfaceRoughness}
      transparent={isGlassy}
      opacity={isGlassy ? glassOpacity : 1}
      depthWrite={!isGlassy}
    />
  </mesh>
);

export const ball = (radius: number) => (
  <sphereGeometry args={[radius, 16, 12]} />
);

export const ballSlice = (
  radius: number,
  fromTurn: number,
  turnLength: number,
) => (
  <sphereGeometry
    args={[
      radius,
      20,
      12,
      0,
      Math.PI * 2,
      Math.PI * fromTurn,
      Math.PI * turnLength,
    ]}
  />
);

export const box = (width: number, height: number, depth: number) => (
  <boxGeometry args={[width, height, depth]} />
);

export const cone = (radius: number, height: number, sides = 16) => (
  <coneGeometry args={[radius, height, sides]} />
);

export const cylinder = (
  topRadius: number,
  bottomRadius: number,
  height: number,
  sides = 20,
) => <cylinderGeometry args={[topRadius, bottomRadius, height, sides]} />;

export const ring = (radius: number, tube: number, arc = Math.PI * 2) => (
  <torusGeometry args={[radius, tube, 8, 24, arc]} />
);

export const shadeColour = (colour: string, amount: number): string => {
  const shaded = new Color(colour).lerp(
    new Color(amount < 0 ? "#000000" : "#ffffff"),
    Math.abs(amount),
  );
  return `#${shaded.getHexString()}`;
};

export const mixColours = (
  colour: string,
  otherColour: string,
  amount: number,
): string =>
  `#${new Color(colour).lerp(new Color(otherColour), amount).getHexString()}`;

export const partColours = {
  ink: "#1b1b24",
  white: "#ffffff",
  gold: "#f2c530",
  steel: "#c8ced8",
  wood: "#8b5a2b",
  leaf: "#3f9d5a",
  flame: "#ff9a1f",
  mouth: "#7a2230",
  tongue: "#f07a8a",
  red: "#e8312e",
  sky: "#3fa0ff",
} as const;

export const flat: Vector = [Math.PI / 2, 0, 0];

export const StarShape = ({
  colour,
  position,
  size,
}: {
  colour: string;
  position: Vector;
  size: number;
}) => (
  <group position={position}>
    <Part colour={colour} rotation={[Math.PI / 2, 0, 0]}>
      {cylinder(size, size, size / 3, 3)}
    </Part>
    <Part colour={colour} rotation={[Math.PI / 2, Math.PI / 3, 0]}>
      {cylinder(size, size, size / 3, 3)}
    </Part>
  </group>
);

export const HeartShape = ({
  colour,
  position,
  size,
}: {
  colour: string;
  position: Vector;
  size: number;
}) => (
  <group position={position}>
    <Part colour={colour} position={[-size * 0.5, size * 0.3, 0]}>
      {ball(size * 0.6)}
    </Part>
    <Part colour={colour} position={[size * 0.5, size * 0.3, 0]}>
      {ball(size * 0.6)}
    </Part>
    <Part
      colour={colour}
      position={[0, -size * 0.45, 0]}
      rotation={[0, 0, Math.PI]}
    >
      {cone(size * 1.05, size * 1.2, 6)}
    </Part>
  </group>
);
