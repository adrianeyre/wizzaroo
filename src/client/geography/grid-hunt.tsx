import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import {
  CylinderGeometry,
  SphereGeometry,
  type BufferGeometry,
  type Group,
  type Mesh,
  type MeshPhysicalMaterial,
} from "three";
import {
  findGridOrigin,
  type GeographyShowOf,
} from "../../curriculum/geography.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { buildModelGeometry } from "../world-map-models.js";
import {
  findPulse,
  geographyPalette,
  useCanvasTexture,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";
import {
  boardTexturePixels,
  boardWorldSize,
  buildGridAxisLabels,
  findBoardPosition,
  findPinGridPoint,
} from "./grid-board-layout.js";
import { paintGridBoard } from "./grid-board-painter.js";
import {
  buildEaselFrameGeometry,
  buildEaselStandGeometry,
  easelCentre,
  easelTurn,
} from "./tilted-easel.js";

const pinBobHeight = 0.035;

const buildFrameGeometry = (): BufferGeometry =>
  buildEaselFrameGeometry(boardWorldSize);

const buildStandGeometry = (): BufferGeometry =>
  buildEaselStandGeometry(boardWorldSize);

const pinNeedleLength = 0.44;
const pinHeadRadius = 0.075;

const buildPinGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.011, 0.0015, pinNeedleLength, 8),
      colour: "#c9ced6",
      position: [0, pinNeedleLength / 2, 0],
    },
    {
      geometry: new CylinderGeometry(0.035, 0.05, 0.05, 14),
      colour: "#b3172d",
      position: [0, pinNeedleLength + 0.005, 0],
    },
    {
      geometry: new SphereGeometry(pinHeadRadius, 18, 14),
      colour: "#e8253f",
      position: [0, pinNeedleLength + pinHeadRadius * 0.85, 0],
      isSmooth: true,
    },
  ]);

const MapPin = ({ x, y }: { x: number; y: number }) => {
  const pin = useBuiltGeometry(buildPinGeometry);
  const lift = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const head = useRef<MeshPhysicalMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    const time = age.current * motionScale;
    const bob = pinBobHeight * (0.5 - 0.5 * Math.cos(time * 2.4));
    lift.current?.position.set(0, bob, 0);
    shadow.current?.scale.setScalar(1 - bob * 4);
    if (head.current !== null) {
      head.current.emissiveIntensity =
        0.12 + 0.18 * findPulse(age.current, motionScale);
    }
  });

  return (
    <group position={[x, y, 0]} name="grid-pin">
      <mesh ref={shadow} position={[0.012, -0.012, 0.004]}>
        <circleGeometry args={[0.06, 20]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <circleGeometry args={[0.016, 12]} />
        <meshBasicMaterial color="#7a0d1d" />
      </mesh>
      <group rotation={[-easelTurn, 0, 0]}>
        <group ref={lift}>
          <mesh geometry={pin}>
            <meshPhysicalMaterial
              ref={head}
              vertexColors
              roughness={0.3}
              clearcoat={1}
              clearcoatRoughness={0.15}
              emissive={geographyPalette.marker}
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export const GridHuntScene = ({
  show,
}: {
  show: GeographyShowOf<"grid-hunt">;
}) => {
  const { style, x, y } = show;
  const labels = useMemo(
    () =>
      buildGridAxisLabels(
        style,
        findGridOrigin({ scene: "grid-hunt", style, x, y }),
      ),
    [style, x, y],
  );
  const pinPosition = useMemo(
    () =>
      findBoardPosition(findPinGridPoint({ scene: "grid-hunt", style, x, y })),
    [style, x, y],
  );
  const paintBoard = useCallback(
    (context: CanvasRenderingContext2D) => {
      paintGridBoard(context, style, labels);
    },
    [style, labels],
  );
  const board = useCanvasTexture(
    boardTexturePixels,
    boardTexturePixels,
    paintBoard,
  );
  const frame = useBuiltGeometry(buildFrameGeometry);
  const stand = useBuiltGeometry(buildStandGeometry);

  return (
    <group name={show.scene}>
      <mesh geometry={stand}>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </mesh>
      <group position={easelCentre} rotation={[easelTurn, 0, 0]}>
        <mesh geometry={frame}>
          <meshStandardMaterial vertexColors roughness={0.6} />
        </mesh>
        <mesh name="grid-board">
          <planeGeometry args={[boardWorldSize, boardWorldSize]} />
          <meshStandardMaterial
            key={board === undefined ? "plain" : "painted"}
            color={board === undefined ? geographyPalette.parchment : "#ffffff"}
            map={board ?? null}
            roughness={0.85}
          />
        </mesh>
        <MapPin x={pinPosition.x} y={pinPosition.y} />
      </group>
    </group>
  );
};
