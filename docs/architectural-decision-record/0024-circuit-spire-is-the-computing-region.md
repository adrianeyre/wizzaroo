# Circuit Spire is the Computing Region, with 60 games in a 3D computing lab

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for a new Region on the World Map for Computing, with an interesting name, and 10 unique games for each of Years 1 to 6 that follow the National Curriculum and are fun, 3D and professional-looking.

Computing is an eighth Subject, and Circuit Spire is a Region for it alone (`"subject": "computing"` in `world-map.json`), the way Crescendo Canyon is for Music ([0020](./0020-crescendo-canyon-is-the-music-region.md)). It stands on open land north-east of the eastern village at (12, 8), marked by a tower ringed with glowing circuit bands and, once it opens, a beacon with orbiting data rings. It is the last Region in the list, so it opens after 35 Mastered Skills, or earlier if a Parent unlocks it. Migration 0016 gives Computing to every Child whose Parent had allowed all seven earlier Subjects, as 0012 to 0015 did for Science, Music, Geography and History.

## The games

Each game is its own Game Type and its own Skill (`computing.<skill>`) in its Year Group, so Mastery, Reviews, Stars and the Parent's charts work as before. A game is defined with `defineComputingGame` in `src/curriculum/computing-year-N.ts` and names its Skill, title, spoken instruction and its questions: either a bank of 10 to 14 written questions, or a `generate(difficulty, random)` that builds fresh ones for each of three difficulties, one per Activity. Generated games check their own answers are unambiguous: a robot route's wrong choices never reach the star, a bug hunt has exactly one step that fixes the route, and a spreadsheet or variable answer is worked out by running the formula or code.

The 60 games follow the National Curriculum's programmes of study for computing at Key Stages 1 and 2: algorithms and programs, creating and debugging programs, logical reasoning, using technology to create, organise and retrieve content, technology beyond school, computer networks and the internet, search and evaluating content, collecting and presenting data, and using technology safely and respectfully. The National Curriculum sets computing by key stage, not by year, so the order within each key stage follows the progression of the National Centre for Computing Education's Teach Computing units.

| Year | Games                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Robot Steps · Tech Spotter · Pixel Painter · Sort It Out · Step by Step · Bug Catcher · Where Will Bolt Go? · Safe Surfer · Word Wizard · Jump and Go                   |
| 2    | Tech Detective · Photo Studio · Robot Route · Pictogram Party · Music Maker · Quiz Coder · Debug the Dance · Predict the Path · Private Pals · Kind Clicks              |
| 3    | Network Builder · Frame by Frame · Sound Sequencer · Branch Explorer · Page Designer · Event Explorer · Break It Down · Code Bug Hunt · Password Power · In or Out?     |
| 4    | Packet Path · Web Wonders · Sound Studio · Turtle Shapes · Loop Legends · Data Logger · Photo Fixer · Fix the Loop · Fact or Fake? · Footprint Finder                   |
| 5    | Team Up Online · Video Director · If This, Then That · Database Detective · Vector Artist · Quiz Master · Higher or Lower · Search Ranker · Sensor Sense · Report It    |
| 6    | Search Skills · Web Builder · Variable Vault · Spreadsheet Sums · Model Maker · Step Counter · Game Designer · Debug Detective · Message Route · Think Before You Share |

Every online-safety game steers a Child towards telling a trusted adult or reporting, never towards handling a worry alone. No game names a real product or brand, and every web address shown ends in the reserved `.example`.

`src/curriculum/computing-games.test.ts` checks every game: its Skill and Year, enough questions at every difficulty for several random seeds, at least three different wrong choices that are never the answer, and text short enough to fit its scene and buttons.

## Drawing

The games share one smooth stage ([0013](./0013-popping-bubbles-is-drawn-smooth.md)), a night-time computing lab: an indigo backdrop with a faint flickering circuit grid, a glowing circuit floor with travelling pulses, drifting data motes and the Companion. A question shows one of 15 scenes, each fed by the question's data rather than drawn per game, so a game is content and the scenes are reused across years with different props:

- Bolt the robot on a grid, with a star, rocks, a numbered route and lettered squares
- coloured program blocks, beside a small board of red LEDs, a lamp or Bolt
- one of 24 devices on a turntable, from a keyboard to traffic lights and a server
- a tablet showing a chat, a web page, a login, a table or a spreadsheet
- a search engine with ranked results and adverts
- a network of computers, routers and servers with a packet travelling its route
- bar charts, pictograms and line graphs
- pixel pictures, animation frames and a beat grid
- a conveyor belt sorting shapes into labelled bins
- a branching database
- variables as labelled crates beside the code that changes them
- story cards for algorithms and decomposition
- a camera and the photo it took
- vector shapes on layers
- a 3D model on a workbench

Every device and the robot is built from primitives and merged into one mesh (`computing-lab-devices.ts`), so a scene with eight networked devices is still one draw call. Words on screens, blocks, cards and labels are drawn onto canvas textures, each kept within 512 pixels on its longest side (`findTextureScale` shrinks the canvas and draws at that scale), so a scene with a tablet, a chart or a branching database stays inside the texture budget. The choices are HTML buttons, as everywhere else, sitting on 3D keycaps that grow in and bob, with arrows read out as words for screen readers.

## Consequences

Every game's scenes stay within 10,000 triangles and 40 meshes, checked by `src/client/computing-lab.test.tsx` for every bank question and for generated questions at the hardest difficulty: 5,538 to 8,338 triangles and 16 to 25 meshes. The busiest is Pictogram Party. The Spire adds 2,380 triangles and up to five meshes to the World Map. It fits within the map's 60 meshes because the clouds and padlocks over locked Regions are drawn as two instanced meshes between them.

Each Year 1 and Year 2 game speaks its own short instruction, because those children are still learning to read. Years 3 to 6 hear one shared line ("Read the question, then tap your answer") and read the game's instruction on screen, as Music does ([0020](./0020-crescendo-canyon-is-the-music-region.md)).

To keep six Regions' voice-over inside the 15 MB offline download, the voice-over pipeline now resamples Piper's 22,050 Hz output to 16,000 Hz with a band-limited (windowed-sinc) filter (`resampleSound` in `voice-over-files.ts`). That is plenty for speech, and every line was spoken again so they all match. With it, the download is 14 MB.

The Region's panel uses the Year tabs that Whispering Woods introduced ([0019](./0019-whispering-woods-teaches-english-from-year-1-to-6.md)), opening on the Child's own Year.

## Considered Options

- **One Game Type for all 60, with the games as data**, as Science does ([0018](./0018-science-games-are-data-played-at-ten-lab-stations.md)). Computing games differ in what they generate (routes, programs, networks, data), and a Game Type per game lets each have its own title and voice line, as Music's do.
- **A bespoke scene for every game**: about 60 times the code, for scenes that would share most of their pieces. Fifteen data-driven scenes give each year its own look while staying inside the budgets.
- **Speaking every instruction**: took the offline download to 16 MB once the other Regions arrived.
- **Lowering the sample rate further, to 11,025 Hz**: smaller again, but the voice starts to sound like a telephone.

## Amended

Amended by [0025](./0025-one-island-per-year-group.md): this Region is on Island 1 and now plays Year 1 only, with its Games unlocked one at a time by Stars. Each other Island has its own Region for this Subject, under its own name, playing that Island's Year. Where this record says the Child plays their own Year, or unlocks the Region by Mastered Skills, the Island design replaces it.
