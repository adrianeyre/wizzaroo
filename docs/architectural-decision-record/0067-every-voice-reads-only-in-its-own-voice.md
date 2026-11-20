# Every voice reads only in its own voice

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner found that all of Read it to me's voices sounded the same. This amends [ADR 0062](./0062-read-it-to-me-speaks-with-every-piper-voice-on-the-device.md).

## Why they sounded the same

The Piper voices themselves were never the same: run in Chrome, the built worker gives Cori and John different sound for the same sentence. What the owner heard was the device's own speech voice. ADR 0062 had it read in the chosen voice's place until that voice was downloaded, and whenever its download failed. A voice is only downloaded once it has been chosen or has read, so:

- choosing a voice on Settings said its "Hello! I'm …" in the device's voice, every time a voice was tried for the first time, and nothing said it again once the voice had arrived;
- a Read it to me button pressed before the voice had arrived read in the device's voice too.

So every voice the owner tried sounded like the device's one voice.

## What changes

- **A voice the device hasn't got is downloaded first, and then reads.** `readAloud` waits for the download, as it already did on a device with no speech voice. The button says **Stop reading** and shows the download's progress meanwhile, and pressing it stops the wait.
- **The device's own voice reads only when the download fails**, so a question is still read out loud when the voices can't be had, such as on the pen-test deployment.
- **A voice's own sample never falls back.** Settings says each voice's hello with `isDeviceVoiceAllowed: false`, so it is heard in that voice or not at all. If the download fails, Settings says so and offers Try again.
- **Settings folds the voices into an accordion**: one fold for the nine one-speaker voices, and one each for ManyVoice's 16 readers and Clean 100's 245. The fold with the chosen voice starts open and names the chosen voice; the others open when tapped.

## Why no voice could be downloaded

With the device's voice gone, Settings then said **This voice couldn't be downloaded** for every voice. The development server answered every `/voices/` address with a 404, "That voice hasn't been downloaded to the server": ADR 0062 has the server serve only what `pnpm download:voices` has already fetched into `voice-models/`, and nothing had run it, so the folder didn't exist.

- **In development, the server fetches a missing voice the first time a device asks for it** (`streamMissingFile` on the voice route, set only by `src/server/development.ts` through `isFetchingMissingVoices`). It passes the pinned file on to the device as it arrives from Bryce Beattie's bucket, so the device's progress bar fills from the first byte, and writes it to a partial file beside, hashing as it goes. Only a file matching its pinned size and SHA-256 is moved into `voice-models/`; any other is deleted and the device's copy is cut off, so neither keeps it. A second device asking meanwhile waits and is served the kept file, so each file is fetched once. A fresh checkout reads in every voice, downloading only the voices it uses, without the 800 MB `pnpm download:voices` first.
- **Production is unchanged.** The app still has no way out to the internet; the one-shot `voices` service fills the volume, and a voice it hasn't fetched is still a 404, which Settings shows as **This voice couldn't be downloaded**. Check `docker compose logs voices` if a deployment shows it.

## Consequences

- The first time a voice reads, the Child waits for its download (61 to 109 MB) rather than hearing the device's voice straight away. After that it reads at once, offline too.
- A device that can't run Piper at all still reads in its own speech voice, as before.
- In development, a voice's first download runs at the bucket's speed (about 40 seconds for a 61 MB voice here), and its progress shows as it goes.
