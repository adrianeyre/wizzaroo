import { useEffect, useRef, useState } from "react";
import { AccessibilityStatement } from "./accessibility-statement.js";
import { CookiePolicy } from "./cookie-policy.js";
import { Credits } from "./credits.js";
import { releasesUrl, repositoryUrl } from "./links.js";
import { ModalDialog } from "../modal-dialog.js";
import { NewTabLink } from "./new-tab-link.js";
import { PrivacyPolicy } from "./privacy-policy.js";
import { TermsAndConditions } from "./terms-and-conditions.js";

const policies = {
  privacy: {
    label: "Privacy Policy",
    closeLabel: "Close privacy policy",
    Body: PrivacyPolicy,
  },
  terms: {
    label: "Terms and Conditions",
    closeLabel: "Close terms and conditions",
    Body: TermsAndConditions,
  },
  cookies: {
    label: "Cookie Policy",
    closeLabel: "Close cookie policy",
    Body: CookiePolicy,
  },
  accessibility: {
    label: "Accessibility",
    closeLabel: "Close accessibility statement",
    Body: AccessibilityStatement,
  },
} as const;

const footerDialogs = {
  credits: {
    label: "Credits",
    closeLabel: "Close credits",
    Body: Credits,
  },
  ...policies,
} as const;

type FooterDialog = keyof typeof footerDialogs;

const policyKeys = ["privacy", "terms", "cookies", "accessibility"] as const;

const footerDialogKeys: readonly FooterDialog[] = ["credits", ...policyKeys];

const footerHeightProperty = "--site-footer-height";

const GitHubMark = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.59.23 2.76.11 3.05.75.81 1.2 1.84 1.2 3.1 0 4.43-2.7 5.41-5.26 5.69.42.36.8 1.08.8 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
  </svg>
);

export const SiteFooter = () => {
  const [openDialog, setOpenDialog] = useState<FooterDialog | null>(null);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (footer === null) {
      return;
    }
    const rootStyle = document.documentElement.style;
    const observer = new ResizeObserver(() => {
      rootStyle.setProperty(
        footerHeightProperty,
        `${String(footer.offsetHeight)}px`,
      );
    });
    observer.observe(footer);
    return () => {
      observer.disconnect();
      rootStyle.removeProperty(footerHeightProperty);
    };
  }, []);

  const closeDialog = () => {
    setOpenDialog(null);
  };

  return (
    <footer ref={footerRef} className="site-footer">
      <nav aria-label="About Wizzaroo">
        <ul>
          <li>
            <NewTabLink href={repositoryUrl} className="site-footer-link">
              <GitHubMark />
              Website design
              <span className="visually-hidden">, source on GitHub</span>
            </NewTabLink>
          </li>
          <li>
            <NewTabLink href={releasesUrl} className="site-footer-link">
              Version: {__APP_VERSION__}
              <span className="visually-hidden">, changelog</span>
            </NewTabLink>
          </li>
          <li>
            <button
              type="button"
              className="site-footer-link"
              aria-haspopup="dialog"
              onClick={() => {
                setOpenDialog("credits");
              }}
            >
              Credits
            </button>
          </li>
          {policyKeys.map((policyKey) => (
            <li key={policyKey}>
              <button
                type="button"
                className="site-footer-link"
                aria-haspopup="dialog"
                onClick={() => {
                  setOpenDialog(policyKey);
                }}
              >
                {policies[policyKey].label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {footerDialogKeys.map((dialogKey) => {
        const { label, closeLabel, Body } = footerDialogs[dialogKey];
        return (
          <ModalDialog
            key={dialogKey}
            isOpen={openDialog === dialogKey}
            onClose={closeDialog}
            title={label}
            closeLabel={closeLabel}
          >
            <Body />
          </ModalDialog>
        );
      })}
    </footer>
  );
};
