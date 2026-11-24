import {
  buildPortraitShot,
  useItemPictureUrl,
  type ItemShot,
} from "../character/item-picture.js";
import { CheckIcon } from "../site-header/icons.js";
import {
  defaultReadAloudVoiceName,
  type ReadAloudVoice,
  type ReadAloudVoiceName,
} from "./read-aloud-voices.js";

/**
 * A voice to choose, shown as its 3D fantasy character's portrait (ADR
 * 0074). Settings chooses the reading voice with these, and the Wardrobe's
 * Talk chooses the voice a Child's own Character talks in (ADR 0079).
 */

const portraitShots = new Map<ReadAloudVoiceName, ItemShot>();

/** A voice's character, head and hat, photographed once in the shared studio. */
const findPortraitShot = (voice: ReadAloudVoice): ItemShot => {
  const known = portraitShots.get(voice.id);
  if (known !== undefined) {
    return known;
  }
  const shot = buildPortraitShot(voice.character.loadout);
  portraitShots.set(voice.id, shot);
  return shot;
};

const VoicePortrait = ({ voice }: { voice: ReadAloudVoice }) => {
  const pictureUrl = useItemPictureUrl(findPortraitShot(voice));
  return (
    <span
      className="voice-card-portrait"
      data-voice={voice.voice}
      aria-hidden="true"
    >
      {pictureUrl === undefined ? (
        <span className="voice-card-initial">{voice.name.slice(0, 1)}</span>
      ) : (
        <img src={pictureUrl} alt="" draggable={false} />
      )}
    </span>
  );
};

interface VoiceChoiceProps {
  /** The radio group's name, one for each list of voices. */
  groupName: string;
  voice: ReadAloudVoice;
  isChosen: boolean;
  isDisabled?: boolean;
  /** Settings shows what a voice sounds like; a compact card only says who they are. */
  isCompact?: boolean;
  onChosen: (name: ReadAloudVoiceName) => void;
}

export const VoiceChoice = ({
  groupName,
  voice,
  isChosen,
  isDisabled = false,
  isCompact = false,
  onChosen,
}: VoiceChoiceProps) => (
  <label className="choice-card voice-card">
    <input
      type="radio"
      name={groupName}
      value={voice.id}
      className="visually-hidden"
      checked={isChosen}
      disabled={isDisabled}
      onChange={() => {
        onChosen(voice.id);
      }}
    />
    <VoicePortrait voice={voice} />
    <span className="choice-card-label">
      {voice.name}
      {!isCompact && voice.id === defaultReadAloudVoiceName ? (
        <span className="choice-card-badge">Default</span>
      ) : null}
    </span>
    <span className="voice-card-title">the {voice.character.title}</span>
    {isCompact ? null : (
      <span className="choice-card-detail">{voice.description}</span>
    )}
    <span className="choice-card-check">
      <CheckIcon />
    </span>
  </label>
);
