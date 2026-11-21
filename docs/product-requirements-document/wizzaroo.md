# Wizzaroo: Product Requirements Document

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

**Status:** Draft v0.8 (phases 1-9 largely built, see section 13; Opening to a second School is in progress)
**Date:** 17 November 2026
**Owner:** Adi
**Repo:** [`adrianeyre/wizzaroo`](https://github.com/adrianeyre/wizzaroo), where the work is planned as issues and milestones
**URL:** `wizzaroo.adrianeyre.co.uk`

Capitalised terms (Character, Mission, Mastery…) are defined in [`GLOSSARY.md`](../../GLOSSARY.md). Decisions are recorded in [`docs/architectural-decision-record/`](../architectural-decision-record/).

---

## 1. Overview

Wizzaroo is a gamified, fully interactive learning website for primary-school children, built first for the owner's two children and designed to grow with them from Year 1 to Year 6. It is opening up to Schools: an Admin creates Schools and Teachers, Teachers bring in Parents and follow the Children in their Year Groups, and Parents manage their own Children's play ([ADR 0026](../architectural-decision-record/0026-schools-and-teachers.md)). It teaches the UK National Curriculum through a 3D game world with a modern look and a retro soul. Each Child dresses up and customises their own Character, and earns Items for it by learning.

### The users

| Person                  | Role                             | Year Group and starting point                                                                      |
| ----------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Daughter                | Child, 6                         | Year 1. Phonics is her priority (Phonics Screening Check in June), plus early maths and English    |
| Son                     | Child, 7                         | Year 2. Maths (place value, two-digit addition and subtraction, times tables) and spelling/grammar |
| Owner                   | Parent and Admin, lead developer | One account holding both roles                                                                     |
| Second adult (optional) | Parent                           | Same rights as the owner within the Family, but not Admin                                          |
| Teachers (later)        | Teacher                          | One School, one or more Year Groups; see the progress of the Children in them                      |
| Other families (later)  | Parent and Child                 | Brought in by a Teacher or the Admin, never by signing up                                          |

### Vision

A world the Children want to return to, where learning is how they progress: they explore, solve problems, collect things, and see their own Character grow and change as their skills do.

---

## 2. Goals and non-goals

### Goals

- Help the Children learn Maths, Phonics and English, mapped to the UK National Curriculum.
- Cover all primary Year Groups (1-6) so the site stays useful until the end of Year 6.
- Make it genuinely fun and interactive, not a quiz site with stars on it.
- Give each Child a unique, customisable Character with earnable Items.
- Give Parents clear progress tracking, and Teachers the same for the Year Groups they teach.
- Run entirely on the owner's own infrastructure (home server).
- Keep working when the home server or tunnel is down.

### Non-goals (for now)

- **No sign-up.** Nobody can create their own account: the Admin creates Schools and Teachers, and Admins and Teachers create Parents ([ADR 0026](../architectural-decision-record/0026-schools-and-teachers.md)).
- No chat, social features or public profiles for Children. The one exception: classmates can look at each other's Rooms if their Parents turn it on ([ADR 0031](../architectural-decision-record/0031-classmates-can-see-each-others-rooms.md)).
- No ads, no in-app purchases, no real-money currency.
- No live AI inside child play, and no runtime speech synthesis but the device's voice reading a question or message when the Child presses Read it to me ([ADR 0007](../architectural-decision-record/0007-audio-is-made-before-release.md), [ADR 0060](../architectural-decision-record/0060-read-it-to-me-reads-questions-and-messages-in-a-chosen-voice.md)).
- No streaks, expiring rewards or other nudges to play longer ([ADR 0010](../architectural-decision-record/0010-rewards-without-nudges.md)).
- Not a native mobile app (a PWA is the target).

---

## 3. Curriculum scope

Mapped to the UK National Curriculum (England). Verify specifics against gov.uk before building content for later Year Groups, as details can change. All teaching, spelling and voice-over is in British English.

### Priority Subjects (launch)

- **Maths:** counting and number bonds, place value, add/subtract, times tables, fractions, shape, time, money, then decimals, long multiplication and division, ratio and early algebra by Year 6.
- **Phonics:** letter sounds, digraphs, split digraphs, alternative spellings, blending, and alien (pseudo) words for the Year 1 Phonics Screening Check; common exception words. Phonics tapers into spelling rules and reading fluency after Year 2. Taught in the order and terms of each Child's Phonics Programme (see below).
- **English:** spelling (statutory word lists), grammar and punctuation, sentence building, reading comprehension.

### Later Subjects

Science, Geography, History, Computing, Music, Art and design, Design and technology, and Languages (from Year 3; the foreign language is chosen per Child, as the school teaches it). All but Languages are built for Years 1-6; Languages is built for Years 3-6 in French, the first language, with others to follow. Every statutory statement of the National Curriculum in England that a game can teach has a Game, and each Subject's programme of study is linked from the Parents and Teachers page ([ADR 0039](../architectural-decision-record/0039-the-whole-national-curriculum-through-lab-games.md)). Physical education is statutory but done by moving, so it has no Region. RE and PSHE are better handled by conversation than by a game.

### Phonics Programmes

Every systematic synthetic phonics programme on the DfE's validated list is supported. A Phonics Programme is a data file holding the order a programme teaches sounds in and the words it uses for them, and a Parent chooses one for each Child, since siblings can move schools. Wizzaroo's own art, rhymes and phoneme recordings are shared across all programmes, because the 44 sounds are the same everywhere. Programmes are added one at a time, each from freely published progression documents: Little Wandle and Read Write Inc first, then Essential Letters and Sounds, Jolly Phonics, Sounds-Write and Twinkl Phonics, then the rest of the DfE's list (45 programmes in November 2026). No programme's branded mnemonics, characters, images or songs are ever copied ([ADR 0006](../architectural-decision-record/0006-curriculum-and-content-are-files-in-the-repo.md)).

### Suggested order

1. Engine plus Maths, Phonics and English for Years 1-2.
2. Science, then Geography and History.
3. Computing (Circuit Spire, [ADR 0024](../architectural-decision-record/0024-circuit-spire-is-the-computing-region.md)), then Languages and Music.
4. Fill in Years 3-6 across all Subjects.

### Milestones worth supporting

- Year 1 Phonics Screening Check (June), including alien words.
- Year 4 Multiplication Tables Check.
- Year 6 SATs-style practice.

All three are practised in the **Challenge Arena**, a Region of their own (section 5, [ADR 0031](../architectural-decision-record/0031-the-challenge-arena-practises-the-statutory-checks.md)).

---

## 4. Learning engine requirements

- **Curriculum as data:** each Skill is a record with an ID, Subject, Year Group, strand, prerequisites and a mastery rule. The World Map, progression and Parent dashboard all read from it, so adding a year of content doesn't change game code.
- **Content lives in the repo:** Skills, spelling lists, phonics sets, grammar and approved passages are versioned files, reviewed by pull request and shipped with the PWA for offline play ([ADR 0006](../architectural-decision-record/0006-curriculum-and-content-are-files-in-the-repo.md)).
- **Stable Skill IDs:** IDs carry no Year Group, for example `maths.number-bonds-10`, and never change once published. Year Group is a field on the Skill. Every Activity carries its Skill ID.
- **Generated Questions:** Maths Questions come from code generators (for example "number bonds to 20, Difficulty 3"), giving unlimited, always-correct practice that works offline.
- **Authored content:** reading comprehension and word problems may be drafted by AI in bulk, then reviewed and merged by a Parent before the Children see them.
- **No live AI in the game:** an LLM could help the Parent dashboard later (summaries, suggested next topics), but never child play.
- **Content follows the Island, not the Child:** every Game on an Island plays that Island's Year Group. A Child working ahead of or behind their Year is handled by a Parent unlocking another Island, not by a per-Subject Placement. Placement is dropped as a play mechanic; it may come back later as a Parent dashboard signal ([ADR 0025](../architectural-decision-record/0025-one-island-per-year-group.md)).
- **Mastery:** each Skill moves through Not started → Learning → Mastered → Due for review. The mastery rule is data on each Skill; the default is **80% on 3 separate days** (days by the device's local date), so one long afternoon can't master a Skill.
- **Spaced repetition:** Mastered Skills become Due for review over time and come back as Reviews. Doing well on a Review returns the Skill to Mastered. This matters over six years.
- **Regional content:** British English spelling, UK money, and UK English voice-over.

---

## 5. Game design

### Principles

- Missions are 5-10 minutes long, with a clear end, a celebration and an obvious "one more go".
- Stars for effort, not scores. A wrong answer gets a gentle hint and a retry, never a hard fail.
- Variety: rotate Game Types between the Activities of a Mission.
- Touch first: big targets, voice-over on every instruction, minimal reading for the youngest.

### Devices and input

- **Devices:** Windows, Mac, iPad, Android tablets, iPhone and Android phones, all through the browser as an installed PWA.
- **Children play in landscape** on every device. Game layouts are designed for a phone in landscape first, then scaled up to tablets and desktops. Touch targets are at least 48 pixels on a phone.
- **The Parent dashboard** is a normal responsive web page that works in portrait.
- **Every Game Type works with touch and with a mouse.** Letter tracing gets a looser tolerance with a mouse rather than being turned off. Keyboard support (typing answers, arrow keys) is a nice extra, not a requirement.
- **On iPhone and iPad, a Family Device must be installed to the home screen**, because Safari otherwise deletes stored data after 7 days without a visit ([ADR 0004](../architectural-decision-record/0004-offline-play-records-events-the-server-decides.md)).

### The world

The world is redesigned as **one Island per Year Group** ([ADR 0025](../architectural-decision-record/0025-one-island-per-year-group.md)). Today's single map, with its eight Subject Regions and the Brainwave Big Top, becomes Island 1. The rest of this section is the target design; section 13 records what is built.

#### Islands

- The **World Map** is a sea holding six **Islands**, one per Year Group. Each Island has its own landscape, landmarks and props, and its own Region names. No two Islands look alike.
- Each Island plays **its own Year's content only**. A Year 3 Child visiting Island 1 plays Year 1 Maths there. There are no Year tabs inside a Region.
- A Child's **Home Island** is the one for their Year Group. The World Map opens on it, zoomed out so the whole Island is in view.
- The Child can pan and zoom around the whole World Map and see every Island. **Every Island can be travelled to and explored**, whatever the Child's Year, but only the Islands for their own Year and below are **open to play** by default ([ADR 0071](../architectural-decision-record/0071-islands-above-a-childs-year-are-explored-but-not-played-by-default.md)). An Island above their Year, or one a Parent or Teacher locks, shows its landscape, but tapping a Region shows a padlock and "Ask a grown-up to open this Island", and no Game opens.
- A Child's Year Group is worked out from their birth month and year, so it moves up on 1 September (section 8). When it does, the Home Island moves with it and the new Island unlocks. Progress on every Island is kept. Islands a Parent unlocked stay unlocked even if the Year Group goes down.
- **Island themes are the age-band themes.** The landscapes mature from Island 1 to Island 6, so the world doesn't feel babyish to an 11-year-old. The palette, music, model set and Companion style together make a theme, which stays swappable data.

#### Regions

- Every Region is for **one Subject**, shown as its heading on the map. There are two exceptions: the Brainwave Big Top, which holds puzzles, and the Challenge Arena, which holds Checks.
- Every Island has a Region for **every Subject the curriculum teaches in its Year**, under names and landmarks of its own:
  - Phonics only on Islands 1 and 2, the years the National Curriculum teaches it ([ADR 0016](../architectural-decision-record/0016-crystal-caves-is-the-phonics-region.md)).
  - Languages on Islands 3 to 6, the Key Stage 2 years that teach it.
- **Every Island also has the Brainwave Big Top**, under the same name everywhere. It holds the same twelve puzzles (word search, sudoku, mine sweeper, crossword, mahjong, number pyramid, number trail, bingo, clock pairs, tightrope words, ring sort and sentence parade), each playing Maths or English Skills from that Island's Year ([ADR 0017](../architectural-decision-record/0017-brainwave-big-top-puzzles-are-accessible-html-boards.md), [ADR 0066](../architectural-decision-record/0066-seven-more-puzzles-in-the-brainwave-big-top.md)).
- **Meadow Isle, Jungle Reach and Starfall Isle also have the Challenge Arena**, under the same name on each, where a Child practises their Year's statutory checks (see Checks in the Challenge Arena below).
- Every Region is **on by default**. A Parent can turn any Region off, the Big Top and the Challenge Arena included.
- Each Region has a small story problem to solve, so the learning serves a purpose.

#### Games and unlocking

- Each Region holds **ten Games** for its Island's Year. A Game is a fixed, named thing to play, made of Missions and Activities.
- In every Region except the Big Top, **only the first Game is unlocked** at the start. The rest unlock **one at a time, in a fixed order set in the content data**, easiest first.
- **The next Game unlocks once the Child has earned 10 more Stars in that Region** since the last unlock, counting Activity Stars and Mastery bonuses earned there. That is about one Mission. Unlocking is earned, not bought: no Stars are spent, so learning never competes with Items. The 10 is content data, like the other launch values.
- **A Mastered Game never holds the next one back.** If a Game's Skill is already Mastered (for example from the Big Top, or from another Island), finishing one Activity in it unlocks the next Game. Without this rule a Mastered Game earns no Stars and the next Game would never open.
- **In the Brainwave Big Top and the Challenge Arena, all Games are unlocked from the start**, on every unlocked Island.
- Each Island is tracked separately: every unlocked Island starts with the same defaults, and unlock progress is kept per Child, per Island, per Region.
- Mastery no longer opens anything on the map. It still drives Reviews, the Mastery bonus and the Parent dashboard. The old rule (first Region open; each next one after 5 more Mastered Skills) is retired.

#### Parent controls

From the Parent dashboard, per Child, a Parent can:

- **Lock or unlock each Island**; the Islands for the Child's own Year and below are open until a Parent locks them, and those above are locked until a Parent opens them early.
- **Turn each Region on or off** on each Island, the Brainwave Big Top included. Each Subject also has a "turn off on every Island" shortcut. These switches replace the "Subjects they can play" limit, so there is one control instead of two that could disagree.
- **Unlock every Game in a Region** at once, skipping the Star gating.
- **Turn a single Game off** in any Region. It shows on the map as locked, "Turned off by a grown-up", even when the Child has earned it or every Game in the Region is open.
- **Take the clock away in Checks** (No time limit in Checks), for a Child for whom a timed check is unsuitable, as the real checks' access arrangements allow.

Every control can be undone. Locking Games again keeps the Stars and unlock progress already earned. Each switch is labelled beside it ("Can visit", "Can play", "All Games open"), and a key above the Islands says what each one does.

#### Teacher locks

A Child's Teachers have the same Island, Region and Game switches, but only to turn things off ([ADR 0035](../architectural-decision-record/0035-teachers-lock-what-a-child-plays.md)):

- A Teacher can **lock an Island, turn a Region off, or turn a single Game off** for any Child in their Year Groups, from "Class Islands" on the Teacher dashboard.
- **Whatever a Teacher turns off stays off** until a Teacher turns it back on. The Parent sees it as an off switch they can't move, marked "Locked by their Teacher".
- A Teacher can't open anything: opening an Island early and opening every Game in a Region stay Parent-only.
- The Teacher sees where the Parents have turned the same thing off at home, marked "Off at home".

#### Moving existing progress

When Islands ship, every Game in which a Child has already finished an Activity stays unlocked, and so does the next Game in that Region, so nothing a Child has played gets locked again. Today's Parent Region unlocks become Region switches on Island 1, and Children with a Year Group above 1 get the new Islands for their Year.

#### Exploring an Island

Every Island, even a locked one, can be **explored on foot** as the Child's own Character, wearing what they chose in the Wardrobe ([ADR 0029](../architectural-decision-record/0029-islands-can-be-explored-on-foot.md), [ADR 0053](../architectural-decision-record/0053-locked-islands-can-be-travelled-to-and-explored.md)). An **Explore** button on the World Map opens the Island in view; on a locked Island the Regions' Games stay shut.

- **Controls:** the arrow keys or W A S D, a touch joystick, or the mouse (click the ground to walk there, or hold the left button to keep walking towards the pointer). Right-drag or a finger drag looks around, the wheel zooms, and Space or the Jump button jumps. Four camera views, switched by buttons or the V key: Behind, First person, Bird's eye and Wide.
- **The whole Island is playable.** Trails link every Region. The Child walks over bridges, climbs mountains and volcanoes (more slowly on steep slopes), swims rivers, the oasis and the sea around the Island out to an islet offshore, slides on Frost Isle's ice, jumps higher in Starfall Isle's low gravity, and is held back from Ember Isle's lava unless there is a bridge.
- **Three times the land.** Each Island has grown two new lands, east and west of its old coast and joined to it, so it has at least three times the land it had; the Character, trees and props stay the same size ([ADR 0041](../architectural-decision-record/0041-islands-grow-new-lands-with-ring-races-and-the-ship-sails-the-world-map.md)). Islands are explored at six times their World Map size. The new lands are filled with each Island's own scenery and sights, a mountain peak and a lake ([ADR 0042](../architectural-decision-record/0042-filled-new-lands-movable-pop-ups-a-gangplank-and-the-walker.md)). Each new land reaches on into a far reach, with fifteen Attractions of the Island's own between them, such as a swan boat lake, an ice palace, a dinosaur park, a jungle coaster, a minotaur labyrinth or a drop tower ([ADR 0068](../architectural-decision-record/0068-fifteen-more-attractions-on-the-far-reaches-of-every-island.md)).
- **Choosing where to start.** A walker button beside Explore can be dragged onto the map to start exploring where it lands. Every pop-up can be dragged out of the way, and stays where it was left the next time (kept in the browser's local storage), and each group of map buttons can be minimised.
- **Things to do on every Island:** seven lookouts to climb, such as Meadow Isle's lighthouse, for a slowly turning view over the whole Island; twenty-four fact signs; twenty hideaways to explore, such as Fox Hollow or the Snow Cave; twelve friendly animals to say hello to (Lambs, Penguins, Camels, Monkeys, Lizards and Owls), each with a fact to tell; two Ring Races, one on each new land, run through eight glowing rings against the clock; twenty bounce pads; lamps along the trails; and a hundred and four treasures to find, one out in each new lake and one on each new mountain peak (Golden Acorns, Snow Crystals, Sun Coins, Parrot Feathers, Fire Opals and Fallen Stars).
- **Travelling between Islands.** Every Island has a Dock, a Runway, a Helipad, a Balloon Field and a hover slipway, drawn on the World Map too, and flies the Wizzaroo flag beside its Dock. Choosing another Island's Year, on the World Map or in the explore bar, picks a ship, an aeroplane, a helicopter, a hovercraft, a submarine or a hot-air balloon at random ([0050](../architectural-decision-record/0050-a-hot-air-balloon-floats-between-balloon-fields.md), [ADR 0043](../architectural-decision-record/0043-aeroplanes-and-helicopters-fly-between-runways-and-helipads.md), [ADR 0045](../architectural-decision-record/0045-a-hovercraft-a-submarine-and-the-wizzaroo-flag-on-every-island-and-aircraft.md)). The ship comes into the Dock, slides out a gangplank, and sails across the World Map to the other Island's Dock, where the Character walks down the plank. The aeroplane lands on the Runway, lowers its stairs for the Character to climb aboard, takes off and flies to the other Island's Runway; the helicopter lands on the Helipad, slides open its door, and flies to the other Island's Helipad. The hovercraft rides up the hover slipway onto the land, lowers its bow ramp, and hovers over the sea to the other Island's slipway; the submarine surfaces beside the Dock, slides out its brow for the Character to climb down its hatch, and dives under the sea to the other Island's Dock. The hot-air balloon floats down onto the Balloon Field, opens the little door in its basket for the Character to step in, and floats over the sea to the other Island's Balloon Field with the Character in view in its basket. The aeroplane, the helicopter and the balloon carry the Wizzaroo flag and name. **Fast forward** skips the journey and goes straight to the other Island.
- **Railways and Vehicles.** Every Island has a Railway round all its land masses, crossing between them on bridges in six styles, with five Stations and its own style of Train (Meadow Isle's is a steam train) that the Character gets on and off at a Station. The Islands have no roads ([ADR 0048](../architectural-decision-record/0048-the-islands-have-no-roads.md)). The wardrobe sells 30 Vehicles for Stars, from a bicycle and a horse and cart to a sports car, a van and a motorbike, which the Child puts on the map when exploring and rides ([ADR 0046](../architectural-decision-record/0046-railways-roads-and-vehicles-on-every-island.md)).
- **Learning stays one step away.** Walking up to a Region offers "Go into" it, which opens the same Region panel and Games as the map. After a Game the Child is back exploring beside that Region.
- **No nudges.** Treasures count only for the session being played and earn no Stars or Items ([ADR 0010](../architectural-decision-record/0010-rewards-without-nudges.md)).

#### Checks in the Challenge Arena

The statutory checks are practised in the **Challenge Arena** ([ADR 0031](../architectural-decision-record/0031-the-challenge-arena-practises-the-statutory-checks.md)), a Region under the same name on the Islands whose Year has one:

| Island        | Checks                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Meadow Isle   | Phonics Screening Check: real and alien words read aloud to a Parent, who marks them                                           |
| Jungle Reach  | Multiplication Tables Check: 25 questions on the 2 to 12 times tables, 6 seconds each, answers typed, copying the real check   |
| Starfall Isle | SATs: Maths arithmetic, Grammar and punctuation, and Spelling first; Maths reasoning and Reading once their content is written |

- **Every Check is a short paper that fits a Mission**, in the real paper's format. There are no full-length papers.
- **Practice or Timed Check.** Practice is untimed, with hints and retries. A Timed Check uses the real clock and gives no hints until the end; a Question the clock runs out on is marked "not in time" and the Check moves on, so nothing is failed or lost.
- **The Child sees their own score** after a Timed Check, with the facts or question types to practise and a celebration either way. It is never compared with anyone or shown to siblings.
- Checks play the same Skills as the Subject Regions, so their answers count towards the same Mastery, and finishing one earns the usual Activity Stars. All their Games are unlocked from the start.
- Every Timed Check goes into the Child's **Check History**, which Parents and Teachers see (section 8).
- **The Phonics Screening Check is done with a grown-up:** the Child reads each word aloud and a Parent taps right or wrong. Its answers go into the Check History but not into Mastery.
- **The SATs Spelling Check is dictated** with Piper voice-over fetched on demand, outside the offline download, so it needs a connection the first time it is played.
- Checks are drawn as accessible HTML boards over a themed backdrop, like the Big Top's puzzles.

#### Islands and Regions

Island 1 keeps today's names. Each Island also has the Brainwave Big Top, and Islands 1, 4 and 6 the Challenge Arena. Each Island also has an Art and design Region (Rainbow Easel, Frost Gallery, Mosaic Courtyard, Canopy Studio, Molten Gallery, Stardust Studio) and a Design and technology Region (Tinker Mill, Sleigh Workshop, Camel Gearworks, Vine Workshop, Bellows Workshop, Orbit Workshop), marked by an easel and a workshop shared by every Island; the Languages Regions below are marked by an embassy. Region names stay at about 20 characters or fewer, so they fit on the map on a phone in landscape.

| Island          | Year | Landscape and landmarks                                                                 | Maths               | English             | Phonics        | Science           | Music            | Geography        | History           | Computing       | Languages     |
| --------------- | ---- | --------------------------------------------------------------------------------------- | ------------------- | ------------------- | -------------- | ----------------- | ---------------- | ---------------- | ----------------- | --------------- | ------------- |
| Meadow Isle     | 1    | Bright meadow, volcano, mountain lake, river, three villages, lighthouse (today's map)  | Bubble Bay          | Whispering Woods    | Crystal Caves  | Cloud Castle      | Crescendo Canyon | Compass Peak     | Hourglass Heights | Circuit Spire   | —             |
| Frost Isle      | 2    | Snowfields, frozen waterfall, igloo village, aurora sky, ice bridge                     | Icicle Inlet        | Snowdrift Library   | Glacier Grotto | Aurora Lab        | Chiming Icefall  | Polar Lookout    | Frozen Fort       | Snowbot Works   | —             |
| Sunscorch Sands | 3    | Dunes, oasis, desert ruins, market town, caravan trail                                  | Oasis Pools         | Scroll Bazaar       | —              | Mirage Prism      | Drumbeat Dunes   | Caravan Crossing | Pyramid Steps     | Sandstorm Relay | Echo Well     |
| Jungle Reach    | 4    | Rainforest canopy, waterfalls, river delta, rope bridges, overgrown temple              | Monkey Falls        | Storyvine Temple    | —              | Orchid Hollow     | Rainbeat Ridge   | Delta Mapworks   | Lost Temple       | Firefly Circuit | Parrot Point  |
| Ember Isle      | 5    | Volcanic forge, lava rivers, obsidian cliffs, iron keep, steam vents                    | Anvil Quarry        | Inkfire Archive     | —              | Magma Crucible    | Thunder Forge    | Obsidian Peaks   | Ironclad Keep     | Cinder Core     | Ember Embassy |
| Starfall Isle   | 6    | Floating rocks at night, observatory, standing stones, crystal spires, a comet overhead | Constellation Court | Moonlit Scriptorium | —              | Comet Observatory | Nebula Hall      | Meridian Stones  | Starfall Ruins    | Signal Tower    | Galaxy Gate   |

#### Rewards in the world

- Hidden collectibles, surprise bonus rounds inside Missions, and a "welcome back" gift with no streak ([ADR 0010](../architectural-decision-record/0010-rewards-without-nudges.md)).

### Reusable Game Types

Multiple choice, drag-and-drop labelling, matching pairs, ordering on a timeline, map tapping, listen-and-pick, tracing letters, building words from tiles, popping bubbles and balancing scales. Built once, reused across Subjects.

### Interactivity

- Instant feedback on every tap (squash, sparkle, wobble).
- Sound effects and looping music per Region, with a Parent mute toggle.
- A Companion that travels with the Child and reacts to what they do.
- Exploring an Island on foot as the Child's Character, with things to climb, read, bounce on and find (see Exploring an Island above).

### Family play

- **Family Chest:** each Activity a Child finishes adds the same amount, whatever their Year Group. When it is full, **each** Child receives their own Item.
- Cooperative goals rather than head-to-head leaderboards.
- **Gifts:** Children can never transfer Stars. Instead, a Child can buy a Gift, an Item that can only be given to a sibling and never kept. Gifts arrive with the Core loop phase.
- **Mentoring**, where an older sibling helps a younger one, is not a requirement. It is hard to tell apart from answering for them and muddies the younger Child's Mastery. Revisited with the Years 3-6 content and dropped for good: Gifts and the Family Chest are how siblings play together.

---

## 6. Customisation and rewards

Each Child has their own Character, a 3D person they make and dress up to make unique.

### Character customisation

- Free Features, chosen at any time, with at least 10 choices each: a Character Type (Wizard, Warrior, Knight and more, each with its own gear), skin, hair style and colour, eyes, eyebrows, mouth and facial hair.
- Layered Items over them: hats, accessories, outfits, backs (capes, wings, shields) and something in the hand (wands, staffs, swords), with colour and pattern options.
- A naming step when the Character is first created.
- A wardrobe screen to try on Items and save outfits.
- The Character's portrait is what the Child taps to log in.

### Launch slots and Items

- **Nine free Features:** Character Type, skin, hair style, hair colour, eyes, eye colour, eyebrows, mouth and facial hair, each with at least 10 choices, so every Character is unique from day one.
- **Five Item slots:** hat, accessory, outfit, back and something in the hand, each with a free starter set of 2-3 choices, and the Character Type's own gear in any slot left empty.
- **Earnable Items in every slot**, two of them tied to Skills: the number bonds hat and a phonics wand.
- Pets, Mounts, Rooms, Emotes and Spell Effects come next (see below). The designs themselves are content work.

### Items Children can earn

- **Character:** spell effects (trails, sparkles), emotes and dances, pets and sidekicks, mounts (broomstick, cloud, dragon), titles and badges.
- **Their space:** a room with furniture and trophies, a garden or pet park, and World Map decorations so each Child's world looks different.
- **Look and feel:** map themes, music and sound packs, profile frames.
- **Game features:** new mini-games and bonus rounds, boss challenges after a Region, sticker and collection albums.
- **Shared and seasonal:** Family Chest rewards, and seasonal Items that come back every year rather than disappearing for good.

### Reward rules

- Stars are the only currency.
- **Earning:** a fixed number of Stars for each Activity finished, whether or not the answers were right; a one-off bonus when a Skill becomes Mastered; and Activities on Mastered Skills earn Stars only when they are a scheduled Review.
- **Launch values** (content data, expected to change once the Children play):

  | What                        | Value                                                   | Roughly                                                             |
  | --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
  | Stars per Activity finished | 3                                                       | about 10 per Mission of 3-4 Activities                              |
  | Mastery bonus               | 20                                                      |                                                                     |
  | Item prices                 | common 15, uncommon 30, rare 60                         | two Missions for a common Item; a week of daily play for a rare one |
  | Family Chest                | full after 30 Activities between the Children           | about a week                                                        |
  | Game unlocks                | the next Game after 10 more Stars earned in that Region | about one Mission per Game; nothing is spent                        |

- **Spending offline is allowed.** If two Family Devices together overspend, every purchase is honoured and the balance stops at zero ([ADR 0004](../architectural-decision-record/0004-offline-play-records-events-the-server-decides.md)).
- Mix quick wins (stickers, every Session), milestone rewards (room Items, mounts) and rare long-term goals.
- Some Items tie to Skills (for example a times-table hat for mastering the 2s, 5s and 10s).
- A "visit my room" mode so Children can show off what they have earned.

### Rooms, Pets, Mounts, Emotes and Spell Effects

- **Room:** each Child's own space, opened from a button on the World Map and not placed on any Island, so it doesn't move when the Home Island changes. It has 15 fixed places for Furniture (bed, rug, wallpaper, wall picture, shelf, lamp, window, plant, desk, seat, toy box, clock, fish tank, soft toy and instrument), each with 2-3 free starters and 8 earnable Items, chosen by tapping like the wardrobe.
- **Trophies:** a shelf in the Room shows a Trophy for each Region where the Child has earned enough Stars to unlock every Game themselves (90 Stars for a ten-Game Region), whatever a Parent has unlocked. The Brainwave Big Top gives none. Trophies are worked out from Stars, so Children who already qualify have them the first time they open their Room. Never bought, and not Items.
- **Pets:** 6 to start, worn in their own slot and standing beside the Character in the wardrobe, the Room and the Mission celebration. Never on the World Map, which belongs to the Companion.
- **Mounts:** 3 to start (broomstick, cloud, dragon), ridden in the same places. The Character still doesn't appear on the World Map.
- **Emotes and Spell Effects:** 6 Emotes and 4 Spell Effects to start, one of each worn at a time, played when a Mission ends and when the Child taps their Character in the wardrobe or Room. Under reduced motion they show as a still pose or a glow.
- **Prices:** every earnable one uses the rarity prices above, and one of each kind is tied to a Skill.
- **Visiting a Room:** a Child can look at a sibling's Room on a Family Device, offline. With both Parents' switch on (off by default; one switch works both ways) at a School the Admin has approved once its data processing agreement names it, they can also look at a Classmate's Room online: the Room, Trophies and the Character's portrait with its Pet, never a name. Looking is all: no visit log, likes, counts, messages or Gifts outside the Family ([ADR 0031](../architectural-decision-record/0031-classmates-can-see-each-others-rooms.md)).
- **Playing in the Room:** the Child can play in their own Room as their Character, filling the full height between the top menu and the footer: walk around it, lie on the bed, sit on the seat, play with every piece of Furniture, and pick up and stroke their Pet, with the same four camera views as exploring an Island (Behind, First person, Bird's eye and Wide, switched by buttons or the V key), plus a Map view of the whole Room from above. Nothing is stored or rewarded ([ADR 0038](../architectural-decision-record/0038-a-child-can-play-in-their-room.md)).

---

## 7. Visual and audio style

**Direction: a modern, friendly interface around a 3D world with a retro style** ([ADR 0003](../architectural-decision-record/0003-3d-with-a-retro-pixel-treatment.md)).

The 3D world's reference points are classic BBC Micro and Acorn Electron games from Superior Software, such as Pipeline (1988) and Ravenskull (1986): chunky pixels, a small bright palette, blocky bitmap type and simple chiptune sound.

- **3D scenes with a retro treatment:** low-poly, stylised models rendered at low resolution with a pixelating shader and a limited palette, so the world feels 8-bit while remaining 3D.
- **Modern, friendly UI:** every page outside the 3D world (the Parent pages and the Children's menus) is clean, rounded and bright: a light background, white cards with soft shadows, pill-shaped buttons, learning blue with play yellow and a pink accent, and the open fonts Baloo 2 for headings and Nunito for text (both SIL Open Font Licence, bundled with the app rather than fetched from a font service). The retro flavour lives in the 3D world alone.
- **Audio:** chiptune beeps and short looping tunes. Voice-over and phonemes are made before release ([ADR 0007](../architectural-decision-record/0007-audio-is-made-before-release.md)).
- **Originality:** take inspiration from the style, but don't copy the original games' sprites, graphics or fonts, which belong to their creators.

### Performance budget

The floor is **a roughly £150 Android phone from 2021 at 30 fps**, the weakest device the Children use. A 2019 entry-level iPad is the second device to test on. The pixel style helps: the world is drawn at low resolution and scaled up, which suits cheap GPUs. The game lowers its render resolution and drops effects automatically when frames slow down. The budget for model triangle counts, texture sizes and the offline download size is set against the phone in slice 1, and every later asset has to fit within it. With six Islands on the World Map, only the Island in view is drawn in full detail ([ADR 0012](../architectural-decision-record/0012-the-world-map-is-drawn-in-full-detail.md)); the others are low-detail shapes that load their detail when the Child pans to them ([ADR 0025](../architectural-decision-record/0025-one-island-per-year-group.md)).

---

## 8. Accounts and roles

Wizzaroo serves Schools as well as the owner's Family ([ADR 0026](../architectural-decision-record/0026-schools-and-teachers.md)). A **School** has **Teachers**, and its **Children** belong to **Families** with one or more **Parents**. Nobody signs up: every adult account starts with an Invite from an Admin or a Teacher.

| Role                                              | Can do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin** (the owner only)                        | Run Wizzaroo itself. Create Schools; create, invite, move and deactivate Teachers; create and invite Parents and create Children at any School; move a Child to another School; delete an empty School. The Admin dashboard lists every School, Teacher, Parent and Child, with last login, and can send any adult a password reset. Everything a Parent can do, for any Child. Content and the Catalogue stay files in the repo                                                             |
| **Teacher** (one School, one or more Year Groups) | See every Child in their Year Groups at their School, plus a Year Group summary. Lock Islands and turn Regions and Games off for those Children, which their Parents can't undo (section 5). See the Parents of those Children and the School's Parents who have no Children yet. Create and invite Parents, create Children in their Year Groups, resend Invites, and send Parents a password reset. Never open anything for a Child, change their other settings, or move or remove anyone |
| **Parent** (one or more per Family, equal rights) | Create and manage their own Children, see progress, time spent and weak spots, set a daily time limit, lock and unlock Islands, Regions and Games, reset Picture Passwords, sign in and revoke Family Devices                                                                                                                                                                                                                                                                                |
| **Child**                                         | Play only: their own Character, room and games. No email, no password, no free-text chat, no public profile                                                                                                                                                                                                                                                                                                                                                                                  |

### Schools, Teachers, Parents and Children

- **School:** a name and a town, nothing more. Only the Admin creates one, and it can be deleted only once it has no Teachers or Children. A Year Group at a School exists whether or not it has any Teachers, Parents or Children; Year Groups are always Years 1 to 6 and are never created.
- **Teacher:** belongs to exactly one School and teaches one or more of its Year Groups. Only the Admin creates and invites Teachers, and only the Admin moves a Teacher to another School, changes their Year Groups or deactivates them.
- **Parent:** created and invited by an Admin or a Teacher, never by another Parent and never by signing up. A Parent belongs to the School that invited them and to every School one of their Children attends, since siblings can attend different Schools. A Parent may have no Children yet. A second adult in a household is added by a Teacher or the Admin and linked to the same Family.
- **Family** stays the household: its Parents and Children share the Family Chest, Gifts and Family Devices, whichever Schools the Children attend.
- **Child:** belongs to one Family and exactly one School. A Parent creates Children in their Family, a Teacher can create a Child in their own Year Groups at their School, and the Admin anywhere. Only the Admin moves a Child to another School; all progress is kept. Deleting a Child or Family is part of the data deletion flow (section 11): a Parent of the Family asks, and the Admin confirms. The Admin never deletes a Child or Family no Parent has asked to delete.
- **Deactivating** a Teacher or Parent blocks their sign-in and keeps their data.

### Bulk creation

The Admin and Teachers can create many people at once by uploading a CSV file, so a School can be set up from its office spreadsheet.

- **Templates:** each upload has a downloadable CSV template.
- **Teachers** (Admin only): one row per Teacher, with name, email, School and Year Groups (for example `2;3`).
- **Parents and Children together** (Admin and Teachers): one row per Child, with School (Admin only), first name or nickname, birth month, birth year, an optional one-year adjustment, and up to two Parents (name and email each).
  - Rows sharing a Parent email become one Family, so siblings are entered as separate rows.
  - Two Parents on a row share that Family.
  - A row with Parents but no Child creates Parents with no Children yet.
- **Reach:** a Teacher's upload is limited to their own School and to Children whose worked-out Year is one of their Year Groups. Other rows are flagged and skipped. The Admin can upload to any School.
- **Existing people:** a Parent email that already exists adds the new Child to that Parent's existing Family. For a Teacher this holds only for a Parent within their reach. A row naming any other address that has an account, another School's Parent or staff alike, is skipped with the same reason for each, naming no role or School, and the Admin adds that Child. A Teacher's preview says nothing of whose an address is: it treats such an address as one no one has, and the upload then skips the row. A Child matching one already in that Family (same name, birth month and year) is flagged as a likely duplicate and skipped.
- **Preview first:** nothing is created until the uploader has seen every row marked as valid, or with its problem named.
- **Partial success:** valid rows are created and invalid ones skipped, with a downloadable report of skipped rows and reasons. A Family is created only if all its rows are valid, so siblings are never split.
- **Size:** a file has at most 1,000 rows and 1,000,000 characters, and no more columns than its template. A wider file is refused before its rows are read, and reading stops at the first row past the cap, so the caps bound what one upload costs.
- **Invites:** the preview ends with "Create and email Invites now" (ticked by default) or "Create only", leaving Invites to be sent later from the Parents or Teachers list. Bulk emails go out in batches through one queue for the whole deployment, to stay within the provider's limits however many uploads there are. An email that fails doesn't stop the rest, and its Invite shows in the Parents or Teachers list as not emailed, so the uploader can send a new one.
- **Imported Children** have no Character or Picture Password yet. The Parent sets the Picture Password the first time the Child is opened on a Family Device, and the Child makes and names their Character then.

### Year Group from date of birth

- Creating a Child asks for their **birth month and year**, never the day.
- Year Group is worked out from them using the English school year, which runs from 1 September to 31 August. A Child born from September to December of year _B_ starts Year 1 in the September of _B_ + 6; a Child born from January to August of year _B_ starts Year 1 in the September of _B_ + 5. For example, a Child born in March 2020 is in Year 2 from September 2026, and one born in October 2020 is in Year 1.
- It therefore **moves up automatically every 1 September**, along with the Home Island, and each Teacher's Year Groups then show the new cohort.
- A Parent, Teacher or the Admin can set a **one-year adjustment, up or down**, for a Child who isn't in their age's year, such as a deferred summer-born Child. It carries forward every September.
- A Child whose Year works out as **Reception** can be created, and plays on Island 1. A Child past **Year 6** keeps playing on Island 6 with every Island unlocked, but no longer appears in any Teacher's Year Groups.

### Dashboards

- **Admin dashboard:** every School, Teacher, Parent and Child, searchable, with each adult's **last login** and each Child's **last played** (the end of their latest Session). From it the Admin sends password resets, resends Invites, and opens anything a Parent or Teacher would see. Each time the Admin opens a Child's progress, it is logged, and the record outlives the Child's deletion. Each change the Admin makes to another Family's Child, its Family Chest or a School is kept in the audit log, with no values.
- **Teacher dashboard:**
  - A **Year Group summary** listing every Child in each of their Year Groups with last played and weak spots, so a class can be scanned at once.
  - Each Child's progress as a Parent sees it, read-only: Mastery by Subject and Skill, practice by day, time spent, which Islands and Games are unlocked, and their Check History.
  - For Years 1, 4 and 6, a **latest Check score** column in the Year Group summary.
  - A **Parents list**: name, email, which of their Children are in the Teacher's Year Groups, last login, Invite status (pending, accepted or expired), and buttons to resend the Invite or send a password reset.
  - **Class Islands:** choose a Child in their Year Groups, then lock Islands and turn Regions and Games off for them (section 5, "Teacher locks").
- **Parent dashboard:** as now, without "Invite a Parent", plus each Child's **Check History**: every Timed Check with its date and score, the facts missed or slow (a 12 × 12 grid for the Multiplication Tables Check), or the score by question type for a SATs paper. Each Child shows their School and the line "Teachers for <Year> at <School> can see this Child's progress". Nothing about other Families is ever shown.
- **Dashboard layout:** on a wide screen the section menu runs down the left edge, the full height between the header and the footer, with each group ("Your Family", "You", "Your class", "Running Wizzaroo") in an accordion that starts open and can be closed. The section itself fills the rest of the width, with a little padding either side. On a phone the menu folds into the header.

### Requirements

- **Roles are a set on a user**, so the owner's single account holds both Admin and Parent. Admin stays owner-only; letting the Admin create other Admins is a later decision.
- After login the owner lands on the Admin dashboard, with the Parent dashboard one tap away. Teachers land on the Teacher dashboard and Parents on the Parent dashboard.
- **The first account:** a command-line seed command (`pnpm seed:owner`) run on the server creates the owner's user, with Admin and Parent, and their Family. It refuses to run a second time. There is no sign-up page.
- **Invites:** an Admin or Teacher creates an Invite, a single-use link that expires after 7 days, and either copies it or has Wizzaroo email it. Whoever opens it sets up a Teacher or Parent login. Parents can't create Invites.
- **Password resets** can be asked for by the adult themselves, sent to anyone by the Admin, or sent to their Parents by a Teacher. Each is the same one-hour, single-use link; whoever sends it never sees or sets the password.
- Role checks, and which Schools, Year Groups and Families each user can reach, are enforced in the API, not just hidden in the UI.
- **Sign-in:** Wizzaroo's own sign-in, with email and password (hashed with argon2), passkeys and two-factor authentication. **Teachers and the Admin must use two-factor authentication or a passkey**, because they see many Families' Children; for Parents it stays optional. A Parent's sign-in lasts 30 days, or 14 days unused; a Teacher's or the Admin's 7 days, or 12 hours unused ([ADR 0049](../architectural-decision-record/0049-sign-ins-end-when-left-unused.md)). No Cloudflare Access.
- **Adding a passkey on a phone:** "Add a passkey" shows a QR code beside the "this device" form. Scanning it opens Wizzaroo on the phone, which adds a passkey kept on the phone to the same account without signing in there. The code works once, for 10 minutes ([ADR 0036](../architectural-decision-record/0036-adding-a-passkey-on-a-phone-by-qr-code.md)). Whoever holds the code learns neither the adult's email address nor their account id, and the adult's confirmed address is told of every passkey added or removed.
- **Family Devices:** a Parent signs in on a device once, and proves it's them again with their password, a code or a passkey. It then holds a long-lived credential for play only, which a Parent can revoke, and which their password change or reset revokes too. The Parent sees when, and from which address, each device was last used. A Child taps their Character's portrait and enters a Picture Password, checked on the device so it works offline. The Picture Password keeps siblings apart; it isn't a security boundary ([ADR 0005](../architectural-decision-record/0005-family-devices-and-picture-passwords.md)). Children play at home only; there are no School devices.
- **Limits** are enforced by each Family Device using the limits it last synced, so a change applies after the next sync. Time is counted per device; two devices together may exceed a daily limit.
- **Moving to Schools:** the migration creates one School, named by the Admin, and moves the owner's Children into it. Their birth month and year are asked for the first time the Admin or a Parent opens them.

### Email

Wizzaroo sends email through the self-hosted email platform, using its built-in Wizzaroo templates, from `no-reply@wizzaroo.adrianeyre.co.uk` ([ADR 0069](../architectural-decision-record/0069-emails-are-sent-through-the-email-platform.md)). Where the email platform is and its API key live in `.env`; the email platform holds the SMTP provider, Resend, so switching provider is configuration there, not code. A home server never sends mail directly, because home internet addresses are blocklisted. Emails go only to Teachers and Parents, never contain a Child's data, and Children never receive email.

| Email               | When                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Teacher Invite      | The Admin creates a Teacher and asks Wizzaroo to email the Invite                                                                                      |
| Parent Invite       | A Teacher or the Admin creates a Parent and asks Wizzaroo to email the Invite; it names the School                                                     |
| Password reset      | An adult asks to reset their password, the Admin sends one to anyone, or a Teacher sends one to a Parent; the link works once and expires after 1 hour |
| Email address check | An adult sets or changes their email address                                                                                                           |
| Security notice     | An adult's password changes, a passkey is added to or removed from their account, or a new Family Device is signed in                                  |
| Email change notice | An adult asks to change their email address, and again when the change is confirmed; it goes to the old address and names the new one only masked      |
| Address in use note | Someone asks to move their account to an address another account already has; it goes to that address, with no link                                    |

A weekly progress summary for Parents is an idea for later, once the dashboard has proved itself and email is set up with Resend. It is not part of any phase. If it is ever built, it is off by default.

---

## 9. Technical architecture

### Stack

- **Language:** TypeScript throughout, with the toolchain, layout and deployment set out in [`docs/standards/local.md`](../standards/local.md).
- **Layout:** one package with `src/client`, `src/server` and `src/curriculum` ([ADR 0008](../architectural-decision-record/0008-one-package-with-client-server-and-curriculum.md)).
- **Frontend:** React, built by Vite, with the 3D world in React Three Fiber (three.js) and Drei, using glTF models. Candidate helper: Howler.js for audio.
- **Backend:** a Fastify API that also serves the built PWA, giving one origin and no CORS.
- **Database:** Postgres, with the schema in Drizzle inside `src/server`.
- **App type:** an offline-first PWA.

### Offline play and sync

A Family Device appends events (Question answered, Activity finished, Item bought) to a local outbox in IndexedDB and uploads them idempotently whenever the API can be reached. The server replays them and is the only place that works out Mastery, Stars, Game unlocks and the Family Chest. The device shows a provisional version until the server's arrives. Event times come from the device's clock; the server also records when it received each event ([ADR 0004](../architectural-decision-record/0004-offline-play-records-events-the-server-decides.md)).

### Keeping Schools and Families apart

Every row about a Child belongs to one Family and one School. The API takes the caller's reach from their credential, never from the request: a Parent reaches their own Family, a Teacher the Children in their Year Groups at their School and those Children's Parents, and the Admin everything, logged. Integration tests prove that a Family can't read another Family's data and a Teacher can't read another School's or another Year Group's. Postgres row-level security checks the same reach again, so a query that forgets its filter still can't cross a Family ([ADR 0026](../architectural-decision-record/0026-schools-and-teachers.md), [ADR 0027](../architectural-decision-record/0027-row-level-security-through-a-reach-role.md)).

### Hosting

Self-hosted on the owner's home server using Docker Compose ([ADR 0002](../architectural-decision-record/0002-self-hosted-behind-a-cloudflare-tunnel.md)):

- `app`: the API plus the static PWA.
- `postgres`: on an internal Docker network only, with a named volume. Never exposed to the tunnel or the LAN.
- `cloudflared`: a Cloudflare Tunnel routing `wizzaroo.adrianeyre.co.uk` to the app container. It only carries traffic, with no Cloudflare Access in front.
- Secrets in a `.env` file kept out of git (database password, session secret, tunnel token, email platform API key).
- `backup`: a nightly Postgres dump, encrypted with age and sent with rclone to the NAS on the LAN, which keeps a set number of nights, and to a Backblaze B2 bucket in EU Central with Object Lock, which keeps each for 90 days and which the home server can't delete from ([ADR 0026](../architectural-decision-record/0026-schools-and-teachers.md), [ADR 0028](../architectural-decision-record/0028-backups-are-age-encrypted-dumps-sent-with-rclone.md), [ADR 0030](../architectural-decision-record/0030-backups-go-to-the-nas-and-a-locked-b2-bucket.md)).

### Build approach

Full stack from the start (frontend, backend and database), but delivered as thin vertical slices, so there are no weeks of plumbing before anything is fun.

---

## 10. Data model (sketch)

Everything about a Child belongs to a Family and a School. Progress, Stars and the Family Chest are worked out on the server from events.

- **User:** id, email, credentials, set of roles (Admin, Teacher, Parent), last login, deactivated-at.
- **School:** id, name, town.
- **Teacher:** user, School, Year Groups (one or more of 1-6).
- **Family:** id, Parents (one or more users).
- **ParentSchool:** Parent, School (the School that invited them; the Schools of their Children are worked out).
- **Invite:** id, role (Teacher or Parent), School, Family where relevant, created by, expires-at, accepted-at.
- **AdminAccessLog:** Admin, Child, when.
- **FamilyDevice:** id, Family, credential, revoked-at.
- **Child:** id, Family, School, nickname, Picture Password, birth month and year, Year Group adjustment (-1, 0 or +1; the Year Group itself is worked out and decides the Home Island), Phonics Programme, foreign language (later), synced limits (daily time, and No time limit in Checks).
- **Island and Region** (files in the repo, not tables): each Island's Year Group, theme and landmarks; each Region's Island, Subject, name, place on the map and its ten Games in unlock order.
- **ChildUnlocks** (Parent choices, synced to Family Devices): Islands locked or unlocked, Regions switched off, Regions with every Game unlocked, and Games switched off. Game unlocks earned by Stars are worked out from events, not stored.
- **TeacherLocks** (one row per Child, set by their Teachers or the Admin, synced to Family Devices with the Parent choices): Islands locked, Regions switched off and Games switched off, who last changed them, and when ([ADR 0035](../architectural-decision-record/0035-teachers-lock-what-a-child-plays.md)).
- **Phonics Programme** (a file in the repo, not a table): id, name, sound order, terms.
- **Skill** (a file in the repo, not a table): stable id, Subject, Year Group, strand, prerequisites, mastery rule.
- **Event:** id (generated on the device), Child, Family Device, type, payload, Skill id where relevant, device time, received-at.
- **Mastery** (worked out from events): Child, Skill, state, history for spaced repetition.
- **Check History** (worked out from events): Child, Check, date, score, and each Question's answer and time taken, measured on the device.
- **CharacterLoadout:** Child, a small JSON of equipped Items, for example `{hat: "wizard-blue", outfit: "stars"}`.
- **Catalogue** (a file in the repo) and **Inventory:** Items, rarity, unlock rule, Star cost, and which Items each Child holds.
- **FamilyChest** (worked out from events): Family, current goal, progress.
- **Session:** Child, device, start and end, for time spent on the Parent dashboard.

---

## 11. Privacy, safety and compliance

- Collect as little data as possible: a first name or nickname, birth month and year (never the day), School, and progress data, nothing else. For adults: name, email and School.
- No advertising, no profiling for ads, and no features that nudge Children to stay longer: no streaks, no expiring rewards, no fear-of-missing-out timers ([ADR 0010](../architectural-decision-record/0010-rewards-without-nudges.md)).
- High privacy by default, and a clear Parent-facing privacy notice.
- The UK ICO Children's Code (Age Appropriate Design Code) applies to services likely to be used by children, so design in line with it.
- Families, Schools and Year Groups are kept apart by the API and proven by test ([ADR 0026](../architectural-decision-record/0026-schools-and-teachers.md)).
- **Before a second School is added**, all of these must be in place together: row-level security, ICO registration, a privacy policy and a data processing agreement with each School, data export and deletion for Parents, logged Admin access, nightly off-site backups ([ADR 0026](../architectural-decision-record/0026-schools-and-teachers.md)), and a penetration test, with every finding above low remediated or waived in writing and a second round run by someone outside the project ([pen-testing.md](./pen-testing.md)).
- Parents are told which Teachers can see their Children's progress (section 8), as the Children's Code expects.
- This document is not legal advice, so seek proper advice before any public or commercial launch.

---

## 12. Content and assets

- **Maths:** generators in code.
- **Spelling, phonics, grammar:** data files drawn from the statutory lists. Phonics follows each Child's Phonics Programme, whose sound order and terms are data, not code.
- **Reading comprehension and word problems:** AI-drafted in bulk, reviewed by pull request, then stored as fixed data.
- **Audio:** voice-over generated before release with Piper (open source, run locally, with a UK English voice) and shipped as files. The generating script can be pointed at another tool, such as Azure, if the voice proves flat. Pure phonemes (not letter names) recorded by the owner or taken from a licensed set ([ADR 0007](../architectural-decision-record/0007-audio-is-made-before-release.md)).
- **3D assets:** CC0 low-poly packs (such as Kenney or Quaternius) adjusted in Blender by default. Only the Character's layered parts are custom-modelled. Every asset's source and licence is recorded beside it, and every model fits the performance budget ([ADR 0009](../architectural-decision-record/0009-cc0-asset-packs-by-default.md)).

---

## 13. Phasing

| #   | Phase                                                                                                                                                                                                                              | Status at 17 November 2026                                                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Foundation:** the Compose stack, sign-in and roles, Family Devices, Family and Child records, the event outbox and sync, and the Skill data format                                                                               | Built, including passkeys, two-factor sign-in and Invites                                                                                                                                                                                                                                    |
| 2   | **Slice 1 (maths):** popping bubbles on number bonds to 10 with the Companion, events synced to Postgres, Mastery on the Parent dashboard                                                                                          | Built                                                                                                                                                                                                                                                                                        |
| 3   | **Slice 2 (phonics):** listen-and-pick for phonics, once the phoneme audio exists                                                                                                                                                  | Partly built: the Game Type exists, but no phoneme recordings are shipped yet, so it doesn't appear. Multiple choice is used everywhere else                                                                                                                                                 |
| 4   | **Core loop:** the World Map and Region unlocks, Stars and the Catalogue, customisation slots and launch Items, the Family Chest                                                                                                   | Built: one World Map, 218 Catalogue Items, 20 Character Types, the wardrobe, Gifts and the Family Chest                                                                                                                                                                                      |
| 5   | **Years 1-2 content:** Maths, Phonics and English, with spaced repetition                                                                                                                                                          | Built. Placement was never built and is now dropped                                                                                                                                                                                                                                          |
| 6   | **More Subjects:** Science, Geography, History, Computing, Music, then Languages                                                                                                                                                   | Built for Years 1-6, with Languages in French for Years 3-6                                                                                                                                                                                                                                  |
| 7   | **Years 3-6:** content for every Subject, plus the Challenge Arena's Checks: the Multiplication Tables Check and SATs-style practice                                                                                               | Built: content for every Subject (Phonics is Years 1-2 by design), and the Challenge Arena's Checks ([ADR 0031](../architectural-decision-record/0031-the-challenge-arena-practises-the-statutory-checks.md))                                                                                |
| 8   | **Islands:** one Island per Year Group, Star-unlocked Games, Parent Island, Region and Game controls (section 5)                                                                                                                   | Built: six Islands on one World Map, ten Games a Region unlocked by Stars, Parent Island, Region and Game switches, and existing progress moved across                                                                                                                                       |
| 9   | **Schools and Teachers:** Schools, Teachers, Admin- and Teacher-only Invites, Year Group from birth month and year, bulk creation by CSV, Admin and Teacher dashboards, required two-factor for Teachers and the Admin (section 8) | Built: Schools, Teachers, Admin- and Teacher-only Invites, Year Group from birth month and year, every query scoped by the caller's reach, bulk creation by CSV, Admin and Teacher dashboards, and two-factor or a passkey required for Teachers and the Admin                               |
| 10  | **Opening to a second School:** the compliance and backup gate in section 11                                                                                                                                                       | In progress: legal advice, ICO registration, privacy policy and agreements, row-level security, data export and deletion, logged Admin access and off-site backups are done; both pen-test rounds and the request-rate policy are outstanding. The server refuses a second School until then |

### What is built today

One World Map, a sea holding six Islands. Every Island and Region, with each Region's ten Games in the order they unlock, is defined in `src/curriculum/world-map.json`. Island 1, Meadow Isle, keeps the nine Regions of the first map, and adds Art and design and Design and technology:

| Region            | Subject               | Games                                                         | ADR                                                                                                                                                                                                 |
| ----------------- | --------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bubble Bay        | Maths                 | 10, each with a level for every Year 1-6                      | [0015](../architectural-decision-record/0015-bubble-bay-games-share-the-studio-stage.md), [0021](../architectural-decision-record/0021-bubble-bay-is-the-maths-region-with-a-level-per-year.md)     |
| Whispering Woods  | English               | 10 per Year, Years 1-6                                        | [0019](../architectural-decision-record/0019-whispering-woods-teaches-english-from-year-1-to-6.md)                                                                                                  |
| Crystal Caves     | Phonics               | 10 per Year, Years 1-2                                        | [0016](../architectural-decision-record/0016-crystal-caves-is-the-phonics-region.md)                                                                                                                |
| Cloud Castle      | Science               | 10 per Year, Years 1-6, played at ten Lab Stations            | [0018](../architectural-decision-record/0018-science-games-are-data-played-at-ten-lab-stations.md)                                                                                                  |
| Brainwave Big Top | Puzzles               | 12 puzzles on Maths and English Skills from the Island's Year | [0017](../architectural-decision-record/0017-brainwave-big-top-puzzles-are-accessible-html-boards.md), [0066](../architectural-decision-record/0066-seven-more-puzzles-in-the-brainwave-big-top.md) |
| Crescendo Canyon  | Music                 | 10 per Year, Years 1-6, sound made in the browser             | [0020](../architectural-decision-record/0020-crescendo-canyon-is-the-music-region.md)                                                                                                               |
| Compass Peak      | Geography             | 10 per Year, Years 1-6                                        | [0022](../architectural-decision-record/0022-compass-peak-is-the-geography-region.md)                                                                                                               |
| Hourglass Heights | History               | 10 quests per Year, Years 1-6                                 | [0023](../architectural-decision-record/0023-hourglass-heights-is-the-history-region.md)                                                                                                            |
| Circuit Spire     | Computing             | 10 per Year, Years 1-6                                        | [0024](../architectural-decision-record/0024-circuit-spire-is-the-computing-region.md)                                                                                                              |
| Rainbow Easel     | Art and design        | 10 lab games per Year, Years 1-6                              | [0039](../architectural-decision-record/0039-the-whole-national-curriculum-through-lab-games.md)                                                                                                    |
| Tinker Mill       | Design and technology | 10 lab games per Year, Years 1-6                              | [0039](../architectural-decision-record/0039-the-whole-national-curriculum-through-lab-games.md)                                                                                                    |

Islands 2 to 6 (Frost Isle, Sunscorch Sands, Jungle Reach, Ember Isle and Starfall Isle) each have their own landscape, landmarks, Region names and positions, and theme (palette, sky, music and Companion style), defined in `src/curriculum/islands.json` and drawn by `src/client/islands/`. A Game played in one of their Regions uses the same stage as on Meadow Isle, dressed with two of that Island's props, on every stage but Music's, which has no triangles to spare. The Island theme's music holds a looping tune for each Region, played while a Child plays a Game there; its Companion style is data that nothing draws yet.

How phase 8 is built:

- Every Region plays its Island's Year, whatever the Child's own; there are no Year tabs. Islands 3 to 6 have no Phonics Region.
- The map opens on the Child's Home Island. Only the Island in view is drawn in full detail; the other five are one low-detail shape each, and the detail loads as the Child pans to them.
- Each Region opens its first Game; the next unlocks after 10 more Stars earned there, or straight away after one Activity in a Game whose Skill is already Mastered. Unlock progress is worked out from events, like Stars, and each Activity's event records the Island, Region and Game it was played in. Locked Game cards show a padlock and how many Stars open them, and a Game whose Skill is Due for review shows "Review waiting".
- Capital catch (Whispering Woods) and Listen and pick (Crystal Caves) stay on Island 1 as extra Games outside the ten, always open.
- Parents lock and unlock Islands, turn Regions off (one at a time or a whole Subject on every Island), and open every Game in a Region, on the Islands page of the dashboard. These replace "Subjects they can play" and the Region unlock switches.
- When Islands shipped, every Game a Child had finished an Activity in stayed unlocked with the next Game in its Region. Activities from before Islands record only their Skill, so each was matched to every Game playing that Skill. A Parent's old Region unlocks became "open every Game" on Island 1, Subjects a Parent had switched off became those Regions turned off on every Island, and the unused Placement column was dropped.
- Also built: Mastery with spaced repetition (Due for review after 7 days, interval doubling), Stars worked out from events, offline play with a precached app and an event outbox, Piper voice-over, and the Parent dashboard's progress charts and time spent.
- Exploring on foot: every Island, locked or not, has an Explore button, and the Child can walk, swim, jump and bounce across it as their Character, along trails that link every Region, with four camera views, seven lookouts, twenty-four fact signs, twenty hideaways, twelve friendly animals, two Ring Races, twenty bounce pads and a hundred treasures per Island, plus an islet offshore, three extra sights on the land, a Dock, a Runway and a Helipad, at six times the Island's size on the map. Each Island has two new lands joined to its old coast, giving it at least three times the land ([ADR 0041](../architectural-decision-record/0041-islands-grow-new-lands-with-ring-races-and-the-ship-sails-the-world-map.md)). A ship, an aeroplane, a helicopter, a hovercraft, a submarine or a hot-air balloon, chosen at random, carries the Child between the Docks, Runways, Helipads, Balloon Fields or hover slipways of every Island, from the World Map or while exploring, with a Fast forward button that skips the journey.
- Also built: Rooms with Furniture and Trophies, playing in your own Room, Pets, Mounts, Emotes and Spell Effects, visiting siblings' and Classmates' Rooms, and saved outfits.
- The Challenge Arena on Meadow Isle, Jungle Reach and Starfall Isle ([ADR 0031](../architectural-decision-record/0031-the-challenge-arena-practises-the-statutory-checks.md)): a grown-up-marked Phonics Screening Check, the Multiplication Tables Check, and five SATs mini-papers (arithmetic, reasoning, grammar and punctuation, spelling and reading), each as Practice or a Timed Check, with each Child's Check History on the Parent and Teacher dashboards and a Parent switch for No time limit in Checks. The Spelling paper's spoken words are fetched the first time it is played.
- Six Phonics Programmes: Little Wandle, Read Write Inc, Essential Letters and Sounds, Jolly Phonics, Sounds-Write and Twinkl Phonics. The Phonics Screening Check draws on 82 alien words in the check's style, half of each paper's 20 words, as in the real check, and only words the Child's programme can sound out.
- Not built: more than one theme, and choosing the foreign language per Child: Languages is French only ([ADR 0039](../architectural-decision-record/0039-the-whole-national-curriculum-through-lab-games.md)).

## 14. Risks

- **3D asset production** is the largest cost and the main schedule risk. CC0 packs and the pixel shader are the mitigation.
- **Content volume** across six years and many Subjects is large. The curriculum data and generators are the mitigation.
- **The home server being down** means no sync. Offline play is the mitigation.
- **Disk failure on the home server** loses all progress. Accepted only while the owner's School is the only one; nightly off-site backups are required from the second School on.
- **Other people's children's data:** Teachers and the Admin see many Families. Required two-factor sign-in, API scoping proven by test, row-level security and logged Admin access are the mitigation; the compliance gate (section 11) must be met before a second School joins.
- **A home server serving Schools:** uptime and support expectations rise. Offline play covers short outages; anything beyond a few Schools may need proper hosting, a decision for later.
- **Keeping older Children engaged:** the art and tone must be able to mature. Each Island's own theme is the mitigation.
- **Six Islands of landscapes and Region landmarks** multiply the 3D work and the offline download. Drawing only the Island in view in full detail, and reusing scenes across Islands with different props, are the mitigation.
- **Name overlap:** Wizzaroo itself returned no exact match, but Whizzy Kids (a preschool learning app) is similar in sound and sector. Fine for private use; check the UK IPO trade mark register before any public or commercial launch.
- **Curriculum drift:** government changes to the curriculum or checks. Stable Skill IDs keep history intact when a Skill moves Year Group.

---

## 15. Open questions

None at product level. Legal advice on Wizzaroo's role (data processor for each School, or controller) is needed before the second School. What remains is content work: designing each Island's landscape, writing more Phonics Programme files, and tuning the launch economy values (including Stars per Game unlock) in play.

---

## 16. Decisions log

| Decision                  | Choice                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project name              | Wizzaroo (after considering Learnia, Skillora, Learnova and others)                                                                                                                                                                                                                                                                    |
| Repo and URL              | `wizzaroo`, `wizzaroo.adrianeyre.co.uk`                                                                                                                                                                                                                                                                                                |
| Language and UI           | TypeScript and React                                                                                                                                                                                                                                                                                                                   |
| Audience                  | Schools, Teachers and Families, with School and Family as boundaries in the data; compliance gate before a second School ([0026](../architectural-decision-record/0026-schools-and-teachers.md))                                                                                                                                       |
| Hosting                   | Docker Compose on the home server, Postgres, Cloudflare Tunnel, no Access; nightly off-site backups from the second School ([0002](../architectural-decision-record/0002-self-hosted-behind-a-cloudflare-tunnel.md), [0026](../architectural-decision-record/0026-schools-and-teachers.md))                                            |
| Dimension                 | 3D with a retro pixel treatment ([0003](../architectural-decision-record/0003-3d-with-a-retro-pixel-treatment.md))                                                                                                                                                                                                                     |
| Offline play              | Device records events; the server alone decides the outcome ([0004](../architectural-decision-record/0004-offline-play-records-events-the-server-decides.md))                                                                                                                                                                          |
| Sign-in                   | Own sign-in, Family Devices, Picture Passwords checked on the device ([0005](../architectural-decision-record/0005-family-devices-and-picture-passwords.md))                                                                                                                                                                           |
| Content                   | Files in the repo, stable Skill IDs without a year ([0006](../architectural-decision-record/0006-curriculum-and-content-are-files-in-the-repo.md))                                                                                                                                                                                     |
| Audio                     | Made before release, and no AI; the device's voice reads a question or message only when the Child presses Read it to me ([0007](../architectural-decision-record/0007-audio-is-made-before-release.md), [0060](../architectural-decision-record/0060-read-it-to-me-reads-questions-and-messages-in-a-chosen-voice.md))                |
| Repo layout               | One package: `src/client`, `src/server`, `src/curriculum`; Drizzle schema in-repo ([0008](../architectural-decision-record/0008-one-package-with-client-server-and-curriculum.md))                                                                                                                                                     |
| 3D assets                 | CC0 packs by default; Character parts custom ([0009](../architectural-decision-record/0009-cc0-asset-packs-by-default.md))                                                                                                                                                                                                             |
| Rewards                   | No streaks, no expiring rewards; Stars for effort ([0010](../architectural-decision-record/0010-rewards-without-nudges.md))                                                                                                                                                                                                            |
| Accounts                  | Admin (owner only), Teacher, Parent, Child; owner holds Admin and Parent; one or more Parents per Family; Teachers and Admin must use two-factor or a passkey                                                                                                                                                                          |
| Scope                     | Years 1-6; Maths, Phonics and English first, then other Subjects                                                                                                                                                                                                                                                                       |
| First slice               | Maths: popping bubbles on number bonds to 10; phonics (listen-and-pick) second                                                                                                                                                                                                                                                         |
| First account and Invites | `pnpm seed:owner`; the Admin invites Teachers; Admins and Teachers invite Parents; no sign-up                                                                                                                                                                                                                                          |
| Year Group                | Worked out from birth month and year, moving up every 1 September, with an optional one-year adjustment                                                                                                                                                                                                                                |
| Sign-in order             | Email and password first; passkeys and two-factor authentication next                                                                                                                                                                                                                                                                  |
| Email                     | Through the email platform's built-in templates, Resend as provider, Teachers and Parents only, seven kinds of email; weekly summary deferred, outside any phase                                                                                                                                                                       |
| Voice-over tool           | Piper, generated before release                                                                                                                                                                                                                                                                                                        |
| Phonics                   | Every DfE-validated programme, as data, chosen per Child; six so far, Little Wandle and Read Write Inc first; no branded material copied                                                                                                                                                                                               |
| Language                  | British English throughout; the Year 3 foreign language chosen per Child                                                                                                                                                                                                                                                               |
| Devices                   | Windows, Mac, iPad, Android tablet, iPhone, Android phone; landscape play, phone layout first, touch and mouse                                                                                                                                                                                                                         |
| Performance floor         | A roughly £150 Android phone from 2021 at 30 fps, with automatic resolution and effects scaling                                                                                                                                                                                                                                        |
| Sibling gifts             | Gift Items only; no Star transfers. Mentoring dropped                                                                                                                                                                                                                                                                                  |
| Gamification              | Customisable Character, earnable Items, room, pets, collections, Family Chest                                                                                                                                                                                                                                                          |
| World Map                 | One Island per Year Group; content fixed to the Island; every Island explored, and the Child's own Year and below played, by default ([0025](../architectural-decision-record/0025-one-island-per-year-group.md), [0071](../architectural-decision-record/0071-islands-above-a-childs-year-are-explored-but-not-played-by-default.md)) |
| Unlocks                   | Every Region on; first Game open, the next after 10 Stars earned there; Big Top fully open; Parents can lock and unlock Islands, Regions and Games                                                                                                                                                                                     |
| Exploring Islands         | Every Island, locked or not, can be explored on foot as the Child's Character; treasures last for the session and earn nothing ([0029](../architectural-decision-record/0029-islands-can-be-explored-on-foot.md))                                                                                                                      |
| Placement                 | Dropped; Parents unlock Islands instead                                                                                                                                                                                                                                                                                                |
| Statutory checks          | Practised in the Challenge Arena on Islands 1, 4 and 6: Mission-length Checks, Practice or Timed, no hard fail, a private score, Check History for Parents and Teachers ([0031](../architectural-decision-record/0031-the-challenge-arena-practises-the-statutory-checks.md))                                                          |
| Island and Region names   | Final as in the section 5 table; Region names about 20 characters at most                                                                                                                                                                                                                                                              |
| Rooms and visiting        | A Room per Child off the World Map; Trophies from Stars per Region; Pets, Mounts, Emotes, Spell Effects as Items; siblings visit offline, Classmates by Parent opt-in, look only ([0031](../architectural-decision-record/0031-classmates-can-see-each-others-rooms.md))                                                               |
| Build timing              | Phases 1-7 largely built; Islands (phase 8) decided, not built                                                                                                                                                                                                                                                                         |
