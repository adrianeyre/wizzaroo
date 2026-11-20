import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  type Group,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

interface MaterialBatch {
  material: MeshStandardMaterial;
  geometries: BufferGeometry[];
}

const isStandardPart = (
  part: Object3D,
): part is Mesh<BufferGeometry, MeshStandardMaterial> =>
  part instanceof Mesh && part.material instanceof MeshStandardMaterial;

const buildMaterialKey = (material: MeshStandardMaterial): string =>
  `${material.color.getHexString()}-${String(material.transparent)}-${String(material.opacity)}`;

const batchPartsByMaterial = (source: Group): MaterialBatch[] => {
  source.updateWorldMatrix(true, true);
  const toSource = new Matrix4().copy(source.matrixWorld).invert();
  const batches = new Map<string, MaterialBatch>();
  source.traverse((part) => {
    if (!isStandardPart(part)) {
      return;
    }
    const key = buildMaterialKey(part.material);
    const batch = batches.get(key) ?? {
      material: part.material.clone(),
      geometries: [],
    };
    const placed =
      part.geometry.index === null
        ? part.geometry.clone()
        : part.geometry.toNonIndexed();
    batch.geometries.push(
      placed.applyMatrix4(
        new Matrix4().multiplyMatrices(toSource, part.matrixWorld),
      ),
    );
    batches.set(key, batch);
  });
  return [...batches.values()];
};

export const MergedParts = ({
  name,
  mergeKey,
  children,
}: {
  name: string;
  mergeKey: string;
  children: ReactNode;
}) => {
  const source = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const group = source.current;
    const parent = group?.parent ?? null;
    if (group === null || parent === null) {
      return;
    }
    const merged = batchPartsByMaterial(group).map(
      ({ material, geometries }) => {
        const geometry = mergeGeometries(geometries);
        geometries.forEach((part) => {
          part.dispose();
        });
        return new Mesh(geometry, material);
      },
    );
    merged.forEach((mesh) => {
      mesh.name = name;
      mesh.position.copy(group.position);
      mesh.quaternion.copy(group.quaternion);
      mesh.scale.copy(group.scale);
      parent.add(mesh);
    });
    group.visible = false;
    invalidate();
    return () => {
      merged.forEach((mesh) => {
        parent.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      group.visible = true;
    };
  }, [name, mergeKey, invalidate]);

  return <group ref={source}>{children}</group>;
};
