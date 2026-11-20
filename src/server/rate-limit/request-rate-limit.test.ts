import { describe, expect, it } from "vitest";
import {
  buildEmailAddressKey,
  buildIpAddressKey,
  buildRequestRateLimits,
  checkPerIpAddressLimit,
  findRequestRateKey,
  SlidingWindowLimiter,
  TooManyRequestsError,
} from "./request-rate-limit.js";
import type {
  RequestRateLimit,
  RequestRatePolicy,
} from "./request-rate-policy.js";

const minuteMs = 60_000;

// Made-up figures, so this file carries no copy of the policy pen-testing.md sets.
const madeUpLimit: RequestRateLimit = {
  windowMs: 10 * minuteMs,
  requestsPerWindow: 4,
  burst: 2,
  burstWindowMs: minuteMs,
};

const buildClock = (startMs = 1_000_000) => {
  let nowMs = startMs;
  return {
    clock: () => nowMs,
    advance: (byMs: number) => {
      nowMs += byMs;
    },
  };
};

describe("SlidingWindowLimiter", () => {
  it("lets a burst through in one minute, refuses the next, and lets more through a minute later", () => {
    const { clock, advance } = buildClock();
    const limiter = new SlidingWindowLimiter(madeUpLimit, clock);

    const firstMinute = [
      limiter.take("a"),
      limiter.take("a"),
      limiter.take("a"),
    ];
    advance(minuteMs);
    const secondMinute = [limiter.take("a"), limiter.take("a")];

    expect(firstMinute).toEqual(["allowed", "allowed", "first-refusal"]);
    expect(secondMinute).toEqual(["allowed", "allowed"]);
  });

  it("refuses past the window's count until the oldest request leaves the window", () => {
    const { clock, advance } = buildClock();
    const limiter = new SlidingWindowLimiter(madeUpLimit, clock);
    const answers: string[] = [];

    for (let minute = 0; minute < 5; minute += 1) {
      answers.push(limiter.take("a"));
      advance(minuteMs);
    }
    advance(4 * minuteMs);
    const justBeforeTheFirstLeaves = limiter.take("a");
    advance(minuteMs);
    const onceTheFirstHasLeft = limiter.take("a");

    expect(answers).toEqual([
      "allowed",
      "allowed",
      "allowed",
      "allowed",
      "first-refusal",
    ]);
    expect(justBeforeTheFirstLeaves).toBe("refused");
    expect(onceTheFirstHasLeft).toBe("allowed");
  });

  it("says first-refusal once for each run of refusals, and again after a request is let through", () => {
    const { clock, advance } = buildClock();
    const limiter = new SlidingWindowLimiter(madeUpLimit, clock);

    limiter.take("a");
    limiter.take("a");
    const firstRun = [limiter.take("a"), limiter.take("a"), limiter.take("a")];
    advance(minuteMs);
    limiter.take("a");
    limiter.take("a");
    const secondRun = [limiter.take("a"), limiter.take("a")];

    expect(firstRun).toEqual(["first-refusal", "refused", "refused"]);
    expect(secondRun).toEqual(["first-refusal", "refused"]);
  });

  it("takes back a key's newest request when given back, so a request that didn't count leaves room for another", () => {
    const { clock } = buildClock();
    const limiter = new SlidingWindowLimiter(madeUpLimit, clock);

    limiter.take("a");
    limiter.take("a");
    limiter.giveBack("a");
    limiter.giveBack("never-taken");

    expect(limiter.take("a")).toBe("allowed");
    expect(limiter.take("a")).toBe("first-refusal");
  });

  it("counts each key on its own", () => {
    const { clock } = buildClock();
    const limiter = new SlidingWindowLimiter(madeUpLimit, clock);

    limiter.take("a");
    limiter.take("a");

    expect(limiter.take("a")).toBe("first-refusal");
    expect(limiter.take("b")).toBe("allowed");
  });

  it("forgets keys with nothing left in their window, once a window has passed", () => {
    const { clock, advance } = buildClock();
    const limiter = new SlidingWindowLimiter(madeUpLimit, clock);

    for (let key = 0; key < 50; key += 1) {
      limiter.take(`key-${String(key)}`);
    }
    const keysInTheWindow = limiter.keyCount;
    advance(madeUpLimit.windowMs);
    limiter.take("a-later-key");

    expect(keysInTheWindow).toBe(50);
    expect(limiter.keyCount).toBe(1);
  });
});

describe("buildIpAddressKey", () => {
  it.each([
    { address: "203.0.113.20", key: "203.0.113.20" },
    { address: "::ffff:203.0.113.20", key: "203.0.113.20" },
    { address: "2001:db8:1:2:3:4:5:6", key: "2001:db8:1:2::/64" },
    { address: "2001:db8:1:2:ffff::1", key: "2001:db8:1:2::/64" },
    { address: "2001:0DB8:0001:0002::", key: "2001:db8:1:2::/64" },
    { address: "2001:db8::1", key: "2001:db8:0:0::/64" },
    { address: "::1", key: "0:0:0:0::/64" },
    { address: "64:ff9b::192.0.2.1", key: "64:ff9b:0:0::/64" },
    { address: "fe80::1%eth0", key: "fe80:0:0:0::/64" },
  ])("keys $address on $key", ({ address, key }) => {
    expect(buildIpAddressKey(address)).toBe(key);
  });

  it("puts two addresses in one /64 in one bucket, and the next /64 in another", () => {
    expect(buildIpAddressKey("2001:db8:a:b::1")).toBe(
      buildIpAddressKey("2001:db8:a:b:9:8:7:6"),
    );
    expect(buildIpAddressKey("2001:db8:a:b::1")).not.toBe(
      buildIpAddressKey("2001:db8:a:c::1"),
    );
  });
});

describe("buildEmailAddressKey", () => {
  it("keys an address on its SHA-256, so the counters hold no addresses", () => {
    expect(buildEmailAddressKey("parent@example.com")).toBe(
      "ee9cd2a3ead6d5cc3b5b0bc3cb19592544d1abf56500a5d9eb87129220ea9236",
    );
    expect(buildEmailAddressKey("parent@example.com")).not.toBe(
      buildEmailAddressKey("other@example.com"),
    );
  });
});

describe("findRequestRateKey", () => {
  const throughTheTunnel = { tunnelProxyAddress: "172.30.0.2" };

  it("keys on the address the Audit Log records", () => {
    expect(
      findRequestRateKey({
        ip: "172.30.0.2",
        headers: { "cf-connecting-ip": "2001:db8:5:6::9" },
        server: throughTheTunnel,
      }),
    ).toBe("2001:db8:5:6::/64");
    expect(
      findRequestRateKey({
        ip: "127.0.0.1",
        headers: {},
        server: throughTheTunnel,
      }),
    ).toBe("127.0.0.1");
  });

  it("keys a caller from any socket but the named proxy's on that socket, whatever CF-Connecting-IP it names (#332)", () => {
    expect(
      findRequestRateKey({
        ip: "127.0.0.1",
        headers: { "cf-connecting-ip": "192.0.2.40" },
        server: throughTheTunnel,
      }),
    ).toBe("127.0.0.1");
  });
});

describe("checkPerIpAddressLimit", () => {
  const madeUpPolicy: RequestRatePolicy = {
    perIpAddress: madeUpLimit,
    perAccount: {
      failedSignIns: madeUpLimit,
      pendingSignIns: madeUpLimit,
      resetRequests: madeUpLimit,
    },
  };

  it("refuses a caller's address with the one 429 once it is over the limit, and lets another address through", () => {
    const { clock } = buildClock();
    const limits = buildRequestRateLimits(madeUpPolicy, clock);
    const warnings: string[] = [];
    const from = (address: string) =>
      checkPerIpAddressLimit(limits, {
        ip: "172.30.0.2",
        headers: { "cf-connecting-ip": address },
        server: { tunnelProxyAddress: "172.30.0.2" },
        log: {
          warn: (message: string) => {
            warnings.push(message);
          },
        },
      });

    const letThrough = [from("203.0.113.20"), from("203.0.113.20")];
    const refused = [from("203.0.113.20"), from("203.0.113.20")];
    const otherAddress = from("203.0.113.21");

    expect(letThrough).toEqual([undefined, undefined]);
    expect(refused).toEqual([
      new TooManyRequestsError(),
      new TooManyRequestsError(),
    ]);
    expect(refused.map((refusal) => refusal?.statusCode)).toEqual([429, 429]);
    expect(otherAddress).toBeUndefined();
    expect(warnings).toEqual([
      "request-rate.ip-address-limited",
      "request-rate.ip-address-limited",
    ]);
  });
});
