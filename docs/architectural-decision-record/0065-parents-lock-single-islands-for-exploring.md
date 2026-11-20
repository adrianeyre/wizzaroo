# Parents lock single Islands for exploring

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked to be able to lock single Islands for exploring: a locked Island isn't shown in any menu and the Child can't go and explore it. Every Island is open for exploring until it is locked.

## What was there

A Parent could lock exploring as a whole (`isExploringLocked`), which hides every way in to explore mode. An Island's own lock (`lockedIslandIds`) only keeps its Regions' Missions shut; it never stopped a Child exploring it.

## What changes

- **One list in the synced limits.** `exploreLockedIslandIds` sits beside `isExploringLocked` in `children.synced_limits`, empty unless a Parent locks an Island, so no migration is needed. `PUT /api/children/:childId/limits` takes it as an optional list of the World Map's Island ids, and keeps the stored list when a body doesn't mention it, as it does the explore lock. A Family Device that last synced before the list existed treats it as empty.
- **One rule.** `canExploreIsland` in `island-access.ts` says whether a Child may explore an Island: exploring isn't locked, and the Island isn't in the list. The World Map and explore mode both ask it.
- **Left out, not greyed out.** A locked Island's **Explore (Island)** button and the Menu's Explore are hidden while it is in view, the walker can't be dropped on it, and its Year is left off the Islands to travel to while exploring. The Explore tab starts on the Child's home Island, or the first open one if that is locked, and is hidden with the walker when every Island is locked.
- **On the dashboard.** **Set (name)'s limits** has a switch for each Island under **Let (name) explore the Islands on foot**, and the limits summary names the Islands locked for exploring.

## Consequences

- A locked Island still shows on the World Map, and its Games are played from there as before; only exploring it on foot is stopped.
- A Child already exploring an Island when a sync locks it is taken back to the World Map.
