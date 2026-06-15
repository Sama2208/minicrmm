export type LeadStatus =
  | "yangi"
  | "kotarmadi"
  | "konsultatsiyaga_yozildi"
  | "konsultatsiyada_boldi"
  | "yotishga_yozildi"
  | "sifatsiz_lid";

export type LeadSource = "facebook" | "instagram" | "website" | "boshqa";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  yangi: "Yangi",
  kotarmadi: "Ko'tarmadi",
  konsultatsiyaga_yozildi: "Konsultatsiyaga yozildi",
  konsultatsiyada_boldi: "Konsultatsiyada bo'ldi",
  yotishga_yozildi: "Yotishga yozildi",
  sifatsiz_lid: "Sifatsiz lid",
};

// Light bg + colored text + border
export const STATUS_BADGE: Record<LeadStatus, string> = {
  yangi: "bg-blue-50 text-blue-700 border border-blue-200",
  kotarmadi: "bg-orange-50 text-orange-700 border border-orange-200",
  konsultatsiyaga_yozildi: "bg-violet-50 text-violet-700 border border-violet-200",
  konsultatsiyada_boldi: "bg-sky-50 text-sky-700 border border-sky-200",
  yotishga_yozildi: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  sifatsiz_lid: "bg-rose-50 text-rose-700 border border-rose-200",
};

export const STATUS_ORDER: LeadStatus[] = [
  "yangi",
  "kotarmadi",
  "konsultatsiyaga_yozildi",
  "konsultatsiyada_boldi",
  "yotishga_yozildi",
  "sifatsiz_lid",
];

export const CONVERSION_STATUS: LeadStatus = "yotishga_yozildi";

export const SOURCE_LABEL: Record<LeadSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  website: "Sayt",
  boshqa: "Boshqa",
};

export const SOURCE_LIST: LeadSource[] = ["facebook", "instagram", "website", "boshqa"];

export const SOURCE_COLOR: Record<LeadSource, string> = {
  facebook: "#2563eb",
  instagram: "#db2777",
  website: "#059669",
  boshqa: "#6b7280",
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}
