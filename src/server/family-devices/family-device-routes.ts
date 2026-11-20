import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import {
  findChildRewards,
  type ChildRewards,
} from "../../curriculum/rewards.js";
import {
  findHomeYearGroup,
  type YearGroup,
} from "../../curriculum/year-groups.js";
import {
  accountProofSchemaProperties,
  checkAccountProof,
  readAccountProof,
  type AccountProofBody,
} from "../auth/account-proof.js";
import { buildSecretToken, hashSecretToken } from "../auth/secret-token.js";
import { signInCookieOptions } from "../auth/sign-in-routes.js";
import {
  runAsSignedInParent,
  signInCookieName,
} from "../auth/signed-in-parent.js";
import { buildChildLimits } from "../../curriculum/island-access.js";
import { loadFamilyRewards } from "../children/family-rewards.js";
import {
  hashPicturePassword,
  picturePasswordLength,
  picturePasswordPictures,
  type PicturePasswordPicture,
} from "../children/picture-password.js";
import type { Database } from "../database.js";
import { buildFamilyDeviceNotice } from "../email/emails.js";
import type { SendEmail } from "../email/send-email.js";
import {
  buildEmailAddressKey,
  TooManyRequestsError,
  type RequestRateLimits,
} from "../rate-limit/request-rate-limit.js";
import type { TotpSecretKey } from "../auth/totp-secret-box.js";
import {
  characters,
  childTeacherLocks,
  children,
  familyDevices,
  schools,
  signIns,
  users,
  type ChildLimits,
} from "../schema.js";
import {
  ChildNotFoundError,
  childPlacementColumns,
  findChildSchoolYear,
} from "../reach-rules.js";
import {
  isFamilyDeviceSignedIn,
  runAsSignedInFamilyDevice,
  setFamilyDeviceCookie,
} from "./signed-in-family-device.js";

export class ChildAlreadySetUpError extends Error {
  override readonly name = "ChildAlreadySetUpError";
  readonly statusCode = 409;

  constructor() {
    super(
      "This Child already has one, so a Parent changes it on the Parent page",
    );
  }
}

export class FamilyDeviceNotFoundError extends Error {
  override readonly name = "FamilyDeviceNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("Your Family has no such Family Device signed in");
  }
}

interface FamilyDevice {
  id: string;
  name: string;
  createdAt: Date;
  lastSeenAt: Date;
  lastSeenFrom: string | null;
}

interface PlayableChild {
  id: string;
  characterName: string | null;
  newPlayerNickname: string | null;
  yearGroup: YearGroup | null;
  picturePasswordHash: string | null;
  phonicsProgrammeId: string | null;
  classmateVisitsAllowed: boolean;
  limits: ChildLimits;
  rewards: ChildRewards;
}

interface PlayableFamily {
  playableChildren: PlayableChild[];
  familyChestActivityCount: number;
}

interface FamilyDeviceBody extends AccountProofBody {
  name: string;
}

interface FamilyDeviceParams {
  familyDeviceId: string;
}

interface PlayChildParams {
  childId: string;
}

interface PicturePasswordBody {
  picturePassword: PicturePasswordPicture[];
}

interface CharacterBody {
  name: string;
}

const longestCharacterName = 30;

const playChildParamsSchema = {
  type: "object",
  required: ["childId"],
  properties: { childId: { type: "string", format: "uuid" } },
} as const;

const firstPicturePasswordBodySchema = {
  type: "object",
  required: ["picturePassword"],
  additionalProperties: false,
  properties: {
    picturePassword: {
      type: "array",
      minItems: picturePasswordLength,
      maxItems: picturePasswordLength,
      items: { type: "string", enum: picturePasswordPictures },
    },
  },
} as const;

const characterBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", pattern: "\\S", maxLength: longestCharacterName },
  },
} as const;

const longestFamilyDeviceName = 40;

const familyDeviceBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      pattern: "\\S",
      maxLength: longestFamilyDeviceName,
    },
    ...accountProofSchemaProperties,
  },
} as const;

const familyDeviceParamsSchema = {
  type: "object",
  required: ["familyDeviceId"],
  properties: { familyDeviceId: { type: "string", format: "uuid" } },
} as const;

const familyDeviceColumns = {
  id: familyDevices.id,
  name: familyDevices.name,
  createdAt: familyDevices.createdAt,
  lastSeenAt: familyDevices.lastSeenAt,
  lastSeenFrom: familyDevices.lastSeenFrom,
};

interface FamilyDeviceRouteParts {
  database: Database;
  sendEmail: SendEmail;
  publicUrl: URL;
  requestRateLimits: RequestRateLimits;
  totpSecretKey: TotpSecretKey;
}

export const registerFamilyDeviceRoutes = (
  server: FastifyInstance,
  {
    database,
    sendEmail,
    publicUrl,
    requestRateLimits,
    totpSecretKey,
  }: FamilyDeviceRouteParts,
): void => {
  const parentPageUrl = new URL("/parent/", publicUrl);
  const relyingParty = {
    relyingPartyId: publicUrl.hostname,
    expectedOrigin: publicUrl.origin,
  };

  server.get(
    "/api/family-devices",
    { config: { reach: "parent" } },
    async (request): Promise<FamilyDevice[]> => {
      return runAsSignedInParent(
        database,
        request,
        async ({ familyId }, reachDatabase) => {
          return reachDatabase
            .select(familyDeviceColumns)
            .from(familyDevices)
            .where(
              and(
                eq(familyDevices.familyId, familyId),
                isFamilyDeviceSignedIn(),
              ),
            )
            .orderBy(asc(familyDevices.createdAt), asc(familyDevices.id));
        },
      );
    },
  );

  // A Family Device outlives the sign-in that makes it, so making one takes a fresh proof of the account, as moving its
  // email address does (#303): the Parent's password, a code from their authenticator app, or a passkey.
  server.post<{ Body: FamilyDeviceBody }>(
    "/api/family-devices",
    { config: { reach: "parent" }, schema: { body: familyDeviceBodySchema } },
    async (request, reply) => {
      const { noticeTo } = await runAsSignedInParent(
        database,
        request,
        async (parentUser, reachDatabase) => {
          const { userId, roles } = parentUser;
          const [parent] = await reachDatabase
            .select({
              email: users.email,
              emailConfirmedAt: users.emailConfirmedAt,
            })
            .from(users)
            .where(eq(users.id, userId));
          const proof = readAccountProof(request.body, roles);
          // A wrong proof counts against the account as a wrong password at sign-in does (#246), and a right one gives
          // its try back, so a held sign-in can't guess the password here faster than at the sign-in page.
          const accountKey = buildEmailAddressKey(parent.email);
          if (
            requestRateLimits.failedSignInsPerAccount.take(accountKey) !==
            "allowed"
          ) {
            request.log.info(
              { userId },
              "family-devices.family-device.proof-limited",
            );
            throw new TooManyRequestsError();
          }
          try {
            await checkAccountProof(reachDatabase, proof, {
              userId,
              relyingParty,
              totpSecretKey,
            });
          } catch (error) {
            request.log.info(
              { userId },
              "family-devices.family-device.refused",
            );
            throw error;
          }
          requestRateLimits.failedSignInsPerAccount.giveBack(accountKey);
          return {
            noticeTo: parent.emailConfirmedAt === null ? null : parent.email,
          };
        },
      );

      // Sent before the device is saved, so if it can't be sent no device is signed in, and between the two reaches, so
      // a slow mail server holds no database connection (#329).
      const isNoticeSent = noticeTo !== null;
      if (noticeTo !== null) {
        await sendEmail(
          buildFamilyDeviceNotice({
            to: noticeTo,
            signedInAt: new Date(),
            parentPageUrl,
          }),
        );
      }
      const { familyDevice, token } = await runAsSignedInParent(
        database,
        request,
        async (parentUser, reachDatabase) => {
          const { userId, familyId, signInTokenHash } = parentUser;
          const token = buildSecretToken();
          const familyDevice = await reachDatabase.transaction(
            async (transaction) => {
              const [createdFamilyDevice] = await transaction
                .insert(familyDevices)
                .values({
                  tokenHash: hashSecretToken(token),
                  familyId,
                  name: request.body.name.trim(),
                  createdByUserId: userId,
                })
                .returning(familyDeviceColumns);
              await insertAuditLogEntry(transaction, {
                action: "family-device.created",
                actor: buildUserActor(parentUser),
                target: { type: "family-device", id: createdFamilyDevice.id },
              });
              await transaction
                .delete(signIns)
                .where(eq(signIns.tokenHash, signInTokenHash));
              return createdFamilyDevice;
            },
          );
          request.log.info(
            { userId, familyDeviceId: familyDevice.id, isNoticeSent },
            "family-devices.family-device.created",
          );

          return { familyDevice, token };
        },
      );

      setFamilyDeviceCookie(reply, token);
      return reply
        .clearCookie(signInCookieName, signInCookieOptions)
        .code(201)
        .send(familyDevice);
    },
  );

  server.delete<{ Params: FamilyDeviceParams }>(
    "/api/family-devices/:familyDeviceId",
    {
      config: { reach: "parent" },
      schema: { params: familyDeviceParamsSchema },
    },
    async (request, reply) => {
      await runAsSignedInParent(
        database,
        request,
        async (parentUser, reachDatabase) => {
          const { userId, familyId } = parentUser;
          const { familyDeviceId } = request.params;
          const revokedFamilyDevices = await reachDatabase
            .update(familyDevices)
            .set({ revokedAt: sql`now()`, lastSeenFrom: null })
            .where(
              and(
                eq(familyDevices.id, familyDeviceId),
                eq(familyDevices.familyId, familyId),
                isNull(familyDevices.revokedAt),
              ),
            )
            .returning({ id: familyDevices.id });
          if (revokedFamilyDevices.length === 0) {
            throw new FamilyDeviceNotFoundError();
          }
          await insertAuditLogEntry(reachDatabase, {
            action: "family-device.revoked",
            actor: buildUserActor(parentUser),
            target: { type: "family-device", id: familyDeviceId },
          });
          request.log.info(
            { userId, familyDeviceId },
            "family-devices.family-device.revoked",
          );
        },
      );
      return reply.code(204).send();
    },
  );

  server.get(
    "/api/play/family",
    { config: { reach: "family-device" } },
    async (request, reply): Promise<PlayableFamily> => {
      return runAsSignedInFamilyDevice(
        database,
        request,
        async ({ familyId, token }, reachDatabase) => {
          const familyChildren = await reachDatabase
            .select({
              ...childPlacementColumns,
              nickname: children.nickname,
              characterName: characters.name,
              // A reach reads a hash only as a Family Device of the Child's own Family (#304, ADR 0027).
              picturePasswordHash: sql<
                string | null
              >`wizzaroo_family_device_picture_password_hash(${children.id})`,
              phonicsProgrammeId: children.phonicsProgrammeId,
              classmateVisitsAllowed: sql<boolean>`${children.classmateVisitsAllowed} and ${schools.classmateVisitsApproved}`,
              syncedLimits: children.syncedLimits,
              teacherLocks: childTeacherLocks.locks,
            })
            .from(children)
            .innerJoin(schools, eq(schools.id, children.schoolId))
            .leftJoin(characters, eq(characters.childId, children.id))
            .leftJoin(
              childTeacherLocks,
              eq(childTeacherLocks.childId, children.id),
            )
            .where(eq(children.familyId, familyId))
            .orderBy(asc(children.createdAt), asc(children.id));
          const familyRewards = await loadFamilyRewards(
            reachDatabase,
            familyId,
          );
          const moment = new Date();
          setFamilyDeviceCookie(reply, token);
          return {
            playableChildren: familyChildren.map((child): PlayableChild => {
              const schoolYear = findChildSchoolYear(child, moment);
              return {
                id: child.id,
                characterName: child.characterName,
                // Only until a Child names their Character, so a Parent can tell new siblings apart when setting them up.
                newPlayerNickname:
                  child.characterName === null ? child.nickname : null,
                yearGroup:
                  schoolYear === null ? null : findHomeYearGroup(schoolYear),
                picturePasswordHash: child.picturePasswordHash,
                phonicsProgrammeId: child.phonicsProgrammeId,
                classmateVisitsAllowed: child.classmateVisitsAllowed,
                limits: buildChildLimits(
                  child.syncedLimits,
                  child.teacherLocks ?? {},
                ),
                rewards: findChildRewards(familyRewards, child.id),
              };
            }),
            familyChestActivityCount: familyRewards.familyChestActivityCount,
          };
        },
      );
    },
  );

  // A Child brought in by their School has no Picture Password yet: a Parent sets the first one on a Family Device.
  server.put<{ Params: PlayChildParams; Body: PicturePasswordBody }>(
    "/api/play/children/:childId/picture-password",
    {
      config: { reach: "family-device" },
      schema: {
        params: playChildParamsSchema,
        body: firstPicturePasswordBodySchema,
      },
    },
    async (request, reply) => {
      const picturePasswordHash = await hashPicturePassword(
        request.body.picturePassword,
      );
      const token = await runAsSignedInFamilyDevice(
        database,
        request,
        async (familyDevice, reachDatabase) => {
          const { childId } = request.params;
          const child = (
            await reachDatabase
              .select({ id: children.id })
              .from(children)
              .where(
                and(
                  eq(children.id, childId),
                  eq(children.familyId, familyDevice.familyId),
                ),
              )
          ).at(0);
          if (child === undefined) {
            throw new ChildNotFoundError();
          }
          const setChildren = await reachDatabase
            .update(children)
            .set({ picturePasswordHash })
            .where(
              and(
                eq(children.id, childId),
                eq(children.hasPicturePassword, false),
              ),
            )
            .returning({ id: children.id });
          if (setChildren.length === 0) {
            throw new ChildAlreadySetUpError();
          }
          await insertAuditLogEntry(reachDatabase, {
            action: "picture-password.set",
            actor: { type: "family-device", id: familyDevice.familyDeviceId },
            target: { type: "child", id: childId },
          });
          request.log.info(
            { familyDeviceId: familyDevice.familyDeviceId, childId },
            "family-devices.first-picture-password.set",
          );
          return familyDevice.token;
        },
      );
      setFamilyDeviceCookie(reply, token);
      return reply.code(204).send();
    },
  );

  // The Child then makes and names their Character, once.
  server.put<{ Params: PlayChildParams; Body: CharacterBody }>(
    "/api/play/children/:childId/character",
    {
      config: { reach: "family-device" },
      schema: { params: playChildParamsSchema, body: characterBodySchema },
    },
    async (request, reply) => {
      const token = await runAsSignedInFamilyDevice(
        database,
        request,
        async (familyDevice, reachDatabase) => {
          const { childId } = request.params;
          const child = (
            await reachDatabase
              .select({ id: children.id })
              .from(children)
              .where(
                and(
                  eq(children.id, childId),
                  eq(children.familyId, familyDevice.familyId),
                ),
              )
          ).at(0);
          if (child === undefined) {
            throw new ChildNotFoundError();
          }
          const madeCharacters = await reachDatabase
            .insert(characters)
            .values({ childId, name: request.body.name.trim() })
            .onConflictDoNothing()
            .returning({ childId: characters.childId });
          if (madeCharacters.length === 0) {
            throw new ChildAlreadySetUpError();
          }
          request.log.info(
            { familyDeviceId: familyDevice.familyDeviceId, childId },
            "family-devices.character.made",
          );
          return familyDevice.token;
        },
      );
      setFamilyDeviceCookie(reply, token);
      return reply.code(204).send();
    },
  );
};
