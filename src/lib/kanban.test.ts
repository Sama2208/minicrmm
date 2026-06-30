import { describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS, initials, opColor, OP_COLORS } from "./kanban";

describe("opColor", () => {
  it("returns a colour from the palette", () => {
    expect(OP_COLORS).toContain(opColor("operator-1"));
  });
  it("is deterministic for the same id", () => {
    expect(opColor("abc-123")).toBe(opColor("abc-123"));
  });
  it("handles an empty id without throwing", () => {
    expect(OP_COLORS).toContain(opColor(""));
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Ali Valiyev")).toBe("AV");
  });
  it("uppercases the result", () => {
    expect(initials("ali valiyev")).toBe("AV");
  });
  it("works with a single word", () => {
    expect(initials("Ali")).toBe("A");
  });
  it("collapses extra whitespace", () => {
    expect(initials("  Ali   Valiyev  ")).toBe("AV");
  });
  it("returns a question mark for an empty name", () => {
    expect(initials("")).toBe("?");
  });
});

describe("DEFAULT_COLUMNS", () => {
  it("locks the first (yangi) column", () => {
    expect(DEFAULT_COLUMNS[0].key).toBe("yangi");
    expect(DEFAULT_COLUMNS[0].locked).toBe(true);
  });
  it("gives every column a status and title", () => {
    for (const col of DEFAULT_COLUMNS) {
      expect(col.status).toBeTruthy();
      expect(col.title).toBeTruthy();
    }
  });
});
