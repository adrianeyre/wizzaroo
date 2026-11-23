import { NewTabLink } from "./new-tab-link.js";
import { repositoryUrl } from "./links.js";

export interface Credit {
  name: string;
  what: string;
  licence: string;
  href: string;
}

/** Who made Wizzaroo, first, then everything it is built with and ships. */
export const creator: Credit = {
  name: "Adrian Eyre",
  what: "Created, designed and built Wizzaroo: the game, its Islands, Missions and 3D models, and the phoneme recordings",
  licence: "© Adrian Eyre",
  href: repositoryUrl,
};

export const soundCredits: readonly Credit[] = [
  {
    name: "Cori (en_GB-cori-high), by Bryce Beattie",
    what: "The UK English voice behind the recorded voice-over, trained on LibriVox audiobooks",
    licence: "Public domain",
    href: "https://brycebeattie.com/files/tts/",
  },
  {
    name: "Piper",
    what: "The text-to-speech engine that recorded the voice-over before release, and whose voices Read it to me speaks with",
    licence:
      "GPL-3.0; its program isn't shipped with Wizzaroo, only voices made for it",
    href: "https://github.com/OHF-Voice/piper1-gpl",
  },
  {
    name: "LibriVox",
    what: "The public domain audiobooks the voices were trained on",
    licence: "Public domain",
    href: "https://librivox.org",
  },
  {
    name: "Read it to me's voices, by Bryce Beattie",
    what: "Cori, Kristin and John, three of the voices a Child can choose",
    licence: "Public domain",
    href: "https://brycebeattie.com/files/tts/",
  },
  {
    name: "Jenny (Dioco), voice trained by Bryce Beattie from the Jenny dataset by Dioco",
    what: "The Irish English voice Jenny, which Read it to me can read in",
    licence:
      "The Jenny dataset's own licence: attribution required, similar to CC BY",
    href: "https://www.kaggle.com/datasets/noml4u/jenny-tts-dataset",
  },
  {
    name: "Northern English Male, a Piper voice from OpenSLR 83's UK and Ireland English",
    what: "Adrian, the voice Read it to me reads in unless another is chosen",
    licence: "CC BY-SA 4.0",
    href: "https://www.openslr.org/83/",
  },
  {
    name: "Alba, a Piper voice from the University of Edinburgh's Alba Scottish English corpus",
    what: "The Scottish English voice Alba",
    licence: "CC BY 4.0",
    href: "https://datashare.ed.ac.uk/handle/10283/3270",
  },
  {
    name: "VCTK, a Piper voice from the CSTR VCTK corpus, University of Edinburgh",
    what: "Kofi, Seren, Ravi, Niamh, Hamish and Arlo, six readers from around the UK",
    licence: "CC BY 4.0",
    href: "https://datashare.ed.ac.uk/handle/10283/3443",
  },
  {
    name: "SEMAINE, a Piper voice from the SEMAINE database's actors",
    what: "Prudence, Poppy, Spike and Obadiah",
    licence: "CC BY-NC-SA 4.0",
    href: "https://github.com/marytts/dfki-semaine-data",
  },
  {
    name: "Piper's own voices, rhasspy/piper-voices",
    what: "Where the Northern English Male, Alba, VCTK and SEMAINE voices are published",
    licence: "Each its dataset's, as above",
    href: "https://huggingface.co/rhasspy/piper-voices",
  },
  {
    name: "ONNX Runtime Web, by Microsoft",
    what: "Runs a Piper voice on the device for Read it to me",
    licence: "MIT",
    href: "https://github.com/microsoft/onnxruntime",
  },
  {
    name: "Phonemizer.js, by Xenova, with eSpeak NG",
    what: "Turns words into the sounds a Piper voice speaks",
    licence: "Apache-2.0; eSpeak NG inside it is GPL-3.0-or-later",
    href: "https://github.com/xenova/phonemizer.js",
  },
];

export const fontCredits: readonly Credit[] = [
  {
    name: "Baloo 2, by Ek Type",
    what: "The headings font, from Fontsource",
    licence: "SIL Open Font License 1.1",
    href: "https://fontsource.org/fonts/baloo-2",
  },
  {
    name: "Nunito, by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan",
    what: "The body text font, from Fontsource",
    licence: "SIL Open Font License 1.1",
    href: "https://fontsource.org/fonts/nunito",
  },
];

export const softwareCredits: readonly Credit[] = [
  {
    name: "React and React DOM",
    what: "The user interface",
    licence: "MIT",
    href: "https://react.dev",
  },
  {
    name: "three.js",
    what: "Every 3D scene, model and picture",
    licence: "MIT",
    href: "https://threejs.org",
  },
  {
    name: "React Three Fiber, by Poimandres",
    what: "Draws the 3D scenes with React",
    licence: "MIT",
    href: "https://github.com/pmndrs/react-three-fiber",
  },
  {
    name: "Fastify, @fastify/static and @fastify/cookie",
    what: "The server",
    licence: "MIT",
    href: "https://fastify.dev",
  },
  {
    name: "Drizzle ORM",
    what: "Talks to the database",
    licence: "Apache-2.0",
    href: "https://orm.drizzle.team",
  },
  {
    name: "node-postgres (pg)",
    what: "Connects to PostgreSQL",
    licence: "MIT",
    href: "https://node-postgres.com",
  },
  {
    name: "PostgreSQL",
    what: "The database",
    licence: "PostgreSQL Licence",
    href: "https://www.postgresql.org",
  },
  {
    name: "Nodemailer",
    what: "Checks email addresses",
    licence: "MIT-0",
    href: "https://nodemailer.com",
  },
  {
    name: "@node-rs/argon2",
    what: "Hashes passwords",
    licence: "MIT",
    href: "https://github.com/napi-rs/node-rs",
  },
  {
    name: "SimpleWebAuthn",
    what: "Passkeys",
    licence: "MIT",
    href: "https://simplewebauthn.dev",
  },
  {
    name: "uqr",
    what: "Draws the QR codes",
    licence: "MIT",
    href: "https://github.com/unjs/uqr",
  },
  {
    name: "Vite, TypeScript, Vitest, ESLint and Prettier",
    what: "Build, check and test Wizzaroo; not shipped with it",
    licence: "MIT and Apache-2.0",
    href: "https://vite.dev",
  },
];

const CreditList = ({
  credits,
  label,
}: {
  credits: readonly Credit[];
  label: string;
}) => (
  <ul className="credits-list" aria-label={label}>
    {credits.map((credit) => (
      <li key={credit.name}>
        <NewTabLink href={credit.href}>{credit.name}</NewTabLink>
        <span className="credits-what">{credit.what}</span>
        <span className="credits-licence">Licence: {credit.licence}</span>
      </li>
    ))}
  </ul>
);

export const Credits = () => (
  <>
    <h3>Created by</h3>
    <CreditList credits={[creator]} label="Created by" />
    <h3>Voice and sound</h3>
    <CreditList credits={soundCredits} label="Voice and sound" />
    <h3>Fonts</h3>
    <CreditList credits={fontCredits} label="Fonts" />
    <h3>Software</h3>
    <CreditList credits={softwareCredits} label="Software" />
    <p>
      Thank you to everyone who made these. Every Island, Mission, Character and
      3D model is Wizzaroo&apos;s own, built in code.
    </p>
  </>
);
