import { ModalDialog } from "../modal-dialog.js";
import type { GamePlace } from "../../curriculum/world-map.js";
import {
  findGameCurriculum,
  nationalCurriculumUrl,
  type GameCurriculumPoint,
} from "./game-curriculum.js";

export const forParentsLabel = "For parents";

/** A grown-up and a child side by side: the For parents button's picture. */
export const ForParentsIcon = () => (
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
    <circle cx="8" cy="5" r="2.5" />
    <path d="M4 21v-7a4 4 0 0 1 8 0v7" />
    <circle cx="17" cy="10" r="2" />
    <path d="M14 21v-4a3 3 0 0 1 6 0v4" />
  </svg>
);

const CurriculumPointDetails = ({ point }: { point: GameCurriculumPoint }) => (
  <section className="for-parents-point" aria-label={point.statutoryHeading}>
    <h3>
      {point.subjectName}: {point.statutoryHeading}
    </h3>
    <dl className="for-parents-location">
      <dt>Programme of study</dt>
      <dd>{point.programmeOfStudy}</dd>
      <dt>Key Stage</dt>
      <dd>{point.keyStage}</dd>
      <dt>Part</dt>
      <dd>{point.programmePart}</dd>
      <dt>Statutory heading</dt>
      <dd>{point.statutoryHeading}</dd>
      <dt>What pupils should be taught</dt>
      <dd>{point.summary}</dd>
      <dt>What this Game practises</dt>
      <dd>{point.skillNames.join("; ")}</dd>
    </dl>
    <p>
      <a href={point.programmeOfStudyUrl} target="_blank" rel="noreferrer">
        Read the {point.subjectName} programme of study on GOV.UK
      </a>
    </p>
  </section>
);

interface ForParentsDialogProps {
  /** The Game the dialog tells about; the dialog is closed without one. */
  place: GamePlace | undefined;
  /** Whether the Game was paused to open the dialog, so closing it carries on playing. */
  isGamePaused: boolean;
  onClose: () => void;
}

/**
 * Tells a Parent exactly which part of the National Curriculum in England a
 * Game practises: the programme of study, Key Stage, Year and statutory
 * heading of each Curriculum Point its Skills teach.
 */
export const ForParentsDialog = ({
  place,
  isGamePaused,
  onClose,
}: ForParentsDialogProps) => {
  const gameCurriculum =
    place === undefined ? undefined : findGameCurriculum(place);
  return (
    <ModalDialog
      isOpen={gameCurriculum !== undefined}
      onClose={onClose}
      title={
        gameCurriculum === undefined
          ? forParentsLabel
          : `${forParentsLabel}: ${gameCurriculum.title}`
      }
      closeLabel={isGamePaused ? "Close and carry on playing" : "Close"}
    >
      {gameCurriculum === undefined ? null : (
        <div className="for-parents" data-read-aloud-section>
          {isGamePaused ? (
            <p className="for-parents-paused" role="status">
              The Game is paused. Close this to carry on playing.
            </p>
          ) : null}
          <p>
            <strong>{gameCurriculum.title}</strong> is in{" "}
            {gameCurriculum.regionName} on {gameCurriculum.islandName}, the Year{" "}
            {gameCurriculum.yearGroup} Island. It practises{" "}
            {gameCurriculum.points.length === 1
              ? "this part"
              : `these ${String(gameCurriculum.points.length)} parts`}{" "}
            of the National Curriculum in England, the statutory curriculum for
            primary schools in England.
          </p>
          {gameCurriculum.points.map((point) => (
            <CurriculumPointDetails key={point.key} point={point} />
          ))}
          <p className="form-hint">
            Scotland, Wales and Northern Ireland each have their own curriculum;
            Wizzaroo follows England&apos;s.
          </p>
          <p>
            <a
              className="button-link"
              href={nationalCurriculumUrl}
              target="_blank"
              rel="noreferrer"
            >
              View National Curriculum
            </a>
          </p>
        </div>
      )}
    </ModalDialog>
  );
};
