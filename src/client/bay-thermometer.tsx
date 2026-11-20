import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import {
  coldestTemperature,
  warmestTemperature,
  type TemperatureQuestion,
} from "../curriculum/more-and-less.js";
import { formatNumber } from "../curriculum/number-format.js";
import {
  labelFont,
  usePaintedTexture,
  type PaintCanvas,
} from "./bay-block-measures.js";
import {
  findGrowth,
  promptGrowSeconds,
  usePromptGrowth,
  usePromptPosition,
} from "./bay-stage.js";

const thermometerPalette = {
  plate: "#f3efe6",
  plateEdge: "#c9b896",
  ink: "#1d2633",
  zeroLine: "#1f6fb2",
  liquid: "#d7263d",
  glass: "#e8f6ff",
  cap: "#b8c2cc",
  rise: "#f59e0b",
  fall: "#38bdf8",
  labelBackground: "#0b2238",
  labelInk: "#f4f9ff",
} as const;

const scaleBottom = -0.9;
const scaleTop = 0.9;
const degreeHeight =
  (scaleTop - scaleBottom) / (warmestTemperature - coldestTemperature);
const plate = { width: 0.95, height: 2.4, depth: 0.06 };
const tube = { x: -0.18, radius: 0.085, liquidRadius: 0.045 };
const bulbHeight = -1.08;
const bulbRadius = 0.16;
const scaleTexture = { width: 256, height: 640 };
const arrowLength = 0.6;
const arrowX = 0.78;

export const findTemperatureHeight = (degrees: number) =>
  scaleBottom + (degrees - coldestTemperature) * degreeHeight;

const findCanvasY = (degrees: number, height: number) =>
  height * (0.5 - findTemperatureHeight(degrees) / plate.height);

const paintScale: PaintCanvas = (context, width, height) => {
  context.fillStyle = thermometerPalette.plate;
  context.fillRect(0, 0, width, height);
  const tickStart =
    width * ((tube.x + tube.radius + 0.03 + plate.width / 2) / plate.width);
  context.textAlign = "right";
  context.textBaseline = "middle";
  context.font = labelFont.replace("56px", "34px");
  for (
    let degrees = coldestTemperature;
    degrees <= warmestTemperature;
    degrees++
  ) {
    const y = findCanvasY(degrees, height);
    const isZero = degrees === 0;
    const isLabelled = degrees % 2 === 0;
    context.strokeStyle = isZero
      ? thermometerPalette.zeroLine
      : thermometerPalette.ink;
    context.lineWidth = isZero ? 6 : isLabelled ? 3.5 : 2;
    context.beginPath();
    context.moveTo(tickStart, y);
    context.lineTo(tickStart + (isZero ? 70 : isLabelled ? 44 : 26), y);
    context.stroke();
    if (isLabelled) {
      context.fillStyle = isZero
        ? thermometerPalette.zeroLine
        : thermometerPalette.ink;
      context.fillText(formatNumber(degrees), width - 14, y + 2);
    }
  }
  context.font = labelFont.replace("56px", "30px");
  context.fillStyle = thermometerPalette.ink;
  context.fillText("°C", width - 14, height - 26);
};

export const describeTemperatureChange = (change: number): string =>
  `${change > 0 ? "+" : ""}${formatNumber(change)}°`;

const buildChangePainter =
  (text: string): PaintCanvas =>
  (context, width, height) => {
    context.fillStyle = thermometerPalette.labelBackground;
    context.globalAlpha = 0.88;
    context.beginPath();
    context.roundRect(4, 4, width - 8, height - 8, height / 2 - 4);
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = thermometerPalette.labelInk;
    context.font = labelFont;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, width / 2, height / 2 + 4);
  };

const ChangeArrow = ({ start, change }: { start: number; change: number }) => {
  const direction = Math.sign(change);
  const colour =
    direction > 0 ? thermometerPalette.rise : thermometerPalette.fall;
  const startHeight = findTemperatureHeight(start);
  const paint = useMemo(
    () => buildChangePainter(describeTemperatureChange(change)),
    [change],
  );
  const label = usePaintedTexture(220, 104, paint);
  const shaftLength = arrowLength - 0.14;

  return (
    <group position={[arrowX, startHeight, 0.05]} name="temperature-change">
      <mesh position={[0, (direction * shaftLength) / 2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, shaftLength, 10]} />
        <meshPhysicalMaterial color={colour} roughness={0.3} clearcoat={0.8} />
      </mesh>
      <mesh
        position={[0, direction * (shaftLength + 0.07), 0]}
        rotation={[0, 0, direction > 0 ? 0 : Math.PI]}
      >
        <coneGeometry args={[0.07, 0.14, 12]} />
        <meshPhysicalMaterial color={colour} roughness={0.3} clearcoat={0.8} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 14]} />
        <meshPhysicalMaterial color={colour} roughness={0.3} clearcoat={0.8} />
      </mesh>
      {label === undefined ? null : (
        <sprite
          position={[0.32, (direction * arrowLength) / 2, 0]}
          scale={[0.5, 0.236, 1]}
        >
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      )}
    </group>
  );
};

export const Thermometer = ({
  temperature,
}: {
  temperature: TemperatureQuestion;
}) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const body = useRef<Group>(null);
  const liquid = useRef<Mesh>(null);
  const scale = usePaintedTexture(
    scaleTexture.width,
    scaleTexture.height,
    paintScale,
  );
  const liquidBottom = bulbHeight + bulbRadius * 0.5;
  const liquidTop = findTemperatureHeight(temperature.start);
  const liquidLength = liquidTop - liquidBottom;
  const tubeLength = scaleTop - bulbHeight + 0.12;

  useFrame(() => {
    const growth = findGrowth(age.current, promptGrowSeconds, motionScale);
    body.current?.scale.setScalar(growth);
    if (body.current !== null) {
      body.current.rotation.y =
        -0.12 + Math.sin(age.current * 0.45) * 0.05 * motionScale;
    }
    const filled =
      motionScale === 0
        ? 1
        : Math.min(1, Math.max(0.02, (age.current - 0.3) / 1.1));
    if (liquid.current !== null) {
      liquid.current.scale.y = filled;
      liquid.current.position.y = liquidBottom + (liquidLength * filled) / 2;
    }
  });

  return (
    <group position={position} name="thermometer">
      <group ref={body}>
        <mesh position={[0, 0, -plate.depth / 2 - 0.01]}>
          <boxGeometry
            args={[plate.width + 0.06, plate.height + 0.06, plate.depth]}
          />
          <meshPhysicalMaterial
            color={thermometerPalette.plateEdge}
            roughness={0.4}
            clearcoat={0.7}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[0, 0, 0.002]} name="thermometer-scale">
          <planeGeometry args={[plate.width, plate.height]} />
          <meshStandardMaterial
            key={scale === undefined ? "plain" : "scaled"}
            map={scale ?? null}
            color={scale === undefined ? thermometerPalette.plate : "#ffffff"}
            roughness={0.6}
          />
        </mesh>
        <group position={[tube.x, 0, 0.1]}>
          <mesh
            ref={liquid}
            position={[0, liquidBottom + liquidLength / 2, 0]}
            name="thermometer-liquid"
          >
            <cylinderGeometry
              args={[tube.liquidRadius, tube.liquidRadius, liquidLength, 14]}
            />
            <meshPhysicalMaterial
              color={thermometerPalette.liquid}
              emissive={thermometerPalette.liquid}
              emissiveIntensity={0.25}
              roughness={0.2}
              clearcoat={1}
            />
          </mesh>
          <mesh position={[0, bulbHeight, 0]}>
            <sphereGeometry args={[bulbRadius * 0.78, 18, 12]} />
            <meshPhysicalMaterial
              color={thermometerPalette.liquid}
              emissive={thermometerPalette.liquid}
              emissiveIntensity={0.25}
              roughness={0.2}
              clearcoat={1}
            />
          </mesh>
          <mesh position={[0, bulbHeight + tubeLength / 2, 0]}>
            <cylinderGeometry
              args={[tube.radius, tube.radius, tubeLength, 20, 1, true]}
            />
            <meshPhysicalMaterial
              color={thermometerPalette.glass}
              roughness={0.05}
              clearcoat={1}
              transparent
              opacity={0.28}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, bulbHeight, 0]}>
            <sphereGeometry args={[bulbRadius, 20, 14]} />
            <meshPhysicalMaterial
              color={thermometerPalette.glass}
              roughness={0.05}
              clearcoat={1}
              transparent
              opacity={0.3}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, bulbHeight + tubeLength, 0]}>
            <sphereGeometry
              args={[tube.radius, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshPhysicalMaterial
              color={thermometerPalette.cap}
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
        </group>
        <ChangeArrow start={temperature.start} change={temperature.change} />
      </group>
    </group>
  );
};
