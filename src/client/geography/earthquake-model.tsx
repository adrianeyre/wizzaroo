import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  ConeGeometry,
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
  type BufferGeometry,
  type Mesh,
  type MeshBasicMaterial,
  type MeshPhysicalMaterial,
} from "three";
import type { EarthquakePart } from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import { buildModelGeometry, type Triple } from "../world-map-models.js";
import { BobbingArrow, GlowSpot } from "./answer-pointer.js";
import {
  findEpicentre,
  findFaultX,
  findFocus,
  findQuakeArrows,
  findSlipOffset,
  quakeBlock,
} from "./cutaway-layout.js";
import {
  findPulse,
  geographyPalette,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";

const strataColours = ["#6f4a2f", "#a8744a", "#c9a46b", "#8c6a52", "#b88a5a"];
const grassColour = "#5fae55";
const grassDepth = 0.07;
const seismicRingCount = 3;
const blockTilt = 0.32;
const blockLift = 0.26;
const seismicRingSeconds = 2.4;
const largestSeismicRadius = 1.1;

type Plate = "near-plate" | "far-plate";

const buildPlateShape = (plate: Plate): Shape => {
  const corners: [number, number][] =
    plate === "near-plate"
      ? [
          [quakeBlock.left, quakeBlock.bottom],
          [quakeBlock.faultBottomX, quakeBlock.bottom],
          [quakeBlock.faultTopX, quakeBlock.top],
          [quakeBlock.left, quakeBlock.top],
        ]
      : [
          [quakeBlock.faultBottomX, quakeBlock.bottom],
          [quakeBlock.right, quakeBlock.bottom],
          [quakeBlock.right, quakeBlock.top],
          [quakeBlock.faultTopX, quakeBlock.top],
        ];
  const shape = new Shape();
  corners.forEach(([x, y], index) => {
    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  });
  shape.closePath();
  return shape;
};

const findStrataColour = (height: number): Color => {
  if (height > quakeBlock.top - grassDepth) {
    return new Color(grassColour);
  }
  const depthShare =
    (quakeBlock.top - height) / (quakeBlock.top - quakeBlock.bottom);
  const band = Math.min(
    strataColours.length - 1,
    Math.floor(depthShare * strataColours.length * 1.4) % strataColours.length,
  );
  return new Color(strataColours[band]);
};

const paintStrata = (geometry: BufferGeometry) => {
  const positions = geometry.getAttribute("position");
  const colours = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index++) {
    findStrataColour(positions.getY(index)).toArray(colours, index * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colours, 3));
};

const buildPlateGeometry = (plate: Plate): BufferGeometry => {
  const depth = quakeBlock.front - quakeBlock.back;
  const geometry = new ExtrudeGeometry(buildPlateShape(plate), {
    depth,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, quakeBlock.back);
  const flat = geometry.index === null ? geometry : geometry.toNonIndexed();
  if (flat !== geometry) {
    geometry.dispose();
  }
  paintStrata(flat);
  flat.computeVertexNormals();
  return flat;
};

const buildHousesGeometry = (): BufferGeometry =>
  buildModelGeometry(
    [-1.15, -0.7, 0.75, 1.15].flatMap((x, index) => {
      const lift = x > quakeBlock.faultTopX ? findSlipOffset()[1] : 0;
      const z = index % 2 === 0 ? -0.2 : 0.25;
      const base: Triple = [x, quakeBlock.top + lift + 0.09, z];
      return [
        {
          geometry: new BoxGeometry(0.2, 0.18, 0.18),
          colour: "#f4efe6",
          position: base,
        },
        {
          geometry: new ConeGeometry(0.17, 0.14, 4).rotateY(Math.PI / 4),
          colour: index % 2 === 0 ? "#c0392b" : "#34495e",
          position: [base[0], base[1] + 0.16, base[2]] satisfies Triple,
        },
      ];
    }),
  );

const strataBandCount = 5;
const strataFaceLift = 0.004;

const buildBandCorners = (
  plate: Plate,
  lower: number,
  upper: number,
): [number, number][] =>
  plate === "near-plate"
    ? [
        [quakeBlock.left, lower],
        [findFaultX(lower), lower],
        [findFaultX(upper), upper],
        [quakeBlock.left, upper],
      ]
    : [
        [findFaultX(lower), lower],
        [quakeBlock.right, lower],
        [quakeBlock.right, upper],
        [findFaultX(upper), upper],
      ];

const buildStrataFaceGeometry = (plate: Plate): BufferGeometry => {
  const rockTop = quakeBlock.top - grassDepth;
  const bandHeight = (rockTop - quakeBlock.bottom) / strataBandCount;
  return buildModelGeometry(
    Array.from({ length: strataBandCount + 1 }, (_, band) => {
      const isGrass = band === strataBandCount;
      const lower = quakeBlock.bottom + band * bandHeight;
      const upper = isGrass ? quakeBlock.top : lower + bandHeight;
      const shape = new Shape();
      buildBandCorners(plate, lower, upper).forEach(([x, y], index) => {
        if (index === 0) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      });
      return {
        geometry: new ShapeGeometry(shape),
        colour: isGrass
          ? grassColour
          : strataColours[band % strataColours.length],
        position: [0, 0, quakeBlock.front + strataFaceLift] satisfies Triple,
      };
    }),
  );
};

const PlateBlock = ({ plate, isAsked }: { plate: Plate; isAsked: boolean }) => {
  const geometry = useMemo(() => buildPlateGeometry(plate), [plate]);
  const strata = useMemo(() => buildStrataFaceGeometry(plate), [plate]);
  useDisposedOnUnmount(geometry);
  useDisposedOnUnmount(strata);
  const material = useRef<MeshPhysicalMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  const [slipX, slipY] = findSlipOffset();
  const offset: Triple = plate === "far-plate" ? [slipX, slipY, 0] : [0, 0, 0];

  useFrame(() => {
    if (material.current !== null && isAsked) {
      material.current.emissiveIntensity =
        0.15 + 0.3 * findPulse(age.current, motionScale);
    }
  });

  return (
    <group position={offset}>
      <mesh geometry={strata}>
        <meshStandardMaterial vertexColors roughness={0.8} />
      </mesh>
      <mesh geometry={geometry} name={plate}>
        <meshPhysicalMaterial
          ref={material}
          vertexColors
          roughness={0.75}
          clearcoat={0.2}
          flatShading
          emissive={isAsked ? geographyPalette.highlight : "#000000"}
          emissiveIntensity={isAsked ? 0.3 : 0}
        />
      </mesh>
    </group>
  );
};

const FaultSeam = ({ isAsked }: { isAsked: boolean }) => {
  const length = Math.hypot(
    quakeBlock.faultTopX - quakeBlock.faultBottomX,
    quakeBlock.top - quakeBlock.bottom,
  );
  const tilt = Math.atan2(
    quakeBlock.faultTopX - quakeBlock.faultBottomX,
    quakeBlock.top - quakeBlock.bottom,
  );
  const middleY = (quakeBlock.top + quakeBlock.bottom) / 2;
  const material = useRef<MeshBasicMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    if (material.current !== null && isAsked) {
      material.current.opacity =
        0.55 + 0.45 * findPulse(age.current, motionScale);
    }
  });

  return (
    <mesh
      position={[findFaultX(middleY), middleY, quakeBlock.front + 0.012]}
      rotation={[0, 0, -tilt]}
      name="fault-line"
    >
      <planeGeometry args={[isAsked ? 0.07 : 0.035, length]} />
      <meshBasicMaterial
        ref={material}
        color={isAsked ? geographyPalette.highlight : "#2b1a10"}
        transparent
        opacity={isAsked ? 1 : 0.85}
        toneMapped={false}
      />
    </mesh>
  );
};

const SeismicRing = ({
  index,
  isAsked,
}: {
  index: number;
  isAsked: boolean;
}) => {
  const ring = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  const [focusX, focusY, front] = findFocus();

  useFrame(() => {
    const body = ring.current;
    if (body === null || material.current === null) {
      return;
    }
    const life =
      motionScale === 0
        ? (index + 1) / (seismicRingCount + 1)
        : (age.current / seismicRingSeconds + index / seismicRingCount) % 1;
    body.scale.setScalar(0.08 + life * largestSeismicRadius);
    material.current.opacity = (1 - life) * (isAsked ? 0.95 : 0.3);
  });

  return (
    <mesh ref={ring} position={[focusX, focusY, front + 0.02]}>
      <ringGeometry args={[0.92, 1, 40]} />
      <meshBasicMaterial
        ref={material}
        color={isAsked ? geographyPalette.highlight : geographyPalette.white}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

export const EarthquakeModel = ({ part }: { part: EarthquakePart }) => {
  const houses = useMemo(() => buildHousesGeometry(), []);
  useDisposedOnUnmount(houses);
  const focus = findFocus();
  const epicentre = findEpicentre();
  const isFocusAsked = part === "focus";
  const arePlatesAsked = part === "tectonic-plates";

  return (
    <group
      name="earthquake-block"
      position={[0, quakeBlock.bottom + blockLift, 0]}
      rotation={[blockTilt, 0, 0]}
    >
      <group position={[0, -quakeBlock.bottom, 0]}>
        <PlateBlock plate="near-plate" isAsked={arePlatesAsked} />
        <PlateBlock plate="far-plate" isAsked={arePlatesAsked} />
        <mesh geometry={houses}>
          <meshStandardMaterial vertexColors roughness={0.55} />
        </mesh>
        <FaultSeam isAsked={part === "fault-line"} />
        {Array.from({ length: seismicRingCount }, (_, index) => (
          <SeismicRing
            key={index}
            index={index}
            isAsked={part === "seismic-waves"}
          />
        ))}
        <mesh position={[focus[0], focus[1], focus[2] + 0.03]} name="focus">
          <sphereGeometry args={[isFocusAsked ? 0.09 : 0.06, 20, 14]} />
          <meshBasicMaterial
            color={isFocusAsked ? geographyPalette.highlight : "#e2483d"}
            toneMapped={false}
          />
        </mesh>
        <mesh
          position={epicentre}
          rotation={[-Math.PI / 2, 0, 0]}
          name="epicentre"
        >
          <circleGeometry args={[0.07, 20]} />
          <meshBasicMaterial color="#e2483d" toneMapped={false} />
        </mesh>
        {part === "epicentre" ? (
          <GlowSpot position={epicentre} radius={0.32} />
        ) : null}
        {findQuakeArrows(part).map((aim, index) => (
          <BobbingArrow key={index} aim={aim} />
        ))}
      </group>
    </group>
  );
};
