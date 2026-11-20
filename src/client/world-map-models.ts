import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  IcosahedronGeometry,
  Matrix4,
  Path,
  PlaneGeometry,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type ColorRepresentation,
} from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  findDistanceToFootpath,
  findDistanceToFreshWater,
  findFieldPatch,
  findLayeredNoise,
  findSmoothNoise,
  findTerrainHeight,
  newLandRiverHalfWidth,
  snowLine,
  volcanoPosition,
  type FieldCrop,
  type MapPoint,
} from "./world-map-terrain.js";

export type Triple = [number, number, number];

export interface ModelPart {
  geometry: BufferGeometry;
  colour: ColorRepresentation;
  position?: Triple;
  rotation?: Triple;
  scale?: Triple | number;
  roughen?: number;
  isSmooth?: boolean;
}

const shadeFromAbove = (upness: number): number =>
  0.72 + 0.28 * (upness * 0.5 + 0.5);

const buildPartMatrix = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: ModelPart): Matrix4 => {
  const scaleVector =
    typeof scale === "number"
      ? new Vector3(scale, scale, scale)
      : new Vector3(...scale);
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromEuler(new Euler(...rotation)),
    scaleVector,
  );
};

const roughenVertices = (geometry: BufferGeometry, amount: number) => {
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const push =
      1 +
      amount *
        (findSmoothNoise(x * 3.1 + z * 1.7 + 11, y * 3.3 - z * 0.9) - 0.5);
    positions.setXYZ(index, x * push, y * push, z * push);
  }
};

export const buildModelGeometry = (parts: ModelPart[]): BufferGeometry => {
  const prepared = parts.map((part) => {
    const shaped = part.geometry.clone();
    part.geometry.dispose();
    shaped.deleteAttribute("uv");
    if (part.isSmooth === true) {
      shaped.deleteAttribute("normal");
    }
    const welded = part.isSmooth === true ? mergeVertices(shaped) : shaped;
    if (part.roughen !== undefined) {
      roughenVertices(welded, part.roughen);
    }
    welded.applyMatrix4(buildPartMatrix(part));
    welded.computeVertexNormals();
    const flat = welded.index === null ? welded : welded.toNonIndexed();
    const colour = new Color(part.colour);
    const normals = flat.getAttribute("normal");
    const vertexCount = flat.getAttribute("position").count;
    const colours = new Float32Array(vertexCount * 3);
    for (let index = 0; index < vertexCount; index++) {
      colour
        .clone()
        .multiplyScalar(shadeFromAbove(normals.getY(index)))
        .toArray(colours, index * 3);
    }
    flat.setAttribute("color", new BufferAttribute(colours, 3));
    return flat;
  });
  const merged = mergeGeometries(prepared);
  for (const geometry of prepared) {
    geometry.dispose();
  }
  return merged;
};

export const fadeModelColours = (geometry: BufferGeometry): BufferGeometry => {
  const faded = geometry.clone();
  const colours = faded.getAttribute("color");
  const colour = new Color();
  const hsl = { h: 0, s: 0, l: 0 };
  for (let index = 0; index < colours.count; index++) {
    colour.fromBufferAttribute(colours, index).getHSL(hsl);
    colour.setHSL(hsl.h, hsl.s * 0.12, 0.35 + hsl.l * 0.45);
    colours.setXYZ(index, colour.r, colour.g, colour.b);
  }
  return faded;
};

const groundColours = {
  seabed: new Color("#b9a77c"),
  deepSeabed: new Color("#5d7f78"),
  wetSand: new Color("#c9b48a"),
  sand: new Color("#ead9ac"),
  lushGrass: new Color("#4f8f35"),
  meadow: new Color("#78a948"),
  dryGrass: new Color("#a6ad5c"),
  forestFloor: new Color("#3d6a2c"),
  cliff: new Color("#7a7064"),
  darkCliff: new Color("#55504a"),
  basalt: new Color("#3b3533"),
  ash: new Color("#6a5f58"),
  snow: new Color("#f3f6fa"),
  footpath: new Color("#b59b72"),
  riverBank: new Color("#8a7a5c"),
} as const;

const cropColours: Record<FieldCrop, [Color, Color]> = {
  wheat: [new Color("#d8b45a"), new Color("#c49a3c")],
  barley: [new Color("#9fbf55"), new Color("#86a845")],
  ploughed: [new Color("#7a5a3e"), new Color("#65482f")],
};

const smoothRise = (edge0: number, edge1: number, value: number): number => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export const findGroundColour = (
  x: number,
  z: number,
  height: number,
  upness: number,
  meadowGreen: Color,
): Color => {
  const point = { x, z };
  const speckle = findLayeredNoise({ x: x * 1.7, z: z * 1.7 }, 3);
  const broad = findLayeredNoise({ x: x * 0.21, z: z * 0.21 }, 3);

  if (height < 0) {
    return groundColours.seabed
      .clone()
      .lerp(groundColours.deepSeabed, smoothRise(0, -1.6, height));
  }

  const grass = groundColours.lushGrass
    .clone()
    .lerp(meadowGreen, smoothRise(-0.2, 0.25, broad))
    .lerp(groundColours.dryGrass, smoothRise(0.12, 0.3, broad + speckle * 0.3))
    .lerp(groundColours.forestFloor, smoothRise(-0.1, -0.3, speckle + broad));

  const field = findFieldPatch(point);
  if (field !== undefined && height > 0.4 && upness > 0.9) {
    const [light, dark] = cropColours[field.crop];
    const furrow = Math.sin(
      (x * Math.cos(field.furrowAngle) + z * Math.sin(field.furrowAngle)) * 9,
    );
    grass.copy(light.clone().lerp(dark, furrow > 0 ? 0.65 : 0));
  }

  const sandLine = 0.32 + speckle * 0.25;
  let colour = grass.lerp(
    groundColours.sand,
    1 - smoothRise(sandLine - 0.1, sandLine + 0.12, height),
  );
  colour.lerp(groundColours.wetSand, 1 - smoothRise(0, 0.12, height));

  const riverDistance = findDistanceToFreshWater(point);
  colour.lerp(groundColours.riverBank, 1 - smoothRise(0.9, 1.9, riverDistance));

  const pathDistance = findDistanceToFootpath(point);
  colour.lerp(
    groundColours.footpath,
    (1 - smoothRise(0.18, 0.42, pathDistance + speckle * 0.2)) * 0.9,
  );

  const steepness = 1 - smoothRise(0.62, 0.86, upness + speckle * 0.08);
  const cliff = groundColours.cliff
    .clone()
    .lerp(groundColours.darkCliff, smoothRise(-0.1, 0.2, speckle));
  colour.lerp(cliff, height > 0.8 ? steepness : 0);
  colour.lerp(cliff, smoothRise(4.2, 5.4, height + speckle * 1.5));

  const volcanoDistance = Math.hypot(
    x - volcanoPosition.x,
    z - volcanoPosition.z,
  );
  const volcanic = 1 - smoothRise(3.2, 5.6, volcanoDistance + speckle * 1.5);
  colour = colour.lerp(
    groundColours.basalt
      .clone()
      .lerp(groundColours.ash, smoothRise(-0.1, 0.25, speckle)),
    volcanic,
  );

  const snowHeight = snowLine - 0.6 + speckle * 1.6;
  const snowCover =
    smoothRise(snowHeight, snowHeight + 0.6, height) *
    smoothRise(0.5, 0.75, upness);
  colour.lerp(groundColours.snow, snowCover);

  return colour.multiplyScalar(0.94 + speckle * 0.22);
};

export interface LandSurfaceGrid {
  width: number;
  depth: number;
  columns: number;
  rows: number;
}

export type GroundPainter = (
  x: number,
  z: number,
  height: number,
  upness: number,
) => Color;

export const buildLandSurface = (
  { width, depth, columns, rows }: LandSurfaceGrid,
  findHeight: (point: MapPoint) => number,
  paintGround: GroundPainter,
): BufferGeometry => {
  const geometry = new PlaneGeometry(width, depth, columns, rows);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    positions.setY(
      index,
      findHeight({ x: positions.getX(index), z: positions.getZ(index) }),
    );
  }
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute("normal");
  const colours = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index++) {
    paintGround(
      positions.getX(index),
      positions.getZ(index),
      positions.getY(index),
      normals.getY(index),
    ).toArray(colours, index * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colours, 3));
  return geometry;
};

export const buildTerrainSurface = (
  width: number,
  depth: number,
  columns: number,
  rows: number,
  meadowColour: ColorRepresentation,
): BufferGeometry => {
  const meadowGreen = new Color(meadowColour).lerp(groundColours.meadow, 0.55);
  return buildLandSurface(
    { width, depth, columns, rows },
    findTerrainHeight,
    (x, z, height, upness) =>
      findGroundColour(x, z, height, upness, meadowGreen),
  );
};

export const buildRibbonGeometry = (
  course: readonly MapPoint[],
  samples: number,
  findHalfWidth: (along: number) => number,
  findLift: (point: MapPoint) => number,
): BufferGeometry => {
  const curve = new CatmullRomCurve3(
    course.map(({ x, z }) => new Vector3(x, 0, z)),
  );
  const points = curve.getSpacedPoints(samples);
  const vertices = points.flatMap((point, index) => {
    const next = points[Math.min(index + 1, points.length - 1)];
    const previous = points[Math.max(index - 1, 0)];
    const across = new Vector3(
      -(next.z - previous.z),
      0,
      next.x - previous.x,
    ).normalize();
    const halfWidth = findHalfWidth(index / points.length);
    const height = findLift({ x: point.x, z: point.z });
    return [
      point.x + across.x * halfWidth,
      height,
      point.z + across.z * halfWidth,
      point.x - across.x * halfWidth,
      height,
      point.z - across.z * halfWidth,
    ];
  });
  const textureCoordinates = points.flatMap((_, index) => {
    const along = index / (points.length - 1);
    return [0, along, 1, along];
  });
  const faces = points.slice(1).flatMap((_, index) => {
    const left = index * 2;
    return [left, left + 2, left + 1, left + 1, left + 2, left + 3];
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(vertices), 3),
  );
  geometry.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array(textureCoordinates), 2),
  );
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
};

export const buildNewLandRiverGeometry = (
  rivers: readonly (readonly MapPoint[])[],
  findHeight: (point: MapPoint) => number,
): BufferGeometry =>
  mergeGeometries(
    rivers.map((course) =>
      buildRibbonGeometry(
        course,
        course.length * 12,
        (along) => newLandRiverHalfWidth + 0.2 + along * 0.25,
        (point) => Math.max(0.02, findHeight(point) + 0.1),
      ),
    ),
  );

export const buildPineGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.05, 0.09, 0.6, 6),
      colour: "#5b3a24",
      position: [0, 0.3, 0],
    },
    ...[0, 1, 2, 3].map((tier) => ({
      geometry: new ConeGeometry(0.62 - tier * 0.12, 0.85 - tier * 0.08, 9, 2),
      colour: ["#24502f", "#2a5c34", "#31683a", "#3a7543"][tier],
      position: [0, 0.65 + tier * 0.42, 0] satisfies Triple,
      rotation: [0, tier * 0.7, 0] satisfies Triple,
      roughen: 0.22,
    })),
  ]);

export const buildBroadleafGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.07, 0.12, 0.9, 7),
      colour: "#6b4a2f",
      position: [0, 0.45, 0],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.05, 0.5, 5),
      colour: "#6b4a2f",
      position: [0.16, 0.85, 0],
      rotation: [0, 0, -0.7],
    },
    ...[
      { at: [0, 1.25, 0], size: 0.58, colour: "#3f7a32" },
      { at: [0.36, 1.05, 0.12], size: 0.42, colour: "#4a8a38" },
      { at: [-0.3, 1.08, -0.16], size: 0.44, colour: "#386e2d" },
      { at: [0.08, 1.58, -0.08], size: 0.36, colour: "#5a9c45" },
    ].map(({ at, size, colour }) => ({
      geometry: new IcosahedronGeometry(size, size < 0.4 ? 0 : 1),
      colour,
      position: [at[0], at[1], at[2]] satisfies Triple,
      roughen: 0.35,
      isSmooth: true,
    })),
  ]);

export const buildBushGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(0.32, 0),
      colour: "#4b8436",
      position: [0, 0.16, 0],
      scale: [1.2, 0.75, 1],
      roughen: 0.4,
      isSmooth: true,
    },
    {
      geometry: new IcosahedronGeometry(0.22, 0),
      colour: "#5c9a40",
      position: [0.25, 0.12, 0.08],
      roughen: 0.4,
      isSmooth: true,
    },
  ]);

export const buildRockGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(0.55, 1),
      colour: "#8b857c",
      scale: [1.2, 0.7, 1],
      roughen: 0.55,
    },
    {
      geometry: new IcosahedronGeometry(0.3, 1),
      colour: "#77716a",
      position: [0.45, -0.08, 0.2],
      roughen: 0.5,
    },
  ]);

const buildGableRoof = (width: number, rise: number, length: number) => {
  const outline = new Shape();
  outline.moveTo(-width / 2, 0);
  outline.lineTo(width / 2, 0);
  outline.lineTo(0, rise);
  outline.closePath();
  const roof = new ExtrudeGeometry(outline, {
    depth: length,
    bevelEnabled: false,
  });
  roof.translate(0, 0, -length / 2);
  return roof;
};

export const buildCottageGeometry = (): BufferGeometry => {
  const plaster = "#efe4cf";
  const timber = "#4a3424";
  const stone = "#8d8478";
  const glass = "#9ec4d6";
  return buildModelGeometry([
    {
      geometry: new BoxGeometry(1.04, 0.14, 0.84),
      colour: stone,
      position: [0, 0.07, 0],
    },
    {
      geometry: new BoxGeometry(0.98, 0.62, 0.78),
      colour: plaster,
      position: [0, 0.45, 0],
    },
    ...[-1, 1].flatMap((side) =>
      [-1, 1].map((end) => ({
        geometry: new BoxGeometry(0.07, 0.64, 0.07),
        colour: timber,
        position: [side * 0.49, 0.45, end * 0.39] satisfies Triple,
      })),
    ),
    ...[-1, 1].map((end) => ({
      geometry: new BoxGeometry(1.0, 0.06, 0.06),
      colour: timber,
      position: [0, 0.74, end * 0.4] satisfies Triple,
    })),
    {
      geometry: buildGableRoof(1.26, 0.55, 1.12),
      colour: "#a34a32",
      position: [0, 0.76, 0],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      geometry: new BoxGeometry(0.16, 0.5, 0.16),
      colour: stone,
      position: [0.26, 1.08, 0.18],
    },
    {
      geometry: new BoxGeometry(0.2, 0.36, 0.04),
      colour: timber,
      position: [0, 0.32, 0.4],
    },
    ...[-0.3, 0.3].map((across) => ({
      geometry: new BoxGeometry(0.16, 0.16, 0.04),
      colour: glass,
      position: [across, 0.5, 0.4] satisfies Triple,
    })),
    ...[-0.2, 0.2].map((across) => ({
      geometry: new BoxGeometry(0.04, 0.16, 0.16),
      colour: glass,
      position: [0.5, 0.5, across] satisfies Triple,
    })),
  ]);
};

const buildCrenellations = (
  centre: Triple,
  radius: number,
  count: number,
  colour: string,
): ModelPart[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return {
      geometry: new BoxGeometry(0.12, 0.14, 0.12),
      colour,
      position: [
        centre[0] + Math.cos(angle) * radius,
        centre[1],
        centre[2] + Math.sin(angle) * radius,
      ] satisfies Triple,
      rotation: [0, -angle, 0] satisfies Triple,
    };
  });

const buildWallMerlons = (
  from: Triple,
  to: Triple,
  colour: string,
): ModelPart[] => {
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const count = Math.floor(length / 0.26);
  return Array.from({ length: count }, (_, index) => {
    const along = (index + 0.5) / count;
    return {
      geometry: new BoxGeometry(0.12, 0.13, 0.16),
      colour,
      position: [
        from[0] + (to[0] - from[0]) * along,
        from[1],
        from[2] + (to[2] - from[2]) * along,
      ] satisfies Triple,
      rotation: [
        0,
        Math.atan2(to[0] - from[0], to[2] - from[2]),
        0,
      ] satisfies Triple,
    };
  });
};

export const buildCastleGeometry = (bannerColour: string): BufferGeometry => {
  const stone = "#d9d2c3";
  const darkStone = "#a39a8a";
  const slate = "#3d5a8f";
  const half = 1.15;
  const wallHeight = 0.75;
  const corners: Triple[] = [
    [-half, 0, -half],
    [half, 0, -half],
    [half, 0, half],
    [-half, 0, half],
  ];
  const towers = corners.flatMap(([x, , z]) => [
    {
      geometry: new CylinderGeometry(0.3, 0.34, 1.3, 16),
      colour: stone,
      position: [x, 0.65, z] satisfies Triple,
    },
    ...buildCrenellations([x, 1.36, z], 0.29, 8, stone),
    {
      geometry: new ConeGeometry(0.4, 0.75, 16),
      colour: slate,
      position: [x, 1.8, z] satisfies Triple,
    },
  ]);
  const walls = corners.flatMap((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    const length = Math.hypot(next[0] - corner[0], next[2] - corner[2]);
    const middle: Triple = [
      (corner[0] + next[0]) / 2,
      wallHeight / 2,
      (corner[2] + next[2]) / 2,
    ];
    return [
      {
        geometry: new BoxGeometry(0.2, wallHeight, length),
        colour: darkStone,
        position: middle,
        rotation: [
          0,
          Math.atan2(next[0] - corner[0], next[2] - corner[2]),
          0,
        ] satisfies Triple,
      },
      ...buildWallMerlons(
        [corner[0], wallHeight + 0.06, corner[2]],
        [next[0], wallHeight + 0.06, next[2]],
        darkStone,
      ),
    ];
  });
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.9, 2.3, 0.6, 14, 2),
      colour: "#8a8378",
      position: [0, -0.28, 0],
      roughen: 0.18,
      isSmooth: true,
    },
    ...walls,
    ...towers,
    {
      geometry: new BoxGeometry(1.0, 1.5, 0.9),
      colour: stone,
      position: [0, 0.75, -0.1],
    },
    {
      geometry: new ConeGeometry(0.78, 0.7, 4),
      colour: slate,
      position: [0, 1.85, -0.1],
      rotation: [0, Math.PI / 4, 0],
    },
    {
      geometry: new CylinderGeometry(0.24, 0.26, 2.6, 16),
      colour: stone,
      position: [0.32, 1.3, 0.12],
    },
    ...buildCrenellations([0.32, 2.66, 0.12], 0.23, 7, stone),
    {
      geometry: new ConeGeometry(0.34, 1.0, 16),
      colour: "#b23a32",
      position: [0.32, 3.2, 0.12],
    },
    {
      geometry: new CylinderGeometry(0.015, 0.015, 0.6, 4),
      colour: "#3b2f25",
      position: [0.32, 3.95, 0.12],
    },
    {
      geometry: new BoxGeometry(0.34, 0.2, 0.02),
      colour: bannerColour,
      position: [0.5, 4.12, 0.12],
    },
    {
      geometry: new BoxGeometry(0.38, 0.5, 0.06),
      colour: "#3a2c22",
      position: [0, 0.25, half + 0.08],
    },
    {
      geometry: new CylinderGeometry(
        0.19,
        0.19,
        0.06,
        12,
        1,
        false,
        0,
        Math.PI,
      ),
      colour: "#3a2c22",
      position: [0, 0.5, half + 0.08],
      rotation: [Math.PI / 2, 0, Math.PI / 2],
    },
    ...[-0.25, 0.25].flatMap((across) =>
      [0.6, 1.1].map((up) => ({
        geometry: new BoxGeometry(0.1, 0.18, 0.04),
        colour: "#2c2a33",
        position: [across, up, 0.36] satisfies Triple,
      })),
    ),
  ]);
};

export const buildCrystalGeometry = (): BufferGeometry =>
  buildModelGeometry(
    [
      {
        at: [0, 0, 0],
        tilt: [0, 0, 0],
        size: 0.32,
        height: 1.6,
        colour: "#b77bff",
      },
      {
        at: [0.45, 0, 0.2],
        tilt: [0.2, 0, -0.45],
        size: 0.22,
        height: 1.1,
        colour: "#d9a8ff",
      },
      {
        at: [-0.4, 0, 0.25],
        tilt: [0.3, 0, 0.5],
        size: 0.24,
        height: 1.2,
        colour: "#8f5bea",
      },
      {
        at: [-0.1, 0, -0.45],
        tilt: [-0.5, 0, 0.1],
        size: 0.2,
        height: 0.95,
        colour: "#7ad7ff",
      },
      {
        at: [0.3, 0, -0.35],
        tilt: [-0.35, 0, -0.3],
        size: 0.16,
        height: 0.7,
        colour: "#c58cff",
      },
      {
        at: [0.75, 0, -0.1],
        tilt: [0.1, 0, -0.8],
        size: 0.13,
        height: 0.55,
        colour: "#9fe8ff",
      },
      {
        at: [-0.75, 0, -0.15],
        tilt: [-0.2, 0, 0.75],
        size: 0.15,
        height: 0.65,
        colour: "#a66cf5",
      },
    ].flatMap(({ at, tilt, size, height, colour }) => {
      const rotation: Triple = [tilt[0], tilt[1], tilt[2]];
      const lean = new Euler(...rotation);
      const shaftCentre = new Vector3(0, height / 2, 0).applyEuler(lean);
      const tipCentre = new Vector3(0, height + size * 0.6, 0).applyEuler(lean);
      return [
        {
          geometry: new CylinderGeometry(size, size * 1.08, height, 6),
          colour,
          position: [
            at[0] + shaftCentre.x,
            at[1] + shaftCentre.y,
            at[2] + shaftCentre.z,
          ] satisfies Triple,
          rotation,
        },
        {
          geometry: new ConeGeometry(size, size * 1.2, 6),
          colour: new Color(colour).lerp(new Color("#ffffff"), 0.25),
          position: [
            at[0] + tipCentre.x,
            at[1] + tipCentre.y,
            at[2] + tipCentre.z,
          ] satisfies Triple,
          rotation,
        },
      ];
    }),
  );

export const buildCaveGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(1.1, 2),
      colour: "#77716a",
      position: [-0.9, 0.3, -0.6],
      scale: [1.1, 0.9, 1],
      roughen: 0.45,
      isSmooth: true,
    },
    {
      geometry: new IcosahedronGeometry(0.9, 2),
      colour: "#86807a",
      position: [0.9, 0.2, -0.7],
      roughen: 0.45,
      isSmooth: true,
    },
    {
      geometry: new IcosahedronGeometry(0.8, 2),
      colour: "#6a655f",
      position: [0, 0.9, -1.0],
      scale: [1.4, 0.8, 1],
      roughen: 0.4,
      isSmooth: true,
    },
    ...[
      { at: [-0.9, 1.05, -0.5], size: 0.55 },
      { at: [0.85, 0.9, -0.6], size: 0.45 },
      { at: [0.1, 1.45, -1.0], size: 0.6 },
    ].map(({ at, size }) => ({
      geometry: new IcosahedronGeometry(size, 2),
      colour: "#5f8a3c",
      position: [at[0], at[1], at[2]] satisfies Triple,
      scale: [1.3, 0.35, 1.1] satisfies Triple,
      roughen: 0.3,
      isSmooth: true,
    })),
    {
      geometry: new SphereGeometry(
        0.62,
        16,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
      colour: "#16121c",
      position: [0, 0, -0.35],
      scale: [1, 1.1, 0.6],
    },
  ]);

export const buildAncientOakGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.3, 0.55, 2.2, 12, 4),
      colour: "#5e4330",
      position: [0, 1.1, 0],
      roughen: 0.25,
    },
    ...[0, 1, 2, 3, 4].map((root) => {
      const angle = (root / 5) * Math.PI * 2;
      return {
        geometry: new ConeGeometry(0.16, 0.9, 6),
        colour: "#57402e",
        position: [
          Math.cos(angle) * 0.45,
          0.15,
          Math.sin(angle) * 0.45,
        ] satisfies Triple,
        rotation: [
          Math.sin(angle) * 1.2,
          0,
          -Math.cos(angle) * 1.2,
        ] satisfies Triple,
      };
    }),
    ...[
      { angle: 0.3, lean: 0.9 },
      { angle: 2.4, lean: 0.8 },
      { angle: 4.3, lean: 1.0 },
    ].map(({ angle, lean }) => ({
      geometry: new CylinderGeometry(0.08, 0.16, 1.3, 7),
      colour: "#5e4330",
      position: [
        Math.cos(angle) * 0.45,
        2.25,
        Math.sin(angle) * 0.45,
      ] satisfies Triple,
      rotation: [
        Math.sin(angle) * lean,
        0,
        -Math.cos(angle) * lean,
      ] satisfies Triple,
    })),
    ...[
      { at: [0, 3.0, 0], size: 1.25, colour: "#2f6b2a" },
      { at: [1.0, 2.6, 0.3], size: 0.9, colour: "#3a7a30" },
      { at: [-0.9, 2.7, 0.4], size: 0.95, colour: "#336f2b" },
      { at: [0.2, 2.6, -1.0], size: 0.9, colour: "#2a6026" },
      { at: [-0.3, 2.5, 1.0], size: 0.85, colour: "#438636" },
      { at: [0.4, 3.6, 0.2], size: 0.8, colour: "#4c913b" },
    ].map(({ at, size, colour }) => ({
      geometry: new IcosahedronGeometry(size, 2),
      colour,
      position: [at[0], at[1], at[2]] satisfies Triple,
      roughen: 0.3,
      isSmooth: true,
    })),
    ...[
      [1.1, 0.9],
      [1.4, 2.1],
      [0.9, 3.9],
      [1.3, 5.0],
    ].flatMap(([radius, angle]) => [
      {
        geometry: new CylinderGeometry(0.035, 0.045, 0.18, 6),
        colour: "#f1e9d6",
        position: [
          Math.cos(angle) * radius,
          0.09,
          Math.sin(angle) * radius,
        ] satisfies Triple,
      },
      {
        geometry: new SphereGeometry(
          0.12,
          10,
          6,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        ),
        colour: "#c8352b",
        position: [
          Math.cos(angle) * radius,
          0.17,
          Math.sin(angle) * radius,
        ] satisfies Triple,
      },
    ]),
  ]);

export const buildBubbleMachineGeometry = (): BufferGeometry => {
  const brass = "#c9a04a";
  const copper = "#b06a3b";
  const wood = "#8a6644";
  return buildModelGeometry([
    ...[-0.6, -0.2, 0.2, 0.6].map((across) => ({
      geometry: new BoxGeometry(0.36, 0.06, 2.2),
      colour: wood,
      position: [across, 0.03, 0] satisfies Triple,
    })),
    {
      geometry: new CylinderGeometry(0.45, 0.5, 0.9, 20),
      colour: brass,
      position: [0, 0.5, -0.3],
    },
    {
      geometry: new SphereGeometry(
        0.45,
        20,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
      colour: brass,
      position: [0, 0.95, -0.3],
    },
    ...[0.2, 0.55, 0.85].map((up) => ({
      geometry: new TorusGeometry(0.48, 0.035, 8, 28),
      colour: copper,
      position: [0, up, -0.3] satisfies Triple,
      rotation: [Math.PI / 2, 0, 0] satisfies Triple,
    })),
    {
      geometry: new CylinderGeometry(0.09, 0.09, 0.7, 10),
      colour: copper,
      position: [0, 1.55, -0.3],
    },
    {
      geometry: new ConeGeometry(0.32, 0.4, 20, 1, true),
      colour: brass,
      position: [0, 2.0, -0.3],
      rotation: [Math.PI, 0, 0],
    },
    {
      geometry: new TorusGeometry(0.3, 0.05, 8, 24),
      colour: copper,
      position: [0.55, 0.6, 0.15],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      geometry: new CylinderGeometry(0.06, 0.06, 0.8, 8),
      colour: copper,
      position: [-0.45, 0.55, 0.25],
      rotation: [0.9, 0, 0.4],
    },
    {
      geometry: new BoxGeometry(0.35, 0.25, 0.35),
      colour: "#6b8fb3",
      position: [-0.55, 0.18, 0.5],
    },
  ]);
};

export const buildBandShellGeometry = (): BufferGeometry => {
  const stone = "#d9c7a6";
  const shell = "#fbe9cf";
  const rib = "#e0a91f";
  const plank = "#a8652e";
  const gold = "#ffcf4a";
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(
        1.5,
        1.6,
        0.3,
        18,
        1,
        false,
        -Math.PI / 2,
        Math.PI,
      ),
      colour: stone,
      position: [0, 0.15, -0.2],
    },
    {
      geometry: new CylinderGeometry(
        1.4,
        1.4,
        0.06,
        18,
        1,
        false,
        -Math.PI / 2,
        Math.PI,
      ),
      colour: plank,
      position: [0, 0.32, -0.2],
    },
    {
      geometry: new SphereGeometry(
        1.35,
        14,
        7,
        Math.PI,
        Math.PI,
        0,
        Math.PI / 2,
      ),
      colour: shell,
      position: [0, 0.32, -0.2],
      scale: [1, 1.25, 0.9],
    },
    ...[1.38, 1.15, 0.92].map((radius, index) => ({
      geometry: new TorusGeometry(radius, 0.05, 4, 14, Math.PI),
      colour: rib,
      position: [0, 0.32, -0.2 - index * 0.32] satisfies Triple,
      scale: [1, 1.25, 1] satisfies Triple,
    })),
    {
      geometry: new SphereGeometry(0.28, 12, 8),
      colour: gold,
      position: [0.95, 2.05, 0.4],
      scale: [1.25, 0.95, 0.7],
      rotation: [0, 0, 0.4],
      isSmooth: true,
    },
    {
      geometry: new BoxGeometry(0.08, 1.15, 0.08),
      colour: gold,
      position: [1.25, 2.55, 0.4],
    },
    {
      geometry: new BoxGeometry(0.45, 0.12, 0.08),
      colour: gold,
      position: [1.45, 3.05, 0.4],
      rotation: [0, 0, -0.5],
    },
  ]);
};

const bigTopStripeCount = 12;

const buildStripes = (
  buildSegment: (thetaStart: number, thetaLength: number) => BufferGeometry,
  colours: readonly [string, string],
  position: Triple,
): ModelPart[] =>
  Array.from({ length: bigTopStripeCount }, (_, stripe) => ({
    geometry: buildSegment(
      (stripe / bigTopStripeCount) * Math.PI * 2,
      (Math.PI * 2) / bigTopStripeCount,
    ),
    colour: colours[stripe % 2],
    position,
  }));

export const buildBigTopGeometry = (): BufferGeometry => {
  const red = "#e11d48";
  const cream = "#fff1d6";
  const gold = "#fbbf24";
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.2, 1.28, 0.12, 28),
      colour: "#8a6644",
      position: [0, 0.06, 0],
    },
    ...buildStripes(
      (thetaStart, thetaLength) =>
        new CylinderGeometry(1, 1, 0.9, 2, 1, true, thetaStart, thetaLength),
      [red, cream],
      [0, 0.57, 0],
    ),
    ...buildStripes(
      (thetaStart, thetaLength) =>
        new ConeGeometry(1.3, 1.15, 2, 1, true, thetaStart, thetaLength),
      [cream, red],
      [0, 1.6, 0],
    ),
    ...Array.from({ length: 16 }, (_, scallop): ModelPart => {
      const angle = (scallop / 16) * Math.PI * 2;
      return {
        geometry: new SphereGeometry(0.11, 8, 6),
        colour: scallop % 2 === 0 ? gold : red,
        position: [Math.sin(angle) * 1.24, 1.02, Math.cos(angle) * 1.24],
        scale: [1, 0.7, 1],
      };
    }),
    {
      geometry: new BoxGeometry(0.5, 0.66, 0.12),
      colour: "#3b0764",
      position: [0, 0.45, 0.98],
    },
    {
      geometry: new BoxGeometry(0.62, 0.08, 0.16),
      colour: gold,
      position: [0, 0.82, 1.0],
    },
    {
      geometry: new CylinderGeometry(0.035, 0.035, 0.7, 8),
      colour: "#d6d3d1",
      position: [0, 2.48, 0],
    },
    {
      geometry: new BoxGeometry(0.4, 0.22, 0.03),
      colour: "#7c3aed",
      position: [0.21, 2.7, 0],
    },
    {
      geometry: new SphereGeometry(0.07, 10, 8),
      colour: gold,
      position: [0, 2.86, 0],
    },
    ...(
      [
        [1.35, 0.15, 0.75, 0.3, "#22c55e"],
        [-1.4, 0.15, 0.55, 0.9, "#3b82f6"],
        [1.0, 0.13, 1.35, 0.5, "#f97316"],
        [-1.4, 0.43, 0.55, 0.2, gold],
      ] as const
    ).map(([x, y, z, turn, colour]): ModelPart => ({
      geometry: new BoxGeometry(0.28, 0.28, 0.28),
      colour,
      position: [x, y, z],
      rotation: [0, turn, 0],
    })),
  ]);
};

const arenaSectorCount = 12;
const arenaTiers = [
  { radius: 0.98, height: 0.2 },
  { radius: 1.13, height: 0.36 },
  { radius: 1.28, height: 0.52 },
] as const;
const arenaFloorHeight = 0.12;
const arenaRimHeight = arenaFloorHeight + arenaTiers[2].height;

const buildArenaStands = (colours: readonly [string, string]): ModelPart[] =>
  Array.from({ length: arenaSectorCount }, (_, sector) => sector)
    .filter((sector) => sector !== 0)
    .flatMap((sector) => {
      const angle = (sector / arenaSectorCount) * Math.PI * 2;
      return arenaTiers.map(({ radius, height }, tier): ModelPart => ({
        geometry: new BoxGeometry(
          ((Math.PI * 2 * radius) / arenaSectorCount) * 0.94,
          height,
          0.16,
        ),
        colour: colours[(sector + tier) % 2],
        position: [
          Math.sin(angle) * radius,
          arenaFloorHeight + height / 2,
          Math.cos(angle) * radius,
        ],
        rotation: [0, angle, 0],
      }));
    });

const buildArenaFlags = (colours: readonly string[]): ModelPart[] =>
  colours.flatMap((colour, flag): ModelPart[] => {
    const angle = ((flag + 0.5) / colours.length) * Math.PI * 2;
    const x = Math.sin(angle) * 1.3;
    const z = Math.cos(angle) * 1.3;
    return [
      {
        geometry: new CylinderGeometry(0.025, 0.025, 0.85, 6),
        colour: "#d6d3d1",
        position: [x, arenaRimHeight + 0.42, z],
      },
      {
        geometry: new BoxGeometry(0.3, 0.17, 0.02),
        colour,
        position: [x + 0.15, arenaRimHeight + 0.74, z],
      },
    ];
  });

export const buildChallengeArenaGeometry = (): BufferGeometry => {
  const blue = "#2563eb";
  const white = "#f1f5f9";
  const gold = "#fbbf24";
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.38, 1.46, arenaFloorHeight, 28),
      colour: "#9a8c7a",
      position: [0, arenaFloorHeight / 2, 0],
    },
    {
      geometry: new CylinderGeometry(0.88, 0.88, 0.03, 24),
      colour: "#c2410c",
      position: [0, arenaFloorHeight + 0.015, 0],
    },
    {
      geometry: new CylinderGeometry(0.68, 0.68, 0.04, 24),
      colour: "#4d9e3a",
      position: [0, arenaFloorHeight + 0.02, 0],
    },
    ...buildArenaStands([blue, white]),
    ...([-0.32, 0.32] as const).map((x): ModelPart => ({
      geometry: new BoxGeometry(0.12, 0.72, 0.12),
      colour: white,
      position: [x, arenaFloorHeight + 0.36, 1.18],
    })),
    {
      geometry: new BoxGeometry(0.86, 0.16, 0.14),
      colour: gold,
      position: [0, arenaFloorHeight + 0.78, 1.18],
    },
    ...(
      [
        [-0.26, 0.14, "#cbd5e1"],
        [0, 0.24, gold],
        [0.26, 0.1, "#c2773a"],
      ] as const
    ).map(([x, height, colour]): ModelPart => ({
      geometry: new BoxGeometry(0.24, height, 0.24),
      colour,
      position: [x, arenaFloorHeight + 0.04 + height / 2, 0],
    })),
    ...buildArenaFlags(["#e11d48", gold, "#22c55e", "#7c3aed"]),
  ]);
};

export const arenaTrophyHeight = 1.5;

export const buildArenaTrophyGeometry = (): BufferGeometry => {
  const gold = "#fbbf24";
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.2, 0.08, 0.28, 12),
      colour: gold,
      position: [0, 0.2, 0],
    },
    ...([-1, 1] as const).map((side): ModelPart => ({
      geometry: new TorusGeometry(0.08, 0.025, 4, 10),
      colour: gold,
      position: [side * 0.2, 0.22, 0],
    })),
    {
      geometry: new CylinderGeometry(0.03, 0.03, 0.14, 6),
      colour: gold,
      position: [0, -0.01, 0],
    },
    {
      geometry: new BoxGeometry(0.2, 0.08, 0.2),
      colour: "#7c2d12",
      position: [0, -0.1, 0],
    },
  ]);
};

export const buildLighthouseGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(1.0, 2),
      colour: "#7a756d",
      position: [0, -0.3, 0],
      scale: [1.4, 0.6, 1.3],
      roughen: 0.4,
      isSmooth: true,
    },
    ...[0, 1, 2, 3, 4, 5].map((band) => {
      const bottomRadius = 0.5 - band * 0.035;
      return {
        geometry: new CylinderGeometry(
          bottomRadius - 0.035,
          bottomRadius,
          0.45,
          20,
        ),
        colour: band % 2 === 0 ? "#f3f0ea" : "#c63a2f",
        position: [0, 0.22 + band * 0.45, 0] satisfies Triple,
      };
    }),
    {
      geometry: new CylinderGeometry(0.42, 0.42, 0.07, 20),
      colour: "#2e2e33",
      position: [0, 2.72, 0],
    },
    {
      geometry: new TorusGeometry(0.4, 0.018, 6, 28),
      colour: "#2e2e33",
      position: [0, 2.92, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new ConeGeometry(0.32, 0.4, 20),
      colour: "#c63a2f",
      position: [0, 3.36, 0],
    },
    {
      geometry: new SphereGeometry(0.06, 8, 6),
      colour: "#2e2e33",
      position: [0, 3.6, 0],
    },
    {
      geometry: new BoxGeometry(0.8, 0.5, 0.6),
      colour: "#efe9de",
      position: [0.7, 0.25, 0.3],
    },
    {
      geometry: buildGableRoof(0.8, 0.3, 0.7),
      colour: "#4b5466",
      position: [0.7, 0.5, 0.3],
      rotation: [0, Math.PI / 2, 0],
    },
  ]);

export const buildSailingBoatGeometry = (): BufferGeometry => {
  const outline = new Shape();
  outline.moveTo(0, 0.9);
  outline.quadraticCurveTo(0.34, 0.35, 0.3, -0.55);
  outline.quadraticCurveTo(0.24, -0.75, 0, -0.75);
  outline.quadraticCurveTo(-0.24, -0.75, -0.3, -0.55);
  outline.quadraticCurveTo(-0.34, 0.35, 0, 0.9);
  const hull = new ExtrudeGeometry(outline, {
    depth: 0.3,
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: 2,
    curveSegments: 10,
  });
  hull.rotateX(Math.PI / 2);
  hull.translate(0, 0.25, 0);
  const hullPositions = hull.getAttribute("position");
  for (let index = 0; index < hullPositions.count; index++) {
    const keelward = Math.min(
      1,
      Math.max(0, (0.22 - hullPositions.getY(index)) / 0.3),
    );
    hullPositions.setX(index, hullPositions.getX(index) * (1 - keelward * 0.7));
    hullPositions.setY(index, hullPositions.getY(index) - keelward * 0.08);
  }
  const deck = new ExtrudeGeometry(outline, {
    depth: 0.02,
    bevelEnabled: false,
  });
  deck.rotateX(Math.PI / 2);
  deck.scale(0.88, 1, 0.88);
  deck.translate(0, 0.3, 0);
  const sail = new PlaneGeometry(0.9, 1.3, 8, 8);
  const sailPositions = sail.getAttribute("position");
  for (let index = 0; index < sailPositions.count; index++) {
    const across = sailPositions.getX(index);
    const up = sailPositions.getY(index);
    const narrowing = 0.5 - up / 1.3;
    sailPositions.setX(index, (across + 0.45) * (0.35 + narrowing));
    sailPositions.setZ(
      index,
      0.16 * Math.sin(((across + 0.45) / 0.9) * Math.PI) * (0.6 + narrowing),
    );
  }
  return buildModelGeometry([
    { geometry: hull, colour: "#6e4426" },
    { geometry: deck, colour: "#c79d6a" },
    {
      geometry: new CylinderGeometry(0.025, 0.03, 1.7, 6),
      colour: "#4a3424",
      position: [0, 1.15, 0.15],
    },
    {
      geometry: new CylinderGeometry(0.02, 0.02, 0.85, 6),
      colour: "#4a3424",
      position: [0, 0.55, -0.27],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: sail,
      colour: "#f6f1e4",
      position: [0, 1.15, 0.12],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      geometry: new ConeGeometry(0.06, 0.2, 4),
      colour: "#c63a2f",
      position: [0, 2.05, 0.2],
      rotation: [0, 0, Math.PI / 2],
      scale: [1, 1, 0.2],
    },
  ]);
};

export const buildStoneBridgeGeometry = (
  span: number,
  deckHeight: number,
): BufferGeometry => {
  const width = 1.2;
  const archRadius = Math.min(span * 0.36, deckHeight + 0.35);
  const side = new Shape();
  side.moveTo(-span / 2, -0.8);
  side.lineTo(-span / 2, deckHeight);
  side.quadraticCurveTo(0, deckHeight + 0.35, span / 2, deckHeight);
  side.lineTo(span / 2, -0.8);
  side.closePath();
  const arch = new Path();
  arch.moveTo(archRadius, -0.8);
  arch.absarc(0, -0.8 + 0.4, archRadius, 0, Math.PI, false);
  arch.lineTo(-archRadius, -0.8);
  side.holes.push(arch);
  const body = new ExtrudeGeometry(side, {
    depth: width,
    bevelEnabled: false,
    curveSegments: 16,
  });
  body.translate(0, 0, -width / 2);
  const parapets = [-1, 1].flatMap((edge) =>
    Array.from({ length: 9 }, (_, index) => {
      const along = -span / 2 + (index + 0.5) * (span / 9);
      const rise = 0.35 * (1 - ((2 * along) / span) ** 2);
      return {
        geometry: new BoxGeometry(span / 9 + 0.01, 0.22, 0.12),
        colour: index % 2 === 0 ? "#9b9284" : "#a8a092",
        position: [
          along,
          deckHeight + rise * 0.5 + 0.11,
          edge * (width / 2 - 0.06),
        ] satisfies Triple,
        rotation: [
          0,
          0,
          -0.35 * 2 * ((2 * along) / span) * 0.5,
        ] satisfies Triple,
      };
    }),
  );
  return buildModelGeometry([
    { geometry: body, colour: "#a59c8d" },
    ...parapets,
  ]);
};

export const buildCloudGeometry = (detail = 1): BufferGeometry =>
  buildModelGeometry(
    [
      { at: [0, 0, 0], size: 1.4 },
      { at: [1.4, -0.2, 0.2], size: 1.1 },
      { at: [-1.5, -0.25, -0.1], size: 1.0 },
      { at: [0.5, 0.6, -0.3], size: 1.0 },
      { at: [-0.6, 0.45, 0.4], size: 0.9 },
      { at: [2.4, -0.4, -0.1], size: 0.7 },
    ].map(({ at, size }) => ({
      geometry: new IcosahedronGeometry(size, detail),
      colour: "#ffffff",
      position: [at[0], at[1], at[2]] satisfies Triple,
      scale: [1, 0.75, 1] satisfies Triple,
      roughen: 0.15,
      isSmooth: true,
    })),
  );

export const buildPadlockGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(1, 0.85, 0.36),
      colour: "#e2b53c",
    },
    {
      geometry: new TorusGeometry(0.33, 0.09, 12, 24, Math.PI),
      colour: "#b9bcc4",
      position: [0, 0.42, 0],
    },
    {
      geometry: new CylinderGeometry(0.09, 0.09, 0.05, 12),
      colour: "#3a2c1a",
      position: [0, 0.08, 0.19],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new BoxGeometry(0.06, 0.2, 0.05),
      colour: "#3a2c1a",
      position: [0, -0.06, 0.19],
    },
  ]);

export const buildCottageWindowGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[-0.3, 0.3].map((across) => ({
      geometry: new BoxGeometry(0.17, 0.17, 0.02),
      colour: "#ffd27a",
      position: [across, 0.5, 0.415] satisfies Triple,
    })),
    ...[-0.2, 0.2].map((across) => ({
      geometry: new BoxGeometry(0.02, 0.17, 0.17),
      colour: "#ffd27a",
      position: [0.515, 0.5, across] satisfies Triple,
    })),
  ]);

export interface WaterfallCourse {
  top: MapPoint;
  topHeight: number;
  bottom: MapPoint;
  findHeight?: (point: MapPoint) => number;
}

const waterfallSamples = 64;
const waterfallHalfWidth = 0.6;
const waterfallLift = 0.14;

export const buildWaterfallGeometry = ({
  top,
  topHeight,
  bottom,
  findHeight = findTerrainHeight,
}: WaterfallCourse): BufferGeometry => {
  const acrossX = -(bottom.z - top.z);
  const acrossZ = bottom.x - top.x;
  const acrossLength = Math.hypot(acrossX, acrossZ);
  const vertices: number[] = [];
  const textureCoordinates: number[] = [];
  let lowestSoFar = topHeight;
  for (let sample = 0; sample <= waterfallSamples; sample++) {
    const along = sample / waterfallSamples;
    const x = top.x + (bottom.x - top.x) * along;
    const z = top.z + (bottom.z - top.z) * along;
    const ground = Math.max(0, findHeight({ x, z })) + waterfallLift;
    lowestSoFar = Math.max(ground, Math.min(lowestSoFar, ground + 0.6));
    const halfWidth = waterfallHalfWidth * (0.7 + along * 0.6);
    for (const side of [1, -1]) {
      vertices.push(
        x + (side * acrossX * halfWidth) / acrossLength,
        lowestSoFar,
        z + (side * acrossZ * halfWidth) / acrossLength,
      );
      textureCoordinates.push(side === 1 ? 0 : 1, along);
    }
  }
  const faces = Array.from({ length: waterfallSamples }, (_, sample) => {
    const left = sample * 2;
    return [left, left + 2, left + 1, left + 1, left + 2, left + 3];
  }).flat();
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(vertices), 3),
  );
  geometry.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array(textureCoordinates), 2),
  );
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
};

export const buildHourglassGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.5, 1.7, 0.4, 10),
      colour: "#b9ad96",
      position: [0, 0.2, 0],
      roughen: 0.06,
    },
    {
      geometry: new CylinderGeometry(1.15, 1.3, 0.3, 10),
      colour: "#cfc4ad",
      position: [0, 0.55, 0],
    },
    ...[0, 1, 2].map((post): ModelPart => ({
      geometry: new CylinderGeometry(0.07, 0.07, 2.5, 6),
      colour: "#7a4f2a",
      position: [
        Math.cos((post / 3) * Math.PI * 2) * 0.72,
        1.95,
        Math.sin((post / 3) * Math.PI * 2) * 0.72,
      ],
    })),
    ...[0.75, 3.2].map((y): ModelPart => ({
      geometry: new CylinderGeometry(0.92, 0.92, 0.16, 12),
      colour: "#8a5a30",
      position: [0, y, 0],
    })),
    {
      geometry: new SphereGeometry(0.62, 12, 8),
      colour: "#cdeaf2",
      position: [0, 2.55, 0],
      scale: [1, 1.05, 1],
    },
    {
      geometry: new SphereGeometry(0.62, 12, 8),
      colour: "#cdeaf2",
      position: [0, 1.35, 0],
      scale: [1, 1.05, 1],
    },
    {
      geometry: new ConeGeometry(0.5, 0.5, 12),
      colour: "#f2c14e",
      position: [0, 1.02, 0],
    },
    {
      geometry: new SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, Math.PI / 2),
      colour: "#f2c14e",
      position: [0, 2.48, 0],
    },
    {
      geometry: new SphereGeometry(0.06, 6, 4),
      colour: "#f5c84c",
      position: [0, 3.4, 0],
    },
    ...[
      [-1.25, 0.8, 0.7, 1.1],
      [1.3, 0.6, -0.5, 0.7],
      [0.2, 0.5, -1.3, 0.5],
    ].map(([x, height, z, lean]): ModelPart => ({
      geometry: new CylinderGeometry(0.2, 0.24, height, 8),
      colour: "#e4dccb",
      position: [x, 0.4 + height / 2, z],
      rotation: [0, 0, lean * 0.1],
    })),
    {
      geometry: new BoxGeometry(0.6, 0.18, 0.4),
      colour: "#d6cdb8",
      position: [1.7, 0.09, 0.9],
      rotation: [0, 0.6, 0.2],
    },
  ]);

export const globeCentreHeight = 2.05;
export const globeRadius = 0.9;

export const buildGlobeStandGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(1.25, 2),
      colour: "#7d7a72",
      position: [0, -0.35, 0],
      scale: [1.15, 0.55, 1.1],
      roughen: 0.35,
      isSmooth: true,
    },
    {
      geometry: new CylinderGeometry(0.62, 0.72, 0.16, 28),
      colour: "#6b4426",
      position: [0, 0.32, 0],
    },
    {
      geometry: new CylinderGeometry(0.1, 0.16, 0.7, 16),
      colour: "#c9963c",
      position: [0, 0.75, 0],
    },
    {
      geometry: new SphereGeometry(0.16, 16, 10),
      colour: "#d6a548",
      position: [0, 1.12, 0],
    },
    {
      geometry: new TorusGeometry(
        globeRadius + 0.1,
        0.04,
        8,
        48,
        Math.PI * 1.25,
      ),
      colour: "#d6a548",
      position: [0, globeCentreHeight, 0],
      rotation: [0, Math.PI / 2, -Math.PI * 0.62],
    },
    ...[-1, 1].map((side) => ({
      geometry: new BoxGeometry(0.5, 0.08, 0.08),
      colour: "#8a5a3b",
      position: [side * 0.42, 0.3, 0.55] satisfies Triple,
      rotation: [0, side * 0.6, 0] satisfies Triple,
    })),
  ]);

const globeLandPatches: [number, number, number][] = [
  [0.2, 0.6, 0.42],
  [-0.15, 2.0, 0.38],
  [0.55, 3.6, 0.34],
  [-0.45, 4.4, 0.3],
  [0.1, 5.4, 0.26],
  [-1.25, 1.0, 0.36],
];

export const buildGlobeBallGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new SphereGeometry(globeRadius, 32, 20),
      colour: "#2f7fc9",
      isSmooth: true,
    },
    ...globeLandPatches.map(([latitude, longitude, size]) => ({
      geometry: new SphereGeometry(size, 12, 8),
      colour: latitude < -1 ? "#f1f6fb" : "#5fae55",
      position: [
        Math.cos(latitude) * Math.sin(longitude) * globeRadius * 0.93,
        Math.sin(latitude) * globeRadius * 0.93,
        Math.cos(latitude) * Math.cos(longitude) * globeRadius * 0.93,
      ] satisfies Triple,
      scale: [1, 1, 0.45] satisfies Triple,
      rotation: [-latitude, longitude, 0] satisfies Triple,
    })),
  ]);

const distantIslandSegments = 18;

export const buildDistantIslandGeometry = (): BufferGeometry => {
  const geometry = new CylinderGeometry(0.85, 1, 1, distantIslandSegments, 1);
  geometry.translate(0, -0.25, 0);
  return geometry;
};

const easelPaints = ["#e63946", "#f4a261", "#2a9d8f", "#3a86ff", "#ffbe0b"];

export const buildEaselGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.4, 1.6, 0.35, 8),
      colour: "#c9b79c",
      position: [0, 0.18, 0],
      roughen: 0.05,
    },
    ...[-0.55, 0.55].map((x): ModelPart => ({
      geometry: new BoxGeometry(0.12, 3.2, 0.12),
      colour: "#8a5a30",
      position: [x, 1.85, 0.15],
      rotation: [-0.12, 0, x > 0 ? -0.12 : 0.12],
    })),
    {
      geometry: new BoxGeometry(0.12, 3, 0.12),
      colour: "#7a4f2a",
      position: [0, 1.75, -0.45],
      rotation: [0.35, 0, 0],
    },
    {
      geometry: new BoxGeometry(1.7, 1.3, 0.08),
      colour: "#fbf7ef",
      position: [0, 2.35, 0.32],
      rotation: [-0.12, 0, 0],
    },
    {
      geometry: new BoxGeometry(1.5, 0.1, 0.2),
      colour: "#8a5a30",
      position: [0, 1.66, 0.4],
    },
    ...easelPaints.map((colour, index): ModelPart => ({
      geometry: new BoxGeometry(0.32, 0.32, 0.04),
      colour,
      position: [-0.55 + index * 0.27, 2.2 + (index % 3) * 0.22, 0.4],
      rotation: [-0.12, 0, index * 0.4],
    })),
    {
      geometry: new CylinderGeometry(0.55, 0.55, 0.06, 8),
      colour: "#d9b382",
      position: [0.95, 0.45, 0.65],
      rotation: [0.2, 0, 0.1],
    },
    ...easelPaints.slice(0, 4).map((colour, index): ModelPart => ({
      geometry: new BoxGeometry(0.16, 0.06, 0.16),
      colour,
      position: [
        0.95 + Math.cos(index * 1.4) * 0.32,
        0.52,
        0.65 + Math.sin(index * 1.4) * 0.32,
      ],
    })),
  ]);

const workshopGearTeeth = 6;

export const buildWorkshopGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(2.4, 0.3, 2),
      colour: "#b9ad96",
      position: [0, 0.15, 0],
      roughen: 0.05,
    },
    {
      geometry: new BoxGeometry(1.8, 1.4, 1.4),
      colour: "#c27c3e",
      position: [-0.2, 1, -0.1],
    },
    {
      geometry: new ConeGeometry(1.4, 0.9, 4),
      colour: "#6b4a2b",
      position: [-0.2, 2.15, -0.1],
      rotation: [0, Math.PI / 4, 0],
    },
    {
      geometry: new BoxGeometry(0.5, 0.8, 0.05),
      colour: "#5b3a1e",
      position: [-0.2, 0.7, 0.62],
    },
    {
      geometry: new CylinderGeometry(0.62, 0.62, 0.18, 12),
      colour: "#94a3b8",
      position: [0.95, 1.55, 0.35],
      rotation: [Math.PI / 2, 0, 0],
    },
    ...Array.from({ length: workshopGearTeeth }, (_, tooth): ModelPart => {
      const angle = (tooth / workshopGearTeeth) * Math.PI * 2;
      return {
        geometry: new BoxGeometry(0.24, 0.24, 0.18),
        colour: "#94a3b8",
        position: [
          0.95 + Math.cos(angle) * 0.7,
          1.55 + Math.sin(angle) * 0.7,
          0.35,
        ],
        rotation: [0, 0, angle],
      };
    }),
    {
      geometry: new BoxGeometry(0.12, 0.9, 0.12),
      colour: "#8a5a30",
      position: [0.9, 0.75, 0.9],
      rotation: [0, 0, 0.5],
    },
    {
      geometry: new BoxGeometry(0.42, 0.18, 0.2),
      colour: "#475569",
      position: [1.12, 1.12, 0.9],
      rotation: [0, 0, 0.5],
    },
  ]);

const embassyFlags = [
  { colours: ["#1f4aa8", "#f8fafc", "#d62839"], x: -0.9 },
  { colours: ["#009246", "#f8fafc", "#ce2b37"], x: 0 },
  { colours: ["#169b62", "#f8fafc", "#ff883e"], x: 0.9 },
];

export const buildEmbassyGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(2.6, 0.3, 1.8),
      colour: "#d6cdbb",
      position: [0, 0.15, 0],
      roughen: 0.05,
    },
    {
      geometry: new BoxGeometry(2.2, 1.2, 1.2),
      colour: "#f1ead9",
      position: [0, 0.9, -0.2],
    },
    ...[-0.8, -0.27, 0.27, 0.8].map((x): ModelPart => ({
      geometry: new CylinderGeometry(0.09, 0.1, 1.2, 6),
      colour: "#ffffff",
      position: [x, 0.9, 0.5],
    })),
    {
      geometry: new BoxGeometry(2.4, 0.18, 1.5),
      colour: "#e2d8c3",
      position: [0, 1.58, -0.05],
    },
    {
      geometry: new ConeGeometry(1.3, 0.5, 3),
      colour: "#b8a88a",
      position: [0, 1.92, 0.1],
      rotation: [Math.PI / 2, 0, 0],
      scale: [1, 1, 0.4],
    },
    ...embassyFlags.flatMap(({ colours, x }): ModelPart[] => [
      {
        geometry: new BoxGeometry(0.05, 1.6, 0.05),
        colour: "#cbd5e1",
        position: [x, 2.6, -0.4],
      },
      ...colours.map((colour, stripe): ModelPart => ({
        geometry: new BoxGeometry(0.18, 0.4, 0.03),
        colour,
        position: [x + 0.12 + stripe * 0.18, 3.15, -0.4],
      })),
    ]),
  ]);
