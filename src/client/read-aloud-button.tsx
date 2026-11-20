import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { BusyProgress } from "./busy/busy-progress.js";
import {
  findVoiceDownload,
  isPiperOffered,
  subscribeToVoiceDownloads,
} from "./voice-over/piper-speech.js";
import {
  findSpeakingReader,
  isReadAloudOffered,
  readAloud,
  stopReadingAloud,
  subscribeToReadingAloud,
} from "./voice-over/read-aloud.js";
import {
  findReadAloudVoice,
  loadReadAloudVoiceName,
  type ReadAloudVoice,
} from "./voice-over/read-aloud-voices.js";
import {
  findReadAloudSection,
  listSectionWords,
} from "./voice-over/section-words.js";

export const readAloudLabel = "Read it to me";
export const stopReadingLabel = "Stop reading";

const bytesPerMegabyte = 1024 * 1024;

const toMegabytes = (bytes: number): number =>
  Math.round(bytes / bytesPerMegabyte);

/** What downloading a voice is for, as a BusyProgress says it. */
export const describeVoiceDownloadLabel = (voice: ReadAloudVoice): string =>
  `Downloading the ${voice.name} voice (${String(toMegabytes(voice.model.model.bytes))} MB) so it can read to you…`;

/** How much of a voice has downloaded, in megabytes. */
export const describeVoiceDownloadDetail = (
  voice: ReadAloudVoice,
  share: number,
): string => {
  const { bytes } = voice.model.model;
  return `${String(toMegabytes(bytes * Math.min(1, Math.max(0, share))))} MB of ${String(toMegabytes(bytes))} MB downloaded`;
};

const ReadAloudIcon = () => (
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
    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
    <path d="M16 9a5 5 0 0 1 0 6" />
    <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
  </svg>
);

/** Three bars that rise and fall while the words are being read. */
const SpeakingIcon = () => (
  <svg
    className="line-icon read-aloud-bars"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6 9v6" />
    <path d="M12 5v14" />
    <path d="M18 9v6" />
  </svg>
);

interface ReadAloudButtonProps {
  /**
   * What to say. Left out, the button reads the section it sits in: its
   * nearest dialog, section or `data-read-aloud-section`.
   */
  text?: string | undefined;
  /** Played when the text can't be spoken, such as a recorded voice-over. */
  fallback?: () => void;
  className?: string;
  isLabelShown?: boolean;
  /** Read the section the button sits in, rather than `text`. */
  readsSection?: boolean;
  /**
   * The id of the heading the button reads, so a screen reader tells the
   * page's many Read it to me buttons apart.
   */
  describedBy?: string;
}

/**
 * The button that reads a question or a message out loud, so a Child who
 * can't read it yet can still play. It falls quiet when what it reads
 * changes or it leaves the page.
 */
export const ReadAloudButton = ({
  text,
  fallback,
  className = "read-aloud",
  isLabelShown = true,
  readsSection = false,
  describedBy,
}: ReadAloudButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reader = useId();
  const isSpeaking = useSyncExternalStore(
    subscribeToReadingAloud,
    () => findSpeakingReader() === reader,
    () => false,
  );
  useEffect(() => stopReadingAloud, [text]);
  // The voice this button asked for, while the device still had to download it.
  const [waitedForVoice, setWaitedForVoice] = useState<ReadAloudVoice>();
  const voiceDownload = useSyncExternalStore(
    subscribeToVoiceDownloads,
    () =>
      waitedForVoice === undefined
        ? undefined
        : findVoiceDownload(waitedForVoice.model),
    () => undefined,
  );
  const downloadingShare =
    voiceDownload?.state === "downloading" ? voiceDownload.share : undefined;
  const isDownloading = downloadingShare !== undefined;

  const isOffered = isReadAloudOffered();
  if (
    fallback === undefined &&
    (!isOffered || (!readsSection && text === undefined))
  ) {
    return null;
  }

  const findWords = (): string | undefined => {
    if (!readsSection) {
      return text;
    }
    const button = buttonRef.current;
    const section = button === null ? undefined : findReadAloudSection(button);
    return section === undefined ? undefined : listSectionWords(section);
  };

  const label = isSpeaking ? stopReadingLabel : readAloudLabel;
  const classes = [
    "read-aloud-button",
    className,
    isLabelShown ? "" : "is-icon-only",
  ]
    .filter((name) => name !== "")
    .join(" ");

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={classes}
        aria-label={isLabelShown ? undefined : label}
        aria-describedby={describedBy}
        title={
          isSpeaking
            ? "Stop reading out loud"
            : readsSection
              ? "Read this out loud"
              : "Read the question out loud"
        }
        data-speaking={isSpeaking ? "" : undefined}
        data-read-aloud-skip=""
        // While the voice downloads with nothing to stop, pressing again can't make it come sooner.
        disabled={isDownloading && !isSpeaking}
        aria-busy={isDownloading ? true : undefined}
        onClick={() => {
          if (isSpeaking) {
            stopReadingAloud();
            setWaitedForVoice(undefined);
            return;
          }
          const voiceName = loadReadAloudVoiceName();
          const voice = findReadAloudVoice(voiceName);
          setWaitedForVoice(
            isPiperOffered() &&
              findVoiceDownload(voice.model).state !== "downloaded"
              ? voice
              : undefined,
          );
          if (!readAloud(findWords(), voiceName, reader)) {
            fallback?.();
          }
        }}
      >
        <span className="read-aloud-icon">
          {isSpeaking ? <SpeakingIcon /> : <ReadAloudIcon />}
        </span>
        {isLabelShown ? (
          <span className="read-aloud-label">{label}</span>
        ) : null}
      </button>
      {waitedForVoice === undefined || downloadingShare === undefined ? null : (
        <div className="read-aloud-busy" data-read-aloud-skip="">
          <BusyProgress
            className="is-compact"
            label={describeVoiceDownloadLabel(waitedForVoice)}
            detail={describeVoiceDownloadDetail(
              waitedForVoice,
              downloadingShare,
            )}
            share={downloadingShare}
          />
        </div>
      )}
    </>
  );
};

/**
 * A message with its own small button beside it that reads the message, and
 * nothing around it, out loud.
 */
export const ReadAloudMessage = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`read-aloud-message ${className ?? ""}`.trim()}
    data-read-aloud-section
  >
    {children}
    <ReadAloudButton className="read-aloud is-small" readsSection />
  </div>
);
