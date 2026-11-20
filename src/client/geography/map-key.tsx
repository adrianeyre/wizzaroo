import { useFrame } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import {
  AdditiveBlending,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import type { GeographyShowOf, MapSymbol } from "../../curriculum/geography.js";
import { buildRandom } from "../world-map-terrain.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { buildModelGeometry } from "../world-map-models.js";
import {
  drawRoundedRectangle,
  findPulse,
  geographyPalette,
  useCanvasTexture,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";
import { mapSymbolPainters, symbolUnits } from "./map-symbol-painters.js";
import {
  buildEaselFrameGeometry,
  buildEaselStandGeometry,
  easelCentre,
  easelTurn,
} from "./tilted-easel.js";

const boardSize = 2.9;
const sheetSize = 2.62;
const sheetPixels = 512;
const cardPixels = 512;
const cardSize = 1.56;
const cardInsetPixels = 24;
const symbolInsetPixels = 76;
const cardColour = "#fffdf6";

const curlReach = 0.6;
const curlLift = 0.2;

const buildSheetGeometry = (): BufferGeometry => {
  const geometry = new PlaneGeometry(sheetSize, sheetSize, 14, 14);
  const positions = geometry.getAttribute("position");
  const half = sheetSize / 2;
  const curledCorners = [
    [half, half],
    [-half, -half],
  ] as const;
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const lift = curledCorners.reduce((highest, [cornerX, cornerY]) => {
      const nearness = Math.max(
        0,
        1 - Math.hypot(x - cornerX, y - cornerY) / curlReach,
      );
      return Math.max(highest, curlLift * nearness ** 2.4);
    }, 0);
    const ripple = 0.008 * Math.sin(x * 2.3 + 0.4) * Math.cos(y * 1.9);
    positions.setZ(index, lift + ripple);
  }
  geometry.computeVertexNormals();
  return geometry;
};

const paintParchment = (context: CanvasRenderingContext2D) => {
  const middle = sheetPixels / 2;
  const glow = context.createRadialGradient(
    middle,
    middle,
    sheetPixels * 0.15,
    middle,
    middle,
    sheetPixels * 0.72,
  );
  glow.addColorStop(0, geographyPalette.paper);
  glow.addColorStop(0.7, geographyPalette.parchment);
  glow.addColorStop(1, geographyPalette.parchmentEdge);
  context.fillStyle = glow;
  context.fillRect(0, 0, sheetPixels, sheetPixels);

  const random = buildRandom(1907);
  context.fillStyle = "#8a6a3a";
  for (let speck = 0; speck < 1400; speck++) {
    context.globalAlpha = 0.04 + random() * 0.1;
    const size = 0.8 + random() * 1.8;
    context.fillRect(
      random() * sheetPixels,
      random() * sheetPixels,
      size,
      size,
    );
  }
  for (let stain = 0; stain < 5; stain++) {
    context.globalAlpha = 0.05;
    context.beginPath();
    context.arc(
      random() * sheetPixels,
      random() * sheetPixels,
      20 + random() * 40,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.globalAlpha = 0.16;
  context.strokeStyle = "#2f6fb0";
  context.lineWidth = 1.5;
  context.beginPath();
  for (let line = 32; line < sheetPixels; line += 64) {
    context.moveTo(line, 18);
    context.lineTo(line, sheetPixels - 18);
    context.moveTo(18, line);
    context.lineTo(sheetPixels - 18, line);
  }
  context.stroke();

  context.globalAlpha = 0.22;
  context.strokeStyle = "#7a5a2e";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(middle, 0);
  context.lineTo(middle, sheetPixels);
  context.moveTo(0, middle);
  context.lineTo(sheetPixels, middle);
  context.stroke();
  context.globalAlpha = 0.35;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(middle + 2, 0);
  context.lineTo(middle + 2, sheetPixels);
  context.moveTo(0, middle + 2);
  context.lineTo(sheetPixels, middle + 2);
  context.stroke();

  context.globalAlpha = 0.7;
  context.strokeStyle = "#6b4426";
  context.lineWidth = 3;
  context.strokeRect(16, 16, sheetPixels - 32, sheetPixels - 32);
  context.lineWidth = 1.2;
  context.strokeRect(24, 24, sheetPixels - 48, sheetPixels - 48);

  context.globalAlpha = 0.75;
  context.save();
  context.translate(64, 64);
  context.fillStyle = "#6b4426";
  for (let point = 0; point < 4; point++) {
    context.rotate(Math.PI / 2);
    context.beginPath();
    context.moveTo(0, -30);
    context.lineTo(7, 0);
    context.lineTo(-7, 0);
    context.closePath();
    context.fill();
  }
  context.fillStyle = geographyPalette.marker;
  context.beginPath();
  context.moveTo(0, -30);
  context.lineTo(7, 0);
  context.lineTo(-7, 0);
  context.closePath();
  context.fill();
  context.beginPath();
  context.arc(0, 0, 4, 0, Math.PI * 2);
  context.fillStyle = geographyPalette.paper;
  context.fill();
  context.restore();
  context.globalAlpha = 1;
};

const paintSymbolCard = (
  context: CanvasRenderingContext2D,
  symbol: MapSymbol,
) => {
  const cardSide = cardPixels - cardInsetPixels * 2;
  context.save();
  context.shadowColor = "rgba(60, 40, 10, 0.35)";
  context.shadowBlur = 18;
  context.shadowOffsetX = 4;
  context.shadowOffsetY = 8;
  drawRoundedRectangle(
    context,
    cardInsetPixels,
    cardInsetPixels,
    cardSide,
    cardSide,
    34,
  );
  context.fillStyle = cardColour;
  context.fill();
  context.restore();
  context.lineWidth = 6;
  context.strokeStyle = geographyPalette.ink;
  context.stroke();
  drawRoundedRectangle(
    context,
    cardInsetPixels + 12,
    cardInsetPixels + 12,
    cardSide - 24,
    cardSide - 24,
    24,
  );
  context.lineWidth = 2;
  context.strokeStyle = "rgba(16, 33, 58, 0.35)";
  context.stroke();
  const symbolScale = (cardPixels - symbolInsetPixels * 2) / symbolUnits;
  context.save();
  context.translate(symbolInsetPixels, symbolInsetPixels);
  context.scale(symbolScale, symbolScale);
  mapSymbolPainters[symbol](context);
  context.restore();
};

const buildMagnifierGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new TorusGeometry(0.3, 0.038, 10, 40),
      colour: geographyPalette.brass,
    },
    {
      geometry: new CylinderGeometry(0.026, 0.03, 0.12, 12),
      colour: geographyPalette.brass,
      position: [0, -0.38, 0],
    },
    {
      geometry: new CylinderGeometry(0.045, 0.04, 0.46, 12),
      colour: "#7a2e1f",
      position: [0, -0.66, 0],
    },
    {
      geometry: new CylinderGeometry(0.048, 0.048, 0.03, 12),
      colour: geographyPalette.brass,
      position: [0, -0.89, 0],
    },
  ]);

const buildPencilGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.035, 0.035, 0.9, 6),
      colour: "#f4b400",
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new ConeGeometry(0.035, 0.12, 6),
      colour: "#e8c9a0",
      position: [-0.51, 0, 0],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new ConeGeometry(0.012, 0.04, 6),
      colour: "#333333",
      position: [-0.56, 0, 0],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new CylinderGeometry(0.036, 0.036, 0.08, 6),
      colour: "#ff8fa3",
      position: [0.49, 0, 0],
      rotation: [0, 0, Math.PI / 2],
    },
  ]);

const buildGlintGeometry = (): BufferGeometry => {
  const star = new Shape();
  const points = 8;
  for (let index = 0; index <= points; index++) {
    const angle = (index / points) * Math.PI * 2;
    const reach = index % 2 === 0 ? 0.13 : 0.025;
    const x = Math.sin(angle) * reach;
    const y = Math.cos(angle) * reach;
    if (index === 0) {
      star.moveTo(x, y);
    } else {
      star.lineTo(x, y);
    }
  }
  return new ShapeGeometry(star);
};

const buildFrameGeometry = (): BufferGeometry =>
  buildEaselFrameGeometry(boardSize);

const buildStandGeometry = (): BufferGeometry =>
  buildEaselStandGeometry(boardSize);

const buildLensGeometry = (): BufferGeometry => new CircleGeometry(0.28, 32);

const Magnifier = () => {
  const glass = useBuiltGeometry(buildMagnifierGeometry);
  const lens = useBuiltGeometry(buildLensGeometry);
  const hover = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    const time = age.current * motionScale;
    hover.current?.position.set(
      1.02 + 0.06 * Math.sin(time * 0.7),
      0.98 + 0.05 * Math.cos(time * 0.9),
      0.42 + 0.04 * Math.sin(time * 1.3),
    );
    hover.current?.rotation.set(
      0.12 * Math.sin(time * 0.6),
      0.18 + 0.1 * Math.cos(time * 0.5),
      -0.65 + 0.08 * Math.sin(time * 0.45),
    );
  });

  return (
    <group
      ref={hover}
      position={[1.02, 0.98, 0.42]}
      rotation={[0, 0.18, -0.65]}
      name="magnifying-glass"
    >
      <mesh geometry={glass}>
        <meshPhysicalMaterial
          vertexColors
          metalness={0.6}
          roughness={0.3}
          clearcoat={0.6}
        />
      </mesh>
      <mesh geometry={lens}>
        <meshPhysicalMaterial
          color="#d8efff"
          transparent
          opacity={0.28}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.05}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
};

const SymbolCard = ({ symbol }: { symbol: MapSymbol }) => {
  const paintCard = useCallback(
    (context: CanvasRenderingContext2D) => {
      paintSymbolCard(context, symbol);
    },
    [symbol],
  );
  const card = useCanvasTexture(cardPixels, cardPixels, paintCard);
  const glint = useBuiltGeometry(buildGlintGeometry);
  const cardMesh = useRef<Mesh>(null);
  const glintMesh = useRef<Mesh>(null);
  const glintMaterial = useRef<MeshBasicMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    const pulse = findPulse(age.current * 0.45, motionScale);
    cardMesh.current?.scale.setScalar(1 + 0.025 * pulse);
    const sparkle = motionScale === 0 ? 0.6 : pulse ** 3;
    glintMesh.current?.scale.setScalar(0.4 + 0.8 * sparkle);
    if (glintMesh.current !== null) {
      glintMesh.current.rotation.z = age.current * motionScale * 0.8;
    }
    if (glintMaterial.current !== null) {
      glintMaterial.current.opacity = 0.25 + 0.75 * sparkle;
    }
  });

  return (
    <>
      <mesh ref={cardMesh} position={[0, 0.02, 0.05]} name="map-symbol">
        <planeGeometry args={[cardSize, cardSize]} />
        <meshStandardMaterial
          key={card === undefined ? "plain" : "painted"}
          color={card === undefined ? cardColour : "#ffffff"}
          map={card ?? null}
          transparent
          roughness={0.75}
        />
      </mesh>
      <mesh
        ref={glintMesh}
        geometry={glint}
        position={[cardSize * 0.4, cardSize * 0.42, 0.09]}
      >
        <meshBasicMaterial
          ref={glintMaterial}
          color="#fff6c8"
          transparent
          opacity={0.8}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
};

export const MapKeyScene = ({ show }: { show: GeographyShowOf<"map-key"> }) => {
  const parchment = useCanvasTexture(sheetPixels, sheetPixels, paintParchment);
  const sheet = useBuiltGeometry(buildSheetGeometry);
  const frame = useBuiltGeometry(buildFrameGeometry);
  const stand = useBuiltGeometry(buildStandGeometry);
  const pencil = useBuiltGeometry(buildPencilGeometry);

  return (
    <group name={show.scene}>
      <mesh geometry={stand}>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </mesh>
      <mesh geometry={pencil} position={[-0.55, -1.235, 1.08]}>
        <meshStandardMaterial vertexColors roughness={0.5} />
      </mesh>
      <group position={easelCentre} rotation={[easelTurn, 0, 0]}>
        <mesh geometry={frame}>
          <meshStandardMaterial vertexColors roughness={0.6} />
        </mesh>
        <mesh geometry={sheet} position={[0, 0, 0.012]}>
          <meshStandardMaterial
            key={parchment === undefined ? "plain" : "painted"}
            color={
              parchment === undefined ? geographyPalette.parchment : "#ffffff"
            }
            map={parchment ?? null}
            roughness={0.9}
            side={DoubleSide}
          />
        </mesh>
        <SymbolCard symbol={show.symbol} />
        <Magnifier />
      </group>
    </group>
  );
};
