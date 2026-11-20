import { asc, count, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import {
  runAsSignedInAdmin,
  runAsSignedInAdult,
} from "../auth/signed-in-parent.js";
import type { Database } from "../database.js";
import { isPlainName, NameNotPlainError } from "../plain-names.js";
import type { ReachDatabase } from "../reach.js";
import { loadSeenSchoolIds, SchoolNotFoundError } from "../reach-rules.js";
import { children, schools, teachers } from "../schema.js";
import { SecondSchoolGateNotMetError } from "./second-school-gate.js";

export class SchoolNotEmptyError extends Error {
  override readonly name = "SchoolNotEmptyError";
  readonly statusCode = 409;

  constructor() {
    super(
      "A School can be deleted only once it has no Teachers or Children. Move them first",
    );
  }
}

interface ListedSchool {
  id: string;
  name: string | null;
  town: string | null;
  classmateVisitsApproved: boolean;
  teacherCount: number;
  childCount: number;
}

interface SchoolBody {
  name: string;
  town: string;
}

interface ClassmateVisitsApprovalBody {
  classmateVisitsApproved: boolean;
}

const classmateVisitsApprovalBodySchema = {
  type: "object",
  required: ["classmateVisitsApproved"],
  additionalProperties: false,
  properties: { classmateVisitsApproved: { type: "boolean" } },
} as const;

interface SchoolParams {
  schoolId: string;
}

const longestSchoolTextLength = 80;

const schoolTextSchema = {
  type: "string",
  pattern: "\\S",
  maxLength: longestSchoolTextLength,
} as const;

const schoolBodySchema = {
  type: "object",
  required: ["name", "town"],
  additionalProperties: false,
  properties: { name: schoolTextSchema, town: schoolTextSchema },
} as const;

/** A School's name reaches every Parent it invites, so it and its town must each be one plain line (#321). */
const readSchoolText = ({ name, town }: SchoolBody): SchoolBody => {
  const school = { name: name.trim(), town: town.trim() };
  if (!isPlainName(school.name) || !isPlainName(school.town)) {
    throw new NameNotPlainError();
  }
  return school;
};

const schoolParamsSchema = {
  type: "object",
  required: ["schoolId"],
  properties: { schoolId: { type: "string", format: "uuid" } },
} as const;

const countBySchool = async (
  database: ReachDatabase,
  table: typeof teachers | typeof children,
): Promise<Map<string, number>> => {
  const counts = await database
    .select({ schoolId: table.schoolId, rows: count() })
    .from(table)
    .groupBy(table.schoolId);
  return new Map(counts.map(({ schoolId, rows }) => [schoolId, rows]));
};

/** A School is a name and a town, and only the Admin creates, names or deletes one. */
interface SchoolRouteParts {
  database: Database;
  isSecondSchoolGateMet: boolean;
}

export const registerSchoolRoutes = (
  server: FastifyInstance,
  { database, isSecondSchoolGateMet }: SchoolRouteParts,
): void => {
  server.get(
    "/api/schools",
    { config: { reach: "adult" } },
    async (request): Promise<ListedSchool[]> =>
      runAsSignedInAdult(database, request, async (caller, reachDatabase) => {
        const seenSchoolIds = await loadSeenSchoolIds(reachDatabase, caller);
        if (seenSchoolIds !== "every-school" && seenSchoolIds.length === 0) {
          return [];
        }
        const schoolRows = await reachDatabase
          .select({
            id: schools.id,
            name: schools.name,
            town: schools.town,
            classmateVisitsApproved: schools.classmateVisitsApproved,
          })
          .from(schools)
          .where(
            seenSchoolIds === "every-school"
              ? undefined
              : inArray(schools.id, seenSchoolIds),
          )
          .orderBy(asc(schools.name), asc(schools.createdAt));
        const teacherCounts = await countBySchool(reachDatabase, teachers);
        const childCounts = await countBySchool(reachDatabase, children);
        return schoolRows.map((school) => ({
          ...school,
          teacherCount: teacherCounts.get(school.id) ?? 0,
          childCount: childCounts.get(school.id) ?? 0,
        }));
      }),
  );

  server.post<{ Body: SchoolBody }>(
    "/api/schools",
    { config: { reach: "admin" }, schema: { body: schoolBodySchema } },
    async (request, reply) => {
      const school = await runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          await reachDatabase.execute(
            sql`lock table ${schools} in share row exclusive mode`,
          );
          const [{ schoolCount }] = await reachDatabase
            .select({ schoolCount: count() })
            .from(schools);
          if (schoolCount > 0 && !isSecondSchoolGateMet) {
            request.log.warn(
              { userId: adminUserId, schoolCount },
              "schools.school.refused",
            );
            throw new SecondSchoolGateNotMetError();
          }
          const [createdSchool] = await reachDatabase
            .insert(schools)
            .values({
              ...readSchoolText(request.body),
            })
            .returning({
              id: schools.id,
              name: schools.name,
              town: schools.town,
            });
          await insertAuditLogEntry(reachDatabase, {
            action: "school.created",
            actor: buildUserActor(signedInAdmin),
            target: { type: "school", id: createdSchool.id },
          });
          request.log.info(
            { userId: adminUserId, schoolId: createdSchool.id },
            "schools.school.created",
          );
          return createdSchool;
        },
      );
      return reply.code(201).send(school);
    },
  );

  server.put<{ Params: SchoolParams; Body: SchoolBody }>(
    "/api/schools/:schoolId",
    {
      config: { reach: "admin" },
      schema: { params: schoolParamsSchema, body: schoolBodySchema },
    },
    async (request) =>
      runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const { schoolId } = request.params;
          const school = (
            await reachDatabase
              .update(schools)
              .set({
                ...readSchoolText(request.body),
              })
              .where(eq(schools.id, schoolId))
              .returning({
                id: schools.id,
                name: schools.name,
                town: schools.town,
              })
          ).at(0);
          if (school === undefined) {
            throw new SchoolNotFoundError();
          }
          // The entry names the School, not its new name or town (ADR 0041, #288).
          await insertAuditLogEntry(reachDatabase, {
            action: "school.changed",
            actor: buildUserActor(signedInAdmin),
            target: { type: "school", id: schoolId },
          });
          request.log.info(
            { userId: adminUserId, schoolId },
            "schools.school.named",
          );
          return school;
        },
      ),
  );

  // The Admin approves this only once the School's data processing agreement names Classmates' Rooms (ADR 0031). Withdrawing it shuts every Classmate's Room there at once; each Parent's own switch is kept.
  server.put<{ Params: SchoolParams; Body: ClassmateVisitsApprovalBody }>(
    "/api/schools/:schoolId/classmate-visits",
    {
      config: { reach: "admin" },
      schema: {
        params: schoolParamsSchema,
        body: classmateVisitsApprovalBodySchema,
      },
    },
    async (request) =>
      runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const { schoolId } = request.params;
          const { classmateVisitsApproved } = request.body;
          const school = (
            await reachDatabase
              .update(schools)
              .set({ classmateVisitsApproved })
              .where(eq(schools.id, schoolId))
              .returning({
                id: schools.id,
                classmateVisitsApproved: schools.classmateVisitsApproved,
              })
          ).at(0);
          if (school === undefined) {
            throw new SchoolNotFoundError();
          }
          await insertAuditLogEntry(reachDatabase, {
            action: "school.classmate-visits-changed",
            actor: buildUserActor(signedInAdmin),
            target: { type: "school", id: schoolId },
            detail: classmateVisitsApproved ? "approved" : "withdrawn",
          });
          request.log.info(
            { userId: adminUserId, schoolId },
            classmateVisitsApproved
              ? "schools.classmate-visits.approved"
              : "schools.classmate-visits.withdrawn",
          );
          return school;
        },
      ),
  );

  server.delete<{ Params: SchoolParams }>(
    "/api/schools/:schoolId",
    { config: { reach: "admin" }, schema: { params: schoolParamsSchema } },
    async (request, reply) => {
      await runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const { schoolId } = request.params;
          const school = (
            await reachDatabase
              .select({ id: schools.id })
              .from(schools)
              .where(eq(schools.id, schoolId))
              .for("update")
          ).at(0);
          if (school === undefined) {
            throw new SchoolNotFoundError();
          }
          const [{ teacherRows }] = await reachDatabase
            .select({ teacherRows: count() })
            .from(teachers)
            .where(eq(teachers.schoolId, schoolId));
          const [{ childRows }] = await reachDatabase
            .select({ childRows: count() })
            .from(children)
            .where(eq(children.schoolId, schoolId));
          if (teacherRows > 0 || childRows > 0) {
            throw new SchoolNotEmptyError();
          }
          await reachDatabase.delete(schools).where(eq(schools.id, schoolId));
          await insertAuditLogEntry(reachDatabase, {
            action: "school.deleted",
            actor: buildUserActor(signedInAdmin),
            target: { type: "school", id: schoolId },
          });
          request.log.info(
            { userId: adminUserId, schoolId },
            "schools.school.deleted",
          );
        },
      );
      return reply.code(204).send();
    },
  );
};
