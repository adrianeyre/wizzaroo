# English reading and writing games

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The Parents & Teachers page is getting a view of how Wizzaroo covers the National Curriculum: every heading of each Year's programme of study, with the Skills and Games that teach it. Two English headings had no Game in any Year: Reading – comprehension and Writing – composition. The owner asked for Games that cover them, as fun, interactive and professional-looking in 3D as the other English games, each anchored to a National Curriculum objective.

## Decision

Two new English Game Types join the English Region on every Island: `story-scrolls` for Reading – comprehension and `story-builder` for Writing – composition. Like the ten English Game Types of [0019](./0019-whispering-woods-teaches-english-from-year-1-to-6.md), each has its own Skill in every Year Group, so the same scene plays each Island's own statutory content: 12 new Skills, in two new strands, `reading-comprehension` and `writing-composition`.

| Game Type       | Title         | Y1                                                                         | Y2                                                                                    | Y3                                                                                      | Y4                                                                                                 | Y5                                                                                     | Y6                                                                                                                                           |
| --------------- | ------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `story-scrolls` | Story scrolls | `english.understanding-what-i-read`: titles, events, prediction, inference | `english.questions-about-a-text`: answering and asking questions, sequence, inference | `english.inference-and-prediction`: feelings, thoughts and motives; prediction          | `english.main-ideas-and-themes`: main ideas across paragraphs, summary, themes and conventions     | `english.inference-with-evidence`: inference justified with evidence; fact and opinion | `english.summarising-and-comparing-texts`: summary across paragraphs; how language, structure and presentation make meaning; comparing texts |
| `story-builder` | Story builder | `english.sequencing-sentences`: sentences in order to tell a story         | `english.planning-a-narrative`: planning a beginning, middle and end                  | `english.paragraphs-and-headings`: paragraphs around a theme, headings and sub-headings | `english.settings-characters-and-plot`: settings, characters and plot; proof-reading and improving | `english.writing-for-audience-and-purpose`: audience, purpose, form and vocabulary     | `english.cohesion-across-paragraphs`: cohesive devices across paragraphs, précis                                                             |

Every passage, poem and story is original, written for Wizzaroo, and kept to 70 words so it reads at phone width. The years move from fiction with a clear picture (Y1) through poems, instructions and information texts (Y2 to Y4) to texts that mix fact and opinion (Y5) and two short texts to compare (Y6). Each passage carries two to four questions, and every Year has at least nine.

A Story scrolls question is a new `passage` prompt: a title, its paragraphs and a question. A Story builder question is a new `story-plan` prompt: a task and the steps of a story, plan or page with exactly one gap, the way an alphabet train has one empty carriage. The answers are whole words, phrases or sentences, so both Game Types show their choices as parchment plaques, the HTML buttons History quests already use, rather than word chips.

The two Game Types are extra Games in every English Region, beside Island 1's capital catch, so they are open from the start and every Region keeps its ten Games in unlock order. The ten Region Game Types and the two extra ones are separate lists, `englishRegionGameTypes` and `englishExtraGameTypes`, joined into `englishGameTypes`.

Both scenes are set in the moonlit wood of 0019, with its sky, trees, mist, fireflies, studio lights and Companion:

- **Story scrolls**: a glowing scroll unrolls above a wooden lectern, its passage painted onto the parchment, with a campfire flickering beside it. The choices hang below paper lanterns.
- **Story builder**: a storyteller's open book, the task on its left page and the numbered steps on its right, with the gap glowing, a row of stepping stones beneath it with a pulsing ring over the gap's stone, and a candle. The choices are rune-marked story stones.

The scroll unrolls and the flames and ring move only when motion is allowed; with reduced motion the scroll is shown fully unrolled at once and everything is still.

## Consequences

Both scenes stay within the [performance budget](../performance-budget.md): the busiest Story scrolls scene draws 8,002 triangles and 33 meshes, the busiest Story builder scene 8,454 triangles and 33 meshes, checked by `src/client/woods-games.test.tsx` beside the other English games.

The passage or story is also in the HUD as text: a titled, scrollable passage that a keyboard can focus, or a numbered list with the gap marked, then the question. Screen readers read it there, and at phone width it is the readable copy, since the words painted on the 3D scroll and book are small.

Neither Game Type has a voice-over line of its own. They share Maths' "Read it, then tap your answer" and the woods' "read it again" line. Piper could not be installed where they were made, and the offline download is already over its 15 MB limit (0023), so new audio waits for the owner.

The Parent's progress counts the 12 new Skills under English, and the coverage view can map both headings to a Game in every Year.

## Considered Options

- **Dragging sentences into order**: closer to writing by hand, but dragging is hard on a small phone and needs a second, non-pointer way to play; one tap per gap keeps every Question an accessible button, like every other Game.
- **Two more of the ten Games in each Region**: every Region holds exactly ten Games, and swapping two of them out would drop statutory spelling or grammar content.
- **One Game Type for both headings**: shorter, but reading a passage and building a text are different activities, and each deserves its own scene.
