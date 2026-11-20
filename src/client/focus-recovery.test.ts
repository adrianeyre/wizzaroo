import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startFocusRecovery } from "./focus-recovery.js";

const waitForMutations = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const buildElement = (html: string): HTMLElement => {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const element = template.content.firstElementChild;
  if (!(element instanceof HTMLElement)) {
    throw new Error("the HTML has no element");
  }
  return element;
};

describe("startFocusRecovery", () => {
  let root: HTMLElement;
  let stopFocusRecovery: () => void;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.append(root);
    stopFocusRecovery = startFocusRecovery(root);
  });

  afterEach(() => {
    stopFocusRecovery();
    document.body.replaceChildren();
  });

  it("moves focus to the heading of the view that replaced the focused button", async () => {
    root.append(
      buildElement('<main><button type="button">Bea</button></main>'),
    );
    root.querySelector("button")?.focus();

    root.replaceChildren(
      buildElement(
        '<main><h1>Hello, Bea!</h1><button type="button">Let\'s play</button></main>',
      ),
    );
    await waitForMutations();

    expect(document.activeElement?.textContent).toBe("Hello, Bea!");
    expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
  });

  it("prefers a message the new view shows, so it is read out", async () => {
    const form = buildElement(
      '<form><h1>Reset your password</h1><button type="submit">Email me a link</button><button type="button">Back</button></form>',
    );
    root.append(form);
    form.querySelector("button")?.focus();

    form
      .querySelector('button[type="submit"]')
      ?.replaceWith(buildElement('<p role="status">A link is on its way.</p>'));
    await waitForMutations();

    expect(document.activeElement?.textContent).toBe("A link is on its way.");
  });

  it("moves focus to the next choice left when the chosen one disappears", async () => {
    const choices = buildElement(
      '<div><button type="button">3</button><button type="button">7</button></div>',
    );
    root.append(choices);
    choices.querySelector("button")?.focus();

    choices.querySelector("button")?.remove();
    await waitForMutations();

    expect(document.activeElement?.textContent).toBe("7");
  });

  it("leaves focus alone while the focused element is still there", async () => {
    root.append(
      buildElement('<div><button type="button">Stay</button><p>News</p></div>'),
    );
    const stay = root.querySelector("button");
    stay?.focus();

    root.querySelector("p")?.remove();
    await waitForMutations();

    expect(document.activeElement).toBe(stay);
  });
});
