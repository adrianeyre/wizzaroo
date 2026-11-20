import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Vector2,
  Vector3,
  type AmbientLight,
} from "three";
import { isMotionReduced } from "./reduced-motion.js";
import {
  useBuiltGeometry,
  useBuiltMaterial,
  useMotionScale,
  useShaderClock,
  useWeatherUniforms,
} from "./world-map-hooks.js";
import {
  advanceWindTime,
  applyWeatherSettings,
  buildFlakeMaterial,
  buildRainMaterial,
  buildStarMaterial,
  flakeLooks,
  type FallingArea,
} from "./world-map-shaders.js";
import type { SkyLook } from "./world-map-sky.js";
import { buildRandom } from "./world-map-terrain.js";

const fallingArea: FallingArea = { halfWidth: 38, halfDepth: 28, height: 26 };
const raindropsAtFullRain = 3200;
const snowflakeCount = 2600;
const leafCount = 420;
const starCount = 900;
const starDistance = 450;
const moonDistance = 420;
const moonRadius = 9;
const windDirection = new Vector2(1, 0.3).normalize();

// At the lowest render quality the World Map still shows its weather, since
// a Child can choose it, but with fewer drops and flakes to keep it cheap.
export const lowQualityPrecipitationShare = 0.35;

export const WeatherClock = ({ look }: { look: SkyLook }) => {
  const weatherUniforms = useWeatherUniforms();
  const motionScale = useMotionScale();
  const { daylight, windStrength, snowCover } = look;
  useEffect(() => {
    applyWeatherSettings(weatherUniforms, {
      daylight,
      windStrength,
      snowCover,
    });
  }, [weatherUniforms, daylight, windStrength, snowCover]);
  useFrame((_state, deltaSeconds) => {
    advanceWindTime(
      weatherUniforms,
      deltaSeconds * motionScale * (0.6 + windStrength),
    );
  });
  return null;
};

const buildFallingGeometry = (
  count: number,
  pointsPerDrop: number,
  seed: number,
): BufferGeometry => {
  const random = buildRandom(seed);
  const positions = new Float32Array(count * pointsPerDrop * 3);
  const seeds = new Float32Array(count * pointsPerDrop);
  const streakEnds = new Float32Array(count * pointsPerDrop);
  for (let drop = 0; drop < count; drop++) {
    const x = (random() * 2 - 1) * fallingArea.halfWidth;
    const z = (random() * 2 - 1) * fallingArea.halfDepth;
    const dropSeed = random();
    for (let end = 0; end < pointsPerDrop; end++) {
      const vertex = drop * pointsPerDrop + end;
      positions.set([x, 0, z], vertex * 3);
      seeds[vertex] = dropSeed;
      streakEnds[vertex] = end;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new BufferAttribute(seeds, 1));
  geometry.setAttribute("streakEnd", new BufferAttribute(streakEnds, 1));
  return geometry;
};

const findDrift = (look: SkyLook, gustiness: number): Vector2 =>
  windDirection.clone().multiplyScalar(look.windStrength * gustiness);

const findParticleBrightness = (look: SkyLook): number =>
  0.35 + 0.65 * look.daylight;

const Rainfall = ({ look, share }: { look: SkyLook; share: number }) => {
  const count = Math.round(
    raindropsAtFullRain * look.precipitationAmount * share,
  );
  const geometry = useBuiltGeometry(
    useCallback(() => buildFallingGeometry(count, 2, 101), [count]),
  );
  const brightness = findParticleBrightness(look);
  const driftX = findDrift(look, 7).x;
  const driftZ = findDrift(look, 7).y;
  const material = useBuiltMaterial(
    useCallback(
      () =>
        buildRainMaterial(fallingArea, new Vector2(driftX, driftZ), brightness),
      [driftX, driftZ, brightness],
    ),
  );
  useShaderClock(material);
  return (
    <lineSegments
      name="rainfall"
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={4}
    />
  );
};

const Flakes = ({
  look,
  kind,
  share,
}: {
  look: SkyLook;
  kind: "snow" | "leaves";
  share: number;
}) => {
  const count = Math.round(
    (kind === "snow" ? snowflakeCount : leafCount) * share,
  );
  const geometry = useBuiltGeometry(
    useCallback(() => buildFallingGeometry(count, 1, 202), [count]),
  );
  const brightness = findParticleBrightness(look);
  const drift = findDrift(look, kind === "snow" ? 2.5 : 9);
  const driftX = drift.x;
  const driftZ = drift.y;
  const material = useBuiltMaterial(
    useCallback(
      () =>
        buildFlakeMaterial(
          fallingArea,
          new Vector2(driftX, driftZ),
          flakeLooks[kind],
          brightness,
        ),
      [driftX, driftZ, kind, brightness],
    ),
  );
  useShaderClock(material);
  return (
    <points
      name={kind === "snow" ? "snowfall" : "blowing-leaves"}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={4}
    />
  );
};

export const Precipitation = ({
  look,
  share = 1,
}: {
  look: SkyLook;
  share?: number;
}) => {
  switch (look.precipitation) {
    case "none":
      return null;
    case "rain":
      return <Rainfall look={look} share={share} />;
    case "snow":
    case "leaves":
      return <Flakes look={look} kind={look.precipitation} share={share} />;
  }
};

const buildStarGeometry = (): BufferGeometry => {
  const random = buildRandom(303);
  const positions = new Float32Array(starCount * 3);
  const seeds = new Float32Array(starCount);
  for (let star = 0; star < starCount; star++) {
    const direction = new Vector3(
      random() * 2 - 1,
      0.08 + random() * 0.92,
      random() * 2 - 1,
    )
      .normalize()
      .multiplyScalar(starDistance);
    positions.set(direction.toArray(), star * 3);
    seeds[star] = random();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new BufferAttribute(seeds, 1));
  return geometry;
};

export const Stars = () => {
  const geometry = useBuiltGeometry(buildStarGeometry);
  const material = useBuiltMaterial(buildStarMaterial);
  useShaderClock(material);
  return (
    <points
      name="stars"
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
};

export const Moon = ({ direction }: { direction: Vector3 }) => (
  <mesh
    name="moon"
    position={direction.clone().multiplyScalar(moonDistance).toArray()}
  >
    <sphereGeometry args={[moonRadius, 32, 16]} />
    <meshBasicMaterial color="#f6f1dc" fog={false} toneMapped={false} />
  </mesh>
);

const quietestSecondsBetweenFlashes = 4;
const flashSeconds = 0.09;

export const Lightning = () => {
  const flash = useRef<AmbientLight>(null);
  const random = useMemo(() => buildRandom(404), []);
  const untilNextFlash = useRef(quietestSecondsBetweenFlashes);
  const flashAge = useRef<number | undefined>(undefined);
  const isCalm = useMemo(() => isMotionReduced(), []);
  useFrame((_state, deltaSeconds) => {
    const light = flash.current;
    if (light === null || isCalm) {
      return;
    }
    untilNextFlash.current -= deltaSeconds;
    if (untilNextFlash.current <= 0) {
      flashAge.current = 0;
      untilNextFlash.current = quietestSecondsBetweenFlashes + random() * 6;
    }
    if (flashAge.current === undefined) {
      light.intensity = 0;
      return;
    }
    flashAge.current += deltaSeconds;
    const isLit =
      flashAge.current < flashSeconds ||
      (flashAge.current > flashSeconds * 2 &&
        flashAge.current < flashSeconds * 3);
    light.intensity = isLit ? 2.4 : 0;
    if (flashAge.current > flashSeconds * 3) {
      flashAge.current = undefined;
    }
  });
  return (
    <ambientLight ref={flash} name="lightning" color="#dfe8ff" intensity={0} />
  );
};
