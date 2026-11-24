import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type SubmitEvent,
} from "react";
import { ModalDialog } from "../modal-dialog.js";
import {
  findSpeakingReader,
  isReadAloudOffered,
  readAloud,
  stopReadingAloud,
  subscribeToReadingAloud,
} from "../voice-over/read-aloud.js";
import {
  findReadAloudVoice,
  isReadAloudVoiceName,
  loadReadAloudVoiceName,
  readAloudVoices,
  type ReadAloudVoiceName,
} from "../voice-over/read-aloud-voices.js";
import {
  findMouthOpenness,
  findSpeakingCharacter,
  showVoiceOnStage,
  subscribeToSpeaking,
} from "../voice-over/speaking-voice.js";
import { VoiceChoice } from "../voice-over/voice-choice.js";

/**
 * Lets a Child type words for their own Character to say in the Wardrobe
 * (ADR 0079). The Child picks their Character's voice from the same 3D
 * voice characters as Settings, kept for them on this device, and the
 * Character's mouth moves with the words on the Wardrobe's stage, so the
 * voice's own face doesn't pop up as well.
 */

const talkVoiceStorageKey = (childId: string): string =>
  `wizzaroo.wardrobe-talk-voice.${childId}`;

/** The voice a Child's Character talks in: their own pick, or the reading voice until they make one. */
export const loadTalkVoiceName = (childId: string): ReadAloudVoiceName => {
  try {
    const stored = localStorage.getItem(talkVoiceStorageKey(childId));
    return isReadAloudVoiceName(stored) ? stored : loadReadAloudVoiceName();
  } catch {
    return loadReadAloudVoiceName();
  }
};

export const storeTalkVoiceName = (
  childId: string,
  name: ReadAloudVoiceName,
): void => {
  try {
    localStorage.setItem(talkVoiceStorageKey(childId), name);
  } catch {
    // A device that keeps nothing still talks in the voice for now.
  }
};

/** Which Read it to me reader the Wardrobe's Character is, while it talks. */
export const wardrobeTalkReader = "wardrobe-talk";

/** The most a Child can type for their Character to say. */
export const longestTalk = 200;

const isTalkHeard = (): boolean => findSpeakingReader() === wardrobeTalkReader;

const findSpeakingVoice = () => findSpeakingCharacter()?.voice;

export interface WardrobeTalk {
  /** Set while the Character speaks, so its mouth moves with the words. */
  readMouthOpenness: (() => number) | undefined;
  isTalking: boolean;
  /** Says the words in the voice. False if this device can't speak. */
  say: (words: string, voiceName: ReadAloudVoiceName) => boolean;
}

/**
 * The Wardrobe's Character talking: it puts the chosen voice on the stage
 * while it speaks, and takes it off again, and stops speaking, once it has
 * finished, is cut off or the Wardrobe closes.
 */
export const useWardrobeTalk = (): WardrobeTalk => {
  const isTalkAsked = useSyncExternalStore(
    subscribeToReadingAloud,
    isTalkHeard,
    () => false,
  );
  const speakingVoice = useSyncExternalStore(
    subscribeToSpeaking,
    findSpeakingVoice,
    () => undefined,
  );
  const leaveStageRef = useRef<() => void>(undefined);
  const [voiceId, setVoiceId] = useState<string>();
  // Still waiting for its voice, or speaking in it: any other voice has cut it off.
  const isTalking =
    isTalkAsked && (speakingVoice === undefined || speakingVoice === voiceId);

  const leaveStage = () => {
    leaveStageRef.current?.();
    leaveStageRef.current = undefined;
  };

  useEffect(() => {
    if (!isTalking) {
      leaveStage();
    }
  }, [isTalking]);

  useEffect(
    () => () => {
      if (isTalkHeard()) {
        stopReadingAloud();
      }
      leaveStage();
    },
    [],
  );

  const say = (words: string, voiceName: ReadAloudVoiceName): boolean => {
    const voice = findReadAloudVoice(voiceName);
    setVoiceId(voice.id);
    leaveStage();
    // On the stage before the voice starts, so its own face never flashes up.
    leaveStageRef.current = showVoiceOnStage(voice.id);
    const isSaid = readAloud(words, voiceName, wardrobeTalkReader);
    if (!isSaid || !isTalkHeard()) {
      leaveStage();
    }
    return isSaid;
  };

  return {
    isTalking,
    readMouthOpenness:
      isTalking && speakingVoice === voiceId ? findMouthOpenness : undefined,
    say,
  };
};

/** Sound waves, which rise and fall while the Character talks. */
const TalkIcon = () => (
  <svg
    className="wardrobe-talk-waves"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4 10v4" />
    <path d="M9 6v12" />
    <path d="M14 3v18" />
    <path d="M19 8v8" />
  </svg>
);

interface TalkButtonProps {
  isTalking: boolean;
  onPress: () => void;
}

/** A speech bubble on the corner of the Character's stage. */
export const TalkButton = ({ isTalking, onPress }: TalkButtonProps) => (
  <button
    type="button"
    className="wardrobe-talk"
    data-talking={isTalking ? "" : undefined}
    onClick={onPress}
  >
    <TalkIcon />
    Talk
  </button>
);

interface TalkDialogProps {
  characterName: string;
  voiceName: ReadAloudVoiceName;
  onVoiceChosen: (name: ReadAloudVoiceName) => void;
  isOpen: boolean;
  onClose: () => void;
  onSay: (words: string) => void;
}

export const TalkDialog = ({
  characterName,
  voiceName,
  onVoiceChosen,
  isOpen,
  onClose,
  onSay,
}: TalkDialogProps) => {
  const [words, setWords] = useState("");
  const wordsRef = useRef<HTMLTextAreaElement>(null);
  const countId = useId();
  const voiceStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    // The chosen voice may be far along the row, so it is brought into sight.
    voiceStripRef.current
      ?.querySelector("label:has(input:checked)")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [isOpen]);
  const ideas = [
    `Hello! I'm ${characterName}!`,
    "Do you like my outfit?",
    "Let's go on an adventure!",
  ];

  const say = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (words.trim() === "") {
      return;
    }
    onSay(words.trim());
  };

  const sayOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Make ${characterName} talk`}
      closeLabel="Close without talking"
      initialFocusRef={wordsRef}
    >
      <form className="wardrobe-talk-form" onSubmit={say}>
        <fieldset className="choice-cards voice-choices wardrobe-talk-voices">
          <legend>Choose {characterName}&apos;s voice</legend>
          <div ref={voiceStripRef} className="wardrobe-talk-voice-strip">
            {readAloudVoices.map((voice) => (
              <VoiceChoice
                key={voice.id}
                groupName="wardrobeTalkVoice"
                voice={voice}
                isChosen={voice.id === findReadAloudVoice(voiceName).id}
                isCompact
                onChosen={onVoiceChosen}
              />
            ))}
          </div>
        </fieldset>
        <label>
          What should {characterName} say?
          <textarea
            ref={wordsRef}
            name="talkWords"
            value={words}
            rows={3}
            maxLength={longestTalk}
            autoComplete="off"
            aria-describedby={countId}
            placeholder="Type something fun…"
            onChange={(event) => {
              setWords(event.currentTarget.value);
            }}
            onKeyDown={sayOnEnter}
          />
        </label>
        <p id={countId} className="wardrobe-talk-count">
          {words.length} of {longestTalk} letters
        </p>
        <div className="wardrobe-talk-ideas" role="group" aria-label="Ideas">
          {ideas.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => {
                setWords(idea);
                wordsRef.current?.focus();
              }}
            >
              {idea}
            </button>
          ))}
        </div>
        <button
          type="submit"
          className="wardrobe-talk-say"
          disabled={words.trim() === ""}
        >
          Say
        </button>
      </form>
    </ModalDialog>
  );
};

/** Whether this device has a voice for the Character to talk in. */
export const isWardrobeTalkOffered = (): boolean => isReadAloudOffered();
