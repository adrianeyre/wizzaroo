import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { CharacterLoadout, RoomLoadout } from "../curriculum/catalogue.js";
import type {
  CheckGameType,
  CheckOutcome,
  CheckWay,
} from "../curriculum/checks.js";
import type { ChildLimits, TeacherLocks } from "../curriculum/island-access.js";
import {
  mostCoinsInOneAward,
  mostStarsInOneAward,
  type Trophy,
} from "../curriculum/rewards.js";
import type { YearGroup } from "../curriculum/skills.js";
import type { YearGroupAdjustment } from "../curriculum/year-groups.js";
import {
  auditActions,
  auditActorTypes,
  auditTargetTypes,
} from "./audit/audit-actions.js";
import { adminAccessServedKinds } from "./children/admin-access-served.js";

export const userRoles = ["admin", "teacher", "parent"] as const;

export type UserRole = (typeof userRoles)[number];

export const userRole = pgEnum("user_role", userRoles);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  roles: userRole("roles").array().notNull(),
  emailConfirmedAt: timestamp("email_confirmed_at", { withTimezone: true }),
  name: text("name"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  // A Teacher or the Admin with no second factor may set one up from a password alone until the later of this and
  // 7 days after created_at. Accepting an Invite, or a reset link the Admin sent, sets it 7 days on (#243).
  secondFactorSetupUntil: timestamp("second_factor_setup_until", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const families = pgTable("families", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Set by a trigger whenever a record the Family's replay may have read is changed or deleted (pen test F4, ADR 0055).
  replayRestartedAt: bigint("replay_restarted_at", { mode: "number" })
    .notNull()
    .default(0),
});

// A School has no name or town until the Admin gives them, as for the School first made for the owner's Children.
export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  town: text("town"),
  // The Admin turns this on once the School's data processing agreement names Classmates' Rooms (ADR 0031).
  classmateVisitsApproved: boolean("classmate_visits_approved")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teachers = pgTable(
  "teachers",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
  },
  (table) => [index("teachers_school_id_index").on(table.schoolId)],
);

export const teacherYearGroups = pgTable(
  "teacher_year_groups",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => teachers.userId, { onDelete: "cascade" }),
    yearGroup: smallint("year_group").$type<YearGroup>().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.yearGroup] }),
    check(
      "teacher_year_groups_year_group_check",
      sql`${table.yearGroup} between 1 and 6`,
    ),
  ],
);

export const schoolParents = pgTable(
  "school_parents",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.schoolId] }),
    index("school_parents_school_id_index").on(table.schoolId),
  ],
);

export const familyParents = pgTable("family_parents", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
});

export const signIns = pgTable("sign_ins", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isTwoStep: boolean("is_two_step").notNull().default(false),
  /** Moved on when the sign-in is used, at most once a minute, so one left unused can be refused (#244). */
  lastUsedAt: timestamp("last_used_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const emailAddressChecks = pgTable(
  "email_address_checks",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("email_address_checks_user_id_index").on(table.userId)],
);

export const passwordResets = pgTable(
  "password_resets",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Sent by the Admin, so using it reopens a staff account's first second-factor setup for 7 days (#243).
    opensSecondFactorSetup: boolean("opens_second_factor_setup")
      .notNull()
      .default(false),
  },
  (table) => [index("password_resets_user_id_index").on(table.userId)],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    emailedTo: text("emailed_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    /** When a bulk upload's email of this Invite failed, so staff see it wasn't sent (#293). */
    emailFailedAt: timestamp("email_failed_at", { withTimezone: true }),
  },
  (table) => [index("invites_user_id_index").on(table.userId)],
);

export const familyDevices = pgTable(
  "family_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** The address it was last used from, read as the Audit Log reads a sign-in's; only the last is kept (#302). */
    lastSeenFrom: inet("last_seen_from"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    /** The adult whose sign-in made it, so their password change or reset signs it out too (#303). */
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("family_devices_family_id_index").on(table.familyId),
    index("family_devices_created_by_user_id_index").on(table.createdByUserId),
  ],
);

export const passkeys = pgTable(
  "passkeys",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    publicKey: text("public_key").notNull(),
    signCount: bigint("sign_count", { mode: "number" }).notNull(),
    transports: text("transports").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [index("passkeys_user_id_index").on(table.userId)],
);

export const passkeyChallenges = pgTable(
  "passkey_challenges",
  {
    challenge: text("challenge").primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  // Expired challenges are swept through it (#331).
  (table) => [index("passkey_challenges_expires_at_index").on(table.expiresAt)],
);

export const passkeyHandOffs = pgTable(
  "passkey_hand_offs",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // The registration challenge the code was last given, which asking for its options again replaces (#238).
    challenge: text("challenge"),
  },
  (table) => [index("passkey_hand_offs_user_id_index").on(table.userId)],
);

export const signInCodes = pgTable(
  "sign_in_codes",
  {
    codeHash: text("code_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Whether the code was made with a second factor, so the sign-in it makes counts as two-step (ADR 0073).
    isTwoStep: boolean("is_two_step").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sign_in_codes_user_id_index").on(table.userId)],
);

export const totpSetups = pgTable("totp_setups", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// An adult's TOTP secret is kept apart from their account row, so that only that adult's reach reads or changes it (#258).
// The secret here, and in totp_setups, is sealed under TOTP_SECRET_KEY, which the database never holds (#254).
export const totpSecrets = pgTable("totp_secrets", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  lastUsedStep: integer("last_used_step"),
  wrongCodesAt: timestamp("wrong_codes_at", { withTimezone: true })
    .array()
    .notNull()
    .default(sql`'{}'`),
  codePauseEndsAt: timestamp("code_pause_ends_at", { withTimezone: true }),
  pendingSignInsStartedAt: timestamp("pending_sign_ins_started_at", {
    withTimezone: true,
  })
    .array()
    .notNull()
    .default(sql`'{}'`),
});

// Each code_hash is argon2id with a salt of its own, so a row needs an id of its own to be found and spent by (#255).
export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeHash: text("code_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("recovery_codes_user_id_index").on(table.userId)],
);

export const pendingSignIns = pgTable("pending_sign_ins", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  failedAttempts: smallint("failed_attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type { ChildLimits } from "../curriculum/island-access.js";

export const children = pgTable(
  "children",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),
    nickname: text("nickname").notNull(),
    birthMonth: smallint("birth_month"),
    birthYear: smallint("birth_year"),
    yearGroupAdjustment: smallint("year_group_adjustment")
      .$type<YearGroupAdjustment>()
      .notNull()
      .default(0),
    phonicsProgrammeId: text("phonics_programme_id"),
    // A reach reads this column only through wizzaroo_family_device_picture_password_hash, as its own Family's Device (#304).
    picturePasswordHash: text("picture_password_hash"),
    // Staff's and Parents' reaches read whether a Child has a Picture Password here, never the hash.
    hasPicturePassword: boolean("has_picture_password")
      .notNull()
      .generatedAlwaysAs(sql`picture_password_hash is not null`),
    syncedLimits: jsonb("synced_limits")
      .$type<Partial<ChildLimits>>()
      .notNull()
      .default({}),
    classmateVisitsAllowed: boolean("classmate_visits_allowed")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("children_family_id_index").on(table.familyId),
    index("children_school_id_index").on(table.schoolId),
    unique("children_id_family_id_unique").on(table.id, table.familyId),
    check(
      "children_birth_check",
      sql`(${table.birthMonth} is null) = (${table.birthYear} is null) and ${table.birthMonth} between 1 and 12`,
    ),
    check(
      "children_year_group_adjustment_check",
      sql`${table.yearGroupAdjustment} between -1 and 1`,
    ),
  ],
);

export const childTeacherLocks = pgTable("child_teacher_locks", {
  childId: uuid("child_id")
    .primaryKey()
    .references(() => children.id, { onDelete: "cascade" }),
  locks: jsonb("locks").$type<Partial<TeacherLocks>>().notNull().default({}),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const starAwards = pgTable(
  "star_awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    awardedByUserId: uuid("awarded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    awardedAt: timestamp("awarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Numbered by a trigger as the record is written, which sets the order the replay reads it in (pen test F4, ADR 0055).
    replaySequence: bigint("replay_sequence", { mode: "number" })
      .notNull()
      .default(sql`0`),
    // A Parent's award from the Awards page, which counts towards their Child's 15 Stars a day; otherwise the Admin's (ADR 0063).
    givenByParent: boolean("given_by_parent").notNull().default(false),
  },
  (table) => [
    index("star_awards_child_id_index").on(table.childId),
    check(
      "star_awards_stars_check",
      sql`${table.stars} between 1 and ${sql.raw(String(mostStarsInOneAward))}`,
    ),
  ],
);

export const familyChestCoinAwards = pgTable(
  "family_chest_coin_awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    coins: integer("coins").notNull(),
    awardedByUserId: uuid("awarded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    awardedAt: timestamp("awarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Numbered by a trigger as the record is written, which sets the order the replay reads it in (pen test F4, ADR 0055).
    replaySequence: bigint("replay_sequence", { mode: "number" })
      .notNull()
      .default(sql`0`),
  },
  (table) => [
    index("family_chest_coin_awards_family_id_index").on(table.familyId),
    check(
      "family_chest_coin_awards_coins_check",
      sql`${table.coins} between 1 and ${sql.raw(String(mostCoinsInOneAward))}`,
    ),
  ],
);

export const keptGameUnlocks = pgTable(
  "kept_game_unlocks",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    islandId: text("island_id").notNull(),
    regionId: text("region_id").notNull(),
    gameId: text("game_id").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.childId, table.islandId, table.regionId, table.gameId],
    }),
  ],
);

export const characters = pgTable("characters", {
  childId: uuid("child_id")
    .primaryKey()
    .references(() => children.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  loadout: jsonb("loadout").$type<CharacterLoadout>().notNull().default({}),
});

export const playEventTypes = [
  "session-started",
  "session-ended",
  "question-answered",
  "activity-finished",
  "item-bought",
  "character-dressed",
  "outfit-saved",
  "outfit-worn",
  "room-furnished",
  "check-finished",
  "quest-find-picked-up",
  "quest-puzzle-solved",
] as const;

export type PlayEventType = (typeof playEventTypes)[number];

export const playEventType = pgEnum("play_event_type", playEventTypes);

export interface SessionEventPayload {
  sessionId: string;
}

interface ActivityEventPayload extends SessionEventPayload {
  activityId: string;
  skillId: string;
  localDate: string;
  islandId?: string;
  regionId?: string;
  gameId?: string;
}

export interface QuestionAnsweredPayload extends ActivityEventPayload {
  isRightFirstTime: boolean;
  wrongAnswerCount: number;
  checkWay?: CheckWay;
  millisecondsTaken?: number;
}

export interface ActivityFinishedPayload extends ActivityEventPayload {
  secondsSpent: number;
}

export interface ItemBoughtPayload extends SessionEventPayload {
  itemId: string;
  localDate: string;
  giftForChildId?: string;
}

export interface CharacterDressedPayload extends SessionEventPayload {
  loadout: CharacterLoadout;
}

export interface OutfitSavedPayload extends SessionEventPayload {
  outfitId: string;
  name: string;
  loadout: CharacterLoadout;
}

export interface OutfitWornPayload extends SessionEventPayload {
  outfitId: string;
}

export interface RoomFurnishedPayload extends SessionEventPayload {
  room: RoomLoadout;
}

export interface CheckFinishedPayload extends SessionEventPayload {
  localDate: string;
  islandId: string;
  regionId: string;
  gameId: string;
  checkGameType: CheckGameType;
  isClockOff: boolean;
  outcomes: CheckOutcome[];
}

/** A Find picked up on an Island's Quest (ADR 0058). */
export interface QuestFindPickedUpPayload extends SessionEventPayload {
  islandId: string;
  findId: string;
}

/** A Puzzle solved on an Island's Quest (ADR 0058). */
export interface QuestPuzzleSolvedPayload extends SessionEventPayload {
  islandId: string;
  puzzleId: string;
  localDate: string;
}

export type PlayEventPayload =
  | SessionEventPayload
  | QuestionAnsweredPayload
  | ActivityFinishedPayload
  | ItemBoughtPayload
  | CharacterDressedPayload
  | OutfitSavedPayload
  | OutfitWornPayload
  | RoomFurnishedPayload
  | CheckFinishedPayload
  | QuestFindPickedUpPayload
  | QuestPuzzleSolvedPayload;

export const roomShowcases = pgTable("room_showcases", {
  childId: uuid("child_id")
    .primaryKey()
    .references(() => children.id, { onDelete: "cascade" }),
  loadout: jsonb("loadout").$type<CharacterLoadout>().notNull(),
  room: jsonb("room").$type<RoomLoadout>().notNull(),
  trophies: jsonb("trophies").$type<Trophy[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const playEvents = pgTable(
  "play_events",
  {
    id: uuid("id").primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    familyDeviceId: uuid("family_device_id")
      .notNull()
      .references(() => familyDevices.id, { onDelete: "cascade" }),
    childId: uuid("child_id").notNull(),
    type: playEventType("type").notNull(),
    payload: jsonb("payload").$type<PlayEventPayload>().notNull(),
    happenedAt: timestamp("happened_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Numbered by a trigger as the record is written, which sets the order the replay reads it in (pen test F4, ADR 0055).
    replaySequence: bigint("replay_sequence", { mode: "number" })
      .notNull()
      .default(sql`0`),
  },
  (table) => [
    index("play_events_family_id_index").on(table.familyId),
    index("play_events_child_id_index").on(table.childId),
    // An event names one of its own Family's Children (#323).
    foreignKey({
      name: "play_events_child_id_family_id_children_id_family_id_fk",
      columns: [table.childId, table.familyId],
      foreignColumns: [children.id, children.familyId],
    }).onDelete("cascade"),
  ],
);

export const adminAccessServed = pgEnum(
  "admin_access_served",
  adminAccessServedKinds,
);

export const adminAccessLogs = pgTable(
  "admin_access_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Not a foreign key, so the record of what an Admin was served outlives their account, as the Audit Log's entries do (ADR 0041).
    adminUserId: uuid("admin_user_id").notNull(),
    // Not a foreign key either, so the record outlives the Child's deletion, as the Audit Log's child.deleted does (#287).
    childId: uuid("child_id").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // What the reply served the Admin, one value per reply path that logs (pen test D2, #270).
    served: adminAccessServed("served").notNull(),
  },
  (table) => [index("admin_access_logs_child_id_index").on(table.childId)],
);

export const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    childId: uuid("child_id").references(() => children.id, {
      onDelete: "cascade",
    }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("deletion_requests_family_id_child_id_unique")
      .on(table.familyId, table.childId)
      .nullsNotDistinct(),
  ],
);

/**
 * An adult a Teacher asked to add to an existing Family. They join it, and get their Invite, only once one of the
 * Family's Parents agrees; the row stays afterwards, so their Invite is never copied as a link by a Teacher.
 */
export const familyJoinRequests = pgTable(
  "family_join_requests",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    agreedByUserId: uuid("agreed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    agreedAt: timestamp("agreed_at", { withTimezone: true }),
  },
  (table) => [index("family_join_requests_family_id_index").on(table.familyId)],
);

export const auditAction = pgEnum("audit_action", auditActions);

export const auditActorType = pgEnum("audit_actor_type", auditActorTypes);

export const auditTargetType = pgEnum("audit_target_type", auditTargetTypes);

export const auditLogEntries = pgTable(
  "audit_log_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    happenedAt: timestamp("happened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    action: auditAction("action").notNull(),
    actorType: auditActorType("actor_type").notNull(),
    actorId: uuid("actor_id"),
    actorRoles: userRole("actor_roles").array(),
    targetType: auditTargetType("target_type"),
    targetId: text("target_id"),
    detail: text("detail"),
    ipAddress: inet("ip_address"),
  },
  (table) => [
    index("audit_log_entries_happened_at_index").on(table.happenedAt),
    index("audit_log_entries_action_happened_at_index").on(
      table.action,
      table.happenedAt,
    ),
    check(
      "audit_log_entries_actor_check",
      sql`(${table.actorType} = 'none') = (${table.actorId} is null) and (${table.actorType} = 'user') = (${table.actorRoles} is not null)`,
    ),
    check(
      "audit_log_entries_target_check",
      sql`(${table.targetType} is null) = (${table.targetId} is null)`,
    ),
    check(
      "audit_log_entries_ip_address_check",
      sql`${table.ipAddress} is null or ${table.action} in ('sign-in.succeeded', 'sign-in.failed')`,
    ),
  ],
);

export const confirmedDeletionTargetTypes = [
  "family",
  "child",
  "user",
] as const;

export type ConfirmedDeletionTargetType =
  (typeof confirmedDeletionTargetTypes)[number];

// Every Family, Child and adult the Admin has deleted, by id alone, so no restore of an older backup brings them back (#280).
export const confirmedDeletions = pgTable(
  "confirmed_deletions",
  {
    targetType: text("target_type")
      .$type<ConfirmedDeletionTargetType>()
      .notNull(),
    targetId: uuid("target_id").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.targetType, table.targetId] }),
    check(
      "confirmed_deletions_target_type_check",
      sql`${table.targetType} in ('family', 'child', 'user')`,
    ),
  ],
);
