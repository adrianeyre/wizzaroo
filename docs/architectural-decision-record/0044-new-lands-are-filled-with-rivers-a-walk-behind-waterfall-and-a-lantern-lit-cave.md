# New lands are filled with rivers, a walk-behind waterfall and a lantern-lit cave

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

After [0041](./0041-islands-grow-new-lands-with-ring-races-and-the-ship-sails-the-world-map.md) and [0042](./0042-filled-new-lands-movable-pop-ups-a-gangplank-and-the-walker.md), the two new lands either side of each Island held a lake, a peak and copies of the Island's own scenery and sights. The owner raised the exploring budget from 96 to 150 meshes and asked:

- for the new lands on every Island to be covered in wonderful and interesting things, such as more rivers and trees
- for a waterfall on at least one Island that the Character can walk behind
- for a cave on at least one Island that the Character can walk into, holding a lantern so they can see
- for more fun things on all the Islands

## Rivers run downhill into the land

Each new land now carries a river from the flank of its peak down to the sea or its lake: two on every Island, chosen by searching for a meandering course that stays clear of the Runway, the Helipad, the Dock, the Island's places, Regions and sights. A river is part of the new lands (`rivers` in `NewLands`), so the World Map, the Island on its own and exploring all draw the same land.

`carveRiverBeds` cuts each river into the land. Along its course the bed is the lowest ground met so far, less a little depth, so the water never runs uphill even where the course crosses a rise; there it cuts a small gorge. The banks blend back to the land over 1.3 map units. Both rivers on an Island are one merged ribbon with the flowing-water material the other rivers use; on Meadow Isle they are part of its own river's mesh. On Islands 2 to 6 the Character wades into them as into the Island's other rivers (Starfall Isle's adventure now asks its landform what is water, as the others do); on Meadow Isle, whose rivers are not courses, the bed is simply low ground. The rivers count as water for scenery, so nothing is planted in them.

## Wonders are drawn only when exploring

The World Map's budget (63 meshes) has little room, so everything else new is a Wonder (`island-wonders.ts`), drawn only by the explore scene and in explore units, so its size is right for the Character. Each Island has at least three, at spots found by searching each new land for level ground clear of the airfield, the Dock, places, Regions, sights, rivers and trails, and facing the middle of the Island:

| Island          | Wonders                                                              | Grove            |
| --------------- | -------------------------------------------------------------------- | ---------------- |
| Meadow Isle     | a windmill with turning sails, a stone circle, a balloon             | oaks             |
| Frost Isle      | a family of snowmen, a stone circle, a balloon                       | snowy pines      |
| Sunscorch Sands | a stepped pyramid with obelisks, a windmill, a balloon               | palms            |
| Jungle Reach    | a waterfall to walk behind, giant toadstools, a balloon              | kapok trees      |
| Ember Isle      | a cave lit by the Character's lantern, giant orange fungi, a balloon | ember-leaf trees |
| Starfall Isle   | a crystal arch to walk under, violet toadstools, a balloon           | crystal trees    |

Every Island also gets a grove of its own kind of tree and patches of wildflowers in its colours, scattered over the new lands clear of the same things and instanced, one mesh each. The hot-air balloon, in the Island's colours, bobs and slowly turns above its new land.

## Walking behind the waterfall

Jungle Reach's waterfall falls from the lip of an overhanging cliff, about ten units up, into a pool. The cliff face stands well behind the falling water, so a ledge of dry ground, with stepping stones, runs between them. Rocks either side leave a way in round the pool at each end. The walker is kept out of the cliff and the side rocks by a row of blockers, and nothing blocks the gap, so the Character walks round the pool and behind the water. The water is a sheet drawn from both sides, so it is seen from behind too. Tests walk the Character from in front of the pool to the ledge, and check the ledge is dry and they cannot walk into the cliff.

## The lantern-lit cave

Ember Isle's cave is a rock dome with a dark inside face and a doorway facing the middle of the Island, a lined tunnel through the rock, stalactites, a treasure chest and glowing crystals. A ring of blockers follows its wall except at the doorway, so the Character walks in but not through the rock. Inside, the follow camera comes in close and low so it stays under the roof.

The Character carries a lantern: a small lantern by their hand with a warm point light. It fades in as they walk through the doorway and is fully lit inside (`findLanternGlow`); away from the cave it is hidden and its light is off, so it costs nothing elsewhere.

## Within the budget

The exploring budget is now 150 meshes and 300,000 triangles. The owner raised the meshes; the triangles were raised from 260,000 to fit the groves, so Meadow Isle, the busiest, is about 269,000 triangles and 105 meshes, and about 275,000 with the aeroplane. Islands 2 to 6 are between 162,000 and 266,000 triangles and 78 to 86 meshes. The World Map and the Island scene gain only the merged river ribbon: one mesh on Islands 2 to 6, and none on Meadow Isle.

## Consequences

- The rivers change the land on every Island's new lands, so a few copied trees and bushes that stood in their way are no longer drawn.
- A trail that crosses a new river gets a bridge, as for every other river. A trail bridge now ends at a corner of its trail rather than cutting across it, and stands clear of the highest ground it crosses, so it carries the Character over a river that runs a little above its banks.
- The Wonders are not drawn on the World Map; they are things to find by exploring.
- Being in a cave is judged from where the Character stands, not from how much light reaches them, so the lantern also glows in the doorway in daylight.
