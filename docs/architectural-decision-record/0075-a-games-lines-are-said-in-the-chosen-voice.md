# A Game's lines are said in the chosen voice

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner found that opening a Game didn't say its first sentence, such as "What would you like to play?" or "How many fish are swimming?", in the voice chosen on Settings. Every Game's fixed lines were recordings made before release, in Cori's voice ([ADR 0007](./0007-audio-is-made-before-release.md)); only **Read it to me** spoke in the chosen voice ([ADR 0062](./0062-read-it-to-me-speaks-with-every-piper-voice-on-the-device.md), [ADR 0074](./0074-sixteen-voices-mostly-from-the-uk-each-a-fantasy-character.md)). So a Child who chose Adrian or Spike still heard Cori whenever a Game spoke by itself. This amends ADR 0007.

## What changes

- **`playVoiceOver` says the line's words in the chosen voice when the device has it.** The words come from `voice-over-lines.json`, the same words the recording says, and are spoken by Piper on the device, as Read it to me is (`readLineInChosenVoice` in `read-aloud.ts`).
- **Otherwise the recording plays, as before**: on a device that can't run Piper, while the chosen voice hasn't arrived yet, or when its download failed. A Game never sits silent waiting for a 60 to 74 MB download.
- **A chosen voice the device hasn't got starts downloading** the first time a Game speaks, so the lines after it are heard in that voice. A voice whose download failed isn't asked for again by every line, so an offline device doesn't keep trying.
- **`waitForVoiceOverToEnd` waits for either**, so a Music cue still plays only after its words have been said.
- **A phoneme is still always its recording**: a pure sound, such as /m/, can't be made by text-to-speech.

## Consequences

- A Child hears one voice throughout once it is on the device, whether a Game speaks by itself or Read it to me is pressed.
- The very first lines a device hears, before the chosen voice arrives, are still Cori's recordings. Choosing a voice on Settings downloads it at once, so a voice chosen there is usually ready before a Game opens.
- The recordings stay: they are the fallback, and `pnpm test` still checks every line has one.
