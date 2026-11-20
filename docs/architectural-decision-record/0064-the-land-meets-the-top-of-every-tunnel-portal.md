# The land meets the top of every tunnel portal

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner said that at most tunnel entrances there was a gap between the portal and the hill it goes into: the land should come right up to the top of every portal, on every hill and mountain.

## What was wrong

Each tunnel goes under a hill higher than its portals ([0057](./0057-a-hill-over-every-tunnel.md)), but the hill only starts to rise 0.6 behind the portal's face, 1.8 up for each 1 back. So it reaches the top of the portal's stonework (5.2 above the track) about 3.5 behind the face when exploring, and the World Map's portal (13.5 above the track at the map Train's size) only within 15. Between the stonework and the hill there was a wedge of sky, seen from in front of every portal. Where the ground falls away beside the track, or the hill keeps off the sea, a river, the open track or something standing nearby, the land behind a portal was lower still.

The hill couldn't simply stand straight up behind the portal. The ground is a mesh with points 3.75 apart, so a sheer face buries the front of the opening or shows as a jagged, saw-toothed wall. Drawing the ground finely along each face adds tens of thousands of triangles to an Island already near the World Map's budget. And the explore view and the World Map draw the same ground, so a face tall enough for the World Map's portal would be a cliff three times the height of the portal when exploring.

## What changes

- **A mound of land on every portal.** Each portal is drawn with a mound of land behind its stonework (`buildTunnelMoundPart` in `island-railway-design.ts`). The mound starts inside the stonework, stands 0.3 above its top over the portal's width and 0.6 either side, and reaches 4.5 back into the hill. Its sides and back slope down at 1.5 into the ground, so it stands over the portal even where the hill behind is low or falls away. Wherever the hill is higher, the hill covers it.
- **At the portal's own size.** The mound is drawn at the same size as its portal: at the Train's size when exploring, and at the map Train's size on the World Map. So the land meets the top of the portal in both, without a cliff when exploring.
- **In the hillside's colours.** The mound is painted the colour of the hillside round it, at its height and slope, averaged over six points (`findHillsidePaint` in `island-ground-colour.ts`): grass, snow, sand or rock, level or steep, like the ground it joins. `findPadColour` now uses the same lookup for level ground (`findGroundPaint`).
- **Solid like the portal.** The mound is part of the Railway's structures, so explore mode makes it solid as it does the portal ([0061](./0061-explore-mode-is-solid-worked-out-from-the-models.md)).

## Consequences

- The ground, its hills over the tunnels, the track and where the Train is cut off are as before. No Railway, Attraction or Curiosity moves, and `island-tunnel-hill-sites.ts` is unchanged.
- Each mound is 396 triangles, two to a tunnel, so an Island's Railway gains 792 (Starfall Isle, one tunnel) to 5,544 (Sunscorch Sands, seven) triangles when exploring and on the World Map, inside both budgets ([performance budget](../performance-budget.md)).
- On Sunscorch Sands' sea cliff, where the hill can't come down beside the fifth tunnel's east portal, the mound now stands over the portal and slopes down towards the water.
- `island-tunnel-portals.test.ts` checks, for every portal on every Island, at its exploring size and its World Map size, that the land (the hill or the mound, whichever is higher) reaches the top of the portal's stonework all along the back of it. It also checks that no mound comes out in front of its portal's face.
