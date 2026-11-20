# Whispering Woods teaches English from Year 1 to Year 6

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for popping bubbles to leave Whispering Woods, and for Whispering Woods to hold English games that follow the National Curriculum: different games for every Year from 1 to 6, 60 in all, drawn in 3D that looks professional rather than childish, with a heading on the World Map that says "English".

## Decision

Whispering Woods becomes the English Region, the way Crystal Caves is the Phonics Region ([0016](./0016-crystal-caves-is-the-phonics-region.md)): its `subject` is `english`, so every Mission in it is English, and listen-and-pick, which Crystal Caves already holds, leaves it. It holds 10 English Game Types. Each Game Type has its own Skill in every Year Group, so a Year 1 Child and a Year 6 Child play the same kind of game on different statutory content. The 60 Skills are files in `src/curriculum` like every other Skill ([0006](./0006-curriculum-and-content-are-files-in-the-repo.md)), and each Game Type's questions for all six Years live in one `english-<game>.ts` file.

| Game Type            | Title              | Y1                           | Y2                                | Y3                                   | Y4                                | Y5                                  | Y6                                   |
| -------------------- | ------------------ | ---------------------------- | --------------------------------- | ------------------------------------ | --------------------------------- | ----------------------------------- | ------------------------------------ |
| `alphabet-train`     | Alphabet train     | The alphabet in order        | -er and -est                      | Dictionary order, two letters        | Dictionary order, three letters   | Dictionary order, four letters      | Adverbials of time and number        |
| `word-lanterns`      | Word lanterns      | Rhyme                        | Rhymes spelt differently          | Word families                        | Nouns that avoid repetition       | Greek and Latin roots               | Formal vocabulary                    |
| `one-or-many`        | One or many?       | Plurals with -s or -es       | Plurals of words ending -y        | a or an                              | Standard English verb forms       | Subject and verb agreement          | The subjunctive                      |
| `word-workshop`      | Word workshop      | un-                          | -ful, -less, -ness, -ly           | dis-, mis-, re-, sub-, super-, anti- | in-, il-, im-, ir-, inter-        | Verbs with -ate, -ise, -ify, -en    | Hyphens after prefixes               |
| `punctuation-stones` | Punctuation stones | . ? !                        | Commas in lists, sentence types   | Inverted commas                      | Fronted adverbial commas          | Brackets, dashes and commas         | Colons, semi-colons, hyphens         |
| `suffix-potions`     | Suffix potions     | -ing, -ed, -er, -est         | Dropping e, doubling, y to i      | -ly, -ation, doubling with stress    | -ous, -tion, -sion, -ssion, -cian | -able, -ible, -cious, -tious, -cial | -fer words, -ant, -ance, -ent, -ence |
| `word-squeeze`       | Word squeeze       | Compound words               | Contractions                      | Plural possessive apostrophes        | Irregular plural possessives      | Modal verb contractions             | Writing contractions out in full     |
| `sound-alikes`       | Sound-alikes       | ff, ll, ss, zz, ck, nk, tch  | Homophones                        | Y3/4 homophones, accept to mail      | Y3/4 homophones, main to whose    | Y5/6 homophones, advice to guessed  | Y5/6 homophones, heard to wary       |
| `bridge-builder`     | Bridge builder     | Joining with and             | and, but, or, because, when, if   | Time and cause                       | although, unless, until           | Relative clauses                    | Linking adverbials                   |
| `word-detectives`    | Word detectives    | Capital letters for names, I | Nouns, verbs, adjectives, adverbs | Prepositions and conjunctions        | Determiners and pronouns          | Modal verbs and relative pronouns   | Subject and object                   |

Every Year's content comes from the statutory programmes of study and their Appendix 1 (spelling) and Appendix 2 (vocabulary, grammar and punctuation). Where a term is only statutory from a later Year, as noun and verb are from Year 2, the earlier Year plays something that is statutory for it instead.

The World Map panel shows the English games for one Year at a time, with Year tabs from Y1 to Y6. It opens on the Child's own Year, marked on its tab, and the Child can choose another Year to revise or stretch. The "English" heading is the Region subject heading from 0016: a plaque over Whispering Woods on the 3D World Map, a label above its name in the panel, and a tag on its Region chip.

The 10 scenes are set in a moonlit wood: a night sky with a moon and stars, two layers of pine trees, mist, a forest floor and fireflies, with the studio lights, Companion and shared choice motion that Bubble Bay and Crystal Caves use ([0015](./0015-bubble-bay-games-share-the-studio-stage.md)). Each Game Type has its own prompt object and its own choice object, such as a train with a carriage missing, a signpost and paper lanterns, a cauldron and potion flasks, or a rope bridge and planks. Words on 3D objects are painted into canvas textures of at most 512 × 256, with the app's own fonts. The choices stay HTML buttons, with their words on a dark chip so they read clearly over any object, and punctuation marks are named for screen readers ("Pick a full stop").

## Consequences

Every scene stays within the 10,000 triangles and 40 meshes of the [performance budget](../performance-budget.md), checked for every Game Type's busiest question by `src/client/woods-games.test.tsx`.

Each Game Type speaks one instruction, and a shared "read it again" line follows a wrong answer: 11 new Piper voice-over lines ([0007](./0007-audio-is-made-before-release.md)), 1.6 MB. The words of each question are not spoken, since recording hundreds of sentences would take the offline download past its 15 MB limit; they are on screen in the HUD as text that screen readers read.

The Parent's progress counts the 60 new Skills under English.

## Considered Options

- **10 games, each on one Year**: smaller, but a Year 5 or 6 Child would have had one game at their level.
- **60 separate scenes**: far more code and review for little gain; the same 10 scenes with Year-specific content give every Year its own 10 games.
- **Choosing the Year from the Child's Placement**: Placement isn't recorded per Subject yet, so the Child's Year Group opens the tabs and the Child can move between them.

## Amended

Amended by [0025](./0025-one-island-per-year-group.md): this Region is on Island 1 and now plays Year 1 only, with its Games unlocked one at a time by Stars. Each other Island has its own Region for this Subject, under its own name, playing that Island's Year. Where this record says the Child plays their own Year, or unlocks the Region by Mastered Skills, the Island design replaces it.
