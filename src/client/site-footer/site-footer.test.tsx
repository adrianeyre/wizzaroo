import { act } from "react";
import { minimisedGroupsStorageKey } from "../minimised-groups.js";
import { popupPositionsStorageKey } from "../popup-positions.js";
import { readAloudVoiceStorageKey } from "../voice-over/read-aloud-voices.js";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { releasesUrl, repositoryUrl } from "./links.js";
import { SiteFooter } from "./site-footer.js";

const findButtonNamed = (name: string): HTMLButtonElement => {
  const button = [...document.querySelectorAll("button")].find(
    (candidate) =>
      (candidate.getAttribute("aria-label") ?? candidate.textContent) === name,
  );
  if (button === undefined) {
    throw new Error(`no button named ${name}`);
  }
  return button;
};

const findOpenDialog = (): HTMLDialogElement | null =>
  document.querySelector("dialog[open]");

const findDialogTitle = (dialog: HTMLDialogElement): string | null => {
  const titleId = dialog.getAttribute("aria-labelledby");
  return titleId === null
    ? null
    : (document.getElementById(titleId)?.textContent ?? null);
};

describe("SiteFooter", () => {
  let root: Root;

  beforeEach(() => {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(<SiteFooter />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
  });

  it("is a labelled navigation inside the page's footer, with the design credit, the version linking to the releases, and the policies", () => {
    const nav = document.querySelector("footer nav");
    expect(nav?.getAttribute("aria-label")).toBe("About Wizzaroo");
    const links = [...(nav?.querySelectorAll("a") ?? [])];
    const credit = links.at(0);
    const version = links.at(1);
    expect(credit?.getAttribute("href")).toBe(repositoryUrl);
    expect(credit?.getAttribute("target")).toBe("_blank");
    expect(credit?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(credit?.textContent).toBe(
      "Website design, source on GitHub, opens in a new tab",
    );
    expect(version?.getAttribute("href")).toBe(releasesUrl);
    expect(version?.getAttribute("target")).toBe("_blank");
    expect(version?.textContent).toBe(
      `Version: ${__APP_VERSION__}, changelog, opens in a new tab`,
    );
    expect(
      [...(nav?.querySelectorAll("button") ?? [])].map(
        (button) => button.textContent,
      ),
    ).toEqual([
      "Credits",
      "Privacy Policy",
      "Terms and Conditions",
      "Cookie Policy",
      "Accessibility",
    ]);
  });

  it.each([
    ["Credits", "Credits", "Close credits"],
    ["Privacy Policy", "Privacy Policy", "Close privacy policy"],
    [
      "Terms and Conditions",
      "Terms and Conditions",
      "Close terms and conditions",
    ],
    ["Cookie Policy", "Cookie Policy", "Close cookie policy"],
    ["Accessibility", "Accessibility", "Close accessibility statement"],
  ])(
    "opens %s in a modal dialog titled %s, focusing its close button, and hands focus back when closed",
    (openerName, title, closeLabel) => {
      const opener = findButtonNamed(openerName);
      expect(opener.getAttribute("aria-haspopup")).toBe("dialog");
      opener.focus();
      act(() => {
        opener.click();
      });

      const dialog = findOpenDialog();
      expect(dialog).not.toBeNull();
      if (dialog === null) {
        return;
      }
      expect(findDialogTitle(dialog)).toBe(title);
      expect(document.activeElement).toBe(findButtonNamed(closeLabel));
      const body = dialog.querySelector('[role="region"]');
      expect(body?.getAttribute("tabindex")).toBe("0");

      act(() => {
        findButtonNamed(closeLabel).click();
      });
      expect(findOpenDialog()).toBeNull();
      expect(document.activeElement).toBe(opener);
    },
  );

  it("credits Adrian Eyre first, then the voice, fonts and software Wizzaroo is built with, each with its licence", () => {
    act(() => {
      findButtonNamed("Credits").click();
    });
    const dialog = findOpenDialog();
    const items = [...(dialog?.querySelectorAll(".credits-list li") ?? [])];
    expect(items[0]?.textContent).toContain("Adrian Eyre");
    expect(dialog?.querySelector("h3")?.textContent).toBe("Created by");
    const text = dialog?.textContent ?? "";
    for (const name of [
      "three.js",
      "React",
      "Fastify",
      "Baloo 2",
      "Nunito",
      "Piper",
      "Bryce Beattie",
      "Jenny",
      "VCTK",
      "SEMAINE",
      "Alba",
      "OpenSLR 83",
      "ONNX Runtime Web",
      "eSpeak NG",
    ]) {
      expect(text).toContain(name);
    }
    expect(items.every((item) => item.textContent.includes("Licence:"))).toBe(
      true,
    );
  });

  it("closes a dialog with Escape and with its Close button", () => {
    act(() => {
      findButtonNamed("Cookie Policy").click();
    });
    act(() => {
      findOpenDialog()?.dispatchEvent(
        new Event("cancel", { cancelable: true }),
      );
    });
    expect(findOpenDialog()).toBeNull();

    act(() => {
      findButtonNamed("Cookie Policy").click();
    });
    act(() => {
      findButtonNamed("Close").click();
    });
    expect(findOpenDialog()).toBeNull();
  });

  it("lists every cookie and browser store in a captioned table, with no scrolling box of its own", () => {
    act(() => {
      findButtonNamed("Cookie Policy").click();
    });
    const table = findOpenDialog()?.querySelector("table");
    expect(table?.querySelector("caption")?.textContent).toBe(
      "Cookies and browser storage Wizzaroo uses",
    );
    expect(
      [...(table?.querySelectorAll('tbody th[scope="row"]') ?? [])].map(
        (cell) => cell.textContent,
      ),
    ).toContain("__Host-wizzaroo_sign_in");
    expect(
      [...(table?.querySelectorAll('tbody th[scope="row"]') ?? [])].map(
        (cell) => cell.textContent,
      ),
    ).toContain(popupPositionsStorageKey);
    expect(
      [...(table?.querySelectorAll('tbody th[scope="row"]') ?? [])].map(
        (cell) => cell.textContent,
      ),
    ).toContain(minimisedGroupsStorageKey);
    expect(
      [...(table?.querySelectorAll('tbody th[scope="row"]') ?? [])].map(
        (cell) => cell.textContent,
      ),
    ).toContain(readAloudVoiceStorageKey);
    expect(table?.closest(".table-scroll")).toBeNull();
  });
});
