import { describe, it, expect } from "vitest";
import { validateCsrf } from "./csrf";

describe("validateCsrf", () => {
  it("allows GET requests without validation", () => {
    expect(validateCsrf("GET", null, null)).toBe(true);
    expect(validateCsrf("HEAD", null, null)).toBe(true);
    expect(validateCsrf("OPTIONS", null, null)).toBe(true);
  });

  it("rejects POST with no origin or referer", () => {
    expect(validateCsrf("POST", null, null)).toBe(false);
  });

  it("rejects PUT with no origin or referer", () => {
    expect(validateCsrf("PUT", null, null)).toBe(false);
  });

  it("rejects DELETE with no origin or referer", () => {
    expect(validateCsrf("DELETE", null, null)).toBe(false);
  });

  it("allows POST with matching localhost origin", () => {
    expect(validateCsrf("POST", "http://localhost:3000", null)).toBe(true);
  });

  it("allows POST with matching 127.0.0.1 origin", () => {
    expect(validateCsrf("POST", "http://127.0.0.1:3000", null)).toBe(true);
  });

  it("rejects POST with external origin", () => {
    expect(validateCsrf("POST", "https://evil.com", null)).toBe(false);
  });

  it("falls back to referer when origin is missing", () => {
    expect(validateCsrf("POST", null, "http://localhost:3000/some-page")).toBe(true);
  });

  it("rejects POST with external referer", () => {
    expect(validateCsrf("POST", null, "https://evil.com/page")).toBe(false);
  });
});
