import { useState } from "react";
import {
  islandQuests,
  type IslandQuest,
} from "../../curriculum/island-quests.js";
import {
  listQuestTrophies,
  type ChildRewards,
} from "../../curriculum/rewards.js";
import { findIsland } from "../../curriculum/world-map.js";
import type { SoundSettings } from "../game-sound.js";
import { playOpeningSound } from "../opening-sounds.js";
import { ModalDialog } from "../modal-dialog.js";
import { AwardStage } from "./award-stage.js";

/**
 * The Awards window (ADR 0059): every Island's Quest Trophy as a 3D
 * Award, turning slowly, with the Island it comes from. Awards still to
 * be won are shown too, dulled, so a Child can see what each Quest gives.
 */

export interface AwardShown {
  islandId: string;
  islandName: string;
  trophyName: string;
  isWon: boolean;
}

export const listAwards = (
  rewards: Pick<ChildRewards, "questProgress">,
  quests: readonly IslandQuest[] = islandQuests,
): AwardShown[] => {
  const wonIslandIds = new Set(
    listQuestTrophies(rewards, quests).map(({ islandId }) => islandId),
  );
  return quests.map(({ islandId, trophyName }) => ({
    islandId,
    islandName: findIsland(islandId)?.name ?? islandId,
    trophyName,
    isWon: wonIslandIds.has(islandId),
  }));
};

export const describeAwardsWon = (awards: readonly AwardShown[]): string => {
  const won = awards.filter(({ isWon }) => isWon).length;
  if (won === 0) {
    return "Finish an Island's Quest to win its Award.";
  }
  return `You have won ${String(won)} of ${String(awards.length)} Awards.`;
};

export const AwardIcon = () => (
  <svg
    className="line-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 3h8v5a4 4 0 0 1-8 0z" />
    <path d="M8 5H5a3 3 0 0 0 3 4" />
    <path d="M16 5h3a3 3 0 0 1-3 4" />
    <path d="M12 12v4" />
    <path d="M7 21h10" />
    <path d="M9 21v-3h6v3" />
  </svg>
);

export const AwardsDialog = ({
  rewards,
  isOpen,
  onClose,
}: {
  rewards: Pick<ChildRewards, "questProgress">;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const awards = listAwards(rewards);
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Your Awards"
      closeLabel="Close your Awards"
    >
      <div className="awards">
        <p className="awards-summary">{describeAwardsWon(awards)}</p>
        <ul className="awards-list" aria-label="Every Award">
          {awards.map((award) => (
            <li
              key={award.islandId}
              className={award.isWon ? "award won" : "award not-won"}
            >
              <AwardStage
                islandId={award.islandId}
                label={
                  award.isWon
                    ? `The ${award.trophyName} Award, won on ${award.islandName}`
                    : `The ${award.trophyName} Award, not won yet`
                }
              />
              <h3 className="award-name">{award.trophyName}</h3>
              <p className="award-island">{award.islandName}</p>
              <p className="award-state">
                {award.isWon
                  ? "Won!"
                  : `Finish the Quest on ${award.islandName}`}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </ModalDialog>
  );
};

/** The Awards button beside the Stars, and the window it opens. */
export const AwardsButton = ({
  rewards,
  soundSettings,
}: {
  rewards: Pick<ChildRewards, "questProgress">;
  soundSettings: SoundSettings;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const won = listAwards(rewards).filter(({ isWon }) => isWon).length;
  return (
    <>
      <button
        type="button"
        className="awards-button"
        aria-label={`Awards, ${String(won)} won`}
        onClick={() => {
          setIsOpen(true);
          playOpeningSound("wow", soundSettings);
        }}
      >
        <AwardIcon />
        <span className="awards-button-label">Awards</span>
      </button>
      <AwardsDialog
        rewards={rewards}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </>
  );
};
