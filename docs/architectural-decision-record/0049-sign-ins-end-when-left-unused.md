# Sign-ins end when left unused, and staff sign-ins sooner

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Wizzaroo's own sign-in is the only gate between the internet and the data ([0002](./0002-self-hosted-behind-a-cloudflare-tunnel.md)). Until now every sign-in lasted a fixed 30 days, used or not, for the Admin and Teachers as well as Parents. The pen test found that a sign-in cookie copied from a shared or lost computer, a browser profile or a backup worked for the whole 30 days, and that nothing recorded the 30 days as a decision for staff (#244).

## Decision

Each sign-in keeps when it was last used (`sign_ins.last_used_at`), moved on when it is used, at most once a minute so a sign-in isn't written on every request. A sign-in past either figure below is refused with `401`, and the adult signs in again.

| Who                                                 | Ends once unused for | Ends after, used or not |
| --------------------------------------------------- | -------------------- | ----------------------- |
| A Parent                                            | 14 days              | 30 days, as before      |
| The Admin or a Teacher (any adult with either role) | 12 hours             | 7 days                  |

- **Parents** keep the 30 days they had, so a Parent who checks in each week isn't asked to sign in again. Two weeks unused ends a sign-in on a computer they have stopped using.
- **The Admin and Teachers** reach many Families' Children, the Admin every School's. 12 hours unused ends a sign-in left on a School computer overnight, and 7 days in all means a staff sign-in is made again, with its second factor, at least once a week.
- The server enforces both, by the database's clock as every other expiry is. The cookie keeps its 30-day `Max-Age`, which decides nothing. The figures live in one place, `src/server/auth/sign-in-lifetimes.ts`.

**Review:** re-read on **31 March 2027**, with the request-rate policy, whether or not a second School has been proposed. Record the answer here; "no change" is a valid answer, and silence is not.

## Considered Options

- **Keep a fixed 30 days for everyone.** Rejected: a copied staff cookie reaches many Families for a month whether or not its owner comes back.
- **A sliding expiry with no absolute lifetime.** Rejected: a sign-in used every day would never end, so a stolen one used daily would last for ever.
- **The same figures for Parents and staff.** Rejected: 12 hours unused would sign a Parent out between most visits, for a risk limited to their own Family.

## Consequences

- A Teacher or the Admin signs in again, with their passkey or code, every morning they come back and at least once a week.
- A role decides at each request, so a Parent made a Teacher is held to the staff figures from then on, on their sign-ins made before too.
- The Family export carries each sign-in's last use with when it was made and when it expires.
