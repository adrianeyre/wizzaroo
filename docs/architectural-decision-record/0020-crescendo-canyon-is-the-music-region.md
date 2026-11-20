# Crescendo Canyon is the Music Region, with 60 games synthesised in the browser

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for a new Region on the World Map for Music, with an interesting name, and 10 unique games for each of Years 1 to 6 that follow the National Curriculum and are fun, 3D and professional-looking.

Music is a fifth Subject, and Crescendo Canyon is a Region for it alone (`"subject": "music"` in `world-map.json`), the way Crystal Caves is for Phonics ([0016](./0016-crystal-caves-is-the-phonics-region.md)). It stands on the west coast at (-17, 1), marked by a band shell with a giant golden quaver and, once it opens, notes spiralling up from it. It is the last Region in the list, so it opens after 20 Mastered Skills, or earlier if a Parent unlocks it. Migration 0013 gives Music to every Child whose Parent had allowed all four earlier Subjects, as 0012 did for Science.

## The games

Each game is its own Game Type and its own Skill (`music.<skill>`) in its Year Group, so Mastery, Reviews, Stars and the Parent's charts work as before. Unlike the Science and English games, which are question data played by a handful of shared game shapes, every music game is code: its questions are built at random from music theory (notes, scales, intervals, chords, rhythms and tempo), so no two Missions sound the same. A game is defined with `defineMusicGame` in `src/curriculum/music-year-N.ts` and names its Skill, title, instruction, hint, how each choice is drawn and sounds, and a `buildQuestion(difficulty, random)` for each of three difficulties, one per Activity.

The 60 games follow the National Curriculum's programmes of study for music at Key Stages 1 and 2: listening with attention, the inter-related dimensions of music (pitch, duration, dynamics, tempo, timbre, texture and structure), staff and other notation, and music from great composers and from history. The order within each year follows the Department for Education's Model Music Curriculum (2021).

| Year | Games                                                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Big drum, little drum · The hare and the tortoise · Bird or bear? · Drum beat counter · Clap, stamp, click · Percussion detective · Carnival of the animals · Long and short sounds · Echo mountain · Up, down or stay? |
| 2    | Ta and ti-ti · Volume rollercoaster · The music train · Frog steps and leaps · Glockenspiel echo · Shh! Find the rest · Instrument detective · Feelings theatre · Dot-to-dot tunes · Is it home?                        |
| 3    | March or waltz? · How many beats? · Forte or piano? · Allegro or adagio? · Loop counter · Staff climbers · Layer cake · Orchestra families · Bar builder · Solfa ladder                                                 |
| 4    | Spot the mistake · Sunshine or rain? · Piano key detective · Dynamics journey · Shape of the song · Time signature tiles · Note stack · Orchestra seating plan · Round and round · How is it played?                    |
| 5    | Dotted rhythm detective · Chord castle · Interval leap · Note word puzzle · Sharps and flats · Composer gallery · Off-beat party · Scale explorer · Beat sums · Rondo roundabout                                        |
| 6    | Music time machine · Romantic composer gallery · Bass clef basement · Smooth or spiky? · Triad tower · Key signature codebreaker · Movie score studio · Triplet trail · Melody dictation · Conductor's challenge        |

The composer games play the opening themes of public-domain pieces (Vivaldi, Pachelbel, Mozart, Beethoven, Haydn, Grieg, Brahms, Dvořák and Tchaikovsky), written out once in `music-tunes.ts`.

## Sound

Every sound is synthesised in the browser with the Web Audio API (`src/client/music-player.ts`): about 35 instruments made from oscillators, filters, envelopes and noise, from a piano and a glockenspiel to a tuba, a triangle and a hand clap. A clip is data (`MusicClip`: tempo, voices, notes, loudness, swells and changes of speed), so the curriculum code can build it and its tests can check what it plays without any audio. Nothing is recorded, so the 60 games add no audio files beyond voice-over. Wrong answers play the sound of the choice that was tapped, so a mistake still teaches, and reading games play the notes back after a right answer.

The games' sounds are synthesised approximations. A Child can tell a drum from a triangle and a violin from a trumpet, but an oboe and a clarinet are close. Replacing the synthesis with CC0 samples ([0009](./0009-cc0-asset-packs-by-default.md)) is the next step if a game proves too hard to hear.

## Drawing

The games share one smooth stage ([0013](./0013-popping-bubbles-is-drawn-smooth.md)): a sunset canyon with stars, a band shell, a plank stage with footlights, coloured spotlight beams, and golden notes that rise faster and glow brighter with the music's loudness. The prompt is one of eight props (a gramophone, a drum with beat lamps, a keyboard that lights the keys being played, a music stand, a conductor's baton tracing the beat pattern, a solfa ladder, a lily pond and an instrument on a turntable). Each choice is one of seven: a drum pad, a card, a model on a pedestal, a mood mask, a glockenspiel bar, a row of section blocks or a layer cake. The 3D models (instruments, animals, weather and stairs) are merged low-poly meshes in `music-models.ts`.

Notation is engraved onto canvas textures by `music-notation.ts`: staves, treble and bass clefs, notes with stems, flags, beams and ledger lines, sharps, flats, key and time signatures, rests, triplets and dynamics, plus the graphic notation the younger years use (long and short bars, dots for so-mi-la, claps and stamps). The choices are HTML buttons over the 3D objects, as everywhere else, with their words inside, as a caption beneath, or, where a word would give the answer away, only in their accessible name.

## Consequences

Every game, at every difficulty, stays within 10,000 triangles and 40 meshes, checked by `src/client/music-stage.test.tsx`. The busiest is Orchestra seating plan at 9,972 triangles and 29 meshes.

Each Year 1 and Year 2 game speaks its own short instruction, because those children are still learning to read. Years 3 to 6 hear one of two shared lines ("Listen carefully" or "Look carefully, then tap your answer") and read the game's instruction on screen. That keeps the offline download at 13.9 MB, inside the 15 MB budget. Speaking all 60 instructions took it to 17 MB.

The Region's panel uses the Year tabs that Whispering Woods introduced, opening on the Child's own Year.

## Considered Options

- **One Game Type for all 60, with the games as data**, as the Science games are. Music games differ in what they play as much as in what they ask: a rhythm, a chord after a home chord, a melody in canon. So their questions are built in code, and each game is its own Game Type.
- **Recorded audio for every sound**: far more realistic instruments, but tens of megabytes for 60 games with random questions, well beyond the offline budget.
- **Unicode music symbols in a font**: support for the musical symbols block varies between devices, so the clefs and notes are drawn as paths instead.

## Amended

Amended by [0025](./0025-one-island-per-year-group.md): this Region is on Island 1 and now plays Year 1 only, with its Games unlocked one at a time by Stars. Each other Island has its own Region for this Subject, under its own name, playing that Island's Year. Where this record says the Child plays their own Year, or unlocks the Region by Mastered Skills, the Island design replaces it.

Amended by [0033](./0033-place-knowledge-and-chant-along-games.md): Crescendo Canyon on Island 1 also has Chant along, a Year 1 game about chants and rhymes, as an extra Game beside its ten.
