import { describe, expect, it } from "vitest";
import {
  formatDate,
  SOURCE_LABEL,
  SOURCE_LIST,
  STATUS_BADGE,
  STATUS_LABEL,
  STATUS_ORDER,
} from "./crm";

describe("formatDate", () => {
  it("formats an ISO date as DD.MM.YYYY", () => {
    expect(formatDate("2026-06-30T10:00:00.000Z")).toBe("30.06.2026");
  });
  it("zero-pads day and month", () => {
    expect(formatDate("2026-01-05T00:00:00.000Z")).toBe("05.01.2026");
  });
  it("returns a dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });
  it("returns a dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });
  it("returns a dash for an invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("status metadata", () => {
  it("has a label for every status in the order list", () => {
    for (const status of STATUS_ORDER) {
      expect(STATUS_LABEL[status]).toBeTruthy();
    }
  });
  it("has a badge style for every status in the order list", () => {
    for (const status of STATUS_ORDER) {
      expect(STATUS_BADGE[status]).toBeTruthy();
    }
  });
  it("keeps STATUS_ORDER and STATUS_LABEL in sync", () => {
    expect(STATUS_ORDER.length).toBe(Object.keys(STATUS_LABEL).length);
  });
});

describe("source metadata", () => {
  it("has a label for every source in the list", () => {
    for (const source of SOURCE_LIST) {
      expect(SOURCE_LABEL[source]).toBeTruthy();
    }
  });
});
