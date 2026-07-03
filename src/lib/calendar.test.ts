import { describe, expect, it } from "vitest";
import { buildMonthGrid, groupByDateKey, toDateKey } from "./calendar";

describe("toDateKey", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(toDateKey(new Date(2026, 6, 3))).toBe("2026-07-03");
  });
  it("zero-pads month and day", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("buildMonthGrid", () => {
  it("returns a number of cells that is a multiple of 7", () => {
    const grid = buildMonthGrid(2026, 6); // July 2026
    expect(grid.length % 7).toBe(0);
  });

  it("starts the grid on a Monday and ends on a Sunday", () => {
    const grid = buildMonthGrid(2026, 6);
    expect(grid[0].date.getDay()).toBe(1);
    expect(grid[grid.length - 1].date.getDay()).toBe(0);
  });

  it("contains consecutive calendar days with no gaps", () => {
    const grid = buildMonthGrid(2026, 6);
    for (let i = 1; i < grid.length; i++) {
      const diffMs = grid[i].date.getTime() - grid[i - 1].date.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("marks exactly the days that belong to the requested month", () => {
    const grid = buildMonthGrid(2026, 6); // July has 31 days
    const inMonth = grid.filter((d) => d.inCurrentMonth);
    expect(inMonth.length).toBe(31);
    expect(inMonth[0].date.getDate()).toBe(1);
    expect(inMonth[inMonth.length - 1].date.getDate()).toBe(31);
  });

  it("flags today when it falls within the requested month", () => {
    const today = new Date(2026, 6, 15);
    const grid = buildMonthGrid(2026, 6, today);
    const flagged = grid.filter((d) => d.isToday);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].key).toBe("2026-07-15");
  });

  it("flags no day as today when today is far outside the requested month", () => {
    const today = new Date(2026, 9, 15); // October — nowhere near the July grid's padding days
    const grid = buildMonthGrid(2026, 6, today); // July grid
    expect(grid.some((d) => d.isToday)).toBe(false);
  });
});

describe("groupByDateKey", () => {
  it("groups items by their date key", () => {
    const items = [
      { id: 1, date: "2026-07-01" },
      { id: 2, date: "2026-07-01" },
      { id: 3, date: "2026-07-02" },
    ];
    const grouped = groupByDateKey(items, (i) => i.date);
    expect(grouped.get("2026-07-01")).toHaveLength(2);
    expect(grouped.get("2026-07-02")).toHaveLength(1);
  });

  it("skips items with a null or undefined key", () => {
    const items = [
      { id: 1, date: "2026-07-01" },
      { id: 2, date: null },
      { id: 3, date: undefined },
    ];
    const grouped = groupByDateKey(items, (i) => i.date);
    expect(grouped.size).toBe(1);
    expect(grouped.get("2026-07-01")).toHaveLength(1);
  });
});
