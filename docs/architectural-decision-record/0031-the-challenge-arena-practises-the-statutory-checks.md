# The Challenge Arena practises the statutory checks, timed without a hard fail

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The PRD names three milestones worth supporting: the Year 1 Phonics Screening Check, the Year 4 Multiplication Tables Check (MTC) and Year 6 SATs-style practice, which it called a later "challenge mode". The owner asked for them to live in a Region of their own rather than a mode.

## A Region of Checks, on the Islands with a statutory check

The **Challenge Arena** is a new Region, under the same name on every Island that has one, as the Brainwave Big Top is. Content follows the Island ([0025](./0025-one-island-per-year-group.md)), so it appears on:

| Island        | Year | Checks                                                                                                                     |
| ------------- | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| Meadow Isle   | 1    | Phonics Screening Check                                                                                                    |
| Jungle Reach  | 4    | Multiplication Tables Check                                                                                                |
| Starfall Isle | 6    | SATs: Maths arithmetic, Grammar and punctuation, Spelling first; Maths reasoning and Reading once their content is written |

It is the second Region that is not for one Subject, after the Big Top: a SATs Region spans Maths and English. Every Game in it is unlocked from the start, because Checks are for rehearsing, not for earning a way through. It follows the usual Island locks and Parent Region switch, so a Year 3 Child meets the MTC only if a Parent opens Jungle Reach.

## Each Check is a short paper that fits a Mission

A real SATs paper runs 30 to 60 minutes; a Mission is 5 to 10. Every Check is therefore a mini-paper of about a Mission's length, in the real paper's format: the MTC's 25 questions on the 2 to 12 times tables, an arithmetic paper of about a dozen questions, and so on. There are no full-length papers.

Checks play the Skills the Subject Regions already teach, as the Big Top does ([0021](./0021-bubble-bay-is-the-maths-region-with-a-level-per-year.md)), so their answers count towards the same Mastery, and finishing one earns the usual Activity Stars.

## Practice or Timed Check, and no hard fail

A Child chooses how to play each Check:

- **Practice**: untimed, with the usual hints and retries.
- **Timed Check**: the real assessment's clock (6 seconds a question for the MTC, an overall clock for a SATs paper), with no hints until the end. When the clock runs out on a Question it is marked "not in time" and the Check moves on. Nothing is lost or failed, and the end shows the score and the facts to practise, with a celebration either way.

A clock on a Question is not a nudge to stay longer ([0010](./0010-rewards-without-nudges.md)): it ends a go sooner, not later, and nothing expires between Sessions. What it bends is the PRD's "never a hard fail" principle, which the "not in time" rule keeps.

A Parent can switch on **No time limit in Checks** for a Child, mirroring the access arrangements the real checks allow. A Timed Check then keeps its format but has no clock.

## Scores, for the Child and the adults

A Timed Check is the one place a Child sees a score, such as "21 out of 25", because that is what the real check gives and what they are preparing for. It is their own, never compared with anyone and never shown to siblings. There are no leaderboards.

Every Timed Check finished goes into the Child's **Check History**: date, score, and the facts missed or slow (a 12 × 12 grid for the MTC) or the score by question type (for SATs papers). Parents see it on the Child's progress page; Teachers see the same read-only, and a "latest Check score" column in their Year Group summary for Years 1, 4 and 6. Practice feeds Mastery only. Like everything else, scores are worked out on the server from events ([0004](./0004-offline-play-records-events-the-server-decides.md)); each answer's event carries how long it took, measured on the device.

## Checks that need a grown-up or a voice

Two checks can't be rehearsed on screen alone, because Wizzaroo has no speech recognition and makes all audio before release ([0007](./0007-audio-is-made-before-release.md)):

- **The Phonics Screening Check is marked by a Parent.** The real check is read aloud to an adult. Its Timed Check is labelled "Do this with a grown-up": the screen shows one word at a time in the check's format, the Child reads it aloud, and the Parent taps right or wrong. Those answers go into the Check History but never count towards Mastery, since an adult judged them. Its Practice is the Child alone, telling real words from alien ones, which needs no recording of each word. Both follow the Child's Phonics Programme: a paper only uses words the programme's graphemes can sound out, and under each word the grown-up sees how the programme splits it into sounds and which of its stages (such as Little Wandle's Phase 3 or Read Write Inc.'s Set 2) taught them.
- **The SATs Spelling Check fetches its audio on demand.** The real paper is dictated. Its words and sentences are voiced with Piper before release like every other line, but they are served outside the offline download, which is already over its 15 MB budget ([performance budget](../performance-budget.md)). The Spelling Check therefore needs a connection the first time it is played, and is kept on the device after that. It is the first audio fetched outside the precache.

The Multiplication Tables Check copies the real check exactly, from the Standards and Testing Agency's current guidance: 25 questions on the 2 to 12 times tables, with the 6, 7, 8, 9 and 12 times tables weighted more heavily, 6 seconds an answer, a 3-second pause between questions, and three warm-up questions first.

## Drawn as HTML over a themed backdrop

The real MTC and SATs are plain screens with typed answers. Checks are drawn as accessible HTML boards over a backdrop, as the Big Top's puzzles are ([0017](./0017-brainwave-big-top-puzzles-are-accessible-html-boards.md)), so answers are typed with a keyboard or an on-screen number pad and every control has an accessible name. They add nothing to the 3D game budgets. The Arena's landmark on the map is one new model, dressed with each Island's props.

## Considered Options

- **A "challenge mode" outside the World Map**: a separate place with its own rules for locks and switches. A Region reuses Island locks, Parent switches, the Region panel and the explore trails.
- **Checks as Games inside the Maths and English Regions**: no new Region, but a SATs set spans two Subjects, and Checks would sit in the Star-unlock order, so a Child could not rehearse the check until late in the Region.
- **Full-length papers**: true to the real SATs, but four times a Mission and tiring for a ten-year-old at home.
- **No clock, ever**: safest against a hard fail, but the MTC is a speed check, and rehearsing it without the clock misses the point. The Parent switch covers the Children for whom the clock is wrong.
- **No score for the Child**: closest to "Stars for effort, not scores", but the Child already knows the real check is marked, and a private score with facts to practise is more useful than hiding it.

## Consequences

- The Glossary's Region entry now names two exceptions to one Subject per Region.
- Meadow Isle, Jungle Reach and Starfall Isle each gain a Region, which needs a place on the map, a landmark and an explore trail ([0029](./0029-islands-can-be-explored-on-foot.md)).
- The Phonics Screening Check on Meadow Isle depends on the alien words from #111, and is the one Check whose answers don't count towards Mastery.
- The SATs Spelling Check is the first content that is not in the offline download; playing it offline the first time shows that it needs a connection.
- Maths reasoning and Reading Checks need authored word problems and passages, drafted by AI and reviewed by pull request, before they can be built.
