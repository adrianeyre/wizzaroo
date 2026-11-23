import {
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Quaternion,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import type { ModelPart, Triple } from "../world-map-models.js";
import {
  blob as ball,
  eyes,
  mirrored,
  rod,
  spike,
  taper,
  turned,
  type LabItemParts,
} from "./lab-item-parts.js";

// Each animal faces +z and stands on y = 0, about one unit tall or long.

const quarter = Math.PI / 2;
const ink = "#16161c";
const glint = "#ffffff";

type Outline = readonly (readonly [number, number])[];

interface Place {
  at?: Triple;
  turn?: Triple;
  size?: Triple;
}

/** An egg-shaped part, a little coarser by default than the shared one. */
const blob = (
  radii: Triple,
  colour: string,
  place: Place = {},
  detail: [number, number] = [10, 7],
): ModelPart => ball(radii, colour, place, detail);

const upward = new Vector3(0, 1, 0);

/** The turn that points a shape's +y axis along `direction`. */
const pointing = (direction: Triple): Triple => {
  const euler = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(
      upward,
      new Vector3(...direction).normalize(),
    ),
  );
  return [euler.x, euler.y, euler.z];
};

/** A straight stick from one point to another, narrowing to `tip`. */
const stick = (
  from: Triple,
  to: Triple,
  radius: number,
  colour: string,
  tip = radius,
  sides = 5,
): ModelPart => {
  const direction: Triple = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  return {
    geometry: new CylinderGeometry(
      tip,
      radius,
      Math.hypot(...direction),
      sides,
    ),
    colour,
    position: [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2,
    ],
    rotation: pointing(direction),
    isSmooth: true,
  };
};

/** A jointed leg or antenna: sticks between the points, a knuckle at each bend. */
const limb = (
  points: readonly Triple[],
  radius: number,
  colour: string,
  tip = radius,
): ModelPart[] =>
  points.slice(1).flatMap((to, index) => {
    const from = points[index] ?? to;
    const last = index === points.length - 2;
    return [
      stick(from, to, radius, colour, last ? tip : radius),
      ...(last
        ? []
        : [blob([radius, radius, radius], colour, { at: to }, [4, 3])]),
    ];
  });

/** A smooth tube along a curve, for tails, trunks, worms and wires. */
const tube = (
  points: readonly Triple[],
  radius: number,
  colour: string,
  segments = 16,
  sides = 6,
): ModelPart => ({
  geometry: new TubeGeometry(
    new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
    segments,
    radius,
    sides,
    false,
  ),
  colour,
  isSmooth: true,
});

/** A flat cut-out shape, drawn in x/y and given a little thickness. */
const flat = (
  outline: Outline,
  depth: number,
  colour: string,
  { at, turn, size }: Place = {},
): ModelPart => {
  const geometry = new ExtrudeGeometry(
    new Shape(outline.map(([x, y]) => new Vector2(x, y))),
    { depth, bevelEnabled: false },
  );
  geometry.translate(0, 0, -depth / 2);
  return { geometry, colour, position: at, rotation: turn, scale: size };
};

/** The same outline flipped left to right, for a part's other side. */
const flipped = (outline: Outline): Outline =>
  outline.map(([x, y]) => [-x, y] as const);

/**
 * A coloured patch on an egg-shaped body: a smaller egg pushed out until a
 * cap of it shows through the body's surface, facing `toward`. A bigger
 * `spread` gives a bigger patch.
 */
const patch = (
  radii: Triple,
  centre: Triple,
  toward: Triple,
  spread: number,
  colour: string,
  detail: [number, number] = [7, 5],
  rise = 0.06,
): ModelPart => {
  const length = Math.hypot(...toward);
  const reach = 1 - spread + rise;
  return blob(
    [radii[0] * spread, radii[1] * spread, radii[2] * spread],
    colour,
    {
      at: [
        centre[0] + (radii[0] * toward[0] * reach) / length,
        centre[1] + (radii[1] * toward[1] * reach) / length,
        centre[2] + (radii[2] * toward[2] * reach) / length,
      ],
    },
    detail,
  );
};

/** Eyes on the sides of a head, as birds, fish and reptiles have them. */
const sideEyes = (
  at: Triple,
  radius: number,
  colour = ink,
  glintColour = glint,
): ModelPart[] =>
  mirrored((side) => [
    blob(
      [radius * 0.7, radius, radius],
      colour,
      { at: [at[0] * side, at[1], at[2]] },
      [6, 4],
    ),
    blob(
      [radius * 0.25, radius * 0.3, radius * 0.3],
      glintColour,
      {
        at: [
          at[0] * side + side * radius * 0.6,
          at[1] + radius * 0.4,
          at[2] + radius * 0.35,
        ],
      },
      [5, 4],
    ),
  ]);

/** A ringed eye: an iris with a pupil and a glint, looking along +z. */
const ringedEyes = (
  at: Triple,
  radius: number,
  iris: string,
  pupil: Triple = [0.5, 0.5, 0.5],
): ModelPart[] =>
  mirrored((side) => [
    blob(
      [radius, radius, radius * 0.55],
      iris,
      { at: [at[0] * side, at[1], at[2]] },
      [7, 5],
    ),
    blob(
      [radius * pupil[0], radius * pupil[1], radius * pupil[2]],
      ink,
      { at: [at[0] * side, at[1], at[2] + radius * 0.3] },
      [6, 4],
    ),
    blob(
      [radius * 0.22, radius * 0.22, radius * 0.15],
      glint,
      {
        at: [
          at[0] * side + radius * 0.3,
          at[1] + radius * 0.35,
          at[2] + radius * 0.55,
        ],
      },
      [5, 4],
    ),
  ]);

/** Egg-shaped pieces placed along a wiggling path, head first. */
const wiggle = (
  pieces: readonly (readonly [number, number, number, number, number])[],
  colour: string,
  y: (index: number) => number,
): ModelPart[] =>
  pieces.map(([x, z, width, height, length], index) => {
    const ahead = index + 1 < pieces.length ? 1 : -1;
    const neighbour = pieces.at(index + ahead);
    const heading =
      neighbour === undefined
        ? 0
        : Math.atan2((neighbour[0] - x) * -ahead, (neighbour[1] - z) * -ahead);
    return blob(
      [width, height, length],
      colour,
      { at: [x, y(index), z], turn: [0, heading, 0] },
      [7, 5],
    );
  });

/** A deterministic scatter of points, so markings land the same each time. */
const scatter = (count: number, seed: number): [number, number][] => {
  let state = seed;
  const next = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  return Array.from({ length: count }, () => [next(), next()]);
};

const isInside = (point: readonly [number, number], outline: Outline) => {
  let inside = false;
  let previous = outline[outline.length - 1] ?? point;
  for (const corner of outline) {
    if (
      corner[1] > point[1] !== previous[1] > point[1] &&
      point[0] <
        ((previous[0] - corner[0]) * (point[1] - corner[1])) /
          (previous[1] - corner[1]) +
          corner[0]
    ) {
      inside = !inside;
    }
    previous = corner;
  }
  return inside;
};

const lift = (at: Triple | undefined, by: number): Triple =>
  at === undefined ? [0, by, 0] : [at[0], at[1] + by, at[2]];

// ---------------------------------------------------------------- tiny life

const bacterium = (): LabItemParts => {
  const green = "#56a843";
  const dark = "#2f7a2c";
  return {
    glass: [
      rod(
        0.25,
        0.72,
        "#b5ec98",
        { at: [0, 0.4, 0], turn: [0, 0, quarter] },
        12,
      ),
    ],
    body: [
      rod(0.19, 0.7, green, { at: [0, 0.4, 0], turn: [0, 0, quarter] }, 12),
      // The specks of its insides, close under its skin.
      ...[
        [-0.25, 0.8],
        [-0.05, 2.2],
        [0.12, 0.3],
        [0.28, 1.6],
        [-0.2, 3.6],
        [0.05, 4.6],
        [0.3, 5.4],
      ].map(([x, angle]) =>
        blob(
          [0.05, 0.04, 0.04],
          dark,
          { at: [x, 0.4 + Math.sin(angle) * 0.17, Math.cos(angle) * 0.17] },
          [6, 4],
        ),
      ),
      // The wavy tails it swims with.
      ...[
        [0.02, 0, 0.1],
        [-0.08, 0.1, -0.1],
        [-0.08, -0.1, 0.05],
      ].map(([lift, spread, phase]) =>
        tube(
          [0, 1, 2, 3, 4, 5].map((step): Triple => [
            0.55 + step * 0.13,
            0.4 + lift + Math.sin(step * 1.6 + phase) * 0.07,
            spread * step * 0.9,
          ]),
          0.016,
          "#3f8f33",
          22,
          4,
        ),
      ),
    ],
  };
};

// ---------------------------------------------------------------- birds

interface BirdLook {
  back: string;
  breast: string;
  head: string;
  wing: string;
  tail: string;
  beak: string;
  legs: string;
  /** How plump it is; 1 is a sparrow. */
  bulk?: number;
  /** How upright it sits, in radians from level. */
  lean?: number;
  beakWidth?: number;
  beakLength?: number;
  tailLength?: number;
}

/** A small songbird perched with its toes over y = 0.07. */
const perchedBird = ({
  back,
  breast,
  head,
  wing,
  tail,
  beak,
  legs,
  bulk = 1,
  lean = 0.75,
  beakWidth = 0.035,
  beakLength = 0.09,
  tailLength = 0.18,
}: BirdLook): ModelPart[] => [
  ...mirrored((side) => [
    rod(0.012, 0.07, legs, { at: [0.05 * side, 0.12, 0.02] }, 5),
    ...[-0.35, 0, 0.35].map((splay) =>
      spike(0.011, 0.07, legs, {
        at: [0.05 * side + splay * 0.05, 0.08, 0.06],
        turn: [quarter + 0.4, splay, 0],
      }),
    ),
  ]),
  blob([0.17 * bulk, 0.2 * bulk, 0.24 * bulk], back, {
    at: [0, 0.36, -0.03],
    turn: [-lean, 0, 0],
  }),
  blob([0.15 * bulk, 0.19 * bulk, 0.14 * bulk], breast, {
    at: [0, 0.35, 0.06 * bulk],
    turn: [-lean * 0.5, 0, 0],
  }),
  blob([0.13 * bulk, 0.13 * bulk, 0.13 * bulk], head, {
    at: [0, 0.34 + 0.25 * bulk, 0.08],
  }),
  spike(beakWidth, beakLength, beak, {
    at: [0, 0.33 + 0.23 * bulk, 0.08 + 0.12 * bulk + beakLength / 2],
    turn: [quarter + 0.15, 0, 0],
  }),
  ...sideEyes([0.085 * bulk, 0.34 + 0.27 * bulk, 0.08 + 0.07 * bulk], 0.025),
  ...mirrored((side) =>
    blob(
      [0.05 * bulk, 0.13 * bulk, 0.22 * bulk],
      wing,
      { at: [0.135 * bulk * side, 0.37, -0.07], turn: [-lean, 0, 0.1 * side] },
      [8, 6],
    ),
  ),
  blob([0.07, 0.02, tailLength], tail, {
    at: [0, 0.22, -0.18 - tailLength * 0.6],
    turn: [-0.55, 0, 0],
  }),
];

interface SongbirdLook {
  back: string;
  head: string;
  wing: string;
  tail: string;
  beak: string;
  legs: string;
  /** How plump it is; 1 is a sparrow. */
  bulk?: number;
  beakWidth?: number;
  beakLength?: number;
  tailLength?: number;
}

interface Egg {
  radii: Triple;
  centre: Triple;
}

/**
 * A small round songbird perched with its toes at y = 0.07. It hands back
 * its body and head so each bird can paint its own markings on them.
 */
const songbird = ({
  back,
  head,
  wing,
  tail,
  beak,
  legs,
  bulk = 1,
  beakWidth = 0.035,
  beakLength = 0.09,
  tailLength = 0.17,
}: SongbirdLook): { parts: ModelPart[]; body: Egg; head: Egg } => {
  const body: Egg = {
    radii: [0.18 * bulk, 0.2 * bulk, 0.22 * bulk],
    centre: [0, 0.13 + 0.2 * bulk, -0.02],
  };
  const headEgg: Egg = {
    radii: [0.125 * bulk, 0.125 * bulk, 0.125 * bulk],
    centre: [0, body.centre[1] + 0.24 * bulk, 0.07 * bulk],
  };
  const [, headY, headZ] = headEgg.centre;
  return {
    body,
    head: headEgg,
    parts: [
      ...mirrored((side) => [
        rod(0.012, 0.07, legs, { at: [0.05 * side, 0.12, 0.02] }, 5),
        ...[-0.35, 0, 0.35].map((splay) =>
          spike(
            0.011,
            0.07,
            legs,
            {
              at: [0.05 * side + splay * 0.05, 0.08, 0.06],
              turn: [quarter + 0.4, splay, 0],
            },
            4,
          ),
        ),
      ]),
      blob(body.radii, back, { at: body.centre }, [12, 8]),
      blob(headEgg.radii, head, { at: headEgg.centre }, [12, 8]),
      spike(beakWidth, beakLength, beak, {
        at: [0, headY - 0.02, headZ + 0.115 * bulk + beakLength / 2],
        turn: [quarter + 0.15, 0, 0],
      }),
      ...sideEyes([0.085 * bulk, headY + 0.02, headZ + 0.07 * bulk], 0.024),
      ...mirrored((side) =>
        blob(
          [0.045 * bulk, 0.13 * bulk, 0.2 * bulk],
          wing,
          {
            at: [0.145 * bulk * side, body.centre[1] + 0.01, -0.07],
            turn: [-0.5, 0, 0.1 * side],
          },
          [8, 6],
        ),
      ),
      blob(
        [0.07, 0.02, tailLength],
        tail,
        {
          at: [0, body.centre[1] - 0.1, -0.2 - tailLength * 0.6],
          turn: [-0.5, 0, 0],
        },
        [7, 4],
      ),
    ],
  };
};

const twig = (colour = "#7a5a3a"): ModelPart[] => [
  stick([-0.4, 0.035, 0.03], [0.4, 0.035, 0.03], 0.035, colour, 0.03, 7),
  stick([0.24, 0.04, 0.03], [0.36, 0.17, 0.03], 0.02, colour, 0.012, 5),
];

const bird = (): LabItemParts => {
  const brown = "#8c5d34";
  const streak = "#3e2a1a";
  const { parts, body, head } = songbird({
    back: brown,
    head: "#8a8884",
    wing: "#7d522e",
    tail: "#5d3e24",
    beak: "#3a3632",
    legs: "#b48a6a",
    beakWidth: 0.042,
    beakLength: 0.075,
  });
  return {
    body: [
      ...twig(),
      ...parts,
      patch(
        body.radii,
        body.centre,
        [0, -0.1, 1],
        0.8,
        "#c2b9aa",
        [12, 8],
        0.1,
      ),
      // A house sparrow's chestnut stripe, pale cheek and black bib.
      patch(
        body.radii,
        body.centre,
        [0, 0.7, 1],
        0.42,
        "#1f1b18",
        [7, 5],
        0.13,
      ),
      patch(
        head.radii,
        head.centre,
        [0, -0.75, 0.65],
        0.5,
        "#1f1b18",
        [7, 5],
        0.08,
      ),
      ...[-1, 1].flatMap((side) => [
        patch(head.radii, head.centre, [side, 0.25, -0.35], 0.6, "#8b4a24"),
        patch(
          head.radii,
          head.centre,
          [side, -0.35, 0.45],
          0.5,
          "#f0ebe1",
          [7, 5],
          0.08,
        ),
        patch(
          body.radii,
          body.centre,
          [side * 0.45, 0.75, -0.6],
          0.3,
          streak,
          [6, 4],
        ),
        patch(
          body.radii,
          body.centre,
          [side * 0.2, 0.55, -0.85],
          0.3,
          streak,
          [6, 4],
        ),
      ]),
      ...mirrored((side) =>
        [0, 1, 2].map((index) =>
          blob(
            [0.012, 0.05, 0.016],
            index === 1 ? "#f0eadc" : streak,
            {
              at: [0.205 * side, 0.36 - index * 0.04, -0.08 - index * 0.04],
              turn: [-0.5, 0, 0.08 * side],
            },
            [5, 3],
          ),
        ),
      ),
    ],
  };
};

const finch = (): LabItemParts => {
  const { parts, body } = songbird({
    back: "#76624c",
    head: "#4b3d31",
    wing: "#5e4b3a",
    tail: "#3f3226",
    beak: "#d3c19a",
    legs: "#3a3330",
    bulk: 1.08,
    beakWidth: 0.058,
    beakLength: 0.085,
    tailLength: 0.13,
  });
  return {
    body: [
      // The rock it stands on, on its island, with a couple of seeds.
      {
        ...blob([0.32, 0.1, 0.24], "#5d5955", { at: [0, 0.0, 0.02] }),
        roughen: 0.15,
      },
      blob([0.14, 0.08, 0.12], "#6b6661", { at: [0.24, 0.02, -0.08] }, [7, 4]),
      ...[
        [-0.2, 0.09, 0.14],
        [-0.12, 0.095, 0.18],
      ].map(([x, y, z]) =>
        blob([0.025, 0.017, 0.017], "#c9a465", { at: [x, y, z] }, [5, 4]),
      ),
      ...parts.map((part) => ({
        ...part,
        position: lift(part.position, 0.02),
      })),
      patch(
        body.radii,
        lift(body.centre, 0.02),
        [0, -0.2, 1],
        0.75,
        "#a7957a",
        [12, 8],
        0.1,
      ),
    ],
  };
};

const robin = (): LabItemParts => {
  const orange = "#e8602a";
  const { parts, body, head } = songbird({
    back: "#7a6046",
    head: "#7a6046",
    wing: "#6c5238",
    tail: "#5c4430",
    beak: "#2b2622",
    legs: "#9a7a62",
    bulk: 1.12,
    beakWidth: 0.022,
    beakLength: 0.075,
    tailLength: 0.14,
  });
  return {
    body: [
      ...twig("#6d5136"),
      ...parts,
      patch(
        body.radii,
        body.centre,
        [0, -0.75, 0.6],
        0.7,
        "#f3eee4",
        [12, 8],
        0.08,
      ),
      // The orange-red face and breast, edged in grey.
      patch(
        body.radii,
        body.centre,
        [0, 0.2, 1],
        0.8,
        "#b6b4ae",
        [12, 8],
        0.09,
      ),
      patch(body.radii, body.centre, [0, 0.25, 1], 0.74, orange, [12, 8], 0.12),
      patch(head.radii, head.centre, [0, -0.35, 1], 0.74, orange, [10, 7], 0.1),
    ],
  };
};

const budgie = (): LabItemParts => {
  const green = "#62c23a";
  const yellow = "#f3e04a";
  const bar = "#1e1e1a";
  const parts = perchedBird({
    back: green,
    breast: "#79d046",
    head: yellow,
    wing: "#c8d84a",
    tail: "#2f5fb5",
    beak: "#e3cf9c",
    legs: "#9aa0b0",
    lean: 1.05,
    beakWidth: 0.001,
    beakLength: 0.001,
    tailLength: 0.1,
  });
  return {
    body: [
      rod(
        0.03,
        0.75,
        "#c9a66b",
        { at: [0, 0.035, 0.03], turn: [0, 0, quarter] },
        7,
      ),
      ...parts,
      // The long blue tail feathers.
      ...[-0.03, 0.03].map((x) =>
        blob(
          [0.03, 0.012, 0.24],
          "#2f5fb5",
          { at: [x, 0.08, -0.34], turn: [-0.95, 0, 0] },
          [6, 4],
        ),
      ),
      // A short hooked beak under a blue nose patch.
      blob([0.035, 0.022, 0.03], "#3f6fd6", { at: [0, 0.615, 0.2] }, [6, 4]),
      blob([0.035, 0.04, 0.035], "#e3cf9c", { at: [0, 0.58, 0.215] }, [7, 4]),
      spike(0.03, 0.06, "#e3cf9c", {
        at: [0, 0.545, 0.215],
        turn: [Math.PI + 0.25, 0, 0],
      }),
      // Its purple cheek spots and the black dots on its throat.
      ...mirrored((side) => [
        blob(
          [0.02, 0.025, 0.02],
          "#5848b8",
          { at: [0.09 * side, 0.54, 0.15] },
          [6, 4],
        ),
        blob(
          [0.013, 0.013, 0.01],
          bar,
          { at: [0.04 * side, 0.51, 0.19] },
          [5, 3],
        ),
      ]),
      // The black bars across its yellow wings and the back of its head.
      ...mirrored((side) =>
        [0, 1, 2, 3].map((index) =>
          blob(
            [0.035, 0.012, 0.06],
            bar,
            {
              at: [0.165 * side, 0.5 - index * 0.06, -0.03 - index * 0.04],
              turn: [-1.05, 0, 0.1 * side],
            },
            [6, 3],
          ),
        ),
      ),
      ...[0.67, 0.64, 0.61].map((y, index) =>
        blob(
          [0.09, 0.008, 0.05],
          bar,
          { at: [0, y, -0.01 - index * 0.02], turn: [-0.5, 0, 0] },
          [6, 3],
        ),
      ),
    ],
  };
};

const owl = (): LabItemParts => {
  const brown = "#8a5a33";
  const dark = "#4f331f";
  const pale = "#d4b386";
  const disc = "#b98a58";
  return {
    body: [
      rod(
        0.05,
        0.9,
        "#5e4630",
        { at: [0, 0.05, 0.05], turn: [0, 0, quarter] },
        7,
      ),
      blob([0.34, 0.42, 0.3], brown, { at: [0, 0.52, 0] }),
      blob([0.25, 0.3, 0.12], "#b98d5f", { at: [0, 0.46, 0.2] }),
      blob([0.3, 0.26, 0.27], brown, { at: [0, 0.98, 0.02] }),
      // The pale round face with a dark rim.
      ...mirrored((side) => [
        blob(
          [0.14, 0.15, 0.06],
          dark,
          { at: [0.1 * side, 0.97, 0.22] },
          [9, 6],
        ),
        blob(
          [0.125, 0.135, 0.06],
          disc,
          { at: [0.1 * side, 0.97, 0.235] },
          [9, 6],
        ),
        blob(
          [0.08, 0.02, 0.025],
          "#efe3cb",
          {
            at: [0.08 * side, 1.08, 0.29],
            turn: [0, 0, -0.3 * side],
          },
          [6, 3],
        ),
      ]),
      ...eyes([0.1, 1.0, 0.285], 0.055),
      spike(0.03, 0.09, "#d8c48c", {
        at: [0, 0.93, 0.31],
        turn: [Math.PI - 0.5, 0, 0],
      }),
      ...mirrored((side) =>
        blob(
          [0.12, 0.34, 0.24],
          "#7a4c2b",
          {
            at: [0.3 * side, 0.52, -0.05],
            turn: [0.1, 0, 0.1 * side],
          },
          [9, 6],
        ),
      ),
      // Mottling: dark streaks down its front and pale spots on its wings.
      ...[
        [0.1, 0.62],
        [-0.1, 0.6],
        [0, 0.5],
        [0.12, 0.4],
        [-0.05, 0.3],
      ].map(([x, y]) =>
        blob(
          [0.018, 0.045, 0.015],
          dark,
          { at: [x, y, 0.315 - Math.abs(x) * 0.4] },
          [5, 3],
        ),
      ),
      ...mirrored((side) =>
        [0.62, 0.48, 0.34].map((y) =>
          blob(
            [0.012, 0.018, 0.09],
            pale,
            { at: [0.41 * side, y, -0.02], turn: [0.1, 0, 0.1 * side] },
            [5, 3],
          ),
        ),
      ),
      ...mirrored((side) => [
        blob(
          [0.08, 0.06, 0.08],
          "#b48d62",
          { at: [0.12 * side, 0.12, 0.13] },
          [7, 4],
        ),
        ...[-0.04, 0, 0.04].map((x) =>
          spike(0.012, 0.07, "#2a2420", {
            at: [0.12 * side + x, 0.07, 0.2],
            turn: [quarter + 0.6, 0, 0],
          }),
        ),
      ]),
    ],
  };
};

const hen = (): LabItemParts => {
  const brown = "#a3532a";
  const red = "#d6302a";
  const yellow = "#e6b030";
  return {
    body: [
      blob([0.25, 0.25, 0.36], brown, { at: [0, 0.44, -0.04] }),
      blob([0.2, 0.22, 0.16], "#a85a2c", { at: [0, 0.44, 0.2] }),
      blob([0.12, 0.18, 0.12], "#c47836", {
        at: [0, 0.66, 0.24],
        turn: [0.3, 0, 0],
      }),
      blob([0.1, 0.1, 0.11], "#b4652f", { at: [0, 0.83, 0.3] }),
      // Its red comb, wattles and face.
      ...[0.22, 0.27, 0.32, 0.37].map((z, index) =>
        blob(
          [0.018, 0.045 - Math.abs(index - 1.5) * 0.008, 0.03],
          red,
          {
            at: [0, 0.94, z],
          },
          [6, 4],
        ),
      ),
      ...mirrored((side) => [
        blob(
          [0.022, 0.045, 0.02],
          red,
          { at: [0.022 * side, 0.73, 0.39] },
          [6, 4],
        ),
        blob(
          [0.04, 0.035, 0.03],
          red,
          { at: [0.065 * side, 0.82, 0.36] },
          [6, 4],
        ),
      ]),
      spike(0.03, 0.08, "#e8c050", {
        at: [0, 0.8, 0.44],
        turn: [quarter + 0.3, 0, 0],
      }),
      ...sideEyes([0.085, 0.86, 0.35], 0.02, "#2a1a10"),
      ...mirrored((side) =>
        blob(
          [0.07, 0.17, 0.26],
          "#8a4220",
          {
            at: [0.21 * side, 0.46, -0.06],
            turn: [-0.25, 0, 0.12 * side],
          },
          [10, 7],
        ),
      ),
      // The dark tail feathers sweeping up behind.
      ...[-1, 0, 1].map((fan) =>
        blob(
          [0.035, 0.2, 0.08],
          "#2c241e",
          {
            at: [fan * 0.06, 0.7, -0.38],
            turn: [-0.55, 0, fan * 0.3],
          },
          [7, 5],
        ),
      ),
      blob([0.16, 0.14, 0.12], "#8a4220", { at: [0, 0.6, -0.32] }, [7, 5]),
      ...mirrored((side) => [
        rod(0.025, 0.2, yellow, { at: [0.08 * side, 0.15, 0] }, 6),
        ...[-0.45, 0, 0.45].map((splay) =>
          spike(0.018, 0.12, yellow, {
            at: [0.08 * side + splay * 0.1, 0.02, 0.07],
            turn: [quarter, splay, 0],
          }),
        ),
        spike(0.016, 0.08, yellow, {
          at: [0.08 * side, 0.02, -0.05],
          turn: [-quarter, 0, 0],
        }),
      ]),
    ],
  };
};

const chick = (): LabItemParts => {
  const yellow = "#ffd83b";
  const orange = "#f29a1e";
  return {
    body: [
      {
        ...blob([0.3, 0.27, 0.3], yellow, { at: [0, 0.33, -0.02] }),
        roughen: 0.08,
      },
      {
        ...blob([0.19, 0.18, 0.18], yellow, { at: [0, 0.68, 0.1] }),
        roughen: 0.08,
      },
      ...[-0.04, 0, 0.04].map((x) =>
        blob(
          [0.025, 0.06, 0.025],
          "#ffe46a",
          {
            at: [x, 0.88, 0.06],
            turn: [-0.3, 0, x * 6],
          },
          [6, 4],
        ),
      ),
      ...eyes([0.075, 0.71, 0.24], 0.032),
      spike(0.04, 0.08, orange, {
        at: [0, 0.65, 0.3],
        turn: [quarter, 0, 0],
        size: [1, 1, 0.7],
      }),
      ...mirrored((side) => [
        blob(
          [0.04, 0.03, 0.02],
          "#ffb6a0",
          { at: [0.12 * side, 0.63, 0.2] },
          [6, 4],
        ),
        blob(
          [0.07, 0.14, 0.16],
          "#ffcc2a",
          {
            at: [0.27 * side, 0.38, -0.04],
            turn: [-0.3, 0, 0.5 * side],
          },
          [7, 5],
        ),
        rod(0.022, 0.08, orange, { at: [0.1 * side, 0.07, 0.04] }, 5),
        ...[-0.45, 0, 0.45].map((splay) =>
          spike(0.016, 0.1, orange, {
            at: [0.1 * side + splay * 0.08, 0.015, 0.1],
            turn: [quarter, splay, 0],
          }),
        ),
      ]),
    ],
  };
};

const duck = (): LabItemParts => {
  const green = "#1d6b3c";
  return {
    glass: [blob([0.7, 0.03, 0.7], "#7fc4e8", { at: [0, 0.18, 0] }, [16, 4])],
    body: [
      blob([0.25, 0.19, 0.42], "#b8b3a8", { at: [0, 0.27, -0.04] }),
      blob([0.21, 0.19, 0.16], "#7a3c22", { at: [0, 0.3, 0.25] }),
      ...mirrored((side) => [
        blob([0.06, 0.1, 0.27], "#8f7f6c", {
          at: [0.18 * side, 0.36, -0.1],
          turn: [-0.12, 0, -0.2 * side],
        }),
        // The blue patch on each wing.
        blob(
          [0.012, 0.022, 0.07],
          "#3a46b0",
          { at: [0.235 * side, 0.33, -0.16], turn: [-0.12, 0, -0.2 * side] },
          [6, 4],
        ),
      ]),
      blob(
        [0.12, 0.06, 0.12],
        "#1c1c1c",
        { at: [0, 0.38, -0.42], turn: [0.5, 0, 0] },
        [7, 4],
      ),
      tube(
        [
          [0, 0.4, -0.44],
          [0, 0.47, -0.43],
          [0, 0.5, -0.38],
          [0, 0.47, -0.35],
        ],
        0.014,
        "#1c1c1c",
        8,
        4,
      ),
      blob([0.1, 0.025, 0.1], "#f4f4f0", { at: [0, 0.46, 0.3] }, [10, 4]),
      blob([0.085, 0.12, 0.09], green, { at: [0, 0.54, 0.3] }, [10, 7]),
      blob([0.12, 0.11, 0.15], green, { at: [0, 0.66, 0.33] }),
      blob(
        [0.06, 0.022, 0.12],
        "#e8c234",
        { at: [0, 0.62, 0.5], turn: [0.25, 0, 0] },
        [10, 5],
      ),
      blob([0.02, 0.01, 0.02], "#2a2a2a", { at: [0, 0.6, 0.6] }, [5, 3]),
      ...sideEyes([0.09, 0.69, 0.38], 0.02),
    ],
  };
};

const penguin = (): LabItemParts => {
  const black = "#1d2230";
  const white = "#f4f4f0";
  const orange = "#f5a623";
  return {
    body: [
      blob([0.3, 0.56, 0.28], black, { at: [0, 0.62, -0.03] }),
      blob([0.26, 0.5, 0.2], white, { at: [0, 0.56, 0.08] }),
      blob([0.15, 0.1, 0.06], "#f6e9bc", { at: [0, 0.99, 0.19] }, [10, 6]),
      blob([0.19, 0.18, 0.19], black, { at: [0, 1.2, 0.03] }),
      // The orange-yellow patch on each side of its neck.
      ...mirrored((side) =>
        blob(
          [0.035, 0.08, 0.06],
          orange,
          { at: [0.165 * side, 1.12, 0.04], turn: [0.5, 0, 0.2 * side] },
          [7, 5],
        ),
      ),
      spike(0.04, 0.22, black, {
        at: [0, 1.14, 0.3],
        turn: [quarter + 0.25, 0, 0],
      }),
      ...mirrored((side) =>
        blob(
          [0.012, 0.014, 0.08],
          "#f07a2a",
          { at: [0.025 * side, 1.12, 0.27], turn: [0.25, 0, 0] },
          [5, 3],
        ),
      ),
      ...sideEyes([0.12, 1.24, 0.12], 0.022),
      ...mirrored((side) =>
        blob(
          [0.05, 0.32, 0.11],
          black,
          {
            at: [0.3 * side, 0.62, 0],
            turn: [0.1, 0, 0.18 * side],
          },
          [8, 7],
        ),
      ),
      ...mirrored((side) =>
        blob(
          [0.08, 0.035, 0.11],
          "#3a3632",
          { at: [0.1 * side, 0.03, 0.12] },
          [7, 4],
        ),
      ),
      blob(
        [0.08, 0.03, 0.12],
        black,
        { at: [0, 0.12, -0.3], turn: [0.5, 0, 0] },
        [6, 4],
      ),
    ],
  };
};

const woodpecker = (): LabItemParts => {
  const black = "#1a1a1c";
  const white = "#f4f2ec";
  const red = "#d42a2a";
  const bark = "#6e5238";
  return {
    body: [
      taper([0.2, 0.23], 1.3, bark, { at: [-0.3, 0.65, 0] }, 12),
      ...[
        [0.3, 0.8],
        [0.9, 0.5],
        [-0.4, 0.4],
        [0.5, 1.0],
        [-0.2, 1.1],
      ].map(([angle, y]) =>
        blob(
          [0.03, 0.18, 0.03],
          "#4f3a26",
          {
            at: [-0.3 + Math.cos(angle) * 0.215, y, Math.sin(angle) * 0.215],
          },
          [5, 4],
        ),
      ),
      // The bird clings to the trunk, belly to the bark, beak up.
      blob([0.13, 0.26, 0.13], black, { at: [0.03, 0.62, 0] }),
      blob([0.06, 0.2, 0.1], white, { at: [-0.04, 0.62, 0] }, [7, 5]),
      blob([0.06, 0.07, 0.08], red, { at: [-0.02, 0.4, 0] }, [7, 4]),
      blob([0.11, 0.11, 0.1], black, { at: [0.01, 0.92, 0] }),
      blob([0.08, 0.05, 0.08], red, { at: [0.03, 1.0, 0] }, [7, 4]),
      spike(0.03, 0.17, "#3a3a3a", {
        at: [-0.16, 0.95, 0],
        turn: [0, 0, quarter - 0.2],
      }),
      spike(0.05, 0.32, black, {
        at: [-0.02, 0.27, 0],
        turn: [0, 0, Math.PI - 0.25],
      }),
      ...[-1, 1].flatMap((side) => [
        blob(
          [0.07, 0.05, 0.03],
          white,
          { at: [-0.03, 0.9, 0.08 * side] },
          [6, 4],
        ),
        blob(
          [0.08, 0.015, 0.02],
          black,
          { at: [-0.04, 0.86, 0.085 * side], turn: [0, 0, 0.5] },
          [6, 3],
        ),
        blob(
          [0.015, 0.018, 0.012],
          ink,
          { at: [-0.02, 0.95, 0.09 * side] },
          [5, 4],
        ),
        blob(
          [0.005, 0.006, 0.005],
          glint,
          { at: [-0.03, 0.958, 0.1 * side] },
          [4, 3],
        ),
        blob(
          [0.1, 0.2, 0.035],
          black,
          { at: [0.08, 0.6, 0.11 * side] },
          [7, 5],
        ),
        blob(
          [0.05, 0.08, 0.02],
          white,
          { at: [0.06, 0.72, 0.14 * side] },
          [6, 4],
        ),
        ...[0.62, 0.54, 0.46].map((y) =>
          blob(
            [0.07, 0.01, 0.012],
            white,
            { at: [0.11, y, 0.14 * side], turn: [0, 0, -0.4] },
            [5, 3],
          ),
        ),
        spike(0.014, 0.07, "#555", {
          at: [-0.09, 0.47, 0.06 * side],
          turn: [0, 0, quarter + 0.6],
        }),
      ]),
    ],
  };
};

const birdNest = (): LabItemParts => {
  const twigs = ["#7a5a34", "#5e4428", "#93703f"];
  const skin = "#c7a59a";
  const nestling = (x: number, z: number): ModelPart[] => [
    {
      ...blob([0.14, 0.12, 0.14], "#9c8f88", { at: [x, 0.33, z] }, [8, 6]),
      roughen: 0.15,
    },
    blob([0.06, 0.1, 0.06], skin, { at: [x, 0.46, z] }, [7, 5]),
    blob([0.085, 0.08, 0.085], skin, { at: [x, 0.56, z] }, [7, 5]),
    // A wide-open yellow-edged beak, begging for food.
    blob([0.05, 0.03, 0.05], "#e0402a", { at: [x, 0.63, z + 0.02] }, [7, 4]),
    blob(
      [0.06, 0.055, 0.012],
      "#f8c830",
      { at: [x, 0.65, z - 0.04], turn: [-0.85, 0, 0] },
      [7, 4],
    ),
    blob(
      [0.06, 0.05, 0.012],
      "#f8c830",
      { at: [x, 0.635, z + 0.08], turn: [0.95, 0, 0] },
      [7, 4],
    ),
    ...[-1, 1].map((side) =>
      blob(
        [0.02, 0.012, 0.015],
        "#4a3434",
        { at: [x + 0.055 * side, 0.58, z + 0.05] },
        [5, 3],
      ),
    ),
  ];
  return {
    body: [
      turned(
        [
          [0, 0.02],
          [0.28, 0.03],
          [0.45, 0.13],
          [0.52, 0.27],
          [0.48, 0.35],
          [0.4, 0.32],
          [0.32, 0.24],
          [0, 0.21],
        ],
        "#7a5a34",
        {},
        16,
      ),
      // The twigs woven round its rim.
      ...Array.from({ length: 11 }, (_, index) => {
        const angle = (index / 11) * Math.PI * 2;
        const tilt = index % 2 === 0 ? 0.07 : -0.07;
        const y = 0.28 + (index % 2) * 0.05;
        return stick(
          [
            Math.cos(angle - 0.4) * 0.47,
            y - tilt,
            Math.sin(angle - 0.4) * 0.47,
          ],
          [
            Math.cos(angle + 0.4) * 0.47,
            y + tilt,
            Math.sin(angle + 0.4) * 0.47,
          ],
          0.016,
          twigs[index % 3] ?? "#7a5a34",
          0.012,
          4,
        );
      }),
      ...Array.from({ length: 7 }, (_, index) => {
        const angle = (index / 7) * Math.PI * 2 + 0.3;
        return stick(
          [Math.cos(angle - 0.33) * 0.43, 0.06, Math.sin(angle - 0.33) * 0.43],
          [Math.cos(angle + 0.33) * 0.45, 0.2, Math.sin(angle + 0.33) * 0.45],
          0.014,
          twigs[(index + 1) % 3] ?? "#7a5a34",
          0.01,
          4,
        );
      }),
      ...nestling(-0.17, 0.08),
      ...nestling(0.17, 0.08),
      ...nestling(0, -0.15).map((part) => ({
        ...part,
        position: lift(part.position, 0.05),
      })),
    ],
  };
};

// ---------------------------------------------------------------- pets

interface CatLook {
  coat: string;
  stripe: string;
  cream: string;
  iris: string;
}

const sittingCat = ({ coat, stripe, cream, iris }: CatLook): ModelPart[] => [
  blob([0.24, 0.22, 0.26], coat, { at: [0, 0.22, -0.08] }),
  blob([0.16, 0.3, 0.16], coat, { at: [0, 0.48, 0.05], turn: [-0.2, 0, 0] }),
  blob([0.11, 0.2, 0.08], cream, { at: [0, 0.5, 0.15] }, [10, 7]),
  ...mirrored((side) => [
    rod(0.048, 0.32, coat, { at: [0.08 * side, 0.2, 0.15] }, 6),
    blob([0.055, 0.035, 0.07], cream, { at: [0.08 * side, 0.03, 0.2] }, [6, 4]),
    blob([0.06, 0.045, 0.12], coat, { at: [0.18 * side, 0.04, 0.04] }, [7, 4]),
    // Tabby stripes curving down its flanks.
    ...[-0.17, -0.04].map((dz) => {
      const across = Math.sqrt(1 - (dz / 0.26) ** 2) * 1.02;
      return tube(
        [0.5, 0.85, 1.2, 1.5].map((angle): Triple => [
          Math.sin(angle) * 0.24 * across * side,
          0.22 + Math.cos(angle) * 0.22 * across,
          -0.08 + dz + (angle - 1) * 0.03,
        ]),
        0.016,
        stripe,
        6,
        3,
      );
    }),
  ]),
  ...[0.62, 0.52, 0.42].map((y) =>
    blob(
      [0.12, 0.022, 0.06],
      stripe,
      { at: [0, y, -0.07], turn: [-0.2, 0, 0] },
      [6, 3],
    ),
  ),
  blob([0.17, 0.15, 0.15], coat, { at: [0, 0.86, 0.12] }),
  ...mirrored((side) => [
    blob([0.08, 0.065, 0.06], coat, { at: [0.08 * side, 0.81, 0.2] }, [6, 4]),
    spike(0.07, 0.14, coat, {
      at: [0.1 * side, 1.0, 0.1],
      turn: [-0.1, 0, -0.3 * side],
      size: [1, 1, 0.45],
    }),
    spike(0.045, 0.1, "#f0a8a0", {
      at: [0.1 * side, 0.99, 0.125],
      turn: [-0.1, 0, -0.3 * side],
      size: [1, 1, 0.3],
    }),
    blob([0.035, 0.04, 0.02], iris, { at: [0.07 * side, 0.9, 0.245] }, [6, 4]),
    blob([0.008, 0.032, 0.01], ink, { at: [0.07 * side, 0.9, 0.262] }, [5, 4]),
    blob(
      [0.008, 0.008, 0.005],
      glint,
      { at: [0.07 * side + 0.012, 0.912, 0.268] },
      [4, 3],
    ),
    ...[-0.08, 0.05].map((tilt) =>
      stick(
        [0.08 * side, 0.8, 0.26],
        [0.26 * side, 0.8 + tilt, 0.23],
        0.003,
        "#fbf6ea",
        0.002,
        3,
      ),
    ),
  ]),
  blob([0.065, 0.045, 0.045], cream, { at: [0, 0.8, 0.24] }, [7, 4]),
  blob([0.022, 0.015, 0.012], "#e98a8a", { at: [0, 0.835, 0.28] }, [6, 4]),
  // The "M" stripes on its forehead.
  ...[-0.04, 0, 0.04].map((x) =>
    blob(
      [0.012, 0.04, 0.01],
      stripe,
      { at: [x, 0.97, 0.22 - Math.abs(x)], turn: [-0.5, 0, x * 8] },
      [5, 3],
    ),
  ),
];

const cat = (): LabItemParts => {
  const look = {
    coat: "#e08a3c",
    stripe: "#b0571c",
    cream: "#f6e2c4",
    iris: "#8cc63e",
  };
  return {
    body: [
      ...sittingCat(look),
      // Its tail curled round in front of its paws.
      tube(
        [
          [0, 0.1, -0.32],
          [0.22, 0.06, -0.26],
          [0.3, 0.05, -0.02],
          [0.22, 0.05, 0.2],
          [0.04, 0.05, 0.3],
        ],
        0.045,
        look.coat,
        12,
        5,
      ),
      ...[
        [0.3, 0.05, -0.05],
        [0.23, 0.05, 0.19],
      ].map((at) =>
        blob(
          [0.05, 0.05, 0.02],
          look.stripe,
          { at: [at[0], at[1], at[2]], turn: [0, 0.9, 0] },
          [5, 3],
        ),
      ),
      blob(
        [0.048, 0.048, 0.048],
        look.stripe,
        { at: [0.04, 0.05, 0.3] },
        [5, 4],
      ),
    ],
  };
};

const kitten = (): LabItemParts => {
  const coat = "#f2a55c";
  const cream = "#fbe8cc";
  const stripe = "#d27a35";
  return {
    body: [
      {
        ...blob([0.17, 0.15, 0.18], coat, { at: [0, 0.15, -0.04] }),
        roughen: 0.12,
      },
      {
        ...blob([0.12, 0.18, 0.12], coat, { at: [0, 0.3, 0.03] }),
        roughen: 0.12,
      },
      {
        ...blob([0.09, 0.13, 0.06], cream, { at: [0, 0.31, 0.11] }, [7, 5]),
        roughen: 0.2,
      },
      ...mirrored((side) => [
        rod(0.04, 0.14, coat, { at: [0.06 * side, 0.1, 0.12] }, 6),
        blob(
          [0.045, 0.03, 0.055],
          cream,
          { at: [0.06 * side, 0.025, 0.15] },
          [7, 4],
        ),
        blob(
          [0.05, 0.04, 0.09],
          coat,
          { at: [0.13 * side, 0.03, 0.03] },
          [7, 4],
        ),
        spike(0.085, 0.15, coat, {
          at: [0.12 * side, 0.74, 0.04],
          turn: [-0.1, 0, -0.35 * side],
          size: [1, 1, 0.45],
        }),
        spike(0.055, 0.11, "#f6b0a8", {
          at: [0.12 * side, 0.73, 0.065],
          turn: [-0.1, 0, -0.35 * side],
          size: [1, 1, 0.3],
        }),
        {
          ...blob(
            [0.07, 0.06, 0.05],
            cream,
            { at: [0.07 * side, 0.51, 0.16] },
            [7, 5],
          ),
          roughen: 0.2,
        },
        {
          ...blob(
            [0.04, 0.05, 0.04],
            coat,
            { at: [0.17 * side, 0.54, 0.06] },
            [6, 4],
          ),
          roughen: 0.3,
        },
        stick(
          [0.07 * side, 0.52, 0.21],
          [0.22 * side, 0.53, 0.18],
          0.0025,
          "#ffffff",
          0.002,
          3,
        ),
      ]),
      {
        ...blob([0.19, 0.17, 0.17], coat, { at: [0, 0.58, 0.06] }),
        roughen: 0.06,
      },
      ...ringedEyes([0.075, 0.6, 0.19], 0.052, "#6cb4e6", [0.6, 0.7, 0.5]),
      blob([0.02, 0.014, 0.012], "#ef8f95", { at: [0, 0.53, 0.225] }, [6, 4]),
      ...[-0.035, 0, 0.035].map((x) =>
        blob(
          [0.01, 0.035, 0.01],
          stripe,
          { at: [x, 0.71, 0.17 - Math.abs(x)], turn: [-0.6, 0, x * 8] },
          [5, 3],
        ),
      ),
      // Its fluffy tail held straight up behind it.
      tube(
        [
          [0, 0.12, -0.18],
          [0.02, 0.22, -0.28],
          [0.04, 0.38, -0.3],
          [0.03, 0.52, -0.24],
        ],
        0.04,
        coat,
        10,
        6,
      ),
      {
        ...blob([0.05, 0.06, 0.05], coat, { at: [0.03, 0.53, -0.24] }, [6, 4]),
        roughen: 0.2,
      },
    ],
  };
};

const dog = (): LabItemParts => {
  const brown = "#a86e3c";
  const light = "#ecd0a4";
  const ears = "#6b4224";
  return {
    body: [
      blob([0.24, 0.22, 0.28], brown, { at: [0, 0.22, -0.1] }),
      blob([0.17, 0.3, 0.17], brown, {
        at: [0, 0.48, 0.05],
        turn: [-0.25, 0, 0],
      }),
      blob([0.12, 0.2, 0.08], light, { at: [0, 0.48, 0.15] }, [10, 7]),
      taper(
        [0.12, 0.13],
        0.05,
        "#d63a3a",
        { at: [0, 0.7, 0.03], turn: [-0.3, 0, 0] },
        14,
      ),
      blob([0.03, 0.03, 0.015], "#f2c43a", { at: [0, 0.64, 0.17] }, [6, 4]),
      ...mirrored((side) => [
        rod(0.05, 0.34, brown, { at: [0.09 * side, 0.2, 0.15] }, 7),
        blob(
          [0.06, 0.04, 0.08],
          light,
          { at: [0.09 * side, 0.035, 0.2] },
          [7, 4],
        ),
        blob(
          [0.065, 0.05, 0.14],
          brown,
          { at: [0.19 * side, 0.05, 0.02] },
          [7, 4],
        ),
        blob(
          [0.05, 0.14, 0.08],
          ears,
          {
            at: [0.16 * side, 0.86, 0.08],
            turn: [0.1, 0, 0.25 * side],
          },
          [7, 5],
        ),
      ]),
      blob([0.16, 0.15, 0.16], brown, { at: [0, 0.92, 0.1] }),
      blob([0.09, 0.075, 0.11], light, { at: [0, 0.84, 0.25] }, [10, 7]),
      blob([0.04, 0.03, 0.03], ink, { at: [0, 0.88, 0.355] }, [6, 4]),
      blob(
        [0.035, 0.012, 0.06],
        "#ec7f8a",
        { at: [0, 0.77, 0.3], turn: [0.7, 0, 0] },
        [6, 4],
      ),
      ...eyes([0.065, 0.96, 0.23], 0.026),
      ...mirrored((side) =>
        blob(
          [0.025, 0.01, 0.015],
          light,
          { at: [0.065 * side, 1.0, 0.24] },
          [5, 3],
        ),
      ),
      // Its tail lying out across the floor.
      tube(
        [
          [0, 0.12, -0.34],
          [-0.12, 0.06, -0.42],
          [-0.28, 0.05, -0.38],
          [-0.36, 0.08, -0.28],
        ],
        0.035,
        brown,
        10,
        6,
      ),
    ],
  };
};

const mouse = (): LabItemParts => {
  const grey = "#9a9aa0";
  const pink = "#f2b2ba";
  return {
    body: [
      blob([0.17, 0.2, 0.22], grey, {
        at: [0, 0.2, -0.04],
        turn: [-0.4, 0, 0],
      }),
      blob(
        [0.11, 0.13, 0.1],
        "#dcd9d3",
        { at: [0, 0.2, 0.1], turn: [-0.4, 0, 0] },
        [7, 5],
      ),
      blob([0.12, 0.11, 0.14], grey, { at: [0, 0.38, 0.15] }),
      spike(0.07, 0.12, grey, { at: [0, 0.36, 0.31], turn: [quarter, 0, 0] }),
      blob([0.022, 0.02, 0.02], "#e8909a", { at: [0, 0.36, 0.37] }, [6, 4]),
      ...eyes([0.06, 0.42, 0.24], 0.026),
      ...mirrored((side) => [
        blob(
          [0.095, 0.095, 0.02],
          grey,
          { at: [0.11 * side, 0.53, 0.1], turn: [0, 0.3 * side, -0.3 * side] },
          [10, 6],
        ),
        blob(
          [0.07, 0.07, 0.015],
          pink,
          {
            at: [0.115 * side, 0.53, 0.115],
            turn: [0, 0.3 * side, -0.3 * side],
          },
          [7, 4],
        ),
        blob(
          [0.03, 0.03, 0.03],
          pink,
          { at: [0.06 * side, 0.22, 0.2] },
          [6, 4],
        ),
        blob(
          [0.04, 0.025, 0.09],
          pink,
          { at: [0.11 * side, 0.025, 0.06] },
          [6, 4],
        ),
        ...[-0.12, 0.1].map((tilt) =>
          stick(
            [0.03 * side, 0.36, 0.33],
            [0.18 * side, 0.36 + tilt, 0.3],
            0.0025,
            "#e6e6e6",
            0.002,
            3,
          ),
        ),
      ]),
      // Its long thin tail curling round behind it.
      tube(
        [
          [0, 0.05, -0.2],
          [0.08, 0.025, -0.38],
          [0.28, 0.02, -0.44],
          [0.42, 0.03, -0.3],
          [0.44, 0.04, -0.08],
        ],
        0.013,
        pink,
        16,
        4,
      ),
    ],
  };
};

const rabbit = (): LabItemParts => {
  const coat = "#9b8670";
  const pale = "#efe8dc";
  const pink = "#f0b0b4";
  return {
    body: [
      blob([0.22, 0.2, 0.26], coat, { at: [0, 0.22, -0.06] }),
      blob([0.15, 0.18, 0.15], coat, { at: [0, 0.34, 0.12] }),
      blob([0.1, 0.12, 0.06], pale, { at: [0, 0.3, 0.22] }, [7, 5]),
      blob([0.14, 0.13, 0.15], coat, { at: [0, 0.56, 0.2] }),
      ...mirrored((side) => [
        blob(
          [0.055, 0.045, 0.05],
          pale,
          { at: [0.035 * side, 0.5, 0.32] },
          [7, 4],
        ),
        blob(
          [0.05, 0.21, 0.03],
          coat,
          { at: [0.06 * side, 0.85, 0.12], turn: [-0.15, 0, -0.12 * side] },
          [10, 7],
        ),
        blob(
          [0.03, 0.17, 0.015],
          pink,
          { at: [0.062 * side, 0.84, 0.143], turn: [-0.15, 0, -0.12 * side] },
          [7, 5],
        ),
        blob(
          [0.06, 0.04, 0.17],
          coat,
          { at: [0.15 * side, 0.04, 0.02] },
          [7, 4],
        ),
        blob(
          [0.035, 0.03, 0.05],
          pale,
          { at: [0.07 * side, 0.04, 0.24] },
          [6, 4],
        ),
        rod(0.03, 0.12, coat, { at: [0.07 * side, 0.12, 0.2] }, 5),
      ]),
      blob([0.022, 0.016, 0.015], "#d98088", { at: [0, 0.54, 0.35] }, [6, 4]),
      ...eyes([0.085, 0.6, 0.28], 0.028, "#2a1a12"),
      {
        ...blob([0.07, 0.07, 0.06], "#fbfaf6", { at: [0, 0.2, -0.33] }, [7, 5]),
        roughen: 0.2,
      },
    ],
  };
};

// ---------------------------------------------------------------- farm

/** Four legs ending in hooves, centred on `y`. */
const hoofedLegs = (
  spots: readonly (readonly [number, number])[],
  radius: number,
  length: number,
  coat: string,
  hoof: string,
): ModelPart[] =>
  spots.flatMap(([x, z]) => [
    rod(radius, length, coat, { at: [x, length / 2 + radius + 0.03, z] }, 6),
    taper([radius * 1.05, radius * 1.2], 0.06, hoof, { at: [x, 0.03, z] }, 8),
  ]);

const cow = (): LabItemParts => {
  const white = "#f4f2ec";
  const black = "#1d1d1d";
  const pink = "#eeaaa2";
  const radii: Triple = [0.3, 0.28, 0.55];
  const centre: Triple = [0, 0.82, -0.05];
  return {
    body: [
      ...hoofedLegs(
        [
          [0.17, 0.32],
          [-0.17, 0.32],
          [0.17, -0.38],
          [-0.17, -0.38],
        ],
        0.08,
        0.3,
        white,
        "#2a2622",
      ),
      ...[
        blob(radii, white, { at: centre }),
        ...(
          [
            [[1, 0.2, 0.5], 0.55],
            [[1, 0.4, -0.6], 0.5],
            [[-1, 0.1, 0.1], 0.6],
            [[-1, 0.5, -0.8], 0.4],
            [[0.2, 1, -0.3], 0.45],
            [[-0.3, 0.2, 1], 0.4],
          ] as const
        ).map(([toward, spread]) =>
          patch(radii, centre, [...toward], spread, black, [6, 4]),
        ),
        ...[
          [0.17, -0.38],
          [-0.17, 0.32],
        ].map(([x, z]) => rod(0.082, 0.12, black, { at: [x, 0.5, z] }, 6)),
        blob([0.11, 0.07, 0.1], pink, { at: [0, 0.55, -0.25] }, [7, 4]),
        ...[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) =>
            stick(
              [0.04 * sx, 0.52, -0.25 + 0.04 * sz],
              [0.04 * sx, 0.46, -0.25 + 0.04 * sz],
              0.014,
              pink,
              0.012,
              4,
            ),
          ),
        ),
        blob([0.16, 0.2, 0.2], white, {
          at: [0, 0.95, 0.44],
          turn: [-0.6, 0, 0],
        }),
        blob([0.15, 0.18, 0.2], white, {
          at: [0, 1.0, 0.62],
          turn: [0.6, 0, 0],
        }),
        blob([0.1, 0.1, 0.1], black, { at: [0.06, 1.12, 0.6] }, [7, 5]),
        blob([0.13, 0.09, 0.09], pink, { at: [0, 0.87, 0.76] }, [10, 6]),
        ...mirrored((side) => [
          blob(
            [0.015, 0.02, 0.01],
            "#5a2f2a",
            { at: [0.045 * side, 0.88, 0.85] },
            [5, 3],
          ),
          blob(
            [0.1, 0.035, 0.05],
            side > 0 ? black : white,
            {
              at: [0.2 * side, 1.08, 0.55],
              turn: [0, 0, -0.3 * side],
            },
            [7, 4],
          ),
          spike(0.025, 0.12, "#e8dfc6", {
            at: [0.12 * side, 1.18, 0.56],
            turn: [0, 0, -0.9 * side],
          }),
        ]),
        ...sideEyes([0.13, 1.06, 0.64], 0.028),
        rod(0.015, 0.45, white, { at: [0, 0.75, -0.6], turn: [0.08, 0, 0] }, 4),
        blob([0.04, 0.07, 0.04], black, { at: [0, 0.5, -0.62] }, [6, 4]),
      ].map((part) => ({ ...part, position: lift(part.position, -0.12) })),
    ],
  };
};

const calf = (): LabItemParts => {
  const brown = "#8c5330";
  const white = "#f6f1e8";
  const radii: Triple = [0.2, 0.2, 0.36];
  const centre: Triple = [0, 0.76, -0.05];
  return {
    body: [
      ...hoofedLegs(
        [
          [0.11, 0.2],
          [-0.11, 0.2],
          [0.11, -0.24],
          [-0.11, -0.24],
        ],
        0.042,
        0.36,
        brown,
        "#3a2a22",
      ),
      ...[
        blob(radii, brown, { at: centre }),
        patch(radii, centre, [0.3, -1, 0.3], 0.7, white),
        patch(radii, centre, [1, 0.2, -0.4], 0.45, white),
        patch(radii, centre, [-1, 0.5, 0.4], 0.4, white),
        blob(
          [0.1, 0.16, 0.12],
          brown,
          { at: [0, 0.9, 0.26], turn: [-0.5, 0, 0] },
          [10, 7],
        ),
        blob([0.13, 0.14, 0.15], white, { at: [0, 1.05, 0.38] }),
        blob([0.1, 0.08, 0.09], "#f0c0b0", { at: [0, 0.98, 0.5] }, [10, 6]),
        ...mirrored((side) => [
          blob(
            [0.014, 0.016, 0.01],
            "#6a3a30",
            { at: [0.035 * side, 0.99, 0.585] },
            [5, 3],
          ),
          blob(
            [0.11, 0.04, 0.06],
            brown,
            { at: [0.19 * side, 1.1, 0.33], turn: [0, 0, -0.35 * side] },
            [7, 4],
          ),
          blob(
            [0.07, 0.05, 0.04],
            brown,
            { at: [0.09 * side, 1.08, 0.46] },
            [6, 4],
          ),
        ]),
        ...eyes([0.085, 1.09, 0.48], 0.03),
        rod(0.012, 0.35, brown, { at: [0, 0.68, -0.4], turn: [0.1, 0, 0] }, 4),
        blob([0.03, 0.05, 0.03], white, { at: [0, 0.5, -0.42] }, [6, 4]),
      ].map((part) => ({ ...part, position: lift(part.position, -0.18) })),
    ],
  };
};

const horse = (): LabItemParts => {
  const bay = "#8b5a2b";
  const dark = "#2e1d12";
  return {
    body: [
      blob([0.3, 0.32, 0.6], bay, { at: [0, 0.98, -0.05] }),
      ...[
        [0.15, 0.32],
        [-0.15, 0.32],
        [0.15, -0.4],
        [-0.15, -0.4],
      ].flatMap(([x, z]) => [
        rod(0.075, 0.38, bay, { at: [x, 0.68, z] }, 7),
        rod(0.055, 0.34, dark, { at: [x, 0.27, z] }, 6),
        taper([0.06, 0.075], 0.07, "#1a1310", { at: [x, 0.035, z] }, 8),
      ]),
      blob([0.14, 0.32, 0.17], bay, { at: [0, 1.28, 0.45], turn: [0.6, 0, 0] }),
      blob([0.09, 0.1, 0.25], bay, { at: [0, 1.48, 0.62], turn: [0.95, 0, 0] }),
      blob([0.075, 0.075, 0.08], "#5a3a20", { at: [0, 1.3, 0.78] }, [7, 5]),
      blob(
        [0.02, 0.15, 0.01],
        "#f6efe4",
        { at: [0, 1.46, 0.75], turn: [0.95, 0, 0] },
        [6, 4],
      ),
      ...mirrored((side) => [
        spike(0.03, 0.1, bay, {
          at: [0.05 * side, 1.66, 0.5],
          turn: [-0.2, 0, -0.15 * side],
          size: [1, 1, 0.6],
        }),
        blob(
          [0.012, 0.012, 0.008],
          ink,
          { at: [0.03 * side, 1.28, 0.85] },
          [5, 3],
        ),
      ]),
      ...sideEyes([0.09, 1.52, 0.6], 0.026),
      // The dark mane running down the top of its neck.
      ...[0, 1, 2, 3, 4, 5].map((index) =>
        blob(
          [0.03, 0.08, 0.06],
          dark,
          {
            at: [0, 1.6 - index * 0.08, 0.46 - index * 0.06],
            turn: [-0.6, 0, 0],
          },
          [6, 4],
        ),
      ),
      blob(
        [0.04, 0.06, 0.03],
        dark,
        { at: [0, 1.6, 0.6], turn: [0.6, 0, 0] },
        [6, 4],
      ),
      tube(
        [
          [0, 1.08, -0.52],
          [0, 1.0, -0.62],
          [0, 0.78, -0.66],
          [0, 0.55, -0.62],
        ],
        0.055,
        dark,
        10,
        6,
      ),
    ],
  };
};

const earlyHorse = (): LabItemParts => {
  const coat = "#8a5a3a";
  const pale = "#d8b88a";
  const toe = "#3a2a20";
  const feet: [number, number, number][] = [
    [0.09, 0.22, 4],
    [-0.09, 0.22, 4],
    [0.09, -0.26, 3],
    [-0.09, -0.26, 3],
  ];
  return {
    body: [
      ...feet.flatMap(([x, z, toes]) => [
        rod(0.038, 0.2, coat, { at: [x, 0.17, z] }, 6),
        // Several small hoofed toes on each foot, not one hoof.
        ...Array.from({ length: toes }, (_, index) => {
          const splay = (index - (toes - 1) / 2) * 0.45;
          return blob(
            [0.02, 0.022, 0.035],
            toe,
            {
              at: [
                x + Math.sin(splay) * 0.04,
                0.022,
                z + Math.cos(splay) * 0.035,
              ],
              turn: [0, splay, 0],
            },
            [4, 3],
          );
        }),
      ]),
      ...[
        blob([0.15, 0.15, 0.34], coat, { at: [0, 0.46, -0.02] }),
        blob([0.14, 0.15, 0.16], coat, { at: [0, 0.52, -0.2] }, [10, 7]),
        blob([0.1, 0.06, 0.26], "#c9a378", { at: [0, 0.35, 0] }, [10, 6]),
        // The pale dapples along its back.
        ...[
          [0.07, 0.58, 0.1],
          [-0.07, 0.59, -0.02],
          [0.06, 0.62, -0.16],
          [-0.06, 0.61, -0.26],
          [0.1, 0.53, -0.3],
          [-0.11, 0.52, 0.16],
        ].map(([x, y, z]) =>
          blob([0.025, 0.012, 0.03], pale, { at: [x, y, z] }, [5, 3]),
        ),
        blob(
          [0.08, 0.13, 0.09],
          coat,
          { at: [0, 0.6, 0.3], turn: [0.6, 0, 0] },
          [10, 7],
        ),
        blob(
          [0.065, 0.07, 0.15],
          coat,
          { at: [0, 0.7, 0.44], turn: [0.55, 0, 0] },
          [10, 7],
        ),
        blob([0.045, 0.045, 0.05], "#5a3a26", { at: [0, 0.63, 0.56] }, [6, 4]),
        ...mirrored((side) =>
          spike(0.025, 0.08, coat, {
            at: [0.04 * side, 0.8, 0.38],
            turn: [-0.2, 0, -0.2 * side],
            size: [1, 1, 0.6],
          }),
        ),
        ...sideEyes([0.06, 0.73, 0.45], 0.02),
        ...[0, 1, 2].map((index) =>
          blob(
            [0.02, 0.05, 0.04],
            toe,
            {
              at: [0, 0.75 - index * 0.07, 0.34 - index * 0.06],
              turn: [-0.6, 0, 0],
            },
            [5, 4],
          ),
        ),
        tube(
          [
            [0, 0.52, -0.34],
            [0, 0.45, -0.44],
            [0, 0.32, -0.48],
          ],
          0.025,
          coat,
          6,
          5,
        ),
      ].map((part) => ({ ...part, position: lift(part.position, -0.07) })),
    ],
  };
};

const pig = (): LabItemParts => {
  const pink = "#f4a8b2";
  const deep = "#e0828f";
  return {
    body: [
      blob([0.3, 0.28, 0.44], pink, { at: [0, 0.46, -0.02] }),
      ...[
        [0.16, 0.24],
        [-0.16, 0.24],
        [0.16, -0.26],
        [-0.16, -0.26],
      ].flatMap(([x, z]) => [
        rod(0.06, 0.12, pink, { at: [x, 0.16, z] }, 7),
        taper([0.055, 0.065], 0.05, "#b86775", { at: [x, 0.025, z] }, 8),
      ]),
      blob([0.2, 0.19, 0.18], pink, { at: [0, 0.55, 0.4] }),
      taper(
        [0.085, 0.1],
        0.1,
        pink,
        { at: [0, 0.5, 0.6], turn: [quarter, 0, 0] },
        12,
      ),
      blob([0.085, 0.07, 0.015], deep, { at: [0, 0.5, 0.65] }, [10, 4]),
      ...mirrored((side) => [
        blob(
          [0.016, 0.026, 0.01],
          "#8a4552",
          { at: [0.03 * side, 0.5, 0.66] },
          [5, 3],
        ),
        spike(0.08, 0.16, pink, {
          at: [0.12 * side, 0.73, 0.42],
          turn: [0.7, 0, -0.45 * side],
          size: [1, 1, 0.3],
        }),
      ]),
      ...eyes([0.085, 0.62, 0.53], 0.022),
      // Its curly tail.
      tube(
        [
          [0, 0.56, -0.44],
          [0.04, 0.62, -0.5],
          [0, 0.67, -0.54],
          [-0.04, 0.62, -0.56],
          [0, 0.58, -0.58],
          [0.035, 0.62, -0.62],
        ],
        0.016,
        deep,
        14,
        4,
      ),
    ],
  };
};

const sheep = (): LabItemParts => {
  const wool = "#f1ece0";
  const black = "#1f1d1c";
  return {
    body: [
      ...[
        [0.12, 0.3],
        [-0.12, 0.3],
        [0.12, -0.3],
        [-0.12, -0.3],
      ].map(([x, z]) => rod(0.038, 0.24, black, { at: [x, 0.16, z] }, 6)),
      ...[
        {
          ...blob([0.3, 0.27, 0.44], wool, { at: [0, 0.62, -0.03] }),
          roughen: 0.12,
        },
        // The woolly lumps of its fleece.
        ...[
          [0.2, 0.8, 0.2],
          [-0.2, 0.8, 0.15],
          [0.22, 0.72, -0.25],
          [-0.22, 0.75, -0.28],
          [0, 0.88, -0.05],
          [0.26, 0.5, 0],
          [-0.26, 0.52, -0.05],
          [0, 0.7, -0.42],
        ].map(([x, y, z]) => ({
          ...blob([0.16, 0.14, 0.16], wool, { at: [x, y, z] }, [7, 5]),
          roughen: 0.2,
        })),
        blob([0.1, 0.12, 0.16], black, {
          at: [0, 0.78, 0.48],
          turn: [0.6, 0, 0],
        }),
        {
          ...blob([0.12, 0.08, 0.1], wool, { at: [0, 0.9, 0.4] }, [7, 4]),
          roughen: 0.25,
        },
        ...mirrored((side) =>
          blob(
            [0.09, 0.03, 0.045],
            black,
            {
              at: [0.14 * side, 0.83, 0.42],
              turn: [0, 0.4 * side, -0.25 * side],
            },
            [7, 4],
          ),
        ),
        ...eyes([0.07, 0.82, 0.55], 0.02, "#c99a3a"),
        blob([0.04, 0.03, 0.02], "#3a3532", { at: [0, 0.66, 0.62] }, [6, 4]),
      ].map((part) => ({ ...part, position: lift(part.position, -0.1) })),
    ],
  };
};

// ---------------------------------------------------------------- wild mammals

const fox = (): LabItemParts => {
  const coat = "#d9622b";
  const white = "#f6efe6";
  const black = "#2a1f1c";
  return {
    body: [
      blob([0.16, 0.17, 0.38], coat, { at: [0, 0.46, -0.04] }),
      blob([0.11, 0.14, 0.1], white, { at: [0, 0.44, 0.27] }, [7, 5]),
      ...[
        [0.09, 0.22],
        [-0.09, 0.22],
        [0.09, -0.27],
        [-0.09, -0.27],
      ].flatMap(([x, z]) => [
        rod(0.045, 0.16, coat, { at: [x, 0.3, z] }, 6),
        rod(0.038, 0.18, black, { at: [x, 0.11, z] }, 6),
      ]),
      blob([0.14, 0.12, 0.13], coat, { at: [0, 0.66, 0.37] }),
      spike(0.07, 0.2, coat, { at: [0, 0.62, 0.58], turn: [quarter, 0, 0] }),
      blob([0.06, 0.04, 0.1], white, { at: [0, 0.59, 0.53] }, [7, 4]),
      blob([0.025, 0.022, 0.022], ink, { at: [0, 0.62, 0.68] }, [6, 4]),
      ...mirrored((side) => [
        blob(
          [0.06, 0.05, 0.05],
          white,
          { at: [0.08 * side, 0.6, 0.44] },
          [6, 4],
        ),
        spike(0.065, 0.16, black, {
          at: [0.08 * side, 0.82, 0.32],
          turn: [-0.15, 0, -0.3 * side],
          size: [1, 1, 0.45],
        }),
        spike(0.055, 0.13, coat, {
          at: [0.08 * side, 0.81, 0.34],
          turn: [-0.15, 0, -0.3 * side],
          size: [1, 1, 0.35],
        }),
      ]),
      ...ringedEyes([0.065, 0.7, 0.46], 0.025, "#e0a020", [0.4, 0.7, 0.5]),
      // Its bushy tail with a white tip.
      blob(
        [0.1, 0.1, 0.22],
        coat,
        { at: [0, 0.38, -0.55], turn: [0.6, 0, 0] },
        [10, 7],
      ),
      blob(
        [0.11, 0.11, 0.16],
        coat,
        { at: [0, 0.25, -0.72], turn: [0.9, 0, 0] },
        [10, 7],
      ),
      blob(
        [0.08, 0.08, 0.09],
        white,
        { at: [0, 0.14, -0.82], turn: [0.9, 0, 0] },
        [7, 5],
      ),
    ],
  };
};

/** Turns that stand spines out of the top of an egg-shaped body, leaning back. */
const spines = (
  radii: Triple,
  centre: Triple,
  colours: readonly string[],
): ModelPart[] =>
  [0.35, 0.75, 1.15].flatMap((rise, row) =>
    Array.from({ length: 16 - row * 3 }, (_, index) => {
      const around = ((index + row * 0.5) / (16 - row * 3)) * Math.PI * 2;
      const u: Triple = [
        Math.cos(rise) * Math.sin(around),
        Math.sin(rise),
        Math.cos(rise) * Math.cos(around),
      ];
      if (u[2] > 0.6 && rise < 1) {
        return [];
      }
      const normal: Triple = [
        u[0] / radii[0],
        u[1] / radii[1],
        u[2] / radii[2] - 2.5,
      ];
      const length = Math.hypot(...normal);
      const out: Triple = [
        normal[0] / length,
        normal[1] / length,
        normal[2] / length,
      ];
      return [
        spike(
          0.035,
          0.2,
          colours[(index + row) % colours.length] ?? "#5b4632",
          {
            at: [
              centre[0] + radii[0] * u[0] + out[0] * 0.06,
              centre[1] + radii[1] * u[1] + out[1] * 0.06,
              centre[2] + radii[2] * u[2] + out[2] * 0.06,
            ],
            turn: pointing(out),
          },
          5,
        ),
      ];
    }).flat(),
  );

const hedgehog = (): LabItemParts => {
  const face = "#d4b28c";
  const radii: Triple = [0.3, 0.24, 0.36];
  const centre: Triple = [0, 0.27, -0.06];
  return {
    body: [
      blob(radii, "#5e4732", { at: centre }),
      ...spines(radii, centre, ["#4e3a28", "#d9c6a2", "#6b5038"]),
      blob([0.14, 0.13, 0.16], face, { at: [0, 0.22, 0.28] }),
      spike(0.08, 0.2, face, { at: [0, 0.2, 0.46], turn: [quarter, 0, 0] }),
      blob([0.03, 0.028, 0.028], ink, { at: [0, 0.2, 0.56] }, [6, 4]),
      ...eyes([0.07, 0.28, 0.38], 0.02),
      ...mirrored((side) => [
        blob(
          [0.035, 0.035, 0.02],
          "#b89470",
          { at: [0.11 * side, 0.36, 0.28] },
          [6, 4],
        ),
        ...[0.16, -0.24].map((z) =>
          blob(
            [0.05, 0.05, 0.07],
            "#4a3628",
            { at: [0.15 * side, 0.04, z + (side > 0 ? 0.04 : -0.04)] },
            [6, 4],
          ),
        ),
      ]),
    ],
  };
};

const lion = (): LabItemParts => {
  const gold = "#d9a54a";
  const mane = "#7a4a1e";
  const cream = "#f0dcb0";
  return {
    body: [
      blob([0.27, 0.24, 0.32], gold, { at: [0, 0.25, -0.12] }),
      blob([0.2, 0.32, 0.2], gold, { at: [0, 0.52, 0.06], turn: [-0.2, 0, 0] }),
      ...mirrored((side) => [
        rod(0.065, 0.36, gold, { at: [0.11 * side, 0.22, 0.17] }, 7),
        blob(
          [0.08, 0.05, 0.1],
          gold,
          { at: [0.11 * side, 0.04, 0.22] },
          [7, 4],
        ),
        blob(
          [0.08, 0.06, 0.15],
          gold,
          { at: [0.22 * side, 0.05, 0.02] },
          [7, 4],
        ),
      ]),
      // A big shaggy mane round its face.
      {
        ...blob([0.3, 0.32, 0.22], mane, { at: [0, 0.9, 0.08] }),
        roughen: 0.18,
      },
      ...Array.from({ length: 9 }, (_, index) => {
        const angle = (index / 9) * Math.PI * 2;
        return {
          ...blob(
            [0.1, 0.1, 0.1],
            index % 2 === 0 ? "#9a5e26" : mane,
            {
              at: [Math.cos(angle) * 0.25, 0.9 + Math.sin(angle) * 0.27, 0.12],
            },
            [6, 4],
          ),
          roughen: 0.3,
        };
      }),
      blob([0.17, 0.16, 0.15], gold, { at: [0, 0.92, 0.2] }),
      blob([0.1, 0.075, 0.08], cream, { at: [0, 0.84, 0.32] }, [10, 6]),
      blob([0.04, 0.03, 0.025], "#5a2e26", { at: [0, 0.88, 0.395] }, [6, 4]),
      ...mirrored((side) =>
        blob(
          [0.045, 0.045, 0.03],
          gold,
          { at: [0.12 * side, 1.06, 0.18] },
          [6, 4],
        ),
      ),
      ...ringedEyes([0.065, 0.96, 0.31], 0.026, "#c98a20", [0.5, 0.6, 0.5]),
      tube(
        [
          [0, 0.08, -0.4],
          [0.25, 0.05, -0.4],
          [0.4, 0.05, -0.2],
          [0.42, 0.06, 0.05],
        ],
        0.03,
        gold,
        10,
        5,
      ),
      blob([0.05, 0.05, 0.07], mane, { at: [0.42, 0.06, 0.08] }, [6, 4]),
    ],
  };
};

const elephant = (): LabItemParts => {
  const grey = "#8e8e96";
  const ivory = "#f4ecd6";
  return {
    body: [
      blob([0.38, 0.36, 0.52], grey, { at: [0, 0.98, -0.08] }),
      ...[
        [0.2, 0.22],
        [-0.2, 0.22],
        [0.2, -0.36],
        [-0.2, -0.36],
      ].flatMap(([x, z]) => [
        taper([0.13, 0.14], 0.7, grey, { at: [x, 0.35, z] }, 8),
        ...[-0.05, 0.05].map((offset) =>
          blob(
            [0.035, 0.03, 0.02],
            "#d8d2c4",
            { at: [x + offset, 0.04, z + 0.13] },
            [4, 3],
          ),
        ),
      ]),
      blob([0.25, 0.27, 0.24], grey, { at: [0, 1.18, 0.46] }),
      ...mirrored((side) =>
        blob(
          [0.04, 0.33, 0.27],
          "#868690",
          {
            at: [0.3 * side, 1.12, 0.32],
            turn: [0, -0.6 * side, 0.1 * side],
          },
          [10, 7],
        ),
      ),
      ...mirrored((side) =>
        blob(
          [0.03, 0.26, 0.2],
          "#a39a9e",
          {
            at: [0.31 * side, 1.12, 0.345],
            turn: [0, -0.6 * side, 0.1 * side],
          },
          [8, 5],
        ),
      ),
      ...eyes([0.14, 1.24, 0.64], 0.022),
      // Its trunk, thick at the face and curling up at the tip.
      taper(
        [0.1, 0.13],
        0.3,
        grey,
        { at: [0, 0.98, 0.66], turn: [0.2, 0, 0] },
        10,
      ),
      tube(
        [
          [0, 0.86, 0.69],
          [0, 0.64, 0.73],
          [0, 0.44, 0.78],
          [0, 0.36, 0.88],
          [0, 0.42, 0.97],
          [0, 0.52, 0.96],
        ],
        0.075,
        grey,
        16,
        8,
      ),
      ...mirrored((side) =>
        tube(
          [
            [0.1 * side, 0.98, 0.64],
            [0.12 * side, 0.85, 0.76],
            [0.11 * side, 0.82, 0.9],
          ],
          0.03,
          ivory,
          6,
          6,
        ),
      ),
      rod(0.015, 0.4, grey, { at: [0, 0.82, -0.62], turn: [0.25, 0, 0] }, 4),
      blob([0.03, 0.06, 0.03], "#3a3a3a", { at: [0, 0.6, -0.67] }, [5, 4]),
    ],
  };
};

const giraffe = (): LabItemParts => {
  const yellow = "#e8b85a";
  const brown = "#8a4f24";
  const radii: Triple = [0.26, 0.28, 0.46];
  const centre: Triple = [0, 1.1, -0.1];
  const neckTilt = 0.35;
  const neckBase: Triple = [0, 1.15, 0.2];
  const along = (distance: number, out: Triple): Triple => [
    neckBase[0] + out[0],
    neckBase[1] + Math.cos(neckTilt) * distance + out[1],
    neckBase[2] + Math.sin(neckTilt) * distance + out[2],
  ];
  return {
    body: [
      blob(radii, yellow, { at: centre }),
      ...(
        [
          [1, 0.3, 0.5],
          [1, 0.1, -0.1],
          [1, 0.4, -0.7],
          [0.9, -0.5, 0.3],
          [-1, 0.3, 0.4],
          [-1, 0.1, -0.2],
          [-1, 0.4, -0.7],
          [0, 1, 0.1],
          [0.3, 1, -0.5],
        ] as const
      ).map((toward) => patch(radii, centre, [...toward], 0.4, brown, [5, 4])),
      ...[
        [0.12, 0.2],
        [-0.12, 0.2],
        [0.12, -0.36],
        [-0.12, -0.36],
      ].flatMap(([x, z]) => [
        rod(0.058, 0.82, yellow, { at: [x, 0.47, z] }, 6),
        taper([0.05, 0.06], 0.05, "#3a2a20", { at: [x, 0.025, z] }, 6),
      ]),
      taper(
        [0.07, 0.14],
        0.95,
        yellow,
        {
          at: along(0.47, [0, 0, 0]),
          turn: [neckTilt, 0, 0],
        },
        10,
      ),
      // Patches down each side of its neck.
      ...[0.15, 0.38, 0.6, 0.8].flatMap((distance) => {
        const radius = 0.12 - (distance / 0.95) * 0.055;
        return [-1, 1].map((side) =>
          blob(
            [0.02, 0.055, 0.045],
            brown,
            {
              at: along(distance, [radius * 0.88 * side, 0, 0.0]),
              turn: [neckTilt, 0, 0],
            },
            [4, 3],
          ),
        );
      }),
      ...[0.28, 0.5, 0.7].map((distance) =>
        blob(
          [0.04, 0.05, 0.02],
          brown,
          {
            at: along(distance, [
              0,
              -Math.sin(neckTilt) * 0.09,
              Math.cos(neckTilt) * 0.09,
            ]),
            turn: [neckTilt, 0, 0],
          },
          [4, 3],
        ),
      ),
      ...[0.1, 0.3, 0.5, 0.7, 0.88].map((distance) =>
        blob(
          [0.018, 0.05, 0.04],
          "#6b3a1c",
          {
            at: along(distance, [
              0,
              Math.sin(neckTilt) * 0.09,
              -Math.cos(neckTilt) * 0.09 + 0.02 - distance * 0.03,
            ]),
            turn: [neckTilt, 0, 0],
          },
          [4, 3],
        ),
      ),
      blob([0.08, 0.08, 0.17], yellow, {
        at: [0, 2.08, 0.6],
        turn: [0.45, 0, 0],
      }),
      blob([0.06, 0.06, 0.07], "#c9944a", { at: [0, 2.0, 0.74] }, [7, 4]),
      ...mirrored((side) => [
        rod(
          0.016,
          0.1,
          yellow,
          { at: [0.035 * side, 2.2, 0.5], turn: [-0.2, 0, -0.15 * side] },
          5,
        ),
        blob(
          [0.025, 0.025, 0.025],
          "#3a2414",
          { at: [0.045 * side, 2.26, 0.49] },
          [4, 3],
        ),
        spike(0.025, 0.1, yellow, {
          at: [0.1 * side, 2.14, 0.48],
          turn: [0, 0, -1.6 * side],
          size: [1, 1, 0.5],
        }),
      ]),
      ...sideEyes([0.075, 2.12, 0.6], 0.024),
      rod(0.012, 0.4, yellow, { at: [0, 0.95, -0.48], turn: [0.15, 0, 0] }, 4),
      blob([0.025, 0.06, 0.025], "#2a1a10", { at: [0, 0.74, -0.5] }, [4, 3]),
    ],
  };
};

const polarBear = (): LabItemParts => {
  const cream = "#f3efe3";
  return {
    body: [
      blob([0.3, 0.3, 0.55], cream, { at: [0, 0.62, -0.06] }),
      blob([0.26, 0.24, 0.24], cream, { at: [0, 0.68, -0.38] }, [10, 7]),
      ...[
        [0.17, 0.3],
        [-0.17, 0.3],
        [0.17, -0.38],
        [-0.17, -0.38],
      ].flatMap(([x, z]) => [
        rod(0.1, 0.3, cream, { at: [x, 0.27, z] }, 8),
        blob(
          [0.12, 0.06, 0.15],
          "#ebe5d6",
          { at: [x, 0.05, z + 0.04] },
          [7, 4],
        ),
      ]),
      blob(
        [0.15, 0.16, 0.22],
        cream,
        { at: [0, 0.68, 0.48], turn: [-0.2, 0, 0] },
        [10, 7],
      ),
      blob([0.14, 0.13, 0.16], cream, { at: [0, 0.7, 0.66] }),
      blob([0.08, 0.07, 0.1], "#ece6d8", { at: [0, 0.66, 0.8] }, [7, 5]),
      blob([0.035, 0.028, 0.025], ink, { at: [0, 0.69, 0.895] }, [6, 4]),
      ...eyes([0.07, 0.77, 0.75], 0.02),
      ...mirrored((side) =>
        blob(
          [0.04, 0.035, 0.025],
          cream,
          { at: [0.1 * side, 0.82, 0.6] },
          [6, 4],
        ),
      ),
      blob([0.05, 0.05, 0.04], cream, { at: [0, 0.72, -0.62] }, [6, 4]),
    ],
  };
};

const rhinoceros = (): LabItemParts => {
  const grey = "#8f8a86";
  const fold = "#76716d";
  const horn = "#b9ad98";
  return {
    body: [
      blob([0.32, 0.3, 0.55], grey, { at: [0, 0.68, -0.05] }),
      // The folds that make its skin look like plates of armour.
      ...[0.24, -0.3].map((z) =>
        blob([0.31, 0.29, 0.03], fold, { at: [0, 0.68, z] }, [14, 6]),
      ),
      blob(
        [0.2, 0.22, 0.03],
        fold,
        { at: [0, 0.72, 0.45], turn: [-0.2, 0, 0] },
        [12, 6],
      ),
      ...[
        [0.22, -0.44],
        [0.16, -0.5],
        [0.27, -0.38],
        [-0.22, -0.44],
        [-0.16, -0.5],
        [-0.27, -0.38],
        [0.27, 0.35],
        [-0.27, 0.35],
      ].map(([x, z]) =>
        blob([0.02, 0.02, 0.02], fold, { at: [x, 0.8, z] }, [5, 3]),
      ),
      ...[
        [0.18, 0.3],
        [-0.18, 0.3],
        [0.18, -0.38],
        [-0.18, -0.38],
      ].flatMap(([x, z]) => [
        taper([0.1, 0.11], 0.45, grey, { at: [x, 0.22, z] }, 10),
        ...[-0.05, 0.05].map((offset) =>
          blob(
            [0.03, 0.025, 0.02],
            "#5a5550",
            { at: [x + offset, 0.03, z + 0.09] },
            [5, 3],
          ),
        ),
      ]),
      blob([0.17, 0.18, 0.3], grey, { at: [0, 0.6, 0.6], turn: [0.35, 0, 0] }),
      blob([0.13, 0.1, 0.1], "#9a9590", { at: [0, 0.48, 0.82] }, [7, 5]),
      spike(0.08, 0.34, horn, { at: [0, 0.7, 0.86], turn: [-0.35, 0, 0] }, 10),
      spike(0.05, 0.14, horn, { at: [0, 0.73, 0.7], turn: [-0.2, 0, 0] }, 8),
      ...sideEyes([0.13, 0.66, 0.66], 0.02),
      ...mirrored((side) => [
        spike(0.04, 0.12, grey, {
          at: [0.11 * side, 0.85, 0.45],
          turn: [-0.2, 0, -0.3 * side],
          size: [1, 1, 0.5],
        }),
        blob(
          [0.018, 0.012, 0.01],
          "#3a3632",
          { at: [0.05 * side, 0.48, 0.91] },
          [5, 3],
        ),
      ]),
      rod(0.015, 0.25, grey, { at: [0, 0.65, -0.6], turn: [0.2, 0, 0] }, 4),
    ],
  };
};

const bat = (): LabItemParts => {
  const fur = "#7a5236";
  const wing = "#3d2a22";
  const bone = "#5c4232";
  const shoulder: Triple = [0.07, 0.62, 0];
  const sweep = 0.3;
  const wingOutline: Outline = [
    [0, 0.02],
    [0.22, 0.18],
    [0.47, 0.22],
    [0.72, 0.1],
    [0.64, -0.1],
    [0.54, -0.02],
    [0.48, -0.24],
    [0.36, -0.12],
    [0.26, -0.32],
    [0.16, -0.18],
    [0.0, -0.26],
  ];
  const onWing = (side: number, [x, y]: readonly [number, number]): Triple => [
    side * (shoulder[0] + x * Math.cos(sweep)),
    shoulder[1] + y,
    -x * Math.sin(sweep) + 0.016,
  ];
  return {
    body: [
      ...mirrored((side) => [
        flat(side > 0 ? wingOutline : flipped(wingOutline), 0.02, wing, {
          at: [shoulder[0] * side, shoulder[1], 0],
          turn: [0, sweep * side, 0],
        }),
        // The long finger bones that hold its wing open.
        ...(
          [
            [0.47, 0.22],
            [0.72, 0.1],
            [0.48, -0.24],
            [0.26, -0.32],
          ] as const
        ).map((end) =>
          stick(
            onWing(side, [0.22, 0.17]),
            onWing(side, end),
            0.012,
            bone,
            0.006,
            4,
          ),
        ),
        stick(
          onWing(side, [0.02, 0.0]),
          onWing(side, [0.22, 0.17]),
          0.018,
          bone,
          0.014,
          4,
        ),
        spike(0.012, 0.04, "#d8c8b0", {
          at: onWing(side, [0.24, 0.21]),
          turn: [0, 0, -0.3 * side],
        }),
      ]),
      { ...blob([0.13, 0.2, 0.12], fur, { at: [0, 0.52, 0] }), roughen: 0.15 },
      {
        ...blob([0.09, 0.14, 0.05], "#9c7050", { at: [0, 0.5, 0.08] }, [7, 5]),
        roughen: 0.2,
      },
      { ...blob([0.11, 0.1, 0.1], fur, { at: [0, 0.77, 0.03] }), roughen: 0.1 },
      blob([0.05, 0.04, 0.05], "#4a3226", { at: [0, 0.74, 0.12] }, [7, 4]),
      blob([0.02, 0.014, 0.012], "#20150f", { at: [0, 0.76, 0.165] }, [5, 3]),
      ...mirrored((side) => [
        spike(0.045, 0.16, "#4a3226", {
          at: [0.07 * side, 0.9, 0.02],
          turn: [0, 0, -0.35 * side],
          size: [1, 1, 0.4],
        }),
        spike(0.028, 0.11, "#c89488", {
          at: [0.07 * side, 0.89, 0.033],
          turn: [0, 0, -0.35 * side],
          size: [1, 1, 0.3],
        }),
        spike(0.007, 0.025, "#ffffff", {
          at: [0.02 * side, 0.715, 0.145],
          turn: [Math.PI, 0, 0],
        }),
        stick(
          [0.05 * side, 0.36, 0],
          [0.07 * side, 0.27, -0.02],
          0.014,
          "#4a3226",
          0.01,
          4,
        ),
      ]),
      ...eyes([0.045, 0.79, 0.11], 0.018),
    ],
  };
};

const whale = (): LabItemParts => {
  const blue = "#5b7a9a";
  const belly = "#c9d6df";
  const flukeOutline: Outline = [
    [0, 0.06],
    [0.15, 0.0],
    [0.32, 0.02],
    [0.45, 0.1],
    [0.4, -0.04],
    [0.28, -0.12],
    [0.12, -0.12],
    [0.04, -0.06],
    [0, -0.04],
    [-0.04, -0.06],
    [-0.12, -0.12],
    [-0.28, -0.12],
    [-0.4, -0.04],
    [-0.45, 0.1],
    [-0.32, 0.02],
    [-0.15, 0.0],
  ];
  return {
    body: [
      blob([0.33, 0.32, 0.64], blue, { at: [0, 0.42, 0.04] }),
      blob([0.25, 0.15, 0.48], belly, { at: [0, 0.25, 0.22] }),
      blob([0.14, 0.15, 0.36], blue, {
        at: [0, 0.56, -0.66],
        turn: [-0.55, 0, 0],
      }),
      flat(flukeOutline, 0.035, blue, {
        at: [0, 0.74, -0.98],
        turn: [quarter + 0.3, 0, 0],
        size: [1.3, 1.3, 1],
      }),
      blob([0.05, 0.015, 0.035], "#2a3a4a", { at: [0, 0.71, 0.3] }, [6, 3]),
      ...mirrored((side) => [
        blob(
          [0.045, 0.035, 0.22],
          blue,
          {
            at: [0.33 * side, 0.24, 0.22],
            turn: [0.3, 0.5 * side, -0.6 * side],
          },
          [7, 5],
        ),
        blob(
          [0.01, 0.01, 0.3],
          "#2e4256",
          { at: [0.2 * side, 0.32, 0.46], turn: [0.15, 0.4 * side, 0] },
          [4, 3],
        ),
      ]),
      ...sideEyes([0.26, 0.38, 0.38], 0.026),
      spike(0.07, 0.12, blue, {
        at: [0, 0.75, -0.32],
        turn: [-0.6, 0, 0],
        size: [0.35, 1, 1],
      }),
    ],
  };
};

// ---------------------------------------------------------------- reptiles and amphibians

const crocodile = (): LabItemParts => {
  const olive = "#6b7a3a";
  const dark = "#4a5626";
  const belly = "#c8c08a";
  // Its long tail sweeps round to one side.
  const tail = [
    [0.02, -0.5, 0.15, 0.1, 0.2],
    [0.12, -0.78, 0.11, 0.08, 0.18],
    [0.3, -0.98, 0.075, 0.06, 0.16],
    [0.53, -1.08, 0.045, 0.045, 0.14],
    [0.72, -1.06, 0.025, 0.03, 0.1],
  ] as const;
  return {
    body: [
      blob([0.22, 0.12, 0.42], olive, { at: [0, 0.17, 0] }),
      blob([0.18, 0.06, 0.36], belly, { at: [0, 0.1, 0.02] }, [10, 6]),
      ...wiggle(tail, olive, () => 0.13),
      blob([0.14, 0.08, 0.16], olive, { at: [0, 0.18, 0.5] }),
      blob([0.08, 0.05, 0.26], olive, { at: [0, 0.15, 0.78] }, [10, 6]),
      blob([0.075, 0.025, 0.24], "#7c8a48", { at: [0, 0.12, 0.78] }, [8, 4]),
      // Teeth poking out along its jaws.
      ...mirrored((side) =>
        [0.62, 0.7, 0.78, 0.86, 0.94].map((z) =>
          spike(
            0.01,
            0.035,
            "#f6f2e0",
            {
              at: [0.075 * side - (z - 0.62) * 0.08 * side, 0.115, z],
              turn: [Math.PI, 0, 0],
            },
            4,
          ),
        ),
      ),
      ...mirrored((side) => [
        blob(
          [0.04, 0.035, 0.04],
          olive,
          { at: [0.07 * side, 0.26, 0.5] },
          [6, 4],
        ),
        blob(
          [0.02, 0.015, 0.015],
          olive,
          { at: [0.03 * side, 0.2, 1.0] },
          [5, 3],
        ),
      ]),
      ...sideEyes([0.075, 0.28, 0.53], 0.022, "#c9b020"),
      // Two rows of bumpy scales down its back and tail.
      ...[-1, 1].flatMap((side) =>
        [0.3, 0.15, 0, -0.15, -0.3].map((z) =>
          spike(0.025, 0.05, dark, { at: [0.07 * side, 0.28, z] }, 4),
        ),
      ),
      ...tail
        .slice(0, 4)
        .map(([x, z, , height]) =>
          spike(0.025, 0.05, dark, { at: [x, 0.13 + height + 0.01, z] }, 4),
        ),
      ...[
        [0.2, 0.25, 1],
        [-0.2, 0.25, -1],
        [0.2, -0.3, 1],
        [-0.2, -0.3, -1],
      ].flatMap(([x, z, side]) => {
        const s = side;
        const hip: Triple = [x, 0.15, z];
        const knee: Triple = [x + 0.14 * s, 0.13, z + 0.03];
        const foot: Triple = [x + 0.17 * s, 0.03, z + 0.08];
        return [
          ...limb([hip, knee, foot], 0.04, olive),
          ...[-0.5, 0, 0.5].map((splay) =>
            spike(
              0.015,
              0.07,
              dark,
              {
                at: [foot[0] + Math.sin(splay) * 0.04, 0.015, foot[2] + 0.04],
                turn: [quarter, splay, 0],
              },
              4,
            ),
          ),
        ];
      }),
    ],
  };
};

const snake = (): LabItemParts => {
  const green = "#5a8a2e";
  const brown = "#6b4a22";
  const radius = 0.065;
  const coil: Triple[] = [];
  const loops = 2;
  const steps = 14;
  for (let index = 0; index <= steps * loops; index += 1) {
    const turn = (index / steps) * Math.PI * 2;
    const ring = 0.4 - (index / (steps * loops)) * 0.16;
    coil.push([
      Math.sin(turn) * ring,
      radius + (index / (steps * loops)) * 0.11,
      -Math.cos(turn) * ring,
    ]);
  }
  const neck: Triple[] = [
    [0, 0.25, -0.12],
    [0, 0.38, -0.04],
    [0, 0.52, 0.0],
    [0, 0.62, 0.1],
  ];
  const path = [...coil, ...neck];
  const curve = new CatmullRomCurve3(
    path.map((point) => new Vector3(...point)),
  );
  const marks = Array.from({ length: 16 }, (_, index) =>
    curve.getPoint(0.03 + (index / 16) * 0.86),
  );
  const tailStart = curve.getPoint(0);
  const tailDirection = curve.getTangent(0).negate();
  return {
    body: [
      tube(path, radius, green, 52, 7),
      // The brown diamonds along its back.
      ...marks.map((point) =>
        blob(
          [0.045, 0.02, 0.045],
          brown,
          {
            at: [point.x, point.y + radius * 0.8, point.z],
            turn: [0, Math.PI / 4, 0],
          },
          [4, 3],
        ),
      ),
      spike(
        radius,
        0.18,
        green,
        {
          at: [
            tailStart.x + tailDirection.x * 0.09,
            tailStart.y,
            tailStart.z + tailDirection.z * 0.09,
          ],
          turn: pointing([tailDirection.x, tailDirection.y, tailDirection.z]),
        },
        7,
      ),
      blob([0.085, 0.06, 0.12], green, { at: [0, 0.65, 0.18] }),
      blob([0.06, 0.03, 0.08], "#c8c070", { at: [0, 0.615, 0.2] }, [8, 4]),
      ...sideEyes([0.06, 0.68, 0.22], 0.02, "#e0c020"),
      ...mirrored((side) =>
        blob(
          [0.03, 0.01, 0.06],
          brown,
          { at: [0.03 * side, 0.705, 0.14] },
          [5, 3],
        ),
      ),
      // Its forked tongue flicking out.
      stick([0, 0.635, 0.28], [0, 0.635, 0.38], 0.007, "#d6303a", 0.007, 4),
      ...mirrored((side) =>
        stick(
          [0, 0.635, 0.38],
          [0.025 * side, 0.64, 0.43],
          0.007,
          "#d6303a",
          0.004,
          4,
        ),
      ),
    ],
  };
};

const tortoise = (): LabItemParts => {
  const shellDark = "#5a3e1e";
  const plate = "#a07a3e";
  const skin = "#8b8558";
  const radii: Triple = [0.4, 0.34, 0.44];
  const centre: Triple = [0, 0.14, 0];
  return {
    body: [
      turned(
        Array.from({ length: 8 }, (_, index) => {
          const angle = (index / 7) * quarter;
          return [
            Math.cos(angle) * radii[0],
            centre[1] + Math.sin(angle) * radii[1],
          ] as const;
        }),
        shellDark,
        { size: [1, 1, radii[2] / radii[0]] },
        16,
      ),
      // The raised plates of its shell, with dark seams between.
      ...(
        [
          [0, 1, 0, 0.56],
          [0, 0.75, 0.66, 0.5],
          [0, 0.75, -0.66, 0.5],
          [0.75, 0.6, 0.35, 0.48],
          [-0.75, 0.6, 0.35, 0.48],
          [0.75, 0.6, -0.35, 0.48],
          [-0.75, 0.6, -0.35, 0.48],
          [1, 0.15, 0, 0.36],
          [-1, 0.15, 0, 0.36],
          [0.5, 0.15, 0.85, 0.36],
          [-0.5, 0.15, 0.85, 0.36],
          [0.5, 0.15, -0.85, 0.36],
          [-0.5, 0.15, -0.85, 0.36],
          [0, 0.15, 1, 0.36],
        ] as const
      ).map(([x, y, z, spread]) =>
        patch(radii, centre, [x, y, z], spread, plate, [7, 4]),
      ),
      blob([0.39, 0.05, 0.43], "#c8a65a", { at: [0, 0.14, 0] }, [12, 5]),
      ...[
        [0.25, 0.25],
        [-0.25, 0.25],
        [0.25, -0.25],
        [-0.25, -0.25],
      ].flatMap(([x, z]) => [
        taper([0.075, 0.09], 0.2, skin, { at: [x, 0.08, z] }, 8),
        ...[-0.03, 0.03].map((offset) =>
          blob(
            [0.015, 0.02, 0.02],
            "#e8e0c8",
            { at: [x + offset, 0.015, z + 0.08] },
            [4, 3],
          ),
        ),
        blob(
          [0.03, 0.025, 0.02],
          "#6f6a44",
          { at: [x * 1.15, 0.12, z + 0.05] },
          [5, 3],
        ),
      ]),
      rod(0.06, 0.14, skin, { at: [0, 0.2, 0.46], turn: [1.0, 0, 0] }, 7),
      blob([0.08, 0.075, 0.11], skin, { at: [0, 0.27, 0.56] }),
      blob([0.06, 0.015, 0.05], "#4a4630", { at: [0, 0.24, 0.62] }, [6, 3]),
      ...sideEyes([0.06, 0.3, 0.6], 0.018),
      spike(0.03, 0.08, skin, {
        at: [0, 0.12, -0.46],
        turn: [-quarter - 0.3, 0, 0],
      }),
    ],
  };
};

const frog = (): LabItemParts => {
  const green = "#5aa83a";
  const dark = "#2f6a22";
  const belly = "#e8e2a8";
  return {
    body: [
      blob([0.24, 0.17, 0.3], green, {
        at: [0, 0.24, -0.02],
        turn: [-0.45, 0, 0],
      }),
      blob(
        [0.2, 0.1, 0.2],
        belly,
        { at: [0, 0.2, 0.12], turn: [-0.45, 0, 0] },
        [10, 6],
      ),
      blob([0.22, 0.12, 0.19], green, { at: [0, 0.37, 0.2] }),
      blob([0.205, 0.008, 0.17], dark, { at: [0, 0.335, 0.225] }, [14, 3]),
      // Big round eyes bulging from the top of its head.
      ...mirrored((side) => [
        blob(
          [0.075, 0.07, 0.075],
          green,
          { at: [0.12 * side, 0.46, 0.24] },
          [7, 5],
        ),
        blob(
          [0.06, 0.06, 0.05],
          "#e8c23a",
          { at: [0.13 * side, 0.475, 0.285] },
          [7, 5],
        ),
        blob(
          [0.045, 0.022, 0.02],
          ink,
          { at: [0.13 * side, 0.475, 0.325] },
          [6, 4],
        ),
        blob(
          [0.012, 0.012, 0.008],
          glint,
          { at: [0.14 * side, 0.49, 0.338] },
          [4, 3],
        ),
        blob(
          [0.01, 0.008, 0.006],
          ink,
          { at: [0.035 * side, 0.43, 0.385] },
          [4, 3],
        ),
      ]),
      ...mirrored((side) => [
        // Its long back legs folded up under it.
        blob(
          [0.08, 0.1, 0.19],
          green,
          { at: [0.2 * side, 0.14, -0.12], turn: [0.2, 0.3 * side, 0] },
          [10, 7],
        ),
        blob(
          [0.05, 0.05, 0.17],
          green,
          { at: [0.25 * side, 0.06, 0.0], turn: [0, -0.3 * side, 0] },
          [7, 4],
        ),
        ...[-0.5, -0.15, 0.2, 0.5].map((splay) =>
          stick(
            [0.24 * side, 0.02, 0.12],
            [
              0.24 * side + Math.sin(splay) * 0.11 * side,
              0.015,
              0.12 + Math.cos(splay) * 0.11,
            ],
            0.012,
            green,
            0.01,
            4,
          ),
        ),
        ...limb(
          [
            [0.12 * side, 0.24, 0.24],
            [0.14 * side, 0.1, 0.3],
            [0.14 * side, 0.03, 0.34],
          ],
          0.025,
          green,
        ),
        ...[-0.6, 0, 0.6].map((splay) =>
          stick(
            [0.14 * side, 0.025, 0.34],
            [
              0.14 * side + Math.sin(splay) * 0.06,
              0.015,
              0.34 + Math.cos(splay) * 0.06,
            ],
            0.011,
            green,
            0.009,
            4,
          ),
        ),
      ]),
      ...[
        [0.1, 0.36, -0.08],
        [-0.12, 0.33, -0.14],
        [0.0, 0.4, 0.0],
        [0.16, 0.25, -0.22],
        [-0.17, 0.22, -0.2],
        [0.22, 0.2, -0.1],
      ].map(([x, y, z]) =>
        blob(
          [0.035, 0.012, 0.03],
          dark,
          { at: [x, y, z], turn: [-0.45, 0, 0] },
          [6, 3],
        ),
      ),
    ],
  };
};

const newt = (): LabItemParts => {
  const brown = "#6b5a3a";
  const orange = "#ec7a26";
  const pieces = [
    [-0.02, 0.36, 0.075, 0.05, 0.1],
    [-0.01, 0.24, 0.068, 0.05, 0.08],
    [0.0, 0.1, 0.085, 0.06, 0.13],
    [0.0, -0.06, 0.085, 0.06, 0.13],
    [0.04, -0.22, 0.07, 0.055, 0.1],
    [0.13, -0.34, 0.035, 0.07, 0.1],
    [0.27, -0.39, 0.028, 0.06, 0.1],
    [0.4, -0.35, 0.02, 0.05, 0.09],
    [0.48, -0.24, 0.014, 0.035, 0.08],
    [0.5, -0.13, 0.01, 0.022, 0.06],
  ] as const;
  return {
    body: [
      ...wiggle(pieces, brown, (index) => (index === 0 ? 0.095 : 0.08)),
      // Its bright orange belly, showing along its sides, speckled black.
      ...wiggle(
        pieces
          .slice(1, 6)
          .map(
            ([x, z, width, height, length]) =>
              [x, z, width * 0.95, height * 0.7, length * 0.95] as const,
          ),
        orange,
        () => 0.05,
      ),
      ...(
        [
          [0.07, 0.2],
          [-0.065, 0.16],
          [0.085, 0.02],
          [-0.085, -0.04],
          [0.08, -0.14],
          [-0.085, 0.08],
          [-0.06, -0.18],
        ] as const
      ).map(([x, z]) =>
        blob([0.01, 0.01, 0.012], ink, { at: [x, 0.045, z] }, [4, 3]),
      ),
      ...[
        [0.03, 0.06],
        [-0.03, -0.08],
        [0.02, 0.18],
        [-0.03, 0.0],
        [0.03, -0.16],
      ].map(([x, z]) =>
        blob([0.014, 0.006, 0.014], "#3a2e1e", { at: [x, 0.14, z] }, [4, 3]),
      ),
      ...sideEyes([0.05, 0.125, 0.4], 0.018, "#d0a030"),
      ...[
        [0.07, 0.18, 1],
        [-0.07, 0.2, -1],
        [0.07, -0.16, 1],
        [-0.07, -0.14, -1],
      ].flatMap(([x, z, side]) => {
        const s = side;
        const elbow: Triple = [x + 0.08 * s, 0.06, z + 0.02];
        const foot: Triple = [x + 0.1 * s, 0.015, z + 0.06];
        return [
          ...limb([[x, 0.07, z], elbow, foot], 0.014, brown),
          ...[-0.6, 0, 0.6].map((splay) =>
            stick(
              foot,
              [
                foot[0] + Math.sin(splay) * 0.035,
                0.012,
                foot[2] + Math.cos(splay) * 0.035,
              ],
              0.007,
              brown,
              0.005,
              3,
            ),
          ),
        ];
      }),
    ],
  };
};

const tadpole = (): LabItemParts => {
  const black = "#2a2520";
  // Its tail swishes out to one side as it swims.
  const swish = 0.75;
  return {
    glass: [
      flat(
        [
          [0, 0.1],
          [0.15, 0.14],
          [0.35, 0.13],
          [0.55, 0.08],
          [0.72, 0],
          [0.55, -0.07],
          [0.35, -0.11],
          [0.15, -0.12],
          [0, -0.08],
        ],
        0.012,
        "#c9b890",
        { at: [0, 0.28, -0.08], turn: [0, swish, 0] },
      ),
    ],
    body: [
      blob([0.2, 0.17, 0.24], black, { at: [0, 0.28, 0.1] }),
      blob([0.16, 0.08, 0.18], "#4a4038", { at: [0, 0.18, 0.12] }),
      // The dark muscle down the middle of its tail.
      flat(
        [
          [-0.05, 0.07],
          [0.3, 0.045],
          [0.6, 0.012],
          [0.66, 0],
          [0.6, -0.012],
          [0.3, -0.045],
          [-0.05, -0.07],
        ],
        0.04,
        black,
        { at: [0, 0.28, -0.08], turn: [0, swish, 0] },
      ),
      ...sideEyes([0.14, 0.34, 0.24], 0.03, "#0e0c0a", "#d8c070"),
      blob([0.035, 0.015, 0.012], "#6a5a48", { at: [0, 0.26, 0.335] }, [6, 3]),
      // The golden flecks on its skin.
      ...[
        [0.1, 0.4, 0.05],
        [-0.08, 0.42, 0.0],
        [0.15, 0.3, -0.02],
        [-0.14, 0.32, 0.08],
        [0.02, 0.44, 0.14],
      ].map(([x, y, z]) =>
        blob([0.012, 0.008, 0.012], "#b89a4a", { at: [x, y, z] }, [4, 3]),
      ),
    ],
  };
};

const frogspawn = (): LabItemParts => {
  const layers: [number, number, number][] = [
    [0, 0.12, 0],
    ...Array.from({ length: 6 }, (_, index): [number, number, number] => {
      const angle = (index / 6) * Math.PI * 2;
      return [Math.cos(angle) * 0.23, 0.12, Math.sin(angle) * 0.23];
    }),
    ...Array.from({ length: 5 }, (_, index): [number, number, number] => {
      const angle = (index / 5) * Math.PI * 2 + 0.3;
      return [Math.cos(angle) * 0.14, 0.31, Math.sin(angle) * 0.14];
    }),
    [0.05, 0.48, 0.03],
    [0.24, 0.29, 0.2],
  ];
  return {
    glass: layers.map((at) =>
      blob([0.12, 0.12, 0.12], "#eef8fa", { at }, [8, 6]),
    ),
    body: layers.map(([x, y, z], index) =>
      blob(
        [0.045, 0.045, 0.045],
        index % 3 === 0 ? "#0c0c0c" : "#16120e",
        {
          at: [
            x + 0.02 * Math.cos(index),
            y + 0.01,
            z + 0.02 * Math.sin(index),
          ],
        },
        [6, 4],
      ),
    ),
  };
};

// ---------------------------------------------------------------- fish

interface FishLook {
  back: string;
  side: string;
  belly: string;
  fin: string;
  length: number;
  depth: number;
  /** How far down its sides the dark back colour reaches. */
  backSpread?: number;
}

const forkedTail: Outline = [
  [0, 0.03],
  [0.12, 0.12],
  [0.26, 0.26],
  [0.22, 0.08],
  [0.17, 0],
  [0.22, -0.08],
  [0.26, -0.26],
  [0.12, -0.12],
  [0, -0.03],
];

/** A fish facing +z with fins standing in the y/z plane. */
const fishBody = ({
  back,
  side,
  belly,
  fin,
  length,
  depth,
  backSpread = 0.85,
}: FishLook): ModelPart[] => {
  const radii: Triple = [0.1, depth, length];
  const centre: Triple = [0, 0.4, 0];
  return [
    blob(radii, side, { at: centre }, [12, 8]),
    // Its darker back: the same body raised a little, so only its top shows.
    blob(
      [0.102, depth, length * 0.99],
      back,
      { at: [0, 0.4 + depth * (1 - backSpread), -0.004] },
      [12, 8],
    ),
    patch(radii, centre, [0, -1, 0.1], 0.66, belly, [12, 8], 0.04),
    blob([0.035, depth * 0.3, 0.16], side, { at: [0, 0.4, -length + 0.02] }),
    flat(forkedTail, 0.02, fin, {
      at: [0, 0.4, -length - 0.08],
      turn: [0, quarter, 0],
      size: [1, depth / 0.22, 1],
    }),
    ...sideEyes([0.062, 0.43, length * 0.72], 0.032, ink, glint),
    ...mirrored((s) => [
      blob(
        [0.04, 0.045, 0.012],
        "#e8eef0",
        { at: [0.058 * s, 0.43, length * 0.72 - 0.005] },
        [6, 4],
      ),
      // The curve of its gill cover.
      blob(
        [0.012, depth * 0.6, 0.02],
        back,
        { at: [0.075 * s, 0.39, length * 0.5] },
        [5, 4],
      ),
      flat(
        [
          [0, 0],
          [0.12, 0.04],
          [0.14, -0.02],
          [0.08, -0.05],
        ],
        0.01,
        fin,
        {
          at: [0.09 * s, 0.34, length * 0.42],
          turn: [0.3, quarter + 0.35 * s, 0],
        },
      ),
    ]),
    blob(
      [0.035, 0.012, 0.02],
      "#5a4a4a",
      { at: [0, 0.38, length * 0.98] },
      [6, 3],
    ),
  ];
};

const fish = (): LabItemParts => {
  const back = "#5f6e7c";
  return {
    body: [
      ...fishBody({
        back,
        side: "#aeb8c0",
        belly: "#eef2f2",
        fin: "#7e8a96",
        length: 0.5,
        depth: 0.2,
      }),
      flat(
        [
          [0, 0],
          [0.05, 0.12],
          [0.2, 0.1],
          [0.3, 0],
        ],
        0.015,
        "#7e8a96",
        { at: [0, 0.56, 0.18], turn: [0, quarter, 0] },
      ),
      flat(
        [
          [0, 0],
          [0.05, 0.08],
          [0.18, 0.06],
          [0.22, 0],
        ],
        0.015,
        "#7e8a96",
        { at: [0, 0.57, -0.15], turn: [0, quarter, 0] },
      ),
      flat(
        [
          [0, 0],
          [0.05, -0.07],
          [0.2, -0.05],
          [0.22, 0],
        ],
        0.015,
        "#7e8a96",
        { at: [0, 0.24, -0.1], turn: [0, quarter, 0] },
      ),
      ...mirrored((s) =>
        blob(
          [0.006, 0.006, 0.36],
          "#dfe6ea",
          { at: [0.1 * s, 0.44, -0.04], turn: [0.05, 0, 0] },
          [4, 3],
        ),
      ),
    ],
  };
};

const mackerel = (): LabItemParts => {
  const back = "#2a7a78";
  const length = 0.56;
  const depth = 0.15;
  const stripeCount = 8;
  return {
    body: [
      ...fishBody({
        back,
        side: "#c9d6d6",
        belly: "#f2f4f0",
        fin: "#4a6a6a",
        length,
        depth,
        backSpread: 0.9,
      }),
      flat(
        [
          [0, 0],
          [0.03, 0.11],
          [0.14, 0.03],
          [0.16, 0],
        ],
        0.012,
        "#2a4a4a",
        { at: [0, 0.53, 0.12], turn: [0, quarter, 0] },
      ),
      flat(
        [
          [0, 0],
          [0.03, 0.06],
          [0.1, 0],
        ],
        0.012,
        "#2a4a4a",
        { at: [0, 0.53, -0.12], turn: [0, quarter, 0] },
      ),
      // The little finlets running to its tail.
      ...[-0.27, -0.34, -0.41, -0.47].flatMap((z) => [
        spike(
          0.015,
          0.035,
          "#2a4a4a",
          {
            at: [0, 0.4 + depth * 0.85 * Math.sqrt(1 - (z / length) ** 2), z],
            turn: [-0.6, 0, 0],
            size: [0.4, 1, 1],
          },
          4,
        ),
        spike(
          0.015,
          0.035,
          "#2a4a4a",
          {
            at: [0, 0.4 - depth * 0.85 * Math.sqrt(1 - (z / length) ** 2), z],
            turn: [Math.PI + 0.6, 0, 0],
            size: [0.4, 1, 1],
          },
          4,
        ),
      ]),
      // Its black wavy stripes across a blue-green back.
      ...mirrored((s) =>
        Array.from({ length: stripeCount }, (_, index) => {
          const start = 0.27 - index * 0.065;
          const points = [0, 1, 2, 3, 4].map((step): Triple => {
            const y = 0.41 + step * depth * 0.2;
            const z = start - step * 0.03 + (step % 2 === 0 ? 0.012 : -0.012);
            const across =
              1 - ((y - 0.4 - depth * 0.1) / depth) ** 2 - (z / length) ** 2;
            return [
              (0.104 * Math.sqrt(Math.max(across, 0.02)) + 0.006) * s,
              y,
              z,
            ];
          });
          return tube(points, 0.007, "#10181a", 6, 3);
        }),
      ),
    ],
  };
};

const goldfish = (): LabItemParts => {
  const orange = "#f28a1e";
  const fin = "#ff9f3a";
  const tailLobe: Outline = [
    [0, 0.03],
    [0.08, 0.1],
    [0.18, 0.2],
    [0.28, 0.25],
    [0.36, 0.22],
    [0.34, 0.12],
    [0.27, 0.03],
    [0.33, -0.06],
    [0.34, -0.16],
    [0.26, -0.2],
    [0.16, -0.16],
    [0.07, -0.08],
    [0, -0.03],
  ];
  return {
    // Its flowing fan tail, so thin the light shines through it.
    glass: mirrored((s) =>
      flat(s > 0 ? tailLobe : flipped(tailLobe), 0.012, "#ff9030", {
        at: [0.02 * s, 0.46, -0.22],
        turn: [0, s * (quarter - 0.35), 0],
      }),
    ),
    body: [
      blob([0.15, 0.22, 0.27], orange, { at: [0, 0.45, 0] }),
      blob([0.12, 0.12, 0.22], "#f8c048", { at: [0, 0.35, 0.03] }, [10, 7]),
      blob([0.12, 0.13, 0.12], "#f59a2e", { at: [0, 0.48, 0.2] }, [10, 7]),
      ...ringedEyes([0.108, 0.5, 0.25], 0.04, "#f2f0e8", [0.65, 0.65, 0.5]),
      blob([0.025, 0.025, 0.015], "#c25a10", { at: [0, 0.43, 0.32] }, [6, 4]),
      // Its tall flowing fin and its double fan tail.
      flat(
        [
          [0, 0],
          [0.02, 0.18],
          [0.12, 0.2],
          [0.26, 0.08],
          [0.3, 0],
        ],
        0.015,
        fin,
        { at: [0, 0.64, 0.08], turn: [0, quarter, 0] },
      ),
      ...mirrored((s) =>
        [0.05, -0.05].map((y) =>
          tube(
            [
              [0.02 * s, 0.46 + y, -0.22],
              [0.12 * s, 0.46 + y * 2.5, -0.38],
              [0.14 * s, 0.46 + y * 3.5, -0.5],
            ],
            0.006,
            "#f07a18",
            6,
            3,
          ),
        ),
      ),
      ...mirrored((s) => [
        flat(
          [
            [0, 0],
            [0.14, 0.03],
            [0.18, -0.06],
            [0.08, -0.07],
          ],
          0.01,
          fin,
          {
            at: [0.12 * s, 0.37, 0.12],
            turn: [0.3, quarter + 0.45 * s, 0],
          },
        ),
        flat(
          [
            [0, 0],
            [0.14, -0.1],
            [0.06, -0.12],
          ],
          0.01,
          fin,
          {
            at: [0.06 * s, 0.26, -0.02],
            turn: [0, quarter + 0.2 * s, 0],
          },
        ),
      ]),
      // A few glinting scales.
      ...[
        [0.13, 0.5, 0.0],
        [0.13, 0.42, -0.08],
        [-0.13, 0.48, -0.04],
        [-0.12, 0.4, 0.06],
      ].map(([x, y, z]) =>
        blob([0.012, 0.025, 0.025], "#ffd070", { at: [x, y, z] }, [5, 3]),
      ),
    ],
  };
};

// ---------------------------------------------------------------- creepy crawlies

const bee = (): LabItemParts => {
  const yellow = "#f2b632";
  const band = "#2a1d12";
  const tilt = -0.25;
  const abdomen: Triple = [0.19, 0.18, 0.3];
  const abdomenAt: Triple = [0, 0.4, -0.28];
  const stripe = (offset: number): ModelPart => {
    const share = Math.sqrt(Math.max(1 - (offset / abdomen[2]) ** 2, 0));
    return blob(
      [abdomen[0] * share + 0.012, abdomen[1] * share + 0.012, 0.045],
      band,
      {
        at: [
          0,
          abdomenAt[1] - offset * Math.sin(tilt),
          abdomenAt[2] + offset * Math.cos(tilt),
        ],
        turn: [tilt, 0, 0],
      },
      [12, 5],
    );
  };
  return {
    glass: mirrored((side) => [
      blob(
        [0.12, 0.008, 0.26],
        "#f2f8ff",
        {
          at: [0.2 * side, 0.62, -0.14],
          turn: [0.1, 0.35 * side, -0.25 * side],
        },
        [10, 5],
      ),
      blob(
        [0.08, 0.008, 0.17],
        "#f2f8ff",
        { at: [0.2 * side, 0.58, -0.3], turn: [0.05, 0.7 * side, -0.2 * side] },
        [8, 4],
      ),
    ]),
    body: [
      blob(abdomen, yellow, { at: abdomenAt, turn: [tilt, 0, 0] }),
      ...[-0.04, 0.07, -0.15].map(stripe),
      spike(0.03, 0.08, band, {
        at: [0, 0.48, -0.6],
        turn: [-quarter - 0.25, 0, 0],
      }),
      {
        ...blob([0.16, 0.15, 0.16], "#6b4a22", { at: [0, 0.44, 0.08] }),
        roughen: 0.18,
      },
      {
        ...blob([0.13, 0.07, 0.08], "#d8a84a", { at: [0, 0.5, 0.15] }, [7, 4]),
        roughen: 0.3,
      },
      blob([0.12, 0.11, 0.08], band, { at: [0, 0.42, 0.28] }),
      ...mirrored((side) => [
        blob(
          [0.05, 0.08, 0.06],
          "#121212",
          { at: [0.09 * side, 0.45, 0.3] },
          [7, 5],
        ),
        blob(
          [0.014, 0.018, 0.01],
          glint,
          { at: [0.12 * side, 0.48, 0.34] },
          [4, 3],
        ),
        ...limb(
          [
            [0.03 * side, 0.48, 0.34],
            [0.06 * side, 0.58, 0.38],
            [0.1 * side, 0.6, 0.47],
          ],
          0.008,
          band,
        ),
        ...([0.16, 0.06, -0.04] as const).flatMap((z, index) =>
          limb(
            [
              [0.08 * side, 0.34, z],
              [0.19 * side, 0.27, z + 0.04 - index * 0.06],
              [0.2 * side, 0.15 - index * 0.03, z + 0.06 - index * 0.1],
            ],
            0.016,
            band,
            0.01,
          ),
        ),
      ]),
    ],
  };
};

const beetle = (): LabItemParts => {
  const shell = "#1c1d24";
  const shine = "#5a6888";
  return {
    body: [
      blob([0.22, 0.15, 0.32], shell, { at: [0, 0.2, -0.1] }),
      blob([0.012, 0.155, 0.325], "#3c4050", { at: [0, 0.2, -0.1] }, [6, 8]),
      ...mirrored((side) =>
        blob(
          [0.03, 0.01, 0.14],
          shine,
          { at: [0.09 * side, 0.335, -0.06], turn: [0.1, 0, 0.35 * side] },
          [6, 3],
        ),
      ),
      blob([0.16, 0.1, 0.11], shell, { at: [0, 0.22, 0.24] }),
      blob(
        [0.05, 0.01, 0.04],
        shine,
        { at: [0.05, 0.315, 0.24], turn: [0, 0, 0.3] },
        [5, 3],
      ),
      blob([0.1, 0.07, 0.08], shell, { at: [0, 0.2, 0.37] }, [10, 6]),
      ...sideEyes([0.085, 0.23, 0.39], 0.02, "#2a2a30", "#8090b0"),
      ...mirrored((side) => [
        spike(
          0.02,
          0.08,
          shell,
          { at: [0.04 * side, 0.17, 0.47], turn: [quarter, 0, 0.4 * side] },
          5,
        ),
        ...limb(
          [
            [0.05 * side, 0.24, 0.43],
            [0.11 * side, 0.29, 0.52],
            [0.17 * side, 0.31, 0.56],
          ],
          0.009,
          shell,
        ),
        ...(
          [
            [0.24, 0.07],
            [0.04, 0.0],
            [-0.16, -0.09],
          ] as const
        ).flatMap(([z, dz]) =>
          limb(
            [
              [0.12 * side, 0.14, z],
              [0.25 * side, 0.19, z + dz],
              [0.31 * side, 0.02, z + dz * 2],
            ],
            0.017,
            shell,
            0.008,
          ),
        ),
      ]),
    ],
  };
};

const ladybird = (): LabItemParts => {
  const red = "#d8261c";
  const black = "#141414";
  const radii: Triple = [0.3, 0.24, 0.34];
  const centre: Triple = [0, 0.05, -0.04];
  return {
    body: [
      turned(
        Array.from({ length: 8 }, (_, index) => {
          const angle = (index / 7) * quarter;
          return [
            Math.cos(angle) * radii[0],
            centre[1] + Math.sin(angle) * radii[1],
          ] as const;
        }),
        red,
        { at: [0, 0, centre[2]], size: [1, 1, radii[2] / radii[0]] },
        18,
      ),
      blob([0.29, 0.04, 0.33], black, { at: [0, 0.05, -0.04] }, [12, 4]),
      tube(
        Array.from({ length: 7 }, (_, index): Triple => {
          const angle = 0.12 + (index / 6) * (Math.PI - 0.24);
          return [
            0,
            centre[1] + Math.sin(angle) * radii[1] + 0.004,
            centre[2] + Math.cos(angle) * radii[2],
          ];
        }),
        0.01,
        black,
        12,
        4,
      ),
      // Seven black spots.
      ...(
        [
          [0.5, 0.75, 0.4],
          [-0.5, 0.75, 0.4],
          [0.8, 0.5, -0.1],
          [-0.8, 0.5, -0.1],
          [0.45, 0.7, -0.6],
          [-0.45, 0.7, -0.6],
          [0, 0.6, 0.9],
        ] as const
      ).map(([x, y, z]) => patch(radii, centre, [x, y, z], 0.3, black, [7, 4])),
      blob([0.17, 0.1, 0.1], black, { at: [0, 0.1, 0.3] }, [10, 6]),
      ...mirrored((side) =>
        blob(
          [0.05, 0.04, 0.04],
          "#f4f0e8",
          { at: [0.1 * side, 0.12, 0.36] },
          [6, 4],
        ),
      ),
      blob([0.1, 0.07, 0.06], black, { at: [0, 0.08, 0.4] }, [7, 5]),
      ...sideEyes([0.07, 0.1, 0.42], 0.016, "#2a2a2a"),
      ...mirrored((side) => [
        ...limb(
          [
            [0.04 * side, 0.11, 0.44],
            [0.1 * side, 0.15, 0.52],
            [0.14 * side, 0.15, 0.58],
          ],
          0.008,
          black,
        ),
        ...([0.2, 0.0, -0.18] as const).flatMap((z) =>
          limb(
            [
              [0.2 * side, 0.05, z],
              [0.3 * side, 0.06, z + 0.03],
              [0.34 * side, 0.0, z + 0.05],
            ],
            0.016,
            black,
            0.01,
          ),
        ),
      ]),
    ],
  };
};

const spider = (): LabItemParts => {
  const brown = "#8a5a2e";
  const dark = "#5a3a1e";
  const legs: [number, number][] = [
    [0.9, 0.6],
    [0.45, 0.4],
    [-0.15, 0.2],
    [-0.6, 0.05],
  ];
  return {
    body: [
      blob([0.22, 0.2, 0.26], brown, { at: [0, 0.32, -0.28] }),
      // The white cross of a garden spider.
      ...[
        [0, 0.5, -0.24],
        [0, 0.47, -0.36],
        [0, 0.51, -0.13],
        [0.07, 0.5, -0.27],
        [-0.07, 0.5, -0.27],
        [0.13, 0.46, -0.2],
        [-0.13, 0.46, -0.2],
        [0.15, 0.42, -0.36],
        [-0.15, 0.42, -0.36],
      ].map(([x, y, z]) =>
        blob([0.025, 0.012, 0.025], "#f2ead8", { at: [x, y, z] }, [5, 3]),
      ),
      ...mirrored((side) =>
        blob(
          [0.03, 0.012, 0.12],
          dark,
          { at: [0.12 * side, 0.47, -0.3], turn: [0.25, 0, 0.6 * side] },
          [5, 3],
        ),
      ),
      blob([0.13, 0.09, 0.15], dark, { at: [0, 0.27, 0.06] }),
      ...eyes([0.04, 0.34, 0.18], 0.022),
      ...mirrored((side) =>
        blob(
          [0.014, 0.014, 0.012],
          ink,
          { at: [0.08 * side, 0.32, 0.16] },
          [4, 3],
        ),
      ),
      ...mirrored((side) => [
        spike(
          0.02,
          0.06,
          "#2a1a10",
          { at: [0.03 * side, 0.22, 0.21], turn: [Math.PI - 0.3, 0, 0] },
          4,
        ),
        ...limb(
          [
            [0.06 * side, 0.26, 0.18],
            [0.1 * side, 0.3, 0.26],
            [0.1 * side, 0.22, 0.3],
          ],
          0.014,
          brown,
        ),
        ...legs.flatMap(([angle, rise]) => {
          const out: Triple = [Math.cos(angle) * side, 0, Math.sin(angle)];
          return limb(
            [
              [0.08 * out[0], 0.27, 0.06 + 0.1 * out[2]],
              [0.26 * out[0], 0.44 + rise * 0.05, 0.06 + 0.26 * out[2]],
              [0.44 * out[0], 0.0, 0.06 + 0.44 * out[2]],
            ],
            0.024,
            brown,
            0.008,
          );
        }),
      ]),
      // Dark bands on its knees.
      ...mirrored((side) =>
        legs.map(([angle, rise]) =>
          blob(
            [0.03, 0.03, 0.03],
            dark,
            {
              at: [
                0.26 * Math.cos(angle) * side,
                0.44 + rise * 0.05,
                0.06 + 0.26 * Math.sin(angle),
              ],
            },
            [4, 3],
          ),
        ),
      ),
    ],
  };
};

const crab = (): LabItemParts => {
  const shell = "#c2452a";
  const dark = "#8a2a1a";
  const tip = "#2a1a16";
  return {
    body: [
      blob([0.38, 0.13, 0.28], shell, { at: [0, 0.22, 0] }, [12, 8]),
      blob([0.32, 0.07, 0.22], "#e8c8a0", { at: [0, 0.15, 0.01] }),
      ...[-0.24, -0.12, 0, 0.12, 0.24].map((x) =>
        blob(
          [0.03, 0.025, 0.02],
          dark,
          { at: [x, 0.26, 0.27 - Math.abs(x) * 0.35] },
          [5, 3],
        ),
      ),
      ...mirrored((side) => [
        stick([0.06 * side, 0.3, 0.22], [0.08 * side, 0.4, 0.27], 0.015, shell),
        blob(
          [0.03, 0.03, 0.03],
          ink,
          { at: [0.08 * side, 0.42, 0.28] },
          [6, 4],
        ),
        blob(
          [0.008, 0.008, 0.006],
          glint,
          { at: [0.09 * side, 0.435, 0.305] },
          [4, 3],
        ),
        // A big claw on each side, held open.
        ...limb(
          [
            [0.24 * side, 0.2, 0.18],
            [0.38 * side, 0.26, 0.3],
            [0.3 * side, 0.3, 0.44],
          ],
          0.05,
          shell,
        ),
        blob(
          [0.12, 0.09, 0.15],
          shell,
          { at: [0.27 * side, 0.32, 0.52], turn: [0, -0.4 * side, 0] },
          [10, 7],
        ),
        spike(
          0.04,
          0.16,
          tip,
          {
            at: [0.22 * side, 0.35, 0.66],
            turn: [quarter - 0.3, -0.4 * side, 0],
          },
          6,
        ),
        spike(
          0.035,
          0.14,
          tip,
          {
            at: [0.24 * side, 0.26, 0.65],
            turn: [quarter + 0.35, -0.4 * side, 0],
          },
          6,
        ),
        // Four legs a side, splayed out and bent at the knee.
        ...[0.12, 0.02, -0.08, -0.18].flatMap((z) => {
          const hip: Triple = [0.32 * side, 0.2, z];
          const knee: Triple = [0.5 * side, 0.32, z * 1.8];
          const foot: Triple = [0.66 * side, 0.0, z * 2.6];
          return limb([hip, knee, foot], 0.036, shell, 0.008);
        }),
      ]),
    ],
  };
};

const earthworm = (): LabItemParts => {
  const pink = "#c98676";
  const radius = 0.07;
  const path: Triple[] = [
    [0.32, 0.22, 0.46],
    [0.22, 0.13, 0.4],
    [0.06, 0.07, 0.34],
    [-0.16, 0.07, 0.3],
    [-0.32, 0.07, 0.16],
    [-0.28, 0.07, -0.02],
    [-0.06, 0.07, -0.08],
    [0.16, 0.07, -0.12],
    [0.32, 0.07, -0.24],
    [0.26, 0.07, -0.42],
    [0.06, 0.07, -0.48],
  ];
  const curve = new CatmullRomCurve3(
    path.map((point) => new Vector3(...point)),
  );
  const ends = [curve.getPoint(0), curve.getPoint(1)];
  return {
    body: [
      tube(path, radius, pink, 40, 7),
      ...ends.map((end) =>
        blob(
          [radius, radius, radius],
          pink,
          { at: [end.x, end.y, end.z] },
          [8, 6],
        ),
      ),
      // The rings that divide its body into segments.
      ...Array.from({ length: 20 }, (_, index) => {
        const along = 0.04 + (index / 20) * 0.94;
        const point = curve.getPoint(along);
        const tangent = curve.getTangent(along);
        // The thicker pale saddle a third of the way along.
        const saddle = along > 0.22 && along < 0.34;
        return blob(
          [
            radius + (saddle ? 0.014 : 0.005),
            saddle ? 0.03 : 0.007,
            radius + (saddle ? 0.014 : 0.005),
          ],
          saddle ? "#e3a08e" : "#9c5c50",
          {
            at: [point.x, point.y, point.z],
            turn: pointing([tangent.x, tangent.y, tangent.z]),
          },
          [8, 3],
        );
      }),
    ],
  };
};

const caterpillar = (): LabItemParts => {
  const green = "#7cc242";
  const shade = "#62a832";
  const count = 10;
  const segments = Array.from({ length: count }, (_, index) => {
    const along = index / (count - 1);
    const hump = Math.max(0, Math.sin((along - 0.3) * Math.PI * 1.8)) * 0.12;
    const z = 0.55 - along * 1.05;
    const y = index === 0 ? 0.32 : index === 1 ? 0.22 : 0.1 + hump;
    return [
      z,
      y,
      index === 0 ? 0.1 : 0.1 - Math.max(0, index - 7) * 0.012,
    ] as const;
  });
  return {
    body: [
      ...segments.flatMap(([z, y, radius], index) => [
        blob(
          [radius, radius, radius * 0.9],
          index % 2 === 0 ? green : shade,
          { at: [0, y, z] },
          [8, 6],
        ),
        ...(index === 0
          ? []
          : mirrored((side) =>
              blob(
                [0.018, 0.018, 0.01],
                "#f2e04a",
                { at: [radius * 0.9 * side, y, z] },
                [4, 3],
              ),
            )),
        ...(index > 1 && y < 0.16 && (index < 5 || index > 6)
          ? mirrored((side) =>
              stick(
                [0.05 * side, y - radius * 0.6, z],
                [0.055 * side, y - radius * 1.15, z],
                0.022,
                index < 4 ? "#3a4a1a" : shade,
                0.016,
                5,
              ),
            )
          : []),
      ]),
      blob([0.095, 0.1, 0.09], "#5a9a2a", { at: [0, 0.36, 0.62] }, [8, 6]),
      ...eyes([0.04, 0.38, 0.69], 0.02),
      ...mirrored((side) =>
        limb(
          [
            [0.03 * side, 0.45, 0.6],
            [0.06 * side, 0.52, 0.64],
          ],
          0.008,
          "#3a4a1a",
        ),
      ),
      ...mirrored((side) =>
        limb(
          [
            [0.05 * side, 0.22, 0.5],
            [0.06 * side, 0.12, 0.52],
          ],
          0.012,
          "#3a4a1a",
        ),
      ),
    ],
  };
};

const snail = (): LabItemParts => {
  const body = "#8a7a66";
  const shell = "#b07a3e";
  const band = "#5e3a1a";
  const shellRadii: Triple = [0.15, 0.26, 0.27];
  const shellAt: Triple = [0, 0.33, -0.08];
  // The spiral painted on each side of the shell, winding in to its tip.
  const spiral = (side: number): Triple[] =>
    Array.from({ length: 22 }, (_, index) => {
      const turn = (index / 21) * 2.4;
      const reach = 0.24 * (1 - turn / 2.6);
      const angle = turn * Math.PI * 2;
      const across = 1 - (reach / shellRadii[1]) ** 2;
      return [
        side * (shellRadii[0] * Math.sqrt(Math.max(across, 0)) + 0.006),
        shellAt[1] + Math.sin(angle) * reach,
        shellAt[2] - Math.cos(angle) * reach,
      ];
    });
  return {
    body: [
      blob([0.12, 0.07, 0.46], body, { at: [0, 0.07, 0] }),
      blob([0.08, 0.1, 0.1], body, { at: [0, 0.16, 0.4] }),
      blob(shellRadii, shell, { at: shellAt }, [14, 10]),
      blob([0.13, 0.05, 0.12], "#d2a466", { at: [0, 0.1, 0.02] }),
      ...mirrored((side) => [
        tube(spiral(side), 0.014, band, 40, 4),
        blob(
          [0.03, 0.03, 0.03],
          band,
          { at: [side * shellRadii[0] * 0.98, shellAt[1], shellAt[2]] },
          [6, 4],
        ),
        stick(
          [0.03 * side, 0.22, 0.44],
          [0.07 * side, 0.4, 0.5],
          0.014,
          body,
          0.01,
          5,
        ),
        blob(
          [0.028, 0.028, 0.028],
          "#2a2420",
          { at: [0.07 * side, 0.41, 0.505] },
          [6, 4],
        ),
        blob(
          [0.008, 0.008, 0.006],
          glint,
          { at: [0.08 * side, 0.42, 0.53] },
          [4, 3],
        ),
        stick(
          [0.03 * side, 0.12, 0.48],
          [0.05 * side, 0.1, 0.55],
          0.01,
          body,
          0.008,
          4,
        ),
      ]),
    ],
  };
};

const pepperedMoth = (): LabItemParts => {
  const pale = "#f6f3ea";
  const speck = "#2e2e2a";
  const forewing: Outline = [
    [0.02, 0.08],
    [0.25, 0.17],
    [0.48, 0.15],
    [0.58, 0.06],
    [0.5, -0.06],
    [0.3, -0.13],
    [0.04, -0.06],
  ];
  const hindwing: Outline = [
    [0.02, -0.02],
    [0.3, -0.08],
    [0.4, -0.2],
    [0.32, -0.32],
    [0.14, -0.34],
    [0.03, -0.18],
  ];
  const root: Triple = [0, 0.62, 0];
  const speckles = (outline: Outline, count: number, seed: number) =>
    scatter(count * 3, seed)
      .map(([u, v]) => [u * 0.6, v * 0.52 - 0.35] as const)
      .filter((point) => isInside(point, outline))
      .slice(0, count);
  return {
    body: [
      ...mirrored((side) => [
        flat(side > 0 ? hindwing : flipped(hindwing), 0.012, "#ebe7dc", {
          at: [root[0], root[1], -0.012],
        }),
        flat(side > 0 ? forewing : flipped(forewing), 0.012, pale, {
          at: root,
        }),
        // The peppery black specks it is named for.
        ...speckles(forewing, 22, side > 0 ? 7 : 13).map(([x, y]) =>
          blob(
            [0.014, 0.01, 0.004],
            speck,
            { at: [x * side, root[1] + y, 0.008], turn: [0, 0, x * 3] },
            [4, 3],
          ),
        ),
        ...speckles(hindwing, 9, side > 0 ? 29 : 31).map(([x, y]) =>
          blob(
            [0.012, 0.009, 0.004],
            speck,
            { at: [x * side, root[1] + y, -0.003] },
            [4, 3],
          ),
        ),
        ...[0.12, 0.3].map((x) =>
          blob(
            [0.008, 0.08, 0.004],
            "#6a6a62",
            {
              at: [x * side, root[1] + 0.02 - x * 0.1, 0.008],
              turn: [0, 0, 0.5 * side],
            },
            [4, 3],
          ),
        ),
        ...limb(
          [
            [0.015 * side, 0.86, 0.02],
            [0.08 * side, 0.98, 0.02],
            [0.16 * side, 1.02, 0.02],
          ],
          0.006,
          "#8a8478",
        ),
      ]),
      blob([0.04, 0.26, 0.035], "#d2cdbf", { at: [0, 0.52, 0.02] }, [7, 5]),
      blob([0.045, 0.045, 0.04], "#c8c2b2", { at: [0, 0.82, 0.03] }, [7, 4]),
      ...sideEyes([0.03, 0.83, 0.05], 0.013),
    ],
  };
};

export const animalsBuilders = {
  bacterium,
  bat,
  bee,
  beetle,
  bird,
  "bird-nest": birdNest,
  budgie,
  calf,
  cat,
  caterpillar,
  chick,
  cow,
  crab,
  crocodile,
  dog,
  duck,
  "early-horse": earlyHorse,
  earthworm,
  elephant,
  finch,
  fish,
  fox,
  frog,
  frogspawn,
  giraffe,
  goldfish,
  hedgehog,
  hen,
  horse,
  kitten,
  ladybird,
  lion,
  mackerel,
  mouse,
  newt,
  owl,
  penguin,
  "peppered-moth": pepperedMoth,
  pig,
  "polar-bear": polarBear,
  rabbit,
  rhinoceros,
  robin,
  sheep,
  snail,
  snake,
  spider,
  tadpole,
  tortoise,
  whale,
  woodpecker,
} satisfies Record<string, () => LabItemParts>;
