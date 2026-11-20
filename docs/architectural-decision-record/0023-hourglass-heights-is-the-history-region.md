# Hourglass Heights is the History Region, with 60 quests kept as data

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for a new Region on the World Map for History, with an interesting name, and 10 unique games for each of Years 1 to 6 that follow the National Curriculum and are fun, 3D and professional-looking.

History is a seventh Subject, and Hourglass Heights is a Region for it alone (`"subject": "history"` in `world-map.json`), the way Crescendo Canyon is for Music ([0020](./0020-crescendo-canyon-is-the-music-region.md)). Its story is a cracked Great Hourglass spilling moments from the past across the hills. It stands in the middle of the map at (-2, 5), on open land at least 8.9 units from every other Region, village and landmark, marked by a stone plinth with broken columns and a glass hourglass whose golden sand trickles once the Region is open. It is the last Region in the list, after Compass Peak, so it opens after 30 Mastered Skills, or earlier if a Parent unlocks it. Migration 0015 gives History to every Child whose Parent had allowed all six earlier Subjects, as 0012, 0013 and 0014 did for Science, Music and Geography.

## The quests

Each quest is its own Skill (`history.<skill>`) in its Year Group, so Mastery, Reviews, Stars and the Parent's charts work as before. All 60 share one Game Type, `history-quest`, and the Region panel shows them under Year tabs, opening on the Child's own Year, as Compass Peak does ([0022](./0022-compass-peak-is-the-geography-region.md)). A quest is data in `src/curriculum/history-quests.year-N.json`: its Skill, title, story, instruction, hint, scene, choice prop, and one of three ways to play:

- **Quiz**: 12 questions, each with one right answer, three plausible wrong ones and a fact shown once it is answered.
- **Sort**: 12 things to sort into two to four groups, such as Long ago or Now, Romans or Celts, or Primary or Secondary source, with the groups always in the same place.
- **Timeline**: 8 to 10 dated events. Each Activity takes six at random and asks which came first, then which came next, hanging each placed event on a timeline rail with its date.

A Mission is two Activities of five questions, never asking one twice. `parseHistoryQuests` refuses a quest whose answers are too long for a button, whose wrong answers repeat the answer, whose sort group is empty, whose timeline has two events at the same moment, or whose Skill isn't a History Skill.

The quests follow the National Curriculum's History programme of study, with each Key Stage's topics placed in the year most UK primary schools teach them:

| Year | Quests                                                                                                                                                                                                                                  | National Curriculum                                                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Toy Box Time Machine · Grandma's Kitchen · The School Bell Rings · Seaside Snapshots · Wheels Through Time · The Lamplighter's Night · Grace Darling's Rescue · The Lady with the Lamp · Castle Explorers · Past and Present Detectives | Changes within living memory, significant individuals, local history, chronology and the vocabulary of time                               |
| 2    | Pudding Lane Blaze · Firefighters Then and Now · Mr Pepys's Diary · One Small Step · Up, Up and Away! · Nurses of the Crimea · Remember, Remember · Brave Explorers · Two Queens · The Great Museum Timeline                            | Events beyond living memory (the Great Fire, the first flight, the Moon landing, the Gunpowder Plot) and significant individuals compared |
| 3    | Cave Painters · Skara Brae Storm · Stonehenge Sunrise · Stone, Bronze or Iron? · Hillfort Defenders · Journey Through Prehistory · Pyramid Builders · The Mummy Makers · Tutankhamun's Treasure · Life on the Nile                      | Changes in Britain from the Stone Age to the Iron Age; the earliest civilisations, with a depth study of Ancient Egypt                    |
| 4    | Legion on the March · Romans in Britain · Hadrian's Wall Watch · Roman or Celt? · What the Romans Gave Us · Athens or Sparta? · The First Olympics · Mount Olympus Mysteries · The Sutton Hoo Ship · Saxon Settlers                     | The Roman Empire and its impact on Britain; Ancient Greece; Britain's settlement by Anglo-Saxons and Scots                                |
| 5    | Raid on Lindisfarne · Longship Builders · Alfred and the Danelaw · Viking or Saxon? · Jorvik Market · The Last Saxon Kings · City in the Jungle · Maya Number Keepers · Maya or Anglo-Saxon? · Victorian Inventors                      | The Viking and Anglo-Saxon struggle for England to Edward the Confessor; the Maya; a theme beyond 1066                                    |
| 6    | The House of Wisdom · Bronzes of Benin · Where It All Began · Scribes of Sumer · Indus City Planners · The Shang Oracle · Battle of Britain Skies · Blitz Night · The Historian's Toolkit · The Grand Timeline                          | Early Islamic civilisation and Benin; the earliest civilisations, with the Shang dynasty; the Battle of Britain; historical enquiry       |

The facts were checked against what UK primary schools teach. Where historians are unsure, the content says "c." or "about", and war, invasion and burial are told factually and gently.

## Drawing

Each quest is played inside one of 37 3D scenes, a small diorama of its time and place: a Victorian classroom, London burning in 1666, the Moon's surface, Stonehenge at sunrise, a Viking fjord, a Maya temple in the jungle, the Round City of Baghdad, and more. A scene is data in `src/client/history-scenes*.ts`: a sky with a sun, moon or window glow, a patterned ground, an optional strip of water, lights, fog, drifting particles (embers, dust, snow, stars, fireflies, sand or rain) and the props placed in it. Each prop is a few primitive shapes merged into one vertex-coloured model (`src/client/history-props*.ts`), with fires, lamps and windows drawn bright, and every placement of the same prop is instanced, so a scene of 10 to 18 props costs 5 to 10 meshes. Boats bob, trees and flags sway and fires flicker, and nothing moves when the Child prefers reduced motion.

Choices are parchment plaques, HTML buttons over 3D props (baskets, crates, books, chests, tablets, lanterns, scrolls, shields, coins, pots, torches or a dig mound) floating over a golden ring, so they keep their accessible names and wrap long answers. A sort quest shows the thing to sort on a card, and a timeline quest hangs placed events on a rail. A right answer bursts into gold sparks and shows its fact. Every scene stays within the 10,000 triangles and 40 meshes of the [performance budget](../performance-budget.md), checked by `src/client/history-world.test.tsx`.

## Voice-over and the offline download

The quests add no voice-over of their own. Each Subject that merged before History spent more of the 15 MB offline budget, and by the time History merged, main alone built to 15.0 MB. History reuses two lines that already exist, "Read it, then tap your answer." and "Not quite. Read it again, think it through, then have another go.", and shows each quest's own instruction and hint on screen. Its quest data and scenes still add 0.3 MB, so the download is 15.3 MB, over the budget.

The World Map was at its 60-mesh limit too. Rather than leave the hourglass out, the cloud and padlock over every locked Region are drawn as two instanced meshes instead of two meshes for each Region, which saves about ten meshes when most Regions are still locked.

## Consequences

- The offline download is over its 15 MB budget, by 0.3 MB. Compressing voice-over from WAV to a lossy format would free most of it, bring the download back inside the budget, and let History's Year 1 and Year 2 quests speak their own instructions, which early readers need most. Until then the owner decides whether to raise the budget or hold History back.
- Adding a quest is a JSON change, as long as it uses an existing scene and choice prop.

## Considered Options

- **A Game Type per quest**, like Music's: rejected, since every History quest is the same question-and-choices shape, and 60 Game Types would add 60 entries to every lookup without a different way to play.
- **A Region holding History alongside other Subjects**: rejected, because the owner asked for a History Region, and a Region can be for one Subject since [0016](./0016-crystal-caves-is-the-phonics-region.md).
- **Spoken instructions for every quest**: the first version spoke one per quest (9.3 MB), then Year 1 and 2 only (3.6 MB), then four shared lines. None of them fitted the budget once the other Subjects had merged.

## Amended

Amended by [0025](./0025-one-island-per-year-group.md): this Region is on Island 1 and now plays Year 1 only, with its Games unlocked one at a time by Stars. Each other Island has its own Region for this Subject, under its own name, playing that Island's Year. Where this record says the Child plays their own Year, or unlocks the Region by Mastered Skills, the Island design replaces it.
