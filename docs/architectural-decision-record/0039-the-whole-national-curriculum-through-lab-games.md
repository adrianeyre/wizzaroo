# The whole National Curriculum, through lab games in every Subject

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for every Game in every Year to be checked against the UK National Curriculum, for the whole of it to be covered, and for the Parents and Teachers page to link each Subject to its curriculum. Wizzaroo follows the National Curriculum in England, whose programmes of study are on GOV.UK.

[0034](./0034-curriculum-points-show-gaps-to-parents.md) gave every programme-of-study _heading_ a Game. An audit of every Game's questions against every _statutory statement_ found the headings were covered, but many statements inside them were not. In Maths there was no money, mass, capacity, Roman numerals, rounding, primes, angles in degrees or circles, and nine Year 6 Skills were played only in the Checks. In English, verb tenses and the passive were only in the Grammar Check, and expanded noun phrases, antonyms, several Appendix 1 spelling rules and proof-reading were missing. Science, Geography, Computing and Music each had a few thin statements. History had no gaps. Art and design, Design and technology and Languages, all statutory at Key Stage 2 and the first two at Key Stage 1, had no Region at all.

## One data-driven question engine for every Subject

The Science lab ([0018](./0018-science-games-are-data-played-at-ten-lab-stations.md)) already played multiple-choice games written as data. It is now the **lab**, and any Subject can have lab games (`src/curriculum/lab-games.ts`):

- `lab-games.<subject>.year-<N>.json` holds a Subject's lab games for one Year. Each game names the statutory requirement it teaches, and its `strand` is the Curriculum Point it serves.
- Each game is its own Skill, `<subject>.<id>`, unless it names an existing `skillId`. That is how the nine Year 6 Maths Skills, `english.verb-tenses` and `english.active-and-passive-voice` finally get a Game.
- The ten `science-games.year-<N>.json` files are unchanged and still need one game at each of the ten stations. Other Subjects may use only the six stations whose spoken instruction names no Subject: sort, odd-one-out, true-false, sequence, mystery and compare. The other four say "science word" or "like a scientist", so no new voice-over is needed.
- Gap games are **extra Games** in their Subject's Region on their Year's Island, open from the start, like the Maths gap games of [0031](./0031-maths-gap-games.md). The ten Games that unlock by Stars are unchanged.

There are 105 gap games: 53 in Maths, 37 in English, 8 in Science, 2 in Geography, 2 in Computing and 3 in Music.

## Three new Subjects

| Subject               | ID          | Years | Region on each Island                                                                                        | Landmark   |
| --------------------- | ----------- | ----- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| Art and design        | `art`       | 1-6   | Rainbow Easel, Frost Gallery, Mosaic Courtyard, Canopy Studio, Molten Gallery, Stardust Studio               | an easel   |
| Design and technology | `design`    | 1-6   | Tinker Mill, Sleigh Workshop, Camel Gearworks, Vine Workshop, Bellows Workshop, Orbit Workshop               | a workshop |
| Languages (French)    | `languages` | 3-6   | Echo Well, Parrot Point, Ember Embassy and Galaxy Gate, the names the product requirements already gave them | an embassy |

Each Region holds ten lab games a Year that unlock in order, like every Subject Region. The three landmarks are shared by every Island, as the Big Top is, and drawn in `src/client/world-map-models.ts`. Languages is taught from Year 3, as the National Curriculum requires, so Meadow Isle and Frost Isle have no Languages Region. A Subject ID has no hyphen, because a Skill ID is `<subject>.<name>`.

The Curriculum Points for these Subjects follow their Key Stage programmes of study. Where a statement is about doing (drawing, sculpting, making, cooking), the games teach the knowledge behind it: which material or tool suits a job, the steps of a technique, safety and hygiene. Four Languages statements are left out because they are only about listening and speaking (listening attentively, speaking in sentences, pronunciation and intonation, presenting orally), as spoken language is left out of English.

**Physical education** is statutory too, but every one of its statements is something a Child does with their body, so it has no Region. **RE**, **PSHE** and **RSE** are not part of the National Curriculum.

## A link to each programme of study

Each `curriculum-points.<subject>.json` carries `programmeOfStudyUrl`, which must be on `https://www.gov.uk/`. Each Subject's section of the National Curriculum progress on the Parents and Teachers page links to it, opening in a new tab. Phonics links to the English programme of study, where Year 1 and Year 2 word reading lives. Below the Subjects, the page also links to Physical education's programme of study, saying why no Game teaches it, and to the whole National Curriculum in England (`src/curriculum/national-curriculum.ts`).

## Considered Options

- **A bespoke 3D game for each gap**, as Maths had in [0031](./0031-maths-gap-games.md): hundreds of statements would have needed hundreds of scenes, and the offline download is already close to its budget.
- **More levels inside existing games**: each plays one Skill per Year, and a statement folded into another Skill would never show as its own gap.
- **Physical education as knowledge questions** (rules of games, water safety): that would teach facts about PE, not PE, and its points would read as complete when the Child had done none of it.
- **Languages in a Child's own chosen language**: the product requirements ask for it, but it needs a per-Child setting and content in each language. French, the language most English primary schools teach, comes first; the files leave room for more.

## Consequences

Every Year now has many more open extra Games in Maths and English Regions. The Region panel lists them after the ten that unlock by Stars. Lab games have no pictures, so each question is answerable from its words alone.

The Skills total rises from 534 to 788. The Mastery charts, the Subject colours (`--chart-art`, `--chart-design`, `--chart-languages`) and the Subject switches a Parent turns on and off all list the new Subjects. New Regions are on by default, so existing Children get them with no migration.

The easel and workshop add one mesh each to Meadow Isle on the World Map, which took its mesh budget from 60 to 62, and the lab games add 0.46 MiB to the offline download, which stays under 15 MiB ([performance budget](../performance-budget.md)). Two Art games use a lighter prop, since the planet and sun props with long sorting labels went over the lab's triangle budget. Each new Region sits within reach of an existing trail, so exploring on foot reaches it with no new trail.
