// Kanban doskasi uchun sof yordamchilar va konstantalar.
// Komponentdan ajratilgan — bu qism holatga (state) bog'liq emas va
// alohida test qilinadi.

import type { LeadSource, LeadStatus } from "@/lib/crm";

export type ColumnDef = {
  key: LeadStatus | string;
  status?: LeadStatus;
  title: string;
  locked?: boolean;
  custom?: boolean;
  accent?: "green" | "muted";
};

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "yangi", status: "yangi", title: "Yangi lid", locked: true },
  { key: "sifatsiz_lid", status: "sifatsiz_lid", title: "Sifatsiz lid", accent: "muted" },
  { key: "kotarmadi", status: "kotarmadi", title: "Ko'tarmadi" },
  { key: "maslahat", status: "maslahat", title: "Maslahat" },
  {
    key: "konsultatsiyaga_yozildi",
    status: "konsultatsiyaga_yozildi",
    title: "Konsultatsiyaga yozildi",
  },
  { key: "qatnashga_yozildi", status: "qatnashga_yozildi", title: "Qatnashishga yozildi" },
  { key: "yotishga_yozildi", status: "yotishga_yozildi", title: "Yotishga yozildi" },
  { key: "konsultatsiyada_boldi", status: "konsultatsiyada_boldi", title: "Konsultatsiyaga keldi" },
  { key: "yotdi", status: "yotdi", title: "Yotdi", accent: "green" },
  { key: "qatnadi", status: "qatnadi", title: "Qatnadi", accent: "green" },
];

export const SOURCE_BADGE: Record<LeadSource, string> = {
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-purple-100 text-purple-700",
  telegram: "bg-sky-100 text-sky-700",
  friends: "bg-violet-100 text-violet-700",
  website: "bg-emerald-100 text-emerald-700",
  boshqa: "bg-slate-100 text-slate-700",
};

export const OP_COLORS = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
];

/** Operator ID'sidan barqaror (deterministik) rang tanlaydi. */
export function opColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return OP_COLORS[Math.abs(h) % OP_COLORS.length];
}

/** To'liq ismdan ikki harfli bosh harflarni (avatar uchun) hosil qiladi. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

// localStorage kalitlari (ustun sozlamalari saqlanadi).
export const LS_TITLES = "kanban_column_titles_v3";
export const LS_EXTRA = "kanban_extra_columns_v2";
export const LS_COL_ORDER = "kanban_col_order_v3";
export const LS_HIDDEN = "kanban_hidden_cols_v1";
