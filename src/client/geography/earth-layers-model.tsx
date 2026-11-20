import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  DoubleSide,
  RingGeometry,
  SphereGeometry,
  type BufferGeometry,
  type Group,
  type MeshPhysicalMaterial,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { earthLayers, type EarthLayer } from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import { BobbingArrow } from "./answer-pointer.js";
import {
  earthShape,
  findLayerArrow,
  findLayerInnerRadius,
  findWedgeTurn,
  wedgeAngles,
} from "./cutaway-layout.js";
import {
  findPulse,
  geographyPalette,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";

const layerColours: Record<EarthLayer, string> = {
  crust: "#8a5a3b",
  mantle: "#d9502c",
  "outer-core": "#f59a23",
  "inner-core": "#ffe08a",
};

const layerSegments: Record<EarthLayer, [number, number]> = {
  crust: [32, 18],
  mantle: [24, 16],
  "outer-core": [24, 16],
  "inner-core": [20, 14],
};

const wedgeWidth = wedgeAngles[1] - wedgeAngles[0];
const shellStart = wedgeAngles[1];
const shellLength = Math.PI * 2 - wedgeWidth;

const buildCutFace = (
  innerRadius: number,
  outerRadius: number,
  angle: number,
): BufferGeometry =>
  new RingGeometry(
    Math.max(innerRadius, 0.001),
    outerRadius,
    28,
    1,
    -Math.PI / 2,
    Math.PI,
  ).rotateY(findWedgeTurn(angle));

const buildShellGeometry = (layer: EarthLayer): BufferGeometry => {
  const [across, down] = layerSegments[layer];
  return new SphereGeometry(
    earthShape.radii[layer],
    across,
    down,
    shellStart,
    shellLength,
  );
};

const buildCutFacesGeometry = (layer: EarthLayer): BufferGeometry => {
  const faces = wedgeAngles.map((angle) =>
    buildCutFace(findLayerInnerRadius(layer), earthShape.radii[layer], angle),
  );
  const merged = mergeGeometries(faces);
  faces.forEach((face) => {
    face.dispose();
  });
  return merged;
};

const EarthLayerPiece = ({
  layer,
  isAsked,
}: {
  layer: EarthLayer;
  isAsked: boolean;
}) => {
  const shell = useMemo(() => buildShellGeometry(layer), [layer]);
  const faces = useMemo(() => buildCutFacesGeometry(layer), [layer]);
  useDisposedOnUnmount(shell);
  useDisposedOnUnmount(faces);
  const material = useRef<MeshPhysicalMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    if (material.current !== null && isAsked) {
      material.current.emissiveIntensity =
        0.35 + 0.45 * findPulse(age.current, motionScale);
    }
  });

  const isSurface = layer === "crust";

  return (
    <group name={`earth-${layer}`}>
      <mesh geometry={shell}>
        <meshPhysicalMaterial
          color={isSurface ? geographyPalette.sea : layerColours[layer]}
          roughness={isSurface ? 0.35 : 0.5}
          clearcoat={isSurface ? 0.8 : 0.3}
          side={DoubleSide}
        />
      </mesh>
      <mesh geometry={faces}>
        <meshPhysicalMaterial
          ref={material}
          color={layerColours[layer]}
          roughness={0.6}
          emissive={isAsked ? geographyPalette.highlight : "#000000"}
          emissiveIntensity={isAsked ? 0.6 : 0}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
};

export const EarthLayersModel = ({ layer }: { layer: EarthLayer }) => {
  const turner = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    if (turner.current !== null) {
      turner.current.rotation.y =
        Math.sin(age.current * 0.4) * 0.18 * motionScale;
    }
  });

  return (
    <group position={earthShape.centre} name="earth-layers">
      <group ref={turner}>
        {earthLayers.map((shownLayer) => (
          <EarthLayerPiece
            key={shownLayer}
            layer={shownLayer}
            isAsked={shownLayer === layer}
          />
        ))}
        <BobbingArrow aim={findLayerArrow(layer)} />
      </group>
    </group>
  );
};
