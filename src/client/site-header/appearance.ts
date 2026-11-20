export const colourModes = ["system", "light", "dark"] as const;

export type ColourMode = (typeof colourModes)[number];

export const themeNames = [
  "sky",
  "grape",
  "forest",
  "sunset",
  "berry",
  "lagoon",
] as const;

export type ThemeName = (typeof themeNames)[number];

export interface Appearance {
  colourMode: ColourMode;
  themeName: ThemeName;
}

export const defaultAppearance: Appearance = {
  colourMode: "dark",
  themeName: "sky",
};

const appearanceStorageKey = "wizzaroo.appearance";

const isColourMode = (value: unknown): value is ColourMode =>
  colourModes.some((colourMode) => colourMode === value);

const isThemeName = (value: unknown): value is ThemeName =>
  themeNames.some((themeName) => themeName === value);

export const loadAppearance = (): Appearance => {
  const stored = localStorage.getItem(appearanceStorageKey);
  const appearance: unknown = stored === null ? {} : JSON.parse(stored);
  if (typeof appearance !== "object" || appearance === null) {
    return defaultAppearance;
  }
  return {
    colourMode:
      "colourMode" in appearance && isColourMode(appearance.colourMode)
        ? appearance.colourMode
        : defaultAppearance.colourMode,
    themeName:
      "themeName" in appearance && isThemeName(appearance.themeName)
        ? appearance.themeName
        : defaultAppearance.themeName,
  };
};

export const storeAppearance = (appearance: Appearance): void => {
  localStorage.setItem(appearanceStorageKey, JSON.stringify(appearance));
};

export const applyAppearance = (
  { colourMode, themeName }: Appearance,
  root: HTMLElement = document.documentElement,
): void => {
  root.dataset.colourMode = colourMode;
  root.dataset.theme = themeName;
};
