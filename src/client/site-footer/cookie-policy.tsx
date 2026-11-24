import { readAloudVoiceStorageKey } from "../voice-over/read-aloud-voices.js";

const browserStorage = [
  {
    name: "__Host-wizzaroo_sign_in",
    kind: "Cookie",
    purpose:
      "Keeps a Parent, Teacher or the Admin signed in. HttpOnly, Secure and SameSite=Strict, so the page itself can't read it, and only Wizzaroo's own address can set it.",
    lasts:
      "A Parent's 30 days, or 14 days unused. A Teacher's or the Admin's 7 days, or 12 hours unused. Or until you sign out",
  },
  {
    name: "wizzaroo_pending_sign_in",
    kind: "Cookie",
    purpose:
      "Set only when two-factor authentication is on: links your password to the code you type next. Sent only with sign-in requests.",
    lasts: "5 minutes, or until the code is accepted",
  },
  {
    name: "wizzaroo_family_device",
    kind: "Cookie",
    purpose:
      "Makes this browser a Family Device, so Children can play. Sent only with the game's own requests.",
    lasts:
      "400 days from the device's last use, or until a Parent signs the device out",
  },
  {
    name: "wizzaroo.family-device.playable-family",
    kind: "Local storage",
    purpose:
      "The Family's Characters, their Picture Passwords as hashes, and their limits, so Children can play with no network.",
    lasts: "Until the device is signed out",
  },
  {
    name: "wizzaroo.family-device.play-time",
    kind: "Local storage",
    purpose: "How long each Child has played today, to keep to their limit.",
    lasts: "Until you clear this site's data",
  },
  {
    name: "wizzaroo.family-device.game-time",
    kind: "Local storage",
    purpose:
      "How long each Child has spent in Games today, to open the Wardrobe, Room and Explore once they have played the Games first a Parent set.",
    lasts: "Until you clear this site's data",
  },
  {
    name: "wizzaroo.family-device.unsynced-play",
    kind: "Local storage",
    purpose:
      "Stars and Items earned on this device that the server hasn't counted yet.",
    lasts: "Until the server has counted them",
  },
  {
    name: "wizzaroo.appearance",
    kind: "Local storage",
    purpose:
      "The colour mode and theme chosen in Settings, so every page opens in them.",
    lasts: "Until you clear this site's data",
  },
  {
    name: readAloudVoiceStorageKey,
    kind: "Local storage",
    purpose:
      "The reading voice chosen in Settings, such as Cori or John, that Read it to me reads questions and messages out loud in.",
    lasts: "Until you clear this site's data",
  },
  {
    name: "wizzaroo.popup-positions",
    kind: "Local storage",
    purpose:
      "Where you've dragged each box on the game screens, such as the voyage banner, the help box, the cards from signs and the Your World Map panel, so they open there next time.",
    lasts: "Until you clear this site's data",
  },
  {
    name: "wizzaroo.minimised-groups",
    kind: "Local storage",
    purpose:
      "Which groups of buttons you've minimised on the game screens, such as the Region buttons and the map buttons on the World Map, so the screen opens set up the same way next time.",
    lasts: "Until you clear this site's data",
  },
  {
    name: "wizzaroo-play-event-outbox",
    kind: "IndexedDB",
    purpose: "Play recorded with no network, waiting to be sent.",
    lasts: "Until it has been sent",
  },
  {
    name: "wizzaroo-app-…, wizzaroo-voice-over",
    kind: "Cache storage",
    purpose: "The game and its voice-over, so it opens with no network.",
    lasts: "Until a newer version replaces it",
  },
  {
    name: "wizzaroo-voices",
    kind: "Cache storage",
    purpose:
      "Each Read it to me voice used on this device, and the engine that speaks it, downloaded the first time it reads, so it reads with no network.",
    lasts:
      "Until you clear this site's data; an old engine goes when a newer version replaces it",
  },
  {
    name: "wizzaroo-check-voice-over",
    kind: "Cache storage",
    purpose:
      "The spoken words for a Check's Spelling paper, fetched the first time it is played.",
    lasts: "Until you clear this site's data",
  },
] as const;

export const CookiePolicy = () => (
  <>
    <p className="policy-updated">Last updated: November 2026</p>

    <h3>Strictly necessary only</h3>
    <p>
      Wizzaroo sets three cookies, which sign adults in and let a Family Device
      play. It also keeps what a Family Device needs to play with no network,
      the colour theme and reading voice you choose, where you&apos;ve moved the
      boxes on the game screens, and which groups of buttons you&apos;ve
      minimised, in browser storage. All of them are needed for Wizzaroo to work
      or to remember a choice you made, so none needs your consent. Nothing is
      used for analytics, tracking or advertising, and no other site sets
      anything.
    </p>

    <h3>What is stored</h3>
    <table className="storage-table" role="table">
      <caption>Cookies and browser storage Wizzaroo uses</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">
            Name
          </th>
          <th scope="col" role="columnheader">
            Type
          </th>
          <th scope="col" role="columnheader">
            Purpose
          </th>
          <th scope="col" role="columnheader">
            How long
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {browserStorage.map(({ name, kind, purpose, lasts }) => (
          <tr key={name} role="row">
            <th scope="row" role="rowheader">
              <code>{name}</code>
            </th>
            <td role="cell" data-heading="Type">
              {kind}
            </td>
            <td role="cell" data-heading="Purpose">
              {purpose}
            </td>
            <td role="cell" data-heading="How long">
              {lasts}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <h3>Removing them</h3>
    <p>
      Signing out removes the sign-in cookie, and signing a Family Device out
      removes its Characters. To remove everything else, clear this site&apos;s
      data in your browser; play not yet sent to the server is lost if you do.
    </p>
  </>
);
