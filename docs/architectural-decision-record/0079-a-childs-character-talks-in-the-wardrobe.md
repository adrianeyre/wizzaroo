# A Child's Character talks in the Wardrobe

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for a **Talk** button on the Wardrobe: a speech bubble on the top-right corner of the Character's stage, hanging outside its box. Pressing it opens a box where the Child types words, chooses a voice from the same 3D voice characters as Settings, and presses **Say**. The box closes and the Child's own Character says the words, its mouth moving with them.

## What changes

- **The Talk bubble** (`TalkButton` in `src/client/character/wardrobe-talk.tsx`) is pinned to the stage's top-right corner through `CharacterPreview`'s `stageAction`, and hangs half outside it, its tail pointing down to the Character. Its sound waves rise and fall while the Character talks, and stay still with reduced motion asked for. It isn't shown on a device that can't speak at all.
- **The Talk box** is a `ModalDialog`, opened with the words box focused. It has:
  - every voice's character, each a portrait card shared with Settings (`VoiceChoice` in `src/client/voice-over/voice-choice.tsx`), in one row that scrolls sideways so **Say** stays in reach. The chosen voice is scrolled into sight;
  - the words box, up to 200 letters, with a count of them;
  - three ideas to fill it with in one tap, for a Child who can't type much yet;
  - **Say**, which Enter presses too (Shift and Enter starts a new line).
- **The Character's voice is the Child's own pick.** It starts as the Settings reading voice, and once chosen is kept in `localStorage` for that Child on that device. Choosing it here doesn't change who reads questions and messages.
- **The words are said through Read it to me** (`readAloud`), so every voice is downloaded before it speaks and the device's own voice is used only if that fails, as [ADR 0067](./0067-every-voice-reads-only-in-its-own-voice.md) and [ADR 0062](./0062-read-it-to-me-speaks-with-every-piper-voice-on-the-device.md) set out. It starts straight from the tap on **Say**, as iPhones and iPads need.
- **The Character talks on its own stage.** While it speaks, the voice is put on the stage (`showVoiceOnStage`, [ADR 0077](./0077-the-speaking-voices-character-talks.md)), so the voice's own face doesn't pop up in the corner as well, and the stage's Character's mouth follows the voice's loudness. It is taken off the stage once the words end, another voice cuts in, or the Wardrobe closes, which also stops the words.

## Consequences

- What a Child types is turned into sound on the device and goes nowhere else: nothing is sent or kept but the chosen voice's name.
- A voice not yet on the device downloads first, so the first words in a new voice can take a moment.
