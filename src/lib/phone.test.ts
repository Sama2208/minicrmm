import { describe, expect, it } from "vitest";
import { formatUzPhone, isValidUzPhone, normalizeUzPhone, stripPhone } from "./phone";

describe("stripPhone", () => {
  it("removes spaces, plus and punctuation", () => {
    expect(stripPhone("+998 90 123-45-67")).toBe("998901234567");
  });
  it("returns empty string for input without digits", () => {
    expect(stripPhone("salom")).toBe("");
  });
});

describe("normalizeUzPhone", () => {
  it("normalizes a full E.164 number", () => {
    expect(normalizeUzPhone("+998901234567")).toBe("+998901234567");
  });
  it("normalizes a number with spaces and dashes", () => {
    expect(normalizeUzPhone("+998 90 123 45 67")).toBe("+998901234567");
  });
  it("adds country code to a 9-digit national number", () => {
    expect(normalizeUzPhone("901234567")).toBe("+998901234567");
  });
  it("strips a leading domestic 8 prefix", () => {
    expect(normalizeUzPhone("8 90 123 45 67")).toBe("+998901234567");
  });
  it("accepts a 998-prefixed number without plus", () => {
    expect(normalizeUzPhone("998901234567")).toBe("+998901234567");
  });
  it("rejects too-short numbers", () => {
    expect(normalizeUzPhone("12345")).toBeNull();
  });
  it("rejects too-long numbers", () => {
    expect(normalizeUzPhone("9989012345678888")).toBeNull();
  });
  it("rejects numbers with the wrong country code", () => {
    expect(normalizeUzPhone("+1 202 555 0173")).toBeNull();
  });
  it("returns null for empty input", () => {
    expect(normalizeUzPhone("")).toBeNull();
  });
});

describe("isValidUzPhone", () => {
  it("is true for a valid number", () => {
    expect(isValidUzPhone("+998 90 123 45 67")).toBe(true);
  });
  it("is false for an invalid number", () => {
    expect(isValidUzPhone("123")).toBe(false);
  });
});

describe("formatUzPhone", () => {
  it("formats a valid number into grouped form", () => {
    expect(formatUzPhone("998901234567")).toBe("+998 90 123 45 67");
  });
  it("returns the raw input when it cannot be normalized", () => {
    expect(formatUzPhone("abc")).toBe("abc");
  });
});
