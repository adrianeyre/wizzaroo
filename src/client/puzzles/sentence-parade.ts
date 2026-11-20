import type { YearGroup } from "../../curriculum/skills.js";
import {
  paradeSentencesByYear,
  type ParadeSentenceData,
} from "./sentence-parade-content.js";
import { shuffle } from "./shuffle.js";

export { paradeSentencesByYear, type ParadeSentenceData };

/** A word or punctuation mark, and whether it is part of the Skill's key part. */
export interface ParadeToken {
  text: string;
  isKey: boolean;
}

export interface ParadeWagon {
  id: number;
  text: string;
  colour: number;
}

export interface ParadeRound {
  prompt: string;
  /** Every valid order of the wagons; the first is the one the content gives. */
  orders: readonly (readonly ParadeToken[])[];
  /** The wagons waiting in the station, shuffled. */
  wagons: readonly ParadeWagon[];
}

export const sentenceCountByYear: Record<YearGroup, number> = {
  1: 5,
  2: 5,
  3: 5,
  4: 6,
  5: 6,
  6: 6,
};

export const wagonColourCount = 6;

const punctuationMarks = new Set([",", ".", "?", "!", "“", "”"]);

const isWordCharacter = (character: string): boolean =>
  /[\p{L}\p{N}'’-]/u.test(character);

/**
 * Splits a marked-up sentence into wagons. Words keep their apostrophes and
 * capital letters; each punctuation mark is a wagon of its own; [square
 * brackets] mark the Skill's key part.
 */
export const tokeniseSentence = (marked: string): ParadeToken[] => {
  const tokens: ParadeToken[] = [];
  let word = "";
  let wordIsKey = false;
  let isKey = false;
  const flush = () => {
    if (word !== "") {
      tokens.push({ text: word, isKey: wordIsKey });
      word = "";
    }
  };
  for (const character of marked) {
    if (character === "[" || character === "]") {
      flush();
      isKey = character === "[";
    } else if (isWordCharacter(character)) {
      if (word === "") {
        wordIsKey = isKey;
      }
      word += character;
    } else if (punctuationMarks.has(character)) {
      flush();
      tokens.push({ text: character, isKey });
    } else if (character === " ") {
      flush();
    } else {
      throw new Error(`Unexpected character "${character}" in "${marked}"`);
    }
  }
  flush();
  return tokens;
};

const punctuationNames: Record<string, string> = {
  ",": "comma",
  ".": "full stop",
  "?": "question mark",
  "!": "exclamation mark",
  "“": "opening inverted commas",
  "”": "closing inverted commas",
};

export const isPunctuationWagon = (text: string): boolean =>
  punctuationMarks.has(text);

export const describeWagon = (text: string): string =>
  punctuationNames[text] ?? text;

const hasNoSpaceBefore = (text: string): boolean =>
  [",", ".", "?", "!", "”"].includes(text);

/** Writes tokens out as a sentence, spacing the punctuation properly. */
export const joinTokens = (tokens: readonly { text: string }[]): string =>
  tokens
    .map(({ text }, index) => {
      const previous = tokens[index - 1]?.text;
      const needsSpace =
        index > 0 && !hasNoSpaceBefore(text) && previous !== "“";
      return `${needsSpace ? " " : ""}${text}`;
    })
    .join("");

export const listSentenceOrders = (data: ParadeSentenceData): ParadeToken[][] =>
  [data.sentence, ...(data.alternatives ?? [])].map(tokeniseSentence);

const isSameOrder = (
  first: readonly { text: string }[],
  second: readonly { text: string }[],
): boolean =>
  first.length === second.length &&
  first.every(({ text }, index) => second[index]?.text === text);

const shuffleTries = 30;

/** Shuffles the wagons so the station never shows a finished sentence. */
export const shuffleWagons = (
  orders: readonly (readonly ParadeToken[])[],
  random: () => number,
): ParadeWagon[] => {
  const first = orders.at(0);
  if (first === undefined) {
    return [];
  }
  let texts = first.map(({ text }) => text);
  for (let attempt = 0; attempt < shuffleTries; attempt++) {
    texts = shuffle(texts, random);
    const wagons = texts.map((text) => ({ text }));
    if (!orders.some((order) => isSameOrder(order, wagons))) {
      break;
    }
  }
  const colourStart = Math.floor(random() * wagonColourCount);
  return texts.map((text, id) => ({
    id,
    text,
    colour: (colourStart + id) % wagonColourCount,
  }));
};

export const buildParade = (
  yearGroup: YearGroup,
  random: () => number,
): ParadeRound[] =>
  shuffle(paradeSentencesByYear[yearGroup], random)
    .slice(0, sentenceCountByYear[yearGroup])
    .map((data) => {
      const orders = listSentenceOrders(data);
      return {
        prompt: data.prompt,
        orders,
        wagons: shuffleWagons(orders, random),
      };
    });

const startsWith = (
  order: readonly ParadeToken[],
  placed: readonly string[],
): boolean => placed.every((text, index) => order[index]?.text === text);

/** The first valid order that the coupled wagons so far agree with. */
export const findMatchingOrder = (
  round: ParadeRound,
  placed: readonly string[],
): readonly ParadeToken[] | undefined =>
  round.orders.find((order) => startsWith(order, placed));

/** Every wagon text that may couple next. */
export const listNextTexts = (
  round: ParadeRound,
  placed: readonly string[],
): string[] => [
  ...new Set(
    round.orders
      .filter((order) => startsWith(order, placed))
      .flatMap((order) => {
        const next = order.at(placed.length);
        return next === undefined ? [] : [next.text];
      }),
  ),
];

export const isRightNextWagon = (
  round: ParadeRound,
  placed: readonly string[],
  text: string,
): boolean => listNextTexts(round, placed).includes(text);

export const isRoundComplete = (
  round: ParadeRound,
  placed: readonly string[],
): boolean =>
  round.orders.some(
    (order) => order.length === placed.length && startsWith(order, placed),
  );

/** The station wagon a hint couples next, if any is left. */
export const findHintWagon = (
  round: ParadeRound,
  placed: readonly string[],
  station: readonly ParadeWagon[],
): ParadeWagon | undefined => {
  const nextText = findMatchingOrder(round, placed)?.[placed.length]?.text;
  return station.find(({ text }) => text === nextText);
};
