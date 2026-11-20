import { describe, expect, it } from "vitest";
import {
  describeSchoolYear,
  findHomeYearGroup,
  findSchoolYear,
} from "./year-groups.js";

const ukMoment = (isoDateTime: string): Date => new Date(isoDateTime);

describe("findSchoolYear", () => {
  it("puts a Child born in March 2020 in Year 2 from September 2026", () => {
    expect(
      findSchoolYear(
        { birthMonth: 3, birthYear: 2020, yearGroupAdjustment: 0 },
        ukMoment("2026-09-07T09:00:00Z"),
      ),
    ).toBe(2);
  });

  it("puts a Child born in October 2020 in Year 1 from September 2026", () => {
    expect(
      findSchoolYear(
        { birthMonth: 10, birthYear: 2020, yearGroupAdjustment: 0 },
        ukMoment("2026-09-07T09:00:00Z"),
      ),
    ).toBe(1);
  });

  it.each([
    { birthMonth: 8, birthYear: 2020, schoolYear: 2 },
    { birthMonth: 9, birthYear: 2020, schoolYear: 1 },
    { birthMonth: 12, birthYear: 2019, schoolYear: 2 },
    { birthMonth: 1, birthYear: 2020, schoolYear: 2 },
  ])(
    "puts a Child born in month $birthMonth of $birthYear in Year $schoolYear in the 2026-27 school year",
    ({ birthMonth, birthYear, schoolYear }) => {
      expect(
        findSchoolYear(
          { birthMonth, birthYear, yearGroupAdjustment: 0 },
          ukMoment("2027-03-01T12:00:00Z"),
        ),
      ).toBe(schoolYear);
    },
  );

  it("keeps a Child in their year on 31 August and moves them up on 1 September, UK time", () => {
    const birth = {
      birthMonth: 3,
      birthYear: 2020,
      yearGroupAdjustment: 0,
    } as const;

    expect(findSchoolYear(birth, ukMoment("2026-08-31T22:59:59Z"))).toBe(1);
    expect(findSchoolYear(birth, ukMoment("2026-08-31T23:00:00Z"))).toBe(2);
  });

  it("carries a Year Group adjustment forward across a September", () => {
    const deferred = {
      birthMonth: 7,
      birthYear: 2020,
      yearGroupAdjustment: -1,
    } as const;

    expect(findSchoolYear(deferred, ukMoment("2026-08-15T12:00:00Z"))).toBe(0);
    expect(findSchoolYear(deferred, ukMoment("2026-09-15T12:00:00Z"))).toBe(1);
    expect(
      findSchoolYear(
        { ...deferred, yearGroupAdjustment: 1 },
        ukMoment("2026-09-15T12:00:00Z"),
      ),
    ).toBe(3);
  });

  it("works out Reception and past Year 6", () => {
    const moment = ukMoment("2026-10-01T12:00:00Z");

    expect(
      findSchoolYear(
        { birthMonth: 2, birthYear: 2022, yearGroupAdjustment: 0 },
        moment,
      ),
    ).toBe(0);
    expect(
      findSchoolYear(
        { birthMonth: 2, birthYear: 2014, yearGroupAdjustment: 0 },
        moment,
      ),
    ).toBe(8);
  });
});

describe("findHomeYearGroup", () => {
  it("plays Reception on Island 1 and past Year 6 on Island 6", () => {
    expect(findHomeYearGroup(0)).toBe(1);
    expect(findHomeYearGroup(-1)).toBe(1);
    expect(findHomeYearGroup(4)).toBe(4);
    expect(findHomeYearGroup(7)).toBe(6);
  });
});

describe("describeSchoolYear", () => {
  it("names Reception, the Years, and Children not at school yet", () => {
    expect(describeSchoolYear(0)).toBe("Reception");
    expect(describeSchoolYear(3)).toBe("Year 3");
    expect(describeSchoolYear(-1)).toBe("Not yet at school");
  });
});
