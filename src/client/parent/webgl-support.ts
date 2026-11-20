let canDraw: boolean | undefined;

/**
 * Whether this browser can draw WebGL, asked once and kept. A browser that can't, or a test's DOM, gets a flat picture
 * instead of a 3D one.
 */
export const canDrawWebGL = (): boolean => {
  if (canDraw === undefined) {
    try {
      const canvas = document.createElement("canvas");
      canDraw =
        (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) !== null;
    } catch {
      canDraw = false;
    }
  }
  return canDraw;
};
