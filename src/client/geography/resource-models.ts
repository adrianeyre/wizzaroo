import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import type { Resource } from "../../curriculum/geography.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";

export type ResourceMotion = "spin" | "flicker" | "rise";

export interface ResourceMovingPart {
  motion: ResourceMotion;
  pivot: Triple;
  buildPart: () => BufferGeometry;
}

export interface ResourceFinish {
  metalness: number;
  roughness: number;
}

export interface ResourceModel {
  buildBody: () => BufferGeometry;
  finish: ResourceFinish;
  moving?: ResourceMovingPart;
}

export const crateInside = { halfWidth: 0.64, halfDepth: 0.42 } as const;

const matte: ResourceFinish = { metalness: 0, roughness: 0.75 };
const glossy: ResourceFinish = { metalness: 0.1, roughness: 0.4 };
const shiny: ResourceFinish = { metalness: 0.85, roughness: 0.25 };

const upright = new Vector3(0, 1, 0);

const buildRod = (
  from: Triple,
  to: Triple,
  radius: number,
  colour: string,
  sides = 6,
): ModelPart => {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(upright, direction.normalize()),
  );
  const middle = start.add(end).multiplyScalar(0.5);
  return {
    geometry: new CylinderGeometry(radius, radius, length, sides),
    colour,
    position: [middle.x, middle.y, middle.z],
    rotation: [turn.x, turn.y, turn.z],
  };
};

const buildLump = (
  position: Triple,
  size: number,
  colour: string,
  squash: Triple = [1, 0.75, 1],
): ModelPart => ({
  geometry: new IcosahedronGeometry(size, 0),
  colour,
  position,
  scale: [squash[0], squash[1], squash[2]],
  roughen: 0.45,
});

const buildBarrel = (
  position: Triple,
  colour: string,
  bandColour: string,
  radius = 0.13,
  height = 0.36,
): ModelPart[] => {
  const [x, y, z] = position;
  return [
    {
      geometry: new CylinderGeometry(radius, radius, height, 16),
      colour,
      position: [x, y + height / 2, z],
    },
    ...[0.22, 0.78].map((share) => ({
      geometry: new TorusGeometry(radius + 0.004, 0.012, 4, 16),
      colour: bandColour,
      position: [x, y + height * share, z] satisfies Triple,
      rotation: [Math.PI / 2, 0, 0] satisfies Triple,
    })),
    {
      geometry: new CylinderGeometry(radius * 0.18, radius * 0.18, 0.02, 8),
      colour: bandColour,
      position: [x + radius * 0.5, y + height + 0.01, z],
    },
  ];
};

const buildOilBody = (): BufferGeometry => {
  const legBottom = 0.2;
  const legTop = 0.045;
  const towerHeight = 1.0;
  const towerX = 0.32;
  const towerZ = -0.08;
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const;
  const findCorner = (
    [sideX, sideZ]: readonly [number, number],
    height: number,
  ): Triple => {
    const spread = legBottom + (legTop - legBottom) * (height / towerHeight);
    return [towerX + sideX * spread, height, towerZ + sideZ * spread];
  };
  const derrickRed = "#c0392b";
  return buildModelGeometry([
    ...buildBarrel([-0.42, 0, 0.16], "#253041", "#aab4c0"),
    ...buildBarrel([-0.14, 0, 0.2], "#253041", "#aab4c0"),
    ...buildBarrel([-0.3, 0, -0.16], "#1a6fb5", "#d9e2ec"),
    ...buildBarrel([-0.28, 0.36, 0.18], "#253041", "#aab4c0"),
    {
      geometry: new SphereGeometry(0.05, 10, 8),
      colour: "#0b0b0d",
      position: [-0.2, 0.73, 0.2],
      scale: [1.4, 0.35, 1.2],
    },
    {
      geometry: new BoxGeometry(0.5, 0.05, 0.5),
      colour: "#5c5f66",
      position: [towerX, 0.025, towerZ],
    },
    ...corners.map((corner) =>
      buildRod(
        findCorner(corner, 0.05),
        findCorner(corner, towerHeight),
        0.016,
        derrickRed,
      ),
    ),
    ...[0.3, 0.55, 0.78].flatMap((height) =>
      corners.map((corner, index) =>
        buildRod(
          findCorner(corner, height),
          findCorner(corners[(index + 1) % corners.length] ?? corner, height),
          0.01,
          "#e8e8e8",
          4,
        ),
      ),
    ),
    ...corners.map((corner, index) =>
      buildRod(
        findCorner(corner, 0.05),
        findCorner(corners[(index + 1) % corners.length] ?? corner, 0.3),
        0.008,
        derrickRed,
        4,
      ),
    ),
    {
      geometry: new BoxGeometry(0.14, 0.06, 0.14),
      colour: "#3b3f46",
      position: [towerX, towerHeight + 0.03, towerZ],
    },
    {
      geometry: new CylinderGeometry(0.035, 0.035, 0.14, 10),
      colour: "#3b3f46",
      position: [towerX, 0.12, towerZ],
    },
    buildRod([towerX, 0.1, towerZ], [-0.02, 0.1, -0.16], 0.02, "#7d8590", 8),
  ]);
};

const buildCoalBody = (): BufferGeometry => {
  const cartX = -0.12;
  const cartGrey = "#5d6670";
  const coal = ["#18181b", "#26272c", "#101012"] as const;
  return buildModelGeometry([
    ...[-0.13, 0.13].map((z) => ({
      geometry: new BoxGeometry(1.2, 0.025, 0.03),
      colour: "#8a8f99",
      position: [0, 0.0125, z] satisfies Triple,
    })),
    ...[-0.45, -0.15, 0.15, 0.45].map((x) => ({
      geometry: new BoxGeometry(0.06, 0.02, 0.4),
      colour: "#6b4426",
      position: [x, 0.01, 0] satisfies Triple,
    })),
    ...[-1, 1].flatMap((sideX) =>
      [-1, 1].map((sideZ) => ({
        geometry: new CylinderGeometry(0.075, 0.075, 0.04, 14),
        colour: "#2a2d33",
        position: [cartX + sideX * 0.2, 0.1, sideZ * 0.16] satisfies Triple,
        rotation: [Math.PI / 2, 0, 0] satisfies Triple,
      })),
    ),
    {
      geometry: new BoxGeometry(0.62, 0.04, 0.34),
      colour: cartGrey,
      position: [cartX, 0.14, 0],
    },
    ...[-1, 1].flatMap((side) => [
      {
        geometry: new BoxGeometry(0.66, 0.26, 0.03),
        colour: cartGrey,
        position: [cartX, 0.28, side * 0.185] satisfies Triple,
        rotation: [side * -0.12, 0, 0] satisfies Triple,
      },
      {
        geometry: new BoxGeometry(0.03, 0.26, 0.4),
        colour: cartGrey,
        position: [cartX + side * 0.33, 0.28, 0] satisfies Triple,
        rotation: [0, 0, side * 0.12] satisfies Triple,
      },
    ]),
    {
      geometry: new BoxGeometry(0.7, 0.03, 0.04),
      colour: "#3d434b",
      position: [cartX, 0.4, 0.2],
    },
    {
      geometry: new SphereGeometry(0.3, 12, 8),
      colour: coal[0],
      position: [cartX, 0.36, 0],
      scale: [1.05, 0.42, 0.6],
      roughen: 0.25,
    },
    ...[
      [-0.3, 0.46, 0.05, 0.08],
      [-0.12, 0.5, -0.02, 0.1],
      [0.05, 0.47, 0.06, 0.08],
      [-0.2, 0.47, -0.1, 0.07],
      [0.12, 0.44, -0.08, 0.07],
      [-0.06, 0.52, 0.1, 0.06],
    ].map(([x = 0, y = 0, z = 0, size = 0.05], index) =>
      buildLump([x, y, z], size, coal[index % coal.length] ?? coal[0]),
    ),
    ...[
      [0.42, 0.06, 0.2, 0.09],
      [0.52, 0.05, 0.05, 0.07],
      [0.36, 0.05, 0.32, 0.06],
      [0.5, 0.12, 0.16, 0.07],
      [0.3, 0.04, 0.1, 0.05],
    ].map(([x = 0, y = 0, z = 0, size = 0.05], index) =>
      buildLump([x, y, z], size, coal[(index + 1) % coal.length] ?? coal[0]),
    ),
  ]);
};

const buildGasBody = (): BufferGeometry => {
  const canisterColours = ["#e4572e", "#e4572e", "#2f6db5"] as const;
  return buildModelGeometry([
    ...canisterColours.flatMap((colour, index) => {
      const x = -0.48 + index * 0.24;
      const z = index === 1 ? -0.12 : 0.08;
      return [
        {
          geometry: new CylinderGeometry(0.1, 0.1, 0.5, 16),
          colour,
          position: [x, 0.25, z] satisfies Triple,
        },
        {
          geometry: new SphereGeometry(
            0.1,
            16,
            8,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ),
          colour,
          position: [x, 0.5, z] satisfies Triple,
        },
        {
          geometry: new CylinderGeometry(0.03, 0.035, 0.08, 10),
          colour: "#b8bec7",
          position: [x, 0.62, z] satisfies Triple,
        },
        {
          geometry: new TorusGeometry(0.045, 0.01, 4, 14),
          colour: "#30343b",
          position: [x, 0.67, z] satisfies Triple,
          rotation: [Math.PI / 2, 0, 0] satisfies Triple,
        },
        {
          geometry: new CylinderGeometry(0.102, 0.102, 0.06, 16),
          colour: "#f4f1ea",
          position: [x, 0.33, z] satisfies Triple,
        },
      ];
    }),
    buildRod([0.0, 0.62, 0.08], [0.18, 0.62, 0.08], 0.018, "#b8bec7", 8),
    buildRod([0.18, 0.62, 0.08], [0.3, 0.2, 0.08], 0.018, "#b8bec7", 8),
    {
      geometry: new TorusGeometry(0.05, 0.012, 4, 14),
      colour: "#d62828",
      position: [0.13, 0.62, 0.13],
    },
    {
      geometry: new CylinderGeometry(0.16, 0.2, 0.2, 18),
      colour: "#3a3d44",
      position: [0.38, 0.1, 0.08],
    },
    {
      geometry: new TorusGeometry(0.11, 0.022, 6, 20),
      colour: "#1d1f24",
      position: [0.38, 0.215, 0.08],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.06, 0.06, 0.04, 14),
      colour: "#7d8590",
      position: [0.38, 0.22, 0.08],
    },
  ]);
};

const buildGasFlame = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new ConeGeometry(0.1, 0.32, 14, 1, true),
      colour: "#2f6bff",
      position: [0, 0.16, 0],
    },
    {
      geometry: new ConeGeometry(0.06, 0.2, 12, 1, true),
      colour: "#9fd8ff",
      position: [0, 0.1, 0],
    },
  ]);

const buildTrefoil = (): ShapeGeometry => {
  const blades = [0, 1, 2].map((index) => {
    const middle = Math.PI / 2 + (index * Math.PI * 2) / 3;
    const blade = new Shape();
    const inner = 0.035;
    const outer = 0.12;
    blade.moveTo(
      Math.cos(middle - Math.PI / 6) * inner,
      Math.sin(middle - Math.PI / 6) * inner,
    );
    blade.absarc(
      0,
      0,
      outer,
      middle - Math.PI / 6,
      middle + Math.PI / 6,
      false,
    );
    blade.absarc(0, 0, inner, middle + Math.PI / 6, middle - Math.PI / 6, true);
    return blade;
  });
  const centre = new Shape();
  centre.absarc(0, 0, 0.024, 0, Math.PI * 2, false);
  return new ShapeGeometry([...blades, centre], 8);
};

const buildUraniumBody = (): BufferGeometry => {
  const signX = 0.36;
  const signY = 0.62;
  return buildModelGeometry([
    ...buildBarrel([-0.42, 0, 0.12], "#f5c518", "#1b1b1b", 0.14, 0.4),
    ...buildBarrel([-0.12, 0, 0.18], "#f5c518", "#1b1b1b", 0.14, 0.4),
    ...buildBarrel([-0.28, 0, -0.2], "#f5c518", "#1b1b1b", 0.14, 0.4),
    {
      geometry: new ConeGeometry(0.14, 0.12, 14),
      colour: "#d8b632",
      position: [0.18, 0.06, 0.24],
      scale: [1, 1, 0.8],
    },
    {
      geometry: new CylinderGeometry(0.022, 0.022, signY, 8),
      colour: "#7d8590",
      position: [signX, signY / 2, -0.05],
    },
    {
      geometry: new BoxGeometry(0.4, 0.4, 0.025),
      colour: "#1b1b1b",
      position: [signX, signY + 0.08, -0.02],
    },
    {
      geometry: new BoxGeometry(0.36, 0.36, 0.03),
      colour: "#f5c518",
      position: [signX, signY + 0.08, -0.016],
    },
    {
      geometry: buildTrefoil(),
      colour: "#1b1b1b",
      position: [signX, signY + 0.08, 0.004],
      scale: [1.15, 1.15, 1],
    },
  ]);
};

const turbineHub: Triple = [0.12, 1.02, 0.09];

const buildWindBody = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new SphereGeometry(0.34, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: "#6cc070",
      position: [0, 0, 0],
      scale: [1.6, 0.35, 1.1],
    },
    {
      geometry: new CylinderGeometry(0.1, 0.1, 0.06, 14),
      colour: "#c9ced6",
      position: [turbineHub[0], 0.1, -0.02],
    },
    {
      geometry: new CylinderGeometry(0.032, 0.07, 0.94, 14),
      colour: "#f4f6f8",
      position: [turbineHub[0], 0.57, -0.02],
    },
    {
      geometry: new BoxGeometry(0.1, 0.1, 0.24),
      colour: "#f4f6f8",
      position: [turbineHub[0], turbineHub[1], -0.03],
    },
    {
      geometry: new BoxGeometry(0.04, 0.04, 0.05),
      colour: "#d62828",
      position: [turbineHub[0], turbineHub[1] + 0.06, -0.1],
    },
  ]);

const buildWindRotor = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new ConeGeometry(0.055, 0.1, 14),
      colour: "#f4f6f8",
      rotation: [Math.PI / 2, 0, 0],
      position: [0, 0, 0.04],
    },
    ...[0, 1, 2].map((index) => {
      const angle = (index * Math.PI * 2) / 3;
      return {
        geometry: new BoxGeometry(0.06, 0.48, 0.014),
        colour: "#ffffff",
        position: [
          Math.sin(angle) * 0.26,
          Math.cos(angle) * 0.26,
          0,
        ] satisfies Triple,
        rotation: [0, 0, -angle] satisfies Triple,
      };
    }),
    ...[0, 1, 2].map((index) => {
      const angle = (index * Math.PI * 2) / 3;
      return {
        geometry: new BoxGeometry(0.062, 0.06, 0.016),
        colour: "#d62828",
        position: [
          Math.sin(angle) * 0.47,
          Math.cos(angle) * 0.47,
          0,
        ] satisfies Triple,
        rotation: [0, 0, -angle] satisfies Triple,
      };
    }),
  ]);

const buildSolarBody = (): BufferGeometry => {
  const panelTilt = -0.55;
  const panels = [
    [-0.32, -0.16],
    [0.32, -0.16],
    [-0.32, 0.2],
    [0.32, 0.2],
  ] as const;
  return buildModelGeometry(
    panels.flatMap(([x, z]) => {
      const lift = z < 0 ? 0.38 : 0.24;
      return [
        ...[-0.2, 0.2].map((offset) => ({
          geometry: new CylinderGeometry(0.014, 0.014, lift, 6),
          colour: "#9aa3ad",
          position: [x + offset, lift / 2, z] satisfies Triple,
        })),
        {
          geometry: new BoxGeometry(0.54, 0.03, 0.34),
          colour: "#c9ced6",
          position: [x, lift + 0.01, z] satisfies Triple,
          rotation: [panelTilt, 0, 0] satisfies Triple,
        },
        {
          geometry: new BoxGeometry(0.5, 0.012, 0.3),
          colour: "#173a7a",
          position: [x, lift + 0.03, z + 0.01] satisfies Triple,
          rotation: [panelTilt, 0, 0] satisfies Triple,
        },
        ...[-0.125, 0, 0.125].map((offset) => ({
          geometry: new BoxGeometry(0.006, 0.006, 0.3),
          colour: "#b8c4d6",
          position: [x + offset, lift + 0.037, z + 0.014] satisfies Triple,
          rotation: [panelTilt, 0, 0] satisfies Triple,
        })),
        {
          geometry: new BoxGeometry(0.5, 0.006, 0.006),
          colour: "#b8c4d6",
          position: [x, lift + 0.037, z + 0.014] satisfies Triple,
          rotation: [panelTilt, 0, 0] satisfies Triple,
        },
      ];
    }),
  );
};

const buildHydroBody = (): BufferGeometry => {
  const concrete = "#c9c3b6";
  const water = "#3a8fd8";
  return buildModelGeometry([
    {
      geometry: new BoxGeometry(1.2, 0.46, 0.34),
      colour: water,
      position: [0, 0.23, -0.23],
    },
    ...[-1, 0, 1].map((segment) => ({
      geometry: new BoxGeometry(0.44, 0.62, 0.1),
      colour: concrete,
      position: [
        segment * 0.41,
        0.31,
        -0.02 - Math.abs(segment) * 0.06,
      ] satisfies Triple,
      rotation: [0, segment * 0.28, 0] satisfies Triple,
    })),
    {
      geometry: new BoxGeometry(1.26, 0.05, 0.16),
      colour: "#a9a296",
      position: [0, 0.645, -0.05],
    },
    ...[-0.2, 0.2].map((x) => ({
      geometry: new CylinderGeometry(0.05, 0.05, 0.14, 12),
      colour: "#7d8590",
      position: [x, 0.12, 0.08] satisfies Triple,
      rotation: [Math.PI / 2, 0, 0] satisfies Triple,
    })),
    {
      geometry: new BoxGeometry(0.9, 0.03, 0.3),
      colour: water,
      position: [0, 0.015, 0.25],
    },
    {
      geometry: new BoxGeometry(0.22, 0.2, 0.2),
      colour: "#e9e4d8",
      position: [0.48, 0.1, 0.22],
    },
    {
      geometry: new BoxGeometry(0.26, 0.04, 0.24),
      colour: "#8a5a3c",
      position: [0.48, 0.22, 0.22],
    },
    ...[-0.5, -0.38].map((x) => ({
      geometry: new IcosahedronGeometry(0.09, 0),
      colour: "#7a7f86",
      position: [x, 0.08, 0.24] satisfies Triple,
      roughen: 0.4,
    })),
  ]);
};

const buildHydroSpray = (): BufferGeometry =>
  buildModelGeometry(
    [-0.2, 0.2].flatMap((x) => [
      {
        geometry: new ConeGeometry(0.06, 0.16, 10, 1, true),
        colour: "#e6f6ff",
        position: [x, 0, 0.07] satisfies Triple,
        rotation: [-Math.PI / 2, 0, 0] satisfies Triple,
      },
      {
        geometry: new SphereGeometry(0.05, 8, 6),
        colour: "#bfe6ff",
        position: [x, -0.07, 0.16] satisfies Triple,
        scale: [1.3, 0.6, 1] satisfies Triple,
      },
    ]),
  );

const buildGeothermalBody = (): BufferGeometry => {
  const rock = ["#6f6a63", "#5b5650", "#857f76"] as const;
  return buildModelGeometry([
    {
      geometry: new SphereGeometry(0.5, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: "#7a6a58",
      scale: [1.25, 0.22, 0.8],
      roughen: 0.12,
    },
    ...[
      [-0.45, 0.08, -0.15, 0.1],
      [-0.5, 0.07, 0.18, 0.08],
      [0.42, 0.07, 0.22, 0.09],
      [0.5, 0.08, -0.12, 0.1],
      [-0.15, 0.08, -0.28, 0.08],
    ].map(([x = 0, y = 0, z = 0, size = 0.05], index) =>
      buildLump([x, y, z], size, rock[index % rock.length] ?? rock[0]),
    ),
    {
      geometry: new CylinderGeometry(0.2, 0.22, 0.03, 18),
      colour: "#e07a2b",
      position: [-0.22, 0.1, 0.12],
    },
    {
      geometry: new CylinderGeometry(0.17, 0.17, 0.035, 18),
      colour: "#4fd1c5",
      position: [-0.22, 0.105, 0.12],
    },
    {
      geometry: new CylinderGeometry(0.07, 0.08, 0.36, 14),
      colour: "#9aa3ad",
      position: [0.2, 0.26, -0.05],
    },
    {
      geometry: new CylinderGeometry(0.09, 0.09, 0.04, 14),
      colour: "#6b737d",
      position: [0.2, 0.44, -0.05],
    },
    {
      geometry: new TorusGeometry(0.07, 0.014, 4, 16),
      colour: "#d62828",
      position: [0.2, 0.3, 0.05],
    },
    buildRod([0.2, 0.3, -0.05], [0.5, 0.3, -0.05], 0.03, "#9aa3ad", 10),
    {
      geometry: new BoxGeometry(0.2, 0.26, 0.26),
      colour: "#e9e4d8",
      position: [0.52, 0.22, -0.12],
    },
    {
      geometry: new BoxGeometry(0.06, 0.02, 0.06),
      colour: "#ff7b29",
      position: [-0.02, 0.11, 0.25],
    },
    {
      geometry: new BoxGeometry(0.1, 0.02, 0.025),
      colour: "#ff7b29",
      position: [0.06, 0.105, 0.3],
      rotation: [0, 0.6, 0],
    },
  ]);
};

const buildSteamPuffs = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(0.08, 1),
      colour: "#ffffff",
      position: [0, 0.04, 0],
      isSmooth: true,
    },
    {
      geometry: new IcosahedronGeometry(0.11, 1),
      colour: "#f4f7fb",
      position: [0.04, 0.17, 0.01],
      isSmooth: true,
    },
    {
      geometry: new IcosahedronGeometry(0.14, 1),
      colour: "#eef3f8",
      position: [-0.03, 0.34, 0],
      isSmooth: true,
    },
  ]);

const buildTimberBody = (): BufferGeometry => {
  const logRadius = 0.105;
  const logLength = 0.7;
  const rows = [4, 3, 2, 1];
  return buildModelGeometry(
    rows.flatMap((count, row) =>
      Array.from({ length: count }, (_unused, index) => {
        const x = (index - (count - 1) / 2) * logRadius * 2.05;
        const y = logRadius + row * logRadius * 1.75;
        const radius = logRadius * (0.92 + ((index + row) % 3) * 0.04);
        return [
          {
            geometry: new CylinderGeometry(radius, radius, logLength, 12),
            colour: "#6e4426",
            position: [x, y, 0] satisfies Triple,
            rotation: [Math.PI / 2, 0, 0] satisfies Triple,
            roughen: 0.06,
          },
          {
            geometry: new CylinderGeometry(
              radius * 0.86,
              radius * 0.86,
              0.01,
              12,
            ),
            colour: "#e6c48f",
            position: [x, y, logLength / 2 + 0.003] satisfies Triple,
            rotation: [Math.PI / 2, 0, 0] satisfies Triple,
          },
          {
            geometry: new CylinderGeometry(
              radius * 0.42,
              radius * 0.42,
              0.01,
              10,
            ),
            colour: "#c79a5e",
            position: [x, y, logLength / 2 + 0.008] satisfies Triple,
            rotation: [Math.PI / 2, 0, 0] satisfies Triple,
          },
        ];
      }).flat(),
    ),
  );
};

const buildSheaf = (x: number, z: number, lean: number): ModelPart[] => {
  const stalk = "#d9b44a";
  const ear = "#e8c25a";
  return [
    {
      geometry: new CylinderGeometry(0.07, 0.12, 0.42, 14),
      colour: stalk,
      position: [x, 0.21, z],
      rotation: [0, 0, lean],
    },
    {
      geometry: new TorusGeometry(0.075, 0.018, 4, 14),
      colour: "#8a5a2e",
      position: [x - Math.sin(lean) * 0.3, 0.3, z],
      rotation: [Math.PI / 2, lean, 0],
    },
    {
      geometry: new CylinderGeometry(0.15, 0.075, 0.2, 14),
      colour: stalk,
      position: [x - Math.sin(lean) * 0.5, 0.5, z],
      rotation: [0, 0, lean],
    },
    ...Array.from({ length: 11 }, (_unused, index) => {
      const angle = (index / 11) * Math.PI * 2;
      const reach = index % 2 === 0 ? 0.11 : 0.05;
      const tilt = index % 2 === 0 ? 0.45 : 0.15;
      return {
        geometry: new SphereGeometry(0.028, 6, 4),
        colour: ear,
        position: [
          x - Math.sin(lean) * 0.62 + Math.cos(angle) * reach,
          0.64 + (index % 3) * 0.015,
          z + Math.sin(angle) * reach,
        ] satisfies Triple,
        rotation: [
          Math.sin(angle) * tilt,
          0,
          -Math.cos(angle) * tilt + lean,
        ] satisfies Triple,
        scale: [1, 2.8, 1] satisfies Triple,
      };
    }),
  ];
};

const buildWheatBody = (): BufferGeometry =>
  buildModelGeometry([
    ...buildSheaf(-0.36, -0.05, 0.12),
    ...buildSheaf(0, -0.1, 0),
    ...buildSheaf(0.36, 0.0, -0.12),
    ...[
      [-0.18, 0.2, 0.6],
      [0.2, 0.26, -0.4],
    ].map(([x = 0, z = 0, turn = 0]) => ({
      geometry: new SphereGeometry(0.028, 6, 4),
      colour: "#e8c25a",
      position: [x, 0.03, z] satisfies Triple,
      rotation: [0, turn, Math.PI / 2] satisfies Triple,
      scale: [1, 2.8, 1] satisfies Triple,
    })),
  ]);

const buildRiceSack = (x: number, z: number, height: number): ModelPart[] => [
  {
    geometry: new IcosahedronGeometry(0.2, 2),
    colour: "#efe6cf",
    position: [x, height * 0.5 + 0.02, z],
    scale: [1, height / 0.4, 0.85],
    roughen: 0.12,
  },
  {
    geometry: new CylinderGeometry(0.05, 0.08, 0.08, 10),
    colour: "#e2d6b8",
    position: [x, height * 0.9 + 0.02, z],
  },
  {
    geometry: new TorusGeometry(0.05, 0.012, 4, 12),
    colour: "#2f8a3a",
    position: [x, height * 0.9 + 0.03, z],
    rotation: [Math.PI / 2, 0, 0],
  },
  {
    geometry: new ConeGeometry(0.07, 0.1, 10),
    colour: "#e2d6b8",
    position: [x, height * 0.9 + 0.1, z],
    rotation: [Math.PI, 0, 0],
  },
  {
    geometry: new BoxGeometry(0.18, 0.04, 0.005),
    colour: "#2f8a3a",
    position: [x, height * 0.45, z + 0.17],
  },
];

const buildRiceTuft = (x: number, z: number): ModelPart[] =>
  Array.from({ length: 7 }, (_unused, index) => {
    const angle = (index / 7) * Math.PI * 2;
    return [
      {
        geometry: new ConeGeometry(0.012, 0.34, 3),
        colour: index % 2 === 0 ? "#5aa83c" : "#79c24f",
        position: [
          x + Math.cos(angle) * 0.04,
          0.2,
          z + Math.sin(angle) * 0.04,
        ] satisfies Triple,
        rotation: [
          Math.sin(angle) * 0.35,
          0,
          -Math.cos(angle) * 0.35,
        ] satisfies Triple,
      },
      {
        geometry: new SphereGeometry(0.014, 5, 3),
        colour: "#d9c25a",
        position: [
          x + Math.cos(angle) * 0.13,
          0.34,
          z + Math.sin(angle) * 0.13,
        ] satisfies Triple,
        scale: [1, 2, 1] satisfies Triple,
      },
    ];
  }).flat();

const buildRiceBody = (): BufferGeometry =>
  buildModelGeometry([
    ...buildRiceSack(-0.4, -0.1, 0.46),
    ...buildRiceSack(-0.05, -0.18, 0.4),
    {
      geometry: new BoxGeometry(0.46, 0.06, 0.36),
      colour: "#7a5a3a",
      position: [0.36, 0.03, 0.1],
    },
    {
      geometry: new BoxGeometry(0.42, 0.01, 0.32),
      colour: "#5fa8d3",
      position: [0.36, 0.062, 0.1],
    },
    ...buildRiceTuft(0.26, 0.04),
    ...buildRiceTuft(0.46, 0.16),
    ...Array.from({ length: 12 }, (_unused, index) => ({
      geometry: new SphereGeometry(0.016, 5, 3),
      colour: "#fbf8ef",
      position: [
        -0.24 + Math.cos(index * 2.4) * 0.09 * (1 + (index % 3) * 0.4),
        0.012,
        0.2 + Math.sin(index * 2.4) * 0.06,
      ] satisfies Triple,
      rotation: [0, index * 0.9, Math.PI / 2] satisfies Triple,
      scale: [1, 1.9, 1] satisfies Triple,
    })),
  ]);

const buildCocoaPod = (
  position: Triple,
  colour: string,
  rotation: Triple,
): ModelPart => ({
  geometry: new SphereGeometry(0.09, 10, 8),
  colour,
  position,
  rotation,
  scale: [1, 1.9, 1],
  roughen: 0.18,
});

const buildCocoaBody = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.32, 0.24, 0.1, 20),
      colour: "#8a5a32",
      position: [-0.1, 0.05, 0.02],
    },
    buildCocoaPod([-0.26, 0.17, 0.05], "#e0802a", [0, 0.3, Math.PI / 2.2]),
    buildCocoaPod([0.02, 0.17, 0.08], "#e9b93a", [0.2, -0.4, Math.PI / 2.1]),
    buildCocoaPod([-0.12, 0.17, -0.15], "#a8432a", [0, 1.2, Math.PI / 2]),
    buildCocoaPod([-0.12, 0.33, 0.0], "#d9692a", [0.1, -0.2, Math.PI / 2.4]),
    buildCocoaPod([0.45, 0.09, -0.12], "#a8432a", [0, 0.6, Math.PI / 2]),
    {
      geometry: new CylinderGeometry(0.012, 0.012, 0.07, 6),
      colour: "#5a3a1e",
      position: [-0.12, 0.39, 0.16],
      rotation: [Math.PI / 2.4, 0, 0],
    },
    {
      geometry: new SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: "#e0802a",
      position: [0.36, 0.09, 0.22],
      scale: [1, 0.8, 1.6],
      rotation: [Math.PI, 0, 0],
    },
    ...Array.from({ length: 7 }, (_unused, index) => ({
      geometry: new SphereGeometry(0.028, 6, 4),
      colour: "#f2e8d5",
      position: [
        0.36 + ((index % 2) - 0.5) * 0.06,
        0.075,
        0.14 + index * 0.025,
      ] satisfies Triple,
      scale: [1, 0.8, 1.4] satisfies Triple,
    })),
    ...Array.from({ length: 9 }, (_unused, index) => ({
      geometry: new SphereGeometry(0.026, 6, 4),
      colour: "#6b3e26",
      position: [
        0.1 + Math.cos(index * 1.7) * 0.12,
        0.018,
        0.3 + Math.sin(index * 1.7) * 0.06,
      ] satisfies Triple,
      rotation: [0, index, 0] satisfies Triple,
      scale: [1, 0.7, 1.5] satisfies Triple,
    })),
  ]);

const buildCoffeeBody = (): BufferGeometry => {
  const bean = "#4a2c1d";
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.24, 0.28, 0.46, 16),
      colour: "#b89a6a",
      position: [-0.24, 0.23, -0.06],
      roughen: 0.06,
    },
    {
      geometry: new TorusGeometry(0.24, 0.045, 6, 18),
      colour: "#a8895a",
      position: [-0.24, 0.46, -0.06],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new SphereGeometry(0.23, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: bean,
      position: [-0.24, 0.44, -0.06],
      scale: [1, 0.45, 1],
      roughen: 0.15,
    },
    {
      geometry: new BoxGeometry(0.2, 0.08, 0.004),
      colour: "#7a5a3a",
      position: [-0.24, 0.24, 0.21],
    },
    ...Array.from({ length: 10 }, (_unused, index) => ({
      geometry: new SphereGeometry(0.03, 6, 4),
      colour: index % 2 === 0 ? bean : "#5a3622",
      position: [
        0.02 + Math.cos(index * 2.1) * 0.1 * (1 + (index % 3) * 0.3),
        0.02,
        0.2 + Math.sin(index * 2.1) * 0.07,
      ] satisfies Triple,
      rotation: [0, index * 0.7, 0] satisfies Triple,
      scale: [1, 0.65, 1.4] satisfies Triple,
    })),
    buildRod([0.18, 0.04, -0.2], [0.6, 0.06, 0.12], 0.014, "#6b4426", 6),
    ...[0.3, 0.42, 0.52].flatMap((share, cluster) =>
      Array.from({ length: 4 }, (_unused, index) => ({
        geometry: new SphereGeometry(0.036, 8, 6),
        colour: index === 3 && cluster === 1 ? "#4f8f2f" : "#c0182a",
        position: [
          0.18 + share * 0.42 + Math.cos(index * 1.6) * 0.035,
          0.08 + (index % 2) * 0.04,
          -0.2 + share * 0.32 + Math.sin(index * 1.6) * 0.035,
        ] satisfies Triple,
      })),
    ),
    ...[0.22, 0.38, 0.62].map((share, index) => ({
      geometry: new SphereGeometry(0.05, 8, 4),
      colour: "#2f7d3a",
      position: [
        0.18 + share * 0.42,
        0.05,
        -0.2 + share * 0.32 + (index % 2 === 0 ? -0.07 : 0.07),
      ] satisfies Triple,
      rotation: [0, index * 0.9, 0] satisfies Triple,
      scale: [0.9, 0.18, 2] satisfies Triple,
    })),
  ]);
};

const buildBanana = (
  stalk: Triple,
  yaw: number,
  height: number,
): ModelPart[] => {
  const curve = 0.32;
  const outward: Triple = [Math.cos(yaw) * 0.06, 0, -Math.sin(yaw) * 0.06];
  return [
    {
      geometry: new TorusGeometry(curve, 0.034, 6, 10, 0.95),
      colour: "#f4d03f",
      position: [
        stalk[0] + outward[0],
        stalk[1] + height + curve,
        stalk[2] + outward[2],
      ],
      rotation: [0, yaw, -Math.PI / 2],
    },
    {
      geometry: new SphereGeometry(0.02, 6, 4),
      colour: "#4a3a1e",
      position: [
        stalk[0] + outward[0] + Math.cos(yaw) * Math.sin(0.95) * curve,
        stalk[1] + height + curve - Math.cos(0.95) * curve,
        stalk[2] + outward[2] - Math.sin(yaw) * Math.sin(0.95) * curve,
      ],
    },
  ];
};

const buildBananasBody = (): BufferGeometry => {
  const stalk: Triple = [-0.1, 0.0, -0.05];
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.045, 0.055, 0.5, 10),
      colour: "#7a8a3a",
      position: [stalk[0], 0.25, stalk[2]],
      rotation: [0, 0, 0.1],
    },
    ...[0, 1, 2].flatMap((tier) =>
      Array.from({ length: 5 }, (_unused, index) =>
        buildBanana(
          stalk,
          -Math.PI / 2 - 0.9 + index * 0.45 + tier * 0.15,
          0.1 + tier * 0.12,
        ),
      ).flat(),
    ),
    ...[0, 1].flatMap((index) => [
      {
        geometry: new TorusGeometry(0.3, 0.034, 6, 10, 0.95),
        colour: "#f4d03f",
        position: [
          0.32 + index * 0.08,
          0.034,
          0.05 + index * 0.1,
        ] satisfies Triple,
        rotation: [-Math.PI / 2, 0, 2.1 + index * 0.3] satisfies Triple,
      },
    ]),
  ]);
};

const buildTeaBush = (x: number, z: number): ModelPart[] => [
  {
    geometry: new IcosahedronGeometry(0.2, 1),
    colour: "#2f7a35",
    position: [x, 0.19, z],
    scale: [1.35, 0.85, 1],
    roughen: 0.3,
  },
  {
    geometry: new IcosahedronGeometry(0.17, 1),
    colour: "#62b84a",
    position: [x, 0.28, z + 0.02],
    scale: [1.35, 0.45, 0.95],
    roughen: 0.35,
  },
];

const buildTeaBody = (): BufferGeometry =>
  buildModelGeometry([
    ...buildTeaBush(-0.34, -0.2),
    ...buildTeaBush(0.02, -0.21),
    ...buildTeaBush(0.35, -0.2),
    {
      geometry: new CylinderGeometry(0.17, 0.12, 0.2, 14),
      colour: "#b07a3a",
      position: [-0.3, 0.1, 0.2],
    },
    ...[0.05, 0.11, 0.17].map((y) => ({
      geometry: new TorusGeometry(0.135 + y * 0.18, 0.008, 3, 14),
      colour: "#8a5a2a",
      position: [-0.3, y, 0.2] satisfies Triple,
      rotation: [Math.PI / 2, 0, 0] satisfies Triple,
    })),
    {
      geometry: new SphereGeometry(0.16, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: "#4fa83c",
      position: [-0.3, 0.19, 0.2],
      scale: [1, 0.5, 1],
      roughen: 0.3,
    },
    ...Array.from({ length: 5 }, (_unused, index) => ({
      geometry: new SphereGeometry(0.04, 8, 4),
      colour: index % 2 === 0 ? "#3f9a35" : "#62b84a",
      position: [
        -0.05 + index * 0.06,
        0.012,
        0.24 + (index % 2) * 0.06,
      ] satisfies Triple,
      rotation: [0, index * 0.8, 0] satisfies Triple,
      scale: [0.7, 0.15, 1.6] satisfies Triple,
    })),
    {
      geometry: new CylinderGeometry(0.14, 0.14, 0.015, 18),
      colour: "#ffffff",
      position: [0.38, 0.008, 0.2],
    },
    {
      geometry: new CylinderGeometry(0.075, 0.055, 0.1, 16),
      colour: "#ffffff",
      position: [0.38, 0.065, 0.2],
    },
    {
      geometry: new CylinderGeometry(0.068, 0.068, 0.005, 16),
      colour: "#a8632a",
      position: [0.38, 0.11, 0.2],
    },
    {
      geometry: new TorusGeometry(0.03, 0.009, 4, 10),
      colour: "#ffffff",
      position: [0.465, 0.07, 0.2],
    },
  ]);

const buildCottonBoll = (position: Triple): ModelPart[] => [
  {
    geometry: new ConeGeometry(0.05, 0.05, 5),
    colour: "#6b4426",
    position: [position[0], position[1] - 0.04, position[2]],
    rotation: [Math.PI, 0, 0],
  },
  ...[0, 1, 2, 3].map((index) => {
    const angle = (index / 4) * Math.PI * 2;
    return {
      geometry: new IcosahedronGeometry(0.045, 1),
      colour: "#fbfbf6",
      position: [
        position[0] + Math.cos(angle) * 0.035,
        position[1] + (index % 2) * 0.012,
        position[2] + Math.sin(angle) * 0.035,
      ] satisfies Triple,
      isSmooth: true,
    };
  }),
];

const buildCottonBody = (): BufferGeometry => {
  const stems: [Triple, Triple][] = [
    [
      [0.15, 0, -0.05],
      [0.1, 0.55, -0.05],
    ],
    [
      [0.38, 0, -0.12],
      [0.45, 0.48, -0.15],
    ],
  ];
  return buildModelGeometry([
    {
      geometry: new BoxGeometry(0.42, 0.36, 0.5),
      colour: "#f4f2ea",
      position: [-0.36, 0.18, -0.02],
    },
    ...[-0.12, 0, 0.12].map((offset) => ({
      geometry: new BoxGeometry(0.44, 0.37, 0.025),
      colour: "#5a4a3a",
      position: [-0.36, 0.18, -0.02 + offset * 1.6] satisfies Triple,
    })),
    {
      geometry: new BoxGeometry(0.5, 0.04, 0.3),
      colour: "#7a5a3a",
      position: [0.3, 0.02, -0.08],
    },
    ...stems.map(([from, to]) => buildRod(from, to, 0.014, "#6b4426")),
    buildRod([0.12, 0.3, -0.05], [0.25, 0.4, 0.0], 0.01, "#6b4426"),
    buildRod([0.42, 0.25, -0.13], [0.3, 0.33, -0.18], 0.01, "#6b4426"),
    ...buildCottonBoll([0.1, 0.6, -0.05]),
    ...buildCottonBoll([0.27, 0.44, 0.0]),
    ...buildCottonBoll([0.45, 0.53, -0.15]),
    ...buildCottonBoll([0.29, 0.37, -0.19]),
    ...buildCottonBoll([0.0, 0.07, 0.25]),
    ...buildCottonBoll([0.22, 0.07, 0.28]),
    ...[
      [0.2, 0.2, -0.02, 0.8],
      [0.38, 0.34, -0.12, -0.6],
    ].map(([x = 0, y = 0, z = 0, turn = 0]) => ({
      geometry: new SphereGeometry(0.05, 8, 4),
      colour: "#4f8f3a",
      position: [x, y, z] satisfies Triple,
      rotation: [0, turn, 0.4] satisfies Triple,
      scale: [1.4, 0.2, 1] satisfies Triple,
    })),
  ]);
};

const buildFish = (x: number, z: number, turn: number): ModelPart[] => {
  const along: Triple = [Math.cos(turn), 0, -Math.sin(turn)];
  return [
    {
      geometry: new SphereGeometry(0.06, 12, 8),
      colour: "#a9bccb",
      position: [x, 0.13, z],
      rotation: [0, turn, 0],
      scale: [3, 0.6, 1],
    },
    {
      geometry: new SphereGeometry(0.06, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: "#4f6b85",
      position: [x, 0.135, z],
      rotation: [Math.PI / 2, turn, 0],
      scale: [2.9, 0.55, 0.62],
    },
    {
      geometry: new ConeGeometry(0.06, 0.09, 4),
      colour: "#7f98ad",
      position: [x - along[0] * 0.21, 0.13, z - along[2] * 0.21],
      rotation: [0, turn, Math.PI / 2],
      scale: [1, 1, 0.25],
    },
    {
      geometry: new SphereGeometry(0.012, 6, 4),
      colour: "#111111",
      position: [x + along[0] * 0.13, 0.16, z + along[2] * 0.13],
    },
  ];
};

const buildFishBody = (): BufferGeometry => {
  const crateBlue = "#2f80c9";
  return buildModelGeometry([
    {
      geometry: new BoxGeometry(1.06, 0.04, 0.66),
      colour: crateBlue,
      position: [0, 0.02, 0],
    },
    ...[-1, 1].flatMap((side) => [
      {
        geometry: new BoxGeometry(1.06, 0.16, 0.03),
        colour: crateBlue,
        position: [0, 0.1, side * 0.33] satisfies Triple,
      },
      {
        geometry: new BoxGeometry(0.03, 0.16, 0.66),
        colour: crateBlue,
        position: [side * 0.53, 0.1, 0] satisfies Triple,
      },
    ]),
    {
      geometry: new BoxGeometry(1.0, 0.05, 0.6),
      colour: "#e6f3fb",
      position: [0, 0.065, 0],
    },
    ...buildFish(-0.24, -0.18, 0.1),
    ...buildFish(0.22, -0.16, -0.05),
    ...buildFish(-0.22, 0.04, -0.08),
    ...buildFish(0.24, 0.06, 0.12),
    ...buildFish(0.0, 0.2, 0.0),
    ...Array.from({ length: 8 }, (_unused, index) => ({
      geometry: new BoxGeometry(0.05, 0.04, 0.05),
      colour: "#f4fbff",
      position: [
        -0.42 + index * 0.12,
        0.11,
        index % 2 === 0 ? 0.26 : -0.27,
      ] satisfies Triple,
      rotation: [index * 0.3, index * 0.7, 0] satisfies Triple,
    })),
  ]);
};

const buildWaterDrop = (position: Triple, size: number): ModelPart[] => [
  {
    geometry: new SphereGeometry(size, 14, 10),
    colour: "#5ec8f2",
    position,
    isSmooth: true,
  },
  {
    geometry: new ConeGeometry(size * 0.86, size * 1.5, 14, 1, true),
    colour: "#5ec8f2",
    position: [position[0], position[1] + size * 1.2, position[2]],
  },
];

const buildFreshWaterBody = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.24, 0.24, 0.58, 20),
      colour: "#3b7fc4",
      position: [-0.3, 0.29, -0.08],
    },
    ...[0.12, 0.29, 0.46].map((y) => ({
      geometry: new TorusGeometry(0.245, 0.015, 4, 20),
      colour: "#2d63a0",
      position: [-0.3, y, -0.08] satisfies Triple,
      rotation: [Math.PI / 2, 0, 0] satisfies Triple,
    })),
    {
      geometry: new CylinderGeometry(0.1, 0.12, 0.05, 16),
      colour: "#2d63a0",
      position: [-0.3, 0.6, -0.08],
    },
    buildRod([-0.3, 0.12, 0.14], [-0.3, 0.12, 0.26], 0.025, "#c9ced6", 10),
    buildRod([-0.3, 0.12, 0.26], [-0.3, 0.06, 0.28], 0.022, "#c9ced6", 10),
    {
      geometry: new BoxGeometry(0.08, 0.02, 0.02),
      colour: "#d62828",
      position: [-0.3, 0.17, 0.24],
    },
    ...buildWaterDrop([-0.3, 0.03, 0.29], 0.018),
    {
      geometry: new CylinderGeometry(0.16, 0.16, 0.012, 20),
      colour: "#8fd8f7",
      position: [-0.22, 0.006, 0.3],
      scale: [1.3, 1, 0.6],
    },
    ...buildWaterDrop([0.2, 0.14, 0.05], 0.14),
    ...buildWaterDrop([0.46, 0.08, 0.2], 0.08),
    ...buildWaterDrop([0.44, 0.06, -0.2], 0.06),
  ]);

const buildGoldIngot = (position: Triple, turn: number): ModelPart => {
  const ingot = new CylinderGeometry(0.7071, 1, 1, 4, 1);
  ingot.rotateY(Math.PI / 4);
  return {
    geometry: ingot,
    colour: "#f2c230",
    position,
    rotation: [0, turn, 0],
    scale: [0.27 / 1.414, 0.075, 0.13 / 1.414],
  };
};

const buildGoldBody = (): BufferGeometry => {
  const layers = [
    { count: 4, depth: 2 },
    { count: 3, depth: 2 },
    { count: 2, depth: 1 },
  ];
  return buildModelGeometry([
    {
      geometry: new BoxGeometry(1.0, 0.05, 0.56),
      colour: "#4a1c2a",
      position: [0, 0.025, 0],
    },
    ...layers.flatMap(({ count, depth }, layer) =>
      Array.from({ length: count * depth }, (_unused, index) => {
        const column = index % count;
        const row = Math.floor(index / count);
        return buildGoldIngot(
          [
            (column - (count - 1) / 2) * 0.22,
            0.05 + 0.0375 + layer * 0.075,
            (row - (depth - 1) / 2) * 0.15 - 0.04,
          ],
          0,
        );
      }),
    ),
    ...[
      [0.4, 0.2, 0.04],
      [0.32, 0.24, 0.03],
      [0.46, 0.14, 0.035],
      [-0.4, 0.2, 0.04],
    ].map(([x = 0, z = 0, size = 0.03]) =>
      buildLump([x, 0.07, z], size, "#e8b923", [1, 0.7, 1.1]),
    ),
  ]);
};

const buildIronOreBody = (): BufferGeometry => {
  const ore = ["#8b3a1f", "#a0522d", "#6e2c17", "#7a3b26"] as const;
  return buildModelGeometry([
    {
      geometry: new SphereGeometry(0.42, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: ore[2],
      position: [-0.05, 0, -0.05],
      scale: [1.3, 0.75, 0.9],
      roughen: 0.3,
    },
    ...[
      [-0.35, 0.18, 0.1, 0.13],
      [-0.05, 0.32, 0.0, 0.14],
      [0.25, 0.18, 0.05, 0.12],
      [-0.2, 0.26, -0.18, 0.12],
      [0.18, 0.24, -0.2, 0.11],
      [0.05, 0.12, 0.25, 0.1],
      [-0.42, 0.06, 0.28, 0.08],
      [0.5, 0.06, 0.25, 0.09],
      [0.5, 0.05, -0.15, 0.07],
    ].map(([x = 0, y = 0, z = 0, size = 0.05], index) =>
      buildLump([x, y, z], size, ore[index % ore.length] ?? ore[0]),
    ),
    ...[
      [-0.12, 0.42, 0.06],
      [0.15, 0.3, 0.12],
      [-0.3, 0.27, 0.18],
      [0.3, 0.25, -0.08],
    ].map(([x = 0, y = 0, z = 0]) =>
      buildLump([x, y, z], 0.035, "#4a4a52", [1, 1, 1]),
    ),
  ]);
};

const buildCopperBody = (): BufferGeometry => {
  const copper = "#c56a2c";
  const spoolX = -0.25;
  return buildModelGeometry([
    ...[-1, 1].map((side) => ({
      geometry: new CylinderGeometry(0.3, 0.3, 0.04, 22),
      colour: "#b0844f",
      position: [spoolX, 0.3, side * 0.17] satisfies Triple,
      rotation: [Math.PI / 2, 0, 0] satisfies Triple,
    })),
    {
      geometry: new CylinderGeometry(0.22, 0.22, 0.3, 22),
      colour: copper,
      position: [spoolX, 0.3, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
    ...[-0.1, -0.03, 0.04, 0.11].map((z) => ({
      geometry: new TorusGeometry(0.222, 0.012, 4, 22),
      colour: "#d9844a",
      position: [spoolX, 0.3, z] satisfies Triple,
    })),
    ...[0, 1, 2, 3].map((turn) => ({
      geometry: new TorusGeometry(0.14, 0.012, 4, 20),
      colour: copper,
      position: [
        0.3 + turn * 0.012,
        0.015 + turn * 0.024,
        0.12,
      ] satisfies Triple,
      rotation: [Math.PI / 2 + 0.05, 0, 0] satisfies Triple,
    })),
    ...[0, 1, 2].map((index) => ({
      geometry: new CylinderGeometry(0.025, 0.025, 0.7, 10),
      colour: "#d27a3e",
      position: [
        0.15,
        index === 2 ? 0.068 : 0.025,
        index === 2 ? -0.315 : -0.34 + index * 0.05,
      ] satisfies Triple,
      rotation: [0, 0, Math.PI / 2] satisfies Triple,
    })),
    ...[
      [0.42, 0.04, 0.32, 0.05],
      [0.52, 0.035, 0.22, 0.04],
      [0.28, 0.035, 0.34, 0.04],
    ].map(([x = 0, y = 0, z = 0, size = 0.04], index) =>
      buildLump([x, y, z], size, index === 1 ? "#4fa38a" : "#b8642f"),
    ),
  ]);
};

export const resourceModels: Record<Resource, ResourceModel> = {
  oil: { buildBody: buildOilBody, finish: glossy },
  coal: { buildBody: buildCoalBody, finish: glossy },
  "natural-gas": {
    buildBody: buildGasBody,
    finish: glossy,
    moving: {
      motion: "flicker",
      pivot: [0.38, 0.23, 0.08],
      buildPart: buildGasFlame,
    },
  },
  uranium: { buildBody: buildUraniumBody, finish: glossy },
  wind: {
    buildBody: buildWindBody,
    finish: glossy,
    moving: {
      motion: "spin",
      pivot: [turbineHub[0], turbineHub[1], turbineHub[2]],
      buildPart: buildWindRotor,
    },
  },
  solar: {
    buildBody: buildSolarBody,
    finish: { metalness: 0.35, roughness: 0.25 },
  },
  hydro: {
    buildBody: buildHydroBody,
    finish: matte,
    moving: {
      motion: "flicker",
      pivot: [0, 0.12, 0.08],
      buildPart: buildHydroSpray,
    },
  },
  geothermal: {
    buildBody: buildGeothermalBody,
    finish: matte,
    moving: {
      motion: "rise",
      pivot: [0.2, 0.47, -0.05],
      buildPart: buildSteamPuffs,
    },
  },
  timber: { buildBody: buildTimberBody, finish: matte },
  wheat: { buildBody: buildWheatBody, finish: matte },
  rice: { buildBody: buildRiceBody, finish: matte },
  cocoa: { buildBody: buildCocoaBody, finish: glossy },
  coffee: { buildBody: buildCoffeeBody, finish: matte },
  bananas: { buildBody: buildBananasBody, finish: glossy },
  tea: { buildBody: buildTeaBody, finish: matte },
  cotton: { buildBody: buildCottonBody, finish: matte },
  fish: {
    buildBody: buildFishBody,
    finish: { metalness: 0.4, roughness: 0.3 },
  },
  "fresh-water": {
    buildBody: buildFreshWaterBody,
    finish: { metalness: 0.1, roughness: 0.15 },
  },
  gold: { buildBody: buildGoldBody, finish: shiny },
  "iron-ore": { buildBody: buildIronOreBody, finish: matte },
  copper: {
    buildBody: buildCopperBody,
    finish: { metalness: 0.7, roughness: 0.35 },
  },
};
