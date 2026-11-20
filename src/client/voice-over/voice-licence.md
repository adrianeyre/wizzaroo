# The voice behind the voice-over

Every `.wav` file in this folder is made by `pnpm generate:voice-over`, which runs [Piper](https://github.com/OHF-Voice/piper1-gpl) with the voice below. Nothing is spoken while a Child plays.

| What                                                                                                               | Source                                                                                                                                                                                                                                                                                       | Licence                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The voice, `en_GB-cori-high`: Cori, a UK English female voice, high quality, trained from scratch by Bryce Beattie | [`rhasspy/piper-voices` at revision `6b9cfaacb4fb2e02a9621227e3c1a48bec9710c3`](https://huggingface.co/rhasspy/piper-voices/tree/6b9cfaacb4fb2e02a9621227e3c1a48bec9710c3/en/en_GB/cori/high), and the trainer's own page, [brycebeattie.com/files/tts](https://brycebeattie.com/files/tts/) | Public domain, as both the voice's model card and its trainer state                            |
| The recordings the voice was trained on: about 24 hours of audiobooks gathered by the trainer                      | [LibriVox](https://librivox.org)                                                                                                                                                                                                                                                             | Public domain                                                                                  |
| The `rhasspy/piper-voices` repository the voice is downloaded from                                                 | [huggingface.co/rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)                                                                                                                                                                                                           | MIT                                                                                            |
| Piper itself, `piper-tts`                                                                                          | [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl)                                                                                                                                                                                                                              | GPL-3.0. It runs on a developer's machine to make the files and is never shipped with Wizzaroo |

The voice's model card at that revision reads:

> - Language: en_GB (English, Great Britain)
> - Speakers: 1
> - Quality: high
> - Samplerate: 22,050Hz
>
> Dataset
>
> - URL: https://librivox.org
> - License: public domain

## Read it to me's voices

Read it to me speaks with every voice on [Bryce Beattie's page](https://brycebeattie.com/files/tts/), on the device, from the model files pinned in [`src/curriculum/piper-voice-models.ts`](../../curriculum/piper-voice-models.ts) ([ADR 0062](../../../docs/architectural-decision-record/0062-read-it-to-me-speaks-with-every-piper-voice-on-the-device.md)). The page says of them all: "Feel free to use these for any legal and ethical purpose", and lets them be hosted elsewhere.

| Voice                                                                                                          | What it was trained on                                                                 | Licence                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| LJ (`lj-med.onnx`), LJ (high) (`ljspeech.onnx`)                                                                | The LJSpeech dataset, from LibriVox                                                    | Public domain                                                                                                                |
| Jenny (`jenny.onnx`)                                                                                           | The [Jenny (Dioco) dataset](https://www.kaggle.com/datasets/noml4u/jenny-tts-dataset)  | The dataset's: attribution required, similar to CC BY. The trainer imposes nothing further. Credited in the footer's Credits |
| Cori (`cori-med.onnx`), Cori (high) (`cori-high.onnx`), Kristin, John (fine-tuned from Kristin), Bryce, Norman | LibriVox recordings, and the trainer's own for Bryce                                   | Public domain                                                                                                                |
| ManyVoice (`mv2.onnx`), 16 readers                                                                             | LibriVox recordings                                                                    | Public domain                                                                                                                |
| Clean 100 (`clean100.onnx`), 245 readers                                                                       | The clean 100-hour set of [LibriTTS-R](https://www.openslr.org/141/), from LibriSpeech | CC BY 4.0, the dataset's. The trainer imposes nothing further. Credited in the footer's Credits                              |

The engine that speaks them in the browser is [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) (MIT) and [Phonemizer.js](https://github.com/xenova/phonemizer.js) (Apache-2.0), which carries [eSpeak NG](https://github.com/espeak-ng/espeak-ng) (GPL-3.0-or-later).

Changing a voice means changing this file in the same commit, with the new voice's source and licence.
