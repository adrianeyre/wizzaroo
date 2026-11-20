# Filled new lands, movable pop-ups, a gangplank and the walker

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

After [0041](./0041-islands-grow-new-lands-with-ring-races-and-the-ship-sails-the-world-map.md) shipped, the owner asked:

- for every pop-up (such as the one that says "All aboard!") to be movable with the mouse
- for the new lands to be filled with each Island's existing things, terrain and fun things to do
- for the Character to walk straight onto the ship along a plank the ship puts out once docked, rather than through its cabin
- for a walker button beside **Explore** that can be dragged onto the map to choose where the Character starts, as on Google Maps
- for every group of buttons on the World Map to minimise and maximise

## The new lands are filled with each Island's own things

- **Each Island's own scenery is copied onto its new lands.** Every scatter an Island has (its forests, rocks, ice chunks, boulders, ferns, basalt columns, crystal spires, igloo villages, market houses and so on) is copied in the same pattern, squeezed to fit, onto the new lands (`mirrorOntoNewLands`). Each thing lands on whichever new land its turn in the list gives it, and is kept only where the ground is dry and clear of water, trails, adventure props and sights. The copies join the Island's existing instanced meshes, so they cost no extra meshes. Meadow Isle keeps one in five of its pines, one in eight of its broadleaf trees, and half of its bushes and rocks, to stay inside its budget.
- **Each Island's sights appear again.** Every sight an Island has (such as Frost Isle's penguin colony, snowman family and research hut, or Starfall Isle's rocket pad, radio dish and orrery) is placed once more on each new land (`copySightsOntoNewLands`). A sight and its copies are drawn as one instanced mesh, so the copies cost no extra meshes. Meadow Isle gains four more farm hamlets, two on each new land, built from its instanced cottages.
- **New terrain.** Each new land's biggest hill rises 1.8 times higher into a mountain peak, which the ground painter colours with rock and, where the Island has it, snow. Each new land also has a lake, carved below sea level so the sea shows through and the Character swims in it. The lakes were placed by sampling the new lands for spots clear of trails and places.
- **More to find.** A treasure waits out in the middle of each lake, to swim to, and another on each summit, so every Island has 104 treasures.

## Movable pop-ups

Every pop-up on the play screens is now a `MovablePopup` (`src/client/movable-popup.tsx`). This covers:

- the voyage banner, both while exploring and on the World Map
- the help box
- the lookout box
- the sign, hideaway, animal and Dock cards
- the Room's help box

A pop-up can be dragged anywhere by any part that isn't a button, with the mouse or a finger. Its grip button at the top moves it with the arrow keys. `keepPopupOnScreen` always leaves 64 pixels of it on screen to grab again. The Region panel already moved in its own way and is unchanged.

## The gangplank

The ship now berths 1.8 further from the pier. Once it has docked, it slides out a plank from a gap in its rail, between the masts and in front of the cabin (`findGangway`, `findPlankReach`). The Character waits on the pier opposite the plank and walks across it onto the open deck, and on arrival walks back down it. The plank slides back in before the ship pulls away. Boarding and landing each take 3.4 seconds. A test walks every step of the boarding path and checks none of it is inside the cabin.

## The walker

A round yellow walker button sits beside **Explore** on the World Map. The Child drags it onto the map, and a copy follows the pointer. Where it is let go, the World Map finds the point on the sea's level under the pointer (`findSeaLevelPoint`) and the Island nearest it. If that Island can be explored, exploring starts there (`findDropStart`). If the point is in the sea, the Character starts on the nearest dry ground. A locked Island shows a tip asking for one that can be explored instead, and tapping the walker without dragging explains what to do.

## Minimising the map's buttons

The map buttons, the weather buttons, the Year buttons and the Region buttons each start with a minimise button. It folds the group away to that one button, which then maximises it again.

## Consequences

- Exploring is 139,000 to 246,000 triangles and 68 to 96 meshes. The World Map is 137,000 to 224,000 triangles and 30 to 60 meshes. Both are inside the budgets 0041 set.
- With the voyage and the races, a pop-up can cover the Character. Moving it is now up to the Child.
- The walker only chooses where exploring starts. The camera faces the Island's usual direction.
