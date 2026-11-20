export const yearGroups = [1, 2, 3, 4, 5, 6] as const;
export type YearGroup = (typeof yearGroups)[number];

export const yearGroupAdjustments = [-1, 0, 1] as const;
export type YearGroupAdjustment = (typeof yearGroupAdjustments)[number];

export const receptionYear = 0;

const septemberMonth = 9;
const yearsFromAutumnBirthToYear1 = 6;
const yearsFromSpringOrSummerBirthToYear1 = 5;

export interface BirthMonthAndYear {
  birthMonth: number;
  birthYear: number;
}

export interface ChildBirth extends BirthMonthAndYear {
  yearGroupAdjustment: YearGroupAdjustment;
}

export const isYearGroup = (value: unknown): value is YearGroup =>
  yearGroups.some((yearGroup) => yearGroup === value);

export const isYearGroupAdjustment = (
  value: unknown,
): value is YearGroupAdjustment =>
  yearGroupAdjustments.some((adjustment) => adjustment === value);

const ukYearAndMonthFormat = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "numeric",
  timeZone: "Europe/London",
});

const findUkYearAndMonth = (moment: Date): { year: number; month: number } => {
  const parts = ukYearAndMonthFormat.formatToParts(moment);
  const readPart = (type: "year" | "month"): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: readPart("year"), month: readPart("month") };
};

// The English school year runs from 1 September to 31 August, so it starts in the calendar year of the September before.
const findSchoolYearStart = (moment: Date): number => {
  const { year, month } = findUkYearAndMonth(moment);
  return month >= septemberMonth ? year : year - 1;
};

const findYear1Start = ({ birthMonth, birthYear }: BirthMonthAndYear): number =>
  birthYear +
  (birthMonth >= septemberMonth
    ? yearsFromAutumnBirthToYear1
    : yearsFromSpringOrSummerBirthToYear1);

/** The Child's school year on that moment: 0 is Reception, 1 to 6 are Years 1 to 6, and more is past Year 6. */
export const findSchoolYear = (
  { birthMonth, birthYear, yearGroupAdjustment }: ChildBirth,
  moment: Date,
): number =>
  findSchoolYearStart(moment) -
  findYear1Start({ birthMonth, birthYear }) +
  1 +
  yearGroupAdjustment;

/** The Year Group whose Island a Child plays on: Reception plays on Island 1, and past Year 6 stays on Island 6, with every Island below it open. */
export const findHomeYearGroup = (schoolYear: number): YearGroup =>
  yearGroups.find((yearGroup) => yearGroup === schoolYear) ??
  (schoolYear < 1 ? 1 : 6);

export const describeSchoolYear = (schoolYear: number): string => {
  if (schoolYear === receptionYear) {
    return "Reception";
  }
  return schoolYear < receptionYear
    ? "Not yet at school"
    : `Year ${String(schoolYear)}`;
};
