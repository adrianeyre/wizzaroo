# The Railway and its Train on the World Map

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Superseded in part by [0048](./0048-the-islands-have-no-roads.md): the Islands have no roads, on the World Map or when exploring. Superseded in part by [0049](./0049-british-engines-and-each-islands-own-carriages.md): each Island's Train is a British engine with its own carriages, drawn from the same models on the World Map.

After [0046](./0046-railways-roads-and-vehicles-on-every-island.md), the Railways and Trains were drawn only when exploring. The owner asked to see the Train on the World Map as well as when exploring.

## What the World Map draws

The Island in view on the World Map now shows its Railway and its Train, drawn at a sixth of their exploring size, as the Dock is.

- **The track** is simplified for the map's height: a wide ballast strip with one darker strip for the rails, every second sample, leaving out the sleepers and the separate rails (`buildMapTrackGeometry` in `island-railway-design.ts`). The bridges, tunnel mouths and Stations are the exploring ones. All of it is merged into the Dock's mesh (`mapRailway` on `IslandDock`), so it costs no mesh.
- **The Train** runs to the same timetable as when exploring, starting where it is coming into the Station nearest the middle of the Island, so it is in view when the map opens. Its locomotive and up to three carriages are simple boxes in the colours of the real Train's body and roof, with a chimney on the steam and narrow-gauge engines (`island-map-train.ts`). They are drawn 2.6 times their size, so the Train can be picked out from the map's height, and spaced along the track at that size. Those vehicles are one mesh, moved each frame as moving parts (`island-moving-parts.ts`). Moving the detailed Train's vertices every frame would have cost about 38,000 vertices a frame; the boxes cost about 150.

## Within the budget

Meadow Isle was already at 60 of the World Map's 63 meshes and 221,000 of its 260,000 triangles, and Jungle Reach at 225,000. The Railway adds about 19,000 to 23,000 triangles and the Train one mesh. The Island's roads, drawn simply and merged into the Dock's mesh too, and its bigger harbour add another 3,200 to 5,600 triangles and no mesh. In a night storm the Islands now draw about 160,000 to 249,000 triangles and 33 to 61 meshes. The World Map's budget is raised to 280,000 triangles and 64 meshes, and its busiest view, Meadow Isle in a night storm with Regions chosen, pointed at and closed, fits inside it.

## Consequences

- The map's Train is larger than life and simpler than the exploring one, as the map's Dock is ([0046](./0046-railways-roads-and-vehicles-on-every-island.md)).
- Only the Island in view shows its Railway; the distant Islands stay low-detail shapes.
