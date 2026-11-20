import ReactThreeTestRenderer from "@react-three/test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FirstFrameSignal } from "./world.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FirstFrameSignal", () => {
  it("says the scene is drawn once, after its first frame", async () => {
    const waitingForNextFrame: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      waitingForNextFrame.push(callback);
      return waitingForNextFrame.length;
    });
    const onDrawn = vi.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <FirstFrameSignal onDrawn={onDrawn} />,
    );

    expect(onDrawn).not.toHaveBeenCalled();
    await renderer.advanceFrames(3, 1 / 60);
    expect(waitingForNextFrame).toHaveLength(1);
    expect(onDrawn).not.toHaveBeenCalled();

    waitingForNextFrame[0](0);
    expect(onDrawn).toHaveBeenCalledTimes(1);
    await renderer.unmount();
  });
});
