export interface PopupOffset {
  x: number;
  y: number;
}

export const popupPositionsStorageKey = "wizzaroo.popup-positions";

const isPopupOffset = (value: unknown): value is PopupOffset =>
  typeof value === "object" &&
  value !== null &&
  "x" in value &&
  "y" in value &&
  typeof value.x === "number" &&
  typeof value.y === "number" &&
  Number.isFinite(value.x) &&
  Number.isFinite(value.y);

const loadPopupPositions = (): Record<string, unknown> => {
  try {
    const stored = localStorage.getItem(popupPositionsStorageKey);
    const positions: unknown = stored === null ? {} : JSON.parse(stored);
    return typeof positions === "object" &&
      positions !== null &&
      !Array.isArray(positions)
      ? Object.fromEntries(Object.entries(positions))
      : {};
  } catch {
    return {};
  }
};

export const loadPopupPosition = (
  positionKey: string,
): PopupOffset | undefined => {
  const position = loadPopupPositions()[positionKey];
  return isPopupOffset(position) ? { x: position.x, y: position.y } : undefined;
};

export const storePopupPosition = (
  positionKey: string,
  { x, y }: PopupOffset,
): void => {
  try {
    localStorage.setItem(
      popupPositionsStorageKey,
      JSON.stringify({ ...loadPopupPositions(), [positionKey]: { x, y } }),
    );
  } catch {
    return;
  }
};
