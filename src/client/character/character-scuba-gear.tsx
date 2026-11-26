import { useMemo } from "react";
import {
  CatmullRomCurve3,
  LatheGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { LiveryDecals } from "../islands/island-livery-models.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { buildLiveryGeometry } from "../islands/island-livery.js";
import {
  Part,
  ball,
  box,
  cylinder,
  partColours,
  ring,
  type Vector,
} from "./character-parts.js";

// The scuba outfit a Character puts on at the Dock before diving to the next
// Island: a black wetsuit with Wizzaroo purple panels and gold piping, a
// gold-banded air tank on their back carrying the Wizzaroo name and crest,
// its regulator hose to a mouthpiece, a mask over their eyes, and long fins
// on their feet. Their wand is stowed and their hat and glasses come off.

export const wetsuit = {
  body: "#111827",
  panel: "#5b21b6",
  piping: "#f5c542",
  rubber: "#1f2937",
  fin: "#7c3aed",
  finTip: "#f5c542",
  tank: "#f8fafc",
  valve: "#cbd5e1",
  hose: "#0f172a",
  glass: "#7dd3fc",
} as const;

const tankRadius = 0.15;
const tankBottom = -0.32;
const tankShoulder = 0.3;
const tankTop = 0.4;

const listTankProfile = (): Vector2[] => [
  new Vector2(0.001, tankBottom),
  new Vector2(tankRadius * 0.8, tankBottom + 0.005),
  new Vector2(tankRadius * 0.97, tankBottom + 0.04),
  new Vector2(tankRadius, tankBottom + 0.09),
  new Vector2(tankRadius, tankShoulder - 0.04),
  new Vector2(tankRadius * 0.9, tankShoulder + 0.03),
  new Vector2(tankRadius * 0.6, tankTop - 0.04),
  new Vector2(0.045, tankTop),
  new Vector2(0.001, tankTop + 0.002),
];

const buildTankGeometry = (): BufferGeometry =>
  new LatheGeometry(listTankProfile(), 40);

const buildTankLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    {
      surface: buildTankGeometry(),
      decals: [
        {
          face: "flag",
          centre: [0, 0.14, -tankRadius],
          outward: [0, 0, -1],
          up: [0, 1, 0],
          width: 0.2,
          height: 0.12,
        },
        {
          face: "name",
          centre: [0, -0.08, -tankRadius],
          outward: [0, 0, -1],
          up: [0, 1, 0],
          width: 0.24,
          height: 0.07,
        },
      ],
    },
  ]);

const TankBody = () => {
  const geometry = useBuiltGeometry(buildTankGeometry);
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        color={wetsuit.tank}
        roughness={0.28}
        metalness={0.35}
      />
    </mesh>
  );
};

const RegulatorHose = () => {
  const geometry = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3([
          new Vector3(0.09, 1.42, -0.42),
          new Vector3(0.32, 1.3, -0.3),
          new Vector3(0.38, 1.12, 0.05),
          new Vector3(0.22, 1.18, 0.36),
          new Vector3(0.05, 1.36, 0.46),
        ]),
        24,
        0.022,
        8,
      ),
    [],
  );
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={wetsuit.hose} roughness={0.5} />
    </mesh>
  );
};

/** The air tank, harness and regulator, worn on the back. */
export const ScubaTank = () => (
  <group name="scuba-tank" position={[0, 0.92, -0.42]}>
    <TankBody />
    <LiveryDecals buildGeometry={buildTankLiveryGeometry} name="scuba-livery" />
    {[0.2, -0.22].map((y) => (
      <Part key={y} colour={wetsuit.piping} position={[0, y, 0]}>
        {cylinder(tankRadius + 0.008, tankRadius + 0.008, 0.025, 32)}
      </Part>
    ))}
    <Part colour={wetsuit.valve} position={[0, tankTop + 0.04, 0]}>
      {cylinder(0.035, 0.045, 0.08, 14)}
    </Part>
    <Part
      colour={wetsuit.valve}
      position={[0, tankTop + 0.08, 0]}
      rotation={[0, 0, Math.PI / 2]}
    >
      {cylinder(0.02, 0.02, 0.16, 10)}
    </Part>
    <Part colour={partColours.gold} position={[0.09, tankTop + 0.08, 0]}>
      {ball(0.035)}
    </Part>
    {[0.12, -0.12].map((y) => (
      <Part
        key={y}
        colour={wetsuit.rubber}
        position={[0, y, 0.13]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        {ring(0.29, 0.025)}
      </Part>
    ))}
    <group position={[0, -0.92, 0.42]}>
      <RegulatorHose />
    </group>
  </group>
);

/** The wetsuit's panels and piping, worn over the torso. */
export const WetsuitPanels = () => (
  <group name="wetsuit">
    {([-1, 1] as const).map((side) => (
      <Part
        key={side}
        colour={wetsuit.panel}
        position={[side * 0.2, 0.86, 0.06]}
        rotation={[0, side * 0.75, 0]}
        scale={[1, 1, 0.35]}
      >
        {cylinder(0.08, 0.09, 0.56, 16)}
      </Part>
    ))}
    <Part colour={wetsuit.piping} position={[0, 1.07, 0]}>
      {cylinder(0.283, 0.287, 0.025, 36)}
    </Part>
    <Part colour={wetsuit.piping} position={[0, 0.62, 0]}>
      {cylinder(0.307, 0.311, 0.03, 36)}
    </Part>
    <Part colour={wetsuit.rubber} position={[0, 0.6, 0]}>
      {cylinder(0.312, 0.312, 0.06, 36)}
    </Part>
    <Part colour={wetsuit.piping} position={[0.13, 0.62, 0.3]}>
      {box(0.1, 0.06, 0.03)}
    </Part>
  </group>
);

/** A long fin over the foot, drawn inside a leg so it kicks with it. */
export const ScubaFin = () => (
  <group name="scuba-fin" position={[0, 0.06 - 0.57, 0.04]}>
    <Part colour={wetsuit.rubber} scale={[1, 1, 1]}>
      {box(0.22, 0.14, 0.32)}
    </Part>
    <Part
      colour={wetsuit.fin}
      position={[0, -0.05, 0.34]}
      rotation={[-0.08, 0, 0]}
      scale={[1, 1, 1]}
    >
      {box(0.3, 0.03, 0.46)}
    </Part>
    {([-1, 1] as const).map((side) => (
      <Part
        key={side}
        colour={wetsuit.rubber}
        position={[side * 0.15, -0.035, 0.32]}
        rotation={[-0.08, 0, 0]}
      >
        {box(0.03, 0.05, 0.5)}
      </Part>
    ))}
    <Part
      colour={wetsuit.finTip}
      position={[0, -0.085, 0.58]}
      rotation={[-0.08, 0, 0]}
    >
      {box(0.31, 0.032, 0.05)}
    </Part>
  </group>
);

const maskOffset: Vector = [0, 0.05, 0.37];
const maskShape: Vector = [1.18, 0.74, 1];

/** The mask over the eyes and nose, with its strap round the head. */
export const ScubaMask = () => (
  <group name="scuba-mask">
    <group position={maskOffset}>
      <Part
        colour={wetsuit.rubber}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[maskShape[0], 1, maskShape[1]]}
      >
        {cylinder(0.2, 0.21, 0.12, 36)}
      </Part>
      <Part
        colour={wetsuit.glass}
        position={[0, 0, 0.065]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[maskShape[0], 1, maskShape[1]]}
        isGlassy
      >
        {cylinder(0.17, 0.17, 0.02, 36)}
      </Part>
      <Part colour={wetsuit.piping} position={[0, 0, 0.068]} scale={maskShape}>
        {ring(0.18, 0.018)}
      </Part>
      <Part colour={wetsuit.rubber} position={[0, -0.11, 0.07]}>
        {box(0.1, 0.08, 0.06)}
      </Part>
    </group>
    <Part
      colour={wetsuit.panel}
      position={[0, 0.06, 0]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      {ring(0.425, 0.03)}
    </Part>
    <group position={[0, -0.17, 0.4]}>
      <Part colour={wetsuit.rubber} rotation={[Math.PI / 2, 0, 0]}>
        {cylinder(0.06, 0.07, 0.07, 18)}
      </Part>
      <Part colour={partColours.gold} position={[0, 0, 0.04]}>
        {ball(0.03)}
      </Part>
    </group>
  </group>
);
