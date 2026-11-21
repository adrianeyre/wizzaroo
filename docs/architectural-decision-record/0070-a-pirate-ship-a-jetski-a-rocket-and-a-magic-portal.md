# A pirate ship, a jetski, a rocket and a magic portal

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

After [0043](./0043-aeroplanes-and-helicopters-fly-between-runways-and-helipads.md), [0045](./0045-a-hovercraft-a-submarine-and-the-wizzaroo-flag-on-every-island-and-aircraft.md) and [0050](./0050-a-hot-air-balloon-floats-between-balloon-fields.md), six craft carried the Character between Islands. The owner asked:

- for a high-quality, professional-looking pirate ship, flying a skull-and-crossbones flag
- for a high-quality, professional-looking jetski
- for a high-quality, professional-looking rocket
- for a portal that the Character walks through to reach the other Island
- for the Wizzaroo name and logo on every one of them

## Ten ways to travel, one journey

All four reuse the seven phases of the journey, the walk aboard, the camera and the blockers. `transports` in `island-journey.ts` now holds ten, and `chooseTransport` picks each a tenth of the time. None needed a new landing place on the Islands: each uses one that every Island already has, levelled and kept clear of scenery.

| Craft       | Comes in at                     | Its journey is worked out in                | Modelled in                    |
| ----------- | ------------------------------- | ------------------------------------------- | ------------------------------ |
| Pirate ship | the Dock, at the ship's berth   | `island-voyage.ts`, exactly as the ship     | `island-pirate-ship-design.ts` |
| Jetski      | the Dock, beside the pier's end | `island-sea-craft.ts`, as a third sea craft | `island-jetski-design.ts`      |
| Rocket      | the Helipad                     | `island-flight.ts`, as a fourth aircraft    | `island-rocket-design.ts`      |
| Portal      | the Balloon Field               | `island-portal.ts`, a module of its own     | `island-portal-design.ts`      |

`isShipLike` sends the ship and the pirate ship down the same path, so the pirate ship berths, slides out the gangplank and sails the sea lane just as the ship does (a test checks every phase matches). Only one craft comes at a time, so the pirate ship and the jetski share the Dock with the ship and the submarine, the rocket shares the Helipad with the helicopter, and the portal opens on the Balloon Field.

- **The pirate ship** is a three-masted galleon built to the ship's length, beam, berth and deck height, so the Character walks the same gangplank onto the same spot. Its waist deck is at the ship's deck height, with an entry port cut in the bulwark where the gangplank lands.
- **The jetski** zooms in from the sea in a carving curve, nose up while it is fast, and stops alongside the end of the pier. The Character steps down from the pier onto its footwell, just behind the handlebars, and rides it standing, in view, like the balloon's basket (`isRidingInView`). It leaves with a swing out from the pier, a turn and a burst of speed, and skims the sea lane on the World Map, nose up and bouncing. A rooster tail of spray kicks up from its jet while it is under way (`findJetskiSpray`).
- **The rocket** comes down engine first onto the Helipad, slowing on a landing burn, and stands on the feet of its four fins. Its stair folds down from the hatch, the Character climbs aboard, the stair folds up against its side and the hatch closes, and it blasts off straight up. On the World Map it arcs high over the sea: nose first while it climbs, flipping over the top of its arc, and engine first as it comes down (`findCrossingCraftPlacement`). Its engines burn while it lands, while it climbs away and at both ends of the crossing (`findRocketBurn`).
- **The portal** opens on the Balloon Field while the Character waits. It grows up around a swirling disc of light; the Character walks up onto its dais and into the light, and is hidden. The portal closes behind them to a wisp of light that shoots into the sky, streaks across the World Map on a high arc, falls onto the other Island's Balloon Field and opens there, and the Character walks out of it (`findPortalOpening`, `findPortalPlacement`). The two sides of its ring are solid while it stands; the way through the middle is not.

`CraftPose.opening` carries the portal's opening instead of a door's, and `CraftPose.burn` the rocket's burn and the jetski's spray. `VoyageCraft` can now scale a craft's body and livery about a point (`scaleBody`), which the portal uses to grow and shrink; its glow meshes can be drawn on both sides, which the spray needs.

## The models

- **The pirate ship** (`island-pirate-ship-design.ts`, about 19,700 triangles): a lofted hull with tumblehome, in planked brown timber with black wales, red-and-gold upperworks and a gold sheer rail; a raised forecastle and a quarterdeck and poop deck stepping up to a stern gallery of lit windows, a gold balcony and three stern lanterns; gunports with gold frames, red lids and cannons; three masts with fighting tops, yards and billowed square sails in cream canvas with red bands, a jib and a spanker; shrouds, ratlines and stays; a bowsprit and a gold scroll figurehead set with a purple gem; anchors, a ship's wheel, a capstan, a grating, barrels and a treasure chest of gold coins. It flies waving flags: the **Jolly Roger** at the main masthead and the stern, painted at runtime in `jolly-roger-flag.ts` (a white skull over crossed bones on black), and the Wizzaroo flag at the fore and mizzen mastheads. Its timber takes the `timber` grain.
- **The jetski** (`island-jetski-design.ts`, about 5,100 triangles): a lofted deep-V hull, raked at the bow, in white with a purple and gold stripe and a non-slip deck; a purple cowl with headlights, a tinted windscreen and mirrors; a padded black saddle with purple piping and a grab handle; handlebars that turn as it leans; a jet nozzle with a gold ring; and the spray as a glow of its own.
- **The rocket** (`island-rocket-design.ts`, about 16,000 triangles): a lathed white body with gold bands, a night-blue crew band of ten round windows framed in silver, a purple and violet ogive nose with a gold tip and an antenna; four swept purple fins that reach the ground as its landing legs, on padded feet; three engine bells; a hatch that swings open and a stair with gold handrails that folds down from it; and a flame for each engine that lengthens and flickers as it burns.
- **The portal** (`island-portal-design.ts`, about 3,600 triangles plus its light): a ring of carved stone blocks flecked with moss, set with violet rune stones, on a round stepped dais with a gold ring and glowing runes; stone feet with gold caps and two lamp posts; a gold keystone; six rune stones that orbit the ring; and a spiralling disc of white, violet and cyan light with a bright core. It takes the `stone` grain.

## The Wizzaroo livery

Every one carries the Wizzaroo name and logo, laid on as decals from the shared livery texture (`island-livery.ts`):

- the pirate ship: the name on both sides of its hull, the crest on both faces of its main course and on its stern
- the jetski: the name on both sides of its hull, the crest on both sides of its cowl
- the rocket: the name and the crest on three sides of its body, leaving the hatch side clear
- the portal: the crest on both faces of its keystone, the name on a plaque at the foot of its dais

The pirate ship's livery is drawn by `VoyageShip`, which now takes the ship to draw (`ship` or `pirateShip`), its flag hoists and whether it flies the Jolly Roger.
