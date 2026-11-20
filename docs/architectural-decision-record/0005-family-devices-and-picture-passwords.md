# Family Devices with Picture Passwords checked on the device

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Parents sign in with Wizzaroo's own sign-in on the Fastify API: an email address plus a passkey or password, with optional two-factor authentication. When a Parent signs in on a tablet or computer, it becomes a **Family Device**: it holds a long-lived credential that allows play for that Family's Children only, and a Parent can revoke it. A Child opens their Character by tapping its portrait and entering a **Picture Password**, which is checked on the device so it works offline.

## Making a device, and what ends it

Added after the second pen-test round (#302, #303).

- **A fresh proof.** A Family Device outlives the sign-in that makes it, so making one asks the Parent to prove it's them again, as moving their email address does: their password, a code from their authenticator app, or a passkey. A Parent with only a passkey uses it, so every Parent has a way. A wrong proof counts against the account with the sign-in's limit for wrong passwords.
- **Ended with its maker's sign-ins.** Each device records the adult whose sign-in made it. A password change or reset ends that adult's other sign-ins, and signs out every device they made with them. A Parent taking their account back after a stolen sign-in loses a device made from it. The cost is that the tablet at home is signed out too, and a Parent makes it a Family Device again. Devices another Parent in the Family made keep playing.
- **Seen by the Parent.** Each device keeps when it was last used and the address it was last used from, and the Parent sees both in their list and their export. Only the last address is kept, and signing the device out clears it ([ADR 0041](./0041-security-actions-are-kept-in-an-audit-log.md) keeps every other address off the record).

## Consequences

The Picture Password keeps siblings apart; it is not a security boundary. The security boundary is the Family Device credential. Children never hold an email address or a password.

The hash is held on the device and in the database, and nowhere else. In Postgres, only a Family Device's reach reads it, for its own Family's Children, through a function made for `GET /api/play/family`. No adult's reach reads it, a Teacher's, the Admin's or a Parent's ([0027](./0027-row-level-security-through-a-reach-role.md), #304).

Every Family Device is sent its own Family's Picture Password hashes, and a search of the 729 combinations finds one in seconds. That is acceptable only while both of these hold:

- **A Family Device is used by one Family.** It is a tablet or computer at home, made by one of the Family's Parents, and it plays for that Family's Children alone.
- **A Picture Password opens one Child's play and guards nothing a sibling mustn't reach.** It chooses which of the Family's Children is playing. It guards no purchase, no setting and nothing a Parent decides.

Any change that breaks either condition revisits this decision before it ships, for example:

- a School or classroom device, or any device Teachers or Schools hand out;
- a device shared between Families, such as one a childminder or relative uses for two Families;
- a Picture Password guarding a purchase, a setting, a limit or anything else a Parent decides;
- a Picture Password guarding anything one sibling mustn't see or change of another's.

Section 8 of `wizzaroo.md` ("Children play at home only; there are no School devices") is the first condition as a requirement. A change to it is a change to this decision.

**Review:** re-read on **31 March 2027**, with the sign-in lifetimes ([ADR 0049](./0049-sign-ins-end-when-left-unused.md)), whether or not any of the changes above has been proposed. Record the answer here; "no change" is a valid answer, and silence is not.
