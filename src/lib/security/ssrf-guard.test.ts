import { describe, it, expect } from "vitest";
import { isPrivateIP } from "./ssrf-guard";

describe("ssrf-guard", () => {
  it("blocks loopback addresses", () => {
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("localhost")).toBe(true);
    expect(isPrivateIP("::1")).toBe(true);
  });

  it("blocks private ranges", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true);
    expect(isPrivateIP("192.168.1.1")).toBe(true);
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("172.31.255.255")).toBe(true);
  });

  it("blocks link-local and metadata endpoints", () => {
    expect(isPrivateIP("169.254.169.254")).toBe(true);
    expect(isPrivateIP("169.254.0.1")).toBe(true);
  });

  it("allows public addresses", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("github.com")).toBe(false);
    expect(isPrivateIP("93.184.216.34")).toBe(false);
  });

  it("blocks carrier-grade NAT", () => {
    expect(isPrivateIP("100.64.0.1")).toBe(true);
  });
});
