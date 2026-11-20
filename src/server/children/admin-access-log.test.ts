import { describe, expect, it } from "vitest";
import { listAdminAccessLogRows } from "./admin-access-log.js";
import { adminAccessServedKinds } from "./admin-access-served.js";

describe("the Admin access log rows for a reply", () => {
  const adminUserId = "0b0f7b1e-0000-4000-8000-00000000ad01";
  const childIds = [
    "0b0f7b1e-0000-4000-8000-0000000c0001",
    "0b0f7b1e-0000-4000-8000-0000000c0002",
  ];
  const served = "child-progress.opened";

  it("names the signed-in Admin and what the reply served them once for each Child whose data it serves", () => {
    expect(
      listAdminAccessLogRows(
        { userId: adminUserId, isAdmin: true },
        served,
        childIds,
      ),
    ).toEqual([
      { adminUserId, childId: childIds[0], served },
      { adminUserId, childId: childIds[1], served },
    ]);
  });

  it("names each Child once, however many times the reply serves them", () => {
    expect(
      listAdminAccessLogRows({ userId: adminUserId, isAdmin: true }, served, [
        childIds[0],
        childIds[1],
        childIds[0],
      ]),
    ).toEqual([
      { adminUserId, childId: childIds[0], served },
      { adminUserId, childId: childIds[1], served },
    ]);
  });

  it("records what each reply path served, so a list or a change can be told from a progress read", () => {
    expect(
      adminAccessServedKinds.map((kind) =>
        listAdminAccessLogRows({ userId: adminUserId, isAdmin: true }, kind, [
          childIds[0],
        ]).map((row) => row.served),
      ),
    ).toEqual(adminAccessServedKinds.map((kind) => [kind]));
  });

  it("writes nothing for a reply that serves the Admin no Child", () => {
    expect(
      listAdminAccessLogRows(
        { userId: adminUserId, isAdmin: true },
        served,
        [],
      ),
    ).toEqual([]);
  });

  it("writes nothing for a Teacher or a Parent, whose reads aren't logged", () => {
    expect(
      listAdminAccessLogRows(
        { userId: "0b0f7b1e-0000-4000-8000-0000000000e1", isAdmin: false },
        served,
        childIds,
      ),
    ).toEqual([]);
  });
});
