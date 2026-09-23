import { describe, expect, it } from "vitest";
import { unsafeServiceHostname } from "./unsafe-service-host";

describe("literal outbound destinations", () => {
  it.each([
    "localhost", "localhost.", "media.localhost", "media.localhost.",
    "127.0.0.1", "127.0.0.2", "0.0.0.0",
    "[::1]", "[::]", "[::ffff:7f00:1]",
    "169.254.169.254", "169.254.0.1", "[fe80::1]", "[febf::1]",
  ])("rejects local, link-local or unspecified host %s", host => {
    expect(unsafeServiceHostname(host)).toBe(true);
  });

  it.each([
    "sms.example.com", "media.example.test", "10.0.0.8",
    "172.16.0.8", "192.168.1.8", "[fd00::1]", "[2001:db8::1]",
  ])("does not preclude genuine private infrastructure or ordinary vendor hosts %s", host => {
    expect(unsafeServiceHostname(host)).toBe(false);
  });
});
