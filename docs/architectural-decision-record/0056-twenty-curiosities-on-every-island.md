# Twenty Curiosities on every Island

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for twenty new, unique, fun and interesting things on every Island, all high quality and interactive, spread out over the Islands. They also asked for a water mill and a windmill. Thirty Attractions already stand on the new lands ([0055](./0055-attractions-on-every-island.md)). A hundred and twenty more of the same size would not fit there, and their far models alone would blow the exploring budget. So these are a new, smaller kind of thing: **Curiosities**.

## What a Curiosity is

A Curiosity is a small place to find and play with: a windmill, a wishing well, a penguin colony, a sphinx, a canopy walkway, a geyser, an observatory. Each Island has twenty of its own, in its own style, and none repeats an Attraction, a Wonder or another Curiosity. The one exception is the windmill: the owner asked for one, and Meadow Isle's Wonder windmill is only a small sight.

| Island          | Curiosities                                                                                                                                                                                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meadow Isle     | windmill, water mill, scarecrow, wishing well, giant sunflowers, frog pond, maypole, rabbit warren, haystack slide, snail race, weather station, picnic spot, bug hotel, bird table, butterfly garden, giant seesaw, telephone box, ice cream van, stepping stones, flower clock                                            |
| Frost Isle      | snowflake lab, igloo, penguin colony, polar bear den, husky sled, toboggan run, ice sculptures, snow globe, ice fishing hut, frozen waterfall, reindeer paddock, aurora viewpoint, ski lift, snow fort, walrus rocks, hot chocolate hut, icicle xylophone, arctic fox den, cuckoo clock chalet, frost fair                  |
| Sunscorch Sands | Nile felucca, sphinx, camel caravan, sundial, cactus garden, sandboard dune, meerkat mound, fossil dig, shaduf, spice market, magic carpet, scorpion rocks, tortoise pen, giant sandcastle, pharaoh's tomb, solar farm, compass rose, ostrich run, sand timer, Bedouin tent                                                 |
| Jungle Reach    | canopy walkway, mangrove boardwalk, toucan tree, monkey swings, giant lily pads, Maya temple, orangutan nest, tiger lookout, hippo wallow, drum circle, river raft, banana plantation, crocodile creek, circuit garden, bamboo chimes, snake tree, leafcutter ants, sloth hammock, flytrap patch, parrot perch              |
| Ember Isle      | geyser, lava tube cave, sleeping dragon, blacksmith's forge, Viking longship, Viking longhouse, crystal geode, mud pools, seismograph, orrery, gear machine, trebuchet, phoenix nest, steam engine, lava fountain, Greek theatre, Olympic torch, basalt columns, pulley lift, salamander rocks                              |
| Starfall Isle   | observatory, moon phase garden, satellite dish, UFO landing, meteorite crater, lunar rover, constellation garden, gyroscope trainer, rainbow prism, periscope, lightning tower, finch aviary, codebreaker hut, planet trail, wind turbines, moon bounce, space station frame, alien garden, robot workshop, Morse code lamp |

- **One file each.** Each Curiosity is a model in `src/client/islands/curiosities/`, built with the Attractions' kit, finishes and helpers. Its contract, `CuriosityModel`, is the Attractions' `PlaceModel` with three more things:
  - the Island it belongs on
  - a National Curriculum link, which every Curiosity has, ideally from its Island's own Year
  - a button for its card (`play`)
- **Placed and visited like an Attraction.** `listPlacedAttractions` returns an Island's Attractions and then its Curiosities. The Character's walls, decks, rides, signs, cards and tunes all work the same way for both. The post office sends parcels only to Attractions.

## Spread out over the whole Island

- **Anywhere, not only the new lands.** `island-curiosity-placing.ts` looks for sites across the whole Island, old lands and new. It uses the Attractions' rules: dry, nearly level ground, on a terrace, clear of the trails, rivers, Railway, Stations, airfield, Wonders and every Region, sight and place. It also keeps clear of where the Character starts.
- **A better random.** The Attractions' random number generator gives each number from the last too simply, so pairs of its numbers, used as x and z, fall on a few lines across the Island. The Curiosities use mulberry32, which reaches every part of it.
- **Furthest from everything.** For each Curiosity, biggest first, the placer finds up to 24 sites that fit. It takes the one furthest from every Attraction and Curiosity placed so far, less a little for bumpy ground. This "best candidate" choice spreads them out evenly instead of clumping them.
- **Gaps.**
  - A Curiosity keeps 42 beyond both footprints from any Attraction, so the two are never drawn in full at once.
  - It keeps 24 beyond both footprints from any other Curiosity.
- **Kept, not searched for.** `pnpm run generate:attraction-sites` writes the Attraction sites, and then, in a second process, the Curiosity sites, to `island-curiosity-sites.ts`. That way the Curiosities keep clear of the Attraction sites just written. A test checks every kept site still fits, and that the placer still finds the same ones.

## Fun to play with

Every Curiosity has something that reacts to the Character, and most have more:

- **Reacting motions.** Four new motions join the splash jets, each set off as the Character comes within its reach:
  - **whirl** turns slowly and speeds up near, like the windmill's sails, the water mill's wheel, an anemometer or the codebreaker's rotors. The drawer counts how far it has turned, so it speeds up smoothly.
  - **rise** pops something up, like rabbits from their burrows, the sluice gate, a fish from the ice hole or the periscope.
  - **nod** rocks something only when near, like the scarecrow's wave, the seesaw, a flytrap's snap or the trebuchet's arm.
  - **wake** grows something from nothing, like a lamp coming on, glowing crystals or the circuit garden's bulbs.
- **Have a go, walk on, listen.** Many have rides (a haystack slide, a toboggan run, a camel, a raft, a moon bounce), decks (stepping stones, giant lily pads, the frost fair's ice, the basalt columns) or a tune (the icicle xylophone, the bamboo chimes, the drum circle).
- **A button on the card.** Visiting a Curiosity opens its card with a fact and one button, such as **Grind some flour**, **Make a wish** or **Send an SOS**. Pressing it shows what happened for a few seconds, and plays its notes unless sound is muted.

## Within the budget

- **Smaller than an Attraction.**
  - footprint: 2.5 to 8
  - near model: up to 10,000 triangles, moving parts and animals included
  - far model: up to 800 triangles, as one still mesh
  - at most four moving parts and eight moving copies, two sets of wanderers and one plume of smoke
- **Drawn close up.**
  - **Near:** within 30 of the Character, with moving parts, wanderers and smoke.
  - **Far:** out to 130, the still mesh only, which keeps the silhouette with still stand-ins for its moving parts.
  - **Beyond 130:** not drawn.
- **Checked.**
  - `island-curiosities.test.ts` checks every model's triangles, footprint, moving parts, rides, curriculum link and that it is interactive. It also checks every Island's sites.
  - `island-explore.sweep.test.tsx` stands the Character at every Attraction and every Curiosity on every Island, and checks the exploring budget of 380,000 triangles and 150 meshes. Meadow Isle is still the busiest, at about 375,000 triangles and 118 meshes beside its school (up from 373,000 and 115), and at most 122 meshes anywhere.

## Consequences

- Every Island has a lot more to find, all over it, and every find teaches something and does something.
- A new Curiosity needs:
  - a model file
  - a line in `curiosity-models.ts`
  - its kind in `curiosityKindsByIsland`

  Then run `pnpm run generate:attraction-sites`.

- Curiosities are drawn only when exploring, not on the World Map.
