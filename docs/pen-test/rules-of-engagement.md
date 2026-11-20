# Pen test: rules of engagement

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The rules every tester in the first pen-test round works to: when testing happens, what may be touched, what may not, and how a critical finding reaches the owner. The brief is [the pen-testing PRD](../product-requirements-document/pen-testing.md), and what has to be true for the round to close is [the statement of work](./statement-of-work.md). This page names hosts and how the round is run, so it is kept private on the same terms as the PRD.

**Status:** In force. The owner confirmed every item below on 17 November 2026.

## Still to settle

Each item has a proposed value and the reason for it. The owner replaces the proposal with what they decide, deletes the marker, and records the date beside it.

| Item                                                                     | Section                                             |
| ------------------------------------------------------------------------ | --------------------------------------------------- |
| The window's dates and hours                                             | [The window](#the-window)                           |
| Whether the other subdomains of `adrianeyre.co.uk` may be listed for H11 | [Out of scope](#out-of-scope)                       |
| The out-of-band channel for a critical finding in the external round     | [The out-of-band channel](#the-out-of-band-channel) |

## Who tests, and on whose authority

The owner, Adi, authorises this round and is the only person who can change these rules, pause testing or end it. In this first round, the testers are the owner and the agents (Sandcastle and the AI Office) working each scope issue under `prd:pen-test`. Nobody else tests, and an agent tests only within its own scope issue.

The external round ([the pre-condition](../product-requirements-document/pen-testing.md#pre-condition-an-external-round-before-a-second-school)) is run under a revision of this page that names its tester and its own window. Everything else here carries over to it unless that revision says otherwise.

## The window

> **Confirmed by the owner, 17 November 2026:** the window opens on **Monday 30 November 2026 at 09:00** UK time and closes on **Friday 18 December 2026 at 17:00** UK time. Inside it, testing may happen at any hour.
>
> Why these dates: the first two weeks give E1, E2 and E4 time to be ready and every scope issue time to be filed and anchored before the window opens (success criterion 1). Fifteen working days give every scope issue time to be worked. Closing before the Christmas bank holidays means a critical finding filed on the last day still has its 2 working days (21 and 22 December) before they start. Any hour is proposed because the agents run unattended and the deployment holds only synthetic data. The external round sets its own hours in its revision, to hours when the owner can answer within 30 minutes.

- **The window opens only when every enablement issue (E1 to E5) is ready,** even if the date has passed. If they aren't ready, this page is amended with new dates. The window doesn't slip without a recorded change.
- **No testing happens outside the window.** A probe that is still running when the window closes is stopped, not finished.
- **The owner can pause testing at any time** by saying so on the scope issues. Testing starts again only when the owner says so in the same place.
- **The window can be extended only by an amendment to this page,** dated and made before the close.

## In scope: the pen-test deployment only

Testing is aimed at one target: **the pen-test deployment E1 stands up**. E1's deployment page, beside this one in `docs/pen-test/`, is the record of its hosts. Each host it names must meet every condition below. A host that fails any of them is out of scope until E1 fixes it.

| In scope                                                                                         | Condition it must meet                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The deployment's origin, the one URL testers send requests to                                    | Not `wizzaroo.adrianeyre.co.uk` and not routed to production. Reachable only by the testers. Fronted the way production is fronted, so the tunnel's origin is reproduced (H12)          |
| The deployment's own Compose project: its `app`, `postgres` and `backup` containers and networks | A Compose project name other than production's `wizzaroo`, its own Postgres volume and its own `.env`. No host port that is 4310 or 54320                                               |
| The deployment's database, through the connection string E4 issues for D1                        | That deployment's Postgres only. Never production's                                                                                                                                     |
| The deployment's mail capture                                                                    | Every email the deployment sends is caught there and never delivered to a real mailbox                                                                                                  |
| The throwaway backup targets                                                                     | A scratch directory standing in for the NAS and a throwaway bucket standing in for B2. Never the real NAS and never the real bucket                                                     |
| The source, read-only                                                                            | This repository at the commit the round is run against, including `.github/workflows/` for H15. Read, never pushed to outside an agent's own branch, and no workflow is run to probe it |

**The boundary is the deployment, not the machine it runs on.** If a probe reaches the host (a container escape, the Docker socket, the host's files or another Compose project), prove it with one read-only command, stop, and report it. Change nothing on the host, because the host may also run production.

## Out of scope

The exclusions under [Explicitly out of scope](../product-requirements-document/pen-testing.md#explicitly-out-of-scope) in the PRD, with what each means for a tester:

- **Production.** `wizzaroo.adrianeyre.co.uk`, its Compose project, its volume and its data. That includes passive scanning through the tunnel, because production holds real Children's data. Sending it no requests at all is the rule.
- **Cloudflare, Resend and Backblaze as platforms.** How Wizzaroo uses them is in scope, read from the source and the deployment. The platforms themselves, and other customers on them, are not.
- **Denial of service and volume testing.** A missing rate limit is worked out by arithmetic (H8). Send only as many requests as it takes to see a behaviour happen once, such as the sixth TOTP try, never a load.
- **Social engineering, phishing, and physical access** to the home server, the NAS or a Family Device. Nobody is contacted to test them, including the owner.
- **Production data**, and anything reached through `wizzaroo.adrianeyre.co.uk`.
- **Picture Passwords as a security boundary** ([ADR 0005](../architectural-decision-record/0005-family-devices-and-picture-passwords.md)). A device credential, or a Picture Password hash, that escapes the device is in scope.
- **The 3D client's game logic,** except where it produces events the server accepts.

Also out of scope, because they are not the deployment:

- **The real NAS, the real B2 bucket, the home network** and every other machine on it.
- **GitHub as a platform,** the repository's settings and its CI secrets. H15 is answered by reading the workflow files.
- **Every other host under `adrianeyre.co.uk`.**

> **Confirmed by the owner, 17 November 2026:** for H11, testers may _list_ the other subdomains of `adrianeyre.co.uk` from public records only (DNS answers and certificate transparency logs), and send no request to any of them.
>
> Why: H11 asks what those subdomains are and who controls them. That is answered from public records without touching anything. A request to a subdomain the owner doesn't run could reach someone else's server.

## How testers behave

- **Destructive testing only inside the deployment.** Inside it, a tester may delete rows, break a migration or crash a container, because the deployment is torn down with its volume at the end. To recover, re-seed from E2's fixtures. Don't hand-repair the data. Outside the deployment, nothing destructive is done, anywhere, for any reason.
- **Synthetic data only.** Only the fixture Families, staff and Children from E2, and data made up for a probe. Never a real person's name, email address or Child's details, and never an email address the fixtures don't already use.
- **Only the credentials the package issues.** Testers use the accounts, device credentials and connection strings in E4's credentials package and nothing else. Finding a secret the package didn't issue is a finding:
  - a secret of **the deployment's** (its database password, its tunnel token, its email platform stand-in's key) may be used inside the deployment just far enough to show its impact, and reported;
  - a secret of **anything else** (production, the real tunnel, production's email platform, Resend, B2, the NAS, the age key, CI) is not used at all, not even to check it works. Report it at once as `severity:critical`, so the owner rotates it.
- **Reaching production or real data by accident ends the probe.** Stop, keep no copy, tell the owner at once by [the out-of-band channel](#the-out-of-band-channel), and record what happened in the scope issue's findings note without the data itself.
- **No secret leaves the deployment.** No credential, token, cookie, recovery code or connection string goes into an issue, a findings note, a commit, a log or a prompt. Name the fixture identity instead.
- **A probe does not fix.** Nothing found is fixed in the scope issue that found it.

## Reporting

Findings are filed and triaged as [the pen-test findings workflow](./README.md) and [the PRD](../product-requirements-document/pen-testing.md#findings-workflow) describe. The remediation targets that start at triage are [the table in the PRD](../product-requirements-document/pen-testing.md#findings-workflow), which is their only home.

- **In this first round,** a critical finding is filed as an issue straight away, because the testers report to the owner, the repository is private and the data is synthetic.
- **In the external round,** a critical finding never starts life as a GitHub issue. It goes to the owner by the out-of-band channel below. The issue is filed once a fix is in hand.

## The out-of-band channel

Used in the external round for a critical finding, and in either round when a tester reaches production or real data by accident.

> **Confirmed by the owner, 17 November 2026:** **a phone call to the owner's mobile, then a Signal message to the same number if the call isn't answered.** The number goes to the external tester in the credentials package (E4), not in this repository, any issue or any prompt.
>
> Why: a phone reaches the owner away from the computer, so the 30 minutes can be met. Signal is end-to-end encrypted and its message waits if the call is missed. A GitHub issue isn't out-of-band, because everyone with access to the repository can read it before the fix exists. Email isn't either, because the account it would go to may be part of what was compromised.

1. **The first message carries no exploit detail:** that it is the Wizzaroo pen test, that the finding is critical, the scope issue's ID, and the time it was found.
2. **The owner acknowledges on the same channel.** If there is no acknowledgement **within 30 minutes, testing pauses** until there is one.
3. **The detail goes over the agreed end-to-end encrypted channel,** never by email or in an issue.
4. **The finding issue is filed once a fix is in hand,** with the time of first contact and of acknowledgement recorded in it.

## The end of the window

When the window closes, testing stops. What has to be true before the round is signed off, including the deployment's teardown and every credential's revocation, is in [the statement of work](./statement-of-work.md).

## Changing these rules

This page changes only by a pull request the owner approves. A change made during the window carries its date beside the rule it changes, and the scope issues it affects are told on the issue.
