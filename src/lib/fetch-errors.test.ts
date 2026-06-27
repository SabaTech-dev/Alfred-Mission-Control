import { describe, it, expect } from "vitest";

import { isAbortFetchError } from "./fetch-errors";

describe("isAbortFetchError", () => {
  it("returns true for a DOMException AbortError", () => {
    const error = new DOMException("The user aborted a request", "AbortError");
    expect(isAbortFetchError(error)).toBe(true);
  });

  it("returns true for a TypeError 'Failed to fetch' (navigation abort)", () => {
    const error = new TypeError("Failed to fetch");
    expect(isAbortFetchError(error)).toBe(true);
  });

  it("returns true for a TypeError containing 'fetch' (case-insensitive)", () => {
    const error = new TypeError("NetworkError when attempting to FETCH resource.");
    expect(isAbortFetchError(error)).toBe(true);
  });

  it("returns false for a generic TypeError unrelated to fetch", () => {
    const error = new TypeError("Cannot read properties of undefined");
    expect(isAbortFetchError(error)).toBe(false);
  });

  it("returns false for an HTTP Error thrown by application code", () => {
    const error = new Error("Telemetry request failed: 500");
    expect(isAbortFetchError(error)).toBe(false);
  });

  it("returns false for a JSON parse error", () => {
    const error = new SyntaxError("Unexpected token < in JSON");
    expect(isAbortFetchError(error)).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isAbortFetchError(undefined)).toBe(false);
    expect(isAbortFetchError(null)).toBe(false);
    expect(isAbortFetchError("string")).toBe(false);
    expect(isAbortFetchError({ message: "Failed to fetch" })).toBe(false);
  });
});
