# Playing offline and link previews

[← Back to the README](../../README.md) · [All guides](README.md)

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

## Installing and playing offline

Wizzaroo is an installable web app, described by `src/client/public/manifest.webmanifest`. The first time a browser opens it, a service worker (`src/client/offline/service-worker.ts`) keeps every file of the built client in the browser's cache, so from then on it opens with no network, even while the home server or the tunnel is down. The API and `/health` always go to the server. The build lists everything Vite wrote to `dist/client`, hashes it, and writes `service-worker.js` with the list and the hash inside, so every release is a new service worker. It leaves out the Spelling paper's spoken words in `check-voice-over/` and the home page's pictures in `home/`, which a browser fetches only when it needs them. Which requests the cache answers is decided in `src/client/offline/caching-rules.ts`.

A new release never reloads a page that is in use. Each time a page opens, it looks for a new version, which downloads in the background and waits. The next time a page opens, it switches to the waiting version with one quick reload, before a Child has started anything.

Every page asks the browser to keep its stored data (`navigator.storage.persist`). The Parent page's **This device** panel says whether Wizzaroo is installed and whether the browser agreed, whether or not the Parent is signed in. On an iPhone or iPad that hasn't installed it, the panel shows the steps to add it to the Home Screen, because Safari deletes a website's stored data after 7 days without a visit unless it is installed. The copy on the Home Screen keeps its own storage, so the Parent signs in again there.

Browsers only run a service worker on HTTPS or `localhost`, so a device on the LAN reaching `http://<server>:4310` gets no offline play; use `wizzaroo.adrianeyre.co.uk` through the tunnel.

## Search and link previews

Both pages carry a description, a canonical URL, Open Graph and Twitter Card tags, so a link pasted into Messages, WhatsApp, Slack or social media shows the title, description and `og-image.png`, a 1200×630 pixel-art card. The game page also carries schema.org `WebApplication` data and, for anything that doesn't run JavaScript, a short description in `<noscript>`. The Parent page is `noindex`: it still previews when shared, but search engines leave it out. `robots.txt` keeps crawlers off `/api/` and points at `sitemap.xml`, which lists the game page. The tags use the production address, so a link to `localhost` previews as the live site.

| Icon                             | For                                             |
| -------------------------------- | ----------------------------------------------- |
| `favicon.svg`                    | Browser tabs, sharp at any size                 |
| `favicon.ico` (16, 32 and 48 px) | Browsers and tools that ask for `/favicon.ico`  |
| `apple-touch-icon.png`           | The iPhone and iPad Home Screen                 |
| `icon-192.png`, `icon-512.png`   | The installed app on Android, Windows and macOS |
| `icon-maskable-512.png`          | Android's adaptive icon shapes                  |

Every icon is the same 32×32 pixel crystal; `favicon.svg` is it drawn as vectors.
