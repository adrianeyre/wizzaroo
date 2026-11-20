import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { users } from "../schema.js";
import {
  findInviteStatus,
  userHasLogin,
  userHasLoginWithinReach,
} from "./invites.js";

const moment = new Date("2026-11-17T12:00:00Z");
const tomorrow = new Date("2026-11-18T12:00:00Z");
const yesterday = new Date("2026-11-16T12:00:00Z");

const render = (query: Parameters<PgDialect["sqlToQuery"]>[0]): string =>
  new PgDialect().sqlToQuery(query).sql.replace(/\s+/g, " ");

describe("findInviteStatus", () => {
  it("shows an adult with a login as accepted, even with an Invite outstanding, so staff aren't offered one to send", () => {
    expect(
      findInviteStatus({ hasLogin: true, latestInvite: null }, moment),
    ).toBe("accepted");
    expect(
      findInviteStatus(
        {
          hasLogin: true,
          latestInvite: { expiresAt: tomorrow, isEmailFailed: false },
        },
        moment,
      ),
    ).toBe("accepted");
  });

  it("shows an adult with no login by their latest Invite", () => {
    expect(
      findInviteStatus({ hasLogin: false, latestInvite: null }, moment),
    ).toBe("not-sent");
    expect(
      findInviteStatus(
        {
          hasLogin: false,
          latestInvite: { expiresAt: tomorrow, isEmailFailed: false },
        },
        moment,
      ),
    ).toBe("pending");
    expect(
      findInviteStatus(
        {
          hasLogin: false,
          latestInvite: { expiresAt: yesterday, isEmailFailed: false },
        },
        moment,
      ),
    ).toBe("expired");
  });

  it("shows an Invite whose email failed as such, pending or not, so staff send a new one", () => {
    for (const expiresAt of [tomorrow, yesterday]) {
      expect(
        findInviteStatus(
          { hasLogin: false, latestInvite: { expiresAt, isEmailFailed: true } },
          moment,
        ),
      ).toBe("email-failed");
    }
  });
});

describe("userHasLogin", () => {
  const rendered = render(userHasLogin(users.id));

  it("counts a password, a passkey and an Invite once accepted as a login", () => {
    expect(rendered).toContain(
      `select from "users" "login_users" where "login_users"."id" = "users"."id" and "login_users"."password_hash" is not null`,
    );
    expect(rendered).toContain(
      `select from "passkeys" "login_passkeys" where "login_passkeys"."user_id" = "users"."id"`,
    );
    expect(rendered).toContain(
      `select from "invites" "accepted_invites" where "accepted_invites"."user_id" = "users"."id" and "accepted_invites"."accepted_at" is not null`,
    );
  });

  it("reads the adult's own rows through aliases, so a query over users or invites can't answer for its own row instead", () => {
    expect(rendered).not.toMatch(/"users"\."id" = "users"\."id"/);
    expect(rendered).not.toMatch(/"invites"\."user_id" = "users"\."id"/);
  });

  it("names every column's table in a select list over users alone, where Drizzle leaves a column's table off, as createInvite asks it", () => {
    const query = drizzle
      .mock()
      .select({ hasLogin: userHasLogin(users.id) })
      .from(users)
      .where(eq(users.id, "e2000000-0000-4000-8000-ad0000000021"))
      .toSQL()
      .sql.replace(/\s+/g, " ");
    expect(query).toBe(
      `select (exists (select from "users" "login_users" where "login_users"."id" = "users"."id" and "login_users"."password_hash" is not null) or exists (select from "passkeys" "login_passkeys" where "login_passkeys"."user_id" = "users"."id") or exists (select from "invites" "accepted_invites" where "accepted_invites"."user_id" = "users"."id" and "accepted_invites"."accepted_at" is not null)) from "users" where "users"."id" = $1`,
    );
  });
});

describe("userHasLoginWithinReach", () => {
  it("asks the database, whose answer a Teacher's reach can see for an adult it shows them", () => {
    expect(render(userHasLoginWithinReach(users.id))).toBe(
      `wizzaroo_user_has_login("users"."id")`,
    );
  });

  it("names the adult's table in a select list over users alone, so it never asks about another column", () => {
    const query = drizzle
      .mock()
      .select({ hasLogin: userHasLoginWithinReach(users.id) })
      .from(users)
      .toSQL().sql;
    expect(query).toBe(
      `select wizzaroo_user_has_login("users"."id") from "users"`,
    );
  });
});
