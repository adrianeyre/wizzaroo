# A hill over every tunnel

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner said that since the tunnel portals were made bigger than the Train ([0052](./0052-tunnel-portals-are-bigger-than-the-train.md)), the hills they go into were too small: the entrance was bigger than its hill.

## What was wrong

A tunnel is dug wherever the Railway's smoothed track runs more than 3 below the ground ([0046](./0046-railways-roads-and-vehicles-on-every-island.md)). So most tunnels go under low rises. The ground 15 behind a portal was only 1 to 5 above the track, and at some portals it was below it. The portal's stonework now reaches 5.2 above the track when exploring, and 13.5 on the World Map, where it is drawn at the map Train's size. Every portal stood taller than the hill behind it, on every Island.

## What changes

- **A hill over each tunnel.** Each Island's ground (`findTerrainHeight`, `findFrostHeight`, `findSandsHeight`, `findJungleHeight`, `findEmberHeight` and `findStarfallHeight`) now goes through `raiseTunnelHills` in `island-tunnel-hills.ts`. That raises a rounded hill over every tunnel. It is 16 above the track along the tunnel (`tunnelHillCrest`), higher than the World Map's portals, and its sides slope down to nothing 30 from the track. Where the ground is already higher, it is left as it was. The explore view and the World Map draw the same ground, so the hill shows in both.
- **Cut back at the portals.** In front of each portal the ground stays as it was, 3 to either side of the track, with the cutting's sides rising beside it. Just behind the portal's face the hill rises steeply, 1.8 up for each 1 back. So it stands above the portal's top 3.5 behind the face when exploring. On the World Map it stands above the portal within 15. The ground is a mesh with points 3.75 apart, so a steeper face would bury the front of the opening.
- **Kept off everything else.** The hill's sides keep off the rest of the open track and its bridges, and off these:
  - the Stations
  - the Attractions and Curiosities, whose terraces are kept at their own heights
  - the Wonders
  - the Dock and the hover pad
  - the Region landmarks and the Island's features
  - the airfield
  - the sea, rivers and pools, which are never raised; the hill rises from them steeply, like a bank or a cliff

  Signs, lookouts, hideaways, friends and race rings stand on the ground wherever it is, so they go up with the hill.

- **Worked out once, then kept.** The hill is shaped from the tunnels, and the tunnels from the ground, so the Railway is laid on the ground without the hills (`withoutTunnelHills`). So are the Attractions' and Curiosities' sites, which the hills then keep off. `pnpm run generate:tunnel-hills` writes each hill's tunnel track, portals, nearby open track and what it keeps off into `island-tunnel-hill-sites.ts`, from `describeTunnelHills` in `island-tunnel-hill-placing.ts`. The ground needs no Railway to work out its height.

## Consequences

- The track, its tunnels and bridges, and where the Train is cut off are as before. The Railway, the Attractions and the Curiosities are laid out on the same ground as before, so none of them moves.
- Sunscorch Sands' fifth tunnel runs along a sea cliff, so its east portal has the sea beside it. The hill there rises over the tunnel but can't come down that side.
- Trees, rocks and the other things scattered over an Island find the ground with the same height functions, so they stand on the new hills.
- If the Railway's route or the ground under a tunnel changes, run `pnpm run generate:tunnel-hills` again.
- `island-tunnel-hills.test.ts` checks the kept hills are what the placer finds now. For every portal on every Island, it checks the ground just behind rises above the portal, at its exploring size and its World Map size. It also checks the ground in front of each portal is as it was, as are the open track, the Stations and the Attractions, and that no sea, river or pool is raised.
