import { useRef, useState, type ReactNode } from "react";
import { skills, type YearGroup } from "../../curriculum/skills.js";
import type { PuzzleGameType } from "../../curriculum/world-map.js";
import type { PracticeRecord } from "../family-device/family-device-page.js";
import { ReadAloudButton } from "../read-aloud-button.js";
import { CrosswordBoard } from "./crossword-board.js";
import { BingoBoard } from "./bingo-board.js";
import { ClockPairsBoard } from "./clock-pairs-board.js";
import { MahjongBoard } from "./mahjong-board.js";
import { MineSweeperBoard } from "./mine-sweeper-board.js";
import { NumberPyramidBoard } from "./number-pyramid-board.js";
import { NumberTrailBoard } from "./number-trail-board.js";
import { RingSortBoard } from "./ring-sort-board.js";
import { SentenceParadeBoard } from "./sentence-parade-board.js";
import { SudokuBoard } from "./sudoku-board.js";
import { findPuzzleSkillId, puzzleTitles } from "./puzzle-skills.js";
import { TightropeWordsBoard } from "./tightrope-words-board.js";
import { WordSearchBoard } from "./word-search-board.js";

export interface PuzzleBoardProps {
  yearGroup: YearGroup;
  random: () => number;
  onStepAnswered: (wrongAnswerCount: number) => void;
  onSolved: () => void;
}

export const puzzleInstructions: Record<PuzzleGameType, string> = {
  "word-search":
    "Find every spelling word hidden in the grid. Drag across a word, or tap its first and last letters.",
  sudoku:
    "Fill the grid so every row, column and box has each number once. Work out the sums to crack the tricky squares.",
  "mine-sweeper":
    "Dig every safe square. Each sum tells you how many mines touch that square, so flag the mines you find.",
  crossword:
    "Read each clue and spell the word in the grid. A word turns green when every letter is right.",
  mahjong:
    "Match pairs of tiles that show the same amount. You can only pick a tile with a free left or right side.",
  "number-pyramid":
    "Each brick is the sum of the two bricks it sits on. Work out the missing bricks to build the pyramid to the top.",
  "number-trail":
    "Fill the trail so the numbers count on in the same step, each square touching the next. Follow the arrows from the start.",
  bingo:
    "Listen to the ringmaster's call, work it out and mark the answer on your card. Mark every answer to shout Bingo!",
  "clock-pairs":
    "Turn over two cards at a time to find a clock and the time that goes with it. Remember where each card is hiding.",
  "tightrope-words":
    "Read the clue and pick letters to spell the word. Every right letter helps the acrobat walk across the tightrope.",
  "ring-sort":
    "Sort each word into the right circus ring. Read the word, think about the rule, then pick its ring.",
  "sentence-parade":
    "Put the word wagons in order to build a sentence that makes sense, with its capital letter and punctuation in the right place.",
};

const boards: Record<PuzzleGameType, (props: PuzzleBoardProps) => ReactNode> = {
  "word-search": WordSearchBoard,
  sudoku: SudokuBoard,
  "mine-sweeper": MineSweeperBoard,
  crossword: CrosswordBoard,
  mahjong: MahjongBoard,
  "number-pyramid": NumberPyramidBoard,
  "number-trail": NumberTrailBoard,
  bingo: BingoBoard,
  "clock-pairs": ClockPairsBoard,
  "tightrope-words": TightropeWordsBoard,
  "ring-sort": RingSortBoard,
  "sentence-parade": SentenceParadeBoard,
};

const millisecondsPerSecond = 1000;

interface PuzzlePlayProps {
  gameType: PuzzleGameType;
  yearGroup: YearGroup;
  random: () => number;
  buildId: () => string;
  readTime: () => number;
  recordPractice: (practiceRecord: PracticeRecord) => void;
  onSolved: () => void;
  leaveButton: ReactNode;
}

export const PuzzlePlay = ({
  gameType,
  yearGroup,
  random,
  buildId,
  readTime,
  recordPractice,
  onSolved,
  leaveButton,
}: PuzzlePlayProps) => {
  const [activityId] = useState(buildId);
  const [startedAt] = useState(readTime);
  const isSolved = useRef(false);
  const skillId = findPuzzleSkillId(gameType, yearGroup);
  const skillName = skills.find(({ id }) => id === skillId)?.name ?? "";
  const Board = boards[gameType];

  const answerStep = (wrongAnswerCount: number) => {
    recordPractice({
      kind: "question-answered",
      activityId,
      skillId,
      isRightFirstTime: wrongAnswerCount === 0,
      wrongAnswerCount,
    });
  };

  const finishPuzzle = () => {
    if (isSolved.current) {
      return;
    }
    isSolved.current = true;
    recordPractice({
      kind: "activity-finished",
      activityId,
      skillId,
      secondsSpent: Math.max(
        0,
        Math.round((readTime() - startedAt) / millisecondsPerSecond),
      ),
    });
    onSolved();
  };

  return (
    <div className={`puzzle-stage ${gameType}`}>
      <div className="puzzle-canopy" aria-hidden="true" />
      <div className="puzzle-layout">
        <header className="puzzle-header">
          <p className="puzzle-kicker">Brainwave Big Top · Year {yearGroup}</p>
          <h1>{puzzleTitles[gameType]}</h1>
          <p className="puzzle-skill">{skillName}</p>
          <p className="puzzle-instruction">{puzzleInstructions[gameType]}</p>
          <ReadAloudButton text={puzzleInstructions[gameType]} />
        </header>
        <Board
          yearGroup={yearGroup}
          random={random}
          onStepAnswered={answerStep}
          onSolved={finishPuzzle}
        />
      </div>
      {leaveButton}
    </div>
  );
};
