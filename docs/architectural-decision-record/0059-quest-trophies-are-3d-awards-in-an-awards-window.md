# Quest Trophies are 3D Awards, shown in an Awards window

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for the Trophy each Island's Quest gives ([ADR 0058](./0058-an-island-quest-with-finds-islanders-and-a-rucksack.md)) to be a high-quality 3D picture, and for an **Awards** button after the Stars on the World Map that opens a window of every Award, with the Island it belongs to. Awards not yet won are shown too, dulled, and every Award in the window turns slowly round all the time. In the same change they asked for an **Explore** tab between **Map** and **Wardrobe** in the play bar, a wider help box when exploring that fits the screen, and firework sounds for the Stars.

## What an Award is

- **One Award per Island's Quest**, named by the Quest's Trophy, such as the Meadow Fair Hero. Its look is data in `src/client/awards/award-designs.ts`: the metal of its cup, its trims, the stone of its plinth, its gem, one of three cup shapes (chalice, tulip, urn) and an emblem of the Island's own on its lid: a flower for Meadow Isle, a snowflake for Frost Isle, a sun for Sunscorch Sands, a jaguar's head for Jungle Reach, a flame for Ember Isle and a star for Starfall Isle.
- **Drawn in 3D, in high detail** (`src/client/awards/award-model.ts`). The cup, stem, foot and lid are turned from smooth profiles, 64 segments round; the handles are swept tubes; the plinth and its nameplate are bevelled boxes; the star is a bevelled extrusion. Every finish is a physical material lit by the studio's reflections, so the metal shines, Frost Isle's snowflake shimmers like the Northern Lights and Ember Isle's flame glows. The parts are merged by finish, so an Award is at most eight meshes and 30,000 triangles, checked by `src/client/awards/award-model.test.tsx`.
- **Drawn live, not as a picture.** Unlike the rucksack's Finds, which are photographed once in the shared studio at 192 pixels, an Award is drawn live on its own small stage at up to twice the screen's resolution (`src/client/awards/award-stage.tsx`), so it stays sharp at any size and turns smoothly: once every 14 seconds, each starting at a different angle so a row of them isn't in step. With reduced motion asked for, it stands still.

## The Awards window

- **Awards** sits after the Stars in the World Map's play bar, labelled with how many are won (`src/client/awards/awards-dialog.tsx`). Its window lists all six Awards in the Islands' order, each with its name, its Island and either **Won!** or "Finish the Quest on" its Island. One still to win is drawn in grey, dim and faded.
- **Showing Awards still to win isn't a nudge** ([ADR 0010](./0010-rewards-without-nudges.md)): nothing expires, there is no streak or timer, and an Award is won by finishing a Quest, whenever the Child likes.
- **The Quest's finishing card** shows the same turning Award in place of the old trophy icon.
- **Each Award is its own stage**, so the window draws six small scenes beside the World Map. That is six WebGL contexts while it is open, well within the browser's limit, and each Award fills only its card.

## Firework sounds for the Stars

The owner also asked, in this change, for the fireworks set off by tapping the Stars to have firework sounds in step with them. The sounds are worked out from the same show that is drawn (`listFireworkSoundCues`): a whistle climbing while each rocket rises, a deep thump, a boom of filtered noise and nine crackles when it bursts, and a soft twinkle for each shooting star. They are all scheduled on the audio clock when the show starts, and the drawing waits the same short delay, so each boom lands on its burst; closing the show early stops them. They are made in the browser, add nothing to the offline download, and follow the Parent's sound effects switch.

## The Explore tab

**Explore**, between **Map** and **Wardrobe**, starts exploring on foot. On the World Map it explores the Island in view, like the **Explore** button on the map; from the wardrobe, the Room or Settings it goes back to the map and explores the Child's Home Island.
