import { describe, expect, it } from "vitest";
import { yearGroups } from "../../curriculum/skills.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  buildParade,
  describeWagon,
  findHintWagon,
  isRightNextWagon,
  isRoundComplete,
  joinTokens,
  listNextTexts,
  listSentenceOrders,
  paradeSentencesByYear,
  sentenceCountByYear,
  shuffleWagons,
  tokeniseSentence,
  type ParadeRound,
  type ParadeWagon,
} from "./sentence-parade.js";

const sortedTexts = (tokens: readonly { text: string }[]) =>
  tokens.map(({ text }) => text).sort();

const keyText = (tokens: readonly { text: string; isKey: boolean }[]) =>
  joinTokens(tokens.filter(({ isKey }) => isKey));

const allSentences = yearGroups.flatMap((yearGroup) =>
  paradeSentencesByYear[yearGroup].map((data) => ({ yearGroup, data })),
);

/** Couples wagons by always taking the first acceptable one in the station. */
const playRound = (round: ParadeRound) => {
  let station: ParadeWagon[] = [...round.wagons];
  const placed: string[] = [];
  while (!isRoundComplete(round, placed)) {
    const next = station.find(({ text }) =>
      isRightNextWagon(round, placed, text),
    );
    if (next === undefined) {
      throw new Error(`Stuck building "${round.prompt}"`);
    }
    placed.push(next.text);
    station = station.filter(({ id }) => id !== next.id);
  }
  return { placed, station };
};

describe("tokeniseSentence", () => {
  it("splits words and each punctuation mark into wagons, keeping capitals", () => {
    expect(tokeniseSentence("I like jam [and] cake.")).toEqual([
      { text: "I", isKey: false },
      { text: "like", isKey: false },
      { text: "jam", isKey: false },
      { text: "and", isKey: true },
      { text: "cake", isKey: false },
      { text: ".", isKey: false },
    ]);
  });

  it("gives speech its own inverted commas wagons and keeps apostrophes", () => {
    expect(
      tokeniseSentence("[“Let's go,”] said Grandpa.").map(({ text }) => text),
    ).toEqual(["“", "Let's", "go", ",", "”", "said", "Grandpa", "."]);
    expect(keyText(tokeniseSentence("[“Let's go,”] said Grandpa."))).toBe(
      "“Let's go,”",
    );
  });

  it("writes tokens back out with punctuation spaced properly", () => {
    for (const { data } of allSentences) {
      expect(joinTokens(tokeniseSentence(data.sentence))).toBe(
        data.sentence.replaceAll(/[[\]]/g, ""),
      );
    }
  });
});

describe("the sentence content", () => {
  it.each(yearGroups)(
    "gives Year %i at least 15 different sentences",
    (yearGroup) => {
      const sentences = paradeSentencesByYear[yearGroup];
      expect(sentences.length).toBeGreaterThanOrEqual(15);
      expect(new Set(sentences.map(({ sentence }) => sentence)).size).toBe(
        sentences.length,
      );
      expect(new Set(sentences.map(({ prompt }) => prompt)).size).toBe(
        sentences.length,
      );
    },
  );

  it("starts every sentence with a capital and ends it with a full stop, question or exclamation mark", () => {
    for (const { data } of allSentences) {
      for (const order of listSentenceOrders(data)) {
        const first = order.find(({ text }) => text !== "“");
        expect(first?.text[0]).toMatch(/[A-Z]/);
        const last = order.at(-1)?.text === "”" ? order.at(-2) : order.at(-1);
        expect([".", "?", "!"]).toContain(last?.text);
      }
    }
  });

  it("makes every alternative order use exactly the same wagons, and differ from the first", () => {
    for (const { data } of allSentences) {
      const [first, ...others] = listSentenceOrders(data);
      for (const other of others) {
        expect(sortedTexts(other)).toEqual(sortedTexts(first));
        expect(joinTokens(other)).not.toBe(joinTokens(first));
      }
    }
  });

  it("highlights a key part in every order of every sentence", () => {
    for (const { data } of allSentences) {
      for (const order of listSentenceOrders(data)) {
        expect(keyText(order)).not.toBe("");
      }
    }
  });

  it("joins Year 1 ideas with and", () => {
    for (const { sentence } of paradeSentencesByYear[1]) {
      expect(keyText(tokeniseSentence(sentence))).toBe("and");
    }
  });

  it("uses Year 2's joining words: and, but, or, because, when, if and that", () => {
    const used = new Set(
      paradeSentencesByYear[2].map(({ sentence }) =>
        keyText(tokeniseSentence(sentence)),
      ),
    );
    expect(
      [...used].every((word) =>
        ["and", "but", "or", "because", "when", "if", "that"].includes(word),
      ),
    ).toBe(true);
    for (const word of ["but", "or", "because", "when", "if", "that"]) {
      expect(used).toContain(word);
    }
  });

  it("shows time and cause in Year 3 with conjunctions, adverbs and prepositions", () => {
    const used = new Set(
      paradeSentencesByYear[3].map(({ sentence }) =>
        keyText(tokeniseSentence(sentence)).toLowerCase(),
      ),
    );
    for (const word of ["when", "before", "after", "while", "so", "because"]) {
      expect(used).toContain(word);
    }
    expect(used).toContain("soon");
    expect(used).toContain("during");
  });

  it("puts a comma after every Year 4 fronted adverbial, or punctuates the speech", () => {
    for (const { sentence } of paradeSentencesByYear[4]) {
      const key = keyText(tokeniseSentence(sentence));
      const isSpeech = key.startsWith("“") && key.endsWith("”");
      const isFrontedAdverbial =
        sentence.startsWith("[") && key.endsWith(",") && !isSpeech;
      expect(isSpeech || isFrontedAdverbial).toBe(true);
      if (isSpeech) {
        expect(key.at(-2)).toMatch(/[,.?!]/);
      }
    }
  });

  it("adds a Year 5 relative clause beginning with who, which or whose", () => {
    for (const { sentence } of paradeSentencesByYear[5]) {
      const key = keyText(tokeniseSentence(sentence)).replace(/^, /, "");
      expect(key).toMatch(/^(who|which|whose) /);
    }
  });

  it("asks for the passive or the active in Year 6, and highlights the verb", () => {
    for (const { prompt, sentence } of paradeSentencesByYear[6]) {
      const key = keyText(tokeniseSentence(sentence));
      if (prompt.includes("passive")) {
        expect(key).toMatch(/^(was|were|is|has) /);
      } else {
        expect(prompt).toContain("active");
        expect(key).not.toMatch(/ by$/);
      }
    }
  });
});

describe("buildParade", () => {
  it.each(yearGroups)(
    "picks the right number of different sentences for Year %i, every one buildable",
    (yearGroup) => {
      for (let seed = 1; seed <= 60; seed++) {
        const rounds = buildParade(yearGroup, buildRandom(seed));
        expect(rounds).toHaveLength(sentenceCountByYear[yearGroup]);
        expect(new Set(rounds.map(({ prompt }) => prompt)).size).toBe(
          rounds.length,
        );
        for (const round of rounds) {
          const [first] = round.orders;
          expect(sortedTexts(round.wagons)).toEqual(sortedTexts(first));
          expect(
            round.orders.some(
              (order) => joinTokens(order) === joinTokens(round.wagons),
            ),
          ).toBe(false);
          const { station } = playRound(round);
          expect(station).toEqual([]);
        }
      }
    },
  );

  it("plays differently with different seeds", () => {
    const first = buildParade(3, buildRandom(1)).map(({ prompt }) => prompt);
    const second = buildParade(3, buildRandom(2)).map(({ prompt }) => prompt);
    expect(first).not.toEqual(second);
  });

  it("keeps every wagon a circus colour", () => {
    const wagons = shuffleWagons(
      [tokeniseSentence("I like jam [and] cake.")],
      buildRandom(4),
    );
    expect(wagons.every(({ colour }) => colour >= 0 && colour < 6)).toBe(true);
  });
});

describe("checking the next wagon", () => {
  const round: ParadeRound = {
    prompt: "Mum said: Come here.",
    orders: listSentenceOrders({
      prompt: "",
      sentence: "[“Come here,”] said Mum.",
      alternatives: ["[“Come here,”] Mum said."],
    }),
    wagons: [],
  };

  it("only couples the right next wagon", () => {
    expect(listNextTexts(round, [])).toEqual(["“"]);
    expect(isRightNextWagon(round, [], "Come")).toBe(false);
    expect(isRightNextWagon(round, ["“", "Come"], "here")).toBe(true);
    expect(isRightNextWagon(round, ["“", "Come"], ",")).toBe(false);
  });

  it("accepts every valid order listed for the sentence", () => {
    const placed = ["“", "Come", "here", ",", "”"];
    expect(listNextTexts(round, placed).sort()).toEqual(["Mum", "said"]);
    expect(isRoundComplete(round, [...placed, "Mum", "said", "."])).toBe(true);
    expect(isRoundComplete(round, [...placed, "said", "Mum", "."])).toBe(true);
    expect(isRoundComplete(round, [...placed, "said", "Mum"])).toBe(false);
  });

  it("accepts both orders of two things joined with and", () => {
    const [data] = paradeSentencesByYear[1];
    const jamRound: ParadeRound = {
      prompt: data.prompt,
      orders: listSentenceOrders(data),
      wagons: [],
    };
    expect(listNextTexts(jamRound, ["I", "like"]).sort()).toEqual([
      "cake",
      "jam",
    ]);
  });

  it("hints the next wagon of the order being built", () => {
    const station: ParadeWagon[] = [
      { id: 0, text: "said", colour: 0 },
      { id: 1, text: "Mum", colour: 1 },
      { id: 2, text: ".", colour: 2 },
    ];
    const placed = ["“", "Come", "here", ",", "”"];
    expect(findHintWagon(round, placed, station)?.text).toBe("said");
    expect(findHintWagon(round, [...placed, "Mum"], station)?.text).toBe(
      "said",
    );
  });

  it("names punctuation wagons in words", () => {
    expect(describeWagon(",")).toBe("comma");
    expect(describeWagon("“")).toBe("opening inverted commas");
    expect(describeWagon("cake")).toBe("cake");
  });
});
