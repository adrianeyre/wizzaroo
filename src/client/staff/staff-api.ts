import {
  isMasteryState,
  type DailyPractice,
  type SkillMastery,
} from "../../curriculum/mastery.js";
import {
  isYearGroup,
  isYearGroupAdjustment,
  type YearGroup,
  type YearGroupAdjustment,
} from "../../curriculum/year-groups.js";
import type { CheckAttempt } from "../../curriculum/checks.js";
import { isCheckHistory } from "../../curriculum/check-attempts.js";
import {
  isChildLimits,
  type ChildLimits,
} from "../../curriculum/island-access.js";
import {
  isRegionProgress,
  type RegionProgress,
} from "../../curriculum/rewards.js";
import {
  auditActions,
  auditActorTypes,
  auditTargetTypes,
  type AuditAction,
  type AuditActorType,
  type AuditTargetType,
} from "../../server/audit/audit-actions.js";
import type { CharacterLoadout } from "../../curriculum/catalogue.js";
import { isCharacterLoadout } from "../family-device/playable-family.js";
import { sendAccountChange } from "../parent/account-changes.js";

export const inviteStatuses = [
  "not-sent",
  "pending",
  "accepted",
  "expired",
  "email-failed",
] as const;

export type InviteStatus = (typeof inviteStatuses)[number];

export type InviteDelivery = "email" | "link";

export interface School {
  id: string;
  name: string | null;
  town: string | null;
  classmateVisitsApproved: boolean;
  teacherCount: number;
  childCount: number;
}

interface ListedAdult {
  userId: string;
  name: string | null;
  email: string;
  lastLoginAt: string | null;
  inviteStatus: InviteStatus;
  deactivatedAt: string | null;
}

export interface Teacher extends ListedAdult {
  schoolId: string;
  schoolName: string | null;
  yearGroups: YearGroup[];
}

export interface SeenChild {
  id: string;
  nickname: string;
  schoolYear: number | null;
}

export interface Parent extends ListedAdult {
  familyId: string | null;
  familyName: string | null;
  schoolIds: string[];
  seenChildren: SeenChild[];
}

export interface StaffChild {
  id: string;
  familyId: string;
  nickname: string;
  birthMonth: number | null;
  birthYear: number | null;
  yearGroupAdjustment: YearGroupAdjustment;
  phonicsProgrammeId: string | null;
  limits: ChildLimits;
  schoolId: string;
  schoolName: string | null;
  schoolYear: number | null;
  yearGroup: YearGroup | null;
  characterName: string | null;
  /** How the Child's Character is dressed, or null before they've made one. */
  loadout?: CharacterLoadout | null;
  timeSpentSeconds: number;
  lastPlayedAt: string | null;
  mastery: SkillMastery[];
  weakSkillIds: string[];
  regionProgress: RegionProgress[];
  dailyPractice: DailyPractice[];
  stars: number;
  checkHistory: CheckAttempt[];
}

export interface CreatedInvite {
  url: string;
  expiresAt: string;
}

export interface PreviewedRow {
  rowNumber: number;
  summary: string;
  problem: string | null;
}

export interface BulkOutcome {
  createdRowCount: number;
  skippedRows: { rowNumber: number; problem: string }[];
  skippedRowsReport: string;
  invitesEmailedCount: number;
}

type Guard<Value> = (value: unknown) => value is Value;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isNumber = (value: unknown): value is number => typeof value === "number";

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || typeof value === "number";

const isListOf =
  <Value>(guard: Guard<Value>): Guard<Value[]> =>
  (value: unknown): value is Value[] =>
    Array.isArray(value) && value.every(guard);

const isYearGroupList = isListOf(isYearGroup);

const isInviteStatus = (value: unknown): value is InviteStatus =>
  inviteStatuses.some((status) => status === value);

const isSchool: Guard<School> = (value): value is School =>
  isObject(value) &&
  isString(value.id) &&
  isNullableString(value.name) &&
  isNullableString(value.town) &&
  typeof value.classmateVisitsApproved === "boolean" &&
  isNumber(value.teacherCount) &&
  isNumber(value.childCount);

const isListedAdult = (value: unknown): value is ListedAdult =>
  isObject(value) &&
  isString(value.userId) &&
  isNullableString(value.name) &&
  isString(value.email) &&
  isNullableString(value.lastLoginAt) &&
  isInviteStatus(value.inviteStatus) &&
  isNullableString(value.deactivatedAt);

const isTeacher: Guard<Teacher> = (value): value is Teacher =>
  isListedAdult(value) &&
  isObject(value) &&
  isString(value.schoolId) &&
  isNullableString(value.schoolName) &&
  isYearGroupList(value.yearGroups);

const isSeenChild: Guard<SeenChild> = (value): value is SeenChild =>
  isObject(value) &&
  isString(value.id) &&
  isString(value.nickname) &&
  isNullableNumber(value.schoolYear);

const isParent: Guard<Parent> = (value): value is Parent =>
  isListedAdult(value) &&
  isObject(value) &&
  isNullableString(value.familyId) &&
  isNullableString(value.familyName) &&
  isListOf(isString)(value.schoolIds) &&
  isListOf(isSeenChild)(value.seenChildren);

const isMastery = (value: unknown): value is SkillMastery =>
  isObject(value) &&
  isString(value.skillId) &&
  isMasteryState(value.state) &&
  isNullableNumber(value.percentCorrect) &&
  isNumber(value.timeSpentSeconds) &&
  isNumber(value.goodDayCount) &&
  isNumber(value.goodDaysNeeded) &&
  isNullableNumber(value.reviewIntervalDays) &&
  isNullableString(value.nextReviewDate);

const isDailyPractice = (value: unknown): value is DailyPractice =>
  isObject(value) &&
  isString(value.localDate) &&
  isNumber(value.questionCount) &&
  isNumber(value.rightFirstTimeCount) &&
  isNumber(value.secondsSpent);

export const isStaffChild: Guard<StaffChild> = (value): value is StaffChild =>
  isObject(value) &&
  isString(value.id) &&
  isString(value.familyId) &&
  isString(value.nickname) &&
  isNullableNumber(value.birthMonth) &&
  isNullableNumber(value.birthYear) &&
  isYearGroupAdjustment(value.yearGroupAdjustment) &&
  isNullableString(value.phonicsProgrammeId) &&
  isChildLimits(value.limits) &&
  Array.isArray(value.regionProgress) &&
  value.regionProgress.every(isRegionProgress) &&
  isString(value.schoolId) &&
  isNullableString(value.schoolName) &&
  isNullableNumber(value.schoolYear) &&
  (value.yearGroup === null || isYearGroup(value.yearGroup)) &&
  isNullableString(value.characterName) &&
  (value.loadout === undefined ||
    value.loadout === null ||
    isCharacterLoadout(value.loadout)) &&
  isNumber(value.timeSpentSeconds) &&
  isNullableString(value.lastPlayedAt) &&
  isListOf(isMastery)(value.mastery) &&
  isListOf(isString)(value.weakSkillIds) &&
  isListOf(isDailyPractice)(value.dailyPractice) &&
  isNumber(value.stars) &&
  isCheckHistory(value.checkHistory);

const isCreatedInvite: Guard<CreatedInvite> = (value): value is CreatedInvite =>
  isObject(value) && isString(value.url) && isString(value.expiresAt);

const isCreatedPerson = (
  value: unknown,
): value is { userId: string; familyId?: string; invite: CreatedInvite } =>
  isObject(value) &&
  isString(value.userId) &&
  (value.familyId === undefined || isString(value.familyId)) &&
  isCreatedInvite(value.invite);

/** A Teacher's new adult for an existing Family waits for its Parents to agree, and has no Invite until then. */
export type CreatedParent =
  | { kind: "invited"; invite: CreatedInvite }
  | { kind: "awaiting-family"; familyId: string };

interface AskedToJoin {
  userId: string;
  invite: null;
  familyJoinRequest: { familyId: string };
}

const isAskedToJoin = (value: unknown): value is AskedToJoin =>
  isObject(value) &&
  isString(value.userId) &&
  value.invite === null &&
  isObject(value.familyJoinRequest) &&
  isString(value.familyJoinRequest.familyId);

const isCreatedParent = (
  value: unknown,
): value is AskedToJoin | { userId: string; invite: CreatedInvite } =>
  isAskedToJoin(value) || isCreatedPerson(value);

const isPreviewedRow: Guard<PreviewedRow> = (value): value is PreviewedRow =>
  isObject(value) &&
  isNumber(value.rowNumber) &&
  isString(value.summary) &&
  isNullableString(value.problem);

const isBulkOutcome: Guard<BulkOutcome> = (value): value is BulkOutcome =>
  isObject(value) &&
  isNumber(value.createdRowCount) &&
  isNumber(value.invitesEmailedCount) &&
  isString(value.skippedRowsReport) &&
  Array.isArray(value.skippedRows);

interface FamilyChestCoins {
  familyChestActivityCount: number;
}

const isFamilyChestCoins: Guard<FamilyChestCoins> = (
  value,
): value is FamilyChestCoins =>
  isObject(value) && isNumber(value.familyChestActivityCount);

export class StaffRequestError extends Error {
  override readonly name = "StaffRequestError";
}

const tryAgainMessage = "Wizzaroo couldn't do that. Try again in a moment.";

/** The server's own explanation, such as why a School can't be deleted yet, or a general one. */
const readFailure = async (response: Response): Promise<StaffRequestError> => {
  const answer: unknown = await response.json().catch(() => undefined);
  if (
    !isObject(answer) ||
    !isString(answer.message) ||
    response.status >= 500
  ) {
    return new StaffRequestError(tryAgainMessage);
  }
  // A form the server's schema refused is explained in developer's terms, so the person gets a plain ask instead.
  return new StaffRequestError(
    answer.code === "FST_ERR_VALIDATION"
      ? "Check each answer and try again."
      : `${answer.message}.`,
  );
};

const readAnswer = async <Value>(
  response: Response,
  guard: Guard<Value>,
): Promise<Value> => {
  if (!response.ok) {
    throw await readFailure(response);
  }
  const answer: unknown = await response.json();
  if (!guard(answer)) {
    throw new StaffRequestError(tryAgainMessage);
  }
  return answer;
};

const fetchAnswer = async <Value>(path: string, guard: Guard<Value>) =>
  readAnswer(await fetch(path), guard);

const send = async (
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body?: object,
): Promise<Response> => {
  const response = await sendAccountChange(method, path, body);
  if (!response.ok) {
    throw await readFailure(response);
  }
  return response;
};

export const readProblemMessage = (error: unknown): string =>
  error instanceof StaffRequestError ? error.message : tryAgainMessage;

export const fetchSchools = () =>
  fetchAnswer("/api/schools", isListOf(isSchool));
export const fetchTeachers = () =>
  fetchAnswer("/api/teachers", isListOf(isTeacher));
export const fetchParents = () =>
  fetchAnswer("/api/parents", isListOf(isParent));
export const fetchSchoolChildren = () =>
  fetchAnswer("/api/school-children", isListOf(isStaffChild));

/** Opening a Child's progress as the Admin is logged by the server, each time. */
export const fetchChildProgress = (childId: string) =>
  fetchAnswer(`/api/children/${childId}/progress`, isStaffChild);

export const createSchool = async (name: string, town: string) => {
  await send("POST", "/api/schools", { name, town });
};

export const nameSchool = async (
  schoolId: string,
  name: string,
  town: string,
) => {
  await send("PUT", `/api/schools/${schoolId}`, { name, town });
};

/** Only once the School's data processing agreement names Classmates' Rooms (ADR 0031). */
export const approveClassmateVisits = async (
  schoolId: string,
  classmateVisitsApproved: boolean,
) => {
  await send("PUT", `/api/schools/${schoolId}/classmate-visits`, {
    classmateVisitsApproved,
  });
};

export const deleteSchool = async (schoolId: string) => {
  await send("DELETE", `/api/schools/${schoolId}`);
};

interface NewTeacher {
  name: string;
  email: string;
  schoolId: string;
  yearGroups: YearGroup[];
  invite: InviteDelivery;
}

export const createTeacher = async (teacher: NewTeacher) =>
  (
    await readAnswer(
      await sendAccountChange("POST", "/api/teachers", teacher),
      isCreatedPerson,
    )
  ).invite;

export const changeTeacher = async (
  userId: string,
  schoolId: string,
  yearGroups: YearGroup[],
) => {
  await send("PUT", `/api/teachers/${userId}`, { schoolId, yearGroups });
};

interface NewParent {
  name: string;
  email: string;
  schoolId?: string;
  familyId?: string;
  invite: InviteDelivery;
}

export const createParent = async (
  parent: NewParent,
): Promise<CreatedParent> => {
  const created = await readAnswer(
    await sendAccountChange("POST", "/api/parents", parent),
    isCreatedParent,
  );
  return created.invite === null
    ? { kind: "awaiting-family", familyId: created.familyJoinRequest.familyId }
    : { kind: "invited", invite: created.invite };
};

export const resendInvite = async (userId: string, invite: InviteDelivery) =>
  readAnswer(
    await sendAccountChange("POST", `/api/people/${userId}/invites`, {
      invite,
    }),
    isCreatedInvite,
  );

export const sendPasswordReset = async (userId: string) => {
  await send("POST", `/api/people/${userId}/password-resets`);
};

export const deactivatePerson = async (userId: string) => {
  await send("POST", `/api/people/${userId}/deactivation`);
};

interface NewSchoolChild {
  nickname: string;
  birthMonth: number;
  birthYear: number;
  yearGroupAdjustment: number;
  schoolId?: string;
}

export const createSchoolChild = async (
  familyId: string,
  child: NewSchoolChild,
) => {
  await send("POST", `/api/families/${familyId}/children`, child);
};

export const moveChild = async (childId: string, schoolId: string) => {
  await send("PUT", `/api/children/${childId}/school`, { schoolId });
};

export const awardStars = async (childId: string, stars: number) => {
  await send("POST", `/api/admin/children/${childId}/star-awards`, { stars });
};

export const awardFamilyChestCoins = async (familyId: string, coins: number) =>
  (
    await readAnswer(
      await sendAccountChange(
        "POST",
        `/api/admin/families/${familyId}/family-chest-coin-awards`,
        { coins },
      ),
      isFamilyChestCoins,
    )
  ).familyChestActivityCount;

export const giveBirthMonthAndYear = async (
  childId: string,
  birth: { birthMonth: number; birthYear: number; yearGroupAdjustment: number },
) => {
  await send("PUT", `/api/children/${childId}/birth`, birth);
};

export type BulkKind = "teachers" | "families";

export const fetchBulkTemplate = async (kind: BulkKind): Promise<string> => {
  const response = await fetch(`/api/bulk/${kind}/template`);
  if (!response.ok) {
    throw await readFailure(response);
  }
  return response.text();
};

export const previewBulkUpload = async (kind: BulkKind, csv: string) =>
  readAnswer(
    await sendAccountChange("POST", `/api/bulk/${kind}/preview`, { csv }),
    isListOf(isPreviewedRow),
  );

export const createFromBulkUpload = async (
  kind: BulkKind,
  csv: string,
  sendInvites: boolean,
) =>
  readAnswer(
    await sendAccountChange("POST", `/api/bulk/${kind}`, { csv, sendInvites }),
    isBulkOutcome,
  );

export interface AuditLogEntry {
  id: string;
  happenedAt: string;
  action: AuditAction;
  actorType: AuditActorType;
  actorId: string | null;
  actorRoles: string[] | null;
  actorName: string | null;
  targetType: AuditTargetType | null;
  targetId: string | null;
  detail: string | null;
  ipAddress: string | null;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AuditLogFilter {
  action: AuditAction | "";
  from: string;
  to: string;
}

const isAuditAction = (value: unknown): value is AuditAction =>
  auditActions.some((action) => action === value);

const isAuditActorType = (value: unknown): value is AuditActorType =>
  auditActorTypes.some((actorType) => actorType === value);

const isAuditTargetType = (value: unknown): value is AuditTargetType =>
  auditTargetTypes.some((targetType) => targetType === value);

const isAuditLogEntry: Guard<AuditLogEntry> = (value): value is AuditLogEntry =>
  isObject(value) &&
  isString(value.id) &&
  isString(value.happenedAt) &&
  isAuditAction(value.action) &&
  isAuditActorType(value.actorType) &&
  isNullableString(value.actorId) &&
  (value.actorRoles === null || isListOf(isString)(value.actorRoles)) &&
  isNullableString(value.actorName) &&
  (value.targetType === null || isAuditTargetType(value.targetType)) &&
  isNullableString(value.targetId) &&
  isNullableString(value.detail) &&
  isNullableString(value.ipAddress);

const isAuditLogPage: Guard<AuditLogPage> = (value): value is AuditLogPage =>
  isObject(value) &&
  isListOf(isAuditLogEntry)(value.entries) &&
  isNumber(value.page) &&
  isNumber(value.pageSize) &&
  isNumber(value.totalCount);

export const fetchAuditLogPage = (
  page: number,
  { action, from, to }: AuditLogFilter,
) => {
  const query = new URLSearchParams({ page: String(page) });
  for (const [name, value] of [
    ["action", action],
    ["from", from],
    ["to", to],
  ] as const) {
    if (value !== "") {
      query.set(name, value);
    }
  }
  return fetchAnswer(
    `/api/admin/audit-log-entries?${query.toString()}`,
    isAuditLogPage,
  );
};
