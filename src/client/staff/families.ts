import type { Parent } from "./staff-api.js";

export interface FamilyChoice {
  familyId: string;
  label: string;
}

/** Each Family once, named by its Parents, for choosing which Family a new Parent or Child joins. */
export const listFamilyChoices = (
  parents: readonly Parent[],
): FamilyChoice[] => {
  const parentNamesByFamily = new Map<string, string[]>();
  for (const { familyId, name, email } of parents) {
    if (familyId !== null) {
      parentNamesByFamily.set(familyId, [
        ...(parentNamesByFamily.get(familyId) ?? []),
        name ?? email,
      ]);
    }
  }
  return [...parentNamesByFamily.entries()]
    .map(([familyId, parentNames]) => ({
      familyId,
      label: `The Family of ${parentNames.join(" and ")}`,
    }))
    .toSorted((first, second) => first.label.localeCompare(second.label));
};
