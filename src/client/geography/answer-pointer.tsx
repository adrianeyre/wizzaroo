import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  ConeGeometry,
  CylinderGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type BufferGeometry,
  type Group,
} from "three";
import { buildPaletteUniform } from "../pixel-pipeline.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import { buildModelGeometry, type Triple } from "../world-map-models.js";
import {
  geographyPalette,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";

export interface ArrowAim {
  tip: Triple;
  direction: Triple;
}

const arrowHeadHeight = 0.2;
const arrowBobSpeed = 3.2;
const arrowRest = 0.05;
const arrowTravel = 0.08;

export const buildArrowGeometry = (
  length: number,
  colour: string,
): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new ConeGeometry(0.1, arrowHeadHeight, 14),
      colour,
      rotation: [Math.PI, 0, 0],
      position: [0, arrowHeadHeight / 2, 0],
    },
    {
      geometry: new CylinderGeometry(
        0.036,
        0.036,
        length - arrowHeadHeight,
        10,
      ),
      colour,
      position: [0, arrowHeadHeight + (length - arrowHeadHeight) / 2, 0],
    },
  ]);

const upright = new Vector3(0, 1, 0);

export const buildArrowTurn = (direction: Triple): Quaternion =>
  new Quaternion().setFromUnitVectors(
    upright,
    new Vector3(...direction).normalize(),
  );

export const BobbingArrow = ({
  aim,
  colour = geographyPalette.marker,
  length = 0.5,
}: {
  aim: ArrowAim;
  colour?: string;
  length?: number;
}) => {
  const geometry = useMemo(
    () => buildArrowGeometry(length, colour),
    [length, colour],
  );
  useDisposedOnUnmount(geometry);
  const turn = useMemo(() => buildArrowTurn(aim.direction), [aim.direction]);
  const slider = useRef<Group>(null);
  const motionScale = useMotionScale();
  const age = useSceneAge();

  useFrame(() => {
    const body = slider.current;
    if (body === null) {
      return;
    }
    const bob = 0.5 + 0.5 * Math.sin(age.current * arrowBobSpeed);
    body.position.y = arrowRest + arrowTravel * bob * motionScale;
  });

  return (
    <group position={aim.tip} quaternion={turn} name="answer-arrow">
      <group ref={slider} position={[0, arrowRest, 0]}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.28}
            clearcoat={1}
            clearcoatRoughness={0.1}
            emissive={colour}
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </group>
  );
};

export const pointerTime = { value: 0 };

export const usePointerClock = () => {
  const motionScale = useMotionScale();
  useFrame((state) => {
    pointerTime.value = state.clock.elapsedTime * motionScale;
  });
};

const glowSpotVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const glowSpotFragmentShader = `
uniform float time;
uniform float motion;
uniform vec3 glow;
varying vec2 vUv;

void main() {
  float reach = length(vUv - 0.5) * 2.0;
  float pulse = 0.5 + 0.5 * sin(time * 4.0);
  float band = smoothstep(0.6, 0.76, reach) * (1.0 - smoothstep(0.8, 0.98, reach));
  float ripple = fract(time * 0.55);
  float wave = (1.0 - smoothstep(0.0, 0.07, abs(reach - ripple))) * (1.0 - ripple) * motion;
  float fill = (1.0 - smoothstep(0.0, 0.8, reach)) * 0.22;
  float alpha = band * (0.7 + 0.3 * pulse) + wave * 0.45 + fill * (0.6 + 0.4 * pulse);
  gl_FragColor = vec4(glow * (1.1 + 0.5 * pulse), clamp(alpha, 0.0, 1.0));
}
`;

export const buildGlowSpotMaterial = (
  motionScale: number,
  colour: string = geographyPalette.highlight,
): ShaderMaterial => {
  const [glow] = buildPaletteUniform([colour]);
  return new ShaderMaterial({
    uniforms: {
      time: pointerTime,
      motion: { value: motionScale },
      glow: { value: glow },
    },
    vertexShader: glowSpotVertexShader,
    fragmentShader: glowSpotFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
};

export const GlowSpot = ({
  position,
  radius,
  colour = geographyPalette.highlight,
}: {
  position: Triple;
  radius: number;
  colour?: string;
}) => {
  usePointerClock();
  const motionScale = useMotionScale();
  const material = useMemo(
    () => buildGlowSpotMaterial(motionScale, colour),
    [motionScale, colour],
  );
  useDisposedOnUnmount(material);

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      material={material}
      renderOrder={3}
      name="glow-spot"
    >
      <planeGeometry args={[radius * 2, radius * 2]} />
    </mesh>
  );
};
