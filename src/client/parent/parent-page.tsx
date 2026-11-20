import { useCallback, useEffect, useState, type ReactNode } from "react";
import { isYearGroup, type YearGroup } from "../../curriculum/year-groups.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import { parentSiteTitle, usePageTitle } from "../page-title.js";
import { useHashView } from "../site-header/hash-view.js";
import {
  AccountIcon,
  ChildrenIcon,
  CogIcon,
  DownloadIcon,
  FamilyDevicesIcon,
  HomeIcon,
  KeyIcon,
  MapIcon,
  SignInIcon,
  SignOutIcon,
  ThisDeviceIcon,
  TrophyIcon,
} from "../site-header/icons.js";
import { SettingsPage } from "../site-header/settings-page.js";
import {
  SiteHeader,
  settingsView,
  type SiteMenuEntry,
} from "../site-header/site-header.js";
import {
  AdminSection,
  adminSectionLinks,
  adminSections,
  type AdminSectionId,
} from "../staff/admin-dashboard.js";
import {
  TeacherSection,
  teacherSectionLinks,
  teacherSections,
  type TeacherSectionId,
} from "../staff/teacher-dashboard.js";
import { isFamilyDeviceBrowser } from "../family-device/playable-family.js";
import { AccountPanel } from "./account-panel.js";
import { AdminPanel } from "./admin-panel.js";
import { AwardsPanel } from "./awards-panel.js";
import { ChildrenPanel } from "./children-panel.js";
import { DeviceReadinessPanel } from "./device-readiness.js";
import { EmailAddressConfirmation } from "./email-address-confirmation.js";
import { useIdleSignOut } from "./idle-sign-out.js";
import { FamilyDataPanel } from "./family-data-panel.js";
import { FamilyDevicesPanel } from "./family-devices-panel.js";
import { InviteAcceptanceForm } from "./invite-acceptance.js";
import { PasskeyHandOffForm } from "./passkey-hand-off.js";
import { PasskeyConfirmation } from "./passkeys.js";
import { IslandsPanel } from "./islands-panel.js";
import { ParentSidebar, type SidebarGroup } from "./parent-sidebar.js";
import { PasswordResetForm } from "./password-reset.js";
import { SignInForm } from "./sign-in-form.js";

interface Me {
  email: string;
  name: string | null;
  roles: string[];
  needsSecondFactor: boolean;
  familyName: string | null;
  teaching: { yearGroups: YearGroup[] } | null;
}

type ParentView =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "signed-in"; me: Me }
  | { kind: "failed" };

const isMe = (value: unknown): value is Me =>
  typeof value === "object" &&
  value !== null &&
  "email" in value &&
  typeof value.email === "string" &&
  "name" in value &&
  (value.name === null || typeof value.name === "string") &&
  "roles" in value &&
  Array.isArray(value.roles) &&
  value.roles.every((role) => typeof role === "string") &&
  "needsSecondFactor" in value &&
  typeof value.needsSecondFactor === "boolean" &&
  "familyName" in value &&
  (value.familyName === null || typeof value.familyName === "string") &&
  "teaching" in value &&
  (value.teaching === null ||
    (typeof value.teaching === "object" &&
      "yearGroups" in value.teaching &&
      Array.isArray(value.teaching.yearGroups) &&
      value.teaching.yearGroups.every(isYearGroup)));

const loadingFailedMessage =
  "Wizzaroo couldn't load your account. Try again in a moment.";

const fetchParentView = async (): Promise<ParentView> => {
  const response = await fetch("/api/me");
  if (response.status === 401) {
    return { kind: "signed-out" };
  }
  const me: unknown = response.ok ? await response.json() : undefined;
  return isMe(me) ? { kind: "signed-in", me } : { kind: "failed" };
};

const signOutParent = async () => {
  const response = await fetch("/api/sign-out", { method: "POST" });
  if (!response.ok) {
    throw new Error("Wizzaroo didn't confirm the sign-out");
  }
};

const parentSections = [
  ...adminSections,
  "admin",
  ...teacherSections,
  "children",
  "awards",
  "islands",
  "family-devices",
  "family-data",
  "account",
  "this-device",
  settingsView,
  "sign-in",
] as const;

type ParentSection = (typeof parentSections)[number];

type SignedInSection = Exclude<
  ParentSection,
  "this-device" | "settings" | "sign-in"
>;

const parentSectionLinks: Record<
  ParentSection,
  { label: string; icon: ReactNode }
> = {
  ...adminSectionLinks,
  ...teacherSectionLinks,
  children: { label: "Children", icon: <ChildrenIcon /> },
  awards: { label: "Awards", icon: <TrophyIcon /> },
  islands: { label: "Islands", icon: <MapIcon /> },
  "family-devices": { label: "Family Devices", icon: <FamilyDevicesIcon /> },
  "family-data": { label: "Your Family's data", icon: <DownloadIcon /> },
  admin: { label: "Admin", icon: <KeyIcon /> },
  account: { label: "Your account", icon: <AccountIcon /> },
  "this-device": { label: "This device", icon: <ThisDeviceIcon /> },
  settings: { label: "Settings", icon: <CogIcon /> },
  "sign-in": { label: "Sign in", icon: <SignInIcon /> },
};

interface ParentSectionGroup {
  heading: string;
  sections: readonly ParentSection[];
}

const familySectionGroup: ParentSectionGroup = {
  heading: "Your Family",
  sections: ["children", "awards", "islands", "family-devices", "family-data"],
};

const youSectionGroup: ParentSectionGroup = {
  heading: "You",
  sections: ["account", "this-device"],
};

const adminSectionGroup: ParentSectionGroup = {
  heading: "Running Wizzaroo",
  sections: [...adminSections, "admin"],
};

const teacherSectionGroup: ParentSectionGroup = {
  heading: "Your class",
  sections: teacherSections,
};

/**
 * The Admin's dashboard comes first, then a Teacher's, then their own Family, one tap away.
 * Teachers and the Admin without a second factor can only reach their account, to set one up.
 */
const listSignedInSectionGroups = (me: Me): ParentSectionGroup[] => {
  if (me.needsSecondFactor) {
    return [youSectionGroup];
  }
  return [
    ...(me.roles.includes("admin") ? [adminSectionGroup] : []),
    ...(me.teaching === null ? [] : [teacherSectionGroup]),
    ...(me.familyName === null ? [] : [familySectionGroup]),
    youSectionGroup,
  ];
};

const describeRoles = (me: Me): string =>
  [
    ...(me.roles.includes("admin") ? ["Admin"] : []),
    ...(me.teaching === null ? [] : ["Teacher"]),
    ...(me.familyName === null ? [] : ["Parent"]),
  ].join(" · ") || "Your account";

const isAdminSection = (section: string): section is AdminSectionId =>
  adminSections.some((adminSection) => adminSection === section);

const isTeacherSection = (section: string): section is TeacherSectionId =>
  teacherSections.some((teacherSection) => teacherSection === section);

const signedOutSectionGroups: readonly ParentSectionGroup[] = [
  { heading: "Get started", sections: ["sign-in", "this-device"] },
];

const findShownSection = (
  hashSection: ParentSection | undefined,
  allowedSections: readonly ParentSection[] | undefined,
  signedInLandingSection: SignedInSection,
): ParentSection => {
  if (hashSection === "this-device" || hashSection === settingsView) {
    return hashSection;
  }
  if (allowedSections === undefined) {
    return "sign-in";
  }
  return hashSection === undefined || !allowedSections.includes(hashSection)
    ? signedInLandingSection
    : hashSection;
};

const buildSidebarGroups = (
  shownSection: ParentSection,
  sectionGroups: readonly ParentSectionGroup[],
): SidebarGroup[] =>
  sectionGroups.map(({ heading, sections }) => ({
    heading,
    entries: sections.map((section) => ({
      ...parentSectionLinks[section],
      href: `#${section}`,
      isCurrent: section === shownSection,
    })),
  }));

const homeEntry: SiteMenuEntry = {
  label: "Wizzaroo home",
  icon: <HomeIcon />,
  href: "/",
};

const parentPageTitles: Record<ParentView["kind"], string | undefined> = {
  loading: "Loading",
  "signed-out": undefined,
  "signed-in": "Your Family",
  failed: "Couldn't load your account",
};

const findParentPageTitle = (
  shownSection: ParentSection,
  viewKind: ParentView["kind"],
): string | undefined =>
  shownSection === "sign-in"
    ? parentPageTitles[viewKind]
    : parentSectionLinks[shownSection].label;

interface SignedInSectionViewProps {
  section: SignedInSection;
  isStaff: boolean;
  teachingYearGroups: readonly YearGroup[];
  chosenChildId: string | undefined;
  onChildChosen: (childId: string) => void;
  onThisBrowserMadeFamilyDevice: (name: string) => void;
  onSignInMethodsChanged: () => void;
}

const SignedInSectionView = ({
  section,
  isStaff,
  teachingYearGroups,
  chosenChildId,
  onChildChosen,
  onThisBrowserMadeFamilyDevice,
  onSignInMethodsChanged,
}: SignedInSectionViewProps) => {
  if (isAdminSection(section)) {
    return <AdminSection section={section} />;
  }
  if (isTeacherSection(section)) {
    return (
      <TeacherSection
        section={section}
        teachingYearGroups={teachingYearGroups}
      />
    );
  }
  if (section === "family-devices") {
    return (
      <FamilyDevicesPanel
        onThisBrowserMadeFamilyDevice={onThisBrowserMadeFamilyDevice}
      />
    );
  }
  if (section === "awards") {
    return (
      <AwardsPanel
        chosenChildId={chosenChildId}
        onChildChosen={onChildChosen}
      />
    );
  }
  if (section === "islands") {
    return (
      <IslandsPanel
        chosenChildId={chosenChildId}
        onChildChosen={onChildChosen}
      />
    );
  }
  if (section === "family-data") {
    return <FamilyDataPanel />;
  }
  if (section === "admin") {
    return <AdminPanel />;
  }
  if (section === "account") {
    return (
      <AccountPanel
        isStaff={isStaff}
        onSignInMethodsChanged={onSignInMethodsChanged}
      />
    );
  }
  return (
    <ChildrenPanel
      chosenChildId={chosenChildId}
      onChildChosen={onChildChosen}
    />
  );
};

const isSignedInSection = (
  section: ParentSection,
): section is SignedInSection =>
  section !== "this-device" &&
  section !== settingsView &&
  section !== "sign-in";

interface ParentPageProps {
  emailConfirmationToken?: string;
  passwordResetToken?: string;
  inviteToken?: string;
  passkeyHandOffToken?: string;
}

export const ParentPage = ({
  emailConfirmationToken,
  passwordResetToken,
  inviteToken,
  passkeyHandOffToken,
}: ParentPageProps) => {
  const [view, setView] = useState<ParentView>({ kind: "loading" });
  const [dashboardVersion, setDashboardVersion] = useState(0);
  const [familyDeviceName, setFamilyDeviceName] = useState<string>();
  const [signOutProblem, setSignOutProblem] = useState<string>();
  const [chosenChildId, setChosenChildId] = useState<string>();
  const hashSection = useHashView(parentSections);

  const showParentView = useCallback(() => {
    void fetchParentView().then(setView, () => {
      setView({ kind: "failed" });
    });
  }, []);

  useEffect(showParentView, [showParentView]);

  const isSignedIn = view.kind === "signed-in";
  const sectionGroups = isSignedIn
    ? listSignedInSectionGroups(view.me)
    : signedOutSectionGroups;
  const allowedSections = isSignedIn
    ? sectionGroups.flatMap(({ sections }) => sections)
    : undefined;
  const landingSection =
    emailConfirmationToken === undefined
      ? (allowedSections?.find(
          (section): section is SignedInSection =>
            isAdminSection(section) ||
            isTeacherSection(section) ||
            section === "children",
        ) ?? "account")
      : "account";
  const shownSection = findShownSection(
    hashSection,
    allowedSections,
    landingSection,
  );
  const signedInName = isSignedIn
    ? (view.me.familyName ?? view.me.name ?? view.me.email)
    : undefined;
  usePageTitle(findParentPageTitle(shownSection, view.kind), parentSiteTitle);

  const [isFamilyDevice] = useState(isFamilyDeviceBrowser);
  const [wasSignedOutForIdling, setWasSignedOutForIdling] = useState(false);
  const signOutIdleAdult = useCallback(() => {
    void signOutParent().then(
      () => {
        setWasSignedOutForIdling(true);
        setView({ kind: "signed-out" });
      },
      () => undefined,
    );
  }, []);
  useIdleSignOut(isSignedIn && isFamilyDevice, signOutIdleAdult);

  const signingOut = useBusyAction();
  const signOut = () => {
    setSignOutProblem(undefined);
    signingOut
      .runBusy("Signing you out…", async () => {
        await signOutParent();
        setView({ kind: "signed-out" });
      })
      .catch(() => {
        setSignOutProblem(
          "Wizzaroo couldn't sign you out. Try again in a moment.",
        );
      });
  };

  const sidebarGroups = buildSidebarGroups(shownSection, sectionGroups);
  const footerEntries: SiteMenuEntry[] = isSignedIn
    ? [
        homeEntry,
        { label: "Sign out", icon: <SignOutIcon />, onChoose: signOut },
      ]
    : [homeEntry];
  const menuEntries: SiteMenuEntry[] = [
    ...sidebarGroups.flatMap(({ entries }) => entries),
    ...footerEntries,
  ];

  return (
    <>
      <SiteHeader
        brandHref="#children"
        subtitle={signedInName ?? "For Parents"}
        menuLabel="Parent menu"
        menuEntries={menuEntries}
        isSettingsOpen={shownSection === settingsView}
        hasSidebar
      />
      <div className="parent-layout">
        <ParentSidebar
          familyName={signedInName}
          roleLabel={isSignedIn ? describeRoles(view.me) : undefined}
          groups={sidebarGroups}
          footerEntries={footerEntries}
        />
        <main className="parent-page" aria-busy={signingOut.isBusy}>
          {emailConfirmationToken === undefined ? null : (
            <EmailAddressConfirmation
              token={emailConfirmationToken}
              onConfirmed={() => {
                setDashboardVersion((version) => version + 1);
              }}
            />
          )}
          {passwordResetToken === undefined ? null : (
            <PasswordResetForm
              token={passwordResetToken}
              onReset={showParentView}
            />
          )}
          {inviteToken === undefined ? null : (
            <InviteAcceptanceForm
              token={inviteToken}
              onAccepted={() => {
                setDashboardVersion((version) => version + 1);
                showParentView();
              }}
            />
          )}
          {passkeyHandOffToken === undefined ? null : (
            <PasskeyHandOffForm token={passkeyHandOffToken} />
          )}
          {view.kind === "loading" ? (
            <BusyProgress label="Loading your account…" />
          ) : null}
          {view.kind === "failed" ? (
            <p role="alert">{loadingFailedMessage}</p>
          ) : null}
          {signingOut.busyLabel === undefined ? null : (
            <BusyProgress label={signingOut.busyLabel} />
          )}
          {signOutProblem === undefined ? null : (
            <p role="alert">{signOutProblem}</p>
          )}
          {isSignedIn && view.me.needsSecondFactor ? (
            <>
              <p role="alert">
                Teachers and the Admin can see many Families&apos; Children, so
                they sign in with a passkey or two-factor authentication. Use a
                passkey you already have to carry on. If you have neither yet,
                add one below.
              </p>
              <PasskeyConfirmation onConfirmed={showParentView} />
            </>
          ) : null}
          {view.kind === "signed-out" && familyDeviceName !== undefined ? (
            <p role="status">
              This browser is now the Family Device {familyDeviceName}, and
              you&apos;re signed out of it.{" "}
              <a href="/">Let the Children play</a>
            </p>
          ) : null}
          {view.kind === "signed-out" && isFamilyDevice ? (
            <p role="status">
              {wasSignedOutForIdling
                ? "Wizzaroo signed you out because no one had used the Parent page for a while. "
                : ""}
              This is a Family Device that Children share, so you sign in with
              your password or passkey each time you open the Parent page.
            </p>
          ) : null}
          {view.kind === "signed-out" && shownSection === "sign-in" ? (
            <SignInForm
              onSignedIn={() => {
                setWasSignedOutForIdling(false);
                showParentView();
              }}
            />
          ) : null}
          {shownSection === "sign-in" ? null : (
            <div className="full-view">
              {isSignedIn && isSignedInSection(shownSection) ? (
                <SignedInSectionView
                  key={dashboardVersion}
                  section={shownSection}
                  isStaff={
                    view.me.roles.includes("admin") ||
                    view.me.roles.includes("teacher")
                  }
                  teachingYearGroups={view.me.teaching?.yearGroups ?? []}
                  chosenChildId={chosenChildId}
                  onChildChosen={setChosenChildId}
                  onThisBrowserMadeFamilyDevice={(name) => {
                    setFamilyDeviceName(name);
                    setView({ kind: "signed-out" });
                  }}
                  onSignInMethodsChanged={showParentView}
                />
              ) : null}
              {shownSection === "this-device" ? <DeviceReadinessPanel /> : null}
              {shownSection === settingsView ? <SettingsPage /> : null}
            </div>
          )}
        </main>
      </div>
    </>
  );
};
