import { isCheckResultPossible } from "../../curriculum/checks.js";
import { addDaysToLocalDate } from "../../curriculum/mastery.js";
import type { PlayEvent } from "./play-event-routes.js";
import { familyDeviceLifetimeDays } from "./signed-in-family-device.js";

const millisecondsPerHour = 60 * 60 * 1000;
const millisecondsPerDay = 24 * millisecondsPerHour;

/** How far ahead of the server's clock a device's clock may run, and its events still be kept (#324, #325). */
export const playEventClockSlackMilliseconds = millisecondsPerHour;

/**
 * How long before it reached the server an event can have happened. A Family Device unseen for longer than its
 * credential lasts is refused (#301), so nothing older than that can still be waiting in a signed-in device's outbox.
 */
export const oldestPlayEventDays = familyDeviceLifetimeDays;

/** A device's local date may be a day either side of the UK's, for a device in any time zone. */
const localDateSlackDays = 1;

const ukDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
});

const findLocalDate = ({ payload }: PlayEvent): string | undefined =>
  "localDate" in payload ? payload.localDate : undefined;

/**
 * Whether the server can stand behind an event: it happened between the oldest moment a signed-in device could still
 * hold it and a little after it was received, on a local date no further from the UK's than that, and, for a finished
 * Check, with outcomes that Check could have had. Any other event is let go (#324, #325, #327).
 */
export const isPlayEventPlausible = (
  playEvent: PlayEvent,
  receivedAt: Date,
): boolean => {
  const happenedAt = new Date(playEvent.happenedAt).getTime();
  const received = receivedAt.getTime();
  if (
    happenedAt > received + playEventClockSlackMilliseconds ||
    happenedAt < received - oldestPlayEventDays * millisecondsPerDay
  ) {
    return false;
  }
  const localDate = findLocalDate(playEvent);
  if (localDate !== undefined) {
    const ukToday = ukDateFormat.format(receivedAt);
    if (
      localDate > addDaysToLocalDate(ukToday, localDateSlackDays) ||
      localDate <
        addDaysToLocalDate(ukToday, -(oldestPlayEventDays + localDateSlackDays))
    ) {
      return false;
    }
  }
  return (
    playEvent.type !== "check-finished" ||
    isCheckResultPossible(playEvent.payload)
  );
};
