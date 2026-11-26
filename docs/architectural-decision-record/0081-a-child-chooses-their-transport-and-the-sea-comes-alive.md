# A Child chooses their transport, and the sea comes alive

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

After [0080](./0080-a-dragon-a-blimp-scuba-diving-surfing-and-windsurfing.md), fifteen ways carried the Character between Islands, one picked at random each time. The owner asked for four changes, in one pull request:

- a **Transport** item in the World Map's Menu, opening a side panel with **Random** first and then every craft; Random is chosen until the Child picks a craft, and then that craft fetches them every time
- a **shark**, a **sea lion** and a couple of **dolphins** on the scuba crossing, high-resolution and professional-looking
- surfing on a **massive wave that the Character rides**, not one behind them
- the **windsurfer's sail** no longer docking under the jetty

## Choosing the transport

**Transport** sits in the Menu after **Islands**, a side panel like **Weather**: **Random** first, then the fifteen in `transports` order, each with a small line icon (`transport-icons.tsx`) and its name, the chosen one lit. The Menu item shows the chosen one's icon.

The choice is kept in this browser (`wizzaroo.transport` in local storage, through `transport-choice.ts`), like the minimised button groups, not on the server: it is a per-device preference, not progress, and it needs no Parent's say. Random is the default, and is stored by removing the key, so anything unreadable or unknown falls back to Random. Both places a journey starts, choosing an Island on the World Map and the Year buttons while exploring, call `pickTransport`, which sends the chosen craft or, for Random, `chooseTransport` as before. Exploring has no Menu, so it reads the kept choice.

## The shark, the sea lion and the dolphins

The three animals are modelled in `island-sea-life-design.ts`, apart from the underwater scene, so they can be checked without drawing it. Each body is a loft of about a hundred superellipse sections, closer together at the nose and tail, its top, underside and width shaped separately so a dolphin gets its rounded beak and steep melon and a sea lion its muzzle, skull and neck. Every fin is an airfoil loft with real thickness, tapering, swept and, for the shark's and dolphin's dorsals and tails, hooked back. Skin is painted per vertex and smooth-shaded: countershading with a soft waterline, a dolphin's cape, a sea lion's paler chest and muzzle. Detail too fine for vertex colour (a shark's five gill slits and mouth, a dolphin's smile and blowhole) is thin geometry laid on the skin, not paint, which would come out blocky. Eyes have a lid, a dark ball and a glint; the sea lion has whiskers and ears.

- **Two dolphins** catch the diver up side by side, beating their flukes in time, and race on ahead, the far one rolling over, both rising towards the light. They replace the single low-detail dolphin.
- **The sea lion** swims in from the blue, corkscrews round the diver on its long front flippers, which are separate meshes so they can beat, and darts away.
- **The shark**, a grey reef shark, cruises slowly the other way further out and deeper, its tail sweeping side to side. It never comes at the diver.

Two new ways of moving in the current drive them on the GPU: **swish**, a tail sweeping side to side behind a pivot, and **kick**, flukes beating up and down. They meet at different times, so no more than two are near the diver at once. The scene keeps to its triangle budget for tablets.

## Riding the wave

Before, the board sat on flat water in front of the wave. Now the wave lifts the board up onto its face as it grows (`surfRideLift`) and carries it there across the World Map, setting it back down as it dies away at the other Dock. The wave stands on the board's +x side at an angle to its path, its face looking forward and out, so the Character rides diagonally down the line on the open shoulder just ahead of where it is breaking: the barrel curls behind them and the lip arcs high overhead, never through them. The board lies along the face, nose dipped and leaning into the wall of water (`surfRidePitch`, `surfFaceRoll`); the Character takes half that lean, standing straighter than their board, as surfers do. `placeSurfWave` undoes the board's tilt, so the wave stands level on the sea whatever the board does.

## The windsurfer's berth

The windsurfer's sail is on its +x side. Every craft berthed on the Dock's berth side, which on four of the six Islands put the pier on that side too, so the sail swung under the jetty and the Character stepped aboard through it. The windsurfer now berths on whichever side of the pier keeps the pier on its windward (−x) side (`findBoardFrame`), so its sail always stands out over open water and the Character steps on from the side away from it.

## Consequences

- A test checks every point of the windsurfer's sail is clear of the pier, or above its deck, at every Island while it docks, waits and leaves.
- The surfboard's World Map route rides at the wave's height, not sea level.
- The Transport choice is per browser: another tablet, or a cleared browser, starts at Random again.
