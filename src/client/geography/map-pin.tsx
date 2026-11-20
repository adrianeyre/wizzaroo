import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  ConeGeometry,
  CylinderGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
} from "three";
import { easeOutBack, useDisposedOnUnmount } from "../studio-stage.js";
import { buildModelGeometry } from "../world-map-models.js";
import { geographyPalette, useMotionScale } from "./geography-kit.js";

export type PinTriple = [number, number, number];

const pinDropSeconds = 0.6;
const pinDropHeight = 0.7;
const pinBobHeight = 0.035;
const upward = new Vector3(0, 1, 0);

export const buildMapPinGeometry = (size: number): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new ConeGeometry(0.018 * size, 0.5 * size, 6, 1),
      colour: "#d9dee6",
      position: [0, 0.25 * size, 0],
      rotation: [Math.PI, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.05 * size, 0.07 * size, 0.04 * size, 8),
      colour: "#b3203d",
      position: [0, 0.52 * size, 0],
    },
    {
      geometry: new SphereGeometry(0.15 * size, 10, 8),
      colour: geographyPalette.marker,
      position: [0, 0.64 * size, 0],
      isSmooth: true,
    },
    {
      geometry: new SphereGeometry(0.045 * size, 5, 3),
      colour: "#ffd6de",
      position: [-0.055 * size, 0.7 * size, 0.1 * size],
      isSmooth: true,
    },
  ]);

export const MapPin = ({
  position,
  normal,
  size,
}: {
  position: PinTriple;
  normal: PinTriple;
  size: number;
}) => {
  const holder = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  const geometry = useMemo(() => buildMapPinGeometry(size), [size]);
  useDisposedOnUnmount(geometry);
  const quaternion = useMemo(
    () =>
      new Quaternion().setFromUnitVectors(
        upward,
        new Vector3(...normal).normalize(),
      ),
    [normal],
  );

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    const body = holder.current;
    if (body === null) {
      return;
    }
    const drop =
      motionScale === 0
        ? 0
        : (1 - Math.min(1, age.current / pinDropSeconds)) ** 2 *
          pinDropHeight *
          size;
    const bob =
      (0.5 + 0.5 * Math.sin(age.current * 2.6)) *
      pinBobHeight *
      size *
      motionScale;
    const lift = drop + bob;
    body.position.set(
      position[0] + normal[0] * lift,
      position[1] + normal[1] * lift,
      position[2] + normal[2] * lift,
    );
    const squash =
      motionScale === 0
        ? 1
        : easeOutBack(Math.min(1, age.current / pinDropSeconds));
    body.scale.setScalar(Math.max(0.01, squash));
  });

  return (
    <group ref={holder} position={position} quaternion={quaternion}>
      <mesh geometry={geometry} name="map-pin">
        <meshPhysicalMaterial
          vertexColors
          roughness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
    </group>
  );
};
