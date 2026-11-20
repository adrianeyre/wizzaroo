import "./theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FamilyDevicePage } from "./family-device/family-device-page.js";
import { startFocusRecovery } from "./focus-recovery.js";
import { MissionPlay } from "./mission/mission-play.js";
import {
  requestPersistentStorage,
  startServiceWorker,
} from "./offline/offline-app.js";
import { SiteFooter } from "./site-footer/site-footer.js";
import {
  loadVoiceOver,
  recordedPhonemeSounds,
} from "./voice-over/voice-over.js";
import { IslandExploreCanvas } from "./islands/island-explore.js";
import { WorldMapCanvas } from "./world-map-islands.js";
import { GameCanvas } from "./world.js";
import { applyAppearance, loadAppearance } from "./site-header/appearance.js";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("index.html has no #root element to render into");
}

applyAppearance(loadAppearance());
void startServiceWorker();
void requestPersistentStorage();
void loadVoiceOver();
startFocusRecovery(rootElement);

createRoot(rootElement).render(
  <StrictMode>
    <FamilyDevicePage
      renderGame={(playingChild) => (
        <MissionPlay
          {...playingChild}
          recordedSounds={recordedPhonemeSounds}
          renderScene={(sceneProps) => <GameCanvas {...sceneProps} />}
          renderWorldMap={(worldMapProps) => (
            <WorldMapCanvas {...worldMapProps} />
          )}
          renderIslandExplore={(exploreProps) => (
            <IslandExploreCanvas {...exploreProps} />
          )}
        />
      )}
    />
    <SiteFooter />
  </StrictMode>,
);
