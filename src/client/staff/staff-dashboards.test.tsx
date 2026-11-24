import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { YearGroup } from "../../curriculum/year-groups.js";
import { AdminSection } from "./admin-dashboard.js";
import { TeacherSection } from "./teacher-dashboard.js";

interface ApiRequest {
  method: string;
  path: string;
  body: unknown;
}

type Answer = (body: unknown) => Response | Promise<Response>;

const json = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });

const noContent = (): Response => new Response(null, { status: 204 });

const hillside = {
  id: "5c1e0000-0000-4000-8000-000000000001",
  name: "Hillside Primary",
  town: "Leeds",
  classmateVisitsApproved: false,
  teacherCount: 1,
  childCount: 1,
};

const twoey = {
  id: "c41d0000-0000-4000-8000-000000000002",
  familyId: "fa31a000-0000-4000-8000-000000000003",
  nickname: "Twoey",
  birthMonth: 3,
  birthYear: 2019,
  yearGroupAdjustment: 0,
  phonicsProgrammeId: "little-wandle",
  limits: {
    dailyMinutes: 30,
    unlockedIslandIds: [],
    lockedIslandIds: [],
    turnedOffRegionKeys: [],
    openRegionKeys: [],
    lockedGameKeys: [],
    isMusicMuted: false,
    areSoundEffectsMuted: false,
    isCheckClockOff: false,
    isExploringLocked: false,
    exploreLockedIslandIds: [],
    gamesFirstMinutes: null,
    teacherLocks: {
      lockedIslandIds: [],
      turnedOffRegionKeys: [],
      lockedGameKeys: [],
    },
  },
  schoolId: hillside.id,
  schoolName: hillside.name,
  schoolYear: 2,
  yearGroup: 2,
  characterName: "Sparkle",
  timeSpentSeconds: 600,
  lastPlayedAt: "2026-11-14T16:00:00.000Z",
  mastery: [],
  weakSkillIds: ["maths.number-bonds-10"],
  dailyPractice: [],
  stars: 4,
  checkHistory: [],
  regionProgress: [
    {
      islandId: "meadow-isle",
      regionId: "bubble-bay",
      unlockedGameIds: ["popping-bubbles", "fish-count"],
      starsSinceUnlock: 1,
      starsEarned: 11,
    },
  ],
};

const jo = {
  userId: "a0a00000-0000-4000-8000-000000000004",
  name: "Jo Smith",
  email: "jo@example.com",
  lastLoginAt: null,
  inviteStatus: "accepted",
  deactivatedAt: null,
  familyId: twoey.familyId,
  familyName: "Jo Smith",
  schoolIds: [hillside.id],
  seenChildren: [{ id: twoey.id, nickname: "Twoey", schoolYear: 2 }],
};

const startFakeApi = (answers: Partial<Record<string, Answer>>) => {
  const requests: ApiRequest[] = [];
  vi.stubGlobal("fetch", (path: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body: unknown =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ method, path, body });
    const answer = answers[`${method} ${path}`];
    return Promise.resolve(answer === undefined ? json({}, 404) : answer(body));
  });
  return requests;
};

/** Holds `answer` back until `release` is called, to see what the page shows while it waits. */
const holdAnswer = (answer: Answer) => {
  const { promise: released, resolve: release } =
    Promise.withResolvers<undefined>();
  return {
    answer: async (body: unknown) => {
      await released;
      return answer(body);
    },
    release: () => {
      release(undefined);
    },
  };
};

/** What the page says it is waiting on, from its BusyProgress, if anything. */
const getBusyLabels = () =>
  Array.from(document.querySelectorAll(".busy .busy-label")).map(
    ({ textContent }) => textContent,
  );

const getPageText = () => document.body.textContent;

const findButton = (label: string): HTMLButtonElement => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label,
  );
  if (button === undefined) {
    throw new Error(`the page has no "${label}" button`);
  }
  return button;
};

const findInputNear = (labelText: string): HTMLInputElement => {
  const label = Array.from(document.querySelectorAll("label")).find(
    (candidate) => candidate.textContent.includes(labelText),
  );
  const input = label?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`the page has no input labelled "${labelText}"`);
  }
  return input;
};

const chooseFile = (input: HTMLInputElement, file: File) => {
  Object.defineProperty(input, "files", {
    value: { item: (index: number) => (index === 0 ? file : null) },
  });
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

describe("the staff dashboards", () => {
  let root: Root;

  beforeEach(() => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  describe("the Teacher dashboard", () => {
    const teacherApi = () =>
      startFakeApi({
        "GET /api/school-children": () => json([twoey]),
        "GET /api/parents": () => json([jo]),
        [`GET /api/children/${twoey.id}/progress`]: () => json(twoey),
        [`POST /api/people/${jo.userId}/password-resets`]: noContent,
      });

    const findSwitch = (name: string, value: string): HTMLInputElement => {
      const input = document.querySelector(
        `input[name="${name}"][value="${value}"]`,
      );
      if (!(input instanceof HTMLInputElement)) {
        throw new Error(`the page has no ${name} switch for ${value}`);
      }
      return input;
    };

    it("lets a Teacher turn a Region off for a Child in their Year Groups, as a Teacher lock their Parents can't undo", async () => {
      const requests = startFakeApi({
        "GET /api/school-children": () =>
          json([
            {
              ...twoey,
              limits: {
                ...twoey.limits,
                turnedOffRegionKeys: ["meadow-isle/whispering-woods"],
              },
            },
          ]),
        [`PUT /api/children/${twoey.id}/teacher-locks`]: () => json({}),
      });
      root.render(
        <TeacherSection section="teacher-islands" teachingYearGroups={[2]} />,
      );
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey's Islands");
      });

      expect(document.querySelector('input[name="openRegionKeys"]')).toBeNull();
      expect(
        findSwitch("turnedOnRegionKeys", "meadow-isle/whispering-woods")
          .checked,
      ).toBe(true);
      expect(
        findSwitch("turnedOnRegionKeys", "meadow-isle/whispering-woods")
          .closest(".region-card")
          ?.querySelector(".lock-note")?.textContent,
      ).toBe("Off at home");

      findSwitch("turnedOnRegionKeys", "meadow-isle/bubble-bay").click();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/children/${twoey.id}/teacher-locks`,
          body: {
            lockedIslandIds: [],
            turnedOffRegionKeys: ["meadow-isle/bubble-bay"],
            lockedGameKeys: [],
          },
        });
      });
      await vi.waitFor(() => {
        expect(
          findSwitch("turnedOnRegionKeys", "meadow-isle/bubble-bay").checked,
        ).toBe(false);
      });
      expect(requests.filter(({ path }) => path.endsWith("/limits"))).toEqual(
        [],
      );
    });

    it("summarises each Year Group with every Child's last played and weak spots", async () => {
      teacherApi();

      root.render(
        <TeacherSection
          section="teacher-year-groups"
          teachingYearGroups={[2, 3]}
        />,
      );

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey");
      });
      expect(getPageText()).toContain("Year 2");
      expect(getPageText()).toContain("No Children in Year 3 yet.");
      expect(getPageText()).toContain("Number bonds to 10");
      expect(getPageText()).toContain("14 Nov 2026");
    });

    describe("Checks", () => {
      const fourey = {
        ...twoey,
        id: "c41d0000-0000-4000-8000-000000000005",
        nickname: "Fourey",
        schoolYear: 4,
        yearGroup: 4,
        limits: { ...twoey.limits, isCheckClockOff: true },
        checkHistory: [
          {
            checkGameType: "times-tables-check",
            isClockOff: true,
            outcomes: [
              {
                key: "7x8",
                questionType: "8-times-table",
                skillId: "maths.times-tables-to-12",
                isRight: true,
                isInTime: true,
                millisecondsTaken: 2000,
              },
              {
                key: "6x9",
                questionType: "9-times-table",
                skillId: "maths.times-tables-to-12",
                isRight: false,
                isInTime: true,
                millisecondsTaken: 3000,
              },
            ],
            finishedAt: "2026-11-14T16:00:00.000Z",
            localDate: "2026-11-14",
            score: 1,
            questionCount: 2,
          },
        ],
      };
      const fourNew = {
        ...fourey,
        id: "c41d0000-0000-4000-8000-000000000006",
        nickname: "Newbie",
        checkHistory: [],
      };

      const openYearGroups = async (teachingYearGroups: YearGroup[]) => {
        startFakeApi({
          "GET /api/school-children": () => json([twoey, fourey, fourNew]),
          "GET /api/parents": () => json([jo]),
          [`GET /api/children/${fourey.id}/progress`]: () => json(fourey),
        });
        root.render(
          <TeacherSection
            section="teacher-year-groups"
            teachingYearGroups={teachingYearGroups}
          />,
        );
        await vi.waitFor(() => {
          expect(getPageText()).toContain("Fourey");
        });
      };

      const readTable = (caption: string) => {
        const table = Array.from(document.querySelectorAll("table")).find(
          (candidate) => candidate.caption?.textContent === caption,
        );
        return {
          headings: Array.from(
            table?.querySelectorAll("thead th") ?? [],
            ({ textContent }) => textContent,
          ),
          rows: Array.from(table?.querySelectorAll("tbody tr") ?? [], (row) =>
            Array.from(row.children, ({ textContent }) => textContent),
          ),
        };
      };

      it("adds a Latest Check column for a Year with a statutory check, with the latest Timed Check's score or a dash", async () => {
        await openYearGroups([2, 4]);

        const yearFour = readTable("Year 4");
        expect(yearFour.headings).toContain("Latest Check");
        expect(yearFour.rows.map((row) => row[3])).toEqual([
          "Multiplication Tables Check: 1 out of 2 (no time limit)",
          "–",
        ]);
        expect(readTable("Year 2").headings).not.toContain("Latest Check");
      });

      it("shows a Child's Check History and their no-time-limit switch read-only", async () => {
        await openYearGroups([4]);

        findButton("See Fourey's progress").click();

        await vi.waitFor(() => {
          expect(getPageText()).toContain("Check History");
        });
        expect(getPageText()).toContain("No time limit in Checks.");
        expect(getPageText()).toContain("14 November 2026: 1 out of 2");
        expect(
          document.querySelectorAll("table.times-tables-grid tbody tr"),
        ).toHaveLength(11);
        const progress = document.querySelector(
          'section[aria-label="A Child\'s progress"]',
        );
        expect(progress?.querySelectorAll("input, select, form")).toHaveLength(
          0,
        );
      });
    });

    it("shows which Islands are open and which Games are unlocked, read-only", async () => {
      teacherApi();
      root.render(
        <TeacherSection
          section="teacher-year-groups"
          teachingYearGroups={[2]}
        />,
      );
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey");
      });

      findButton("See Twoey's progress").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Islands and Games");
      });
      expect(getPageText()).toContain("Meadow Isle, Year 1: open");
      expect(getPageText()).toContain(
        "Frost Isle, Year 2: open (their Home Island)",
      );
      expect(getPageText()).toContain("Sunscorch Sands, Year 3: locked");
      expect(getPageText()).toContain(
        "Bubble Bay: 11 of 19 Games unlocked (Popping bubbles, Fish count, Fair shares, Treasure map, Number word wizard, Most or least match, Hop past hundred, Heavy full quick, Coin and note counter, Days and months order, Flat shape spotter)",
      );
      const islands = document.querySelector(
        'section[aria-label="Twoey\'s Islands and Games"]',
      );
      expect(islands?.querySelectorAll("input, select, button")).toHaveLength(
        0,
      );
    });

    it("never asks a Teacher for a Child's birth month and year", async () => {
      const unborn = { ...twoey, birthMonth: null, birthYear: null };
      startFakeApi({
        "GET /api/school-children": () => json([unborn]),
        "GET /api/parents": () => json([jo]),
        [`GET /api/children/${twoey.id}/progress`]: () => json(unborn),
      });
      root.render(
        <TeacherSection
          section="teacher-year-groups"
          teachingYearGroups={[2]}
        />,
      );
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey");
      });

      findButton("See Twoey's progress").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Islands and Games");
      });
      expect(getPageText()).not.toContain("Save their birth month and year");
    });

    it("has nothing that can change a Child's play settings, even with their progress open", async () => {
      const requests = teacherApi();
      root.render(
        <TeacherSection
          section="teacher-year-groups"
          teachingYearGroups={[2]}
        />,
      );
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey");
      });

      findButton("See Twoey's progress").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey, Year 2 at Hillside Primary");
      });
      expect(getPageText()).toContain(
        "What they can play: Up to 30 minutes a day on each Family Device.",
      );

      const buttonLabels = Array.from(document.querySelectorAll("button")).map(
        ({ textContent }) => textContent,
      );
      expect(
        buttonLabels.filter((label) =>
          /limit|picture password|lock|unlock|subject|region|edit/i.test(label),
        ),
      ).toEqual([]);
      const progress = document.querySelector(
        'section[aria-label="A Child\'s progress"]',
      );
      expect(progress?.querySelectorAll("input, select, form")).toHaveLength(0);
      expect(
        requests.filter(
          ({ method, path }) =>
            method === "PUT" ||
            path.endsWith("/limits") ||
            path.endsWith("/picture-password"),
        ),
      ).toEqual([]);
      expect(requests).toContainEqual({
        method: "GET",
        path: `/api/children/${twoey.id}/progress`,
        body: undefined,
      });
    });

    it("asks a Family's Parents to agree before a Teacher's new adult joins it, with no Invite link to copy", async () => {
      const requests = startFakeApi({
        "GET /api/school-children": () => json([twoey]),
        "GET /api/parents": () => json([jo]),
        "POST /api/parents": () =>
          json(
            {
              userId: "a0a00000-0000-4000-8000-000000000009",
              invite: null,
              familyJoinRequest: { familyId: twoey.familyId },
            },
            201,
          ),
      });
      root.render(
        <TeacherSection section="teacher-parents" teachingYearGroups={[2]} />,
      );
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey (Year 2)");
      });
      const form = document.querySelector('form[aria-label="Add a Parent"]');
      const family = form?.querySelector('select[name="familyId"]');
      if (
        !(form instanceof HTMLFormElement) ||
        !(family instanceof HTMLSelectElement)
      ) {
        throw new Error("the page has no form to add a Parent");
      }
      expect(form.querySelector('input[value="link"]')).not.toBeNull();

      family.value = twoey.familyId;
      family.dispatchEvent(new Event("change", { bubbles: true }));
      await vi.waitFor(() => {
        expect(form.textContent).toContain(
          "The Family's Parents are asked to agree first.",
        );
      });
      expect(form.querySelector('input[value="link"]')).toBeNull();
      findInputNear("Their name").value = "Sam Second";
      findInputNear("Their email address").value = "sam@example.com";
      form.requestSubmit();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Wizzaroo has asked the Family's Parents to agree. Once one of them does, it emails the new adult their Invite.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/parents",
        body: {
          name: "Sam Second",
          email: "sam@example.com",
          familyId: twoey.familyId,
          invite: "email",
        },
      });
      expect(getPageText()).not.toContain("The Invite's link");
    });

    it("sends a Parent the password reset their Teacher asks for, and says so", async () => {
      const requests = teacherApi();
      root.render(
        <TeacherSection section="teacher-parents" teachingYearGroups={[2]} />,
      );
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey (Year 2)");
      });

      findButton("Send Jo Smith a password reset").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Wizzaroo has emailed Jo Smith a link to reset their password.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: `/api/people/${jo.userId}/password-resets`,
        body: undefined,
      });
      expect(getPageText()).not.toContain("Deactivate");
    });
  });

  describe("the Admin dashboard", () => {
    it("opens a Child's progress through the logged progress route", async () => {
      const requests = startFakeApi({
        "GET /api/school-children": () => json([twoey]),
        "GET /api/parents": () => json([jo]),
        "GET /api/schools": () => json([hillside]),
        [`GET /api/children/${twoey.id}/progress`]: () => json(twoey),
      });
      root.render(<AdminSection section="admin-children" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey");
      });

      findButton("Open Twoey's progress").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey, Year 2 at Hillside Primary");
      });
      expect(requests.filter(({ path }) => path.endsWith("/progress"))).toEqual(
        [
          {
            method: "GET",
            path: `/api/children/${twoey.id}/progress`,
            body: undefined,
          },
        ],
      );
    });

    it("gives a Child the Stars the Admin chooses, then shows their new balance", async () => {
      let stars = twoey.stars;
      const requests = startFakeApi({
        "GET /api/school-children": () => json([{ ...twoey, stars }]),
        "GET /api/parents": () => json([jo]),
        "GET /api/schools": () => json([hillside]),
        [`POST /api/admin/children/${twoey.id}/star-awards`]: (body) => {
          stars += 25;
          expect(body).toEqual({ stars: 25 });
          return noContent();
        },
      });
      root.render(<AdminSection section="admin-children" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey");
      });
      const starsCell = () =>
        document.querySelector('td[data-label="Stars"]')?.textContent;
      expect(starsCell()).toBe("4");

      const form = document.querySelector(
        'form[aria-label="Give Twoey Stars"]',
      );
      if (!(form instanceof HTMLFormElement)) {
        throw new Error("the page has no Star form for Twoey");
      }
      findInputNear("Stars for Twoey").value = "25";
      form.requestSubmit();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Gave Twoey 25 Stars.");
        expect(starsCell()).toBe("29");
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: `/api/admin/children/${twoey.id}/star-awards`,
        body: { stars: 25 },
      });
    });

    it("waits to give Stars to a Child until they have set up their Character, since only then can they spend them", async () => {
      startFakeApi({
        "GET /api/school-children": () =>
          json([{ ...twoey, characterName: null }]),
        "GET /api/parents": () => json([jo]),
        "GET /api/schools": () => json([hillside]),
      });
      root.render(<AdminSection section="admin-children" />);

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Stars once Twoey sets up their Character",
        );
      });
      expect(
        document.querySelector('form[aria-label="Give Twoey Stars"]'),
      ).toBeNull();
    });

    it("adds gold coins to a Family's chest and says how full it now is", async () => {
      const requests = startFakeApi({
        "GET /api/school-children": () => json([twoey]),
        "GET /api/parents": () => json([jo]),
        "GET /api/schools": () => json([hillside]),
        [`POST /api/admin/families/${twoey.familyId}/family-chest-coin-awards`]:
          () => json({ familyChestActivityCount: 12 }),
      });
      root.render(<AdminSection section="admin-children" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Add gold coins to a Family Chest");
      });

      const form = document.querySelector(
        'form[aria-label="Add gold coins to a Family Chest"]',
      );
      const family = form?.querySelector('select[name="familyId"]');
      if (
        !(form instanceof HTMLFormElement) ||
        !(family instanceof HTMLSelectElement)
      ) {
        throw new Error("the page has no gold coin form");
      }
      family.value = twoey.familyId;
      findInputNear("Gold coins").value = "7";
      form.requestSubmit();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "The Family of Jo Smith: added 7 gold coins, so their Family Chest now holds 12 of 30.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: `/api/admin/families/${twoey.familyId}/family-chest-coin-awards`,
        body: { coins: 7 },
      });
    });

    it("asks the Admin for the birth month and year of a Child who has none, the first time they open them", async () => {
      const unborn = { ...twoey, birthMonth: null, birthYear: null };
      let isBirthGiven = false;
      const requests = startFakeApi({
        "GET /api/school-children": () => json([twoey]),
        "GET /api/parents": () => json([jo]),
        "GET /api/schools": () => json([hillside]),
        [`GET /api/children/${twoey.id}/progress`]: () =>
          json(isBirthGiven ? twoey : unborn),
        [`PUT /api/children/${twoey.id}/birth`]: () => {
          isBirthGiven = true;
          return json(twoey);
        },
      });
      root.render(<AdminSection section="admin-children" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Twoey");
      });

      findButton("Open Twoey's progress").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Wizzaroo now works out Twoey's Year from their birth month and year",
        );
      });
      const month = document.querySelector('select[name="birthMonth"]');
      if (!(month instanceof HTMLSelectElement)) {
        throw new Error("the page has no birth month");
      }
      month.value = "3";
      findInputNear("Birth year").value = "2019";
      findButton("Save their birth month and year").click();

      await vi.waitFor(() => {
        expect(getPageText()).not.toContain("Save their birth month and year");
      });
      expect(requests).toContainEqual({
        method: "PUT",
        path: `/api/children/${twoey.id}/birth`,
        body: { birthMonth: 3, birthYear: 2019, yearGroupAdjustment: 0 },
      });
    });

    it("searches the Schools by name or town", async () => {
      startFakeApi({
        "GET /api/schools": () =>
          json([
            hillside,
            {
              ...hillside,
              id: "5c1e0000-0000-4000-8000-000000000009",
              name: "Brookside Infants",
              town: "York",
            },
          ]),
      });
      root.render(<AdminSection section="admin-schools" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Brookside Infants");
      });
      expect(
        document.querySelector("details.staff-add")?.hasAttribute("open"),
      ).toBe(false);

      const search = findInputNear("Search the Schools");
      // React tracks a controlled input's value, so it is set the way a browser would set it.
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(search, "york");
      search.dispatchEvent(new Event("input", { bubbles: true }));

      await vi.waitFor(() => {
        expect(getPageText()).not.toContain("Hillside Primary");
      });
      expect(getPageText()).toContain("Brookside Infants");
      expect(document.querySelector(".staff-count")?.textContent).toBe(
        "Showing 1 of 2 Schools",
      );

      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(search, "nowhere");
      search.dispatchEvent(new Event("input", { bubbles: true }));

      await vi.waitFor(() => {
        expect(getPageText()).toContain("No School matches that search.");
      });
    });

    it("opens the Add a School form straight away when there are no Schools yet, and keeps it shut otherwise", async () => {
      startFakeApi({ "GET /api/schools": () => json([]) });
      root.render(<AdminSection section="admin-schools" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("No Schools yet. Add the first one.");
      });
      expect(
        document.querySelector("details.staff-add")?.hasAttribute("open"),
      ).toBe(true);
    });

    it("says it is adding the School, with the button held, until the server answers", async () => {
      let schools: (typeof hillside)[] = [];
      const creation = holdAnswer(() => {
        schools = [hillside];
        return json({ id: hillside.id }, 201);
      });
      startFakeApi({
        "GET /api/schools": () => json(schools),
        "POST /api/schools": creation.answer,
      });
      root.render(<AdminSection section="admin-schools" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("No Schools yet. Add the first one.");
      });
      expect(getBusyLabels()).toEqual([]);
      const form = document.querySelector('form[aria-label="Add a School"]');
      if (!(form instanceof HTMLFormElement)) {
        throw new Error("the page has no Add a School form");
      }
      findInputNear("School name").value = "Hillside Primary";
      findInputNear("Town").value = "Leeds";
      form.requestSubmit();

      await vi.waitFor(() => {
        expect(getBusyLabels()).toEqual(["Adding Hillside Primary…"]);
      });
      expect(findButton("Add the School").disabled).toBe(true);
      expect(form.getAttribute("aria-busy")).toBe("true");

      creation.release();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Added Hillside Primary.");
      });
      expect(getBusyLabels()).toEqual([]);
      expect(findButton("Add the School").disabled).toBe(false);
      expect(form.getAttribute("aria-busy")).toBe("false");
    });

    it("shows why a School that still has Children can't be deleted", async () => {
      startFakeApi({
        "GET /api/schools": () => json([hillside]),
        [`DELETE /api/schools/${hillside.id}`]: () =>
          json(
            {
              statusCode: 409,
              message:
                "A School can be deleted only once it has no Teachers or Children. Move them first",
            },
            409,
          ),
      });
      root.render(<AdminSection section="admin-schools" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Hillside Primary");
      });

      findButton("Delete Hillside Primary").click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "A School can be deleted only once it has no Teachers or Children. Move them first.",
        );
      });
    });

    it("turns on Classmate visits at a School only once the Admin confirms its data processing agreement names them", async () => {
      let isApproved = false;
      const requests = startFakeApi({
        "GET /api/schools": () =>
          json([{ ...hillside, classmateVisitsApproved: isApproved }]),
        [`PUT /api/schools/${hillside.id}/classmate-visits`]: () => {
          isApproved = true;
          return json({ id: hillside.id, classmateVisitsApproved: true });
        },
      });
      root.render(<AdminSection section="admin-schools" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Hillside Primary");
      });

      findButton("Turn on Classmate visits Hillside Primary").click();
      await vi.waitFor(() => {
        findButton(
          "Yes, Hillside Primary's data processing agreement names Classmates' Rooms",
        );
      });
      expect(
        requests.some(({ path }) => path.endsWith("/classmate-visits")),
      ).toBe(false);
      findButton(
        "Yes, Hillside Primary's data processing agreement names Classmates' Rooms",
      ).click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Turned on Classmate visits at Hillside Primary.",
        );
      });
      expect(requests).toContainEqual({
        method: "PUT",
        path: `/api/schools/${hillside.id}/classmate-visits`,
        body: { classmateVisitsApproved: true },
      });
      await vi.waitFor(() => {
        findButton("Turn off Classmate visits Hillside Primary");
      });
    });

    it("turns Classmate visits off at a School straight away, with no confirming", async () => {
      const requests = startFakeApi({
        "GET /api/schools": () =>
          json([{ ...hillside, classmateVisitsApproved: true }]),
        [`PUT /api/schools/${hillside.id}/classmate-visits`]: () =>
          json({ id: hillside.id, classmateVisitsApproved: false }),
      });
      root.render(<AdminSection section="admin-schools" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Hillside Primary");
      });

      findButton("Turn off Classmate visits Hillside Primary").click();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/schools/${hillside.id}/classmate-visits`,
          body: { classmateVisitsApproved: false },
        });
      });
    });

    it("asks the Admin to name the School the migration made", async () => {
      const requests = startFakeApi({
        "GET /api/schools": () =>
          json([{ ...hillside, name: null, town: null }]),
        [`PUT /api/schools/${hillside.id}`]: () => json(hillside),
      });
      root.render(<AdminSection section="admin-schools" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Name the School your own Children were moved into",
        );
      });

      const form = document.querySelector(
        'form[aria-label="Name the School your own Children were moved into"]',
      );
      if (!(form instanceof HTMLFormElement)) {
        throw new Error("the page has no naming form");
      }
      const [nameInput, townInput] = Array.from(form.querySelectorAll("input"));
      nameInput.value = "Hillside Primary";
      townInput.value = "Leeds";
      form.requestSubmit();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/schools/${hillside.id}`,
          body: { name: "Hillside Primary", town: "Leeds" },
        });
      });
    });

    it("previews a Teachers spreadsheet, then creates its valid rows and emails their Invites by default", async () => {
      const csv =
        "name,email,school,year_groups\nAda,ada@x.example,Hillside Primary,1\nBad,nope,Hillside Primary,2\n";
      const requests = startFakeApi({
        "POST /api/bulk/teachers/preview": () =>
          json([
            { rowNumber: 2, summary: "Ada <ada@x.example>", problem: null },
            {
              rowNumber: 3,
              summary: "Bad <nope>",
              problem: '"nope" isn\'t an email address',
            },
          ]),
        "POST /api/bulk/teachers": () =>
          json(
            {
              createdRowCount: 1,
              skippedRows: [
                { rowNumber: 3, problem: '"nope" isn\'t an email address' },
              ],
              skippedRowsReport:
                'row,problem\r\n3,"""nope"" isn\'t an email address"\r\n',
              invitesEmailedCount: 1,
            },
            201,
          ),
      });
      root.render(<AdminSection section="admin-uploads" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Add Teachers from a spreadsheet");
      });

      const [teachersFileInput] = Array.from(
        document.querySelectorAll('input[type="file"]'),
      );
      if (!(teachersFileInput instanceof HTMLInputElement)) {
        throw new Error("the page has no file input");
      }
      chooseFile(
        teachersFileInput,
        new File([csv], "teachers.csv", { type: "text/csv" }),
      );

      await vi.waitFor(() => {
        expect(getPageText()).toContain("1 of 2 rows are ready.");
      });
      expect(getPageText()).toContain('"nope" isn\'t an email address');
      expect(findInputNear("Create and email Invites now").checked).toBe(true);
      expect(
        requests.filter(({ path }) => path === "/api/bulk/teachers"),
      ).toEqual([]);

      findButton("Create and email Invites now").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Created 1 Teachers and skipped 1.");
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/bulk/teachers",
        body: { csv, sendInvites: true },
      });
      const report = Array.from(document.querySelectorAll("a")).find(
        ({ textContent }) => textContent === "Download the skipped rows",
      );
      expect(report?.getAttribute("download")).toBe("skipped-rows.csv");
      expect(decodeURIComponent(report?.getAttribute("href") ?? "")).toContain(
        "isn't an email address",
      );
    });

    it("creates only, without Invites, when the Admin unticks the box", async () => {
      const requests = startFakeApi({
        "POST /api/bulk/families/preview": () =>
          json([{ rowNumber: 2, summary: "Mia", problem: null }]),
        "POST /api/bulk/families": () =>
          json(
            {
              createdRowCount: 1,
              skippedRows: [],
              skippedRowsReport: "row,problem\r\n",
              invitesEmailedCount: 0,
            },
            201,
          ),
      });
      root.render(
        <TeacherSection section="teacher-uploads" teachingYearGroups={[2]} />,
      );
      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Add Parents and Children from a spreadsheet",
        );
      });
      const fileInput = document.querySelector('input[type="file"]');
      if (!(fileInput instanceof HTMLInputElement)) {
        throw new Error("the page has no file input");
      }
      chooseFile(fileInput, new File(["child_name\nMia\n"], "f.csv"));
      await vi.waitFor(() => {
        expect(getPageText()).toContain("1 of 1 rows are ready.");
      });

      findInputNear("Create and email Invites now").click();
      await vi.waitFor(() => {
        findButton("Create only");
      });
      findButton("Create only").click();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "POST",
          path: "/api/bulk/families",
          body: { csv: "child_name\nMia\n", sendInvites: false },
        });
      });
      expect(getPageText()).not.toContain("Download the skipped rows");
    });

    it("shows a Parent whose uploaded Invite couldn't be emailed, with a new Invite to send (#293)", async () => {
      startFakeApi({
        "GET /api/parents": () =>
          json([{ ...jo, inviteStatus: "email-failed" }]),
        "GET /api/schools": () => json([hillside]),
      });
      root.render(<AdminSection section="admin-parents" />);

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Invite email not sent");
      });
      expect(getPageText()).toContain(`Send ${jo.name} a new Invite`);
    });

    it("puts an icon on every button", async () => {
      startFakeApi({
        "GET /api/school-children": () => json([twoey]),
        "GET /api/parents": () => json([jo]),
        "GET /api/schools": () => json([hillside]),
        "GET /api/teachers": () =>
          json([
            {
              ...jo,
              schoolId: hillside.id,
              schoolName: hillside.name,
              yearGroups: [2],
            },
          ]),
      });
      for (const section of [
        "admin-schools",
        "admin-teachers",
        "admin-parents",
        "admin-children",
        "admin-uploads",
      ] as const) {
        root.render(<AdminSection key={section} section={section} />);
        await vi.waitFor(() => {
          expect(document.querySelector(".busy")).toBeNull();
          expect(document.querySelectorAll("button").length).toBeGreaterThan(0);
        });
        const buttonsWithoutIcons = Array.from(
          document.querySelectorAll("button"),
        )
          .filter((button) => button.querySelector("svg") === null)
          .map(({ textContent }) => textContent);
        expect(buttonsWithoutIcons).toEqual([]);
      }
    });

    describe("pages", () => {
      const listParents = (count: number) =>
        Array.from({ length: count }, (_, index) => ({
          ...jo,
          userId: `a0a00000-0000-4000-8000-${String(index).padStart(12, "0")}`,
          name: `Parent ${String(index + 1)}`,
          email: `parent-${String(index + 1)}@example.com`,
        }));

      const countRows = () =>
        document.querySelectorAll("table.staff-table tbody tr").length;

      const findRangeText = () =>
        document.querySelector(".pagination-range")?.textContent;

      const findLabelledButton = (label: string): HTMLButtonElement => {
        const button = document.querySelector(`button[aria-label="${label}"]`);
        if (!(button instanceof HTMLButtonElement)) {
          throw new Error(`the page has no button labelled "${label}"`);
        }
        return button;
      };

      const choosePageSize = (pageSize: string) => {
        const select = document.querySelector(".pagination-size select");
        if (!(select instanceof HTMLSelectElement)) {
          throw new Error("the page has no page size to choose");
        }
        // React tracks a controlled select's value, so it is set the way a browser would set it.
        Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          "value",
        )?.set?.call(select, pageSize);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      };

      it("lists 25 Parents to a page, with first, previous, numbered, next and last pages", async () => {
        startFakeApi({
          "GET /api/parents": () => json(listParents(60)),
          "GET /api/schools": () => json([hillside]),
        });
        root.render(<AdminSection section="admin-parents" />);
        await vi.waitFor(() => {
          expect(findRangeText()).toBe("1–25 of 60 Parents");
        });
        expect(countRows()).toBe(25);
        expect(findLabelledButton("First page").disabled).toBe(true);
        expect(findLabelledButton("Previous page").disabled).toBe(true);
        expect(findLabelledButton("Page 1").getAttribute("aria-current")).toBe(
          "page",
        );

        findLabelledButton("Last page").click();

        await vi.waitFor(() => {
          expect(findRangeText()).toBe("51–60 of 60 Parents");
        });
        expect(countRows()).toBe(10);
        expect(getPageText()).toContain("Parent 60");
        expect(findLabelledButton("Next page").disabled).toBe(true);

        findLabelledButton("Previous page").click();

        await vi.waitFor(() => {
          expect(findRangeText()).toBe("26–50 of 60 Parents");
        });
      });

      it("shows 5, 10, 25, 50 or all the Parents a page, starting again from the first page", async () => {
        startFakeApi({
          "GET /api/parents": () => json(listParents(60)),
          "GET /api/schools": () => json([hillside]),
        });
        root.render(<AdminSection section="admin-parents" />);
        await vi.waitFor(() => findLabelledButton("Page 2"));
        expect(
          Array.from(
            document.querySelectorAll(".pagination-size option"),
            ({ textContent }) => textContent,
          ),
        ).toEqual(["5", "10", "25", "50", "All"]);
        findLabelledButton("Page 2").click();
        await vi.waitFor(() => {
          expect(findRangeText()).toBe("26–50 of 60 Parents");
        });

        choosePageSize("5");

        await vi.waitFor(() => {
          expect(findRangeText()).toBe("1–5 of 60 Parents");
        });
        expect(countRows()).toBe(5);
        expect(
          Array.from(
            document.querySelectorAll(".pagination-pages > *"),
            (element) => element.getAttribute("aria-label") ?? "gap",
          ),
        ).toEqual([
          "First page",
          "Previous page",
          "Page 1",
          "Page 2",
          "Page 3",
          "Page 4",
          "gap",
          "Page 12",
          "Next page",
          "Last page",
        ]);

        choosePageSize("all");

        await vi.waitFor(() => {
          expect(findRangeText()).toBe("All 60 Parents");
        });
        expect(countRows()).toBe(60);
        expect(document.querySelector(".pagination-pages")).toBeNull();
      });

      it("goes back to the first page when the search changes", async () => {
        startFakeApi({
          "GET /api/parents": () => json(listParents(60)),
          "GET /api/schools": () => json([hillside]),
        });
        root.render(<AdminSection section="admin-parents" />);
        await vi.waitFor(() => findLabelledButton("Page 2"));
        findLabelledButton("Page 2").click();
        await vi.waitFor(() => {
          expect(findRangeText()).toBe("26–50 of 60 Parents");
        });

        const search = findInputNear("Search the Parents");
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set?.call(search, "Parent 1");
        search.dispatchEvent(new Event("input", { bubbles: true }));

        await vi.waitFor(() => {
          expect(findRangeText()).toBe("All 11 Parents");
        });
        expect(getPageText()).toContain("Parent 1");
      });

      it("leaves out the page controls when there are too few to page through", async () => {
        startFakeApi({
          "GET /api/parents": () => json(listParents(5)),
          "GET /api/schools": () => json([hillside]),
        });
        root.render(<AdminSection section="admin-parents" />);
        await vi.waitFor(() => {
          expect(countRows()).toBe(5);
        });
        expect(document.querySelector(".pagination")).toBeNull();
      });

      it("pages the Teachers and the Children too", async () => {
        const teachers = Array.from({ length: 30 }, (_, index) => ({
          userId: `7ea00000-0000-4000-8000-${String(index).padStart(12, "0")}`,
          name: `Teacher ${String(index + 1)}`,
          email: `teacher-${String(index + 1)}@example.com`,
          lastLoginAt: null,
          inviteStatus: "accepted",
          deactivatedAt: null,
          schoolId: hillside.id,
          schoolName: hillside.name,
          yearGroups: [2],
        }));
        const children = Array.from({ length: 27 }, (_, index) => ({
          ...twoey,
          id: `c41d0000-0000-4000-8000-${String(index).padStart(12, "0")}`,
          nickname: `Child ${String(index + 1)}`,
        }));
        startFakeApi({
          "GET /api/teachers": () => json(teachers),
          "GET /api/school-children": () => json(children),
          "GET /api/parents": () => json([jo]),
          "GET /api/schools": () => json([hillside]),
        });
        root.render(<AdminSection section="admin-teachers" />);
        await vi.waitFor(() => {
          expect(findRangeText()).toBe("1–25 of 30 Teachers");
        });
        expect(countRows()).toBe(25);

        root.render(<AdminSection section="admin-children" />);
        await vi.waitFor(() => {
          expect(findRangeText()).toBe("1–25 of 27 Children");
        });
        expect(countRows()).toBe(25);
      });
    });
  });

  describe("the audit log", () => {
    const buildEntry = (index: number) => ({
      id: `e0e00000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      happenedAt: "2026-11-17T09:30:00.000Z",
      action: "sign-in.failed",
      actorType: "none",
      actorId: null,
      actorRoles: null,
      actorName: null,
      targetType: "user",
      targetId: jo.userId,
      detail: "password",
      ipAddress: "203.0.113.7",
    });

    const answerPage = (page: number, totalCount: number) => () =>
      json({
        entries: Array.from(
          { length: Math.min(50, totalCount - (page - 1) * 50) },
          (_, index) => buildEntry((page - 1) * 50 + index),
        ),
        page,
        pageSize: 50,
        totalCount,
      });

    it("asks the server for one page of 50 at a time and pages through them", async () => {
      const requests = startFakeApi({
        "GET /api/admin/audit-log-entries?page=1": answerPage(1, 120),
        "GET /api/admin/audit-log-entries?page=3": answerPage(3, 120),
      });
      root.render(<AdminSection section="admin-audit-log" />);
      await vi.waitFor(() => {
        expect(document.querySelector(".pagination-range")?.textContent).toBe(
          "1–50 of 120 entries",
        );
      });
      expect(getPageText()).toContain("Sign-in failed");
      expect(getPageText()).toContain("No one signed in");
      expect(getPageText()).toContain("203.0.113.7");
      expect(document.querySelector(".pagination-size")).toBeNull();

      document
        .querySelector<HTMLButtonElement>('button[aria-label="Last page"]')
        ?.click();

      await vi.waitFor(() => {
        expect(document.querySelector(".pagination-range")?.textContent).toBe(
          "101–120 of 120 entries",
        );
      });
      expect(requests.map(({ path }) => path)).toEqual([
        "/api/admin/audit-log-entries?page=1",
        "/api/admin/audit-log-entries?page=3",
      ]);
    });

    it("says which page of the audit log it is loading, with the page buttons held, until it arrives", async () => {
      const thirdPage = holdAnswer(answerPage(3, 120));
      startFakeApi({
        "GET /api/admin/audit-log-entries?page=1": answerPage(1, 120),
        "GET /api/admin/audit-log-entries?page=3": thirdPage.answer,
      });
      root.render(<AdminSection section="admin-audit-log" />);
      await vi.waitFor(() => {
        expect(document.querySelector(".pagination-range")?.textContent).toBe(
          "1–50 of 120 entries",
        );
      });
      expect(getBusyLabels()).toEqual([]);
      const lastPageButton = () =>
        document.querySelector<HTMLButtonElement>(
          'button[aria-label="Last page"]',
        );

      lastPageButton()?.click();

      await vi.waitFor(() => {
        expect(getBusyLabels()).toEqual(["Loading page 3 of the audit log…"]);
      });
      expect(lastPageButton()?.disabled).toBe(true);
      expect(
        document.querySelector<HTMLButtonElement>('button[aria-label="Page 2"]')
          ?.disabled,
      ).toBe(true);
      expect(
        document.querySelector(".paginated-list")?.getAttribute("aria-busy"),
      ).toBe("true");
      expect(document.querySelector(".pagination-range")?.textContent).toBe(
        "1–50 of 120 entries",
      );

      thirdPage.release();

      await vi.waitFor(() => {
        expect(document.querySelector(".pagination-range")?.textContent).toBe(
          "101–120 of 120 entries",
        );
      });
      expect(getBusyLabels()).toEqual([]);
      expect(
        document.querySelector<HTMLButtonElement>('button[aria-label="Page 2"]')
          ?.disabled,
      ).toBe(false);
    });

    it("filters by action and goes back to the first page", async () => {
      const requests = startFakeApi({
        "GET /api/admin/audit-log-entries?page=1": answerPage(1, 120),
        "GET /api/admin/audit-log-entries?page=1&action=child.deleted": () =>
          json({ entries: [], page: 1, pageSize: 50, totalCount: 0 }),
      });
      root.render(<AdminSection section="admin-audit-log" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Sign-in failed");
      });

      const select = document.querySelector(".audit-log-filter select");
      if (!(select instanceof HTMLSelectElement)) {
        throw new Error("the page has no action to choose");
      }
      // React tracks a controlled select's value, so it is set the way a browser would set it.
      Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )?.set?.call(select, "child.deleted");
      select.dispatchEvent(new Event("change", { bubbles: true }));

      await vi.waitFor(() => {
        expect(getPageText()).toContain("No entries match.");
      });
      expect(requests.at(-1)?.path).toBe(
        "/api/admin/audit-log-entries?page=1&action=child.deleted",
      );
    });

    it("names a deleted actor by id rather than leaving the row blank", async () => {
      startFakeApi({
        "GET /api/admin/audit-log-entries?page=1": () =>
          json({
            entries: [
              {
                ...buildEntry(0),
                action: "child.created",
                actorType: "user",
                actorId: jo.userId,
                actorRoles: ["parent"],
                targetType: "child",
                targetId: twoey.id,
                detail: null,
                ipAddress: null,
              },
            ],
            page: 1,
            pageSize: 50,
            totalCount: 1,
          }),
      });
      root.render(<AdminSection section="admin-audit-log" />);

      await vi.waitFor(() => {
        expect(getPageText()).toContain(`Deleted user ${jo.userId}`);
      });
      expect(getPageText()).toContain(`child ${twoey.id}`);
    });
  });
});
