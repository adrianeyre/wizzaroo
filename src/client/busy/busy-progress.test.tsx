import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BusyProgress,
  useBusyAction,
  type BusyAction,
} from "./busy-progress.js";

let root: Root;

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  const container = document.getElementById("root");
  if (container === null) {
    throw new TypeError("No root to render into");
  }
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
});

const show = (element: React.ReactNode) => {
  act(() => {
    root.render(element);
  });
};

const findBar = () => {
  const bar = document.querySelector('[role="progressbar"]');
  if (bar === null) {
    throw new TypeError("No progress bar");
  }
  return bar;
};

describe("BusyProgress", () => {
  it("says what is happening beside a spinner, with a bar that sweeps when how far isn't known", () => {
    show(<BusyProgress label="Saving Bea's limits…" />);

    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      "Saving Bea's limits…",
    );
    expect(document.querySelector(".busy-spinner")).not.toBeNull();
    expect(findBar().getAttribute("aria-label")).toBe("Saving Bea's limits…");
    expect(findBar().hasAttribute("aria-valuenow")).toBe(false);
    expect(findBar().getAttribute("data-indeterminate")).toBe("true");
  });

  it("fills its bar as far as the work has gone, with a line saying what part is happening", () => {
    show(
      <BusyProgress
        label="Getting Meadow Isle ready"
        detail="Making things near you solid: 12 of 48"
        share={0.256}
      />,
    );

    expect(findBar().getAttribute("aria-valuenow")).toBe("26");
    expect(findBar().getAttribute("aria-valuetext")).toBe("26%");
    expect(findBar().hasAttribute("data-indeterminate")).toBe(false);
    expect(document.querySelector(".busy-detail")?.textContent).toBe(
      "Making things near you solid: 12 of 48",
    );
  });
});

describe("useBusyAction", () => {
  it("says what it waits on until the action settles, and won't start a second one meanwhile", async () => {
    let busy: BusyAction | undefined;
    const Probe = () => {
      busy = useBusyAction();
      return busy.busyLabel === undefined ? null : (
        <BusyProgress label={busy.busyLabel} />
      );
    };
    show(<Probe />);
    let finish: (value: string) => void = () => undefined;
    let runs = 0;
    const action = () => {
      runs += 1;
      return new Promise<string>((resolve) => {
        finish = resolve;
      });
    };

    let first: Promise<string | undefined> | undefined;
    act(() => {
      first = busy?.runBusy("Signing you in…", action);
    });
    expect(document.querySelector(".busy-label")?.textContent).toBe(
      "Signing you in…",
    );
    expect(busy?.isBusy).toBe(true);
    let second: Promise<string | undefined> | undefined;
    act(() => {
      second = busy?.runBusy("Signing you in…", action);
    });
    expect(await second).toBeUndefined();
    expect(runs).toBe(1);

    await act(async () => {
      finish("signed in");
      await first;
    });
    expect(await first).toBe("signed in");
    expect(document.querySelector(".busy")).toBeNull();
    expect(busy?.isBusy).toBe(false);
  });

  it("stops saying it is busy when the action fails", async () => {
    let busy: BusyAction | undefined;
    const Probe = () => {
      busy = useBusyAction();
      return null;
    };
    show(<Probe />);

    await act(async () => {
      await expect(
        busy?.runBusy("Saving…", () => Promise.reject(new Error("offline"))),
      ).rejects.toThrow("offline");
    });
    expect(busy?.isBusy).toBe(false);
  });
});
