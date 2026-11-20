import { Vector3 } from "three";
import type {
  GeographyShowOf,
  GlobeHighlight,
  GlobeLine,
  Hemisphere,
} from "../../curriculum/geography.js";

export type Triple = [number, number, number];

export interface GlobeView {
  latitude: number;
  longitude: number;
}

export interface GlobeRing {
  radiusShare: number;
  heightShare: number;
  arc: number;
  rotation: Triple;
}

const degreesToRadians = Math.PI / 180;
const steepestViewLatitude = 55;
export const tropicLatitude = 23.44;
export const polarCircleLatitude = 66.56;

export const getSurfaceDirection = (
  latitude: number,
  longitude: number,
  target: Vector3,
): Vector3 => {
  const latitudeRadians = latitude * degreesToRadians;
  const longitudeRadians = longitude * degreesToRadians;
  return target.set(
    Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
    Math.sin(latitudeRadians),
    Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
  );
};

const highlightViews: Record<GlobeHighlight, GlobeView> = {
  africa: { latitude: 3, longitude: 18 },
  antarctica: { latitude: -90, longitude: 20 },
  asia: { latitude: 38, longitude: 92 },
  europe: { latitude: 50, longitude: 14 },
  "north-america": { latitude: 42, longitude: -96 },
  oceania: { latitude: -25, longitude: 147 },
  "south-america": { latitude: -18, longitude: -60 },
  "arctic-ocean": { latitude: 90, longitude: 20 },
  "atlantic-ocean": { latitude: 12, longitude: -32 },
  "indian-ocean": { latitude: -15, longitude: 78 },
  "pacific-ocean": { latitude: 0, longitude: -165 },
  "southern-ocean": { latitude: -90, longitude: 60 },
  equator: { latitude: 8, longitude: 20 },
  "prime-meridian": { latitude: 20, longitude: 10 },
  "tropic-of-cancer": { latitude: tropicLatitude, longitude: 20 },
  "tropic-of-capricorn": { latitude: -tropicLatitude, longitude: 20 },
  "arctic-circle": { latitude: 90, longitude: 20 },
  "antarctic-circle": { latitude: -90, longitude: 20 },
  "northern-hemisphere": { latitude: 32, longitude: 20 },
  "southern-hemisphere": { latitude: -32, longitude: 20 },
  "eastern-hemisphere": { latitude: 15, longitude: 50 },
  "western-hemisphere": { latitude: 15, longitude: -50 },
};

const restingView: GlobeView = { latitude: 22, longitude: 10 };
const sunSideOffset = 45;

const clampViewLatitude = (view: GlobeView): GlobeView => ({
  latitude: Math.max(
    -steepestViewLatitude,
    Math.min(steepestViewLatitude, view.latitude),
  ),
  longitude: view.longitude,
});

const getUnclampedView = ({
  pin,
  highlight,
  sunLongitude,
}: GeographyShowOf<"globe-spinner">): GlobeView => {
  if (pin !== undefined) {
    return pin;
  }
  if (highlight !== undefined) {
    return highlightViews[highlight];
  }
  if (sunLongitude !== undefined) {
    return { latitude: 15, longitude: sunLongitude + sunSideOffset };
  }
  return restingView;
};

export const getGlobeView = (show: GeographyShowOf<"globe-spinner">) =>
  clampViewLatitude(getUnclampedView(show));

export const getGlobeTilt = (view: GlobeView): number =>
  view.latitude * degreesToRadians;

export const getGlobeSpin = (view: GlobeView): number =>
  -view.longitude * degreesToRadians;

const buildLatitudeRing = (latitude: number): GlobeRing => ({
  radiusShare: Math.cos(latitude * degreesToRadians),
  heightShare: Math.sin(latitude * degreesToRadians),
  arc: Math.PI * 2,
  rotation: [Math.PI / 2, 0, 0],
});

const globeLineRings: Record<GlobeLine, GlobeRing> = {
  equator: buildLatitudeRing(0),
  "prime-meridian": {
    radiusShare: 1,
    heightShare: 0,
    arc: Math.PI,
    rotation: [0, -Math.PI / 2, -Math.PI / 2],
  },
  "tropic-of-cancer": buildLatitudeRing(tropicLatitude),
  "tropic-of-capricorn": buildLatitudeRing(-tropicLatitude),
  "arctic-circle": buildLatitudeRing(polarCircleLatitude),
  "antarctic-circle": buildLatitudeRing(-polarCircleLatitude),
};

const meridianRing: GlobeRing = {
  radiusShare: 1,
  heightShare: 0,
  arc: Math.PI * 2,
  rotation: [0, Math.PI / 2, 0],
};

const hemisphereRings: Record<Hemisphere, GlobeRing> = {
  "northern-hemisphere": buildLatitudeRing(0),
  "southern-hemisphere": buildLatitudeRing(0),
  "eastern-hemisphere": meridianRing,
  "western-hemisphere": meridianRing,
};

const hemisphereAxes: Record<Hemisphere, Triple> = {
  "northern-hemisphere": [0, 1, 0],
  "southern-hemisphere": [0, -1, 0],
  "eastern-hemisphere": [1, 0, 0],
  "western-hemisphere": [-1, 0, 0],
};

const isGlobeLine = (highlight: GlobeHighlight): highlight is GlobeLine =>
  highlight in globeLineRings;

const isHemisphere = (highlight: GlobeHighlight): highlight is Hemisphere =>
  highlight in hemisphereAxes;

export const findGlobeRing = (
  highlight: GlobeHighlight | undefined,
): GlobeRing | undefined => {
  if (highlight === undefined) {
    return undefined;
  }
  if (isGlobeLine(highlight)) {
    return globeLineRings[highlight];
  }
  if (isHemisphere(highlight)) {
    return hemisphereRings[highlight];
  }
  return undefined;
};

export const getHemisphereAxis = (
  highlight: GlobeHighlight | undefined,
): Triple =>
  highlight !== undefined && isHemisphere(highlight)
    ? hemisphereAxes[highlight]
    : [0, 0, 0];
