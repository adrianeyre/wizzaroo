# 3D with a retro pixel treatment, not 2D pixel art

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Wizzaroo's look takes its cues from 1980s BBC Micro and Acorn Electron games: chunky pixels, a small bright palette and blocky type. The world is built in 3D (React Three Fiber, glTF models) and rendered at low resolution through a pixelating shader with a limited palette, so it feels 8-bit while staying 3D. The owner chose this knowing that 2D pixel art would be cheaper and more authentic.

## Consequences

3D asset production becomes the largest cost and the main schedule risk, which is why [0009](./0009-cc0-asset-packs-by-default.md) exists. The shader and palette also smooth over differences in style between asset sources.
