# The World Map shows everything from explore mode

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Until now the World Map drew an Island's land, its Regions, its Dock and, since [0047](./0047-the-railway-and-its-train-on-the-world-map.md), its Railway and Train. Everything else a Child meets when exploring on foot ([0029](./0029-islands-can-be-explored-on-foot.md)) was drawn only in explore mode, so the map gave no hint of it. The owner asked for every item, Attraction and actor in explore mode to be on the World Map too.

## What the World Map draws

The Island in view now also shows, at a sixth of their exploring size as the Dock and Railway are (`IslandAdventureOnMap` in [`island-map-adventure.tsx`](../../src/client/islands/island-map-adventure.tsx)):

- **The trails** and the trail bridges the Island doesn't draw itself.
- **The props:** watchtowers, fact signs, hideaways, trail lamps and bounce pads.
- **The treasure** still to find. Treasure the Child has found is left off, as it is in explore mode.
- **The Ring Race rings**, every race's rings at rest, with the first ring of each in its start colour.
- **The Island's Friends**, hopping about as they do when exploring.
- **The Wonders:** the windmills, the balloon, the walk-behind falls, the lantern cave's crystals, the Wonder grove and the rest.
- **Every Attraction and Curiosity**, in far detail, with its moving parts where they rest and its people and animals where they start their walk (`MapAttractions` and `buildMapAttractionsGeometry` in [`island-attractions-models.tsx`](../../src/client/islands/island-attractions-models.tsx)). Their lights, beams and smoke are left off.
- **The Island Quest:** every Islander, thing and Find at once, the things looking as the Child's Puzzles have left them, rather than only those near the Character.

The Character, a Vehicle the Child has out and the craft of a journey in progress belong to one visit to an Island, so they stay in explore mode, as the World Map's first test ("shows no Pet, Mount or Character") asks.

They are only to look at on the map. Their click handlers are left off (`chooseInstance` in [`island-explore-props.tsx`](../../src/client/islands/island-explore-props.tsx) gives none without an `onChosen`), so a tap on one falls through to the Region underneath, as a tap on the land does.

The props, trails, bridges, treasure and race rings moved out of `island-explore.tsx` into `island-explore-props.tsx`, which explore mode and the World Map both draw from, so the two can't drift apart.

## Within the budget

Explore mode draws each Attraction and Curiosity as several meshes, near and far, with its moving parts, wanderers and smoke apart: about 230,000 triangles and 85 to 124 meshes an Island. Drawn that way the World Map would have reached about 650,000 triangles. On the map they are built once, in far detail, into one geometry with a group per finish, so they take one mesh and about 48,000 to 65,000 triangles.

Everything from explore mode together adds about 140,000 to 165,000 triangles and about 20 meshes to the Island in view. In a night storm the World Map now draws about 310,000 to 415,000 triangles (the most on Jungle Reach) and 54 to 82 meshes (the most on Meadow Isle). The World Map's budget is raised from 280,000 triangles and 64 meshes to **430,000 triangles and 84 meshes**, and its busiest view, Meadow Isle in a night storm with Regions chosen, pointed at and closed, fits inside it. A journey across the World Map (`VoyageCrossingScene`) is held to the same 430,000 triangles and 84 meshes. The raise is still to be confirmed by the owner on the weakest device ([performance budget](../performance-budget.md)).

## Consequences

- The World Map's things are drawn at true scale, a sixth of their exploring size, so the smallest (signs, lamps, treasure) are seen best zoomed in. The map's Train stays larger than life ([0047](./0047-the-railway-and-its-train-on-the-world-map.md)).
- The map's Attractions stand still. Their moving parts, wanderers and smoke move only in explore mode.
- Only the Island in view shows them; the distant Islands stay low-detail shapes.
- If the raised budget proves too much for the weakest device, the first things to draw more simply are the Quest's Islanders and things (about 26,000 triangles) and the Wonders (about 20,000 to 33,000).
