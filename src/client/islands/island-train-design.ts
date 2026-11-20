import { trainModel as emberDiesel } from "./trains/ember-diesel.js";
import { trainModel as frostElectric } from "./trains/frost-electric.js";
import { trainModel as jungleDiesel } from "./trains/jungle-diesel.js";
import { trainModel as meadowSteam } from "./trains/meadow-steam.js";
import { trainModel as starfallBiMode } from "./trains/starfall-bi-mode.js";
import { trainModel as sunscorchHighSpeed } from "./trains/sunscorch-high-speed.js";
import type {
  TrainModel,
  TrainVehicleModel,
  Triple,
} from "./trains/train-kit.js";

export const trainStyles = [
  "steam",
  "electric",
  "high-speed-diesel",
  "mainline-diesel",
  "mixed-traffic-diesel",
  "bi-mode",
] as const;

export type TrainStyle = (typeof trainStyles)[number];

export interface TrainDesign {
  style: TrainStyle;
  name: string;
  engine: string;
  carriages: string;
  locomotive: TrainVehicleModel;
  tender?: TrainVehicleModel;
  carriage: TrainVehicleModel;
  carriageCount: number;
  couplingGap: number;
  chimney?: Triple;
  pantograph?: { z: number; top: number };
}

export class UnknownIslandTrainError extends Error {
  override name = "UnknownIslandTrainError";
}

const couplingGap = 0.06;

export const mapTrainScale = 2.6;

const describeTrain = (
  style: TrainStyle,
  name: string,
  engine: string,
  carriages: string,
  model: TrainModel,
): TrainDesign => ({ style, name, engine, carriages, couplingGap, ...model });

export const trainDesigns: Record<TrainStyle, TrainDesign> = {
  steam: describeTrain(
    "steam",
    "the Meadow Steam Express",
    "an apple-green express steam locomotive and its tender",
    "varnished teak corridor coaches",
    meadowSteam,
  ),
  electric: describeTrain(
    "electric",
    "the Frost Peak Electric",
    "a high-speed electric locomotive, powered from overhead wires",
    "smooth navy express coaches",
    frostElectric,
  ),
  "high-speed-diesel": describeTrain(
    "high-speed-diesel",
    "the Sunscorch Desert Flyer",
    "a high-speed diesel power car with a long wedge nose",
    "grey and cream express coaches",
    sunscorchHighSpeed,
  ),
  "mainline-diesel": describeTrain(
    "mainline-diesel",
    "the Jungle Reach Express",
    "a two-tone green mainline diesel locomotive",
    "carmine and cream coaches",
    jungleDiesel,
  ),
  "mixed-traffic-diesel": describeTrain(
    "mixed-traffic-diesel",
    "the Ember Valley Growler",
    "a blue diesel locomotive with a nose at each end",
    "blue and grey coaches",
    emberDiesel,
  ),
  "bi-mode": describeTrain(
    "bi-mode",
    "the Starfall Star Glider",
    "a sleek modern bi-mode high-speed train",
    "midnight-blue coaches with a gold stripe",
    starfallBiMode,
  ),
};

export const trainStyleByIsland: Readonly<Record<string, TrainStyle>> = {
  "meadow-isle": "steam",
  "frost-isle": "electric",
  "sunscorch-sands": "high-speed-diesel",
  "jungle-reach": "mainline-diesel",
  "ember-isle": "mixed-traffic-diesel",
  "starfall-isle": "bi-mode",
};

export const findIslandTrain = (islandId: string): TrainDesign => {
  const style = Object.hasOwn(trainStyleByIsland, islandId)
    ? trainStyleByIsland[islandId]
    : undefined;
  if (style === undefined) {
    throw new UnknownIslandTrainError(
      `There is no train on Island "${islandId}"`,
    );
  }
  return trainDesigns[style];
};

export type TrainVehicleKind = "locomotive" | "tender" | "carriage";

export interface TrainVehicle {
  kind: TrainVehicleKind;
  model: TrainVehicleModel;
}

export const listTrainVehicles = (design: TrainDesign): TrainVehicle[] => [
  { kind: "locomotive", model: design.locomotive },
  ...(design.tender === undefined
    ? []
    : [{ kind: "tender" as const, model: design.tender }]),
  ...Array.from({ length: design.carriageCount }, () => ({
    kind: "carriage" as const,
    model: design.carriage,
  })),
];

export const findFirstCarriageIndex = (design: TrainDesign): number =>
  design.tender === undefined ? 1 : 2;
