import type { UkNation, UkSea } from "../../curriculum/geography.js";

export type LonLat = readonly [number, number];
export type Outline = readonly LonLat[];

const severnMouth: LonLat = [-2.67, 51.62];
const deeMouth: LonLat = [-3.05, 53.22];
const solwayMouth: LonLat = [-3.06, 54.97];
const berwick: LonLat = [-2.03, 55.79];
const loughFoyle: LonLat = [-7.15, 55.08];
const carlingfordLough: LonLat = [-6.27, 54.08];

const englandEastAndSouthCoast: Outline = [
  [-1.8, 55.68],
  [-1.7, 55.6],
  [-1.57, 55.33],
  [-1.42, 55.01],
  [-1.37, 54.9],
  [-1.18, 54.69],
  [-1.05, 54.6],
  [-0.61, 54.49],
  [-0.39, 54.28],
  [-0.08, 54.12],
  [-0.19, 54.06],
  [-0.16, 53.91],
  [0.12, 53.58],
  [-0.35, 53.71],
  [-0.25, 53.62],
  [0.0, 53.53],
  [0.26, 53.34],
  [0.34, 53.12],
  [0.15, 52.95],
  [0.0, 52.92],
  [0.25, 52.8],
  [0.4, 52.78],
  [0.5, 52.95],
  [0.85, 52.97],
  [1.3, 52.93],
  [1.65, 52.72],
  [1.74, 52.6],
  [1.76, 52.48],
  [1.68, 52.32],
  [1.6, 52.15],
  [1.35, 51.95],
  [1.15, 51.79],
  [0.95, 51.72],
  [0.95, 51.62],
  [0.72, 51.54],
  [0.45, 51.49],
  [0.6, 51.45],
  [0.75, 51.42],
  [1.03, 51.36],
  [1.39, 51.39],
  [1.45, 51.37],
  [1.4, 51.22],
  [1.32, 51.13],
  [1.18, 51.08],
  [0.97, 50.91],
  [0.58, 50.85],
  [0.25, 50.74],
  [-0.14, 50.81],
  [-0.37, 50.8],
  [-0.79, 50.72],
  [-1.1, 50.79],
  [-1.4, 50.84],
  [-1.55, 50.73],
  [-1.88, 50.71],
  [-1.95, 50.6],
  [-2.05, 50.58],
  [-2.45, 50.56],
  [-2.94, 50.71],
  [-3.4, 50.62],
  [-3.52, 50.45],
  [-3.64, 50.22],
  [-4.15, 50.33],
  [-4.64, 50.32],
  [-4.8, 50.22],
  [-5.2, 49.96],
  [-5.45, 50.1],
  [-5.71, 50.06],
  [-5.48, 50.21],
  [-5.08, 50.42],
  [-4.94, 50.55],
  [-4.55, 50.83],
  [-4.53, 51.02],
  [-4.22, 51.05],
  [-4.21, 51.2],
  [-3.95, 51.23],
  [-3.48, 51.21],
  [-3.05, 51.2],
  [-2.98, 51.35],
  [-2.7, 51.5],
];

const walesBorderNorthward: Outline = [
  [-2.65, 51.83],
  [-2.95, 51.95],
  [-3.0, 52.1],
  [-3.15, 52.35],
  [-3.05, 52.55],
  [-3.1, 52.75],
  [-2.73, 52.98],
  [-2.93, 53.08],
];

const englandWestCoast: Outline = [
  [-3.18, 53.39],
  [-3.05, 53.48],
  [-3.02, 53.65],
  [-2.95, 53.73],
  [-3.06, 53.82],
  [-3.01, 53.93],
  [-2.87, 54.05],
  [-2.8, 54.2],
  [-3.05, 54.12],
  [-3.23, 54.06],
  [-3.42, 54.2],
  [-3.64, 54.51],
  [-3.57, 54.65],
  [-3.5, 54.72],
  [-3.4, 54.87],
  [-3.2, 54.95],
];

const scotlandBorderEastward: Outline = [
  [-2.75, 55.13],
  [-2.5, 55.32],
  [-2.2, 55.45],
  [-2.1, 55.62],
];

const walesCoast: Outline = [
  [-2.98, 51.55],
  [-3.16, 51.44],
  [-3.27, 51.38],
  [-3.7, 51.48],
  [-3.95, 51.6],
  [-4.0, 51.56],
  [-4.3, 51.56],
  [-4.4, 51.7],
  [-4.7, 51.66],
  [-4.93, 51.6],
  [-5.1, 51.7],
  [-5.3, 51.88],
  [-4.98, 52.01],
  [-4.67, 52.12],
  [-4.36, 52.21],
  [-4.08, 52.41],
  [-4.05, 52.55],
  [-4.05, 52.72],
  [-4.2, 52.9],
  [-4.41, 52.88],
  [-4.5, 52.8],
  [-4.77, 52.79],
  [-4.6, 52.95],
  [-4.4, 53.02],
  [-4.27, 53.14],
  [-4.13, 53.23],
  [-3.83, 53.32],
  [-3.49, 53.32],
  [-3.32, 53.35],
];

const scotlandCoast: Outline = [
  [-3.3, 54.99],
  [-3.6, 54.88],
  [-4.05, 54.8],
  [-4.4, 54.68],
  [-4.86, 54.64],
  [-5.12, 54.84],
  [-5.16, 55.0],
  [-5.0, 55.1],
  [-4.86, 55.24],
  [-4.63, 55.46],
  [-4.68, 55.61],
  [-4.87, 55.8],
  [-4.75, 55.95],
  [-4.95, 55.97],
  [-5.3, 55.85],
  [-5.45, 55.65],
  [-5.6, 55.43],
  [-5.8, 55.3],
  [-5.72, 55.6],
  [-5.6, 55.85],
  [-5.62, 56.05],
  [-5.5, 56.4],
  [-5.4, 56.55],
  [-6.22, 56.72],
  [-5.83, 57.0],
  [-5.7, 57.28],
  [-5.83, 57.43],
  [-5.7, 57.73],
  [-5.2, 57.92],
  [-5.35, 58.06],
  [-5.15, 58.35],
  [-5.0, 58.62],
  [-4.75, 58.56],
  [-4.4, 58.53],
  [-3.98, 58.57],
  [-3.52, 58.6],
  [-3.37, 58.67],
  [-3.03, 58.64],
  [-3.08, 58.44],
  [-3.65, 58.12],
  [-4.0, 57.87],
  [-3.77, 57.86],
  [-4.1, 57.62],
  [-4.25, 57.5],
  [-3.87, 57.59],
  [-3.28, 57.72],
  [-2.95, 57.68],
  [-2.0, 57.69],
  [-1.82, 57.6],
  [-1.78, 57.5],
  [-2.05, 57.15],
  [-2.2, 56.96],
  [-2.46, 56.7],
  [-2.58, 56.56],
  [-2.75, 56.47],
  [-3.1, 56.42],
  [-2.85, 56.37],
  [-2.58, 56.28],
  [-2.9, 56.2],
  [-3.2, 56.08],
  [-3.7, 56.05],
  [-3.4, 55.99],
  [-3.15, 55.98],
  [-3.0, 55.95],
  [-2.72, 56.06],
  [-2.52, 56.0],
  [-2.13, 55.9],
];

const northernIrelandCoast: Outline = [
  [-7.0, 55.12],
  [-6.92, 55.17],
  [-6.65, 55.21],
  [-6.5, 55.24],
  [-6.15, 55.23],
  [-6.05, 55.2],
  [-5.8, 54.85],
  [-5.75, 54.72],
  [-5.88, 54.64],
  [-5.68, 54.67],
  [-5.45, 54.5],
  [-5.53, 54.33],
  [-5.6, 54.26],
  [-5.85, 54.24],
  [-5.9, 54.2],
  [-6.0, 54.06],
  [-6.2, 54.03],
];

const irishBorderSouthward: Outline = [
  [-7.3, 55.02],
  [-7.42, 54.95],
  [-7.47, 54.83],
  [-7.75, 54.62],
  [-7.95, 54.7],
  [-8.15, 54.47],
  [-7.85, 54.25],
  [-7.6, 54.12],
  [-7.3, 54.13],
  [-7.15, 54.25],
  [-6.95, 54.4],
  [-6.75, 54.3],
  [-6.65, 54.05],
  [-6.45, 54.05],
];

const irelandRepublicCoast: Outline = [
  [-6.35, 54.0],
  [-6.25, 53.85],
  [-6.25, 53.72],
  [-6.12, 53.5],
  [-6.05, 53.38],
  [-6.2, 53.33],
  [-6.0, 52.97],
  [-6.13, 52.8],
  [-6.2, 52.5],
  [-6.36, 52.17],
  [-6.95, 52.15],
  [-7.6, 52.08],
  [-7.85, 51.95],
  [-8.3, 51.8],
  [-8.5, 51.7],
  [-9.0, 51.55],
  [-9.82, 51.45],
  [-9.6, 51.65],
  [-10.15, 51.6],
  [-9.85, 51.8],
  [-10.35, 51.88],
  [-9.9, 52.1],
  [-10.48, 52.1],
  [-10.0, 52.27],
  [-9.7, 52.55],
  [-9.93, 52.56],
  [-9.43, 52.9],
  [-9.0, 53.17],
  [-9.05, 53.27],
  [-9.9, 53.4],
  [-10.15, 53.55],
  [-9.8, 53.8],
  [-10.2, 54.0],
  [-10.0, 54.25],
  [-9.3, 54.3],
  [-8.6, 54.3],
  [-8.4, 54.5],
  [-8.1, 54.62],
  [-8.8, 54.65],
  [-8.8, 54.75],
  [-8.4, 55.0],
  [-8.3, 55.15],
  [-7.95, 55.22],
  [-7.63, 55.27],
  [-7.37, 55.38],
  [-6.93, 55.24],
  [-7.1, 55.17],
];

const reverseOutline = (outline: Outline): LonLat[] => [...outline].reverse();

const englandMainland: Outline = [
  berwick,
  ...englandEastAndSouthCoast,
  severnMouth,
  ...walesBorderNorthward,
  deeMouth,
  ...englandWestCoast,
  solwayMouth,
  ...scotlandBorderEastward,
];

const walesMainland: Outline = [
  severnMouth,
  ...walesCoast,
  deeMouth,
  ...reverseOutline(walesBorderNorthward),
];

const scotlandMainland: Outline = [
  solwayMouth,
  ...scotlandCoast,
  berwick,
  ...reverseOutline(scotlandBorderEastward),
];

const northernIrelandMainland: Outline = [
  loughFoyle,
  ...northernIrelandCoast,
  carlingfordLough,
  ...reverseOutline(irishBorderSouthward),
];

const irelandRepublicMainland: Outline = [
  carlingfordLough,
  ...irelandRepublicCoast,
  loughFoyle,
  ...irishBorderSouthward,
];

const isleOfWight: Outline = [
  [-1.58, 50.67],
  [-1.3, 50.77],
  [-1.08, 50.69],
  [-1.3, 50.58],
];

const anglesey: Outline = [
  [-4.6, 53.3],
  [-4.4, 53.42],
  [-4.05, 53.31],
  [-4.22, 53.18],
  [-4.4, 53.15],
];

const isleOfMan: Outline = [
  [-4.8, 54.07],
  [-4.4, 54.4],
  [-4.33, 54.35],
  [-4.55, 54.06],
];

const scotlandIslands: Outline[] = [
  [
    [-5.35, 55.72],
    [-5.12, 55.6],
    [-5.15, 55.45],
    [-5.38, 55.48],
  ],
  [
    [-6.48, 55.7],
    [-6.12, 55.65],
    [-6.02, 55.9],
    [-6.35, 55.88],
  ],
  [
    [-6.0, 55.85],
    [-5.7, 56.0],
    [-5.85, 56.1],
    [-6.05, 55.95],
  ],
  [
    [-6.35, 56.3],
    [-5.68, 56.4],
    [-5.95, 56.65],
    [-6.25, 56.55],
  ],
  [
    [-6.8, 57.45],
    [-6.3, 57.7],
    [-5.95, 57.5],
    [-5.68, 57.25],
    [-6.05, 57.05],
    [-6.35, 57.2],
  ],
  [
    [-7.1, 57.85],
    [-6.6, 57.9],
    [-6.18, 58.5],
    [-6.6, 58.45],
    [-7.1, 58.15],
  ],
  [
    [-7.55, 57.05],
    [-7.2, 57.15],
    [-7.15, 57.65],
    [-7.5, 57.6],
  ],
  [
    [-3.4, 58.95],
    [-3.15, 59.15],
    [-2.75, 59.05],
    [-2.8, 58.85],
    [-3.2, 58.8],
  ],
];

export const ukNationOutlines: Record<UkNation, Outline[]> = {
  england: [englandMainland, isleOfWight],
  scotland: [scotlandMainland, ...scotlandIslands],
  wales: [walesMainland, anglesey],
  "northern-ireland": [northernIrelandMainland],
};

export const irelandRepublicOutlines: Outline[] = [
  irelandRepublicMainland,
  isleOfMan,
];

export const ukMapBounds = {
  west: -10.9,
  east: 3.0,
  south: 49.4,
  north: 59.5,
} as const;

export const franceCoastOutline: Outline = [
  [-2.0, ukMapBounds.south],
  [-1.95, 49.72],
  [-1.6, 49.65],
  [-1.25, 49.7],
  [-1.15, ukMapBounds.south],
  [0.05, ukMapBounds.south],
  [0.1, 49.45],
  [0.2, 49.7],
  [1.08, 49.93],
  [1.6, 50.35],
  [1.6, 50.73],
  [1.85, 50.95],
  [2.4, 51.05],
  [2.95, 51.25],
  [ukMapBounds.east, 51.27],
  [ukMapBounds.east, ukMapBounds.south],
];

const doverStrait: LonLat = [1.4, 51.0];
const landsEndSouth: LonLat = [-5.7, ukMapBounds.south];
const landsEnd: LonLat = [-5.7, 50.1];
const stDavidsHead: LonLat = [-5.3, 51.88];
const carnsorePoint: LonLat = [-6.4, 52.15];
const mullOfKintyre: LonLat = [-5.75, 55.3];
const torrHead: LonLat = [-6.05, 55.2];
const duncansbyHead: LonLat = [-3.0, 58.65];

const channelNorthShoreInland: Outline = [
  [-4.5, 50.6],
  [-3.0, 50.9],
  [-1.0, 51.1],
  [0.8, 51.15],
];

const irelandEastInland: Outline = [
  [-6.6, 52.6],
  [-6.5, 53.5],
  [-6.3, 54.5],
];

export const ukSeaOutlines: Record<UkSea, Outline> = {
  "north-sea": [
    doverStrait,
    [1.9, 51.0],
    [ukMapBounds.east, 51.3],
    [ukMapBounds.east, ukMapBounds.north],
    [-2.9, ukMapBounds.north],
    duncansbyHead,
    [-4.5, 57.5],
    [-4.0, 56.0],
    [-2.0, 55.0],
    [-1.0, 53.0],
    [0.5, 51.3],
  ],
  "english-channel": [
    landsEndSouth,
    landsEnd,
    ...channelNorthShoreInland,
    doverStrait,
    [1.85, 50.95],
    [2.0, 50.5],
    [0.0, ukMapBounds.south],
  ],
  "irish-sea": [
    carnsorePoint,
    stDavidsHead,
    [-3.7, 52.4],
    [-3.0, 53.0],
    [-2.6, 54.0],
    [-2.5, 54.9],
    [-2.9, 55.1],
    [-4.7, 55.25],
    mullOfKintyre,
    torrHead,
    ...reverseOutline(irelandEastInland),
  ],
  "atlantic-ocean": [
    [ukMapBounds.west, ukMapBounds.south],
    landsEndSouth,
    landsEnd,
    [-4.5, 50.6],
    [-3.2, 50.95],
    [-2.4, 51.6],
    [-4.0, 52.0],
    stDavidsHead,
    carnsorePoint,
    ...irelandEastInland,
    torrHead,
    mullOfKintyre,
    [-5.5, 55.7],
    [-4.5, 56.5],
    [-4.5, 57.5],
    duncansbyHead,
    [-2.9, ukMapBounds.north],
    [ukMapBounds.west, ukMapBounds.north],
  ],
};

export interface UkMountain {
  at: LonLat;
  size: number;
  height: number;
}

export const ukMountains: Record<UkNation | "ireland", UkMountain[]> = {
  scotland: [
    { at: [-5.0, 56.8], size: 0.75, height: 0.5 },
    { at: [-3.65, 57.07], size: 0.8, height: 0.42 },
    { at: [-4.9, 57.6], size: 0.7, height: 0.38 },
    { at: [-4.6, 58.2], size: 0.6, height: 0.3 },
    { at: [-4.2, 56.6], size: 0.6, height: 0.32 },
  ],
  england: [
    { at: [-3.15, 54.48], size: 0.42, height: 0.36 },
    { at: [-2.25, 54.3], size: 0.45, height: 0.24 },
    { at: [-1.95, 53.5], size: 0.38, height: 0.2 },
  ],
  wales: [
    { at: [-3.95, 53.05], size: 0.4, height: 0.38 },
    { at: [-3.75, 52.4], size: 0.5, height: 0.22 },
    { at: [-3.45, 51.88], size: 0.4, height: 0.24 },
  ],
  "northern-ireland": [{ at: [-6.0, 54.18], size: 0.25, height: 0.2 }],
  ireland: [
    { at: [-9.7, 52.0], size: 0.35, height: 0.24 },
    { at: [-6.35, 53.1], size: 0.3, height: 0.18 },
  ],
};

export const ukMapLongitudeScale = Math.cos((54.5 * Math.PI) / 180);

export const getUkMapWidthInDegrees = (): number =>
  (ukMapBounds.east - ukMapBounds.west) * ukMapLongitudeScale;

export const getUkMapHeightInDegrees = (): number =>
  ukMapBounds.north - ukMapBounds.south;

export const getUkMapPoint = (
  [longitude, latitude]: LonLat,
  unitsPerDegree: number,
): [number, number] => {
  const middleLongitude = (ukMapBounds.west + ukMapBounds.east) / 2;
  const middleLatitude = (ukMapBounds.south + ukMapBounds.north) / 2;
  return [
    (longitude - middleLongitude) * ukMapLongitudeScale * unitsPerDegree,
    (latitude - middleLatitude) * unitsPerDegree,
  ];
};
