# Read it to me speaks with every one of Bryce Beattie's Piper voices, on the device

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for Read it to me's voices to be every voice on Bryce Beattie's page, [brycebeattie.com/files/tts](https://brycebeattie.com/files/tts/). When asked, they chose to replace the ten Speakers of [ADR 0060](./0060-read-it-to-me-reads-questions-and-messages-in-a-chosen-voice.md), which each asked the device for a speech voice, and to list every reader of the page's two many-speaker voices as a voice of its own. This amends ADR 0060.

## The voices

The page has eleven Piper voice models (`src/curriculum/piper-voice-models.ts`):

| Model               | Voices                                              | Size       | Licence                                            |
| ------------------- | --------------------------------------------------- | ---------- | -------------------------------------------------- |
| LJ, LJ (high)       | One each, US English, female                        | 61, 109 MB | Public domain                                      |
| Jenny (Dioco)       | One, Irish English, female                          | 61 MB      | The Jenny dataset's: attribution, similar to CC BY |
| Cori, Cori (high)   | One each, UK English, female                        | 61, 109 MB | Public domain                                      |
| Kristin             | One, US English, female                             | 61 MB      | Public domain                                      |
| John, Bryce, Norman | One each, US English, male                          | 61 MB each | Public domain                                      |
| ManyVoice           | 16 LibriVox readers, 12 US English and 4 UK English | 74 MB      | Public domain                                      |
| Clean 100           | 245 LibriTTS-R readers, US English                  | 74 MB      | CC BY 4.0, the dataset's                           |

That is 270 voices. The page says Clean 100 has 244; its model lists 245 speakers, and every one is offered. Only the one-speaker voices are called female or male, as the page does; the many-speaker voices' readers are real people the page doesn't describe, so they are named as their model names them and not labelled. Cori, the voice of Wizzaroo's own recordings, is the default, in the smaller of her two models.

## How a voice is spoken

- **On the device, with Piper's own models.** A Web Worker (`src/client/voice-over/piper-worker.ts`) turns each sentence into phonemes with eSpeak NG compiled to WebAssembly (the `phonemizer` package), as the voices were trained, and runs the model with ONNX Runtime Web's WebAssembly backend on one thread. It sends the sound back a sentence at a time, and the page plays it with Web Audio, so the first sentence is heard while the next is made (`piper-speech.ts`). A medium voice makes a sentence in about a third of a second on a laptop, a high one in nearly two.
- **Nothing is made up.** The words on the screen are read as they are, through the same `toSpokenWords` and `describeQuestionAloud` as before. ADR 0060's rules about what is never read still hold.
- **The audio context starts from the tap**, as iPhones and iPads need, and the sound follows once the worker has made it.

## How a voice reaches the device

- **Bryce Beattie's bucket sends no CORS headers**, so a browser can't fetch the models from it, and the app's content security policy allows only its own origin anyway. So Wizzaroo serves them from its own origin, at `/voices/<fingerprint>/<file>`, an address with the first 16 characters of the file's SHA-256 in it, cached by the browser for a year. Any other address under `/voices/` is a 404 (`src/server/voices/voice-files.ts`).
- **The server never fetches them itself.** `download-voices` (`pnpm download:voices` in development) fetches every pinned file into `VOICE_MODELS_DIRECTORY` (`voice-models/` by default, ignored by git) and refuses one whose size or SHA-256 doesn't match the pin, writing each to a partial file first. In Compose, a one-shot `voices` service runs it into the `voice-models` volume, on its own `voices-egress` network, and the app mounts that volume read-only and still has no way out but to the mail provider ([pen test I4, #316](../product-requirements-document/pen-testing.md)). A file already there and matching isn't fetched again, so only the first deployment downloads the 800 MB.
- **A device downloads a voice only when it is used**: when it is chosen in Settings, or the first time Read it to me reads in it. Until then, and if the download fails, the device's own speech voice reads instead, as before; a device with no speech voice waits for the download. ([ADR 0067](./0067-every-voice-reads-only-in-its-own-voice.md) changes this: every device waits for the voice, and its own speech voice reads only if the download fails.) A many-speaker model is one download for all its readers.
- **The engine comes with the first voice.** The worker and ONNX Runtime's WebAssembly, about 15 MB (3.7 MB compressed), are built into `piper/` and left out of the offline download, which was already at its 15 MB budget. The service worker keeps them in the `wizzaroo-voices` cache once fetched, beside the voices, and lets go of an old engine when a newer build replaces it. The page lets go of a voice file no voice uses any more.

## Consequences

- **The content security policy's `script-src` adds `'wasm-unsafe-eval'`.** WebAssembly can't be compiled without it. It allows WebAssembly only: JavaScript's `eval` and inline scripts are still refused, and scripts still come from the origin alone. The integration test checks both.
- **Every device sounds the same**, in the voice chosen, which ADR 0060 had to give up.
- **eSpeak NG is GPL-3.0-or-later**, inside the Apache-2.0 phonemizer, and is now shipped to the browser. Wizzaroo is for personal use, and the Credits name it and its licence. Piper's own program is still never shipped; only voices made for it are.
- **Jenny and Clean 100 need attribution**, which the Credits and `src/client/voice-over/voice-licence.md` give.
- **Settings lists 270 voices**, so its picker groups them by model, with each many-speaker model's readers in a box of their own that scrolls ([ADR 0067](./0067-every-voice-reads-only-in-its-own-voice.md) folds the groups into an accordion). The ten Speakers' 3D figures are gone; each voice has a lettered badge.
- **The home server needs about 800 MB more disk** for the volume, and the firewall rule for the `wizzaroo-voices` bridge in the deployment guide.
