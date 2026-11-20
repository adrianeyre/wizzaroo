import {
  MeshPhysicalMaterial,
  Plane,
  Vector3,
  type Matrix4,
  type WebGLRenderer,
} from "three";
import {
  findRailHeading,
  findRailPoint,
  tunnelPortalSetback,
  wrapDistance,
  type Railway,
} from "./island-railway.js";
import { finishes, finishLooks } from "./trains/train-kit.js";

export interface TunnelPortal {
  distance: number;
  point: Vector3;
  outward: Vector3;
}

export interface TunnelBore {
  entry: TunnelPortal;
  exit: TunnelPortal;
  length: number;
}

export interface VehicleSpan {
  front: number;
  back: number;
}

export interface TrainInTunnels {
  bore: TunnelBore | undefined;
  hiddenVehicles: boolean[];
  isChimneyInside: boolean;
}

const findPortal = (
  railway: Railway,
  distance: number,
  facing: number,
): TunnelPortal => {
  const point = findRailPoint(railway, distance);
  const heading = findRailHeading(railway, distance);
  return {
    distance: wrapDistance(railway, distance),
    point: new Vector3(point.x, point.y, point.z),
    outward: new Vector3(
      Math.sin(heading) * facing,
      0,
      Math.cos(heading) * facing,
    ),
  };
};

const bores = new WeakMap<Railway, TunnelBore[]>();

/**
 * Each tunnel as the stretch of track between its two portals, with the
 * way out of the tunnel at each one.
 */
export const listTunnelBores = (railway: Railway): TunnelBore[] => {
  const known = bores.get(railway);
  if (known !== undefined) {
    return known;
  }
  const built = railway.tunnels.map((tunnel) => {
    const entry = findPortal(
      railway,
      tunnel.fromDistance - tunnelPortalSetback,
      -1,
    );
    const exit = findPortal(
      railway,
      tunnel.toDistance + tunnelPortalSetback,
      1,
    );
    return {
      entry,
      exit,
      length: wrapDistance(railway, exit.distance - entry.distance),
    };
  });
  bores.set(railway, built);
  return built;
};

const findIntoBore = (
  railway: Railway,
  bore: TunnelBore,
  distance: number,
): number => wrapDistance(railway, distance - bore.entry.distance);

export const isInsideBore = (
  railway: Railway,
  bore: TunnelBore,
  distance: number,
): boolean => {
  const into = findIntoBore(railway, bore, distance);
  return into > 0 && into < bore.length;
};

/**
 * Where the train is against the tunnels: the one it is going through,
 * which of its vehicles are wholly inside it (and so not drawn), and
 * whether the steam engine's chimney is inside, where it can't puff.
 */
export const findTrainInTunnels = (
  railway: Railway,
  vehicles: readonly VehicleSpan[],
  chimneyDistance?: number,
): TrainInTunnels => {
  const bore = listTunnelBores(railway).find((each) =>
    vehicles.some(
      ({ front, back }) =>
        isInsideBore(railway, each, front) || isInsideBore(railway, each, back),
    ),
  );
  if (bore === undefined) {
    return {
      bore,
      hiddenVehicles: vehicles.map(() => false),
      isChimneyInside: false,
    };
  }
  return {
    bore,
    hiddenVehicles: vehicles.map(
      ({ front, back }) =>
        isInsideBore(railway, bore, front) && isInsideBore(railway, bore, back),
    ),
    isChimneyInside:
      chimneyDistance !== undefined &&
      isInsideBore(railway, bore, chimneyDistance),
  };
};

const neverClipped = new Plane(new Vector3(0, 1, 0), 1e9);

/**
 * Two clipping planes, one at each portal, facing out of the tunnel. A
 * material drawn with them and `clipIntersection` hides only what is
 * past both portals: inside the tunnel. With no tunnel they clip nothing.
 */
export const placePortalPlanes = (
  planes: readonly [Plane, Plane],
  bore: TunnelBore | undefined,
  toWorld: Matrix4,
): void => {
  if (bore === undefined) {
    planes[0].copy(neverClipped);
    planes[1].copy(neverClipped);
    return;
  }
  [bore.entry, bore.exit].forEach(({ point, outward }, index) => {
    planes[index]
      .setFromNormalAndCoplanarPoint(outward, point)
      .applyMatrix4(toWorld);
  });
};

export const buildPortalPlanes = (): [Plane, Plane] => [
  neverClipped.clone(),
  neverClipped.clone(),
];

/** A Train's paint, glass and metal, cut off at the portals of its tunnel. */
export const buildClippedTrainMaterials = (
  planes: readonly [Plane, Plane],
): MeshPhysicalMaterial[] =>
  finishes.map(
    (finish) =>
      new MeshPhysicalMaterial({
        vertexColors: true,
        ...finishLooks[finish],
        clippingPlanes: [...planes],
        clipIntersection: true,
      }),
  );

export const allowTunnelClipping = (renderer: WebGLRenderer): void => {
  renderer.localClippingEnabled = true;
};
