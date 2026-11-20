# Cloud Castle's 60 Science games are data, played at ten lab stations

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for Pop the Bubble to come out of Cloud Castle, and for Science games in its place: 10 different games for each of Years 1 to 6, 60 in all, each following that year's National Curriculum, fun and in 3D that looks professional rather than childish, with a "Science" heading on the World Map so a Child can see what the Region is for.

Science is a fourth Subject. Each Year Group's ten games live in one curriculum file, `src/curriculum/science-games.year-N.json`. A game names its title, the statutory requirement it teaches, its Lab Station, the 3D prop it shows and at least six Questions, and `science-games.ts` checks all of it when the curriculum loads. Every game is its own Skill (`science.<game id>`) in its Year Group, so mastery, Reviews and the Parent's charts work as they do for Maths and Phonics.

| Lab Station   | How it asks                         | Its 3D choices      |
| ------------- | ----------------------------------- | ------------------- |
| `sort`        | Which group does this belong in?    | Sample trays        |
| `odd-one-out` | Which one doesn't belong?           | Specimen jars       |
| `true-false`  | Is this statement true or false?    | Illuminated keys    |
| `fill-gap`    | Which word completes the sentence?  | Glass word tiles    |
| `sequence`    | What comes next in this cycle?      | Hex tiles           |
| `mystery`     | Read the clues: what am I?          | Petri dishes        |
| `predict`     | What will happen if …?              | Conical flasks      |
| `vocabulary`  | Which word matches this definition? | Data cards          |
| `compare`     | Which is the most or the least?     | Graduated cylinders |
| `investigate` | Working scientifically              | Instrument cases    |

Each year uses each Lab Station once, so a Child's ten games all play differently, and the same station teaches different content in every year. All 60 are one Game Type, `science-lab`. Cloud Castle's panel lists the ten for the Child's own Year Group, or Year 1's when none is set.

The games are drawn in a dark laboratory: a graph-paper wall, a lab bench with a lit edge, a shelf of glassware, and the game's prop (one of 26, from a seedling to a DNA helix) turning on a turntable. Like Bubble Bay ([0015](./0015-bubble-bay-games-share-the-studio-stage.md)), the scene is drawn smooth with studio lighting and reflections, and the choices are HTML buttons over the 3D objects, with their words on a frosted label beneath each one. It shares the growing-choice and prompt hooks in `studio-stage.tsx` with Bubble Bay and Crystal Caves.

Cloud Castle is for one Subject, `"subject": "science"` in `world-map.json`, the way Crystal Caves is for Phonics ([0016](./0016-crystal-caves-is-the-phonics-region.md)). So its only Missions are Science, and the World Map raises "Science" over the castle and shows it on the Region's panel and chip.

## Consequences

- Every one of the 60 games is drawn within the [performance budget](../performance-budget.md) of 10,000 triangles and 40 meshes, checked game by game in `src/client/science-lab.test.tsx`.
- Each Lab Station says its instruction aloud, plus one hint line: 11 new voice-over lines in the same Piper voice ([0007](./0007-audio-is-made-before-release.md)). The Questions themselves are read on screen, not spoken; a Year 1 Child who can't read them yet needs an adult, or spoken Questions later.
- Migration `0012` adds Science to every Child whose Parent had allowed all three earlier Subjects. A Child whose Parent narrowed their Subjects stays as they were, and the Parent can add Science on the dashboard.
- The Parent's "Skills mastered" now counts the 60 Science Skills across every year, as it already counts every Phonics sound.
- Cloud Castle no longer has Listen and Pick or Pop the Bubble. Both are still played in Bubble Bay and Whispering Woods.

## Considered Options

- **One Game Type per game, 60 in all**: each would need its own scene, voice-over and code path, for games that differ in content rather than in how they are played.
- **Ten Game Types with content for every year**: gives each year the same ten titles, where the owner asked for different games in every year.
- **Generating the questions in code**, as the Maths games do: science facts aren't arithmetic, so they are written out and reviewed as data instead, like the Phonics programmes.

## Amended

Amended by [0025](./0025-one-island-per-year-group.md): this Region is on Island 1 and now plays Year 1 only, with its Games unlocked one at a time by Stars. Each other Island has its own Region for this Subject, under its own name, playing that Island's Year. Where this record says the Child plays their own Year, or unlocks the Region by Mastered Skills, the Island design replaces it.
