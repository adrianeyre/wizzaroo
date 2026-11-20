# An Island Quest with Finds, Islanders and a rucksack

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for every Island to have its own adventure, like the classic point-and-click games _Monkey Island_ and _Indiana Jones and the Fate of Atlantis_:

- thirty things on each Island to pick up and use, such as a key that opens a gate;
- thirty puzzles of the Island's own;
- ten people to talk to, such as a police officer or a firefighter, who give hints and swap things;
- a rucksack showing a 3D picture of everything the Child has picked up;
- a progress bar while exploring;
- a Trophy and Stars for finishing.

They also wanted each Child's progress kept in the database, so a Child never starts again from scratch. Since the app isn't in production, the change goes into the one schema, not a migration.

## What a Quest is

- **One Quest per Island.** It is data in `src/curriculum/island-quests/`, one file per Island, with its own story: the Great Meadow Fair, the Northern Lights Frost Fair, the Secret of the Sun Crown, the Golden Jaguar of Jungle Reach, the Heart of Fire and the Starfall Signal. Each Quest has:
  - **thirty Finds**, each with a name, a sentence about it and a look (one of seventy shapes in two colours);
  - **ten Islanders**, each with a name, a job, a look (skin, hair, outfit, hat and something held), a greeting and a thank-you;
  - **twenty things**, such as a locked shed, a dark lamp post or a frozen fountain, each one of twenty-six shapes;
  - **thirty Puzzles.**
- **Puzzles.** Each Puzzle is one Find used on one Islander or thing. The Find is used up, and the Puzzle may give another Find in return. Every Islander and every thing has exactly one Puzzle.
- **How the Finds fit together.** Every Find is needed by exactly one Puzzle, and either lies on the Island to be picked up (ten of them) or is given by exactly one Puzzle.
- **Ten lines of three.** The Quests are built as ten lines of three Puzzles:
  1. a Find lying about is used on a thing, which gives a second Find;
  2. the second Find is given to an Islander, who gives a third;
  3. the third Find is used on a second thing.
- **Hints.** Every Puzzle names the Islander who hints at it, often a different one from the Islander or thing it is at, so talking to everyone matters.
- **Checked.** `checkIslandQuest` checks all of the above, and that every Puzzle can be solved in some order. `island-quests.test.ts` runs it on all six Quests, and also checks that no Islander's name is used on two Islands.

## Every Quest teaches something

The owner's rule is that every game follows the National Curriculum.

- **A question at the end of each line.** The last Puzzle of each line asks a question from the Island's Year (Year 1 on Meadow Isle up to Year 6 on Starfall Isle). Each Quest therefore has ten questions across Maths, Science, Geography, History, English and Computing, and each names the National Curriculum statement it comes from.
- **Never a hard fail.** A wrong answer is crossed out with "Not quite! Have another think and try again.", and the Child chooses again.
- **Shuffled choices.** The choices are shuffled the same way every time for a Puzzle, so the right answer isn't always first.
- **Safety in the words.** The Islanders' words teach safety too: the firefighters, sun cream and the dangers of looking at the Sun.

## On the Island

- **Where they stand.**
  - **Placing.** `island-quest-placing.ts` finds a spot for every thing, Islander and lying Find. Each spot is on dry, nearly level ground, clear of the trails, rivers, Railway, airfield, Wonders, places and Regions. It keeps 31 beyond an Attraction's footprint, 10 beyond a Curiosity's and 14 from every other Quest spot, and it is the spot furthest from those placed so far.
  - **Kept, not searched for.** `pnpm run generate:attraction-sites` writes the spots to `island-quest-sites.ts`, after the Attraction and Curiosity sites. A test checks every kept spot still fits, and that the placer still finds the same ones.
- **Drawn close up.**
  - **What is drawn.** `island-quest-models.tsx` draws only the spots within 32 of the Character, and the set is checked every 0.4 seconds.
  - **Three meshes.** The Islanders are merged into one mesh, the things into another and the Finds into a third, so the Quest adds three meshes and a few thousand triangles wherever the Character is. Because of the 31 gap, nothing of the Quest is drawn beside an Attraction, where the budget is tightest.
  - **Size limits.** A Find is at most 1,400 triangles, a thing 2,600 and an Islander 2,400.
- **How they look.**
  - An Islander with a Puzzle still open has a yellow diamond above them.
  - A thing changes its look once solved: the gate swings open, the lamp lights, the flowers bloom.
  - A Find lying about bobs above a yellow ring.
- **Playing.**
  - **Picking up.** Walking onto a Find picks it up.
  - **Talking.** Walking up to an Islander offers **Talk to**. Their card says what they need, gives hints (the ones the Child can get on with now first), and has **Give something**.
  - **Using.** Walking up to a thing offers **Look at the**, and its card has **Use something**.
  - **Choosing a Find.** Both open the Finds in the rucksack, with their pictures. The right Find solves the Puzzle, or asks its question first. A wrong one gets a gentle "nothing happens" or a polite "thank you, but I don't need that".
- **The explore bar.** It shows a progress bar of the Puzzles solved, out of thirty, and a **Rucksack** button with the number of Finds inside.
- **The rucksack.**
  - The window tells the Quest's story and shows all thirty Finds: those in the rucksack, those already used, and a ? for each one still to find.
  - Choosing a Find shows it turning round with its sentence.
  - **3D pictures.** The pictures are 3D renders of the Find's own model, taken in the shared studio the wardrobe already uses for Items (`item-picture.tsx`). The turning view is twelve pictures from round the Find, shown one after another, so it adds no second WebGL canvas.

## Kept in the database, worked out by the server

- **Two new play events.** The schema's `play_event_type` gains two values, written into `0000_schema.sql` and `schema.ts` rather than a migration:
  - `quest-find-picked-up`, with the Island and the Find;
  - `quest-puzzle-solved`, with the Island, the Puzzle and the local date.
- **Recorded like all play.** A Family Device records them as it records all play ([ADR 0004](./0004-offline-play-records-events-the-server-decides.md)): to its outbox, even with no network, and uploads them to `play_events` once it can. The upload's schema accepts only the Island ids, lying Find ids and Puzzle ids the Quests have.
- **The replay works it out.** The replay in `src/curriculum/rewards.ts`, on the server and the device alike, works out each Child's `questProgress` for every Island. It holds the Finds picked up and the Puzzles solved, and the rucksack follows from them.
  - **Picking up.** A Find counts only if it lies on that Island.
  - **Solving.** A Puzzle counts only once, and only if the Child holds the Find it needs.
- **Finishing.** The thirtieth Puzzle gives `starsPerQuest` Stars (50, in `rewards.json`) once. `listQuestTrophies` gives a Trophy, named by the Quest, such as the Meadow Fair Hero, which stands on the shelf in the Child's Room.
- **Never from scratch.** `questProgress` comes to the device with the rest of a Child's rewards from `GET /api/play/family`, and its replay of unsynced play is added on. So a Child carries on from where they got to, on any Family Device.

## Considered options

- **Tables of their own,** such as `child_quest_finds` and `child_quest_puzzles`, written by a new route. Rejected: it would be the only play the server stores as state rather than events. It wouldn't work offline without a second outbox. And the replay already works out Stars and Trophies from events, which is the only place the Quest's Stars can come from ([ADR 0004](./0004-offline-play-records-events-the-server-decides.md)). The events are still rows in Postgres, kept per Child, and the progress is worked out from them on every request.
- **A live 3D canvas in the rucksack.** Rejected for a second WebGL context on top of the Island's, which phones and tablets limit. The studio's pictures already look like the Island.
- **Every Quest model drawn all the time,** like the instanced animals. Rejected: forty models an Island would cost about 60,000 triangles, and Meadow Isle is already at 375,000 of its 380,000 beside its school.
- **Hand-placed spots.** Rejected for the same reason the Curiosities were placed by rule: two hundred and forty spots, and every one must keep clear of what the Island already has.

## Consequences

- **More to do.** Every Island has thirty more things to do, with a story, people to meet and a Trophy to win, and each Quest teaches ten things from its Year.
- **Adding to a Quest.** A new Find, Islander, thing or Puzzle is data in its Island's file. It must keep `checkIslandQuest` happy, and a new spot needs `pnpm run generate:attraction-sites`.
- **A new shape.** A new Find or thing shape is one builder in `quest-find-models.ts` or `quest-thing-models.ts`, plus its name in `island-quest-rules.ts`.
- **Order matters.** A Puzzle solved on a device before the server sees the Find that made it possible, such as when two devices sync out of order, doesn't count until it is solved again. The Puzzle simply stays open, and the Find stays in the rucksack.
- **Forged events.** Forging these events, like forging any play, is a Child cheating their own game; it is ADR 0004's decision and is bounded by its gate.
