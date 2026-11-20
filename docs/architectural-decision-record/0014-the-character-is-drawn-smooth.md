# The Character is drawn smooth, not pixelated

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner found the Character looked blocky next to the detailed World Map ([0012](./0012-the-world-map-is-drawn-in-full-detail.md)) and the smooth popping-bubbles Mission ([0013](./0013-popping-bubbles-is-drawn-smooth.md)), most of all in the small portrait at the top of the World Map, and asked for it to look more professional there, on the "Who's playing?" tiles and in the Wardrobe. Through the pixelating pass at one CSS pixel per device pixel, a 3rem portrait is about 24 chunky pixels across, and its 8-sided, flat-shaded parts show every facet. So the Character's stage is now drawn at the screen's own sharpness (up to 2×) and antialiased, without the pixelating pass, with smooth shading, rounder parts and studio lighting: a sky-and-ground fill, a warm key light and a cool rim light, on a soft plinth with a contact shadow, over a backdrop drawn in CSS so it follows the colour mode. Tone mapping is off, so every skin and hair colour stays exactly the one the Child chose ([0011](./0011-the-character-keeps-its-own-colours.md)).

Listen-and-pick keeps the pixel treatment ([0003](./0003-3d-with-a-retro-pixel-treatment.md)).

## Consequences

Rounder parts cost triangles: a fully dressed Character is now about 10,000 to 14,300 triangles, so its budget rises from 4,000 to 16,000 ([performance budget](../performance-budget.md)). The mesh count doesn't change. A portrait only draws when it changes, and the Wardrobe shows one Character at a time, so the stage stays cheap on the £150 Android phone.

## Considered Options

- **A smaller pixel size on the portrait only**: still faceted and still unlike the World Map around it.
- **A 2D illustration for the portrait**: it would no longer show the Items and Features the Child dressed their Character in.
