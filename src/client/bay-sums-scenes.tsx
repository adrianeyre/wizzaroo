import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  DoubleSide,
  Object3D,
  OctahedronGeometry,
  SphereGeometry,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type MeshPhysicalMaterial,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { AdditionQuestion } from "../curriculum/adding-to-20.js";
import type { TakingAwayQuestion } from "../curriculum/taking-away-within-20.js";
import { splitTensAndOnes } from "../curriculum/tens-and-ones.js";
import {
  findGrowth,
  promptGrowSeconds,
  usePromptGrowth,
  usePromptPosition,
} from "./bay-stage.js";
import {
  TenRodMaterial,
  findPlaceValueSizes,
  listPlaceValueSpots,
  mergePaintedGeometries,
  placeSpots,
  unitsInATen,
  useTenRodGeometry,
  type PlaceValueLayout,
  type Spot,
} from "./bay-place-value.js";
import { useDisposedOnUnmount } from "./studio-stage.js";

const sumsPalette = {
  shell: "#f3ece4",
  shellSheen: "#d6f1ff",
  pearl: "#fbf7f1",
  plus: "#e9eef5",
  crabShell: "#d9573f",
  crabClaw: "#c2412f",
  crabEye: "#14161f",
} as const;

const pearlsPerRow = 5;
const largestPart = 10;
const shellTilt = 1.05;
const lidOpenTurn = -1.85;
const lidOpenSeconds = 0.8;
const appearStaggerSeconds = 0.04;

const pearlSpacing = 0.22;
const pearlRadius = 0.085;
const sumsUnit = 0.11;
const clamGap = 0.62;
const shellRim = 0.24;

export const listPearlSpots = (count: number): Spot[] => {
  const shownCount = Math.min(count, largestPart);
  const rowCount = Math.ceil(shownCount / pearlsPerRow);
  return Array.from({ length: shownCount }, (_, index): Spot => {
    const row = Math.floor(index / pearlsPerRow);
    const column = index % pearlsPerRow;
    return [
      (column - (pearlsPerRow - 1) / 2) * pearlSpacing,
      ((rowCount - 1) / 2 - row) * pearlSpacing,
    ];
  });
};

interface ClamContents {
  rodSpots: Spot[];
  pearlSpots: Spot[];
  halfWidth: number;
  halfDepth: number;
}

const buildClamContents = (count: number): ClamContents => {
  if (count <= largestPart) {
    const pearlSpots = listPearlSpots(count);
    return {
      rodSpots: [],
      pearlSpots,
      halfWidth: (pearlsPerRow * pearlSpacing) / 2,
      halfDepth: Math.max(1, Math.ceil(count / pearlsPerRow)) * pearlSpacing,
    };
  }
  const { tens, ones } = splitTensAndOnes(count);
  const layout: PlaceValueLayout = listPlaceValueSpots(
    tens,
    ones,
    findPlaceValueSizes(sumsUnit),
  );
  return {
    rodSpots: layout.rodSpots,
    pearlSpots: layout.oneSpots,
    halfWidth: layout.width / 2,
    halfDepth: layout.height / 2,
  };
};

const buildFlutedShellGeometry = (isLid: boolean): BufferGeometry => {
  const shell = new SphereGeometry(
    1,
    20,
    5,
    0,
    Math.PI * 2,
    isLid ? 0 : Math.PI / 2,
    Math.PI / 2,
  );
  const positions = shell.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const fluting = 1 + 0.045 * Math.cos(Math.atan2(z, x) * 14);
    positions.setXYZ(index, x * fluting, positions.getY(index), z * fluting);
  }
  shell.computeVertexNormals();
  return shell;
};

const useShellGeometries = () => {
  const geometries = useMemo(
    () => ({
      bowl: buildFlutedShellGeometry(false),
      lid: buildFlutedShellGeometry(true),
      pearl: new SphereGeometry(pearlRadius, 8, 6),
      plus: mergeGeometries([
        new BoxGeometry(0.34, 0.08, 0.08),
        new BoxGeometry(0.08, 0.34, 0.08),
      ]),
    }),
    [],
  );
  useDisposedOnUnmount(geometries.bowl);
  useDisposedOnUnmount(geometries.lid);
  useDisposedOnUnmount(geometries.pearl);
  useDisposedOnUnmount(geometries.plus);
  return geometries;
};

const ShellMaterial = () => (
  <meshPhysicalMaterial
    color={sumsPalette.shell}
    roughness={0.32}
    clearcoat={1}
    clearcoatRoughness={0.1}
    iridescence={1}
    iridescenceIOR={1.35}
    sheen={0.5}
    sheenColor={sumsPalette.shellSheen}
    side={DoubleSide}
  />
);

interface ClamProps {
  contents: ClamContents;
  centreX: number;
  geometries: ReturnType<typeof useShellGeometries>;
  ageSeconds: { current: number };
  motionScale: number;
}

const Clam = ({
  contents,
  centreX,
  geometries,
  ageSeconds,
  motionScale,
}: ClamProps) => {
  const lid = useRef<Group>(null);
  const radiusX = contents.halfWidth + shellRim;
  const radiusZ = contents.halfDepth + 0.2;

  useFrame(() => {
    const opening =
      motionScale === 0
        ? 1
        : Math.min(
            1,
            Math.max(0, (ageSeconds.current - 0.15) / lidOpenSeconds),
          );
    if (lid.current !== null) {
      lid.current.rotation.x = lidOpenTurn * (1 - (1 - opening) ** 3);
    }
  });

  return (
    <group position={[centreX, 0, 0]} rotation={[shellTilt, 0, 0]}>
      <mesh geometry={geometries.bowl} scale={[radiusX, 0.26, radiusZ]}>
        <ShellMaterial />
      </mesh>
      <group ref={lid} position={[0, 0, -radiusZ]}>
        <mesh
          geometry={geometries.lid}
          position={[0, 0, radiusZ]}
          scale={[radiusX, 0.3, radiusZ]}
        >
          <ShellMaterial />
        </mesh>
      </group>
    </group>
  );
};

const placeOnShellFloor = ([x, y]: Spot, centreX: number): Spot => [
  centreX + x,
  y,
];

export const ShellSums = ({ addition }: { addition: AdditionQuestion }) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const geometries = useShellGeometries();
  const rodGeometry = useTenRodGeometry(sumsUnit);
  const placer = useMemo(() => new Object3D(), []);
  const pearls = useRef<InstancedMesh>(null);
  const rods = useRef<InstancedMesh>(null);
  const whole = useRef<Group>(null);
  const plus = useRef<Group>(null);

  const layout = useMemo(() => {
    const first = buildClamContents(addition.first);
    const second = buildClamContents(addition.second);
    const firstWidth = first.halfWidth + shellRim;
    const secondWidth = second.halfWidth + shellRim;
    const total = 2 * firstWidth + clamGap + 2 * secondWidth;
    const firstCentre = -total / 2 + firstWidth;
    const secondCentre = total / 2 - secondWidth;
    const plusX = -total / 2 + 2 * firstWidth + clamGap / 2;
    return {
      first,
      second,
      firstCentre,
      secondCentre,
      plusX,
      pearlSpots: [
        ...first.pearlSpots.map((spot) => placeOnShellFloor(spot, firstCentre)),
        ...second.pearlSpots.map((spot) =>
          placeOnShellFloor(spot, secondCentre),
        ),
      ],
      rodSpots: [
        ...first.rodSpots.map((spot) => placeOnShellFloor(spot, firstCentre)),
        ...second.rodSpots.map((spot) => placeOnShellFloor(spot, secondCentre)),
      ],
    };
  }, [addition]);

  useFrame(() => {
    const time = age.current * motionScale;
    whole.current?.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    if (plus.current !== null) {
      plus.current.rotation.y = Math.sin(time * 0.9) * 0.35;
    }
    const settle = (index: number) =>
      findGrowth(
        age.current - 0.5 - index * appearStaggerSeconds,
        promptGrowSeconds,
        motionScale,
      );
    placeSpots(pearls.current, layout.pearlSpots, placer, (_spot, index) => ({
      offset: [0, 0, -0.03],
      scale: settle(index),
    }));
    placeSpots(rods.current, layout.rodSpots, placer, (_spot, index) => ({
      offset: [0, 0, -0.02],
      scale: settle(index),
    }));
  });

  return (
    <group position={position} name="shell-sums">
      <group ref={whole}>
        <Clam
          contents={layout.first}
          centreX={layout.firstCentre}
          geometries={geometries}
          ageSeconds={age}
          motionScale={motionScale}
        />
        <Clam
          contents={layout.second}
          centreX={layout.secondCentre}
          geometries={geometries}
          ageSeconds={age}
          motionScale={motionScale}
        />
        <group ref={plus} position={[layout.plusX, 0.05, 0.2]}>
          <mesh geometry={geometries.plus} name="plus-sign">
            <meshPhysicalMaterial
              color={sumsPalette.plus}
              metalness={0.6}
              roughness={0.22}
              clearcoat={1}
            />
          </mesh>
        </group>
        <group rotation={[shellTilt - Math.PI / 2, 0, 0]}>
          <instancedMesh
            ref={pearls}
            args={[geometries.pearl, undefined, largestPart * 2]}
            frustumCulled={false}
            name="pearls"
          >
            <meshPhysicalMaterial
              color={sumsPalette.pearl}
              roughness={0.12}
              clearcoat={1}
              clearcoatRoughness={0.04}
              iridescence={0.6}
              sheen={0.6}
              sheenColor={sumsPalette.shellSheen}
            />
          </instancedMesh>
          <instancedMesh
            ref={rods}
            args={[rodGeometry, undefined, 2 * (unitsInATen - 1)]}
            frustumCulled={false}
            name="ten-rods"
          >
            <TenRodMaterial />
          </instancedMesh>
        </group>
      </group>
    </group>
  );
};

const crabSize = 0.2;
const crabSpacing = { x: 0.5, y: 0.4, betweenTens: 0.14 };
const crabTiltTowardsViewer = 0.95;
const crabsPerRow = 5;
const largestCrabGroup = 20;
const leaveDelaySeconds = 1.1;
const leaveSeconds = 1.3;

const buildCrabGeometry = (): BufferGeometry => {
  const legs = [-1, 1].map((side) =>
    new BoxGeometry(crabSize * 2.6, crabSize * 0.08, crabSize * 0.09)
      .rotateY(side * 0.35)
      .translate(0, -crabSize * 0.15, side * crabSize * 0.05),
  );
  return mergePaintedGeometries([
    {
      geometry: new SphereGeometry(1, 8, 5).scale(
        crabSize,
        crabSize * 0.5,
        crabSize * 0.72,
      ),
      colour: sumsPalette.crabShell,
    },
    ...[-1, 1].map((side) => ({
      geometry: new SphereGeometry(crabSize * 0.36, 5, 3)
        .scale(1, 0.7, 0.8)
        .translate(side * crabSize * 1.05, crabSize * 0.1, crabSize * 0.55),
      colour: sumsPalette.crabClaw,
    })),
    ...[-1, 1].map((side) => ({
      geometry: new OctahedronGeometry(crabSize * 0.14).translate(
        side * crabSize * 0.32,
        crabSize * 0.52,
        crabSize * 0.48,
      ),
      colour: sumsPalette.crabEye,
    })),
    ...legs.map((geometry) => ({
      geometry,
      colour: sumsPalette.crabClaw,
    })),
  ]).rotateX(crabTiltTowardsViewer);
};

export const listCrabSpots = (count: number): Spot[] => {
  const shownCount = Math.min(count, largestCrabGroup);
  const rowCount = Math.ceil(shownCount / crabsPerRow);
  const tensGap = rowCount > 2 ? crabSpacing.betweenTens : 0;
  const height = (rowCount - 1) * crabSpacing.y + tensGap;
  return Array.from({ length: shownCount }, (_, index): Spot => {
    const row = Math.floor(index / crabsPerRow);
    const column = index % crabsPerRow;
    return [
      (column - (crabsPerRow - 1) / 2) * crabSpacing.x,
      height / 2 -
        row * crabSpacing.y -
        (row >= 2 ? crabSpacing.betweenTens : 0),
    ];
  });
};

export interface TakeAwayPicture {
  tens: number;
  ones: number;
  leavingTens: number;
  leavingOnes: number;
}

export const buildTakeAwayPicture = ({
  start,
  takenAway,
}: TakingAwayQuestion): TakeAwayPicture => {
  if (start <= largestCrabGroup) {
    return { tens: 0, ones: start, leavingTens: 0, leavingOnes: takenAway };
  }
  const { tens, ones } = splitTensAndOnes(start);
  if (takenAway % unitsInATen === 0) {
    return {
      tens,
      ones,
      leavingTens: takenAway / unitsInATen,
      leavingOnes: 0,
    };
  }
  const isExchanged = takenAway > ones;
  return {
    tens: isExchanged ? tens - 1 : tens,
    ones: isExchanged ? ones + unitsInATen : ones,
    leavingTens: 0,
    leavingOnes: takenAway,
  };
};

const placeValueCrabUnit = 0.12;

const layOutTakeAway = (picture: TakeAwayPicture) => {
  if (picture.tens === 0) {
    return { rodSpots: [], crabSpots: listCrabSpots(picture.ones) };
  }
  const rodsWidth =
    (picture.tens - 1) * placeValueCrabUnit * 1.45 + placeValueCrabUnit;
  const rodSpots = listPlaceValueSpots(
    picture.tens,
    0,
    findPlaceValueSizes(placeValueCrabUnit),
  ).rodSpots;
  const crabs = listCrabSpots(picture.ones);
  const crabsWidth = (Math.min(picture.ones, crabsPerRow) - 1) * crabSpacing.x;
  const gap = 0.45;
  const total = rodsWidth + gap + crabsWidth;
  const rodShift = -total / 2 + rodsWidth / 2;
  const crabShift = total / 2 - crabsWidth / 2;
  return {
    rodSpots: rodSpots.map(([x, y]): Spot => [x + rodShift, y]),
    crabSpots: crabs.map(([x, y]): Spot => [x + crabShift, y]),
  };
};

const findLeaving = (ageSeconds: number, motionScale: number) =>
  motionScale === 0
    ? 1
    : Math.min(1, Math.max(0, (ageSeconds - leaveDelaySeconds) / leaveSeconds));

export const CrabTakeAway = ({
  takingAway,
}: {
  takingAway: TakingAwayQuestion;
}) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const picture = useMemo(() => buildTakeAwayPicture(takingAway), [takingAway]);
  const layout = useMemo(() => layOutTakeAway(picture), [picture]);
  const stayingCrabs = layout.crabSpots.slice(
    0,
    layout.crabSpots.length - picture.leavingOnes,
  );
  const leavingCrabs = layout.crabSpots.slice(
    layout.crabSpots.length - picture.leavingOnes,
  );
  const stayingRods = layout.rodSpots.slice(
    0,
    layout.rodSpots.length - picture.leavingTens,
  );
  const leavingRods = layout.rodSpots.slice(
    layout.rodSpots.length - picture.leavingTens,
  );
  const crabGeometry = useMemo(() => buildCrabGeometry(), []);
  useDisposedOnUnmount(crabGeometry);
  const rodGeometry = useTenRodGeometry(placeValueCrabUnit);
  const placer = useMemo(() => new Object3D(), []);
  const crabs = useRef<InstancedMesh>(null);
  const crabsLeaving = useRef<InstancedMesh>(null);
  const rods = useRef<InstancedMesh>(null);
  const rodsLeaving = useRef<InstancedMesh>(null);
  const leavingCrabMaterial = useRef<MeshPhysicalMaterial>(null);
  const leavingRodMaterial = useRef<MeshPhysicalMaterial>(null);

  useFrame(() => {
    const time = age.current * motionScale;
    const leaving = findLeaving(age.current, motionScale);
    const appear = (index: number) =>
      findGrowth(
        age.current - index * appearStaggerSeconds,
        promptGrowSeconds,
        motionScale,
      );
    const scuttle = (index: number) =>
      Math.sin(time * 14 + index) * 0.015 * (1 - leaving);
    placeSpots(crabs.current, stayingCrabs, placer, (_spot, index) => ({
      offset: [Math.sin(time * 1.4 + index) * 0.012, 0, 0],
      scale: appear(index),
      turn: Math.sin(time * 0.8 + index) * 0.08,
    }));
    placeSpots(crabsLeaving.current, leavingCrabs, placer, (_spot, index) => ({
      offset: [leaving * 0.9 + scuttle(index), leaving * 0.08, leaving * 0.25],
      scale: appear(stayingCrabs.length + index),
      turn: leaving * 0.25,
    }));
    placeSpots(rods.current, stayingRods, placer, (_spot, index) => ({
      offset: [0, 0, 0],
      scale: appear(index),
    }));
    placeSpots(rodsLeaving.current, leavingRods, placer, (_spot, index) => ({
      offset: [0, leaving * 0.45, leaving * 0.3],
      scale: appear(stayingRods.length + index),
    }));
    const opacity = 1 - leaving * 0.72;
    for (const material of [
      leavingCrabMaterial.current,
      leavingRodMaterial.current,
    ]) {
      if (material !== null) {
        material.opacity = opacity;
      }
    }
  });

  return (
    <group position={position} name="crab-take-away">
      <instancedMesh
        ref={crabs}
        args={[crabGeometry, undefined, largestCrabGroup]}
        frustumCulled={false}
        name="crabs"
      >
        <meshPhysicalMaterial
          vertexColors
          roughness={0.34}
          clearcoat={1}
          clearcoatRoughness={0.14}
          flatShading
        />
      </instancedMesh>
      <instancedMesh
        ref={crabsLeaving}
        args={[crabGeometry, undefined, largestCrabGroup]}
        frustumCulled={false}
        name="crabs-leaving"
      >
        <meshPhysicalMaterial
          ref={leavingCrabMaterial}
          vertexColors
          roughness={0.34}
          clearcoat={1}
          flatShading
          transparent
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={rods}
        args={[rodGeometry, undefined, unitsInATen]}
        frustumCulled={false}
        name="ten-rods"
      >
        <TenRodMaterial />
      </instancedMesh>
      <instancedMesh
        ref={rodsLeaving}
        args={[rodGeometry, undefined, unitsInATen]}
        frustumCulled={false}
        name="ten-rods-leaving"
      >
        <meshPhysicalMaterial
          ref={leavingRodMaterial}
          color="#1d7f86"
          roughness={0.26}
          clearcoat={1}
          transparent
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
};
