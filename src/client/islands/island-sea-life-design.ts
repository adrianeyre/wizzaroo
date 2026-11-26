import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Triple } from "../world-map-models.js";
import { smoothStep } from "../world-map-terrain.js";
import { buildAirfoilLoft, buildLoftGeometry } from "./island-lofts.js";

// The big animals met on the scuba crossing: a shark, a sea lion and a
// bottlenose dolphin, each modelled in full - a smooth lofted body built from
// many superellipse sections, real thickness to every fin, countershaded skin
// painted per vertex, gill slits, a smile, eyes and whiskers. Each faces +z
// (its nose) with its back up (+y), sized in the crossing's units, where the
// diving Character is about 0.7 tall.

const clamp = (value: number, low = 0, high = 1): number =>
  Math.min(high, Math.max(low, value));

/** One cross-section of a body, a superellipse about the body's centreline. */
export interface BodySection {
  z: number;
  centreY: number;
  top: number;
  bottom: number;
  halfWidth: number;
  /** 2 is an ellipse; higher is boxier. */
  squareness: number;
}

const signedPower = (value: number, power: number): number =>
  Math.sign(value) * Math.abs(value) ** power;

/** A point on a section's outline; angle 0 is the top, π/2 the +x side. */
export const findSectionPoint = (
  section: BodySection,
  angle: number,
): Triple => {
  const power = 2 / section.squareness;
  const up = Math.cos(angle);
  return [
    section.halfWidth * signedPower(Math.sin(angle), power),
    section.centreY +
      (up >= 0 ? section.top : section.bottom) * signedPower(up, power),
    section.z,
  ];
};

const bodyAround = 48;
const bodyStations = 108;

/** A smooth body lofted nose to tail, its sections closer at both ends. */
const buildBodyLoft = (
  findSection: (along: number) => BodySection,
  stations = bodyStations,
  around = bodyAround,
): BufferGeometry =>
  buildLoftGeometry(
    Array.from({ length: stations }, (_, station) => {
      const along = (1 - Math.cos((Math.PI * station) / (stations - 1))) / 2;
      const section = findSection(along);
      return Array.from({ length: around }, (_unused, point) =>
        findSectionPoint(section, (point / around) * Math.PI * 2),
      );
    }),
  );

type Painter = (point: Vector3, normal: Vector3) => Color;

/** Smooth normals, a colour at every vertex, and no uvs, ready to merge. */
export const paintSmooth = (
  geometry: BufferGeometry,
  paint: Painter | string,
): BufferGeometry => {
  geometry.computeVertexNormals();
  const flat = geometry.index === null ? geometry : geometry.toNonIndexed();
  if (flat.hasAttribute("uv")) {
    flat.deleteAttribute("uv");
  }
  const positions = flat.getAttribute("position");
  const normals = flat.getAttribute("normal");
  const colours = new Float32Array(positions.count * 3);
  const point = new Vector3();
  const normal = new Vector3();
  const solid = typeof paint === "string" ? new Color(paint) : undefined;
  for (let index = 0; index < positions.count; index++) {
    point.fromBufferAttribute(positions, index);
    normal.fromBufferAttribute(normals, index);
    const colour =
      solid ?? (typeof paint === "function" ? paint(point, normal) : solid);
    (colour ?? new Color()).toArray(colours, index * 3);
  }
  flat.setAttribute("color", new BufferAttribute(colours, 3));
  return flat;
};

const join = (parts: BufferGeometry[]): BufferGeometry => {
  const merged = mergeGeometries(parts);
  parts.forEach((part) => {
    part.dispose();
  });
  merged.computeBoundingSphere();
  return merged;
};

interface FinSpec {
  root: Triple;
  /** Root to tip. */
  span: Triple;
  /** The way along the chord, leading edge to trailing edge. */
  chordWay: Triple;
  /** Across the fin's thickness. */
  thicknessAxis: Triple;
  rootChord: number;
  tipChord: number;
  thickness: number;
  /** How far the leading edge sweeps back along the chord by the tip. */
  sweep: number;
  /** Bows the fin's tip half back, as on a shark's or dolphin's dorsal. */
  falcate?: number;
  /** How far ahead of the root's leading edge the root sits. */
  lead?: number;
  sections?: number;
}

const normalise = ([x, y, z]: Triple): Triple => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};

/** A fin with a real airfoil section, tapering and sweeping to a tip. */
const buildFin = ({
  root,
  span,
  chordWay,
  thicknessAxis,
  rootChord,
  tipChord,
  thickness,
  sweep,
  falcate = 0,
  lead = 0,
  sections = 14,
}: FinSpec): BufferGeometry => {
  const way = normalise(chordWay);
  return buildAirfoilLoft(
    Array.from({ length: sections }, (_, section) => {
      const share = section / (sections - 1);
      const chord =
        tipChord +
        (rootChord - tipChord) * (1 - share ** 1.25) ** (1 + falcate * 0.6);
      const back = sweep * share ** (1 + falcate) - lead;
      return {
        leadingEdge: [
          root[0] + span[0] * share + way[0] * back,
          root[1] + span[1] * share + way[1] * back,
          root[2] + span[2] * share + way[2] * back,
        ],
        chord: [way[0] * chord, way[1] * chord, way[2] * chord],
        thicknessAxis,
        thickness: thickness * (1 - 0.45 * share),
      };
    }),
  );
};

const buildEye = (
  centre: Triple,
  outward: Triple,
  radius: number,
  rim: string,
): BufferGeometry[] => {
  const facing = new Quaternion().setFromUnitVectors(
    new Vector3(0, 0, 1),
    new Vector3(...normalise(outward)),
  );
  const ball = new SphereGeometry(radius, 20, 14)
    .scale(1, 0.92, 0.55)
    .applyQuaternion(facing)
    .translate(...centre);
  const lid = new SphereGeometry(radius * 1.32, 20, 14)
    .scale(1, 0.9, 0.42)
    .applyQuaternion(facing)
    .translate(
      centre[0] - outward[0] * radius * 0.18,
      centre[1] - outward[1] * radius * 0.18,
      centre[2] - outward[2] * radius * 0.18,
    );
  const glint = new SphereGeometry(radius * 0.22, 10, 8)
    .applyQuaternion(facing)
    .translate(
      centre[0] + outward[0] * radius * 0.42,
      centre[1] + radius * 0.38,
      centre[2] + radius * 0.3,
    );
  return [
    paintSmooth(lid, rim),
    paintSmooth(ball, "#05070c"),
    paintSmooth(glint, "#e8f1f8"),
  ];
};

const buildRod = (
  from: Vector3,
  to: Vector3,
  radiusFrom: number,
  radiusTo: number,
): BufferGeometry => {
  const along = to.clone().sub(from);
  const rod = new CylinderGeometry(radiusTo, radiusFrom, along.length(), 5);
  rod.applyQuaternion(
    new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      along.clone().normalize(),
    ),
  );
  const middle = from.clone().add(to).multiplyScalar(0.5);
  return rod.translate(middle.x, middle.y, middle.z);
};

const mix = (from: string, to: string, share: number): Color =>
  new Color(from).lerp(new Color(to), clamp(share));

/** Where a body's surface is, `along` from nose to tail, at an angle. */
const findBodyPoint = (
  findSection: (along: number) => BodySection,
  along: number,
  angle: number,
  sink = 0,
): Triple => {
  const section = findSection(along);
  return findSectionPoint(
    {
      ...section,
      top: section.top - sink,
      bottom: section.bottom - sink,
      halfWidth: section.halfWidth - sink,
    },
    angle,
  );
};

const findAlong = (noseZ: number, length: number, z: number): number =>
  clamp((noseZ - z) / length);

// --------------------------------------------------------------- the shark

// A grey reef shark, about two and a half times the diver's length: a long
// torpedo with a rounded snout, five gill slits, a tall first dorsal fin,
// broad swept pectorals, a small second dorsal and anal fin, and a big
// crescent tail with a longer upper lobe. Slate grey above, white below,
// with dark tips to its fins.

export const sharkNoseZ = 1.15;
export const sharkBodyLength = 1.95;
export const sharkTailZ = sharkNoseZ - sharkBodyLength;
const sharkGirth = 0.25;

const findSharkFullness = (along: number): number => {
  if (along < 0.34) {
    const nose = (0.34 - along) / 0.34;
    return Math.sqrt(Math.max(0, 1 - nose ** 2.15));
  }
  return Math.max(0, 1 - ((along - 0.34) / 0.66) ** 1.75) ** 1.35;
};

export const findSharkSection = (along: number): BodySection => {
  const fullness = findSharkFullness(along);
  const height = 0.022 + sharkGirth * fullness;
  const snout = smoothStep(0.16, 0, along);
  const peduncle = smoothStep(0.78, 1, along);
  return {
    z: sharkNoseZ - along * sharkBodyLength,
    centreY: 0.025 * snout - 0.02 * smoothStep(0.15, 0.4, along) * (1 - along),
    top: height * (1 - 0.08 * snout),
    bottom: height * (0.86 - 0.24 * snout),
    halfWidth: height * (0.86 - 0.34 * peduncle + 0.08 * snout),
    squareness: 2.05 + 0.35 * peduncle,
  };
};

const gillSlits = [0.215, 0.24, 0.265, 0.29, 0.312];

const paintSharkSkin = (point: Vector3): Color => {
  const along = findAlong(sharkNoseZ, sharkBodyLength, point.z);
  const section = findSharkSection(along);
  const height = point.y - section.centreY;
  const level =
    height >= 0
      ? height / Math.max(section.top, 0.001)
      : height / Math.max(section.bottom, 0.001);
  const line =
    -0.24 +
    0.05 * Math.sin(point.z * 7.5 + 0.6) +
    0.14 * smoothStep(0.5, 0.95, along) -
    0.1 * smoothStep(0.14, 0.02, along);
  const back = mix("#7b8b9b", "#47525f", smoothStep(0.1, 0.95, level));
  const belly = mix("#f4f6f8", "#dfe5ea", smoothStep(-1, -0.4, level));
  return belly.lerp(back, smoothStep(line - 0.11, line + 0.11, level));
};

/** A thin tube along a curve of points on (or just above) a body. */
const buildCrease = (
  points: readonly Triple[],
  radius: number,
  colour: string,
): BufferGeometry =>
  join(
    points
      .slice(1)
      .map((point, index) =>
        paintSmooth(
          buildRod(
            new Vector3(...points[index]),
            new Vector3(...point),
            radius,
            radius,
          ),
          colour,
        ),
      ),
  );

const listCurve = (
  steps: number,
  findPoint: (share: number) => Triple,
): Triple[] =>
  Array.from({ length: steps + 1 }, (_, step) => findPoint(step / steps));

const buildSharkCreases = (): BufferGeometry[] => [
  ...[-1, 1].flatMap((side) =>
    gillSlits.map((slit, index) =>
      buildCrease(
        listCurve(10, (share) => {
          const angle = side * (Math.PI / 2 - 0.55 + share * 1.15);
          return findBodyPoint(
            findSharkSection,
            slit + 0.014 * (share - 0.5) - 0.006 * Math.sin(Math.PI * share),
            angle,
            -0.001,
          );
        }).slice(index === 0 ? 1 : 0),
        0.0032 - index * 0.0002,
        "#36404b",
      ),
    ),
  ),
  buildCrease(
    listCurve(24, (share) => {
      const across = share * 2 - 1;
      return findBodyPoint(
        findSharkSection,
        0.128 + 0.055 * across ** 2,
        Math.PI + across * 1.05,
        -0.001,
      );
    }),
    0.0042,
    "#3a2f36",
  ),
];

const paintSharkFin =
  (baseLevel: number, tipLevel: number, isUnder = false) =>
  (point: Vector3): Color => {
    const reach = clamp(
      (Math.abs(isUnder ? point.y : point.y) - baseLevel) /
        Math.max(tipLevel - baseLevel, 0.001),
    );
    const top = mix("#5d6b79", "#3d4752", reach);
    return top.lerp(new Color("#1f252c"), smoothStep(0.78, 1, reach));
  };

const paintSharkPectoral = (point: Vector3, normal: Vector3): Color => {
  const reach = clamp((Math.abs(point.x) - 0.16) / 0.5);
  const upper = mix("#5d6b79", "#2b3239", smoothStep(0.72, 1, reach));
  return normal.y < -0.2 ? mix("#e4e9ee", "#9aa6b2", reach) : upper;
};

export const buildSharkGeometry = (): BufferGeometry => {
  const findSection = findSharkSection;
  const top = (along: number) => {
    const section = findSection(along);
    return section.centreY + section.top;
  };
  const bottom = (along: number) => {
    const section = findSection(along);
    return section.centreY - section.bottom;
  };
  const zAt = (along: number) => sharkNoseZ - along * sharkBodyLength;
  const dorsalRoot = 0.33;
  const pectoral = (side: number) =>
    buildFin({
      root: [
        side * findSection(0.3).halfWidth * 0.62,
        findSection(0.3).centreY - findSection(0.3).bottom * 0.55,
        zAt(0.3),
      ],
      span: [side * 0.52, -0.2, -0.36],
      chordWay: [0, 0.04, -1],
      thicknessAxis: [0, 1, 0],
      rootChord: 0.36,
      tipChord: 0.05,
      thickness: 0.11,
      sweep: 0.16,
      falcate: 0.6,
      sections: 16,
    });
  const pelvic = (side: number) =>
    buildFin({
      root: [
        side * findSection(0.6).halfWidth * 0.45,
        bottom(0.6) + 0.02,
        zAt(0.6),
      ],
      span: [side * 0.12, -0.09, -0.1],
      chordWay: [0, 0, -1],
      thicknessAxis: [0, 1, 0],
      rootChord: 0.15,
      tipChord: 0.04,
      thickness: 0.1,
      sweep: 0.05,
    });
  return join([
    paintSmooth(buildBodyLoft(findSection), paintSharkSkin),
    ...buildSharkCreases(),
    paintSmooth(
      buildFin({
        root: [0, top(dorsalRoot) - 0.03, zAt(dorsalRoot)],
        span: [0, 0.4, -0.12],
        chordWay: [0, 0, -1],
        thicknessAxis: [1, 0, 0],
        rootChord: 0.46,
        tipChord: 0.04,
        thickness: 0.13,
        sweep: 0.2,
        falcate: 0.9,
        sections: 18,
      }),
      paintSharkFin(top(dorsalRoot), top(dorsalRoot) + 0.38),
    ),
    paintSmooth(
      buildFin({
        root: [0, top(0.76) - 0.015, zAt(0.76)],
        span: [0, 0.075, -0.04],
        chordWay: [0, 0, -1],
        thicknessAxis: [1, 0, 0],
        rootChord: 0.1,
        tipChord: 0.025,
        thickness: 0.12,
        sweep: 0.03,
        falcate: 0.6,
      }),
      paintSharkFin(top(0.76), top(0.76) + 0.075),
    ),
    paintSmooth(
      buildFin({
        root: [0, bottom(0.78) + 0.015, zAt(0.78)],
        span: [0, -0.07, -0.04],
        chordWay: [0, 0, -1],
        thicknessAxis: [1, 0, 0],
        rootChord: 0.09,
        tipChord: 0.025,
        thickness: 0.12,
        sweep: 0.03,
      }),
      "#7d8995",
    ),
    ...[-1, 1].flatMap((side) => [
      paintSmooth(pectoral(side), paintSharkPectoral),
      paintSmooth(pelvic(side), paintSharkPectoral),
    ]),
    // The tail: a tall upper lobe and a shorter lower one, meeting at the
    // end of the body.
    paintSmooth(
      buildFin({
        root: [0, findSection(0.97).centreY + 0.01, zAt(0.97)],
        span: [0, 0.44, -0.36],
        chordWay: [0, -0.15, -1],
        thicknessAxis: [1, 0, 0],
        rootChord: 0.22,
        tipChord: 0.035,
        thickness: 0.1,
        sweep: 0.1,
        falcate: 0.7,
        sections: 16,
      }),
      paintSharkFin(0, 0.42),
    ),
    paintSmooth(
      buildFin({
        root: [0, findSection(0.97).centreY - 0.01, zAt(0.97)],
        span: [0, -0.3, -0.2],
        chordWay: [0, 0.2, -1],
        thicknessAxis: [1, 0, 0],
        rootChord: 0.18,
        tipChord: 0.035,
        thickness: 0.1,
        sweep: 0.06,
        falcate: 0.5,
        sections: 14,
      }),
      paintSharkFin(0, 0.3, true),
    ),
    ...[-1, 1].flatMap((side) => {
      const centre = findBodyPoint(findSection, 0.115, side * 1.32, 0.006);
      return buildEye(centre, [side, 0.18, 0.12], 0.021, "#3f4a56");
    }),
  ]);
};

// --------------------------------------------------------------- the dolphin

// A bottlenose dolphin, about two and a half times the diver's length: a
// short beak with a smiling mouthline, a rounded melon, a hooked dorsal fin,
// paddle flippers and wide swept flukes. A dark grey cape over a lighter
// grey flank and a pale belly, and a blowhole on top.

export const dolphinNoseZ = 0.92;
export const dolphinBodyLength = 1.68;
export const dolphinTailZ = dolphinNoseZ - dolphinBodyLength;

const findDolphinBody = (along: number): number =>
  along < 0.4
    ? Math.sin((Math.PI / 2) * (along / 0.4)) ** 0.75
    : Math.max(0, 1 - ((along - 0.4) / 0.6) ** 1.6) ** 1.25;

// The head is shaped by its top and its underside apart: a short rounded
// beak, then the melon rising steeply above it while the jaw runs smoothly
// back into the throat.
export const findDolphinSection = (along: number): BodySection => {
  const height = 0.026 + 0.19 * findDolphinBody(along);
  const tip = Math.sqrt(clamp(along / 0.075));
  const beakTop = 0.002 + 0.034 * tip;
  const beakBottom = 0.002 + 0.044 * tip;
  const melon = smoothStep(0.07, 0.2, along);
  const jaw = smoothStep(0.04, 0.26, along);
  const peduncle = smoothStep(0.72, 1, along);
  const top =
    beakTop +
    (height * (1 + 0.12 * (1 - smoothStep(0.2, 0.38, along))) - beakTop) *
      melon;
  const bottom = beakBottom + (height * 0.95 - beakBottom) * jaw;
  const width = Math.min(top, bottom) * 0.35 + Math.max(top, bottom) * 0.5;
  return {
    z: dolphinNoseZ - along * dolphinBodyLength,
    centreY: -0.035 * (1 - jaw),
    top: top * (1 + 0.1 * peduncle),
    bottom: bottom * (1 - 0.05 * peduncle),
    halfWidth: width * (1.02 - 0.5 * peduncle),
    squareness: 2,
  };
};

const paintDolphinSkin = (point: Vector3): Color => {
  const along = findAlong(dolphinNoseZ, dolphinBodyLength, point.z);
  const section = findDolphinSection(along);
  const height = point.y - section.centreY;
  const level =
    height >= 0
      ? height / Math.max(section.top, 0.001)
      : height / Math.max(section.bottom, 0.001);
  const capeLine =
    0.45 -
    0.25 * Math.exp(-(((along - 0.5) / 0.12) ** 2)) +
    0.1 * smoothStep(0.75, 1, along) +
    0.15 * smoothStep(0.22, 0.08, along);
  const flankLine = -0.4 - 0.12 * smoothStep(0.2, 0.05, along);
  const belly = mix("#f2f5f8", "#dde4eb", smoothStep(-1, -0.5, level));
  const flank = mix(
    "#a4b0bd",
    "#7f8c9a",
    smoothStep(flankLine, capeLine, level),
  );
  const cape = mix("#56636f", "#3c4651", smoothStep(capeLine, 1, level));
  return belly
    .lerp(flank, smoothStep(flankLine - 0.16, flankLine + 0.16, level))
    .lerp(cape, smoothStep(capeLine - 0.14, capeLine + 0.12, level));
};

const buildDolphinCreases = (): BufferGeometry[] => [
  // The mouthline, running back along the beak and curling up in a smile.
  ...[-1, 1].map((side) =>
    buildCrease(
      listCurve(18, (share) => {
        const along = 0.006 + share * 0.11;
        const section = findDolphinSection(along);
        const lift = 0.35 * smoothStep(0.65, 1, share);
        const level = -0.25 + lift;
        const angle = Math.acos(clamp(level, -1, 1));
        return findSectionPoint(
          {
            ...section,
            top: section.top + 0.0012,
            bottom: section.bottom + 0.0012,
            halfWidth: section.halfWidth + 0.0012,
          },
          side * angle,
        );
      }),
      0.0028,
      "#30373f",
    ),
  ),
  // The blowhole, a little crescent on top behind the melon.
  buildCrease(
    listCurve(8, (share) =>
      findBodyPoint(
        findDolphinSection,
        0.205 - 0.006 * Math.sin(Math.PI * share),
        (share - 0.5) * 0.36,
        -0.001,
      ),
    ),
    0.004,
    "#262c33",
  ),
];

const paintDolphinFin = (point: Vector3, normal: Vector3): Color =>
  normal.y < -0.35
    ? mix("#b4bfca", "#7f8c9a", clamp(Math.abs(point.x) / 0.4))
    : new Color("#47525e");

export const buildDolphinGeometry = (): BufferGeometry => {
  const findSection = findDolphinSection;
  const zAt = (along: number) => dolphinNoseZ - along * dolphinBodyLength;
  const top = (along: number) => {
    const section = findSection(along);
    return section.centreY + section.top;
  };
  const flipper = (side: number) => {
    const section = findSection(0.27);
    return buildFin({
      root: [
        side * section.halfWidth * 0.7,
        section.centreY - section.bottom * 0.55,
        zAt(0.27),
      ],
      span: [side * 0.27, -0.13, -0.2],
      chordWay: [0, 0.05, -1],
      thicknessAxis: [0, 1, 0],
      rootChord: 0.15,
      tipChord: 0.035,
      thickness: 0.16,
      sweep: 0.1,
      falcate: 0.4,
    });
  };
  const fluke = (side: number) =>
    buildFin({
      root: [0, findSection(0.985).centreY, zAt(0.985) + 0.06],
      span: [side * 0.33, 0.01, -0.17],
      chordWay: [0, 0, -1],
      thicknessAxis: [0, 1, 0],
      rootChord: 0.2,
      tipChord: 0.035,
      thickness: 0.11,
      sweep: 0.13,
      falcate: 0.7,
      sections: 16,
    });
  return join([
    paintSmooth(buildBodyLoft(findSection), paintDolphinSkin),
    ...buildDolphinCreases(),
    paintSmooth(
      buildFin({
        root: [0, top(0.48) - 0.03, zAt(0.48)],
        span: [0, 0.25, -0.14],
        chordWay: [0, 0, -1],
        thicknessAxis: [1, 0, 0],
        rootChord: 0.3,
        tipChord: 0.03,
        thickness: 0.14,
        sweep: 0.12,
        falcate: 1.2,
        sections: 18,
      }),
      "#414c57",
    ),
    ...[-1, 1].flatMap((side) => [
      paintSmooth(flipper(side), paintDolphinFin),
      paintSmooth(fluke(side), paintDolphinFin),
    ]),
    ...[-1, 1].flatMap((side) => {
      const centre = findBodyPoint(findSection, 0.165, side * 1.68, 0.004);
      return buildEye(centre, [side, 0.05, 0.25], 0.0135, "#4b5866");
    }),
  ]);
};

// --------------------------------------------------------------- the sea lion

// A California sea lion, about one and a half times the diver's length: a
// dog-like head with a pointed muzzle, big dark eyes, tiny ears and long pale
// whiskers on a neck that bends, a sleek body, long dark front flippers it
// flies through the water with, and two webbed back flippers trailing behind.
// Wet chocolate brown, paler on the chest and muzzle.

export const seaLionNoseZ = 0.62;
export const seaLionBodyLength = 1.18;
export const seaLionTailZ = seaLionNoseZ - seaLionBodyLength;

export const findSeaLionSection = (along: number): BodySection => {
  const tip = Math.sqrt(clamp(along / 0.05));
  const muzzle = 0.004 + 0.05 * tip + 0.035 * smoothStep(0.04, 0.11, along);
  const skull = 0.022 * Math.exp(-(((along - 0.11) / 0.05) ** 2));
  const chest =
    along < 0.42
      ? 0.075 + 0.09 * smoothStep(0.08, 0.42, along) ** 0.85
      : 0.006 +
        0.03 * (1 - smoothStep(0.86, 1, along)) +
        0.129 * Math.max(0, 1 - ((along - 0.42) / 0.58) ** 1.6) ** 1.2;
  const neck = smoothStep(0.1, 0.26, along);
  const radius =
    (muzzle + skull) * (1 - neck) +
    Math.max(chest, (muzzle + skull) * 0.96 * smoothStep(0.4, 0.24, along)) *
      neck;
  const snout = smoothStep(0.08, 0, along);
  return {
    z: seaLionNoseZ - along * seaLionBodyLength,
    centreY: 0.045 * smoothStep(0.32, 0.08, along) - 0.01 * snout,
    top: radius * (1 - 0.16 * snout),
    bottom: radius * (0.95 - 0.1 * snout),
    halfWidth:
      radius * (0.92 - 0.08 * snout + 0.1 * smoothStep(0.3, 0.55, along)),
    squareness: 2,
  };
};

const paintSeaLionSkin = (point: Vector3): Color => {
  const along = findAlong(seaLionNoseZ, seaLionBodyLength, point.z);
  const section = findSeaLionSection(along);
  const height = point.y - section.centreY;
  const level =
    height >= 0
      ? height / Math.max(section.top, 0.001)
      : height / Math.max(section.bottom, 0.001);
  const back = mix("#4a3326", "#2f2019", smoothStep(-0.1, 0.9, level));
  const chest = mix("#a07a58", "#7c5a3f", smoothStep(-1, -0.2, level));
  const skin = chest.lerp(back, smoothStep(-0.5, 0.15, level));
  return skin.lerp(new Color("#8e6c52"), smoothStep(0.085, 0.03, along) * 0.6);
};

export const buildSeaLionBodyGeometry = (): BufferGeometry => {
  const findSection = findSeaLionSection;
  const zAt = (along: number) => seaLionNoseZ - along * seaLionBodyLength;
  const whiskers = [-1, 1].flatMap((side) =>
    Array.from({ length: 6 }, (_, whisker) => {
      const root = new Vector3(
        ...findBodyPoint(
          findSection,
          0.035,
          side * (1.75 + whisker * 0.1),
          0.004,
        ),
      );
      const fan = whisker / 5;
      const tip = root
        .clone()
        .add(
          new Vector3(
            side * (0.09 + 0.02 * fan),
            -0.02 + 0.045 * fan,
            -0.035 - 0.03 * fan,
          ),
        );
      return paintSmooth(buildRod(root, tip, 0.0026, 0.0007), "#efe4cf");
    }),
  );
  const ears = [-1, 1].map((side) => {
    const root = findBodyPoint(findSection, 0.165, side * 0.9, 0.006);
    return paintSmooth(
      new ConeGeometry(0.012, 0.035, 8)
        .rotateX(-Math.PI / 2 - 0.4)
        .rotateZ(side * -0.5)
        .translate(...root),
      "#2a1d16",
    );
  });
  const hindFlipper = (side: number) =>
    buildFin({
      root: [side * 0.035, findSection(0.95).centreY, zAt(0.93)],
      span: [side * 0.07, -0.01, -0.24],
      chordWay: [side, 0, 0.15],
      thicknessAxis: [0, 1, 0],
      rootChord: 0.07,
      tipChord: 0.19,
      thickness: 0.12,
      sweep: -0.04,
    });
  return join([
    paintSmooth(buildBodyLoft(findSection), paintSeaLionSkin),
    ...whiskers,
    ...ears,
    ...[-1, 1].map((side) => paintSmooth(hindFlipper(side), "#2a1d16")),
    paintSmooth(
      new SphereGeometry(0.019, 16, 12)
        .scale(1.25, 0.75, 0.7)
        .translate(
          0,
          findSection(0.012).centreY + findSection(0.012).top * 0.35,
          seaLionNoseZ - 0.008,
        ),
      "#1a1310",
    ),
    ...[-1, 1].flatMap((side) => {
      const centre = findBodyPoint(findSection, 0.1, side * 1.15, 0.006);
      return buildEye(centre, [side, 0.25, 0.4], 0.02, "#2a1d16");
    }),
  ]);
};

/** Where each front flipper joins the sea lion's body, at its shoulder. */
export const findSeaLionShoulder = (side: number): Triple => {
  const section = findSeaLionSection(0.33);
  return [
    side * section.halfWidth * 0.78,
    section.centreY - section.bottom * 0.4,
    section.z,
  ];
};

/** A front flipper, its root at the origin, reaching out along +x. */
export const buildSeaLionFlipperGeometry = (): BufferGeometry =>
  paintSmooth(
    buildFin({
      root: [-0.02, 0, 0.04],
      span: [0.36, -0.06, -0.15],
      chordWay: [0, 0, -1],
      thicknessAxis: [0, 1, 0],
      rootChord: 0.17,
      tipChord: 0.07,
      thickness: 0.15,
      sweep: 0.08,
      lead: 0,
      sections: 14,
    }),
    (point, normal) =>
      normal.y < -0.3
        ? mix("#3b2a20", "#22180f", point.x / 0.36)
        : mix("#2f2019", "#1a120d", point.x / 0.36),
  );
