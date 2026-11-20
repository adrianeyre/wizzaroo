import { CatmullRomCurve3, Vector3 } from "three";
import type {
  RiverFeature,
  ValleyMarker,
  WaterCycleStage,
} from "../../curriculum/geography.js";
import { riverFeatures } from "../../curriculum/geography.js";
import type { Triple } from "../world-map-models.js";
import type { ParticleLook, ParticleStream } from "./drifting-particles.js";

export type MouthForm = "estuary" | "delta";

export const slabRadius = 1.6;
export const slabBottom = -0.34;
export const seaBed = -0.14;
export const waterLift = 0.012;

export interface CourseSample {
  u: number;
  v: number;
  level: number;
  halfWidth: number;
  along: number;
  rush: number;
}

export interface Course {
  samples: CourseSample[];
  isStill: boolean;
}

export interface ValleyLand {
  form: MouthForm;
  main: Course;
  tributary: Course;
  oxbow: Course;
  distributaries: Course[];
}

export const isRiverFeature = (marker: ValleyMarker): marker is RiverFeature =>
  riverFeatures.some((feature) => feature === marker);

export const findMouthForm = (marker: ValleyMarker): MouthForm =>
  marker === "delta" ? "delta" : "estuary";

export const smoothRise = (from: number, to: number, value: number): number => {
  const share = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return share * share * (3 - 2 * share);
};

export const findCoastline = (u: number): number => 1.08 + 0.9 * u * u;

const deltaApex: Triple = [0.12, 0.04, 0.8];

const upperCourse: Triple[] = [
  [-0.42, 0.78, -1.2],
  [-0.3, 0.64, -0.96],
  [-0.1, 0.5, -0.68],
  [0.1, 0.41, -0.45],
  [0.2, 0.37, -0.3],
  [0.22, 0.36, -0.23],
  [0.22, 0.12, -0.18],
  [0.14, 0.1, -0.02],
  [-0.2, 0.095, 0.08],
  [-0.46, 0.09, 0.24],
  [-0.36, 0.085, 0.42],
  [0.02, 0.08, 0.46],
  [0.42, 0.07, 0.5],
  [0.5, 0.06, 0.66],
  [0.3, 0.045, 0.78],
];

const estuaryReach: Triple[] = [
  [0.12, 0.03, 0.9],
  [0.04, 0.012, 1.04],
  [0.0, 0.0, 1.3],
];

const tributaryCourse: Triple[] = [
  [0.88, 0.74, -1.08],
  [0.62, 0.58, -0.84],
  [0.36, 0.47, -0.62],
  [0.1, 0.41, -0.45],
];

const distributaryEnds: Triple[][] = [
  [
    [-0.08, 0.028, 0.98],
    [-0.3, 0.0, 1.3],
  ],
  [
    [0.04, 0.028, 1.04],
    [-0.06, 0.0, 1.4],
  ],
  [
    [0.18, 0.028, 1.04],
    [0.2, 0.0, 1.4],
  ],
  [
    [0.3, 0.028, 0.98],
    [0.44, 0.0, 1.3],
  ],
];

const oxbowCentre = { u: -0.94, v: 0.22 };
const oxbowRadius = 0.17;
const oxbowLevel = 0.085;

const buildCurvePoints = (points: readonly Triple[], sampleCount: number) =>
  new CatmullRomCurve3(
    points.map(([u, level, v]) => new Vector3(u, level, v)),
    false,
    "centripetal",
  ).getSpacedPoints(sampleCount);

const buildCourseSamples = (
  points: readonly Vector3[],
  findHalfWidth: (share: number, v: number) => number,
): CourseSample[] => {
  let along = 0;
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const step = Math.hypot(point.x - previous.x, point.z - previous.z);
    along += point.distanceTo(previous);
    const drop = Math.abs(point.y - previous.y);
    return {
      u: point.x,
      v: point.z,
      level: point.y,
      halfWidth: findHalfWidth(index / Math.max(1, points.length - 1), point.z),
      along,
      rush: index === 0 ? 0 : Math.min(1, drop / Math.max(0.004, step) / 3),
    };
  });
};

const findEstuaryFunnel = (v: number) =>
  0.3 * Math.pow(smoothRise(0.66, 1.22, v), 1.2);

export const buildValleyLand = (form: MouthForm): ValleyLand => {
  const mainPoints =
    form === "estuary"
      ? [...upperCourse, ...estuaryReach]
      : [...upperCourse, deltaApex];
  const main: Course = {
    isStill: false,
    samples: buildCourseSamples(
      buildCurvePoints(mainPoints, form === "estuary" ? 120 : 104),
      (share, v) =>
        0.022 +
        0.04 * Math.min(1, share * 1.3) +
        (form === "estuary" ? findEstuaryFunnel(v) : 0),
    ),
  };
  const tributary: Course = {
    isStill: false,
    samples: buildCourseSamples(
      buildCurvePoints(tributaryCourse, 36),
      (share) => 0.016 + 0.014 * share,
    ),
  };
  const oxbowPoints = Array.from({ length: 29 }, (_, index) => {
    const angle = 1.0 + (index / 28) * (2 * Math.PI - 2.0);
    return new Vector3(
      oxbowCentre.u + Math.cos(angle) * oxbowRadius,
      oxbowLevel,
      oxbowCentre.v + Math.sin(angle) * oxbowRadius * 0.85,
    );
  });
  const oxbow: Course = {
    isStill: true,
    samples: buildCourseSamples(
      oxbowPoints,
      (share) => 0.026 + 0.018 * Math.sin(share * Math.PI),
    ),
  };
  const distributaries =
    form === "delta"
      ? distributaryEnds.map((ends): Course => ({
          isStill: false,
          samples: buildCourseSamples(
            buildCurvePoints([deltaApex, ...ends], 24),
            (share) => 0.03 - 0.01 * share,
          ),
        }))
      : [];
  return { form, main, tributary, oxbow, distributaries };
};

export const listCourses = (land: ValleyLand): Course[] => [
  land.main,
  land.tributary,
  land.oxbow,
  ...land.distributaries,
];

export interface NearestWater {
  distance: number;
  level: number;
  halfWidth: number;
}

const farAway: NearestWater = { distance: 99, level: 0, halfWidth: 0 };

const findNearestOnCourse = (
  course: Course,
  u: number,
  v: number,
): NearestWater => {
  let nearest = farAway;
  const { samples } = course;
  for (let index = 1; index < samples.length; index++) {
    const start = samples[index - 1];
    const end = samples[index];
    const acrossU = end.u - start.u;
    const acrossV = end.v - start.v;
    const lengthSquared = acrossU * acrossU + acrossV * acrossV;
    const share =
      lengthSquared === 0
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((u - start.u) * acrossU + (v - start.v) * acrossV) /
                lengthSquared,
            ),
          );
    const distance = Math.hypot(
      u - (start.u + acrossU * share),
      v - (start.v + acrossV * share),
    );
    if (distance < nearest.distance) {
      nearest = {
        distance,
        level: start.level + (end.level - start.level) * share,
        halfWidth: start.halfWidth + (end.halfWidth - start.halfWidth) * share,
      };
    }
  }
  return nearest;
};

export const findNearestWater = (
  land: ValleyLand,
  u: number,
  v: number,
): NearestWater =>
  listCourses(land).reduce<NearestWater>((nearest, course) => {
    const candidate = findNearestOnCourse(course, u, v);
    return candidate.distance - candidate.halfWidth <
      nearest.distance - nearest.halfWidth
      ? candidate
      : nearest;
  }, farAway);

const findBaseHeight = (u: number, v: number): number => {
  const mountainShare = smoothRise(-0.15, -1.45, v);
  const ridge =
    0.8 + 0.18 * Math.sin(u * 2.6 + 1.1) + 0.08 * Math.sin(u * 6.3 - v * 3.7);
  const rockStep = 0.26 * smoothRise(-0.1, -0.26, v);
  const sideHills =
    0.16 * smoothRise(0.8, 1.45, Math.abs(u)) * (1 - smoothRise(0.6, 1.3, v));
  const ripple = 0.012 * Math.sin(u * 9.1 + v * 5.3);
  return 0.1 + rockStep + mountainShare * ridge + sideHills + ripple;
};

const findCoastShare = (u: number, v: number) => {
  const coast = findCoastline(u);
  return smoothRise(coast - 0.12, coast + 0.16, v);
};

const findDeltaLobe = (land: ValleyLand, u: number, v: number): number => {
  if (land.form !== "delta") {
    return -1;
  }
  const nearest = land.distributaries.reduce(
    (closest, course) =>
      Math.min(closest, findNearestOnCourse(course, u, v).distance),
    99,
  );
  return 0.035 - 0.2 * smoothRise(0.1, 0.2, nearest);
};

const isEstuaryMud = (land: ValleyLand, u: number, v: number) => {
  if (land.form !== "estuary" || v < 0.74 || v > 1.18) {
    return false;
  }
  const nearest = findNearestOnCourse(land.main, u, v);
  return (
    nearest.distance < nearest.halfWidth + 0.24 * smoothRise(0.66, 0.95, v)
  );
};

export const findLandHeight = (land: ValleyLand, u: number, v: number) => {
  const coastShare = findCoastShare(u, v);
  const shaped = Math.max(
    findBaseHeight(u, v) * (1 - coastShare) + seaBed * coastShare,
    findDeltaLobe(land, u, v),
  );
  const muddy = isEstuaryMud(land, u, v) ? 0.02 : shaped;
  const water = findNearestWater(land, u, v);
  const bankShare = smoothRise(
    water.halfWidth * 0.85,
    water.halfWidth + 0.16,
    water.distance,
  );
  const channel = water.level - 0.03;
  return Math.min(muddy, channel + (muddy - channel) * bankShare);
};

export const landColours = {
  snow: "#f3f8ff",
  rock: "#8b8780",
  darkRock: "#6b665f",
  hillGrass: "#4f9447",
  meadow: "#7cc463",
  sand: "#e8d39a",
  mud: "#8a7457",
  seabed: "#c7b483",
  topsoil: "#5e3f26",
  subsoil: "#9a7650",
  bedrock: "#7b746b",
  sea: "#2f86cf",
} as const;

export type LandColour = keyof typeof landColours;

export const findLandColour = (
  land: ValleyLand,
  u: number,
  v: number,
  height: number,
  upness: number,
): LandColour => {
  const snowLine = 1.0 + 0.06 * Math.sin(u * 7.3 + v * 3.1);
  if (height > snowLine && upness > 0.55) {
    return "snow";
  }
  if (upness < 0.62) {
    return height > 0.5 ? "darkRock" : "rock";
  }
  if (height > 0.72) {
    return "rock";
  }
  if (height < -0.02) {
    return "seabed";
  }
  if (isEstuaryMud(land, u, v) && height < 0.04) {
    return "mud";
  }
  if (land.form === "delta" && v > 0.86 && height < 0.05) {
    return "sand";
  }
  if (findCoastShare(u, v) > 0.04 && height < 0.07) {
    return "sand";
  }
  return height > 0.28 ? "hillGrass" : "meadow";
};

export interface FeatureSpot {
  u: number;
  v: number;
  radius: number;
}

export const riverFeatureSpots: Record<RiverFeature, FeatureSpot> = {
  source: { u: -0.42, v: -1.2, radius: 0.15 },
  tributary: { u: 0.62, v: -0.84, radius: 0.17 },
  confluence: { u: 0.1, v: -0.45, radius: 0.16 },
  waterfall: { u: 0.22, v: -0.2, radius: 0.16 },
  meander: { u: -0.36, v: 0.26, radius: 0.24 },
  "ox-bow-lake": { u: -0.94, v: 0.22, radius: 0.27 },
  floodplain: { u: 0.62, v: 0.18, radius: 0.3 },
  mouth: { u: 0.0, v: 1.14, radius: 0.16 },
  estuary: { u: 0.08, v: 0.9, radius: 0.32 },
  delta: { u: 0.08, v: 1.12, radius: 0.42 },
};

export const findSpotHeight = (land: ValleyLand, u: number, v: number) =>
  Math.max(findLandHeight(land, u, v), findNearestWater(land, u, v).level, 0) +
  waterLift +
  0.012;

export const cloudCentre: Triple = [-0.72, 1.5, -0.66];
export const forestCentre = { u: 1.08, v: -0.18 };
export const soakAngles = [1.9, 1.97, 2.04, 2.11, 2.18] as const;

export interface CycleFlow {
  streams: ParticleStream[];
  look: ParticleLook;
  arrow: { tip: Triple; direction: Triple };
}

const findCloudStreams = () =>
  [
    [-0.75, 1.3, -0.6],
    [0.6, 1.25, -0.7],
    [-0.2, 1.15, -0.2],
    [0.3, 1.9, -0.6],
  ].map(([u, height, v]) => ({
    from: [u, height, v] satisfies Triple,
    spread: [0.08, 0.06, 0.08] satisfies Triple,
    travel: [
      cloudCentre[0] - u,
      cloudCentre[1] - height,
      cloudCentre[2] - v,
    ] satisfies Triple,
    count: 9,
  }));

const findForestStreams = (land: ValleyLand) =>
  [
    [0, 0],
    [0.16, 0.12],
    [-0.12, 0.14],
    [0.1, -0.16],
  ].map(([acrossU, acrossV]) => {
    const u = forestCentre.u + acrossU;
    const v = forestCentre.v + acrossV;
    return {
      from: [u, findLandHeight(land, u, v) + 0.18, v] satisfies Triple,
      spread: [0.04, 0.02, 0.04] satisfies Triple,
      travel: [-0.25, 0.8, -0.35] satisfies Triple,
      count: 8,
    };
  });

const findSoakStreams = (land: ValleyLand) =>
  soakAngles.map((angle) => {
    const reach = slabRadius + 0.014;
    const u = Math.cos(angle) * reach;
    const v = Math.sin(angle) * reach;
    const top = findLandHeight(
      land,
      Math.cos(angle) * 1.55,
      Math.sin(angle) * 1.55,
    );
    return {
      from: [u, top - 0.02, v] satisfies Triple,
      spread: [0.012, 0.0, 0.012] satisfies Triple,
      travel: [0, slabBottom - top + 0.04, 0] satisfies Triple,
      count: 5,
    };
  });

export const buildCycleFlow = (
  land: ValleyLand,
  stage: WaterCycleStage,
): CycleFlow => {
  switch (stage) {
    case "evaporation":
      return {
        look: "vapour",
        streams: [
          {
            from: [0.0, 0.03, 1.36],
            spread: [0.38, 0.0, 0.12],
            travel: [0, 0.95, 0.05],
            count: 50,
          },
        ],
        arrow: { tip: [0.5, 0.72, 1.36], direction: [0, -1, 0] },
      };
    case "condensation":
      return {
        look: "vapour",
        streams: findCloudStreams(),
        arrow: {
          tip: [cloudCentre[0] + 0.62, cloudCentre[1], cloudCentre[2]],
          direction: [1, 0, 0],
        },
      };
    case "precipitation":
      return {
        look: "rain",
        streams: [
          {
            from: [cloudCentre[0], cloudCentre[1] - 0.1, cloudCentre[2]],
            spread: [0.38, 0.0, 0.16],
            travel: [0, -0.78, 0],
            count: 60,
          },
        ],
        arrow: {
          tip: [cloudCentre[0] + 0.62, 0.98, cloudCentre[2]],
          direction: [0, 1, 0],
        },
      };
    case "collection":
      return {
        look: "drop",
        streams: [],
        arrow: { tip: [0.72, 0.36, 0.86], direction: [-0.3, 0.3, -1] },
      };
    case "transpiration":
      return {
        look: "vapour",
        streams: findForestStreams(land),
        arrow: {
          tip: [forestCentre.u + 0.08, 1.02, forestCentre.v],
          direction: [0, -1, 0],
        },
      };
    case "infiltration":
      return {
        look: "drop",
        streams: findSoakStreams(land),
        arrow: {
          tip: [
            Math.cos(soakAngles[2]) * (slabRadius + 0.05),
            -0.12,
            Math.sin(soakAngles[2]) * (slabRadius + 0.05),
          ],
          direction: [
            Math.cos(soakAngles[2]) * 0.35,
            1,
            Math.sin(soakAngles[2]) * 0.35,
          ],
        },
      };
  }
};
