import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  ConeGeometry,
  Object3D,
  SphereGeometry,
  type BufferGeometry,
  type InstancedMesh,
  type MeshPhysicalMaterial,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  findStepChange,
  type OneMoreOneLessQuestion,
} from "../curriculum/one-more-one-less.js";
import { splitTensAndOnes } from "../curriculum/tens-and-ones.js";
import {
  findGrowth,
  promptGrowSeconds,
  usePromptGrowth,
  usePromptPosition,
} from "./bay-stage.js";
import { useDisposedOnUnmount } from "./studio-stage.js";

export const placeValuePalette = {
  rod: "#1d7f86",
  rodEdge: "#0e4f5c",
  changingRod: "#f2b63d",
  one: "#1d7f86",
  plinth: "#e6f3fa",
  fishBody: "#ffffff",
  fishEye: "#0d1526",
  fishShades: ["#ff9f5a", "#ffc94d", "#ff7d8f"],
} as const;

export const unitsInATen = 10;
const onesPerColumn = 5;
const largestOnes = 19;

export type Spot = [number, number];

export interface PlaceValueLayout {
  rodSpots: Spot[];
  oneSpots: Spot[];
  width: number;
  height: number;
}

export interface PlaceValueSizes {
  unit: number;
  rodGap: number;
  oneGap: number;
  groupGap: number;
}

export const findPlaceValueSizes = (unit: number): PlaceValueSizes => ({
  unit,
  rodGap: unit * 1.45,
  oneGap: unit * 1.25,
  groupGap: unit * 1.6,
});

export const listPlaceValueSpots = (
  tens: number,
  ones: number,
  { unit, rodGap, oneGap, groupGap }: PlaceValueSizes,
): PlaceValueLayout => {
  const shownOnes = Math.min(ones, largestOnes);
  const oneColumns = Math.ceil(shownOnes / onesPerColumn);
  const rodsWidth = Math.max(0, tens - 1) * rodGap + (tens > 0 ? unit : 0);
  const onesWidth = oneColumns === 0 ? 0 : (oneColumns - 1) * oneGap + unit;
  const gap = tens > 0 && oneColumns > 0 ? groupGap : 0;
  const width = rodsWidth + gap + onesWidth;
  const height = unitsInATen * unit;
  const left = -width / 2 + unit / 2;
  const bottom = -height / 2 + unit / 2;
  const rodSpots = Array.from({ length: tens }, (_, index): Spot => [
    left + index * rodGap,
    0,
  ]);
  const onesLeft = left + rodsWidth + gap;
  const oneSpots = Array.from({ length: shownOnes }, (_, index): Spot => {
    const column = Math.floor(index / onesPerColumn);
    const row = index % onesPerColumn;
    return [onesLeft + column * oneGap, bottom + row * oneGap];
  });
  return { rodSpots, oneSpots, width, height };
};

export const buildTenRodGeometry = (unit: number): BufferGeometry => {
  const cubeSize = unit * 0.9;
  const cubes = Array.from({ length: unitsInATen }, (_, index) =>
    new BoxGeometry(cubeSize, cubeSize, cubeSize).translate(
      0,
      (index - (unitsInATen - 1) / 2) * unit,
      0,
    ),
  );
  const rod = mergeGeometries(cubes);
  cubes.forEach((cube) => {
    cube.dispose();
  });
  return rod;
};

export const useTenRodGeometry = (unit: number) => {
  const geometry = useMemo(() => buildTenRodGeometry(unit), [unit]);
  useDisposedOnUnmount(geometry);
  return geometry;
};

const paintGeometry = (geometry: BufferGeometry, hex: string) => {
  const colour = new Color(hex);
  const count = geometry.getAttribute("position").count;
  const colours = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    colours.set([colour.r, colour.g, colour.b], index * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colours, 3));
  return geometry;
};

export const mergePaintedGeometries = (
  parts: readonly { geometry: BufferGeometry; colour: string }[],
): BufferGeometry => {
  const painted = parts.map(({ geometry, colour }) =>
    paintGeometry(
      geometry.index === null ? geometry : geometry.toNonIndexed(),
      colour,
    ),
  );
  const merged = mergeGeometries(painted);
  painted.forEach((part) => {
    part.dispose();
  });
  parts.forEach(({ geometry }) => {
    geometry.dispose();
  });
  return merged;
};

// Low-poly, since a count of 99 draws 99 of them: nine shoals of ten and nine more.
export const buildSmallFishGeometry = (length: number): BufferGeometry =>
  mergePaintedGeometries([
    {
      geometry: new SphereGeometry(1, 6, 3).scale(
        length * 0.5,
        length * 0.32,
        length * 0.24,
      ),
      colour: placeValuePalette.fishBody,
    },
    {
      geometry: new ConeGeometry(length * 0.26, length * 0.3, 3, 1, true)
        .rotateZ(Math.PI / 2)
        .translate(-length * 0.6, 0, 0),
      colour: placeValuePalette.fishBody,
    },
    {
      geometry: new SphereGeometry(length * 0.07, 3, 2).translate(
        length * 0.27,
        length * 0.08,
        length * 0.17,
      ),
      colour: placeValuePalette.fishEye,
    },
  ]);

// A ten drawn as ten fish stacked nose over nose, the height of a ten-rod, so every fish a "How many fish?" asks about
// is in the picture while the tens still stand apart from the ones.
export const buildTenShoalGeometry = (
  fishLength: number,
  unit: number,
): BufferGeometry => {
  const fish = Array.from({ length: unitsInATen }, (_, index) =>
    buildSmallFishGeometry(fishLength).translate(
      0,
      (index - (unitsInATen - 1) / 2) * unit,
      0,
    ),
  );
  const shoal = mergeGeometries(fish);
  fish.forEach((one) => {
    one.dispose();
  });
  return shoal;
};

export const placeSpots = (
  mesh: InstancedMesh | null,
  spots: readonly Spot[],
  placer: Object3D,
  findPlacement: (
    spot: Spot,
    index: number,
  ) => { offset: [number, number, number]; scale: number; turn?: number },
) => {
  if (mesh === null) {
    return;
  }
  spots.forEach((spot, index) => {
    const { offset, scale, turn = 0 } = findPlacement(spot, index);
    placer.position.set(spot[0] + offset[0], spot[1] + offset[1], offset[2]);
    placer.rotation.set(0, turn, 0);
    placer.scale.setScalar(scale);
    placer.updateMatrix();
    mesh.setMatrixAt(index, placer.matrix);
  });
  mesh.count = spots.length;
  mesh.instanceMatrix.needsUpdate = true;
};

export const paintInstances = (
  instances: InstancedMesh | null,
  count: number,
  pickColour: (index: number) => string,
) => {
  if (instances === null) {
    return;
  }
  for (let index = 0; index < count; index++) {
    instances.setColorAt(index, new Color(pickColour(index)));
  }
  if (instances.instanceColor !== null) {
    instances.instanceColor.needsUpdate = true;
  }
};

export const TenRodMaterial = ({
  colour = placeValuePalette.rod,
}: {
  colour?: string;
}) => (
  <meshPhysicalMaterial
    color={colour}
    roughness={0.26}
    clearcoat={1}
    clearcoatRoughness={0.08}
    sheen={0.3}
    sheenColor="#bdf3ff"
  />
);

export const Plinth = ({ width, y }: { width: number; y: number }) => {
  const geometry = useMemo(
    () => new RoundedBoxGeometry(width, 0.07, 0.42, 1, 0.03),
    [width],
  );
  useDisposedOnUnmount(geometry);
  return (
    <mesh
      geometry={geometry}
      position={[0, y, -0.06]}
      name="place-value-plinth"
    >
      <meshPhysicalMaterial
        color={placeValuePalette.plinth}
        roughness={0.3}
        clearcoat={0.8}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </mesh>
  );
};

const schoolUnit = 0.155;
const appearStaggerSeconds = 0.06;
const fishLength = schoolUnit * 1.6;
const shoalFishLength = schoolUnit * 1.2;
const pickShade = (index: number) =>
  placeValuePalette.fishShades[index % placeValuePalette.fishShades.length];
const pickFishShade = (index: number) =>
  pickShade(Math.floor(index / onesPerColumn));

export const PlaceValueSchool = ({ count }: { count: number }) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const sizes = useMemo(
    () => ({
      ...findPlaceValueSizes(schoolUnit),
      rodGap: shoalFishLength * 1.3,
      oneGap: fishLength * 1.25,
    }),
    [],
  );
  const { tens, ones } = splitTensAndOnes(count);
  const layout = useMemo(
    () => listPlaceValueSpots(tens, ones, sizes),
    [tens, ones, sizes],
  );
  const shoalGeometry = useMemo(
    () => buildTenShoalGeometry(shoalFishLength, schoolUnit),
    [],
  );
  useDisposedOnUnmount(shoalGeometry);
  const fishGeometry = useMemo(() => buildSmallFishGeometry(fishLength), []);
  useDisposedOnUnmount(fishGeometry);
  const placer = useMemo(() => new Object3D(), []);
  const shoals = useRef<InstancedMesh>(null);
  const fish = useRef<InstancedMesh>(null);
  const fishCount = layout.oneSpots.length;
  useEffect(() => {
    paintInstances(fish.current, fishCount, pickFishShade);
  }, [fishCount]);
  useEffect(() => {
    paintInstances(shoals.current, tens, pickShade);
  }, [tens]);

  useFrame(() => {
    const time = age.current * motionScale;
    placeSpots(shoals.current, layout.rodSpots, placer, ([x], index) => ({
      offset: [0, Math.sin(time * 1.1 + x * 2) * 0.025, 0],
      scale: findGrowth(
        age.current - index * appearStaggerSeconds,
        promptGrowSeconds,
        motionScale,
      ),
    }));
    placeSpots(fish.current, layout.oneSpots, placer, (_spot, index) => ({
      offset: [
        Math.sin(time * 1.3 + index) * 0.03,
        Math.sin(time * 1.8 + index * 0.7) * 0.02,
        0,
      ],
      scale: findGrowth(
        age.current - (layout.rodSpots.length + index) * appearStaggerSeconds,
        promptGrowSeconds,
        motionScale,
      ),
      turn: Math.sin(time * 2 + index) * 0.25,
    }));
  });

  return (
    <group position={position} name="place-value-school">
      <instancedMesh
        ref={shoals}
        args={[shoalGeometry, undefined, unitsInATen]}
        frustumCulled={false}
        name="ten-shoals"
      >
        <meshPhysicalMaterial
          vertexColors
          roughness={0.3}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
        />
      </instancedMesh>
      <instancedMesh
        ref={fish}
        args={[fishGeometry, undefined, largestOnes]}
        frustumCulled={false}
        name="one-fish"
      >
        <meshPhysicalMaterial
          vertexColors
          roughness={0.3}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
        />
      </instancedMesh>
      <Plinth width={layout.width + 0.5} y={-layout.height / 2 - 0.1} />
    </group>
  );
};

export interface ChangingTenLayout {
  settledTens: number;
  ones: number;
  changingRodIndex: number;
  slotCount: number;
}

export const buildChangingTenLayout = ({
  start,
  step,
}: OneMoreOneLessQuestion): ChangingTenLayout => {
  const { tens, ones } = splitTensAndOnes(start);
  const isMore = findStepChange(step) > 0;
  return {
    settledTens: isMore ? tens : tens - 1,
    ones,
    changingRodIndex: isMore ? tens : tens - 1,
    slotCount: isMore ? tens + 1 : tens,
  };
};

const framesUnit = 0.15;

export const PlaceValueFrames = ({
  oneMoreOneLess,
}: {
  oneMoreOneLess: OneMoreOneLessQuestion;
}) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const sizes = useMemo(() => findPlaceValueSizes(framesUnit), []);
  const layout = useMemo(
    () => buildChangingTenLayout(oneMoreOneLess),
    [oneMoreOneLess],
  );
  const spots = useMemo(
    () => listPlaceValueSpots(layout.slotCount, layout.ones, sizes),
    [layout, sizes],
  );
  const settledSpots = spots.rodSpots.filter(
    (_spot, index) => index !== layout.changingRodIndex,
  );
  const changingSpot = spots.rodSpots[layout.changingRodIndex];
  const isMore = findStepChange(oneMoreOneLess.step) > 0;
  const rodGeometry = useTenRodGeometry(framesUnit);
  const cubeGeometry = useMemo(
    () => new BoxGeometry(framesUnit * 0.9, framesUnit * 0.9, framesUnit * 0.9),
    [],
  );
  useDisposedOnUnmount(cubeGeometry);
  const placer = useMemo(() => new Object3D(), []);
  const rods = useRef<InstancedMesh>(null);
  const cubes = useRef<InstancedMesh>(null);
  const changing = useRef<InstancedMesh>(null);
  const changingMaterial = useRef<MeshPhysicalMaterial>(null);

  useFrame(() => {
    const growth = (delay: number) =>
      findGrowth(age.current - delay, promptGrowSeconds, motionScale);
    placeSpots(rods.current, settledSpots, placer, (_spot, index) => ({
      offset: [0, (1 - growth(index * appearStaggerSeconds)) * 0.6, 0],
      scale: 1,
    }));
    placeSpots(cubes.current, spots.oneSpots, placer, (_spot, index) => ({
      offset: [0, 0, 0],
      scale: growth(0.2 + index * 0.03),
    }));
    const pulse = 0.5 + 0.5 * Math.sin(age.current * 4 * motionScale);
    const travel = Math.min(1, age.current / 1.2);
    const lift = isMore ? (1 - travel) * 0.5 : 0.18 + travel * 0.22;
    placeSpots(changing.current, [changingSpot], placer, () => ({
      offset: [0, lift, 0.12 + pulse * 0.04 * motionScale],
      scale: 1,
    }));
    if (changingMaterial.current !== null) {
      changingMaterial.current.opacity = isMore
        ? 0.7 + pulse * 0.3
        : 0.32 + pulse * 0.18;
      changingMaterial.current.emissiveIntensity = isMore
        ? 0.3 + pulse * 0.35
        : 0.08;
    }
  });

  return (
    <group position={position} name="place-value-frames">
      <instancedMesh
        ref={rods}
        args={[rodGeometry, undefined, unitsInATen]}
        frustumCulled={false}
        name="ten-rods"
      >
        <TenRodMaterial />
      </instancedMesh>
      <instancedMesh
        ref={cubes}
        args={[cubeGeometry, undefined, unitsInATen]}
        frustumCulled={false}
        name="one-cubes"
      >
        <TenRodMaterial colour={placeValuePalette.one} />
      </instancedMesh>
      <instancedMesh
        ref={changing}
        args={[rodGeometry, undefined, 1]}
        frustumCulled={false}
        name={isMore ? "ten-rod-added" : "ten-rod-taken"}
      >
        <meshPhysicalMaterial
          ref={changingMaterial}
          color={isMore ? placeValuePalette.changingRod : placeValuePalette.rod}
          emissive={
            isMore ? placeValuePalette.changingRod : placeValuePalette.rod
          }
          roughness={0.25}
          clearcoat={1}
          transparent
          depthWrite={false}
        />
      </instancedMesh>
      <Plinth width={spots.width + 0.5} y={-spots.height / 2 - 0.1} />
    </group>
  );
};
