import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { QuestProgress } from "../../curriculum/island-quests.js";
import {
  findChildRewards,
  mostParentStarsADay,
  parentStarAwardSizes,
  type ParentStarAwardSize,
} from "../../curriculum/rewards.js";
import {
  runAsSignedInParent,
  type SignedInParent,
} from "../auth/signed-in-parent.js";
import type { Database } from "../database.js";
import type { ReachDatabase } from "../reach.js";
import { ChildNotFoundError } from "../reach-rules.js";
import { children, starAwards } from "../schema.js";
import { loadFamilyRewards } from "./family-rewards.js";

/** What the Awards page shows for one Child: their Stars, their Family's Chest and their Quests (ADR 0063). */
export interface ChildAwards {
  childId: string;
  stars: number;
  /** The Stars the Child's Parents have given them today, UK time, between them. */
  starsGivenToday: number;
  familyChestActivityCount: number;
  questProgress: QuestProgress[];
}

export class DailyStarsGivenError extends Error {
  override readonly name = "DailyStarsGivenError";
  readonly statusCode = 409;

  constructor() {
    super(
      `A Child's Parents can give them at most ${String(mostParentStarsADay)} Stars a day, so that many Stars would be too many today`,
    );
  }
}

interface ChildParams {
  childId: string;
}

interface StarAwardBody {
  stars: ParentStarAwardSize;
}

const childParamsSchema = {
  type: "object",
  required: ["childId"],
  properties: { childId: { type: "string", format: "uuid" } },
} as const;

const starAwardBodySchema = {
  type: "object",
  required: ["stars"],
  additionalProperties: false,
  properties: { stars: { type: "integer", enum: parentStarAwardSizes } },
} as const;

const selectOwnChild = (
  reachDatabase: ReachDatabase,
  { familyId }: SignedInParent,
  childId: string,
) =>
  reachDatabase
    .select({ id: children.id })
    .from(children)
    .where(and(eq(children.id, childId), eq(children.familyId, familyId)));

/** A Child outside the Parent's own Family isn't found, the Admin's and a Teacher's reach being off on a Parent route. */
const assertOwnChild = async (
  reachDatabase: ReachDatabase,
  parent: SignedInParent,
  childId: string,
): Promise<void> => {
  if ((await selectOwnChild(reachDatabase, parent, childId)).length === 0) {
    throw new ChildNotFoundError();
  }
};

/**
 * As assertOwnChild, and takes the Child's row until the transaction ends, so two Parents giving Stars at once are
 * counted one after the other and never pass 15 a day between them.
 */
const lockOwnChild = async (
  reachDatabase: ReachDatabase,
  parent: SignedInParent,
  childId: string,
): Promise<void> => {
  if (
    (await selectOwnChild(reachDatabase, parent, childId).for("update"))
      .length === 0
  ) {
    throw new ChildNotFoundError();
  }
};

const countStarsGivenToday = async (
  reachDatabase: ReachDatabase,
  childId: string,
): Promise<number> => {
  const [{ stars }] = await reachDatabase
    .select({
      stars: sql<number>`coalesce(sum(${starAwards.stars}), 0)::integer`,
    })
    .from(starAwards)
    .where(
      and(
        eq(starAwards.childId, childId),
        eq(starAwards.givenByParent, true),
        sql`(${starAwards.awardedAt} at time zone 'Europe/London')::date = wizzaroo_today()`,
      ),
    );
  return stars;
};

const loadChildAwards = async (
  reachDatabase: ReachDatabase,
  { familyId }: SignedInParent,
  childId: string,
): Promise<ChildAwards> => {
  const familyRewards = await loadFamilyRewards(reachDatabase, familyId);
  const { stars, questProgress } = findChildRewards(familyRewards, childId);
  return {
    childId,
    stars,
    starsGivenToday: await countStarsGivenToday(reachDatabase, childId),
    familyChestActivityCount: familyRewards.familyChestActivityCount,
    questProgress,
  };
};

export const registerAwardRoutes = (
  server: FastifyInstance,
  database: Database,
): void => {
  server.get<{ Params: ChildParams }>(
    "/api/children/:childId/awards",
    { config: { reach: "parent" }, schema: { params: childParamsSchema } },
    async (request): Promise<ChildAwards> =>
      runAsSignedInParent(database, request, async (parent, reachDatabase) => {
        const { childId } = request.params;
        await assertOwnChild(reachDatabase, parent, childId);
        return loadChildAwards(reachDatabase, parent, childId);
      }),
  );

  server.post<{ Params: ChildParams; Body: StarAwardBody }>(
    "/api/children/:childId/star-awards",
    {
      config: { reach: "parent" },
      schema: { params: childParamsSchema, body: starAwardBodySchema },
    },
    async (request): Promise<ChildAwards> =>
      runAsSignedInParent(database, request, async (parent, reachDatabase) => {
        const { childId } = request.params;
        const { stars } = request.body;
        await lockOwnChild(reachDatabase, parent, childId);
        const starsGivenToday = await countStarsGivenToday(
          reachDatabase,
          childId,
        );
        if (starsGivenToday + stars > mostParentStarsADay) {
          throw new DailyStarsGivenError();
        }
        await reachDatabase.insert(starAwards).values({
          childId,
          stars,
          awardedByUserId: parent.userId,
          givenByParent: true,
        });
        request.log.info(
          { userId: parent.userId, childId, stars },
          "children.stars.given-by-parent",
        );
        return loadChildAwards(reachDatabase, parent, childId);
      }),
  );
};
