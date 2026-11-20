import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  LatheGeometry,
  Object3D,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  TorusGeometry,
  Vector2,
  type InstancedMesh,
  type MeshPhysicalMaterial,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type {
  GeographyShowOf,
  VolcanoPart,
} from "../../curriculum/geography.js";
import { buildPaletteUniform } from "../pixel-pipeline.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import { buildModelGeometry, type ModelPart } from "../world-map-models.js";
import { BobbingArrow } from "./answer-pointer.js";
import {
  ashPuffs,
  buildSlopeProfile,
  findCutawayModel,
  findLavaFlowPoint,
  findSideVentEnd,
  isEarthLayer,
  isVolcanoPart,
  magmaChamber,
  sideVentStart,
  volcanoArrows,
  volcanoShape,
} from "./cutaway-layout.js";
import { DriftingParticles } from "./drifting-particles.js";
import { EarthLayersModel } from "./earth-layers-model.js";
import { EarthquakeModel } from "./earthquake-model.js";
import {
  findPulse,
  geographyPalette,
  useCanvasTexture,
  useMotionScale,
  useSceneAge,
  type CanvasPainter,
} from "./geography-kit.js";

export const volcanoTime = { value: 0 };

export const useVolcanoClock = () => {
  const motionScale = useMotionScale();
  useFrame((state) => {
    volcanoTime.value = state.clock.elapsedTime * motionScale;
  });
};

const lavaVertexShader = `
varying vec3 vPlace;

void main() {
  vPlace = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const lavaFragmentShader = `
uniform float time;
uniform float heat;
uniform float motion;
uniform vec3 crust;
uniform vec3 hot;
uniform vec3 bright;
uniform vec3 gold;
varying vec3 vPlace;

float findCracks(vec2 point) {
  float across = sin(point.x * 13.0 + sin(point.y * 9.0 + time * 0.8) * 1.5);
  float along = sin(point.y * 11.0 - time * 1.4 + sin(point.x * 7.0) * 1.3);
  return abs(across * along);
}

void main() {
  vec2 point = vPlace.xy + vec2(vPlace.z * 0.8, vPlace.z * 0.4);
  float cracks = findCracks(point * 1.3);
  float molten = 1.0 - smoothstep(0.0, 0.55, cracks);
  vec3 colour = mix(crust, hot, 0.45 + 0.55 * molten);
  colour = mix(colour, bright, molten * molten * 0.75);
  float pulse = mix(0.75, 0.5 + 0.5 * sin(time * 4.0), motion);
  colour = mix(colour, gold, heat * (0.35 + 0.5 * pulse));
  colour *= 1.0 + heat * 0.5 * pulse;
  gl_FragColor = vec4(colour, 1.0);
}
`;

export const buildLavaMaterial = (heat: number, motionScale: number) => {
  const [crust, hot, bright, gold] = buildPaletteUniform([
    "#5a1606",
    "#ff5a14",
    "#ffd34a",
    "#fff3b0",
  ]);
  return new ShaderMaterial({
    uniforms: {
      time: volcanoTime,
      heat: { value: heat },
      motion: { value: motionScale },
      crust: { value: crust },
      hot: { value: hot },
      bright: { value: bright },
      gold: { value: gold },
    },
    vertexShader: lavaVertexShader,
    fragmentShader: lavaFragmentShader,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
};

const faceLeft = -volcanoShape.groundRadius;
const faceWidth = volcanoShape.groundRadius * 2;
const faceBottom = volcanoShape.groundBottom;
const faceHeight = volcanoShape.summit + 0.05 - faceBottom;

const buildCutFaceShape = (): Shape => {
  const profile = buildSlopeProfile(14);
  const outline = new Shape();
  outline.moveTo(faceLeft, faceBottom);
  outline.lineTo(-faceLeft, faceBottom);
  outline.lineTo(-faceLeft, volcanoShape.groundTop);
  profile.forEach(([radius, height]) => {
    outline.lineTo(radius, height);
  });
  outline.lineTo(volcanoShape.craterRadius, volcanoShape.craterFloor);
  outline.lineTo(-volcanoShape.craterRadius, volcanoShape.craterFloor);
  profile.toReversed().forEach(([radius, height]) => {
    outline.lineTo(-radius, height);
  });
  outline.lineTo(faceLeft, volcanoShape.groundTop);
  outline.closePath();
  return outline;
};

const buildCutFaceGeometry = (): BufferGeometry => {
  const face = new ShapeGeometry(buildCutFaceShape());
  const positions = face.getAttribute("position");
  const coordinates = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index++) {
    coordinates[index * 2] = (positions.getX(index) - faceLeft) / faceWidth;
    coordinates[index * 2 + 1] =
      (positions.getY(index) - faceBottom) / faceHeight;
  }
  face.setAttribute("uv", new BufferAttribute(coordinates, 2));
  return face;
};

const strataColours = ["#9d978f", "#5b3b33", "#b6aca0", "#6e4a3c", "#8a8079"];
const groundStrata = ["#7a5a3e", "#9c7a55", "#86705c", "#6a5d55"];

const paintCutFace: CanvasPainter = (context, width, height) => {
  const toPixelX = (x: number) => ((x - faceLeft) / faceWidth) * width;
  const toPixelY = (y: number) => (1 - (y - faceBottom) / faceHeight) * height;
  const groundDepth = volcanoShape.groundTop - faceBottom;
  groundStrata.forEach((colour, index) => {
    const top = volcanoShape.groundTop - (index * groundDepth) / 4;
    context.fillStyle = colour;
    context.fillRect(
      0,
      toPixelY(top),
      width,
      toPixelY(top - groundDepth / 4) - toPixelY(top) + 1,
    );
  });
  const profile = buildSlopeProfile(24);
  strataColours.concat(strataColours).forEach((colour, layer) => {
    const inset = layer * 0.075;
    context.beginPath();
    profile.forEach(([radius, slopeHeight], index) => {
      const x = toPixelX(Math.max(0, radius - inset));
      const y = toPixelY(slopeHeight - inset * 0.5);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    profile.toReversed().forEach(([radius, slopeHeight]) => {
      context.lineTo(
        toPixelX(-Math.max(0, radius - inset)),
        toPixelY(slopeHeight - inset * 0.5),
      );
    });
    context.closePath();
    context.fillStyle = colour;
    context.fill();
  });
  context.globalAlpha = 0.12;
  for (let speck = 0; speck < 260; speck++) {
    const x = (Math.sin(speck * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(speck * 78.233) * 12543.123) % 1;
    context.fillStyle = speck % 2 === 0 ? "#000000" : "#ffffff";
    context.fillRect(Math.abs(x) * width, Math.abs(y) * height, 3, 2);
  }
  context.globalAlpha = 1;
};

const buildEllipseShape = (): Shape => {
  const outline = new Shape();
  outline.absellipse(
    magmaChamber.x,
    magmaChamber.y,
    magmaChamber.width,
    magmaChamber.height,
    0,
    Math.PI * 2,
    false,
    0,
  );
  return outline;
};

const buildMainVentShape = (): Shape => {
  const outline = new Shape();
  const bottom = magmaChamber.y + magmaChamber.height - 0.04;
  const top = volcanoShape.craterFloor + 0.01;
  const steps = 10;
  const sway = (share: number) => Math.sin(share * 5.5) * 0.025;
  const halfWidth = (share: number) => 0.06 - share * 0.02;
  for (let step = 0; step <= steps; step++) {
    const share = step / steps;
    outline[step === 0 ? "moveTo" : "lineTo"](
      sway(share) + halfWidth(share),
      bottom + (top - bottom) * share,
    );
  }
  for (let step = steps; step >= 0; step--) {
    const share = step / steps;
    outline.lineTo(
      sway(share) - halfWidth(share),
      bottom + (top - bottom) * share,
    );
  }
  outline.closePath();
  return outline;
};

const buildSideVentShape = (): Shape => {
  const [endX, endY] = findSideVentEnd();
  const [startX, startY] = sideVentStart;
  const along = new Vector2(endX - startX, endY - startY).normalize();
  const across = new Vector2(-along.y, along.x).multiplyScalar(0.032);
  const outline = new Shape();
  outline.moveTo(startX + across.x * 1.4, startY + across.y * 1.4);
  outline.lineTo(endX + across.x, endY + across.y);
  outline.lineTo(endX - across.x, endY - across.y);
  outline.lineTo(startX - across.x * 1.4, startY - across.y * 1.4);
  outline.closePath();
  return outline;
};

const buildLavaFlowGeometry = (): BufferGeometry => {
  const samples = 18;
  const vertices: number[] = [];
  const faces: number[] = [];
  for (let step = 0; step <= samples; step++) {
    const share = 1 - step / samples;
    const [x, y, z] = findLavaFlowPoint(share);
    const length = Math.hypot(x, z);
    const acrossX = -z / length;
    const acrossZ = x / length;
    const halfWidth = 0.035 + 0.06 * (1 - share) + 0.012 * Math.sin(step * 1.7);
    const wander = 0.03 * Math.sin(step * 0.9);
    vertices.push(
      x + acrossX * (halfWidth + wander),
      y,
      z + acrossZ * (halfWidth + wander),
      x - acrossX * (halfWidth - wander),
      y,
      z - acrossZ * (halfWidth - wander),
    );
    if (step > 0) {
      const first = step * 2;
      faces.push(first - 2, first, first - 1, first - 1, first, first + 1);
    }
  }
  const flow = new BufferGeometry();
  flow.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(vertices), 3),
  );
  flow.setIndex(faces);
  return flow;
};

const buildConeExterior = (): BufferGeometry => {
  const profile = buildSlopeProfile(12).map(
    ([radius, height]) => new Vector2(radius, height),
  );
  profile.push(
    new Vector2(volcanoShape.craterRadius, volcanoShape.craterFloor),
    new Vector2(0, volcanoShape.craterFloor),
  );
  const lathe = new LatheGeometry(profile, 30, Math.PI / 2, Math.PI);
  const flat = lathe.toNonIndexed();
  lathe.dispose();
  flat.deleteAttribute("uv");
  flat.computeVertexNormals();
  const positions = flat.getAttribute("position");
  const colours = new Float32Array(positions.count * 3);
  const meadow = new Color("#5f9445");
  const ash = new Color("#7d6f64");
  const scorched = new Color("#4a3f3b");
  const colour = new Color();
  for (let index = 0; index < positions.count; index++) {
    const share =
      (positions.getY(index) - volcanoShape.groundTop) /
      (volcanoShape.summit - volcanoShape.groundTop);
    colour
      .copy(meadow)
      .lerp(ash, Math.min(1, Math.max(0, (share - 0.1) / 0.35)))
      .lerp(scorched, Math.min(1, Math.max(0, (share - 0.6) / 0.4)));
    colour.toArray(colours, index * 3);
  }
  flat.setAttribute("color", new BufferAttribute(colours, 3));
  return flat;
};

const buildVolcanoGround = (): BufferGeometry => {
  const halfTurn: Pick<ModelPart, "rotation"> = { rotation: [0, 0, 0] };
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(
        volcanoShape.groundRadius,
        volcanoShape.groundRadius,
        volcanoShape.groundTop - volcanoShape.groundBottom - 0.04,
        32,
        1,
        false,
        Math.PI / 2,
        Math.PI,
      ),
      colour: "#7a5a3e",
      position: [
        0,
        (volcanoShape.groundTop + volcanoShape.groundBottom - 0.04) / 2,
        0,
      ],
      ...halfTurn,
    },
    {
      geometry: new CylinderGeometry(
        volcanoShape.groundRadius,
        volcanoShape.groundRadius,
        0.04,
        32,
        1,
        false,
        Math.PI / 2,
        Math.PI,
      ),
      colour: "#6cb456",
      position: [0, volcanoShape.groundTop - 0.02, 0],
    },
    ...[
      [-1.3, -0.5],
      [-1.15, -0.85],
      [1.3, -0.45],
      [1.1, -0.9],
      [-0.6, -1.4],
      [0.7, -1.35],
    ].flatMap(([x, z]): ModelPart[] => [
      {
        geometry: new CylinderGeometry(0.02, 0.025, 0.08, 5),
        colour: "#5b3a24",
        position: [x, volcanoShape.groundTop + 0.04, z],
      },
      {
        geometry: new ConeGeometry(0.09, 0.24, 7),
        colour: "#2f6a3a",
        position: [x, volcanoShape.groundTop + 0.2, z],
      },
    ]),
  ]);
};

const buildVolcanoBody = (): BufferGeometry => {
  const ground = buildVolcanoGround();
  const cone = buildConeExterior();
  const body = mergeGeometries([ground, cone]);
  ground.dispose();
  cone.dispose();
  return body;
};

const buildCraterPoolGeometry = (): BufferGeometry => {
  const pool = new CircleGeometry(
    volcanoShape.craterRadius + 0.01,
    12,
    Math.PI,
    Math.PI,
  );
  pool.rotateX(-Math.PI / 2);
  pool.translate(0, volcanoShape.craterFloor + 0.006, 0);
  return pool;
};

const lavaParts = [
  "magma-chamber",
  "main-vent",
  "side-vent",
  "lava-flow",
  "crater",
] as const;

type LavaPart = (typeof lavaParts)[number];

const buildLavaGeometry = (part: LavaPart): BufferGeometry => {
  switch (part) {
    case "magma-chamber":
      return new ShapeGeometry(buildEllipseShape(), 20);
    case "main-vent":
      return new ShapeGeometry(buildMainVentShape());
    case "side-vent":
      return new ShapeGeometry(buildSideVentShape());
    case "lava-flow":
      return buildLavaFlowGeometry();
    case "crater":
      return buildCraterPoolGeometry();
  }
};

const LavaPiece = ({
  part,
  asked,
  motionScale,
}: {
  part: LavaPart;
  asked: VolcanoPart;
  motionScale: number;
}) => {
  const geometry = useMemo(() => buildLavaGeometry(part), [part]);
  const material = useMemo(
    () => buildLavaMaterial(part === asked ? 1 : 0, motionScale),
    [part, asked, motionScale],
  );
  useDisposedOnUnmount(geometry);
  useDisposedOnUnmount(material);
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, 0, part === "lava-flow" || part === "crater" ? 0 : 0.004]}
      name={`lava-${part}`}
    />
  );
};

const puffPlacer = new Object3D();

const AshCloud = ({ isAsked }: { isAsked: boolean }) => {
  const puffs = useRef<InstancedMesh>(null);
  const glow = useRef<MeshPhysicalMaterial>(null);
  const motionScale = useMotionScale();
  const age = useSceneAge();
  const geometry = useMemo(() => new IcosahedronGeometry(1, 1), []);
  useDisposedOnUnmount(geometry);

  useLayoutEffect(() => {
    const mesh = puffs.current;
    if (mesh === null) {
      return;
    }
    ashPuffs.forEach(({ at, size }, index) => {
      puffPlacer.position.set(...at);
      puffPlacer.scale.setScalar(size);
      puffPlacer.updateMatrix();
      mesh.setMatrixAt(index, puffPlacer.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    const mesh = puffs.current;
    if (mesh !== null && motionScale > 0) {
      ashPuffs.forEach(({ at, size }, index) => {
        const breath = 1 + 0.08 * Math.sin(age.current * 1.3 + index * 1.7);
        puffPlacer.position.set(
          at[0] + 0.03 * Math.sin(age.current * 0.6 + index),
          at[1] + 0.03 * Math.sin(age.current * 0.9 + index * 0.5),
          at[2],
        );
        puffPlacer.scale.setScalar(size * breath);
        puffPlacer.updateMatrix();
        mesh.setMatrixAt(index, puffPlacer.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (glow.current !== null) {
      glow.current.emissiveIntensity = isAsked
        ? 0.35 + 0.45 * findPulse(age.current, motionScale)
        : 0;
    }
  });

  return (
    <instancedMesh
      ref={puffs}
      args={[geometry, undefined, ashPuffs.length]}
      frustumCulled={false}
      name="ash-cloud"
    >
      <meshPhysicalMaterial
        ref={glow}
        color={isAsked ? "#b8aea4" : "#6f6966"}
        emissive={geographyPalette.highlight}
        emissiveIntensity={0}
        roughness={0.95}
        flatShading
      />
    </instancedMesh>
  );
};

const ashStreams = [
  {
    from: [0, 0.4, -0.06] as const,
    spread: [0.05, 0, 0.03] as const,
    travel: [0.08, 0.95, -0.05] as const,
    count: 26,
  },
].map((stream) => ({
  from: [...stream.from] satisfies [number, number, number],
  spread: [...stream.spread] satisfies [number, number, number],
  travel: [...stream.travel] satisfies [number, number, number],
  count: stream.count,
}));

const ashStyle = {
  colour: "#4a4545",
  look: "vapour",
  size: 0.16,
  speed: 0.18,
  sway: 0.05,
  opacity: 0.55,
} as const;

const CraterRim = ({ isAsked }: { isAsked: boolean }) => {
  const glow = useRef<MeshPhysicalMaterial>(null);
  const motionScale = useMotionScale();
  const age = useSceneAge();
  useFrame(() => {
    if (glow.current !== null) {
      glow.current.emissiveIntensity =
        0.6 + 0.9 * findPulse(age.current, motionScale);
    }
  });
  if (!isAsked) {
    return null;
  }
  return (
    <mesh
      position={[0, volcanoShape.summit + 0.01, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      name="crater-rim"
    >
      <torusGeometry args={[volcanoShape.rimRadius, 0.025, 6, 24, Math.PI]} />
      <meshPhysicalMaterial
        ref={glow}
        color={geographyPalette.highlight}
        emissive={geographyPalette.highlightGlow}
        toneMapped={false}
      />
    </mesh>
  );
};

const VolcanoModel = ({ part }: { part: VolcanoPart }) => {
  useVolcanoClock();
  const motionScale = useMotionScale();
  const body = useMemo(() => buildVolcanoBody(), []);
  const face = useMemo(() => buildCutFaceGeometry(), []);
  const strata = useCanvasTexture(512, 512, paintCutFace);
  useDisposedOnUnmount(body);
  useDisposedOnUnmount(face);

  return (
    <group rotation={[0, 0.45, 0]} position={[0, 0, 0.35]} name="volcano">
      <mesh geometry={body}>
        <meshPhysicalMaterial
          vertexColors
          roughness={0.85}
          side={DoubleSide}
          flatShading
        />
      </mesh>
      <mesh geometry={face}>
        <meshStandardMaterial map={strata} roughness={0.9} />
      </mesh>
      {lavaParts.map((lavaPart) => (
        <LavaPiece
          key={lavaPart}
          part={lavaPart}
          asked={part}
          motionScale={motionScale}
        />
      ))}
      <CraterRim isAsked={part === "crater"} />
      <AshCloud isAsked={part === "ash-cloud"} />
      <DriftingParticles streams={ashStreams} style={ashStyle} />
      <BobbingArrow aim={volcanoArrows[part]} />
    </group>
  );
};

const useTorusArc = () => {
  const geometry = useMemo(() => new TorusGeometry(1, 0.02, 4, 32), []);
  useDisposedOnUnmount(geometry);
  return geometry;
};

export const VolcanoCutawayScene = ({
  show,
}: {
  show: GeographyShowOf<"volcano-cutaway">;
}) => {
  const { part } = show;
  const model = findCutawayModel(part);
  useTorusArc();
  useEffect(() => undefined, [model]);

  return (
    <group name={show.scene}>
      {isVolcanoPart(part) ? <VolcanoModel part={part} /> : null}
      {isEarthLayer(part) ? <EarthLayersModel layer={part} /> : null}
      {model === "earthquake" && !isVolcanoPart(part) && !isEarthLayer(part) ? (
        <EarthquakeModel part={part} />
      ) : null}
    </group>
  );
};
