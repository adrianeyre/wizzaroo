import { useFrame } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Object3D,
  Shape,
  SRGBColorSpace,
  Vector2,
  type Group,
  type InstancedMesh,
  type MeshPhysicalMaterial,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CountingInStepsQuestion } from "../curriculum/counting-in-steps.js";
import {
  parseFractionPicture,
  type FractionOutline,
} from "../curriculum/fractions.js";
import {
  rulerCentimetres,
  type MeasuringHeightQuestion,
} from "../curriculum/measuring-height.js";
import { formatNumber } from "../curriculum/number-format.js";
import type { ClockDial, ClockTime } from "../curriculum/telling-the-time.js";
import {
  bayPalette,
  buildFaceFont,
  findGrowth,
  promptGrowSeconds,
  tokenGrowSeconds,
  useGrowingChoice,
  useMotionScale,
  usePromptGrowth,
  usePromptPosition,
  type ChoiceSlot,
} from "./bay-stage.js";
import { useDisposedOnUnmount } from "./studio-stage.js";

const measurePalette = {
  stone: "#5d7489",
  stoneLabel: "#f6efe0",
  stoneInk: "#14324f",
  stoneGlow: "#5ee0f0",
  hopper: "#ff8a3d",
  hopperEye: bayPalette.fishEye,
  trail: "#c9f4ff",
  corals: ["#ff6f61", "#f4a259", "#c86bfa", "#3fc1c9"],
  coralTip: "#fff3d6",
  mound: bayPalette.sand,
  rulerBody: "#e9dcc0",
  rulerInk: "#1b2b3d",
  pedestal: bayPalette.rock,
  guide: "#9be7ff",
  fractionShaded: "#ff8a3d",
  fractionPlain: "#e8f4fb",
  fractionBacking: "#0b2a44",
  brass: "#c8a24a",
  dial: "#f7f0de",
  dialInk: "#1d2633",
  hand: "#16202c",
  glass: "#dff6ff",
} as const;

type PaintCanvas = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => void;

interface PaintedTexture {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

const buildPaintedTexture = (
  width: number,
  height: number,
  paint: PaintCanvas,
): PaintedTexture | undefined => {
  if (typeof document === "undefined") {
    return undefined;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    return undefined;
  }
  paint(context, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture };
};

const usePaintedTexture = (
  width: number,
  height: number,
  paint: PaintCanvas,
  font: string | undefined,
): CanvasTexture | undefined => {
  const painted = useMemo(
    () => buildPaintedTexture(width, height, paint),
    [width, height, paint],
  );

  useEffect(() => {
    if (painted === undefined) {
      return;
    }
    let isShown = true;
    if (font !== undefined) {
      void document.fonts.load(font).then(() => {
        const context = painted.canvas.getContext("2d");
        if (isShown && context !== null) {
          context.clearRect(0, 0, width, height);
          paint(context, width, height);
          painted.texture.needsUpdate = true;
        }
      });
    }
    return () => {
      isShown = false;
      painted.texture.dispose();
    };
  }, [painted, font, paint, width, height]);

  return painted?.texture;
};

const stoneLabelSize = 256;

const paintStoneLabel = (
  context: CanvasRenderingContext2D,
  text: string,
  isAsked: boolean,
) => {
  const middle = stoneLabelSize / 2;
  context.beginPath();
  context.arc(middle, middle, middle - 6, 0, Math.PI * 2);
  context.fillStyle = isAsked
    ? "rgba(255, 255, 255, 0.0)"
    : measurePalette.stoneLabel;
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = isAsked
    ? measurePalette.stoneLabel
    : "rgba(20, 50, 79, 0.22)";
  context.beginPath();
  context.arc(middle, middle, middle - 22, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = isAsked
    ? measurePalette.stoneLabel
    : measurePalette.stoneInk;
  context.font = buildFaceFont(text, stoneLabelSize);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, middle, middle * 1.08);
};

const useStoneLabel = (text: string, isAsked: boolean) => {
  const paint = useCallback<PaintCanvas>(
    (context) => {
      paintStoneLabel(context, text, isAsked);
    },
    [text, isAsked],
  );
  return usePaintedTexture(
    stoneLabelSize,
    stoneLabelSize,
    paint,
    buildFaceFont(text, stoneLabelSize),
  );
};

const stoneRadius = 0.36;
const stoneThickness = 0.16;
const stoneSpacing = 0.92;
const stoneTilt = 1.05;
const hopSeconds = 0.9;
const hopHeight = 0.55;

const pebbleProfile = [
  [0, -0.5],
  [0.78, -0.5],
  [0.95, -0.36],
  [1, -0.1],
  [0.97, 0.18],
  [0.86, 0.4],
  [0.66, 0.5],
  [0, 0.5],
];

const usePebbleGeometry = () => {
  const geometry = useMemo(
    () =>
      new LatheGeometry(
        pebbleProfile.map(
          ([across, along]) =>
            new Vector2(across * stoneRadius, along * stoneThickness),
        ),
        32,
      ),
    [],
  );
  useDisposedOnUnmount(geometry);
  return geometry;
};

export const findStoneSpot = (index: number): [number, number, number] => {
  const across = (index - 1.5) * stoneSpacing;
  return [across, -0.12 * across * across + 0.1, 0];
};

const StoneLabel = ({ text, isAsked }: { text: string; isAsked: boolean }) => {
  const label = useStoneLabel(text, isAsked);
  return (
    <mesh
      position={[0, stoneThickness / 2 + 0.004, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[stoneRadius * 0.74, 32]} />
      <meshStandardMaterial
        key={label === undefined ? "plain" : "labelled"}
        map={label ?? null}
        color={label === undefined ? measurePalette.stoneLabel : "#ffffff"}
        transparent
        roughness={0.5}
      />
    </mesh>
  );
};

const buildTrailGeometry = (): BufferGeometry => {
  const points: number[] = [];
  const dashesPerHop = 7;
  for (let hop = 0; hop < 3; hop++) {
    const [fromX, fromY] = findStoneSpot(hop);
    const [toX, toY] = findStoneSpot(hop + 1);
    for (let dash = 0; dash < dashesPerHop; dash++) {
      const start = (dash + 0.2) / dashesPerHop;
      const end = (dash + 0.65) / dashesPerHop;
      for (const along of [start, end]) {
        points.push(
          fromX + (toX - fromX) * along,
          fromY +
            (toY - fromY) * along +
            Math.sin(Math.PI * along) * hopHeight +
            stoneThickness,
          0,
        );
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
};

const Hopper = ({
  age,
  motionScale,
}: {
  age: { current: number };
  motionScale: number;
}) => {
  const hopper = useRef<Group>(null);

  useFrame(() => {
    const body = hopper.current;
    if (body === null) {
      return;
    }
    const travelled = (age.current * motionScale) / hopSeconds;
    const hop = Math.floor(travelled) % 4;
    const along = travelled - Math.floor(travelled);
    const isResting = hop === 3;
    const [fromX, fromY] = findStoneSpot(isResting ? 0 : hop);
    const [toX, toY] = findStoneSpot(isResting ? 0 : hop + 1);
    const lift = isResting ? 0 : Math.sin(Math.PI * along) * hopHeight;
    body.position.set(
      fromX + (toX - fromX) * (isResting ? 0 : along),
      fromY +
        (toY - fromY) * (isResting ? 0 : along) +
        lift +
        stoneThickness +
        0.1,
      0.12,
    );
    body.rotation.z = isResting ? 0 : Math.cos(Math.PI * along) * 0.6;
  });

  return (
    <group ref={hopper} name="hopper">
      <mesh scale={[0.16, 0.1, 0.08]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshPhysicalMaterial
          color={measurePalette.hopper}
          roughness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      <mesh
        position={[-0.17, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[0.09, 0.1, 0.02]}
      >
        <coneGeometry args={[1, 1, 10]} />
        <meshPhysicalMaterial
          color={measurePalette.hopper}
          roughness={0.3}
          clearcoat={0.6}
        />
      </mesh>
      <mesh position={[0.09, 0.03, 0.06]}>
        <sphereGeometry args={[0.022, 8, 6]} />
        <meshStandardMaterial
          color={measurePalette.hopperEye}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
};

export const SteppingStones = ({
  sequence,
}: {
  sequence: CountingInStepsQuestion;
}) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const stones = useRef<Group>(null);
  const shownStones = useRef<InstancedMesh>(null);
  const glowMaterial = useRef<MeshPhysicalMaterial>(null);
  const pebble = usePebbleGeometry();
  const trail = useMemo(() => buildTrailGeometry(), []);
  useDisposedOnUnmount(trail);

  useLayoutEffect(() => {
    const mesh = shownStones.current;
    if (mesh === null) {
      return;
    }
    const placer = new Object3D();
    for (let index = 0; index < 3; index++) {
      placer.position.set(...findStoneSpot(index));
      placer.rotation.set(stoneTilt, 0, 0);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    stones.current?.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    if (glowMaterial.current !== null) {
      glowMaterial.current.emissiveIntensity =
        0.45 + Math.sin(age.current * 3 * motionScale) * 0.2 * motionScale;
    }
  });

  return (
    <group position={position} name="stepping-stones">
      <group ref={stones}>
        <instancedMesh
          ref={shownStones}
          args={[pebble, undefined, 3]}
          frustumCulled={false}
          name="stones"
        >
          <meshPhysicalMaterial
            color={measurePalette.stone}
            roughness={0.32}
            clearcoat={1}
            clearcoatRoughness={0.12}
          />
        </instancedMesh>
        {sequence.shown.map((value, index) => (
          <group
            key={index}
            position={findStoneSpot(index)}
            rotation={[stoneTilt, 0, 0]}
          >
            <StoneLabel text={formatNumber(value)} isAsked={false} />
          </group>
        ))}
        <group
          position={findStoneSpot(3)}
          rotation={[stoneTilt, 0, 0]}
          name="asked-stone"
        >
          <mesh geometry={pebble}>
            <meshPhysicalMaterial
              ref={glowMaterial}
              color={measurePalette.stoneGlow}
              emissive={measurePalette.stoneGlow}
              emissiveIntensity={0.45}
              roughness={0.12}
              clearcoat={1}
              transparent
              opacity={0.62}
              depthWrite={false}
            />
          </mesh>
          <StoneLabel text="?" isAsked />
        </group>
        <lineSegments geometry={trail}>
          <lineBasicMaterial
            color={measurePalette.trail}
            transparent
            opacity={0.55}
          />
        </lineSegments>
        <Hopper age={age} motionScale={motionScale} />
      </group>
    </group>
  );
};

const coralSegmentShare = 0.35;
const coralBaseShare = 1.4;

interface CoralStackProps {
  segmentCount: number;
  segmentHeight: number;
  width: number;
  colour: string;
  name: string;
}

const CoralStack = ({
  segmentCount,
  segmentHeight,
  width,
  colour,
  name,
}: CoralStackProps) => {
  const segments = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = segments.current;
    if (mesh === null) {
      return;
    }
    const placer = new Object3D();
    const base = new Color(colour);
    const tip = new Color(measurePalette.coralTip);
    for (let index = 0; index < segmentCount; index++) {
      const climb = segmentCount === 1 ? 0 : index / (segmentCount - 1);
      const taper = 1 - climb * 0.28;
      placer.position.set(
        Math.sin(index * 1.9) * width * 0.06,
        segmentHeight * (index + 0.5),
        0,
      );
      placer.rotation.set(0, index * 0.7, Math.sin(index * 2.3) * 0.06);
      placer.scale.set(width * taper, segmentHeight * 0.58, width * taper);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
      mesh.setColorAt(index, base.clone().lerp(tip, climb * 0.35));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [segmentCount, segmentHeight, width, colour]);

  return (
    <>
      <instancedMesh
        ref={segments}
        args={[undefined, undefined, segmentCount]}
        frustumCulled={false}
        name={name}
      >
        <sphereGeometry args={[1, 12, 7]} />
        <meshPhysicalMaterial
          roughness={0.3}
          clearcoat={0.9}
          clearcoatRoughness={0.14}
          sheen={0.5}
          sheenColor={measurePalette.coralTip}
        />
      </instancedMesh>
      <mesh position={[0, segmentHeight * segmentCount + width * 0.15, 0]}>
        <sphereGeometry args={[width * 0.42, 12, 8]} />
        <meshStandardMaterial
          color={measurePalette.coralTip}
          emissive={measurePalette.coralTip}
          emissiveIntensity={0.35}
          roughness={0.35}
        />
      </mesh>
    </>
  );
};

export const findCoralBase = ({
  position,
  radius,
}: Pick<ChoiceSlot, "position" | "radius">) =>
  position[1] - coralBaseShare * radius;

export const CoralColumn = ({
  height,
  position,
  radius,
  index,
}: ChoiceSlot & { height: number }) => {
  const column = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  const unit = coralSegmentShare * radius;

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    const body = column.current;
    if (body === null) {
      return;
    }
    body.scale.setScalar(
      findGrowth(age.current, tokenGrowSeconds, motionScale),
    );
    body.rotation.z =
      Math.sin(age.current * 0.9 + index * 1.3) * 0.035 * motionScale;
  });

  return (
    <group
      position={[position[0], findCoralBase({ position, radius }), position[2]]}
      name={`coral-${String(height)}`}
    >
      <mesh scale={[radius * 0.62, radius * 0.16, radius * 0.4]}>
        <sphereGeometry args={[1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={measurePalette.mound} roughness={0.92} />
      </mesh>
      <group ref={column}>
        <CoralStack
          segmentCount={height}
          segmentHeight={unit}
          width={radius * 0.3}
          colour={measurePalette.corals[index % measurePalette.corals.length]}
          name="coral-segments"
        />
      </group>
    </group>
  );
};

const rulerHeight = 2.56;
const rulerWidth = 0.42;
const rulerMargin = 0.08;
const centimetreHeight = (rulerHeight - 2 * rulerMargin) / rulerCentimetres;
const rulerTexture = { width: 80, height: 512 };
const rulerFont = `700 20px "Baloo 2 Variable", "Baloo 2", sans-serif`;

export const findMarkHeight = (mark: number) =>
  -rulerHeight / 2 + rulerMargin + mark * centimetreHeight;

const paintRuler: PaintCanvas = (context, width, height) => {
  const pixelsPerUnit = height / rulerHeight;
  context.fillStyle = measurePalette.rulerBody;
  context.fillRect(0, 0, width, height);
  context.fillStyle = measurePalette.rulerInk;
  context.strokeStyle = measurePalette.rulerInk;
  context.font = rulerFont;
  context.textAlign = "right";
  context.textBaseline = "middle";
  for (let millimetre = 0; millimetre <= rulerCentimetres * 10; millimetre++) {
    const mark = millimetre / 10;
    const y = height - (findMarkHeight(mark) + rulerHeight / 2) * pixelsPerUnit;
    const isWhole = millimetre % 10 === 0;
    const isHalf = millimetre % 5 === 0;
    context.lineWidth = isWhole ? 3 : 1.25;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width * (isWhole ? 0.42 : isHalf ? 0.3 : 0.18), y);
    context.stroke();
    if (isWhole) {
      context.fillText(String(mark), width - 6, y);
    }
  }
  context.font = `600 13px "Baloo 2 Variable", "Baloo 2", sans-serif`;
  context.fillText("cm", width - 6, height - 7);
};

const useRulerTexture = () =>
  usePaintedTexture(
    rulerTexture.width,
    rulerTexture.height,
    paintRuler,
    rulerFont,
  );

const buildGuideGeometry = (
  heights: readonly number[],
  fromX: number,
  toX: number,
) => {
  const points: number[] = [];
  const dashes = 6;
  for (const height of heights) {
    for (let dash = 0; dash < dashes; dash++) {
      const start = fromX + ((toX - fromX) * dash) / dashes;
      const end = fromX + ((toX - fromX) * (dash + 0.55)) / dashes;
      points.push(start, height, 0.04, end, height, 0.04);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
};

const coralBesideRuler = 0.62;

export const MeasuredCoral = ({
  measure,
}: {
  measure: MeasuringHeightQuestion;
}) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const scene = useRef<Group>(null);
  const scale = useRulerTexture();
  const baseHeight = findMarkHeight(measure.startMark);
  const topHeight = findMarkHeight(measure.startMark + measure.centimetres);
  const guides = useMemo(
    () =>
      buildGuideGeometry(
        [baseHeight, topHeight],
        rulerWidth / 2,
        coralBesideRuler,
      ),
    [baseHeight, topHeight],
  );
  useDisposedOnUnmount(guides);
  const zeroHeight = findMarkHeight(0);
  const pedestalHeight = baseHeight - zeroHeight;

  useFrame(() => {
    const body = scene.current;
    if (body === null) {
      return;
    }
    body.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    body.rotation.y = -0.18 + Math.sin(age.current * 0.5 * motionScale) * 0.04;
  });

  return (
    <group position={position} name="measured-coral">
      <group ref={scene}>
        <group position={[-0.25, 0, 0]}>
          <mesh>
            <boxGeometry args={[rulerWidth, rulerHeight, 0.06]} />
            <meshPhysicalMaterial
              color={measurePalette.rulerBody}
              roughness={0.45}
              clearcoat={0.6}
              clearcoatRoughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0, 0.031]} name="ruler-scale">
            <planeGeometry args={[rulerWidth, rulerHeight]} />
            <meshStandardMaterial
              key={scale === undefined ? "plain" : "scaled"}
              map={scale ?? null}
              color={scale === undefined ? measurePalette.rulerBody : "#ffffff"}
              roughness={0.5}
            />
          </mesh>
          <lineSegments geometry={guides}>
            <lineBasicMaterial
              color={measurePalette.guide}
              transparent
              opacity={0.7}
            />
          </lineSegments>
          <group position={[coralBesideRuler, 0, 0]}>
            {pedestalHeight > 0 ? (
              <mesh
                position={[0, zeroHeight + pedestalHeight / 2, 0]}
                name="pedestal"
              >
                <boxGeometry args={[0.46, pedestalHeight, 0.3]} />
                <meshStandardMaterial
                  color={measurePalette.pedestal}
                  roughness={0.85}
                />
              </mesh>
            ) : null}
            <group position={[0, baseHeight, 0]}>
              <CoralStack
                segmentCount={Math.max(1, Math.round(measure.centimetres))}
                segmentHeight={
                  (centimetreHeight * measure.centimetres) /
                  Math.max(1, Math.round(measure.centimetres))
                }
                width={0.15}
                colour={measurePalette.corals[0]}
                name="measured-segments"
              />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

const unequalShares: Record<number, readonly number[]> = {
  2: [1 / 3, 2 / 3],
  3: [0.18, 0.32, 0.5],
  4: [0.1, 0.2, 0.3, 0.4],
};

export const listPartShares = (
  parts: number,
  isEqual: boolean,
): readonly number[] =>
  isEqual
    ? Array.from({ length: parts }, () => 1 / parts)
    : (unequalShares[parts] ?? Array.from({ length: parts }, () => 1 / parts));

const tileGap = 0.035;

const buildSectorShape = (
  tileRadius: number,
  startAngle: number,
  sweep: number,
  isWhole: boolean,
): Shape => {
  const shape = new Shape();
  if (isWhole) {
    shape.absarc(0, 0, tileRadius, 0, Math.PI * 2, false);
    return shape;
  }
  const middle = startAngle - sweep / 2;
  const nudge = tileGap * tileRadius;
  const centreX = Math.cos(middle) * nudge;
  const centreY = Math.sin(middle) * nudge;
  shape.moveTo(centreX, centreY);
  shape.absarc(
    centreX,
    centreY,
    tileRadius - nudge,
    startAngle,
    startAngle - sweep,
    true,
  );
  shape.lineTo(centreX, centreY);
  return shape;
};

const buildStripShape = (
  side: number,
  fromShare: number,
  share: number,
  isWhole: boolean,
): Shape => {
  const gap = isWhole ? 0 : tileGap * side * 0.5;
  const left = -side / 2 + fromShare * side + gap;
  const right = left + share * side - gap * 2;
  const shape = new Shape();
  shape.moveTo(left, -side / 2);
  shape.lineTo(right, -side / 2);
  shape.lineTo(right, side / 2);
  shape.lineTo(left, side / 2);
  shape.lineTo(left, -side / 2);
  return shape;
};

interface TileGeometries {
  shaded: BufferGeometry | undefined;
  plain: BufferGeometry | undefined;
}

const buildTileGeometries = (
  picture: string,
  outline: FractionOutline,
  radius: number,
): TileGeometries => {
  const parsed = parseFractionPicture(picture) ?? {
    shaded: 1,
    parts: 1,
    isEqual: true,
  };
  const shares = listPartShares(parsed.parts, parsed.isEqual);
  const depth = radius * 0.12;
  const tileRadius = radius * 0.8;
  const side = radius * 1.4;
  const isWhole = parsed.parts === 1;
  let travelled = 0;
  const pieces = shares.map((share) => {
    const shape =
      outline === "circle"
        ? buildSectorShape(
            tileRadius,
            Math.PI / 2 - travelled * Math.PI * 2,
            share * Math.PI * 2,
            isWhole,
          )
        : buildStripShape(side, travelled, share, isWhole);
    travelled += share;
    return new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: depth * 0.25,
      bevelThickness: depth * 0.25,
      bevelSegments: 1,
      curveSegments: Math.max(4, Math.round(share * 40)),
    }).translate(0, 0, -depth / 2);
  });
  const shadedPieces = pieces.slice(0, parsed.shaded);
  const plainPieces = pieces.slice(parsed.shaded);
  const merge = (list: BufferGeometry[]) =>
    list.length === 0 ? undefined : mergeGeometries(list);
  const geometries = { shaded: merge(shadedPieces), plain: merge(plainPieces) };
  pieces.forEach((piece) => {
    piece.dispose();
  });
  return geometries;
};

export const FractionTile = ({
  picture,
  outline,
  ...slot
}: ChoiceSlot & { picture: string; outline: FractionOutline }) => {
  const { choice, age, motionScale } = useGrowingChoice(slot);
  const turner = useRef<Group>(null);
  const geometries = useMemo(
    () => buildTileGeometries(picture, outline, slot.radius),
    [picture, outline, slot.radius],
  );
  useEffect(
    () => () => {
      geometries.shaded?.dispose();
      geometries.plain?.dispose();
    },
    [geometries],
  );

  useFrame(() => {
    if (turner.current !== null) {
      turner.current.rotation.y =
        Math.sin(age.current * 0.8 + slot.index * 1.4) * 0.28 * motionScale;
    }
  });

  return (
    <group ref={choice} position={slot.position} name={`fraction-${picture}`}>
      <group ref={turner} rotation={[-0.16, 0, 0]}>
        {outline === "circle" ? (
          <mesh position={[0, 0, -slot.radius * 0.1]}>
            <circleGeometry args={[slot.radius * 0.9, 40]} />
            <meshPhysicalMaterial
              color={measurePalette.fractionBacking}
              roughness={0.2}
              clearcoat={1}
              transparent
              opacity={0.55}
            />
          </mesh>
        ) : (
          <mesh position={[0, 0, -slot.radius * 0.1]}>
            <planeGeometry args={[slot.radius * 1.6, slot.radius * 1.6]} />
            <meshPhysicalMaterial
              color={measurePalette.fractionBacking}
              roughness={0.2}
              clearcoat={1}
              transparent
              opacity={0.55}
            />
          </mesh>
        )}
        {geometries.shaded === undefined ? null : (
          <mesh geometry={geometries.shaded} name="shaded-parts">
            <meshPhysicalMaterial
              color={measurePalette.fractionShaded}
              emissive={measurePalette.fractionShaded}
              emissiveIntensity={0.22}
              roughness={0.16}
              clearcoat={1}
              clearcoatRoughness={0.06}
            />
          </mesh>
        )}
        {geometries.plain === undefined ? null : (
          <mesh geometry={geometries.plain} name="plain-parts">
            <meshPhysicalMaterial
              color={measurePalette.fractionPlain}
              roughness={0.55}
              clearcoat={0.5}
              transparent
              opacity={0.82}
            />
          </mesh>
        )}
      </group>
    </group>
  );
};

const clockRadius = 0.9;
const sweepSeconds = 1.2;
const dialSize = 512;
const dialFont = `600 64px Georgia, "Times New Roman", serif`;
const romanDialFont = `600 46px Georgia, "Times New Roman", serif`;

const romanNumerals = [
  "XII",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
];

const buildDialPainter =
  (dial: ClockDial): PaintCanvas =>
  (context, width) => {
    const middle = width / 2;
    const gradient = context.createRadialGradient(
      middle,
      middle * 0.8,
      10,
      middle,
      middle,
      middle,
    );
    gradient.addColorStop(0, "#fffaf0");
    gradient.addColorStop(1, measurePalette.dial);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, width);
    context.strokeStyle = measurePalette.dialInk;
    context.fillStyle = measurePalette.dialInk;
    for (let minute = 0; minute < 60; minute++) {
      const angle = (minute / 60) * Math.PI * 2;
      const isHour = minute % 5 === 0;
      const outer = middle - 18;
      const inner = outer - (isHour ? 30 : 14);
      context.lineWidth = isHour ? 7 : 2.5;
      context.beginPath();
      context.moveTo(
        middle + Math.sin(angle) * inner,
        middle - Math.cos(angle) * inner,
      );
      context.lineTo(
        middle + Math.sin(angle) * outer,
        middle - Math.cos(angle) * outer,
      );
      context.stroke();
    }
    context.font = dialFont;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let hour = 1; hour <= 12; hour++) {
      const angle = (hour / 12) * Math.PI * 2;
      const reach = middle - 100;
      context.font = dial === "roman" ? romanDialFont : dialFont;
      context.fillText(
        dial === "roman" ? romanNumerals[hour % 12] : String(hour),
        middle + Math.sin(angle) * reach,
        middle - Math.cos(angle) * reach + 4,
      );
    }
    context.lineWidth = 2;
    context.globalAlpha = 0.25;
    context.beginPath();
    context.arc(middle, middle, middle - 54, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
  };

const buildHandShape = (length: number, width: number): Shape => {
  const shape = new Shape();
  shape.moveTo(0, -length * 0.16);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width * 0.18, length);
  shape.lineTo(0, length * 1.04);
  shape.lineTo(-width * 0.18, length);
  shape.lineTo(-width / 2, 0);
  shape.lineTo(0, -length * 0.16);
  return shape;
};

const useHandGeometry = (length: number, width: number) => {
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(buildHandShape(length, width), {
        depth: 0.022,
        bevelEnabled: false,
      }),
    [length, width],
  );
  useDisposedOnUnmount(geometry);
  return geometry;
};

export const findHandAngles = ({ hour, minutes }: ClockTime) => ({
  hour: -(((hour % 12) + minutes / 60) / 12) * Math.PI * 2,
  minute: -(minutes / 60) * Math.PI * 2,
});

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

const bezelScrewCount = 8;

const dialPainters: Record<ClockDial, PaintCanvas> = {
  arabic: buildDialPainter("arabic"),
  roman: buildDialPainter("roman"),
};

export const ShipClock = ({
  time,
  dial: dialStyle = "arabic",
}: {
  time: ClockTime;
  dial?: ClockDial;
}) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const clock = useRef<Group>(null);
  const hourHand = useRef<Group>(null);
  const minuteHand = useRef<Group>(null);
  const screws = useRef<InstancedMesh>(null);
  const dial = usePaintedTexture(
    dialSize,
    dialSize,
    dialPainters[dialStyle],
    undefined,
  );
  const hourGeometry = useHandGeometry(clockRadius * 0.5, 0.11);
  const minuteGeometry = useHandGeometry(clockRadius * 0.78, 0.08);
  const angles = useMemo(() => findHandAngles(time), [time]);

  useLayoutEffect(() => {
    const mesh = screws.current;
    if (mesh === null) {
      return;
    }
    const placer = new Object3D();
    for (let index = 0; index < bezelScrewCount; index++) {
      const angle =
        (index / bezelScrewCount) * Math.PI * 2 + Math.PI / bezelScrewCount;
      placer.position.set(
        Math.cos(angle) * (clockRadius + 0.21),
        Math.sin(angle) * (clockRadius + 0.21),
        0.05,
      );
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    const body = clock.current;
    if (body !== null) {
      body.scale.setScalar(
        findGrowth(age.current, promptGrowSeconds, motionScale),
      );
      body.rotation.y =
        -0.22 + Math.sin(age.current * 0.45 * motionScale) * 0.05;
    }
    const sweep =
      motionScale === 0
        ? 1
        : easeOutCubic(
            Math.min(1, Math.max(0, (age.current - 0.25) / sweepSeconds)),
          );
    if (hourHand.current !== null) {
      hourHand.current.rotation.z = angles.hour * sweep;
    }
    if (minuteHand.current !== null) {
      minuteHand.current.rotation.z = angles.minute * sweep;
    }
  });

  return (
    <group position={position} name="ship-clock">
      <group ref={clock} rotation={[0.06, 0, 0]}>
        <mesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[clockRadius + 0.2, clockRadius + 0.26, 0.24, 48]}
          />
          <meshPhysicalMaterial
            color={measurePalette.brass}
            metalness={1}
            roughness={0.38}
            clearcoat={0.4}
          />
        </mesh>
        <mesh name="bezel">
          <torusGeometry args={[clockRadius + 0.1, 0.11, 14, 56]} />
          <meshPhysicalMaterial
            color={measurePalette.brass}
            metalness={1}
            roughness={0.28}
            clearcoat={0.6}
            clearcoatRoughness={0.15}
          />
        </mesh>
        <instancedMesh
          ref={screws}
          args={[undefined, undefined, bezelScrewCount]}
          frustumCulled={false}
        >
          <sphereGeometry args={[0.035, 10, 6]} />
          <meshStandardMaterial
            color={measurePalette.brass}
            metalness={1}
            roughness={0.25}
          />
        </instancedMesh>
        <mesh position={[0, 0, -0.01]} name="dial">
          <circleGeometry args={[clockRadius, 56]} />
          <meshStandardMaterial
            key={dial === undefined ? "plain" : "painted"}
            map={dial ?? null}
            color={dial === undefined ? measurePalette.dial : "#ffffff"}
            roughness={0.6}
          />
        </mesh>
        <group ref={hourHand} position={[0, 0, 0.005]} name="hour-hand">
          <mesh geometry={hourGeometry}>
            <meshPhysicalMaterial
              color={measurePalette.hand}
              roughness={0.3}
              clearcoat={0.8}
            />
          </mesh>
        </group>
        <group ref={minuteHand} position={[0, 0, 0.03]} name="minute-hand">
          <mesh geometry={minuteGeometry}>
            <meshPhysicalMaterial
              color={measurePalette.hand}
              roughness={0.3}
              clearcoat={0.8}
            />
          </mesh>
        </group>
        <mesh position={[0, 0, 0.06]}>
          <sphereGeometry args={[0.055, 14, 8]} />
          <meshStandardMaterial
            color={measurePalette.brass}
            metalness={1}
            roughness={0.22}
          />
        </mesh>
        <mesh position={[0, 0, 0.09]}>
          <circleGeometry args={[clockRadius, 48]} />
          <meshPhysicalMaterial
            color={measurePalette.glass}
            roughness={0.04}
            clearcoat={1}
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};
