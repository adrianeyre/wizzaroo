# Curriculum and written content are files in the repo, not a content management system

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Skills, spelling lists, phonics sets, grammar content, and approved AI-drafted reading passages and word problems are all versioned data files in this repo. Reviewing content means merging a pull request. The content ships with the PWA and is cached for offline play. Postgres holds only Family data and events. The owner is both the Parent who approves content and the developer, so building an Admin content editor would be work with no payoff.

Skill IDs carry no Year Group (`maths.number-bonds-10`, not `maths.y1.number-bonds-10`). Year Group is a field on the Skill, and an ID never changes once published, so moving a Skill to another year when the curriculum changes never breaks the events that refer to it.

Phonics Programmes are files too. Each holds the order a programme teaches sounds in and the words it uses for them, and a Parent chooses one per Child. Every programme on the DfE's validated list is supported, added one at a time. A programme's sound order and terms are followed, but its branded mnemonics, characters, images and songs belong to its publisher and are never copied: Wizzaroo's own art, rhymes and phoneme recordings are shared across all programmes.

## Considered Options

- **Postgres tables behind an Admin content editor.** Rejected for now. Worth revisiting if anyone other than a developer has to approve content.
