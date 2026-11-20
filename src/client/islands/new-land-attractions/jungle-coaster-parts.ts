import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import type {
  AttractionBuilder,
  Triple,
} from "../attractions/attraction-kit.js";

/*
 * The Jungle Coaster's track: one smooth closed curve from the bottom
 * of the loop round the whole course and back again, with the loop
 * itself a perfect circle standing upright, so a train can spin round
 * it as one moving part (ADR 0068).
 */

export const railGauge = 0.3;
export const loopRadius = 1.7;
export const loopZ = -6.5;
export const loopBottom = 0.35;
export const loopCentre: Triple = [0, loopBottom + loopRadius, loopZ];

/** The course, starting at the foot of the loop and heading away to -x. */
const coursePoints: readonly Triple[] = [
  [0, loopBottom, loopZ],
  [-2.0, 0.6, -6.4],
  [-4.2, 2.6, -5.6],
  [-6.2, 1.5, -3.8],
  [-7.3, 0.9, -1.3],
  [-7.0, 1.7, 1.4],
  [-5.6, 1.0, 3.7],
  [-3.4, 0.5, 5.1],
  [-1.0, 0.45, 5.4],
  [1.5, 0.45, 5.4],
  [4.0, 0.5, 5.0],
  [6.0, 0.75, 3.4],
  [6.9, 1.3, 1.1],
  [6.9, 3.5, -1.7],
  [6.6, 5.0, -3.9],
  [5.3, 4.8, -5.7],
  [3.5, 2.2, -6.7],
  [1.8, 0.4, -6.6],
];

export const course = new CatmullRomCurve3(
  coursePoints.map(([x, y, z]) => new Vector3(x, y, z)),
  true,
  "centripetal",
);

export interface TrackSample {
  point: Vector3;
  /** Across the track, level, pointing to the right of the way it goes. */
  side: Vector3;
  tangent: Vector3;
}

export const sampleCourse = (count: number): TrackSample[] =>
  Array.from({ length: count }, (_, index) => {
    const share = index / count;
    const point = course.getPointAt(share);
    const tangent = course.getTangentAt(share);
    const side = new Vector3(-tangent.z, 0, tangent.x).normalize();
    return { point, side, tangent };
  });

/** A tube along points offset from the course, closed round the circuit. */
const addOffsetTube = (
  builder: AttractionBuilder,
  finish: "paint" | "metal",
  colour: string,
  samples: readonly TrackSample[],
  across: number,
  down: number,
  radius: number,
  sides: number,
) => {
  const curve = new CatmullRomCurve3(
    samples.map(
      ({ point, side }) =>
        new Vector3(
          point.x + side.x * across,
          point.y - down,
          point.z + side.z * across,
        ),
    ),
    true,
    "centripetal",
  );
  builder.add(
    finish,
    colour,
    new TubeGeometry(curve, samples.length, radius, sides, true),
  );
};

/** Two running rails, the big spine under them, and sleepers between. */
export const addCourseTrack = (
  builder: AttractionBuilder,
  { rail, spine, tie }: { rail: string; spine: string; tie: string },
) => {
  const samples = sampleCourse(builder.isFar ? 48 : 120);
  [-1, 1].forEach((side) => {
    addOffsetTube(
      builder,
      "metal",
      rail,
      samples,
      side * railGauge,
      0,
      0.045,
      3,
    );
  });
  addOffsetTube(
    builder,
    "paint",
    spine,
    samples,
    0,
    0.22,
    0.09,
    builder.isFar ? 4 : 5,
  );
  if (builder.isFar) {
    return;
  }
  samples.forEach(({ point, side }, index) => {
    if (index % 3 !== 0) {
      return;
    }
    const turn = Math.atan2(side.x, side.z);
    builder.box(
      "paint",
      tie,
      [0.07, 0.06, railGauge * 2 + 0.12],
      [point.x, point.y - 0.07, point.z],
      [0, turn + Math.PI / 2, 0],
    );
    if (index % 9 === 0) {
      /* A strut from the spine up to the sleeper */
      builder.bar(
        "paint",
        tie,
        [point.x, point.y - 0.22, point.z],
        [point.x, point.y - 0.08, point.z],
        0.05,
        4,
      );
    }
  });
};

/** The loop: a circle of rails standing upright, with legs either side. */
export const addLoopTrack = (
  builder: AttractionBuilder,
  { rail, spine, leg }: { rail: string; spine: string; leg: string },
) => {
  const [x, y, z] = loopCentre;
  const segments = builder.isFar ? 16 : 40;
  [-1, 1].forEach((side) => {
    builder.torus(
      "metal",
      rail,
      loopRadius,
      0.045,
      [x, y, z + side * railGauge],
      "z",
      segments,
    );
  });
  builder.torus(
    "paint",
    spine,
    loopRadius + 0.22,
    0.09,
    [x, y, z],
    "z",
    segments,
  );
  /* An A-frame of legs each side holding it up */
  [-1, 1].forEach((side) => {
    const footZ = z + side * 1.4;
    [-1, 1].forEach((along) => {
      builder.bar(
        "paint",
        leg,
        [x + along * 1.2, 0, footZ],
        [x + along * (loopRadius + 0.2) * 0.72, y + 0.3, z + side * 0.12],
        0.12,
        builder.isFar ? 4 : 6,
      );
    });
    if (!builder.isFar) {
      builder.box("matte", "#9a9488", [2.8, 0.12, 0.4], [x, 0.06, footZ]);
    }
  });
  if (builder.isFar) {
    return;
  }
  /* Ties round the loop */
  for (let tie = 0; tie < 24; tie++) {
    const angle = (tie / 24) * Math.PI * 2;
    builder.box(
      "paint",
      leg,
      [0.07, 0.06, railGauge * 2 + 0.12],
      [
        x + Math.sin(angle) * (loopRadius + 0.06),
        y - Math.cos(angle) * (loopRadius + 0.06),
        z,
      ],
      [0, 0, angle],
    );
  }
};

/** Steel posts from the ground up to the spine wherever the track is high. */
export const addSupports = (
  builder: AttractionBuilder,
  { post, foot }: { post: string; foot: string },
) => {
  const samples = sampleCourse(builder.isFar ? 22 : 54);
  samples.forEach(({ point, side }, index) => {
    const top = point.y - 0.28;
    const isInLoop = Math.abs(point.z - loopZ) < 1.0 && Math.abs(point.x) < 2.2;
    if (top < 0.4 || isInLoop) {
      return;
    }
    builder.cylinder("paint", post, {
      radius: 0.08,
      length: top,
      at: [point.x, top / 2, point.z],
      segments: builder.isFar ? 4 : 6,
    });
    if (builder.isFar) {
      return;
    }
    builder.box("matte", foot, [0.32, 0.1, 0.32], [point.x, 0.05, point.z]);
    if (top > 2.2 && index % 2 === 0) {
      /* A second leg, braced, for the tall ones */
      const footX = point.x - side.x * 1.0;
      const footZ = point.z - side.z * 1.0;
      builder.bar(
        "paint",
        post,
        [footX, 0, footZ],
        [point.x, top, point.z],
        0.08,
        6,
      );
      builder.bar(
        "paint",
        post,
        [footX, top * 0.45, footZ],
        [point.x, top * 0.3, point.z],
        0.05,
        4,
      );
    }
  });
};

export interface LapPoint {
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Seconds from the station, at the coaster's own speeds. */
  time: number;
}

/**
 * One lap from the station: out round the course to the loop's foot,
 * round the loop, and on round the rest of the course back to the
 * station. Slow up the lift hill, and fast at the bottom of each drop.
 */
export const listLap = (station: Triple): LapPoint[] => {
  const count = 360;
  const course = sampleCourse(count);
  let stationIndex = 0;
  course.forEach(({ point }, index) => {
    const best = course[stationIndex].point;
    if (
      Math.hypot(point.x - station[0], point.z - station[2]) <
      Math.hypot(best.x - station[0], best.z - station[2])
    ) {
      stationIndex = index;
    }
  });
  const loopPoints = Array.from({ length: 48 }, (_, index) => {
    const angle = -(index / 48) * Math.PI * 2;
    const radius = loopRadius - 0.12;
    return new Vector3(
      loopCentre[0] + Math.sin(angle) * radius,
      loopCentre[1] - Math.cos(angle) * radius,
      loopZ,
    );
  });
  const points = [
    ...course.slice(stationIndex).map(({ point }) => point),
    ...loopPoints,
    ...course.slice(0, stationIndex + 1).map(({ point }) => point),
  ];
  let time = 0;
  return points.map((point, index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    const length = point.distanceTo(before);
    const isLift = point.x > 5.5 && after.y > before.y + 0.01;
    const speed = isLift
      ? 1.0
      : 1.3 + 2.1 * Math.sqrt(Math.max(0, 5.3 - point.y));
    time += length / speed;
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      heading: Math.atan2(after.x - before.x, after.z - before.z),
      time,
    };
  });
};

/** Where a lap has got to at a share of its time, from 0 to 1. */
export const findLapPoint = (
  lap: readonly LapPoint[],
  share: number,
): LapPoint => {
  const total = lap[lap.length - 1].time;
  const time = Math.min(1, Math.max(0, share)) * total;
  let low = 0;
  let high = lap.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (lap[middle].time < time) {
      low = middle;
    } else {
      high = middle;
    }
  }
  const from = lap[low];
  const to = lap[high];
  const span = Math.max(1e-6, to.time - from.time);
  const along = Math.min(1, Math.max(0, (time - from.time) / span));
  return {
    x: from.x + (to.x - from.x) * along,
    y: from.y + (to.y - from.y) * along,
    z: from.z + (to.z - from.z) * along,
    heading: along < 0.5 ? from.heading : to.heading,
    time,
  };
};
