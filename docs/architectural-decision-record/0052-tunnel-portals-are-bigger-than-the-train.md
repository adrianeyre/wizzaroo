# Tunnel portals are bigger than the Train

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner said the tunnel entrances were smaller than the Train, so it didn't look as if it went into the tunnel.

## What was wrong

A tunnel's portal ([0046](./0046-railways-roads-and-vehicles-on-every-island.md)) had a dark opening 2.8 wide and 3.0 above the track. When exploring, the Trains are about 1.5 wide, and Frost Isle's raised pantograph reaches 2.88 above the track, so it only just cleared the top. On the World Map the Train is drawn at 2.6 times its size ([0047](./0047-the-railway-and-its-train-on-the-world-map.md)), about 3.9 wide and 7 tall, but the portals were drawn at their exploring size. So the Train was far bigger than the opening it was cut off at ([0050](./0050-trains-go-into-their-tunnels.md)).

## What changes

- **A bigger opening.** The opening is 3.4 wide and 3.9 above the track, with the stone piers and lintel round it (`tunnelOpening` in `island-railway-design.ts`). Every Train goes in with room to spare round its sides and above its roof, pantograph and overhead wires.
- **The World Map's portals.** The map draws its tunnel portals at the Train's map size (`mapTrainScale`), so the map's Train goes into them as well.

## Consequences

- Only the portals change. The track, the tunnels, where the Train is cut off and the overhead line are as before.
- `island-tunnel-portals.test.ts` measures every Island's Train, when exploring and on the World Map, and checks the opening is wider and taller than it with room to spare.
