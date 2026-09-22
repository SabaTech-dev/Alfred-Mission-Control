import { describe, it, expect } from "vitest";
import { sanitizeRedirect } from "./redirect-utils";

describe("sanitizeRedirect (F-A open redirect)", () => {
  it("allows same-origin relative paths", () => {
    expect(sanitizeRedirect("/dashboard")).toBe("/dashboard");
  });

  it("allows nested relative paths", () => {
    expect(sanitizeRedirect("/admin/system-health")).toBe("/admin/system-health");
  });

  it("rejects absolute external URLs", () => {
    expect(sanitizeRedirect("https://evil.example.com")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeRedirect("//evil.example.com")).toBe("/");
  });

  it("rejects backslash-based scheme bypasses", () => {
    expect(sanitizeRedirect("/\\evil.example.com")).toBe("/");
    expect(sanitizeRedirect("\\/evil.example.com")).toBe("/");
  });

  it("rejects javascript/data schemes", () => {
    expect(sanitizeRedirect("javascript:alert(1)")).toBe("/");
    expect(sanitizeRedirect("data:text/html,x")).toBe("/");
  });

  it("defaults empty or missing values to /", () => {
    expect(sanitizeRedirect(undefined)).toBe("/");
    expect(sanitizeRedirect("")).toBe("/");
  });
});
