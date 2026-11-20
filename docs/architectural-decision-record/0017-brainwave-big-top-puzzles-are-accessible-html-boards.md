# The Brainwave Big Top's puzzles follow each Child's own Year, drawn as accessible HTML boards

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for a new Games Region, shown for every Year Group, with a word search, sudoku, mine sweeper, crossword and mahjong, each following the National Curriculum and looking fun and professional. The Region is the Brainwave Big Top: a striped circus tent on the World Map, east of the mountain lake, with puzzle blocks circling its flag.

## The Region is always open

A Region in `world-map.json` may set `isAlwaysOpen`. The Big Top does, so it is open for every Child from their first Session, whatever their Year Group or Mastery. It is left out of the count that opens the other Regions, so adding it moved none of them, and wherever it sits in the list makes no difference. On the Parent's Map Regions page its switch is on and cannot be turned off, with the badge "Open for every Year Group, from the start". The World Map still opens on the Child's furthest earned Region rather than on the Big Top.

## Each puzzle practises a Skill from the Child's own year

Each of the five Game Types picks its Skill from the Child's Year Group, so one Region serves Year 1 to Year 6. A Child with no Year Group plays Year 1.

| Game Type                  | Year 1                                        | Year 2                                | Year 3                      | Year 4                            | Year 5                                        | Year 6                                       |
| -------------------------- | --------------------------------------------- | ------------------------------------- | --------------------------- | --------------------------------- | --------------------------------------------- | -------------------------------------------- |
| `word-search`, `crossword` | Year 1 common exception words                 | Year 2 common exception words         | Years 3 and 4 word list     | Years 3 and 4 word list           | Years 5 and 6 word list                       | Years 5 and 6 word list                      |
| `sudoku`, `mine-sweeper`   | Number bonds to 10                            | Addition and subtraction facts to 20  | The 3, 4 and 8 times tables | Times tables up to 12 × 12        | Multiplying and dividing by 10, 100 and 1,000 | The order of operations                      |
| `mahjong`                  | Counting objects to 20 (numeral to ten frame) | Halves, thirds and quarters of shapes | Equivalent fractions        | Tenths and hundredths as decimals | Fractions, decimals and percentages           | Decimal equivalents of fractions such as 3/8 |

The spelling words come from the statutory appendix of the English programme of study, which gives Years 3 and 4, and Years 5 and 6, one list each. Those two Skills therefore sit in Year 3 and Year 5, and both years of each pair use them. Every crossword clue is a short definition written for this game.

The maths shows up in the puzzles themselves. In sudoku, some empty squares carry a sum from the Child's year, such as `24 ÷ 8` in Year 3 or `4 × 3 − 5` in Year 6, and the Child works it out to fill the square. In mine sweeper, every clue is a sum worth the number of mines it touches. In mahjong, two tiles match when they show the same amount in different forms, such as 3/8 and 0.375. No tile is ever matched with an identical twin.

The grids grow with the Child's year: a 7 × 7 word search with words running across and down in Year 1, up to 12 × 12 in all eight directions in Year 6. Sudoku goes from 4 × 4 to 6 × 6 to 9 × 9, mine sweeper from 6 × 6 with 5 mines to 10 × 10 with 16, and mahjong from 20 tiles to 28.

## How a puzzle counts towards Mastery

Each puzzle is one Activity. Each step is a Question: a word found, a square filled, a mine, a crossword word, or a mahjong pair. A step is right first time unless the Child went wrong on the way to it: a line that isn't a word, a number that doesn't fit, a mine dug up, a word spelled wrong, a mismatched pair, or a hint. Wrong numbers and wrong spellings are turned away at once, so the grid never holds a mistake. Digging a mine uncovers it harmlessly, rather than ending the game. When the puzzle is solved, the Activity is finished and the usual celebration, Stars and Family Chest follow.

## Drawn as HTML over a circus backdrop, not in 3D

The Bubble Bay games are 3D scenes with HTML choice buttons ([0015](./0015-bubble-bay-games-share-the-studio-stage.md)). These puzzles are grids of up to 144 squares that the Child types into, drags across and reads small sums in, so they are drawn as HTML: buttons and inputs on a cream puzzle card, over a CSS night-circus backdrop with a scalloped canopy. That keeps every square a real control, with its own accessible name, keyboard arrows and focus ring. The crossword squares are text inputs, so a tablet shows its own keyboard. The text stays sharp at any size, and the puzzles add nothing to the 3D budgets. Each game has its own accent colour, and every animation is switched off for reduced motion.

## Consequences

- The Big Top's tent is one merged mesh of 1,720 triangles, and its puzzle blocks are one instanced mesh. Together they add two meshes to the World Map, which stays within its budget, checked by `src/client/world-map-scene.test.tsx`.
- Squares in the largest grids are smaller than the 44-pixel touch target on a phone held upright, because a 12 × 12 word search can't fit otherwise. The sudoku number pad, the mine sweeper's Dig and Flag switch, the mahjong Hint and Shuffle buttons and the crossword clues all keep full-size targets.
- The puzzles show their instructions as text and play the existing "Well done" and "Mission finished" voice-over. Spoken instructions for each puzzle need new Piper lines ([0007](./0007-audio-is-made-before-release.md)), which can be made with `pnpm generate:voice-over` on a machine where Piper installs.
- 14 Skills were added: four spelling Skills and ten Maths Skills, from Year 1 to Year 6.

## Considered Options

- **3D boards on the studio stage**: consistent with Bubble Bay, but a 9 × 9 sudoku of 3D tiles with text costs far more triangles and draw calls than the budget allows, and loses the native inputs and accessible names.
- **One Skill for each game in every year**: the curriculum doesn't split the junior spelling lists by year, so inventing a split would claim more precision than the curriculum gives.
- **Ending mine sweeper on a mine**: true to the classic game, but harsh for a five-year-old. Counting the dug mine as a wrong Question keeps the result honest, and keeps the game going.

## Amended

Amended by [0025](./0025-one-island-per-year-group.md): every Island has its own Brainwave Big Top, with all its Games unlocked, and its puzzles play Skills from that Island's Year rather than the Child's. A Parent can turn it off.

Amended by [0066](./0066-seven-more-puzzles-in-the-brainwave-big-top.md): the Big Top holds seven more puzzles, twelve in all, drawn and counted the same way.
