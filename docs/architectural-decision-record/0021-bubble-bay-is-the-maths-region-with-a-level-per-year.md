# Bubble Bay is the Maths Region, with ten games at every Year from 1 to 6

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for Bubble Bay to have ten games, all following the National Curriculum for Maths, with a "Maths" heading so a Child knows what the Region is for, and for each game to be played at the level of the Child's own Year, from Year 1 to Year 6: sixty games in all. They also asked for the Region panel to show every game without scrolling, and for the Family Chest to look professional rather than childish.

## Ten Game Types, each with a Skill per Year

Each of Bubble Bay's ten Game Types is one 3D scene that grows with the Child. For every Year Group it plays its own Skill, built from that Year's statutory requirements in the Maths programme of study, so a Year 4 Child and a Year 1 Child in the same family see different questions in the same place. The Year comes from the Child's Year Group, which the play API already sends; a Child with no Year yet plays Year 1.

| Game Type                           | Year 1                  | Year 2                                | Year 3                         | Year 4                                   | Year 5                                   | Year 6                           |
| ----------------------------------- | ----------------------- | ------------------------------------- | ------------------------------ | ---------------------------------------- | ---------------------------------------- | -------------------------------- |
| Pop the bubbles (`popping-bubbles`) | Number bonds to 10      | Addition and subtraction facts to 20  | 3, 4 and 8 times tables        | Times tables to 12 × 12                  | Squares, cubes, × and ÷ by 10, 100, 1000 | Order of operations              |
| Count the fish (`fish-count`)       | Counting objects to 20  | Tens and ones to 100                  | Place value in 3-digit numbers | Place value in 4-digit numbers           | Tenths and hundredths                    | Numbers to 10,000,000            |
| More or less (`ten-frames`)         | One more, one less      | Counting on and back in tens          | 10 or 100 more or less         | 1000 more or less                        | Powers of 10 more or less                | Intervals across zero            |
| Shape hunt (`shape-hunt`)           | Naming 3-D shapes       | Faces, edges and vertices             | Right angles and sides         | Classifying triangles and quadrilaterals | Regular and irregular polygons           | Nets of 3-D shapes               |
| Shell sums (`shell-sums`)           | Adding to 20            | 2-digit add ones or tens              | Adding 3-digit numbers         | Adding 4-digit numbers                   | Adding decimals                          | Adding large numbers             |
| Crab take-away (`crab-take-away`)   | Taking away within 20   | 2-digit take away ones or tens        | Taking away 3-digit numbers    | Taking away 4-digit numbers              | Taking away decimals                     | Taking away large numbers        |
| Stepping stones (`skip-count`)      | Counting in 2s, 5s, 10s | 3s, and 10s from any number           | 4s, 8s, 50s                    | 6s, 7s, 25s, back through zero           | Powers of 10 and tenths                  | Linear sequences                 |
| Coral heights (`coral-heights`)     | Tallest and shortest    | Measuring in cm                       | Measuring in mm                | Perimeter of rectangles                  | Area of rectangles                       | Volume of cuboids                |
| Fraction find (`fraction-find`)     | Halves and quarters     | Halves, thirds and quarters of shapes | Unit and non-unit fractions    | Families of equivalent fractions         | Fractions, decimals and percentages      | Decimal equivalents of fractions |
| Ship's clock (`ship-clock`)         | O'clock and half past   | To 5 minutes, quarter past and to     | To the minute, Roman numerals  | 24-hour clock                            | Later times                              | Durations                        |

The questions are built in `src/curriculum`, one module per idea, and each Year's distractors are the slips a Child of that age is likely to make: digits swapped, a column out, past and to muddled, the hour hand misread at half past, adding instead of taking away. `src/client/mission/maths-missions.ts` turns a Game Type and Year into a Mission of three Activities, easiest first.

Each Game Type keeps one scene and adds the pieces the higher Years need: place-value counters for numbers beyond 99 and for decimals, polygon tiles with right-angle markers, folding nets, a thermometer for negative numbers, and blocks of unit cubes for perimeter, area and volume. Every scene still fits the [performance budget](../performance-budget.md) of 10,000 triangles and 40 meshes, checked by the scene tests.

Bubble Bay declares `"subject": "maths"`, the way Crystal Caves, Whispering Woods, Cloud Castle and Crescendo Canyon declare theirs ([0016](./0016-crystal-caves-is-the-phonics-region.md)), so the World Map raises a Maths heading over it and its panel and chip say Maths. Listen and pick, already in Crystal Caves, leaves Bubble Bay. Capital catch, the one English game that was in Bubble Bay, moves to Whispering Woods, the English Region ([0019](./0019-whispering-woods-teaches-english-from-year-1-to-6.md)), shown under its Year 1 tab beside Alphabet train, since matching capitals to small letters is Year 1 spelling.

Where the Brainwave Big Top ([0017](./0017-brainwave-big-top-puzzles-are-accessible-html-boards.md)) already has a Skill for the same statutory objective in the same Year, a Bubble Bay level plays that Skill rather than a copy, so practice in either Region counts towards one Mastery: Year 2 Pop the bubbles plays Addition and subtraction facts to 20; Years 3, 4 and 6 play the times tables and order of operations Skills; Fraction find plays Halves, thirds and quarters of shapes in Year 2, Fractions, decimals and percentages in Year 5 and Decimal equivalents of fractions in Year 6, and its Year 4 Skill, Families of equivalent fractions, builds on the Big Top's Year 3 Equivalent fractions.

## The Region panel and the Family Chest

The Region panel names its Subject ("Maths") and the Child's Year above its name, and lays the Mission cards out as a compact grid, three columns wide, or four on a wide screen that is short, with each card's Mastery badge beside its title and the story hidden when space is short. Ten cards and "Hear it again" show without scrolling on a laptop, down to a 657-pixel-tall window, and on a tablet in landscape. A phone held sideways has too little height, so there the panel scrolls inside itself.

The Family Chest is drawn smooth, like popping bubbles ([0013](./0013-popping-bubbles-is-drawn-smooth.md)): no pixelating pass, antialiased, with studio lighting and reflections, a lacquered wooden chest with brass bands, turned gold coins and cut gems, a warm glow as the lid opens, and an SVG coin in place of the emoji.

## Consequences

There are 49 new Maths Skills of Bubble Bay's own. The offline download was already 13.9 MB, so, as Crescendo Canyon does ([0020](./0020-crescendo-canyon-is-the-music-region.md)), only Year 1 gets a spoken instruction for each new game, with short spoken prompts such as "Find the tallest." and "Find one half."; from Year 2 every Bubble Bay game reads its instruction on screen and shares two short lines, "Read it, then tap your answer." and "Not quite. Have another go." That is 10 voice-over lines in the same Piper voice ([0007](./0007-audio-is-made-before-release.md)), and the download is 14.7 MB, inside the 15 MB budget with little room left, so the next Region with voice-over will need the audio compressed or the budget revisited.

## Considered Options

- **Sixty separate scenes**: ten times the code and assets for scenes a Child mostly never sees, since they play one Year at a time. A scene that grows with the Child also makes progress visible.
- **Choosing the level by Mastery instead of Year Group**: the owner asked for the games to follow the Child's Year, and Mastery is per Skill; the Parent already sets the Year.
- **One Year 2 level for Year 3 and above**: an earlier step in this work, replaced once the owner asked for every Year up to 6.

## Amended

Amended by [0025](./0025-one-island-per-year-group.md): this Region is on Island 1 and now plays Year 1 only, with its Games unlocked one at a time by Stars. Each other Island has its own Region for this Subject, under its own name, playing that Island's Year. Where this record says the Child plays their own Year, or unlocks the Region by Mastered Skills, the Island design replaces it.
