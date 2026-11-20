import { drizzle } from "drizzle-orm/node-postgres";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import { afterAll, describe, expect, it } from "vitest";
import { hashSecretToken } from "../auth/secret-token.js";
import {
  buildFamilyDeviceContact,
  buildFamilyDeviceLookup,
  familyDeviceContactRefreshSeconds,
  familyDeviceCookieName,
  familyDeviceLifetimeDays,
  setFamilyDeviceCookie,
} from "./signed-in-family-device.js";

const unreachableDatabaseUrl = "postgres://wizzaroo@127.0.0.1:1/wizzaroo";

describe("a Family Device's credential", () => {
  const database = drizzle({
    connection: { connectionString: unreachableDatabaseUrl },
  });

  afterAll(async () => {
    await database.$client.end();
  });

  it("is found only while unrevoked and in contact within its lifetime, and says whether this contact, when and from where, is already on record", () => {
    const token = "a Family Device's token";
    const ipAddress = "203.0.113.41";

    const { sql, params } = buildFamilyDeviceLookup(
      database,
      token,
      ipAddress,
    ).toSQL();

    expect(sql).toMatch(
      /^select "id", "family_id", \("last_seen_at" > now\(\)/,
    );
    expect(sql).toContain('"last_seen_from" is not distinct from $');
    expect(sql).toContain('"family_devices"."token_hash" = $');
    expect(sql).toContain('"family_devices"."revoked_at" is null');
    expect(sql).toMatch(
      /"family_devices"\."last_seen_at" > now\(\) - make_interval\(days => \$\d+\)/,
    );
    expect(params).toContain(hashSecretToken(token));
    expect(params).toContain(familyDeviceLifetimeDays);
    expect(params).toContain(familyDeviceContactRefreshSeconds);
    expect(params).toContain(ipAddress);
    expect(params).not.toContain(token);
  });

  it("records a contact as the last, when and from where, only while the device is still signed in", () => {
    const { sql, params } = buildFamilyDeviceContact(
      database,
      "a Family Device's id",
      "203.0.113.41",
    ).toSQL();

    expect(sql).toMatch(
      /^update "family_devices" set "last_seen_at" = now\(\), "last_seen_from" = \$1/,
    );
    expect(sql).toContain('"family_devices"."id" = $');
    expect(sql).toContain('"family_devices"."revoked_at" is null');
    expect(params).toEqual(
      expect.arrayContaining(["a Family Device's id", "203.0.113.41"]),
    );
  });

  it("gives the browser the same lifetime the server holds it to", async () => {
    const server = Fastify();
    await server.register(fastifyCookie);
    server.get("/", (_request, reply) => {
      setFamilyDeviceCookie(reply, "a token");
      return reply.send();
    });

    const response = await server.inject({ method: "GET", url: "/" });
    await server.close();

    expect(familyDeviceLifetimeDays).toBe(400);
    expect(response.cookies).toEqual([
      expect.objectContaining({
        name: familyDeviceCookieName,
        maxAge: familyDeviceLifetimeDays * 86_400,
      }),
    ]);
  });
});
