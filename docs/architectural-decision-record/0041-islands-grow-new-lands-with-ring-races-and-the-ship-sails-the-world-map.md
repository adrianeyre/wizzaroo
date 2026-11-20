# Islands grow new lands with Ring Races, and the ship sails the World Map

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Supersedes in part [0040](./0040-islands-have-three-times-the-land-and-a-ship-sails-between-their-docks.md).

Superseded in part by [0068](./0068-fifteen-more-attractions-on-the-far-reaches-of-every-island.md): each new land now reaches on into a far reach, and the columns of Islands are 236 apart.

After 0040 shipped, the owner reported that nothing on the World Map had changed, that they could see no Docks or ship, and that exploring only made the Character smaller so it had to walk further. They asked for the land itself to be expanded with new and exciting things to do, for each Island to be at least three times bigger in area, for the Docks and the ship to be on the World Map, and for the Character to stop walking through the ship's cabin.

## The land grows, not the scale

0040 tripled the land by drawing everything √3 bigger, which shrank the Character against the trees, landmarks and Regions. That is undone: `exploreScale` is 6 again, so the Character, trees and props are their size from [0037](./0037-islands-are-explored-at-six-times-their-map-size.md).

Instead, every Island gains **two new lands**, one east and one west of its old coast (`buildSideLands` and `extendWithNewLands` in `src/client/world-map-terrain.ts`). Each new land is a large lobe of rolling ground with three hills, joined to the old coast by a strip of land where the old coast reaches furthest out, so the Character can walk onto it. The Island's height is the higher of its old ground and the new lands', so nothing on the old Island moves or changes, and the lighthouse rock, islets and river mouths stay in the sea. Each Island now has 3.0 to 3.6 times the land it had (a test samples every Island to check this). The new lands are painted by the Island's own ground painter, and the Island's main trees are scattered over them too, inside the same instanced mesh.

The World Map draws the bigger Islands at their true size, so they are spread further apart (the columns are now 172 apart instead of 84), and the terrain grid, picking grid, sea and sea-depth texture are wider. The overview camera, whole-map view, furthest zoom, camera far plane and fog all reach further so a whole Island and the whole map still fit. Exploring keeps the Character inside a rounded rectangle that covers the new lands rather than an ellipse.

## New things to do on the new lands

Each new land has:

- **A loop trail**, joined to the old trails across the strip of land.
- **A Ring Race** around the loop (`src/client/islands/island-races.ts`): eight glowing rings and a time limit. Running through the gold first ring starts the race, the next ring to reach grows and pulses, the HUD counts rings and seconds, and finishing in time shows the time taken. Running out of time ends the race until the Child runs back through the first ring. The explore bar counts the races won.
- **A watchtower**, four fact signs on National Curriculum topics for the Island's Year, four hideaways, three more friendly animals, twenty treasures and four bounce pads, with trail spurs to the signs, hideaways and watchtower.

So each Island now has 7 lookouts, 24 fact signs, 20 hideaways, 12 animals, 100 treasures, 20 bounce pads and 2 Ring Races. As before, the places were found by sampling the new lands for dry, gentle ground as far as possible from everything else, and each trail and spur was checked to be dry.

## Docks and the ship on the World Map

The Dock is now drawn in each Island's land group, so it shows on the World Map and, scaled with the land, in the explore scene (where 0040 drew it separately). Choosing another unlocked Island's Year on the World Map, or tapping it in the sea, now starts a voyage instead of flying the camera: the ship sails into the Dock of the Island in view, waits to pick the Child up, pulls away, sails the sea lane to the other Island and into its Dock, with the camera following it (`MapVoyage` in `src/client/islands/island-map-voyage.tsx`). **Fast forward** skips straight to the other Island. A locked Island's Year still just flies the camera there. The explore scene's crossing uses the same `MapVoyage`.

The sea route now starts where the ship finishes pulling away from one Dock and ends where it starts sailing into the other, so the World Map voyage and the explore voyage run on without the ship jumping back to the berth.

## The ship no longer passes through the Character

When the ship left the Dock it turned on the spot beside the pier, so its hull and cabin swept through the Character waiting there. It now pulls three quarters of its length away from the pier before it turns. While it is still beside the pier and the Child can walk, its hull is solid (`listShipBlockers`).

## Budgets

Three times the land costs triangles: the wider terrain alone adds about 21,000, and the new lands' trees, places and rings add more. The explore budget goes from 200,000 triangles and 95 meshes to **260,000 triangles and 96 meshes**, and the World Map from 200,000 triangles and 62 meshes to **260,000 triangles and 63 meshes**. To keep Meadow Isle well inside them, its broadleaf trees draw their smallest clump of leaves with fewer triangles, its new lands have fewer broadleaf trees than the old land, and bounce pads use fewer segments. These limits were set before anyone measured the real devices ([performance budget](../performance-budget.md)), so the owner should check the new numbers on the £150 phone and the 2019 iPad.

## Considered Options

- **Growing the scale again**: this is what the owner said made the Character smaller rather than the Island bigger.
- **One ring of new land all round each Island**: it would have swallowed Meadow Isle's lighthouse rock, every islet and the mouths of the rivers and lava flows.
- **More trees at the old density on the new lands**: about three times the trees would be far over any reasonable budget.

## Consequences

- Exploring is 132,000 to 247,000 triangles and 68 to 96 meshes; the World Map 133,000 to 223,000 triangles and 30 to 60 meshes. Meadow Isle is the busiest.
- The Islands are further apart on the World Map, so panning between them takes longer; the Year buttons and the ship make up for it.
- The new fact signs, hideaways, animals' greetings and race messages are text, like those before them.
