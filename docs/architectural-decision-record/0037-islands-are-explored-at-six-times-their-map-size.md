# Islands are explored at six times their map size, with more to find

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Superseded in part by [0040](./0040-islands-have-three-times-the-land-and-a-ship-sails-between-their-docks.md): Islands now have three times this land, at about 10.4 times their map size.

The owner asked for every Island to be three times bigger than it already was when explored, with more features on each.

Exploring now draws the Island at **six times the size it has on the World Map**: `exploreScale` in `src/client/islands/island-adventures.ts` goes from 2 to 6. Everything [0030](./0030-islands-are-explored-at-twice-their-map-size.md) set up still holds: one scale applied at the `findExploreAdventure` boundary, the ground's height grows with it so slopes stay as steep, the Islands' own landmarks and drawn bridges grow, and the Character, trails, signs, hideaways, bounce pads, treasures and watchtowers stay at the Character's size. The World Map itself is unchanged.

Growing the scale three times over needed a few follow-on changes:

- **Lookouts on landmarks can still be reached.** A landmark lookout (such as the lighthouse) blocks the Character at `lookoutBlockRadius × exploreScale`, which at six times was further out than the old 3.6 reach. The lookout reach is now that radius plus 1.2, so walking up to the lighthouse still offers to climb it.
- **The camera pulls further back.** Bird's eye goes from 30 to 45, and Wide never comes closer than 30.
- **Clouds spread over the bigger Island.** `Clouds` takes the `landScale`, so they sit above the higher peaks instead of in the middle of them.
- **Trees keep only a small clearance from adventure props.** Scatters used to keep their full landmark clearance (up to 4.8) from every sign, hideaway, watchtower and bounce pad. With twice as many of those, that would have cleared whole forests from the World Map. Scatters now keep their full clearance from Regions and landmarks, and a 1.4 clearance from adventure props (`propPlaces` in `scatterAcrossLand` and `listScatters`).

Each Island also gained:

- **A fourth lookout**, a new watchtower to climb.
- **Four more fact signs**, twelve in all, on National Curriculum topics for the Island's Year: minibeasts and evergreen trees on Meadow Isle, penguins and the seven continents on Frost Isle, hieroglyphs and the Nile on Sunscorch Sands, vertebrates and the Maya on Jungle Reach, Mary Anning and Pompeii on Ember Isle, how light travels and the Moon landing on Starfall Isle, among others.
- **Four more hideaways**, eight in all, such as the Rabbit Warren, Seal Rock, the Scribe's Tent, the Sloth Tree, the Blacksmith's Forge and the Battery Hut.
- **Twenty more treasures**, forty in all, and **three more bounce pads**, nine in all.
- **New trail spurs** that lead from the trails to each new sign, hideaway and watchtower.
- **Three new sights on the land**, also on the World Map: a penguin colony, a snowman family and a research hut on Frost Isle; an obelisk, a desert camp and a well on Sunscorch Sands; giant flowers, a step pyramid and a treehouse on Jungle Reach; a geyser, a fossil dig and obsidian spires on Ember Isle; a rocket on its launch pad, a radio dish and an orrery on Starfall Isle. Meadow Isle gained three farm hamlets of four cottages each, one of them on the islet.

As in 0030, the new places were found by sampling each Island's ground for dry, gentle spots as far as possible from Regions, landmarks and each other. Each spur was checked to be a dry straight line to a trail, and the positions were then written into the data.

## Considered Options

- **Rewriting every Island's coordinates at three times the size, and drawing the World Map at a third**: every landmark, glow and marker on the map would need scaling back up, and the map's look would change for nothing the explore boundary doesn't already give.
- **Keeping trees and houses at their old size and scattering nine times as many**: the explore scene would be far over its 200,000-triangle budget.
- **New meshes for Meadow Isle's sights (a windmill, beehives)**: the World Map with Meadow Isle in view was already at its 60-mesh limit, so Meadow Isle's new sights reuse the instanced cottages. To make room for that farmland in the explore budget, Meadow Isle has 180 pines instead of 200.

## Consequences

- The explore scene is now 65 to 93 meshes and 90,000 to 199,000 triangles, still inside its 95-mesh, 200,000-triangle row in the [performance budget](../performance-budget.md). Meadow Isle has almost no room left.
- Crossing an Island on foot takes about three times as long as it did.
- One shadow map now covers an Island three times as wide, so shadows are softer, especially the Character's own.
- Like the signs before them, the new fact signs and hideaway descriptions are text. Recording them as voice-over is the same follow-up as in 0029.
