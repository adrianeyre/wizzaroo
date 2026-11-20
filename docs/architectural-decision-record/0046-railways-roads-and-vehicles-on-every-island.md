# Railways, roads and Vehicles on every Island

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Superseded in part by [0048](./0048-the-islands-have-no-roads.md): the Islands have no roads, on the World Map or when exploring. Superseded in part by [0049](./0049-british-engines-and-each-islands-own-carriages.md): each Island's Train is a British engine with its own carriages, drawn from the same models on the World Map.

After [0045](./0045-a-hovercraft-a-submarine-and-the-wizzaroo-flag-on-every-island-and-aircraft.md), the owner asked:

- for a Railway on every Island that runs round all its land masses, crossing between them on bridges of different styles
- for a different style of Train on each Island, one of them a steam train, stopping at several Stations, which the Character can get on and off when exploring
- for lots of roads and junctions on every Island
- for a **Vehicles** part of the wardrobe with 30 Vehicles bought with Stars, such as a horse and cart, a sports car, a car, a van, a motorbike and a bike, which the Character puts on the map and rides when exploring
- for the Dock to be seen on every Island on the World Map

## The routes are searched once and kept in the repo

A Railway can't be laid by hand around six crowded Islands, and searching for one every time an Island opens would hold up the World Map, which needs each route to keep its trees and houses off the track. So, as for the Runways ([0043](./0043-aeroplanes-and-helicopters-fly-between-runways-and-helipads.md)), the routes were searched for once and their corners committed, in `src/client/islands/island-transport-plans.ts`, with each Island's Stations and its road network.

- **The Railway.** A loop was drawn round the two new lands and the main land, out to the islet, and a dynamic-programming search moved each of its points up to 12 map units sideways to keep clear of Regions, sights, Wonders, the Dock and its ship lane, the hover slipway, the airfield, lakes and every adventure place, preferring dry, low ground. The result was smoothed and pushed out of anything it still touched. The main lands are crowded, so on most Islands the line runs along the coast for part of its way.
- **The Stations.** Five per Island, as far apart as possible, each where 24 explore units of track is straight, dry and level enough for a platform, with dry, clear ground beside it for the station building. A main-land Station was preferred where one fits.
- **The roads.** A jittered grid of junctions over dry land, joined by straight roads that are clear of Regions, sights and Wonders, not too steep, and cross the Railway at most once. A spanning tree joins each land mass, extra roads are added without crossing others or meeting at a sharp angle, and pieces of fewer than four roads are dropped. Each Island has 54 to 102 roads, with 13 to 36 junctions where three or more meet. Where a road crosses a river or the sea, it gets a bridge.

When the land changes, as main's new rivers and Wonders did while this was being built, the search is run again and the plans file is replaced.

## The track's heights are shaped, not taken from the ground

Following the ground made the track climb cliffs; lifting it to an even gradient put almost all of it on viaducts. Instead `buildRailway` in `island-railway.ts` shapes the heights along the loop: each sample is smoothed towards its neighbours many times, pulled gently back towards the ground and held between bounds. Over water the track must be at least a deck height up; at Stations and road crossings it must be level with the ground; elsewhere it may run up to 20 above the ground or 40 below it. Where a first pass runs well under a hill, that stretch becomes a tunnel, with stone portals at both ends. A second pass keeps everything else on or above the ground. Wherever the track is over water, or more than 2.6 above the ground, it is on a bridge. Each Island has 9 to 14 bridges and 1 to 7 tunnels, and fewer than 4% of steps are steeper than 1 in 5.

Each bridge takes the next of its Island's six styles that suits it: a stone viaduct, a steel truss, a suspension bridge, a timber trestle, a girder bridge or a bowstring arch, each in the Island's own colours. The tall styles are kept off the aeroplane's approach to the Runway, and the suspension bridge only spans 30 or more. Every style is used on some Island, and most Islands use five or six.

## The Train runs to a timetable

Each Island's Train (`island-train-design.ts`) is a locomotive and two to four carriages: Meadow Isle's green steam engine, Frost Isle's red alpine electric, Sunscorch Sands' desert diesel, Jungle Reach's narrow-gauge tank engine with safari carriages, Ember Isle's mine locomotive and Starfall Isle's maglev. Where it is depends only on how long the Child has been exploring (`island-train-timetable.ts`): it waits 14 seconds at each Station, then speeds up, runs at up to 16 and slows to stop at the next. It starts its timetable so that it is coming into the Station nearest the Character about 25 seconds after they arrive, so nobody waits for a whole loop.

Near a Station the Child sees the Station's name and how long until the Train comes. While the Train waits there, **Get on the train** puts the Character inside its first carriage, and the camera follows the Train. At each Station, **Get off at** the Station's name puts them on its platform.

## Vehicles are Items that are ridden, not worn

A Vehicle is an Item in a new `vehicle` slot, outside the Character's loadout, because the Character isn't wearing it. It is bought with Stars like any Item (`Item bought`), so nothing changes on the server. The 30 Vehicles are 6 common, 13 uncommon and 11 rare. The wardrobe's **Vehicles** tab pictures each one in 3D, and one the Child holds says **Yours! Ride it when you explore**.

When exploring, **Vehicles** in the explore bar lists the Vehicles the Child holds. Choosing one puts it on the map just in front of the Character, on ground it can drive on. Near it, **Ride** puts the Character in its seat. The joystick or arrow keys then drive: forward speeds up to its top speed (slower off the roads), back brakes and then reverses slowly, and left and right steer once it is moving. It stops at the sea, lava, a cliff or a blocker rather than going in. **Get off** leaves it parked where it is. The Character sits in it, and is hidden only inside the six tall vans and buses (`vehicle-designs.ts`, `vehicle-driving.ts`).

## Roads and the Railway are walked on

The track, the platforms and the roads are walk surfaces: `buildExploreWorld` adds the platforms and road bridges to the world's bridges, and the track and roads as lanes, indexed by a grid, so the Character walks along them and a Vehicle drives over them.

## The Dock on the World Map

The Dock was drawn on every Island's World Map view, but at a sixth of its exploring size it was a thin line. On the World Map, each Island's Dock now also has a wider pier, widened away from the ship's berth, with white edges, piles, a red-and-white beacon at its end, a harbour hut and a crane (`island-map-harbour.ts`), merged into the Dock's one mesh.

## Within the budget

Each Island adds four meshes when exploring (the track, the bridges, tunnels and Stations as one merged mesh, the roads, and the Train's locomotive and carriages), and one more for a placed Vehicle. The track is about 15,000 to 22,000 triangles, the structures 13,000 to 18,000, the roads 5,600 to 11,600, a Train 9,000 to 18,500 and a Vehicle up to 6,000. The exploring triangle budget is raised from 300,000 to 380,000 to fit them.

## Consequences

- Trees, bushes, rocks and houses keep 1.4 map units off the track and the Station buildings and 0.5 off the roads, on the World Map as well as when exploring, so some that stood there are no longer drawn. Sunscorch Sands loses the most: its palms grow on the beaches the Railway runs along, and its many roads cross the new lands, so the copies of its scenery on the new lands fall from more than 60 to about 25.
- The Train isn't solid; the Character can walk through it.
- Where the track runs on an embankment more than a step above the ground, the Character walks through the embankment rather than climbing it.
- A placed Vehicle isn't saved: it goes back to the garage when the Child leaves the Island.
