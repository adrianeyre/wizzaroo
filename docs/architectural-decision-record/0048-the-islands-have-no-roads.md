# The Islands have no roads

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Supersedes in part [0046](./0046-railways-roads-and-vehicles-on-every-island.md) and [0047](./0047-the-railway-and-its-train-on-the-world-map.md).

The owner asked for all the roads to be removed from every Island, on the World Map and when exploring.

## What goes

- **The road network.** Each Island's junctions and road ends are gone from `island-transport-plans.ts`, which now keeps only the Railway's route and its Stations. `island-roads.ts` and `island-road-design.ts`, which built the roads, their bridges, junctions and level crossings, are deleted.
- **Exploring.** The roads mesh is no longer drawn, and `buildExploreWorld` no longer adds the roads as lanes or their bridges to the world. The track and the platforms are still walked on.
- **The World Map.** The simplified roads are no longer merged into the Dock's mesh on the Island in view.
- **The track's levels.** The track was held level with the ground for 9 explore units either side of each road crossing. With no roads it is shaped only around the water, the Stations and the ground, as [0046](./0046-railways-roads-and-vehicles-on-every-island.md) describes.

The Railway, its Stations and Trains, and the Vehicles all stay.

## Consequences

- Trees, bushes, rocks and houses no longer keep 0.5 map units off the roads, so some that were left out come back on the World Map and when exploring. They still keep clear of the track and the Station buildings.
- A Vehicle drives fastest on the Island's trails, the track and bridges, and slower on other ground, as before; there are just no roads to drive along.
- Exploring draws one mesh fewer and about 5,600 to 11,600 triangles fewer, and the World Map's Island in view a few thousand triangles fewer. The budgets in `docs/performance-budget.md` are left as they are.
