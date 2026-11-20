import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CheckGameType,
  CheckQuestion,
  CheckResult,
} from "../../curriculum/checks.js";
import {
  phonicsProgrammes,
  type PhonicsProgramme,
} from "../../curriculum/phonics-programmes.js";
import type { PracticeRecord } from "../family-device/family-device-page.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  CheckPlay,
  checkClockTickMs,
  describeCheckQuestionAloud,
  formatTimeLeft,
  type CheckSpokenWord,
} from "./check-play.js";

let root: Root;
let time: number;
let recordPractice: ReturnType<typeof vi.fn<(record: PracticeRecord) => void>>;
let recordCheck: ReturnType<typeof vi.fn<(result: CheckResult) => void>>;
let onFinished: ReturnType<typeof vi.fn<(skillIds: string[]) => void>>;
let spokenWord: CheckSpokenWord;
let phonicsProgramme: PhonicsProgramme | undefined;

const showCheck = (gameType: CheckGameType, isClockOff = false) => {
  act(() => {
    root.render(
      <CheckPlay
        gameType={gameType}
        phonicsProgramme={phonicsProgramme}
        yearGroup={4}
        isClockOff={isClockOff}
        random={buildRandom(11)}
        buildId={() => "activity-1"}
        readTime={() => time}
        spokenWord={spokenWord}
        recordPractice={recordPractice}
        recordCheck={recordCheck}
        onFinished={onFinished}
        leaveButton={<button type="button">Back to the map</button>}
      />,
    );
  });
};

const click = (element: Element | null | undefined) => {
  if (element === null || element === undefined) {
    throw new Error("nothing to click");
  }
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findButton = (name: string) =>
  [...document.querySelectorAll("button")].find((button) =>
    button.textContent.includes(name),
  );

const typeAnswer = (text: string) => {
  const input = document.querySelector<HTMLInputElement>("#check-answer");
  if (input === null) {
    throw new Error("no answer box");
  }
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => {
    input.form?.requestSubmit();
  });
};

const readProduct = () => {
  const prompt = document.querySelector(".check-prompt")?.textContent ?? "";
  const [first, second] = prompt
    .replace("=", "")
    .split("×")
    .map((factor) => Number(factor.trim()));
  return String(first * second);
};

const passTime = (milliseconds: number) => {
  act(() => {
    time += milliseconds;
    vi.advanceTimersByTime(checkClockTickMs);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  time = 1_000_000;
  recordPractice = vi.fn<(record: PracticeRecord) => void>();
  recordCheck = vi.fn<(result: CheckResult) => void>();
  onFinished = vi.fn<(skillIds: string[]) => void>();
  phonicsProgramme = undefined;
  spokenWord = {
    playSpokenWord: vi.fn(() => Promise.resolve(true)),
    prepareSpokenWords: vi.fn(() => Promise.resolve(true)),
  };
  document.body.innerHTML = "";
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  vi.useRealTimers();
});

describe("formatTimeLeft", () => {
  it("shows seconds under a minute and minutes with seconds above", () => {
    expect(formatTimeLeft(5200)).toBe("6s");
    expect(formatTimeLeft(125_000)).toBe("2:05");
    expect(formatTimeLeft(-10)).toBe("0s");
  });
});

describe("CheckPlay", () => {
  it("offers Practice or a Timed Check, saying the real check's clock", () => {
    showCheck("times-tables-check");

    expect(document.querySelector("h1")?.textContent).toBe(
      "Times tables check",
    );
    expect(findButton("Practice")).toBeDefined();
    expect(findButton("Timed check")?.textContent).toContain(
      "6 seconds for each question",
    );
  });

  it("says when a grown-up has turned the clock off", () => {
    showCheck("times-tables-check", true);

    expect(findButton("Timed check")?.textContent).toContain(
      "turned the clock off",
    );
  });

  it("plays the Multiplication Tables Check: warm-up, 25 timed questions, a missed one moving on, then the score and facts to practise", () => {
    showCheck("times-tables-check");
    click(findButton("Timed check"));

    for (let warmUp = 0; warmUp < 3; warmUp += 1) {
      expect(document.querySelector(".check-progress")?.textContent).toContain(
        "Warm-up",
      );
      typeAnswer(readProduct());
    }
    click(findButton("Start the check"));
    expect(
      document
        .querySelector("[role=progressbar]")
        ?.getAttribute("aria-valuenow"),
    ).toBe("6");

    for (let question = 1; question <= 25; question += 1) {
      expect(document.querySelector(".check-progress")?.textContent).toBe(
        `Question ${String(question)} of 25`,
      );
      if (question === 2) {
        passTime(6100);
      } else {
        time += 1500;
        typeAnswer(readProduct());
      }
      if (question < 25) {
        expect(document.querySelector(".check-pause")?.textContent).toBe(
          "Get ready…",
        );
        passTime(3000);
      }
    }

    expect(document.querySelector("#check-result")?.textContent).toBe(
      "You scored 24 out of 25",
    );
    expect(document.querySelectorAll(".check-practise-list li")).toHaveLength(
      1,
    );
    expect(recordCheck).toHaveBeenCalledTimes(1);
    const [[result]] = recordCheck.mock.calls;
    expect(result.checkGameType).toBe("times-tables-check");
    expect(result.isClockOff).toBe(false);
    expect(result.outcomes).toHaveLength(25);
    expect(result.outcomes[1]).toMatchObject({
      isRight: false,
      isInTime: false,
    });
    const records = recordPractice.mock.calls.map(([record]) => record);
    const answered = records.filter(
      (record) => record.kind === "question-answered",
    );
    expect(answered).toHaveLength(25);
    expect(
      answered.every(
        (record) =>
          record.checkAnswer?.checkWay === "timed" &&
          record.checkAnswer.millisecondsTaken >= 0,
      ),
    ).toBe(true);
    expect(answered[0].checkAnswer?.millisecondsTaken).toBe(1500);
    expect(records.filter(({ kind }) => kind === "activity-finished")).toEqual([
      expect.objectContaining({ skillId: "maths.times-tables-to-12" }),
    ]);

    click(findButton("Carry on"));
    expect(onFinished).toHaveBeenCalledWith(["maths.times-tables-to-12"]);
  });

  it("practises with no clock and no Check History, giving a hint after a wrong answer", () => {
    showCheck("times-tables-check");
    click(findButton("Practice"));

    expect(document.querySelector("[role=progressbar]")).toBeNull();
    typeAnswer("0");
    expect(document.querySelector(".check-feedback")?.textContent).toBe(
      "Not quite. Have another go.",
    );
    typeAnswer("1");
    expect(document.querySelector(".check-feedback")?.textContent).toContain(
      "The answer is",
    );
    click(findButton("Next question"));
    expect(document.querySelector(".check-progress")?.textContent).toBe(
      "Question 2 of 25",
    );
    for (let question = 2; question <= 25; question += 1) {
      typeAnswer(readProduct());
    }

    expect(document.querySelector("#check-result")?.textContent).toBe(
      "Practice finished",
    );
    expect(
      recordPractice.mock.calls
        .map(([record]) => record)
        .every(
          (record) =>
            record.kind !== "question-answered" ||
            record.checkAnswer?.checkWay === "practice",
        ),
    ).toBe(true);
    expect(recordCheck).not.toHaveBeenCalled();
  });

  it("has a minus key on the number pad, so a negative answer can be typed without a keyboard", () => {
    showCheck("times-tables-check");
    click(findButton("Practice"));

    click(
      document.querySelector('.check-number-pad [aria-label="minus sign"]'),
    );
    click(
      [...document.querySelectorAll(".check-number-pad button")].find(
        (button) => button.textContent === "6",
      ),
    );
    expect(
      document.querySelector<HTMLInputElement>("#check-answer")?.value,
    ).toBe("−6");
  });

  it("has a grown-up mark the Phonics Screening Check, with every word read aloud and none of it towards Mastery", () => {
    phonicsProgramme = phonicsProgrammes.find(
      ({ id }) => id === "read-write-inc",
    );
    showCheck("phonics-screening-check");
    click(findButton("Do this with a grown-up"));

    expect(document.querySelector(".check-sound-note")?.textContent).toMatch(
      /^For the grown-up: Sounds: .+ \(taught by Set \d in Read Write Inc/,
    );

    expect(document.querySelector("[role=progressbar]")).toBeNull();
    for (let word = 1; word <= 20; word += 1) {
      expect(document.querySelector(".check-read-word")?.textContent).not.toBe(
        "",
      );
      click(findButton(word === 3 ? "Not this time" : "Read it right"));
    }

    expect(document.querySelector("#check-result")?.textContent).toBe(
      "You scored 19 out of 20",
    );
    const records = recordPractice.mock.calls.map(([record]) => record);
    expect(records.filter(({ kind }) => kind === "question-answered")).toEqual(
      [],
    );
    expect(
      records.filter(({ kind }) => kind === "activity-finished"),
    ).toHaveLength(1);
    expect(recordCheck).toHaveBeenCalledTimes(1);
    click(findButton("Carry on"));
    expect(onFinished).toHaveBeenCalledWith([]);
  });

  it("practises Phonics alone, telling real words from alien ones", () => {
    showCheck("phonics-screening-check");
    click(findButton("Practice"));

    expect(
      [...document.querySelectorAll(".check-choice")].map(
        ({ textContent }) => textContent,
      ),
    ).toEqual(["Real word", "Alien word"]);
  });

  it("says the Spelling paper needs the internet the first time, rather than starting without its spoken words", async () => {
    spokenWord.prepareSpokenWords = vi.fn(() => Promise.resolve(false));
    showCheck("spelling-check");

    await act(async () => {
      findButton("Timed check")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(document.querySelector("[role=alert]")?.textContent).toContain(
      "need the internet the first time",
    );
    expect(document.querySelector(".check-progress")).toBeNull();
  });

  it("shows how many of the paper's spoken words are ready while it gets them, and can't be started twice meanwhile", async () => {
    let finishPreparing: (isReady: boolean) => void = () => undefined;
    let reportProgress: (readyCount: number, wordCount: number) => void = () =>
      undefined;
    spokenWord.prepareSpokenWords = vi.fn(
      (
        _spokenWords: readonly string[],
        onProgress?: (readyCount: number, wordCount: number) => void,
      ) =>
        new Promise<boolean>((resolve) => {
          reportProgress = onProgress ?? reportProgress;
          finishPreparing = resolve;
        }),
    );
    showCheck("spelling-check");

    click(findButton("Timed check"));
    const progress = () => document.querySelector(".check-card .busy");
    expect(progress()?.querySelector(".busy-label")?.textContent).toBe(
      "Getting this paper's spoken words ready…",
    );
    expect(
      progress()
        ?.querySelector("[role=progressbar]")
        ?.hasAttribute("data-indeterminate"),
    ).toBe(true);
    expect(findButton("Timed check")?.disabled).toBe(true);
    expect(findButton("Practice")?.disabled).toBe(true);
    expect(
      document.querySelector(".check-card")?.getAttribute("aria-busy"),
    ).toBe("true");

    act(() => {
      reportProgress(5, 20);
    });
    expect(progress()?.querySelector(".busy-detail")?.textContent).toBe(
      "5 of 20 words ready",
    );
    expect(
      progress()
        ?.querySelector("[role=progressbar]")
        ?.getAttribute("aria-valuenow"),
    ).toBe("25");
    click(findButton("Practice"));
    expect(spokenWord.prepareSpokenWords).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishPreparing(true);
      await Promise.resolve();
    });
    expect(document.querySelector(".busy")).toBeNull();
    expect(
      document.querySelector(".check-card")?.hasAttribute("aria-busy"),
    ).toBe(false);
    expect(spokenWord.playSpokenWord).toHaveBeenCalledTimes(1);
  });

  it("speaks each Spelling word once its audio is ready, and again on request", async () => {
    showCheck("spelling-check");

    await act(async () => {
      findButton("Timed check")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(spokenWord.prepareSpokenWords).toHaveBeenCalledTimes(1);
    expect(spokenWord.playSpokenWord).toHaveBeenCalledTimes(1);
    click(findButton("Hear it again"));
    expect(spokenWord.playSpokenWord).toHaveBeenCalledTimes(2);
  });
});

describe("describeCheckQuestionAloud", () => {
  const buildQuestion = (
    prompt: string,
    answerShape: CheckQuestion["answerShape"],
    spokenWord?: string,
  ): CheckQuestion => ({
    key: prompt,
    skillId: "maths.times-tables",
    questionType: "number",
    prompt,
    passage: undefined,
    spokenWord,
    answerShape,
    choices: [],
    acceptedAnswers: [],
  });

  it("reads a maths or grammar question", () => {
    expect(
      describeCheckQuestionAloud(
        "times-tables-check",
        buildQuestion("7 × 8 =", "number"),
      ),
    ).toBe("7 × 8 =");
  });

  it("never reads the words a Child reads in the Phonics Screening Check, or a spelling word", () => {
    expect(
      describeCheckQuestionAloud(
        "phonics-screening-check",
        buildQuestion("strom", "choice"),
      ),
    ).toBeUndefined();
    expect(
      describeCheckQuestionAloud(
        "phonics-screening-check",
        buildQuestion("chip", "read-aloud"),
      ),
    ).toBeUndefined();
    expect(
      describeCheckQuestionAloud(
        "spelling-check",
        buildQuestion("The ___ is red.", "words", "The word is ball."),
      ),
    ).toBeUndefined();
  });
});
