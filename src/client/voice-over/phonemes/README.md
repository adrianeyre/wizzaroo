# Recording the 44 phonemes

Each file here is one pure phoneme, `<sound>.wav`, played by `playPhoneme`. A pure phoneme is the sound alone: /m/ is "mmm", not "em" and not "muh". `pnpm test` fails if a recording here isn't named after one of the 44 sounds. Until a sound has its recording, the listen-and-pick games leave it out.

## Recording

1. Use the same microphone, the same quiet, soft-furnished room and the same distance from the microphone, about a hand's width, for all 44. A phone's voice memo app is fine.
2. Say each sound on its own, with a second of quiet before and after. Take several goes and keep only the best one.
3. Hold the long sounds (marked **hold** below) for about half a second. Keep the short sounds (marked **short**) as short as you can, with no "uh" after them: /t/, not "tuh".
4. Save each best take as `<sound>.<extension>` in one folder, such as `~/phoneme-takes/m.m4a` or `~/phoneme-takes/oo-long.wav`. The name is the sound's id below. Any of `.wav`, `.m4a`, `.mp3`, `.aif`, `.aiff`, `.flac` or `.caf` will do.
5. Prepare them:

   ```bash
   brew install ffmpeg
   pnpm prepare:phonemes ~/phoneme-takes
   ```

   This trims each take to 50 ms of quiet either side, turns it into 16 kHz mono and sets it to the voice-over's loudness without clipping. It refuses a take that isn't named after one of the 44 sounds, warns about any longer than 1.5 s, and lists the sounds still to record. Running it again replaces the recordings of the takes in the folder and leaves the others alone.

6. Listen to every recording in `src/client/voice-over/phonemes/` before committing.

## The 44 sounds

### Consonants

| Id            | Say             | As in            |
| ------------- | --------------- | ---------------- |
| `b`           | short           | **b**at          |
| `ch`          | short           | **ch**ip         |
| `d`           | short           | **d**og          |
| `f`           | hold "fff"      | **f**ish         |
| `g`           | short           | **g**o           |
| `h`           | short, a breath | **h**at          |
| `j`           | short           | **j**am          |
| `k`           | short           | **c**at, **k**it |
| `l`           | hold "lll"      | **l**eg          |
| `m`           | hold "mmm"      | **m**an          |
| `n`           | hold "nnn"      | **n**et          |
| `ng`          | hold "ngng"     | ri**ng**         |
| `p`           | short           | **p**an          |
| `r`           | hold "rrr"      | **r**ed          |
| `s`           | hold "sss"      | **s**un          |
| `sh`          | hold "shhh"     | **sh**op         |
| `t`           | short           | **t**ap          |
| `th-unvoiced` | hold, no voice  | **th**in         |
| `th-voiced`   | hold, voiced    | **th**at         |
| `v`           | hold "vvv"      | **v**an          |
| `w`           | short           | **w**et          |
| `y`           | short           | **y**es          |
| `z`           | hold "zzz"      | **z**ip          |
| `zh`          | hold            | trea**s**ure     |

### Vowels

| Id         | Say   | As in                   |
| ---------- | ----- | ----------------------- |
| `a`        | short | **a**nt                 |
| `e`        | short | **e**gg                 |
| `i`        | short | **i**nk                 |
| `o`        | short | **o**n                  |
| `u`        | short | **u**p                  |
| `ai`       | hold  | r**ai**n                |
| `ee`       | hold  | f**ee**t                |
| `igh`      | hold  | n**igh**t               |
| `oa`       | hold  | b**oa**t                |
| `oo-long`  | hold  | m**oo**n                |
| `oo-short` | short | b**oo**k                |
| `ar`       | hold  | f**ar**m                |
| `or`       | hold  | f**or**k                |
| `ur`       | hold  | h**ur**t                |
| `ow`       | hold  | c**ow**                 |
| `oi`       | hold  | c**oi**n                |
| `ear`      | hold  | h**ear**                |
| `air`      | hold  | h**air**                |
| `ure`      | hold  | s**ure**                |
| `schwa`    | short | the "uh" in teach**er** |

Who made the recordings, and on what terms, is in [`phoneme-licence.md`](phoneme-licence.md).
