# Popping bubbles is drawn smooth, not pixelated

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner found the popping-bubbles Mission looked childish, as the World Map had ([0012](./0012-the-world-map-is-drawn-in-full-detail.md)), and asked for it to look polished, with convincing 3D objects. Through the pixelating shader and 16-colour palette ([0003](./0003-3d-with-a-retro-pixel-treatment.md)), a bubble can only ever be a flat cyan polygon: the thin-film colours, soft rim and bright highlights that make a bubble read as a bubble all fall between palette colours. So the popping-bubbles scene is drawn the way the World Map now is, at the screen's own sharpness (up to 2×) and antialiased, without the pixelating pass or the palette, on a studio backdrop with lighting and reflections. The bubbles are camera-facing quads with a soap-film shader that works out each pixel's normal, which gives a perfect silhouette and thin-film colour at any size for two triangles each. The Companion is smooth-shaded in that scene to match.

Listen-and-pick and the Character keep the pixel treatment, so [0003](./0003-3d-with-a-retro-pixel-treatment.md) and [0011](./0011-the-character-keeps-its-own-colours.md) still hold for them.

## Consequences

The scene fills more pixels than a pixelated one, so, like the World Map, it lowers its pixel ratio a step at a time on a phone that can't hold 30 fps instead of growing the pixels ([performance budget](../performance-budget.md)). The scene stays far inside the triangle and mesh limits.

## Considered Options

- **Keeping the palette but adding colours for bubbles**: still flat, and it weakens the palette for every scene.
- **Physically based transmission for the bubbles**: an extra render pass every frame, too much for the £150 Android phone.
- **Restyling listen-and-pick at the same time**: a bigger change than asked for; it can follow the same path later.
