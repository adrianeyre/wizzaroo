# The curriculum

[← Back to the README](../../README.md) · [All guides](README.md)

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Each Skill is a JSON file in `src/curriculum`, named after its ID, and listed in `src/curriculum/skills.ts`:

```json
{
  "id": "maths.number-bonds-10",
  "name": "Number bonds to 10",
  "subject": "maths",
  "yearGroup": 1,
  "strand": "addition-and-subtraction",
  "prerequisites": [],
  "masteryRule": { "percentCorrect": 80, "separateDays": 3 }
}
```

The ID is the Subject, a dot and a kebab-case name, with no Year Group in it, and it never changes once published. `name` is what the Parent dashboard calls the Skill. `subject` is one of the Subjects in `src/curriculum/subjects.ts` (`maths`, `phonics`, `english`, `science`, `music`, `geography`, `history`, `computing`, `art`, `design` or `languages`); `yearGroup` is 1 to 6; `prerequisites` lists the IDs of other Skills. `masteryRule` may be left out, which means 80% on 3 separate days. A Phonics Skill also has `sounds`, the sounds it is about, and no other Skill may. The Skills are checked whenever they are imported, so `pnpm test` fails on a malformed file, a duplicate ID, a prerequisite that isn't a Skill, an ID with a Year Group in it, or a sound that isn't one of the 44.

## Phonics sounds and Skills

The 44 sounds of English are named once, in `src/curriculum/phonics-sounds.ts`: `s`, `ai`, `igh`, `oo-long` (moon), `oo-short` (book), `th-unvoiced` (thin), `th-voiced` (this), `zh` (treasure), `schwa` and the rest. Those names are shared by every Phonics Programme and every Phonics Skill, and the phoneme recordings will be named after them too, because the sounds are the same whichever programme a school uses.

Each sound has a Phonics Skill, `phonics.sound-<sound>`, such as `phonics.sound-ai`:

```json
{
  "id": "phonics.sound-ai",
  "name": "The /ai/ sound, as in rain",
  "subject": "phonics",
  "yearGroup": 1,
  "strand": "grapheme-phoneme-correspondences",
  "prerequisites": [],
  "sounds": ["ai"]
}
```

A Phonics Skill names sounds, never a programme, so the same Skills work under every programme. `orderPhonicsSkills` in `src/curriculum/phonics-programmes.ts` puts them in a programme's order: a Skill comes once the programme has taught a grapheme for each of its sounds, and the Skills for sounds a programme never teaches come last. Under Little Wandle phonics starts `s a t p i n m d`; under Read Write Inc it starts `m a s d t i n p`.

## Phonics Programmes

A Phonics Programme is a JSON file in `src/curriculum`, named `<id>.phonics-programme.json` and listed in `src/curriculum/phonics-programmes.ts`. It holds only facts: the order the programme teaches graphemes in, and the words it uses, with the sources they were taken from.

```json
{
  "id": "read-write-inc",
  "name": "Read Write Inc. Phonics",
  "sources": ["Where the order comes from: https://…"],
  "soundOrder": [
    {
      "term": "Set 2",
      "graphemes": [
        { "grapheme": "ay", "sounds": ["ai"] },
        { "grapheme": "ow", "sounds": ["oa"] }
      ]
    }
  ]
}
```

`soundOrder` is the programme's stages in order, each under the programme's own term for it (`Phase 2`, `Set 1`), and each stage's graphemes in the order they are taught, written as the programme writes them (`a-e` for a split digraph). `sounds` is the sound, or sounds, a grapheme stands for: `x` is `["k", "s"]`. A grapheme with more than one pronunciation appears once for each, such as `oo` for `oo-long` and `oo-short`. Every source needs an `https://` link. The files are checked whenever they are imported, and a field the format doesn't have is refused, so a programme file has nowhere to hold anything else.

A programme's branded mnemonics, characters, pictures, rhymes and songs belong to its publisher and never go in the repo. Wizzaroo's own art, rhymes and phoneme recordings, as they arrive, are shared by every programme.

| Programme                                | ID                             | Sound order taken from                                                                                                                                          |
| ---------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Little Wandle Letters and Sounds Revised | `little-wandle`                | The Wandle Learning Trust's programme progression for Reception and Year 1 (version June 2025): Phases 2, 3 and 5                                               |
| Read Write Inc. Phonics                  | `read-write-inc`               | Set 1 in the order schools publish it as taught, and Sets 2 and 3 as Oxford Owl's parent guide lists them                                                       |
| Essential Letters and Sounds             | `essential-letters-and-sounds` | The ELS overview and term-by-term progression for Reception and Year 1, checked against its grapheme sheets: Phases 2, 3 and 5                                  |
| Jolly Phonics                            | `jolly-phonics`                | Jolly Learning's seven groups of letter sounds, then the alternative spellings as schools' Jolly Phonics progression maps order them: Groups 1-7, Steps 2 and 3 |
| Sounds-Write                             | `sounds-write`                 | Sounds-Write's own Initial and Extended Code scope and sequence, with the spellings each unit teaches from schools' unit overviews                              |
| Twinkl Phonics                           | `twinkl-phonics`               | Twinkl's progression map as a school publishes it, checked against another school's overview: Levels 2, 3, 5 and 6                                              |

A stage that teaches no new graphemes, such as a programme's Phase 4 or a unit that only practises blending, has no entry. Programmes are listed with Little Wandle and Read Write Inc first, then the rest A to Z, and the Parent's choice of programme shows them in that order.

Adding a programme from the DfE's validated list is a new file, its import in `phonics-programmes.ts`, and a pull request that cites its sources. Every programme must sound out enough real and alien words for a whole Phonics Screening Check, which a test checks.

### Alien words

The Phonics Screening Check's real and alien words are in `src/curriculum/phonics-screening-check.words.json`: at least 40 of each, 2 to 6 small letters, none both. The alien words are made up in the real check's style: short vowel words like `vap`, adjacent consonants like `strab`, digraphs and trigraphs like `chorb` and `jigh`, and split digraphs like `blape`. A paper is 20 words, 10 alien then 10 real, half and half like the real check, and the practice paper is 5 of each, shuffled. Both use only words the Child's Phonics Programme can sound out. The Crystal Caves Game Real or alien? keeps its own fixed questions, but every alien word in it is also in this file, which a test checks, so there is one list of alien words.

`maths.number-bonds-10` has a generator in `src/curriculum/number-bonds-10.ts`. Every Question is a number sentence about 10 with one blank:

| Difficulty | Questions                                                              |
| ---------- | ---------------------------------------------------------------------- |
| 1          | `3 + _ = 10`, the second part from 1 to 9                              |
| 2          | `3 + _ = 10` or `_ + 7 = 10`, either part from 0 to 10                 |
| 3          | Difficulty 2, plus the subtraction facts `10 - 4 = _` and `10 - _ = 6` |

## Lab games

A lab game is a multiple-choice Game written as data and played in the lab ([ADR 0039](../architectural-decision-record/0039-the-whole-national-curriculum-through-lab-games.md)). Each Subject's lab games for a Year are in `src/curriculum/lab-games.<subject>.year-<N>.json`, listed in `src/curriculum/lab-game-files.ts`; the Science games in `science-games.year-<N>.json` are lab games too.

```json
{
  "subject": "maths",
  "yearGroup": 1,
  "games": [
    {
      "id": "coin-and-note-counter",
      "title": "Coin Counter",
      "station": "compare",
      "prop": "magnifier",
      "skillName": "Recognising coins and notes",
      "strand": "measurement",
      "statutoryRequirement": "Pupils should be taught to recognise and know the value of different denominations of coins and notes",
      "instruction": "Read it, then tap the right answer.",
      "hint": "Not quite. Look at the number on each coin or note, then try again.",
      "questions": [
        {
          "ask": "Which coin is worth the most?",
          "answer": "£2",
          "distractors": ["£1", "50p", "20p"]
        }
      ]
    }
  ]
}
```

| Field                  | Rule                                                                                                                                                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | Kebab-case, unique across every lab game; the Skill is `<subject>.<id>`                                                                                                                                                                                                                                        |
| `skillId`              | Optional: an existing Skill of the same Subject and Year for the game to play instead, such as `maths.convert-units`                                                                                                                                                                                           |
| `station`              | Science may use all ten Lab Stations; other Subjects only sort, odd-one-out, true-false, sequence, mystery and compare, whose spoken lines name no Subject                                                                                                                                                     |
| `strand`               | The Curriculum Point the game serves; its Skill must also be listed in that point's `skillIds`                                                                                                                                                                                                                 |
| `statutoryRequirement` | The National Curriculum statement the game teaches                                                                                                                                                                                                                                                             |
| `questions`            | At least 6, each `ask` 100 characters or fewer; 3 different distractors of 20 characters or fewer, or True and False for a true-false game                                                                                                                                                                     |
| `model`                | Optional, on a question: the one thing it asks about, shown on the turntable in place of the game's `prop`. One of the props or an item in `src/curriculum/lab-items.ts`, and never the answer or a choice ([ADR 0076](../architectural-decision-record/0076-a-lab-question-shows-the-thing-it-asks-about.md)) |

A game's `prop` is turned for every question that names no `model` of its own, so it should suit the whole game and show none of its answers. Each item is drawn from coloured parts in `src/client/lab-items/`, in at most 1,700 triangles so it fits above any station's choices; `pnpm test` checks every item against that budget and every question's item at its game's station. To add one, list its key in `lab-items.ts` and add its builder to the group file it belongs in: the type refuses a key with no model.

A lab game in an existing Subject is an extra Game in that Subject's Region on its Year's Island, open from the start. Art and design, Design and technology and Languages are made only of lab games, ten a Year in each Region, unlocking in order.
