import type { ReactNode } from "react";
import {
  subjectNames,
  subjects,
  type Subject,
} from "../../curriculum/subjects.js";
import {
  findIsland,
  worldMap,
  type Region,
} from "../../curriculum/world-map.js";
import {
  BigTopIcon,
  CheckIcon,
  ChildrenIcon,
  FamilyDevicesIcon,
  LockIcon,
  MapIcon,
  ParentsIcon,
  regionLandmarkIcons,
  StarIcon,
  ThisDeviceIcon,
} from "../site-header/icons.js";
import {
  HeroStage,
  ItemsPicture,
  PicturePasswordPicture,
  ProgressPicture,
  RegionPanelPicture,
} from "./home-pictures.js";
import { ReadAloudButton } from "../read-aloud-button.js";

const subjectLessons: Record<Subject, string> = {
  maths:
    "Counting, place value, adding, taking away, times tables, fractions, measures, time, shapes and charts.",
  phonics:
    "All 44 sounds of English, in the same order and words as your Child's school, then blending them to read.",
  english:
    "Spelling, grammar and punctuation, from capital letters and full stops to joining words and sentences.",
  science:
    "Running experiments on light, forces, magnets and circuits, and sorting animals, habitats and materials.",
  music:
    "Keeping the beat, hearing high and low, loud and quiet, reading notes, and how instruments make their sound.",
  geography:
    "Continents and capitals, compass points and grid references, climates, coasts and the four nations of the UK.",
  history:
    "Travelling back in time, from the Stone Age and Ancient Egypt to Roman Britain, the castles of long ago and the Blitz.",
  computing:
    "Writing programs, squashing bugs, sending messages and keeping safe and kind online.",
  art: "Line, colour, texture and pattern, drawing and printmaking, and the great artists, architects and designers.",
  design:
    "Designing for a purpose, choosing materials, tools and mechanisms, simple circuits and cooking healthy food.",
  languages:
    "French from Year 3: greetings, numbers, colours, family and places, then questions, opinions and a story to read.",
};

interface TaughtSubject {
  subject: Subject;
  region: Region;
  firstYearGroup: number;
}

const findTaughtSubjects = (): TaughtSubject[] =>
  subjects.flatMap((subject) => {
    const region = worldMap.regions.find(
      (candidate) => candidate.subject === subject,
    );
    const island =
      region === undefined ? undefined : findIsland(region.islandId);
    return region === undefined || island === undefined
      ? []
      : [{ subject, region, firstYearGroup: island.yearGroup }];
  });

const taughtSubjects = findTaughtSubjects();

const firstIslandName = worldMap.islands.at(0)?.name ?? "";
const lastIslandName = worldMap.islands.at(-1)?.name ?? "";

interface Fact {
  title: string;
  description: string;
  icon: ReactNode;
}

const facts: Fact[] = [
  {
    title: "For Years 1 to 6",
    description:
      "Children aged about 5 to 11, at Key Stages 1 and 2. Each starts on the Island for their own Year, and you can open the ones above.",
    icon: <ChildrenIcon />,
  },
  {
    title: "Never a hard fail",
    description:
      "Short Missions of three Activities. A wrong answer brings a spoken hint and another go, so every Question ends with the right answer.",
    icon: <StarIcon />,
  },
  {
    title: "Learning that sticks",
    description:
      "A Skill counts as Mastered after good days spread apart, then comes back later as a Review, so it isn't forgotten.",
    icon: <CheckIcon />,
  },
  {
    title: "Islands to explore on foot",
    description:
      "Walk, swim and climb each Island, find hidden treasures and read the fact signs along the trails.",
    icon: <MapIcon />,
  },
  {
    title: "Fun with the whole Family",
    description:
      "Visit a brother's or sister's Room, send them Gifts, and fill the Family Chest together for an Item each.",
    icon: <ParentsIcon />,
  },
  {
    title: "You set the limits",
    description:
      "Choose each Child's daily time and which Subjects they play. Every Family Device keeps to them, even offline.",
    icon: <FamilyDevicesIcon />,
  },
  {
    title: "Plays with no network",
    description:
      "Install it on a tablet and it keeps working in the car or on holiday, then syncs their progress once it's back online.",
    icon: <ThisDeviceIcon />,
  },
  {
    title: "Private by design",
    description:
      "Only a first name or nickname and a birth month, never a surname, birthday or photo. Download everything, or ask for it to be deleted, at any time.",
    icon: <LockIcon />,
  },
];

const steps = [
  {
    title: "Sign in as a Parent",
    description:
      "Add each Child with a nickname, their Year Group and a Picture Password.",
  },
  {
    title: "Make a Family Device",
    description:
      "Turn the tablet or computer they play on into a Family Device in one tap.",
  },
  {
    title: "Let the adventure begin",
    description:
      "Each Child taps their pictures, opens their World Map and starts a Mission.",
  },
];

const listSubjectNames = (): string => {
  const names = taughtSubjects.map(({ subject }) => subjectNames[subject]);
  const lastName = names.pop();
  return names.length === 0
    ? (lastName ?? "")
    : `${names.join(", ")}, and ${lastName ?? ""}`;
};

export const HomePage = () => (
  <main className="home">
    <div className="home-hero">
      <div className="home-hero-text" data-read-aloud-section>
        <p className="home-eyebrow">UK National Curriculum · Years 1 to 6</p>
        <h1 id="home-hero-heading">
          Learning that feels like an <span>adventure</span>
        </h1>
        <p className="home-lead">
          Wizzaroo is a 3D adventure world where Children learn{" "}
          {listSubjectNames()} in short Missions, and earn Stars for a Character
          of their own, while you see exactly how they&apos;re getting on.
        </p>
        <ReadAloudButton
          className="read-aloud is-small"
          readsSection
          describedBy="home-hero-heading"
        />
        <div className="home-actions">
          <a className="button-link" href="/parent/">
            Get started as a Parent
          </a>
          <a className="button-link secondary" href="#how-it-works">
            See how it works
          </a>
        </div>
        <p className="home-note">
          Another adult joins your Family from an Invite you send them.
        </p>
      </div>
      <div className="home-hero-picture">
        <HeroStage />
      </div>
    </div>

    <p className="home-device-status">
      Wizzaroo is signed out on this device. A Parent can sign it in from the{" "}
      <a href="/parent/">Parent page</a> so the Children can play here.
    </p>

    <div
      className="home-section"
      data-read-aloud-section
      aria-labelledby="home-subjects-heading"
    >
      <div className="home-section-heading">
        <p className="home-kicker">What they learn</p>
        <h2 id="home-subjects-heading">
          {taughtSubjects.length} Subjects, one World Map
        </h2>
        <p>
          Every Island has a Region for each Subject it teaches, checked against
          the National Curriculum in England for that Island&apos;s Year. Each
          Subject below shows the first Region a Child meets.
        </p>
        <ReadAloudButton
          className="read-aloud is-small"
          readsSection
          describedBy="home-subjects-heading"
        />
      </div>
      <ul className="home-subjects">
        {taughtSubjects.map(({ subject, region, firstYearGroup }) => (
          <li key={subject} className={`home-subject subject-${subject}`}>
            <span className="home-subject-icon" aria-hidden="true">
              {regionLandmarkIcons[region.landmark]}
            </span>
            <h3>{subjectNames[subject]}</h3>
            <p className="home-subject-region">
              {region.name} ·{" "}
              {firstYearGroup === 1
                ? "Years 1 to 6"
                : `Years ${String(firstYearGroup)} to 6`}
            </p>
            <p>{subjectLessons[subject]}</p>
          </li>
        ))}
        <li className="home-subject home-subject-every-island">
          <span className="home-subject-icon" aria-hidden="true">
            <BigTopIcon />
          </span>
          <h3>And on every Island</h3>
          <p className="home-subject-region">
            Brainwave Big Top · Challenge Arena
          </p>
          <p>
            Word searches, number grids and crosswords, and practice for the
            Phonics Screening Check, the Multiplication Tables Check and the
            SATs, untimed or against the clock.
          </p>
        </li>
      </ul>
    </div>

    <div
      className="home-section"
      data-read-aloud-section
      aria-labelledby="home-inside-heading"
    >
      <div className="home-section-heading">
        <p className="home-kicker">Inside Wizzaroo</p>
        <h2 id="home-inside-heading">
          Everything a young learner needs, nothing they don&apos;t
        </h2>
        <ReadAloudButton
          className="read-aloud is-small"
          readsSection
          describedBy="home-inside-heading"
        />
      </div>
      <ul className="home-bento">
        <li className="home-tile home-tile-wide">
          <p className="home-tile-copy">
            <strong>A World Map to explore.</strong> Each Region tells a story,
            and its Games unlock as Children earn Stars.
          </p>
          <RegionPanelPicture />
        </li>
        <li className="home-tile home-tile-stat">
          <p className="home-stat-lead">Years 1 to 6 across</p>
          <p className="home-stat">{worldMap.islands.length} Islands</p>
          <p className="home-stat-label">
            From {firstIslandName} to {lastIslandName}, one for each Year Group.
          </p>
        </li>
        <li className="home-tile">
          <p className="home-tile-copy">
            <strong>No passwords to type.</strong> Children open their Character
            by tapping three pictures.
          </p>
          <PicturePasswordPicture />
        </li>
        <li className="home-tile">
          <p className="home-tile-copy">
            <strong>Stars for effort.</strong> Spend them on hats, wands, Pets,
            Mounts and a Room of their own.
          </p>
          <ItemsPicture />
        </li>
        <li className="home-tile">
          <p className="home-tile-copy">
            <strong>Progress you can see.</strong> Every Skill, every Subject,
            and where to help next.
          </p>
          <ProgressPicture />
        </li>
      </ul>
    </div>

    <div
      className="home-section"
      data-read-aloud-section
      aria-labelledby="home-facts-heading"
    >
      <div className="home-section-heading">
        <p className="home-kicker">Good to know</p>
        <h2 id="home-facts-heading">Made for Children, run by grown-ups</h2>
        <ReadAloudButton
          className="read-aloud is-small"
          readsSection
          describedBy="home-facts-heading"
        />
      </div>
      <ul className="home-facts">
        {facts.map(({ title, description, icon }) => (
          <li key={title}>
            <span className="home-fact-icon" aria-hidden="true">
              {icon}
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ul>
    </div>

    <div
      className="home-section home-steps"
      id="how-it-works"
      data-read-aloud-section
      aria-labelledby="home-steps-heading"
    >
      <div className="home-section-heading">
        <p className="home-kicker">How it works</p>
        <h2 id="home-steps-heading">Playing in three steps</h2>
        <ReadAloudButton
          className="read-aloud is-small"
          readsSection
          describedBy="home-steps-heading"
        />
      </div>
      <ol>
        {steps.map(({ title, description }) => (
          <li key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>
    </div>

    <div className="home-call" data-read-aloud-section>
      <h2 id="home-call-heading">Ready for the first adventure?</h2>
      <p>Sign in, add your Children, and they can be playing in minutes.</p>
      <ReadAloudButton
        className="read-aloud is-small"
        readsSection
        describedBy="home-call-heading"
      />
      <a className="button-link light" href="/parent/">
        Get started as a Parent
      </a>
    </div>
  </main>
);
