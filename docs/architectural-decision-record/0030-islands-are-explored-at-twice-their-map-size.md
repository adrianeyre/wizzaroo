# Islands are explored at twice their map size, with more to find

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Superseded in part by [0037](./0037-islands-are-explored-at-six-times-their-map-size.md): Islands are now explored at six times their map size.

The owner asked for every Island to be twice its current size when explored, with many more things on it and more places for the Character to explore.

Exploring now draws the Island at **twice the size it has on the World Map** (`exploreScale` in `src/client/islands/island-adventures.ts`). The adventure data stays in World Map coordinates beside the landform it belongs to, and `findExploreAdventure` scales it at one boundary: positions and trails double, the ground's height doubles (so slopes stay as steep as before), the drawn bridges and the Islands' own landmarks (such as the lighthouse) double, and the Character, trails' width, signs, bounce pads, treasures and the new watchtowers stay at the Character's size. The map scene takes a `landScale`, which scales the land and its Regions while the sky, sun, sea and weather stay where they were; the sun's shadow reaches twice as far to cover the bigger Island. The World Map itself is unchanged.

Each Island also gained:

- **A third lookout**, a new watchtower to climb.
- **Four more fact signs**, eight in all, on National Curriculum topics that suit the Island (seasons and compass points on Meadow Isle, glaciers and the Poles on Frost Isle, rock types and fossils on Ember Isle, day and night and gravity on Starfall Isle, and so on).
- **Four hideaways**, small camps and dens to find off the trails, such as Fox Hollow, the Snow Cave or the Rocket Workshop. Walking up offers "Explore …", which shows what the Child finds there. The bar counts the hideaways explored in this visit, beside the treasures.
- **Twelve more treasures**, twenty in all, and **three more bounce pads**, six in all.
- **Trail lamps** standing every seven steps or so along the trails.

The new places were found by sampling each Island's ground for dry, flat spots away from Regions, landmarks and each other, then written into the data by hand-checked position, so they stay reviewable like the rest of the adventure.

## Considered Options

- **Doubling the Islands on the World Map too**: the six Islands would need moving apart, and the map is already near its 200,000-triangle budget. The map is for choosing where to go, so it stays as it is.
- **Shrinking the Character instead of growing the Island**: the same picture, but every walking, jumping, reach and camera constant would need halving, and the code would say "the Character is small" when the request was "the Island is big".
- **Rewriting every Island's coordinates at twice the size**: thousands of numbers to change in six landforms and their tests, for nothing a single scale at the boundary does not already give.
- **Keeping hideaways explored across visits**: ruled out for the same reason as treasures in [0029](./0029-islands-can-be-explored-on-foot.md) and [0010](./0010-rewards-without-nudges.md).

## Consequences

- The explore scene is now 60 to 90 meshes and 69,000 to 181,000 triangles, still inside its 95-mesh, 200,000-triangle row in the [performance budget](../performance-budget.md). Hideaways and trail lamps are instanced, one mesh each; each new watchtower is one mesh.
- Crossing an Island on foot takes about twice as long, which is the point, but the Bird's eye and Wide views now pull further back so the Child can still see where they are going.
- Shadows cover the whole bigger Island with the same shadow map, so they are a little softer close up.
- The sign facts and hideaway descriptions are text; recording them as voice-over is the same follow-up as in 0029.
