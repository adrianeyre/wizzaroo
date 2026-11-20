import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import type { Database } from "../database.js";
import { deleteOtherSignIns } from "./account-tokens.js";
import { runAsSignedInUser } from "./signed-in-parent.js";

/** Signs out every other browser an adult is signed in on, keeping this one, with no password to change (#245). */
export const registerOtherSignInsRoutes = (
  server: FastifyInstance,
  database: Database,
): void => {
  server.delete(
    "/api/other-sign-ins",
    { config: { reach: "user" } },
    async (request, reply) => {
      await runAsSignedInUser(
        database,
        request,
        async (signedInUser, reachDatabase) => {
          const { userId, signInTokenHash } = signedInUser;
          await deleteOtherSignIns(reachDatabase, userId, signInTokenHash);
          await insertAuditLogEntry(reachDatabase, {
            action: "sign-out.other-browsers",
            actor: buildUserActor(signedInUser),
            target: { type: "user", id: userId },
          });
          request.log.info({ userId }, "auth.other-sign-ins.deleted");
        },
      );
      return reply.code(204).send();
    },
  );
};
