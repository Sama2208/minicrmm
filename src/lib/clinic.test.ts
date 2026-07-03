import { describe, expect, it } from "vitest";
import { slugify } from "./clinic";

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Shifo Klinikasi")).toBe("shifo-klinikasi");
  });

  it("collapses repeated non-alphanumeric characters", () => {
    expect(slugify("Shifo   Klinikasi!!")).toBe("shifo-klinikasi");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  -Shifo-  ")).toBe("shifo");
  });

  it("keeps existing hyphens and digits", () => {
    expect(slugify("Klinika-2")).toBe("klinika-2");
  });
});
