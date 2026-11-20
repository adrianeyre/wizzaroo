# Crystal Caves is the Phonics Region, with ten games for Year 1 and ten for Year 2

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for Pop the bubbles to leave Crystal Caves, for ten new Phonics games there for each Year Group the National Curriculum teaches phonics in, and for a "Phonics" heading on the World Map so a Child knows what the Region is for.

## Which years

The National Curriculum in England (English programmes of study) makes phonics statutory in Year 1 ("apply phonic knowledge and skills as the route to decode words") and Year 2 ("continue to apply phonic knowledge and skills as the route to decode words until automatic decoding has become embedded"). No statutory requirement for Years 3 to 6 mentions phonics. The overviews only say a pupil who still struggles to decode should be taught through a systematic phonics programme so they catch up. So there are games for Year 1 and Year 2 only, ten each.

A Child sees the ten games for their own Year Group. A Child with no Year Group, or one in Year 3 to 6, who would only be in Crystal Caves to catch up on phonics, sees all twenty, each card labelled with its year.

## The games

Each game is one new Phonics Skill on the `word-reading` or `spelling` strand, in its game's Year Group, with no sound of its own. That is why a Phonics Skill now needs `sounds` only on the `grapheme-phoneme-correspondences` strand. The games are data, in `src/curriculum/phonics-games.year-1.json` and `phonics-games.year-2.json`, parsed and checked by `src/curriculum/phonics-games.ts`. Each holds the game's National Curriculum objective, the question it asks, its spoken instruction, the hint for a wrong answer, and 14 to 24 questions with one answer and one to three distractors.

| Year | Game           | Covers                                                            |
| ---- | -------------- | ----------------------------------------------------------------- |
| 1    | Crystal blend  | Blending sounds, including digraphs and trigraphs, to read a word |
| 1    | Real or alien? | Real and alien (pseudo) words, as in the Phonics Screening Check  |
| 1    | Sound counter  | Segmenting: how many sounds a word has                            |
| 1    | Digraph dig    | Finding the digraph or trigraph in a word                         |
| 1    | Magic e        | Split digraphs a-e, e-e, i-e, o-e, u-e                            |
| 1    | Tricky words   | Year 1 common exception words                                     |
| 1    | One or more    | Plurals with -s and -es                                           |
| 1    | Word endings   | -ing, -ed, -er, -est where the root word doesn't change           |
| 1    | Un- words      | The prefix un-                                                    |
| 1    | Sound spotter  | The same sound in different spellings                             |
| 2    | Edge or age    | The /dʒ/ sound spelt -dge, -ge and g                              |
| 2    | Soft c         | The /s/ sound spelt c before e, i and y                           |
| 2    | Silent starts  | kn, gn and wr at the start of words                               |
| 2    | Tail endings   | -le, -el, -al and -il                                             |
| 2    | Change y to i  | Adding -es, -ed, -er, -est to words ending in y                   |
| 2    | Drop the e     | Adding suffixes to words ending in e                              |
| 2    | Double up      | Doubling the last consonant before a suffix                       |
| 2    | Suffix smith   | -ment, -ness, -ful, -less and -ly                                 |
| 2    | Short forms    | Contractions                                                      |
| 2    | Homophone hunt | Year 2 homophones and near-homophones                             |

They are one Game Type, `phonics-games`, built by `buildPhonicsGameMission`: three Activities of five questions, each Activity on the game's own Skill.

## How they look

They are drawn the way Bubble Bay's games are ([0015](./0015-bubble-bay-games-share-the-studio-stage.md)): smooth, antialiased, lit, with the smooth Companion. Their stage is a crystal cave in `src/client/crystal-cave-games.tsx`: a rock wall and a floor with glowing veins, both shaders, one instanced mesh of wall crystals, one of stalactites, and drifting motes. Year 1's crystals are amethyst and Year 2's sapphire.

There are ten scene objects that show the prompt: crystal tiles, a stone tablet, a hanging lantern, a geode, a minecart, a crystal orb, a rune ring, a gem chest, an open book and an obelisk. There are six choice props: a gem, a shard, a runestone, an orb, a cluster and a diamond. Within a Year Group every game has its own scene object, which the parser enforces, so no two games in a year look alike. Words are drawn onto the objects with canvas textures of at most 512 × 298. Every prompt is also in the page as text for screen readers, with sound tiles read as separate sounds and a gap read as "blank". The choices stay HTML buttons, with each word on a dark glass label over its prop.

The helpers both kinds of games share (growth, bobbing, prompt position, instancing) moved from `bay-games.tsx` into `studio-stage.tsx`.

## The heading

A Region can now be for one Subject (`"subject": "phonics"` in `world-map.json`). Such a Region holds Missions from that Subject alone. Every other Region still needs Missions from at least two Subjects. The Subject is shown as a heading in three places:

- on the 3D World Map, as a plaque floating over the Region's landmark, even while it is locked (`src/client/region-heading.tsx`)
- above the Region's name in its panel
- on its chip in the Region list, and in that chip's accessible name

## Consequences

- The PRD's "Regions aren't one per Subject" no longer holds for every Region, and the Glossary's Region entry now allows a Region for one Subject.
- Every scene stays within the 10,000 triangles and 40 meshes of the [performance budget](../performance-budget.md), checked for every game's longest prompt by `src/client/crystal-cave-games.test.tsx`. The scenes use 5,222 to 9,338 triangles and 19 to 30 meshes.
- Each game speaks its instruction, made with the same Piper voice as the rest ([0007](./0007-audio-is-made-before-release.md)). That is 20 lines, plus a shared Phonics hint and a fallback. Their text is the game file's instruction word for word, which a test checks.
- `crystal-cave-games.test.tsx` and `world-map-scene.test.tsx` run in happy-dom, since the word plaques and the map heading draw on a canvas.

## Considered Options

- **Phonics games for Years 3 to 6 too**: asked for first, but phonics isn't in the National Curriculum after Year 2. Spelling rules from Year 3 on belong to English, so the owner asked for phonics games only in the years that teach it.
- **One Game Type per game**: twenty more Game Types with their own code paths, when all twenty are multiple choice over a prompt and differ only in their content and scene.
- **3D text**: needs a font in the bundle and many triangles per letter. Canvas textures draw crisply at a fraction of the cost.

## Amended

Amended by [0025](./0025-one-island-per-year-group.md): this Region is on Island 1 and now plays Year 1 only, with its Games unlocked one at a time by Stars. Each other Island has its own Region for this Subject, under its own name, playing that Island's Year. Where this record says the Child plays their own Year, or unlocks the Region by Mastered Skills, the Island design replaces it.
