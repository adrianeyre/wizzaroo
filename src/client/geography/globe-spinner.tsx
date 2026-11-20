import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  LatheGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type ShaderMaterial,
  type Texture,
} from "three";
import {
  continents,
  oceans,
  type Continent,
  type GeographyShowOf,
  type GlobeHighlight,
  type Ocean,
} from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import { buildModelGeometry } from "../world-map-models.js";
import {
  findPulse,
  geographyPalette,
  useCanvasTexture,
  useMotionScale,
  useSceneAge,
  type CanvasPainter,
} from "./geography-kit.js";
import {
  findGlobeRing,
  getGlobeSpin,
  getGlobeTilt,
  getGlobeView,
  getHemisphereAxis,
  getSurfaceDirection,
  type GlobeRing,
} from "./globe-geometry.js";
import { MapPin, type PinTriple } from "./map-pin.js";
import type { Outline } from "./uk-outlines.js";
import {
  continentOutlines,
  icyOutlines,
  lakeOutlines,
  oceanOutlines,
} from "./world-outlines.js";

const globeRadius = 1.2;
const globeCentreY = 0.24;
const meridianRadius = 1.29;
const plinthTop = -1.5;
const surfaceWidth = 512;
const surfaceHeight = 256;
const maskWidth = 512;
const maskHeight = 256;
const turnInSeconds = 1.6;
const turnInSpin = 1.9;
const swaySpin = 0.2;
const swayTilt = 0.05;
const studioLight = new Vector3(3, 5, 4).normalize();
const globeWorldTurn = new Quaternion();

const allLand: Outline[] = Object.values(continentOutlines).flat();

const getCanvasX = (longitude: number, width: number) =>
  ((longitude + 180) / 360) * width;

const getCanvasY = (latitude: number, height: number) =>
  ((90 - latitude) / 180) * height;

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

const fillOutlines = (
  context: CanvasRenderingContext2D,
  outlines: readonly Outline[],
  colour: string,
  width: number,
  height: number,
) => {
  traceOutlines(context, outlines, width, height);
  context.fillStyle = colour;
  context.fill();
};

interface Patch {
  longitude: number;
  latitude: number;
  spanLongitude: number;
  spanLatitude: number;
  colour: string;
}

const paintPatch = (
  context: CanvasRenderingContext2D,
  patch: Patch,
  width: number,
  height: number,
) => {
  const radiusX = (patch.spanLongitude / 360) * width;
  const radiusY = (patch.spanLatitude / 180) * height;
  context.save();
  context.translate(
    getCanvasX(patch.longitude, width),
    getCanvasY(patch.latitude, height),
  );
  context.scale(radiusX, radiusY);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, patch.colour);
  gradient.addColorStop(0.55, patch.colour);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, 1, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

const desert = "rgba(232, 205, 140, 0.95)";
const dryland = "rgba(196, 184, 120, 0.7)";
const rainforest = "rgba(36, 120, 58, 0.85)";
const mountain = "rgba(150, 128, 98, 0.55)";
const tundra = "rgba(132, 150, 112, 0.75)";

const landPatches: Patch[] = [
  {
    longitude: 12,
    latitude: 23,
    spanLongitude: 28,
    spanLatitude: 9,
    colour: desert,
  },
  {
    longitude: -6,
    latitude: 22,
    spanLongitude: 12,
    spanLatitude: 8,
    colour: desert,
  },
  {
    longitude: 46,
    latitude: 23,
    spanLongitude: 10,
    spanLatitude: 8,
    colour: desert,
  },
  {
    longitude: 57,
    latitude: 31,
    spanLongitude: 8,
    spanLatitude: 4,
    colour: dryland,
  },
  {
    longitude: 62,
    latitude: 42,
    spanLongitude: 10,
    spanLatitude: 5,
    colour: dryland,
  },
  {
    longitude: 104,
    latitude: 42,
    spanLongitude: 13,
    spanLatitude: 5,
    colour: desert,
  },
  {
    longitude: 84,
    latitude: 39,
    spanLongitude: 7,
    spanLatitude: 3,
    colour: desert,
  },
  {
    longitude: 71,
    latitude: 27,
    spanLongitude: 4,
    spanLatitude: 3,
    colour: dryland,
  },
  {
    longitude: 132,
    latitude: -25,
    spanLongitude: 14,
    spanLatitude: 8,
    colour: desert,
  },
  {
    longitude: 21,
    latitude: -23,
    spanLongitude: 7,
    spanLatitude: 5,
    colour: dryland,
  },
  {
    longitude: -112,
    latitude: 33,
    spanLongitude: 7,
    spanLatitude: 5,
    colour: dryland,
  },
  {
    longitude: -69,
    latitude: -24,
    spanLongitude: 3,
    spanLatitude: 8,
    colour: desert,
  },
  {
    longitude: -68,
    latitude: -45,
    spanLongitude: 5,
    spanLatitude: 6,
    colour: dryland,
  },
  {
    longitude: -62,
    latitude: -5,
    spanLongitude: 14,
    spanLatitude: 8,
    colour: rainforest,
  },
  {
    longitude: 20,
    latitude: 0,
    spanLongitude: 10,
    spanLatitude: 6,
    colour: rainforest,
  },
  {
    longitude: 112,
    latitude: 0,
    spanLongitude: 14,
    spanLatitude: 6,
    colour: rainforest,
  },
  {
    longitude: 102,
    latitude: 15,
    spanLongitude: 6,
    spanLatitude: 6,
    colour: rainforest,
  },
  {
    longitude: 143,
    latitude: -6,
    spanLongitude: 6,
    spanLatitude: 3,
    colour: rainforest,
  },
  {
    longitude: -86,
    latitude: 14,
    spanLongitude: 5,
    spanLatitude: 4,
    colour: rainforest,
  },
  {
    longitude: 86,
    latitude: 31,
    spanLongitude: 12,
    spanLatitude: 4,
    colour: mountain,
  },
  {
    longitude: -112,
    latitude: 46,
    spanLongitude: 6,
    spanLatitude: 12,
    colour: mountain,
  },
  {
    longitude: -70,
    latitude: -25,
    spanLongitude: 2.5,
    spanLatitude: 20,
    colour: mountain,
  },
  {
    longitude: 100,
    latitude: 66,
    spanLongitude: 60,
    spanLatitude: 6,
    colour: tundra,
  },
  {
    longitude: -105,
    latitude: 66,
    spanLongitude: 40,
    spanLatitude: 5,
    colour: tundra,
  },
];

const findRandomSequence = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const paintOcean = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#5aa6dc");
  gradient.addColorStop(0.22, geographyPalette.sea);
  gradient.addColorStop(0.5, geographyPalette.seaDeep);
  gradient.addColorStop(0.78, geographyPalette.sea);
  gradient.addColorStop(1, "#6aaedc");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const deepBasins: Patch[] = [
    {
      longitude: -150,
      latitude: 5,
      spanLongitude: 45,
      spanLatitude: 30,
      colour: "rgba(16, 60, 140, 0.55)",
    },
    {
      longitude: 170,
      latitude: -10,
      spanLongitude: 25,
      spanLatitude: 25,
      colour: "rgba(16, 60, 140, 0.45)",
    },
    {
      longitude: -35,
      latitude: 5,
      spanLongitude: 18,
      spanLatitude: 30,
      colour: "rgba(16, 60, 140, 0.4)",
    },
    {
      longitude: 80,
      latitude: -20,
      spanLongitude: 25,
      spanLatitude: 18,
      colour: "rgba(16, 60, 140, 0.45)",
    },
  ];
  for (const basin of deepBasins) {
    paintPatch(context, basin, width, height);
  }
};

const paintGlobeSurface: CanvasPainter = (context, width, height) => {
  paintOcean(context, width, height);
  context.save();
  context.shadowColor = "rgba(150, 220, 245, 0.95)";
  context.shadowBlur = 12;
  fillOutlines(context, allLand, "#5fb4e2", width, height);
  context.restore();
  fillOutlines(context, allLand, "#62b25e", width, height);
  context.save();
  traceOutlines(context, allLand, width, height);
  context.clip();
  const lightness = context.createLinearGradient(0, 0, 0, height);
  lightness.addColorStop(0.2, "rgba(40, 100, 50, 0.35)");
  lightness.addColorStop(0.45, "rgba(150, 200, 90, 0.25)");
  lightness.addColorStop(0.6, "rgba(150, 200, 90, 0.2)");
  lightness.addColorStop(0.8, "rgba(40, 100, 50, 0.3)");
  context.fillStyle = lightness;
  context.fillRect(0, 0, width, height);
  for (const patch of landPatches) {
    paintPatch(context, patch, width, height);
  }
  const nextRandom = findRandomSequence(7);
  for (let speck = 0; speck < 2600; speck++) {
    const isDark = nextRandom() > 0.5;
    context.fillStyle = isDark
      ? "rgba(20, 60, 30, 0.16)"
      : "rgba(255, 250, 210, 0.12)";
    const size = 1 + nextRandom() * 3;
    context.fillRect(nextRandom() * width, nextRandom() * height, size, size);
  }
  context.fillStyle = "rgba(238, 247, 255, 0.85)";
  context.fillRect(0, 0, width, getCanvasY(74, height));
  context.restore();
  fillOutlines(context, icyOutlines, geographyPalette.ice, width, height);
  context.save();
  traceOutlines(context, icyOutlines, width, height);
  context.clip();
  const iceShade = context.createLinearGradient(0, 0, 0, height);
  iceShade.addColorStop(0, "rgba(255, 255, 255, 0)");
  iceShade.addColorStop(0.5, "rgba(160, 200, 230, 0.35)");
  iceShade.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = iceShade;
  context.fillRect(0, 0, width, height);
  context.restore();
  fillOutlines(context, lakeOutlines, "#2f86cf", width, height);
  traceOutlines(context, allLand, width, height);
  context.strokeStyle = "rgba(30, 80, 50, 0.45)";
  context.lineWidth = 1;
  context.stroke();
};

const cityClusters: Patch[] = [
  {
    longitude: 8,
    latitude: 50,
    spanLongitude: 14,
    spanLatitude: 7,
    colour: "",
  },
  {
    longitude: -1.5,
    latitude: 52.5,
    spanLongitude: 3,
    spanLatitude: 3,
    colour: "",
  },
  {
    longitude: 78,
    latitude: 24,
    spanLongitude: 10,
    spanLatitude: 8,
    colour: "",
  },
  {
    longitude: 115,
    latitude: 32,
    spanLongitude: 9,
    spanLatitude: 8,
    colour: "",
  },
  {
    longitude: 137,
    latitude: 36,
    spanLongitude: 4,
    spanLatitude: 3,
    colour: "",
  },
  {
    longitude: -82,
    latitude: 39,
    spanLongitude: 12,
    spanLatitude: 6,
    colour: "",
  },
  {
    longitude: -118,
    latitude: 36,
    spanLongitude: 5,
    spanLatitude: 4,
    colour: "",
  },
  {
    longitude: -46,
    latitude: -22,
    spanLongitude: 6,
    spanLatitude: 4,
    colour: "",
  },
  {
    longitude: 31,
    latitude: 29,
    spanLongitude: 1.5,
    spanLatitude: 4,
    colour: "",
  },
  { longitude: 5, latitude: 8, spanLongitude: 6, spanLatitude: 3, colour: "" },
  {
    longitude: 37,
    latitude: 54,
    spanLongitude: 8,
    spanLatitude: 4,
    colour: "",
  },
  {
    longitude: 107,
    latitude: -7,
    spanLongitude: 5,
    spanLatitude: 1.5,
    colour: "",
  },
  {
    longitude: 150,
    latitude: -34,
    spanLongitude: 4,
    spanLatitude: 4,
    colour: "",
  },
  {
    longitude: -99,
    latitude: 20,
    spanLongitude: 4,
    spanLatitude: 3,
    colour: "",
  },
];

const paintCityLights = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  const nextRandom = findRandomSequence(11);
  context.globalCompositeOperation = "lighter";
  for (let light = 0; light < 900; light++) {
    const brightness = Math.round(90 + nextRandom() * 165);
    context.fillStyle = `rgb(0, 0, ${String(brightness)})`;
    context.fillRect(
      nextRandom() * width,
      getCanvasY(-45 + nextRandom() * 110, height),
      1,
      1,
    );
  }
  for (const cluster of cityClusters) {
    for (let light = 0; light < 70; light++) {
      const brightness = Math.round(140 + nextRandom() * 115);
      context.fillStyle = `rgb(0, 0, ${String(brightness)})`;
      const spreadX = (nextRandom() + nextRandom() - 1) * cluster.spanLongitude;
      const spreadY = (nextRandom() + nextRandom() - 1) * cluster.spanLatitude;
      context.fillRect(
        getCanvasX(cluster.longitude + spreadX, width),
        getCanvasY(cluster.latitude + spreadY, height),
        1,
        1,
      );
    }
  }
  context.globalCompositeOperation = "source-over";
};

const isContinent = (highlight: GlobeHighlight): highlight is Continent =>
  continents.some((continent) => continent === highlight);

const isOcean = (highlight: GlobeHighlight): highlight is Ocean =>
  oceans.some((ocean) => ocean === highlight);

const buildMaskPainter =
  (highlight: GlobeHighlight | undefined): CanvasPainter =>
  (context, width, height) => {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);
    if (highlight !== undefined && isOcean(highlight)) {
      fillOutlines(context, oceanOutlines[highlight], "#ff0000", width, height);
    }
    fillOutlines(context, allLand, "#00ff00", width, height);
    if (highlight !== undefined && isContinent(highlight)) {
      fillOutlines(
        context,
        continentOutlines[highlight],
        "#ffff00",
        width,
        height,
      );
    }
    paintCityLights(context, width, height);
    fillOutlines(context, lakeOutlines, "#000000", width, height);
  };

const globeVertexShader = `
varying vec2 vUv;
varying vec3 vLocalNormal;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vLocalNormal = normal;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const globeFragmentShader = `
uniform sampler2D surfaceMap;
uniform sampler2D maskMap;
uniform float hasMaps;
uniform vec3 lightDirection;
uniform float nightAmount;
uniform float glow;
uniform vec3 glowColour;
uniform vec3 hemisphereAxis;
uniform vec3 fallbackSea;
uniform vec3 nightTint;
uniform vec3 cityColour;
uniform vec3 duskColour;
uniform vec3 atmosphereColour;
varying vec2 vUv;
varying vec3 vLocalNormal;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 localNormal = normalize(vLocalNormal);
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  vec3 surface = hasMaps > 0.5 ? texture2D(surfaceMap, vUv).rgb : fallbackSea;
  vec4 mask = hasMaps > 0.5 ? texture2D(maskMap, vUv) : vec4(0.0);
  float land = mask.g;
  float facing = dot(normal, lightDirection);
  float lit = max(facing, 0.0);
  float daylight = mix(1.0, smoothstep(-0.1, 0.16, facing), nightAmount);
  float studioShade = 0.5 + 0.72 * lit + 0.1 * (facing * 0.5 + 0.5);
  float sunShade = mix(0.07, 0.28 + 0.9 * lit, daylight);
  float shade = mix(studioShade, sunShade, nightAmount);
  vec3 colour = surface * shade;
  float night = nightAmount * (1.0 - daylight);
  colour += nightTint * night;
  colour += cityColour * mask.b * land * night * 1.8;
  colour += duskColour * nightAmount * exp(-pow(facing / 0.11, 2.0)) * 0.22;
  vec3 halfway = normalize(lightDirection + viewDirection);
  float shine = max(dot(normal, halfway), 0.0);
  colour += vec3(1.0, 0.98, 0.9) * pow(shine, 80.0) * (1.0 - land) * 0.7 * daylight;
  colour += vec3(1.0) * pow(shine, 14.0) * 0.07 * daylight;
  float region = mask.r;
  if (dot(hemisphereAxis, hemisphereAxis) > 0.5) {
    region = max(region, 0.62 * smoothstep(-0.012, 0.012, dot(localNormal, hemisphereAxis)));
  }
  vec3 glowLit = glowColour * (0.62 + 0.45 * lit);
  colour = mix(colour, glowLit, region * (0.58 + 0.3 * glow));
  colour += glowColour * region * glow * 0.32;
  float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.6);
  colour += atmosphereColour * rim * mix(0.55, 0.15 + 0.5 * daylight, nightAmount);
  gl_FragColor = vec4(colour, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const haloVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const haloFragmentShader = `
uniform vec3 haloColour;
uniform float edge;
varying vec2 vUv;

void main() {
  float distanceFromCentre = length(vUv - 0.5) * 2.0;
  float outside = max(distanceFromCentre - edge, 0.0);
  float halo = exp(-outside * 9.0) * smoothstep(edge - 0.05, edge, distanceFromCentre);
  gl_FragColor = vec4(haloColour * halo * 0.65, 1.0);
}
`;

const haloSize = 3.5;

interface GlobeLook {
  surface: Texture | undefined;
  mask: Texture | undefined;
  highlight: GlobeHighlight | undefined;
  isNightShown: boolean;
}

const buildGlobeUniforms = ({
  surface,
  mask,
  highlight,
  isNightShown,
}: GlobeLook) => ({
  surfaceMap: { value: surface ?? null },
  maskMap: { value: mask ?? null },
  hasMaps: { value: surface !== undefined && mask !== undefined ? 1 : 0 },
  lightDirection: { value: studioLight.clone() },
  nightAmount: { value: isNightShown ? 1 : 0 },
  glow: { value: 0 },
  glowColour: { value: new Color(geographyPalette.highlight) },
  hemisphereAxis: { value: new Vector3(...getHemisphereAxis(highlight)) },
  fallbackSea: { value: new Color(geographyPalette.sea) },
  nightTint: { value: new Color("#06122e") },
  cityColour: { value: new Color("#ffc46b") },
  duskColour: { value: new Color("#ff8a3d") },
  atmosphereColour: { value: new Color("#8cc8ff") },
});

const buildHaloUniforms = () => ({
  haloColour: { value: new Color("#7fb8ff") },
  edge: { value: (globeRadius * 2.14) / haloSize },
});

const buildStandGeometry = (): BufferGeometry => {
  const baseProfile = [
    new Vector2(0.001, 0),
    new Vector2(0.62, 0),
    new Vector2(0.65, 0.04),
    new Vector2(0.58, 0.09),
    new Vector2(0.36, 0.13),
    new Vector2(0.2, 0.2),
    new Vector2(0.12, 0.28),
    new Vector2(0.001, 0.29),
  ];
  const baseTop = plinthTop + 0.28;
  const ringBottom = globeCentreY - meridianRadius;
  const pillarHeight = ringBottom - baseTop + 0.04;
  const capOffset = (meridianRadius + globeRadius) / 2;
  const capLength = meridianRadius - globeRadius + 0.02;
  return buildModelGeometry([
    {
      geometry: new LatheGeometry(baseProfile, 20),
      colour: geographyPalette.brass,
      position: [0, plinthTop, 0],
      isSmooth: true,
    },
    {
      geometry: new CylinderGeometry(0.07, 0.1, pillarHeight, 12, 1, true),
      colour: geographyPalette.brass,
      position: [0, baseTop + pillarHeight / 2 - 0.02, 0],
    },
    {
      geometry: new TorusGeometry(meridianRadius, 0.035, 5, 40),
      colour: geographyPalette.brass,
      position: [0, globeCentreY, 0],
      isSmooth: true,
    },
    {
      geometry: new CylinderGeometry(0.022, 0.03, capLength, 6, 1, true),
      colour: "#b88a35",
      position: [0, globeCentreY + capOffset, 0],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.022, capLength, 6, 1, true),
      colour: "#b88a35",
      position: [0, globeCentreY - capOffset, 0],
    },
    {
      geometry: new SphereGeometry(0.06, 6, 4),
      colour: geographyPalette.brass,
      position: [0, globeCentreY + meridianRadius + 0.05, 0],
      isSmooth: true,
    },
  ]);
};

const GlobeStand = () => {
  const geometry = useMemo(() => buildStandGeometry(), []);
  useDisposedOnUnmount(geometry);
  return (
    <mesh geometry={geometry} name="globe-stand">
      <meshPhysicalMaterial
        vertexColors
        metalness={0.55}
        roughness={0.3}
        clearcoat={0.7}
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
};

const GlobeHalo = () => {
  const uniforms = useMemo(() => buildHaloUniforms(), []);
  return (
    <mesh position={[0, globeCentreY, -0.3]} renderOrder={-1}>
      <planeGeometry args={[haloSize, haloSize]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={haloVertexShader}
        fragmentShader={haloFragmentShader}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
};

const GlowingRing = ({ ring }: { ring: GlobeRing }) => {
  const material = useRef<MeshBasicMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  const glowColour = useMemo(() => new Color(geographyPalette.highlight), []);

  useFrame(() => {
    if (material.current === null) {
      return;
    }
    const pulse = findPulse(age.current, motionScale);
    material.current.color.copy(glowColour).multiplyScalar(1.05 + 0.5 * pulse);
  });

  return (
    <mesh
      position={[0, ring.heightShare * globeRadius, 0]}
      rotation={ring.rotation}
      name="globe-line"
    >
      <torusGeometry
        args={[ring.radiusShare * globeRadius + 0.012, 0.024, 4, 56, ring.arc]}
      />
      <meshBasicMaterial
        ref={material}
        color={geographyPalette.highlight}
        toneMapped={false}
      />
    </mesh>
  );
};

const findPinPlacement = (
  pin: GeographyShowOf<"globe-spinner">["pin"],
): { position: PinTriple; normal: PinTriple } | undefined => {
  if (pin === undefined) {
    return undefined;
  }
  const direction = getSurfaceDirection(
    pin.latitude,
    pin.longitude,
    new Vector3(),
  );
  return {
    position: [
      direction.x * globeRadius,
      direction.y * globeRadius,
      direction.z * globeRadius,
    ],
    normal: [direction.x, direction.y, direction.z],
  };
};

const useGlobeTurning = (show: GeographyShowOf<"globe-spinner">) => {
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  const view = useMemo(() => getGlobeView(show), [show]);

  useFrame(() => {
    if (tilt.current === null || spin.current === null) {
      return;
    }
    const progress = Math.min(1, age.current / turnInSeconds);
    const settling = motionScale === 0 ? 0 : (1 - progress) ** 3;
    const drift = age.current * motionScale;
    spin.current.rotation.y =
      getGlobeSpin(view) +
      settling * turnInSpin +
      Math.sin(drift * 0.33) * swaySpin * motionScale;
    tilt.current.rotation.x =
      getGlobeTilt(view) * (1 - settling * 0.4) +
      Math.sin(drift * 0.23 + 1.1) * swayTilt * motionScale;
  });

  return { tilt, spin };
};

export const GlobeSpinnerScene = ({
  show,
}: {
  show: GeographyShowOf<"globe-spinner">;
}) => {
  const { tilt, spin } = useGlobeTurning(show);
  const globe = useRef<Mesh>(null);
  const globeMaterial = useRef<ShaderMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  const { highlight, sunLongitude, pin } = show;
  const surface = useCanvasTexture(
    surfaceWidth,
    surfaceHeight,
    paintGlobeSurface,
  );
  const paintMask = useCallback<CanvasPainter>(
    (context, width, height) => {
      buildMaskPainter(highlight)(context, width, height);
    },
    [highlight],
  );
  const mask = useCanvasTexture(maskWidth, maskHeight, paintMask);
  const sphere = useMemo(
    () => new SphereGeometry(globeRadius, 44, 30, -Math.PI / 2),
    [],
  );
  useDisposedOnUnmount(sphere);
  const localSun = useMemo(
    () =>
      sunLongitude === undefined
        ? undefined
        : getSurfaceDirection(0, sunLongitude, new Vector3()),
    [sunLongitude],
  );
  const uniforms = useMemo(
    () =>
      buildGlobeUniforms({
        surface,
        mask,
        highlight,
        isNightShown: localSun !== undefined,
      }),
    [surface, mask, highlight, localSun],
  );
  const ring = findGlobeRing(highlight);
  const pinPlacement = useMemo(() => findPinPlacement(pin), [pin]);
  const isGlowing = highlight !== undefined && ring === undefined;
  const isHemisphereGlowing = getHemisphereAxis(highlight).some(
    (part) => part !== 0,
  );

  useFrame(() => {
    const material = globeMaterial.current;
    if (material === null) {
      return;
    }
    material.uniforms.glow.value =
      isGlowing || isHemisphereGlowing
        ? findPulse(age.current, motionScale)
        : 0;
    const light: unknown = material.uniforms.lightDirection.value;
    if (!(light instanceof Vector3)) {
      return;
    }
    if (localSun === undefined || globe.current === null) {
      light.copy(studioLight);
      return;
    }
    globe.current.getWorldQuaternion(globeWorldTurn);
    light.copy(localSun).applyQuaternion(globeWorldTurn);
  });

  return (
    <group name={show.scene}>
      <GlobeHalo />
      <GlobeStand />
      <group position={[0, globeCentreY, 0]}>
        <group ref={tilt}>
          <group ref={spin}>
            <mesh ref={globe} geometry={sphere} name="globe">
              <shaderMaterial
                ref={globeMaterial}
                uniforms={uniforms}
                vertexShader={globeVertexShader}
                fragmentShader={globeFragmentShader}
              />
            </mesh>
            {ring === undefined ? null : <GlowingRing ring={ring} />}
            {pinPlacement === undefined ? null : (
              <MapPin
                position={pinPlacement.position}
                normal={pinPlacement.normal}
                size={0.42}
              />
            )}
          </group>
        </group>
      </group>
    </group>
  );
};
