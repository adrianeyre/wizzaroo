import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { SharePicture } from "../curriculum/fair-shares.js";
import {
  LabelSprite,
  PaintedMaterial,
  PearlMaterial,
  PieceInstances,
  picturePalette,
  usePictureGeometries,
  type Piece,
  type Vector,
} from "./bay-picture-parts.js";
import {
  useGrowingChoice,
  usePromptGrowth,
  usePromptPosition,
  type ChoiceSlot,
} from "./bay-stage.js";

interface SharePlan {
  plates: Piece[];
  pearls: Piece[];
  ghostPearls: Piece[];
  fish: Piece[];
  blocks: Piece[];
  ghostBlocks: Piece[];
  label: { text: string; position: Vector } | undefined;
}

const pearlRadius = 0.062;
const pearlGap = 0.15;
const plateGap = 0.12;
const pearlDepth = 0.1;

type Spot = [number, number];

const listCompactSpots = (count: number, gap: number): Spot[] => {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  return Array.from({ length: count }, (_, index): Spot => {
    const row = Math.floor(index / columns);
    const inRow = Math.min(columns, count - row * columns);
    const column = index % columns;
    return [(column - (inRow - 1) / 2) * gap, ((rows - 1) / 2 - row) * gap];
  });
};

const listPileSpots = (count: number, spacing: number): Spot[] =>
  Array.from({ length: count }, (_, index): Spot => {
    const reach = spacing * Math.sqrt(index + 0.5);
    const angle = index * 2.399963;
    return [Math.cos(angle) * reach, Math.sin(angle) * reach];
  });

const findPlateRadius = (pearlCount: number) =>
  Math.max(0.2, Math.ceil(Math.sqrt(pearlCount)) * pearlGap * 0.62 + 0.05);

const listRowSpots = (
  count: number,
  perRow: number,
  pitch: number,
  topY: number,
): Spot[] =>
  Array.from({ length: count }, (_, index): Spot => {
    const row = Math.floor(index / perRow);
    const inRow = Math.min(perRow, count - row * perRow);
    const column = index % perRow;
    return [(column - (inRow - 1) / 2) * pitch, topY - row * pitch];
  });

const buildPlate = ([x, y]: Spot, radius: number): Piece => ({
  position: [x, y, 0],
  scale: [radius, radius, 1],
});

const buildPearl = (
  [x, y]: Spot,
  colour: string = picturePalette.pearl,
  depth = pearlDepth,
): Piece => ({
  position: [x, y, depth],
  scale: [pearlRadius, pearlRadius, pearlRadius],
  colour,
});

const emptyPlan: SharePlan = {
  plates: [],
  pearls: [],
  ghostPearls: [],
  fish: [],
  blocks: [],
  ghostBlocks: [],
  label: undefined,
};

const buildPile = (count: number, centre: Spot): Piece[] => {
  const spots = listPileSpots(count, pearlGap * 0.5);
  const reach = Math.max(...spots.map(([x, y]) => Math.hypot(x, y)), 0.01);
  return spots.map(([x, y]) =>
    buildPearl(
      [centre[0] + x, centre[1] + y],
      picturePalette.pearl,
      0.06 + (1 - Math.hypot(x, y) / reach) * 0.16,
    ),
  );
};

const buildGroupsPlan = (groupCount: number, perGroup: number): SharePlan => {
  const radius = findPlateRadius(perGroup);
  const perRow = groupCount <= 3 ? groupCount : Math.ceil(groupCount / 2);
  const pitch = 2 * radius + plateGap;
  const rows = Math.ceil(groupCount / perRow);
  const plateSpots = listRowSpots(
    groupCount,
    perRow,
    pitch,
    ((rows - 1) * pitch) / 2,
  );
  const inPlate = listCompactSpots(perGroup, pearlGap);
  return {
    ...emptyPlan,
    plates: plateSpots.map((spot) => buildPlate(spot, radius)),
    pearls: plateSpots.flatMap(([plateX, plateY]) =>
      inPlate.map(([x, y]) => buildPearl([plateX + x, plateY + y])),
    ),
  };
};

const buildSharingPlan = (total: number, groupCount: number): SharePlan => {
  const isCrowded = groupCount > 5;
  const radius = isCrowded ? 0.15 : 0.22;
  const perRow = isCrowded ? 5 : groupCount;
  return {
    ...emptyPlan,
    plates: listRowSpots(groupCount, perRow, 2 * radius + plateGap, -0.42).map(
      (spot) => buildPlate(spot, radius),
    ),
    pearls: buildPile(total, [0, 0.5]),
  };
};

const fishPitch: Spot = [0.34, 0.23];

const buildArrayPlan = (rows: number, columns: number): SharePlan => ({
  ...emptyPlan,
  fish: Array.from({ length: rows * columns }, (_, index): Piece => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    return {
      position: [
        (column - (columns - 1) / 2) * fishPitch[0],
        ((rows - 1) / 2 - row) * fishPitch[1],
        0.05,
      ],
      scale: [0.3, 0.3, 0.3],
      colour:
        row % 2 === 0 ? picturePalette.fishOrange : picturePalette.fishYellow,
    };
  }),
});

const buildRatioPlan = (
  groupCount: number,
  first: number,
  second: number,
): SharePlan => {
  const radius = findPlateRadius(first + second);
  const plateSpots = listRowSpots(
    groupCount,
    groupCount,
    2 * radius + plateGap,
    0,
  );
  const inPlate = listCompactSpots(first + second, pearlGap);
  const placed = plateSpots.flatMap(([plateX, plateY], group) =>
    inPlate.map(([x, y], index) => ({
      spot: [plateX + x, plateY + y] satisfies Spot,
      isRed: index < first,
      isShown: index < first || group === 0,
    })),
  );
  return {
    ...emptyPlan,
    plates: plateSpots.map((spot) => buildPlate(spot, radius)),
    pearls: placed
      .filter(({ isShown }) => isShown)
      .map(({ spot, isRed }) =>
        buildPearl(spot, isRed ? picturePalette.red : picturePalette.blue),
      ),
    ghostPearls: placed
      .filter(({ isShown }) => !isShown)
      .map(({ spot }) => buildPearl(spot, picturePalette.ghost)),
  };
};

const barModelWidth = 2.4;

const buildPartsPlan = (
  total: number,
  firstParts: number,
  secondParts: number,
): SharePlan => {
  const partCount = firstParts + secondParts;
  const width = Math.min(0.34, barModelWidth / partCount);
  return {
    ...emptyPlan,
    pearls: buildPile(total, [0, 0.42]),
    blocks: Array.from({ length: partCount }, (_, index): Piece => ({
      position: [(index - (partCount - 1) / 2) * width, -0.45, 0.05],
      scale: [width * 0.92, 0.28, 0.16],
      colour: index < firstParts ? picturePalette.red : picturePalette.blue,
    })),
  };
};

const scaleWidth = 2.6;

// When the scale factor is the question, the enlarged bar is drawn whole and labelled "× ?": splitting it into one
// segment for each time bigger, or writing the factor, would give the answer away.
const buildScalePlan = ({
  length,
  factor,
  isFactorAsked,
}: Extract<SharePicture, { kind: "scale" }>): SharePlan => {
  const unit = Math.min(0.28, scaleWidth / (length * factor));
  const segmentWidth = length * unit;
  return {
    ...emptyPlan,
    blocks: Array.from({ length }, (_, index): Piece => ({
      position: [
        (index - (length - 1) / 2) * unit - ((factor - 1) * segmentWidth) / 2,
        0.45,
        0.05,
      ],
      scale: [unit * 0.9, 0.24, 0.16],
      colour: picturePalette.gold,
    })),
    ghostBlocks: isFactorAsked
      ? [
          {
            position: [0, -0.15, 0.05],
            scale: [segmentWidth * factor * 0.98, 0.3, 0.16],
            colour: picturePalette.blue,
          },
        ]
      : Array.from({ length: factor }, (_, index): Piece => ({
          position: [(index - (factor - 1) / 2) * segmentWidth, -0.15, 0.05],
          scale: [segmentWidth * 0.94, 0.3, 0.16],
          colour: index % 2 === 0 ? picturePalette.blue : picturePalette.ghost,
        })),
    label: {
      text: `× ${isFactorAsked ? "?" : String(factor)}`,
      position: [0, -0.62, 0.2],
    },
  };
};

export const buildSharePlan = (picture: SharePicture): SharePlan => {
  switch (picture.kind) {
    case "groups":
      return buildGroupsPlan(picture.groupCount, picture.perGroup);
    case "share":
      return buildSharingPlan(picture.total, picture.groupCount);
    case "array":
      return buildArrayPlan(picture.rows, picture.columns);
    case "ratio":
      return buildRatioPlan(picture.groupCount, picture.first, picture.second);
    case "parts":
      return buildPartsPlan(
        picture.total,
        picture.firstParts,
        picture.secondParts,
      );
    case "scale":
      return buildScalePlan(picture);
    case "pairs":
      return emptyPlan;
  }
};

const PlateMaterial = () => (
  <meshPhysicalMaterial
    color={picturePalette.plate}
    roughness={0.4}
    clearcoat={0.8}
    clearcoatRoughness={0.2}
    sheen={0.4}
    sheenColor={picturePalette.plateRim}
  />
);

export const FairShareScene = ({ picture }: { picture: SharePicture }) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const geometries = usePictureGeometries();
  const plan = useMemo(() => buildSharePlan(picture), [picture]);
  const sway = useRef<Group>(null);

  useFrame(() => {
    if (sway.current !== null) {
      sway.current.rotation.y =
        Math.sin(age.current * 0.45) * 0.08 * motionScale;
    }
  });

  return (
    <group position={position} name="fair-shares">
      <group rotation={[-0.38, 0, 0]}>
        <group ref={sway}>
          <PieceInstances
            pieces={plan.plates}
            geometry={geometries.plate}
            name="share-plates"
          >
            <PlateMaterial />
          </PieceInstances>
          <PieceInstances
            pieces={plan.pearls}
            geometry={geometries.pearl}
            name="share-pearls"
            staggerSeconds={0.02}
          >
            <PearlMaterial />
          </PieceInstances>
          <PieceInstances
            pieces={plan.ghostPearls}
            geometry={geometries.pearl}
            name="share-ghost-pearls"
          >
            <PearlMaterial isGhost />
          </PieceInstances>
          <PieceInstances
            pieces={plan.fish}
            geometry={geometries.fish}
            name="share-fish"
          >
            <PaintedMaterial />
          </PieceInstances>
          <PieceInstances
            pieces={plan.blocks}
            geometry={geometries.block}
            name="share-blocks"
            staggerSeconds={0.08}
          >
            <meshPhysicalMaterial
              roughness={0.3}
              clearcoat={0.9}
              clearcoatRoughness={0.12}
            />
          </PieceInstances>
          <PieceInstances
            pieces={plan.ghostBlocks}
            geometry={geometries.block}
            name="share-ghost-blocks"
            staggerSeconds={0.1}
          >
            <meshPhysicalMaterial
              roughness={0.2}
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </PieceInstances>
          {plan.label === undefined ? null : (
            <LabelSprite
              text={plan.label.text}
              position={plan.label.position}
            />
          )}
        </group>
      </group>
    </group>
  );
};

const pairsPerBand = 5;

export const listPairSpots = (count: number, radius: number): Spot[] => {
  const pitch = radius * 0.3;
  const pairCount = Math.ceil(count / 2);
  const bandCount = Math.ceil(pairCount / pairsPerBand);
  const rowCount = bandCount * 2;
  return Array.from({ length: count }, (_, index): Spot => {
    const pair = Math.floor(index / 2);
    const band = Math.floor(pair / pairsPerBand);
    const column = pair % pairsPerBand;
    const row = band * 2 + (index % 2);
    const inBand = Math.min(pairsPerBand, pairCount - band * pairsPerBand);
    return [
      (column - (inBand - 1) / 2) * pitch,
      ((rowCount - 1) / 2 - row) * pitch - band * pitch * 0.25,
    ];
  });
};

export const PairTray = ({
  count,
  ...slot
}: ChoiceSlot & { count: number }) => {
  const { choice } = useGrowingChoice(slot);
  const geometries = usePictureGeometries();
  const pearls = useMemo(
    () =>
      listPairSpots(count, slot.radius).map(([x, y]): Piece => ({
        position: [x, y, 0.09],
        scale: [slot.radius * 0.1, slot.radius * 0.1, slot.radius * 0.1],
      })),
    [count, slot.radius],
  );

  return (
    <group ref={choice} position={slot.position} name="pair-tray">
      <mesh
        geometry={geometries.plate}
        scale={[slot.radius * 0.95, slot.radius * 0.95, 1]}
      >
        <PlateMaterial />
      </mesh>
      <PieceInstances
        pieces={pearls}
        geometry={geometries.pearl}
        name="pair-pearls"
      >
        <PearlMaterial />
      </PieceInstances>
    </group>
  );
};
