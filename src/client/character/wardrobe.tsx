import { useState, type ReactNode, type SubmitEvent } from "react";
import {
  catalogue,
  featureSlots,
  findChosenFeature,
  isFeatureSlot,
  isShowOffSlot,
  isVehicleSlot,
  showOffSlots,
  vehicleSlots,
  wearableSlots,
  type CharacterLoadout,
  type CharacterSlot,
  type Item,
  type ItemSlot,
  type ShowOffSlot,
  type VehicleSlot,
} from "../../curriculum/catalogue.js";
import {
  buildWornLoadout,
  findPurchaseProblem,
  isItemHeld,
  longestOutfitName,
  mostOutfits,
  type ChildRewards,
  type Outfit,
  type PurchaseProblem,
} from "../../curriculum/rewards.js";
import { skills } from "../../curriculum/skills.js";
import type { Sibling } from "../family-device/family-device-page.js";
import { CharacterPreview } from "./character-preview.js";
import { buildItemShot, ItemPicture } from "./item-picture.js";
import {
  isWardrobeTalkOffered,
  loadTalkVoiceName,
  storeTalkVoiceName,
  TalkButton,
  TalkDialog,
  useWardrobeTalk,
} from "./wardrobe-talk.js";

interface WardrobeProps {
  characterName: string;
  rewards: ChildRewards;
  siblings: Sibling[];
  today: string;
  onBuy: (itemId: string, giftForChildId: string | null) => void;
  onDress: (loadout: CharacterLoadout) => void;
  onSaveOutfit: (outfit: Outfit) => void;
  onWearOutfit: (outfitId: string) => void;
  onClose: () => void;
}

type WardrobeSlot = CharacterSlot | VehicleSlot;

const slotNames: Record<WardrobeSlot, string> = {
  characterType: "Characters",
  bodyColour: "Skin",
  hairStyle: "Hair",
  hairColour: "Hair colour",
  eyes: "Eyes",
  eyeColour: "Eye colour",
  eyebrows: "Eyebrows",
  mouth: "Mouths",
  facialHair: "Facial hair",
  hat: "Hats",
  accessory: "Accessories",
  outfit: "Outfits",
  back: "Backs",
  wand: "In your hand",
  pet: "Pets",
  mount: "Mounts",
  emote: "Emotes",
  spellEffect: "Spell Effects",
  vehicle: "Vehicles",
};

const showOffNoneNames: Record<ShowOffSlot, string> = {
  pet: "No Pet",
  mount: "No Mount",
  emote: "No Emote",
  spellEffect: "No Spell Effect",
};

const monthNames = new Intl.DateTimeFormat("en-GB", { month: "long" });

const describeMonths = (item: Item): string =>
  item.unlock.kind === "season"
    ? item.unlock.months
        .map((month) => monthNames.format(new Date(2026, month - 1, 1)))
        .join(" and ")
    : "";

const describeSkill = ({ unlock }: Item): string => {
  if (unlock.kind !== "skill-mastered") {
    return "";
  }
  const { skillId } = unlock;
  return skills.find(({ id }) => id === skillId)?.name ?? skillId;
};

export type ShopProblem = PurchaseProblem | "not-enough-stars";

export const findShopProblem = (
  rewards: ChildRewards,
  item: Item,
  today: string,
  sibling?: Sibling,
): ShopProblem | undefined => {
  const problem = findPurchaseProblem({
    buyer: rewards,
    recipient:
      sibling === undefined
        ? undefined
        : { childId: sibling.id, heldItemIds: sibling.heldItemIds },
    item,
    localDate: today,
  });
  if (problem !== undefined) {
    return problem;
  }
  return (item.starCost ?? 0) > rewards.stars ? "not-enough-stars" : undefined;
};

export const describeShopProblem = (
  problem: ShopProblem,
  item: Item,
  heldPlace = "the wardrobe",
): string => {
  switch (problem) {
    case "skill-not-mastered":
      return `Master ${describeSkill(item)} to buy this`;
    case "out-of-season":
      return `Back in ${describeMonths(item)}`;
    case "not-enough-stars":
      return "Keep playing to earn enough Stars";
    case "already-held":
      return `Already in ${heldPlace}`;
    case "not-for-sale":
    case "gift-only":
    case "gifts-are-for-siblings":
      return "Not for sale";
  }
};

const describeHowToGet = (item: Item): string =>
  item.unlock.kind === "family-chest"
    ? "Comes from the Family Chest"
    : "A welcome-back gift";

const ItemFace = ({
  item,
  loadout,
  verb,
  children,
}: {
  item: Item;
  loadout: CharacterLoadout;
  verb?: string;
  children?: ReactNode;
}) => (
  <>
    <ItemPicture
      shot={buildItemShot(item.slot, item.id, loadout)}
      colour={item.colour}
    />
    <span className="wardrobe-item-name">
      {verb === undefined ? null : (
        <span className="visually-hidden">{verb} </span>
      )}
      {item.name}
    </span>
    {children}
  </>
);

const findOutfitNamed = (
  outfits: readonly Outfit[],
  name: string,
): Outfit | undefined =>
  outfits.find(
    (outfit) => outfit.name.toLowerCase() === name.trim().toLowerCase(),
  );

const buildWornItems = (loadout: CharacterLoadout): CharacterLoadout =>
  Object.fromEntries(
    wearableSlots.flatMap((slot) => {
      const itemId = loadout[slot];
      return itemId === undefined ? [] : [[slot, itemId]];
    }),
  );

interface OutfitsProps {
  outfits: readonly Outfit[];
  onSave: (name: string) => void;
  onWear: (outfit: Outfit) => void;
}

const Outfits = ({ outfits, onSave, onWear }: OutfitsProps) => {
  const [name, setName] = useState("");
  const isFull =
    outfits.length >= mostOutfits &&
    findOutfitNamed(outfits, name) === undefined;

  const save = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim() === "" || isFull) {
      return;
    }
    onSave(name.trim());
    setName("");
  };

  return (
    <section className="wardrobe-slot wardrobe-outfits">
      <h2>My outfits</h2>
      {outfits.length === 0 ? (
        <p>Save what you&apos;re wearing to put it all back on in one tap.</p>
      ) : (
        <div className="wardrobe-outfit-list">
          {outfits.map((outfit) => (
            <button
              key={outfit.id}
              type="button"
              onClick={() => {
                onWear(outfit);
              }}
            >
              <span className="visually-hidden">Wear </span>
              {outfit.name}
            </button>
          ))}
        </div>
      )}
      <form className="wardrobe-outfit-form" onSubmit={save}>
        <label>
          Name this outfit
          <input
            name="outfitName"
            value={name}
            maxLength={longestOutfitName}
            autoComplete="off"
            onChange={(event) => {
              setName(event.currentTarget.value);
            }}
          />
        </label>
        <button type="submit" disabled={name.trim() === "" || isFull}>
          Save as an outfit
        </button>
        {isFull ? (
          <p>
            You have {mostOutfits} outfits. Use one of their names to save over
            it.
          </p>
        ) : null}
      </form>
    </section>
  );
};

export const ItemPrice = ({ starCost }: { starCost: number | null }) => (
  <span className="wardrobe-price">
    <span className="visually-hidden"> for </span>
    {starCost} Stars
  </span>
);

export const Wardrobe = ({
  characterName,
  rewards,
  siblings,
  today,
  onBuy,
  onDress,
  onSaveOutfit,
  onWearOutfit,
  onClose,
}: WardrobeProps) => {
  const [loadout, setLoadout] = useState(rewards.loadout);
  const [announcement, setAnnouncement] = useState<string>();
  const [shownSlot, setShownSlot] = useState<WardrobeSlot>("characterType");
  const [showOffCount, setShowOffCount] = useState(0);
  const [isTalkOpen, setIsTalkOpen] = useState(false);
  const [isTalkOffered] = useState(isWardrobeTalkOffered);
  const [talkVoiceName, setTalkVoiceName] = useState(() =>
    loadTalkVoiceName(rewards.childId),
  );
  const talk = useWardrobeTalk();
  const characterTypeName = findChosenFeature(loadout, "characterType").name;

  const findProblem = (item: Item, sibling?: Sibling) =>
    findShopProblem(rewards, item, today, sibling);

  const chooseItem = (slot: ItemSlot, itemId: string) => {
    setLoadout({ ...loadout, [slot]: itemId });
    if (slot === "emote" || slot === "spellEffect") {
      setShowOffCount((count) => count + 1);
    }
  };

  const buyItem = (item: Item, sibling?: Sibling) => {
    onBuy(item.id, sibling?.id ?? null);
    setAnnouncement(
      sibling === undefined
        ? `You bought the ${item.name}! Tap it to try it on.`
        : `You gave the ${item.name} to ${sibling.characterName}!`,
    );
  };

  const renderFeatureChoice = (item: Item) => {
    if (!isFeatureSlot(item.slot)) {
      return null;
    }
    const isChosen = findChosenFeature(loadout, item.slot).id === item.id;
    return (
      <button
        key={item.id}
        type="button"
        className="wardrobe-item"
        aria-pressed={isChosen}
        onClick={() => {
          setLoadout({ ...loadout, [item.slot]: item.id });
        }}
      >
        <ItemFace item={item} loadout={loadout} verb="Choose" />
      </button>
    );
  };

  const emptySlot = (slot: CharacterSlot) => {
    setLoadout(
      Object.fromEntries(
        Object.entries(loadout).filter(([wornSlot]) => wornSlot !== slot),
      ),
    );
  };

  const renderOwnGearChoice = (slot: CharacterSlot) =>
    isShowOffSlot(slot) ? (
      <button
        key={`${slot}-none`}
        type="button"
        className="wardrobe-item wardrobe-item-none"
        aria-pressed={loadout[slot] === undefined}
        onClick={() => {
          emptySlot(slot);
        }}
      >
        <span className="wardrobe-item-name">{showOffNoneNames[slot]}</span>
      </button>
    ) : (
      <button
        key={`${slot}-own`}
        type="button"
        className="wardrobe-item"
        aria-pressed={loadout[slot] === undefined}
        onClick={() => {
          emptySlot(slot);
        }}
      >
        <ItemPicture shot={buildItemShot(slot, undefined, loadout)} />
        <span className="wardrobe-item-name">
          The {characterTypeName}&apos;s own
        </span>
      </button>
    );

  const renderSlotItem = (item: Item) => {
    if (isFeatureSlot(item.slot)) {
      return renderFeatureChoice(item);
    }
    if (isVehicleSlot(item.slot) && isItemHeld(rewards, item)) {
      return (
        <p key={item.id} className="wardrobe-item wardrobe-item-owned">
          <ItemFace item={item} loadout={loadout}>
            <span className="wardrobe-item-note">
              <span className="visually-hidden">: </span>
              Yours! Ride it when you explore
            </span>
          </ItemFace>
        </p>
      );
    }
    if (isItemHeld(rewards, item)) {
      const isWorn = Object.values(loadout).includes(item.id);
      return (
        <button
          key={item.id}
          type="button"
          className="wardrobe-item"
          aria-pressed={isWorn}
          onClick={() => {
            chooseItem(item.slot, item.id);
          }}
        >
          <ItemFace item={item} loadout={loadout} verb="Try on" />
        </button>
      );
    }
    if (item.starCost === null) {
      return (
        <p key={item.id} className="wardrobe-item locked">
          <ItemFace item={item} loadout={loadout}>
            <span className="wardrobe-item-note">
              <span className="visually-hidden">: </span>
              {describeHowToGet(item)}
            </span>
          </ItemFace>
        </p>
      );
    }
    const problem = findProblem(item);
    return (
      <button
        key={item.id}
        type="button"
        className="wardrobe-item"
        disabled={problem !== undefined}
        onClick={() => {
          buyItem(item);
        }}
      >
        <ItemFace item={item} loadout={loadout} verb="Buy">
          <ItemPrice starCost={item.starCost} />
          {problem === undefined ? null : (
            <span className="wardrobe-problem">
              {describeShopProblem(problem, item)}
            </span>
          )}
        </ItemFace>
      </button>
    );
  };

  const saveOutfit = (name: string) => {
    const outfit = {
      id: findOutfitNamed(rewards.outfits, name)?.id ?? crypto.randomUUID(),
      name,
      loadout: buildWornItems(loadout),
    };
    onSaveOutfit(outfit);
    setAnnouncement(`Saved your ${name} outfit!`);
  };

  const wearOutfit = (outfit: Outfit) => {
    setLoadout(
      buildWornLoadout(loadout, outfit, (item) => isItemHeld(rewards, item)),
    );
    onWearOutfit(outfit.id);
    setAnnouncement(`${characterName} is wearing the ${outfit.name} outfit!`);
  };

  const giftItems = catalogue.filter(({ unlock }) => unlock.kind === "gift");

  return (
    <main className="menu wardrobe">
      <h1>{characterName}&apos;s wardrobe</h1>
      <div className="wardrobe-layout">
        <aside className="wardrobe-stage" aria-label="Your Character">
          <CharacterPreview
            characterName={characterName}
            loadout={loadout}
            showOffCount={showOffCount}
            readMouthOpenness={talk.readMouthOpenness}
            stageAction={
              isTalkOffered ? (
                <TalkButton
                  isTalking={talk.isTalking}
                  onPress={() => {
                    setIsTalkOpen(true);
                  }}
                />
              ) : undefined
            }
          />
          {isTalkOffered ? (
            <TalkDialog
              characterName={characterName}
              voiceName={talkVoiceName}
              onVoiceChosen={(name) => {
                storeTalkVoiceName(rewards.childId, name);
                setTalkVoiceName(name);
              }}
              isOpen={isTalkOpen}
              onClose={() => {
                setIsTalkOpen(false);
              }}
              onSay={(words) => {
                setIsTalkOpen(false);
                // Straight from the tap, as iPhones and iPads only let sound start in answer to one.
                if (!talk.say(words, talkVoiceName)) {
                  setAnnouncement(
                    `${characterName} can't talk on this device.`,
                  );
                }
              }}
            />
          ) : null}
          <div className="wardrobe-stage-actions">
            <p className="wardrobe-hint">Drag to spin me round</p>
            <button
              type="button"
              className="show-off"
              onClick={() => {
                setShowOffCount((count) => count + 1);
              }}
            >
              Show off!
            </button>
            <button
              type="button"
              className="wardrobe-save"
              onClick={() => {
                onDress(loadout);
                setAnnouncement(`${characterName} looks wonderful!`);
              }}
            >
              Save my look
            </button>
            <p role="status">{announcement}</p>
          </div>
        </aside>
        <div className="wardrobe-options">
          <Outfits
            outfits={rewards.outfits}
            onSave={saveOutfit}
            onWear={wearOutfit}
          />
          {[
            { heading: "Make your Character", slots: featureSlots },
            { heading: "Dress up", slots: wearableSlots },
            { heading: "Show off", slots: showOffSlots },
            { heading: "Vehicles", slots: vehicleSlots },
          ].map(({ heading, slots }) => (
            <nav key={heading} className="wardrobe-tabs" aria-label={heading}>
              <h2>{heading}</h2>
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={shownSlot === slot}
                  onClick={() => {
                    setShownSlot(slot);
                  }}
                >
                  {slotNames[slot]}
                </button>
              ))}
            </nav>
          ))}
          <section className="wardrobe-slot">
            <h2>{slotNames[shownSlot]}</h2>
            <div className="wardrobe-items">
              {isFeatureSlot(shownSlot) || isVehicleSlot(shownSlot)
                ? null
                : renderOwnGearChoice(shownSlot)}
              {catalogue
                .filter(
                  (item) =>
                    item.slot === shownSlot &&
                    (item.unlock.kind !== "gift" || isItemHeld(rewards, item)),
                )
                .map(renderSlotItem)}
            </div>
          </section>
          {siblings.length === 0 ? null : (
            <section className="wardrobe-slot">
              <h2>Gifts for your family</h2>
              <p>
                A Gift is for someone else. You can&apos;t keep it yourself.
              </p>
              <div className="wardrobe-items">
                {giftItems.flatMap((item) =>
                  siblings.map((sibling) => {
                    const problem = findProblem(item, sibling);
                    return (
                      <button
                        key={`${item.id}-${sibling.id}`}
                        type="button"
                        className="wardrobe-item"
                        disabled={problem !== undefined}
                        onClick={() => {
                          buyItem(item, sibling);
                        }}
                      >
                        <ItemFace item={item} loadout={loadout} verb="Give">
                          <span className="wardrobe-item-note">
                            {` to ${sibling.characterName}`}
                          </span>
                          <ItemPrice starCost={item.starCost} />
                        </ItemFace>
                      </button>
                    );
                  }),
                )}
              </div>
            </section>
          )}
          <button type="button" className="wardrobe-back" onClick={onClose}>
            Back to the World Map
          </button>
        </div>
      </div>
    </main>
  );
};
