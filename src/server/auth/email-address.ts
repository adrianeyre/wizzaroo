import addressparser from "nodemailer/lib/addressparser";

/**
 * A dot-atom local part and a domain of letters, digits and hyphens in two or more dot-separated labels: no quotes,
 * whitespace, controls or `, ; : < > ( ) [ ] \ "`, which Nodemailer, as the email platform sends with it, would read as
 * an address list, a group or a display name and deliver somewhere other than the address stored (#322).
 */
const emailAddressShape =
  /^[A-Za-z\d!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z\d!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?)+$/;

/** RFC 5321's longest path less its angle brackets: no mailbox has a longer address (#295). */
export const longestEmailAddressLength = 254;

export const normaliseEmail = (email: string): string =>
  email.trim().toLowerCase();

/** Belt and braces: Nodemailer's own parser must read the address as one mailbox, exactly as typed, with no name. */
const isOneMailboxToNodemailer = (email: string): boolean => {
  const parsed = addressparser(email);
  const [only] = parsed;
  return (
    parsed.length === 1 &&
    only.group === undefined &&
    only.name === "" &&
    only.address === email
  );
};

export const isEmailAddress = (email: string): boolean =>
  email.length <= longestEmailAddressLength &&
  emailAddressShape.test(email) &&
  isOneMailboxToNodemailer(email);
