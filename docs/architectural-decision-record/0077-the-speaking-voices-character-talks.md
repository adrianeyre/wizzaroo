# The speaking voice's character talks

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Each reading voice has a 3D fantasy character ([ADR 0074](./0074-sixteen-voices-mostly-from-the-uk-each-a-fantasy-character.md)), but only Settings showed it. When a Game said its line or **Read it to me** read a question, the voice came from nowhere. The owner asked for the character's face to appear whenever Wizzaroo plays a voice, in the Games too, with its mouth moving to the words so it looks like it is speaking.

## What changes

- **One face for the whole app.** `SpeakingFace` (`src/client/voice-over/speaking-face.tsx`) is mounted once on the game page and once on the Parent page. When a voice speaks, it shows that voice's character as a portrait in the bottom-left corner, above the bottom row of controls such as Leave Mission and the World Map's dock. It lets taps through and hides a moment after the voice stops, so it doesn't flicker between sentences. Screen readers ignore it: the voice itself is what it adds.
- **The face is whoever is speaking.**
  - **Piper**, for a Game's line, Read it to me and a voice's hello: the chosen voice.
  - **A recorded line**, when the chosen voice isn't on the device yet: Cori, whose voice the recordings are ([ADR 0007](./0007-audio-is-made-before-release.md)).
  - **A phoneme in Listen and Pick**: the chosen voice's character, since a person recorded them, not a voice.
  - **The device's own speech voice**, reading only when the chosen voice couldn't be downloaded: the chosen voice's character.
- **The mouth follows the voice's loudness.** Each speaker tells `speaking-voice.ts` when it starts and stops, and hands over the loudness of what it plays, on its own clock.
  - **Piper:** the loudness comes from the samples of each sentence, at the time the sentence is scheduled on the audio context.
  - **A recording:** it is decoded once, off to the side, and timed by the audio element.
  - **The device's own voice:** it gives no sound to measure, so the mouth moves word by word at about three syllables a second.
  - The Character's mouth (`TalkingMouth` in `character-model.tsx`) opens as wide as the loudness, its jaw dropping, and closes to the Character's own mouth between words.
- **A page that already shows the voice's character lets it talk there.** Settings' stage shows the chosen voice, so its character talks on the stage and no second face appears (`showVoiceOnStage`).

## Consequences

- The face is drawn in a small canvas of its own, made the first time a voice speaks and kept after, so the next line's face appears at once. While no one speaks it draws nothing. While someone does, it draws a head and shoulders at up to twice the screen's pixels, beside the Game's own canvas.
- Nothing about the sound changes. No audio is routed through an analyser: loudness is read from the samples Piper already returns, and a recording is decoded separately to measure it.
- With reduced motion asked for, the face fades in and out rather than popping up. Its mouth still moves, as speaking is the point.
