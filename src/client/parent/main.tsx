import "../theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startFocusRecovery } from "../focus-recovery.js";
import { startServiceWorker } from "../offline/offline-app.js";
import { SiteFooter } from "../site-footer/site-footer.js";
import { takeLinkToken } from "./link-token.js";
import { ParentPage } from "./parent-page.js";
import { applyAppearance, loadAppearance } from "../site-header/appearance.js";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("parent/index.html has no #root element to render into");
}

applyAppearance(loadAppearance());
void startServiceWorker();
startFocusRecovery(rootElement);

const emailConfirmationToken = takeLinkToken("confirm-email");
const passwordResetToken = takeLinkToken("reset-password");
const inviteToken = takeLinkToken("accept-invite");
const passkeyHandOffToken = takeLinkToken("add-passkey");

createRoot(rootElement).render(
  <StrictMode>
    <ParentPage
      emailConfirmationToken={emailConfirmationToken}
      passwordResetToken={passwordResetToken}
      inviteToken={inviteToken}
      passkeyHandOffToken={passkeyHandOffToken}
    />
    <SiteFooter />
  </StrictMode>,
);
