import { useMemo } from "react";
import type { CharacterLoadout } from "../../curriculum/catalogue.js";
import {
  buildPortraitShot,
  useItemPictureUrl,
} from "../character/item-picture.js";

export const getInitial = (nickname: string) =>
  nickname.trim().slice(0, 1).toLocaleUpperCase("en-GB");

interface ChildFaceProps {
  nickname: string;
  /** The Child's Character, or null before they've made one. */
  loadout: CharacterLoadout | null | undefined;
  className: string;
}

/**
 * The circle that stands for a Child: their 3D Character's portrait,
 * or the first letter of their nickname until they have a Character
 * and while its picture is being taken.
 */
export const ChildFace = ({ nickname, loadout, className }: ChildFaceProps) => {
  const shot = useMemo(
    () =>
      loadout === null || loadout === undefined
        ? undefined
        : buildPortraitShot(loadout),
    [loadout],
  );
  const pictureUrl = useItemPictureUrl(shot);
  return (
    <span
      className={className}
      data-portrait={pictureUrl === undefined ? undefined : true}
      aria-hidden="true"
    >
      {pictureUrl === undefined ? (
        getInitial(nickname)
      ) : (
        <img src={pictureUrl} alt="" draggable={false} />
      )}
    </span>
  );
};
