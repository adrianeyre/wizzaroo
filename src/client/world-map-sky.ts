import { Color } from "three";
import type { ThemePalette } from "../curriculum/world-map.js";

export const weatherKinds = [
  "clear",
  "cloudy",
  "rain",
  "storm",
  "snow",
  "wind",
  "fog",
] as const;

export type Weather = (typeof weatherKinds)[number];

export type TimeOfDay = "day" | "twilight" | "night";

export type Precipitation = "none" | "rain" | "snow" | "leaves";

export type Triple = [number, number, number];

const weatherChances: Record<Weather, number> = {
  clear: 3,
  cloudy: 2,
  rain: 2,
  storm: 1,
  snow: 1,
  wind: 1,
  fog: 1,
};

export const chooseWeather = (random: () => number): Weather => {
  const totalChance = weatherKinds.reduce(
    (total, weather) => total + weatherChances[weather],
    0,
  );
  let roll = random() * totalChance;
  for (const weather of weatherKinds) {
    roll -= weatherChances[weather];
    if (roll < 0) {
      return weather;
    }
  }
  return "clear";
};

const firstDaylightHour = 7;
const firstEveningHour = 19;
const firstNightHour = 21;
const firstDawnHour = 6;

export const findTimeOfDay = (now: Date): TimeOfDay => {
  const hour = now.getHours();
  if (hour >= firstNightHour || hour < firstDawnHour) {
    return "night";
  }
  if (hour < firstDaylightHour || hour >= firstEveningHour) {
    return "twilight";
  }
  return "day";
};

export interface SkyLook {
  zenith: string;
  horizon: string;
  fogStart: number;
  fogEnd: number;
  lightColour: string;
  lightIntensity: number;
  lightDirection: Triple;
  hemisphereSky: string;
  hemisphereGround: string;
  hemisphereIntensity: number;
  daylight: number;
  isStarry: boolean;
  isMoonlit: boolean;
  areWindowsLit: boolean;
  cloudCount: number;
  cloudShade: string;
  windStrength: number;
  snowCover: number;
  precipitation: Precipitation;
  precipitationAmount: number;
  hasLightning: boolean;
}

const toHex = (colour: Color): string => `#${colour.getHexString()}`;

const blend = (from: string, to: string, share: number): string =>
  toHex(new Color(from).lerp(new Color(to), share));

const buildClockLook = (
  timeOfDay: TimeOfDay,
  palette: ThemePalette,
): SkyLook => {
  const sharedLook = {
    fogStart: 75,
    fogEnd: 260,
    cloudCount: 4,
    cloudShade: "#ffffff",
    windStrength: 0.15,
    snowCover: 0,
    precipitation: "none",
    precipitationAmount: 0,
    hasLightning: false,
  } as const;
  switch (timeOfDay) {
    case "day":
      return {
        ...sharedLook,
        zenith: blend(palette.sky, "#2763b8", 0.62),
        horizon: blend(palette.sky, "#f4f8fb", 0.6),
        lightColour: "#fff0d8",
        lightIntensity: 2.6,
        lightDirection: [0.55, 0.72, 0.38],
        hemisphereSky: "#d9ecff",
        hemisphereGround: "#56683a",
        hemisphereIntensity: 0.85,
        daylight: 1,
        isStarry: false,
        isMoonlit: false,
        areWindowsLit: false,
      };
    case "twilight":
      return {
        ...sharedLook,
        zenith: "#34478a",
        horizon: "#f2a36b",
        lightColour: "#ffb27a",
        lightIntensity: 1.6,
        lightDirection: [0.85, 0.28, 0.3],
        hemisphereSky: "#b9a6d6",
        hemisphereGround: "#3f4a2c",
        hemisphereIntensity: 0.6,
        daylight: 0.6,
        isStarry: false,
        isMoonlit: false,
        areWindowsLit: true,
      };
    case "night":
      return {
        ...sharedLook,
        zenith: "#040a20",
        horizon: "#1b2b52",
        lightColour: "#a9bcff",
        lightIntensity: 0.9,
        lightDirection: [-0.45, 0.7, -0.35],
        hemisphereSky: "#36487e",
        hemisphereGround: "#0f170b",
        hemisphereIntensity: 0.5,
        daylight: 0.22,
        isStarry: true,
        isMoonlit: true,
        areWindowsLit: true,
      };
  }
};

const overcast = (look: SkyLook, greyness: number, grey: string): SkyLook => ({
  ...look,
  zenith: blend(look.zenith, grey, greyness),
  horizon: blend(look.horizon, grey, greyness),
  lightIntensity: look.lightIntensity * (1 - greyness * 0.7),
  hemisphereIntensity: look.hemisphereIntensity * (1 - greyness * 0.3),
  isStarry: look.isStarry && greyness < 0.3,
});

export const buildSkyLook = (
  timeOfDay: TimeOfDay,
  weather: Weather,
  palette: ThemePalette,
): SkyLook => {
  const clockLook = buildClockLook(timeOfDay, palette);
  const darkness = 1 - clockLook.daylight;
  const cloudGrey = blend("#8d96a3", "#1c222c", darkness);
  switch (weather) {
    case "clear":
      return clockLook;
    case "cloudy":
      return {
        ...overcast(clockLook, 0.4, cloudGrey),
        cloudCount: 12,
        cloudShade: blend("#eef1f5", "#3a4250", darkness),
        windStrength: 0.3,
      };
    case "rain":
      return {
        ...overcast(clockLook, 0.6, cloudGrey),
        fogStart: 40,
        fogEnd: 170,
        cloudCount: 14,
        cloudShade: blend("#b4bcc7", "#2a303a", darkness),
        windStrength: 0.45,
        precipitation: "rain",
        precipitationAmount: 1,
      };
    case "storm":
      return {
        ...overcast(clockLook, 0.78, blend(cloudGrey, "#11151c", 0.4)),
        fogStart: 35,
        fogEnd: 150,
        cloudCount: 14,
        cloudShade: blend("#7d8592", "#1d222b", darkness),
        windStrength: 0.85,
        precipitation: "rain",
        precipitationAmount: 1.6,
        hasLightning: true,
      };
    case "snow":
      return {
        ...overcast(clockLook, 0.45, blend("#dfe5ee", cloudGrey, darkness)),
        fogStart: 50,
        fogEnd: 190,
        cloudCount: 12,
        cloudShade: blend("#f4f6fa", "#46505f", darkness),
        windStrength: 0.2,
        snowCover: 1,
        precipitation: "snow",
        precipitationAmount: 1,
      };
    case "wind":
      return {
        ...overcast(clockLook, 0.15, cloudGrey),
        cloudCount: 9,
        windStrength: 1,
        precipitation: "leaves",
        precipitationAmount: 1,
      };
    case "fog":
      return {
        ...overcast(clockLook, 0.5, blend("#c9d0d8", cloudGrey, darkness)),
        fogStart: 12,
        fogEnd: 75,
        cloudCount: 4,
        windStrength: 0.1,
      };
  }
};
