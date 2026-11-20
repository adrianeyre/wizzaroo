import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  type Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type ColorRepresentation,
} from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type Triple = [number, number, number];

export interface Spot {
  x: number;
  y: number;
  z: number;
}

export const finishes = ["paint", "glass", "metal"] as const;

export type Finish = (typeof finishes)[number];

export interface FinishLook {
  roughness: number;
  metalness: number;
  clearcoat: number;
}

export const finishLooks: Readonly<Record<Finish, FinishLook>> = {
  paint: { roughness: 0.38, metalness: 0.08, clearcoat: 0.55 },
  glass: { roughness: 0.06, metalness: 0.35, clearcoat: 1 },
  metal: { roughness: 0.55, metalness: 0.55, clearcoat: 0 },
};

export type TrainDetail = "explore" | "map";

export const railHalfGauge = 0.42;
export const wheelTread = 0.1;

export interface FinishedColour<F extends string = Finish> {
  colour: ColorRepresentation;
  finish: F;
}

export type Painted<F extends string = Finish> =
  ColorRepresentation | FinishedColour<F> | undefined;

export type Paint<F extends string = Finish> = (
  centre: Spot,
  normal: Vector3,
) => Painted<F>;

const resolvePaint = <F extends string>(
  painted: Painted<F>,
  fallback: F,
): { colour: Color; finish: F } | undefined => {
  if (painted === undefined) {
    return undefined;
  }
  if (typeof painted === "object" && "finish" in painted) {
    return { colour: new Color(painted.colour), finish: painted.finish };
  }
  return { colour: new Color(painted), finish: fallback };
};

const defaultCrease = (40 * Math.PI) / 180;

const prepare = (
  geometry: BufferGeometry,
  crease: number | undefined,
): BufferGeometry => {
  geometry.deleteAttribute("uv");
  geometry.deleteAttribute("uv1");
  if (crease === undefined) {
    const flat = geometry.index === null ? geometry : geometry.toNonIndexed();
    if (!flat.hasAttribute("normal")) {
      flat.computeVertexNormals();
    }
    return flat;
  }
  return toCreasedNormals(geometry, crease);
};

const paintAll = (geometry: BufferGeometry, colour: ColorRepresentation) => {
  const count = geometry.getAttribute("position").count;
  const colours = new Float32Array(count * 3);
  const tint = new Color(colour);
  for (let index = 0; index < count; index++) {
    tint.toArray(colours, index * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colours, 3));
};

export type Axis = "x" | "y" | "z";

const axisTurns: Record<Axis, Triple> = {
  x: [0, 0, Math.PI / 2],
  y: [0, 0, 0],
  z: [Math.PI / 2, 0, 0],
};

const upright = new Vector3(0, 1, 0);

export interface Placement {
  at?: Triple;
  rotation?: Triple;
  scale?: Triple;
}

const place = (
  geometry: BufferGeometry,
  { at = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }: Placement,
): BufferGeometry =>
  geometry.applyMatrix4(
    new Matrix4().compose(
      new Vector3(...at),
      new Quaternion().setFromEuler(new Euler(...rotation)),
      new Vector3(...scale),
    ),
  );

export interface Profile2 {
  points: readonly (readonly [number, number])[];
}

export interface LoftStation {
  z: number;
  points: readonly (readonly [number, number])[];
}

export interface LoftSpec<F extends string = Finish> {
  stations: readonly LoftStation[];
  paint: Paint<F>;
  finish?: F;
  capStart?: boolean;
  capEnd?: boolean;
  isClosed?: boolean;
}

interface FaceBucket {
  positions: number[];
  normals: number[];
  colours: number[];
}

/**
 * Builds a model as one geometry with a group per finish, in the order
 * of the finishes it was given, so each group can be drawn with its own
 * material. Every part is shaded smooth up to a crease angle, so curved
 * bodies look curved and boxes keep crisp edges.
 */
export class FinishedModelBuilder<F extends string> {
  private readonly parts = new Map<F, BufferGeometry[]>();

  constructor(
    readonly finishList: readonly F[],
    readonly detail: TrainDetail,
  ) {
    for (const finish of finishList) {
      this.parts.set(finish, []);
    }
  }

  private partsOf(finish: F): BufferGeometry[] {
    const found = this.parts.get(finish);
    if (found === undefined) {
      throw new Error(`No finish called ${finish}`);
    }
    return found;
  }

  get isMap(): boolean {
    return this.detail === "map";
  }

  segments(explore: number, map?: number): number {
    return this.isMap ? (map ?? Math.max(4, Math.round(explore / 2))) : explore;
  }

  addPainted(finish: F, geometry: BufferGeometry): this {
    if (geometry.getAttribute("position").count > 0) {
      this.partsOf(finish).push(geometry);
    }
    return this;
  }

  add(
    finish: F,
    colour: ColorRepresentation,
    geometry: BufferGeometry,
    placement: Placement = {},
    crease: number | undefined = defaultCrease,
  ): this {
    const placed = prepare(place(geometry, placement), crease);
    paintAll(placed, colour);
    return this.addPainted(finish, placed);
  }

  box(
    finish: F,
    colour: ColorRepresentation,
    size: Triple,
    at: Triple,
    rotation?: Triple,
  ): this {
    return this.add(
      finish,
      colour,
      new BoxGeometry(...size),
      { at, rotation },
      undefined,
    );
  }

  roundedBox(
    finish: F,
    colour: ColorRepresentation,
    size: Triple,
    radius: number,
    at: Triple,
    rotation?: Triple,
  ): this {
    return this.add(
      finish,
      colour,
      new RoundedBoxGeometry(
        size[0],
        size[1],
        size[2],
        this.segments(3, 1),
        Math.min(radius, ...size.map((side) => side / 2 - 0.0001)),
      ),
      { at, rotation },
    );
  }

  cylinder(
    finish: F,
    colour: ColorRepresentation,
    {
      radius,
      radiusEnd = radius,
      length,
      at,
      axis = "y",
      segments = 16,
      isOpen = false,
    }: {
      radius: number;
      radiusEnd?: number;
      length: number;
      at: Triple;
      axis?: Axis;
      segments?: number;
      isOpen?: boolean;
    },
  ): this {
    return this.add(
      finish,
      colour,
      new CylinderGeometry(
        radiusEnd,
        radius,
        length,
        this.segments(segments),
        1,
        isOpen,
      ),
      { at, rotation: axisTurns[axis] },
    );
  }

  bar(
    finish: F,
    colour: ColorRepresentation,
    from: Triple,
    to: Triple,
    thickness: number,
    segments = 8,
  ): this {
    const start = new Vector3(...from);
    const direction = new Vector3(...to).sub(start);
    const turn = new Euler().setFromQuaternion(
      new Quaternion().setFromUnitVectors(
        upright,
        direction.clone().normalize(),
      ),
    );
    const middle = start.add(direction.clone().multiplyScalar(0.5));
    return this.add(
      finish,
      colour,
      new CylinderGeometry(
        thickness / 2,
        thickness / 2,
        direction.length(),
        this.segments(segments, Math.max(4, Math.round(segments / 2))),
      ),
      {
        at: [middle.x, middle.y, middle.z],
        rotation: [turn.x, turn.y, turn.z],
      },
    );
  }

  sphere(
    finish: F,
    colour: ColorRepresentation,
    radius: number,
    at: Triple,
    scale: Triple = [1, 1, 1],
    segments = 16,
  ): this {
    return this.add(
      finish,
      colour,
      new SphereGeometry(
        radius,
        this.segments(segments),
        this.segments(Math.round(segments * 0.66)),
      ),
      { at, scale },
    );
  }

  torus(
    finish: F,
    colour: ColorRepresentation,
    radius: number,
    tube: number,
    at: Triple,
    axis: Axis = "z",
    segments = 24,
  ): this {
    const turns: Record<Axis, Triple> = {
      x: [0, Math.PI / 2, 0],
      y: [Math.PI / 2, 0, 0],
      z: [0, 0, 0],
    };
    return this.add(
      finish,
      colour,
      new TorusGeometry(radius, tube, 6, this.segments(segments)),
      { at, rotation: turns[axis] },
    );
  }

  /** Spins a profile of [radius, height] points about the axis. */
  lathe(
    finish: F,
    colour: ColorRepresentation,
    profile: readonly (readonly [number, number])[],
    at: Triple,
    axis: Axis = "y",
    segments = 20,
  ): this {
    return this.add(
      finish,
      colour,
      new LatheGeometry(
        profile.map(([radius, height]) => new Vector2(radius, height)),
        this.segments(segments),
      ),
      { at, rotation: axisTurns[axis] },
    );
  }

  /**
   * Extrudes a shape drawn in the side view (shape x = vehicle -z,
   * shape y = vehicle y) across the vehicle, centred on `x`.
   */
  sidePlate(
    finish: F,
    colour: ColorRepresentation,
    shape: Shape,
    x: number,
    thickness: number,
    bevel = 0,
  ): this {
    const geometry = new ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: this.segments(2, 1),
      curveSegments: this.segments(16, 6),
    });
    geometry.translate(0, 0, -thickness / 2);
    return this.add(finish, colour, geometry, {
      at: [x, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      scale: [1, 1, 1],
    });
  }

  /**
   * Extrudes a shape drawn in the end view (shape x = vehicle x,
   * shape y = vehicle y) along the vehicle, from `zFrom` to `zTo`.
   */
  endPlate(
    finish: F,
    colour: ColorRepresentation,
    shape: Shape,
    zFrom: number,
    zTo: number,
    bevel = 0,
  ): this {
    const geometry = new ExtrudeGeometry(shape, {
      depth: zTo - zFrom,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: this.segments(2, 1),
      curveSegments: this.segments(16, 6),
    });
    return this.add(finish, colour, geometry, { at: [0, 0, zFrom] });
  }

  /**
   * Lofts a smooth body through cross-sections. Every station has the
   * same number of [x, y] points, going round the section. Faces are
   * painted one by one, so livery bands stay crisp where the stations
   * and points are placed on their edges, and the shading stays smooth.
   * Repeat a point to make a sharp corner.
   */
  loft({
    stations,
    paint,
    finish = this.finishList[0],
    capStart = true,
    capEnd = true,
    isClosed = true,
  }: LoftSpec<F>): this {
    const around = stations[0].points.length;
    const positions: number[] = [];
    for (const station of stations) {
      if (station.points.length !== around) {
        throw new Error("Every loft station needs the same number of points");
      }
      for (const [x, y] of station.points) {
        positions.push(x, y, station.z);
      }
    }
    const indices: number[] = [];
    const span = isClosed ? around : around - 1;
    for (let ring = 0; ring < stations.length - 1; ring++) {
      for (let point = 0; point < span; point++) {
        const here = ring * around + point;
        const next = ring * around + ((point + 1) % around);
        indices.push(
          here,
          next,
          next + around,
          here,
          next + around,
          here + around,
        );
      }
    }
    const capRing = (ring: number, isFirst: boolean) => {
      const centre = stations[ring].points.reduce(
        ([sumX, sumY], [x, y]) => [sumX + x / around, sumY + y / around],
        [0, 0],
      );
      const centreIndex = positions.length / 3;
      positions.push(centre[0], centre[1], stations[ring].z);
      for (let point = 0; point < span; point++) {
        const here = ring * around + point;
        const next = ring * around + ((point + 1) % around);
        indices.push(
          ...(isFirst ? [centreIndex, next, here] : [centreIndex, here, next]),
        );
      }
    };
    const body = new BufferGeometry();
    body.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    );
    body.setIndex(indices);
    const shell = toCreasedNormals(body, defaultCrease);
    const profileArea = stations[0].points.reduce(
      (sum, [x, y], index, points) => {
        const [nextX, nextY] = points[(index + 1) % points.length];
        return sum + x * nextY - nextX * y;
      },
      0,
    );
    const flipIfInsideOut =
      profileArea * (stations[stations.length - 1].z - stations[0].z) < 0;
    if (flipIfInsideOut) {
      this.flip(shell);
    }
    this.paintFaces(shell, paint, finish);
    const caps: [number, boolean][] = [];
    if (capStart) {
      caps.push([0, true]);
    }
    if (capEnd) {
      caps.push([stations.length - 1, false]);
    }
    if (caps.length > 0) {
      const capPositions: number[] = [...positions];
      const capIndices: number[] = [];
      const savedLength = positions.length;
      for (const [ring, isFirst] of caps) {
        const before = indices.length;
        capRing(ring, isFirst);
        capIndices.push(...indices.slice(before));
      }
      capPositions.push(...positions.slice(savedLength));
      const capGeometry = new BufferGeometry();
      capGeometry.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(capPositions), 3),
      );
      capGeometry.setIndex(
        flipIfInsideOut
          ? capIndices.flatMap((_, corner) =>
              corner % 3 === 0
                ? [
                    capIndices[corner],
                    capIndices[corner + 2],
                    capIndices[corner + 1],
                  ]
                : [],
            )
          : capIndices,
      );
      const flatCaps = capGeometry.toNonIndexed();
      flatCaps.computeVertexNormals();
      this.paintFaces(flatCaps, paint, finish);
    }
    return this;
  }

  /** Paints each face of a ready-placed geometry, splitting it by finish. */
  paintFaces(geometry: BufferGeometry, paint: Paint<F>, finish: F): this {
    const flat = prepare(geometry, undefined);
    const positions = flat.getAttribute("position");
    const normals = flat.getAttribute("normal");
    const buckets = new Map(
      this.finishList.map((each): [F, FaceBucket] => [
        each,
        { positions: [], normals: [], colours: [] },
      ]),
    );
    const faceNormal = new Vector3();
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    for (let corner = 0; corner < positions.count; corner += 3) {
      a.fromBufferAttribute(positions, corner);
      b.fromBufferAttribute(positions, corner + 1);
      c.fromBufferAttribute(positions, corner + 2);
      faceNormal
        .subVectors(c, b)
        .cross(new Vector3().subVectors(a, b))
        .normalize();
      const centre = {
        x: (a.x + b.x + c.x) / 3,
        y: (a.y + b.y + c.y) / 3,
        z: (a.z + b.z + c.z) / 3,
      };
      const painted = resolvePaint(paint(centre, faceNormal), finish);
      if (painted === undefined) {
        continue;
      }
      const bucket = buckets.get(painted.finish);
      if (bucket === undefined) {
        throw new Error(`No finish called ${painted.finish}`);
      }
      for (let vertex = corner; vertex < corner + 3; vertex++) {
        bucket.positions.push(
          positions.getX(vertex),
          positions.getY(vertex),
          positions.getZ(vertex),
        );
        bucket.normals.push(
          normals.getX(vertex),
          normals.getY(vertex),
          normals.getZ(vertex),
        );
        bucket.colours.push(
          painted.colour.r,
          painted.colour.g,
          painted.colour.b,
        );
      }
    }
    for (const each of this.finishList) {
      const bucket = buckets.get(each);
      if (bucket === undefined || bucket.positions.length === 0) {
        continue;
      }
      const part = new BufferGeometry();
      part.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(bucket.positions), 3),
      );
      part.setAttribute(
        "normal",
        new BufferAttribute(new Float32Array(bucket.normals), 3),
      );
      part.setAttribute(
        "color",
        new BufferAttribute(new Float32Array(bucket.colours), 3),
      );
      this.addPainted(each, part);
    }
    return this;
  }

  /** Adds any geometry, painting it face by face. */
  painted(
    geometry: BufferGeometry,
    paint: Paint<F>,
    placement: Placement = {},
    finish: F = this.finishList[0],
    crease: number | undefined = defaultCrease,
  ): this {
    return this.paintFaces(
      prepare(place(geometry, placement), crease),
      paint,
      finish,
    );
  }

  private flip(geometry: BufferGeometry) {
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    for (let corner = 0; corner < positions.count; corner += 3) {
      for (const attribute of [positions, normals]) {
        const x = attribute.getX(corner + 1);
        const y = attribute.getY(corner + 1);
        const z = attribute.getZ(corner + 1);
        attribute.setXYZ(
          corner + 1,
          attribute.getX(corner + 2),
          attribute.getY(corner + 2),
          attribute.getZ(corner + 2),
        );
        attribute.setXYZ(corner + 2, x, y, z);
      }
    }
    for (let index = 0; index < normals.count; index++) {
      normals.setXYZ(
        index,
        -normals.getX(index),
        -normals.getY(index),
        -normals.getZ(index),
      );
    }
  }

  /** One geometry, with a group per finish in `finishList` order. */
  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    const total = this.finishList.reduce(
      (sum, finish) =>
        sum +
        this.partsOf(finish).reduce(
          (count, part) => count + part.getAttribute("position").count,
          0,
        ),
      0,
    );
    const positions = new Float32Array(total * 3);
    const normals = new Float32Array(total * 3);
    const colours = new Float32Array(total * 3);
    let offset = 0;
    this.finishList.forEach((finish, materialIndex) => {
      const start = offset;
      for (const part of this.partsOf(finish)) {
        const count = part.getAttribute("position").count;
        positions.set(part.getAttribute("position").array, offset * 3);
        normals.set(part.getAttribute("normal").array, offset * 3);
        colours.set(part.getAttribute("color").array, offset * 3);
        offset += count;
        part.dispose();
      }
      geometry.addGroup(start, offset - start, materialIndex);
    });
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new BufferAttribute(normals, 3));
    geometry.setAttribute("color", new BufferAttribute(colours, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/**
 * Builds vehicles as one geometry in three groups, one per finish
 * (paint, glass, metal), drawn with the materials in `finishLooks`.
 */
export class VehicleBuilder extends FinishedModelBuilder<Finish> {
  constructor(detail: TrainDetail) {
    super(finishes, detail);
  }
}

/** Evenly spaced values from `from` to `to`, both included. */
export const listEvenly = (from: number, to: number, steps: number): number[] =>
  Array.from(
    { length: steps + 1 },
    (_, step) => from + ((to - from) * step) / steps,
  );

/** Sorted values with near-duplicates removed. */
export const listBreaks = (...values: readonly number[]): number[] =>
  [
    ...new Set(values.map((value) => Math.round(value * 10_000) / 10_000)),
  ].toSorted((first, second) => first - second);

export interface CoachSection {
  halfWidth: number;
  /** Underside of the body. */
  bottom: number;
  /** Where the side is widest (the waist). */
  waist: number;
  /** Where the roof curve starts (the cantrail). */
  cantrail: number;
  /** Top of the roof at the centre line. */
  roofTop: number;
  /** How far the side tucks in at the bottom. */
  tumblehome: number;
  /** How far the side leans in above the waist, at the cantrail. */
  lean?: number;
  /** Extra heights on the side, for livery bands and window edges. */
  sideHeights?: readonly number[];
  roofSteps?: number;
  /** Corner radius where the bottom meets the side. */
  bilge?: number;
}

/**
 * The cross-section of a British coach or locomotive body, as [x, y]
 * points going round it: tucked-in sides below the waist, nearly upright
 * sides above, and an elliptical roof, with points on every livery height
 * so bands can be painted crisply.
 */
export const buildCoachSection = ({
  halfWidth,
  bottom,
  waist,
  cantrail,
  roofTop,
  tumblehome,
  lean = 0.03,
  sideHeights = [],
  roofSteps = 10,
  bilge = 0.06,
}: CoachSection): [number, number][] => {
  const sideX = (y: number): number => {
    if (y <= waist) {
      const share = (waist - y) / Math.max(0.0001, waist - bottom);
      return halfWidth - tumblehome * share ** 2;
    }
    const share = (y - waist) / Math.max(0.0001, cantrail - waist);
    return halfWidth - lean * share ** 1.5;
  };
  const heights = listBreaks(
    bottom + bilge,
    waist,
    cantrail,
    ...listEvenly(bottom + bilge, cantrail, 6),
    ...sideHeights.filter((y) => y > bottom + bilge && y < cantrail),
  );
  const shoulder = sideX(cantrail);
  const rise = roofTop - cantrail;
  const roof: [number, number][] = Array.from(
    { length: roofSteps - 1 },
    (_, step) => {
      const angle = ((step + 1) / roofSteps) * (Math.PI / 2);
      return [
        shoulder * Math.cos(angle),
        cantrail + rise * Math.sin(angle) ** 0.85,
      ];
    },
  );
  const bilgeCorner: [number, number][] = [
    [sideX(bottom + bilge) - bilge * 0.7, bottom + bilge * 0.12],
  ];
  const right: [number, number][] = [
    [0, bottom],
    ...bilgeCorner,
    ...heights.map((y): [number, number] => [sideX(y), y]),
    ...roof,
    [0, roofTop],
  ];
  const left = right
    .slice(1, -1)
    .toReversed()
    .map(([x, y]): [number, number] => [-x, y]);
  return [...right, ...left];
};

export interface WheelStyle {
  radius: number;
  /** Spokes for steam wheels; 0 for a plain disc wheel. */
  spokes?: number;
  tyre?: ColorRepresentation;
  centre?: ColorRepresentation;
  hub?: ColorRepresentation;
  /** Paint a balance weight on spoked wheels. */
  balance?: ColorRepresentation;
}

/** One axle with its two wheels, flanges and axle-box ends. */
export const addWheelset = (
  builder: VehicleBuilder,
  z: number,
  {
    radius,
    spokes = 0,
    tyre = "#3a3d42",
    centre = "#2a2c30",
    hub = "#4b5058",
    balance,
  }: WheelStyle,
): void => {
  const around = builder.segments(radius > 0.3 ? 32 : 20, 10);
  for (const side of [1, -1]) {
    const x = side * railHalfGauge;
    builder.cylinder("metal", tyre, {
      radius,
      length: wheelTread,
      at: [x, radius, z],
      axis: "x",
      segments: around,
    });
    builder.cylinder("metal", tyre, {
      radius: radius + 0.03,
      length: 0.02,
      at: [x - side * (wheelTread / 2 - 0.01), radius, z],
      axis: "x",
      segments: around,
    });
    if (builder.isMap) {
      continue;
    }
    builder.cylinder("metal", hub, {
      radius: radius * 0.22,
      length: wheelTread + 0.04,
      at: [x + side * 0.01, radius, z],
      axis: "x",
      segments: 12,
    });
    if (spokes > 0) {
      builder.cylinder("paint", centre, {
        radius: radius * 0.86,
        length: wheelTread * 0.6,
        at: [x - side * 0.01, radius, z],
        axis: "x",
        segments: around,
      });
      for (let spoke = 0; spoke < spokes; spoke++) {
        const angle = (spoke / spokes) * Math.PI * 2;
        builder.box(
          "paint",
          centre,
          [0.03, radius * 0.66, 0.028],
          [
            x + side * 0.025,
            radius + Math.cos(angle) * radius * 0.52,
            z + Math.sin(angle) * radius * 0.52,
          ],
          [angle, 0, 0],
        );
      }
      if (balance !== undefined) {
        builder.cylinder("paint", balance, {
          radius: radius * 0.42,
          length: 0.035,
          at: [x + side * 0.03, radius + radius * 0.4, z],
          axis: "x",
          segments: 10,
        });
      }
    } else {
      builder.cylinder("metal", centre, {
        radius: radius * 0.88,
        length: wheelTread + 0.012,
        at: [x, radius, z],
        axis: "x",
        segments: around,
      });
    }
  }
  if (!builder.isMap) {
    builder.cylinder("metal", "#2b2e33", {
      radius: 0.035,
      length: railHalfGauge * 2,
      at: [0, radius, z],
      axis: "x",
      segments: 8,
    });
  }
};

export type BogieKind =
  "plate" | "commonwealth" | "b4" | "bt10" | "modern" | "heavy";

export interface BogieStyle {
  kind: BogieKind;
  wheelBase: number;
  radius: number;
  frame?: ColorRepresentation;
  /** Three-axle bogies for heavy locomotives. */
  axles?: 2 | 3;
  /** Yellow axle-box covers and similar touches. */
  accent?: ColorRepresentation;
}

/** A bogie centred on `z`, with its wheels, side frames, springs and dampers. */
export const addBogie = (
  builder: VehicleBuilder,
  z: number,
  style: BogieStyle,
): void => {
  const {
    wheelBase,
    radius,
    kind,
    frame = "#25282d",
    axles = 2,
    accent,
  } = style;
  const axleZs =
    axles === 3
      ? [z + wheelBase / 2, z, z - wheelBase / 2]
      : [z + wheelBase / 2, z - wheelBase / 2];
  for (const axle of axleZs) {
    addWheelset(builder, axle, { radius, tyre: "#3b3f45", centre: "#2b2e33" });
  }
  const frameX = railHalfGauge + 0.1;
  const frameHeight = kind === "plate" ? 0.2 : 0.14;
  const frameLength = wheelBase + radius * (kind === "modern" ? 1.6 : 2.2);
  for (const side of [1, -1]) {
    builder.box(
      "metal",
      frame,
      [0.06, frameHeight, frameLength],
      [side * frameX, radius + 0.02, z],
    );
    if (builder.isMap) {
      continue;
    }
    builder.box(
      "metal",
      frame,
      [0.07, 0.05, frameLength * 0.9],
      [side * frameX, radius + 0.12, z],
    );
    for (const axle of axleZs) {
      builder.roundedBox("metal", accent ?? frame, [0.09, 0.13, 0.15], 0.02, [
        side * (frameX + 0.02),
        radius,
        axle,
      ]);
      if (
        kind === "commonwealth" ||
        kind === "b4" ||
        kind === "heavy" ||
        kind === "plate"
      ) {
        for (const turn of [-0.045, 0.045]) {
          builder.cylinder("metal", "#4a4f57", {
            radius: 0.025,
            length: 0.12,
            at: [side * (frameX + 0.005), radius + 0.13, axle + turn],
            segments: 8,
          });
        }
      }
    }
    if (kind === "bt10" || kind === "modern") {
      builder.cylinder("metal", "#3f444c", {
        radius: 0.07,
        length: 0.14,
        at: [side * (frameX - 0.02), radius + 0.16, z],
        segments: 12,
      });
      builder.bar(
        "metal",
        "#1c1f23",
        [side * (frameX + 0.04), radius + 0.05, z + wheelBase * 0.25],
        [side * (frameX + 0.04), radius + 0.18, z + wheelBase * 0.05],
        0.035,
      );
    }
    if (kind === "b4" || kind === "commonwealth") {
      builder.cylinder("metal", "#3f444c", {
        radius: 0.055,
        length: 0.12,
        at: [side * frameX, radius + 0.14, z],
        segments: 10,
      });
    }
  }
  builder.box("metal", frame, [frameX * 2, 0.08, 0.26], [0, radius + 0.1, z]);
};

export interface BufferStyle {
  height: number;
  /** Half the distance between the two buffers. */
  spread?: number;
  stock?: ColorRepresentation;
  head?: ColorRepresentation;
  isOval?: boolean;
  reach?: number;
}

/** The two buffers, the coupling hook and a screw coupling on one end. */
export const addBuffers = (
  builder: VehicleBuilder,
  end: number,
  {
    height,
    spread = 0.44,
    stock = "#26292e",
    head = "#3a3e45",
    isOval = false,
    reach = 0.16,
  }: BufferStyle,
): void => {
  const facing = Math.sign(end);
  for (const side of [1, -1]) {
    builder.cylinder("metal", stock, {
      radius: 0.045,
      radiusEnd: 0.055,
      length: reach,
      at: [side * spread, height, end - facing * (reach / 2 + 0.02)],
      axis: "z",
      segments: 12,
    });
    builder.add(
      "metal",
      head,
      new CylinderGeometry(0.095, 0.095, 0.025, builder.segments(18, 8)),
      {
        at: [side * spread, height, end - facing * 0.012],
        rotation: [Math.PI / 2, 0, 0],
        scale: isOval ? [1.3, 1, 0.9] : [1, 1, 1],
      },
    );
  }
  if (!builder.isMap) {
    builder.box(
      "metal",
      "#1f2226",
      [0.08, 0.07, 0.14],
      [0, height, end - facing * 0.08],
    );
    builder.torus(
      "metal",
      "#2f3338",
      0.035,
      0.012,
      [0, height - 0.05, end - facing * 0.01],
      "x",
      10,
    );
  }
};

/** Rubber gangway bellows and a door on a coach end. */
export const addGangway = (
  builder: VehicleBuilder,
  end: number,
  {
    bottom,
    top,
    halfWidth = 0.38,
    colour = "#1d1f22",
    depth = 0.08,
  }: {
    bottom: number;
    top: number;
    halfWidth?: number;
    colour?: ColorRepresentation;
    depth?: number;
  },
): void => {
  const facing = Math.sign(end);
  builder.roundedBox(
    "metal",
    colour,
    [halfWidth * 2, top - bottom, depth],
    0.04,
    [0, (bottom + top) / 2, end + facing * (depth / 2 - 0.02)],
  );
  if (!builder.isMap) {
    for (const ridge of [0.25, 0.5, 0.75]) {
      builder.box(
        "metal",
        "#2a2d31",
        [halfWidth * 2 + 0.02, top - bottom + 0.02, 0.012],
        [0, (bottom + top) / 2, end + facing * depth * ridge],
      );
    }
  }
};

/** A round marker or head lamp with a lens facing along the vehicle. */
export const addLamp = (
  builder: VehicleBuilder,
  at: Triple,
  facing: number,
  {
    lens = "#fff7d6",
    rim = "#2b2e33",
    radius = 0.05,
  }: {
    lens?: ColorRepresentation;
    rim?: ColorRepresentation;
    radius?: number;
  } = {},
): void => {
  builder.cylinder("metal", rim, {
    radius: radius * 1.25,
    length: 0.04,
    at,
    axis: "z",
    segments: 14,
  });
  builder.cylinder("glass", lens, {
    radius,
    length: 0.02,
    at: [at[0], at[1], at[2] + facing * 0.02],
    axis: "z",
    segments: 14,
  });
};

/** Sums the triangles in a geometry built by `VehicleBuilder`. */
export const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

/** A train's vehicles: the locomotive, an optional tender, and its carriages. */
export interface TrainVehicleModel {
  length: number;
  build: (detail: TrainDetail) => BufferGeometry;
}

export interface TrainModel {
  locomotive: TrainVehicleModel;
  tender?: TrainVehicleModel;
  carriage: TrainVehicleModel;
  carriageCount: number;
  /** Steam only: the top of the chimney, in the locomotive's own space. */
  chimney?: Triple;
  /** Electric only: the pantograph's position along the locomotive and the height of its head. */
  pantograph?: { z: number; top: number };
}
