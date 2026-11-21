# Signing in on another device with a code

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

An adult whose passkey is kept on one device couldn't sign in on another that can't reach it. A passkey in iCloud Keychain on a Mac doesn't reach an Amazon Fire tablet: Fire OS has neither iCloud Keychain nor Google Password Manager, and a Mac can't answer a passkey request for another device the way a phone can. On the tablet, an adult with no password, or a Teacher or the Admin, whose password alone isn't enough, had no way in. They couldn't add a passkey on the tablet or make it a Family Device either, since both start from a sign-in there. The QR code that adds a passkey on a phone ([0036](./0036-adding-a-passkey-on-a-phone-by-qr-code.md)) needs a camera that reads QR codes and a browser that can keep a passkey, and the tablet may have neither.

A signed-in adult can now make a **Sign-in Code** under **Your account → Sign in on another device**, and type it on the other device under **Sign in with a code from another device**:

- **Short enough to type.** Ten characters of Crockford's base32 shown as two groups of five, such as `7KQ2M-X9TPA`. That is 50 random bits, read in any case, with or without the dash and spaces, and with O, I and L read as 0, 1 and 1. The page also shows a QR code of a link, `/parent/#sign-in-code=<code>`, which fills the code in. The link keeps the code in the fragment, which the browser doesn't send, and the page doesn't sign in until the adult presses **Sign in**.
- **Kept like the other secrets.** Only its SHA-256 hash is stored, in `sign_in_codes`, under the same row-level security as `passkey_hand_offs` ([0027](./0027-row-level-security-through-a-reach-role.md)). It works once and for 10 minutes, and making a new one replaces the adult's earlier one. It is in a Family's data export.
- **A fresh proof to make one.** The sign-in on the other device outlives the one making the code, so making it takes the adult's password, a code from their authenticator app, or a passkey, as making a Family Device does (#303). A Teacher or the Admin gives a second factor, and wrong proofs count against the account as wrong passwords at sign-in do.
- **Two-step only from a second factor.** The new sign-in is two-step when the code was made with a passkey or an authenticator code, and not when it was made with a password, as a password sign-in isn't. A code never gives more than its proof did.
- **Counted and recorded.** Taking a code is one of the sign-in routes the per-address limit counts together (#246). At 50 bits, 10 minutes and that limit, guessing a live code is out of reach. A wrong, used or expired code is recorded as `sign-in.failed` with `sign-in-code`, a right one as `sign-in.succeeded` with `sign-in-code`, and each code made as `sign-in-code.created` with how it was proved ([0041](./0041-security-actions-are-kept-in-an-audit-log.md)).

Once signed in on the tablet, the adult can add a passkey there if its browser can keep one, or make it a Family Device. That needs a fresh proof on the tablet: a password, a code from their authenticator app, or a passkey that browser can use. Authenticator setup now shows a QR code, so an adult with only a passkey on another device can turn on two-factor authentication from their phone and give a code.

## Considered Options

- **The tablet shows a code and the signed-in device approves it (the device authorization grant TVs use)**: no secret is shown on the trusted screen. But an attacker can send an adult a code from their own device to approve, which is a well-known phishing route. A code made on the adult's own signed-in screen can't be pushed to them that way.
- **The passkey hand-off signs the phone in too**: needs the QR code to be scanned, and a browser that can make a passkey. The tablet may be able to do neither.
- **Email a sign-in link**: needs the mailbox open on the tablet, and a link that signs in from an inbox is a credential that stays there long after it's needed.
- **A 32-byte token, as other links use**: too long to type, and typing it is the point.

## Consequences

- Whoever reads the code within 10 minutes can sign in as the adult, so the page says to keep it private. The code works once, and making it took a fresh proof.
- A new table, `sign_in_codes`, and a new Audit Log action, `sign-in-code.created`. There are no migrations, so a database made before this needs the table, its policies and grants, and the enum value, applied by hand from `schema.sql` before deploying.
- `POST /api/sign-in-code-sign-ins` is the seventh route behind the per-address limit.
