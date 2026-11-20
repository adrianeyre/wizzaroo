import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { GeographyShowOf } from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import { buildModelGeometry } from "../world-map-models.js";
import {
  geographyPalette,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";
import {
  buildBorrowedGeometry,
  landRadius,
  landscapeModels,
} from "./landscape-models.js";

const turntableTop = -1.08;
const turntableTilt = 0.24;
const featureScale = 1.08;
const landscapeWater = "#2f86d6";

const buildFeatureGeometries = (
  feature: GeographyShowOf<"landscape-lookout">["feature"],
) => {
  const model = landscapeModels[feature]();
  return {
    land: buildModelGeometry(model.land),
    water:
      model.water.length === 0 ? undefined : buildModelGeometry(model.water),
    borrowed:
      model.borrowed.length === 0
        ? undefined
        : model.borrowed.map(buildBorrowedGeometry),
  };
};

const BorrowedModels = ({
  geometries,
}: {
  geometries: ReturnType<typeof buildBorrowedGeometry>[];
}) => (
  <>
    {geometries.map((geometry) => (
      <mesh key={geometry.uuid} geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </mesh>
    ))}
  </>
);

export const LandscapeLookoutScene = ({
  show,
}: {
  show: GeographyShowOf<"landscape-lookout">;
}) => {
  const geometries = useMemo(
    () => buildFeatureGeometries(show.feature),
    [show.feature],
  );
  useDisposedOnUnmount(geometries.land);
  const extras = useMemo(
    () => ({
      dispose: () => {
        geometries.water?.dispose();
        geometries.borrowed?.forEach((geometry) => {
          geometry.dispose();
        });
      },
    }),
    [geometries],
  );
  useDisposedOnUnmount(extras);
  const turner = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    if (turner.current !== null) {
      turner.current.rotation.y = -0.4 + age.current * 0.22 * motionScale;
    }
  });

  return (
    <group
      position={[0, turntableTop, 0]}
      rotation={[turntableTilt, 0, 0]}
      scale={featureScale}
      name={`landscape-${show.feature}`}
    >
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry
          args={[landRadius + 0.1, landRadius + 0.16, 0.18, 48]}
        />
        <meshPhysicalMaterial
          color={geographyPalette.wood}
          roughness={0.5}
          clearcoat={0.6}
        />
      </mesh>
      <group ref={turner}>
        <mesh geometry={geometries.land}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.75}
            clearcoat={0.1}
            flatShading
          />
        </mesh>
        {geometries.water === undefined ? null : (
          <mesh geometry={geometries.water}>
            <meshStandardMaterial
              color={landscapeWater}
              roughness={0.55}
              envMapIntensity={0.15}
            />
          </mesh>
        )}
        {geometries.borrowed === undefined ? null : (
          <BorrowedModels geometries={geometries.borrowed} />
        )}
      </group>
    </group>
  );
};
