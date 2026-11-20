import { useMemo, type ReactNode } from "react";
import {
  catalogue,
  isOneOf,
  vehicleModels,
} from "../../curriculum/catalogue.js";
import { ItemPicture, type ItemShot } from "../character/item-picture.js";
import { MovablePopup } from "../movable-popup.js";
import type { VehicleLook } from "../vehicles/vehicle-figure.js";
import type { TrainReport } from "./island-explore-hud.js";
import type { Railway } from "./island-railway.js";
import { findIslandTrain } from "./island-train-design.js";

export interface OwnedVehicle {
  itemId: string;
  name: string;
  look: VehicleLook;
}

const RideIcon = ({ children }: { children: ReactNode }) => (
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
    {children}
  </svg>
);

export const CarIcon = () => (
  <RideIcon>
    <path d="M5 16h14l-1.5-5.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5z" />
    <path d="M3 16h18v2H3z" />
    <circle cx="7.5" cy="18.5" r="1.5" />
    <circle cx="16.5" cy="18.5" r="1.5" />
  </RideIcon>
);

export const TrainIcon = () => (
  <RideIcon>
    <rect x="5" y="3" width="14" height="14" rx="3" />
    <path d="M5 11h14" />
    <path d="m8 21 2-4" />
    <path d="m16 21-2-4" />
    <circle cx="9" cy="14" r="0.5" />
    <circle cx="15" cy="14" r="0.5" />
  </RideIcon>
);

export interface GarageVehicle extends OwnedVehicle {
  isOwned: boolean;
}

/** Every Vehicle in the Catalogue, in its order, each marked owned or not. */
export const listGarageVehicles = (
  heldItemIds: readonly string[],
): GarageVehicle[] =>
  catalogue.flatMap((item) =>
    item.slot === "vehicle" && isOneOf(vehicleModels, item.model)
      ? [
          {
            itemId: item.id,
            name: item.name,
            look: { model: item.model, colour: item.colour },
            isOwned: heldItemIds.includes(item.id),
          },
        ]
      : [],
  );

const GarageCard = ({
  vehicle,
  isChosen,
  onChosen,
}: {
  vehicle: GarageVehicle;
  isChosen: boolean;
  onChosen: (vehicle: OwnedVehicle) => void;
}) => {
  const shot = useMemo(
    (): ItemShot => ({ subject: "vehicle", vehicle: vehicle.look }),
    [vehicle.look],
  );
  return (
    <li>
      <button
        type="button"
        className={
          vehicle.isOwned ? "garage-vehicle" : "garage-vehicle not-owned"
        }
        aria-label={
          vehicle.isOwned
            ? `Put on the map: ${vehicle.name}`
            : `${vehicle.name}, not bought yet`
        }
        aria-pressed={vehicle.isOwned ? isChosen : undefined}
        disabled={!vehicle.isOwned}
        data-tip={
          vehicle.isOwned
            ? `Put the ${vehicle.name} on the map`
            : "Buy it with Stars in the Wardrobe"
        }
        onClick={() => {
          onChosen({
            itemId: vehicle.itemId,
            name: vehicle.name,
            look: vehicle.look,
          });
        }}
      >
        <ItemPicture shot={shot} colour={vehicle.look.colour} />
        <span className="garage-vehicle-name" aria-hidden="true">
          {vehicle.name}
        </span>
      </button>
    </li>
  );
};

/**
 * Every Vehicle in 3D: the Child's own to put on the map, and the rest
 * dulled, to buy with Stars in the Wardrobe.
 */
export const VehicleGarage = ({
  vehicles,
  chosenItemId,
  isRiding,
  onChosen,
  onPutAway,
  onClose,
}: {
  vehicles: readonly GarageVehicle[];
  chosenItemId: string | undefined;
  isRiding: boolean;
  onChosen: (vehicle: OwnedVehicle) => void;
  onPutAway: () => void;
  onClose: () => void;
}) => {
  const ownedCount = vehicles.filter(({ isOwned }) => isOwned).length;
  return (
    <MovablePopup
      positionKey="explore-garage"
      className="explore-sign explore-garage"
      role="dialog"
      aria-labelledby="explore-garage-title"
    >
      <header>
        <h2 id="explore-garage-title">Your vehicles</h2>
        <button
          type="button"
          className="explore-sign-close"
          aria-label="Close your vehicles"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <p>
        {ownedCount === 0
          ? "You haven't got a vehicle yet. Buy one with Stars in the Vehicles part of your wardrobe, then put it on the map here."
          : "Choose one of your vehicles to put on the map beside you, then ride it! The faded ones are still to buy in the Wardrobe."}
      </p>
      <ul className="explore-garage-list" aria-label="Every vehicle">
        {vehicles.map((vehicle) => (
          <GarageCard
            key={vehicle.itemId}
            vehicle={vehicle}
            isChosen={vehicle.itemId === chosenItemId}
            onChosen={onChosen}
          />
        ))}
      </ul>
      {chosenItemId === undefined ? null : (
        <button type="button" className="explore-action" onClick={onPutAway}>
          {isRiding ? "Get off and put it away" : "Put it away"}
        </button>
      )}
    </MovablePopup>
  );
};

const startSentence = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const describeTrainWait = (seconds: number): string =>
  seconds <= 5
    ? "The train is nearly here!"
    : `The next train comes in about ${String(seconds)} seconds.`;

export const TrainPanel = ({
  railway,
  report,
  isWanted,
  onGetOn,
  onGetOff,
}: {
  railway: Railway;
  report: TrainReport;
  isWanted: boolean;
  onGetOn: () => void;
  onGetOff: () => void;
}) => {
  if (report.kind === "away") {
    return null;
  }
  const train = findIslandTrain(railway.islandId);
  const nameOf = (index: number | undefined) =>
    index === undefined ? undefined : railway.stations[index]?.name;
  if (report.kind === "riding") {
    const stoppedAt = nameOf(report.waitingAtStationIndex);
    const nextStop = nameOf(report.nextStationIndex);
    return (
      <MovablePopup
        positionKey="explore-train"
        className="explore-voyage explore-train"
        aria-label="On the train"
      >
        <p role="status" aria-live="polite">
          {stoppedAt === undefined
            ? `You're riding ${train.name}. Next stop: ${nextStop ?? "the next Station"}.`
            : `${startSentence(train.name)} has stopped at ${stoppedAt}.`}
        </p>
        <button
          type="button"
          className="explore-action"
          disabled={stoppedAt === undefined || !isWanted}
          onClick={onGetOff}
        >
          <TrainIcon />
          {stoppedAt === undefined
            ? "Wait for the next Station"
            : `Get off at ${stoppedAt}`}
        </button>
      </MovablePopup>
    );
  }
  const stationName = nameOf(report.stationIndex) ?? "the Station";
  return (
    <MovablePopup
      positionKey="explore-train"
      className="explore-voyage explore-train"
      aria-label={stationName}
    >
      <h2>{stationName}</h2>
      <p role="status" aria-live="polite">
        {report.isTrainWaiting
          ? `${startSentence(train.name)} is waiting at the platform. All aboard!`
          : describeTrainWait(report.secondsUntilTrain)}
      </p>
      <button
        type="button"
        className="explore-action"
        disabled={!report.isTrainWaiting || isWanted}
        onClick={onGetOn}
      >
        <TrainIcon />
        Get on the train
      </button>
    </MovablePopup>
  );
};
