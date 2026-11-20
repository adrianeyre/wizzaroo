export const minimisedGroupsStorageKey = "wizzaroo.minimised-groups";

// The groups of buttons the player has minimised, such as the World Map's
// Region buttons, kept in this browser so the screen opens set up the same
// way next time.
export const loadMinimisedGroups = (): readonly string[] => {
  try {
    const stored = localStorage.getItem(minimisedGroupsStorageKey);
    const groups: unknown = stored === null ? [] : JSON.parse(stored);
    return Array.isArray(groups)
      ? [
          ...new Set(
            groups.filter(
              (group): group is string => typeof group === "string",
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
};

export const storeMinimisedGroups = (groups: readonly string[]): void => {
  try {
    localStorage.setItem(
      minimisedGroupsStorageKey,
      JSON.stringify([...new Set(groups)]),
    );
  } catch {
    return;
  }
};
