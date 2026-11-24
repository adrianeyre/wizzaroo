# For parents shows each Game's place in the National Curriculum, and Games first holds back the Wardrobe, Room and Explore

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for two things a grown-up uses beside a playing Child:

- A **For parents** button on every Game in every Region on every Island, both while playing, where it pauses the Game, and as a small icon on each Game's card before playing. It opens full details of exactly which part of the UK National Curriculum the Game practises, with a **View National Curriculum** button that opens the official website.
- A time a Parent can set, such as 10 minutes, that a Child must spend playing Games before the Wardrobe, Room and Explore open: 2, 5, 10, 15 or 20 minutes, or the Parent's own, and not set by default.

## Decision

- **For parents reads the Curriculum Points.** Each Game's Skills already teach Curriculum Points ([ADR 0034](./0034-curriculum-points-show-gaps-to-parents.md)), found through the same lookup as its card (`listCardSkillIds` in `game-card-content.ts`). The dialog shows every point a Game's Skills teach, with where it sits in the programme of study: its GOV.UK title, the Key Stage, the part for the Year (English groups Years 3 and 4, and 5 and 6, as its programme does) and the statutory heading, worked out by `curriculum-point-location.ts` rather than stored, since it follows from the Subject, Year and point. Phonics points are placed under English's "Reading: word reading" or "Writing: transcription (spelling)", where the phonics requirements are written.
- **It says England.** The National Curriculum Wizzaroo follows is England's; Scotland, Wales and Northern Ireland each have their own. The dialog says so, and **View National Curriculum** opens the GOV.UK collection (`nationalCurriculumUrl`), with each point linking to its own programme of study.
- **Pausing stops the Game's clock.** Every Game reads time through one clock that stands still while For parents is open, so answer times, a Timed Check's countdown and puzzle seconds are fair. Voice-over and music stop; the dialog is modal, so nothing behind it can be tapped.
- **Games first is a synced limit**, `gamesFirstMinutes`, beside the daily limit and the explore locks, so it applies offline once a device has synced. It counts only time in a Game (a Mission, puzzle or Check, not the World Map or exploring), per Child per day per device in `localStorage`, like the daily limit's time. The locked tabs stay visible with a lock and explain how many minutes are left, rather than being hidden as the Parent's explore lock hides Explore, because the Child is meant to see them open once they have played.

## Considered options

- **Every statutory statement as its own entry**: the programme of study's bullet points are hundreds per Year and many can't be played ([ADR 0034](./0034-curriculum-points-show-gaps-to-parents.md)). The statutory heading, the Year's part of the programme and a link to the document find the exact words in one step.
- **A grown-up check before For parents opens**, such as a sum to solve: nothing in the dialog changes a setting, so it isn't gated, and a Child opening it only pauses their own Game.
- **Counting all play time towards Games first**: time on the World Map and exploring would count, which is what Games first is meant to come before.
- **Hiding the Wardrobe, Room and Explore until unlocked**: a Child wouldn't know they are coming, or why.

## Consequences

- A Games first longer than the daily limit is never reached that day; the form's hint doesn't stop a Parent setting it.
- As with the daily limit, two devices count separately, so a Child playing on two devices plays Games first on each.
