# Place knowledge and chants get a Game each, as extra Games beside a Region's ten

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The Parents & Teachers page is getting a view of the National Curriculum that maps every programme-of-study heading to the Skills and Games that teach it. Two headings had no Game: Key Stage 2 Geography's place knowledge ("understand geographical similarities and differences through the study of human and physical geography of a region of the United Kingdom, a region in a European country, and a region within North or South America") and Key Stage 1 Music's "use their voices expressively and creatively by singing songs and speaking chants and rhymes". The owner asked for a Game for each, fun, 3D and professional-looking, and anchored to its objective.

Each is an extra Game in an existing Region, listed under `extraGames` in `world-map.json` like Capital catch in Whispering Woods. A Region keeps exactly ten Games in their unlock order, so no Child's unlock progress moves, and an extra Game is open from the start.

## Three Regions Tour

`geography.comparing-regions`, "Comparing a UK, European and American region", is a Year 5 Skill on the place-knowledge strand, played as the extra Game `comparing-regions` in Obsidian Peaks on Ember Isle. Like every Geography game ([0022](./0022-compass-peak-is-the-geography-region.md)) it is data in `geography.year-5.games.json`, after the ten Region games, and its Skill is built from that data. `parseGeographyGames` never limited a year to ten games; the test that did now checks a year's games against its Region instead: the ten Games in order, then its extra Games.

It adds a 14th scene, `region-tour`: three dioramas side by side on the plinth, each on a wooden base with a rim in its country's colour and a name sign.

- **The Lake District**: fells with a grey summit, Windermere, grazing sheep, a slate-roofed cottage, pines and a drifting rain cloud.
- **The Swiss Alps**: a four-sided Matterhorn and two more snow-capped peaks, a glacier, a chalet, pines and falling snow.
- **The Amazon**: a brown river winding through dense, dark canopy with one emergent tree, a toucan, a canoe and a hot sun.

A question shows all three, to compare them, or spotlights one, which rises on a glowing ring and turns while the other two shrink back. Its 19 questions compare climate, physical features and human geography (skiing, river travel, cattle farming and deforestation), and ask about each region's landmarks, money and languages. Nothing on the board names an answer: the signs name the regions, and no question asks which region a sign already gives away.

## Chant along

`music.chants-and-rhymes`, "Keeping the rhythm of chants and rhymes", is a Year 1 Skill on the performing strand, played as the new Game Type `chant-along`, the extra Game in Crescendo Canyon on Meadow Isle. Like every Music game ([0020](./0020-crescendo-canyon-is-the-music-region.md)) it is code, in `music-year-1.ts`, and grows over its three Activities:

1. **Two beats**: the child hears a two-beat rhythm clapped and picks which of two word cards fits it ("Jel-ly bean" for ti-ti ta, "Red ap-ple" for ta ti-ti).
2. **Four beats**: the same with a line of a traditional rhyme and three cards ("Rain, rain, go a-way", "Two lit-tle dick-y birds").
3. **The rhythm of a chant**: the line is chanted on so and mi, with its syllables written on the stones, and the child picks its rhythm from four ta and ti-ti cards.

The choices in a question always have different rhythms, so only one fits. A wrong card plays its own chant or claps, so a mistake still teaches. Words are written with their syllables hyphenated, so a child can clap them as they read.

Its prompt is a new stage prop, `chant-stones`: a sandstone ledge with one round canyon stone for each sound of the rhythm, spaced by the beat so a ti-ti pair sits close together and a ta stands alone, with a small dark pebble for a rest. Each stone lights gold, and hops, while its sound plays. With reduced motion the stones light without hopping.

## Consequences

Three Regions Tour draws 8,096 to 8,576 triangles and 24 or 25 meshes, and Chant along 7,456 to 8,222 triangles and 23 to 28 meshes, within the budget checked by `geography-stage.test.tsx` and `music-stage.test.tsx`.

Neither Game adds audio. Chant along's instruction is "Listen carefully, then tap your answer.", the very words of Music's shared `music.listen-and-tap` line, which every Year 1 and 2 music game without a line of its own already falls back to. So it is spoken, word for word, without a second copy of the same recording in the offline download, which is already over its 15 MB budget. The voice-over test now accepts a game's own line or the shared line with the same words. Three Regions Tour uses Geography's two shared lines, as every Geography game does.

Music now has 61 Skills and Game Types and Geography 61 Skills, so the Parent's Mastery counts grow by two.

## Considered Options

- **An eleventh Game in the Region's unlock order**: every Region has exactly ten, and Stars unlock them in order, so an eleventh would move every later threshold and need a migration for unlocks already kept.
- **Replacing one of the ten**: each of the ten already teaches its own heading, so the coverage view would lose one to gain another.
- **The Alps and a Mediterranean coast as two European regions, or the Rocky Mountains as the American one**: the Lake District, the Swiss Alps and the Amazon differ most in climate, landscape and way of life, which is what the objective asks a child to compare, and the Amazon is the most familiar American region to Year 5.
- **Recorded speech for the chants**: a real voice saying "Jelly on a plate" would teach the words better, but a recording for every line and difficulty would add far more than the offline budget allows. The chant is sung on the synthesised voice instead, and the stones show each syllable as it sounds.
- **A new spoken instruction for Chant along**: Piper isn't available where this was built, and a second recording would add to an offline download that is already over budget. Reusing the shared line's words gives the same spoken instruction for nothing.
