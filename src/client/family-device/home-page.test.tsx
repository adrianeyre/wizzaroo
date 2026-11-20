import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readAloudLabel } from "../read-aloud-button.js";
import { HomePage } from "./home-page.js";

let root: Root;
let spoken: string[];

const findReadAloudButtons = () =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].filter(
    (button) => button.textContent === readAloudLabel,
  );

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  spoken = [];
  vi.stubGlobal("speechSynthesis", {
    speak: ({ text }: { text: string }) => spoken.push(text),
    cancel: () => undefined,
    getVoices: () => [],
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(readonly text: string) {}
    },
  );
  document.body.innerHTML = "<div id=root></div>";
  const container = document.getElementById("root");
  if (container === null) {
    throw new Error("no root");
  }
  root = createRoot(container);
  act(() => {
    root.render(<HomePage />);
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  vi.unstubAllGlobals();
});

describe("HomePage's Read it to me buttons", () => {
  it("tells each button apart by the heading of the words it reads", () => {
    const headings = findReadAloudButtons().map((button) => {
      const id = button.getAttribute("aria-describedby") ?? "";
      return document.getElementById(id)?.textContent;
    });
    expect(headings).toEqual([
      "Learning that feels like an adventure",
      "11 Subjects, one World Map",
      "Everything a young learner needs, nothing they don't",
      "Made for Children, run by grown-ups",
      "Playing in three steps",
      "Ready for the first adventure?",
    ]);
  });

  it("reads all three steps of How it works, not just its heading", () => {
    const howItWorks = findReadAloudButtons()[4];
    act(() => {
      howItWorks.click();
    });
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toContain("Playing in three steps");
    expect(spoken[0]).toContain("Sign in as a Parent");
    expect(spoken[0]).toContain("Let the adventure begin");
  });
});
