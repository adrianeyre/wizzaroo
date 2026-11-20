import type { PlayEvent } from "../../server/family-devices/play-event-routes.js";
import { renameUnsyncedPlayEvents } from "./unsynced-play.js";

export const playEventUploadPath = "/api/play/events";
export const largestPlayEventUpload = 100;

const outboxDatabaseName = "wizzaroo-play-event-outbox";
const outboxDatabaseVersion = 1;
const outboxStoreName = "play-events";

export interface PlayEventOutbox {
  appendPlayEvent: (playEvent: PlayEvent) => Promise<void>;
  uploadWaitingPlayEvents: () => Promise<void>;
  listWaitingPlayEventIds: () => Promise<Set<string>>;
  deleteWaitingPlayEvents: () => Promise<void>;
}

interface WaitingPlayEvents {
  playEvents: unknown[];
  lastKey: IDBValidKey | undefined;
}

const settleRequest = <Result>(request: IDBRequest<Result>): Promise<Result> =>
  new Promise((resolve, reject) => {
    request.addEventListener("success", () => {
      resolve(request.result);
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("an IndexedDB request failed"));
    });
  });

const settleTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => {
      resolve();
    });
    transaction.addEventListener("abort", () => {
      reject(
        transaction.error ?? new Error("an IndexedDB transaction aborted"),
      );
    });
  });

const openOutboxDatabase = (): Promise<IDBDatabase> => {
  const request = indexedDB.open(outboxDatabaseName, outboxDatabaseVersion);
  request.addEventListener("upgradeneeded", () => {
    request.result.createObjectStore(outboxStoreName, { autoIncrement: true });
  });
  return settleRequest(request);
};

/**
 * What the server made of a batch. Taken: it has every event it will keep, having let go of any naming a Child who
 * isn't the Family's any more (#283), or that it can't stand behind (#324, #325, #327), so the device forgets the whole
 * batch. Signed out: the device's sign-in has gone, as when its Family is deleted, so nothing waiting will ever be
 * taken. Ids taken: it stored nothing, because some events' ids are already another event's (#326), so those events
 * need new ids before the batch is sent again. Otherwise the batch waits to be sent again.
 */
type BatchAnswer =
  | { kind: "taken" }
  | { kind: "signed-out" }
  | { kind: "ids-taken"; takenPlayEventIds: Set<string> }
  | { kind: "not-taken" };

/** How many times in a row one upload gives events new ids before leaving the batch for the next try. */
const mostIdRenewalsInARow = 3;

const readTakenPlayEventIds = async (
  response: Response,
): Promise<Set<string>> => {
  const answer: unknown = await response.json().catch(() => undefined);
  return new Set(
    typeof answer === "object" &&
      answer !== null &&
      "takenPlayEventIds" in answer &&
      Array.isArray(answer.takenPlayEventIds)
      ? answer.takenPlayEventIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
  );
};

const uploadPlayEventBatch = async (
  playEvents: unknown[],
): Promise<BatchAnswer> => {
  const response = await fetch(playEventUploadPath, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ playEvents }),
  }).catch(() => undefined);
  if (response?.status === 401) {
    return { kind: "signed-out" };
  }
  if (response?.status === 409) {
    const takenPlayEventIds = await readTakenPlayEventIds(response);
    return takenPlayEventIds.size === 0
      ? { kind: "not-taken" }
      : { kind: "ids-taken", takenPlayEventIds };
  }
  return { kind: response?.ok === true ? "taken" : "not-taken" };
};

const readPlayEventId = (playEvent: unknown): string | undefined =>
  typeof playEvent === "object" &&
  playEvent !== null &&
  "id" in playEvent &&
  typeof playEvent.id === "string"
    ? playEvent.id
    : undefined;

export const openPlayEventOutbox = (): PlayEventOutbox => {
  let outboxDatabase: Promise<IDBDatabase> | undefined;
  const openOutboxDatabaseOnce = () =>
    (outboxDatabase ??= openOutboxDatabase());

  const appendPlayEvent = async (playEvent: PlayEvent): Promise<void> => {
    const transaction = (await openOutboxDatabaseOnce()).transaction(
      outboxStoreName,
      "readwrite",
    );
    transaction.objectStore(outboxStoreName).add(playEvent);
    await settleTransaction(transaction);
  };

  const loadWaitingPlayEvents = async (): Promise<WaitingPlayEvents> => {
    const outboxStore = (await openOutboxDatabaseOnce())
      .transaction(outboxStoreName, "readonly")
      .objectStore(outboxStoreName);
    const [playEvents, keys] = await Promise.all([
      settleRequest<unknown[]>(
        outboxStore.getAll(null, largestPlayEventUpload),
      ),
      settleRequest(outboxStore.getAllKeys(null, largestPlayEventUpload)),
    ]);
    return { playEvents, lastKey: keys.at(-1) };
  };

  const deleteUploadedPlayEvents = async (
    lastKey: IDBValidKey,
  ): Promise<void> => {
    const transaction = (await openOutboxDatabaseOnce()).transaction(
      outboxStoreName,
      "readwrite",
    );
    transaction
      .objectStore(outboxStoreName)
      .delete(IDBKeyRange.upperBound(lastKey));
    await settleTransaction(transaction);
  };

  // An event whose id the server says is already another event's gets a new one, so its play is kept and the batch
  // can be taken next time (#326).
  const renewTakenPlayEventIds = async (
    lastKey: IDBValidKey,
    takenPlayEventIds: Set<string>,
  ): Promise<void> => {
    const transaction = (await openOutboxDatabaseOnce()).transaction(
      outboxStoreName,
      "readwrite",
    );
    const cursorRequest = transaction
      .objectStore(outboxStoreName)
      .openCursor(IDBKeyRange.upperBound(lastKey));
    const renamedPlayEventIds = new Map<string, string>();
    cursorRequest.addEventListener("success", () => {
      const cursor = cursorRequest.result;
      if (cursor === null) {
        return;
      }
      const playEvent: unknown = cursor.value;
      const id = readPlayEventId(playEvent);
      if (
        id !== undefined &&
        takenPlayEventIds.has(id) &&
        typeof playEvent === "object"
      ) {
        const renewedId = crypto.randomUUID();
        cursor.update({ ...playEvent, id: renewedId });
        renamedPlayEventIds.set(id, renewedId);
      }
      cursor.continue();
    });
    await settleTransaction(transaction);
    renameUnsyncedPlayEvents(renamedPlayEventIds);
  };

  const deleteWaitingPlayEvents = async (): Promise<void> => {
    const transaction = (await openOutboxDatabaseOnce()).transaction(
      outboxStoreName,
      "readwrite",
    );
    transaction.objectStore(outboxStoreName).clear();
    await settleTransaction(transaction);
  };

  const uploadWaitingPlayEvents = async (): Promise<void> => {
    let idRenewalsInARow = 0;
    for (;;) {
      const { playEvents, lastKey } = await loadWaitingPlayEvents();
      if (lastKey === undefined) {
        return;
      }
      const answer = await uploadPlayEventBatch(playEvents);
      if (answer.kind === "signed-out") {
        await deleteWaitingPlayEvents();
        return;
      }
      if (answer.kind === "not-taken") {
        return;
      }
      if (answer.kind === "ids-taken") {
        if (idRenewalsInARow >= mostIdRenewalsInARow) {
          return;
        }
        idRenewalsInARow += 1;
        await renewTakenPlayEventIds(lastKey, answer.takenPlayEventIds);
        continue;
      }
      idRenewalsInARow = 0;
      await deleteUploadedPlayEvents(lastKey);
    }
  };

  const listWaitingPlayEventIds = async (): Promise<Set<string>> => {
    const waitingPlayEvents = await settleRequest<unknown[]>(
      (await openOutboxDatabaseOnce())
        .transaction(outboxStoreName, "readonly")
        .objectStore(outboxStoreName)
        .getAll(),
    );
    return new Set(
      waitingPlayEvents.flatMap((playEvent) => {
        const id = readPlayEventId(playEvent);
        return id === undefined ? [] : [id];
      }),
    );
  };

  return {
    appendPlayEvent,
    uploadWaitingPlayEvents,
    listWaitingPlayEventIds,
    deleteWaitingPlayEvents,
  };
};
