import { hash } from "@node-rs/argon2";
import { arrayContains, sql } from "drizzle-orm";
import type { Database } from "../database.js";
import {
  families,
  familyParents,
  schoolParents,
  schools,
  users,
} from "../schema.js";
import { OwnerSeedRefusedError, type OwnerSeed } from "./owner-seed.js";

export class OwnerAlreadyExistsError extends OwnerSeedRefusedError {
  override name = "OwnerAlreadyExistsError";

  constructor() {
    super(
      "Wizzaroo already has its owner, so seed:owner changed nothing. It only ever runs once",
    );
  }
}

export const createOwner = async (
  database: Database,
  { email, password, familyName }: OwnerSeed,
): Promise<void> => {
  const passwordHash = await hash(password);

  await database.transaction(async (transaction) => {
    // Two seeds run at once must not both find no owner, so the check and the insert hold this lock together.
    await transaction.execute(
      sql`lock table users in share row exclusive mode`,
    );
    const admins = await transaction
      .select({ id: users.id })
      .from(users)
      .where(arrayContains(users.roles, ["admin"]))
      .limit(1);
    if (admins.length > 0) {
      throw new OwnerAlreadyExistsError();
    }

    const [owner] = await transaction
      .insert(users)
      .values({ email, passwordHash, roles: ["admin", "parent"] })
      .returning({ id: users.id });
    const [family] = await transaction
      .insert(families)
      .values({ name: familyName })
      .returning({ id: families.id });
    await transaction
      .insert(familyParents)
      .values({ userId: owner.id, familyId: family.id });
    // The owner's Children start in a School of their own, which the Admin names on their first visit.
    const [school] = await transaction
      .insert(schools)
      .values({})
      .returning({ id: schools.id });
    await transaction
      .insert(schoolParents)
      .values({ userId: owner.id, schoolId: school.id });
  });
};
