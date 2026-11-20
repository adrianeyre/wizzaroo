import { describe, expect, it } from "vitest";
import { findClientIpAddress, isFromTunnelProxy } from "./audit-log.js";

const tunnelProxyAddress = "172.30.0.2";
const callerAddress = "203.0.113.20";

describe("findClientIpAddress", () => {
  it("believes CF-Connecting-IP from the named proxy's socket", () => {
    expect(
      findClientIpAddress({
        ip: tunnelProxyAddress,
        headers: { "cf-connecting-ip": callerAddress },
        server: { tunnelProxyAddress },
      }),
    ).toBe(callerAddress);
  });

  it("records the socket's own address from any other socket, whatever CF-Connecting-IP names (#332)", () => {
    for (const ip of ["127.0.0.1", "172.30.0.3", "::1"]) {
      expect(
        findClientIpAddress({
          ip,
          headers: { "cf-connecting-ip": callerAddress },
          server: { tunnelProxyAddress },
        }),
      ).toBe(ip);
    }
  });

  it("believes CF-Connecting-IP from no socket while no proxy is named, as in development", () => {
    for (const ip of [tunnelProxyAddress, "127.0.0.1"]) {
      expect(
        findClientIpAddress({
          ip,
          headers: { "cf-connecting-ip": callerAddress },
          server: { tunnelProxyAddress: null },
        }),
      ).toBe(ip);
    }
  });

  it("records the proxy's own address when it sends no CF-Connecting-IP, or one that isn't an address", () => {
    for (const headers of [
      {},
      { "cf-connecting-ip": "'; drop table users; --" },
      { "cf-connecting-ip": [callerAddress, callerAddress] },
    ]) {
      expect(
        findClientIpAddress({
          ip: tunnelProxyAddress,
          headers,
          server: { tunnelProxyAddress },
        }),
      ).toBe(tunnelProxyAddress);
    }
  });
});

describe("isFromTunnelProxy", () => {
  it("knows the proxy's IPv4 address however the socket writes it", () => {
    expect(isFromTunnelProxy("::ffff:172.30.0.2", tunnelProxyAddress)).toBe(
      true,
    );
    expect(isFromTunnelProxy(tunnelProxyAddress, "::ffff:172.30.0.2")).toBe(
      true,
    );
    expect(isFromTunnelProxy("::ffff:172.30.0.20", tunnelProxyAddress)).toBe(
      false,
    );
  });

  it("is never true while no proxy is named", () => {
    expect(isFromTunnelProxy(tunnelProxyAddress, null)).toBe(false);
  });
});
