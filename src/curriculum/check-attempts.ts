import {
  isCheckGameType,
  type CheckAttempt,
  type CheckOutcome,
} from "./checks.js";

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

export const isCheckOutcome = (value: unknown): value is CheckOutcome =>
  typeof value === "object" &&
  value !== null &&
  "key" in value &&
  typeof value.key === "string" &&
  "questionType" in value &&
  typeof value.questionType === "string" &&
  "skillId" in value &&
  typeof value.skillId === "string" &&
  "isRight" in value &&
  typeof value.isRight === "boolean" &&
  "isInTime" in value &&
  typeof value.isInTime === "boolean" &&
  "millisecondsTaken" in value &&
  isCount(value.millisecondsTaken);

export const isCheckAttempt = (value: unknown): value is CheckAttempt =>
  typeof value === "object" &&
  value !== null &&
  "checkGameType" in value &&
  isCheckGameType(value.checkGameType) &&
  "isClockOff" in value &&
  typeof value.isClockOff === "boolean" &&
  "outcomes" in value &&
  Array.isArray(value.outcomes) &&
  value.outcomes.every(isCheckOutcome) &&
  "finishedAt" in value &&
  typeof value.finishedAt === "string" &&
  "localDate" in value &&
  typeof value.localDate === "string" &&
  "score" in value &&
  isCount(value.score) &&
  "questionCount" in value &&
  isCount(value.questionCount);

export const isCheckHistory = (value: unknown): value is CheckAttempt[] =>
  Array.isArray(value) && value.every(isCheckAttempt);

export const describeCheckScore = ({
  score,
  questionCount,
}: Pick<CheckAttempt, "score" | "questionCount">): string =>
  `${String(score)} out of ${String(questionCount)}`;
