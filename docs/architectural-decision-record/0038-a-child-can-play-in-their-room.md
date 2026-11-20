# A Child can play in their Room, full screen, as their own Character

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for the Room to be "played": the Child walks around their own Room in 3D, lies down on the bed, picks up their Pet and strokes it, and plays with every piece of Furniture, with the Room filling the screen while they do. The owner later made clear that "full screen" means the full height between the top menu and the footer, with both still showing. In the same change the Room grew from 8 places for Furniture to 15 (adding a desk, seat, toy box, clock, fish tank, soft toy and instrument, ten Items each) and every original place gained four more Items to earn.

The Room page has a **Play in my Room** button. It fills everything between the top menu and the footer with the Room, drawn with all four walls and a ceiling, and the top menu and footer stay on screen. **Back to my Room** goes back to furnishing.

- **Moving** works as it does when exploring an Island ([0029](./0029-islands-can-be-explored-on-foot.md)), using the same joystick, keys and blocker sliding: arrow keys or W A S D, the joystick, a tap on the floor to walk there, a finger drag or right-drag to look around, and Space or the Jump button to jump.
- **Camera views** are the four from exploring an Island, with the same buttons and the V key: Behind (the default), First person (where Left and Right turn the view and the Character is hidden, though a Pet they are holding stays in sight), Bird's eye (looking down from just under the ceiling) and Wide (from a high corner across the Room), plus a fifth, **Map**, that the Island doesn't have: the whole Room seen from straight above with the ceiling lifted off, like a floor plan, with a ring under the Character. In Map the camera rises high enough to fit the Room on any screen shape, pushing the stick up walks towards the back wall, and tapping the floor still walks the Character there. The camera always stays inside the walls, and while the Character lies on the bed or sits on the seat, First person shows them from behind instead.
- **Everything does something.** Tapping a piece of Furniture walks the Character to it and plays with it. Each one wobbles and many burst with hearts, stars, bubbles, leaves or toys. The bed lays the Character down, the seat sits them on it, the lamp turns its light on and off, the window turns day to night, the clock shows and says the real time, the fish swim, and each of the ten Instruments plays its own tune, synthesised like the other sound effects. A message says what happened, for screen readers too, and the Furniture names come from the Catalogue.
- **The Pet** follows the Character around. Tapping it picks it up; tapping it again or rubbing it with a finger or the mouse strokes it, and **Stroke** and **Put down** buttons do the same.
- The Room played in is the one on screen, including Furniture the Child has put in but not saved yet. Nothing that happens while playing is stored, and it earns no Stars or Items ([0010](./0010-rewards-without-nudges.md)).

## Considered Options

- **Playing in the small Room picture on the page**: no new screen, but too small to walk around on a phone, and the owner asked for full screen.
- **Covering the whole window and asking the browser for full screen**: this was the first version. It hid the top menu and footer, which the owner wanted kept, so Room play now sits inside the page like the other play screens. The World Map's full-screen helpers stay in `src/client/full-screen.ts`.
- **Drawing every part of the Room as its own mesh**, as the Room picture does: a patterned wallpaper on four walls alone came to over 200 meshes, and the busiest Room to 371, far over what the £150 phone can draw at 30 fps.

## Consequences

- Each still piece of Furniture and the four walls are merged, after they first draw, into one mesh per colour (`src/client/character/merged-parts.tsx`), so the scene is 95 to 116 meshes and at most about 34,000 triangles, most of the meshes being the Character. The Fish Tank stays unmerged so its fish can swim. The Room picture on the page merges its walls the same way. Playing in the Room has its own row in the [performance budget](../performance-budget.md) (40,000 triangles and 120 meshes), checked by `src/client/character/room-play-scene.test.tsx`.
- Visiting a sibling's or Classmate's Room is still look only. Playing is for the Child's own Room.
- A new place for Furniture needs a spot in `src/client/character/room-layout.ts`, where it stands in the Room and where the Character stands to play with it, and a reaction in `src/client/character/room-play-actions.ts`. The type checker fails until it has both.
