import type { FastifyServerOptions } from "fastify";

type AjvOptions = NonNullable<FastifyServerOptions["ajv"]>;
type Ajv = Parameters<NonNullable<AjvOptions["onCreate"]>>[0];

const datePattern = /^(\d{4})-\d{2}-\d{2}/;
const dateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})[t\s](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:z|([+-])(\d{2})(?::?(\d{2}))?)$/i;

const buildUtcMoment = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number => {
  const moment = new Date(0);
  // setUTCFullYear, unlike Date.UTC, doesn't read a year below 100 as 1900 onwards.
  moment.setUTCFullYear(year, month - 1, day);
  moment.setUTCHours(hour, minute, second, 0);
  return moment.getTime();
};

/** The first moment of year 1 and of year 10000: Postgres reads no year 0, and no year with five digits as written. */
const earliestHeldMoment = buildUtcMoment(1, 1, 1);
const firstMomentAfterHeld = buildUtcMoment(10000, 1, 1);

/** Whether a `date` the format took is one Postgres can read: there is no year 0000 (#297). */
export const isHeldDate = (text: string): boolean => {
  const match = datePattern.exec(text);
  return match !== null && Number(match[1]) >= 1;
};

/**
 * Whether a `date-time` the format took names a moment from year 1 to year
 * 9999 in UTC, so neither Postgres nor `Date.toISOString` writes a year 0000
 * or 10000 for it: `0001-01-01T00:00:00+01:00` is in year 0 (#297).
 */
export const isHeldDateTime = (text: string): boolean => {
  const match = dateTimePattern.exec(text);
  if (match === null) {
    return false;
  }
  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
    second,
    sign,
    offsetHours = "0",
    offsetMinutes = "0",
  ] = match;
  const offsetMs =
    (sign === "-" ? -1 : 1) *
    (Number(offsetHours) * 60 + Number(offsetMinutes)) *
    60_000;
  const moment =
    buildUtcMoment(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      // A leap second's 60 is the same moment, near enough, as 59.
      Math.min(Number(second), 59),
    ) - offsetMs;
  return moment >= earliestHeldMoment && moment < firstMomentAfterHeld;
};

const isTextCheck = (check: unknown): check is (text: string) => unknown =>
  typeof check === "function";

const narrowFormat = (
  ajv: Ajv,
  name: "date" | "date-time",
  isHeld: (text: string) => boolean,
): void => {
  const format = ajv.formats[name];
  const check =
    typeof format === "object" && "validate" in format
      ? format.validate
      : undefined;
  if (!isTextCheck(check)) {
    throw new Error(`Ajv has no ${name} format to narrow`);
  }
  ajv.addFormat(name, {
    type: "string",
    validate: (text: string) => check(text) === true && isHeld(text),
  });
};

/**
 * Narrows Ajv's `date` and `date-time` formats, which take any four-digit
 * year, to the dates and moments Postgres can hold, so one outside them is
 * refused with a 400 before any query (#297).
 */
export const narrowDateFormats = (ajv: Ajv): void => {
  narrowFormat(ajv, "date", isHeldDate);
  narrowFormat(ajv, "date-time", isHeldDateTime);
};
