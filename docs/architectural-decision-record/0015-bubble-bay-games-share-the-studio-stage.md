# Bubble Bay's four new games share the smooth studio stage, under water

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for four more games in Bubble Bay that follow the curriculum, are in 3D and look professional. Each is a new Game Type on one new Year 1 Skill:

| Game Type      | Title              | Skill                                                                | National Curriculum, Year 1                                        |
| -------------- | ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `fish-count`   | Count the fish     | `maths.count-objects-to-20`, Counting objects to 20                  | Number and place value: count and represent numbers with objects   |
| `ten-frames`   | One more, one less | `maths.one-more-one-less`, One more and one less                     | Number and place value: given a number, find one more and one less |
| `shape-hunt`   | Shape hunt         | `maths.name-3d-shapes`, Naming 3-D shapes                            | Geometry: recognise and name common 3-D shapes                     |
| `letter-match` | Capital catch      | `english.capital-letters`, Matching capital letters to small letters | Spelling and handwriting: name the letters and know their capitals |

They are drawn the way popping bubbles is ([0013](./0013-popping-bubbles-is-drawn-smooth.md)): at the screen's own sharpness, antialiased, with studio lighting and reflections, and the smooth Companion. Their shared stage adds a sea floor to the studio backdrop: sand with moving caustics, light shafts, swaying kelp, rocks and starfish, each kind one instanced mesh so the stage costs five draw calls. The pieces both scenes use (the stage, Companion, burst and choice layout) moved from `world.tsx` into `studio-stage.tsx`, and the four games live in `bay-games.tsx`.

The representations follow how Year 1 is taught: fish line up in rows of five with a gap after ten, one more and one less are counters in ten frames with the changing counter shown, the 3-D shapes turn on plinths with their edges drawn, and the small letter is on a lettered block. The choices are still HTML buttons over the 3D objects, so they keep their accessible names and 48-pixel targets. Shape hunt shows no words on its choices, since reading the name would give the answer away; its buttons are named for screen readers instead.

## Consequences

Every scene stays within the 10,000 triangles and 40 meshes of the [performance budget](../performance-budget.md), checked by `src/client/bay-games.test.tsx`. The 20-fish count is the busiest, at 9,828 triangles, which is why the fish are low-poly and instanced.

Each game says its prompt aloud: 17 new voice-over lines, made with the same Piper voice as the rest ([0007](./0007-audio-is-made-before-release.md)).

## Considered Options

- **Pixel treatment, like listen-and-pick**: cheaper, but the owner asked for these to look polished, as popping bubbles was made to.
- **3D text for numbers and letters**: needs a font file in the bundle and many more triangles per glyph. The choice buttons already draw text crisply, and the letter block uses a 256 × 256 canvas texture.
