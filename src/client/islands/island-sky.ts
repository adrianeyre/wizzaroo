import { Color } from "three";
import type { IslandSky } from "../../curriculum/islands.js";
import type { ThemePalette } from "../../curriculum/world-map.js";
import {
  buildSkyLook,
  type SkyLook,
  type TimeOfDay,
  type Weather,
} from "../world-map-sky.js";

const blend = (from: string, to: string, share: number): string =>
  `#${new Color(from).lerp(new Color(to), share).getHexString()}`;

// Each Island's theme turns weather it would never see into weather it
// would, so random weather fits the Island; but snow a Child chooses falls on
// every Island.
const findIslandWeather = (
  sky: IslandSky,
  weather: Weather,
  isWeatherChosen: boolean,
): Weather => {
  if (isWeatherChosen && weather === "snow") {
    return weather;
  }
  switch (sky) {
    case "aurora":
      return weather === "rain" || weather === "storm" ? "snow" : weather;
    case "desert-haze":
      return weather === "rain" || weather === "storm" || weather === "snow"
        ? "wind"
        : weather;
    case "rainforest-mist":
      return weather === "snow" ? "rain" : weather;
    case "volcanic-smoke":
      return weather === "snow" ? "cloudy" : weather;
    case "starlit-night":
      return weather === "rain" || weather === "storm" ? "cloudy" : weather;
  }
};

const findIslandTimeOfDay = (
  sky: IslandSky,
  timeOfDay: TimeOfDay,
): TimeOfDay => (sky === "starlit-night" ? "night" : timeOfDay);

const tintIslandSky = (sky: IslandSky, look: SkyLook): SkyLook => {
  switch (sky) {
    case "aurora":
      return {
        ...look,
        zenith: blend(look.zenith, "#1d3f7a", 0.25),
        horizon: blend(look.horizon, "#e6f3ff", 0.35),
        lightColour: blend(look.lightColour, "#e3f1ff", 0.6),
        hemisphereGround: "#a9bccf",
        snowCover: Math.max(look.snowCover, 0.7),
        isStarry: look.isStarry || look.daylight < 1,
      };
    case "desert-haze":
      return {
        ...look,
        horizon: blend(look.horizon, "#f4cf94", 0.45),
        zenith: blend(look.zenith, "#3a7bd5", 0.2),
        lightColour: blend(look.lightColour, "#ffe1a8", 0.5),
        lightIntensity: look.lightIntensity * 1.1,
        hemisphereGround: "#a4804e",
        ...(look.precipitation === "snow"
          ? {}
          : { precipitation: "none", precipitationAmount: 0 }),
        fogStart: Math.min(look.fogStart, 60),
        fogEnd: Math.min(look.fogEnd, 210),
      };
    case "rainforest-mist":
      return {
        ...look,
        horizon: blend(look.horizon, "#cfe8dc", 0.45),
        hemisphereGround: "#2f5a2a",
        fogStart: Math.min(look.fogStart, 45),
        fogEnd: Math.min(look.fogEnd, 190),
      };
    case "volcanic-smoke":
      return {
        ...look,
        zenith: blend(look.zenith, "#4a2a2a", 0.35),
        horizon: blend(look.horizon, "#e0875a", 0.4),
        lightColour: blend(look.lightColour, "#ffb27a", 0.45),
        hemisphereGround: "#5a2a1a",
        cloudShade: blend(look.cloudShade, "#6b5a55", 0.5),
        fogStart: Math.min(look.fogStart, 55),
        fogEnd: Math.min(look.fogEnd, 200),
      };
    case "starlit-night":
      return {
        ...look,
        zenith: blend(look.zenith, "#4a43a8", 0.7),
        horizon: blend(look.horizon, "#8f86d8", 0.7),
        lightColour: blend(look.lightColour, "#e4e6ff", 0.6),
        lightIntensity: Math.max(look.lightIntensity * 1.6, 1.8),
        hemisphereSky: "#b4abf0",
        hemisphereGround: "#5b6188",
        hemisphereIntensity: Math.max(look.hemisphereIntensity * 1.6, 1.1),
        isStarry: true,
        isMoonlit: true,
      };
  }
};

export const buildIslandSkyLook = (
  sky: IslandSky,
  timeOfDay: TimeOfDay,
  weather: Weather,
  palette: ThemePalette,
  isWeatherChosen = false,
): SkyLook =>
  tintIslandSky(
    sky,
    buildSkyLook(
      findIslandTimeOfDay(sky, timeOfDay),
      findIslandWeather(sky, weather, isWeatherChosen),
      palette,
    ),
  );
