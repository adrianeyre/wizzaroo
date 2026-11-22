# The HTML UI is drawn as an explorer's map

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Wizzaroo is a world of six Islands, so every HTML screen (the home page, signing in, the Parent, Teacher and Admin pages, Settings, and the menus, panels and bars over the game) is drawn as a sheet of an explorer's map. The page is the sea, ruled into grid squares. Panels are land, printed inside a 2px keyline with small square corners. The header is the sheet's cover band, printed in the chosen theme's colour (a deeper shade of it in dark mode), and so are the home page's main button and its closing band. The home page sits in a map sheet whose edges carry grid references, A to H across and the Years 1 to 6 down. Its Subjects are a map key, and How it works is a dashed footpath between waypoints. Depth comes from these layers, not from soft shadows, glass or gradients.

Headings, the cover band and map labels are set in Barlow Condensed. Body text is set in Andika, a typeface made for children learning to read, because a Year 1 Child must still find their way. Small text inside buttons stays in Andika for the same reason.

The six themes stay, as six printings of the same map. Each inks the cover band, links, buttons and chosen states, and tints the sea and land a little towards itself. Light and dark both stay, and the default is unchanged.

## Consequences

The 3D world keeps its own look ([ADR 0003](./0003-3d-with-a-retro-pixel-treatment.md)), including the lettering it draws on canvases in Baloo 2 and Nunito. So both families are still bundled, though the HTML no longer uses them. Literal colours inside individual Games' boards (the Big Top's circus drums, the Check papers) are the Games' own art and were left as they were. `DESIGN.md` records the tokens.
