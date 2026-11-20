# Islands have three times the land, and a ship sails between their Docks

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Superseded in part by [0041](./0041-islands-grow-new-lands-with-ring-races-and-the-ship-sails-the-world-map.md): the scale is 6 again, and the Islands grow new lands instead; the Docks and the ship are on the World Map too.

The owner asked for every Island to have three times the land mass it has now, with many more interesting and fun places and things to explore; for every Island to have a Dock; for a large ship to sail into the Dock when the Child picks a different Year's Island, pick them up and sail them to that Island's Dock; and for a fast forward button that skips the sailing.

## Three times the land

"Land mass" is an area, so the Island's length and width each grow by √3, which triples the land. `exploreScale` in `src/client/islands/island-adventures.ts` goes from 6 to `6 * Math.sqrt(3)` (about 10.4). Everything [0037](./0037-islands-are-explored-at-six-times-their-map-size.md) set up still holds: one scale applied at the `findExploreAdventure` boundary, the ground's height grows with it, and the Character and the props stay at the Character's size. The World Map itself is unchanged.

Growing the scale again needed some follow-on changes:

- **Trails are drawn with one segment every 1.1 units of their length**, instead of 18 × `exploreScale` segments for every point. The old count grew with the scale and the number of points rather than with the trail's length, and drew the trails with about ten times more triangles than they needed.
- **Trail lamps are 13 apart instead of 7**, so the longer trails don't need more lamps than before.
- **A drawn bridge joins a trail within 0.035 × `exploreScale`** rather than a fixed 0.2. At the new scale, the end of one of Jungle Reach's rope bridges was further than 0.2 from the trail it carries, so the trail started in the river.
- **Watchtowers are one instanced mesh** rather than one mesh each, which makes room in Meadow Isle's mesh budget for the new Dock and animals.

## More to find

Each Island gained a fifth lookout (a new watchtower), four more fact signs on National Curriculum topics for its Year (sixteen in all), four more hideaways (twelve), twenty more treasures (sixty) and three more bounce pads (twelve), with trail spurs to each new sign, hideaway and watchtower. As in 0030 and 0037, the new places were found by sampling each Island's ground for dry, gentle spots as far as possible from Regions, landmarks and each other, each spur was checked to be a dry straight line to a trail, and the positions were then written into the data.

Each Island also gained **six friendly animals**, a new kind of thing to find: Lambs on Meadow Isle, Penguins on Frost Isle, Camels on Sunscorch Sands, Monkeys on Jungle Reach, Lizards on Ember Isle and Owls on Starfall Isle. They hop and look about on the spot (`src/client/islands/island-friends.tsx`, one instanced mesh per Island). Walking up to one offers "Say hello to" it, which shows its name and a fact about its kind, and the HUD counts the animals met. Like treasures and hideaways they count only for the session.

## A Dock on every Island

Every adventure has a `dock`: the land end and sea end of a pier, in World Map units, and the side the ship berths on. The pier is walkable: `buildDockPier` turns it into a flat bridge at a fixed deck height above the sea, so the Character can walk out along it from the trail spur that leads to its land end. A harbour hut, crates, bollards, a lamp and an anchor sign stand on and beside it (`buildDockGeometry`). Walking onto the pier offers "Visit the Dock", which tells the Child how to sail. Every Dock faces the sea between the two rows of Islands, and was chosen by sampling the coast for a gentle shore with deep water out past the pier's end and beside it, close to a trail and clear of Regions and landmarks.

## The voyage

The explore bar shows a button for each Island the Child can open, labelled by its Year. Choosing a different Island starts a voyage, a fixed sequence of phases (`src/client/islands/island-voyage.ts`):

1. **Calling**: the Character waits at the end of the pier while the ship sails in from the open sea to its berth beside the pier.
2. **Boarding**: the Character hops onto the deck.
3. **Departing**: the ship turns away from the pier and sails out to sea.
4. **Crossing**: the view changes to the World Map, and the ship sails from one Island's berth to the other's (`VoyageCrossingScene`). The route goes out from the Dock to the sea lane between the two rows of Islands, along it, and in to the other Dock, through a smooth curve, so no voyage crosses land. A crossing takes between 5 and 12 seconds.
5. **Docking**: on the new Island, the ship sails into its Dock with the Character on deck.
6. **Landing**: the Character hops onto the pier.
7. **Leaving**: the Child can walk again while the ship sails away.

The HUD owns the phase and moves on with a timer per phase; the scene draws each phase from how far through it is, using pure functions for the ship's placement and the Character's spot (`findShipPlacement`, `findCarriedSpot`). While the Child is carried, their controls, camera views and actions are hidden, and the camera watches the Dock. After the crossing, the World Map screen switches to exploring the new Island with an `arrival` of `"sailing-in"`, which starts it at the pier's end in the docking phase.

**Fast forward** shows during every carried phase. Before or during the crossing, it goes straight to the new Island with an `arrival` of `"skipped"`: the Character stands at the end of its pier and can walk at once. While docking or landing, it sets the Character down on the pier and lets the ship leave.

## Considered Options

- **Three times as wide, as in 0037**: the owner's words this time were "land mass", which is an area. Nine times the land would also make crossing an Island on foot three times slower again.
- **Drawing the crossing in the explore scene**: the explore scene draws one Island at the origin. The World Map already draws every Island in its place, so the crossing reuses it.
- **Walking the Character to the Dock before the ship arrives**: on the bigger Islands that can take minutes, so the Character is taken straight to the end of the pier when the ship is called.
- **Drawing the Docks on the World Map**: the World Map with Meadow Isle in view is at its mesh limit, and a pier is too small to read at map scale.

## Consequences

- The explore scene is now 67 to 95 meshes and 93,000 to 200,000 triangles, inside its 95-mesh, 200,000-triangle row in the [performance budget](../performance-budget.md). The voyage adds the ship and hides the Character's shadow, so the budget holds during a voyage too, and the crossing stays inside the World Map's budget. Meadow Isle has almost no room left.
- Crossing an Island on foot takes about 1.7 times as long as it did. The ship gives a quick way between Islands, but not round one.
- The new fact signs, hideaways and animals' greetings are text. Recording them as voice-over is the same follow-up as in 0029.
- The voyage, like exploring, earns nothing.
