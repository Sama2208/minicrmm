import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv, type CsvColumn } from "./csv";

describe("escapeCsvCell", () => {
  it("returns empty string for null and undefined", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });
  it("leaves a plain value untouched", () => {
    expect(escapeCsvCell("Ali")).toBe("Ali");
    expect(escapeCsvCell(42)).toBe("42");
  });
  it("quotes values that contain a comma", () => {
    expect(escapeCsvCell("Toshkent, Yunusobod")).toBe('"Toshkent, Yunusobod"');
  });
  it("quotes and doubles inner quotes", () => {
    expect(escapeCsvCell('he said "hi"')).toBe('"he said ""hi"""');
  });
  it("quotes values that contain a newline", () => {
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("toCsv", () => {
  type Row = { name: string; phone: string; note: string | null };
  const columns: CsvColumn<Row>[] = [
    { header: "Ism", value: (r) => r.name },
    { header: "Telefon", value: (r) => r.phone },
    { header: "Izoh", value: (r) => r.note },
  ];

  it("builds a header row from the column definitions", () => {
    expect(toCsv([], columns)).toBe("Ism,Telefon,Izoh");
  });

  it("renders one CRLF-separated line per row", () => {
    const rows: Row[] = [
      { name: "Ali", phone: "+998901234567", note: null },
      { name: "Vali", phone: "+998907654321", note: "muhim" },
    ];
    expect(toCsv(rows, columns)).toBe(
      "Ism,Telefon,Izoh\r\nAli,+998901234567,\r\nVali,+998907654321,muhim",
    );
  });

  it("escapes cells containing commas", () => {
    const rows: Row[] = [{ name: "Ali", phone: "+998901234567", note: "a, b" }];
    expect(toCsv(rows, columns)).toContain('"a, b"');
  });
});
