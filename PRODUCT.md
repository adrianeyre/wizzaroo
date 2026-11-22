# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Children, Years 1-6 (ages 5-11)**, first the owner's two Children (Year 1 and Year 2). They play on a Family Device such as a shared tablet, often unable to read fluently yet, signing in by tapping their Character and a Picture Password. On shared screens (home page, Settings, title bar) Children come first and adults adapt to a child-friendly world.
- **Parents** add Children, set limits and Subjects, follow Mastery and give Stars, mostly on a laptop or phone.
- **Teachers** follow the Children in their Year Groups at one School; the **Admin** runs Schools, Teachers, Parents and Deletion Requests.

## Product Purpose

A 3D learning game that teaches the UK National Curriculum (England) for Years 1-6, so that learning is how a Child progresses in a world they want to return to. Success is Children choosing to come back and Mastering Skills, while Parents see exactly how they are getting on.

## Positioning

Every Subject a game can teach, mapped to statutory statements, played inside a 3D world of six Islands (one per Year Group) with a Character the Child owns and dresses with Stars earned from effort. It is self-hosted for one family, works offline on a Family Device, and refuses engagement nudges.

## Operating Context

- An offline-first PWA at `wizzaroo.adrianeyre.co.uk`, self-hosted behind a Cloudflare Tunnel. Sessions are recorded on the device and synced later.
- Two entry points: the game (`src/client/index.html`) and the adult pages (`src/client/parent/index.html`), built with React; the 3D world uses React Three Fiber.
- Read it to me reads questions and messages aloud in a chosen voice for Children who cannot yet read them.

## Capabilities and Constraints

- Terminology is fixed by `GLOSSARY.md` (Character, Mission, Activity, Mastery, Stars, Items, Region, Island…); capitalised terms are used as written.
- Settings offers System, Light or Dark and six colour themes (Sky, Grape, Forest, Sunset, Berry, Lagoon), stored per device.
- The 3D world keeps its own pixel-shaded palette regardless of UI theme (ADR 0003, 0011-0014); this redesign covers the HTML UI only, not the 3D rendering.
- Puzzles and Checks are accessible HTML boards over a themed backdrop (ADR 0017).
- Performance budget: scenes keep to 30 fps on the family tablet (`docs/performance-budget.md`).

## Brand Commitments

- Name: Wizzaroo. Voice: plain British English, warm and literal, no hype.
- "Personal use only" notice stays wherever it appears today.
- No visual commitments were pinned for the redesign; the current look is open to replacement.

## Evidence on Hand

- Screenshots and renders in `docs/images/` (screenshots, islands, transport, attractions, wardrobe, emails, installation).
- Real curriculum data in `src/curriculum`. No testimonials, users beyond the family, or metrics exist; none may be invented.

## Product Principles

1. Children first: a Year 1 Child who cannot read yet must still find their way.
2. Rewards delight without nudging: no streaks, expiring rewards or leaderboards (ADR 0010).
3. Effort, not time: Stars come from learning, never from staying longer.
4. Parents get the truth: progress is shown plainly, with numbers in words and tables beside charts.
5. Works anywhere in the house, online or not.

## Accessibility & Inclusion

Every theme pairing meets WCAG AA contrast in light and dark. Targets suit small hands on a tablet. Charts carry their numbers in words and a table. Content for pre-readers is reachable through Read it to me.
