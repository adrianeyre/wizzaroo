import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  Object3D,
  ShaderMaterial,
  Vector3,
  type Group,
  type InstancedMesh,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type {
  GeographyShowOf,
  WaterCycleStage,
} from "../../curriculum/geography.js";
import { buildPaletteUniform } from "../pixel-pipeline.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import {
  buildCloudGeometry,
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { BobbingArrow, GlowSpot } from "./answer-pointer.js";
import { DriftingParticles, findScatter } from "./drifting-particles.js";
import {
  geographyPalette,
  useCanvasTexture,
  useMotionScale,
  useSceneAge,
  type CanvasPainter,
} from "./geography-kit.js";
import {
  buildCycleFlow,
  buildValleyLand,
  cloudCentre,
  findCoastline,
  findLandColour,
  findLandHeight,
  findMouthForm,
  findNearestWater,
  findSpotHeight,
  forestCentre,
  isRiverFeature,
  landColours,
  listCourses,
  riverFeatureSpots,
  slabBottom,
  slabRadius,
  smoothRise,
  waterLift,
  type Course,
  type FeatureSpot,
  type ValleyLand,
} from "./river-valley-land.js";

const valleyTilt = 0.38;
const valleyLift = -0.57;
const valleyGrid = 24;
const sunPosition: Triple = [1.38, 1.18, -0.9];

const mapSquareToDisc = (x: number, y: number): [number, number] => [
  x * Math.sqrt(1 - (y * y) / 2),
  y * Math.sqrt(1 - (x * x) / 2),
];

const listRimIndices = (size: number): number[] => {
  const rowLength = size + 1;
  const back = Array.from({ length: size }, (_, i) => i);
  const right = Array.from({ length: size }, (_, j) => j * rowLength + size);
  const front = Array.from(
    { length: size },
    (_, i) => size * rowLength + (size - i),
  );
  const left = Array.from({ length: size }, (_, j) => (size - j) * rowLength);
  return [...back, ...right, ...front, ...left];
};

const tintColour = (name: keyof typeof landColours, grain: number) =>
  new Color(landColours[name]).multiplyScalar(0.93 + 0.1 * grain);

const buildGridGeometry = (land: ValleyLand) => {
  const rowLength = valleyGrid + 1;
  const positions = new Float32Array(rowLength * rowLength * 3);
  for (let row = 0; row <= valleyGrid; row++) {
    for (let column = 0; column <= valleyGrid; column++) {
      const [discU, discV] = mapSquareToDisc(
        (column / valleyGrid) * 2 - 1,
        (row / valleyGrid) * 2 - 1,
      );
      const u = discU * slabRadius;
      const v = discV * slabRadius;
      const vertex = (row * rowLength + column) * 3;
      positions[vertex] = u;
      positions[vertex + 1] = findLandHeight(land, u, v);
      positions[vertex + 2] = v;
    }
  }
  const faces: number[] = [];
  for (let row = 0; row < valleyGrid; row++) {
    for (let column = 0; column < valleyGrid; column++) {
      const corner = row * rowLength + column;
      faces.push(corner, corner + rowLength, corner + 1);
      faces.push(corner + 1, corner + rowLength, corner + rowLength + 1);
    }
  }
  const grid = new BufferGeometry();
  grid.setAttribute("position", new BufferAttribute(positions, 3));
  grid.setIndex(faces);
  grid.computeVertexNormals();
  return grid;
};

const paintGrid = (grid: BufferGeometry, land: ValleyLand) => {
  const positions = grid.getAttribute("position");
  const normals = grid.getAttribute("normal");
  const colours = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index++) {
    const u = positions.getX(index);
    const v = positions.getZ(index);
    const name = findLandColour(
      land,
      u,
      v,
      positions.getY(index),
      normals.getY(index),
    );
    tintColour(name, findScatter(index, 3)).toArray(colours, index * 3);
  }
  grid.setAttribute("color", new BufferAttribute(colours, 3));
};

interface SkirtBand {
  findTop: (height: number) => number;
  findBottom: (height: number) => number;
  findColour: (height: number) => keyof typeof landColours;
}

const skirtBands: SkirtBand[] = [
  {
    findTop: (height) => Math.max(height, 0),
    findBottom: (height) => height,
    findColour: () => "sea",
  },
  {
    findTop: (height) => height,
    findBottom: (height) => height - 0.08,
    findColour: (height) => (height < 0 ? "seabed" : "topsoil"),
  },
  {
    findTop: (height) => height - 0.08,
    findBottom: (height) => Math.min(height - 0.09, -0.2),
    findColour: () => "subsoil",
  },
  {
    findTop: (height) => Math.min(height - 0.09, -0.2),
    findBottom: () => slabBottom,
    findColour: () => "bedrock",
  },
];

const buildSkirtGeometry = (grid: BufferGeometry): BufferGeometry => {
  const positions = grid.getAttribute("position");
  const rim = listRimIndices(valleyGrid);
  const vertices: number[] = [];
  const colours: number[] = [];
  const faces: number[] = [];
  for (const band of skirtBands) {
    const first = vertices.length / 3;
    rim.forEach((gridIndex, place) => {
      const u = positions.getX(gridIndex);
      const v = positions.getZ(gridIndex);
      const height = positions.getY(gridIndex);
      const colour = tintColour(band.findColour(height), findScatter(place, 5));
      vertices.push(u, band.findTop(height), v, u, band.findBottom(height), v);
      colours.push(...colour.toArray(), ...colour.toArray());
    });
    for (let place = 0; place < rim.length; place++) {
      const top = first + place * 2;
      const nextTop = first + ((place + 1) % rim.length) * 2;
      faces.push(top, top + 1, nextTop, nextTop, top + 1, nextTop + 1);
    }
  }
  const skirt = new BufferGeometry();
  skirt.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(vertices), 3),
  );
  skirt.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(colours), 3),
  );
  skirt.setIndex(faces);
  skirt.computeVertexNormals();
  return skirt;
};

const buildValleyTerrain = (land: ValleyLand): BufferGeometry => {
  const grid = buildGridGeometry(land);
  paintGrid(grid, land);
  const skirt = buildSkirtGeometry(grid);
  const terrain = mergeGeometries([grid, skirt]);
  grid.dispose();
  skirt.dispose();
  return terrain;
};

interface WaterPieces {
  positions: number[];
  textureCoordinates: number[];
  stillness: number[];
  rushes: number[];
  faces: number[];
}

const findStillness = (course: Course, u: number, v: number) =>
  course.isStill
    ? 1
    : smoothRise(findCoastline(u) - 0.02, findCoastline(u) + 0.2, v);

const addRibbon = (pieces: WaterPieces, course: Course) => {
  const { samples } = course;
  let acrossU = 1;
  let acrossV = 0;
  samples.forEach((sample, index) => {
    const before = samples[Math.max(0, index - 1)];
    const after = samples[Math.min(samples.length - 1, index + 1)];
    const alongU = after.u - before.u;
    const alongV = after.v - before.v;
    const length = Math.hypot(alongU, alongV);
    if (length > 0.0001) {
      acrossU = -alongV / length;
      acrossV = alongU / length;
    }
    const first = pieces.positions.length / 3;
    for (const side of [-1, 1]) {
      const u = sample.u + side * acrossU * sample.halfWidth;
      const v = sample.v + side * acrossV * sample.halfWidth;
      pieces.positions.push(u, sample.level + waterLift, v);
      pieces.textureCoordinates.push(side < 0 ? 0 : 1, sample.along);
      pieces.stillness.push(findStillness(course, u, v));
      pieces.rushes.push(sample.rush);
    }
    if (index > 0) {
      const previous = first - 2;
      pieces.faces.push(
        previous,
        first,
        previous + 1,
        previous + 1,
        first,
        first + 1,
      );
    }
  });
};

const addPool = (
  pieces: WaterPieces,
  centre: Triple,
  radius: number,
  segments: number,
) => {
  const first = pieces.positions.length / 3;
  pieces.positions.push(...centre);
  pieces.textureCoordinates.push(0.5, 0);
  pieces.stillness.push(1);
  pieces.rushes.push(0);
  for (let segment = 0; segment < segments; segment++) {
    const angle = (segment / segments) * Math.PI * 2;
    pieces.positions.push(
      centre[0] + Math.cos(angle) * radius,
      centre[1],
      centre[2] + Math.sin(angle) * radius,
    );
    pieces.textureCoordinates.push(0.5, 0);
    pieces.stillness.push(1);
    pieces.rushes.push(0);
    pieces.faces.push(
      first,
      first + 1 + segment,
      first + 1 + ((segment + 1) % segments),
    );
  }
};

const buildValleyWater = (land: ValleyLand): BufferGeometry => {
  const pieces: WaterPieces = {
    positions: [],
    textureCoordinates: [],
    stillness: [],
    rushes: [],
    faces: [],
  };
  listCourses(land).forEach((course) => {
    addRibbon(pieces, course);
  });
  const spring = land.main.samples[0];
  addPool(pieces, [spring.u, spring.level + waterLift, spring.v], 0.05, 10);
  addPool(pieces, [0, 0, 0], slabRadius - 0.004, 56);
  const water = new BufferGeometry();
  water.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(pieces.positions), 3),
  );
  water.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array(pieces.textureCoordinates), 2),
  );
  water.setAttribute(
    "still",
    new BufferAttribute(new Float32Array(pieces.stillness), 1),
  );
  water.setAttribute(
    "rush",
    new BufferAttribute(new Float32Array(pieces.rushes), 1),
  );
  water.setIndex(pieces.faces);
  return water;
};

const waterVertexShader = `
attribute float still;
attribute float rush;
varying vec2 vUv;
varying vec2 vPlace;
varying float vStill;
varying float vRush;

void main() {
  vUv = uv;
  vPlace = position.xz;
  vStill = still;
  vRush = rush;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const waterFragmentShader = `
uniform float time;
uniform vec3 shallow;
uniform vec3 deep;
uniform vec3 foam;
varying vec2 vUv;
varying vec2 vPlace;
varying float vStill;
varying float vRush;

void main() {
  float edge = abs(vUv.x - 0.5) * 2.0;
  float flow = sin(vUv.y * 46.0 - time * 3.2 + sin(vUv.x * 9.0 + vUv.y * 7.0) * 1.4);
  float streak = smoothstep(0.72, 1.0, flow) * (1.0 - vStill);
  float ripple = sin(vPlace.x * 21.0 + time * 1.1 + sin(vPlace.y * 13.0 + time * 0.7) * 1.6)
    * sin(vPlace.y * 17.0 - time * 0.9);
  float glint = smoothstep(0.6, 0.95, ripple) * vStill;
  float depthShade = vStill * smoothstep(0.95, 1.6, vPlace.y + 0.3 * abs(vPlace.x));
  vec3 colour = mix(shallow, deep, 0.2 + 0.8 * depthShade);
  float bank = smoothstep(0.75, 1.0, edge) * (1.0 - vStill);
  colour = mix(colour, foam, streak * 0.45 + glint * 0.3 + bank * 0.3);
  float tumble = 0.6 + 0.4 * sin(vUv.y * 90.0 - time * 10.0 + vUv.x * 6.0);
  colour = mix(colour, foam, vRush * tumble);
  gl_FragColor = vec4(colour, 1.0);
}
`;

const valleyTime = { value: 0 };

const buildWaterMaterial = () => {
  const [shallow, deep, foam] = buildPaletteUniform([
    "#5cc0ee",
    geographyPalette.seaDeep,
    "#f2fbff",
  ]);
  return new ShaderMaterial({
    uniforms: {
      time: valleyTime,
      shallow: { value: shallow },
      deep: { value: deep },
      foam: { value: foam },
    },
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
};

const buildPineParts = (u: number, ground: number, v: number): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.01, 0.014, 0.05, 5),
    colour: "#5b3a24",
    position: [u, ground + 0.025, v],
  },
  {
    geometry: new ConeGeometry(0.055, 0.12, 7),
    colour: "#2a5c34",
    position: [u, ground + 0.1, v],
  },
  {
    geometry: new ConeGeometry(0.04, 0.09, 7),
    colour: "#3a7543",
    position: [u, ground + 0.16, v],
  },
];

const buildBroadleafParts = (
  u: number,
  ground: number,
  v: number,
): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.01, 0.014, 0.07, 5),
    colour: "#6b4a2f",
    position: [u, ground + 0.035, v],
  },
  {
    geometry: new IcosahedronGeometry(0.06, 0),
    colour: "#4a8a38",
    position: [u, ground + 0.11, v],
    scale: [1, 0.9, 1],
    roughen: 0.3,
  },
];

const buildCottageParts = (
  u: number,
  ground: number,
  v: number,
  turn: number,
): ModelPart[] => [
  {
    geometry: new BoxGeometry(0.08, 0.05, 0.06),
    colour: "#f1e6cf",
    position: [u, ground + 0.025, v],
    rotation: [0, turn, 0],
  },
  {
    geometry: new ConeGeometry(0.068, 0.05, 4),
    colour: "#b5523a",
    position: [u, ground + 0.075, v],
    rotation: [0, turn + Math.PI / 4, 0],
    scale: [1.05, 1, 0.8],
  },
];

const floodplainTrees: [number, number][] = [
  [-0.74, 0.56],
  [0.86, 0.66],
  [-0.62, -0.06],
  [0.36, 0.06],
  [-1.2, 0.5],
];

const cottageSpots: [number, number, number][] = [
  [-0.12, 0.66, 0.3],
  [-0.64, 0.68, -0.4],
  [0.92, 0.5, 0.8],
];

const forestOffsets: [number, number][] = [
  [0, 0],
  [0.14, 0.1],
  [-0.12, 0.12],
  [0.1, -0.14],
  [-0.1, -0.1],
  [0.22, -0.04],
  [0.02, 0.22],
];

const isClearOfWater = (land: ValleyLand, u: number, v: number) => {
  const water = findNearestWater(land, u, v);
  return water.distance > water.halfWidth + 0.07;
};

const listPineSpots = (land: ValleyLand): [number, number][] =>
  Array.from({ length: 90 }, (_, index): [number, number] => [
    (findScatter(index, 11) * 2 - 1) * 1.35,
    -0.3 - findScatter(index, 12) * 0.85,
  ])
    .filter(([u, v]) => {
      const height = findLandHeight(land, u, v);
      return (
        Math.hypot(u, v) < 1.45 &&
        height > 0.38 &&
        height < 0.9 &&
        isClearOfWater(land, u, v)
      );
    })
    .slice(0, 13);

const buildValleyFurnishings = (land: ValleyLand): BufferGeometry => {
  const placeOnLand = (
    spots: readonly (readonly [number, number])[],
    buildParts: (u: number, ground: number, v: number) => ModelPart[],
  ) =>
    spots
      .filter(([u, v]) => isClearOfWater(land, u, v))
      .flatMap(([u, v]) => buildParts(u, findLandHeight(land, u, v), v));
  return buildModelGeometry([
    ...placeOnLand(listPineSpots(land), buildPineParts),
    ...placeOnLand(
      forestOffsets.map(([u, v]) => [forestCentre.u + u, forestCentre.v + v]),
      buildBroadleafParts,
    ),
    ...placeOnLand(floodplainTrees, buildBroadleafParts),
    ...cottageSpots.flatMap(([u, v, turn]) =>
      buildCottageParts(u, findLandHeight(land, u, v), v, turn),
    ),
    ...[0.05, 0.4].map((u): ModelPart => ({
      geometry: new IcosahedronGeometry(0.06, 0),
      colour: "#7d776f",
      position: [u, findLandHeight(land, u, -0.2) + 0.02, -0.2],
      scale: [1.2, 0.8, 1],
      roughen: 0.4,
    })),
    {
      geometry: new CylinderGeometry(0.72, 0.84, 1.0, 28, 1, true),
      colour: geographyPalette.woodDark,
      position: [0, slabBottom - 0.5, 0],
    },
  ]);
};

const useValleyClock = () => {
  const motionScale = useMotionScale();
  useFrame((state) => {
    valleyTime.value = state.clock.elapsedTime * motionScale;
  });
};

const ValleyLandform = ({ land }: { land: ValleyLand }) => {
  useValleyClock();
  const terrain = useMemo(() => buildValleyTerrain(land), [land]);
  const water = useMemo(() => buildValleyWater(land), [land]);
  const furnishings = useMemo(() => buildValleyFurnishings(land), [land]);
  const waterMaterial = useMemo(() => buildWaterMaterial(), []);
  useDisposedOnUnmount(terrain);
  useDisposedOnUnmount(water);
  useDisposedOnUnmount(furnishings);
  useDisposedOnUnmount(waterMaterial);

  return (
    <group name="valley-landform">
      <mesh geometry={terrain}>
        <meshStandardMaterial
          vertexColors
          roughness={0.88}
          side={DoubleSide}
          flatShading
        />
      </mesh>
      <mesh geometry={water} material={waterMaterial} renderOrder={1} />
      <mesh geometry={furnishings}>
        <meshPhysicalMaterial
          vertexColors
          roughness={0.6}
          clearcoat={0.3}
          clearcoatRoughness={0.5}
        />
      </mesh>
    </group>
  );
};

const paintSunHalo: CanvasPainter = (context, width, height) => {
  const glow = context.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    width / 2,
  );
  glow.addColorStop(0, "rgba(255, 244, 190, 0.95)");
  glow.addColorStop(0.35, "rgba(255, 214, 102, 0.55)");
  glow.addColorStop(1, "rgba(255, 190, 80, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
};

const ValleySun = () => {
  const halo = useCanvasTexture(128, 128, paintSunHalo);
  const glow = useRef<Group>(null);
  const motionScale = useMotionScale();
  const age = useSceneAge();

  useFrame(() => {
    if (glow.current !== null) {
      glow.current.scale.setScalar(
        1 + 0.06 * motionScale * Math.sin(age.current * 1.6),
      );
    }
  });

  return (
    <group position={sunPosition} name="valley-sun">
      <mesh>
        <sphereGeometry args={[0.16, 16, 10]} />
        <meshStandardMaterial
          color="#ffd23f"
          emissive="#ffc21a"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <group ref={glow}>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[0.85, 0.85]} />
          <meshBasicMaterial
            map={halo}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
};

const condensingSeconds = 3.2;

const ValleyCloud = ({ stage }: { stage: WaterCycleStage | undefined }) => {
  const geometry = useMemo(() => buildCloudGeometry(1), []);
  useDisposedOnUnmount(geometry);
  const swell = useRef<Group>(null);
  const motionScale = useMotionScale();
  const age = useSceneAge();
  const isCondensing = stage === "condensation";

  useFrame(() => {
    const body = swell.current;
    if (body === null) {
      return;
    }
    const growth = isCondensing
      ? 0.72 + 0.4 * ((age.current % condensingSeconds) / condensingSeconds)
      : 1;
    const drift = 0.03 * Math.sin(age.current * 0.7) * motionScale;
    body.scale.setScalar(motionScale === 0 && isCondensing ? 1.1 : growth);
    body.position.x = drift;
  });

  return (
    <group position={cloudCentre} name="valley-cloud">
      <group ref={swell}>
        <mesh geometry={geometry} scale={0.19}>
          <meshStandardMaterial
            vertexColors
            color={stage === "precipitation" ? "#a3adbd" : "#ffffff"}
            roughness={0.95}
            emissive="#ffffff"
            emissiveIntensity={stage === "precipitation" ? 0.05 : 0.18}
          />
        </mesh>
      </group>
    </group>
  );
};

const chevronPlacer = new Object3D();
const chevronHeading = new Vector3();
const chevronUpright = new Vector3(0, 1, 0);
const chevronCount = 12;

const FlowingChevrons = ({ course }: { course: Course }) => {
  const chevrons = useRef<InstancedMesh>(null);
  const motionScale = useMotionScale();
  const age = useSceneAge();
  const { samples } = course;

  useFrame(() => {
    const mesh = chevrons.current;
    if (mesh === null) {
      return;
    }
    for (let index = 0; index < chevronCount; index++) {
      const progress =
        (index / chevronCount + age.current * 0.05 * motionScale) % 1;
      const place = Math.floor(progress * (samples.length - 2));
      const here = samples[place];
      const next = samples[place + 1];
      chevronHeading
        .set(next.u - here.u, next.level - here.level, next.v - here.v)
        .normalize();
      chevronPlacer.position.set(here.u, here.level + 0.06, here.v);
      chevronPlacer.quaternion.setFromUnitVectors(
        chevronUpright,
        chevronHeading,
      );
      chevronPlacer.updateMatrix();
      mesh.setMatrixAt(index, chevronPlacer.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={chevrons}
      args={[undefined, undefined, chevronCount]}
      frustumCulled={false}
      name="flowing-chevrons"
    >
      <coneGeometry args={[0.045, 0.12, 3]} />
      <meshStandardMaterial
        color={geographyPalette.highlight}
        emissive={geographyPalette.highlightGlow}
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </instancedMesh>
  );
};

const vapourStyles = {
  vapour: {
    colour: "#ffffff",
    look: "vapour",
    size: 0.13,
    speed: 0.2,
    sway: 0.07,
    opacity: 0.7,
  },
  rain: {
    colour: "#6fc3ff",
    look: "rain",
    size: 0.07,
    speed: 0.9,
    sway: 0,
    opacity: 0.95,
  },
  drop: {
    colour: "#62c0ff",
    look: "drop",
    size: 0.09,
    speed: 0.3,
    sway: 0,
    opacity: 1,
  },
} as const;

const CycleStage = ({
  land,
  stage,
}: {
  land: ValleyLand;
  stage: WaterCycleStage;
}) => {
  const flow = useMemo(() => buildCycleFlow(land, stage), [land, stage]);
  return (
    <group name={`cycle-${stage}`}>
      {flow.streams.length > 0 ? (
        <DriftingParticles
          streams={flow.streams}
          style={vapourStyles[flow.look]}
        />
      ) : null}
      {stage === "collection" ? <FlowingChevrons course={land.main} /> : null}
      <BobbingArrow
        aim={flow.arrow}
        colour={geographyPalette.highlight}
        length={0.42}
      />
    </group>
  );
};

const FeatureMarker = ({
  land,
  spot,
}: {
  land: ValleyLand;
  spot: FeatureSpot;
}) => {
  const ground = findSpotHeight(land, spot.u, spot.v);
  return (
    <group name="feature-marker">
      <GlowSpot position={[spot.u, ground, spot.v]} radius={spot.radius} />
      <BobbingArrow
        aim={{ tip: [spot.u, ground + 0.08, spot.v], direction: [0, 1, 0.25] }}
      />
    </group>
  );
};

export const RiverValleyScene = ({
  show,
}: {
  show: GeographyShowOf<"river-valley">;
}) => {
  const { marker } = show;
  const form = findMouthForm(marker);
  const land = useMemo(() => buildValleyLand(form), [form]);
  const stage = isRiverFeature(marker) ? undefined : marker;

  return (
    <group name={show.scene}>
      <ValleySun />
      <group position={[0, valleyLift, 0.05]} rotation={[valleyTilt, 0, 0]}>
        <ValleyLandform land={land} />
        <ValleyCloud stage={stage} />
        {isRiverFeature(marker) ? (
          <FeatureMarker land={land} spot={riverFeatureSpots[marker]} />
        ) : (
          <CycleStage land={land} stage={marker} />
        )}
      </group>
    </group>
  );
};
