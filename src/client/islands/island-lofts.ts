import { BufferAttribute, BufferGeometry, Color, Vector3 } from "three";
import type { Triple } from "../world-map-models.js";

export const paintFaces = (
  geometry: BufferGeometry,
  paint: (centre: { x: number; y: number; z: number }) => Color,
): BufferGeometry => {
  const flat = geometry.index === null ? geometry : geometry.toNonIndexed();
  const positions = flat.getAttribute("position");
  const colours = new Float32Array(positions.count * 3);
  for (let corner = 0; corner < positions.count; corner += 3) {
    const centre = {
      x:
        (positions.getX(corner) +
          positions.getX(corner + 1) +
          positions.getX(corner + 2)) /
        3,
      y:
        (positions.getY(corner) +
          positions.getY(corner + 1) +
          positions.getY(corner + 2)) /
        3,
      z:
        (positions.getZ(corner) +
          positions.getZ(corner + 1) +
          positions.getZ(corner + 2)) /
        3,
    };
    const colour = paint(centre);
    for (let vertex = corner; vertex < corner + 3; vertex++) {
      colour.toArray(colours, vertex * 3);
    }
  }
  flat.setAttribute("color", new BufferAttribute(colours, 3));
  flat.deleteAttribute("uv");
  return flat;
};

const findCentre = (ring: readonly Triple[]): Triple => {
  const total = ring.reduce<Triple>(
    ([x, y, z], [pointX, pointY, pointZ]) => [
      x + pointX,
      y + pointY,
      z + pointZ,
    ],
    [0, 0, 0],
  );
  return [
    total[0] / ring.length,
    total[1] / ring.length,
    total[2] / ring.length,
  ];
};

const findEnclosedVolume = (
  positions: readonly number[],
  indices: readonly number[],
): number => {
  const first = new Vector3();
  const second = new Vector3();
  const third = new Vector3();
  let volume = 0;
  for (let corner = 0; corner < indices.length; corner += 3) {
    first.fromArray(positions, indices[corner] * 3);
    second.fromArray(positions, indices[corner + 1] * 3);
    third.fromArray(positions, indices[corner + 2] * 3);
    volume += first.dot(second.cross(third));
  }
  return volume;
};

export const buildLoftGeometry = (
  rings: readonly (readonly Triple[])[],
): BufferGeometry => {
  const around = rings[0].length;
  const positions = rings.flat().flat();
  const indices: number[] = [];
  rings.slice(1).forEach((_, ringIndex) => {
    for (let point = 0; point < around; point++) {
      const here = ringIndex * around + point;
      const next = ringIndex * around + ((point + 1) % around);
      const above = here + around;
      const aboveNext = next + around;
      indices.push(here, next, aboveNext, here, aboveNext, above);
    }
  });
  const caps = [
    { ring: rings[0], offset: 0, isFirst: true },
    {
      ring: rings[rings.length - 1],
      offset: (rings.length - 1) * around,
      isFirst: false,
    },
  ];
  caps.forEach(({ ring, offset, isFirst }) => {
    const centreIndex = positions.length / 3;
    positions.push(...findCentre(ring));
    for (let point = 0; point < around; point++) {
      const here = offset + point;
      const next = offset + ((point + 1) % around);
      indices.push(
        ...(isFirst ? [centreIndex, next, here] : [centreIndex, here, next]),
      );
    }
  });
  const isInsideOut = findEnclosedVolume(positions, indices) < 0;
  const facingIndices = isInsideOut
    ? indices.flatMap((_, corner) =>
        corner % 3 === 0
          ? [indices[corner], indices[corner + 2], indices[corner + 1]]
          : [],
      )
    : indices;
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setIndex(facingIndices);
  geometry.computeVertexNormals();
  return geometry;
};

const findTriangleCentre = (
  positions: BufferAttribute,
  first: number,
  count: number,
): { x: number; y: number; z: number } => {
  const centre = { x: 0, y: 0, z: 0 };
  for (let corner = first; corner < first + count; corner++) {
    centre.x += positions.getX(corner) / count;
    centre.y += positions.getY(corner) / count;
    centre.z += positions.getZ(corner) / count;
  }
  return centre;
};

export const buildPaintedLoft = (
  rings: readonly (readonly Triple[])[],
  paint: (centre: { x: number; y: number; z: number }) => Color,
): BufferGeometry => {
  const flat = buildLoftGeometry(rings).toNonIndexed();
  const positions = flat.getAttribute("position");
  if (!(positions instanceof BufferAttribute)) {
    return flat;
  }
  const sideCorners = (rings.length - 1) * rings[0].length * 6;
  const colours = new Float32Array(positions.count * 3);
  for (let corner = 0; corner < positions.count; corner += 3) {
    const isSide = corner < sideCorners;
    const first = isSide ? corner - (corner % 6) : corner;
    const colour = paint(findTriangleCentre(positions, first, isSide ? 6 : 3));
    for (let vertex = corner; vertex < corner + 3; vertex++) {
      colour.toArray(colours, vertex * 3);
    }
  }
  flat.setAttribute("color", new BufferAttribute(colours, 3));
  return flat;
};

const airfoilStations = 9;

const findAirfoilThickness = (share: number): number =>
  5 *
  (0.2969 * Math.sqrt(share) -
    0.126 * share -
    0.3516 * share ** 2 +
    0.2843 * share ** 3 -
    0.1036 * share ** 4);

const listAirfoilOutline = (
  thickness: number,
  camber: number,
): { along: number; across: number }[] => {
  const shares = Array.from(
    { length: airfoilStations },
    (_, station) =>
      (1 - Math.cos((Math.PI * station) / (airfoilStations - 1))) / 2,
  );
  const findCamber = (share: number) => camber * 4 * share * (1 - share);
  const upper = shares.toReversed().map((share) => ({
    along: share,
    across: findCamber(share) + thickness * findAirfoilThickness(share),
  }));
  const lower = shares.slice(1, -1).map((share) => ({
    along: share,
    across: findCamber(share) - thickness * findAirfoilThickness(share),
  }));
  return [...upper, ...lower];
};

export interface AirfoilSection {
  leadingEdge: Triple;
  chord: Triple;
  thicknessAxis: Triple;
  thickness: number;
  camber?: number;
}

const buildAirfoilRing = ({
  leadingEdge,
  chord,
  thicknessAxis,
  thickness,
  camber = 0,
}: AirfoilSection): Triple[] => {
  const chordLength = Math.hypot(...chord);
  return listAirfoilOutline(thickness, camber).map(({ along, across }) => [
    leadingEdge[0] + chord[0] * along + thicknessAxis[0] * across * chordLength,
    leadingEdge[1] + chord[1] * along + thicknessAxis[1] * across * chordLength,
    leadingEdge[2] + chord[2] * along + thicknessAxis[2] * across * chordLength,
  ]);
};

export const buildAirfoilLoft = (
  sections: readonly AirfoilSection[],
): BufferGeometry => buildLoftGeometry(sections.map(buildAirfoilRing));

export const paintAll = (
  geometry: BufferGeometry,
  colour: string,
): BufferGeometry => {
  const paint = new Color(colour);
  return paintFaces(geometry, () => paint);
};
