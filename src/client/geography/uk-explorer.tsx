import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type MeshPhysicalMaterial,
  type ShaderMaterial,
  type Texture,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  ukNations,
  type GeographyShowOf,
  type UkHighlight,
  type UkNation,
  type UkSea,
} from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import { buildModelGeometry, type Triple } from "../world-map-models.js";
import {
  findPulse,
  geographyPalette,
  useCanvasTexture,
  useMotionScale,
  useSceneAge,
  type CanvasPainter,
} from "./geography-kit.js";
import { MapPin, type PinTriple } from "./map-pin.js";
import {
  franceCoastOutline,
  getUkMapHeightInDegrees,
  getUkMapPoint,
  getUkMapWidthInDegrees,
  irelandRepublicOutlines,
  ukMapBounds,
  ukMountains,
  ukNationOutlines,
  ukSeaOutlines,
  type LonLat,
  type Outline,
  type UkMountain,
} from "./uk-outlines.js";

const unitsPerDegree = 0.35;
const seaWidth = getUkMapWidthInDegrees() * unitsPerDegree;
const seaHeight = getUkMapHeightInDegrees() * unitsPerDegree;
const parchmentMargin = 0.13;
const boardWidth = seaWidth + parchmentMargin * 2;
const boardHeight = seaHeight + parchmentMargin * 2;
const boardLean = (40 * Math.PI) / 180;
const boardCentreY = 0.02;
const plinthTop = -1.5;
const landDepth = 0.045;
const bevelThickness = 0.018;
const bevelSize = 0.014;
const landTop = landDepth + bevelThickness * 2;
const seaLevel = 0.012;
const liftHeight = 0.1;
const liftSpeed = 7;
const mountainHeightScale = 0.16;
const seaMaskSize = 512;
const parchmentSize = 256;

const nationColours: Record<UkNation, string> = {
  england: "#f3b49b",
  scotland: "#b9a6e3",
  wales: "#8fd49a",
  "northern-ireland": "#f2a2c0",
};

const neutralLandColour = "#b4bfae";

const getMapVector = (point: LonLat): Vector2 =>
  new Vector2(...getUkMapPoint(point, unitsPerDegree));

const buildOutlineShape = (outline: Outline): Shape =>
  new Shape(outline.map(getMapVector));

const buildMountainGeometry = ({ at, size, height }: UkMountain) => {
  const [x, y] = getUkMapPoint(at, unitsPerDegree);
  const radius = (size * unitsPerDegree) / 2;
  const dome = new SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  const geometry = dome.toNonIndexed();
  dome.dispose();
  geometry.rotateX(Math.PI / 2);
  geometry.scale(radius, radius * 0.85, height * mountainHeightScale);
  geometry.translate(x, y, landTop - 0.004);
  return geometry;
};

const buildLandGeometry = (
  outlines: readonly Outline[],
  mountains: readonly UkMountain[],
): BufferGeometry => {
  const land = new ExtrudeGeometry(outlines.map(buildOutlineShape), {
    depth: landDepth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelOffset: -bevelSize,
    bevelSegments: 1,
    curveSegments: 1,
  });
  land.translate(0, 0, bevelThickness);
  const hills = mountains.map(buildMountainGeometry);
  const merged = mergeGeometries([land, ...hills]);
  land.dispose();
  for (const hill of hills) {
    hill.dispose();
  }
  return merged;
};

const getCanvasX = (longitude: number, width: number) =>
  ((longitude - ukMapBounds.west) / (ukMapBounds.east - ukMapBounds.west)) *
  width;

const getCanvasY = (latitude: number, height: number) =>
  ((ukMapBounds.north - latitude) / (ukMapBounds.north - ukMapBounds.south)) *
  height;

const traceOutlines = (
  context: CanvasRenderingContext2D,
  outlines: readonly Outline[],
  width: number,
  height: number,
) => {
  context.beginPath();
  for (const outline of outlines) {
    outline.forEach(([longitude, latitude], index) => {
      const x = getCanvasX(longitude, width);
      const y = getCanvasY(latitude, height);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.closePath();
  }
};

const allLand: Outline[] = [
  ...Object.values(ukNationOutlines).flat(),
  ...irelandRepublicOutlines,
  franceCoastOutline,
];

const isSea = (highlight: UkHighlight): highlight is UkSea =>
  highlight in ukSeaOutlines;

const isNation = (highlight: UkHighlight): highlight is UkNation =>
  highlight in ukNationOutlines;

const buildSeaMaskPainter =
  (highlight: UkHighlight | undefined): CanvasPainter =>
  (context, width, height) => {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);
    context.save();
    context.shadowColor = "#00ff00";
    context.shadowBlur = 22;
    traceOutlines(context, allLand, width, height);
    context.fillStyle = "#00ff00";
    context.fill();
    context.restore();
    if (highlight !== undefined && isSea(highlight)) {
      context.globalCompositeOperation = "lighter";
      traceOutlines(context, [ukSeaOutlines[highlight]], width, height);
      context.fillStyle = "#ff0000";
      context.fill();
      context.globalCompositeOperation = "source-over";
    }
    traceOutlines(context, allLand, width, height);
    context.fillStyle = "#00ff00";
    context.fill();
  };

const paintParchment: CanvasPainter = (context, width, height) => {
  context.fillStyle = geographyPalette.parchment;
  context.fillRect(0, 0, width, height);
  const burn = context.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.3,
    width / 2,
    height / 2,
    width * 0.72,
  );
  burn.addColorStop(0, "rgba(255, 248, 225, 0.6)");
  burn.addColorStop(0.75, "rgba(201, 176, 122, 0.25)");
  burn.addColorStop(1, "rgba(140, 100, 50, 0.85)");
  context.fillStyle = burn;
  context.fillRect(0, 0, width, height);
  let state = 5;
  for (let speck = 0; speck < 900; speck++) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const x = (state % width) + 0.5;
    state = (state * 1103515245 + 12345) % 2147483648;
    const y = (state % height) + 0.5;
    context.fillStyle =
      speck % 3 === 0 ? "rgba(120, 85, 40, 0.18)" : "rgba(255, 255, 240, 0.2)";
    context.fillRect(x, y, 1.5, 1.5);
  }
  const insetX = (parchmentMargin / boardWidth) * width * 0.55;
  const insetY = (parchmentMargin / boardHeight) * height * 0.55;
  context.strokeStyle = "rgba(90, 60, 30, 0.55)";
  context.lineWidth = 1.5;
  context.strokeRect(insetX, insetY, width - insetX * 2, height - insetY * 2);
  context.lineWidth = 0.75;
  context.strokeRect(
    insetX - 3,
    insetY - 3,
    width - insetX * 2 + 6,
    height - insetY * 2 + 6,
  );
};

const seaVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const seaFragmentShader = `
uniform sampler2D maskMap;
uniform float hasMask;
uniform float time;
uniform float glow;
uniform vec3 deepColour;
uniform vec3 shallowColour;
uniform vec3 foamColour;
uniform vec3 glowColour;
varying vec2 vUv;

void main() {
  vec4 mask = hasMask > 0.5 ? texture2D(maskMap, vUv) : vec4(0.0);
  float shallow = mask.g;
  vec3 colour = mix(deepColour, shallowColour, smoothstep(0.0, 0.9, shallow));
  vec2 point = vUv * vec2(16.0, 20.0);
  float swell = sin(point.x * 1.3 + time * 0.9 + sin(point.y * 0.7 + time * 0.4) * 1.6);
  float ripple = swell * sin(point.y * 1.1 - time * 0.7 + sin(point.x * 0.5) * 1.3);
  colour += ripple * 0.035;
  colour += foamColour * smoothstep(0.78, 1.0, ripple) * 0.14;
  float surf = smoothstep(0.55, 0.92, shallow) * (0.5 + 0.5 * sin(time * 1.6 - shallow * 14.0));
  colour += foamColour * surf * 0.16;
  float lightFall = 0.9 + 0.12 * vUv.y;
  colour *= lightFall;
  float region = mask.r;
  colour = mix(colour, glowColour, region * (0.5 + 0.3 * glow));
  colour += glowColour * region * glow * 0.28;
  gl_FragColor = vec4(colour, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const buildSeaUniforms = (mask: Texture | undefined) => ({
  maskMap: { value: mask ?? null },
  hasMask: { value: mask === undefined ? 0 : 1 },
  time: { value: 0 },
  glow: { value: 0 },
  deepColour: { value: new Color(geographyPalette.seaDeep) },
  shallowColour: { value: new Color("#6cc3e8") },
  foamColour: { value: new Color(geographyPalette.white) },
  glowColour: { value: new Color(geographyPalette.highlight) },
});

const getBoardPoint = (local: Triple): Vector3 =>
  new Vector3(...local)
    .applyEuler(new Euler(-boardLean, 0, 0))
    .add(new Vector3(0, boardCentreY, 0));

const buildStrutPart = (from: Vector3, to: Vector3, radius: number) => {
  const length = from.distanceTo(to);
  const middle = from.clone().add(to).multiplyScalar(0.5);
  const turn = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    to.clone().sub(from).normalize(),
  );
  const rotation = new Euler().setFromQuaternion(turn);
  return {
    geometry: new CylinderGeometry(radius, radius * 1.15, length, 8, 1, true),
    colour: geographyPalette.woodDark,
    position: middle.toArray(),
    rotation: [rotation.x, rotation.y, rotation.z] satisfies Triple,
  };
};

const buildEaselGeometry = (): BufferGeometry => {
  const legs = [-0.9, 0.9].map((x) => {
    const top = getBoardPoint([x, boardHeight * 0.22, -0.1]);
    const foot = new Vector3(x * 1.05, plinthTop, top.z - 0.45);
    return buildStrutPart(foot, top, 0.035);
  });
  const frontLeft = getBoardPoint([-boardWidth / 2 + 0.2, -boardHeight / 2, 0]);
  const frontRight = getBoardPoint([boardWidth / 2 - 0.2, -boardHeight / 2, 0]);
  const feet = [frontLeft, frontRight].map((top) =>
    buildStrutPart(new Vector3(top.x, plinthTop, top.z - 0.05), top, 0.04),
  );
  return buildModelGeometry([...legs, ...feet]);
};

const buildBoardGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(boardWidth + 0.14, boardHeight + 0.14, 0.09),
      colour: geographyPalette.wood,
      position: [0, 0, -0.07],
    },
    {
      geometry: new BoxGeometry(boardWidth + 0.22, 0.09, 0.16),
      colour: geographyPalette.woodDark,
      position: [0, -boardHeight / 2 - 0.08, 0],
    },
  ]);

const BoardFrame = () => {
  const board = useMemo(() => buildBoardGeometry(), []);
  const easel = useMemo(() => buildEaselGeometry(), []);
  const parchment = useCanvasTexture(
    parchmentSize,
    parchmentSize,
    paintParchment,
  );
  useDisposedOnUnmount(board);
  useDisposedOnUnmount(easel);

  return (
    <>
      <mesh geometry={easel} name="uk-easel">
        <meshPhysicalMaterial
          vertexColors
          roughness={0.5}
          clearcoat={0.4}
          clearcoatRoughness={0.3}
        />
      </mesh>
      <group position={[0, boardCentreY, 0]} rotation={[-boardLean, 0, 0]}>
        <mesh geometry={board} name="uk-board">
          <meshPhysicalMaterial
            vertexColors
            roughness={0.45}
            clearcoat={0.6}
            clearcoatRoughness={0.25}
          />
        </mesh>
        <mesh position={[0, 0, -0.01]} name="uk-parchment">
          <boxGeometry args={[boardWidth, boardHeight, 0.04]} />
          <meshPhysicalMaterial
            color={
              parchment === undefined ? geographyPalette.parchment : "#ffffff"
            }
            map={parchment ?? null}
            roughness={0.85}
          />
        </mesh>
      </group>
    </>
  );
};

const Sea = ({ highlight }: { highlight: UkHighlight | undefined }) => {
  const material = useRef<ShaderMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  const paintMask = useCallback<CanvasPainter>(
    (context, width, height) => {
      buildSeaMaskPainter(highlight)(context, width, height);
    },
    [highlight],
  );
  const mask = useCanvasTexture(seaMaskSize, seaMaskSize, paintMask);
  const uniforms = useMemo(() => buildSeaUniforms(mask), [mask]);
  const isGlowing = highlight !== undefined && isSea(highlight);

  useFrame(() => {
    if (material.current === null) {
      return;
    }
    material.current.uniforms.time.value = age.current * motionScale;
    material.current.uniforms.glow.value = isGlowing
      ? findPulse(age.current, motionScale)
      : 0;
  });

  return (
    <mesh position={[0, 0, seaLevel]} name="uk-sea">
      <planeGeometry args={[seaWidth, seaHeight]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={seaVertexShader}
        fragmentShader={seaFragmentShader}
      />
    </mesh>
  );
};

const Nation = ({
  nation,
  isHighlighted,
}: {
  nation: UkNation;
  isHighlighted: boolean;
}) => {
  const holder = useRef<Group>(null);
  const material = useRef<MeshPhysicalMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  const geometry = useMemo(
    () => buildLandGeometry(ukNationOutlines[nation], ukMountains[nation]),
    [nation],
  );
  useDisposedOnUnmount(geometry);
  const colour = useMemo(
    () =>
      isHighlighted
        ? new Color(nationColours[nation]).lerp(
            new Color(geographyPalette.highlight),
            0.75,
          )
        : new Color(nationColours[nation]),
    [nation, isHighlighted],
  );

  useFrame((_state, deltaSeconds) => {
    if (holder.current === null || material.current === null) {
      return;
    }
    const target = isHighlighted ? liftHeight : 0;
    const body = holder.current;
    body.position.z =
      motionScale === 0
        ? target
        : body.position.z +
          (target - body.position.z) * Math.min(1, deltaSeconds * liftSpeed);
    material.current.emissiveIntensity = isHighlighted
      ? 0.25 + 0.5 * findPulse(age.current, motionScale)
      : 0;
  });

  return (
    <group ref={holder}>
      <mesh geometry={geometry} name={`uk-${nation}`}>
        <meshPhysicalMaterial
          ref={material}
          color={colour}
          emissive={geographyPalette.highlightGlow}
          emissiveIntensity={0}
          roughness={0.5}
          clearcoat={0.55}
          clearcoatRoughness={0.25}
        />
      </mesh>
    </group>
  );
};

const NeutralLand = () => {
  const geometry = useMemo(
    () =>
      buildLandGeometry(
        [...irelandRepublicOutlines, franceCoastOutline],
        ukMountains.ireland,
      ),
    [],
  );
  useDisposedOnUnmount(geometry);
  return (
    <mesh geometry={geometry} name="uk-neighbours">
      <meshPhysicalMaterial
        color={neutralLandColour}
        roughness={0.7}
        clearcoat={0.2}
      />
    </mesh>
  );
};

const findPinPosition = (
  pin: GeographyShowOf<"uk-explorer">["pin"],
): PinTriple | undefined => {
  if (pin === undefined) {
    return undefined;
  }
  const [x, y] = getUkMapPoint([pin.longitude, pin.latitude], unitsPerDegree);
  return [x, y, landTop];
};

const pinNormal: PinTriple = [0, 0, 1];

export const UkExplorerScene = ({
  show,
}: {
  show: GeographyShowOf<"uk-explorer">;
}) => {
  const { highlight, pin } = show;
  const pinPosition = useMemo(() => findPinPosition(pin), [pin]);
  const highlightedNation =
    highlight !== undefined && isNation(highlight) ? highlight : undefined;

  return (
    <group name={show.scene}>
      <BoardFrame />
      <group position={[0, boardCentreY, 0]} rotation={[-boardLean, 0, 0]}>
        <Sea highlight={highlight} />
        <group position={[0, 0, seaLevel - 0.004]}>
          <NeutralLand />
          {ukNations.map((nation) => (
            <Nation
              key={nation}
              nation={nation}
              isHighlighted={nation === highlightedNation}
            />
          ))}
          {pinPosition === undefined ? null : (
            <MapPin position={pinPosition} normal={pinNormal} size={0.42} />
          )}
        </group>
      </group>
    </group>
  );
};
