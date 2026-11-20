# Read it to me reads questions and messages out loud, in a voice the Child chooses

> **Amended by [ADR 0062](./0062-read-it-to-me-speaks-with-every-piper-voice-on-the-device.md):** the ten Speakers and the device's speech voices gave way to every one of Bryce Beattie's Piper voices, spoken on the device. What is and isn't read is unchanged.

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for a button on every Game that reads its question out loud for a Child, so that a Child who can't read it yet can still play. Then the same for the sensible messages across the whole site, including what an Islander says when exploring, and a choice of ten voices on the Settings page, five female and five male, each shown as a 3D person with their name. One of the male voices is Adrian, drawn bald with a goatee, light skin and a blue hoodie. One of the female voices is Helen.

This amends [ADR 0007](./0007-audio-is-made-before-release.md), which says nothing is spoken by the browser during child play.

## Why ADR 0007 is amended

The recorded voice-over covers fixed lines, such as "Pop the bubble that makes ten with this number". A question is built while the Child plays, with its own numbers and words, such as "37 + ? = 52", and a message names the Child's Character, the Stars they earned or the Find an Islander wants. These can't all be recorded before release, and ten voices of them even less. So the owner chose, when asked, to let the device's own speech voice read them, only when the Child presses **Read it to me**.

What ADR 0007 still holds:

- **Everything Wizzaroo says by itself is still recorded.** The instruction at the start of a Mission, the hints and well-dones, and the phonemes are the Piper and owner recordings they always were.
- **A pure phoneme is never spoken by the device.** A listen-and-pick sound has no words to read; its button plays its recording.
- **What a Child is being asked to read is never read to them.** A Phonics Game's word, the Phonics Screening Check's words, a story they answer questions about and the Reading paper's text stay unread; a spelling word plays its own recording. Only the question about them is read.
- **No AI.** The device's speech voice turns the words on the screen into sound; nothing is made up.
- **ESLint still rejects browser speech everywhere but one module**, `src/client/voice-over/read-aloud.ts`, which every Read it to me button goes through.
- **With no speech voice**, Read it to me in a Mission plays the recorded line instead, and elsewhere isn't shown.

## How it reads

- **A question is put into words** by `describeQuestionAloud` (`src/client/mission/mission-text.ts`) for every Mission prompt, and `toSpokenWords` (`src/client/voice-over/spoken-words.ts`) reads its symbols as they are said: "37 plus what equals 52", "three quarters", "minus 6 degrees Celsius", a gap as "blank".
- **A message is read from its section.** A button with `readsSection` reads the headings, paragraphs and list items of its nearest dialog, `section`, `article` or `data-read-aloud-section`, leaving out buttons, form fields, tables, pictures and anything hidden from a screen reader (`src/client/voice-over/section-words.ts`). Every `MovablePopup` and `ModalDialog` has one, so every card when exploring, talking to an Islander or a friend, every help box, voyage and the rucksack, Awards and Family Chest read themselves out. So do the Region panel, a Mission's feedback and celebration, the Big Top's and Challenge Arena's messages, Who's playing and the first-open screens, the home page's sections, Settings, and the Parent pages' email, invite, password and passkey messages.
- **Not everything.** Buttons say what they do already, and dashboards' tables and charts have their numbers in words; reading a whole dashboard out would not help.

## The ten voices

- **Who they are** is data in `src/client/voice-over/read-aloud-voices.ts`: Helen, Priya, Amara, Isla and Mei, and Adrian, Oliver, Kwame, Arjun and Finn. Each has a pitch, a speed, the accents they ask for and a Character loadout from the catalogue, so they are drawn with the same 3D Character model as a Child's own. Adrian's blue hoodie is a new `hoodie` outfit, also sold in the Wardrobe.
- **Each device has different voices**, so each Speaker asks for one: their own kind (female or male, told by the voice's name), then their accent, then one that works with no network. Speakers who would share the best voice take the next one in turn, so two British Speakers sound different on a device with several voices, and the pitch and speed differ even on a device with only one.
- **The choice is kept in `localStorage`** on that device, like the colour theme, and choosing one says hello in it. Settings shows the chosen Speaker turning on a plinth, with their name; the 3D stage is loaded only when Settings opens, so the Parent pages don't load three.js until then.

## Consequences

- It sounds different on every device, which ADR 0007 warned of; the recorded lines still sound the same everywhere.
- A Child can play every Game without being able to read its question yet.
