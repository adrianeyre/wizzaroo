# Sixteen voices, mostly from the UK, each a fantasy character

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Settings offered 270 voices ([ADR 0062](./0062-read-it-to-me-speaks-with-every-piper-voice-on-the-device.md)), folded into an accordion ([ADR 0067](./0067-every-voice-reads-only-in-its-own-voice.md)), each with a lettered badge, and almost all of them American. Wizzaroo is a UK app. The owner asked for at most sixteen voices, in one section, each a unique, high quality, fun 3D fantasy character of a different look and ethnicity, with one US English female and one US English male voice and the rest from the UK and Ireland, and **Adrian**, a UK English male voice, as the default. This amends ADR 0062 and ADR 0067.

## The voices

Bryce Beattie's page has only six UK English voices: Cori in two qualities, and four ManyVoice readers it doesn't name. So eight models are pinned (`src/curriculum/piper-voice-models.ts`): four of Bryce Beattie's, and four of Piper's own en_GB voices from [`rhasspy/piper-voices`](https://huggingface.co/rhasspy/piper-voices) at a pinned revision.

| Voice    | Model                                  | Accent                        |        |
| -------- | -------------------------------------- | ----------------------------- | ------ |
| Adrian   | Piper's Northern English Male          | UK English (Northern England) | Male   |
| Cori     | Bryce Beattie's Cori                   | UK English (Southern England) | Female |
| Alba     | Piper's Alba                           | UK English (Scotland)         | Female |
| Kofi     | Piper's VCTK, reader p243              | UK English (London)           | Male   |
| Seren    | Piper's VCTK, reader p253              | UK English (Wales)            | Female |
| Ravi     | Piper's VCTK, reader p256              | UK English (Birmingham)       | Male   |
| Niamh    | Piper's VCTK, reader p238              | UK English (Northern Ireland) | Female |
| Hamish   | Piper's VCTK, reader p252              | UK English (Edinburgh)        | Male   |
| Arlo     | Piper's VCTK, reader p270              | UK English (Yorkshire)        | Male   |
| Prudence | Piper's SEMAINE, the actor of Prudence | UK English                    | Female |
| Poppy    | Piper's SEMAINE, the actor of Poppy    | UK English                    | Female |
| Spike    | Piper's SEMAINE, the actor of Spike    | UK English                    | Male   |
| Obadiah  | Piper's SEMAINE, the actor of Obadiah  | UK English                    | Male   |
| Jenny    | Bryce Beattie's Jenny                  | Irish English                 | Female |
| Kristin  | Bryce Beattie's Kristin                | US English                    | Female |
| John     | Bryce Beattie's John                   | US English                    | Male   |

Eight are female and eight male. VCTK's readers are known by number and accent only ([its speaker list](https://datashare.ed.ac.uk/handle/10283/3443)), so they are given names of our own; SEMAINE's actors are named after the characters they played. Adrian is a name of our own for the Northern English Male voice. Piper's Alan was left out: its dataset is "All Rights Reserved".

- **The ids of the voices kept, `cori-med`, `jenny`, `kristin` and `john`, don't change**, so a device that chose one keeps it. A device that chose a voice no longer offered reads in Adrian.
- **Each file has its own address** in its pin, `url`, as the voices now come from two places. `download-voices` and the development server's fetch use it; everything else is unchanged.
- **Piper 1.5's voices join vowel pairs.** Alba and VCTK were made with Piper 1.5, whose configs list `vowel_clusters`, such as `["a", "ɪ"]`, that the voice knows as one phoneme, "aɪ". The worker joins them as Piper does (`piper-phonemes.ts`), after splitting eSpeak NG's phonemes into code points under Unicode NFD as Piper does. Their models take the same inputs as the older voices. Each new model was run in Node, through the same phonemes and ONNX Runtime, with no unknown phoneme.

## The characters

Each voice has a 3D fantasy character of its own (`src/client/voice-over/voice-characters.ts`), built from the Wardrobe's Catalogue Items and drawn by the same Character model as a Child's, so no new models or assets were needed: Adrian the Star Wizard, Cori the Fairy Queen, Alba the Dragon Tamer, Kofi the Brave Knight, Seren the Star Archer, Ravi the Storm Ninja, Niamh the Phoenix Guardian, Hamish the Frost Viking, Arlo the Clockwork Tinkerer, Prudence the Moon Sorceress, Poppy the Rainbow Enchanter, Spike the Pirate King, Obadiah the Ancient Alchemist, Jenny the Woodland Druid, Kristin the Cosmic Witch and John the Rock Bard.

- **No two look alike.** Each is a different kind of Character, with their own outfit, hat, pet and spell. Between them they wear every human skin tone the Catalogue has, twice each, and fifteen hairstyles. A test keeps it so.
- **The chosen voice stands on Settings' stage live in 3D**, swaying, turnable by drag or **Turn around**, with their pet and any mount, drawn at up to twice the screen's pixels. Choosing a voice or pressing **Hear** sets them showing off while they say hello.
- **Every card shows its character's portrait**, head and hat, photographed once in the shared studio that draws the Wardrobe's pictures (`item-picture.tsx`), at 192 pixels for a card about 100 wide. One WebGL context draws all sixteen, rather than sixteen canvases.

## Settings

All sixteen voices sit in one section, four to a row, two on a phone. The accordion is gone.

## Consequences

- **The server keeps about 510 MB of voices**, not 800 MB, and the `voices` service fetches from Hugging Face as well as Bryce Beattie's bucket. The firewall rule for its bridge drops only private addresses, so it needs no change.
- **SEMAINE's dataset is CC BY-NC-SA 4.0**: non-commercial, as Wizzaroo is for personal use only. Northern English Male's is CC BY-SA 4.0, and Alba's and VCTK's CC BY 4.0. The Credits and `voice-licence.md` name each.
- **ManyVoice's readers, Clean 100's, LJ, Bryce, Norman and Cori (high) are no longer offered**, and their files are no longer pinned or served.
