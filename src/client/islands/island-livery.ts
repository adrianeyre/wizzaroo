import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from "three";
import type { Triple } from "../world-map-models.js";
import { liveryFaceRows, type LiveryFace } from "./wizzaroo-flag.js";

export interface LiveryDecal {
  face: LiveryFace;
  centre: Triple;
  outward: Triple;
  up: Triple;
  width: number;
  height: number;
}

export interface LiveryPanel {
  surface: BufferGeometry;
  decals: readonly LiveryDecal[];
}

const decalColumns = 24;
const decalRows = 10;
const decalLift = 0.012;
const rayStart = 4;

const toVector = ([x, y, z]: Triple) => new Vector3(x, y, z);

const listDecalPoints = (
  surface: Mesh,
  { centre, outward, up, width, height }: LiveryDecal,
): Vector3[] => {
  const out = toVector(outward).normalize();
  const upward = toVector(up).normalize();
  const right = upward.clone().cross(out).normalize();
  const middle = toVector(centre);
  const raycaster = new Raycaster();
  const inward = out.clone().negate();
  return Array.from(
    { length: (decalRows + 1) * (decalColumns + 1) },
    (_, index) => {
      const column = index % (decalColumns + 1);
      const row = Math.floor(index / (decalColumns + 1));
      const flat = middle
        .clone()
        .addScaledVector(right, (column / decalColumns - 0.5) * width)
        .addScaledVector(upward, (row / decalRows - 0.5) * height);
      raycaster.set(flat.clone().addScaledVector(out, rayStart), inward);
      raycaster.far = rayStart * 2;
      const hit = raycaster.intersectObject(surface).at(0);
      return hit === undefined
        ? flat
        : hit.point.clone().addScaledVector(out, decalLift);
    },
  );
};

const buildDecalGeometry = (
  surface: Mesh,
  decal: LiveryDecal,
): BufferGeometry => {
  const points = listDecalPoints(surface, decal);
  const { bottom, top } = liveryFaceRows[decal.face];
  const uvs = points.flatMap((_, index) => [
    (index % (decalColumns + 1)) / decalColumns,
    bottom +
      (top - bottom) * (Math.floor(index / (decalColumns + 1)) / decalRows),
  ]);
  const indices: number[] = [];
  for (let row = 0; row < decalRows; row++) {
    for (let column = 0; column < decalColumns; column++) {
      const corner = row * (decalColumns + 1) + column;
      const above = corner + decalColumns + 1;
      indices.push(corner, corner + 1, above + 1, corner, above + 1, above);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array(points.flatMap(({ x, y, z }) => [x, y, z])),
      3,
    ),
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const mergeDecals = (parts: readonly BufferGeometry[]): BufferGeometry => {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  parts.forEach((part) => {
    const offset = positions.length / 3;
    positions.push(...part.getAttribute("position").array);
    normals.push(...part.getAttribute("normal").array);
    uvs.push(...part.getAttribute("uv").array);
    indices.push(...(part.index?.array ?? []).map((index) => index + offset));
    part.dispose();
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute(
    "normal",
    new BufferAttribute(new Float32Array(normals), 3),
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  return geometry;
};

export const buildLiveryGeometry = (
  panels: readonly LiveryPanel[],
): BufferGeometry => {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const decals = panels.flatMap(({ surface, decals: onSurface }) => {
    const mesh = new Mesh(surface, material);
    mesh.updateMatrixWorld();
    const built = onSurface.map((decal) => buildDecalGeometry(mesh, decal));
    surface.dispose();
    return built;
  });
  material.dispose();
  return mergeDecals(decals);
};

export const mirrorDecal = (decal: LiveryDecal): LiveryDecal => ({
  ...decal,
  centre: [-decal.centre[0], decal.centre[1], decal.centre[2]],
  outward: [-decal.outward[0], decal.outward[1], decal.outward[2]],
});

export const onBothSides = (decal: LiveryDecal): LiveryDecal[] => [
  decal,
  mirrorDecal(decal),
];
