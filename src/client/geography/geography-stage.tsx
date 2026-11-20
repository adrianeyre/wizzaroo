import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { Color, ShaderMaterial, type Group } from "three";
import type {
  GeographyScene,
  GeographyShow,
} from "../../curriculum/geography.js";
import {
  BubbleBurst,
  StudioCompanion,
  StudioLights,
  cameraDistance,
  cameraFieldOfView,
  easeOutBack,
  placeOnStage,
  useDisposedOnUnmount,
  type CompanionMood,
} from "../studio-stage.js";
import { BiomeDomeScene } from "./biome-dome.js";
import { CompassIslandScene } from "./compass-island.js";
import { DataTowersScene } from "./data-towers.js";
import { geographyPalette, useMotionScale } from "./geography-kit.js";
import { GlobeSpinnerScene } from "./globe-spinner.js";
import { GridHuntScene } from "./grid-hunt.js";
import { LandscapeLookoutScene } from "./landscape-lookout.js";
import { MapKeyScene } from "./map-key.js";
import { ResourceDockScene } from "./resource-dock.js";
import { RegionTourScene } from "./region-tour.js";
import { RiverValleyScene } from "./river-valley.js";
import { SettlementBoardScene } from "./settlement-board.js";
import { UkExplorerScene } from "./uk-explorer.js";
import { VolcanoCutawayScene } from "./volcano-cutaway.js";
import { WeatherWindowScene } from "./weather-window.js";

export interface GeographyGameWorldProps {
  scene: GeographyScene;
  show: GeographyShow | undefined;
  companionMood: CompanionMood;
  popCount: number;
  isEffectsOn: boolean;
}

interface StageMood {
  skyTop: string;
  skyHorizon: string;
  haze: string;
}

const brightDay: StageMood = {
  skyTop: "#3f8fe0",
  skyHorizon: "#cfeeff",
  haze: "#fff4d6",
};

const stageMoods: Record<GeographyScene, StageMood> = {
  "globe-spinner": {
    skyTop: "#0b1638",
    skyHorizon: "#2c4f8f",
    haze: "#7fb4ff",
  },
  "uk-explorer": { skyTop: "#1c4f86", skyHorizon: "#a9dcf5", haze: "#e9f7ff" },
  "compass-island": brightDay,
  "weather-window": {
    skyTop: "#5a7fa8",
    skyHorizon: "#dfe9f2",
    haze: "#ffffff",
  },
  "landscape-lookout": brightDay,
  "map-key": { skyTop: "#3b2a1f", skyHorizon: "#8a6a4a", haze: "#f3d9a8" },
  "grid-hunt": { skyTop: "#203a2c", skyHorizon: "#6f9c78", haze: "#e6f5d8" },
  "biome-dome": { skyTop: "#0f4a52", skyHorizon: "#7fd1c7", haze: "#e6fff8" },
  "river-valley": { skyTop: "#2d6fb5", skyHorizon: "#c5ecff", haze: "#fff7e0" },
  "volcano-cutaway": {
    skyTop: "#2a0f24",
    skyHorizon: "#b8452f",
    haze: "#ffb36b",
  },
  "settlement-board": {
    skyTop: "#38598f",
    skyHorizon: "#f2d8b8",
    haze: "#fff1dc",
  },
  "resource-dock": {
    skyTop: "#123c63",
    skyHorizon: "#f0b97a",
    haze: "#ffe3b8",
  },
  "data-towers": { skyTop: "#261a4d", skyHorizon: "#7a6fd1", haze: "#e8e2ff" },
  "region-tour": { skyTop: "#2b6cb0", skyHorizon: "#bfe6d8", haze: "#fff3d0" },
};

export const sceneHalfWidth = 1.8;
export const sceneHalfHeight = 1.6;
export const plinthTop = -1.5;
const plinthRadius = 2.05;
const centreScreenPosition = { x: 0.1, y: 0.08 };
const shareOfHeightForScene = 0.6;
const shareOfWidthForScene = 0.62;
const sceneGrowSeconds = 0.55;

const skyVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragmentShader = `
uniform vec3 skyTop;
uniform vec3 skyHorizon;
uniform vec3 haze;
uniform float time;
varying vec2 vUv;

float findCloud(vec2 point) {
  float cloud = sin(point.x * 2.1 + time * 0.05) * sin(point.y * 3.3 + point.x * 0.7);
  cloud += 0.5 * sin(point.x * 4.7 - time * 0.08 + point.y * 1.9);
  cloud += 0.25 * sin(point.x * 9.1 + point.y * 6.3 + time * 0.03);
  return smoothstep(0.55, 1.4, cloud);
}

void main() {
  float height = smoothstep(0.08, 0.95, vUv.y);
  vec3 colour = mix(skyHorizon, skyTop, height);
  float horizonGlow = exp(-pow((vUv.y - 0.32) * 5.0, 2.0));
  colour = mix(colour, haze, horizonGlow * 0.35);
  float clouds = findCloud(vec2(vUv.x * 6.0, vUv.y * 3.0)) * smoothstep(0.3, 0.7, vUv.y);
  colour = mix(colour, haze, clouds * 0.18);
  float vignette = smoothstep(1.15, 0.35, length(vUv - vec2(0.5, 0.55)));
  gl_FragColor = vec4(colour * (0.82 + 0.18 * vignette), 1.0);
}
`;

const skyTime = { value: 0 };

const buildSkyMaterial = (mood: StageMood): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      skyTop: { value: new Color(mood.skyTop) },
      skyHorizon: { value: new Color(mood.skyHorizon) },
      haze: { value: new Color(mood.haze) },
      time: skyTime,
    },
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    depthWrite: false,
  });

const ExplorerSky = ({ mood }: { mood: StageMood }) => {
  const material = useMemo(() => buildSkyMaterial(mood), [mood]);
  const motionScale = useMotionScale();
  useDisposedOnUnmount(material);
  useFrame((_state, deltaSeconds) => {
    skyTime.value += deltaSeconds * motionScale;
  });

  return (
    <mesh position={[0, 0, -9]} material={material} renderOrder={-1}>
      <planeGeometry args={[70, 34]} />
    </mesh>
  );
};

const Plinth = () => (
  <group position={[0, plinthTop, 0]} name="plinth">
    <mesh position={[0, -0.14, 0]}>
      <cylinderGeometry args={[plinthRadius, plinthRadius * 0.94, 0.28, 48]} />
      <meshPhysicalMaterial
        color={geographyPalette.woodDark}
        roughness={0.55}
        clearcoat={0.5}
        clearcoatRoughness={0.3}
      />
    </mesh>
    <mesh position={[0, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[plinthRadius - 0.02, 0.04, 6, 48]} />
      <meshPhysicalMaterial
        color={geographyPalette.brass}
        metalness={0.85}
        roughness={0.28}
      />
    </mesh>
    <mesh position={[0, -0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[plinthRadius * 1.25, 32]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={0.18}
        depthWrite={false}
      />
    </mesh>
  </group>
);

const findSceneScale = (visibleWidth: number, visibleHeight: number) =>
  Math.min(
    1,
    (visibleHeight * shareOfHeightForScene) / (sceneHalfHeight * 2),
    (visibleWidth * shareOfWidthForScene) / (sceneHalfWidth * 2),
  );

const useStageLayout = () => {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  return useMemo(() => {
    const visibleHeight =
      2 * cameraDistance * Math.tan(((cameraFieldOfView / 2) * Math.PI) / 180);
    const aspect = size.height > 0 ? size.width / size.height : 16 / 9;
    return {
      centre: placeOnStage(camera, centreScreenPosition),
      scale: findSceneScale(visibleHeight * aspect, visibleHeight),
    };
  }, [camera, size.width, size.height]);
};

const renderScene = (show: GeographyShow): ReactNode => {
  switch (show.scene) {
    case "globe-spinner":
      return <GlobeSpinnerScene show={show} />;
    case "uk-explorer":
      return <UkExplorerScene show={show} />;
    case "compass-island":
      return <CompassIslandScene show={show} />;
    case "weather-window":
      return <WeatherWindowScene show={show} />;
    case "landscape-lookout":
      return <LandscapeLookoutScene show={show} />;
    case "map-key":
      return <MapKeyScene show={show} />;
    case "grid-hunt":
      return <GridHuntScene show={show} />;
    case "biome-dome":
      return <BiomeDomeScene show={show} />;
    case "river-valley":
      return <RiverValleyScene show={show} />;
    case "volcano-cutaway":
      return <VolcanoCutawayScene show={show} />;
    case "settlement-board":
      return <SettlementBoardScene show={show} />;
    case "resource-dock":
      return <ResourceDockScene show={show} />;
    case "data-towers":
      return <DataTowersScene show={show} />;
    case "region-tour":
      return <RegionTourScene show={show} />;
  }
};

const GrowingScene = ({
  show,
  scale,
}: {
  show: GeographyShow;
  scale: number;
}) => {
  const holder = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    const body = holder.current;
    if (body === null) {
      return;
    }
    const growth =
      motionScale === 0
        ? 1
        : easeOutBack(Math.min(1, age.current / sceneGrowSeconds));
    body.scale.setScalar(scale * (0.6 + 0.4 * growth));
  });

  return (
    <group ref={holder} scale={scale} name="geography-scene">
      {renderScene(show)}
    </group>
  );
};

export const GeographyGameWorld = ({
  scene,
  show,
  companionMood,
  popCount,
  isEffectsOn,
}: GeographyGameWorldProps) => {
  const { centre, scale } = useStageLayout();
  const mood = stageMoods[scene];

  return (
    <>
      <StudioLights />
      <ExplorerSky mood={mood} />
      <StudioCompanion mood={companionMood} />
      <group position={centre} scale={scale}>
        <Plinth />
      </group>
      <group position={centre}>
        {show === undefined ? null : (
          <GrowingScene key={popCount} show={show} scale={scale} />
        )}
      </group>
      {isEffectsOn && popCount > 0 ? (
        <BubbleBurst
          key={`burst-${String(popCount)}`}
          position={[centre[0], centre[1] + plinthTop * scale, centre[2]]}
          radius={plinthRadius * scale * 0.6}
        />
      ) : null}
    </>
  );
};
