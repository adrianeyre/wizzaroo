# An adult can keep several passkeys

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Wizzaroo always kept a list of passkeys per adult, but every one was registered under the same WebAuthn user handle, `users.passkey_user_handle`, and the registration options listed the adult's existing passkeys in `excludeCredentials`. A synced password manager (iCloud Keychain, Google Password Manager, 1Password and the like) holds one passkey per website and user handle, so once it held one of the adult's passkeys, adding another refused with "you already have a passkey for this site". If that passkey had been removed from Wizzaroo but not from the password manager, the new one quietly replaced the old one. In practice an adult could keep one passkey per password manager, and the refusal showed only as "Wizzaroo couldn't add the passkey".

Each passkey is now registered under a **user handle of its own**: 32 random bytes made with the registration options, which aren't stored. The options **exclude none** of the adult's passkeys. A password manager therefore keeps a new passkey beside the adult's others. "Add a passkey" becomes "Add another passkey" once there is one, and the form says to add one on each device or password manager they use.

Nothing reads the user handle back. Sign-in looks a passkey up by its credential id (`passkeys.id`), and a confirmation checks the credential belongs to the signed-in adult, so a handle per passkey changes no check. The handle is still never the account id (#238), and a phone holding only a QR code's secret ([0036](./0036-adding-a-passkey-on-a-phone-by-qr-code.md)) now learns neither the adult's passkey ids nor an id shared by their passkeys.

## Considered Options

- **Keep one handle and `excludeCredentials`, and explain the refusal**: the browser's "already have a passkey" error is clearer, but an adult still can't keep a second passkey in the same password manager, for example one for each family member's profile on a shared laptop, or a fresh one after losing access to the first.
- **Keep one handle but drop `excludeCredentials`**: the password manager would replace the adult's existing passkey with the new one, leaving a row in `passkeys` that can never sign in.
- **Store each passkey's handle**: nothing needs it today. It can be added if Wizzaroo later uses the WebAuthn signal API to tell password managers which passkeys it still accepts.

## Consequences

- `users.passkey_user_handle` is gone from `schema.sql` and `schema.ts`. A database made before this keeps the column, which has a default and is never read, so nothing breaks.
- One password manager may now hold two of an adult's Wizzaroo passkeys, and the browser's sign-in picker shows both under the adult's email address. The name the adult gives each one tells them apart in Wizzaroo's list.
- A second registration on the same password manager isn't refused, so adding one that already works there does no harm. It adds a row that the adult can remove, and each addition still emails a security notice.
