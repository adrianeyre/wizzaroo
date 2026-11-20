import { BufferAttribute, Matrix3, Vector3, type Matrix4 } from "three";
import type { BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

interface PartRange {
  start: number;
  count: number;
}

export interface MovingPartsModel {
  geometry: BufferGeometry;
  ranges: PartRange[];
  restingPositions: Float32Array;
  restingNormals: Float32Array;
}

export const buildMovingPartsModel = (
  parts: readonly BufferGeometry[],
): MovingPartsModel => {
  const ranges = parts.reduce<PartRange[]>((built, part) => {
    const previous = built.at(-1);
    const start = previous === undefined ? 0 : previous.start + previous.count;
    return [...built, { start, count: part.getAttribute("position").count }];
  }, []);
  const geometry = mergeGeometries([...parts]);
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  return {
    geometry,
    ranges,
    restingPositions: Float32Array.from(positions.array),
    restingNormals: Float32Array.from(normals.array),
  };
};

const corner = new Vector3();
const facing = new Matrix3();

export const moveParts = (
  { geometry, ranges, restingPositions, restingNormals }: MovingPartsModel,
  placements: readonly Matrix4[],
) => {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  if (
    !(positions instanceof BufferAttribute) ||
    !(normals instanceof BufferAttribute)
  ) {
    return;
  }
  ranges.forEach(({ start, count }, index) => {
    const placement = placements[index];
    facing.getNormalMatrix(placement);
    for (let vertex = start; vertex < start + count; vertex++) {
      corner
        .fromArray(restingPositions, vertex * 3)
        .applyMatrix4(placement)
        .toArray(positions.array, vertex * 3);
      corner
        .fromArray(restingNormals, vertex * 3)
        .applyMatrix3(facing)
        .normalize()
        .toArray(normals.array, vertex * 3);
    }
  });
  positions.needsUpdate = true;
  normals.needsUpdate = true;
};
