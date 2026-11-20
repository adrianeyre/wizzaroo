# Aeroplanes and helicopters fly between Runways and Helipads

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

After [0042](./0042-filled-new-lands-movable-pop-ups-a-gangplank-and-the-walker.md), the ship was the only way between Islands. The owner asked:

- for a Runway on every Island, and a detailed, professional-looking aeroplane that lands on it, takes the Character aboard, flies to the other Island and lands on its Runway, with **Fast forward**
- for a Helipad on every Island, and a detailed helicopter that lands on it, picks the Character up and flies to the other Island's Helipad
- for the Year buttons, on the World Map and when exploring, to choose the ship, the aeroplane or the helicopter at random

## One journey, three kinds of craft

The ship's voyage already had the right shape: the craft calls, the Character boards, it departs, crosses the World Map, comes in, the Character gets off, and it leaves. The aeroplane and the helicopter reuse those seven phases and the HUD's timers rather than adding a second state machine. A journey now carries a `transport` (`ship`, `aeroplane` or `helicopter`), and `island-journey.ts` sends each question (where the craft is, where the Character is, how long a phase takes, the route across the World Map) to the ship's functions in `island-voyage.ts` or the aircraft's in `island-flight.ts`. `chooseTransport` picks one of the three with equal chances whenever a Year button starts a journey; arriving carries the transport over, so the Character lands beside the same craft on the other Island.

- **The aeroplane** approaches on a glide slope of about one in six from well beyond the end of the Runway, flares, touches down twelve paces past the threshold and brakes to a stop at the Runway's middle. Take-off rolls from there, lifts off before the far end and climbs away. On the World Map it climbs to cruising height and banks into its turns.
- **The helicopter** flies in nose down, slows with its nose up, hovers and settles straight down onto the Helipad. It lifts straight up, dips its nose and flies off.
- **Boarding.** The Character waits beside the aircraft, well clear of the wings or the rotor. The door opens (the aeroplane's swings forward flat against the fuselage and its airstairs fold down; the helicopter's slides back), the Character walks to it, climbs in and is hidden until they step out on the other Island. Each aircraft is solid while it stands on the ground and not once it is flying.

## The Runway and the Helipad level the ground under them

No Island had a strip of land long and flat enough for a Runway. Rather than raising a Runway on an embankment, or letting it follow bumpy ground, the ground itself is levelled: `levelAirfield` wraps each Island's height function so it is exactly the Runway's or Helipad's level under them and blends back to the Island's own ground over 1.5 map units around them. Everything that reads the ground (the drawn land, the walking, the scenery and the bridges) uses the same wrapped function, so they always agree.

The spots were chosen by searching each Island for a strip, 15 by 3 map units, that is dry land inside the explore bounds, clear of Regions, sights, adventure places, water and, as far as possible, trails, with the least height to level and open approach and climb-out paths; and for a Helipad circle, 3.6 map units across, clear of all of those and the Runway. The airfield's points join the adventure places, so scattered trees, rocks and buildings keep off them. Tests check every Island's Runway and Helipad stay levelled, dry and clear of scenery, and that every approach, climb-out and route between Islands stays above the ground.

## Detail inside the mesh budget

Exploring Meadow Isle already used all 96 meshes its budget allows. So:

- **The Runway and Helipad are merged into the Dock's mesh.** Together they add about 3,400 triangles and no meshes: painted markings, Runway numbers worked out from the compass bearing each end points along, edge, threshold and Helipad lights, PAPI lights, two windsocks and a control tower.
- **Each aircraft is two meshes.** Its body is one merged mesh with painted vertex colours, like the ship. Its moving parts (the aeroplane's door and airstairs, the helicopter's rotors and door) are a second mesh whose vertices are moved on the CPU each frame from their resting positions (`island-moving-parts.ts`), so any number of moving parts still cost one mesh. While an aircraft is shown, the Character's shadow and the Ring Race rings hide, as they do for the ship.
- **Smooth shapes are lofted.** The fuselages, the helicopter's cabin, tail boom and cowling, and the engine nacelles are lofted through cross-sections, and the wings, fins, pylons and rotor blades through aerofoil sections (`island-lofts.ts`). Liveries and windows are painted per quad of the loft, so their edges run straight.

The aeroplane is about 14,100 triangles and the helicopter about 7,100. Meadow Isle now peaks at about 256,000 triangles and 96 meshes with the aeroplane, inside the 260,000 and 96 of the budget.

## Consequences

- A child who wants the ship can't choose it; they get whichever comes. The owner asked for this.
- Levelling changes the ground in a few places on every Island. Nothing that stood there before is moved, because the spots were chosen clear of it.
- The ship's code is unchanged apart from sharing its painting helper with the aircraft; the voyage tests still pass as they were, with the Year buttons now named "Travel to" in the explore bar.
