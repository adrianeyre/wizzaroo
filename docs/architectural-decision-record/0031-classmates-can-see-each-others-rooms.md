# Classmates can see each other's Rooms, if their Parents turn it on

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Children want to show off what they have earned, and siblings alone are too few for a Child with none. So a Child can visit the Rooms of their classmates: Children from other Families at the same School whose Year Group is the same as theirs (siblings already visit each other within the Family), worked out with `wizzaroo_school_year` as a Teacher's reach is ([0026](./0026-schools-and-teachers.md)), so the list follows the cohort on 1 September. A Child with no School has no classmates.

This is the one place a Family Device reaches past its own Family, and it is kept as narrow as possible:

- **Off by default.** A Parent turns it on for each Child. The one switch works both ways: a Child can visit classmates only while their own Room can be visited.
- **Look only.** A visitor sees the Room with its Furniture and Trophies, and the Character's portrait with its Pet. Never the Child's or the Character's name, since Character names are free text nobody moderates. There are no visit logs, likes, counts, messages or reactions, and Gifts stay between siblings ([0010](./0010-rewards-without-nudges.md)).
- **Read-only, online only.** A Family Device gets a `FOR SELECT` row-level security policy ([0027](./0027-row-level-security-through-a-reach-role.md)) for those rows of opted-in classmates and nothing else: no progress, Stars, Mastery or play. Classmates' Rooms are fetched when visited and never stored for offline play, so no other Family's data sits on a Family Device. Sibling Rooms still work offline.

Before it is turned on at a School, the privacy policy and that School's data processing agreement must say that classmates can see each other's Rooms and portraits. The server enforces this: each School's `classmate_visits_approved` is off until the Admin turns it on, confirming the agreement names it. Until then a Parent can't turn the switch on, `wizzaroo_can_visit_classmate_room` lets nobody at that School see a classmate's Room, and Family Devices are told it is off. Each Parent's own choice is kept, so withdrawing approval shuts every Room at the School at once and approving it again brings them back.

## Considered Options

- **Siblings only**: the strictest choice, but a Child with no siblings has no one to show.
- **The whole School**: many more strangers' Rooms, for little gain over a class.
- **On by default**: the ICO Children's Code expects high privacy by default.
- **Showing Character names**: lets Children find friends faster, but shows free text a Child typed to other Families.

## Consequences

The PRD's non-goal of no social features for Children now has this one exception. An integration test must prove that a Family Device sees no classmate whose Parent hasn't opted in, nobody outside the Child's School and Year Group, and nothing of a classmate beyond the Room and portrait.
