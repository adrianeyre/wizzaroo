# A lab question shows the thing it asks about

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner played Habitat Homes, which asks which habitat each animal lives in, and every animal was a 3D tree. A lab game ([ADR 0039](./0039-the-whole-national-curriculum-through-lab-games.md)) had one `prop`, turned on the turntable for every question, so "A jellyfish" showed the Game's tree. Across the 325 lab games, many props showed the wrong thing for most questions, and some showed an answer. This amends ADR 0039.

## What changes

- **A question may name a `model`**: the one thing it asks about, such as `"model": "jellyfish"`. The turntable shows it in place of the Game's `prop`, which still shows for a question that names none, such as a sum or a grammar point.
- **A model is one of the props or a lab item.** The items are listed in `src/curriculum/lab-items.ts`, and the curriculum refuses a model it doesn't know.
- **A model never shows the answer or a choice.** "Which of these is a mammal?" names none; "What does a caterpillar turn into?" shows the caterpillar, never the butterfly.
- **An item is built from coloured parts** (`src/client/lab-items/`), merged into one mesh, plus one translucent mesh for glass, a jellyfish's bell or water. This is the way History's props are built. Each item is fitted to the turntable's size and turned to a three-quarter view as it grows.
- **An item draws at most 1,700 triangles**, which is what the busiest station, odd-one-out, leaves of the lab's 9,900. So any item fits any station. The sort station's trays now have one bevel segment instead of two, which gives the item 1,500 more triangles there.

## Consequences

- A Child sorting animals, materials, foods or tools sees each one as it is asked about.
- A Game's `prop` is now its decoration for questions without a model. Each was checked against its Game's questions, and props that showed an answer or a different topic were changed.
- Adding an item takes a key in `lab-items.ts` and a builder in `src/client/lab-items/`. The builder's type makes a missing model fail to compile, and `pnpm test` checks every item against its budget and every question's item at its Game's station.
