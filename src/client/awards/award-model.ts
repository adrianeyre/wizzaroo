import {
  BoxGeometry,
  BufferAttribute,
  CapsuleGeometry,
  CircleGeometry,
  ConeGeometry,
  CubicBezierCurve3,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type {
  AwardCupShape,
  AwardDesign,
  AwardEmblem,
} from "./award-designs.js";

/**
 * A Quest's Trophy as a high-detail 3D Award (ADR 0059): a polished
 * plinth with a nameplate, a turned metal cup on a knopped stem with
 * curved handles and a set gem, a domed lid, and the Island's emblem on
 * top. Every part is turned, bevelled or swept smooth, then merged by
 * finish, so an Award is a few meshes however many parts it has.
 */

export type AwardFinish =
  "plinth" | "metal" | "trim" | "gem" | "glow" | "dark" | "shadow";

interface AwardPart {
  geometry: BufferGeometry;
  finish: AwardFinish;
  at?: [number, number, number];
  turn?: [number, number, number];
  scale?: [number, number, number] | number;
}

export interface AwardMesh {
  name: string;
  finish: AwardFinish;
  geometry: BufferGeometry;
}

/** How round the turned parts are: segments around the cup and its lid. */
const turnedSegments = 64;

const cupBottom = 1;
const plinthTop = 0.4;

const cupHeights: Record<AwardCupShape, number> = {
  chalice: 0.7,
  tulip: 0.75,
  urn: 0.68,
};

const cupRadiusAt = (shape: AwardCupShape, t: number): number => {
  switch (shape) {
    case "chalice":
      return 0.1 + 0.42 * Math.sin((t * Math.PI) / 2) ** 0.7;
    case "tulip":
      return 0.1 + 0.3 * Math.sin(t * Math.PI * 0.9) ** 0.8 + 0.18 * t ** 3;
    case "urn":
      return 0.1 + 0.4 * Math.sin(t * Math.PI * 0.82) ** 0.6;
  }
};

interface Cup {
  shape: AwardCupShape;
  top: number;
  rim: number;
  radiusAt: (t: number) => number;
  heightAt: (t: number) => number;
}

const buildCup = (shape: AwardCupShape): Cup => {
  const height = cupHeights[shape];
  return {
    shape,
    top: cupBottom + height,
    rim: cupRadiusAt(shape, 1),
    radiusAt: (t) => cupRadiusAt(shape, t),
    heightAt: (t) => cupBottom + height * t,
  };
};

const footAndStem: readonly [number, number][] = [
  [0, plinthTop],
  [0.36, plinthTop],
  [0.372, 0.414],
  [0.362, 0.438],
  [0.3, 0.468],
  [0.22, 0.5],
  [0.145, 0.548],
  [0.095, 0.6],
  [0.072, 0.66],
  [0.066, 0.72],
  [0.088, 0.752],
  [0.122, 0.778],
  [0.132, 0.8],
  [0.122, 0.822],
  [0.088, 0.848],
  [0.066, 0.88],
  [0.07, 0.94],
  [0.092, 0.976],
];

const cupSteps = 22;

// One profile from the foot's rim, up the stem and the outside of the
// cup, over its rolled lip and down the inside, turned into one mesh.
const buildBodyProfile = (cup: Cup): Vector2[] => {
  const outside = Array.from({ length: cupSteps + 1 }, (_, step) => {
    const t = step / cupSteps;
    return new Vector2(cup.radiusAt(t), cup.heightAt(t));
  });
  const { rim, top } = cup;
  const lip = [
    new Vector2(rim + 0.018, top + 0.006),
    new Vector2(rim + 0.026, top + 0.02),
    new Vector2(rim + 0.014, top + 0.034),
    new Vector2(rim - 0.012, top + 0.03),
    new Vector2(rim - 0.03, top + 0.012),
  ];
  const inside = Array.from({ length: cupSteps - 4 }, (_, step) => {
    const t = 1 - step / cupSteps;
    return new Vector2(
      Math.max(cup.radiusAt(t) - 0.034, 0.02),
      cup.heightAt(t) - 0.004,
    );
  });
  return [
    ...footAndStem.map(([radius, height]) => new Vector2(radius, height)),
    ...outside,
    ...lip,
    ...inside,
    new Vector2(0, cup.heightAt(0.12)),
  ];
};

const lidSteps = 14;
const lidHeight = 0.15;

const buildLidProfile = (cup: Cup): Vector2[] => {
  const base = cup.top + 0.03;
  const edge = cup.rim + 0.012;
  return [
    new Vector2(edge - 0.035, base - 0.025),
    new Vector2(edge, base - 0.012),
    new Vector2(edge + 0.008, base + 0.006),
    ...Array.from({ length: lidSteps + 1 }, (_, step) => {
      const angle = (step / lidSteps) * (Math.PI / 2);
      return new Vector2(
        Math.max(edge * Math.cos(angle), 0.035),
        base + lidHeight * Math.sin(angle) ** 1.4,
      );
    }),
    new Vector2(0.05, base + lidHeight + 0.012),
    new Vector2(0.03, base + lidHeight + 0.03),
    new Vector2(0, base + lidHeight + 0.032),
  ];
};

const findLidTop = (cup: Cup) => cup.top + 0.03 + lidHeight + 0.032;

const lathe = (profile: Vector2[], segments = turnedSegments) =>
  new LatheGeometry(profile, segments);

const roundedBox = (
  width: number,
  height: number,
  depth: number,
  radius: number,
) => new RoundedBoxGeometry(width, height, depth, 3, radius);

const ring = (radius: number, tube: number) =>
  new TorusGeometry(radius, tube, 10, 64);

const buildPlinth = (): AwardPart[] => [
  {
    geometry: roundedBox(1, 0.24, 1, 0.045),
    finish: "plinth",
    at: [0, 0.12, 0],
  },
  {
    geometry: roundedBox(0.86, 0.026, 0.86, 0.012),
    finish: "trim",
    at: [0, 0.253, 0],
  },
  {
    geometry: roundedBox(0.78, 0.13, 0.78, 0.035),
    finish: "plinth",
    at: [0, 0.331, 0],
  },
  {
    geometry: roundedBox(0.58, 0.12, 0.024, 0.01),
    finish: "trim",
    at: [0, 0.12, 0.502],
  },
  {
    geometry: new BoxGeometry(0.46, 0.012, 0.01),
    finish: "dark",
    at: [0, 0.135, 0.516],
  },
  {
    geometry: new BoxGeometry(0.34, 0.012, 0.01),
    finish: "dark",
    at: [0, 0.105, 0.516],
  },
];

const buildHandles = (cup: Cup): AwardPart[] =>
  [-1, 1].map((side) => {
    const high = 0.84;
    const low = 0.3;
    const curve = new CubicBezierCurve3(
      new Vector3(side * (cup.radiusAt(high) - 0.012), cup.heightAt(high), 0),
      new Vector3(side * (cup.rim + 0.3), cup.heightAt(0.98), 0),
      new Vector3(side * (cup.rim + 0.2), cup.heightAt(0.3), 0),
      new Vector3(side * (cup.radiusAt(low) - 0.012), cup.heightAt(low), 0),
    );
    return {
      geometry: new TubeGeometry(curve, 48, 0.022, 12, false),
      finish: "metal",
    };
  });

const buildCupDetails = (cup: Cup): AwardPart[] => {
  const middle = 0.5;
  const front = cup.radiusAt(middle);
  return [
    {
      geometry: ring(0.13, 0.018),
      finish: "trim",
      at: [0, 0.8, 0],
      turn: [Math.PI / 2, 0, 0],
    },
    {
      geometry: ring(cup.radiusAt(0.18) + 0.004, 0.012),
      finish: "trim",
      at: [0, cup.heightAt(0.18), 0],
      turn: [Math.PI / 2, 0, 0],
    },
    {
      geometry: ring(cup.rim + 0.016, 0.014),
      finish: "trim",
      at: [0, cup.top + 0.03, 0],
      turn: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new OctahedronGeometry(0.07, 0),
      finish: "gem",
      at: [0, cup.heightAt(middle), front + 0.012],
      scale: [1, 1.3, 0.6],
    },
    {
      geometry: ring(0.078, 0.012),
      finish: "trim",
      at: [0, cup.heightAt(middle), front - 0.004],
      scale: [1, 1.28, 1],
    },
    {
      geometry: new SphereGeometry(0.055, 32, 20),
      finish: "trim",
      at: [0, findLidTop(cup) + 0.04, 0],
    },
  ];
};

const smoothSphere = (radius: number) => new SphereGeometry(radius, 24, 16);

const buildStar = (): AwardPart[] => {
  const shape = new Shape();
  const points = 5;
  for (let corner = 0; corner <= points * 2; corner += 1) {
    const radius = corner % 2 === 0 ? 0.24 : 0.1;
    const angle = Math.PI / 2 + (corner * Math.PI) / points;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (corner === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  const star = new ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.016,
    bevelSegments: 4,
  });
  star.center();
  return [
    { geometry: star, finish: "trim", at: [0, 0.27, 0] },
    {
      geometry: new OctahedronGeometry(0.05, 0),
      finish: "gem",
      at: [0, 0.27, 0.045],
      scale: [1, 1, 0.55],
    },
    {
      geometry: new CylinderGeometry(0.02, 0.03, 0.06, 20),
      finish: "metal",
      at: [0, 0.02, 0],
    },
  ];
};

const buildFlower = (): AwardPart[] => {
  const centre = 0.25;
  const petals = 8;
  return [
    ...Array.from({ length: petals }, (_, petal): AwardPart => {
      const angle = (petal / petals) * Math.PI * 2;
      return {
        geometry: smoothSphere(0.1),
        finish: "metal",
        at: [Math.cos(angle) * 0.12, centre + Math.sin(angle) * 0.12, 0],
        turn: [0, 0, angle - Math.PI / 2],
        scale: [0.55, 1, 0.24],
      };
    }),
    {
      geometry: smoothSphere(0.07),
      finish: "gem",
      at: [0, centre, 0.025],
      scale: [1, 1, 0.6],
    },
    {
      geometry: new CylinderGeometry(0.018, 0.024, 0.12, 20),
      finish: "trim",
      at: [0, 0.06, 0],
    },
    ...[-1, 1].map((side): AwardPart => ({
      geometry: smoothSphere(0.06),
      finish: "trim",
      at: [side * 0.06, 0.07, 0],
      turn: [0, 0, side * -0.9],
      scale: [0.45, 1, 0.2],
    })),
  ];
};

const buildSnowflake = (): AwardPart[] => {
  const centre = 0.27;
  return [
    ...Array.from({ length: 6 }, (_, arm): AwardPart[] => {
      const angle = (arm / 6) * Math.PI * 2;
      const along = (distance: number): [number, number, number] => [
        Math.sin(angle) * distance,
        centre + Math.cos(angle) * distance,
        0,
      ];
      return [
        {
          geometry: new CapsuleGeometry(0.018, 0.2, 4, 10),
          finish: "trim",
          at: along(0.12),
          turn: [0, 0, -angle],
        },
        ...[-1, 1].map((side): AwardPart => ({
          geometry: new CapsuleGeometry(0.012, 0.07, 4, 8),
          finish: "trim",
          at: along(0.16),
          turn: [0, 0, -angle + side * (Math.PI / 4)],
        })),
        {
          geometry: new OctahedronGeometry(0.022, 0),
          finish: "gem",
          at: along(0.245),
        },
      ];
    }).flat(),
    {
      geometry: new CylinderGeometry(0.055, 0.055, 0.035, 6),
      finish: "gem",
      at: [0, centre, 0],
      turn: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.018, 0.026, 0.06, 20),
      finish: "metal",
      at: [0, 0.02, 0],
    },
  ];
};

const buildSun = (): AwardPart[] => {
  const centre = 0.25;
  const rays = 12;
  return [
    {
      geometry: new CylinderGeometry(0.14, 0.14, 0.05, turnedSegments),
      finish: "metal",
      at: [0, centre, 0],
      turn: [Math.PI / 2, 0, 0],
    },
    {
      geometry: ring(0.14, 0.014),
      finish: "trim",
      at: [0, centre, 0],
    },
    ...Array.from({ length: rays }, (_, ray): AwardPart => {
      const angle = (ray / rays) * Math.PI * 2;
      const length = ray % 2 === 0 ? 0.13 : 0.085;
      const distance = 0.14 + length / 2;
      return {
        geometry: new ConeGeometry(0.032, length, 16),
        finish: "trim",
        at: [
          Math.sin(angle) * distance,
          centre + Math.cos(angle) * distance,
          0,
        ],
        turn: [0, 0, -angle],
        scale: [1, 1, 0.45],
      };
    }),
    {
      geometry: smoothSphere(0.075),
      finish: "gem",
      at: [0, centre, 0.02],
      scale: [1, 1, 0.55],
    },
  ];
};

const teardrop = (height: number, width: number) =>
  lathe(
    Array.from({ length: 21 }, (_, step) => {
      const t = step / 20;
      return new Vector2(
        width * Math.sin(Math.PI * t) ** 0.75 * (1 - 0.55 * t),
        height * t,
      );
    }),
    40,
  );

const buildFlame = (): AwardPart[] => [
  {
    geometry: lathe([
      new Vector2(0, 0),
      new Vector2(0.05, 0),
      new Vector2(0.06, 0.03),
      new Vector2(0.13, 0.07),
      new Vector2(0.15, 0.1),
      new Vector2(0.13, 0.105),
      new Vector2(0, 0.08),
    ]),
    finish: "trim",
  },
  { geometry: teardrop(0.42, 0.12), finish: "glow", at: [0, 0.07, 0] },
  ...[-1, 1].map((side): AwardPart => ({
    geometry: teardrop(0.27, 0.075),
    finish: "glow",
    at: [side * 0.075, 0.08, 0.01],
    turn: [0, 0, side * -0.38],
  })),
  {
    geometry: teardrop(0.2, 0.055),
    finish: "gem",
    at: [0, 0.085, 0.04],
  },
];

const buildJaguar = (): AwardPart[] => {
  const centre = 0.21;
  return [
    {
      geometry: smoothSphere(0.16),
      finish: "metal",
      at: [0, centre, 0],
      scale: [1.05, 0.92, 0.95],
    },
    {
      geometry: smoothSphere(0.085),
      finish: "trim",
      at: [0, centre - 0.05, 0.11],
      scale: [1.15, 0.78, 0.85],
    },
    {
      geometry: smoothSphere(0.026),
      finish: "dark",
      at: [0, centre - 0.015, 0.18],
      scale: [1.35, 0.85, 0.8],
    },
    ...[-1, 1].flatMap((side): AwardPart[] => [
      {
        geometry: smoothSphere(0.03),
        finish: "gem",
        at: [side * 0.062, centre + 0.035, 0.128],
        scale: [1.2, 0.85, 0.6],
      },
      {
        geometry: new ConeGeometry(0.055, 0.09, 24),
        finish: "metal",
        at: [side * 0.105, centre + 0.135, -0.01],
        turn: [0, 0, side * -0.45],
        scale: [1, 1, 0.55],
      },
      {
        geometry: new ConeGeometry(0.032, 0.055, 20),
        finish: "dark",
        at: [side * 0.103, centre + 0.128, 0.014],
        turn: [0, 0, side * -0.45],
        scale: [1, 1, 0.4],
      },
      {
        geometry: smoothSphere(0.012),
        finish: "dark",
        at: [side * 0.1, centre + 0.07, 0.12],
      },
      {
        geometry: smoothSphere(0.012),
        finish: "dark",
        at: [side * 0.13, centre - 0.02, 0.09],
      },
    ]),
    {
      geometry: new CylinderGeometry(0.03, 0.04, 0.06, 20),
      finish: "metal",
      at: [0, 0.03, 0],
    },
  ];
};

const emblemBuilders: Record<AwardEmblem, () => AwardPart[]> = {
  star: buildStar,
  flower: buildFlower,
  snowflake: buildSnowflake,
  sun: buildSun,
  flame: buildFlame,
  jaguar: buildJaguar,
};

const emblemScale = 1.05;

/** The tallest emblem, the snowflake, from its base to its top arm's tip. */
const emblemHeight = 0.56;

const placeEmblem = (parts: AwardPart[], base: number): AwardPart[] => {
  const emblem = new Matrix4()
    .makeTranslation(0, base, 0)
    .multiply(new Matrix4().makeScale(emblemScale, emblemScale, emblemScale));
  return parts.map((part) => {
    part.geometry.applyMatrix4(emblem.clone().multiply(findPartMatrix(part)));
    return { geometry: part.geometry, finish: part.finish };
  });
};

const findPartMatrix = ({ at, turn, scale }: AwardPart): Matrix4 => {
  const size =
    scale === undefined
      ? new Vector3(1, 1, 1)
      : typeof scale === "number"
        ? new Vector3(scale, scale, scale)
        : new Vector3(...scale);
  return new Matrix4().compose(
    new Vector3(...(at ?? [0, 0, 0])),
    new Quaternion().setFromEuler(new Euler(...(turn ?? [0, 0, 0]))),
    size,
  );
};

const buildShadow = (): BufferGeometry => {
  const shadow = new CircleGeometry(0.95, turnedSegments);
  const positions = shadow.getAttribute("position");
  const colours = new Float32Array(positions.count * 4);
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const distance = Math.hypot(positions.getX(vertex), positions.getY(vertex));
    colours.set([0, 0, 0, 0.55 * (1 - distance / 0.95) ** 1.6], vertex * 4);
  }
  shadow.setAttribute("color", new BufferAttribute(colours, 4));
  shadow.rotateX(-Math.PI / 2);
  shadow.translate(0, 0.002, 0);
  return shadow;
};

const finishOrder: readonly AwardFinish[] = [
  "plinth",
  "metal",
  "trim",
  "gem",
  "glow",
  "dark",
];

// Merging needs every part alike, so each is made non-indexed and keeps
// only its positions and normals.
const prepareForMerging = (geometry: BufferGeometry): BufferGeometry => {
  const flat = geometry.index === null ? geometry : geometry.toNonIndexed();
  if (flat !== geometry) {
    geometry.dispose();
  }
  for (const attribute of Object.keys(flat.attributes)) {
    if (attribute !== "position" && attribute !== "normal") {
      flat.deleteAttribute(attribute);
    }
  }
  flat.clearGroups();
  return flat;
};

/** Every mesh of one Award, one per finish it uses and its soft shadow. */
export const buildAwardMeshes = (design: AwardDesign): AwardMesh[] => {
  const cup = buildCup(design.cup);
  const lidTop = findLidTop(cup);
  const unplaced: AwardPart[] = [
    ...buildPlinth(),
    { geometry: lathe(buildBodyProfile(cup)), finish: "metal" },
    { geometry: lathe(buildLidProfile(cup)), finish: "metal" },
    ...buildHandles(cup),
    ...buildCupDetails(cup),
  ];
  const placed = unplaced.map((part): AwardPart => {
    part.geometry.applyMatrix4(findPartMatrix(part));
    return { geometry: part.geometry, finish: part.finish };
  });
  const parts = [
    ...placed,
    ...placeEmblem(emblemBuilders[design.emblem](), lidTop + 0.07),
  ];
  const meshes = finishOrder.flatMap((finish): AwardMesh[] => {
    const geometries = parts
      .filter((part) => part.finish === finish)
      .map(({ geometry }) => prepareForMerging(geometry));
    if (geometries.length === 0) {
      return [];
    }
    const merged = mergeGeometries(geometries);
    geometries.forEach((geometry) => {
      geometry.dispose();
    });
    return [{ name: `award-${finish}`, finish, geometry: merged }];
  });
  return [
    ...meshes,
    { name: "award-shadow", finish: "shadow", geometry: buildShadow() },
  ];
};

/** The height of an Award from the floor to the top of its emblem. */
export const findAwardHeight = (design: AwardDesign): number =>
  findLidTop(buildCup(design.cup)) + 0.07 + emblemHeight * emblemScale;

/** The materials of one Award's finishes, polished to catch the studio's reflections. */
export const buildAwardMaterials = (
  design: AwardDesign,
): Record<AwardFinish, Material> => {
  const isIcy = design.emblem === "snowflake";
  return {
    plinth: new MeshPhysicalMaterial({
      color: design.plinth,
      roughness: 0.3,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    }),
    metal: new MeshPhysicalMaterial({
      color: design.metal,
      roughness: 0.14,
      metalness: 1,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1,
    }),
    trim: new MeshPhysicalMaterial({
      color: design.trim,
      roughness: isIcy ? 0.08 : 0.22,
      metalness: isIcy ? 0.6 : 1,
      iridescence: isIcy ? 1 : 0,
      iridescenceIOR: 1.6,
      clearcoat: isIcy ? 1 : 0.2,
    }),
    gem: new MeshPhysicalMaterial({
      color: design.gem,
      roughness: 0.04,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      ior: 2.4,
      emissive: design.gem,
      emissiveIntensity: 0.28,
      flatShading: true,
    }),
    glow: new MeshPhysicalMaterial({
      color: "#ffd166",
      emissive: design.isEmblemGlowing ? "#ff7a1a" : design.gem,
      emissiveIntensity: 1.5,
      roughness: 0.35,
      metalness: 0,
    }),
    dark: new MeshPhysicalMaterial({
      color: "#1b1712",
      roughness: 0.32,
      metalness: 0.4,
    }),
    shadow: new MeshBasicMaterial({
      color: "#000000",
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    }),
  };
};
