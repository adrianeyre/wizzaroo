# Explore mode is solid, worked out from the models themselves

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for explore mode to be overhauled so that the Character can't walk through any object. Until now the only solid things were circles drawn by hand: one round each Region, Lookout, friendly animal, Islander and Quest thing, a few round parts of each Attraction, and the Wonders' cave and falls. Everything else, from every tree, bush, rock and cottage to signs, dens, lamps, the dock, the Stations and most of every Attraction and Curiosity, could be walked straight through.

## What is solid

Anything drawn on an Island in explore mode that the Character could bump into is solid ([`island-solids.ts`](../../src/client/islands/island-solids.ts), [`island-explore.tsx`](../../src/client/islands/island-explore.tsx)):

- **Every Attraction and Curiosity**, built in full detail, and the moving parts of each that stay put enough to bump into (things that spin, swing, bob, nod, whirl or wait on a launch pad). Its pools (the `water` finish), jets, flames that come and go, beams, halos, wanderers and smoke aren't.
- **The Island's own scenery**: every tree, bush, rock, house, igloo, cactus, column and crystal the World Map scatters, on the old land and the new lands, and every sight it places (`IslandFeature`), Meadow Isle's stone bridge among them.
- **The harbour**: the dock and its hut, crates, bollards, lamp and piles, the airfield, the hover slipway and the Island's flagpole.
- **The Stations**: platforms, canopies, signs and tunnel portals.
- **What explore mode draws itself**: fact signs, hideaway dens, trail lamps, watchtowers and the railings of trail bridges.
- **The Wonders**: the windmill, pyramid, walk-behind falls, lantern cave and the rest of each Island's Wonders, and every tree of the grove round them.
- **Every Region's landmark**, on Meadow Isle and on the other Islands.
- **The friendly animals**: each is an upright round as wide and as tall as its model reaches, since they sway and hop where they stand.

Treasures, bounce pads, Ring Race rings, Quest Finds, the Train and the Vehicles stay passable, as they are picked up, bounced on, flown through or ridden. Water, ice, lava, smoke, flowers and the animals that wander about an Attraction stay passable too. The hand-drawn circles stay as they were. Meadow Isle's lighthouse is solid, rocks and all, and is climbed from the edge of its rocks (its Lookout reaches 11.5 units rather than the usual 5.7).

## How it is worked out

Solid shapes aren't drawn by hand, because there are more than a thousand models and every one would drift from its drawing. Instead every triangle of a solid model is cut to the slice of air the Character's body fills: from a step (0.32 units) to a body's height (1.25 units) above the ground, deck or bridge under it. That ground is found again under every cell the triangle covers, so a trunk, rock or wall standing on a slope is solid on its uphill side as well as its downhill one. What is left is marked on a grid of 0.25-unit cells ([`island-obstacles.ts`](../../src/client/islands/island-obstacles.ts)), and each cell remembers how high its solid parts reach. So the Character:

- **walks under** a high roof, an arch or a pine's branches, and **steps over** a kerb, a path edge or a flower bed;
- **bumps into** a wall, a trunk, a fence, a lamp post or a bush, and slides along it when walking into it at a slant;
- **stands on a deck** above the posts holding it up, since the posts reach no higher than the deck, and **jumps over** a low wall when high enough in the air;
- **bumps into a deck or bridge from below** when it is too high above the ground or water to step up onto, so it can't swim or walk through it;
- **walks up an Attraction's grassy bank** as far out as the bank is drawn, rather than into it.

A Character is moved in steps of at most 0.12 units, each pushed out of any solid cell it reaches, so it can't tunnel through a thin wall on a slow frame. One put down inside something (by a ride, the Train or a Vehicle) may walk out of it, but never further in, so it can't walk on through. Walking to a tapped spot gives up after 0.8 seconds without headway, so the Character doesn't push against a wall forever. Vehicles are stopped by the same cells across their width at their nose, middle and tail, and are put on the map and stepped out of only where it is clear.

## Keeping it quick

Marking every triangle of an Island takes about half a second, too long to wait for when starting to explore. So each solid thing is marked only once the Character (or the Vehicle being driven) is within a chunk (24 units) of it, a few milliseconds at a time ([`island-obstacle-field.ts`](../../src/client/islands/island-obstacle-field.ts)). One big model, such as the Stations, is split by chunk first. An Island's marked grid is kept for as long as its explore world is.

## Keeping the game playable

- **Every ride stays reachable**: a circle round where each ride starts, and where it puts the Character down, is always kept clear.
- **Every place to visit can be reached**: Regions, Lookouts, the Dock, fact signs, hideaways, friendly animals, Islanders, Quest things and Attractions' signs each have clear ground within reach, checked for every Island by [`island-solids.test.ts`](../../src/client/islands/island-solids.test.ts).
- **Nothing drawn is missed**: [`island-explore-solids.sweep.test.tsx`](../../src/client/islands/island-explore-solids.sweep.test.tsx) draws each Island's explore scene, goes over every part of every model in it that is at the height of the Character's body, and checks that it is solid. Only what is meant to be passed through (treasures, pads, rings, Quest Finds, the Train, Vehicles, water, smoke and things that wander) is left out.
- **Nothing grows on the starting spot**: the scenery keeps clear of where the Character starts, as it does of signs and dens. Before this change Meadow Isle's start was among three pine trees.

## Consequences

- A forest is now a thicket to walk round, along a trail, rather than through.
- A new model is solid without any blocker being drawn for it. One that should be walked on needs a deck (`Deck`), as before, or it is a wall.
