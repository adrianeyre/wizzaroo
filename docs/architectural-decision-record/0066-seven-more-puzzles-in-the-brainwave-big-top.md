# Seven more puzzles in the Brainwave Big Top

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for seven new educational games in the Brainwave Big Top on every Island, each fun, educational and of high quality. The Big Top now holds twelve puzzles: the five from [0017](./0017-brainwave-big-top-puzzles-are-accessible-html-boards.md), then a number pyramid, a number trail, bingo, clock pairs, tightrope words, ring sort and a sentence parade. They are the same on every Island, and play Skills from that Island's Year ([0025](./0025-one-island-per-year-group.md)).

## Each puzzle practises a Skill from the Island's Year

Every new puzzle plays a Skill that the Subject Regions already teach, so it counts towards the same Mastery. No Skills were added. Each puzzle has its own Skill in each Year, chosen so that the twelve puzzles cover more of the curriculum than five would.

| Game Type         | Year 1                           | Year 2                                | Year 3                                               | Year 4                                        | Year 5                                     | Year 6                                  |
| ----------------- | -------------------------------- | ------------------------------------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------ | --------------------------------------- |
| `number-pyramid`  | Adding to 20                     | Adding to a two-digit number          | Adding three-digit numbers                           | Adding four-digit numbers                     | Adding decimals                            | Adding large numbers                    |
| `number-trail`    | Counting in twos, fives and tens | Counting in threes, and in tens       | Counting in 4s, 8s and 50s                           | Counting in 6s, 7s and 25s, back through zero | Counting in powers of 10 and in tenths     | Continuing linear number sequences      |
| `bingo`           | Taking away within 20            | The 2, 5 and 10 times tables          | The 3, 4 and 8 times tables                          | Times tables up to 12 × 12                    | Square and cube numbers, × 10, 100, 1000   | Finding percentages of amounts          |
| `clock-pairs`     | Time to the hour and half past   | Time to five minutes                  | Time to the minute, with Roman numerals              | Converting to the 24-hour clock               | Working out a later time                   | Working out how long until a time       |
| `tightrope-words` | ff, ll, ss, zz, ck, nk and tch   | -ful, -less, -ness and -ly            | Prefixes dis-, mis-, re-, sub-, super-, anti-, auto- | -ous, -tion, -sion, -ssion and -cian          | -able, -ible, -cious, -tious, -cial, -tial | -fer words, -ant, -ance, -ent and -ence |
| `ring-sort`       | Adding -s or -es                 | Nouns, verbs, adjectives and adverbs  | Choosing a or an                                     | Prefixes in-, il-, im-, ir- and inter-        | Modal verbs and relative pronouns          | Formal words for everyday words         |
| `sentence-parade` | Joining with and                 | and, but, or, because, when, if, that | Time and cause conjunctions                          | Fronted adverbials and speech punctuation     | Relative clauses with who, which and whose | The active and passive voice            |

The year-by-skill maps live in `src/client/puzzles/puzzle-skills.ts`.

## What each puzzle is

- **Number pyramid**: circus bricks where each brick is the sum of the two it sits on. Some bricks are given; the Child works out the rest, sometimes by adding and sometimes by taking away.
- **Number trail**: a winding trail through a grid, with one number of a counting sequence on each square. The Child fills the gaps by counting on or back.
- **Bingo**: the ringmaster calls a sum, and the Child dabs its answer on their card until the card is full.
- **Clock pairs**: a memory game, turning over cards to pair a clock or a time with its match.
- **Tightrope words**: an acrobat crosses the tightrope as the Child spells a word from its clue, letter by letter, with the spelling pattern outlined.
- **Ring sort**: word cards are sorted into circus rings by a rule, such as -s or -es, a or an, or the word's class.
- **Sentence parade**: word wagons are coupled behind an engine in order, to build a correctly punctuated sentence.

## How they count towards Mastery

They follow the rules in [0017](./0017-brainwave-big-top-puzzles-are-accessible-html-boards.md). Each puzzle is one Activity, and each step is a Question: a brick, a trail square, a bingo call, a pair, a word, a card or a sentence. A wrong try is turned away at once, so the board never holds a mistake, and a wrong try or a hint makes that step wrong first time. No puzzle can be lost. In Clock pairs, two cards that don't match only count as a wrong try when the Child could have known better: they turned over a card they had already seen, or the first card's partner had already been seen. Turning over two cards no one has seen yet is exploring, not a mistake.

## Drawn as HTML, like the first five

The new puzzles are HTML boards over the circus backdrop, as in [0017](./0017-brainwave-big-top-puzzles-are-accessible-html-boards.md). Their pictures, such as the acrobat, the ringmaster, the clocks, the rings and the parade train, are inline SVG, so they stay sharp at any size and add nothing to the 3D budgets. Each puzzle has its own accent colour, every animation is switched off for reduced motion, and every square, card, ring and wagon is a real button with its own accessible name.

## Consequences

- Every Big Top has twelve Games. They are all unlocked, and the Big Top still gives no Trophy.
- The puzzles show their instructions as text and have **Read it to me** buttons. They have no recorded voice-over of their own yet, like the first five.
- The Big Top's story on the World Map names the new acts.

## Considered Options

- **New Skills just for the puzzles**: the curriculum already has a Skill for everything the puzzles practise. New Skills would split one piece of learning across two Mastery records.
- **Battleships for coordinates**: coordinates are only taught in Years 4 and 6, so it couldn't serve every Island. Clock pairs uses telling the time, which is taught in every Year.
- **Hangman for spelling**: guessing letters in any order rewards guessing the common letters, not knowing the spelling. Tightrope words spells the word left to right, so it practises the spelling pattern itself.
