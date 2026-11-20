import { and, asc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type {
  CharacterLoadout,
  RoomLoadout,
} from "../../curriculum/catalogue.js";
import type { Trophy } from "../../curriculum/rewards.js";
import type { Database } from "../database.js";
import { ChildNotFoundError } from "../reach-rules.js";
import { children, roomShowcases, schools } from "../schema.js";
import {
  runAsSignedInFamilyDevice,
  setFamilyDeviceCookie,
} from "./signed-in-family-device.js";

interface ClassmateRoom {
  loadout: CharacterLoadout;
  room: RoomLoadout;
  trophies: Trophy[];
}

interface ClassmateRooms {
  classmateRooms: ClassmateRoom[];
}

interface VisitorParams {
  childId: string;
}

const visitorParamsSchema = {
  type: "object",
  required: ["childId"],
  properties: { childId: { type: "string", format: "uuid" } },
} as const;

export const registerClassmateRoomRoutes = (
  server: FastifyInstance,
  database: Database,
): void => {
  server.get<{ Params: VisitorParams }>(
    "/api/play/children/:childId/classmate-rooms",
    {
      config: { reach: "family-device" },
      schema: { params: visitorParamsSchema },
    },
    async (request, reply): Promise<ClassmateRooms> => {
      const { childId } = request.params;
      const classmateRooms = await runAsSignedInFamilyDevice(
        database,
        request,
        async ({ familyDeviceId, familyId, token }, reachDatabase) => {
          const visitor = (
            await reachDatabase
              .select({
                classmateVisitsAllowed: sql<boolean>`${children.classmateVisitsAllowed} and ${schools.classmateVisitsApproved}`,
              })
              .from(children)
              .innerJoin(schools, eq(schools.id, children.schoolId))
              .where(
                and(eq(children.id, childId), eq(children.familyId, familyId)),
              )
          ).at(0);
          if (visitor === undefined) {
            throw new ChildNotFoundError();
          }
          setFamilyDeviceCookie(reply, token);
          if (!visitor.classmateVisitsAllowed) {
            return [];
          }
          const visitedRooms = await reachDatabase
            .select({
              loadout: roomShowcases.loadout,
              room: roomShowcases.room,
              trophies: roomShowcases.trophies,
            })
            .from(roomShowcases)
            .where(
              sql`wizzaroo_can_visit_classmate_room(${childId}::uuid, ${roomShowcases.childId})`,
            )
            .orderBy(asc(roomShowcases.childId));
          request.log.info(
            { familyDeviceId, childId, classmateCount: visitedRooms.length },
            "family-devices.classmate-rooms.listed",
          );
          return visitedRooms;
        },
      );
      void reply.header("cache-control", "no-store");
      return { classmateRooms };
    },
  );
};
