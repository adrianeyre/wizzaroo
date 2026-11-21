# Islands above a Child's Year are explored but not played by default

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Supersedes in part [0064](./0064-every-island-is-open-by-default.md).

[0064](./0064-every-island-is-open-by-default.md) opened every Island by default, whatever the Child's Year, so a Year 1 Child could play the Regions and Games of Year 6. The owner asked that a Child can explore any Island by default, but that the Regions and Games on Islands for Years above their own are locked until a Parent opens them.

Exploring and playing were already apart: an Island's lock (`isUnlocked`) only keeps its Regions' Missions shut, and every Island can be travelled to and explored even when locked ([0053](./0053-locked-islands-can-be-travelled-to-and-explored.md)), unless a Parent locks it for exploring ([0065](./0065-parents-lock-single-islands-for-exploring.md)). So the change is to which Islands are unlocked by default, not to exploring.

## What changes

- **Open by default up to the Child's own Year.** `buildIslandsOnMap` in `src/curriculum/island-access.ts` marks an Island `isUnlockedByDefault` when its Year is the Child's own or below. A Child with no Year yet plays as Year 1, so only Island 1 is open; a Year 6 Child has every Island open. The World Map, the Parent's Islands page, the Teacher's view and the Awards page all follow it.
- **The Islands above are locked for play, not for exploring.** Their Regions show the padlock and "Ask a grown-up to open this Island", and no Games. The Child still travels there on any craft, and explores it on foot with its Attractions, Curiosities and Quest, as [0053](./0053-locked-islands-can-be-travelled-to-and-explored.md) and [0065](./0065-parents-lock-single-islands-for-exploring.md) set out. The Menu's **Islands** list names such an Island ", locked", as it does any locked Island.
- **A Parent's switch still overrides the default.** On the Islands page the Island's switch, now captioned **Regions open**, opens an Island above the Child's Year early, held in `unlockedIslandIds`, and locks one at or below it, held in `lockedIslandIds`. Switching it back returns the Island to its default and takes it off the list. A Parent's lock wins over an early opening, and a Teacher's lock wins over both ([0035](./0035-teachers-lock-what-a-child-plays.md)). The badges read "Open: (name)'s own Year", "Open", "Opened early", "Locked: above (name)'s Year" and "Locked by you", and the limits summary names "Islands you've opened early" again.
- **Region and Game switches work as before.** Turning a Region or Game off, or opening every Game in a Region, is kept whatever the Island's lock, and applies once the Island is open.
- **Quests follow exploring.** The Awards page says an Island's Quest waits only when the Island is locked for exploring (`canExploreIsland`), since a Quest is played on foot.

## Nothing to migrate

The default is worked out each time from the Child's Year, never stored. `children.synced_limits` defaults to `{}`, and in the time of [0064](./0064-every-island-is-open-by-default.md) a Parent's switch only ever added to `lockedIslandIds` and took Islands off it, never adding an Island above the Child's Year to `unlockedIslandIds`. So stored limits hold only a Parent's own choices, and they keep their meaning:

- An Island in `lockedIslandIds` stays locked.
- An Island in `unlockedIslandIds`, opened early before [0064](./0064-every-island-is-open-by-default.md), is open again as an early opening, which is what the Parent chose then.
- Every other Island above the Child's Year, which [0064](./0064-every-island-is-open-by-default.md) left open, is locked for play again once each Family Device has the new code. Its Stars and earned Games are kept, and come back when a Parent opens it early or the Child's Year reaches it.

A migration opening every Island above each Child's Year early would keep today's play for existing Children but put the Islands back the way the owner asked not to have them, so there is none.

## Consequences

- As a Child moves up a Year each September, the next Island opens by itself.
- The home Island is still the Child's own Year's, and Games still play their Island's Year, whatever the Child's own.
