import { Matrix4, type Object3D } from "three";

// How a Character holds themselves while a craft carries them: standing,
// sitting astride the dragon's saddle, swimming in scuba gear, lying on a
// surfboard to paddle, crouched on it riding a wave, or leaning back on a
// windsurfer's boom. Each bends the legs at the hips and the arms at the
// shoulders of the figure drawn by `CharacterModel`, and tilts the figure
// itself, so the same figure rides everything.

export type Stance =
  "standing" | "sitting" | "swimming" | "paddling" | "surfing" | "windsurfing";

export const exploreCharacterScale = 0.42;

/** The height of the hips, where the legs bend, in the figure's own units. */
export const hipHeight = 0.57;

/** How far below a seat the soles of a sitting Character's feet start. */
export const seatedHipDrop = hipHeight * exploreCharacterScale;

/** How high the back of a Character lying face down is above where they lie. */
export const proneBackHeight = 0.36 * exploreCharacterScale;

const shoulder = { y: 1.12, x: 0.37 } as const;

interface Limbs {
  figure: [number, number, number];
  /** How far the toes point, swinging scuba fins back along the legs. */
  toes: number;
  lift: number;
  wandLeg: [number, number, number];
  freeLeg: [number, number, number];
  wandArm: [number, number, number];
  freeArm: [number, number, number];
}

const still: Limbs = {
  figure: [0, 0, 0],
  toes: 0,
  lift: 0,
  wandLeg: [0, 0, 0],
  freeLeg: [0, 0, 0],
  wandArm: [0, 0, 0],
  freeArm: [0, 0, 0],
};

const proneTilt = Math.PI / 2 - 0.06;

export const findStanceLimbs = (
  stance: Stance,
  seconds: number,
  motion = 1,
): Limbs => {
  const swing = (speed: number, offset = 0) =>
    Math.sin(seconds * speed + offset) * motion;
  switch (stance) {
    case "standing":
      return still;
    case "sitting":
      return {
        ...still,
        wandLeg: [-1.2, 0, 0.62],
        freeLeg: [-1.2, 0, -0.62],
        wandArm: [-0.75, 0, -0.18],
        freeArm: [-0.75, 0, 0.18],
      };
    case "swimming":
      return {
        ...still,
        figure: [proneTilt, 0, 0.04 * swing(1.3)],
        toes: 1.35,
        lift: proneBackHeight,
        wandLeg: [0.32 * swing(7.5), 0, 0.06],
        freeLeg: [-0.32 * swing(7.5), 0, -0.06],
        wandArm: [0.1, 0, 0.18],
        freeArm: [0.1, 0, -0.18],
      };
    case "paddling":
      return {
        ...still,
        figure: [proneTilt, 0, 0],
        lift: proneBackHeight,
        wandLeg: [0.05, 0, 0.04],
        freeLeg: [0.05, 0, -0.04],
        wandArm: [-1.6 - 1.3 * swing(4.2), 0, 0.12],
        freeArm: [-1.6 + 1.3 * swing(4.2), 0, -0.12],
      };
    case "surfing":
      return {
        ...still,
        figure: [0.18, Math.PI / 2, 0.05 * swing(1.7)],
        lift: -0.03,
        wandLeg: [-0.25, 0, 0.42],
        freeLeg: [-0.25, 0, -0.42],
        wandArm: [-0.2, 0, 1.15 + 0.12 * swing(2.3)],
        freeArm: [-0.2, 0, -1.15 - 0.12 * swing(2.3, 1)],
      };
    case "windsurfing":
      return {
        ...still,
        figure: [-0.22, Math.PI / 2, 0],
        lift: 0,
        wandLeg: [0.16, 0, 0.3],
        freeLeg: [0.16, 0, -0.3],
        wandArm: [-1.35, 0, -0.12],
        freeArm: [-1.35, 0, 0.12],
      };
  }
};

const heldBase = new WeakMap<Object3D, Matrix4>();

const placeHeldWithArm = (
  held: Object3D,
  [x, y, z]: [number, number, number],
) => {
  const known = heldBase.get(held);
  const base =
    known ??
    held.matrix
      .clone()
      .compose(
        held.position.clone(),
        held.quaternion.clone(),
        held.scale.clone(),
      );
  if (known === undefined) {
    heldBase.set(held, base);
  }
  const swung = new Matrix4()
    .makeTranslation(shoulder.x, shoulder.y, 0)
    .multiply(new Matrix4().makeRotationX(x))
    .multiply(new Matrix4().makeRotationY(y))
    .multiply(new Matrix4().makeRotationZ(z))
    .multiply(new Matrix4().makeTranslation(-shoulder.x, -shoulder.y, 0))
    .multiply(base);
  swung.decompose(held.position, held.quaternion, held.scale);
};

/**
 * Bends the figure drawn by `CharacterModel` inside `pose` into `stance`. The
 * figure is tilted about the soles of its feet, then lifted by the stance's
 * lift, so a Character lying face down lies along where they are placed.
 */
export const applyStance = (
  pose: Object3D,
  stance: Stance,
  seconds: number,
  motion = 1,
): void => {
  const limbs = findStanceLimbs(stance, seconds, motion);
  pose.rotation.set(...limbs.figure, "YXZ");
  pose.position.y = limbs.lift;
  const parts: [string, [number, number, number]][] = [
    ["wand-leg", limbs.wandLeg],
    ["free-leg", limbs.freeLeg],
    ["wand-arm", limbs.wandArm],
    ["free-arm", limbs.freeArm],
  ];
  parts.forEach(([name, [x, y, z]]) => {
    const part = pose.getObjectByName(name);
    part?.rotation.set(x, y, z);
  });
  pose.traverse((part) => {
    if (part.name === "scuba-fin") {
      part.rotation.x = limbs.toes;
    }
  });
  const held = pose.getObjectByName("held");
  if (held !== undefined) {
    placeHeldWithArm(held, limbs.wandArm);
  }
};
