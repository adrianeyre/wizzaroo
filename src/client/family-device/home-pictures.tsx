import type { ReactNode } from "react";
import { findItem, type Item } from "../../curriculum/catalogue.js";
import { picturePasswordPictures } from "../../server/children/picture-password.js";
import { pictureSymbols } from "../picture-password-picker.js";
import { BedIcon, MapIcon, ShirtIcon } from "../mission/mission-play.js";
import { BubblesIcon, LockIcon, StarIcon } from "../site-header/icons.js";
import { useStageCue } from "./stage-cue.js";

const heroStarsEarned = 3;

const RollingDigit = ({ value }: { value: number }) => (
  <span className="home-roll">
    <span className="home-roll-track">
      {Array.from({ length: value + 1 }, (_, digit) => (
        <span key={digit}>{digit}</span>
      ))}
    </span>
  </span>
);

export const HeroStage = () => {
  const { stageRef, stageCue } = useStageCue();
  return (
    <div
      ref={stageRef}
      className="home-stage home-hero-stage"
      data-cue={stageCue}
    >
      <div className="home-stage-canvas">
        <div className="home-hero-game">
          <div className="home-hero-play-bar" aria-hidden="true">
            <span className="home-hero-portrait" />
            <span className="home-hero-tab" data-current="true">
              <MapIcon />
              Map
            </span>
            <span className="home-hero-tab">
              <ShirtIcon />
              Wardrobe
            </span>
            <span className="home-hero-tab">
              <BedIcon />
              Room
            </span>
            <span className="home-hero-stars">
              <StarIcon />
              36
            </span>
          </div>
          <img
            className="home-hero-image"
            src="/home/world-map-meadow-isle-960.webp"
            srcSet="/home/world-map-meadow-isle-960.webp 960w, /home/world-map-meadow-isle-1600.webp 1600w"
            sizes="(min-width: 60rem) 40rem, 90vw"
            alt="Meadow Isle on the World Map in Wizzaroo: a sunny 3D island with a castle, a waterfall, villages and a lighthouse, and a Region for Maths, English, Phonics, Music, Geography, History, Computing, Art and design, and Design and technology"
            width="1600"
            height="842"
            fetchPriority="high"
          />
        </div>
        <div className="home-hero-reward" aria-hidden="true">
          <div className="home-hero-reward-title">
            <span className="home-hero-reward-badge">
              <StarIcon />
            </span>
            Mission finished!
          </div>
          <div className="home-hero-reward-stars">
            <span className="home-hero-reward-amount">
              +<RollingDigit value={heroStarsEarned} />
            </span>
            Stars
          </div>
          <div className="home-hero-reward-skill">Number bonds to 10</div>
          <div className="home-hero-reward-meter">
            <span />
          </div>
          <div className="home-hero-reward-days">2 of 3 good days</div>
        </div>
      </div>
    </div>
  );
};

interface StagePictureProps {
  className: string;
  label: string;
  children: ReactNode;
}

const StagePicture = ({ className, label, children }: StagePictureProps) => {
  const { stageRef, stageCue } = useStageCue();
  return (
    <div
      ref={stageRef}
      className={`home-stage ${className}`}
      data-cue={stageCue}
      role="img"
      aria-label={label}
    >
      <div className="home-stage-canvas">{children}</div>
    </div>
  );
};

const PlaceholderBar = ({ width }: { width: string }) => (
  <span className="home-stage-bar" style={{ width }} />
);

export const RegionPanelPicture = () => (
  <StagePicture
    className="home-region-stage"
    label="The Bubble Bay Region panel: Pop the bubbles ready to play, Count the fish with a Review waiting, and the next Games locked until 10 more Stars are earned"
  >
    <div className="home-region-panel">
      <div className="home-region-panel-header">
        <span className="home-region-panel-icon">
          <BubblesIcon />
        </span>
        <span className="home-region-panel-name">Bubble Bay</span>
        <span className="home-region-panel-subject">Maths</span>
      </div>
      <div className="home-region-panel-story">
        <PlaceholderBar width="94%" />
        <PlaceholderBar width="61%" />
      </div>
      <div className="home-region-games">
        <div className="home-region-game">
          <span className="home-region-game-icon">
            <BubblesIcon />
          </span>
          <span className="home-region-game-name">Pop the bubbles</span>
          <span className="home-region-game-play">Play</span>
        </div>
        <div className="home-region-game">
          <span className="home-region-game-icon">
            <BubblesIcon />
          </span>
          <span className="home-region-game-name">Count the fish</span>
          <span className="home-region-game-review">Review waiting</span>
        </div>
        <div className="home-region-game" data-locked="true">
          <span className="home-region-game-icon">
            <LockIcon />
          </span>
          <PlaceholderBar width="38%" />
          <span className="home-region-game-lock">
            <StarIcon />
            10 more Stars
          </span>
        </div>
        <div className="home-region-game" data-locked="true">
          <span className="home-region-game-icon">
            <LockIcon />
          </span>
          <PlaceholderBar width="52%" />
        </div>
      </div>
    </div>
  </StagePicture>
);

const chosenPictures = ["moon", "rocket", "cat"] as const;

const findChosenPlace = (picture: string): number =>
  chosenPictures.findIndex((chosenPicture) => chosenPicture === picture) + 1;

export const PicturePasswordPicture = () => (
  <StagePicture
    className="home-password-stage"
    label="A Picture Password of nine pictures, with the moon, the rocket and the cat tapped in turn"
  >
    <div className="home-password-card">
      <div className="home-password-dots">
        {chosenPictures.map((picture) => (
          <span key={picture} />
        ))}
      </div>
      <div className="home-password-keys">
        {picturePasswordPictures.map((picture) => {
          const chosenPlace = findChosenPlace(picture);
          return (
            <span
              key={picture}
              className="home-password-key"
              data-chosen={chosenPlace > 0 ? String(chosenPlace) : undefined}
            >
              {pictureSymbols[picture]}
            </span>
          );
        })}
      </div>
    </div>
  </StagePicture>
);

const itemRows = [
  ["hat-wizard-blue", "pet-owl", "hat-propeller-cap", "pet-bunny"],
  ["hat-leafy-crown", "hat-dragon-horns", "pet-cat", "hat-space-helmet"],
  ["pet-fox", "hat-treasure-crown", "hat-pirate", "hat-flower-crown"],
] as const;

const focusItemId = "hat-dragon-horns";

const findShownItems = (itemIds: readonly string[]): Item[] =>
  itemIds.flatMap((itemId) => {
    const item = findItem(itemId);
    return item === undefined ? [] : [item];
  });

export const ItemsPicture = () => (
  <StagePicture
    className="home-items-stage"
    label="Items to spend Stars on, such as a Blue wizard hat, a Wise Owl and Dragon horns for 60 Stars"
  >
    {itemRows.map((itemIds, rowIndex) => (
      <div
        key={itemIds.join()}
        className={`home-item-row home-item-row-${String(rowIndex + 1)}`}
      >
        {findShownItems(itemIds).map((item) => (
          <span
            key={item.id}
            className="home-item-chip"
            data-focus={item.id === focusItemId ? "true" : undefined}
          >
            <span
              className="home-item-swatch"
              style={{ backgroundColor: item.colour }}
            />
            {item.name}
            {item.id === focusItemId && item.starCost !== null ? (
              <span className="home-item-price">
                <StarIcon />
                {item.starCost}
              </span>
            ) : null}
          </span>
        ))}
      </div>
    ))}
  </StagePicture>
);

const fortnightMinutes = [12, 0, 9, 15, 11, 6, 0, 14, 10, 16, 8, 13, 0, 18];

const mostMinutes = Math.max(...fortnightMinutes);

export const ProgressPicture = () => (
  <StagePicture
    className="home-progress-stage"
    label="A chart of the last 14 days of play, with 18 minutes today"
  >
    <div className="home-progress-card">
      <div className="home-progress-heading">Last 14 days</div>
      <div className="home-progress-today">
        18 min <span>today</span>
      </div>
      <div className="home-progress-bars">
        {fortnightMinutes.map((minutes, day) => (
          <span
            key={day}
            className="home-progress-bar"
            data-today={
              day === fortnightMinutes.length - 1 ? "true" : undefined
            }
            style={{
              height: `${String(Math.max(4, (minutes / mostMinutes) * 100))}%`,
            }}
          />
        ))}
      </div>
    </div>
  </StagePicture>
);
