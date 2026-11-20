# Islands can be explored on foot, as the Child's own Character

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for Children to "play" any Island they have unlocked by walking around it as their Character: following paths between places, crossing bridges, climbing mountains, swimming rivers and the sea around the Island, and going into things such as the lighthouse to look out over the Island from the top.

Every unlocked Island now has an **Explore** button on the World Map. It opens the same Island, drawn by the same code as the map, in a third-person scene with the Child's Character (built from their Wardrobe loadout) standing on it. Nothing about the World Map itself changes, and a locked Island has no Explore button.

- **Moving.** The arrow keys or W A S D, a touch joystick, or the mouse: click the ground to walk there, or hold the left button to keep walking towards the pointer. Right-drag (or a finger drag) turns the camera, the wheel zooms, Space or the Jump button jumps. Four camera views, switched with buttons or the V key: Behind (the default), First person (where Left and Right turn the view), Bird's eye and Wide.
- **The ground is the map's ground.** Walking height comes from each Island's own height function, so a Child really climbs the mountains and volcanoes, more slowly on steep slopes. Below sea level, and in a river or the oasis, they swim, lower in the water and slower. Frost Isle's frozen channel is slippery ice. Ember Isle's lava holds them back with "Too hot! Find a bridge". Starfall Isle has low gravity, so jumps go higher.
- **Trails and bridges are data.** Each Island has hand-placed trails that link every Region, kept in `src/client/islands/island-adventures.ts` beside the landform they belong to. Bridges already drawn on an Island (Meadow Isle's stone bridge, Frost Isle's ice bridge, Jungle Reach's rope bridges) can be walked over. Wherever a trail meets a river or lava with no bridge, a timber or iron bridge is built automatically. A test walks every trail on every Island and fails if any step needs a swim or touches lava.
- **More to find.** Each Island gained an islet offshore to swim to, two lookouts to climb (the lighthouse and landmark towers where they exist, plus a new watchtower), four fact signs, three bounce pads (hay bales, snow trampolines, sand springs, mushrooms, steam vents, moon rings), and eight treasures to collect.
- **Learning is one step away.** Walking up to a Region offers "Go into …", which opens the same Region panel and Games as tapping the Region on the map. After a Game, the Child comes back to exploring beside that Region.

Treasures found are kept for the session the Child is playing in, not stored, and earn no Stars or Items ([0010](./0010-rewards-without-nudges.md)). Exploring is free play beside the curriculum, not a second reward track, and a collection that persisted across days would invite the "come back to finish it" pull that 0010 rules out.

## Considered Options

- **A separate, simpler "play" scene per Island** with its own models: cheaper to draw, but it would be a seventh copy of every landscape to keep in step with the map, and Children would not recognise the place they just tapped.
- **A physics engine** (Rapier, cannon-es): proper collisions with every model, but a new dependency and a much larger bundle for the £150 phone. Height functions, bridge decks and circle blockers around landmarks are enough for walking, swimming and jumping.
- **Keeping treasures across visits, and rewarding them**: rejected for 0010's reasons above. Keeping them on the device could come later as data that is never synced or rewarded.
- **Voicing the fact signs**: voice-over is made before release ([0007](./0007-audio-is-made-before-release.md)), so the sign facts are text for now, and recording them is a follow-up.

## Consequences

- The islets change the World Map's coastlines slightly, and trees and rocks are kept clear of the new watchtowers, signs and bounce pads on the map too.
- The explore scene draws one Island in full detail, as the map already does when it is in view ([0012](./0012-the-world-map-is-drawn-in-full-detail.md)), plus the Character. Trails and bridges are merged into one mesh each, and signs, bounce pads and treasures are instanced, so the scene is 57 to 87 meshes and at most 175,000 triangles. It has its own row in the [performance budget](../performance-budget.md) (200,000 triangles and 95 meshes), checked for every Island. It still needs trying on the £150 phone, along with the six-Island map ([#85](https://github.com/adrianeyre/wizzaroo/issues/85)).
- An Island added later needs an adventure (start point, trails, lookouts, signs, treasures and bounce pads) before it can be explored; the tests fail until it has one.
