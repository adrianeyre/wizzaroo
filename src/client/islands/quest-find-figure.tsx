import { useEffect, useMemo } from "react";
import type { FindLook } from "../../curriculum/island-quests.js";
import { buildFindGeometry } from "./quest-find-models.js";

/** A Find as a mesh in its own colours, for the rucksack's studio pictures (ADR 0058). */
export const QuestFindFigure = ({ look }: { look: FindLook }) => {
  const geometry = useMemo(() => buildFindGeometry(look), [look]);
  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  return (
    <mesh geometry={geometry} name="quest-find">
      <meshStandardMaterial vertexColors roughness={0.55} metalness={0.05} />
    </mesh>
  );
};
