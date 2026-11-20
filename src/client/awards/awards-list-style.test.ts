import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const theme = readFileSync(join(process.cwd(), "src/client/theme.css"), "utf8");

describe("the Awards window's list", () => {
  it("shows the Awards as cards in a grid, with no bullet points", () => {
    const style = document.createElement("style");
    style.textContent = theme;
    document.head.append(style);
    document.body.innerHTML = `
      <div class="modal-dialog-body">
        <ul class="awards-list">
          <li class="award won">Meadow Fair Hero</li>
          <li class="award not-won">Northern Lights Hero</li>
        </ul>
      </div>`;
    const list = document.querySelector(".awards-list");
    const [won, notWon] = Array.from(document.querySelectorAll("li.award"));
    if (list === null) {
      throw new Error("no Awards list");
    }

    expect(getComputedStyle(list).getPropertyValue("list-style")).toBe("none");
    expect(getComputedStyle(list).display).toBe("grid");
    expect(getComputedStyle(won).display).toBe("grid");
    expect(getComputedStyle(notWon).display).toBe("grid");
    style.remove();
  });
});
