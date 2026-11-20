import {
  builtInEmailNames,
  builtInEmailSlugs,
  maskEmailAddress,
  type BuiltInEmails,
} from "@adrianeyre/email-client";
import { toOneLine } from "../plain-names.js";

/** The name of a built-in email's helper on the email client, such as `resetYourPassword`. */
export type EmailTemplate = keyof typeof builtInEmailSlugs;

/** The variables a built-in email's template in the email platform needs. */
export type EmailVariables<Template extends EmailTemplate> =
  BuiltInEmails[(typeof builtInEmailNames)[Template]];

/**
 * An email Wizzaroo sends: which of the email platform's built-in templates, to whom, and the variables it fills in.
 * The words, layout and HTML live in the email platform (ADR 0069); Wizzaroo only chooses the template and its values.
 */
export type Email = {
  [Template in EmailTemplate]: {
    to: string;
    template: Template;
    variables: EmailVariables<Template>;
  };
}[EmailTemplate];

interface EmailAddressCheckParts {
  to: string;
  confirmationUrl: URL;
  lifetimeHours: number;
}

interface PasswordResetEmailParts {
  to: string;
  resetUrl: URL;
  lifetimeHours: number;
}

interface InviteEmailParts {
  to: string;
  name: string;
  schoolName: string;
  inviteUrl: URL;
  lifetimeDays: number;
}

interface PasswordChangedNoticeParts {
  to: string;
  changedAt: Date;
}

interface SignInCodesPausedNoticeParts {
  to: string;
  wrongCodes: number;
  pausedAt: Date;
  pauseEndsAt: Date;
}

interface FamilyDeviceNoticeParts {
  to: string;
  signedInAt: Date;
  parentPageUrl: URL;
}

/** Such as "14 November 2026 at 13:52 (UK time)". */
export const formatUkDateAndTime = (date: Date): string =>
  `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(date)} (UK time)`;

/** Such as "24 hours" or "7 days". */
export const formatDuration = (amount: number, unit: "hour" | "day"): string =>
  new Intl.NumberFormat("en-GB", {
    style: "unit",
    unit,
    unitDisplay: "long",
  }).format(amount);

export { maskEmailAddress };

export const buildEmailAddressCheckEmail = ({
  to,
  confirmationUrl,
  lifetimeHours,
}: EmailAddressCheckParts): Email => ({
  to,
  template: "confirmYourEmailAddress",
  variables: {
    email: to,
    confirmationUrl: confirmationUrl.href,
    linkLifetime: formatDuration(lifetimeHours, "hour"),
  },
});

export const buildPasswordResetEmail = ({
  to,
  resetUrl,
  lifetimeHours,
}: PasswordResetEmailParts): Email => ({
  to,
  template: "resetYourPassword",
  variables: {
    email: to,
    resetUrl: resetUrl.href,
    linkLifetime: formatDuration(lifetimeHours, "hour"),
  },
});

/** Every name an email carries is reduced to one plain line, so a name stored before #321 can't make a paragraph. */
const buildInviteVariables = ({
  to,
  name,
  schoolName,
  inviteUrl,
  lifetimeDays,
}: InviteEmailParts): EmailVariables<"teacherInvite"> => ({
  email: to,
  name: toOneLine(name),
  schoolName: toOneLine(schoolName),
  inviteUrl: inviteUrl.href,
  inviteLifetime: formatDuration(lifetimeDays, "day"),
});

export const buildTeacherInviteEmail = (parts: InviteEmailParts): Email => ({
  to: parts.to,
  template: "teacherInvite",
  variables: buildInviteVariables(parts),
});

export const buildParentInviteEmail = (parts: InviteEmailParts): Email => ({
  to: parts.to,
  template: "parentInvite",
  variables: buildInviteVariables(parts),
});

export const buildPasswordChangedNotice = ({
  to,
  changedAt,
}: PasswordChangedNoticeParts): Email => ({
  to,
  template: "passwordChanged",
  variables: { email: to, changedAt: formatUkDateAndTime(changedAt) },
});

interface PasskeyAddedNoticeParts {
  to: string;
  passkeyName: string;
  addedAt: Date;
  isFromHandOff: boolean;
}

interface PasskeyRemovedNoticeParts {
  to: string;
  passkeyName: string;
  removedAt: Date;
}

/** Names the passkey as whoever added it typed its name, and links to nothing, so it can't be used to change anything. */
export const buildPasskeyAddedNotice = ({
  to,
  passkeyName,
  addedAt,
  isFromHandOff,
}: PasskeyAddedNoticeParts): Email => ({
  to,
  template: "passkeyAdded",
  variables: {
    email: to,
    passkeyName: toOneLine(passkeyName),
    addedAt: formatUkDateAndTime(addedAt),
    isFromQrCode: isFromHandOff,
  },
});

export const buildPasskeyRemovedNotice = ({
  to,
  passkeyName,
  removedAt,
}: PasskeyRemovedNoticeParts): Email => ({
  to,
  template: "passkeyRemoved",
  variables: {
    email: to,
    passkeyName: toOneLine(passkeyName),
    removedAt: formatUkDateAndTime(removedAt),
  },
});

interface EmailAddressChangeNoticeParts {
  to: string;
  newEmail: string;
  happenedAt: Date;
}

/** Sent to the address the account has when a move to a new one is asked for, before anything changes (#251). */
export const buildEmailAddressChangeRequestedNotice = ({
  to,
  newEmail,
  happenedAt,
}: EmailAddressChangeNoticeParts): Email => ({
  to,
  template: "emailChangeRequested",
  variables: {
    email: to,
    newEmailMasked: maskEmailAddress(newEmail),
    requestedAt: formatUkDateAndTime(happenedAt),
  },
});

/** Sent to the address the account had, once a new one is confirmed: every later notice goes to the new one (#251). */
export const buildEmailAddressChangedNotice = ({
  to,
  newEmail,
  happenedAt,
}: EmailAddressChangeNoticeParts): Email => ({
  to,
  template: "emailAddressChanged",
  variables: {
    email: to,
    newEmailMasked: maskEmailAddress(newEmail),
    changedAt: formatUkDateAndTime(happenedAt),
  },
});

interface EmailAddressInUseNoteParts {
  to: string;
}

/** Sent instead of a confirmation link when the address asked for already belongs to an account (#253). */
export const buildEmailAddressInUseNote = ({
  to,
}: EmailAddressInUseNoteParts): Email => ({
  to,
  template: "emailAddressAlreadyInUse",
  variables: { email: to },
});

export const buildSignInCodesPausedNotice = ({
  to,
  wrongCodes,
  pausedAt,
  pauseEndsAt,
}: SignInCodesPausedNoticeParts): Email => ({
  to,
  template: "signInCodesPaused",
  variables: {
    email: to,
    wrongCodes,
    pausedAt: formatUkDateAndTime(pausedAt),
    pauseEndsAt: formatUkDateAndTime(pauseEndsAt),
  },
});

export const buildFamilyDeviceNotice = ({
  to,
  signedInAt,
  parentPageUrl,
}: FamilyDeviceNoticeParts): Email => ({
  to,
  template: "familyDeviceSignedIn",
  variables: {
    email: to,
    signedInAt: formatUkDateAndTime(signedInAt),
    parentPageUrl: parentPageUrl.href,
  },
});

interface FamilyJoinRequestNoticeParts {
  to: string;
  schoolName: string;
  parentPageUrl: URL;
}

interface FamilyJoinedNoticeParts {
  to: string;
  joinedEmail: string;
}

/** Names no one but the School: who is asking to join is shown only once the Parent signs in. */
export const buildFamilyJoinRequestNotice = ({
  to,
  schoolName,
  parentPageUrl,
}: FamilyJoinRequestNoticeParts): Email => ({
  to,
  template: "familyJoinRequest",
  variables: {
    email: to,
    schoolName: toOneLine(schoolName),
    parentPageUrl: parentPageUrl.href,
  },
});

export const buildFamilyJoinedNotice = ({
  to,
  joinedEmail,
}: FamilyJoinedNoticeParts): Email => ({
  to,
  template: "adultJoinedFamily",
  variables: { email: to, joinedEmail },
});

interface TwoFactorTurnedOffNoticeParts {
  to: string;
  turnedOffAt: Date;
}

/** Sent when an adult turns two-factor authentication off, as a password change is, since a session alone can do it (#257). */
export const buildTwoFactorTurnedOffNotice = ({
  to,
  turnedOffAt,
}: TwoFactorTurnedOffNoticeParts): Email => ({
  to,
  template: "twoFactorTurnedOff",
  variables: { email: to, turnedOffAt: formatUkDateAndTime(turnedOffAt) },
});
