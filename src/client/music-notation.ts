import type {
  Articulation,
  BodyAction,
  ChangeOverTime,
  Clef,
  NotationFace,
  PictureIcon,
  SoundLength,
  StaffChord,
  TimeSignature,
} from "../curriculum/music-prompts.js";
import {
  findDiatonicStep,
  parseRhythm,
  rhythmSyllables,
  spellNote,
  type RhythmSyllable,
} from "../curriculum/music-theory.js";

export const notationPalette = {
  paper: "#fffaf0",
  paperEdge: "#e9dcc0",
  ink: "#1d1b3a",
  faint: "#c9bfa8",
  gap: "#e0533a",
  clap: "#f08a24",
  stamp: "#2f6fd6",
  click: "#20a36b",
  levels: ["#e0533a", "#f0a020", "#3aa0e0", "#7b4fd6", "#20a36b"],
} as const;

const serifFont = `"Georgia", "Times New Roman", serif`;
const roundFont = `"Baloo 2 Variable", "Baloo 2", "Nunito Variable", sans-serif`;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const fillBackground = (
  context: CanvasRenderingContext2D,
  { width, height }: { width: number; height: number },
) => {
  context.fillStyle = notationPalette.paper;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = notationPalette.paperEdge;
  context.lineWidth = Math.max(4, height * 0.03);
  context.strokeRect(
    context.lineWidth / 2,
    context.lineWidth / 2,
    width - context.lineWidth,
    height - context.lineWidth,
  );
};

const drawEllipseHead = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  gap: number,
  isFilled: boolean,
  isWide = false,
) => {
  context.save();
  context.translate(x, y);
  context.rotate(isWide ? 0 : -0.35);
  context.beginPath();
  context.ellipse(
    0,
    0,
    gap * (isWide ? 0.78 : 0.64),
    gap * 0.46,
    0,
    0,
    Math.PI * 2,
  );
  if (isFilled) {
    context.fill();
  } else {
    context.lineWidth = gap * (isWide ? 0.2 : 0.18);
    context.stroke();
  }
  context.restore();
};

const drawLine = (
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number,
) => {
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
};

const drawFlags = (
  context: CanvasRenderingContext2D,
  stemX: number,
  stemTopY: number,
  gap: number,
  count: number,
  isStemUp = true,
) => {
  const direction = isStemUp ? 1 : -1;
  for (let flag = 0; flag < count; flag++) {
    const startY = stemTopY + flag * gap * 0.75 * direction;
    context.beginPath();
    context.moveTo(stemX, startY);
    context.bezierCurveTo(
      stemX + gap * 0.25,
      startY + gap * 0.9 * direction,
      stemX + gap * 1.25,
      startY + gap * 1.1 * direction,
      stemX + gap * 0.85,
      startY + gap * 2.3 * direction,
    );
    context.bezierCurveTo(
      stemX + gap * 1.05,
      startY + gap * 1.4 * direction,
      stemX + gap * 0.4,
      startY + gap * 1.2 * direction,
      stemX,
      startY + gap * 0.9 * direction,
    );
    context.closePath();
    context.fill();
  }
};

const drawCrotchetRest = (
  context: CanvasRenderingContext2D,
  x: number,
  middleY: number,
  gap: number,
) => {
  context.lineWidth = gap * 0.3;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(x - gap * 0.3, middleY - gap * 1.6);
  context.lineTo(x + gap * 0.35, middleY - gap * 0.75);
  context.lineTo(x - gap * 0.3, middleY + gap * 0.05);
  context.lineTo(x + gap * 0.35, middleY + gap * 0.8);
  context.stroke();
  context.beginPath();
  context.moveTo(x + gap * 0.35, middleY + gap * 0.8);
  context.quadraticCurveTo(
    x - gap * 0.7,
    middleY + gap * 0.6,
    x - gap * 0.05,
    middleY + gap * 1.6,
  );
  context.stroke();
  context.lineCap = "butt";
};

const drawQuaverRest = (
  context: CanvasRenderingContext2D,
  x: number,
  middleY: number,
  gap: number,
) => {
  context.beginPath();
  context.arc(x - gap * 0.25, middleY - gap * 0.55, gap * 0.28, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = gap * 0.16;
  context.beginPath();
  context.moveTo(x - gap * 0.3, middleY - gap * 0.35);
  context.quadraticCurveTo(
    x + gap * 0.2,
    middleY - gap * 0.2,
    x + gap * 0.45,
    middleY - gap * 0.75,
  );
  context.lineTo(x - gap * 0.05, middleY + gap * 1.2);
  context.stroke();
};

const drawRhythmDot = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  gap: number,
) => {
  context.beginPath();
  context.arc(x, y, gap * 0.17, 0, Math.PI * 2);
  context.fill();
};

interface RhythmNoteSpot {
  x: number;
  beats: number;
  isRest: boolean;
}

interface RhythmPen {
  context: CanvasRenderingContext2D;
  lineY: number;
  gap: number;
  stemHeight: number;
}

const findStemX = ({ gap }: RhythmPen, x: number) => x + gap * 0.56;
const findStemTopY = ({ lineY, stemHeight }: RhythmPen) => lineY - stemHeight;

const drawStemmedHead = (pen: RhythmPen, x: number, isFilled: boolean) => {
  const { context, lineY, gap } = pen;
  drawEllipseHead(context, x, lineY, gap, isFilled);
  drawLine(
    context,
    findStemX(pen, x),
    lineY - gap * 0.15,
    findStemX(pen, x),
    findStemTopY(pen),
    gap * 0.16,
  );
};

const drawBeam = (
  pen: RhythmPen,
  fromX: number,
  toX: number,
  level: number,
) => {
  const { context, gap } = pen;
  const y = findStemTopY(pen) + level * gap * 0.7;
  context.fillRect(
    findStemX(pen, fromX) - gap * 0.08,
    y,
    findStemX(pen, toX) - findStemX(pen, fromX) + gap * 0.16,
    gap * 0.42,
  );
};

const drawTripletMark = (pen: RhythmPen, fromX: number, toX: number) => {
  const { context, gap } = pen;
  context.font = `italic 700 ${String(gap * 1.4)}px ${serifFont}`;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillText(
    "3",
    (findStemX(pen, fromX) + findStemX(pen, toX)) / 2,
    findStemTopY(pen) - gap * 0.35,
  );
};

const drawRhythmSyllable = (
  pen: RhythmPen,
  syllable: RhythmSyllable,
  spots: readonly RhythmNoteSpot[],
) => {
  const { context, lineY, gap } = pen;
  const xs = spots.map(({ x }) => x);
  const [first, second, third] = xs;
  const last = xs[xs.length - 1];
  switch (syllable) {
    case "ta":
      drawStemmedHead(pen, first, true);
      return;
    case "ta-a":
      drawStemmedHead(pen, first, false);
      return;
    case "ta-a-a":
      drawStemmedHead(pen, first, false);
      drawRhythmDot(context, first + gap * 1.1, lineY - gap * 0.2, gap);
      return;
    case "ta-a-a-a":
      drawEllipseHead(context, first, lineY, gap, false, true);
      return;
    case "sh":
      drawCrotchetRest(context, first, lineY - gap, gap);
      return;
    case "ti-ti":
    case "ti-ka-ti-ka":
    case "ti-ti-ka":
    case "ti-ka-ti":
    case "tri-o-la":
      for (const x of xs) {
        drawStemmedHead(pen, x, true);
      }
      drawBeam(pen, first, last, 0);
      if (syllable === "ti-ka-ti-ka") {
        drawBeam(pen, first, last, 1);
      }
      if (syllable === "ti-ti-ka") {
        drawBeam(pen, second, last, 1);
      }
      if (syllable === "ti-ka-ti") {
        drawBeam(pen, first, second, 1);
      }
      if (syllable === "tri-o-la") {
        drawTripletMark(pen, first, last);
      }
      return;
    case "ta-i-ti":
      drawStemmedHead(pen, first, true);
      drawRhythmDot(context, first + gap * 1.1, lineY - gap * 0.2, gap);
      drawStemmedHead(pen, second, true);
      drawFlags(context, findStemX(pen, second), findStemTopY(pen), gap, 1);
      return;
    case "tim-ka":
      drawStemmedHead(pen, first, true);
      drawRhythmDot(context, first + gap * 1.1, lineY - gap * 0.2, gap);
      drawStemmedHead(pen, second, true);
      drawBeam(pen, first, second, 0);
      context.fillRect(
        findStemX(pen, second) - gap * 0.9,
        findStemTopY(pen) + gap * 0.7,
        gap * 0.98,
        gap * 0.42,
      );
      return;
    case "syn-co-pa":
      drawStemmedHead(pen, first, true);
      drawFlags(context, findStemX(pen, first), findStemTopY(pen), gap, 1);
      drawStemmedHead(pen, second, true);
      drawStemmedHead(pen, third, true);
      drawFlags(context, findStemX(pen, third), findStemTopY(pen), gap, 1);
      return;
    case "sh-ti":
      drawQuaverRest(context, first, lineY - gap, gap);
      drawStemmedHead(pen, second, true);
      drawFlags(context, findStemX(pen, second), findStemTopY(pen), gap, 1);
      return;
    case "ti-sh":
      drawStemmedHead(pen, first, true);
      drawFlags(context, findStemX(pen, first), findStemTopY(pen), gap, 1);
      drawQuaverRest(context, second, lineY - gap, gap);
      return;
  }
};

const smallestSoundWidth = 0.42;

const findSyllableWeight = (syllable: RhythmSyllable): number =>
  rhythmSyllables[syllable].reduce(
    (total, { beats }) => total + Math.max(smallestSoundWidth, beats),
    0,
  );

const drawBigNumber = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
) => {
  context.font = `800 ${String(size)}px ${roundFont}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y);
};

const drawTimeSignatureNumbers = (
  context: CanvasRenderingContext2D,
  { top, bottom }: TimeSignature,
  x: number,
  middleY: number,
  gap: number,
) => {
  context.font = `900 ${String(gap * 2.5)}px ${serifFont}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(top), x, middleY - gap * 0.95);
  context.fillText(String(bottom), x, middleY + gap * 1.05);
};

const drawRhythm = (
  context: CanvasRenderingContext2D,
  box: Box,
  face: Extract<NotationFace, { kind: "rhythm" }>,
) => {
  const syllables = parseRhythm(face.rhythm);
  const gap = box.height * 0.085;
  const pen: RhythmPen = {
    context,
    lineY: box.top + box.height * 0.7,
    gap,
    stemHeight: gap * 3.4,
  };
  const separatorWidth = face.isSum === true ? 0.9 : 0;
  const gapWeight = face.gapBeats ?? 0;
  const signatureWidth = face.timeSignature === undefined ? 0 : gap * 2.6;
  const totalWeight =
    syllables.reduce(
      (total, syllable) => total + findSyllableWeight(syllable),
      0,
    ) +
    separatorWidth * Math.max(0, syllables.length - 1) +
    gapWeight +
    (face.isSum === true ? 1.4 : 0);
  const usableLeft = box.left + box.width * 0.08 + signatureWidth;
  const usableWidth = box.left + box.width * 0.92 - usableLeft;
  const unit = usableWidth / Math.max(1, totalWeight);
  context.fillStyle = notationPalette.ink;
  context.strokeStyle = notationPalette.ink;
  drawLine(
    context,
    box.left + box.width * 0.05,
    pen.lineY,
    box.left + box.width * 0.95,
    pen.lineY,
    gap * 0.08,
  );
  if (face.timeSignature !== undefined) {
    drawTimeSignatureNumbers(
      context,
      face.timeSignature,
      box.left + box.width * 0.08 + gap * 1.1,
      pen.lineY - gap * 1.2,
      gap * 0.9,
    );
  }
  let x = usableLeft;
  syllables.forEach((syllable, index) => {
    const spots = rhythmSyllables[syllable].map(({ beats, isRest }) => {
      const spot = { x: x + unit * 0.3, beats, isRest };
      x += unit * Math.max(smallestSoundWidth, beats);
      return spot;
    });
    drawRhythmSyllable(pen, syllable, spots);
    if (face.isSum === true && index < syllables.length - 1) {
      drawBigNumber(
        context,
        "+",
        x + unit * separatorWidth * 0.35,
        pen.lineY - gap * 1.5,
        gap * 3,
      );
      x += unit * separatorWidth;
    }
  });
  if (face.isSum === true) {
    drawBigNumber(
      context,
      "= ?",
      x + unit * 0.6,
      pen.lineY - gap * 1.5,
      gap * 2.6,
    );
  }
  if (face.gapBeats !== undefined) {
    context.save();
    context.strokeStyle = notationPalette.gap;
    context.setLineDash([gap * 0.6, gap * 0.4]);
    context.lineWidth = gap * 0.22;
    context.strokeRect(
      x + unit * 0.05,
      pen.lineY - gap * 4.4,
      unit * face.gapBeats - unit * 0.1,
      gap * 5.4,
    );
    context.restore();
    context.fillStyle = notationPalette.gap;
    drawBigNumber(
      context,
      "?",
      x + (unit * face.gapBeats) / 2,
      pen.lineY - gap * 1.8,
      gap * 3,
    );
  }
  if (face.timeSignature !== undefined) {
    drawLine(
      context,
      box.left + box.width * 0.94,
      pen.lineY - gap * 4.4,
      box.left + box.width * 0.94,
      pen.lineY + gap,
      gap * 0.2,
    );
  }
};

interface StaffPen {
  context: CanvasRenderingContext2D;
  gap: number;
  bottomLineY: number;
  left: number;
  right: number;
  clef: Clef;
}

const bottomLineSteps: Record<Clef, number> = {
  treble: findDiatonicStep(spellNote("E4")),
  bass: findDiatonicStep(spellNote("G2")),
};

const findStepY = ({ bottomLineY, gap }: StaffPen, step: number) =>
  bottomLineY - (step * gap) / 2;

const drawStaffLines = (pen: StaffPen) => {
  const { context, gap, left, right } = pen;
  for (let line = 0; line < 5; line++) {
    const y = findStepY(pen, line * 2);
    drawLine(context, left, y, right, y, gap * 0.09);
  }
};

const drawTrebleClef = (pen: StaffPen, x: number) => {
  const { context, gap } = pen;
  const at = (across: number, steps: number): [number, number] => [
    x + across * gap,
    findStepY(pen, steps),
  ];
  context.lineWidth = gap * 0.26;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(...at(0.15, 1.6));
  context.bezierCurveTo(...at(-0.9, 2.1), ...at(-0.6, 4.8), ...at(0.3, 4.6));
  context.bezierCurveTo(...at(1.3, 4.3), ...at(1.2, 0.6), ...at(0.1, 0.4));
  context.bezierCurveTo(...at(-1.4, 0.3), ...at(-1.5, 5), ...at(0.1, 7.6));
  context.bezierCurveTo(...at(0.8, 8.8), ...at(1.3, 10.6), ...at(0.5, 10.8));
  context.bezierCurveTo(...at(-0.3, 10.9), ...at(-0.4, 8.6), ...at(0.2, 6.4));
  context.lineTo(...at(0.75, -1.8));
  context.stroke();
  context.beginPath();
  context.arc(...at(0.3, -2.1), gap * 0.42, 0, Math.PI * 2);
  context.fill();
  context.lineCap = "butt";
};

const drawBassClef = (pen: StaffPen, x: number) => {
  const { context, gap } = pen;
  const at = (across: number, steps: number): [number, number] => [
    x + across * gap,
    findStepY(pen, steps),
  ];
  context.beginPath();
  context.arc(...at(-0.4, 6), gap * 0.42, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = gap * 0.3;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(...at(-0.55, 6.2));
  context.bezierCurveTo(...at(-0.4, 8.4), ...at(1.6, 8.2), ...at(1.5, 6));
  context.bezierCurveTo(...at(1.4, 3.6), ...at(0.2, 1.8), ...at(-0.7, 1));
  context.stroke();
  context.lineCap = "butt";
  for (const steps of [6.9, 5.1]) {
    context.beginPath();
    context.arc(...at(2.2, steps), gap * 0.17, 0, Math.PI * 2);
    context.fill();
  }
};

const drawSharpSign = (pen: StaffPen, x: number, y: number) => {
  const { context, gap } = pen;
  drawLine(
    context,
    x - gap * 0.2,
    y - gap * 1.2,
    x - gap * 0.2,
    y + gap * 1.1,
    gap * 0.1,
  );
  drawLine(
    context,
    x + gap * 0.2,
    y - gap * 1.1,
    x + gap * 0.2,
    y + gap * 1.2,
    gap * 0.1,
  );
  drawLine(
    context,
    x - gap * 0.45,
    y - gap * 0.25,
    x + gap * 0.45,
    y - gap * 0.55,
    gap * 0.26,
  );
  drawLine(
    context,
    x - gap * 0.45,
    y + gap * 0.55,
    x + gap * 0.45,
    y + gap * 0.25,
    gap * 0.26,
  );
};

const drawFlatSign = (pen: StaffPen, x: number, y: number) => {
  const { context, gap } = pen;
  drawLine(
    context,
    x - gap * 0.3,
    y - gap * 1.8,
    x - gap * 0.3,
    y + gap * 0.5,
    gap * 0.12,
  );
  context.lineWidth = gap * 0.18;
  context.beginPath();
  context.moveTo(x - gap * 0.3, y - gap * 0.1);
  context.bezierCurveTo(
    x + gap * 0.2,
    y - gap * 0.7,
    x + gap * 0.9,
    y - gap * 0.1,
    x - gap * 0.3,
    y + gap * 0.5,
  );
  context.stroke();
};

const sharpKeySteps: Record<Clef, string[]> = {
  treble: ["F5", "C5", "G5"],
  bass: ["F3", "C3", "G3"],
};
const flatKeySteps: Record<Clef, string[]> = {
  treble: ["B4", "E5", "A4"],
  bass: ["B2", "E3", "A2"],
};

const findNoteStep = (pen: StaffPen, note: string) =>
  findDiatonicStep(spellNote(note)) - bottomLineSteps[pen.clef];

const drawKeySignature = (
  pen: StaffPen,
  keySignature: number,
  startX: number,
): number => {
  const count = Math.min(3, Math.abs(keySignature));
  const notes = (keySignature > 0 ? sharpKeySteps : flatKeySteps)[pen.clef];
  for (let index = 0; index < count; index++) {
    const x = startX + index * pen.gap * 1.1;
    const y = findStepY(pen, findNoteStep(pen, notes[index]));
    if (keySignature > 0) {
      drawSharpSign(pen, x, y);
    } else {
      drawFlatSign(pen, x, y);
    }
  }
  return startX + count * pen.gap * 1.1;
};

const drawLedgerLines = (pen: StaffPen, x: number, step: number) => {
  const { context, gap } = pen;
  const ledgerSteps: number[] = [];
  for (let ledger = -2; ledger >= step; ledger -= 2) {
    ledgerSteps.push(ledger);
  }
  for (let ledger = 10; ledger <= step; ledger += 2) {
    ledgerSteps.push(ledger);
  }
  for (const ledger of ledgerSteps) {
    const y = findStepY(pen, ledger);
    drawLine(context, x - gap * 1.05, y, x + gap * 1.05, y, gap * 0.12);
  }
};

const noteValueOfBeats = (beats: number) => ({
  isFilled: beats < 2,
  hasStem: beats < 4,
  hasDot: beats === 3 || beats === 1.5 || beats === 0.75,
  flags: beats <= 0.25 ? 2 : beats <= 0.75 ? 1 : 0,
  isWide: beats >= 4,
});

const drawStaffChord = (
  pen: StaffPen,
  { notes, beats }: StaffChord,
  x: number,
) => {
  const { context, gap } = pen;
  const value = noteValueOfBeats(beats);
  const steps = notes.map((note) => findNoteStep(pen, note));
  const lowest = Math.min(...steps);
  const highest = Math.max(...steps);
  const isStemUp = (lowest + highest) / 2 < 4;
  notes.forEach((note, index) => {
    const step = steps[index];
    const y = findStepY(pen, step);
    drawLedgerLines(pen, x, step);
    const { accidental } = spellNote(note);
    if (accidental === 1) {
      drawSharpSign(pen, x - gap * 1.6, y);
    }
    if (accidental === -1) {
      drawFlatSign(pen, x - gap * 1.5, y);
    }
    drawEllipseHead(context, x, y, gap, value.isFilled, value.isWide);
    if (value.hasDot) {
      drawRhythmDot(
        context,
        x + gap * 1.2,
        step % 2 === 0 ? y - gap * 0.5 : y,
        gap,
      );
    }
  });
  if (!value.hasStem) {
    return;
  }
  const stemX = isStemUp ? x + gap * 0.56 : x - gap * 0.56;
  const fromY = findStepY(pen, isStemUp ? lowest : highest);
  const toY = isStemUp
    ? findStepY(pen, highest) - gap * 3.4
    : findStepY(pen, lowest) + gap * 3.4;
  drawLine(context, stemX, fromY, stemX, toY, gap * 0.16);
  drawFlags(context, stemX, toY, gap, value.flags, isStemUp);
};

const drawStaff = (
  context: CanvasRenderingContext2D,
  box: Box,
  face: Extract<NotationFace, { kind: "staff" }>,
) => {
  const gap = box.height * 0.1;
  const pen: StaffPen = {
    context,
    gap,
    bottomLineY: box.top + box.height * 0.5 + gap * 2,
    left: box.left + box.width * 0.04,
    right: box.left + box.width * 0.96,
    clef: face.clef,
  };
  context.fillStyle = notationPalette.ink;
  context.strokeStyle = notationPalette.ink;
  drawStaffLines(pen);
  const clefX = pen.left + gap * 1.4;
  if (face.clef === "treble") {
    drawTrebleClef(pen, clefX);
  } else {
    drawBassClef(pen, clefX - gap * 0.2);
  }
  let x = drawKeySignature(pen, face.keySignature, clefX + gap * 2.4);
  if (face.timeSignature !== undefined) {
    drawTimeSignatureNumbers(
      context,
      face.timeSignature,
      x + gap * 0.9,
      findStepY(pen, 4),
      gap,
    );
    x += gap * 2.2;
  }
  const noteAreaLeft = x + gap * 2;
  const noteAreaWidth = pen.right - gap * 1.4 - noteAreaLeft;
  const chordCount = face.chords.length;
  face.chords.forEach((chord, index) => {
    const chordX =
      chordCount === 1
        ? noteAreaLeft + noteAreaWidth / 2
        : noteAreaLeft + (noteAreaWidth * index) / (chordCount - 1);
    drawStaffChord(pen, chord, chordX);
  });
  if (face.timeSignature !== undefined) {
    drawLine(
      context,
      pen.right,
      findStepY(pen, 0),
      pen.right,
      findStepY(pen, 8),
      gap * 0.18,
    );
  }
};

const drawDots = (
  context: CanvasRenderingContext2D,
  box: Box,
  levels: readonly number[],
) => {
  const highest = Math.max(2, ...levels);
  const rowGap = (box.height * 0.6) / highest;
  const bottom = box.top + box.height * 0.8;
  context.strokeStyle = notationPalette.faint;
  for (let level = 0; level <= highest; level++) {
    const y = bottom - level * rowGap;
    drawLine(
      context,
      box.left + box.width * 0.08,
      y,
      box.left + box.width * 0.92,
      y,
      box.height * 0.012,
    );
  }
  const spacing = (box.width * 0.76) / Math.max(1, levels.length);
  levels.forEach((level, index) => {
    context.fillStyle =
      notationPalette.levels[level % notationPalette.levels.length];
    context.beginPath();
    context.arc(
      box.left + box.width * 0.12 + spacing * (index + 0.5),
      bottom - level * rowGap,
      box.height * 0.085,
      0,
      Math.PI * 2,
    );
    context.fill();
  });
};

const drawLengths = (
  context: CanvasRenderingContext2D,
  box: Box,
  lengths: readonly SoundLength[],
) => {
  const weights = lengths.map((length) => (length === "long" ? 3 : 1));
  const total = weights.reduce((sum, weight) => sum + weight + 0.6, 0);
  const unit = (box.width * 0.84) / total;
  const middleY = box.top + box.height * 0.5;
  const thickness = box.height * 0.2;
  let x = box.left + box.width * 0.08 + unit * 0.3;
  lengths.forEach((length, index) => {
    const width = unit * weights[index];
    context.fillStyle =
      length === "long" ? notationPalette.stamp : notationPalette.clap;
    context.beginPath();
    context.roundRect(
      x,
      middleY - thickness / 2,
      width,
      thickness,
      thickness / 2,
    );
    context.fill();
    x += width + unit * 0.6;
  });
};

const drawClapIcon = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => {
  context.fillStyle = notationPalette.clap;
  for (const side of [-1, 1]) {
    context.save();
    context.translate(x + side * size * 0.16, y);
    context.rotate(side * 0.35);
    context.beginPath();
    context.roundRect(
      -size * 0.17,
      -size * 0.38,
      size * 0.34,
      size * 0.7,
      size * 0.17,
    );
    context.fill();
    context.restore();
  }
  context.strokeStyle = notationPalette.clap;
  context.lineCap = "round";
  for (const angle of [-2.4, -1.57, -0.74]) {
    drawLine(
      context,
      x + Math.cos(angle) * size * 0.48,
      y - size * 0.1 + Math.sin(angle) * size * 0.48,
      x + Math.cos(angle) * size * 0.62,
      y - size * 0.1 + Math.sin(angle) * size * 0.62,
      size * 0.06,
    );
  }
  context.lineCap = "butt";
};

const drawStampIcon = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => {
  context.fillStyle = notationPalette.stamp;
  context.beginPath();
  context.ellipse(
    x,
    y + size * 0.08,
    size * 0.2,
    size * 0.32,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  [-0.17, -0.06, 0.05, 0.14, 0.21].forEach((across, index) => {
    context.beginPath();
    context.arc(
      x + across * size,
      y -
        size * (0.3 + (index === 0 ? 0.04 : 0)) -
        Math.abs(across) * size * 0.2,
      size * (index === 0 ? 0.075 : 0.055),
      0,
      Math.PI * 2,
    );
    context.fill();
  });
};

const drawClickIcon = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => {
  context.fillStyle = notationPalette.click;
  context.beginPath();
  context.arc(x, y + size * 0.05, size * 0.2, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = notationPalette.click;
  context.lineCap = "round";
  for (let ray = 0; ray < 6; ray++) {
    const angle = (ray / 6) * Math.PI * 2;
    drawLine(
      context,
      x + Math.cos(angle) * size * 0.3,
      y + size * 0.05 + Math.sin(angle) * size * 0.3,
      x + Math.cos(angle) * size * 0.44,
      y + size * 0.05 + Math.sin(angle) * size * 0.44,
      size * 0.06,
    );
  }
  context.lineCap = "butt";
};

const actionDrawers: Record<
  BodyAction,
  (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
  ) => void
> = { clap: drawClapIcon, stamp: drawStampIcon, click: drawClickIcon };

const drawActions = (
  context: CanvasRenderingContext2D,
  box: Box,
  actions: readonly BodyAction[],
) => {
  const spacing = (box.width * 0.86) / Math.max(1, actions.length);
  const size = Math.min(spacing * 0.9, box.height * 0.7);
  actions.forEach((action, index) => {
    actionDrawers[action](
      context,
      box.left + box.width * 0.07 + spacing * (index + 0.5),
      box.top + box.height * 0.5,
      size,
    );
  });
};

const drawFittedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  largestSize: number,
  widest: number,
  font: (size: number) => string,
) => {
  let size = largestSize;
  context.font = font(size);
  while (context.measureText(text).width > widest && size > 8) {
    size *= 0.9;
    context.font = font(size);
  }
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y);
};

const buildDynamicFont = (size: number) =>
  `italic 900 ${String(size)}px ${serifFont}`;
const buildWordFont = (size: number) => `800 ${String(size)}px ${roundFont}`;

const drawSymbol = (
  context: CanvasRenderingContext2D,
  box: Box,
  text: string,
) => {
  context.fillStyle = notationPalette.ink;
  drawFittedText(
    context,
    text,
    box.left + box.width / 2,
    box.top + box.height * 0.52,
    box.height * 0.62,
    box.width * 0.8,
    buildDynamicFont,
  );
};

const drawWords = (
  context: CanvasRenderingContext2D,
  box: Box,
  lines: readonly string[],
) => {
  context.fillStyle = notationPalette.ink;
  const lineHeight = (box.height * 0.8) / Math.max(1, lines.length);
  lines.forEach((line, index) => {
    if (index > 0) {
      context.fillStyle = notationPalette.stamp;
    }
    drawFittedText(
      context,
      line,
      box.left + box.width / 2,
      box.top + box.height * 0.1 + lineHeight * (index + 0.5),
      lineHeight * (index === 0 ? 0.78 : 0.56),
      box.width * 0.86,
      buildWordFont,
    );
  });
};

const drawHairpinShape = (
  context: CanvasRenderingContext2D,
  change: ChangeOverTime,
  left: number,
  right: number,
  middleY: number,
  opening: number,
) => {
  context.lineCap = "round";
  if (change === "steady") {
    drawLine(
      context,
      left,
      middleY - opening * 0.35,
      right,
      middleY - opening * 0.35,
      opening * 0.12,
    );
    drawLine(
      context,
      left,
      middleY + opening * 0.35,
      right,
      middleY + opening * 0.35,
      opening * 0.12,
    );
    context.lineCap = "butt";
    return;
  }
  const pointX = change === "rising" ? left : right;
  const openX = change === "rising" ? right : left;
  drawLine(
    context,
    pointX,
    middleY,
    openX,
    middleY - opening / 2,
    opening * 0.12,
  );
  drawLine(
    context,
    pointX,
    middleY,
    openX,
    middleY + opening / 2,
    opening * 0.12,
  );
  context.lineCap = "butt";
};

const drawHairpin = (
  context: CanvasRenderingContext2D,
  box: Box,
  change: ChangeOverTime,
) => {
  context.strokeStyle = notationPalette.ink;
  drawHairpinShape(
    context,
    change,
    box.left + box.width * 0.14,
    box.left + box.width * 0.86,
    box.top + box.height * 0.5,
    box.height * 0.5,
  );
};

const drawDynamicsJourney = (
  context: CanvasRenderingContext2D,
  box: Box,
  face: Extract<NotationFace, { kind: "dynamics-journey" }>,
) => {
  const middleY = box.top + box.height * 0.52;
  const symbolSize = box.height * 0.42;
  context.fillStyle = notationPalette.ink;
  context.strokeStyle = notationPalette.ink;
  drawFittedText(
    context,
    face.from,
    box.left + box.width * 0.17,
    middleY,
    symbolSize,
    box.width * 0.26,
    buildDynamicFont,
  );
  drawFittedText(
    context,
    face.to,
    box.left + box.width * 0.83,
    middleY,
    symbolSize,
    box.width * 0.26,
    buildDynamicFont,
  );
  if (face.isGradual) {
    const isRising =
      face.from.length <= face.to.length && face.to.includes("f");
    drawHairpinShape(
      context,
      isRising ? "rising" : "falling",
      box.left + box.width * 0.33,
      box.left + box.width * 0.67,
      middleY,
      box.height * 0.3,
    );
    return;
  }
  context.fillStyle = notationPalette.gap;
  drawFittedText(
    context,
    "sub.",
    box.left + box.width / 2,
    middleY,
    box.height * 0.24,
    box.width * 0.28,
    buildDynamicFont,
  );
};

const drawBeatGroups = (
  context: CanvasRenderingContext2D,
  box: Box,
  beatsPerBar: number,
) => {
  const barCount = 2;
  const total = beatsPerBar * barCount;
  const spacing = (box.width * 0.84) / (total + 0.6);
  const middleY = box.top + box.height * 0.52;
  context.fillStyle = notationPalette.ink;
  for (let beat = 0; beat < total; beat++) {
    const isStrong = beat % beatsPerBar === 0;
    const x =
      box.left +
      box.width * 0.08 +
      spacing * (beat + 0.5 + (beat >= beatsPerBar ? 0.6 : 0));
    context.fillStyle = isStrong ? notationPalette.gap : notationPalette.ink;
    context.beginPath();
    context.arc(
      x,
      middleY,
      isStrong ? box.height * 0.13 : box.height * 0.065,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.strokeStyle = notationPalette.ink;
  const barX = box.left + box.width * 0.08 + spacing * (beatsPerBar + 0.3);
  drawLine(
    context,
    barX,
    middleY - box.height * 0.24,
    barX,
    middleY + box.height * 0.24,
    box.height * 0.025,
  );
};

const drawTempoDots = (
  context: CanvasRenderingContext2D,
  box: Box,
  change: ChangeOverTime,
) => {
  const count = 7;
  const gaps = Array.from({ length: count - 1 }, (_, index) => {
    if (change === "steady") {
      return 1;
    }
    const share = index / (count - 2);
    return change === "rising" ? 1.7 - share * 1.3 : 0.4 + share * 1.3;
  });
  const total = gaps.reduce((sum, gapWidth) => sum + gapWidth, 0);
  const unit = (box.width * 0.8) / total;
  let x = box.left + box.width * 0.1;
  context.fillStyle = notationPalette.ink;
  for (let index = 0; index < count; index++) {
    context.beginPath();
    context.arc(
      x,
      box.top + box.height * 0.52,
      box.height * 0.07,
      0,
      Math.PI * 2,
    );
    context.fill();
    x += (gaps[index] ?? 0) * unit;
  }
};

const drawBeatGrid = (
  context: CanvasRenderingContext2D,
  box: Box,
  isSyncopated: boolean,
) => {
  const beats = 4;
  const spacing = (box.width * 0.8) / beats;
  const top = box.top + box.height * 0.2;
  const bottom = box.top + box.height * 0.82;
  context.strokeStyle = notationPalette.faint;
  for (let beat = 0; beat <= beats; beat++) {
    const x = box.left + box.width * 0.1 + spacing * beat;
    drawLine(context, x, top, x, bottom, box.height * 0.02);
  }
  context.fillStyle = isSyncopated
    ? notationPalette.gap
    : notationPalette.stamp;
  for (let beat = 0; beat < beats; beat++) {
    const x =
      box.left + box.width * 0.1 + spacing * (beat + (isSyncopated ? 0.5 : 0));
    context.beginPath();
    context.arc(x, (top + bottom) / 2, box.height * 0.09, 0, Math.PI * 2);
    context.fill();
  }
};

const drawTimeSignatureCard = (
  context: CanvasRenderingContext2D,
  box: Box,
  signature: TimeSignature,
) => {
  const gap = box.height * 0.13;
  const middleY = box.top + box.height * 0.5;
  context.strokeStyle = notationPalette.faint;
  for (let line = -2; line <= 2; line++) {
    drawLine(
      context,
      box.left + box.width * 0.22,
      middleY + line * gap,
      box.left + box.width * 0.78,
      middleY + line * gap,
      gap * 0.08,
    );
  }
  context.fillStyle = notationPalette.ink;
  drawTimeSignatureNumbers(
    context,
    signature,
    box.left + box.width / 2,
    middleY,
    gap * 1.15,
  );
};

const drawArticulation = (
  context: CanvasRenderingContext2D,
  box: Box,
  articulation: Articulation,
) => {
  const gap = box.height * 0.085;
  const pen: RhythmPen = {
    context,
    lineY: box.top + box.height * 0.66,
    gap,
    stemHeight: gap * 3.2,
  };
  const xs = [0.2, 0.4, 0.6, 0.8].map(
    (share) => box.left + box.width * share - gap * 0.6,
  );
  context.fillStyle = notationPalette.ink;
  context.strokeStyle = notationPalette.ink;
  for (const x of xs) {
    drawStemmedHead(pen, x, true);
  }
  if (articulation === "legato") {
    context.lineWidth = gap * 0.2;
    context.beginPath();
    context.moveTo(xs[0], pen.lineY + gap * 1.1);
    context.quadraticCurveTo(
      (xs[0] + xs[3]) / 2,
      pen.lineY + gap * 3.2,
      xs[3],
      pen.lineY + gap * 1.1,
    );
    context.stroke();
    return;
  }
  for (const x of xs) {
    if (articulation === "staccato") {
      drawRhythmDot(context, x, pen.lineY + gap * 1.3, gap * 1.4);
    } else {
      drawLine(
        context,
        x - gap * 0.6,
        pen.lineY + gap * 1,
        x + gap * 0.6,
        pen.lineY + gap * 1.5,
        gap * 0.18,
      );
      drawLine(
        context,
        x + gap * 0.6,
        pen.lineY + gap * 1.5,
        x - gap * 0.6,
        pen.lineY + gap * 2,
        gap * 0.18,
      );
    }
  }
};

type IconDrawer = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => void;

const strokeWith = (
  context: CanvasRenderingContext2D,
  colour: string,
  width: number,
) => {
  context.strokeStyle = colour;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
};

const drawWave = (
  context: CanvasRenderingContext2D,
  left: number,
  right: number,
  y: number,
  height: number,
) => {
  context.beginPath();
  for (let step = 0; step <= 24; step++) {
    const x = left + ((right - left) * step) / 24;
    const waveY = y + Math.sin((step / 24) * Math.PI * 3) * height;
    if (step === 0) {
      context.moveTo(x, waveY);
    } else {
      context.lineTo(x, waveY);
    }
  }
  context.stroke();
};

const pictureDrawers: Record<PictureIcon, IconDrawer> = {
  house: (context, x, y, size) => {
    context.fillStyle = notationPalette.gap;
    context.beginPath();
    context.moveTo(x - size * 0.42, y - size * 0.02);
    context.lineTo(x, y - size * 0.4);
    context.lineTo(x + size * 0.42, y - size * 0.02);
    context.closePath();
    context.fill();
    context.fillStyle = notationPalette.stamp;
    context.fillRect(x - size * 0.3, y - size * 0.02, size * 0.6, size * 0.42);
    context.fillStyle = notationPalette.paper;
    context.fillRect(
      x - size * 0.07,
      y + size * 0.16,
      size * 0.14,
      size * 0.24,
    );
  },
  question: (context, x, y, size) => {
    context.fillStyle = notationPalette.clap;
    drawFittedText(
      context,
      "?",
      x,
      y + size * 0.04,
      size * 0.95,
      size,
      buildWordFont,
    );
  },
  same: (context, x, y, size) => {
    context.fillStyle = notationPalette.stamp;
    for (const side of [-1, 1]) {
      context.beginPath();
      context.arc(x + side * size * 0.24, y, size * 0.18, 0, Math.PI * 2);
      context.fill();
    }
  },
  different: (context, x, y, size) => {
    context.fillStyle = notationPalette.stamp;
    context.beginPath();
    context.arc(x - size * 0.24, y, size * 0.18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = notationPalette.gap;
    context.beginPath();
    context.moveTo(x + size * 0.24, y - size * 0.2);
    context.lineTo(x + size * 0.44, y + size * 0.17);
    context.lineTo(x + size * 0.04, y + size * 0.17);
    context.closePath();
    context.fill();
  },
  blown: (context, x, y, size) => {
    strokeWith(context, notationPalette.stamp, size * 0.06);
    for (const row of [-1, 0, 1]) {
      drawWave(
        context,
        x - size * 0.4,
        x + size * 0.4,
        y + row * size * 0.2,
        size * 0.05,
      );
    }
  },
  bowed: (context, x, y, size) => {
    strokeWith(context, notationPalette.ink, size * 0.04);
    drawLine(context, x, y - size * 0.45, x, y + size * 0.45, size * 0.04);
    strokeWith(context, notationPalette.clap, size * 0.08);
    drawLine(
      context,
      x - size * 0.45,
      y + size * 0.22,
      x + size * 0.45,
      y - size * 0.1,
      size * 0.08,
    );
    strokeWith(context, notationPalette.ink, size * 0.03);
    drawLine(
      context,
      x - size * 0.45,
      y + size * 0.3,
      x + size * 0.45,
      y - size * 0.02,
      size * 0.03,
    );
  },
  plucked: (context, x, y, size) => {
    strokeWith(context, notationPalette.ink, size * 0.04);
    context.beginPath();
    context.moveTo(x - size * 0.1, y - size * 0.45);
    context.quadraticCurveTo(
      x + size * 0.25,
      y,
      x - size * 0.1,
      y + size * 0.45,
    );
    context.stroke();
    context.fillStyle = notationPalette.clap;
    context.beginPath();
    context.ellipse(
      x + size * 0.18,
      y,
      size * 0.1,
      size * 0.16,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
  },
  struck: (context, x, y, size) => {
    strokeWith(context, notationPalette.ink, size * 0.06);
    drawLine(
      context,
      x - size * 0.4,
      y - size * 0.35,
      x + size * 0.05,
      y + size * 0.05,
      size * 0.06,
    );
    context.fillStyle = notationPalette.gap;
    context.beginPath();
    context.arc(x + size * 0.1, y + size * 0.1, size * 0.13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = notationPalette.stamp;
    context.fillRect(
      x - size * 0.35,
      y + size * 0.26,
      size * 0.75,
      size * 0.12,
    );
  },
  chase: (context, x, y, size) => {
    strokeWith(context, notationPalette.gap, size * 0.08);
    for (const row of [-1, 0, 1]) {
      drawLine(
        context,
        x - size * 0.4 + Math.abs(row) * size * 0.1,
        y + row * size * 0.2,
        x + size * 0.1,
        y + row * size * 0.2,
        size * 0.08,
      );
    }
    context.fillStyle = notationPalette.gap;
    context.beginPath();
    context.moveTo(x + size * 0.15, y - size * 0.3);
    context.lineTo(x + size * 0.45, y);
    context.lineTo(x + size * 0.15, y + size * 0.3);
    context.closePath();
    context.fill();
  },
  sneaking: (context, x, y, size) => {
    context.fillStyle = notationPalette.ink;
    [
      [-0.25, 0.22],
      [0, -0.02],
      [0.25, 0.2],
    ].forEach(([across, down], index) => {
      context.beginPath();
      context.ellipse(
        x + across * size,
        y + down * size,
        size * 0.07,
        size * 0.12,
        index % 2 === 0 ? -0.3 : 0.3,
        0,
        Math.PI * 2,
      );
      context.fill();
    });
  },
  triumph: (context, x, y, size) => {
    context.fillStyle = "#e0a91f";
    context.beginPath();
    context.moveTo(x - size * 0.28, y - size * 0.36);
    context.lineTo(x + size * 0.28, y - size * 0.36);
    context.quadraticCurveTo(
      x + size * 0.26,
      y + size * 0.08,
      x,
      y + size * 0.1,
    );
    context.quadraticCurveTo(
      x - size * 0.26,
      y + size * 0.08,
      x - size * 0.28,
      y - size * 0.36,
    );
    context.fill();
    context.fillRect(x - size * 0.05, y + size * 0.08, size * 0.1, size * 0.18);
    context.fillRect(x - size * 0.2, y + size * 0.26, size * 0.4, size * 0.1);
    strokeWith(context, "#e0a91f", size * 0.05);
    for (const side of [-1, 1]) {
      context.beginPath();
      context.arc(
        x + side * size * 0.3,
        y - size * 0.22,
        size * 0.1,
        side === -1 ? Math.PI * 0.5 : -Math.PI * 0.5,
        side === -1 ? Math.PI * 1.5 : Math.PI * 0.5,
      );
      context.stroke();
    }
  },
  spooky: (context, x, y, size) => {
    context.fillStyle = "#e8e6f5";
    context.strokeStyle = notationPalette.ink;
    context.lineWidth = size * 0.03;
    context.beginPath();
    context.moveTo(x - size * 0.3, y + size * 0.35);
    context.lineTo(x - size * 0.3, y - size * 0.05);
    context.arc(x, y - size * 0.05, size * 0.3, Math.PI, 0);
    context.lineTo(x + size * 0.3, y + size * 0.35);
    for (let wave = 0; wave < 3; wave++) {
      const fromX = x + size * 0.3 - wave * size * 0.2;
      context.quadraticCurveTo(
        fromX - size * 0.05,
        y + size * 0.22,
        fromX - size * 0.1,
        y + size * 0.35,
      );
      context.quadraticCurveTo(
        fromX - size * 0.15,
        y + size * 0.22,
        fromX - size * 0.2,
        y + size * 0.35,
      );
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = notationPalette.ink;
    for (const side of [-1, 1]) {
      context.beginPath();
      context.ellipse(
        x + side * size * 0.1,
        y - size * 0.08,
        size * 0.05,
        size * 0.08,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  },
  unison: (context, x, y, size) => {
    strokeWith(context, notationPalette.stamp, size * 0.12);
    drawWave(context, x - size * 0.42, x + size * 0.42, y, size * 0.12);
    strokeWith(context, notationPalette.clap, size * 0.04);
    drawWave(context, x - size * 0.42, x + size * 0.42, y, size * 0.12);
  },
  harmony: (context, x, y, size) => {
    strokeWith(context, notationPalette.stamp, size * 0.06);
    drawWave(
      context,
      x - size * 0.42,
      x + size * 0.42,
      y - size * 0.14,
      size * 0.1,
    );
    strokeWith(context, notationPalette.clap, size * 0.06);
    drawWave(
      context,
      x - size * 0.42,
      x + size * 0.42,
      y + size * 0.14,
      size * 0.1,
    );
  },
  round: (context, x, y, size) => {
    strokeWith(context, notationPalette.stamp, size * 0.06);
    drawWave(
      context,
      x - size * 0.45,
      x + size * 0.2,
      y - size * 0.14,
      size * 0.1,
    );
    strokeWith(context, notationPalette.clap, size * 0.06);
    drawWave(
      context,
      x - size * 0.2,
      x + size * 0.45,
      y + size * 0.14,
      size * 0.1,
    );
  },
};

const drawPicture = (
  context: CanvasRenderingContext2D,
  box: Box,
  icon: PictureIcon,
) => {
  context.save();
  pictureDrawers[icon](
    context,
    box.left + box.width / 2,
    box.top + box.height / 2,
    Math.min(box.width, box.height) * 0.9,
  );
  context.restore();
};

export const drawNotationFace = (
  context: CanvasRenderingContext2D,
  face: NotationFace,
  width: number,
  height: number,
): void => {
  fillBackground(context, { width, height });
  const box: Box = { left: 0, top: 0, width, height };
  context.save();
  switch (face.kind) {
    case "rhythm":
      drawRhythm(context, box, face);
      break;
    case "staff":
      drawStaff(context, box, face);
      break;
    case "dots":
      drawDots(context, box, face.levels);
      break;
    case "lengths":
      drawLengths(context, box, face.lengths);
      break;
    case "actions":
      drawActions(context, box, face.actions);
      break;
    case "symbol":
      drawSymbol(context, box, face.text);
      break;
    case "word":
      drawWords(context, box, face.lines);
      break;
    case "hairpin":
      drawHairpin(context, box, face.change);
      break;
    case "dynamics-journey":
      drawDynamicsJourney(context, box, face);
      break;
    case "picture":
      drawPicture(context, box, face.icon);
      break;
    case "beat-groups":
      drawBeatGroups(context, box, face.beatsPerBar);
      break;
    case "tempo-dots":
      drawTempoDots(context, box, face.change);
      break;
    case "beat-grid":
      drawBeatGrid(context, box, face.isSyncopated);
      break;
    case "time-signature":
      drawTimeSignatureCard(context, box, face.signature);
      break;
    case "articulation":
      drawArticulation(context, box, face.articulation);
      break;
  }
  context.restore();
};

export const notationFonts = [buildWordFont(48), buildDynamicFont(48)];
