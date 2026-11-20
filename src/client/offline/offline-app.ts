import { serviceWorkerFileName, skipWaitingMessage } from "./caching-rules.js";

const switchToWaitingVersion = (waitingWorker: ServiceWorker) => {
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      window.location.reload();
    },
    { once: true },
  );
  waitingWorker.postMessage(skipWaitingMessage);
};

const isServerUnreachable = (error: unknown): boolean =>
  error instanceof TypeError;

const installNewVersionForNextOpening = async (
  registration: ServiceWorkerRegistration,
) => {
  try {
    await registration.update();
  } catch (error) {
    if (!isServerUnreachable(error)) {
      throw error;
    }
  }
};

export const startServiceWorker = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  const registration = await navigator.serviceWorker.register(
    `/${serviceWorkerFileName}`,
  );
  if (registration.waiting === null) {
    await installNewVersionForNextOpening(registration);
    return;
  }
  switchToWaitingVersion(registration.waiting);
};

export const requestPersistentStorage = async (): Promise<boolean> =>
  (await navigator.storage.persisted()) || navigator.storage.persist();
