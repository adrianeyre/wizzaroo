# The World Map is drawn in full detail

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The World Map was drawn through the pixelating shader and 16-colour palette ([0003](./0003-3d-with-a-retro-pixel-treatment.md)), out of plain cones, boxes and spheres. The owner found that it looked childish, and asked for a map that looks high-resolution and detailed. The World Map is therefore drawn at the screen's own resolution, with antialiasing, sunlight and soft shadows, a sky that lights the scene, and a sea and river that move and shine. Its models are built in code from many parts, merged into one mesh each and shaded with a fine surface grain, so they stay cheap to draw. Night falls on the map when it is night on the device's clock, and each visit brings weather at random, which the pixel treatment could not have shown. Missions and the Character keep the pixel treatment.

A phone that can't hold 30 fps lowers the map's resolution, one step at a time, with the same governor that grows the pixels in a Mission ([performance budget](../performance-budget.md)). When it drops the effects, the map stops casting shadows and hides its clouds.

## Considered Options

- **Keeping the pixel treatment with better models**: the pixelating pass and palette blur every detail away, which is what made the map look childish.
- **glTF models from CC0 packs** ([0009](./0009-cc0-asset-packs-by-default.md)): each pack has its own style, and the pixel shader that hid the differences is gone from the map. Models built in code also share one palette and lighting, and add nothing to the offline download.

## Amended

Amended by [0025](./0025-one-island-per-year-group.md): the World Map now holds six Islands, and only the Island in view is drawn in full detail; the others are low-detail shapes until the Child pans to them.
