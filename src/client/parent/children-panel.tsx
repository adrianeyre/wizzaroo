import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import {
  isLocalDate,
  isMasteryState,
  type DailyPractice,
  type SkillMastery,
} from "../../curriculum/mastery.js";
import type { CharacterLoadout } from "../../curriculum/catalogue.js";
import { phonicsProgrammes } from "../../curriculum/phonics-programmes.js";
import {
  gamesFirstMinuteChoices,
  getParentChoices,
  isChildLimits,
  longestGamesFirstMinutes,
  shortestGamesFirstMinutes,
  type ChildLimits,
} from "../../curriculum/island-access.js";
import type { CheckAttempt } from "../../curriculum/checks.js";
import { isCheckHistory } from "../../curriculum/check-attempts.js";
import { skills } from "../../curriculum/skills.js";
import {
  describeSchoolYear,
  isYearGroup,
  isYearGroupAdjustment,
  type YearGroup,
  type YearGroupAdjustment,
} from "../../curriculum/year-groups.js";
import {
  findIsland,
  findRegion,
  worldMap,
} from "../../curriculum/world-map.js";
import {
  isPicturePasswordComplete,
  PicturePasswordPicker,
  usePicturePasswordChoice,
} from "../picture-password-picker.js";
import {
  ChildProgress,
  countMasteredSkills,
  describeShortMinutes,
} from "./child-progress.js";
import { isCharacterLoadout } from "../family-device/playable-family.js";
import { ChildFace } from "./child-face.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";

export interface Child {
  id: string;
  nickname: string;
  birthMonth: number | null;
  birthYear: number | null;
  yearGroupAdjustment: YearGroupAdjustment;
  schoolYear: number | null;
  yearGroup: YearGroup | null;
  schoolId: string;
  schoolName: string | null;
  characterName: string | null;
  /** How the Child's Character is dressed, or null before they've made one. */
  loadout?: CharacterLoadout | null;
  phonicsProgrammeId: string | null;
  classmateVisitsAllowed: boolean;
  classmateVisitsApproved: boolean;
  timeSpentSeconds: number;
  mastery: SkillMastery[];
  dailyPractice: DailyPractice[];
  stars: number;
  limits: ChildLimits;
  checkHistory: CheckAttempt[];
}

export type ChildrenView =
  | { kind: "loading" }
  | { kind: "listed"; children: Child[] }
  | { kind: "failed" };

type ChildTask =
  | { kind: "none" }
  | { kind: "adding" }
  | { kind: "editing"; child: Child }
  | { kind: "resetting"; child: Child }
  | { kind: "limiting"; child: Child };

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isSkillMastery = (value: unknown): value is SkillMastery =>
  typeof value === "object" &&
  value !== null &&
  "skillId" in value &&
  typeof value.skillId === "string" &&
  "state" in value &&
  isMasteryState(value.state) &&
  "percentCorrect" in value &&
  (value.percentCorrect === null || isCount(value.percentCorrect)) &&
  "timeSpentSeconds" in value &&
  isCount(value.timeSpentSeconds) &&
  "goodDayCount" in value &&
  isCount(value.goodDayCount) &&
  "goodDaysNeeded" in value &&
  isCount(value.goodDaysNeeded) &&
  "reviewIntervalDays" in value &&
  (value.reviewIntervalDays === null || isCount(value.reviewIntervalDays)) &&
  "nextReviewDate" in value &&
  (value.nextReviewDate === null || typeof value.nextReviewDate === "string");

const isDailyPractice = (value: unknown): value is DailyPractice =>
  typeof value === "object" &&
  value !== null &&
  "localDate" in value &&
  isLocalDate(value.localDate) &&
  "questionCount" in value &&
  isCount(value.questionCount) &&
  "rightFirstTimeCount" in value &&
  isCount(value.rightFirstTimeCount) &&
  "secondsSpent" in value &&
  isCount(value.secondsSpent);

const isChild = (value: unknown): value is Child =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "nickname" in value &&
  typeof value.nickname === "string" &&
  "birthMonth" in value &&
  (value.birthMonth === null || typeof value.birthMonth === "number") &&
  "birthYear" in value &&
  (value.birthYear === null || typeof value.birthYear === "number") &&
  "yearGroupAdjustment" in value &&
  isYearGroupAdjustment(value.yearGroupAdjustment) &&
  "schoolYear" in value &&
  (value.schoolYear === null || typeof value.schoolYear === "number") &&
  "yearGroup" in value &&
  (value.yearGroup === null || isYearGroup(value.yearGroup)) &&
  "schoolId" in value &&
  typeof value.schoolId === "string" &&
  "schoolName" in value &&
  (value.schoolName === null || typeof value.schoolName === "string") &&
  "characterName" in value &&
  (value.characterName === null || typeof value.characterName === "string") &&
  (!("loadout" in value) ||
    value.loadout === null ||
    isCharacterLoadout(value.loadout)) &&
  "phonicsProgrammeId" in value &&
  (value.phonicsProgrammeId === null ||
    typeof value.phonicsProgrammeId === "string") &&
  "classmateVisitsAllowed" in value &&
  typeof value.classmateVisitsAllowed === "boolean" &&
  "classmateVisitsApproved" in value &&
  typeof value.classmateVisitsApproved === "boolean" &&
  "timeSpentSeconds" in value &&
  typeof value.timeSpentSeconds === "number" &&
  "mastery" in value &&
  Array.isArray(value.mastery) &&
  value.mastery.every(isSkillMastery) &&
  "dailyPractice" in value &&
  Array.isArray(value.dailyPractice) &&
  value.dailyPractice.every(isDailyPractice) &&
  "stars" in value &&
  isCount(value.stars) &&
  "limits" in value &&
  isChildLimits(value.limits) &&
  "checkHistory" in value &&
  isCheckHistory(value.checkHistory);

const isChildList = (value: unknown): value is Child[] =>
  Array.isArray(value) && value.every(isChild);

const longestNameLength = 30;

const savingFailedMessage =
  "Wizzaroo couldn't save that. Try again in a moment.";

const missingPicturesMessage = "Tap 3 pictures for the Picture Password first.";

interface School {
  id: string;
  name: string | null;
}

const isSchoolList = (value: unknown): value is School[] =>
  Array.isArray(value) &&
  value.every(
    (school: unknown) =>
      typeof school === "object" &&
      school !== null &&
      "id" in school &&
      typeof school.id === "string" &&
      "name" in school &&
      (school.name === null || typeof school.name === "string"),
  );

const fetchSchools = async (): Promise<School[]> => {
  const response = await fetch("/api/schools");
  const schools: unknown = response.ok ? await response.json() : undefined;
  if (!isSchoolList(schools)) {
    throw new Error("Wizzaroo didn't list your Schools");
  }
  return schools;
};

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, index, 1)),
  ),
);

const yearGroupAdjustmentChoices: {
  value: YearGroupAdjustment;
  label: string;
}[] = [
  { value: 0, label: "In the usual year for their age" },
  { value: -1, label: "One year below, such as a deferred summer-born Child" },
  { value: 1, label: "One year above" },
];

export const describeChildYear = (child: Pick<Child, "schoolYear">) =>
  child.schoolYear === null
    ? "Year not known yet"
    : describeSchoolYear(child.schoolYear);

/** Who can see the Child's progress, as the Children's Code expects Parents to be told. */
export const describeWhoCanSee = ({
  schoolYear,
  schoolName,
}: Pick<Child, "schoolYear" | "schoolName">) => {
  const school = schoolName ?? "their School";
  return isYearGroup(schoolYear)
    ? `Teachers for Year ${String(schoolYear)} at ${school} can see this Child's progress.`
    : `No Teacher at ${school} can see this Child's progress, because Teachers on Wizzaroo follow Years 1 to 6.`;
};

const describeClassmates = (nickname: string) =>
  `Classmates are Children at ${nickname}'s School in the same Year whose Parents have turned this on too. They see ${nickname}'s Room and their Character's picture, never a name, and ${nickname} can visit theirs.`;

const schoolNotApprovedMessage =
  "Your School hasn't turned on Classmate visits yet.";

export const describeClassmateVisits = ({
  nickname,
  classmateVisitsAllowed,
  classmateVisitsApproved,
}: Pick<
  Child,
  "nickname" | "classmateVisitsAllowed" | "classmateVisitsApproved"
>) => {
  if (!classmateVisitsApproved) {
    return `${nickname}'s Room is for the Family only. ${schoolNotApprovedMessage}`;
  }
  return classmateVisitsAllowed
    ? `Classmates can visit ${nickname}'s Room, and ${nickname} can visit theirs.`
    : `${nickname}'s Room is for the Family only.`;
};

const describePhonicsProgramme = (phonicsProgrammeId: string | null) => {
  const phonicsProgramme = phonicsProgrammes.find(
    ({ id }) => id === phonicsProgrammeId,
  );
  return phonicsProgramme === undefined
    ? "No Phonics Programme chosen yet. Edit them to choose their school's."
    : `Learns phonics with ${phonicsProgramme.name}.`;
};

const describeGamesFirst = (minutes: number) =>
  `${String(minutes)} ${minutes === 1 ? "minute" : "minutes"}`;

const shortestDailyMinutes = 5;
const longestDailyMinutes = 600;
const percentWhole = 100;

const listIslandNames = (islandIds: readonly string[]) =>
  islandIds.flatMap((islandId) => findIsland(islandId)?.name ?? []);

const listRegionNames = (regionKeys: readonly string[]) =>
  regionKeys.flatMap((regionKey) => {
    const [islandId = "", regionId = ""] = regionKey.split("/");
    const region = findRegion(islandId, regionId);
    const island = findIsland(islandId);
    return region === undefined || island === undefined
      ? []
      : [`${region.name} on ${island.name}`];
  });

const describeNamed = (description: string, names: readonly string[]) =>
  names.length === 0 ? "" : ` ${description}: ${names.join(", ")}.`;

const describeGameCount = (
  whoTurnedOff: string,
  gameKeys: readonly string[],
) =>
  gameKeys.length === 0
    ? ""
    : ` Games ${whoTurnedOff}: ${String(gameKeys.length)}.`;

/** What a Child can play, as their Parents set it, for anyone allowed to see their progress. */
export const describeLimits = ({
  dailyMinutes,
  unlockedIslandIds,
  lockedIslandIds,
  turnedOffRegionKeys,
  openRegionKeys,
  lockedGameKeys,
  teacherLocks,
  isMusicMuted,
  areSoundEffectsMuted,
  isCheckClockOff,
  isExploringLocked,
  exploreLockedIslandIds,
  gamesFirstMinutes,
}: ChildLimits) => {
  const dailyLimit =
    dailyMinutes === null
      ? "No daily time limit"
      : `Up to ${String(dailyMinutes)} minutes a day on each Family Device`;
  return [
    `${dailyLimit}.`,
    gamesFirstMinutes === null
      ? ""
      : ` ${describeGamesFirst(gamesFirstMinutes)} of Games first each day before the Wardrobe, Room and Explore open.`,
    describeNamed(
      "Islands you've opened early",
      listIslandNames(
        unlockedIslandIds.filter(
          (islandId) => !lockedIslandIds.includes(islandId),
        ),
      ),
    ),
    describeNamed("Islands you've locked", listIslandNames(lockedIslandIds)),
    describeNamed(
      "Regions you've turned off",
      listRegionNames(turnedOffRegionKeys),
    ),
    describeNamed(
      "Regions with every Game open",
      listRegionNames(openRegionKeys),
    ),
    describeGameCount("you've turned off", lockedGameKeys),
    describeNamed(
      "Islands their Teacher has locked",
      listIslandNames(teacherLocks.lockedIslandIds),
    ),
    describeNamed(
      "Regions their Teacher has turned off",
      listRegionNames(teacherLocks.turnedOffRegionKeys),
    ),
    describeGameCount(
      "their Teacher has turned off",
      teacherLocks.lockedGameKeys,
    ),
    isMusicMuted ? " Music is off." : "",
    areSoundEffectsMuted ? " Sound effects are off." : "",
    isCheckClockOff ? " No time limit in Checks." : "",
    isExploringLocked ? " Exploring the Islands is locked." : "",
    isExploringLocked
      ? ""
      : describeNamed(
          "Islands locked for exploring",
          listIslandNames(exploreLockedIslandIds),
        ),
  ].join("");
};

export const fetchChildrenView = async (): Promise<ChildrenView> => {
  const response = await fetch("/api/children");
  const children: unknown = response.ok ? await response.json() : undefined;
  return isChildList(children)
    ? { kind: "listed", children }
    : { kind: "failed" };
};

export const sendChildChange = async (
  method: "POST" | "PUT",
  path: string,
  body: object,
): Promise<void> => {
  const response = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Wizzaroo didn't save the change to the Child");
  }
};

interface ChildFormProps {
  child?: Child;
  isAskingForBirth?: boolean;
  onSaved: () => void;
  onCancelled?: () => void;
}

const thisYear = new Date().getFullYear();
const youngestBirthYearOffset = 3;
const oldestBirthYearOffset = 13;

// The name typed into the form, for saying who is being saved, or `fallback` while it's empty.
const describeNickname = (
  typed: FormDataEntryValue | null,
  fallback: string,
): string =>
  typeof typed === "string" && typed.trim() !== "" ? typed.trim() : fallback;

const ChildForm = ({
  child,
  isAskingForBirth = false,
  onSaved,
  onCancelled,
}: ChildFormProps) => {
  const picturePasswordChoice = usePicturePasswordChoice();
  const { picturePassword } = picturePasswordChoice;
  const [problem, setProblem] = useState<string>();
  const [schools, setSchools] = useState<School[]>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const isAdding = child === undefined;

  useEffect(() => {
    if (isAdding) {
      fetchSchools().then(setSchools, () => {
        setSchools([]);
      });
    }
  }, [isAdding]);

  const saveChild = async (form: HTMLFormElement) => {
    const answers = new FormData(form);
    const characterName = answers.get("characterName");
    const childDetails = {
      nickname: answers.get("nickname"),
      birthMonth: Number(answers.get("birthMonth")),
      birthYear: Number(answers.get("birthYear")),
      yearGroupAdjustment: Number(answers.get("yearGroupAdjustment")),
      phonicsProgrammeId: answers.get("phonicsProgrammeId"),
      ...(characterName === null || characterName === ""
        ? {}
        : { characterName }),
    };
    if (isAdding) {
      if (!isPicturePasswordComplete(picturePassword)) {
        setProblem(missingPicturesMessage);
        return;
      }
      const schoolId = answers.get("schoolId");
      const nickname = describeNickname(answers.get("nickname"), "this Child");
      const isSaved = await runBusy(
        `Adding ${nickname} to your Family…`,
        async () => {
          await sendChildChange("POST", "/api/children", {
            ...childDetails,
            ...(schoolId === null || schoolId === "" ? {} : { schoolId }),
            picturePassword,
          });
          return true;
        },
      );
      if (isSaved === true) {
        onSaved();
      }
      return;
    }
    const nickname = describeNickname(answers.get("nickname"), child.nickname);
    const isSaved = await runBusy(`Saving ${nickname}'s details…`, async () => {
      await sendChildChange("PUT", `/api/children/${child.id}`, childDetails);
      return true;
    });
    if (isSaved === true) {
      onSaved();
    }
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        saveChild(event.currentTarget).catch(() => {
          setProblem(savingFailedMessage);
        });
      }}
    >
      <h2>{isAdding ? "Add a Child" : `Edit ${child.nickname}`}</h2>
      {isAskingForBirth && !isAdding ? (
        <p role="status">
          Wizzaroo now works out {child.nickname}&apos;s Year from their birth
          month and year, so it moves up by itself every September. Add them to
          carry on.
        </p>
      ) : null}
      <p>
        Wizzaroo only asks for a first name or nickname and the month and year
        they were born, never a surname, birthday or photo.
      </p>
      <label>
        Nickname
        <input
          name="nickname"
          defaultValue={child?.nickname}
          maxLength={longestNameLength}
          autoComplete="off"
          required
        />
      </label>
      <fieldset>
        <legend>When they were born</legend>
        <label>
          Month
          <select
            name="birthMonth"
            defaultValue={child?.birthMonth ?? ""}
            required
          >
            <option value="">Choose a month</option>
            {monthNames.map((monthName, index) => (
              <option key={monthName} value={index + 1}>
                {monthName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Year
          <input
            name="birthYear"
            type="number"
            min={thisYear - oldestBirthYearOffset}
            max={thisYear - youngestBirthYearOffset}
            defaultValue={child?.birthYear ?? ""}
            required
          />
        </label>
      </fieldset>
      <label>
        Their school year
        <select
          name="yearGroupAdjustment"
          defaultValue={child?.yearGroupAdjustment ?? 0}
        >
          {yearGroupAdjustmentChoices.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {isAdding && schools !== undefined && schools.length > 1 ? (
        <label>
          Their School
          <select name="schoolId" required defaultValue="">
            <option value="">Choose their School</option>
            {schools.map(({ id, name }) => (
              <option key={id} value={id}>
                {name ?? "Your School"}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        Their Character&apos;s name
        <input
          name="characterName"
          defaultValue={child?.characterName ?? undefined}
          maxLength={longestNameLength}
          autoComplete="off"
          required={isAdding || child.characterName !== null}
        />
      </label>
      <label>
        Their school&apos;s Phonics Programme
        <select
          name="phonicsProgrammeId"
          defaultValue={child?.phonicsProgrammeId ?? ""}
          required
        >
          <option value="">Choose one</option>
          {phonicsProgrammes.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <p>
        Wizzaroo offers phonics in the order the school teaches the sounds, and
        uses the school&apos;s words for them. Change it if they move school;
        nothing they&apos;ve learnt is lost.
      </p>
      {isAdding ? <PicturePasswordPicker {...picturePasswordChoice} /> : null}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        {isAdding ? "Add this Child" : "Save"}
      </button>
      {onCancelled === undefined ? null : (
        <button type="button" onClick={onCancelled}>
          Cancel
        </button>
      )}
    </form>
  );
};

const noGamesFirst = "none";
const ownGamesFirst = "own";

const findGamesFirstChoice = (minutes: number | null): string => {
  if (minutes === null) {
    return noGamesFirst;
  }
  return gamesFirstMinuteChoices.some((choice) => choice === minutes)
    ? String(minutes)
    : ownGamesFirst;
};

const readGamesFirstMinutes = (answers: FormData): number | null => {
  const choice = answers.get("gamesFirst");
  if (choice === null || choice === noGamesFirst) {
    return null;
  }
  return Number(
    choice === ownGamesFirst ? answers.get("gamesFirstOwnMinutes") : choice,
  );
};

const GamesFirstFieldset = ({ child }: { child: Child }) => {
  const [choice, setChoice] = useState(() =>
    findGamesFirstChoice(child.limits.gamesFirstMinutes),
  );
  const isOwnChosen = choice === ownGamesFirst;
  const radio = (value: string, label: string) => (
    <label key={value}>
      <input
        name="gamesFirst"
        type="radio"
        value={value}
        checked={choice === value}
        onChange={() => {
          setChoice(value);
        }}
      />
      {label}
    </label>
  );
  return (
    <fieldset className="games-first">
      <legend>Games before the Wardrobe, Room and Explore</legend>
      {radio(noGamesFirst, "Not set")}
      {gamesFirstMinuteChoices.map((minutes) =>
        radio(String(minutes), describeGamesFirst(minutes)),
      )}
      {radio(ownGamesFirst, "Set your own minutes")}
      {isOwnChosen ? (
        <label>
          Your own minutes of Games first
          <input
            name="gamesFirstOwnMinutes"
            type="number"
            required
            min={shortestGamesFirstMinutes}
            max={longestGamesFirstMinutes}
            defaultValue={
              findGamesFirstChoice(child.limits.gamesFirstMinutes) ===
              ownGamesFirst
                ? (child.limits.gamesFirstMinutes ?? "")
                : ""
            }
          />
        </label>
      ) : null}
      <p className="form-hint">
        Once set, {child.nickname} plays this many minutes of Games each day
        before the Wardrobe, the Room and Explore open. Only time in a Game
        counts, not time on the World Map, and it is counted on each Family
        Device separately.
      </p>
    </fieldset>
  );
};

interface LimitsFormProps {
  child: Child;
  onSaved: () => void;
  onCancelled: () => void;
}

const LimitsForm = ({ child, onSaved, onCancelled }: LimitsFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const saveLimits = async (form: HTMLFormElement) => {
    const answers = new FormData(form);
    const dailyMinutes = answers.get("dailyMinutes");
    const classmateVisitsAllowed = answers.get("classmateVisits") !== null;
    await sendChildChange("PUT", `/api/children/${child.id}/limits`, {
      ...getParentChoices(child.limits),
      dailyMinutes: dailyMinutes === "" ? null : Number(dailyMinutes),
      isMusicMuted: answers.get("music") === null,
      areSoundEffectsMuted: answers.get("soundEffects") === null,
      isCheckClockOff: answers.get("checkClockOff") !== null,
      isExploringLocked: answers.get("exploring") === null,
      exploreLockedIslandIds: worldMap.islands
        .map(({ id }) => id)
        .filter((islandId) => answers.get(`explore-${islandId}`) === null),
      gamesFirstMinutes: readGamesFirstMinutes(answers),
    });
    // Until the School approves Classmate visits the switch is disabled, so it sends nothing and the Parent's stored choice is kept.
    if (
      child.classmateVisitsApproved &&
      classmateVisitsAllowed !== child.classmateVisitsAllowed
    ) {
      await sendChildChange(
        "PUT",
        `/api/children/${child.id}/classmate-visits`,
        { classmateVisitsAllowed },
      );
    }
    return true;
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        runBusy(`Saving ${child.nickname}'s limits…`, () => saveLimits(form))
          .then((isSaved) => {
            if (isSaved === true) {
              onSaved();
            }
          })
          .catch(() => {
            setProblem(savingFailedMessage);
          });
      }}
    >
      <h2>Limits for {child.nickname}</h2>
      <p>
        Each Family Device keeps to the limits it last synced, even with no
        network, so a change applies once it next goes online. Time is counted
        on each device separately.
      </p>
      <label>
        Minutes a day on each Family Device (leave empty for no limit)
        <input
          name="dailyMinutes"
          type="number"
          min={shortestDailyMinutes}
          max={longestDailyMinutes}
          defaultValue={child.limits.dailyMinutes ?? ""}
        />
      </label>
      <GamesFirstFieldset child={child} />
      <fieldset>
        <legend>Sound on Family Devices</legend>
        <label>
          <input
            name="music"
            type="checkbox"
            defaultChecked={!child.limits.isMusicMuted}
          />
          Play music
        </label>
        <label>
          <input
            name="soundEffects"
            type="checkbox"
            defaultChecked={!child.limits.areSoundEffectsMuted}
          />
          Play sound effects
        </label>
        <p className="form-hint">
          Voice-over always plays, so {child.nickname} can still hear every
          question.
        </p>
      </fieldset>
      <fieldset>
        <legend>Exploring the Islands</legend>
        <label>
          <input
            name="exploring"
            type="checkbox"
            defaultChecked={!child.limits.isExploringLocked}
          />
          Let {child.nickname} explore the Islands on foot
        </label>
        <p className="form-hint">
          Turned off, every Explore button is hidden on {child.nickname}'s
          Family Devices, so they play Games from the World Map instead.
        </p>
        <fieldset className="explore-island-locks">
          <legend>Islands {child.nickname} can explore</legend>
          {worldMap.islands.map((island) => (
            <label key={island.id}>
              <input
                name={`explore-${island.id}`}
                type="checkbox"
                defaultChecked={
                  !child.limits.exploreLockedIslandIds.includes(island.id)
                }
              />
              {island.name} (Year {island.yearGroup})
            </label>
          ))}
          <p className="form-hint">
            Every Island is open for exploring until you turn it off. A locked
            Island isn't offered anywhere {child.nickname} could set off to
            explore it, and they can't travel there on foot.
          </p>
        </fieldset>
      </fieldset>
      <fieldset>
        <legend>Checks in the Challenge Arena</legend>
        <label>
          <input
            name="checkClockOff"
            type="checkbox"
            defaultChecked={child.limits.isCheckClockOff}
          />
          No time limit in Checks
        </label>
        <p className="form-hint">
          This mirrors the access arrangements the real checks allow, such as
          extra time. A Timed Check keeps its format but has no clock, and its
          score shows it was taken with no time limit.
        </p>
      </fieldset>
      <fieldset>
        <legend>Classmates</legend>
        <label>
          <input
            name="classmateVisits"
            type="checkbox"
            defaultChecked={
              child.classmateVisitsApproved && child.classmateVisitsAllowed
            }
            disabled={!child.classmateVisitsApproved}
          />
          Let Classmates visit {child.nickname}'s Room
        </label>
        <p className="form-hint">
          {child.classmateVisitsApproved
            ? describeClassmates(child.nickname)
            : schoolNotApprovedMessage}
        </p>
      </fieldset>
      <p className="form-hint">
        Want to lock an Island, or turn a Subject off?{" "}
        <a href="#islands">Choose {child.nickname}'s Islands</a>.
      </p>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Save the limits
      </button>
      <button type="button" onClick={onCancelled}>
        Cancel
      </button>
    </form>
  );
};

interface PicturePasswordFormProps {
  child: Child;
  onSaved: () => void;
  onCancelled: () => void;
}

const PicturePasswordForm = ({
  child,
  onSaved,
  onCancelled,
}: PicturePasswordFormProps) => {
  const picturePasswordChoice = usePicturePasswordChoice();
  const { picturePassword } = picturePasswordChoice;
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const savePicturePassword = async () => {
    if (!isPicturePasswordComplete(picturePassword)) {
      setProblem(missingPicturesMessage);
      return;
    }
    const isSaved = await runBusy(
      `Saving ${child.nickname}'s new Picture Password…`,
      async () => {
        await sendChildChange(
          "PUT",
          `/api/children/${child.id}/picture-password`,
          { picturePassword },
        );
        return true;
      },
    );
    if (isSaved === true) {
      onSaved();
    }
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event) => {
        event.preventDefault();
        savePicturePassword().catch(() => {
          setProblem(savingFailedMessage);
        });
      }}
    >
      <h2>A new Picture Password for {child.nickname}</h2>
      <PicturePasswordPicker {...picturePasswordChoice} />
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Save the Picture Password
      </button>
      <button type="button" onClick={onCancelled}>
        Cancel
      </button>
    </form>
  );
};

const describeTimePlayed = (timeSpentSeconds: number) =>
  timeSpentSeconds === 0
    ? "Not played yet"
    : `${describeShortMinutes(timeSpentSeconds)} played`;

interface ChildTilesProps {
  label: string;
  familyChildren: Child[];
  chosenChildId: string;
  onChildChosen: (childId: string) => void;
}

export const ChildTiles = ({
  label,
  familyChildren,
  chosenChildId,
  onChildChosen,
}: ChildTilesProps) => (
  <div className="child-tiles" role="group" aria-label={label}>
    {familyChildren.map((child) => {
      const masteredCount = countMasteredSkills(child.mastery);
      const masteredPercent = Math.round(
        (masteredCount * percentWhole) / skills.length,
      );
      return (
        <button
          key={child.id}
          type="button"
          className="child-tile"
          aria-pressed={child.id === chosenChildId}
          onClick={() => {
            onChildChosen(child.id);
          }}
        >
          <ChildFace
            className="child-face"
            nickname={child.nickname}
            loadout={child.loadout}
          />
          <span className="child-tile-name">{child.nickname}</span>
          <span className="child-tile-detail">
            {describeChildYear(child)} ·{" "}
            {child.characterName === null
              ? "no Character yet"
              : `plays as ${child.characterName}`}
          </span>
          <span className="child-tile-stats">
            <span>{child.stars} Stars</span>
            <span>{describeTimePlayed(child.timeSpentSeconds)}</span>
          </span>
          <span className="child-tile-meter" aria-hidden="true">
            <span style={{ width: `${String(masteredPercent)}%` }} />
          </span>
          <span className="child-tile-detail">
            {masteredCount} of {skills.length} Skills mastered
          </span>
        </button>
      );
    })}
  </div>
);

interface ChildDashboardProps {
  child: Child;
  onChildTaskChosen: (task: ChildTask) => void;
}

const ChildDashboard = ({ child, onChildTaskChosen }: ChildDashboardProps) => (
  <article
    className="child-dashboard"
    aria-labelledby={`child-dashboard-${child.id}`}
  >
    <header className="child-dashboard-header">
      <ChildFace
        className="child-face large"
        nickname={child.nickname}
        loadout={child.loadout}
      />
      <div className="child-dashboard-about">
        <h2 id={`child-dashboard-${child.id}`}>{child.nickname}'s progress</h2>
        <p>
          <strong>{child.nickname}</strong>, {describeChildYear(child)} at{" "}
          {child.schoolName ?? "their School"},{" "}
          {child.characterName === null
            ? "with no Character yet: they make one the first time they play"
            : `plays as ${child.characterName}`}
        </p>
        <p className="who-can-see">{describeWhoCanSee(child)}</p>
        <p>{describePhonicsProgramme(child.phonicsProgrammeId)}</p>
        <p>{describeLimits(child.limits)}</p>
        <p>{describeClassmateVisits(child)}</p>
      </div>
    </header>
    <div className="child-actions">
      <button
        type="button"
        onClick={() => {
          onChildTaskChosen({ kind: "editing", child });
        }}
      >
        Edit {child.nickname}
      </button>
      <button
        type="button"
        onClick={() => {
          onChildTaskChosen({ kind: "resetting", child });
        }}
      >
        Reset {child.nickname}'s Picture Password
      </button>
      <button
        type="button"
        onClick={() => {
          onChildTaskChosen({ kind: "limiting", child });
        }}
      >
        Set {child.nickname}'s limits
      </button>
      <a className="button-link secondary" href="#islands">
        Choose {child.nickname}'s Islands
      </a>
    </div>
    <ChildProgress child={child} />
    <div className="progress-notes">
      <p>
        Time spent includes play on a Family Device that had no network once
        it's back online.
      </p>
      <p>
        A Skill is Mastered after a good day on enough separate days, by each
        Family Device's own calendar, so one long afternoon can't master it.
      </p>
    </div>
  </article>
);

interface ChildListProps {
  familyChildren: Child[];
  chosenChildId: string | undefined;
  onChildChosen: (childId: string) => void;
  onChildTaskChosen: (task: ChildTask) => void;
  onBirthGiven: () => void;
}

// A Child from before Year Groups were worked out is asked for their birth month and year the first time they're opened.
const ChildList = ({
  familyChildren,
  chosenChildId,
  onChildChosen,
  onChildTaskChosen,
  onBirthGiven,
}: ChildListProps) => {
  const chosenChild =
    familyChildren.find(({ id }) => id === chosenChildId) ??
    familyChildren.at(0);
  if (chosenChild === undefined) {
    return <p>No Children yet. Add one to get them playing.</p>;
  }
  return (
    <>
      <ChildTiles
        label="Choose a Child to see their progress"
        familyChildren={familyChildren}
        chosenChildId={chosenChild.id}
        onChildChosen={onChildChosen}
      />
      {chosenChild.birthMonth === null ? (
        <ChildForm
          key={chosenChild.id}
          child={chosenChild}
          isAskingForBirth
          onSaved={onBirthGiven}
        />
      ) : (
        <ChildDashboard
          key={chosenChild.id}
          child={chosenChild}
          onChildTaskChosen={onChildTaskChosen}
        />
      )}
    </>
  );
};

interface ChildrenPanelProps {
  chosenChildId: string | undefined;
  onChildChosen: (childId: string) => void;
}

export const ChildrenPanel = ({
  chosenChildId,
  onChildChosen,
}: ChildrenPanelProps) => {
  const [view, setView] = useState<ChildrenView>({ kind: "loading" });
  const [task, setTask] = useState<ChildTask>({ kind: "none" });

  const showChildren = useCallback(() => {
    void fetchChildrenView().then(setView, () => {
      setView({ kind: "failed" });
    });
  }, []);

  useEffect(showChildren, [showChildren]);

  const finishTask = () => {
    setTask({ kind: "none" });
    showChildren();
  };
  const cancelTask = () => {
    setTask({ kind: "none" });
  };

  return (
    <section className="children-panel">
      <div className="view-intro">
        <h1>Children</h1>
        <p>
          See how each Child is getting on, and choose what and how long they
          can play.
        </p>
      </div>
      {view.kind === "loading" ? (
        <BusyProgress label="Loading your Children…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load your Children. Try again in a moment.
        </p>
      ) : null}
      {view.kind === "listed" && task.kind === "none" ? (
        <>
          <ChildList
            familyChildren={view.children}
            chosenChildId={chosenChildId}
            onChildChosen={onChildChosen}
            onChildTaskChosen={setTask}
            onBirthGiven={showChildren}
          />
          <button
            type="button"
            onClick={() => {
              setTask({ kind: "adding" });
            }}
          >
            Add a Child
          </button>
        </>
      ) : null}
      {task.kind === "adding" ? (
        <ChildForm onSaved={finishTask} onCancelled={cancelTask} />
      ) : null}
      {task.kind === "editing" ? (
        <ChildForm
          child={task.child}
          onSaved={finishTask}
          onCancelled={cancelTask}
        />
      ) : null}
      {task.kind === "limiting" ? (
        <LimitsForm
          child={task.child}
          onSaved={finishTask}
          onCancelled={cancelTask}
        />
      ) : null}
      {task.kind === "resetting" ? (
        <PicturePasswordForm
          child={task.child}
          onSaved={finishTask}
          onCancelled={cancelTask}
        />
      ) : null}
    </section>
  );
};
