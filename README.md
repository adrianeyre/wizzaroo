<h1 align="center">
  <img src="docs/images/readme/cover-band.png" alt="Wizzaroo: Explorer Map, UK National Curriculum, Years 1 to 6" width="100%">
</h1>

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

A 3D learning game for primary-school children, covering the UK National Curriculum for Years 1-6. Children earn Items for their own Character by learning. It is built for one family, runs as an offline-first PWA, and is self-hosted at `wizzaroo.adrianeyre.co.uk`.

Every screen is drawn as a sheet of an explorer's map: the sea is ruled into grid squares, panels are land inside a keyline, and the header is the sheet's cover band, in the colour of the chosen theme. The home page below follows your GitHub theme, light or dark.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/screenshots/home-page.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/images/screenshots/home-page-light.png">
  <img src="docs/images/screenshots/home-page-light.png" alt="The Wizzaroo home page: a map sheet with grid references on its edges, the headline Learning that feels like an adventure, and Meadow Isle on the World Map">
</picture>

![Meadow Isle on the World Map, with a Region for each Subject](docs/images/screenshots/world-map-meadow-isle.jpg)

## What it does

**For Children**

- Play Missions in a pixel-shaded 3D world with a Companion, in every Subject a game can teach: Maths, Phonics, English, Science, Music, Geography, History, Computing, Art and design, Design and technology, and French from Year 3. [Missions](docs/guide/missions.md)
- Open Regions of the World Map by mastering Skills, with Reviews bringing Mastered Skills back. [The World Map](docs/guide/world-map.md)
- Earn Stars to spend on Items, Pets, Mounts and a Room to furnish, and visit siblings' Rooms. [Stars, Items and Rooms](docs/guide/stars-items-and-rooms.md)
- Explore each Island on foot, with 120 Attractions to visit, ride and play with, and solve its Quest to win a 3D Trophy. [The Islands](docs/guide/islands.md) · [Attractions](docs/guide/attractions.md)

**For Parents**

- Add Children and choose their Phonics Programme. [Children](docs/guide/children.md)
- Set each Child's daily time and Subjects. [Parent limits](docs/guide/parent-limits-and-sound.md)
- Follow each Child's Mastery and time on the progress dashboard. [Mastery](docs/guide/mastery.md)
- Make a tablet a Family Device, where Children sign in with a Picture Password, even offline. [Family Devices](docs/guide/family-devices.md)
- Sign in with a password, passkey or two-factor authentication. [Signing in](docs/guide/signing-in.md)

**Under the hood**

- Works offline: Sessions are recorded on the device and synced later. [Sessions and syncing](docs/guide/sessions-and-syncing.md)
- Row-level security keeps each Family's data apart, with nightly encrypted backups. [Keeping data safe](docs/guide/security-and-backups.md)
- A Parent can download or delete their Family's data. [Your Family's data](docs/guide/family-data-and-admin.md)

## Personal use only

Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student, and it is not offered to them. Only use it for yourself. The Schools, Teachers, Parents and Children that the code and these documents describe are its own domain terms, not an invitation for any school, teacher, parent or student to use it.

## Screenshots

### Playing

|                                                                                                                                                                                                                      |                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Who's playing? on a Family Device](docs/images/screenshots/whos-playing.png)                                                                                                                                       | ![A Child tapping their Picture Password](docs/images/screenshots/picture-password.png)                                                                                       |
| **Who's playing?** Each Child taps their own Character on a Family Device…                                                                                                                                           | …then their Picture Password, which works with no network. [Family Devices](docs/guide/family-devices.md)                                                                     |
| ![Frost Isle, the Year 2 Island, on the World Map](docs/images/screenshots/world-map-frost-isle.jpg)                                                                                                                 | ![The Icicle Inlet Region's panel and its Games](docs/images/screenshots/region-panel.jpg)                                                                                    |
| **The World Map.** Six Islands, one per Year Group, each with a Region for every Subject.                                                                                                                            | **A Region** tells its story and lists its Games, which unlock as the Child earns Stars. [The World Map](docs/guide/world-map.md)                                             |
| ![Pop the bubbles: 9 + ? = 20, with four bubbles to choose from](docs/images/screenshots/mission-pop-the-bubbles.jpg)                                                                                                | ![Hooray! You finished the Mission! with the Character and the Stars earned](docs/images/screenshots/mission-finished.jpg)                                                    |
| **A Mission.** Pop the bubble that makes the number sentence true, with a hint after a wrong answer and never a hard fail.                                                                                           | **Finishing** shows off the Character, the Stars earned and how close the Skill is to Mastered. [Missions](docs/guide/missions.md)                                            |
| ![The Wardrobe, with the Character in 3D and the Character Types](docs/images/screenshots/wardrobe.png)                                                                                                              | ![A Child's Room, furnished, with the Bed choices](docs/images/screenshots/room.png)                                                                                          |
| **The Wardrobe.** Features are free; Items, Pets, Mounts, Emotes and Spell Effects cost Stars.                                                                                                                       | **The Room** is furnished with Stars, and Trophies stand on its shelf. [Stars, Items, Rooms and Family play](docs/guide/stars-items-and-rooms.md)                             |
| ![Exploring Frost Isle on foot, with the joystick and camera views](docs/images/screenshots/explore-on-foot.jpg)                                                                                                     | ![The home page on a phone](docs/images/screenshots/home-page-phone.png)                                                                                                      |
| **Exploring on foot.** Walk, swim and climb an Island, collecting treasures.                                                                                                                                         | **The home page**, here on a phone. [The home page, title bar and Settings](docs/guide/home-page-and-settings.md)                                                             |
| ![Ember Isle on the World Map, with its dark rock and lava](docs/images/islands/ember-isle.jpg)                                                                                                                      | ![The hot-air balloon floating over the sea to Meadow Isle](docs/images/transport/balloon.jpg)                                                                                |
| **Six Islands**, each with its own land, Quest, animals, Attractions and Curiosities. [The Islands](docs/guide/islands.md)                                                                                           | **Six ways to travel** between Islands, a Train on every Island and 30 Vehicles to drive. [Trains and transport](docs/guide/transport.md)                                     |
| ![Meadow Isle's east far reach on the World Map, with seven of its own Attractions](docs/images/islands/meadow-isle-far-reach.jpg)                                                                                   | ![Exploring Frost Isle's far reach on foot, beside the Icebreaker Ship](docs/images/islands/frost-isle-far-reach-explore.jpg)                                                 |
| **Far reaches.** Each Island's new lands reach out east and west, with fifteen Attractions of its own, from a swan boat lake to a drop tower. [Attractions](docs/guide/attractions.md#the-new-lands-own-attractions) | **120 Attractions** in all, each with a fact, a ride, a deck or a tune, and a button to press, such as Frost Isle's Icebreaker Ship. [Attractions](docs/guide/attractions.md) |

### For Parents, Teachers and the Admin

|                                                                                                                                                                                 |                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![The Children panel with a tile for each Child and their headline numbers](docs/images/screenshots/parent-dashboard.png)                                                       | ![National Curriculum progress for Year 2, with where to help next](docs/images/screenshots/national-curriculum.png)                                |
| **The Children panel.** A tile for each Child, and the chosen Child's Stars, time, Mastery and right first time.                                                                | **The National Curriculum.** Every Curriculum Point for a Year, and where to help next. [Mastery and the progress dashboard](docs/guide/mastery.md) |
| ![The last 14 days, Mastery of every Skill, Mastery by Subject and right first time charts](docs/images/screenshots/progress-charts.png)                                        | ![The Family Devices panel listing the Kitchen tablet](docs/images/screenshots/family-devices.png)                                                  |
| **Progress charts**, each with its numbers in words and a table as well.                                                                                                        | **Family Devices**, made and signed out by a Parent. [Family Devices](docs/guide/family-devices.md)                                                 |
| ![Settings, with System, Light and Dark and six colour themes](docs/images/screenshots/settings.png)                                                                            | ![Schools on the Admin dashboard](docs/images/screenshots/admin-schools.png)                                                                        |
| **Settings.** Light, dark or the system's choice, and six themes.                                                                                                               | **The Admin dashboard** runs Schools, Teachers, Parents and Deletion Requests. [Signing in](docs/guide/signing-in.md)                               |
| ![The Awards page: a Child's Stars in 3D, the Family Chest in 3D and the Quests by Island](docs/images/screenshots/awards.png)                                                  |                                                                                                                                                     |
| **Awards.** Give a Child 5, 10 or 15 Stars, up to 15 a day, and follow the Family Chest and every Quest. [The Awards page](docs/guide/stars-items-and-rooms.md#the-awards-page) |                                                                                                                                                     |

## Getting started

| Read                                                     | For                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Installing and setting up](docs/installation/README.md) | Everything from a bare computer to a Child playing, step by step, with what you should see |
| [Windows](docs/installation/windows.md)                  | Installing the tools on Windows 10 or 11, with winget and Docker Desktop                   |
| [macOS](docs/installation/macos.md)                      | Installing the tools on macOS, with Homebrew and Docker Desktop                            |
| [Linux](docs/installation/linux.md)                      | Installing the tools on Ubuntu, Debian or Fedora, with Docker Engine                       |
| [Development](docs/guide/development.md)                 | Every `pnpm` script, the tests and the pull-request checks                                 |

In short, with Node 26 or later, pnpm 12.21.0 and Docker installed, and a GitHub token with `read:packages` in `GITHUB_TOKEN` (for the `@adrianeyre/email-client` package):

```bash
pnpm install
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
pnpm seed:owner
pnpm dev
```

Then sign in at <http://localhost:4310/parent/>. Email is sent through the [email platform](https://github.com/adrianeyre/email-platform), run from its own repo: put an API key from it in `.env` as `EMAIL_API_KEY`, and development email lands in its Mailpit at <http://localhost:8025> ([Email](docs/guide/email.md#running-it-locally)).

## How Wizzaroo works

[The guide](docs/guide/README.md) describes every part of Wizzaroo, what it does and where its code lives:

- **Adults:** [Signing in](docs/guide/signing-in.md) · [Email](docs/guide/email.md) · [Children](docs/guide/children.md) · [Family Devices](docs/guide/family-devices.md) · [Your Family's data and the Admin dashboard](docs/guide/family-data-and-admin.md) · [Parent limits and game sound](docs/guide/parent-limits-and-sound.md)
- **Playing:** [Missions](docs/guide/missions.md) · [Mastery and the progress dashboard](docs/guide/mastery.md) · [The World Map](docs/guide/world-map.md) · [Stars, Items, Rooms and Family play](docs/guide/stars-items-and-rooms.md)
- **Under the hood:** [Sessions and syncing](docs/guide/sessions-and-syncing.md) · [Keeping data safe](docs/guide/security-and-backups.md) · [Playing offline and link previews](docs/guide/offline-and-link-previews.md) · [The home page, title bar and Settings](docs/guide/home-page-and-settings.md)
- **In the game:** [The Islands](docs/guide/islands.md) · [Attractions](docs/guide/attractions.md) · [Trains and transport](docs/guide/transport.md) · [Wardrobe Items](docs/guide/wardrobe-items.md) · [The emails](docs/guide/emails.md)
- **Content:** [The curriculum](docs/guide/curriculum.md) · [Voice-over](docs/guide/voice-over.md)

## Where to start

| Read                                                                                               | For                                                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`docs/product-requirements-document/wizzaroo.md`](docs/product-requirements-document/wizzaroo.md) | What Wizzaroo is, who it is for, and the phasing                                |
| [`GLOSSARY.md`](GLOSSARY.md)                                                                       | The words to use (Character, Mission, Activity, Mastery…) and the ones to avoid |
| [`docs/architectural-decision-record/`](docs/architectural-decision-record/)                       | The decisions that are hard to reverse, and why they were made                  |
| [`docs/standards/local.md`](docs/standards/local.md)                                               | The toolchain, layout and deployment this repo uses, and why                    |
| [`docs/guide/`](docs/guide/README.md)                                                              | How each part of Wizzaroo works, one page per part                              |
| [`docs/processes/running-sandcastle.md`](docs/processes/running-sandcastle.md)                     | How a coding agent works an issue in a sandbox                                  |
| [`docs/processes/deploying-to-the-home-server.md`](docs/processes/deploying-to-the-home-server.md) | Starting and updating the production stack on the home server                   |
| [`docs/processes/restoring-a-backup.md`](docs/processes/restoring-a-backup.md)                     | Restoring the database from a nightly backup, and drilling a restore            |
| [`docs/performance-budget.md`](docs/performance-budget.md)                                         | The limits every scene and asset fits, and how the game keeps to 30 fps         |

## The shape, in brief

- TypeScript throughout: React and React Three Fiber in `src/client`, Fastify and Postgres (Drizzle) in `src/server`, curriculum data and generators in `src/curriculum`.
- Devices record events while playing, including offline; the server alone works out Mastery, Stars and the Family Chest.
- Docker Compose on the home server, reached through a Cloudflare Tunnel.
