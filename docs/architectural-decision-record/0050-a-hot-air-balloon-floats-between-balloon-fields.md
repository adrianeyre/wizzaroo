# A hot-air balloon floats between Balloon Fields

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

After [0043](./0043-aeroplanes-and-helicopters-fly-between-runways-and-helipads.md) and [0045](./0045-a-hovercraft-a-submarine-and-the-wizzaroo-flag-on-every-island-and-aircraft.md), a ship, an aeroplane, a helicopter, a hovercraft or a submarine carried the Character between Islands. The owner asked:

- for a high-quality, professional-looking hot-air balloon to join the craft that carry the Character to another Island
- for the Wizzaroo name and logo on the balloon
- for new landing spots for it on every Island

## Six craft, one journey

The balloon is an aircraft like the aeroplane and the helicopter: `Aircraft` in `island-flight.ts` now holds `"balloon"`, and it reuses the seven phases of the journey, the walk aboard, the camera and the blockers. `transports` in `island-journey.ts` holds six craft, and `chooseTransport` picks each a sixth of the time.

- **Coming in.** It drifts in from the sea side of its Balloon Field, sinking as it slows, with a gentle sway, and fires its burners twice to soften the landing (`findBalloonLanding` and `findBurnerBlast`).
- **Boarding.** Its wicker basket has a little door on one side that swings outward (`placeBalloonDoor`). The Character walks through it and stands on the basket floor. Unlike the other aircraft, the balloon does not hide the Character inside: they ride in view, head and shoulders above the rim, all the way up and down (`isRidingInView` on its boarding way).
- **Leaving.** The door swings shut, the burners roar, and it rises almost straight up before drifting back out to sea (`findBalloonTakeOff`). Over the World Map it floats along the same kind of route as the other aircraft, but upright, without banking, and drifting away from the Field rather than flying forward off it. It flies slower than the helicopter, at 22 map units a second, within the shared four to nine seconds.

## Balloon Fields

Every Island's airfield gains a **Balloon Field** (`balloonField` in its `Airfield`, with a centre, a heading and a level), levelled like the Helipad within 1.6 map units (`balloonFieldFlatRadius`, `levelAirfield` in `world-map-terrain.ts`). Its centre and eight points around it join the adventure places, so scenery, wonders and props keep off it. The spots were found by searching each Island for dry ground that was already nearly flat, inside the explore bounds and clear of Regions, sights, places, wonders, the Railway and its Stations, the Helipad, and the Runway and its approach line. Each Field's heading points towards the Island's middle, so the balloon comes in from, and leaves over, the sea side.

The Field is drawn with the Dock, the Runway and the Helipad as one mesh (`island-airfield-design.ts`): a round mown pad in two greens, a white edge, a gold ring, the red-and-white landing cross that balloon competitions use as a target, eight pennants in the Wizzaroo purple and gold, and a windsock. The airfield grows to about 5,700 triangles.

## The balloon

It is modelled in `island-balloon-design.ts`, about 17,500 triangles for the body.

- **The envelope** is lofted from a natural teardrop profile in 16 gores. Each gore bulges a little between its load tapes, and the tapes are painted darker, as on a real envelope. It has a gold crown with a vent, purple and violet gores above, a deep night-blue band round its widest part edged with pale-gold stripes, harlequin gold and purple panels below, a dark scoop at the mouth and a skirt with a gold hem.
- **The Wizzaroo livery.** The night-blue band carries the Wizzaroo flag, the crest and the gold name, on the front and the back, and the gold Wizzaroo name on both sides, as decals laid onto the scalloped gores (`buildBalloonLiveryGeometry`). They are cast onto just the band of the envelope, which keeps building them quick. They share the 512 × 384 livery texture the other craft use, keeping within the 512-pixel limit on textures.
- **The basket** is one loft of rounded-square rings, painted in a basket weave, with a padded leather rim, a plank floor and the doorway cut out of it, framed in leather. Inside stand two fuel tanks in purple covers, and sandbags hang outside.
- **The burner frame** is held up on four padded flexi-rods. It has twin coiled burners with blast valves and a fuel hose, and sixteen flying wires running up to the mouth of the envelope.
- **The flame** is drawn as a glow: one small mesh painted from blue to white, yellow and orange, unlit and not tone-mapped, which `VoyageCraft` scales up while the burners blast and flickers. Craft can now give their own surface grain; the balloon uses a new `fabric` grain instead of `metal`.

On the ground the balloon adds four meshes (the body, the door, the livery and the flame), one more than the other aircraft. The World Map crossing stays within its 63 meshes.
