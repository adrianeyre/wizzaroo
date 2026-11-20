import { Euler, Quaternion, SphereGeometry, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { globeHighlights } from "../../curriculum/geography.js";
import {
  findGlobeRing,
  getGlobeSpin,
  getGlobeTilt,
  getGlobeView,
  getHemisphereAxis,
  getSurfaceDirection,
  type GlobeView,
} from "./globe-geometry.js";

const turnToFace = (view: GlobeView, direction: Vector3) => {
  const spin = new Quaternion().setFromEuler(
    new Euler(0, getGlobeSpin(view), 0),
  );
  const tilt = new Quaternion().setFromEuler(
    new Euler(getGlobeTilt(view), 0, 0),
  );
  return direction.clone().applyQuaternion(spin).applyQuaternion(tilt);
};

const expectSameDirection = (actual: Vector3, expected: Vector3) => {
  expect(actual.x).toBeCloseTo(expected.x, 5);
  expect(actual.y).toBeCloseTo(expected.y, 5);
  expect(actual.z).toBeCloseTo(expected.z, 5);
};

describe("the globe's geometry", () => {
  it("puts longitude 0 on the equator facing the camera, east to the right and north up", () => {
    expectSameDirection(
      getSurfaceDirection(0, 0, new Vector3()),
      new Vector3(0, 0, 1),
    );
    expectSameDirection(
      getSurfaceDirection(0, 90, new Vector3()),
      new Vector3(1, 0, 0),
    );
    expectSameDirection(
      getSurfaceDirection(90, 0, new Vector3()),
      new Vector3(0, 1, 0),
    );
  });

  it("matches the sphere's texture, so a place is painted where its pin stands", () => {
    const sphere = new SphereGeometry(1, 8, 4, -Math.PI / 2);
    const positions = sphere.getAttribute("position");
    const uvs = sphere.getAttribute("uv");
    for (let index = 0; index < positions.count; index++) {
      const latitude = (uvs.getY(index) - 0.5) * 180;
      const longitude = uvs.getX(index) * 360 - 180;
      expectSameDirection(
        new Vector3().fromBufferAttribute(positions, index),
        getSurfaceDirection(latitude, longitude, new Vector3()),
      );
    }
    sphere.dispose();
  });

  it.each([
    { latitude: 51.5, longitude: -0.1 },
    { latitude: -33.9, longitude: 151.2 },
    { latitude: 35.7, longitude: 139.7 },
    { latitude: -12, longitude: -77 },
  ])("turns a pin at %o to face the camera", (pin) => {
    const view = getGlobeView({ scene: "globe-spinner", pin });

    expectSameDirection(
      turnToFace(
        view,
        getSurfaceDirection(pin.latitude, pin.longitude, new Vector3()),
      ),
      new Vector3(0, 0, 1),
    );
  });

  it("tilts no further than 55° so a pole is shown with the land around it", () => {
    const view = getGlobeView({
      scene: "globe-spinner",
      highlight: "antarctica",
    });
    const southPole = turnToFace(view, new Vector3(0, -1, 0));

    expect(view.latitude).toBe(-55);
    expect(southPole.z).toBeGreaterThan(0.8);
  });

  it("faces a pin before a highlight, and shows the sunset line when only the Sun is given", () => {
    expect(
      getGlobeView({
        scene: "globe-spinner",
        highlight: "asia",
        pin: { latitude: 10, longitude: 20 },
        sunLongitude: 120,
      }),
    ).toEqual({ latitude: 10, longitude: 20 });
    expect(getGlobeView({ scene: "globe-spinner", sunLongitude: 120 })).toEqual(
      {
        latitude: 15,
        longitude: 165,
      },
    );
  });

  it.each(globeHighlights)(
    "keeps %s on the side of the globe facing the camera",
    (highlight) => {
      const view = getGlobeView({ scene: "globe-spinner", highlight });
      const centre = turnToFace(
        view,
        getSurfaceDirection(view.latitude, view.longitude, new Vector3()),
      );

      expect(centre.z).toBeCloseTo(1, 5);
    },
  );

  it("draws the prime meridian from pole to pole through longitude 0", () => {
    const ring = findGlobeRing("prime-meridian");
    const rotation = new Quaternion().setFromEuler(
      new Euler(...(ring?.rotation ?? [0, 0, 0])),
    );

    expectSameDirection(
      new Vector3(0, 1, 0).applyQuaternion(rotation),
      new Vector3(0, 0, 1),
    );
    expectSameDirection(
      new Vector3(1, 0, 0).applyQuaternion(rotation),
      new Vector3(0, -1, 0),
    );
    expectSameDirection(
      new Vector3(-1, 0, 0).applyQuaternion(rotation),
      new Vector3(0, 1, 0),
    );
  });

  it("draws the Tropic of Cancer at 23.44° north", () => {
    const ring = findGlobeRing("tropic-of-cancer");

    expect(ring?.heightShare).toBeCloseTo(Math.sin((23.44 * Math.PI) / 180));
    expect(ring?.radiusShare).toBeCloseTo(Math.cos((23.44 * Math.PI) / 180));
  });

  it("draws no line for a continent or an ocean", () => {
    expect(findGlobeRing("africa")).toBeUndefined();
    expect(findGlobeRing("pacific-ocean")).toBeUndefined();
    expect(findGlobeRing(undefined)).toBeUndefined();
  });

  it("points the eastern hemisphere's tint towards longitude 90° east", () => {
    expect(getHemisphereAxis("eastern-hemisphere")).toEqual([1, 0, 0]);
    expect(getHemisphereAxis("southern-hemisphere")).toEqual([0, -1, 0]);
    expect(getHemisphereAxis("europe")).toEqual([0, 0, 0]);
  });
});
