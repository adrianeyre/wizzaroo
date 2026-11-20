import { useEffect, useState } from "react";
import { requestPersistentStorage } from "../offline/offline-app.js";

interface DeviceReadiness {
  isInstalled: boolean;
  isStoragePersistent: boolean;
  isAppleTouchDevice: boolean;
}

const isInstalledApp = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator && navigator.standalone === true);

const isAppleTouchDevice = (): boolean =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

const loadDeviceReadiness = async (): Promise<DeviceReadiness> => ({
  isInstalled: isInstalledApp(),
  isAppleTouchDevice: isAppleTouchDevice(),
  isStoragePersistent: await requestPersistentStorage().catch(() => false),
});

const AddToHomeScreenSteps = () => (
  <>
    <p>
      On iPhone and iPad, Safari deletes the play saved on this device after 7
      days without a visit, unless Wizzaroo is on the Home Screen. To put it
      there:
    </p>
    <ol>
      <li>Open this page in Safari.</li>
      <li>
        Tap the Share button, the square with an arrow pointing up out of it.
      </li>
      <li>Scroll down, tap Add to Home Screen, then tap Add.</li>
      <li>
        Open Wizzaroo from its new icon on the Home Screen, and sign in again
        there.
      </li>
    </ol>
  </>
);

const DeviceReadinessDetails = ({
  isInstalled,
  isStoragePersistent,
  isAppleTouchDevice,
}: DeviceReadiness) => (
  <>
    <p>
      {isInstalled
        ? "Wizzaroo is installed on this device."
        : "Wizzaroo isn't installed on this device."}
    </p>
    <p>
      {isStoragePersistent
        ? "This browser has agreed to keep the play saved on this device."
        : "This browser may delete the play saved on this device before it reaches the server, for example when the device runs low on space."}
    </p>
    {isAppleTouchDevice && !isInstalled ? <AddToHomeScreenSteps /> : null}
    {!isAppleTouchDevice && !isInstalled && !isStoragePersistent ? (
      <p>
        Installing Wizzaroo from the browser&apos;s menu usually lets it keep
        the play saved.
      </p>
    ) : null}
  </>
);

export const DeviceReadinessPanel = () => {
  const [readiness, setReadiness] = useState<DeviceReadiness>();

  useEffect(() => {
    void loadDeviceReadiness().then(setReadiness);
  }, []);

  return (
    <section aria-labelledby="device-readiness-heading">
      <h1 id="device-readiness-heading">This device</h1>
      {readiness === undefined ? (
        <p>Checking this device…</p>
      ) : (
        <DeviceReadinessDetails {...readiness} />
      )}
    </section>
  );
};
