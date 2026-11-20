# Three extra Maths Game Types fill the gaps in the National Curriculum coverage

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The Parents & Teachers page is getting a National Curriculum coverage view, listing every Maths programme-of-study heading for each Year beside the Skills and Games that teach it. Thirteen of those headings had no Game: multiplication and division in Years 1 and 2, ratio and proportion in Year 6, position and direction in Years 1, 2, 4, 5 and 6, and statistics in Years 2 to 6. The owner asked for Games that cover them, each fun, interactive, 3D and professional-looking, and each anchored to a statutory objective.

There are three new Game Types, each on one new Skill per Year it covers:

| Game Type      | Title                    | Skill                                                                                          | National Curriculum objective                                                                                                    |
| -------------- | ------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `fair-shares`  | Fair shares              | `maths.multiply-and-divide-with-objects`, Multiplying and dividing with groups and arrays (Y1) | Year 1 multiplication and division: solve one-step problems by calculating with objects, pictorial representations and arrays    |
| `fair-shares`  | Times tables and sharing | `maths.times-tables-2-5-10`, The 2, 5 and 10 times tables and dividing (Y2)                    | Year 2 multiplication and division: recall and use × and ÷ facts for the 2, 5 and 10 tables, odd and even numbers, commutativity |
| `fair-shares`  | Ratio and scale          | `maths.ratio-and-scale`, Ratio, proportion and scale (Y6)                                      | Year 6 ratio and proportion: relative sizes, scale factors, and unequal sharing and grouping                                     |
| `treasure-map` | Turtle turns             | `maths.position-and-turns`, Position words and whole, half and quarter turns (Y1)              | Year 1 position and direction: describe position, direction and movement, including whole, half, quarter and three-quarter turns |
| `treasure-map` | Clockwise turtle         | `maths.clockwise-turns`, Turning clockwise and anticlockwise in right angles (Y2)              | Year 2 position and direction: rotation as a turn, in right angles, clockwise and anticlockwise                                  |
| `treasure-map` | Treasure map             | `maths.coordinates-first-quadrant`, Plotting coordinates and translations on a grid (Y4)       | Year 4 position and direction: coordinates in the first quadrant, translations, plotting points to complete a polygon            |
| `treasure-map` | Mirror map               | `maths.reflection-and-translation`, Reflecting and translating shapes (Y5)                     | Year 5 position and direction: describe the position of a shape after a reflection or translation                                |
| `treasure-map` | Four-quadrant map        | `maths.coordinates-four-quadrants`, Coordinates in all four quadrants (Y6)                     | Year 6 position and direction: describe positions on the full coordinate grid, translate and reflect shapes in the axes          |
| `chart-tower`  | Chart tower              | `maths.tally-charts-and-pictograms`, Reading tally charts, pictograms and block diagrams (Y2)  | Year 2 statistics: interpret simple pictograms, tally charts and block diagrams, and compare and total the categories            |
| `chart-tower`  | Chart tower              | `maths.bar-charts-and-tables`, Reading bar charts, pictograms and tables (Y3)                  | Year 3 statistics: interpret bar charts and pictograms with scaled symbols, one-step and two-step questions                      |
| `chart-tower`  | Time graph tower         | `maths.line-graphs`, Reading bar charts and time graphs (Y4)                                   | Year 4 statistics: interpret bar charts and time graphs, comparison, sum and difference problems                                 |
| `chart-tower`  | Ferry timetable          | `maths.tables-and-timetables`, Reading line graphs, tables and timetables (Y5)                 | Year 5 statistics: read line graphs, and complete, read and interpret tables, including timetables                               |
| `chart-tower`  | Pie charts and the mean  | `maths.pie-charts-and-mean`, Reading pie charts and finding the mean (Y6)                      | Year 6 statistics: interpret pie charts, and calculate and interpret the mean as an average                                      |

## Extra Games in each Island's Maths Region

A Game Type appears only on the Islands of the Years it covers ([0025](./0025-one-island-per-year-group.md)): fair shares on Meadow Isle, Frost Isle and Starfall Isle, treasure map on every Island but Sunscorch Sands, and chart tower on every Island but Meadow Isle. Each is an entry in its Maths Region's `extraGames`, the way Capital catch sits in Whispering Woods, so the ten Games that unlock by Stars ([0021](./0021-bubble-bay-is-the-maths-region-with-a-level-per-year.md)) are unchanged and the new ones are open from the start. `src/client/mission/maths-missions.ts` keeps them apart from the ten Game Types that play every Year: each new Game Type has a map from only the Years it covers to a Skill and its Activities, and a lookup for any other Year finds nothing, so neither a Mission nor a card is ever built for a Year the Game doesn't teach.

The questions are built in `src/curriculum/fair-shares.ts`, `treasure-map.ts` and `chart-tower.ts`, each a list for every Year at three difficulties, with distractors drawn from likely slips: adding the factors instead of multiplying, coordinates swapped, the wrong direction of turn, the other side of a mirror line, misreading a scale step, the sum given for the difference.

## Scenes on the studio stage, under water

All three share the Bubble Bay studio stage ([0015](./0015-bubble-bay-games-share-the-studio-stage.md)) and draw smooth, with the choices as HTML buttons over sea-glass tokens, so they keep their 48-pixel targets and accessible names. Fair shares puts pearls on plates, fish in arrays, a pile of pearls to share between empty plates, a bar model for unequal sharing and a scaled bar for scale factors; for odd and even, each choice is a tray of pearls laid out in pairs. Treasure map turns a turtle among four landmarks on a patch of sea floor, sets landmarks on a two-row shelf for position words, and draws a treasure map board with a glowing chest, a submarine, lettered flags, a shape's sides and a glassy mirror line. Chart tower draws pictograms of scallop shells, tally sticks, block diagrams, 3D bar and line charts in front of a painted board, a ferry timetable board, and a pie chart cut from a sand dollar whose slices ease apart. Every animation stops when reduced motion is on.

## Consequences

The busiest scenes draw 9,268 triangles and 22 meshes (fair shares, six groups of ten), 7,553 triangles and 27 meshes (treasure map) and 7,574 triangles and 23 meshes (chart tower), within the dressed-stage limits of the [performance budget](../performance-budget.md), checked by `src/client/bay-games.test.tsx` against the three busiest questions at every Year and difficulty. Each painted board is one canvas texture of at most 512 × 512.

There is no new voice-over. The offline download is already over its 15 MB budget, so, as every Bubble Bay game does from Year 2 ([0021](./0021-bubble-bay-is-the-maths-region-with-a-level-per-year.md)), the new Games read their instructions on screen and share the two lines "Read it, then tap your answer." and "Not quite. Have another go." in every Year, Year 1 included.

There are 13 new Maths Skills, bringing Maths to 76.

## Considered Options

- **More levels inside the ten existing Game Types**: each already plays its own Skill in every Year, and a second Skill per Year would mean two Masteries behind one card.
- **Extra Games unlocked by Stars**: the ten-Game ladder is the same on every Island, and Games that exist in only some Years would break it.
- **Spoken Year 1 instructions**: two new Year 1 lines would follow Bubble Bay's Year 1 pattern, but every byte of audio now counts against a download that is already over budget.
