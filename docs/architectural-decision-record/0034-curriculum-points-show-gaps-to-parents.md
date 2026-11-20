# Curriculum Points show a Parent where a Child's gaps are

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for the Parents and Teachers page to list every Subject with the key points of the National Curriculum for each Year, a progress bar beside each point, the Games that cover it, and how far the Child has got, so a Parent or Teacher can see the gaps and help. Every point must have a Game; where none did, a Game was made ([0031](./0031-maths-gap-games.md), [0032](./0032-english-reading-and-writing-games.md), [0033](./0033-place-knowledge-and-chant-along-games.md)).

A **Curriculum Point** is one heading of a programme of study, such as Year 1 "Multiplication and division" or Key Stage 2 "Place knowledge", with a one-sentence summary of what it asks for. They are files in the repo, one per Subject (`src/curriculum/curriculum-points.<subject>.json`), like every other piece of curriculum ([0006](./0006-curriculum-and-content-are-files-in-the-repo.md)). Each lists the Skills that teach it. Loading them fails if a point has no Skill, if a Skill teaches no point, or if a Skill is from another Subject or Year, so a new Skill can't be added without saying which point it serves, and a point can't be added without a Skill. A test then checks that every point is taught by a Game on the World Map.

Maths, English, Science and Phonics have a programme of study for each Year, so their points follow it. Music, Geography, History and Computing have one for each Key Stage, so their points are placed in the Year whose Games teach them, and the page says "Key Stage 2 programme of study, taught in Year 4".

How far a Child is through a point comes from the Mastery the server already works out, so nothing new is stored or synced: a Skill counts by its good days out of those Mastery needs, fully once Mastered or due for review, and a point is the average of its Skills. A point **Needs help** when right first time on any of its Skills is below that Skill's good-day target, which tells a Parent more than a low percentage would: the Child is playing but getting it wrong.

## Consequences

The page names the Games for each point through the same lookup the World Map uses to build a Game's card (`src/client/mission/game-card-content.ts`), so a Game always reports the Skill it really plays. The puzzle titles and Skills moved to `src/client/puzzles/puzzle-skills.ts` so the Parent page doesn't load the puzzle boards.

## Considered Options

- **Every statutory statement as its own point**: hundreds per Year, far too many for a Parent to scan, and many (such as "write from memory simple sentences dictated by the teacher") can't be played. The headings are what schools report against.
- **Handwriting, spoken language and local history as points with no Game**: they would show as permanent gaps a Game could never close, so they are left out and the README says so.
- **Store progress per point on the server**: a second source of truth beside Mastery, which could drift from it.
