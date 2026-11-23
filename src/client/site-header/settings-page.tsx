import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { PiperModel } from "../../curriculum/piper-voice-models.js";
import { CharacterPreview } from "../character/character-preview.js";
import {
  findMouthOpenness,
  findSpeakingCharacter,
  showVoiceOnStage,
  subscribeToSpeaking,
} from "../voice-over/speaking-voice.js";
import {
  buildPortraitShot,
  useItemPictureUrl,
  type ItemShot,
} from "../character/item-picture.js";
import {
  applyAppearance,
  colourModes,
  defaultAppearance,
  loadAppearance,
  storeAppearance,
  themeNames,
  type Appearance,
  type ColourMode,
  type ThemeName,
} from "./appearance.js";
import { BusyProgress } from "../busy/busy-progress.js";
import {
  describeVoiceDownloadDetail,
  describeVoiceDownloadLabel,
  ReadAloudButton,
} from "../read-aloud-button.js";
import {
  downloadVoice,
  findVoiceDownload,
  isPiperOffered,
  subscribeToVoiceDownloads,
  type VoiceDownload,
} from "../voice-over/piper-speech.js";
import { isReadAloudOffered, readAloud } from "../voice-over/read-aloud.js";
import {
  defaultReadAloudVoiceName,
  describeVoiceCharacter,
  findReadAloudVoice,
  loadReadAloudVoiceName,
  readAloudVoices,
  storeReadAloudVoiceName,
  type ReadAloudVoice,
  type ReadAloudVoiceName,
} from "../voice-over/read-aloud-voices.js";
import {
  CheckIcon,
  DarkModeIcon,
  LightModeIcon,
  SystemModeIcon,
} from "./icons.js";

const colourModeChoices: Record<
  ColourMode,
  { label: string; description: string; icon: ReactNode }
> = {
  system: {
    label: "System",
    description: "Follows this device's light or dark setting",
    icon: <SystemModeIcon />,
  },
  light: {
    label: "Light",
    description: "Bright and clear, whatever the time",
    icon: <LightModeIcon />,
  },
  dark: {
    label: "Dark",
    description: "Easier on the eyes in the evening",
    icon: <DarkModeIcon />,
  },
};

const themeChoices: Record<ThemeName, { label: string; description: string }> =
  {
    sky: { label: "Sky", description: "Wizzaroo's own bright blue" },
    grape: { label: "Grape", description: "A magical purple" },
    forest: { label: "Forest", description: "A calm, leafy green" },
    sunset: { label: "Sunset", description: "A warm, glowing orange" },
    berry: { label: "Berry", description: "A bold, bright pink" },
    lagoon: { label: "Lagoon", description: "A cool, fresh teal" },
  };

const VoiceIcon = () => (
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
  </svg>
);

export const describeVoiceSample = (name: ReadAloudVoiceName): string =>
  `Hello! I'm ${findReadAloudVoice(name).name}. I'll read your questions to you.`;

/**
 * Says a voice's hello in that voice alone: never in the device's own
 * speech voice, which would make every voice sound the same (ADR 0067).
 */
const sayVoiceSample = (name: ReadAloudVoiceName): void => {
  readAloud(describeVoiceSample(name), name, undefined, {
    isDeviceVoiceAllowed: false,
  });
};

const toMegabytes = (bytes: number): string =>
  `${String(Math.round(bytes / (1024 * 1024)))} MB`;

const useVoiceDownload = (model: PiperModel): VoiceDownload =>
  useSyncExternalStore(subscribeToVoiceDownloads, () =>
    findVoiceDownload(model),
  );

/** What the device has of a voice: the words under the chosen voice's name. */
export const describeVoiceDownload = (
  voice: ReadAloudVoice,
  download: VoiceDownload,
): string => {
  const size = toMegabytes(voice.model.model.bytes);
  switch (download.state) {
    case "downloaded":
      return "On this device, so it reads even offline.";
    case "downloading":
      return `Downloading this voice (${size}): ${String(Math.round(download.share * 100))}%. It reads as soon as it's ready.`;
    case "failed":
      return "This voice couldn't be downloaded. Your device's own voice reads questions for now.";
    case "not-downloaded":
      return `Downloads once (${size}) the first time it reads, then works offline.`;
  }
};

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

const VoiceChoice = ({
  voice,
  isChosen,
  isDisabled,
  onChosen,
}: {
  voice: ReadAloudVoice;
  isChosen: boolean;
  isDisabled: boolean;
  onChosen: (name: ReadAloudVoiceName) => void;
}) => (
  <label className="choice-card voice-card">
    <input
      type="radio"
      name="readAloudVoice"
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
      {voice.id === defaultReadAloudVoiceName ? (
        <span className="choice-card-badge">Default</span>
      ) : null}
    </span>
    <span className="voice-card-title">the {voice.character.title}</span>
    <span className="choice-card-detail">{voice.description}</span>
    <span className="choice-card-check">
      <CheckIcon />
    </span>
  </label>
);

const VoiceStudio = ({
  voiceName,
  showOffCount,
  onChosen,
  onHeard,
}: {
  voiceName: ReadAloudVoiceName;
  showOffCount: number;
  onChosen: (name: ReadAloudVoiceName) => void;
  onHeard: () => void;
}) => {
  const isVoiceOffered = isReadAloudOffered();
  const voice = findReadAloudVoice(voiceName);
  const download = useVoiceDownload(voice.model);
  const isDisabled = !isVoiceOffered;
  const isDownloading = download.state === "downloading";
  // The chosen voice talks here on the stage, rather than in a face of its own.
  useEffect(() => showVoiceOnStage(voice.id), [voice.id]);
  const speakingVoice = useSyncExternalStore(
    subscribeToSpeaking,
    () => findSpeakingCharacter()?.voice,
    () => undefined,
  );
  return (
    <section className="voice-studio" aria-labelledby="voice-studio-heading">
      <div className="voice-studio-stage">
        <div className="voice-studio-speaker">
          <CharacterPreview
            characterName={voice.name}
            loadout={voice.character.loadout}
            showOffCount={showOffCount}
            readMouthOpenness={
              speakingVoice === voice.id ? findMouthOpenness : undefined
            }
          />
        </div>
        <div
          className="voice-studio-card"
          aria-live="polite"
          aria-busy={isDownloading ? true : undefined}
        >
          <p className="voice-studio-kicker">Reading voice</p>
          <h2 id="voice-studio-heading">{voice.name}</h2>
          <p className="voice-studio-title">{describeVoiceCharacter(voice)}</p>
          <p className="voice-studio-detail">{voice.description}</p>
          <p className="voice-studio-bubble">
            “{describeVoiceSample(voiceName)}”
          </p>
          {isVoiceOffered ? (
            <>
              <button
                type="button"
                className="voice-studio-hear"
                disabled={isDownloading}
                onClick={() => {
                  sayVoiceSample(voiceName);
                  onHeard();
                }}
              >
                <VoiceIcon />
                Hear {voice.name}
              </button>
              {download.state === "downloading" ? (
                <BusyProgress
                  label={describeVoiceDownloadLabel(voice)}
                  detail={describeVoiceDownloadDetail(voice, download.share)}
                  share={download.share}
                />
              ) : null}
              {isPiperOffered() ? (
                <p className="voice-studio-note voice-download">
                  {describeVoiceDownload(voice, download)}
                  {download.state === "failed" ? (
                    <button
                      type="button"
                      className="voice-download-retry"
                      onClick={() => {
                        downloadVoice(voice.model);
                      }}
                    >
                      Try again
                    </button>
                  ) : null}
                </p>
              ) : null}
            </>
          ) : (
            <p className="voice-studio-note">
              This device can&apos;t read out loud, so Read it to me plays
              Wizzaroo&apos;s own recordings instead.
            </p>
          )}
        </div>
      </div>
      <p className="voice-studio-intro">
        Choose who reads questions and messages out loud when you press Read it
        to me. Every voice has a character of their own, and all but two are
        from the UK and Ireland. Each is a free Piper voice, spoken on this
        device.
      </p>
      <fieldset className="choice-cards voice-choices">
        <legend>Voices</legend>
        {readAloudVoices.map((choice) => (
          <VoiceChoice
            key={choice.id}
            voice={choice}
            isChosen={choice.id === voiceName}
            isDisabled={isDisabled}
            onChosen={onChosen}
          />
        ))}
      </fieldset>
    </section>
  );
};

export const SettingsPage = () => {
  const [appearance, setAppearance] = useState(loadAppearance);
  const [voiceName, setVoiceName] = useState(loadReadAloudVoiceName);
  // Each new voice, and each hello, sets the voice's character showing off.
  const [showOffCount, setShowOffCount] = useState(0);
  const showOff = () => {
    setShowOffCount((count) => count + 1);
  };

  const changeVoice = (name: ReadAloudVoiceName) => {
    storeReadAloudVoiceName(name);
    setVoiceName(name);
    sayVoiceSample(name);
    showOff();
  };

  const changeAppearance = (change: Partial<Appearance>) => {
    const changedAppearance = { ...appearance, ...change };
    storeAppearance(changedAppearance);
    applyAppearance(changedAppearance);
    setAppearance(changedAppearance);
  };

  return (
    <section className="settings-page">
      <div className="view-intro" data-read-aloud-section>
        <h1>Settings</h1>
        <p>
          Choose how Wizzaroo looks and sounds. Your choices are kept on this
          device and change it straight away.
        </p>
        <ReadAloudButton className="read-aloud is-small" readsSection />
      </div>
      <fieldset className="choice-cards">
        <legend>Appearance</legend>
        {colourModes.map((colourMode) => {
          const { label, description, icon } = colourModeChoices[colourMode];
          return (
            <label key={colourMode} className="choice-card">
              <input
                type="radio"
                name="colourMode"
                value={colourMode}
                className="visually-hidden"
                checked={appearance.colourMode === colourMode}
                onChange={() => {
                  changeAppearance({ colourMode });
                }}
              />
              <span className="choice-card-icon">{icon}</span>
              <span className="choice-card-label">
                {label}
                {colourMode === defaultAppearance.colourMode ? (
                  <span className="choice-card-badge">Default</span>
                ) : null}
              </span>
              <span className="choice-card-detail">{description}</span>
              <span className="choice-card-check">
                <CheckIcon />
              </span>
            </label>
          );
        })}
      </fieldset>
      <fieldset className="choice-cards theme-choices">
        <legend>Theme</legend>
        {themeNames.map((themeName) => {
          const { label, description } = themeChoices[themeName];
          return (
            <label key={themeName} className="choice-card theme-card">
              <input
                type="radio"
                name="themeName"
                value={themeName}
                className="visually-hidden"
                checked={appearance.themeName === themeName}
                onChange={() => {
                  changeAppearance({ themeName });
                }}
              />
              <span
                className="theme-preview"
                data-theme={themeName}
                aria-hidden="true"
              >
                <span className="theme-preview-bar" />
                <span className="theme-preview-card">
                  <span className="theme-preview-line" />
                  <span className="theme-preview-line short" />
                  <span className="theme-preview-button" />
                </span>
              </span>
              <span className="choice-card-label">{label}</span>
              <span className="choice-card-detail">{description}</span>
              <span className="choice-card-check">
                <CheckIcon />
              </span>
            </label>
          );
        })}
      </fieldset>
      <VoiceStudio
        voiceName={voiceName}
        showOffCount={showOffCount}
        onChosen={changeVoice}
        onHeard={showOff}
      />
    </section>
  );
};
