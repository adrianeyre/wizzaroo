import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { buildLoftGeometry, paintFaces } from "./island-lofts.js";
import { buildLiveryGeometry, type LiveryDecal } from "./island-livery.js";
import {
  portalDaisHeight,
  portalDaisRadius,
  portalRingCentre,
  portalRingRadius,
  portalStoneWidth,
} from "./island-portal.js";

// The magic portal: a ring of carved, moss-flecked stone standing on a round
// stepped dais, set with glowing rune stones and a gold keystone that carries
// the Wizzaroo crest, with the Wizzaroo name on a plaque at its foot. Its
// middle is filled with a swirling disc of light. Everything grows up out of
// the ground as the portal opens and sinks back as it closes, leaving only a
// glowing wisp.

const paint = {
  stone: new Color("#8b8fa3"),
  stoneLight: new Color("#a3a7ba"),
  stoneDark: new Color("#6b6f82"),
  moss: new Color("#5f8a4a"),
  gold: new Color("#f5c542"),
  rune: new Color("#a78bfa"),
};

const ringSegments = 72;
const ringSides = 12;
const ringDepth = 0.5;

const buildRingGeometry = (): BufferGeometry => {
  const inner = portalRingRadius;
  const outer = portalRingRadius + portalStoneWidth;
  const rings = Array.from({ length: ringSegments + 1 }, (_, segment) => {
    const angle = (segment / ringSegments) * Math.PI * 2;
    const blockBulge =
      0.03 * Math.abs(Math.sin((segment / ringSegments) * Math.PI * 12));
    return Array.from({ length: ringSides }, (_, side): Triple => {
      const around = (side / ringSides) * Math.PI * 2;
      const across = Math.cos(around);
      const through = Math.sin(around);
      const radial =
        (inner + outer) / 2 +
        (Math.sign(across) *
          Math.abs(across) ** 0.5 *
          (outer - inner + blockBulge)) /
          2;
      return [
        (Math.sign(through) *
          Math.abs(through) ** 0.5 *
          (ringDepth + blockBulge)) /
          2,
        portalRingCentre + Math.sin(angle) * radial,
        Math.cos(angle) * radial,
      ];
    });
  });
  const loft = buildLoftGeometry(rings);
  return paintFaces(loft, ({ y, z }) => {
    const angle = Math.atan2(y - portalRingCentre, z);
    const block = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 24);
    const isJoint =
      Math.abs(((((angle + Math.PI) / (Math.PI * 2)) * 24) % 1) - 0.5) > 0.44;
    if (isJoint) {
      return paint.stoneDark;
    }
    if (y > portalRingCentre + portalRingRadius && block % 5 === 0) {
      return paint.moss;
    }
    return block % 2 === 0 ? paint.stone : paint.stoneLight;
  });
};

const daisSteps = [
  { radius: portalDaisRadius, top: portalDaisHeight * 0.5 },
  { radius: portalDaisRadius - 0.45, top: portalDaisHeight },
];

const buildDaisParts = (): ModelPart[] => [
  ...daisSteps.map(({ radius, top }, step): ModelPart => ({
    geometry: new CylinderGeometry(radius, radius + 0.05, top + 0.3, 40),
    colour: step === 0 ? "#7c8094" : "#9a9eb2",
    position: [0, (top - 0.3) / 2, 0],
  })),
  ...Array.from({ length: 12 }, (_, rune): ModelPart => {
    const angle = (rune / 12) * Math.PI * 2;
    return {
      geometry: new OctahedronGeometry(0.09),
      colour: "#c4b5fd",
      position: [
        Math.cos(angle) * (portalDaisRadius - 0.22),
        portalDaisHeight * 0.5 + 0.02,
        Math.sin(angle) * (portalDaisRadius - 0.22),
      ],
      scale: [1, 0.4, 1],
    };
  }),
  {
    geometry: new TorusGeometry(portalDaisRadius - 0.45, 0.04, 5, 48),
    colour: "#f5c542",
    position: [0, portalDaisHeight + 0.01, 0],
    rotation: [Math.PI / 2, 0, 0],
  },
];

const footHalfLength = 0.55;

const buildPillarParts = (): ModelPart[] =>
  [-1, 1].flatMap((side): ModelPart[] => {
    const z = side * (portalRingRadius + portalStoneWidth / 2);
    return [
      {
        geometry: new BoxGeometry(ringDepth + 0.25, 0.5, footHalfLength * 2),
        colour: "#7c8094",
        position: [0, portalDaisHeight + 0.25, z],
      },
      {
        geometry: new BoxGeometry(
          ringDepth + 0.35,
          0.12,
          footHalfLength * 2 + 0.1,
        ),
        colour: "#f5c542",
        position: [0, portalDaisHeight + 0.52, z],
      },
      {
        geometry: new CylinderGeometry(0.05, 0.05, 1.2, 6),
        colour: "#3f3f46",
        position: [0, portalDaisHeight + 1.1, z + side * 0.42],
      },
      {
        geometry: new SphereGeometry(0.13, 10, 8),
        colour: "#c4b5fd",
        position: [0, portalDaisHeight + 1.75, z + side * 0.42],
      },
    ];
  });

const keystoneHeight =
  portalRingCentre + portalRingRadius + portalStoneWidth / 2;

const buildKeystoneGeometry = (): BufferGeometry =>
  new BoxGeometry(ringDepth + 0.14, 0.78, 0.72, 2, 4, 4).translate(
    0,
    keystoneHeight + 0.05,
    0,
  );

const buildPlaqueGeometry = (): BufferGeometry =>
  new BoxGeometry(0.1, 0.42, 1.55, 1, 4, 8).translate(
    portalDaisRadius - 0.2,
    portalDaisHeight + 0.1,
    0,
  );

const buildRuneParts = (): ModelPart[] =>
  [-1, 1].flatMap((side) =>
    Array.from({ length: 8 }, (_, rune): ModelPart => {
      const angle = ((rune + 0.5) / 8) * Math.PI * 2;
      const radial = portalRingRadius + portalStoneWidth / 2;
      return {
        geometry: new IcosahedronGeometry(0.1, 0),
        colour: "#a78bfa",
        position: [
          side * (ringDepth / 2 + 0.02),
          portalRingCentre + Math.sin(angle) * radial,
          Math.cos(angle) * radial,
        ],
      };
    }),
  );

const orbitStones = 6;
const orbitRadius = portalRingRadius + portalStoneWidth + 0.45;

export const buildPortalOrbitGeometry = (): BufferGeometry =>
  buildModelGeometry(
    Array.from({ length: orbitStones }, (_, stone): ModelPart => {
      const angle = (stone / orbitStones) * Math.PI * 2;
      return {
        geometry: new OctahedronGeometry(0.16),
        colour: stone % 2 === 0 ? "#c4b5fd" : "#f5c542",
        position: [
          0,
          portalRingCentre + Math.sin(angle) * orbitRadius,
          Math.cos(angle) * orbitRadius,
        ],
        scale: [0.7, 1.3, 0.7],
      };
    }),
  );

export const placePortalOrbit = (opening: number, turn: number): Matrix4 => {
  const size = Math.max(0.001, opening);
  return new Matrix4()
    .makeTranslation(0, portalRingCentre, 0)
    .multiply(new Matrix4().makeRotationX(turn * 0.08))
    .multiply(new Matrix4().makeScale(size, size, size))
    .multiply(new Matrix4().makeTranslation(0, -portalRingCentre, 0));
};

export const buildPortalGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildRingGeometry(),
    paintFaces(buildKeystoneGeometry(), () => paint.gold),
    paintFaces(buildPlaqueGeometry(), () => new Color("#1e1b4b")),
    buildModelGeometry([
      ...buildDaisParts(),
      ...buildPillarParts(),
      ...buildRuneParts(),
    ]),
  ]);

export const buildPortalLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    {
      surface: buildKeystoneGeometry(),
      decals: [1, -1].map((side): LiveryDecal => ({
        face: "flag",
        centre: [side * (ringDepth / 2 + 0.07), keystoneHeight + 0.05, 0],
        outward: [side, 0, 0],
        up: [0, 1, 0],
        width: 0.66,
        height: 0.33,
      })),
    },
    {
      surface: buildPlaqueGeometry(),
      decals: [
        {
          face: "name",
          centre: [portalDaisRadius - 0.15, portalDaisHeight + 0.1, 0],
          outward: [1, 0, 0],
          up: [0, 1, 0],
          width: 1.45,
          height: 0.36,
        },
      ],
    },
  ]);

export const portalGrowthCentre: Triple = [0, portalRingCentre, 0];

export const findPortalScale = (opening: number): number =>
  Math.max(0.001, opening);

const swirlRings = 14;
const swirlSpokes = 64;

const findSwirlColour = (reach: number, angle: number): Color => {
  const arm = 0.5 + 0.5 * Math.sin(angle * 3 + reach * 9);
  const base = new Color("#ffffff")
    .lerp(new Color("#c084fc"), Math.min(1, reach * 1.4))
    .lerp(new Color("#4c1d95"), Math.max(0, reach - 0.6) * 1.6);
  return base.lerp(new Color("#67e8f9"), arm * 0.35 * reach);
};

const buildSwirlDisc = (): BufferGeometry => {
  const positions: number[] = [];
  const colours: number[] = [];
  const indices: number[] = [];
  const radius = portalRingRadius - 0.02;
  for (let ring = 0; ring <= swirlRings; ring++) {
    const reach = ring / swirlRings;
    for (let spoke = 0; spoke < swirlSpokes; spoke++) {
      const angle = (spoke / swirlSpokes) * Math.PI * 2 + reach * 2.4;
      positions.push(
        0,
        Math.sin(angle) * radius * reach,
        Math.cos(angle) * radius * reach,
      );
      findSwirlColour(reach, angle).toArray(colours, colours.length);
    }
  }
  for (let ring = 0; ring < swirlRings; ring++) {
    for (let spoke = 0; spoke < swirlSpokes; spoke++) {
      const here = ring * swirlSpokes + spoke;
      const next = ring * swirlSpokes + ((spoke + 1) % swirlSpokes);
      indices.push(
        here,
        next,
        next + swirlSpokes,
        here,
        next + swirlSpokes,
        here + swirlSpokes,
      );
    }
  }
  const disc = new BufferGeometry();
  disc.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  disc.setAttribute("color", new BufferAttribute(new Float32Array(colours), 3));
  disc.setIndex(indices);
  disc.computeVertexNormals();
  return disc.toNonIndexed();
};

const buildWispGeometry = (): BufferGeometry => {
  const core = new IcosahedronGeometry(0.3, 2);
  const halo = new SphereGeometry(0.5, 16, 12);
  return mergeGeometries(
    [core, halo].map((part, index) => {
      const painted = paintFaces(part, () =>
        index === 0 ? new Color("#ffffff") : new Color("#c4b5fd"),
      );
      painted.computeVertexNormals();
      return painted;
    }),
  );
};

export const buildPortalGlowGeometry = (): BufferGeometry =>
  mergeGeometries([buildSwirlDisc(), buildWispGeometry()]);

// The swirl stays the same size: the stone ring and its dais grow around it
// as the portal opens. Closed, it tumbles on its own as the wisp that crosses
// the World Map.
export const placePortalGlow = (opening: number, turn: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(0, portalRingCentre, 0)
    .multiply(new Matrix4().makeRotationY(turn * 0.3 * (1 - opening)))
    .multiply(new Matrix4().makeRotationX(turn * (0.25 + 0.5 * (1 - opening))));
