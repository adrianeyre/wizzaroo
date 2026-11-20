# Locked Islands can be travelled to and explored

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Until now an Island above the Child's Year, or one a Parent had turned off, could not be travelled to or explored ([0029](./0029-islands-can-be-explored-on-foot.md), [0041](./0041-islands-grow-new-lands-with-ring-races-and-the-ship-sails-the-world-map.md), [0042](./0042-filled-new-lands-movable-pop-ups-a-gangplank-and-the-walker.md)). Pressing its Year just flew the camera there, it had no **Explore** button, and the walker dropped on it asked for another Island. A Year 1 Child has every other Island locked, so to them the ship, aeroplane, helicopter, hovercraft, submarine and hot-air balloon never came, and the walker and **Explore** only ever worked at home. The owner asked that a Child be allowed to explore every Island, even a locked one.

## Locking keeps Games shut, not Islands

`canSailTo` in `src/client/islands/island-explore-hud.tsx` now asks only whether the Island has an adventure, not whether it is unlocked. The World Map's Year buttons, the explore bar's Year buttons, the **Explore** button and the walker drop all use it, so pressing a locked Island's Year starts a journey on a craft chosen at random, and the Child can walk about a locked Island like any other.

A locked Island's Regions are still greyed out under a cloud with a padlock. Going into one, on the map or on foot, still shows "Ask a grown-up to open this Island" and no Games, so locking still decides what a Child can play.

This supersedes the parts of 0029, 0041 and 0042 that kept locked Islands out of reach.
