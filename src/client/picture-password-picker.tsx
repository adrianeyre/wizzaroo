import { useState } from "react";
import {
  picturePasswordLength,
  picturePasswordPictures,
  type PicturePasswordPicture,
} from "../server/children/picture-password.js";

export const pictureSymbols: Record<PicturePasswordPicture, string> = {
  cat: "🐱",
  dog: "🐶",
  fish: "🐟",
  star: "⭐",
  moon: "🌙",
  sun: "☀️",
  apple: "🍎",
  tree: "🌳",
  rocket: "🚀",
};

export const isPicturePasswordComplete = (
  picturePassword: readonly PicturePasswordPicture[],
): boolean => picturePassword.length === picturePasswordLength;

interface PicturePasswordChoice {
  picturePassword: PicturePasswordPicture[];
  tapPicture: (picture: PicturePasswordPicture) => void;
  clearPictures: () => void;
}

export const usePicturePasswordChoice = (): PicturePasswordChoice => {
  const [picturePassword, setPicturePassword] = useState<
    PicturePasswordPicture[]
  >([]);
  return {
    picturePassword,
    tapPicture: (picture) => {
      setPicturePassword((chosenPictures) =>
        isPicturePasswordComplete(chosenPictures)
          ? chosenPictures
          : [...chosenPictures, picture],
      );
    },
    clearPictures: () => {
      setPicturePassword([]);
    },
  };
};

export const PicturePasswordPicker = ({
  picturePassword,
  tapPicture,
  clearPictures,
}: PicturePasswordChoice) => {
  const isComplete = isPicturePasswordComplete(picturePassword);
  const chosenPictures =
    picturePassword.length === 0
      ? "none yet"
      : picturePassword
          .map((picture) => `${pictureSymbols[picture]} ${picture}`)
          .join(", ");

  return (
    <fieldset className="picture-password-picker">
      <legend>
        Picture Password: tap {String(picturePasswordLength)} pictures in order
      </legend>
      <div className="picture-password-progress">
        <ol className="picture-password-slots" aria-hidden="true">
          {Array.from({ length: picturePasswordLength }, (_, index) => {
            const picture = picturePassword.at(index);
            return (
              <li
                key={index}
                data-filled={picture === undefined ? undefined : true}
              >
                {picture === undefined ? index + 1 : pictureSymbols[picture]}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className="picture-password-restart"
          onClick={clearPictures}
        >
          {/* One span, so the button's flex gap never splits the words. */}
          <span>
            Start{" "}
            <span className="picture-password-restart-more">the pictures </span>
            again
          </span>
        </button>
      </div>
      <div className="picture-grid-space">
        <div className="picture-grid">
          {picturePasswordPictures.map((picture) => (
            <button
              key={picture}
              type="button"
              aria-label={picture}
              disabled={isComplete}
              onClick={() => {
                tapPicture(picture);
              }}
            >
              {pictureSymbols[picture]}
            </button>
          ))}
        </div>
      </div>
      <p className="picture-password-chosen" aria-live="polite">
        Chosen: {chosenPictures}
      </p>
    </fieldset>
  );
};
