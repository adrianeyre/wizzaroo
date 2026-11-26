import {
  chooseTransport,
  transports,
  type Transport,
} from "./island-journey.js";

export const transportChoiceStorageKey = "wizzaroo.transport";

/** Random, or the one craft the Child wants to fetch them every time. */
export type TransportChoice = "random" | Transport;

export const transportChoices: readonly TransportChoice[] = [
  "random",
  ...transports,
];

export const transportChoiceNames: Record<TransportChoice, string> = {
  random: "Random",
  ship: "Ship",
  aeroplane: "Aeroplane",
  helicopter: "Helicopter",
  hovercraft: "Hovercraft",
  submarine: "Submarine",
  balloon: "Hot-air balloon",
  pirateShip: "Pirate ship",
  jetski: "Jetski",
  rocket: "Rocket",
  portal: "Magic portal",
  dragon: "Dragon",
  blimp: "Blimp",
  scuba: "Scuba diving",
  surfboard: "Surfboard",
  windsurfer: "Windsurfer",
};

const isTransportChoice = (value: unknown): value is TransportChoice =>
  transportChoices.some((choice) => choice === value);

// The Transport the Child picked from the Menu, kept in this browser so the
// same craft comes for them on the World Map and while exploring, and next
// time they play. Random until they pick one.
export const loadTransportChoice = (): TransportChoice => {
  try {
    const stored = localStorage.getItem(transportChoiceStorageKey);
    return isTransportChoice(stored) ? stored : "random";
  } catch {
    return "random";
  }
};

export const storeTransportChoice = (choice: TransportChoice): void => {
  try {
    if (choice === "random") {
      localStorage.removeItem(transportChoiceStorageKey);
      return;
    }
    localStorage.setItem(transportChoiceStorageKey, choice);
  } catch {
    return;
  }
};

/** The craft that comes for the Character: the one chosen, or one at random. */
export const pickTransport = (
  choice: TransportChoice = loadTransportChoice(),
  random: () => number = Math.random,
): Transport => (choice === "random" ? chooseTransport(random) : choice);
