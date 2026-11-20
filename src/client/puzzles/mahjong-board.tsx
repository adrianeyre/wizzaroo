import { useState } from "react";
import {
  describeAmountFace,
  listMatchingAmounts,
  matchingAmountSkillByYear,
  type AmountFace,
  type ShadedShape,
} from "../../curriculum/matching-amounts.js";
import {
  buildFacePairs,
  dealMahjong,
  findMatchingFreePair,
  isMahjongMatch,
  listFreeTiles,
  mahjongLayouts,
  reshuffleMahjong,
  type MahjongTile,
} from "./mahjong.js";
import { ReadAloudMessage } from "../read-aloud-button.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";

type Feedback =
  | { kind: "none" }
  | { kind: "picked"; face: AmountFace }
  | { kind: "matched"; left: number }
  | { kind: "wrong" }
  | { kind: "blocked" }
  | { kind: "stuck" }
  | { kind: "shuffled" }
  | { kind: "hint" };

const describeFeedback = (feedback: Feedback): string => {
  switch (feedback.kind) {
    case "none":
      return "Pick a bright tile, then pick the tile that shows the same amount.";
    case "picked":
      return `You picked ${describeAmountFace(feedback.face)}. Now find its match.`;
    case "matched":
      return feedback.left === 0
        ? "Every pair matched. Board cleared!"
        : `A match! ${String(feedback.left)} pairs to go.`;
    case "wrong":
      return "Those two show different amounts. Have another look.";
    case "blocked":
      return "That tile is stuck. Pick one with nothing on top and a free side.";
    case "stuck":
      return "No free tiles match. Press Shuffle to mix up the tiles that are left.";
    case "shuffled":
      return "Shuffled! Look for a new pair.";
    case "hint":
      return "These two glowing tiles are a pair.";
  }
};

const ShadedPicture = ({
  shape,
  parts,
  shaded,
}: {
  shape: ShadedShape;
  parts: number;
  shaded: number;
}) => {
  const fill = "#f472b6";
  const empty = "#ffffff";
  if (shape === "circle") {
    return (
      <svg
        viewBox="-1.1 -1.1 2.2 2.2"
        className="tile-picture"
        aria-hidden="true"
      >
        {Array.from({ length: parts }, (_, part) => {
          const start = (part / parts) * Math.PI * 2 - Math.PI / 2;
          const end = ((part + 1) / parts) * Math.PI * 2 - Math.PI / 2;
          const largeArc = end - start > Math.PI ? 1 : 0;
          return (
            <path
              key={part}
              d={`M0 0 L${String(Math.cos(start))} ${String(Math.sin(start))} A1 1 0 ${String(largeArc)} 1 ${String(Math.cos(end))} ${String(Math.sin(end))} Z`}
              fill={part < shaded ? fill : empty}
              stroke="#1e293b"
              strokeWidth="0.06"
            />
          );
        })}
      </svg>
    );
  }
  const isQuarteredSquare = shape === "square" && parts === 4;
  return (
    <svg
      viewBox={shape === "bar" ? "0 0 4 1.4" : "0 0 2 2"}
      className="tile-picture"
      aria-hidden="true"
    >
      {Array.from({ length: parts }, (_, part) => {
        const width =
          shape === "bar" ? 4 / parts : isQuarteredSquare ? 1 : 2 / parts;
        const height = shape === "bar" ? 1.4 : isQuarteredSquare ? 1 : 2;
        const x = isQuarteredSquare ? (part % 2) * 1 : part * width;
        const y = isQuarteredSquare ? Math.floor(part / 2) * 1 : 0;
        return (
          <rect
            key={part}
            x={x}
            y={y}
            width={width}
            height={height}
            fill={part < shaded ? fill : empty}
            stroke="#1e293b"
            strokeWidth="0.06"
          />
        );
      })}
    </svg>
  );
};

const TenFrameDots = ({ count }: { count: number }) => {
  const frames = Math.ceil(count / 10);
  return (
    <svg
      viewBox={`0 0 5 ${String(frames * 2 + (frames - 1) * 0.4)}`}
      className="tile-picture dots"
      aria-hidden="true"
    >
      {Array.from({ length: frames * 10 }, (_, slot) => {
        const frame = Math.floor(slot / 10);
        const inFrame = slot % 10;
        const x = (inFrame % 5) + 0.5;
        const y = frame * 2.4 + Math.floor(inFrame / 5) + 0.5;
        return (
          <g key={slot}>
            <rect
              x={x - 0.5}
              y={y - 0.5}
              width="1"
              height="1"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="0.05"
            />
            {slot < count ? (
              <circle cx={x} cy={y} r="0.36" fill="#2563eb" />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

const TileFace = ({ face }: { face: AmountFace }) => {
  switch (face.kind) {
    case "words":
      return <span className="tile-words">{face.text}</span>;
    case "fraction":
      return (
        <span className="tile-fraction">
          <span>{face.numerator}</span>
          <span className="tile-fraction-bar" />
          <span>{face.denominator}</span>
        </span>
      );
    case "dots":
      return <TenFrameDots count={face.count} />;
    case "shaded-shape":
      return (
        <ShadedPicture
          shape={face.shape}
          parts={face.parts}
          shaded={face.shaded}
        />
      );
  }
};

const ShuffleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="line-icon"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 18h1.4a4 4 0 0 0 3.3-1.7l6.6-8.6A4 4 0 0 1 16.6 6H22" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 6h1.9a4 4 0 0 1 3.2 1.6" />
    <path d="M22 18h-5.4a4 4 0 0 1-3.2-1.6" />
    <path d="m18 14 4 4-4 4" />
  </svg>
);

const BulbIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="line-icon"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);

const tileColumns = 2;

export const MahjongBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const layout = mahjongLayouts[yearGroup];
  const [startingTiles] = useState(() =>
    dealMahjong(
      layout,
      buildFacePairs(
        listMatchingAmounts(matchingAmountSkillByYear[yearGroup]),
        layout.length / 2,
        random,
      ),
      random,
    ),
  );
  const [tiles, setTiles] = useState<readonly MahjongTile[]>(startingTiles);
  const [pickedId, setPickedId] = useState<number>();
  const [hintIds, setHintIds] = useState<readonly number[]>([]);
  const [wrongIds, setWrongIds] = useState<readonly number[]>([]);
  const [wrongSinceLastPair, setWrongSinceLastPair] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" });
  const freeIds = new Set(listFreeTiles(tiles).map(({ id }) => id));
  const pairCount = startingTiles.length / 2;
  const matchedPairs = pairCount - tiles.length / 2;
  const boardWidth = Math.max(...layout.map(({ x }) => x)) + tileColumns;
  const boardHeight = Math.max(...layout.map(({ y }) => y)) + tileColumns;

  const pickTile = (tile: MahjongTile) => {
    setHintIds([]);
    setWrongIds([]);
    if (!freeIds.has(tile.id)) {
      setFeedback({ kind: "blocked" });
      return;
    }
    const picked = tiles.find(({ id }) => id === pickedId);
    if (picked === undefined || picked.id === tile.id) {
      setPickedId(picked?.id === tile.id ? undefined : tile.id);
      setFeedback(
        picked?.id === tile.id
          ? { kind: "none" }
          : { kind: "picked", face: tile.face },
      );
      return;
    }
    setPickedId(undefined);
    if (!isMahjongMatch(picked, tile)) {
      setWrongSinceLastPair((count) => count + 1);
      setWrongIds([picked.id, tile.id]);
      setFeedback({ kind: "wrong" });
      return;
    }
    const tilesLeft = tiles.filter(
      ({ id }) => id !== picked.id && id !== tile.id,
    );
    setTiles(tilesLeft);
    onStepAnswered(wrongSinceLastPair);
    setWrongSinceLastPair(0);
    if (tilesLeft.length === 0) {
      setFeedback({ kind: "matched", left: 0 });
      onSolved();
      return;
    }
    setFeedback(
      findMatchingFreePair(tilesLeft) === undefined
        ? { kind: "stuck" }
        : { kind: "matched", left: tilesLeft.length / 2 },
    );
  };

  const shuffleTiles = () => {
    setPickedId(undefined);
    setHintIds([]);
    setTiles(reshuffleMahjong(tiles, random));
    setFeedback({ kind: "shuffled" });
  };

  const showHint = () => {
    const pair = findMatchingFreePair(tiles);
    if (pair === undefined) {
      setFeedback({ kind: "stuck" });
      return;
    }
    setHintIds(pair.map(({ id }) => id));
    setWrongSinceLastPair((count) => count + 1);
    setFeedback({ kind: "hint" });
  };

  return (
    <div className="puzzle-play-area">
      <div className="puzzle-board-card mahjong-card">
        <div
          className="mahjong-board"
          role="group"
          aria-label="Mahjong tiles"
          style={{ "--board-width": boardWidth, "--board-height": boardHeight }}
        >
          {tiles.map((tile) => {
            const isFree = freeIds.has(tile.id);
            return (
              <button
                key={tile.id}
                type="button"
                className={[
                  "mahjong-tile",
                  isFree ? "free" : "blocked",
                  tile.id === pickedId ? "picked" : "",
                  hintIds.includes(tile.id) ? "hinted" : "",
                  wrongIds.includes(tile.id) ? "wrong" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  "--tile-x": tile.slot.x,
                  "--tile-y": tile.slot.y,
                  "--tile-layer": tile.slot.layer,
                }}
                aria-label={`${describeAmountFace(tile.face)}${isFree ? "" : ", stuck"}`}
                aria-pressed={tile.id === pickedId}
                onClick={() => {
                  pickTile(tile);
                }}
              >
                <TileFace face={tile.face} />
              </button>
            );
          })}
        </div>
      </div>
      <aside className="puzzle-side-card" aria-label="Mahjong tools">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{matchedPairs}</strong> of {pairCount} pairs matched
        </p>
        <div className="puzzle-tools">
          <button type="button" onClick={showHint}>
            <BulbIcon />
            Hint
          </button>
          <button type="button" onClick={shuffleTiles}>
            <ShuffleIcon />
            Shuffle
          </button>
        </div>
      </aside>
    </div>
  );
};
