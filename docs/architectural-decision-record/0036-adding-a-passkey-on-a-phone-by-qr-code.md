# Adding a passkey on a phone by QR code

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Teachers and the Admin must sign in with a passkey or two-factor authentication ([0026](./0026-schools-and-teachers.md)), and many adults use the Parent dashboard on a computer but carry their phone everywhere. Adding a passkey only worked on the browser in front of them, so putting one on a phone meant signing in on the phone with a password first, and a Teacher with only a password couldn't get far enough to do that.

"Add a passkey" now offers two ways side by side: add one on this device, or scan a QR code to add one on your phone. The QR code holds a link to `/parent/#add-passkey=<token>`. The token is a single-use **passkey hand-off**: 32 random bytes, stored only as a SHA-256 hash in `passkey_hand_offs` with the adult it belongs to, and alive for 10 minutes. Making a new code replaces the adult's earlier one. Opening the link on the phone asks for a name and runs the usual WebAuthn registration there, with the same options as on the computer (a discoverable passkey that checks it's the person). The passkey is added to the adult who made the code, and the hand-off is deleted in the same transaction, so it can't be used twice. The phone is not signed in by this: it now has a passkey to sign in with.

The token travels in the request body, never the URL path, so it doesn't land in request logs, and the link keeps it in the fragment, which browsers don't send to the server. The QR code is drawn in the page as SVG from [uqr](https://github.com/unjs/uqr), a small dependency-free encoder, so no third party ever sees the link.

## Considered Options

- **The browser's own QR code (WebAuthn hybrid transport, `hints: ["hybrid"]`)**: no server changes, and the passkey still ends up on the phone. But the browser decides whether to show it: Safari and Firefox ignore the hint, a computer without Bluetooth can't use hybrid at all, and the code it shows can't be explained or styled in Wizzaroo's words. Nothing stops a browser offering it anyway from the "this device" way.
- **Signing in on the phone first**: what Parents had to do before. It needs the password typed on a phone, and a Teacher who hasn't set up a second factor can't sign in far enough to add one.
- **Emailing a link instead of a QR code**: slower, and the link would sit in an inbox long after it was needed.
- **A QR code from an online generator**: sends a live sign-in credential to a third party.

## Consequences

- Whoever scans the code within 10 minutes can add a passkey to that account, so the page says to keep it private, and the code expires and works once. Adding a passkey still needs a signed-in browser to make the code.
- A new table, `passkey_hand_offs`, under the same row-level security as `passkey_challenges` ([0027](./0027-row-level-security-through-a-reach-role.md)), and it is included in a Family's data export.
- The computer doesn't learn when the phone has finished; the adult presses "I've added it on my phone" to refresh their list of passkeys.

## Amended 17 November 2026: the password-only first setup closes after 7 days

A Teacher or the Admin with no second factor yet signs in with a password alone to set one up, by QR code or otherwise, and nothing recorded when that had to stop. Until they did, their password, or a reset link to their mailbox, led to their whole staff reach (#243). That first setup is now open for **7 days**: from when the login was made, from accepting an Invite, or from using a password reset link the Admin sent. The Invite's own life is 7 days, so a new Teacher gets as long to set up a second factor as they had to accept. After that, the routes that add a passkey, make a QR code or turn on two-factor authentication refuse the sign-in with 403 `second-factor-setup-closed`, and a reset link the adult asked for themselves doesn't reopen it. The way back is the Admin's reset link, which the Audit Log records as `password-reset.sent-by-staff`, and its use as `password.reset` with the 7 days in its detail. The owner, who has no Admin to ask, sets theirs up within 7 days of `pnpm seed:owner`. This is enforced in `runAsSignedInUserAddingSecondFactor` (`src/server/auth/signed-in-parent.ts`) against `users.second_factor_setup_until`.

Proposed by the pen-test fixes; owner to confirm.
