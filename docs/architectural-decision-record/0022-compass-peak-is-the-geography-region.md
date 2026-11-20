# Compass Peak is the Geography Region, with 60 games played in 13 scenes

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for a new Region on the World Map for Geography, with an interesting name, and 10 unique games for each of Years 1 to 6 that follow the National Curriculum and are fun, 3D and professional-looking.

Geography is a sixth Subject, and Compass Peak is a Region for it alone (`"subject": "geography"` in `world-map.json`), the way Crescendo Canyon is for Music ([0020](./0020-crescendo-canyon-is-the-music-region.md)). It stands inland in the south-west at (-11, -10), between Whispering Woods and the volcano, marked by a giant brass-stand globe that turns once the Region opens. It is the last Region in the list, so it opens after 25 Mastered Skills, or earlier if a Parent unlocks it, and every earlier Region keeps its threshold. Migration 0014 gives Geography to every Child whose Parent had allowed all five earlier Subjects, as 0013 did for Music.

## The games

Each game is its own Skill (`geography.<skill>`) in its Year Group, on one of the National Curriculum's four strands (locational knowledge, place knowledge, human and physical geography, and geographical skills and fieldwork), so Mastery, Reviews, Stars and the Parent's charts work as before. Like the Science games ([0018](./0018-science-games-are-data-played-at-ten-lab-stations.md)), the games are data: `geography.year-N.games.json` holds each game's title, Skill, scene, instruction and 12 to 14 questions, 733 in all. A question names what its scene shows (a continent to light up, a pin's latitude and longitude, a compass direction, a map symbol, a grid reference), its answer and three or more wrong answers. `parseGeographyGames` checks every one against the vocabulary its scene can draw, and that each grid-reference answer is the square the pin is really in. A Mission is two Activities of five different questions, with three wrong answers drawn at random.

All 60 share one Game Type, `geography-games`, and the Region's panel uses the Year tabs, opening on the Child's own Year.

| Year | Games                                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Weather Watchers · Season Spinner · Four Nations Flight · Which Way, Wizz? · Land Explorer · Busy Town Builder · Hot or Cold? · Globe Hop · Bird's-Eye Spy · Weather Chart Champs      |
| 2    | Continent Quest · Ocean Voyage · Capital Hoppers · Seas Around Us · Compass Treasure Hunt · Seaside Spotters · Map Key Makers · Safari and Shire · Equator Explorer · Traffic Tally    |
| 3    | Europe Express · Eight-Point Island · Grid Detective · Volcano Lab · Journey to the Core · UK City Spotter · Climate Zone Tour · Land Use Lookout · Symbol Safari · Rain Gauge Records |
| 4    | River Run · Water Cycle Workshop · Hemisphere Hop · Four-Figure Finder · Americas Adventure · Peaks and Rivers · Settlement Sizer · Biome Builders · Coastal Carvers · Ring of Fire    |
| 5    | Line Hunters · Meridian Mission · Six-Figure Sleuth · Summit Seekers · Resource Rangers · Food Miles Freight · Climate Graph Lab · Navigator's Challenge · Mighty Rivers · Quake Quest |
| 6    | Time Zone Trekker · Capital Quest · Power Up! · City Zone Planner · Population Towers · OS Map Master · River Deep Dive · Grid Ref Rescue · Extreme Environments · UK Road Trip        |

## Drawing

Every game is drawn smooth on one stage ([0013](./0013-popping-bubbles-is-drawn-smooth.md)): a sky in the scene's own colours, a wooden plinth with a brass rim, and the Companion. On it stands one of 13 scenes, built in code under `src/client/geography/`:

- a globe on a brass meridian, painted from continent outlines, that turns to face what it shows and can light half the world for day and night;
- a raised map of the British Isles, nation by nation;
- Wizz on a compass island with eight landmarks;
- a window on a garden in any weather and season;
- a turntable of 27 landscape features, from a beach to a sea stack;
- an Ordnance Survey map symbol under a magnifying glass;
- a grid-reference board;
- a biome under a glass dome;
- a river valley from source to sea, which also shows the water cycle;
- a volcano, the Earth's layers, or a fault in the crust, cut open;
- a settlement, land-use or city-zone board;
- a resource in a crate on a dock;
- a bar chart.

Nothing in a scene names the answer: no label on the glowing continent, no value on a bar.

## Consequences

Every scene, for every value it can be asked to show, stays within 10,000 triangles and 40 meshes: 5,486 to 9,864 triangles and 15 to 31 meshes, checked for all 192 by `src/client/geography/geography-stage.test.tsx`. The globe's surface is one 512 × 256 canvas texture, at the limit for one texture.

The games add no audio. They reuse Music's two shared lines, "Look carefully, then tap your answer." and "Not quite. Look again carefully, then have another go.", and each game's own instruction is read on screen. That keeps the offline download at 14.73 MiB, inside the 15 MB budget, which is now nearly full. Speaking an instruction for each of the 13 scenes cost 2.1 MB, and even two Geography lines of its own took it over once the Maths games arrived.

## Considered Options

- **A Game Type for each scene**: the 13 scenes are presentations of one game shape, a question about something drawn, so they are data on one Game Type, as the Science stations are.
- **Spoken questions for Years 1 and 2**, as Music speaks its Year 1 and 2 instructions and Maths its Year 1: about 240 questions, well over the offline budget. Short questions and the shared spoken instruction stand in until the budget is raised.
- **A real map projection from Natural Earth data**: accurate coastlines, but a large data file for a texture that is 512 pixels wide. The outlines are simplified by hand, with tests that cities fall on their own continent or in their own UK nation, and seas in their own ocean.

## Amended

Amended by [0025](./0025-one-island-per-year-group.md): this Region is on Island 1 and now plays Year 1 only, with its Games unlocked one at a time by Stars. Each other Island has its own Region for this Subject, under its own name, playing that Island's Year. Where this record says the Child plays their own Year, or unlocks the Region by Mastered Skills, the Island design replaces it.

Amended by [0033](./0033-place-knowledge-and-chant-along-games.md): a 14th scene, `region-tour`, plays Three Regions Tour, a Year 5 place-knowledge game that is an extra Game in Obsidian Peaks on Island 5, beside its ten.
