# One Island per Year Group, with Games unlocked by Stars

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for a completely different Island for each school year, each with its own landscape, landmarks and Region names, and for Children to earn their way through each Region's Games rather than having a whole Region open at once.

The World Map becomes a sea of six Islands, one per Year Group. Today's single map, with its eight Subject Regions and the Brainwave Big Top, becomes Island 1. Each Island has a Region for every Subject the curriculum teaches in its Year (Phonics on Islands 1 and 2, Languages on Islands 3 to 6 once it exists), with names of its own, plus the Brainwave Big Top under the same name everywhere. **Every Game on an Island plays that Island's Year**, whatever the Child's own Year Group, so Year tabs inside Regions go, and so does playing "at the level of the Child's own Year".

A Child's Home Island is the one for their Year Group, and the map opens on it, zoomed out. Islands below it are unlocked; Islands above it are visible but locked. A Parent can lock or unlock any Island, turn any Region off or on, and unlock every Game in a Region. Those switches replace the per-Child "Subjects they can play" limit and the Mastered-Skills Region unlock. Placement, which was never built, is dropped: a Child ahead of or behind their Year is handled by unlocking an Island.

Every Region is on by default with only its first Game unlocked. The next Game, in a fixed order set in data, unlocks after the Child earns 10 more Stars in that Region, counting Activity Stars and Mastery bonuses earned there. Nothing is spent, so unlocking never competes with Items. A Game whose Skill is already Mastered earns no Stars, so it unlocks the next Game as soon as one Activity in it is finished. The Brainwave Big Top has every Game unlocked. Unlock progress is kept per Child, per Island and per Region, and worked out from events like Stars ([0004](./0004-offline-play-records-events-the-server-decides.md)).

Only the Island in view is drawn in full detail ([0012](./0012-the-world-map-is-drawn-in-full-detail.md)). The others are low-detail shapes that load their detail when the Child pans to them, so six Islands fit the performance budget on the £150 phone.

When this ships, every Game a Child has finished an Activity in stays unlocked, along with the next Game in that Region, so nothing a Child has already played locks again.

## Considered Options

- **One map whose Regions adapt to the Child's Year** (what was built): simplest content model, but every Year looks the same, an older Child's world never changes, and Parents have no way to open a Year other than through per-Subject Placement.
- **Spending Stars to unlock Games**: makes learning progress compete with the Character's Items, and a Child who had spent their Stars on a hat could be stuck.
- **Separate age-band themes on one map**: the Islands are those themes, so a separate theme switch would duplicate them.

## Consequences

- Amends the Region ADRs 0016 to 0024: each describes one Region on Island 1, and where it says content follows the Child's own Year, it now follows the Island's.
- Six landscapes and around 50 Region landmarks are a large amount of 3D work. Scenes such as the shared stages and the Lab Stations are reused across Islands with different props.

## Amended

Amended by [0026](./0026-schools-and-teachers.md): the Year Group is worked out from the Child's birth month and year and moves up on 1 September, rather than a Parent changing it.

Amended by [0035](./0035-teachers-lock-what-a-child-plays.md): a Parent can also turn single Games off, and a Child's Teachers can lock Islands and turn Regions and Games off, which a Parent can't turn back on.
