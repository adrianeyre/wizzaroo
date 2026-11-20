import { describeFraction } from "../../curriculum/fractions.js";

/**
 * Turns a question as it is written on screen into words a speech voice
 * reads as a grown-up would say them: "9 + ? = 20" becomes
 * "9 plus what equals 20", and a gap in a sentence is read as "blank".
 */
export const toSpokenWords = (text: string): string =>
  text
    .replaceAll(/([^.!?:\s])[^\S\n]*\n/g, "$1.\n")
    .replaceAll(/_{2,}/g, " blank ")
    .replaceAll(/(\d+)\/(\d+)/g, (fraction) => describeFraction(fraction))
    .replaceAll(/°C\b/g, " degrees Celsius")
    .replaceAll("°", " degrees")
    .replaceAll(/=\s*$/g, " equals what?")
    .replaceAll(/(^|\s)\?(?=\s|,|$)/g, "$1what")
    .replaceAll("+", " plus ")
    .replaceAll("−", " minus ")
    .replaceAll(/(\d)\s+-\s+(?=\d)/g, "$1 minus ")
    .replaceAll("×", " times ")
    .replaceAll("÷", " divided by ")
    .replaceAll("=", " equals ")
    .replaceAll(/\s+([,.!?])/g, "$1")
    .replaceAll(/\s+/g, " ")
    .trim();
