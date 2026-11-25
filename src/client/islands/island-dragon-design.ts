import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Matrix4,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  dragonHip,
  dragonSaddle,
  dragonShoulder,
  placeDragonBody,
} from "./island-flight.js";
import { paintFaces } from "./island-lofts.js";
import {
  buildLiveryGeometry,
  onBothSides,
  type LiveryDecal,
} from "./island-livery.js";

// A friendly purple dragon that carries the Character between Islands. It
// lands on the Balloon Field, lies down with its neck bowed so the Character
// can climb up its folded foreleg to the saddle, then stands, spreads its
// bat-like wings and flies off. Its body is a smooth lofted hide of purple
// scales over a ridged gold belly; it wears a night-blue saddle with gold
// trim on a purple blanket that carries the Wizzaroo name and crest.

const palette = {
  deep: new Color("#341466"),
  purple: new Color("#4c1d95"),
  royal: new Color("#552099"),
  violet: new Color("#6a35c2"),
  bright: new Color("#7d4fd6"),
  lilac: new Color("#a78bfa"),
  lavender: new Color("#ddd6fe"),
  gold: new Color("#f5c542"),
  goldDeep: new Color("#c98b1c"),
  goldPale: new Color("#fbe08a"),
  cream: new Color("#fdeec0"),
  night: new Color("#1e1b4b"),
  leather: new Color("#2b2766"),
  blanket: new Color("#3d0f86"),
  ivory: new Color("#fffbeb"),
  amber: new Color("#f59e0b"),
  amberLight: new Color("#fde047"),
  pupil: new Color("#1a0b2e"),
  mouth: new Color("#2e1065"),
  nostril: new Color("#24104f"),
};

const mix = (from: Color, to: Color, share: number): Color =>
  from.clone().lerp(to, Math.min(1, Math.max(0, share)));

const clampShare = (value: number): number => Math.min(1, Math.max(0, value));

const ease = (value: number): number => {
  const share = clampShare(value);
  return share * share * (3 - 2 * share);
};

const hash = (first: number, second: number): number => {
  const scrambled = Math.sin(first * 127.1 + second * 311.7) * 43758.5453;
  return scrambled - Math.floor(scrambled);
};

const point = (x: number, y: number, z: number): Vector3 =>
  new Vector3(x, y, z);

// A smooth curve through keyed rows: the first column of each row is the
// parameter, the rest are values, joined by Hermite splines.
const sampleKeys = (
  keys: readonly (readonly number[])[],
  at: number,
): number[] => {
  const last = keys.length - 1;
  const clamped = Math.min(Math.max(at, keys[0][0]), keys[last][0]);
  const found = keys.findIndex(
    (_, index) => index < last && clamped <= keys[index + 1][0],
  );
  const segment = Math.min(last - 1, Math.max(0, found));
  const start = keys[segment];
  const end = keys[segment + 1];
  const span = end[0] - start[0];
  const share = span === 0 ? 0 : (clamped - start[0]) / span;
  const findSlope = (index: number, column: number): number => {
    const before = keys[Math.max(0, index - 1)];
    const after = keys[Math.min(last, index + 1)];
    return (after[column] - before[column]) / (after[0] - before[0]);
  };
  const cube = share ** 3;
  const square = share ** 2;
  return start.slice(1).map((value, offset) => {
    const column = offset + 1;
    return (
      (2 * cube - 3 * square + 1) * value +
      (cube - 2 * square + share) * span * findSlope(segment, column) +
      (-2 * cube + 3 * square) * end[column] +
      (cube - square) * span * findSlope(segment + 1, column)
    );
  });
};

const bezier = (points: readonly Vector3[], share: number): Vector3 => {
  const rest = 1 - share;
  return points[0]
    .clone()
    .multiplyScalar(rest ** 3)
    .addScaledVector(points[1], 3 * rest * rest * share)
    .addScaledVector(points[2], 3 * rest * share * share)
    .addScaledVector(points[3], share ** 3);
};

interface Frame {
  origin: Vector3;
  side: Vector3;
  up: Vector3;
  forward: Vector3;
}

const buildFrame = (
  origin: Vector3,
  forward: Vector3,
  reference = new Vector3(1, 0, 0),
): Frame => {
  const ahead = forward.clone().normalize();
  const side = reference
    .clone()
    .addScaledVector(ahead, -ahead.dot(reference))
    .normalize();
  const up = ahead.clone().cross(side).normalize();
  return { origin, side, up, forward: ahead };
};

const leftward = new Vector3(1, 0, 0);
// Curves running backwards, like the tail, keep their back on top by
// measuring their side from the dragon's right.
const rightward = new Vector3(-1, 0, 0);

const frameOnCurve = (
  points: readonly Vector3[],
  share: number,
  reference = leftward,
): Frame => {
  const before = bezier(points, Math.max(0, share - 0.01));
  const after = bezier(points, Math.min(1, share + 0.01));
  return buildFrame(bezier(points, share), after.sub(before), reference);
};

// --- Lofted tubes -----------------------------------------------------------

interface Section {
  frame: Frame;
  halfWidth: number;
  top: number;
  bottom: number;
}

interface HideSpot {
  centre: Vector3;
  along: number;
  angle: number;
  ring: number;
}

const fullness = 0.8;

const shape = (value: number): number =>
  Math.sign(value) * Math.abs(value) ** fullness;

const placeOnSection = (
  { frame, halfWidth, top, bottom }: Section,
  angle: number,
  swell = 1,
): Vector3 => {
  const across = Math.cos(angle);
  const upward = Math.sin(angle);
  return frame.origin
    .clone()
    .addScaledVector(frame.side, shape(across) * halfWidth * swell)
    .addScaledVector(
      frame.up,
      shape(upward) * (upward > 0 ? top : bottom) * swell,
    );
};

const listTriangleCentres = (geometry: BufferGeometry): Vector3[] => {
  const positions = geometry.getAttribute("position");
  return Array.from({ length: positions.count / 3 }, (_, triangle) => {
    const centre = new Vector3();
    for (let corner = triangle * 3; corner < triangle * 3 + 3; corner++) {
      centre.x += positions.getX(corner) / 3;
      centre.y += positions.getY(corner) / 3;
      centre.z += positions.getZ(corner) / 3;
    }
    return centre;
  });
};

const colourTriangles = (
  geometry: BufferGeometry,
  colourOf: (triangle: number, centre: Vector3) => Color,
): BufferGeometry => {
  const centres = listTriangleCentres(geometry);
  const colours = new Float32Array(centres.length * 9);
  centres.forEach((centre, triangle) => {
    const colour = colourOf(triangle, centre);
    for (let corner = 0; corner < 3; corner++) {
      colour.toArray(colours, triangle * 9 + corner * 3);
    }
  });
  geometry.setAttribute("color", new BufferAttribute(colours, 3));
  return geometry;
};

// Lofts closed rings around a run of sections into a smooth tube, painting
// each face from where it lies along the tube and around it.
const buildTube = (
  sections: readonly Section[],
  around: number,
  paint: (spot: HideSpot) => Color,
  swellAt: (along: number, angle: number) => number = () => 1,
): BufferGeometry => {
  const distances = sections.reduce<number[]>((built, section, index) => {
    const previous = index === 0 ? section : sections[index - 1];
    const step = section.frame.origin.distanceTo(previous.frame.origin);
    return [...built, (built.at(-1) ?? 0) + step];
  }, []);
  const angles = Array.from(
    { length: around },
    (_, step) => (step / around) * Math.PI * 2,
  );
  const positions = sections.flatMap((section, index) =>
    angles.flatMap((angle) =>
      placeOnSection(
        section,
        angle,
        swellAt(distances[index], angle),
      ).toArray(),
    ),
  );
  const indices: number[] = [];
  const spots: { along: number; angle: number; ring: number }[] = [];
  for (let ring = 0; ring < sections.length - 1; ring++) {
    for (let step = 0; step < around; step++) {
      const here = ring * around + step;
      const next = ring * around + ((step + 1) % around);
      indices.push(
        here,
        next,
        next + around,
        here,
        next + around,
        here + around,
      );
      const spot = {
        along: (distances[ring] + distances[ring + 1]) / 2,
        angle: ((step + 0.5) / around) * Math.PI * 2,
        ring,
      };
      spots.push(spot, spot);
    }
  }
  [0, sections.length - 1].forEach((ring) => {
    const centreIndex = positions.length / 3;
    positions.push(...sections[ring].frame.origin.toArray());
    for (let step = 0; step < around; step++) {
      const here = ring * around + step;
      const next = ring * around + ((step + 1) % around);
      indices.push(
        ...(ring === 0 ? [centreIndex, next, here] : [centreIndex, here, next]),
      );
      spots.push({
        along: distances[ring],
        angle: ((step + 0.5) / around) * Math.PI * 2,
        ring,
      });
    }
  });
  const indexed = new BufferGeometry();
  indexed.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  indexed.setIndex(indices);
  indexed.computeVertexNormals();
  const flat = indexed.toNonIndexed();
  indexed.dispose();
  return colourTriangles(flat, (triangle, centre) =>
    paint({ centre, ...spots[triangle] }),
  );
};

const sectionsOnCurve = (
  points: readonly Vector3[],
  count: number,
  radii: (share: number) => { halfWidth: number; top: number; bottom: number },
  reference = leftward,
): Section[] =>
  Array.from({ length: count }, (_, index) => {
    const share = index / (count - 1);
    return { frame: frameOnCurve(points, share, reference), ...radii(share) };
  });

// A rounded start, so a limb or tail grows smoothly out of the body.
const domeIn = (share: number, length: number): number =>
  share >= length ? 1 : Math.sqrt(1 - ((length - share) / length) ** 2);

// --- Hide painting ----------------------------------------------------------

const plateLength = 0.24;

const paintScales = (
  { along, angle }: HideSpot,
  upper: Color,
  lower: Color,
): Color => {
  const upward = Math.sin(angle);
  const row = Math.floor(along / 0.15);
  const column = Math.floor((angle / (Math.PI * 2)) * 44 + (row % 2) * 0.5);
  const jitter = 0.94 + 0.09 * hash(row, column);
  return mix(lower, upper, (upward + 0.6) / 1.5).multiplyScalar(jitter);
};

const paintBellyPlate = (along: number, upward: number): Color => {
  const phase = (((along / plateLength + 0.5) % 1) + 1) % 1;
  if (phase < 0.1 || phase > 0.92) {
    return palette.goldDeep.clone();
  }
  return mix(palette.cream, palette.gold, (-upward - 0.62) * 1.2 + 0.15);
};

const paintHide = (spot: HideSpot): Color => {
  const upward = Math.sin(spot.angle);
  if (upward < -0.62) {
    return paintBellyPlate(spot.along, upward);
  }
  if (upward < -0.5) {
    return palette.lilac.clone();
  }
  return paintScales(spot, palette.deep, palette.violet);
};

// The neck and tail have fewer rings than the body, so their belly plates
// follow the rings: a gold seam every third ring.
const paintRingedHide = (spot: HideSpot): Color => {
  const upward = Math.sin(spot.angle);
  if (upward < -0.62) {
    return spot.ring % 3 === 0
      ? palette.goldDeep.clone()
      : mix(palette.cream, palette.gold, (-upward - 0.62) * 1.2 + 0.15);
  }
  return paintHide(spot);
};

const ridgeBelly = (along: number, angle: number): number => {
  const weight = clampShare((-Math.sin(angle) - 0.5) / 0.3);
  const phase = (((along / plateLength + 0.5) % 1) + 1) % 1;
  return 1 - 0.035 * weight * (1 - Math.sin(Math.PI * phase));
};

// --- Small shapes -----------------------------------------------------------

const yAxis = new Vector3(0, 1, 0);

// A cylinder or cone, built along +y from its base, laid from one point to
// another.
const layBetween = (
  geometry: BufferGeometry,
  from: Vector3,
  to: Vector3,
): BufferGeometry => {
  const direction = to.clone().sub(from);
  return geometry.applyMatrix4(
    new Matrix4().compose(
      from,
      new Quaternion().setFromUnitVectors(yAxis, direction.normalize()),
      new Vector3(1, 1, 1),
    ),
  );
};

const buildRod = (
  from: Vector3,
  to: Vector3,
  radiusFrom: number,
  radiusTo: number,
  paint: (share: number) => Color,
  radial = 10,
): BufferGeometry => {
  const length = from.distanceTo(to);
  const rod = paintFaces(
    new CylinderGeometry(radiusTo, radiusFrom, length, radial, 1).translate(
      0,
      length / 2,
      0,
    ),
    ({ y }) => paint(y / length),
  );
  return layBetween(rod, from, to);
};

const buildSpike = (
  base: Vector3,
  tip: Vector3,
  radius: number,
  baseColour: Color,
  tipColour: Color,
  radial = 8,
): BufferGeometry => {
  const length = base.distanceTo(tip);
  const spike = paintFaces(
    new ConeGeometry(radius, length, radial, 1).translate(0, length / 2, 0),
    ({ y }) => mix(baseColour, tipColour, clampShare(y / length) ** 1.5),
  );
  return layBetween(spike, base, tip);
};

const buildBlob = (
  centre: Vector3,
  radii: Vector3,
  paint: (normal: Vector3) => Color,
  widthSegments = 14,
  heightSegments = 10,
): BufferGeometry =>
  paintFaces(
    new SphereGeometry(1, widthSegments, heightSegments)
      .scale(radii.x, radii.y, radii.z)
      .translate(centre.x, centre.y, centre.z),
    ({ x, y, z }) =>
      paint(
        new Vector3(
          (x - centre.x) / radii.x,
          (y - centre.y) / radii.y,
          (z - centre.z) / radii.z,
        ).normalize(),
      ),
  );

const plain = (colour: Color) => (): Color => colour.clone();

// A curved dorsal spine, its base along +x (forward) and rising in +y.
const buildFin = (
  length: number,
  height: number,
  thickness: number,
): BufferGeometry => {
  const outline = new Shape();
  outline.moveTo(length / 2, -0.06);
  outline.quadraticCurveTo(length * 0.1, height * 0.7, -length * 0.42, height);
  outline.quadraticCurveTo(-length * 0.32, height * 0.35, -length / 2, -0.06);
  outline.lineTo(length / 2, -0.06);
  const fin = new ExtrudeGeometry(outline, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.5,
    bevelSize: Math.min(thickness * 0.6, height * 0.12),
    bevelSegments: 1,
    curveSegments: 3,
  }).translate(0, 0, -thickness / 2);
  return paintFaces(fin, ({ y }) => {
    const rise = clampShare(y / height);
    return mix(palette.royal, palette.bright, rise ** 1.2).lerp(
      palette.gold,
      clampShare((rise - 0.78) * 3),
    );
  });
};

const placeOnFrame = (
  geometry: BufferGeometry,
  { origin, side, up, forward }: Frame,
): BufferGeometry =>
  geometry.applyMatrix4(
    new Matrix4()
      .makeBasis(forward, up, side.clone().negate())
      .setPosition(origin),
  );

const mirrorAcross = new Matrix4().makeScale(-1, 1, 1);

// Mirrors a non-indexed geometry to the dragon's other side, keeping its
// faces turned outward.
const mirrorGeometry = (geometry: BufferGeometry): BufferGeometry => {
  const mirrored = geometry.clone().applyMatrix4(mirrorAcross);
  ["position", "normal", "color"].forEach((name) => {
    const attribute = mirrored.getAttribute(name);
    const values = attribute.array;
    for (let corner = 0; corner < attribute.count; corner += 3) {
      for (let axis = 0; axis < 3; axis++) {
        const second = (corner + 1) * 3 + axis;
        const third = (corner + 2) * 3 + axis;
        const kept = values[second];
        values[second] = values[third];
        values[third] = kept;
      }
    }
  });
  return mirrored;
};

const mirrorMatrix = (matrix: Matrix4): Matrix4 =>
  mirrorAcross.clone().multiply(matrix).multiply(mirrorAcross);

const both = (geometry: BufferGeometry): BufferGeometry[] => [
  geometry,
  mirrorGeometry(geometry),
];

// --- The torso --------------------------------------------------------------

// z, belly underside, back top, half width.
const torsoKeys: readonly (readonly number[])[] = [
  [-3.05, 1.52, 1.9, 0.2],
  [-2.75, 1.38, 2.0, 0.38],
  [-2.3, 1.2, 2.08, 0.58],
  [-1.7, 1.1, 2.08, 0.71],
  [-0.9, 1.055, 1.97, 0.77],
  [0, 1.05, 1.9, 0.78],
  [dragonSaddle.z, 1.07, 1.86, 0.75],
  [1.55, 1.15, 1.99, 0.7],
  [2.1, 1.3, 1.99, 0.56],
  [2.5, 1.46, 1.96, 0.38],
  [2.75, 1.62, 1.88, 0.16],
];

const torsoFront = 2.75;
const torsoBack = -3.05;

const findTorsoSection = (z: number): Section => {
  const [bottom, top, halfWidth] = sampleKeys(torsoKeys, z);
  const centre = (bottom + top) / 2;
  return {
    frame: buildFrame(point(0, centre, z), new Vector3(0, 0, 1)),
    halfWidth,
    top: top - centre,
    bottom: centre - bottom,
  };
};

const placeOnTorso = (z: number, angle: number, lift: number): Vector3 => {
  const section = findTorsoSection(z);
  return placeOnSection(
    {
      ...section,
      halfWidth: section.halfWidth + lift,
      top: section.top + lift,
      bottom: section.bottom + lift,
    },
    angle,
  );
};

const buildBellyRidgedTorso = (): BufferGeometry => {
  const rings = 104;
  const sections = Array.from({ length: rings }, (_, ring) =>
    findTorsoSection(
      torsoBack + ((torsoFront - torsoBack) * ring) / (rings - 1),
    ),
  );
  return buildTube(
    sections,
    48,
    (spot) => paintHide({ ...spot, along: spot.centre.z }),
    (along, angle) => ridgeBelly(along + torsoBack, angle),
  );
};

const listBackFins = (): BufferGeometry[] =>
  [-0.35, -0.8, -1.25, -1.7, -2.15, -2.6].map((z, index) => {
    const height = [0.26, 0.31, 0.34, 0.33, 0.29, 0.23][index];
    const top = sampleKeys(torsoKeys, z)[1];
    const slope =
      (sampleKeys(torsoKeys, z + 0.05)[1] -
        sampleKeys(torsoKeys, z - 0.05)[1]) /
      0.1;
    return placeOnFrame(
      buildFin(0.42, height, 0.07),
      buildFrame(point(0, top - 0.02, z), new Vector3(0, slope, 1)),
    );
  });

// --- The saddle and blanket -------------------------------------------------

const saddleBack = 0.3;
const saddleFront = 1.44;
const seatHalfWidth = 0.31;
const seatDepth = 0.3;

const findSeatTop = (z: number): number => {
  const cantle = clampShare((0.72 - z) / (0.72 - saddleBack)) ** 2 * 0.2;
  const pommel = clampShare((z - 1.0) / (saddleFront - 1.0)) ** 2 * 0.2;
  return dragonSaddle.y + cantle + pommel;
};

const paintSaddle = ({ angle, centre }: HideSpot): Color => {
  const upward = Math.sin(angle);
  if (upward > 0.48 && upward < 0.6) {
    return palette.gold.clone();
  }
  if (upward > 0.6) {
    const quilt = Math.floor(centre.z / 0.16) % 2 === 0 ? 1 : 0.9;
    return palette.leather.clone().multiplyScalar(quilt);
  }
  if (upward > 0.22 && upward < 0.3) {
    return palette.gold.clone();
  }
  return palette.night.clone();
};

const buildSaddleGeometry = (): BufferGeometry => {
  const rings = 40;
  const sections = Array.from({ length: rings }, (_, ring): Section => {
    const z = saddleBack + ((saddleFront - saddleBack) * ring) / (rings - 1);
    const middle = (saddleBack + saddleFront) / 2;
    const reach = Math.abs((z - middle) / ((saddleFront - saddleBack) / 2));
    const taper = Math.sqrt(Math.max(0.0004, 1 - reach ** 6));
    const top = findSeatTop(z);
    return {
      frame: buildFrame(point(0, top - seatDepth, z), new Vector3(0, 0, 1)),
      halfWidth: seatHalfWidth * (0.75 + 0.25 * taper) * taper,
      top: seatDepth * taper,
      bottom: seatDepth,
    };
  });
  return buildTube(sections, 40, paintSaddle);
};

const blanketBack = -0.05;
const blanketFront = 1.75;
const blanketRows = 26;
const blanketColumns = 52;

const findHemAngle = (z: number): number => {
  const middle = (blanketBack + blanketFront) / 2;
  const reach = (z - middle) / ((blanketFront - blanketBack) / 2);
  return -0.3 - 0.5 * (1 - reach * reach);
};

// A grid of points, each row a run of columns, with a colour at each point.
const buildGrid = (
  rows: readonly (readonly Vector3[])[],
  colourAt: (row: number, column: number) => Color,
  isFlipped = false,
): BufferGeometry => {
  const columns = rows[0].length;
  const positions = rows.flatMap((points) =>
    points.flatMap((place) => place.toArray()),
  );
  const colours = rows.flatMap((points, row) =>
    points.flatMap((_, column) => colourAt(row, column).toArray()),
  );
  const indices: number[] = [];
  for (let row = 0; row < rows.length - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      const here = row * columns + column;
      const above = here + columns;
      indices.push(
        ...(isFlipped
          ? [here, above + 1, here + 1, here, above, above + 1]
          : [here, here + 1, above + 1, here, above + 1, above]),
      );
    }
  }
  const indexed = new BufferGeometry();
  indexed.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  indexed.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(colours), 3),
  );
  indexed.setIndex(indices);
  indexed.computeVertexNormals();
  const flat = indexed.toNonIndexed();
  indexed.dispose();
  return flat;
};

const buildBlanketGeometry = (): BufferGeometry => {
  const rows = Array.from({ length: blanketRows + 2 }, (_, row) => {
    const share = clampShare((row - 1) / (blanketRows - 1));
    const z = blanketBack + (blanketFront - blanketBack) * share;
    const isEdgeRow = row === 0 || row === blanketRows + 1;
    const low = findHemAngle(z);
    return Array.from({ length: blanketColumns + 2 }, (_, column) => {
      const across = clampShare((column - 1) / (blanketColumns - 1));
      const angle = low + (Math.PI - 2 * low) * across;
      const isEdge = isEdgeRow || column === 0 || column === blanketColumns + 1;
      return placeOnTorso(z, angle, isEdge ? -0.01 : 0.035);
    });
  });
  return buildGrid(rows, (row, column) => {
    const fromEnd = Math.min(row, blanketRows + 1 - row);
    const fromHem = Math.min(column, blanketColumns + 1 - column);
    const fromEdge = Math.min(fromEnd, fromHem);
    if (fromEdge <= 2) {
      return palette.gold.clone();
    }
    if (fromEdge === 4) {
      return palette.goldPale.clone();
    }
    return palette.blanket.clone();
  });
};

const buildTasselGeometry = (): BufferGeometry[] =>
  [
    blanketBack + 0.25,
    (blanketBack + blanketFront) / 2,
    blanketFront - 0.25,
  ].flatMap((z) => {
    const hem = placeOnTorso(z, findHemAngle(z), 0.04);
    return both(
      mergeGeometries([
        buildBlob(hem, new Vector3(0.035, 0.035, 0.035), plain(palette.gold)),
        buildSpike(
          hem.clone().add(new Vector3(0.01, -0.02, 0)),
          hem.clone().add(new Vector3(0.03, -0.12, 0)),
          0.045,
          palette.goldDeep,
          palette.gold,
        ),
      ]),
    );
  });

const buildSaddleFittings = (): BufferGeometry[] => {
  const strapTop = point(seatHalfWidth - 0.02, dragonSaddle.y - 0.12, 0.85);
  const stirrup = point(0.7, 1.74, 0.85);
  const strap = buildRod(strapTop, stirrup, 0.03, 0.03, () =>
    palette.night.clone(),
  );
  const ring = paintFaces(
    new TorusGeometry(0.07, 0.017, 6, 16)
      .rotateY(Math.PI / 2)
      .rotateZ(-0.6)
      .translate(stirrup.x + 0.03, stirrup.y - 0.06, stirrup.z),
    () => palette.gold.clone(),
  );
  const tread = buildRod(
    point(stirrup.x + 0.06, stirrup.y - 0.13, stirrup.z - 0.06),
    point(stirrup.x + 0.06, stirrup.y - 0.13, stirrup.z + 0.06),
    0.02,
    0.02,
    () => palette.goldDeep.clone(),
    6,
  );
  const pommelTop = point(
    0,
    findSeatTop(saddleFront - 0.1) + 0.02,
    saddleFront - 0.1,
  );
  const handle = mergeGeometries([
    buildRod(
      pommelTop.clone().add(new Vector3(0, -0.05, 0)),
      pommelTop.clone().add(new Vector3(0, 0.09, 0.02)),
      0.04,
      0.035,
      () => palette.gold.clone(),
    ),
    buildBlob(
      pommelTop.clone().add(new Vector3(0, 0.11, 0.02)),
      new Vector3(0.06, 0.05, 0.06),
      plain(palette.gold),
    ),
  ]);
  const studs = [0.45, 0.85, 1.25].flatMap((z) =>
    both(
      buildBlob(
        point(seatHalfWidth * 0.93, findSeatTop(z) - 0.11, z),
        new Vector3(0.025, 0.025, 0.025),
        plain(palette.gold),
        8,
        6,
      ),
    ),
  );
  return [...both(mergeGeometries([strap, ring, tread])), handle, ...studs];
};

// --- The head ---------------------------------------------------------------

// z, centre height, half width, top, bottom — in the head's own frame, its
// origin where the neck meets it and +z along the snout.
const headKeys: readonly (readonly number[])[] = [
  [-0.24, 0.02, 0.21, 0.21, 0.21],
  [-0.06, 0.06, 0.29, 0.29, 0.26],
  [0.14, 0.08, 0.33, 0.32, 0.28],
  [0.36, 0.07, 0.33, 0.3, 0.28],
  [0.58, 0.03, 0.28, 0.23, 0.26],
  [0.77, -0.02, 0.22, 0.18, 0.22],
  [0.94, -0.04, 0.19, 0.16, 0.19],
  [1.07, -0.04, 0.19, 0.16, 0.18],
  [1.18, -0.04, 0.17, 0.14, 0.16],
  [1.26, -0.04, 0.12, 0.1, 0.11],
  [1.3, -0.04, 0.03, 0.02, 0.03],
];

const headBack = -0.24;
const headFront = 1.3;

const findHeadSection = (z: number): Section => {
  const [centre, halfWidth, top, bottom] = sampleKeys(headKeys, z);
  return {
    frame: buildFrame(point(0, centre, z), new Vector3(0, 0, 1)),
    halfWidth,
    top,
    bottom,
  };
};

// Where the side of the head is at a height, so features sit on its skin.
const findHeadSide = (z: number, y: number): number => {
  const { frame, halfWidth, top, bottom } = findHeadSection(z);
  const rise = y - frame.origin.y;
  const reach = Math.min(0.999, Math.abs(rise) / (rise > 0 ? top : bottom));
  const upward = reach ** (1 / fullness);
  return halfWidth * Math.sqrt(1 - upward * upward) ** fullness;
};

const findMouthHeight = (z: number): number =>
  -0.1 + 0.085 * clampShare((0.78 - z) / 0.36) ** 2;

const mouthCorner = 0.42;

const paintHead = (spot: HideSpot): Color => {
  const upward = Math.sin(spot.angle);
  const { z, y } = spot.centre;
  if (upward < -0.5 && y < findMouthHeight(z) - 0.02 && z > 0.05) {
    return mix(palette.cream, palette.gold, -upward - 0.5);
  }
  return paintScales(
    { ...spot, along: spot.along * 1.6 },
    palette.purple,
    palette.bright,
  );
};

const buildSkullGeometry = (): BufferGeometry => {
  const rings = 24;
  const sections = Array.from({ length: rings }, (_, ring) =>
    findHeadSection(headBack + ((headFront - headBack) * ring) / (rings - 1)),
  );
  return buildTube(sections, 22, paintHead);
};

const buildMouthGeometry = (): BufferGeometry => {
  const steps = 18;
  const side = Array.from({ length: steps }, (_, step) => {
    const z = mouthCorner + ((headFront - 0.06 - mouthCorner) * step) / steps;
    const y = findMouthHeight(z);
    return point(findHeadSide(z, y) + 0.004, y, z);
  });
  const frontZ = headFront - 0.04;
  const front = [0.6, 0.2, -0.2, -0.6].map((share) =>
    point(share * findHeadSide(frontZ - 0.02, -0.1) * 0.9, -0.1, frontZ + 0.01),
  );
  const line = [
    ...side,
    ...front,
    ...side.toReversed().map(({ x, y, z }) => point(-x, y, z)),
  ];
  const sections = line.map((place, index): Section => {
    const before = line[Math.max(0, index - 1)];
    const after = line[Math.min(line.length - 1, index + 1)];
    const reach = Math.min(index, line.length - 1 - index);
    const radius = 0.014 * Math.min(1, 0.4 + reach * 0.2);
    return {
      frame: buildFrame(place, after.clone().sub(before), new Vector3(0, 1, 0)),
      halfWidth: radius,
      top: radius,
      bottom: radius,
    };
  });
  return buildTube(sections, 6, () => palette.mouth.clone());
};

const eyeCentre = point(0.19, 0.19, 0.5);
const eyeRadius = 0.15;
const eyeLook = new Vector3(0.6, 0.06, 0.8).normalize();
const eyeGlint = new Vector3(0.48, 0.42, 0.77).normalize();

const buildEyeCap = (
  scale: number,
  opening: number,
  paint: (share: number) => Color,
): BufferGeometry =>
  paintFaces(
    new SphereGeometry(eyeRadius * scale, 18, 2, 0, Math.PI * 2, 0, opening)
      .applyQuaternion(new Quaternion().setFromUnitVectors(yAxis, eyeLook))
      .translate(eyeCentre.x, eyeCentre.y, eyeCentre.z),
    ({ x, y, z }) => {
      const facing = new Vector3(x, y, z).sub(eyeCentre).normalize();
      return paint(Math.acos(Math.min(1, facing.dot(eyeLook))) / opening);
    },
  );

const buildEyeGeometry = (): BufferGeometry => {
  const ball = buildBlob(
    eyeCentre,
    new Vector3(eyeRadius, eyeRadius, eyeRadius),
    plain(palette.ivory),
    12,
    8,
  );
  const iris = buildEyeCap(1.008, 0.78, (share) =>
    share > 0.86
      ? palette.goldDeep.clone()
      : mix(palette.amberLight, palette.amber, share ** 1.5),
  );
  const pupil = buildEyeCap(1.016, 0.4, () => palette.pupil.clone());
  const glint = buildBlob(
    eyeCentre.clone().addScaledVector(eyeGlint, eyeRadius * 1.01),
    new Vector3(0.026, 0.026, 0.026),
    plain(palette.ivory),
    6,
    4,
  );
  const lidPole = new Vector3(0.1, 1, -0.55).normalize();
  const lid = paintFaces(
    new SphereGeometry(eyeRadius * 1.07, 14, 3, 0, Math.PI * 2, 0, 0.92)
      .applyQuaternion(new Quaternion().setFromUnitVectors(yAxis, lidPole))
      .translate(eyeCentre.x, eyeCentre.y, eyeCentre.z),
    ({ x, y, z }) =>
      new Vector3(x, y, z).sub(eyeCentre).normalize().dot(lidPole) < 0.64
        ? palette.night.clone()
        : palette.purple.clone(),
  );
  return mergeGeometries([ball, iris, pupil, glint, lid]);
};

const buildHornGeometry = (
  points: readonly Vector3[],
  radius: number,
  rings: number,
): BufferGeometry =>
  buildTube(
    sectionsOnCurve(points, rings, (share) => {
      const size = radius * (1 - share * 0.94);
      return { halfWidth: size, top: size, bottom: size };
    }),
    8,
    ({ along }) =>
      Math.floor(along / 0.07) % 2 === 0
        ? palette.gold.clone()
        : palette.goldPale.clone(),
  );

const buildFrillGeometry = (): BufferGeometry => {
  const outline = new Shape();
  outline.moveTo(0, 0.1);
  outline.lineTo(0.4, 0.22);
  outline.quadraticCurveTo(0.24, 0.06, 0.44, -0.02);
  outline.quadraticCurveTo(0.24, -0.06, 0.32, -0.22);
  outline.lineTo(0, -0.1);
  outline.lineTo(0, 0.1);
  const frill = paintFaces(
    new ExtrudeGeometry(outline, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.012,
      bevelSegments: 1,
      curveSegments: 4,
    }).translate(0, 0, -0.015),
    ({ x }) =>
      x > 0.3
        ? palette.gold.clone()
        : mix(palette.violet, palette.lilac, x / 0.3),
  );
  const back = new Vector3(0.5, 0, -1).normalize();
  const up = new Vector3(0, 1, 0);
  return frill.applyMatrix4(
    new Matrix4()
      .makeBasis(back, up, back.clone().cross(up))
      .setPosition(0.25, -0.02, 0.0),
  );
};

const buildHeadFeatures = (): BufferGeometry[] => {
  const nostril = buildBlob(
    point(0.07, findMouthHeight(1.26) + 0.13, 1.25),
    new Vector3(0.032, 0.022, 0.02),
    plain(palette.nostril),
    7,
    4,
  );
  const fang = buildSpike(
    point(0.125, findMouthHeight(1.02) + 0.01, 1.02),
    point(0.13, findMouthHeight(1.02) - 0.065, 1.04),
    0.022,
    palette.ivory,
    palette.ivory,
    6,
  );
  const tooth = buildSpike(
    point(0.155, findMouthHeight(0.84) + 0.01, 0.84),
    point(0.16, findMouthHeight(0.84) - 0.04, 0.85),
    0.016,
    palette.ivory,
    palette.ivory,
    6,
  );
  const horn = buildHornGeometry(
    [
      point(0.14, 0.27, 0.02),
      point(0.2, 0.44, -0.16),
      point(0.27, 0.56, -0.44),
      point(0.31, 0.56, -0.74),
    ],
    0.085,
    10,
  );
  const smallHorn = buildHornGeometry(
    [
      point(0.27, 0.12, -0.02),
      point(0.36, 0.17, -0.16),
      point(0.42, 0.2, -0.3),
      point(0.45, 0.24, -0.44),
    ],
    0.05,
    6,
  );
  const cheek = buildBlob(
    point(0.22, -0.06, 0.34),
    new Vector3(0.12, 0.12, 0.15),
    plain(palette.violet),
    9,
    6,
  );
  return [
    ...both(
      mergeGeometries([
        buildEyeGeometry(),
        nostril,
        fang,
        tooth,
        horn,
        smallHorn,
        buildFrillGeometry(),
        cheek,
      ]),
    ),
    buildMouthGeometry(),
    placeOnFrame(
      buildFin(0.24, 0.16, 0.05),
      buildFrame(point(0, 0.36, -0.02), new Vector3(0, -0.4, 1)),
    ),
    placeOnFrame(
      buildFin(0.2, 0.12, 0.045),
      buildFrame(point(0, 0.3, -0.24), new Vector3(0, -0.6, 1)),
    ),
  ];
};

// --- The neck ---------------------------------------------------------------

const neckCurve = [
  point(0, 1.66, 1.95),
  point(0, 2.02, 2.85),
  point(0, 2.92, 2.98),
  point(0, 3.42, 3.45),
];
const neckPivot = point(0, 1.72, 2.2);
const headPivot = neckCurve[3];
const headTilt = 0.22;

const findNeckRadii = (share: number) => {
  const thinning = share ** 0.8;
  return {
    halfWidth: 0.46 - 0.22 * thinning,
    top: 0.42 - 0.18 * thinning,
    bottom: 0.46 - 0.21 * thinning,
  };
};

const buildNeckGeometry = (): BufferGeometry => {
  const tube = buildTube(
    sectionsOnCurve(neckCurve, 20, findNeckRadii),
    18,
    paintRingedHide,
  );
  const fins = [0.12, 0.3, 0.48, 0.66, 0.84].map((share, index) => {
    const frame = frameOnCurve(neckCurve, share);
    const { top } = findNeckRadii(share);
    return placeOnFrame(
      buildFin(0.34 - index * 0.03, 0.24 - index * 0.025, 0.06),
      {
        ...frame,
        origin: frame.origin.clone().addScaledVector(frame.up, top - 0.03),
      },
    );
  });
  return mergeGeometries([tube, ...fins]);
};

const buildHeadGeometry = (): BufferGeometry =>
  mergeGeometries([buildSkullGeometry(), ...buildHeadFeatures()]).applyMatrix4(
    new Matrix4()
      .makeTranslation(headPivot.x, headPivot.y, headPivot.z)
      .multiply(new Matrix4().makeRotationX(headTilt)),
  );

// --- The tail ---------------------------------------------------------------

const tailRootCurve = [
  point(0, 1.66, -2.45),
  point(0, 1.6, -3.4),
  point(0, 0.95, -3.85),
  point(0, 0.55, -4.35),
];
const tailTipCurve = [
  tailRootCurve[3],
  point(0, 0.3, -4.7),
  point(0, 0.22, -4.95),
  point(0, 0.36, -5.2),
];
const tailPivot = point(0, 1.62, -2.7);
const tailBend = tailRootCurve[3];

const listTailFins = (
  curve: readonly Vector3[],
  shares: readonly number[],
  size: (share: number) => number,
  radius: (share: number) => number,
): BufferGeometry[] =>
  shares.map((share) => {
    const frame = frameOnCurve(curve, share, rightward);
    const scale = size(share);
    return placeOnFrame(buildFin(0.36 * scale, 0.26 * scale, 0.06 * scale), {
      ...frame,
      origin: frame.origin
        .clone()
        .addScaledVector(frame.up, radius(share) - 0.02),
    });
  });

const tailRootRadius = (share: number): number => 0.4 - 0.2 * share;
const tailTipRadius = (share: number): number => 0.2 - 0.14 * share ** 0.9;

const buildTailRootGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildTube(
      sectionsOnCurve(
        tailRootCurve,
        17,
        (share) => {
          const radius = tailRootRadius(share);
          return {
            halfWidth: radius * 1.05,
            top: radius * 0.95,
            bottom: radius,
          };
        },
        rightward,
      ),
      16,
      (spot) => paintRingedHide({ ...spot, along: spot.along + 0.1 }),
    ),
    ...listTailFins(
      tailRootCurve,
      [0.12, 0.38, 0.64, 0.9],
      (share) => 0.95 - share * 0.35,
      (share) => tailRootRadius(share) * 0.95,
    ),
  ]);

const buildSpadeGeometry = (): BufferGeometry => {
  const outline = new Shape();
  outline.moveTo(-0.05, 0.07);
  outline.quadraticCurveTo(0.04, 0.3, 0.22, 0.27);
  outline.quadraticCurveTo(0.38, 0.2, 0.56, 0);
  outline.quadraticCurveTo(0.38, -0.2, 0.22, -0.27);
  outline.quadraticCurveTo(0.04, -0.3, -0.05, -0.07);
  outline.lineTo(-0.05, 0.07);
  const build = (depth: number, scale: number, colour: Color) =>
    paintFaces(
      new ExtrudeGeometry(outline, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: 1,
        curveSegments: 5,
      })
        .translate(-0.18, 0, -depth / 2)
        .scale(scale, scale, 1)
        .translate(0.18, 0, 0),
      () => colour.clone(),
    );
  const spade = mergeGeometries([
    build(0.04, 1, palette.gold),
    build(0.07, 0.74, palette.violet),
  ]);
  const frame = frameOnCurve(tailTipCurve, 1, rightward);
  return placeOnFrame(spade, frame);
};

const buildTailTipGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildTube(
      sectionsOnCurve(
        tailTipCurve,
        15,
        (share) => {
          const radius = tailTipRadius(share);
          return {
            halfWidth: radius * 1.05,
            top: radius * 0.95,
            bottom: radius,
          };
        },
        rightward,
      ),
      12,
      (spot) => paintRingedHide({ ...spot, along: spot.along + 2.6 }),
    ),
    ...listTailFins(
      tailTipCurve,
      [0.15, 0.45, 0.75],
      (share) => 0.6 - share * 0.3,
      (share) => tailTipRadius(share) * 0.95,
    ),
    buildSpadeGeometry(),
  ]);

// --- The legs ---------------------------------------------------------------

const legAround = 12;

const paintLeg = (spot: HideSpot): Color =>
  paintScales(spot, palette.purple, palette.violet);

const buildLimb = (
  curve: readonly Vector3[],
  radiusFrom: number,
  radiusTo: number,
  dome: number,
  bulge: number,
): BufferGeometry =>
  buildTube(
    sectionsOnCurve(curve, 11, (share) => {
      const radius =
        (radiusFrom + (radiusTo - radiusFrom) * share) *
        domeIn(share, dome) *
        (1 + bulge * Math.sin(Math.PI * Math.min(1, share * 1.4)));
      return { halfWidth: radius, top: radius * 1.08, bottom: radius * 1.08 };
    }),
    legAround,
    paintLeg,
  );

const buildFoot = (
  heel: Vector3,
  centre: Vector3,
  radii: Vector3,
  toeZ: number,
): BufferGeometry => {
  const toes = [-1, 0, 1].flatMap((step) => {
    const toe = point(
      centre.x + step * radii.x * 0.6,
      0.065,
      toeZ - Math.abs(step) * 0.05,
    );
    return [
      buildBlob(
        toe,
        new Vector3(0.07, 0.065, 0.08),
        plain(palette.royal),
        8,
        5,
      ),
      buildSpike(
        toe.clone().add(new Vector3(step * 0.01, 0.0, 0.05)),
        toe.clone().add(new Vector3(step * 0.03, -0.045, 0.15)),
        0.035,
        palette.goldPale,
        palette.gold,
        7,
      ),
    ];
  });
  return mergeGeometries([
    buildBlob(heel, new Vector3(0.13, 0.13, 0.13), plain(palette.royal), 9, 6),
    buildBlob(
      centre,
      radii,
      (normal) =>
        normal.y < -0.5 ? palette.deep.clone() : palette.royal.clone(),
      12,
      7,
    ),
    ...toes,
  ]);
};

const foreShoulder = point(0.56, dragonShoulder.y, dragonShoulder.z);
const foreElbow = point(0.63, 0.88, 1.36);
const foreWrist = point(0.64, 0.24, 1.5);
const hindHip = point(0.55, dragonHip.y, dragonHip.z);
const hindKnee = point(0.68, 0.98, -1.12);
const hindAnkle = point(0.7, 0.3, -1.7);

const buildForeUpperGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildLimb(
      [
        point(0.3, 1.82, 1.62),
        point(0.6, 1.55, 1.58),
        point(0.63, 1.1, 1.42),
        foreElbow,
      ],
      0.36,
      0.19,
      0.18,
      0.12,
    ),
    buildBlob(
      foreElbow,
      new Vector3(0.19, 0.19, 0.19),
      plain(palette.royal),
      10,
      7,
    ),
  ]);

const buildForeLowerGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildLimb(
      [foreElbow, point(0.635, 0.66, 1.38), point(0.64, 0.42, 1.44), foreWrist],
      0.2,
      0.14,
      0.01,
      0.14,
    ),
  ]);

const buildForePawGeometry = (): BufferGeometry =>
  buildFoot(
    foreWrist,
    point(0.64, 0.11, 1.62),
    new Vector3(0.17, 0.11, 0.24),
    1.8,
  );

const buildHindUpperGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildLimb(
      [
        point(0.28, 1.95, -1.95),
        point(0.6, 1.55, -1.75),
        point(0.68, 1.2, -1.35),
        hindKnee,
      ],
      0.54,
      0.22,
      0.2,
      0.1,
    ),
    buildBlob(
      hindKnee,
      new Vector3(0.22, 0.22, 0.22),
      plain(palette.royal),
      10,
      7,
    ),
  ]);

const buildHindLowerGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildLimb(
      [hindKnee, point(0.69, 0.75, -1.35), point(0.7, 0.5, -1.6), hindAnkle],
      0.21,
      0.13,
      0.01,
      0.14,
    ),
  ]);

const buildHindFootGeometry = (): BufferGeometry =>
  buildFoot(
    hindAnkle,
    point(0.7, 0.11, -1.45),
    new Vector3(0.17, 0.11, 0.3),
    -1.2,
  );

// --- The wings --------------------------------------------------------------

const wingRoot = point(0.45, 1.84, 0.08);
const wingElbow = point(1.15, 0.12, -0.42);
const wingWrist = point(2.45, 0.22, 0.05);
const innerTrailingRoot = point(0, 0, -1.95);
const wristTrailing = point(0.06, 0, -0.75);
// Each finger's tip, from the wrist.
const fingerTips = [
  point(3.6, 0.12, -0.25),
  point(3.05, 0.04, -1.55),
  point(2.15, 0, -2.45),
  point(1.05, -0.02, -2.75),
];
const membraneHalfThickness = 0.012;

const paintMembrane = (out: number, nearBone: number): Color => {
  if (out > 0.965) {
    return palette.lavender.clone();
  }
  return mix(palette.violet, palette.lilac, out ** 1.3).multiplyScalar(
    1 - 0.22 * nearBone,
  );
};

const buildMembrane = (
  place: (along: number, across: number) => Vector3,
  colourAt: (along: number, across: number) => Color,
  alongSteps: number,
  acrossSteps: number,
): BufferGeometry => {
  const layer = (lift: number) =>
    Array.from({ length: alongSteps + 1 }, (_, row) =>
      Array.from({ length: acrossSteps + 1 }, (_, column) =>
        place(row / alongSteps, column / acrossSteps).add(
          new Vector3(0, lift, 0),
        ),
      ),
    );
  const colour = (row: number, column: number) =>
    colourAt(row / alongSteps, column / acrossSteps);
  return mergeGeometries([
    buildGrid(layer(membraneHalfThickness), colour, true),
    buildGrid(layer(-membraneHalfThickness), colour, false),
  ]);
};

const billow = (along: number, across: number): number =>
  -0.07 * Math.sin(Math.PI * along) * Math.sin(Math.PI * across);

const findArmPoint = (share: number): Vector3 =>
  share < 0.45
    ? new Vector3().lerpVectors(new Vector3(), wingElbow, share / 0.45)
    : new Vector3().lerpVectors(wingElbow, wingWrist, (share - 0.45) / 0.55);

const buildInnerWingGeometry = (): BufferGeometry => {
  const membrane = buildMembrane(
    (along, across) => {
      const leading = findArmPoint(along);
      const trailing = new Vector3()
        .lerpVectors(
          innerTrailingRoot,
          wingWrist.clone().add(wristTrailing),
          along,
        )
        .add(new Vector3(0, 0, 0.32 * Math.sin(Math.PI * along)));
      return new Vector3()
        .lerpVectors(leading, trailing, across)
        .add(new Vector3(0, billow(along, across), 0));
    },
    (along, across) =>
      paintMembrane(
        across,
        clampShare(1 - across * 6) + clampShare(1 - along * 5),
      ),
    10,
    6,
  );
  const fleshy = (share: number) => mix(palette.purple, palette.violet, share);
  const bones = [
    buildBlob(
      new Vector3(),
      new Vector3(0.2, 0.17, 0.24),
      plain(palette.purple),
      10,
      7,
    ),
    buildRod(new Vector3(), wingElbow, 0.15, 0.1, fleshy, 12),
    buildBlob(
      wingElbow,
      new Vector3(0.1, 0.1, 0.1),
      plain(palette.violet),
      8,
      5,
    ),
    buildRod(wingElbow, wingWrist, 0.1, 0.075, fleshy, 12),
    buildBlob(
      wingWrist,
      new Vector3(0.09, 0.09, 0.09),
      plain(palette.gold),
      8,
      5,
    ),
    buildSpike(
      wingWrist.clone().add(new Vector3(0, 0.04, 0.03)),
      wingWrist.clone().add(new Vector3(0.1, 0.2, 0.24)),
      0.045,
      palette.goldPale,
      palette.gold,
    ),
  ];
  return mergeGeometries([membrane, ...bones]);
};

const buildOuterWingGeometry = (): BufferGeometry => {
  const edges = [...fingerTips, wristTrailing];
  const panels = edges.slice(0, -1).map((tip, panel) => {
    const nextTip = edges[panel + 1];
    const scallop = panel === edges.length - 2 ? 0.12 : 0.24;
    return buildMembrane(
      (along, across) => {
        const out = 0.04 + 0.96 * along;
        const edge = new Vector3()
          .lerpVectors(tip, nextTip, across)
          .multiplyScalar(1 - scallop * Math.sin(Math.PI * across));
        return edge
          .multiplyScalar(out)
          .add(new Vector3(0, billow(out, across) * 0.8, 0));
      },
      (along, across) =>
        paintMembrane(along, clampShare(1 - Math.min(across, 1 - across) * 7)),
      6,
      4,
    );
  });
  const fingers = fingerTips.map((tip, finger) =>
    buildRod(
      new Vector3(),
      tip,
      0.06 - finger * 0.006,
      0.016,
      (share) => mix(palette.gold, palette.goldPale, share),
      8,
    ),
  );
  const claw = buildSpike(
    fingerTips[0],
    fingerTips[0].clone().add(new Vector3(0.18, -0.02, 0.05)),
    0.03,
    palette.gold,
    palette.goldPale,
    6,
  );
  return mergeGeometries([...panels, ...fingers, claw]);
};

// --- Building ---------------------------------------------------------------

export const buildDragonGeometry = (): BufferGeometry => {
  return mergeGeometries([
    buildBellyRidgedTorso(),
    ...listBackFins(),
    buildBlanketGeometry(),
    buildSaddleGeometry(),
    ...buildSaddleFittings(),
    ...buildTasselGeometry(),
  ]);
};

const listDragonDecals = (): LiveryDecal[] => {
  const middle = (blanketBack + blanketFront) / 2;
  return [
    ...onBothSides({
      face: "name",
      centre: [0.7, 1.4, middle - 0.05],
      outward: [1, -0.15, 0],
      up: [0, 1, 0],
      width: 1.0,
      height: 0.25,
    }),
    ...onBothSides({
      face: "flag",
      centre: [0.62, 1.66, middle - 0.05],
      outward: [1, 0.3, 0],
      up: [0, 1, 0],
      width: 0.46,
      height: 0.23,
    }),
  ];
};

export const buildDragonLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    { surface: buildBlanketGeometry(), decals: listDragonDecals() },
  ]);

// The moving parts, in order: the left wing's arm and hand, the right wing's
// arm and hand, the neck, the head, the tail's root and tip, then each leg's
// upper part, lower part and foot — left fore, right fore, left hind, right
// hind.
export const buildDragonMovingPartsGeometry = (): BufferGeometry[] => {
  const innerWing = buildInnerWingGeometry();
  const outerWing = buildOuterWingGeometry();
  const foreLeg = [
    buildForeUpperGeometry(),
    buildForeLowerGeometry(),
    buildForePawGeometry(),
  ];
  const hindLeg = [
    buildHindUpperGeometry(),
    buildHindLowerGeometry(),
    buildHindFootGeometry(),
  ];
  return [
    innerWing,
    outerWing,
    mirrorGeometry(innerWing),
    mirrorGeometry(outerWing),
    buildNeckGeometry(),
    buildHeadGeometry(),
    buildTailRootGeometry(),
    buildTailTipGeometry(),
    ...foreLeg,
    ...foreLeg.map(mirrorGeometry),
    ...hindLeg,
    ...hindLeg.map(mirrorGeometry),
  ];
};

// --- Posing -----------------------------------------------------------------

const turnX = (angle: number) => new Matrix4().makeRotationX(angle);
const turnY = (angle: number) => new Matrix4().makeRotationY(angle);
const turnZ = (angle: number) => new Matrix4().makeRotationZ(angle);
const moveTo = ({ x, y, z }: Vector3) => new Matrix4().makeTranslation(x, y, z);

const turnAbout = (pivot: Vector3, ...turns: Matrix4[]): Matrix4 =>
  turns
    .reduce((built, turn) => built.multiply(turn), moveTo(pivot))
    .multiply(moveTo(pivot.clone().negate()));

const blend = (from: number, to: number, share: number): number =>
  from + (to - from) * share;

interface WingPose {
  lift: number;
  pitch: number;
  sweep: number;
  raise: number;
  roll: number;
  chord: number;
  flex: number;
  fold: number;
  handChord: number;
}

const foldedWing: WingPose = {
  lift: 0.2,
  pitch: 0.2,
  sweep: 1.48,
  raise: 0.1,
  roll: -1.45,
  chord: 0.5,
  flex: 0.3,
  fold: 0.62,
  handChord: 0.14,
};

const findSpreadWing = (beat: number, lag: number): WingPose => ({
  lift: 0,
  pitch: 0,
  sweep: 0.12,
  raise: 0.1 + 0.5 * beat,
  roll: 0,
  chord: 1,
  flex: 0.06 + 0.32 * lag,
  fold: 0,
  handChord: 1,
});

const placeLeftWing = (pose: WingPose): Matrix4[] => {
  const arm = moveTo(wingRoot.clone().add(new Vector3(pose.lift, 0, 0)))
    .multiply(turnX(pose.pitch))
    .multiply(turnY(pose.sweep))
    .multiply(turnZ(pose.raise))
    .multiply(turnX(pose.roll));
  const inner = arm.clone().multiply(new Matrix4().makeScale(1, 1, pose.chord));
  const hand = arm
    .clone()
    .multiply(moveTo(point(wingWrist.x, wingWrist.y, wingWrist.z * pose.chord)))
    .multiply(turnZ(pose.flex))
    .multiply(turnY(pose.fold))
    .multiply(new Matrix4().makeScale(1, 1, pose.handChord));
  return [inner, hand];
};

const placeWings = (airborne: number, turn: number): Matrix4[] => {
  const spread = ease(airborne);
  const beat = Math.sin(turn * 0.16);
  const lag = Math.sin(turn * 0.16 - 0.9);
  const open = findSpreadWing(beat * spread, lag * spread);
  const pose: WingPose = {
    lift: blend(foldedWing.lift, open.lift, spread),
    pitch: blend(foldedWing.pitch, open.pitch, spread),
    sweep: blend(foldedWing.sweep, open.sweep, spread),
    raise: blend(foldedWing.raise, open.raise, spread),
    roll: blend(foldedWing.roll, open.roll, spread),
    chord: blend(foldedWing.chord, open.chord, spread),
    flex: blend(foldedWing.flex, open.flex, spread),
    fold: blend(foldedWing.fold, open.fold, spread),
    handChord: blend(foldedWing.handChord, open.handChord, spread),
  };
  const left = placeLeftWing(pose);
  return [...left, ...left.map(mirrorMatrix)];
};

const placeNeckAndHead = (
  bow: number,
  airborne: number,
  turn: number,
): Matrix4[] => {
  const kneel = ease(bow);
  const flying = ease(airborne);
  const breath = Math.sin(turn * 0.03) * 0.025;
  const look = Math.sin(turn * 0.019) * 0.14 * (1 - flying) * (1 - kneel);
  const neck = turnAbout(
    neckPivot,
    turnY(look * 0.6),
    turnX(0.56 * kneel + 0.75 * flying + breath),
  );
  const head = neck
    .clone()
    .multiply(
      turnAbout(
        headPivot,
        turnY(look),
        turnX(0.02 * kneel - 0.62 * flying - breath * 0.5),
      ),
    );
  return [neck, head];
};

const placeTail = (bow: number, airborne: number, turn: number): Matrix4[] => {
  const kneel = ease(bow);
  const flying = ease(airborne);
  const sway = Math.sin(turn * 0.045);
  const swayLater = Math.sin(turn * 0.045 - 0.8);
  const root = turnAbout(
    tailPivot,
    turnY(sway * 0.12),
    turnX(0.16 * kneel + 0.62 * flying),
  );
  const tip = root
    .clone()
    .multiply(
      turnAbout(
        tailBend,
        turnY(swayLater * 0.22),
        turnX(-0.1 * kneel + 0.55 * flying),
      ),
    );
  return [root, tip];
};

interface LegBend {
  splay: number;
  upper: number;
  lower: number;
  foot: number;
}

// Each leg's upper part turns about its hip, the lower part hangs from the
// moved knee or elbow at its own pitch and the foot from the moved ankle, so
// feet can stay flat on the grass whatever the leg above them does.
const placeLeftLeg = (
  hip: Vector3,
  joint: Vector3,
  ankle: Vector3,
  { splay, upper, lower, foot }: LegBend,
): Matrix4[] => {
  const outward = turnZ(splay);
  const upperPart = turnAbout(hip, outward, turnX(upper));
  const lowerPart = moveTo(joint.clone().applyMatrix4(upperPart))
    .multiply(outward)
    .multiply(turnX(lower))
    .multiply(moveTo(joint.clone().negate()));
  const footPart = moveTo(ankle.clone().applyMatrix4(lowerPart))
    .multiply(outward)
    .multiply(turnX(foot))
    .multiply(moveTo(ankle.clone().negate()));
  return [upperPart, lowerPart, footPart];
};

const placeLegs = (bow: number, airborne: number, turn: number): Matrix4[] => {
  const kneel = ease(bow);
  const flying = ease(airborne) * (1 - kneel);
  const paddle = Math.sin(turn * 0.16 + 0.6) * 0.08 * flying;
  const fore = placeLeftLeg(foreShoulder, foreElbow, foreWrist, {
    splay: 0.2 * kneel,
    upper: 1.1 * kneel + (1.15 + paddle) * flying,
    lower: -1.45 * kneel + 0.1 * flying,
    foot: -0.1 * kneel + 1.3 * flying,
  });
  const hind = placeLeftLeg(hindHip, hindKnee, hindAnkle, {
    splay: 0.16 * kneel,
    upper: -0.62 * kneel + (1.35 + paddle) * flying,
    lower: 0.5 * kneel + 1.65 * flying,
    foot: -0.1 * kneel + 1.75 * flying,
  });
  return [
    ...fore,
    ...fore.map(mirrorMatrix),
    ...hind,
    ...hind.map(mirrorMatrix),
  ];
};

export const placeDragonMovingParts = (
  bow: number,
  airborne: number,
  turn: number,
): Matrix4[] => {
  const body = placeDragonBody(bow);
  return [
    ...placeWings(airborne, turn),
    ...placeNeckAndHead(bow, airborne, turn),
    ...placeTail(bow, airborne, turn),
    ...placeLegs(bow, airborne, turn),
  ].map((local) => body.clone().multiply(local));
};
