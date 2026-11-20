# Fifteen more Attractions on the far reaches of every Island

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Supersedes in part [0041](./0041-islands-grow-new-lands-with-ring-races-and-the-ship-sails-the-world-map.md).

The owner asked for an extra fifteen unique Attractions on every Island, on the land masses to its left and right (its two new lands, [0041](./0041-islands-grow-new-lands-with-ring-races-and-the-ship-sails-the-world-map.md)). They must be high quality, fun and exciting to explore, and show on the World Map and in explore mode. While they were being built, the owner added two things:

- "Please up the budget so I can have as good quality as the others."
- "Please make sure the character can not walk into objects of the new attractions."

## The new lands had no room, so they grow a far reach

The new lands were already full. Their trails, rivers, races, signs, hideaways, treasure, Wonders, five or six Attractions, Curiosities and Quest leave little level ground clear. Even packed as tightly as the rules allow, they had room for only six to eleven more Attractions of the first thirty's size.

So each new land grows on outwards, as the owner's earlier words ("bigger Islands" means more land, not a bigger scale) ask:

- **A far reach.** Beyond each new land's outer coast is a new lobe of rolling ground about 36 wide and 38 deep, from about 74 to 110 out from the Island's middle, with a low hill (`newLandFarReaches` in [`world-map-terrain.ts`](../../src/client/world-map-terrain.ts)). The Island's height is still the higher of its old ground and its new, so nothing on the land it had before moves.
- **A trail out and a loop round.** A spur runs from each new land's own trails out to its far reach, winding clear of everything already standing. Where it crosses the strait, the game lays a little trail bridge over the water, as it does for every trail. A loop trail runs round each far reach. Both were found once by a grid search over each Island's land, and are kept in [`island-far-reach-trails.ts`](../../src/client/islands/island-far-reach-trails.ts) like the Island's other trails.
- **Nothing else moves.** The Attractions, Curiosities, Quest and Wonder grove placed before were found inside the Island's first bounds and without these trails, and still are (`isInsideFirstLands` and `withoutFarReachTrails` in [`island-adventures.ts`](../../src/client/islands/island-adventures.ts)). Regenerating every one of their sites gives exactly the sites kept before.
- **Not bare.** Some of each Island's own scattered trees, bushes and rocks are copied onto its far reaches too, keeping clear of the Attractions, trails and water, as the new lands' are (`mirrorOntoFarReaches`).
- **The World Map spreads out.** The Islands' columns are now 236 apart rather than 172. The terrain grid (224 wide), picking grid, sea-depth texture, whole-map camera, furthest zoom, fog and camera far plane all reach further. The Islands out of view are drawn wider, and the sailing boat round Meadow Isle sails a wider loop.

## Fifteen Attractions of each Island's own

Each Island has fifteen in its own style, often from its own Year's National Curriculum. None repeats an Attraction, Curiosity or Wonder, and no two share a name.

| Island          | Its own fifteen                                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meadow Isle     | swan boat lake, bouncy castle, strawberry field, tractor train, sheepdog trials, village fete, pony stables, grass sledge hill, apple orchard, bluebell wood, puppet theatre, canal lock, duck race, kite hill, cricket pitch                              |
| Frost Isle      | ice palace, bobsleigh track, ski jump, snowball range, glacier bridge, curling sheet, polar research base, icebreaker ship, mountain rescue hut, snowmobile trail, seal lagoon, snow tubing hill, yeti cave, ice climbing wall, mammoth museum             |
| Sunscorch Sands | Stone Age village, Iron Age hillfort, chariot racetrack, desert fort, sand yachts, dune buggy track, date palm grove, papyrus workshop, sandstone arches, dinosaur park, Archimedes screw, pottery kiln, sand slide tower, windcatcher house, painted cave |
| Jungle Reach    | vine swing glade, strangler fig ruins, rainforest biome, stilt village, cacao farm, gorilla sanctuary, elephant pool, jungle coaster, bat cave, hummingbird garden, hydro power house, giant kapok climb, orchid house, high ropes course, insect house    |
| Ember Isle      | volcano museum, dragon boat lake, minotaur labyrinth, Greek temple, Sutton Hoo mound, glassblowing studio, geothermal plant, mine cart ride, chilli farm, Pompeii street, bronze colossus, firework tower, lava flume, obsidian quarry, dragon hatchery    |
| Starfall Isle   | planetarium dome, Mars base, drop tower, space shuttle, star flyer, mirror maze, camera obscura, astronaut centrifuge, Beagle ship, giant heart, home front house, lunar lander, black hole slide, shadow garden, inventors' hall                          |

- **One file each.** Each is a model in [`src/client/islands/new-land-attractions/`](../../src/client/islands/new-land-attractions/), built with the Attractions' kit, finishes and helpers. Its contract, `NewLandAttractionModel`, is the Attractions' `PlaceModel` plus:
  - the Island it belongs on
  - a National Curriculum link, which every one has
  - a button for its card (`play`), as a Curiosity has
- **As good as the first thirty.** The owner asked for the same quality, so they keep the first thirty's limits:
  - up to 16,000 triangles near and 6,000 far
  - up to six moving parts
  - footprints of 6 to 14

  A test also asks for at least 5,000 triangles near, so none is a sketch. They are drawn exactly as the first thirty are: in full within 40 of the Character, in far detail out to 300, with their moving parts, wanderers and smoke.

- **Fun to explore.** Every one has something that reacts as the Character comes near (a whirl, a rise, a nod, a splash or a wake), and something to do: a ride, a deck to walk on, or a tune. Most have rides, such as the Jungle Coaster's lap, the Drop Tower, the Lava Flume, the Bobsleigh Run or Ariadne's thread through the Minotaur Labyrinth. Its card's button, such as **Ring the rescue bell** or **Shine the laser**, shows what happened and plays its notes unless sound is muted.
- **Placed and visited like an Attraction.** `listPlacedAttractions` returns an Island's first Attractions, then its own fifteen (`family: "new-land-attraction"`), then its Curiosities. Their walls, decks, rides, signs, cards and tunes work the same way. The post office's parcels go to them too.

## Where they stand

[`island-new-land-attraction-placing.ts`](../../src/client/islands/island-new-land-attraction-placing.ts) places each Island's fifteen:

- every other one in the Island's list goes on the west new land, and the rest on the east, so eight stand on the west and seven on the east
- on dry, nearly level ground, on a terrace like the first thirty
- clear of the trails, rivers, Railway, airfield, Wonders, Regions and places, and of the hills over the tunnels
- 24 beyond both footprints from the first thirty Attractions, 12 from a Curiosity, 14 from each other, and 6 from the Quest's Islanders, things and Finds
- biggest first, each where it is furthest from everything placed so far, as the Curiosities are

All 90 land on the far reaches. `pnpm run generate:attraction-sites` writes their sites to [`island-new-land-attraction-sites.ts`](../../src/client/islands/island-new-land-attraction-sites.ts), last of all, after the Attractions, Curiosities and Quest. That way they keep clear of all of those, and none of those moves. A test checks every kept site still fits, and that the placer still finds the same ones.

## Solid, as the owner asked

The new Attractions are solid in explore mode in the same way as everything else ([0061](./0061-explore-mode-is-solid-worked-out-from-the-models.md)). Every triangle of each near model, and of its moving parts that stay put enough to bump into, is cut to the slice of air the Character's body fills and marked on the obstacle grid. Walls, fences, trunks, hulls, columns and stalls block the Character, and it slides along them. Where a model is meant to be walked on (a boardwalk, a ship's deck, a rampart, a temple's steps, a stage, a grandstand), it has a deck, with steps or ramps no steeper than the Character can climb. Every sign, and every ride's start and finish, stands on open ground.

- `island-solids.test.ts` checks every Island's Attractions are solid, every ride can be started, and every place to visit can be reached.
- `island-explore-solids.sweep.test.tsx` draws each Island and checks every part of every model at the Character's height is solid.

## Budgets

The owner asked for these to be as good as the first thirty and for the budgets to rise to fit, so they do ([performance budget](../performance-budget.md)). Measured with every Attraction, Curiosity, Quest site, craft and the start of every Island:

| Scene                    | Before                        | Now, at most                                                                      | Budget                                               |
| ------------------------ | ----------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Exploring an Island      | 380,000 triangles, 122 meshes | 428,106 triangles and 128 meshes, beside Meadow Isle's hedge maze                 | 440,000 triangles (was 380,000), 150 meshes          |
| The World Map            | 430,000 triangles, 84 meshes  | 493,979 triangles and 85 meshes, Meadow Isle in a night storm with Regions chosen | 510,000 triangles and 88 meshes (was 430,000 and 84) |
| A journey across the map | the World Map's               | 466,657 triangles and 79 meshes                                                   | the World Map's                                      |
| One Island drawn alone   | 260,000 triangles, 60 meshes  | 238,122 triangles and 37 meshes (Jungle Reach)                                    | unchanged                                            |
| The World Map's textures | 4 MB                          | under 4 MB, with the sea's depth texture now 448 × 176 to cover the wider land    | unchanged                                            |

- **In explore mode** the fifteen add no mesh until the Character is within 300 of them, and only one or two are drawn in full at once. The busiest spots are still on Meadow Isle's old lands, where the far reaches' Attractions are seen in far detail beyond the Island's own.
- **On the World Map** all of an Island's Attractions and Curiosities are still one mesh, so the fifteen add triangles but no meshes of their own; the wider terrain grid and the far reaches' trails and bridges add the rest.
- **Still to confirm.** As with the raises before them, these should be checked by the owner on the weakest device. If they prove too much, the first things to draw more simply are the far detail of the fifteen and the Quest's Islanders on the map.

## Consequences

- Every Island has 35 or 36 Attractions and Curiosities to find. Its two far reaches are a new place to explore, with a trail and a bridge out to each.
- The World Map is wider, so panning between Islands takes a little longer; the Year buttons and the journeys make up for it.
- A new one of these needs:
  - a model file
  - a line in `new-land-attraction-models.ts`
  - its kind in `newLandAttractionKindsByIsland`

  Then run `pnpm run generate:attraction-sites`.

- The cards' facts and buttons are text, like those before them; recording them as voice-over is the same follow-up as before.
