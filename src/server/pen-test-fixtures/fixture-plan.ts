import {
  findSchoolYear,
  type ChildBirth,
  type YearGroup,
} from "../../curriculum/year-groups.js";
import type { PlayEventContent } from "../family-devices/play-event-routes.js";
import type { UserRole } from "../schema.js";

const buildFixtureId = (kindCode: string, number: number): string =>
  `e2000000-0000-4000-8000-${kindCode}${String(number).padStart(10, "0")}`;

export const penTestFixtureIds = {
  schoolA: buildFixtureId("5c", 1),
  schoolB: buildFixtureId("5c", 2),
  admin: buildFixtureId("ad", 1),
  teacherAYear3: buildFixtureId("ad", 2),
  teacherAYears5And6: buildFixtureId("ad", 3),
  teacherBYear3: buildFixtureId("ad", 4),
  teacherADeactivated: buildFixtureId("ad", 5),
  parentA1: buildFixtureId("ad", 11),
  coParentA1: buildFixtureId("ad", 12),
  parentA2PasskeyOnly: buildFixtureId("ad", 21),
  coParentA2Invited: buildFixtureId("ad", 22),
  parentB: buildFixtureId("ad", 31),
  coParentBInviteExpired: buildFixtureId("ad", 32),
  familyA1: buildFixtureId("fa", 1),
  familyA2: buildFixtureId("fa", 2),
  familyB: buildFixtureId("fa", 3),
  childA1Year3: buildFixtureId("c1", 1),
  childA1Year5: buildFixtureId("c1", 2),
  childA2Year3: buildFixtureId("c1", 3),
  childA2Year3Twin: buildFixtureId("c1", 4),
  childBYear3: buildFixtureId("c1", 5),
  familyDeviceA1: buildFixtureId("de", 1),
  familyDeviceA1Revoked: buildFixtureId("de", 2),
  familyDeviceA2: buildFixtureId("de", 3),
  familyDeviceB: buildFixtureId("de", 4),
  inviteTeacherAYear3Accepted: buildFixtureId("1a", 1),
  inviteParentA1Accepted: buildFixtureId("1a", 2),
  inviteParentA2Accepted: buildFixtureId("1a", 3),
  inviteCoParentA2Pending: buildFixtureId("1a", 4),
  inviteCoParentBExpired: buildFixtureId("1a", 5),
  deletionRequestFamilyB: buildFixtureId("d0", 1),
} as const;

const ids = penTestFixtureIds;

export const penTestFixtureEmailDomain = "pen-test.example";

export interface FixtureSchool {
  id: string;
  name: string;
  town: string;
  classmateVisitsApproved: boolean;
  createdAt: Date;
}

export interface FixtureAdult {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  hasPassword: boolean;
  hasTotp: boolean;
  hasPasskey: boolean;
  emailConfirmedAt: Date | null;
  deactivatedAt: Date | null;
  createdAt: Date;
}

export interface FixtureTeacher {
  userId: string;
  schoolId: string;
  yearGroups: YearGroup[];
}

export interface FixtureFamily {
  id: string;
  name: string;
  parentIds: string[];
  schoolId: string;
  createdAt: Date;
}

export interface FixtureChild extends ChildBirth {
  id: string;
  familyId: string;
  schoolId: string;
  nickname: string;
  characterName: string;
  phonicsProgrammeId: string;
  classmateVisitsAllowed: boolean;
  createdAt: Date;
}

export interface FixtureFamilyDevice {
  id: string;
  familyId: string;
  name: string;
  createdAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
}

export interface FixtureInvite {
  id: string;
  userId: string;
  createdByUserId: string;
  emailedTo: string | null;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
}

export interface FixtureDeletionRequest {
  id: string;
  familyId: string;
  childId: string | null;
  requestedByUserId: string;
  createdAt: Date;
}

export type FixturePlayEvent = PlayEventContent & {
  id: string;
  familyId: string;
  familyDeviceId: string;
  childId: string;
  happenedAt: Date;
  receivedAt: Date;
};

export interface PenTestFixturePlan {
  day: Date;
  schools: FixtureSchool[];
  adults: FixtureAdult[];
  teachers: FixtureTeacher[];
  families: FixtureFamily[];
  children: FixtureChild[];
  familyDevices: FixtureFamilyDevice[];
  invites: FixtureInvite[];
  deletionRequests: FixtureDeletionRequest[];
  playEvents: FixturePlayEvent[];
}

const millisecondsPerMinute = 60_000;
const millisecondsPerDay = 24 * 60 * millisecondsPerMinute;
const sessionStartHourUtc = 16;
const oldestBirthYearSearched = 16;

const ukDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
});

const getUkDay = (moment: Date): Date =>
  new Date(`${ukDateFormat.format(moment)}T00:00:00.000Z`);

const addMinutes = (moment: Date, minutes: number): Date =>
  new Date(moment.getTime() + minutes * millisecondsPerMinute);

const getLocalDate = (moment: Date): string =>
  moment.toISOString().slice(0, 10);

const findBirthInSchoolYear = (
  birthMonth: number,
  schoolYear: YearGroup,
  today: Date,
): ChildBirth => {
  const candidateBirths: ChildBirth[] = Array.from(
    { length: oldestBirthYearSearched },
    (_, yearsAgo) => ({
      birthMonth,
      birthYear: today.getUTCFullYear() - yearsAgo,
      yearGroupAdjustment: 0,
    }),
  );
  const birth = candidateBirths.find(
    (candidateBirth) => findSchoolYear(candidateBirth, today) === schoolYear,
  );
  if (birth === undefined) {
    throw new Error(
      `No birth in month ${String(birthMonth)} is in Year ${String(schoolYear)} today`,
    );
  }
  return birth;
};

const buildEmail = (handle: string): string =>
  `${handle}@${penTestFixtureEmailDomain}`;

interface FixtureSession {
  childNumber: number;
  sessionNumber: number;
  childId: string;
  familyId: string;
  familyDeviceId: string;
  startedAt: Date;
}

const buildSessionIds = ({ childNumber, sessionNumber }: FixtureSession) => {
  const sessionCode = childNumber * 100 + sessionNumber;
  return {
    sessionId: buildFixtureId("5e", sessionCode),
    buildEventId: (step: number) =>
      buildFixtureId("e0", sessionCode * 1_000_000 + step),
    buildActivityId: (activity: number) =>
      buildFixtureId("ac", sessionCode * 1_000 + activity),
    outfitId: buildFixtureId("0f", sessionCode),
  };
};

const practisedPlace = {
  islandId: "sunscorch-sands",
  regionId: "oasis-pools",
  gameId: "times-tower",
} as const;

const practisedSkillId = "maths.times-tables-3-4-8";

const checkedPlace = {
  islandId: "jungle-reach",
  regionId: "challenge-arena",
  gameId: "multiplication-tables-check",
} as const;

const buildCheckOutcome = (key: string, isRight: boolean) => ({
  key,
  questionType: "8-times-table",
  skillId: "maths.times-tables-to-12",
  isRight,
  isInTime: true,
  millisecondsTaken: 2_500,
});

const activitiesPerSession = 5;
const secondsPerActivity = 120;
const boughtItemId = "hat-wizard-blue";
const receivedAfterMinutes = 30;

const buildPlayEvents = (
  session: FixtureSession,
  contents: PlayEventContent[],
): FixturePlayEvent[] => {
  const { buildEventId } = buildSessionIds(session);
  return contents.map((content, index) => {
    const happenedAt = addMinutes(session.startedAt, index);
    return {
      ...content,
      id: buildEventId(index + 1),
      familyId: session.familyId,
      familyDeviceId: session.familyDeviceId,
      childId: session.childId,
      happenedAt,
      receivedAt: addMinutes(happenedAt, receivedAfterMinutes),
    };
  });
};

const buildPractice = (
  session: FixtureSession,
  activity: number,
): PlayEventContent[] => {
  const { sessionId, buildActivityId } = buildSessionIds(session);
  const practice = {
    sessionId,
    activityId: buildActivityId(activity),
    skillId: practisedSkillId,
    localDate: getLocalDate(session.startedAt),
    ...practisedPlace,
  };
  return [
    {
      type: "question-answered",
      payload: {
        ...practice,
        isRightFirstTime: activity % 2 === 1,
        wrongAnswerCount: activity % 2 === 1 ? 0 : 1,
      },
    },
    {
      type: "activity-finished",
      payload: { ...practice, secondsSpent: secondsPerActivity },
    },
  ];
};

const buildEveryKindSession = (
  session: FixtureSession,
  giftForChildId?: string,
): FixturePlayEvent[] => {
  const { sessionId, outfitId } = buildSessionIds(session);
  const localDate = getLocalDate(session.startedAt);
  const outfit = { hat: "hat-pointy-purple", outfit: "outfit-green-cloak" };
  return buildPlayEvents(session, [
    { type: "session-started", payload: { sessionId } },
    ...Array.from({ length: activitiesPerSession }, (_, index) =>
      buildPractice(session, index + 1),
    ).flat(),
    {
      type: "item-bought",
      payload: {
        sessionId,
        itemId: boughtItemId,
        localDate,
        ...(giftForChildId === undefined ? {} : { giftForChildId }),
      },
    },
    { type: "character-dressed", payload: { sessionId, loadout: outfit } },
    {
      type: "outfit-saved",
      payload: { sessionId, outfitId, name: "Fixture outfit", loadout: outfit },
    },
    { type: "outfit-worn", payload: { sessionId, outfitId } },
    {
      type: "room-furnished",
      payload: { sessionId, room: { bed: "bed-wooden", rug: "rug-round" } },
    },
    {
      type: "check-finished",
      payload: {
        sessionId,
        localDate,
        ...checkedPlace,
        checkGameType: "times-tables-check",
        isClockOff: false,
        outcomes: [
          buildCheckOutcome("7x8", true),
          buildCheckOutcome("6x8", false),
        ],
      },
    },
    {
      type: "quest-find-picked-up",
      payload: {
        sessionId,
        islandId: "meadow-isle",
        findId: "meadow-isle.rusty-key",
      },
    },
    {
      type: "quest-puzzle-solved",
      payload: {
        sessionId,
        islandId: "meadow-isle",
        puzzleId: "meadow-isle.open-the-shed",
        localDate,
      },
    },
    { type: "session-ended", payload: { sessionId } },
  ]);
};

const buildShortSession = (session: FixtureSession): FixturePlayEvent[] => {
  const { sessionId } = buildSessionIds(session);
  return buildPlayEvents(session, [
    { type: "session-started", payload: { sessionId } },
    ...buildPractice(session, 1),
    { type: "session-ended", payload: { sessionId } },
  ]);
};

export const buildPenTestFixturePlan = (moment: Date): PenTestFixturePlan => {
  const day = getUkDay(moment);
  const daysAgo = (days: number): Date =>
    new Date(day.getTime() - days * millisecondsPerDay);
  const daysAhead = (days: number): Date => daysAgo(-days);
  const sessionStart = (days: number): Date =>
    addMinutes(daysAgo(days), sessionStartHourUtc * 60);

  const createdAt = daysAgo(30);
  const confirmedAt = daysAgo(29);

  const buildAdult = (
    adult: Omit<FixtureAdult, "createdAt" | "emailConfirmedAt"> & {
      isEmailConfirmed: boolean;
    },
  ): FixtureAdult => {
    const { isEmailConfirmed, ...fields } = adult;
    return {
      ...fields,
      emailConfirmedAt: isEmailConfirmed ? confirmedAt : null,
      createdAt,
    };
  };

  const adults: FixtureAdult[] = [
    buildAdult({
      id: ids.admin,
      email: buildEmail("admin"),
      name: "Pen-test Admin",
      roles: ["admin"],
      hasPassword: true,
      hasTotp: true,
      hasPasskey: false,
      isEmailConfirmed: true,
      deactivatedAt: null,
    }),
    buildAdult({
      id: ids.teacherAYear3,
      email: buildEmail("teacher-a-year-3"),
      name: "Teacher A Year 3",
      roles: ["teacher"],
      hasPassword: true,
      hasTotp: true,
      hasPasskey: false,
      isEmailConfirmed: true,
      deactivatedAt: null,
    }),
    buildAdult({
      id: ids.teacherAYears5And6,
      email: buildEmail("teacher-a-years-5-and-6"),
      name: "Teacher A Years 5 and 6",
      roles: ["teacher"],
      hasPassword: true,
      hasTotp: false,
      hasPasskey: true,
      isEmailConfirmed: true,
      deactivatedAt: null,
    }),
    buildAdult({
      id: ids.teacherBYear3,
      email: buildEmail("teacher-b-year-3"),
      name: "Teacher B Year 3",
      roles: ["teacher"],
      hasPassword: true,
      hasTotp: false,
      hasPasskey: false,
      isEmailConfirmed: true,
      deactivatedAt: null,
    }),
    buildAdult({
      id: ids.teacherADeactivated,
      email: buildEmail("teacher-a-deactivated"),
      name: "Teacher A Deactivated",
      roles: ["teacher"],
      hasPassword: true,
      hasTotp: true,
      hasPasskey: false,
      isEmailConfirmed: true,
      deactivatedAt: daysAgo(5),
    }),
    buildAdult({
      id: ids.parentA1,
      email: buildEmail("parent-a1"),
      name: "Parent A1",
      roles: ["parent"],
      hasPassword: true,
      hasTotp: true,
      hasPasskey: false,
      isEmailConfirmed: true,
      deactivatedAt: null,
    }),
    buildAdult({
      id: ids.coParentA1,
      email: buildEmail("co-parent-a1"),
      name: "Co-Parent A1",
      roles: ["parent"],
      hasPassword: true,
      hasTotp: false,
      hasPasskey: false,
      isEmailConfirmed: true,
      deactivatedAt: null,
    }),
    buildAdult({
      id: ids.parentA2PasskeyOnly,
      email: buildEmail("parent-a2-passkey-only"),
      name: "Parent A2",
      roles: ["parent"],
      hasPassword: false,
      hasTotp: false,
      hasPasskey: true,
      isEmailConfirmed: true,
      deactivatedAt: null,
    }),
    buildAdult({
      id: ids.coParentA2Invited,
      email: buildEmail("co-parent-a2-invited"),
      name: "Co-Parent A2",
      roles: ["parent"],
      hasPassword: false,
      hasTotp: false,
      hasPasskey: false,
      isEmailConfirmed: false,
      deactivatedAt: null,
    }),
    buildAdult({
      id: ids.parentB,
      email: buildEmail("parent-b"),
      name: "Parent B",
      roles: ["parent"],
      hasPassword: true,
      hasTotp: false,
      hasPasskey: false,
      isEmailConfirmed: true,
      deactivatedAt: null,
    }),
    buildAdult({
      id: ids.coParentBInviteExpired,
      email: buildEmail("co-parent-b-invite-expired"),
      name: "Co-Parent B",
      roles: ["parent"],
      hasPassword: false,
      hasTotp: false,
      hasPasskey: false,
      isEmailConfirmed: false,
      deactivatedAt: null,
    }),
  ];

  const families: FixtureFamily[] = [
    {
      id: ids.familyA1,
      name: "Pen-test Family A1",
      parentIds: [ids.parentA1, ids.coParentA1],
      schoolId: ids.schoolA,
      createdAt,
    },
    {
      id: ids.familyA2,
      name: "Pen-test Family A2",
      parentIds: [ids.parentA2PasskeyOnly, ids.coParentA2Invited],
      schoolId: ids.schoolA,
      createdAt,
    },
    {
      id: ids.familyB,
      name: "Pen-test Family B",
      parentIds: [ids.parentB, ids.coParentBInviteExpired],
      schoolId: ids.schoolB,
      createdAt,
    },
  ];

  const children: FixtureChild[] = [
    {
      id: ids.childA1Year3,
      familyId: ids.familyA1,
      schoolId: ids.schoolA,
      nickname: "Ada",
      characterName: "Starling",
      phonicsProgrammeId: "little-wandle",
      classmateVisitsAllowed: true,
      createdAt,
      ...findBirthInSchoolYear(10, 3, day),
    },
    {
      id: ids.childA1Year5,
      familyId: ids.familyA1,
      schoolId: ids.schoolA,
      nickname: "Ben",
      characterName: "Bramble",
      phonicsProgrammeId: "little-wandle",
      classmateVisitsAllowed: false,
      createdAt,
      ...findBirthInSchoolYear(4, 5, day),
    },
    {
      id: ids.childA2Year3,
      familyId: ids.familyA2,
      schoolId: ids.schoolA,
      nickname: "Cara",
      characterName: "Comet",
      phonicsProgrammeId: "read-write-inc",
      classmateVisitsAllowed: true,
      createdAt,
      ...findBirthInSchoolYear(2, 3, day),
    },
    {
      id: ids.childA2Year3Twin,
      familyId: ids.familyA2,
      schoolId: ids.schoolA,
      nickname: "Dev",
      characterName: "Pebble",
      phonicsProgrammeId: "read-write-inc",
      classmateVisitsAllowed: false,
      createdAt,
      ...findBirthInSchoolYear(2, 3, day),
    },
    {
      id: ids.childBYear3,
      familyId: ids.familyB,
      schoolId: ids.schoolB,
      nickname: "Eli",
      characterName: "Fern",
      phonicsProgrammeId: "jolly-phonics",
      classmateVisitsAllowed: true,
      createdAt,
      ...findBirthInSchoolYear(11, 3, day),
    },
  ];

  const familyDevices: FixtureFamilyDevice[] = [
    {
      id: ids.familyDeviceA1,
      familyId: ids.familyA1,
      name: "A1 kitchen tablet",
      createdAt: daysAgo(20),
      lastSeenAt: daysAgo(1),
      revokedAt: null,
    },
    {
      id: ids.familyDeviceA1Revoked,
      familyId: ids.familyA1,
      name: "A1 old tablet",
      createdAt: daysAgo(25),
      lastSeenAt: daysAgo(8),
      revokedAt: daysAgo(7),
    },
    {
      id: ids.familyDeviceA2,
      familyId: ids.familyA2,
      name: "A2 laptop",
      createdAt: daysAgo(20),
      lastSeenAt: daysAgo(1),
      revokedAt: null,
    },
    {
      id: ids.familyDeviceB,
      familyId: ids.familyB,
      name: "B tablet",
      createdAt: daysAgo(20),
      lastSeenAt: daysAgo(1),
      revokedAt: null,
    },
  ];

  const everyKindSessions: Omit<
    FixtureSession,
    "sessionNumber" | "startedAt"
  >[] = [
    {
      childNumber: 1,
      childId: ids.childA1Year3,
      familyId: ids.familyA1,
      familyDeviceId: ids.familyDeviceA1,
    },
    {
      childNumber: 2,
      childId: ids.childA1Year5,
      familyId: ids.familyA1,
      familyDeviceId: ids.familyDeviceA1,
    },
    {
      childNumber: 3,
      childId: ids.childA2Year3,
      familyId: ids.familyA2,
      familyDeviceId: ids.familyDeviceA2,
    },
    {
      childNumber: 4,
      childId: ids.childA2Year3Twin,
      familyId: ids.familyA2,
      familyDeviceId: ids.familyDeviceA2,
    },
    {
      childNumber: 5,
      childId: ids.childBYear3,
      familyId: ids.familyB,
      familyDeviceId: ids.familyDeviceB,
    },
  ];

  const playEvents: FixturePlayEvent[] = [
    ...buildShortSession({
      childNumber: 1,
      sessionNumber: 1,
      childId: ids.childA1Year3,
      familyId: ids.familyA1,
      familyDeviceId: ids.familyDeviceA1Revoked,
      startedAt: sessionStart(9),
    }),
    ...everyKindSessions.flatMap((session) =>
      buildEveryKindSession(
        { ...session, sessionNumber: 2, startedAt: sessionStart(2) },
        session.childId === ids.childA1Year3 ? ids.childA1Year5 : undefined,
      ),
    ),
  ];

  return {
    day,
    schools: [
      {
        id: ids.schoolA,
        name: "Pen-test Primary A",
        town: "Fixtureton",
        classmateVisitsApproved: true,
        createdAt,
      },
      {
        id: ids.schoolB,
        name: "Pen-test Primary B",
        town: "Sampleford",
        classmateVisitsApproved: false,
        createdAt,
      },
    ],
    adults,
    teachers: [
      { userId: ids.teacherAYear3, schoolId: ids.schoolA, yearGroups: [3] },
      {
        userId: ids.teacherAYears5And6,
        schoolId: ids.schoolA,
        yearGroups: [5, 6],
      },
      { userId: ids.teacherBYear3, schoolId: ids.schoolB, yearGroups: [3] },
      {
        userId: ids.teacherADeactivated,
        schoolId: ids.schoolA,
        yearGroups: [3],
      },
    ],
    families,
    children,
    familyDevices,
    invites: [
      {
        id: ids.inviteTeacherAYear3Accepted,
        userId: ids.teacherAYear3,
        createdByUserId: ids.admin,
        emailedTo: buildEmail("teacher-a-year-3"),
        createdAt: daysAgo(30),
        expiresAt: daysAgo(23),
        acceptedAt: daysAgo(29),
      },
      {
        id: ids.inviteParentA1Accepted,
        userId: ids.parentA1,
        createdByUserId: ids.teacherAYear3,
        emailedTo: buildEmail("parent-a1"),
        createdAt: daysAgo(28),
        expiresAt: daysAgo(21),
        acceptedAt: daysAgo(27),
      },
      {
        id: ids.inviteParentA2Accepted,
        userId: ids.parentA2PasskeyOnly,
        createdByUserId: ids.teacherAYear3,
        emailedTo: null,
        createdAt: daysAgo(28),
        expiresAt: daysAgo(21),
        acceptedAt: daysAgo(27),
      },
      {
        id: ids.inviteCoParentA2Pending,
        userId: ids.coParentA2Invited,
        createdByUserId: ids.teacherAYear3,
        emailedTo: null,
        createdAt: daysAgo(1),
        expiresAt: daysAhead(6),
        acceptedAt: null,
      },
      {
        id: ids.inviteCoParentBExpired,
        userId: ids.coParentBInviteExpired,
        createdByUserId: ids.teacherBYear3,
        emailedTo: buildEmail("co-parent-b-invite-expired"),
        createdAt: daysAgo(20),
        expiresAt: daysAgo(13),
        acceptedAt: null,
      },
    ],
    deletionRequests: [
      {
        id: ids.deletionRequestFamilyB,
        familyId: ids.familyB,
        childId: null,
        requestedByUserId: ids.parentB,
        createdAt: daysAgo(3),
      },
    ],
    playEvents,
  };
};
