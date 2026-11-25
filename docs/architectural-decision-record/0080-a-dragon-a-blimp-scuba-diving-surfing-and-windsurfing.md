# A dragon, a blimp, scuba diving, surfing and windsurfing

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

After [0070](./0070-a-pirate-ship-a-jetski-a-rocket-and-a-magic-portal.md), ten ways carried the Character between Islands. The owner asked for five more, each high-quality and professional-looking, and carrying the Wizzaroo name and logo where that makes sense:

- a **dragon** that flies in, lands and bows down so the Character can climb onto its back and sit for the ride
- a **blimp** that flies in, lands, and that the Character walks into
- **scuba diving**: the Character puts on a scuba outfit at the jetty and swims under the water all the way to the other Island, seen from under the water
- **surfing**: the Character gets on a surfboard at the jetty and a massive wave carries them to the other Island
- **windsurfing**

## Fifteen ways to travel, one journey

All five reuse the seven phases of the journey, the walk aboard, the camera and the blockers. `transports` in `island-journey.ts` now holds fifteen, and `chooseTransport` picks each a fifteenth of the time. None needed a new landing place:

| Way to travel | Comes in at                     | Its journey is worked out in                 | Modelled in                                          |
| ------------- | ------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| Dragon        | the Balloon Field               | `island-flight.ts`, as a fifth aircraft      | `island-dragon-design.ts`                            |
| Blimp         | the Runway                      | `island-flight.ts`, as a sixth aircraft      | `island-blimp-design.ts`                             |
| Scuba diving  | the end of the Dock's pier      | `island-scuba.ts`, a module of its own       | `island-scuba-design.ts`, `character-scuba-gear.tsx` |
| Surfboard     | the Dock, beside the pier's end | `island-sea-craft.ts`, as a fourth sea craft | `island-surfboard-design.ts`                         |
| Windsurfer    | the Dock, beside the pier's end | `island-sea-craft.ts`, as a fifth sea craft  | `island-windsurfer-design.ts`                        |

- **The dragon** glides in over the sea, flares with its wings spread and lands on the Balloon Field, then folds its wings and lies down: its body drops and tips forward about its hips and it bows its head to the grass (`placeDragonBody`). The Character steps up onto its folded foreleg and climbs onto the saddle, where they sit. It stands up with them on its back, spreads its wings, leaps and flies off, flapping, banking into its turns over the World Map. It bows again at the other Island so they can climb down.
- **The blimp** drifts down the Runway's approach and settles onto the Runway on its landing wheel. Its gondola door slides open and a step folds down; the Character walks up the step and in, and is hidden. It lifts straight up, then noses forward and climbs away, floating slowly over the World Map.
- **Scuba diving** isn't a craft. A Wizzaroo dive locker grows up on the Dock's pier. Its doors open; the Character walks to it and puts on its scuba gear, walks to the end of the pier and jumps in, then swims away under the sea. The crossing is drawn under the water (below). At the other Island they swim in to the end of the pier, climb out, hang the gear up in a locker that has grown there, and it shrinks away.
- **The surfboard** glides in beside the end of the pier on a small swell. The Character steps down onto it and lies on it; it turns, and they paddle out. A massive breaking wave rises behind them, they stand up, and the wave carries them off and across the World Map, dying away as they reach the other Dock.
- **The windsurfer** sails in beside the end of the pier. The Character steps on and takes the boom, and it sails away, heeling with the wind, across the World Map.

## The Character's stance

Until now a carried Character was either walking, standing still, or hidden inside. Riding a dragon, swimming and surfing need more, so the legs of `CharacterModel` now bend at the hips (`wand-leg` and `free-leg` pivots), and `character-stance.ts` holds six stances: standing, sitting astride, swimming, lying down to paddle, crouched surfing and leaning back on a windsurfer's boom. Each bends the legs and arms and tilts the figure; a held wand moves with its arm. `BoardingSpot` gains an optional `stance`, `gear` and the craft's `pitch` and `roll`, which a Character riding in view tilts with.

`CharacterModel` takes an optional `gear`. With `"scuba"` the hat, glasses and wand are put away and the Character wears a black wetsuit with Wizzaroo purple panels and gold piping, a mask, fins, and an air tank carrying the Wizzaroo name and crest.

## Riders on the World Map

The Character used to be drawn only on the Island. Seen on the World Map, an empty dragon or surfboard would look wrong, so `VoyageCraft` can now carry children, and `CraftRider` draws the Character, in their own look, sitting on the dragon, surfing, windsurfing, or swimming in scuba gear, moving and tilting with the craft (`findRiderPose`). From the World Map's own journeys, where no Character is being explored, it draws a plain Character.

## Under the water

While the Character dives between Islands the World Map is replaced by an underwater scene, `UnderwaterCrossingScene` in `island-underwater-crossing.tsx`: deep blue haze, the rippling surface overhead with light shafts slanting down, a sandy seabed with rocks, coral, kelp and sea grass, shoals of fish and other sea life, bubbles rising from the diver's regulator, and the pilings of the two Docks at either end. The camera follows the diver under the water. It lasts the crossing's usual time, worked out from the sea route between the two Docks, as any sea craft's crossing is.

## What else changed

- `VoyageCraft` can move a craft's body and livery by a matrix (`placeBody`), which the dragon uses to lie down, and its glow meshes can be lit like water rather than glowing like a flame (`isLit`), which the surf wave uses.
- `CraftPose.opening` carries the dragon's bow and the dive locker's doors, `CraftPose.burn` the dragon's wing spread, the surf wave's size and the dive locker's size, and `CraftPose.lift` the scuba gear on the locker's rack.
