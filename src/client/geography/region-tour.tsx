import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  type BufferGeometry,
  type ColorRepresentation,
  type Group,
} from "three";
import {
  tourRegions,
  type GeographyShowOf,
  type TourRegion,
} from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { DriftingPoints, type DriftingBox } from "./drifting-points.js";
import {
  drawRoundedRectangle,
  fitLabelFont,
  geographyPalette,
  useCanvasTexture,
  useMotionScale,
  useSceneAge,
  type CanvasPainter,
} from "./geography-kit.js";
import {
  buildBroadleafParts,
  buildDiscGround,
  buildPineParts,
} from "./miniature-parts.js";

const dioramaRadius = 0.56;
const groundRadius = dioramaRadius - 0.04;
const baseHeight = 0.16;
const floorHeight = -1.42;
const dioramaSpacing = 1.22;
const signHeight = 0.05;
const signPixels = { width: 256, height: 64 };
const quietScale = 0.86;

interface RegionLook {
  name: string;
  findHeight: (x: number, z: number) => number;
  findColour: (x: number, z: number, height: number) => ColorRepresentation;
  buildParts: () => ModelPart[];
  rimColour: string;
}

const findBump = (
  x: number,
  z: number,
  centreX: number,
  centreZ: number,
  reach: number,
) => Math.max(0, 1 - Math.hypot(x - centreX, z - centreZ) / reach);

const isInWindermere = (x: number, z: number) =>
  (x / 0.2) ** 2 + ((z - 0.17) / 0.11) ** 2 < 1;

const findAmazonBend = (x: number) => 0.1 + 0.11 * Math.sin(x * 7);

const isInAmazonRiver = (x: number, z: number) =>
  Math.abs(z - findAmazonBend(x)) < 0.065;

const buildSheepParts = (x: number, z: number, height: number): ModelPart[] => [
  {
    geometry: new IcosahedronGeometry(0.035, 0),
    colour: "#f4f1e8",
    position: [x, height + 0.035, z],
    scale: [1.3, 0.95, 1],
  },
  {
    geometry: new IcosahedronGeometry(0.018, 0),
    colour: "#2f2a26",
    position: [x + 0.045, height + 0.05, z],
  },
];

const buildCottageParts = (
  x: number,
  z: number,
  height: number,
): ModelPart[] => [
  {
    geometry: new BoxGeometry(0.12, 0.07, 0.08),
    colour: "#9aa0a6",
    position: [x, height + 0.035, z],
  },
  {
    geometry: new ConeGeometry(0.1, 0.06, 4),
    colour: "#3f4652",
    position: [x, height + 0.1, z],
    rotation: [0, Math.PI / 4, 0],
    scale: [1, 1, 0.65],
  },
];

const buildChaletParts = (
  x: number,
  z: number,
  height: number,
): ModelPart[] => [
  {
    geometry: new BoxGeometry(0.11, 0.08, 0.09),
    colour: "#8a5a32",
    position: [x, height + 0.04, z],
  },
  {
    geometry: new ConeGeometry(0.1, 0.07, 4),
    colour: "#5b3a22",
    position: [x, height + 0.115, z],
    rotation: [0, Math.PI / 4, 0],
    scale: [1.1, 1, 0.8],
  },
  {
    geometry: new BoxGeometry(0.03, 0.03, 0.005),
    colour: "#ffd23f",
    position: [x, height + 0.05, z + 0.047],
  },
];

const buildPeakParts = (
  x: number,
  z: number,
  height: number,
  radius: number,
  sides: number,
): ModelPart[] => [
  {
    geometry: new ConeGeometry(radius, height, sides),
    colour: "#7d828c",
    position: [x, height / 2, z],
    roughen: 0.06,
  },
  {
    geometry: new ConeGeometry(radius * 0.42, height * 0.42, sides),
    colour: geographyPalette.ice,
    position: [x, height * 0.79 + 0.004, z],
  },
];

const buildToucanParts = (at: Triple): ModelPart[] => [
  {
    geometry: new SphereGeometry(0.028, 8, 6),
    colour: "#1d2430",
    position: at,
    scale: [1, 1.2, 1],
  },
  {
    geometry: new ConeGeometry(0.014, 0.05, 6),
    colour: "#ff8a1f",
    position: [at[0] + 0.035, at[1] + 0.01, at[2]],
    rotation: [0, 0, -Math.PI / 2],
  },
  {
    geometry: new SphereGeometry(0.014, 6, 4),
    colour: "#ffd23f",
    position: [at[0] + 0.012, at[1] + 0.006, at[2] + 0.02],
  },
];

const regionLooks: Record<TourRegion, RegionLook> = {
  "lake-district": {
    name: "Lake District",
    findHeight: (x, z) =>
      isInWindermere(x, z)
        ? 0.015
        : 0.05 +
          0.3 * findBump(x, z, -0.2, -0.2, 0.32) +
          0.2 * findBump(x, z, 0.24, -0.22, 0.3) +
          0.12 * findBump(x, z, 0.3, 0.2, 0.25) +
          0.015 * Math.sin(x * 19) * Math.cos(z * 15),
    findColour: (x, z, height) => {
      if (isInWindermere(x, z)) {
        return geographyPalette.sea;
      }
      if (height > 0.26) {
        return "#9a9a92";
      }
      return height > 0.14 ? "#7f9a4c" : "#5fae55";
    },
    buildParts: () => [
      ...buildSheepParts(-0.3, 0.2, 0.06),
      ...buildSheepParts(-0.2, 0.32, 0.055),
      ...buildCottageParts(0.28, 0.32, 0.05),
      ...buildPineParts([0.05, 0.05, -0.08], 0.16),
      ...buildPineParts([-0.38, 0.05, 0.02], 0.13),
      ...buildPineParts([0.4, 0.05, 0.04], 0.12),
    ],
    rimColour: "#3f8f4f",
  },
  "swiss-alps": {
    name: "Swiss Alps",
    findHeight: (x, z) =>
      0.04 +
      0.1 * findBump(x, z, 0, -0.25, 0.4) +
      0.012 * Math.sin(x * 17 + z * 5),
    findColour: (_x, z, height) =>
      height > 0.1 || z < -0.3 ? "#d9e6ef" : "#79c05a",
    buildParts: () => [
      ...buildPeakParts(-0.08, -0.2, 0.78, 0.22, 4),
      ...buildPeakParts(0.27, -0.12, 0.5, 0.2, 6),
      ...buildPeakParts(-0.34, -0.06, 0.42, 0.17, 5),
      {
        geometry: new IcosahedronGeometry(0.12, 0),
        colour: geographyPalette.ice,
        position: [0.1, 0.09, 0.05],
        scale: [1.4, 0.35, 0.9],
      },
      ...buildChaletParts(-0.2, 0.3, 0.04),
      ...buildPineParts([0.2, 0.04, 0.3], 0.12),
      ...buildPineParts([0.36, 0.04, 0.18], 0.1),
      ...buildPineParts([-0.4, 0.04, 0.24], 0.1),
    ],
    rimColour: "#d52b1e",
  },
  "amazon-rainforest": {
    name: "Amazon",
    findHeight: (x, z) =>
      isInAmazonRiver(x, z) ? 0.02 : 0.045 + 0.01 * Math.sin(x * 13 + z * 9),
    findColour: (x, z) => (isInAmazonRiver(x, z) ? "#b08a55" : "#2f6b2a"),
    buildParts: () => [
      ...[
        [-0.32, -0.18, 0.5],
        [-0.05, -0.3, 0.42],
        [0.28, -0.2, 0.55],
        [-0.36, 0.34, 0.36],
        [0.36, 0.36, 0.4],
        [0.05, 0.36, 0.3],
      ].flatMap(([x, z, height]) =>
        buildBroadleafParts([x, 0.04, z], height, [
          "#1f5d22",
          "#2b7a2c",
          "#3b8f35",
        ]),
      ),
      ...buildBroadleafParts([0.1, 0.04, -0.05], 0.72, [
        "#2b7a2c",
        "#1f5d22",
        "#4a9c3a",
      ]),
      ...buildToucanParts([0.24, 0.33, -0.16]),
      {
        geometry: new BoxGeometry(0.13, 0.025, 0.04),
        colour: "#6b4426",
        position: [-0.12, 0.035, findAmazonBend(-0.12)],
        rotation: [0, -0.5, 0],
      },
    ],
    rimColour: "#009c3b",
  },
};

const buildSignPainter =
  (name: string, rimColour: string): CanvasPainter =>
  (context, width, height) => {
    drawRoundedRectangle(context, 4, 4, width - 8, height - 8, 18);
    context.fillStyle = geographyPalette.paper;
    context.fill();
    context.lineWidth = 6;
    context.strokeStyle = rimColour;
    context.stroke();
    fitLabelFont(context, name, 36, width - 36);
    context.fillStyle = geographyPalette.ink;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(name, width / 2, height / 2 + 2);
  };

const signPainters: Record<TourRegion, CanvasPainter> = {
  "lake-district": buildSignPainter(
    regionLooks["lake-district"].name,
    regionLooks["lake-district"].rimColour,
  ),
  "swiss-alps": buildSignPainter(
    regionLooks["swiss-alps"].name,
    regionLooks["swiss-alps"].rimColour,
  ),
  "amazon-rainforest": buildSignPainter(
    regionLooks["amazon-rainforest"].name,
    regionLooks["amazon-rainforest"].rimColour,
  ),
};

interface DioramaGeometries {
  ground: BufferGeometry;
  scenery: BufferGeometry;
  dispose: () => void;
}

const buildDioramaGeometries = (region: TourRegion): DioramaGeometries => {
  const look = regionLooks[region];
  const ground = buildDiscGround({
    radius: groundRadius,
    rings: 6,
    sectors: 24,
    findHeight: look.findHeight,
    findColour: look.findColour,
  });
  const scenery = buildModelGeometry([
    {
      geometry: new CylinderGeometry(
        dioramaRadius,
        dioramaRadius + 0.04,
        baseHeight,
        24,
      ),
      colour: geographyPalette.wood,
      position: [0, -baseHeight / 2, 0],
    },
    {
      geometry: new CylinderGeometry(
        dioramaRadius + 0.012,
        dioramaRadius + 0.012,
        0.03,
        24,
      ),
      colour: look.rimColour,
      position: [0, -0.02, 0],
    },
    ...look.buildParts(),
  ]);
  return {
    ground,
    scenery,
    dispose: () => {
      ground.dispose();
      scenery.dispose();
    },
  };
};

const rainBox: DriftingBox = { centre: [0, 0.45, 0.05], size: [0.7, 0.6, 0.5] };
const snowBox: DriftingBox = { centre: [0, 0.6, 0], size: [0.9, 0.7, 0.6] };

const RainCloud = () => {
  const cloud = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  useFrame(() => {
    if (cloud.current !== null) {
      cloud.current.position.x =
        Math.sin(age.current * 0.5) * 0.12 * motionScale;
    }
  });
  return (
    <group ref={cloud} name="rain-cloud">
      <mesh position={[0, 0.82, 0]} scale={[1.6, 0.75, 1]}>
        <icosahedronGeometry args={[0.13, 1]} />
        <meshStandardMaterial color="#c9d1da" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
};

const TropicalSun = () => (
  <mesh position={[0.32, 0.92, -0.2]} name="tropical-sun">
    <icosahedronGeometry args={[0.1, 1]} />
    <meshBasicMaterial color={geographyPalette.highlight} toneMapped={false} />
  </mesh>
);

const RegionWeather = ({ region }: { region: TourRegion }) => {
  switch (region) {
    case "lake-district":
      return (
        <>
          <RainCloud />
          <DriftingPoints
            count={40}
            box={rainBox}
            colour="#bfe3ff"
            size={0.03}
            fallSpeed={0.9}
            salt={7}
          />
        </>
      );
    case "swiss-alps":
      return (
        <DriftingPoints
          count={40}
          box={snowBox}
          colour="#ffffff"
          size={0.045}
          fallSpeed={0.22}
          sway={0.06}
          salt={11}
        />
      );
    case "amazon-rainforest":
      return <TropicalSun />;
  }
};

const Diorama = ({
  region,
  index,
  spotlight,
}: {
  region: TourRegion;
  index: number;
  spotlight: TourRegion | undefined;
}) => {
  const geometries = useMemo(() => buildDioramaGeometries(region), [region]);
  useDisposedOnUnmount(geometries);
  const sign = useCanvasTexture(
    signPixels.width,
    signPixels.height,
    signPainters[region],
  );
  const holder = useRef<Group>(null);
  const turner = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  const isSpotlit = spotlight === region;
  const isQuiet = spotlight !== undefined && !isSpotlit;
  const x = (index - (tourRegions.length - 1) / 2) * dioramaSpacing;

  useFrame(() => {
    if (turner.current !== null) {
      turner.current.rotation.y =
        Math.sin(age.current * 0.4 + index * 1.7) *
        (isSpotlit ? 0.45 : 0.18) *
        motionScale;
    }
    if (holder.current !== null) {
      holder.current.position.y = isSpotlit
        ? 0.12 + Math.sin(age.current * 1.6) * 0.04 * motionScale
        : 0;
    }
  });

  return (
    <group position={[x, 0, index === 1 ? -0.18 : 0]} name={`region-${region}`}>
      <group ref={holder} scale={isQuiet ? quietScale : 1}>
        <group ref={turner}>
          <mesh geometry={geometries.ground}>
            <meshStandardMaterial vertexColors roughness={0.85} />
          </mesh>
          <mesh geometry={geometries.scenery}>
            <meshStandardMaterial vertexColors roughness={0.6} />
          </mesh>
          <RegionWeather region={region} />
        </group>
      </group>
      <mesh
        position={[0, signHeight, dioramaRadius + 0.14]}
        rotation={[-0.35, 0, 0]}
      >
        <planeGeometry args={[0.96, 0.24]} />
        <meshBasicMaterial
          map={sign ?? null}
          transparent
          toneMapped={false}
          visible={sign !== undefined}
        />
      </mesh>
      {isSpotlit ? (
        <mesh
          position={[0, -baseHeight - 0.01, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          name="region-spotlight"
        >
          <torusGeometry args={[dioramaRadius + 0.08, 0.035, 6, 40]} />
          <meshBasicMaterial
            color={geographyPalette.highlightGlow}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
};

export const RegionTourScene = ({
  show,
}: {
  show: GeographyShowOf<"region-tour">;
}) => (
  <group
    position={[0, floorHeight + baseHeight, 0]}
    rotation={[0.3, 0, 0]}
    name={show.scene}
  >
    {tourRegions.map((region, index) => (
      <Diorama
        key={region}
        region={region}
        index={index}
        spotlight={show.region}
      />
    ))}
  </group>
);
