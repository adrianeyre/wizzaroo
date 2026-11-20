# A hovercraft, a submarine and the Wizzaroo flag on every Island and aircraft

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

After [0043](./0043-aeroplanes-and-helicopters-fly-between-runways-and-helipads.md), a ship, an aeroplane or a helicopter carried the Character between Islands, and only the ship flew the Wizzaroo flag. The owner asked:

- for the flag's crest and the Wizzaroo name on the aeroplane and the helicopter
- for the flag somewhere on every Island
- for a detailed, professional-looking hovercraft that comes onto the land to pick the Character up and hovers across to the other Island
- for a detailed, professional-looking submarine that surfaces at the Dock, picks the Character up and travels under the water to the other Island
- for both to join the craft the Year buttons choose from at random

The owner also raised the mesh budget for exploring an Island from 96 to 150 ([0044](./0044-new-lands-are-filled-with-rivers-a-walk-behind-waterfall-and-a-lantern-lit-cave.md) records the new limit), which let the flag and the livery be meshes of their own instead of being squeezed into existing ones.

## Five craft, one journey

The hovercraft and the submarine reuse the seven phases of the journey, like the aircraft did. `transports` in `island-journey.ts` now holds five craft, and `chooseTransport` picks each a fifth of the time. Their paths, the walk aboard, the blockers and the camera are pure functions in `island-sea-craft.ts`; `island-journey.ts` sends each question to the ship's, the aircraft's or the sea craft's functions.

- **The hovercraft** needed somewhere to come ashore. Every Island's coast drops about two map units within one, far too steep for a craft to climb, so each Island has a **hover slipway** (`hoverPad` in its adventure): a spot on gently sloping dry land, with a concrete ramp running from the coast down into the sea at one in five and open water beyond. The spots were found by searching each Island for land whose seaward run reaches deep water within a few units, keeps below the line of the ramp, and stays clear of Regions, sights, adventure places, the airfield and the Dock's pier and approach. The slipway's points join the adventure places, so scenery keeps off it, as it does the Runway. The hovercraft rides over whichever is highest: the ground, the ramp or the sea (`findHoverSurface`). It pitches and rolls with the surface under it, settles as its skirt goes down, lowers its bow ramp for the Character, and on leaving puffs its skirt up, backs down the slipway, turns round on the water and hovers out to sea.
- **The submarine** berths beside the Dock's pier on the ship's side, close enough for a short brow (a gangway) to reach the pier at the pier's height. It comes in from deep under the sea, rises to the surface as it slows, slides out its brow and opens its hatch; the Character walks across the brow and climbs down the hatch. It swings away from the pier, turns and dives. Crossing the World Map, it runs at periscope depth so that only its masts show above the waves. Tests check it never touches the seabed on any Island.
- Both cross the World Map along the ship's sea lane (`buildSeaRoute`, shared with the ship), the hovercraft just above the waves.

## The Wizzaroo livery

The flag and the name are painted from one 512 × 384 canvas texture: the flag in the top two thirds and the gold Wizzaroo lettering, on a clear background, below (`drawWizzarooLivery` in `wizzaroo-flag.ts`). Each craft has a **livery** mesh of decals, grids of 24 × 10 cells laid onto its own lofted surfaces by casting a ray onto the surface at every corner (`island-livery.ts`), so they follow the curve of a fuselage, boom, duct or hull. The decals are a third mesh on each craft, drawn transparent with a polygon offset so they sit on the paint without flickering.

- The aeroplane carries the flag on both sides of its fin, replacing the old sun logo, and the name along both sides of the fuselage above the windows.
- The helicopter carries the flag on both sides of its engine cowling and the name along its tail boom.
- The hovercraft carries the name on its cabin and the flag on each propeller duct; the submarine carries the flag on its sail and the name on its hull.

## The flag on every Island

A white flagpole on a stone plinth stands beside the landward end of every Dock, on the side away from the berth, flying the waving Wizzaroo flag out to sea (`island-flagpole.ts`). The pole is merged into the Dock's mesh and the cloth reuses the ship's waving flag. It is drawn when exploring. The World Map draws the slipway but not the flag: its own budget of 63 meshes and 4 MiB of textures is already full on Meadow Isle, and at the World Map's scale the flag would be a few pixels.

## Detail

- The hovercraft is about 10,000 triangles: a lofted buoyancy hull and cabin, a skirt with fingers that stretches down by the height of its cushion as it lifts, twin ducted propellers with guards and rudders, a lift-fan intake, rails, lifebuoys, fenders, lights and a turning radar. Its skirt, ramp, propellers and radar are its moving parts.
- The submarine is about 9,000 triangles: a hull of revolution with anti-fouling, boot-topping, draught marks and limber holes, a tiled casing deck, a sail with sail planes and masts, a cruciform tail, a sonar dome, cleats and hatches. Its seven-bladed propeller, hatch and brow are its moving parts.
- Each livery is under 2,000 triangles, and each slipway about 1,000, merged into the Dock's mesh.

## Consequences

- Each craft is now three meshes rather than two. With the new lands of [0044](./0044-new-lands-are-filled-with-rivers-a-walk-behind-waterfall-and-a-lantern-lit-cave.md), Meadow Isle peaks at 107 meshes and about 279,000 triangles with the aeroplane, inside the budget of 150 meshes and 300,000 triangles.
- The slipways are a new kind of place on every Island. Choosing a new spot later means rerunning the same search and checking the hovercraft tests in `island-sea-craft.test.ts`.
- The Character swims rather than walks on the part of a slipway that runs out over the sea, because the walker only knows the ground and bridges. Nothing takes the Character there.
