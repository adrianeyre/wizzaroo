# The Character keeps its own colours

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The world is drawn through a pixelating shader that snaps every colour to a 16-colour palette ([0003](./0003-3d-with-a-retro-pixel-treatment.md)). A Child chooses their Character's skin from 14 colours and its hair from 13, and the palette would turn most of them into the same few, so a Child could no longer pick a Character that looks like them. The Character is therefore drawn on its own small stage, through the same pixelating pass but without the palette, so it stays chunky and 8-bit while every skin and hair colour stays true. The World Map and Missions keep the palette.

The Character is built from low-poly parts (spheres, boxes, cones and rings) in code, not from glTF models, because its layered parts must fit together exactly ([0009](./0009-cc0-asset-packs-by-default.md)), and a Feature or Item is then a line in the Catalogue and a short function rather than an asset to model.

## Considered Options

- **Widening the palette** for every scene: it would weaken the retro look everywhere for the sake of one model.
- **Limiting skin and hair to palette colours**: too few to represent every Child.
