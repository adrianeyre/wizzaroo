import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import {
  runAsSignedInAdmin,
  runAsSignedInStaff,
} from "../auth/signed-in-parent.js";
import type { Database } from "../database.js";
import { largeBodyLimit } from "../http-hardening.js";
import {
  buildEmailQueue,
  type EmailBatching,
  type SendEmail,
} from "../email/send-email.js";
import { markInviteEmailFailed } from "../people/invites.js";
import {
  buildFamilyTemplate,
  createFamiliesFromCsv,
  previewFamilies,
} from "./bulk-families.js";
import {
  buildBulkOutcome,
  type InviteEmail,
  type PreviewedRow,
} from "./bulk-rows.js";
import {
  createTeachersFromCsv,
  previewTeachers,
  teacherTemplate,
} from "./bulk-teachers.js";

interface CsvBody {
  csv: string;
}

interface BulkCreationBody extends CsvBody {
  sendInvites: boolean;
}

const largestCsvLength = 1_000_000;

const csvBodySchema = {
  type: "object",
  required: ["csv"],
  additionalProperties: false,
  properties: { csv: { type: "string", maxLength: largestCsvLength } },
} as const;

const bulkCreationBodySchema = {
  type: "object",
  required: ["csv", "sendInvites"],
  additionalProperties: false,
  properties: {
    csv: { type: "string", maxLength: largestCsvLength },
    sendInvites: { type: "boolean" },
  },
} as const;

const csvContentType = "text/csv; charset=utf-8";

const toPreview = (rows: readonly PreviewedRow[]): PreviewedRow[] =>
  rows.map(({ rowNumber, summary, problem }) => ({
    rowNumber,
    summary,
    problem,
  }));

interface BulkRouteParts {
  database: Database;
  sendEmail: SendEmail;
  publicUrl: URL;
  emailBatching: EmailBatching;
}

/** The Admin sets up a School's Teachers, and the Admin or a Teacher its Parents and Children, from a spreadsheet. */
export const registerBulkRoutes = (
  server: FastifyInstance,
  { database, sendEmail, publicUrl, emailBatching }: BulkRouteParts,
): void => {
  // One queue for every upload, since the provider's limit is the deployment's (#292).
  const emailQueue = buildEmailQueue(sendEmail, emailBatching);
  // Not awaited: a big upload's Invites take minutes to send in batches, and the people already exist.
  // An email that fails marks its Invite, so the lists show it wasn't sent and the uploader sends a new one (#293).
  const sendInviteEmailsLater = (
    log: FastifyBaseLogger,
    inviteEmails: InviteEmail[],
  ) => {
    emailQueue.enqueue(
      inviteEmails.map(({ inviteId, email }) => ({
        email,
        onFailure: async (error: unknown) => {
          log.error({ err: error, inviteId }, "bulk.invites.failed");
          try {
            await markInviteEmailFailed(database, inviteId);
          } catch (markError: unknown) {
            log.error({ err: markError, inviteId }, "bulk.invites.not-marked");
          }
        },
      })),
    );
  };

  server.get(
    "/api/bulk/teachers/template",
    { config: { reach: "admin" } },
    async (request, reply) => {
      await runAsSignedInAdmin(database, request, () => Promise.resolve());
      return reply
        .type(csvContentType)
        .header("content-disposition", 'attachment; filename="teachers.csv"')
        .send(teacherTemplate);
    },
  );

  server.post<{ Body: CsvBody }>(
    "/api/bulk/teachers/preview",
    {
      config: { reach: "admin" },
      schema: { body: csvBodySchema },
      bodyLimit: largeBodyLimit,
    },
    async (request) =>
      runAsSignedInAdmin(
        database,
        request,
        async (_adminUserId, reachDatabase) =>
          toPreview(await previewTeachers(reachDatabase, request.body.csv)),
      ),
  );

  server.post<{ Body: BulkCreationBody }>(
    "/api/bulk/teachers",
    {
      config: { reach: "admin" },
      schema: { body: bulkCreationBodySchema },
      bodyLimit: largeBodyLimit,
    },
    async (request, reply) => {
      const { adminUserId, rows, inviteEmails } = await runAsSignedInAdmin(
        database,
        request,
        async (userId, reachDatabase, signedInAdmin) => ({
          adminUserId: userId,
          ...(await createTeachersFromCsv(reachDatabase, database, {
            csv: request.body.csv,
            sendInvites: request.body.sendInvites,
            admin: signedInAdmin,
            publicUrl,
          })),
        }),
      );
      const outcome = buildBulkOutcome(toPreview(rows), inviteEmails.length);
      request.log.info(
        {
          userId: adminUserId,
          createdRowCount: outcome.createdRowCount,
          skippedRowCount: outcome.skippedRows.length,
        },
        "bulk.teachers.created",
      );
      sendInviteEmailsLater(request.log, inviteEmails);
      return reply.code(201).send(outcome);
    },
  );

  server.get(
    "/api/bulk/families/template",
    { config: { reach: "staff" } },
    async (request, reply) => {
      const template = await runAsSignedInStaff(database, request, (staff) =>
        Promise.resolve(buildFamilyTemplate(staff)),
      );
      return reply
        .type(csvContentType)
        .header(
          "content-disposition",
          'attachment; filename="parents-and-children.csv"',
        )
        .send(template);
    },
  );

  server.post<{ Body: CsvBody }>(
    "/api/bulk/families/preview",
    {
      config: { reach: "staff" },
      schema: { body: csvBodySchema },
      bodyLimit: largeBodyLimit,
    },
    async (request) =>
      runAsSignedInStaff(database, request, async (staff, reachDatabase) =>
        toPreview(
          await previewFamilies(reachDatabase, {
            staff,
            csv: request.body.csv,
            moment: new Date(),
            ownerDatabase: database,
          }),
        ),
      ),
  );

  server.post<{ Body: BulkCreationBody }>(
    "/api/bulk/families",
    {
      config: { reach: "staff" },
      schema: { body: bulkCreationBodySchema },
      bodyLimit: largeBodyLimit,
    },
    async (request, reply) => {
      const { staffUserId, rows, inviteEmails } = await runAsSignedInStaff(
        database,
        request,
        async (staff, reachDatabase) => ({
          staffUserId: staff.userId,
          ...(await createFamiliesFromCsv(reachDatabase, {
            staff,
            csv: request.body.csv,
            sendInvites: request.body.sendInvites,
            publicUrl,
            moment: new Date(),
            ownerDatabase: database,
          })),
        }),
      );
      const outcome = buildBulkOutcome(toPreview(rows), inviteEmails.length);
      request.log.info(
        {
          userId: staffUserId,
          createdRowCount: outcome.createdRowCount,
          skippedRowCount: outcome.skippedRows.length,
        },
        "bulk.families.created",
      );
      sendInviteEmailsLater(request.log, inviteEmails);
      return reply.code(201).send(outcome);
    },
  );
};
