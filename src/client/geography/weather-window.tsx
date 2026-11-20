import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import type {
  GeographyShowOf,
  Season,
  WeatherKind,
} from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import {
  buildCloudGeometry,
  buildCottageGeometry,
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { DriftingPoints, type DriftingBox } from "./drifting-points.js";
import {
  fitModelHeight,
  geographyPalette,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";
import { buildBroadleafParts } from "./miniature-parts.js";

const groundTop = -1.45;
const gardenTilt = 0.26;
const gardenLift = 0.45;
const skyCardCentre: Triple = [0, 0.2, -0.95];
const skyCardSize: [number, number] = [3.3, 2.5];

const skyColours: Record<WeatherKind, string> = {
  sunny: "#5fb8ff",
  cloudy: "#a9bccb",
  rainy: "#7d8fa0",
  snowy: "#c9d6e2",
  windy: "#8fc6ea",
  foggy: "#d3d8dc",
  stormy: "#3b4552",
  rainbow: "#86c5ef",
};

const typicalWeather: Record<Season, WeatherKind> = {
  spring: "rainbow",
  summer: "sunny",
  autumn: "windy",
  winter: "snowy",
};

const findShownSeason = (
  weather: WeatherKind | undefined,
  season: Season | undefined,
): Season => season ?? (weather === "snowy" ? "winter" : "summer");

const rainBox: DriftingBox = { centre: [0, 0.05, 0.2], size: [2.9, 2.4, 1.4] };
const snowBox: DriftingBox = { centre: [0, 0.1, 0.1], size: [3, 2.8, 1.6] };

const buildFrameGeometry = (): BufferGeometry => {
  const [width, height] = skyCardSize;
  const [x, y, z] = skyCardCentre;
  const bar = 0.12;
  const frameParts: ModelPart[] = [
    {
      geometry: new BoxGeometry(width + bar * 2, bar, 0.12),
      colour: "#f4efe6",
      position: [x, y + height / 2 + bar / 2, z],
    },
    {
      geometry: new BoxGeometry(width + bar * 2, bar, 0.12),
      colour: "#f4efe6",
      position: [x, y - height / 2 - bar / 2, z],
    },
    {
      geometry: new BoxGeometry(bar, height, 0.12),
      colour: "#f4efe6",
      position: [x - width / 2 - bar / 2, y, z],
    },
    {
      geometry: new BoxGeometry(bar, height, 0.12),
      colour: "#f4efe6",
      position: [x + width / 2 + bar / 2, y, z],
    },
    {
      geometry: new BoxGeometry(0.05, height, 0.06),
      colour: "#e8e1d4",
      position: [x, y, z + 0.02],
    },
    {
      geometry: new BoxGeometry(width, 0.05, 0.06),
      colour: "#e8e1d4",
      position: [x, y + 0.1, z + 0.02],
    },
  ];
  return buildModelGeometry(frameParts);
};

const groundColours: Record<Season, string> = {
  spring: "#7ccf6a",
  summer: "#6cc070",
  autumn: "#a6b85a",
  winter: "#f2f6fb",
};

const buildGroundGeometry = (
  season: Season,
  weather: WeatherKind,
): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.75, 1.8, 0.12, 48),
      colour:
        weather === "snowy" ? groundColours.winter : groundColours[season],
      position: [0, groundTop - 0.06, 0.15],
    },
    {
      geometry: new BoxGeometry(0.28, 0.02, 1.1),
      colour: "#cdbb94",
      position: [-0.55, groundTop + 0.005, 0.85],
    },
    ...(season === "spring"
      ? [-1.1, -0.2, 0.3, 1.2, 0.9].map((x, index) => ({
          geometry: new IcosahedronGeometry(0.04, 0),
          colour: index % 2 === 0 ? "#ffd23f" : "#ff8fb8",
          position: [
            x,
            groundTop + 0.04,
            0.9 - (index % 3) * 0.3,
          ] satisfies Triple,
        }))
      : []),
    ...(season === "autumn"
      ? [0.6, 0.95, 1.2].map((x, index) => ({
          geometry: new SphereGeometry(0.12, 8, 5),
          colour: index === 1 ? "#d9622b" : "#e8a33c",
          position: [x, groundTop, 0.55 + index * 0.12] satisfies Triple,
          scale: [1, 0.35, 1] satisfies Triple,
        }))
      : []),
  ]);

const crownColours: Record<Season, readonly string[]> = {
  spring: ["#f6b3cf", "#ffd0e2", "#ef9cc0"],
  summer: ["#3f8f3f", "#4ea84a", "#5bb856"],
  autumn: ["#d9622b", "#e8a33c", "#c8462a"],
  winter: [],
};

const buildTreeGeometry = (season: Season): BufferGeometry => {
  if (season !== "winter") {
    return buildModelGeometry(
      buildBroadleafParts([0, 0, 0], 1.25, crownColours[season]),
    );
  }
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.05, 0.1, 1.05, 7),
      colour: "#5e4330",
      position: [0, 0.52, 0],
    },
    ...[-0.7, 0.6, -0.2, 0.9].map((lean, index) => ({
      geometry: new CylinderGeometry(0.015, 0.035, 0.5, 5),
      colour: "#5e4330",
      position: [
        lean * 0.18,
        0.8 + index * 0.08,
        (index % 2) * 0.06,
      ] satisfies Triple,
      rotation: [0, 0, lean] satisfies Triple,
    })),
    {
      geometry: new SphereGeometry(0.1, 8, 6),
      colour: "#ffffff",
      position: [0, 1.06, 0],
      scale: [1, 0.4, 1] satisfies Triple,
    },
  ]);
};

const buildSunGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new SphereGeometry(0.28, 24, 16),
      colour: "#ffd23f",
      isSmooth: true,
    },
    ...Array.from({ length: 10 }, (_, ray) => {
      const angle = (ray / 10) * Math.PI * 2;
      return {
        geometry: new ConeGeometry(0.05, 0.18, 6),
        colour: "#ffb703",
        position: [
          Math.cos(angle) * 0.42,
          Math.sin(angle) * 0.42,
          0,
        ] satisfies Triple,
        rotation: [0, 0, angle - Math.PI / 2] satisfies Triple,
      };
    }),
  ]);

const rainbowColours = [
  "#e53935",
  "#fb8c00",
  "#fdd835",
  "#43a047",
  "#1e88e5",
  "#5e35b1",
];

const buildRainbowGeometry = (): BufferGeometry =>
  buildModelGeometry(
    rainbowColours.map((colour, band) => ({
      geometry: new TorusGeometry(1.15 - band * 0.06, 0.03, 4, 40, Math.PI),
      colour,
    })),
  );

const buildBoltGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(0.06, 0.45, 0.02),
      colour: "#fff6a8",
      position: [0, 0.2, 0],
      rotation: [0, 0, 0.35],
    },
    {
      geometry: new BoxGeometry(0.06, 0.4, 0.02),
      colour: "#fff6a8",
      position: [0.06, -0.15, 0],
      rotation: [0, 0, -0.3],
    },
  ]);

const cloudLayouts: Record<WeatherKind, { at: Triple; size: number }[]> = {
  sunny: [{ at: [1.0, 0.95, -0.7], size: 0.35 }],
  cloudy: [
    { at: [-0.9, 0.85, -0.6], size: 0.6 },
    { at: [0.35, 1.0, -0.65], size: 0.7 },
    { at: [1.15, 0.7, -0.55], size: 0.5 },
  ],
  rainy: [
    { at: [-0.6, 1.0, -0.5], size: 0.75 },
    { at: [0.7, 0.95, -0.55], size: 0.7 },
  ],
  snowy: [
    { at: [-0.7, 1.0, -0.55], size: 0.65 },
    { at: [0.7, 1.05, -0.6], size: 0.6 },
  ],
  windy: [
    { at: [-0.8, 1.0, -0.6], size: 0.45 },
    { at: [0.9, 0.85, -0.6], size: 0.4 },
  ],
  foggy: [],
  stormy: [
    { at: [-0.9, 0.95, -0.5], size: 0.8 },
    { at: [0.2, 1.05, -0.55], size: 0.85 },
    { at: [1.1, 0.9, -0.5], size: 0.7 },
  ],
  rainbow: [{ at: [-1.0, 1.0, -0.6], size: 0.45 }],
};

const cloudColours: Record<WeatherKind, string> = {
  sunny: "#ffffff",
  cloudy: "#eef2f5",
  rainy: "#9aa6b2",
  snowy: "#e3e8ee",
  windy: "#ffffff",
  foggy: "#ffffff",
  stormy: "#4c5562",
  rainbow: "#ffffff",
};

const DriftingClouds = ({ weather }: { weather: WeatherKind }) => {
  const geometry = useMemo(() => buildCloudGeometry(1), []);
  useDisposedOnUnmount(geometry);
  const holder = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  const speed = weather === "windy" ? 0.5 : 0.08;

  useFrame(() => {
    const body = holder.current;
    if (body === null) {
      return;
    }
    body.children.forEach((cloud, index) => {
      const home = cloudLayouts[weather][index]?.at[0] ?? 0;
      cloud.position.x =
        ((((home + age.current * speed * motionScale + 1.15) % 2.3) + 2.3) %
          2.3) -
        1.15;
    });
  });

  return (
    <group ref={holder}>
      {cloudLayouts[weather].map(({ at, size }, index) => (
        <mesh key={index} geometry={geometry} position={at} scale={size * 0.32}>
          <meshStandardMaterial
            color={cloudColours[weather]}
            roughness={0.9}
            vertexColors
          />
        </mesh>
      ))}
    </group>
  );
};

const SpinningSun = ({ at }: { at: Triple }) => {
  const geometry = useMemo(() => buildSunGeometry(), []);
  useDisposedOnUnmount(geometry);
  const sun = useRef<Mesh>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  useFrame(() => {
    if (sun.current !== null) {
      sun.current.rotation.z = age.current * 0.3 * motionScale;
    }
  });
  return (
    <mesh ref={sun} geometry={geometry} position={at} name="sun">
      <meshBasicMaterial vertexColors toneMapped={false} />
    </mesh>
  );
};

const Lightning = () => {
  const geometry = useMemo(() => buildBoltGeometry(), []);
  useDisposedOnUnmount(geometry);
  const bolt = useRef<Mesh>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  useFrame(() => {
    if (bolt.current !== null) {
      bolt.current.visible =
        motionScale === 0 ||
        age.current % 2.6 < 0.18 ||
        (age.current % 2.6 > 0.3 && age.current % 2.6 < 0.4);
    }
  });
  return (
    <mesh
      ref={bolt}
      geometry={geometry}
      position={[0.25, 0.45, -0.45]}
      name="lightning"
    >
      <meshBasicMaterial vertexColors toneMapped={false} />
    </mesh>
  );
};

const FogLayers = () => {
  const layers = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  useFrame(() => {
    layers.current?.children.forEach((layer, index) => {
      layer.position.x =
        Math.sin(age.current * 0.25 + index * 2) * 0.25 * motionScale;
    });
  });
  return (
    <group ref={layers} name="fog">
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          position={[0, groundTop + 0.35 + index * 0.45, 0.6 - index * 0.5]}
        >
          <planeGeometry args={[3.6, 0.7]} />
          <meshBasicMaterial
            color="#f4f6f8"
            transparent
            opacity={0.55 - index * 0.1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

const WindStreaks = () => {
  const streaks = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  useFrame(() => {
    streaks.current?.children.forEach((streak, index) => {
      streak.position.x =
        ((((age.current * 1.4 * motionScale + index * 1.1) % 3.4) + 3.4) %
          3.4) -
        1.7;
    });
  });
  return (
    <group ref={streaks} name="wind">
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          position={[0, 0.1 + index * 0.35, 0.3 - index * 0.25]}
          rotation={[0, 0, Math.PI]}
        >
          <torusGeometry args={[0.22, 0.012, 4, 20, Math.PI * 0.9]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
};

const SwayingTree = ({
  season,
  weather,
}: {
  season: Season;
  weather: WeatherKind;
}) => {
  const geometry = useMemo(() => buildTreeGeometry(season), [season]);
  useDisposedOnUnmount(geometry);
  const tree = useRef<Mesh>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  const strength = weather === "windy" || weather === "stormy" ? 0.16 : 0.025;
  useFrame(() => {
    if (tree.current !== null) {
      tree.current.rotation.z =
        (weather === "windy" ? -0.12 : 0) +
        Math.sin(age.current * 2.4) * strength * motionScale;
    }
  });
  return (
    <mesh
      ref={tree}
      geometry={geometry}
      position={[0.85, groundTop, 0.2]}
      name="tree"
    >
      <meshStandardMaterial vertexColors roughness={0.7} />
    </mesh>
  );
};

const SkyCard = ({ weather }: { weather: WeatherKind }) => {
  const material = useRef<MeshBasicMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  useFrame(() => {
    if (material.current !== null && weather === "stormy" && motionScale > 0) {
      const flash = age.current % 2.6 < 0.18 ? 0.5 : 0;
      material.current.color.set(skyColours.stormy).offsetHSL(0, 0, flash);
    }
  });
  return (
    <mesh position={skyCardCentre} name="sky-card">
      <planeGeometry args={skyCardSize} />
      <meshBasicMaterial ref={material} color={skyColours[weather]} />
    </mesh>
  );
};

export const WeatherWindowScene = ({
  show,
}: {
  show: GeographyShowOf<"weather-window">;
}) => {
  const season = findShownSeason(show.weather, show.season);
  const weather = show.weather ?? typicalWeather[season];
  const models = useMemo(
    () => ({
      frame: buildFrameGeometry(),
      house: fitModelHeight(buildCottageGeometry(), 0.95),
    }),
    [],
  );
  const ground = useMemo(
    () => buildGroundGeometry(season, weather),
    [season, weather],
  );
  const rainbow = useMemo(() => buildRainbowGeometry(), []);
  useDisposedOnUnmount(models.frame);
  useDisposedOnUnmount(models.house);
  useDisposedOnUnmount(ground);
  useDisposedOnUnmount(rainbow);
  const isSunShown =
    weather === "sunny" || weather === "rainbow" || weather === "windy";
  const isRaining =
    weather === "rainy" || weather === "stormy" || weather === "rainbow";

  return (
    <group
      name={`weather-${weather}-${season}`}
      position={[0, groundTop + gardenLift, 0]}
      rotation={[gardenTilt, 0, 0]}
    >
      <group position={[0, -groundTop, 0]}>
        <SkyCard weather={weather} />
        <mesh geometry={models.frame}>
          <meshPhysicalMaterial vertexColors roughness={0.45} clearcoat={0.5} />
        </mesh>
        <mesh geometry={ground}>
          <meshStandardMaterial vertexColors roughness={0.85} />
        </mesh>
        <mesh
          geometry={models.house}
          position={[-0.55, groundTop, 0.05]}
          rotation={[0, 0.5, 0]}
        >
          <meshStandardMaterial
            vertexColors
            roughness={0.7}
            color={
              weather === "snowy" || season === "winter" ? "#f4f8ff" : "#ffffff"
            }
          />
        </mesh>
        <SwayingTree season={season} weather={weather} />
        {isSunShown ? <SpinningSun at={[-1.05, 0.95, -0.7]} /> : null}
        <DriftingClouds weather={weather} />
        {weather === "rainbow" ? (
          <mesh geometry={rainbow} position={[0.2, -0.15, -0.8]} name="rainbow">
            <meshBasicMaterial
              vertexColors
              transparent
              opacity={0.85}
              toneMapped={false}
            />
          </mesh>
        ) : null}
        {isRaining ? (
          <DriftingPoints
            count={
              weather === "stormy" ? 220 : weather === "rainbow" ? 60 : 160
            }
            box={rainBox}
            colour="#d6ecff"
            size={0.1}
            fallSpeed={weather === "stormy" ? 2.6 : 1.8}
            sway={0.01}
          />
        ) : null}
        {weather === "snowy" ? (
          <DriftingPoints
            count={140}
            box={snowBox}
            colour={geographyPalette.white}
            size={0.08}
            fallSpeed={0.35}
            sway={0.12}
          />
        ) : null}
        {weather === "stormy" ? <Lightning /> : null}
        {weather === "foggy" ? <FogLayers /> : null}
        {weather === "windy" ? <WindStreaks /> : null}
      </group>
    </group>
  );
};
