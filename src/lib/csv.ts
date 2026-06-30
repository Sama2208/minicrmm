// CSV generatsiyasi uchun kichik, bog'liqliksiz yordamchi.
// RFC 4180 qoidalariga amal qiladi: vergul, qo'shtirnoq yoki yangi qator
// bo'lgan katakchalar qo'shtirnoqqa olinadi, ichidagi qo'shtirnoqlar
// ikkilantiriladi.

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

/** Bitta katakcha qiymatini xavfsiz CSV ko'rinishiga keltiradi. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Qatorlar va ustun ta'riflaridan to'liq CSV matnini yasaydi. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const dataLines = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Brauzerda CSV faylni yuklab oladi. Excel'da kirill/lotin belgilarini
 * to'g'ri ochish uchun UTF-8 BOM qo'shiladi.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
