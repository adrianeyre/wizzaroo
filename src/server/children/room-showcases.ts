import { eq, sql } from "drizzle-orm";
import {
  isFeatureSlot,
  wearableSlots,
  type CharacterLoadout,
} from "../../curriculum/catalogue.js";
import { findChildRewards, listTrophies } from "../../curriculum/rewards.js";
import type { ReachDatabase } from "../reach.js";
import { characters, children, roomShowcases } from "../schema.js";
import { loadFamilyRewards } from "./family-rewards.js";

const isShownToClassmates = (slot: string): boolean =>
  isFeatureSlot(slot) ||
  slot === "pet" ||
  wearableSlots.some((wearableSlot) => wearableSlot === slot);

export const buildShowcaseLoadout = (
  loadout: CharacterLoadout,
): CharacterLoadout =>
  Object.fromEntries(
    Object.entries(loadout).filter(([slot]) => isShownToClassmates(slot)),
  );

export const refreshRoomShowcases = async (
  database: ReachDatabase,
  familyId: string,
  updatedAt: Date,
): Promise<void> => {
  const familyRewards = await loadFamilyRewards(database, familyId);
  const familyCharacters = await database
    .select({ childId: characters.childId })
    .from(characters)
    .innerJoin(children, eq(children.id, characters.childId))
    .where(eq(children.familyId, familyId));
  if (familyCharacters.length === 0) {
    return;
  }
  await database
    .insert(roomShowcases)
    .values(
      familyCharacters.map(({ childId }) => {
        const childRewards = findChildRewards(familyRewards, childId);
        return {
          childId,
          loadout: buildShowcaseLoadout(childRewards.loadout),
          room: childRewards.room,
          trophies: listTrophies(childRewards),
          updatedAt,
        };
      }),
    )
    .onConflictDoUpdate({
      target: roomShowcases.childId,
      set: {
        loadout: sql`excluded.loadout`,
        room: sql`excluded.room`,
        trophies: sql`excluded.trophies`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
};
